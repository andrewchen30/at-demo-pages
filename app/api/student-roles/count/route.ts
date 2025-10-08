import { NextResponse } from 'next/server';
import { getStudentRoleCount } from '@/lib/server/studentRoles';

export async function GET() {
  try {
    const total = await getStudentRoleCount();
    return NextResponse.json({ total });
  } catch (error) {
    const message = error instanceof Error ? error.message : '取得學生角色數量時發生未知錯誤';
    return NextResponse.json({ error: { message } }, { status: 500 });
  }
}
