import 'server-only';

import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

import { extractResponseText } from './openaiResponse';

export class StudentRoleStoreEmptyError extends Error {
  constructor(message: string = '目前沒有可用的學生角色，請先產生角色。') {
    super(message);
    this.name = 'StudentRoleStoreEmptyError';
  }
}

export class StudentRoleInvalidCountError extends Error {
  constructor(message: string = '新增學生角色的數量必須大於 0。') {
    super(message);
    this.name = 'StudentRoleInvalidCountError';
  }
}

type StoredRole = {
  id: string;
  raw: string;
  createdAt: string;
};

type StudentRolesStore = {
  useMemoryStore: boolean;
  roles: StoredRole[];
};

declare global {
  // eslint-disable-next-line no-var
  var __studentRolesStore: StudentRolesStore | undefined;
}

const store: StudentRolesStore = globalThis.__studentRolesStore ??= {
  useMemoryStore: false,
  roles: [],
};

type RandomRoleResponse = {
  role: string;
  total: number;
  createdAt: string;
};

const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'student_roles.json');
const DEFAULT_BATCH_SIZE = 10;

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/responses';
const SCRIPTWRITER_PROMPT = 'Please provide json response with premise information';

function isReadOnlyFileSystemError(error: unknown): error is NodeJS.ErrnoException {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const code = (error as NodeJS.ErrnoException).code;
  return code === 'EACCES' || code === 'EPERM' || code === 'EROFS';
}

function useMemoryStore() {
  if (!store.useMemoryStore) {
    store.useMemoryStore = true;
  }
}

async function writeRolesToFile(roles: StoredRole[]): Promise<boolean> {
  if (store.useMemoryStore) {
    store.roles = roles;
    return true;
  }

  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(roles, null, 2), 'utf-8');
    return true;
  } catch (error) {
    if (isReadOnlyFileSystemError(error)) {
      useMemoryStore();
      store.roles = roles;
      return false;
    }
    throw error;
  }
}

function getEnvVariable(name: string, fallbackName?: string) {
  const value = process.env[name] ?? (fallbackName ? process.env[fallbackName] : undefined);
  if (!value) {
    const displayName = fallbackName ? `${name} 或 ${fallbackName}` : name;
    throw new Error(`環境變數 ${displayName} 未設定，無法建立學生角色。`);
  }
  return value;
}

async function ensureDataFile() {
  if (store.useMemoryStore) {
    return;
  }

  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    if (isReadOnlyFileSystemError(error)) {
      useMemoryStore();
      return;
    }
    throw error;
  }

  try {
    await fs.access(DATA_FILE);
  } catch (error) {
    if (isReadOnlyFileSystemError(error)) {
      useMemoryStore();
      return;
    }

    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }

    await writeRolesToFile([]);
  }
}

async function readRoles(): Promise<StoredRole[]> {
  if (store.useMemoryStore) {
    return store.roles;
  }

  await ensureDataFile();
  if (store.useMemoryStore) {
    return store.roles;
  }

  let content: string;
  try {
    content = await fs.readFile(DATA_FILE, 'utf-8');
  } catch (error) {
    if (isReadOnlyFileSystemError(error)) {
      useMemoryStore();
      return store.roles;
    }
    throw error;
  }

  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      store.roles = parsed as StoredRole[];
      return store.roles;
    }
    store.roles = [];
    await writeRolesToFile(store.roles);
    return store.roles;
  } catch {
    // 如果檔案損毀，重置為空陣列
    store.roles = [];
    await writeRolesToFile(store.roles);
    return store.roles;
  }
}

async function writeRoles(roles: StoredRole[]) {
  store.roles = roles;

  if (store.useMemoryStore) {
    return;
  }

  await ensureDataFile();
  if (store.useMemoryStore) {
    return;
  }

  await writeRolesToFile(store.roles);
}

async function requestScriptwriterRole(): Promise<string> {
  const apiKey = getEnvVariable('OPENAI_API_KEY');
  const botId = getEnvVariable('OPENAI_SCRIPTWRITER_BOT_ID', 'OPENAI_SCRIPTWRITER01_BOT_ID');

  const payload = {
    prompt: {
      id: botId,
      variables: {},
    },
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: SCRIPTWRITER_PROMPT,
          },
        ],
      },
    ],
  };

  const response = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message =
      (errorData && (errorData.error?.message || errorData.message)) || response.statusText;
    throw new Error(`OpenAI 回傳錯誤：${message}`);
  }

  const data = await response.json();
  const result = extractResponseText(data);

  if (!result) {
    throw new Error('OpenAI 回傳內容為空，無法建立學生角色。');
  }

  return result;
}

export async function getRandomStudentRole(): Promise<RandomRoleResponse> {
  const roles = await readRoles();
  if (roles.length === 0) {
    throw new StudentRoleStoreEmptyError();
  }

  const randomIndex = Math.floor(Math.random() * roles.length);
  const role = roles[randomIndex];

  return {
    role: role.raw,
    total: roles.length,
    createdAt: role.createdAt,
  };
}

export async function appendStudentRoles(count: number = DEFAULT_BATCH_SIZE) {
  if (count <= 0) {
    throw new StudentRoleInvalidCountError();
  }

  const roles = await readRoles();
  const newRoles: StoredRole[] = [];

  for (let i = 0; i < count; i += 1) {
    const raw = await requestScriptwriterRole();
    newRoles.push({
      id: randomUUID(),
      raw,
      createdAt: new Date().toISOString(),
    });
  }

  const updatedRoles = [...roles, ...newRoles];
  await writeRoles(updatedRoles);

  return {
    added: newRoles.length,
    total: updatedRoles.length,
  };
}

export async function clearStudentRoles() {
  await writeRoles([]);
  return { total: 0 };
}

export async function getStudentRoleCount() {
  const roles = await readRoles();
  return roles.length;
}
