import 'server-only';

import { randomUUID } from 'crypto';
import { DIRECTOR_PROMPTS } from './prompts';
import { getScripts } from '../utils/getScript';
import { createRoleAsk } from '@/lib/aiRole/utils/createRoleAsk';
import { GoogleSpreadsheet, AIGenStudentModel } from '@/lib/database';

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

// 以記憶體快取保存目前的學生角色（資料來源轉為 Google Spreadsheet）
let memoryRoles: StoredRole[] = [];

// 取得 Google Spreadsheet 連線（延遲建立）
let sheetDb: GoogleSpreadsheet | null = null;
async function getDb(): Promise<GoogleSpreadsheet> {
  if (!sheetDb) {
    sheetDb = new GoogleSpreadsheet({
      GOOGLE_SHEETS_ID: process.env.GOOGLE_SHEETS_ID!,
      GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL!,
      GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY!,
    });
    await sheetDb.connect();
    await sheetDb.createModel(AIGenStudentModel);
  }
  return sheetDb;
}

async function readRoles(): Promise<StoredRole[]> {
  return Array.isArray(memoryRoles) ? memoryRoles : [];
}

async function writeRoles(roles: StoredRole[]): Promise<void> {
  memoryRoles = Array.isArray(roles) ? roles : [];
}

// 從 Google Spreadsheet 載入資料至記憶體（在 server 啟動或刷新後呼叫）
export async function loadRolesFromSpreadsheet(): Promise<void> {
  const db = await getDb();
  const rows = await db.list(AIGenStudentModel, { orderBy: 'created_at' });
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

  const randomIndex = Math.floor(Math.random() * roles.length);
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

  // 將新增資料寫入 Google Spreadsheet
  const db = await getDb();
  for (const r of newRoles) {
    await db.appendRow(AIGenStudentModel, {
      id: r.id,
      raw: r.raw,
      created_at: r.createdAt,
      updated_at: r.createdAt,
    });
  }

  // 以 Spreadsheet 為權威來源，重新載入記憶體
  await loadRolesFromSpreadsheet();

  return {
    added: newRoles.length,
    total: updatedRoles.length,
  };
}

export async function clearStudentRoles() {
  await writeRoles([]);

  // 清空 Google Spreadsheet 上的資料
  const db = await getDb();
  await db.clearModel(AIGenStudentModel);

  // 重新載入記憶體（應為空）
  await loadRolesFromSpreadsheet();

  return { total: 0 };
}

export async function getStudentRoleCount() {
  const roles = await readRoles();
  return roles.length;
}
