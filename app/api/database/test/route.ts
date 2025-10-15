import { NextRequest, NextResponse } from 'next/server';
import { GoogleSpreadsheet, ChatLogModel, type ChatLog } from '@/lib/database';

// 初始化資料庫連接
function initDB() {
  if (!process.env.GOOGLE_SHEETS_ID || !process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    throw new Error(
      'Missing required environment variables: GOOGLE_SHEETS_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY'
    );
  }

  return new GoogleSpreadsheet({
    GOOGLE_SHEETS_ID: process.env.GOOGLE_SHEETS_ID,
    GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL,
    GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    const db = initDB();
    await db.connect();

    try {
      // 確保 Model 存在
      await db.createModel(ChatLogModel);

      let result: any;

      switch (action) {
        case 'appendRow': {
          const { teacher_name, chat_history, chat_count, background_info } = data;
          const id = await db.appendRow(ChatLogModel, {
            teacher_name,
            chat_history,
            chat_count,
            background_info,
          } as Partial<ChatLog> as ChatLog);
          result = { success: true, id, message: `成功新增資料，ID: ${id}` };
          break;
        }

        case 'updateById': {
          const { id, patch } = data;
          await db.updateRowById(ChatLogModel, id, patch);
          result = { success: true, message: `成功更新 ID: ${id}` };
          break;
        }

        case 'upsertByKey': {
          const { key, row } = data;
          await db.upsertByKey(ChatLogModel, key, row as ChatLog);
          result = { success: true, message: `成功 upsert key: ${key}` };
          break;
        }

        case 'getById': {
          const { id } = data;
          const record = await db.getById(ChatLogModel, id);
          result = { success: true, record, message: record ? `找到資料` : `未找到 ID: ${id}` };
          break;
        }

        case 'findFirst': {
          const { where } = data;
          const record = await db.findFirst(ChatLogModel, where);
          result = { success: true, record, message: record ? `找到資料` : `未找到符合條件的資料` };
          break;
        }

        case 'list': {
          const { offset, limit, orderBy } = data || {};
          const records = await db.list(ChatLogModel, {
            offset: offset || 0,
            limit: limit || 10,
            orderBy: orderBy || 'created_at',
          });
          result = { success: true, records, count: records.length, message: `找到 ${records.length} 筆資料` };
          break;
        }

        default:
          return NextResponse.json({ success: false, error: `未知的操作: ${action}` }, { status: 400 });
      }

      await db.disconnect();
      return NextResponse.json(result);
    } catch (error) {
      await db.disconnect();
      throw error;
    }
  } catch (error) {
    console.error('Database operation failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '資料庫操作失敗',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const db = initDB();
    await db.connect();

    try {
      await db.createModel(ChatLogModel);
      const records = await db.list(ChatLogModel, {
        offset: 0,
        limit: 50,
        orderBy: 'created_at',
      });

      await db.disconnect();
      return NextResponse.json({
        success: true,
        records,
        count: records.length,
      });
    } catch (error) {
      await db.disconnect();
      throw error;
    }
  } catch (error) {
    console.error('Failed to fetch records:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '無法取得資料',
      },
      { status: 500 }
    );
  }
}
