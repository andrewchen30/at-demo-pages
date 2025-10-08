import { NextResponse } from 'next/server';
import { appendStudentRoles } from '@/lib/server/studentRoles';

type RefreshRequestBody = {
  count?: number;
};

export async function POST(request: Request) {
  let payload: RefreshRequestBody = {};

  try {
    payload = (await request.json()) as RefreshRequestBody;
  } catch {
    // ignore invalid payloads and fallback to default count
  }

  const count = typeof payload.count === 'number' && payload.count > 0 ? payload.count : undefined;

  try {
    const { added, total } = await appendStudentRoles(count);
    return NextResponse.json({ added, total });
  } catch (error) {
    const message = error instanceof Error ? error.message : '刷新學生角色時發生未知錯誤';
    return NextResponse.json({ error: { message } }, { status: 500 });
  }
}
