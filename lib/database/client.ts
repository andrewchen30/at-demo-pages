import { GoogleSpreadsheet } from './googleSpreadsheet';
import type { DB, ModelDef } from './types';

export function createDBClient(): DB {
  if (!process.env.GOOGLE_SHEETS_ID || !process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    throw new Error('Missing required env: GOOGLE_SHEETS_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY');
  }

  return new GoogleSpreadsheet({
    GOOGLE_SHEETS_ID: process.env.GOOGLE_SHEETS_ID as string,
    GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL as string,
    GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY as string,
  });
}

/**
 * 通用連線生命週期封裝：建立連線、確保模型存在、執行邏輯、關閉連線。
 */
export async function withDB<T>(model: ModelDef<any>, handler: (db: DB) => Promise<T>): Promise<T> {
  const db = createDBClient();
  await db.connect();
  try {
    await db.createModel(model);
    const result = await handler(db);
    await db.disconnect();
    return result;
  } catch (error) {
    await db.disconnect();
    throw error;
  }
}
