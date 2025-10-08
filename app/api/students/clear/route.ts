import { NextResponse } from 'next/server';

import { directorRole } from '@/lib/aiRole';

export async function POST() {
  try {
    const result = await directorRole.clearStudentRoles();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : '清除學生角色失敗。';
    return NextResponse.json({ error: { message } }, { status: 500 });
  }
}
