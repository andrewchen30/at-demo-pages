import { NextResponse } from 'next/server';

import { directorRole } from '@/lib/aiCharacter';
import { ensureRolesLoaded } from '@/lib/aiCharacter/director/studentScript';

export async function POST() {
  try {
    const result = await directorRole.clearStudentRoles();
    await ensureRolesLoaded();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : '清除學生角色失敗。';
    return NextResponse.json({ error: { message } }, { status: 500 });
  }
}
