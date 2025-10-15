import { NextRequest, NextResponse } from 'next/server';
import type { ChatLog } from '@/lib/database';
import { ChatLogsRepo } from '@/lib/database/repository/chatLogs';

// 初始化資料庫連接
// 已由 Repository 封裝 DB 連線與 createModel

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

    const id = await ChatLogsRepo.create({
      id: chat_log_id,
      teacher_name,
      chat_history: chat_history || '',
      chat_count: chat_count || 0,
      background_info: background_info || '',
    } as Partial<ChatLog> as ChatLog);

    return NextResponse.json({
      success: true,
      id,
      message: '成功建立 ChatLog 記錄',
    });
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
 * 取得所有 ChatLog 記錄
 */
export async function GET(request: NextRequest) {
  try {
    const logs = await ChatLogsRepo.list();
    return NextResponse.json({
      success: true,
      data: logs,
      count: logs.length,
    });
  } catch (error) {
    console.error('Failed to fetch ChatLogs:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '獲取 ChatLog 記錄失敗',
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

    await ChatLogsRepo.updateById(chat_log_id, patch);

    return NextResponse.json({
      success: true,
      message: '成功更新 ChatLog 記錄',
    });
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
