import 'server-only';

import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

import { directorRole, scriptWriterRole } from '@/lib/aiRole';
import { getScripts } from './getScript';

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

const store: StudentRolesStore = (globalThis.__studentRolesStore ??= {
  useMemoryStore: false,
  roles: [],
});

type RandomRoleResponse = {
  role: string;
  total: number;
  createdAt: string;
};

const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'student_roles.json');
const DEFAULT_BATCH_SIZE = 10;

const SCRIPTWRITER_PROMPT = '以下是腳本內容，請用 JSON 格式回覆我：';

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

const DIRECTOR_PROMPTS: readonly string[] = [
  '請給我一個成人上班族，想要學習旅遊英文，用JSON格式回覆我',
  '請給我一個成人上班族，想要學習工作英文，用JSON格式回覆我',
  '請給我一個成人上班族，想要學習生活英文，用JSON格式回覆我',
  '請給我一個大學學生，想要學習旅遊英文，用JSON格式回覆我',
  '請給我一個大學學生，想要學習檢定英文，用JSON格式回覆我',
  '請給我一個大學學生，想要學習生活英文，用JSON格式回覆我',
  '請給我一個沒有在工作的成人，想要學習旅遊英文，用JSON格式回覆我',
  '請給我一個沒有在工作的成人，想要學習生活英文，用JSON格式回覆我',
];

async function requestDirectorRole(): Promise<string> {
  try {
    const { result } = await directorRole.ask(
      DIRECTOR_PROMPTS[Math.floor(Math.random() * DIRECTOR_PROMPTS.length)],
      {},
      []
    );
    const trimmed = typeof result === 'string' ? result.trim() : '';

    if (!trimmed) {
      throw new Error('OpenAI 導演回傳內容為空，無法建立學生角色。');
    }

    return trimmed;
  } catch (error) {
    if (error instanceof Error && error.message.includes('導演回傳內容為空')) {
      throw error;
    }
    const message = error instanceof Error ? error.message : '未知錯誤';
    throw new Error(`OpenAI 導演回傳錯誤：${message}`);
  }
}

async function requestScriptwriterRole(directorOutput: string): Promise<string> {
  const script = getScripts(JSON.parse(directorOutput).persona);
  const message = `${SCRIPTWRITER_PROMPT}\n${JSON.stringify(script)}`;

  console.log('message: ', message);

  try {
    const { result } = await scriptWriterRole.ask(message, {}, []);
    const trimmed = typeof result === 'string' ? result.trim() : '';

    if (!trimmed) {
      throw new Error('OpenAI 編劇回傳內容為空，無法建立學生角色。');
    }

    return trimmed;
  } catch (error) {
    if (error instanceof Error && error.message.includes('編劇回傳內容為空')) {
      throw error;
    }
    const message = error instanceof Error ? error.message : '未知錯誤';
    throw new Error(`OpenAI 編劇回傳錯誤：${message}`);
  }
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
    const directorOutput = await requestDirectorRole();
    const scriptwriterOutput = await requestScriptwriterRole(directorOutput);

    console.log('scriptwriterOutput: ', scriptwriterOutput);
    console.log('directorOutput: ', directorOutput);

    // 請將兩個 output 都 JSON.parse 後再合併
    let raw;
    try {
      raw = {
        ...JSON.parse(directorOutput),
        ...JSON.parse(scriptwriterOutput),
      };
    } catch (error) {
      console.log('Failed to parse outputs:', error);
      throw new Error(`解析角色資料失敗：${error instanceof Error ? error.message : '未知錯誤'}`);
    }

    newRoles.push({
      id: randomUUID(),
      raw: JSON.stringify(raw),
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
