/**
 * Google Spreadsheet 輕量級資料庫
 *
 * 使用範例：
 * ```typescript
 * import { GoogleSpreadsheet, ChatLogModel } from '@/lib/database';
 *
 * const db = new GoogleSpreadsheet({
 *   GOOGLE_SHEETS_ID: process.env.GOOGLE_SHEETS_ID!,
 *   GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL!,
 *   GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY!,
 * });
 *
 * await db.connect();
 * await db.createModel(ChatLogModel);
 *
 * const id = await db.appendRow(ChatLogModel, {
 *   teacher_key: 'T_001',
 *   chat_history: '{"user":"Hi","assistant":"Hello!"}',
 *   chat_count: 1,
 *   background_info: 'Trial Lesson'
 * });
 *
 * const record = await db.getById(ChatLogModel, id);
 * await db.updateRowById(ChatLogModel, id, { chat_count: 2 });
 * ```
 */

export { GoogleSpreadsheet } from './googleSpreadsheet';
export type { DB, ModelDef, ChatLog, AIGenStudent } from './types';
export { ChatLogModel, AIGenStudentModel } from './types';
