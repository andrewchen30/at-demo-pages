'use client';

import { useCallback, useMemo, useRef } from 'react';
import type { DirectorInput } from '@/lib/aiCharacter/student/types';
import type { BotType, ChatHistoryEntry, ConnectionStatus, WorkflowStep } from '../types';
import type { JudgeResultData } from '../judgeParser';
import { createMessage, getMessagesForAIStudent, getMessagesForAICoach } from '../messageUtils/index';
import { getStudentAIParams, getCoachAIParams } from '@/lib/aiCharacter/director/utils';

export interface UseChatActionsParams {
  scriptwriterResponse: DirectorInput | null;
  chapterNumber: number;
  chatHistory: ChatHistoryEntry[];
  workflowStep: WorkflowStep;
  isCreatingStudent: boolean;
  isThinking: boolean;
  isSummarizing: boolean;
  isJudging: boolean;
  latestJudgeResult: JudgeResultData | null;
  setChatHistory: React.Dispatch<React.SetStateAction<ChatHistoryEntry[]>>;
  setConnectionStatus: React.Dispatch<React.SetStateAction<ConnectionStatus>>;
  setIsThinking: React.Dispatch<React.SetStateAction<boolean>>;
  setIsSummarizing: React.Dispatch<React.SetStateAction<boolean>>;
  callJudgeAPI: () => Promise<JudgeResultData | null>;
  showFlash: (flash: { type: 'success' | 'error'; message: string }) => void;
}

export interface UseChatActionsResult {
  isThinking: boolean;
  isSummarizing: boolean;
  canSummarize: boolean;
  chatInputRef: React.RefObject<HTMLTextAreaElement>;
  autoResizeTextarea: () => void;
  sendMessage: () => Promise<void>;
  generateSummary: () => Promise<
    | {
        judgeResult: JudgeResultData;
        coachResult: string;
      }
    | undefined
  >;
}

/**
 * Hook: 聊天互動動作 + UI 輔助
 * 職責：
 * - 管理 isThinking、isSummarizing
 * - 管理 chatInputRef（UI ref）
 * - 提供 autoResizeTextarea 函數
 * - 提供 canSummarize 衍生值
 * - 提供 sendMessage 函數
 * - 提供 generateSummary 函數
 * - 內部包含 callOpenAI 函數
 */
