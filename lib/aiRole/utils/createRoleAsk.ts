import 'server-only';

import { extractAIResponseText } from '@/lib/aiRole/utils/extractResponseText';

import type { AskFunction, AskResult } from '../types';

type RoleOptions = {
  botIdEnvVar: string;
  fallbackBotIdEnvVar?: string;
};

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

    const raw = await callOpenAI(apiKey, payload);
    const result = extractAIResponseText(raw);

    return { result, raw };
  };
}

export type { RoleOptions };
