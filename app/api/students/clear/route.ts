import { NextResponse } from 'next/server';

import { clearStudentRoles } from '@/lib/server/studentRoles';

export async function POST() {
  try {
    const result = await clearStudentRoles();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : '清除學生角色失敗。';
    return NextResponse.json({ error: { message } }, { status: 500 });
  }
}
