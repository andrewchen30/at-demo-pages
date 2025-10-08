import { NextResponse } from 'next/server';
import { getRandomStudentRole } from '@/lib/server/studentRoles';

export async function GET() {
  try {
    const data = await getRandomStudentRole();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : '取得學生角色時發生未知錯誤';
    return NextResponse.json({ error: { message } }, { status: 500 });
  }
}
