import { NextResponse } from 'next/server';

import { studentRole } from '@/lib/aiCharacter';
import type { StudentVariables } from '@/lib/aiCharacter/student';

type ChatRequestBody = {
  textMessage?: unknown;
  variables?: unknown;
  input?: unknown;
};

function ensureRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function ensureArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export async function POST(request: Request) {
  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: { message: '請提供有效的 JSON 內容。' } }, { status: 400 });
  }

  const textMessage = body?.textMessage ?? '';
  if (typeof textMessage !== 'string') {
    return NextResponse.json({ error: { message: 'textMessage 必須是字串。' } }, { status: 400 });
  }

  const rawVariables = ensureRecord(body?.variables);
  const chatHistory = ensureArray(body?.input);

  // 確保 variables 符合 StudentVariables 類型，使用 snake_case 傳遞給 OpenAI
  const variables: StudentVariables = {
    ...rawVariables,
    persona: typeof rawVariables.persona === 'string' ? rawVariables.persona : '',
    dialog: typeof rawVariables.dialog === 'string' ? rawVariables.dialog : undefined,
  };

  try {
    const response = await studentRole.ask(textMessage, variables, chatHistory);
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : '學生角色回應失敗，請稍後再試。';
    return NextResponse.json({ error: { message } }, { status: 500 });
  }
}
