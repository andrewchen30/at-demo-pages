import { NextResponse } from 'next/server';

import { judgeRole } from '@/lib/aiCharacter';
import { getCheckListForAI } from '@/lib/aiCharacter/director/utils';

type EvaluateRequestBody = {
  chatHistory?: unknown;
  variables?: unknown;
  input?: unknown;
  chapter?: unknown;
  part?: unknown;
  partN?: unknown;
};

type OpenAIMessage = {
  role?: unknown;
  content?: unknown;
};

type EvaluateSuccessResponse = {
  judgeResult: string;
  raw?: {
    judge?: unknown;
  };
};

type EvaluateErrorResponse = {
  error: {
    message: string;
  };
};

function ensureRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function normalizeChapter(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const normalized = Math.trunc(value);
    return normalized >= 1 ? normalized : undefined;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return undefined;
    }

    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isNaN(parsed) && Number.isFinite(parsed) && parsed >= 1) {
      return parsed;
    }
  }

  return undefined;
}

function getTextFromMessageContent(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((entry) => {
        if (!entry || typeof entry !== 'object') {
          return '';
        }

        const maybeText = (entry as { text?: unknown; output_text?: unknown }).text;
        if (typeof maybeText === 'string') {
          return maybeText;
        }

        const maybeOutputText = (entry as { output_text?: unknown }).output_text;
        if (typeof maybeOutputText === 'string') {
          return maybeOutputText;
        }

        return '';
      })
      .filter((text) => text.length > 0)
      .join('\n');
  }

  return '';
}

function stringFromChatHistoryArray(history: unknown): string | undefined {
  if (!Array.isArray(history)) {
    return undefined;
  }

  const lines = history
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return '';
      }

      const { role, content } = entry as { role?: unknown; content?: unknown };
      const roleLabel = typeof role === 'string' ? role : 'assistant';
      const textContent = typeof content === 'string' ? content : getTextFromMessageContent(content);

      if (!textContent || textContent.trim().length === 0) {
        return '';
      }

      const displayRole = roleLabel === 'user' ? '老師' : roleLabel === 'assistant' ? '學生' : roleLabel;
      return `${displayRole}: ${textContent.trim()}`;
    })
    .filter((line) => line.length > 0);

  return lines.length > 0 ? lines.join('\n') : undefined;
}

function extractChatHistory(
  body: EvaluateRequestBody,
  variables: Record<string, unknown>
): { text: string; messages: OpenAIMessage[] } | EvaluateErrorResponse {
  const possibleMessages = Array.isArray(body.input) ? (body.input as OpenAIMessage[]) : [];
  const fromVariables =
    typeof variables.chat_history === 'string'
      ? variables.chat_history
      : typeof variables.chatHistory === 'string'
      ? variables.chatHistory
      : undefined;

  if (fromVariables && fromVariables.trim().length > 0) {
    return { text: fromVariables.trim(), messages: possibleMessages };
  }

  if (typeof body.chatHistory === 'string' && body.chatHistory.trim().length > 0) {
    return { text: body.chatHistory.trim(), messages: possibleMessages };
  }

  const fromArray = stringFromChatHistoryArray(body.chatHistory) ?? stringFromChatHistoryArray(possibleMessages);
  if (fromArray && fromArray.trim().length > 0) {
    return { text: fromArray.trim(), messages: possibleMessages };
  }

  return { error: { message: '請提供有效的 chatHistory。' } };
}

function extractCheckList(
  body: EvaluateRequestBody,
  variables: Record<string, unknown>
): { chapter?: number; checkList: string } | EvaluateErrorResponse {
  const chapterCandidate =
    normalizeChapter(variables.chapter) ??
    normalizeChapter(variables.part) ??
    normalizeChapter(variables.partN) ??
    normalizeChapter(body.chapter) ??
    normalizeChapter(body.part) ??
    normalizeChapter(body.partN);

  let checkList: string | undefined;

  if (typeof variables.check_list === 'string' && variables.check_list.trim().length > 0) {
    checkList = variables.check_list.trim();
  } else if (typeof variables.checkList === 'string' && variables.checkList.trim().length > 0) {
    checkList = variables.checkList.trim();
  }

  if (chapterCandidate) {
    const computed = getCheckListForAI(chapterCandidate).trim();
    if (computed.length > 0) {
      checkList = computed;
    }
  }

  if (!checkList) {
    return { error: { message: '無法取得檢查清單，請提供有效的 chapter 或 check_list。' } };
  }

  return { chapter: chapterCandidate, checkList };
}

export async function POST(request: Request) {
  let body: EvaluateRequestBody;
  try {
    body = (await request.json()) as EvaluateRequestBody;
  } catch {
    return NextResponse.json({ error: { message: '請提供有效的 JSON 內容。' } }, { status: 400 });
  }

  const variables = ensureRecord(body?.variables);
  const chatHistoryResult = extractChatHistory(body, variables);
  if ('error' in chatHistoryResult) {
    return NextResponse.json(chatHistoryResult, { status: 400 });
  }

  const checkListResult = extractCheckList(body, variables);
  if ('error' in checkListResult) {
    return NextResponse.json(checkListResult, { status: 400 });
  }

  const { text: chatHistoryText, messages } = chatHistoryResult;
  const { checkList } = checkListResult;

  try {
    const judgeResponse = await judgeRole.ask(
      '',
      {
        chat_history: chatHistoryText,
        check_list: checkList,
      },
      undefined
      // messages
    );

    const judgeResult = judgeResponse.result.trim();

    // 只返回解析好的 judgeResult，避免在 response 中重複包含相同內容
    // raw 數據已經包含在 judgeResult 中，不需要再返回完整的原始回應
    const response: EvaluateSuccessResponse = {
      judgeResult,
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : '評估失敗，請稍後再試。';
    const errorResponse: EvaluateErrorResponse = { error: { message } };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
