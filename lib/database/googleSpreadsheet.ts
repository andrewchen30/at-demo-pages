import { google, sheets_v4 } from 'googleapis';
import { DB, ModelDef } from './types';

/**
 * 環境變數介面
 */
interface GoogleSheetsEnv {
  GOOGLE_SHEETS_ID: string;
  GOOGLE_CLIENT_EMAIL: string;
  GOOGLE_PRIVATE_KEY: string;
}

/**
 * Google Spreadsheet 輕量級資料庫實作
 */
export class GoogleSpreadsheet implements DB {
  private sheetsClient: sheets_v4.Sheets | null = null;
  private spreadsheetId: string;
  private auth: any;

  constructor(private env: GoogleSheetsEnv) {
    this.spreadsheetId = env.GOOGLE_SHEETS_ID;
  }

  /**
   * 連接到 Google Sheets API
   */
  async connect(): Promise<void> {
    try {
      // 處理 private key 中的換行符號
      const privateKey = this.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

      // 建立 JWT 認證
      this.auth = new google.auth.JWT(this.env.GOOGLE_CLIENT_EMAIL, undefined, privateKey, [
        'https://www.googleapis.com/auth/spreadsheets',
      ]);

      // 建立 Sheets 客戶端
      this.sheetsClient = google.sheets({ version: 'v4', auth: this.auth });

      // 驗證連接
      await this.sheetsClient.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
    } catch (error) {
      throw new Error(`Failed to connect to Google Sheets: ${error}`);
    }
  }

  /**
   * 斷開連接
   */
  async disconnect(): Promise<void> {
    this.sheetsClient = null;
    this.auth = null;
  }

