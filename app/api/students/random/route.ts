import { NextResponse } from 'next/server';

import { directorRole } from '@/lib/aiCharacter';
import { ensureRolesLoaded } from '@/lib/aiCharacter/director/studentScript';

export async function GET() {
  try {
    await ensureRolesLoaded();
    const role = await directorRole.getRandomStudentRole();
    // 將 raw 解析為物件回傳，避免前端再度 JSON.parse 出錯
    let parsed: unknown = role.role;
    try {
      parsed = JSON.parse(role.role);
    } catch {
      // 保留原字串，以利除錯
    }
    return NextResponse.json({
      role: parsed,
      total: role.total,
      createdAt: role.createdAt,
      index: role.index,
    });
  } catch (error) {
    if (error instanceof directorRole.StudentRoleStoreEmptyError) {
      return NextResponse.json({ error: { message: error.message } }, { status: 404 });
    }

    const message = error instanceof Error ? error.message : '取得學生角色失敗。';
    return NextResponse.json({ error: { message } }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
