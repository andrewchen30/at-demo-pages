import { NextResponse } from 'next/server';

import { AIGenStudentsRepo } from '@/lib/repository/studentScript';
import { ensureRolesLoaded } from '@/lib/aiCharacter/director/studentScript';
import { directorRole } from '@/lib/aiCharacter';

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, error: '請提供要刪除的 ID 陣列。' }, { status: 400 });
    }

    // 刪除指定的角色
    await AIGenStudentsRepo.deleteByIds(ids);

    // 重新載入角色到記憶體
    await ensureRolesLoaded();

    // 獲取剩餘總數
    const total = await directorRole.getStudentRoleCount();

    return NextResponse.json({
      success: true,
      deleted: ids.length,
      total,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '刪除學生角色失敗。';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