  /**
   * 建立 Model 對應的工作表
   */
  async createModel<T>(model: ModelDef<T>): Promise<void> {
    if (!this.sheetsClient) {
      throw new Error('Not connected. Call connect() first.');
    }

    await this.retryOnError(async () => {
      // 檢查工作表是否存在
      const spreadsheet = await this.sheetsClient!.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheetExists = spreadsheet.data.sheets?.some((sheet) => sheet.properties?.title === model.sheet);

      if (!sheetExists) {
        // 建立新工作表
        await this.sheetsClient!.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: model.sheet,
                  },
                },
              },
            ],
          },
        });
      }

      // 檢查是否已有表頭
      const headerCheck = await this.sheetsClient!.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${model.sheet}!A1:ZZ1`,
      });

      if (!headerCheck.data.values || headerCheck.data.values.length === 0) {
        // 寫入表頭
        const headers = model.columns.map(String);
        await this.sheetsClient!.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${model.sheet}!A1`,
          valueInputOption: 'RAW',
          requestBody: {
            values: [headers],
          },
        });
      }
    });
  }

  /**
   * 新增一列資料
   */
  async appendRow<T>(model: ModelDef<T>, row: T): Promise<string> {
    if (!this.sheetsClient) {
      throw new Error('Not connected. Call connect() first.');
    }

    return await this.retryOnError(async () => {
      // 生成 ID 和時間戳
      const id = this.generateId();
      const now = new Date().toISOString();

      const enrichedRow = {
        ...row,
        id: (row as any).id || id,
        created_at: (row as any).created_at || now,
        updated_at: now,
      } as T;

      // 根據 columns 順序展平資料
      const values = model.columns.map((col) => {
        const value = enrichedRow[col];
        return this.sanitizeValue(value);
      });

      // 寫入資料
      await this.sheetsClient!.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${model.sheet}!A:A`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [values],
        },
      });

      return (enrichedRow as any).id;
    });
  }

  /**
   * 根據 id 更新資料
   */
  async updateRowById<T>(model: ModelDef<T>, id: string, patch: Partial<T>): Promise<void> {
    if (!this.sheetsClient) {
      throw new Error('Not connected. Call connect() first.');
    }

    await this.retryOnError(async () => {
      // 找到 id 欄位的索引
      const idColumnIndex = model.columns.indexOf('id' as keyof T);
      if (idColumnIndex === -1) {
        throw new Error('Model does not have an id column');
      }

      // 讀取所有資料
      const response = await this.sheetsClient!.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${model.sheet}!A:ZZ`,
      });

      const rows = response.data.values;
      if (!rows || rows.length <= 1) {
        throw new Error(`No data found for id: ${id}`);
      }

      // 找到對應的列
      let targetRowIndex = -1;
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][idColumnIndex] === id) {
          targetRowIndex = i;
          break;
        }
      }

      if (targetRowIndex === -1) {
        throw new Error(`Row with id ${id} not found`);
      }

      // 更新 updated_at
      const updatedPatch = {
        ...patch,
        updated_at: new Date().toISOString(),
      };

      // 準備更新資料
      const updates: any[] = [];
      model.columns.forEach((col, index) => {
        if (col in updatedPatch) {
          const columnLetter = this.numberToColumn(index + 1);
          const rowNumber = targetRowIndex + 1;
          updates.push({
            range: `${model.sheet}!${columnLetter}${rowNumber}`,
            values: [[this.sanitizeValue(updatedPatch[col])]],
          });
        }
      });

      // 批次更新
      if (updates.length > 0) {
        await this.sheetsClient!.spreadsheets.values.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            valueInputOption: 'RAW',
            data: updates,
          },
        });
      }
    });
  }

  /**
   * 根據唯一鍵更新或插入資料
   */
  async upsertByKey<T>(model: ModelDef<T>, key: string, row: T): Promise<void> {
    if (!model.keyField) {
      throw new Error('Model does not have a keyField defined');
    }

    const existing = await this.findFirst(model, { [model.keyField]: key } as Partial<T>);

    if (existing && (existing as any).id) {
      // 更新現有資料
      await this.updateRowById(model, (existing as any).id, row);
    } else {
      // 插入新資料
      await this.appendRow(model, row);
    }
  }

  /**
   * 根據 id 取得資料
   */
  async getById<T>(model: ModelDef<T>, id: string): Promise<T | null> {
    if (!this.sheetsClient) {
      throw new Error('Not connected. Call connect() first.');
    }

    return await this.retryOnError(async () => {
      const idColumnIndex = model.columns.indexOf('id' as keyof T);
      if (idColumnIndex === -1) {
        throw new Error('Model does not have an id column');
      }

      const response = await this.sheetsClient!.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${model.sheet}!A:ZZ`,
      });

      const rows = response.data.values;
      if (!rows || rows.length <= 1) {
        return null;
      }

      // 找到對應的列
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][idColumnIndex] === id) {
          return this.rowToObject(model, rows[i]);
        }
      }

      return null;
    });
  }

  /**
   * 根據條件尋找第一筆資料
   */
  async findFirst<T>(model: ModelDef<T>, where: Partial<T>): Promise<T | null> {
    if (!this.sheetsClient) {
      throw new Error('Not connected. Call connect() first.');
    }

    return await this.retryOnError(async () => {
      const response = await this.sheetsClient!.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${model.sheet}!A:ZZ`,
      });

      const rows = response.data.values;
      if (!rows || rows.length <= 1) {
        return null;
      }

      // 找到符合條件的第一列
      for (let i = 1; i < rows.length; i++) {
        const obj = this.rowToObject(model, rows[i]);
        if (this.matchesWhere(obj, where)) {
          return obj;
        }
      }

      return null;
    });
  }

  /**
   * 列出資料
   */
  async list<T>(model: ModelDef<T>, opts?: { offset?: number; limit?: number; orderBy?: keyof T }): Promise<T[]> {
    if (!this.sheetsClient) {
      throw new Error('Not connected. Call connect() first.');
    }

    return await this.retryOnError(async () => {
      const response = await this.sheetsClient!.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${model.sheet}!A:ZZ`,
      });

      const rows = response.data.values;
      if (!rows || rows.length <= 1) {
        return [];
      }

      // 轉換為物件陣列
      let results: T[] = [];
      for (let i = 1; i < rows.length; i++) {
        results.push(this.rowToObject(model, rows[i]));
      }

      // 排序
      if (opts?.orderBy) {
        results.sort((a, b) => {
          const aVal = a[opts.orderBy!];
          const bVal = b[opts.orderBy!];
          if (aVal < bVal) return -1;
          if (aVal > bVal) return 1;
          return 0;
        });
      }

      // 分頁
      const offset = opts?.offset || 0;
      const limit = opts?.limit || results.length;
      results = results.slice(offset, offset + limit);

      return results;
    });
  }

  /**
   * 清空指定 Model 的所有資料（保留並重建表頭）
   */
  async clearModel<T>(model: ModelDef<T>): Promise<void> {
    if (!this.sheetsClient) {
      throw new Error('Not connected. Call connect() first.');
    }

    await this.retryOnError(async () => {
      // 找到目標工作表 sheetId
      const meta = await this.sheetsClient!.spreadsheets.get({ spreadsheetId: this.spreadsheetId });
      const target = meta.data.sheets?.find((s) => s.properties?.title === model.sheet);

      if (target?.properties?.sheetId != null) {
        const sheetId = target.properties.sheetId!;
        // 刪除該工作表
        await this.sheetsClient!.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            requests: [{ deleteSheet: { sheetId } }, { addSheet: { properties: { title: model.sheet } } }],
          },
        });
      } else {
        // 若不存在則新增
        await this.sheetsClient!.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            requests: [{ addSheet: { properties: { title: model.sheet } } }],
          },
        });
      }

      // 重建表頭
      const headers = model.columns.map(String);
      await this.sheetsClient!.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${model.sheet}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [headers] },
      });
    });
  }

  // === 輔助方法 ===

  /**
   * 生成唯一 ID（使用簡單的 UUID v4）
   */
  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * 清理值（截斷過長字串、處理特殊字元）
   */
  private sanitizeValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    let str = String(value);

    // 不再截斷字串，以避免破壞 JSON 結構。
    // Google Sheets 每個儲存格最大約 50,000 字元，超過時才考慮處理。
    // 若將來需要安全上限，可調整為接近上限的值（例如 45000），但本案保留完整內容。
    return str;
  }

  /**
   * 將列資料轉換為物件
   */
  private rowToObject<T>(model: ModelDef<T>, row: any[]): T {
    const obj: any = {};
    model.columns.forEach((col, index) => {
      const value = row[index];
      // 嘗試轉換數字
      if (value !== '' && !isNaN(Number(value)) && value !== null) {
        obj[col] = Number(value);
      } else {
        obj[col] = value || '';
      }
    });
    return obj as T;
  }

  /**
   * 檢查物件是否符合條件
   */
  private matchesWhere<T>(obj: T, where: Partial<T>): boolean {
    for (const key in where) {
      if (obj[key] !== where[key]) {
        return false;
      }
    }
    return true;
  }

  /**
   * 將數字轉換為 Excel 欄位字母（1 => A, 2 => B, ..., 27 => AA）
   */
  private numberToColumn(num: number): string {
    let column = '';
    while (num > 0) {
      const remainder = (num - 1) % 26;
      column = String.fromCharCode(65 + remainder) + column;
      num = Math.floor((num - 1) / 26);
    }
    return column;
  }

  /**
   * 錯誤重試機制
   */
  private async retryOnError<R>(fn: () => Promise<R>, maxRetries: number = 3): Promise<R> {
    const delays = [100, 300, 600]; // ms

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        const statusCode = error?.response?.status || error?.code;
        const isRetryable =
          statusCode === 429 || // Too Many Requests
          statusCode === 500 || // Internal Server Error
          statusCode === 502 || // Bad Gateway
          statusCode === 503 || // Service Unavailable
          statusCode === 504; // Gateway Timeout

        if (!isRetryable || attempt === maxRetries - 1) {
          throw error;
        }

        // 等待後重試
        await this.sleep(delays[attempt]);
      }
    }

    throw new Error('Max retries exceeded');
  }

  /**
   * 延遲函數
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
