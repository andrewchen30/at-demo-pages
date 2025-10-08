import { NextResponse } from 'next/server';

import { extractResponseText } from '@/lib/server/openaiResponse';

type BotType = 'scriptwriter' | 'student' | 'coach';

type OpenAIRequestBody = {
  botType: BotType;
  version?: string;
  variables?: Record<string, unknown>;
  input: unknown;
};

const BOT_CONFIG: Record<BotType, { id?: string; version?: string }> = {
  scriptwriter: {
    id: process.env.OPENAI_SCRIPTWRITER_BOT_ID,
    version: process.env.OPENAI_SCRIPTWRITER_BOT_VERSION,
  },
  student: {
    id: process.env.OPENAI_STUDENT_BOT_ID,
    version: process.env.OPENAI_STUDENT_BOT_VERSION,
  },
  coach: {
    id: process.env.OPENAI_COACH_BOT_ID,
    version: process.env.OPENAI_COACH_BOT_VERSION,
  },
};

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: { message: 'OpenAI API key is not configured on the server.' } },
      { status: 500 }
    );
  }

  let body: OpenAIRequestBody;
  try {
    body = (await request.json()) as OpenAIRequestBody;
  } catch (error) {
    return NextResponse.json(
      { error: { message: 'Invalid JSON payload.' } },
      { status: 400 }
    );
  }

  const { botType, version, variables = {}, input } = body;
  if (!botType || !['scriptwriter', 'student', 'coach'].includes(botType)) {
    return NextResponse.json(
      { error: { message: 'Invalid bot type provided.' } },
      { status: 400 }
    );
  }

  const config = BOT_CONFIG[botType as BotType];
  if (!config?.id) {
    return NextResponse.json(
      { error: { message: `Bot ID for ${botType} is not configured on the server.` } },
      { status: 500 }
    );
  }

  const resolvedVersion = version?.trim() || config.version;
  if (!resolvedVersion) {
    return NextResponse.json(
      { error: { message: `Bot version for ${botType} is not configured.` } },
      { status: 500 }
    );
  }

  const payload = {
    prompt: {
      id: config.id,
      version: resolvedVersion,
      variables,
    },
    input,
  };

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const message =
        (errorData && (errorData.error?.message || errorData.message)) || response.statusText;
      return NextResponse.json({ error: { message } }, { status: response.status });
    }

    const data = await response.json();
    const result = extractResponseText(data);

    return NextResponse.json({ result, raw: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error calling OpenAI API';
    return NextResponse.json({ error: { message } }, { status: 500 });
  }
}