export function useChatActions(params: UseChatActionsParams): UseChatActionsResult {
  const {
    scriptwriterResponse,
    chapterNumber,
    chatHistory,
    isJudging,
    latestJudgeResult,
    setChatHistory,
    setConnectionStatus,
    callJudgeAPI,
    showFlash,
  } = params;

  // 從 params 中提取或使用內部狀態
  const [isThinking, setIsThinking] = [params.isThinking ?? false, params.setIsThinking];
  const [isSummarizing, setIsSummarizing] = [params.isSummarizing ?? false, params.setIsSummarizing];

  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);

  const canSummarize = chatHistory.length > 0;

  const autoResizeTextarea = useCallback(() => {
    const el = chatInputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, []);

  const getVariables = useCallback(
    (botType: BotType = 'student'): Record<string, unknown> => {
      const script = scriptwriterResponse ?? {};
      switch (botType) {
        case 'student':
          return {
            ...getStudentAIParams(script, chapterNumber),
            native_language: 'zh-tw,繁體中文,中文',
            learning_language: '英文,美式英文',
          } as Record<string, unknown>;
        case 'coach':
          return {
            ...getCoachAIParams(script, chapterNumber),
            chat_history: getMessagesForAICoach(chatHistory),
          } as Record<string, unknown>;
        default:
          return {};
      }
    },
    [scriptwriterResponse, chapterNumber, chatHistory]
  );

  const callOpenAI = useCallback(
    async (
      botType: BotType = 'student',
      message?: string,
      judgeResultParam?: JudgeResultData
    ): Promise<{ result: string; judgeResult?: string }> => {
      const botEndpointMap: Record<BotType, string> = {
        student: '/api/students/chat',
        coach: '/api/coaches/feedback',
      };
      const url = botEndpointMap[botType];
      const variables = getVariables(botType);

      let preparedInput;
      if (botType === 'student') {
        // 使用 getMessagesForAIStudent 取得對話歷史
        const messages = getMessagesForAIStudent(chatHistory);
        // 如果有新訊息，附加到尾端
        if (message) {
          messages.push({
            role: 'user',
            content: [{ type: 'input_text', text: message }],
          });
        }
        preparedInput = messages;
      } else {
        // coach 不需要 input，只需要 variables
        preparedInput = [{ role: 'user', content: [{ type: 'input_text', text: '' }] }];
      }

      const body =
        botType === 'coach' && judgeResultParam
          ? { variables, input: preparedInput, judgeResult: JSON.stringify(judgeResultParam) }
          : { variables, input: preparedInput };

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        let message = resp.statusText;
        try {
          const err = await resp.json();
          message = err?.error?.message || err?.message || message;
        } catch {
          // ignore
        }
        throw new Error(`API 錯誤: ${resp.status} - ${message}`);
      }
      const data = await resp.json();
      return {
        result: data.result ?? '',
        judgeResult: data.judgeResult,
      };
    },
    [getVariables, chatHistory]
  );

  const sendMessage = useCallback(async () => {
    const el = chatInputRef.current;
    const message = (el?.value || '').trim();
    if (!message) return;

    setChatHistory((prev) => [...prev, createMessage('teacher', message)]);
    if (el) {
      el.value = '';
      autoResizeTextarea();
    }
    setIsThinking(true);
    setConnectionStatus('thinking');
    try {
      const response = await callOpenAI('student', message);
      setChatHistory((prev) => [...prev, createMessage('student', response.result)]);
      setConnectionStatus('connected');

      // 學生回覆後，在背景自動觸發 judge 評估
      callJudgeAPI();
    } catch (e) {
      const text = e instanceof Error ? e.message : '未知錯誤';
      setChatHistory((prev) => [...prev, createMessage('student', `錯誤: ${text}`)]);
      setConnectionStatus('disconnected');
    } finally {
      setIsThinking(false);
    }
  }, [autoResizeTextarea, callOpenAI, callJudgeAPI, setChatHistory, setConnectionStatus, setIsThinking]);

  const generateSummary = useCallback(async (): Promise<
    | {
        judgeResult: JudgeResultData;
        coachResult: string;
      }
    | undefined
  > => {
    if (chatHistory.length === 0) {
      showFlash({ type: 'error', message: '沒有對話記錄可以總結' });
      return undefined;
    }
    setIsSummarizing(true);
    try {
      // 等待背景 judge 完成（如果正在進行中）或使用已完成的結果
      let judgeResult = latestJudgeResult;

      if (!judgeResult || isJudging) {
        // 如果沒有 judge 結果或正在進行中，等待完成
        judgeResult = await callJudgeAPI();

        // 如果還是沒有結果（例如被取消或失敗），拋出錯誤
        if (!judgeResult) {
          throw new Error('無法取得評估結果，請稍後再試');
        }
      }

      // 使用 judge 結果呼叫 coach API
      const response = await callOpenAI('coach', undefined, judgeResult);

      // 將教練回饋添加到聊天記錄中，以便能夠同步到 Google Spreadsheet
      const coachMessage = `教練總結\n${response.result}`;
      setChatHistory((prev) => [...prev, createMessage('coach', coachMessage)]);

      return {
        judgeResult: judgeResult,
        coachResult: response.result,
      };
    } catch (e) {
      const text = e instanceof Error ? e.message : '未知錯誤';
      showFlash({ type: 'error', message: `教練 Bot 錯誤: ${text}` });
      return undefined;
    } finally {
      setIsSummarizing(false);
    }
  }, [
    callOpenAI,
    callJudgeAPI,
    chatHistory.length,
    latestJudgeResult,
    isJudging,
    setChatHistory,
    setIsSummarizing,
    showFlash,
  ]);

  return {
    isThinking,
    isSummarizing,
    canSummarize,
    chatInputRef,
    autoResizeTextarea,
    sendMessage,
    generateSummary,
  };
}
