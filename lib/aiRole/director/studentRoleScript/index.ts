import 'server-only';

import { randomUUID } from 'crypto';
import path from 'path';
import { DIRECTOR_PROMPTS } from './prompts';
import { getScripts } from '../utils/getScript';
import { FileCache } from './fileCache';
import { createRoleAsk } from '@/lib/aiRole/utils/createRoleAsk';

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

type RandomRoleResponse = {
  role: string;
  total: number;
  createdAt: string;
  index: number;
};

const DATA_DIR = path.join(process.cwd(), '.data');
const DEFAULT_BATCH_SIZE = 10;

const SCRIPTWRITER_PROMPT = '以下是腳本內容，請用 JSON 格式回覆我：';

// 創建 ask 函數來避免循環依賴
const directorAsk = createRoleAsk({
  botIdEnvVar: 'OPENAI_DIRECTOR_BOT_ID',
  fallbackBotIdEnvVar: 'OPENAI_SCRIPTWRITER_BOT_ID',
});

const scriptWriterAsk = createRoleAsk({
  botIdEnvVar: 'OPENAI_SCRIPTWRITER_BOT_ID',
});

// 創建 FileCache 實例來管理學生角色數據
const rolesCache = new FileCache<StoredRole[]>({
  dataDir: DATA_DIR,
  fileName: 'student_roles.json',
  defaultValue: [],
});

async function readRoles(): Promise<StoredRole[]> {
  const roles = await rolesCache.read();
  // 確保返回的是陣列
  return Array.isArray(roles) ? roles : [];
}

async function writeRoles(roles: StoredRole[]): Promise<void> {
  await rolesCache.write(roles);
}

async function requestDirectorRole(): Promise<string> {
  try {
    const { result } = await directorAsk(DIRECTOR_PROMPTS[Math.floor(Math.random() * DIRECTOR_PROMPTS.length)], {}, []);
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
  const script = getScripts(JSON.parse(directorOutput));
  const message = `${SCRIPTWRITER_PROMPT}\n${JSON.stringify(script)}`;

  try {
    const { result } = await scriptWriterAsk(message, {}, []);
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

  // const randomIndex = Math.floor(Math.random() * roles.length);
  const randomIndex = Date.now() % roles.length;
  const role = roles[randomIndex];

  return {
    role: role.raw,
    total: roles.length,
    createdAt: role.createdAt,
    index: randomIndex,
  };
}

function safeJsonParse<T extends Record<string, unknown>>(json: string, label: string): T {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error(`[${label}] JSON 內容不是物件`);
    }
    return parsed as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知錯誤';
    throw new Error(`[${label}] JSON.parse 失敗：${message}`);
  }
}

export async function createStudentRole(): Promise<StoredRole> {
  const directorOutput = await requestDirectorRole();
  const scriptwriterOutput = await requestScriptwriterRole(directorOutput);

  let merged: Record<string, unknown>;
  try {
    const directorObj = safeJsonParse<Record<string, unknown>>(directorOutput, '導演');
    const scriptwriterObj = safeJsonParse<Record<string, unknown>>(scriptwriterOutput, '編劇');
    merged = { ...directorObj, ...scriptwriterObj };
  } catch (error) {
    throw new Error(`解析角色資料失敗：${error instanceof Error ? error.message : '未知錯誤'}`);
  }

  return {
    id: randomUUID(),
    raw: JSON.stringify(merged),
    createdAt: new Date().toISOString(),
  };
}

export async function appendStudentRoles(count: number = DEFAULT_BATCH_SIZE) {
  if (count <= 0) {
    throw new StudentRoleInvalidCountError();
  }

  const roles = await readRoles();
  const tasks = Array.from({ length: count }, () => createStudentRole());
  const newRoles = await Promise.all(tasks);

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
