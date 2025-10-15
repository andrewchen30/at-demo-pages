import 'server-only';

import { randomUUID } from 'crypto';
import { DIRECTOR_PROMPTS } from './prompts';
import { getScripts } from '../utils/getScript';
import { createRoleAsk } from '@/lib/aiCharacter/utils/createRoleAsk';
import { AIGenStudentsRepo } from '@/lib/repository/studentScript';

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

const DEFAULT_BATCH_SIZE = 5;

const SCRIPTWRITER_PROMPT = '以下是腳本內容，請用 JSON 格式回覆我：';

// 創建 ask 函數來避免循環依賴
const directorAsk = createRoleAsk({
  botIdEnvVar: 'OPENAI_DIRECTOR_BOT_ID',
  fallbackBotIdEnvVar: 'OPENAI_SCRIPTWRITER_BOT_ID',
});

const scriptWriterAsk = createRoleAsk({
  botIdEnvVar: 'OPENAI_SCRIPTWRITER_BOT_ID',
});

// 以記憶體快取保存目前的學生角色（資料來源轉為 Google Spreadsheet）
let memoryRoles: StoredRole[] = [];

async function readRoles(): Promise<StoredRole[]> {
  return Array.isArray(memoryRoles) ? memoryRoles : [];
}

async function writeRoles(roles: StoredRole[]): Promise<void> {
  memoryRoles = Array.isArray(roles) ? roles : [];
}

// 從 Google Spreadsheet 載入資料至記憶體（在 server 啟動或刷新後呼叫）
export async function loadRolesFromSpreadsheet(): Promise<void> {
  const rows = await AIGenStudentsRepo.list({ orderBy: 'created_at' });
  const mapped: StoredRole[] = rows.map((r) => ({ id: r.id, raw: r.raw, createdAt: r.created_at }));
  await writeRoles(mapped);
}

let initialized = false;
let initializingPromise: Promise<void> | null = null;
export async function ensureRolesLoaded(): Promise<void> {
  if (initialized) return;
  if (!initializingPromise) {
    initializingPromise = loadRolesFromSpreadsheet()
      .then(() => {
        initialized = true;
      })
      .finally(() => {
        initializingPromise = null;
      });
  }
  return initializingPromise;
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

  const validIndices: number[] = [];
  for (let i = 0; i < roles.length; i++) {
    try {
      JSON.parse(roles[i].raw);
      validIndices.push(i);
    } catch {}
  }

  if (validIndices.length === 0) {
    throw new Error('目前沒有有效的學生角色資料，請先重新產生。');
  }

  const idx = validIndices[Math.floor(Math.random() * validIndices.length)];
  const role = roles[idx];

  return {
    role: role.raw,
    total: roles.length,
    createdAt: role.createdAt,
    index: idx,
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

  await ensureRolesLoaded();

  const currentRoles = await readRoles();

  let added = 0;
  for (let i = 0; i < count; i++) {
    try {
      const role = await createStudentRole();
      await AIGenStudentsRepo.create({
        id: role.id,
        raw: role.raw,
      });
      currentRoles.push(role);
      await writeRoles(currentRoles);
      added++;
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知錯誤';
      console.error(`[appendStudentRoles] 建立或寫入學生角色失敗：${message}`);
      continue;
    }
  }

  await loadRolesFromSpreadsheet();

  const finalRoles = await readRoles();
  return {
    added,
    total: finalRoles.length,
  };
}

export async function clearStudentRoles() {
  await writeRoles([]);
  await AIGenStudentsRepo.clearAll();
  await loadRolesFromSpreadsheet();
  return { total: 0 };
}

export async function getStudentRoleCount() {
  const roles = await readRoles();
  return roles.length;
}
