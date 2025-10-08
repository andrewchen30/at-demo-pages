import { NextResponse } from 'next/server';

import {
  appendStudentRoles,
  StudentRoleInvalidCountError,
} from '@/lib/server/studentRoles';

function normalizeCount(value: unknown): number | undefined {
  if (typeof value === 'undefined') {
    return undefined;
  }

  if (typeof value === 'number') {
    return Number.isNaN(value) ? undefined : Math.trunc(value);
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  return undefined;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { message: '請提供有效的 JSON 內容。' } }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: { message: '請提供有效的請求內容。' } }, { status: 400 });
  }

  const { count: rawCount } = body as { count?: unknown };
  const count = normalizeCount(rawCount);

  try {
    const result = await appendStudentRoles(count);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof StudentRoleInvalidCountError) {
      return NextResponse.json({ error: { message: error.message } }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : '產生學生角色失敗。';
    return NextResponse.json({ error: { message } }, { status: 500 });
  }
}
