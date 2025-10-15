import { NextResponse } from 'next/server';

import { directorRole } from '@/lib/aiCharacter';

export async function GET() {
  try {
    const total = await directorRole.getStudentRoleCount();
    return NextResponse.json({ total });
  } catch (error) {
    const message = error instanceof Error ? error.message : '取得學生角色數量失敗。';
    return NextResponse.json({ error: { message } }, { status: 500 });
  }
}
