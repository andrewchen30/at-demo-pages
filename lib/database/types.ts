/**
 * Model 定義，用於描述 Google Spreadsheet 的資料結構
 */
export type ModelDef<T> = {
  /** 對應試算表的分頁名稱 */
  sheet: string;
  /** 欄位順序，對應表頭 */
  columns: (keyof T)[];
  /** 唯一鍵欄位（選用，用於 upsert） */
  keyField?: keyof T;
};

/**
 * 資料庫介面，定義基本的 CRUD 操作
 */
export interface DB {
  /** 連接資料庫 */
  connect(): Promise<void>;

  /** 斷開資料庫連接 */
  disconnect(): Promise<void>;

  // === 寫入操作 ===

  /**
   * 新增一列資料
   * @returns 新增資料的 id
   */
  appendRow<T>(model: ModelDef<T>, row: T): Promise<string>;

  /**
   * 根據 id 更新一列資料
   */
  updateRowById<T>(model: ModelDef<T>, id: string, patch: Partial<T>): Promise<void>;

  /**
   * 根據唯一鍵更新或插入資料（選用）
   */
  upsertByKey?<T>(model: ModelDef<T>, key: string, row: T): Promise<void>;

  // === 讀取操作 ===

  /**
   * 根據 id 取得一筆資料
   */
  getById<T>(model: ModelDef<T>, id: string): Promise<T | null>;

  /**
   * 根據條件尋找第一筆符合的資料
   */
  findFirst<T>(model: ModelDef<T>, where: Partial<T>): Promise<T | null>;

  /**
   * 列出資料
   */
  list<T>(
    model: ModelDef<T>,
    opts?: {
      offset?: number;
      limit?: number;
      orderBy?: keyof T;
    }
  ): Promise<T[]>;

  // === 管理操作 ===

  /**
   * 建立 Model 對應的工作表（若不存在）
   */
  createModel<T>(model: ModelDef<T>): Promise<void>;
}

/**
 * ChatLog 資料模型
 */
export type ChatLog = {
  id: string;
  teacher_key: string;
  chat_history: string;
  chat_count: number;
  background_info: string;
  created_at: string;
  updated_at: string;
};

/**
 * ChatLog Model 定義
 */
export const ChatLogModel: ModelDef<ChatLog> = {
  sheet: 'chat_logs',
  columns: ['id', 'teacher_key', 'chat_history', 'chat_count', 'background_info', 'created_at', 'updated_at'],
  keyField: 'teacher_key',
};
