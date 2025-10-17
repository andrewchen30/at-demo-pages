import { NextResponse } from 'next/server';

import { AIGenStudentsRepo } from '@/lib/repository/studentScript';

export async function GET() {
  try {
    const students = await AIGenStudentsRepo.list({ orderBy: 'created_at' });
    return NextResponse.json({ success: true, data: students });
  } catch (error) {
    const message = error instanceof Error ? error.message : '獲取學生角色列表失敗。';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
