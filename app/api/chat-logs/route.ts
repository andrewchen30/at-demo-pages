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

/**
 * 建立新的 ChatLog 記錄
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chat_log_id, teacher_name, chat_history, chat_count, background_info } = body;

    // 驗證必要參數
    if (!chat_log_id || !teacher_name) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少必要參數: chat_log_id 和 teacher_name',
        },
        { status: 400 }
      );
    }

    const db = initDB();
    await db.connect();

    try {
      // 確保 Model 存在
      await db.createModel(ChatLogModel);

      // 建立新的 ChatLog 記錄
      const id = await db.appendRow(ChatLogModel, {
        id: chat_log_id,
        teacher_name,
        chat_history: chat_history || '', // 使用傳入的 chat_history，預設為空字串
        chat_count: chat_count || 0, // 使用傳入的 chat_count，預設為 0
        background_info: background_info || '',
      } as Partial<ChatLog> as ChatLog);

      await db.disconnect();

      return NextResponse.json({
        success: true,
        id,
        message: '成功建立 ChatLog 記錄',
      });
    } catch (error) {
      await db.disconnect();
      throw error;
    }
  } catch (error) {
    console.error('Failed to create ChatLog:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '建立 ChatLog 記錄失敗',
      },
      { status: 500 }
    );
  }
}

/**
 * 更新 ChatLog 記錄
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { chat_log_id, chat_history, chat_count, background_info } = body;

    // 驗證必要參數
    if (!chat_log_id) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少必要參數: chat_log_id',
        },
        { status: 400 }
      );
    }

    const db = initDB();
    await db.connect();

    try {
      // 準備更新資料
      const patch: Partial<ChatLog> = {};
      if (chat_history !== undefined) {
        patch.chat_history = typeof chat_history === 'string' ? chat_history : JSON.stringify(chat_history);
      }
      if (chat_count !== undefined) {
        patch.chat_count = chat_count;
      }
      if (background_info !== undefined) {
        patch.background_info = background_info;
      }

      // 更新記錄
      await db.updateRowById(ChatLogModel, chat_log_id, patch);

      await db.disconnect();

      return NextResponse.json({
        success: true,
        message: '成功更新 ChatLog 記錄',
      });
    } catch (error) {
      await db.disconnect();
      throw error;
    }
  } catch (error) {
    console.error('Failed to update ChatLog:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '更新 ChatLog 記錄失敗',
      },
      { status: 500 }
    );
  }
}
