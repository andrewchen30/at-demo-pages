import { NextResponse } from 'next/server';

import { clearStudentRoles } from '@/lib/server/studentRoles';

export async function POST() {
  try {
    const result = await clearStudentRoles();
    return NextResponse.json({ cleared: true, total: result.total });
  } catch (error) {
    const message = error instanceof Error ? error.message : '清除學生角色快取時發生未知錯誤';
    return NextResponse.json({ error: { message } }, { status: 500 });
  }
}
