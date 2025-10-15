import { NextRequest, NextResponse } from 'next/server';
import type { ChatLog } from '@/lib/database';
import { ChatLogsRepo } from '@/lib/database/repository/chatLogs';

// 初始化資料庫連接
// 已由 Repository 封裝 DB 連線與 createModel

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    let result: any;

    switch (action) {
      case 'appendRow': {
        const { teacher_name, chat_history, chat_count, background_info } = data;
        const id = await ChatLogsRepo.create({
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
        await ChatLogsRepo.updateById(id, patch);
        result = { success: true, message: `成功更新 ID: ${id}` };
        break;
      }

      case 'upsertByKey': {
        const { key, row } = data;
        await ChatLogsRepo.upsertByTeacher(key, row as ChatLog);
        result = { success: true, message: `成功 upsert key: ${key}` };
        break;
      }

      case 'getById': {
        const { id } = data;
        const record = await ChatLogsRepo.getById(id);
        result = { success: true, record, message: record ? `找到資料` : `未找到 ID: ${id}` };
        break;
      }

      case 'findFirst': {
        const { where } = data;
        const record = await ChatLogsRepo.findFirst(where);
        result = { success: true, record, message: record ? `找到資料` : `未找到符合條件的資料` };
        break;
      }

      case 'list': {
        const { offset, limit, orderBy } = data || {};
        const records = await ChatLogsRepo.list({
          offset: offset || 0,
          limit: limit || 10,
          orderBy: (orderBy as keyof ChatLog) || 'created_at',
        });
        result = { success: true, records, count: records.length, message: `找到 ${records.length} 筆資料` };
        break;
      }

      default:
        return NextResponse.json({ success: false, error: `未知的操作: ${action}` }, { status: 400 });
    }

    return NextResponse.json(result);
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
    const records = await ChatLogsRepo.list({ offset: 0, limit: 50, orderBy: 'created_at' });
    return NextResponse.json({
      success: true,
      records,
      count: records.length,
    });
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
