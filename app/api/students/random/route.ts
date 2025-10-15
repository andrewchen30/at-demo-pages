import { NextResponse } from 'next/server';

import { directorRole } from '@/lib/aiRole';
import { ensureRolesLoaded } from '@/lib/aiRole/director/studentRoleScript';

export async function GET() {
  try {
    await ensureRolesLoaded();
    const role = await directorRole.getRandomStudentRole();
    return NextResponse.json(role);
  } catch (error) {
    if (error instanceof directorRole.StudentRoleStoreEmptyError) {
      return NextResponse.json({ error: { message: error.message } }, { status: 404 });
    }

    const message = error instanceof Error ? error.message : '取得學生角色失敗。';
    return NextResponse.json({ error: { message } }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
