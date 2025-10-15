import 'server-only';

import { extractAIResponseText } from '@/lib/aiRole/utils/extractResponseText';

import type { AskFunction, AskResult } from '../types';

type RoleOptions = {
  botIdEnvVar: string;
  fallbackBotIdEnvVar?: string;
};

// 美化 console.log 的輔助函數
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

function formatLog(title: string, data: unknown, color: string) {
  const timestamp = new Date().toISOString();
  console.log(`\n${color}${'='.repeat(80)}${colors.reset}`);
  console.log(`${color}${colors.bright}🤖 ${title}${colors.reset} ${colors.cyan}[${timestamp}]${colors.reset}`);
  console.log(`${color}${'='.repeat(80)}${colors.reset}`);

  if (typeof data === 'string') {
    console.log(data);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }

  console.log(`${color}${'='.repeat(80)}${colors.reset}\n`);
}

function truncateText(text: string, maxLength: number = 200): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '... (已截斷)';
}

function resolveBotId({ botIdEnvVar, fallbackBotIdEnvVar }: RoleOptions) {
  const primary = process.env[botIdEnvVar];
  if (primary && primary.length > 0) {
    return primary;
  }

  if (fallbackBotIdEnvVar) {
    const fallback = process.env[fallbackBotIdEnvVar];
    if (fallback && fallback.length > 0) {
      return fallback;
    }
  }

  const displayName = fallbackBotIdEnvVar ? `${botIdEnvVar} 或 ${fallbackBotIdEnvVar}` : botIdEnvVar;
  throw new Error(`Bot ID 環境變數 (${displayName}) 未設定。`);
}

function ensurePlainObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function ensureArray(value: unknown): unknown[] {
  return Array.isArray(value) ? [...value] : [];
}

async function callOpenAI(apiKey: string, payload: Record<string, unknown>): Promise<AskResult['raw']> {
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
    const message = (errorData && (errorData.error?.message || errorData.message)) || response.statusText;
    throw new Error(message);
  }

  return response.json();
}

export function createRoleAsk<Variables extends Record<string, unknown> = Record<string, unknown>>(
  options: RoleOptions
): AskFunction<Variables> {
  return async function ask(textMessage: string, variables: Variables = {} as Variables, chatHistory: unknown[] = []) {
    const botId = resolveBotId(options);
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key is not configured on the server.');
    }

    const sanitizedVariables = ensurePlainObject(variables);
    const sanitizedHistory = ensureArray(chatHistory);

    // 📥 LOG 1: 輸入參數
    formatLog(
      'AI INPUT - 輸入參數',
      {
        botId: botId,
        messagePreview: truncateText(textMessage),
        messageLength: textMessage.length,
        variables: sanitizedVariables,
        historyLength: chatHistory.length,
      },
      colors.blue
    );

    const trimmedMessage = typeof textMessage === 'string' ? textMessage.trim() : '';

    const inputHistory = sanitizedHistory.map((entry) => entry);

    if (trimmedMessage.length > 0) {
      inputHistory.push({
        role: 'user',
        content: [{ type: 'input_text', text: trimmedMessage }],
      });
    }

    const payload = {
      prompt: {
        id: botId,
        variables: sanitizedVariables,
      },
      input:
        inputHistory.length > 0
          ? inputHistory
          : [
              {
                role: 'user',
                content: [{ type: 'input_text', text: '' }],
              },
            ],
    };

    // 📤 LOG 2: 發送給 OpenAI 的 Payload
    formatLog(
      'AI REQUEST - 發送給 OpenAI 的 Payload',
      {
        botId: payload.prompt.id,
        variables: payload.prompt.variables,
        inputHistoryLength: payload.input.length,
        lastInput: payload.input[payload.input.length - 1],
      },
      colors.yellow
    );

    const raw = await callOpenAI(apiKey, payload);

    // 📨 LOG 3: 從 OpenAI 收到的原始回應
    formatLog(
      'AI RESPONSE - OpenAI 原始回應',
      {
        hasResponse: !!raw,
        responseKeys: raw ? Object.keys(raw) : [],
        responsePreview: raw ? JSON.stringify(raw).substring(0, 300) + '...' : null,
      },
      colors.magenta
    );

    const result = extractAIResponseText(raw);

    // ✅ LOG 4: 提取後的最終結果
    formatLog(
      'AI OUTPUT - 最終結果',
      {
        resultPreview: truncateText(result, 10000),
        resultLength: result.length,
      },
      colors.green
    );

    return { result, raw };
  };
}

export type { RoleOptions };
