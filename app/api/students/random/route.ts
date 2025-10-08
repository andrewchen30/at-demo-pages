import { NextResponse } from 'next/server';

import { getRandomStudentRole, StudentRoleStoreEmptyError } from '@/lib/server/studentRoles';

export async function GET() {
  try {
    const role = await getRandomStudentRole();
    return NextResponse.json(role);
  } catch (error) {
    if (error instanceof StudentRoleStoreEmptyError) {
      return NextResponse.json({ error: { message: error.message } }, { status: 404 });
    }

    const message = error instanceof Error ? error.message : '取得學生角色失敗。';
    return NextResponse.json({ error: { message } }, { status: 500 });
  }
}
