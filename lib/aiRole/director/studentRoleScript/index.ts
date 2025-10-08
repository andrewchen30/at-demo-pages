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
  const script = getScripts(JSON.parse(directorOutput).persona);
  const message = `${SCRIPTWRITER_PROMPT}\n${JSON.stringify(script)}`;

  console.log('message: ', message);

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
