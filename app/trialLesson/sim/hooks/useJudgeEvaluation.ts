'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DirectorInput } from '@/lib/aiCharacter/student/types';
import type { ChatHistoryEntry } from '../types';
import { parseJudgeResult, type JudgeResultData } from '../judgeParser';
import { getStudentAIParams } from '@/lib/aiCharacter/director/utils';
import { getMessagesForAICoach } from '../messageUtils/index';

export interface UseJudgeEvaluationParams {
  scriptwriterResponse: DirectorInput | null;
  chapterNumber: number;
  chatHistory: ChatHistoryEntry[];
}

export interface UseJudgeEvaluationResult {
  isJudging: boolean;
  latestJudgeResult: JudgeResultData | null;
  callJudgeAPI: () => Promise<JudgeResultData | null>;
  clearJudgeState: () => void;
}

/**
 * Hook: Judge 評估功能
 * 職責：
 * - 管理 isJudging、latestJudgeResult
 * - 提供 callJudgeAPI 函數
 * - 管理 AbortController（取消請求）
 * - 提供 clearJudgeState 函數
 * - cleanup effect 取消進行中的請求
 */
export function useJudgeEvaluation({
  scriptwriterResponse,
  chapterNumber,
  chatHistory,
}: UseJudgeEvaluationParams): UseJudgeEvaluationResult {
  const [isJudging, setIsJudging] = useState(false);
  const [latestJudgeResult, setLatestJudgeResult] = useState<JudgeResultData | null>(null);
  const judgeAbortControllerRef = useRef<AbortController | null>(null);

  const callJudgeAPI = useCallback(async (): Promise<JudgeResultData | null> => {
    // 取消舊的 judge 請求
    if (judgeAbortControllerRef.current) {
      judgeAbortControllerRef.current.abort();
    }

    // 建立新的 AbortController
    const abortController = new AbortController();
    judgeAbortControllerRef.current = abortController;

    const script = scriptwriterResponse ?? {};
    const variables = {
      ...getStudentAIParams(script, chapterNumber),
      chat_history: getMessagesForAICoach(chatHistory),
      chapter: chapterNumber,
    };

    const messages = chatHistory
      .filter((msg) => msg.role === 'teacher' || msg.role === 'student')
      .map((msg) => ({
        role: msg.role === 'teacher' ? ('user' as const) : ('assistant' as const),
        content: [{ type: 'input_text' as const, text: msg.text }],
      }));

    const preparedInput = messages;
    const body = { variables, input: preparedInput, chapter: chapterNumber };

    setIsJudging(true);

    try {
      const resp = await fetch('/api/judges/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: abortController.signal,
      });

      if (!resp.ok) {
        let message = resp.statusText;
        try {
          const err = await resp.json();
          message = err?.error?.message || err?.message || message;
        } catch {
          // ignore
        }
        throw new Error(`Judge API 錯誤: ${resp.status} - ${message}`);
      }

      const data = await resp.json();
      const judgeResultString = data.judgeResult ?? '';

      // 解析 judge 結果為結構化數據
      const judgeResult = parseJudgeResult(judgeResultString);

      setLatestJudgeResult(judgeResult);
      return judgeResult;
    } catch (error) {
      // 如果是取消請求，不顯示錯誤
      if (error instanceof Error && error.name === 'AbortError') {
        return null;
      }

      console.error('背景 Judge 評估失敗:', error);
      // 背景請求失敗不顯示 flash，因為不影響主流程
      return null;
    } finally {
      setIsJudging(false);
      if (judgeAbortControllerRef.current === abortController) {
        judgeAbortControllerRef.current = null;
      }
    }
  }, [scriptwriterResponse, chapterNumber, chatHistory]);

  const clearJudgeState = useCallback(() => {
    setLatestJudgeResult(null);
    setIsJudging(false);
    if (judgeAbortControllerRef.current) {
      judgeAbortControllerRef.current.abort();
      judgeAbortControllerRef.current = null;
    }
  }, []);

  // Cleanup effect: 取消進行中的 judge 請求
  useEffect(() => {
    return () => {
      if (judgeAbortControllerRef.current) {
        judgeAbortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    isJudging,
    latestJudgeResult,
    callJudgeAPI,
    clearJudgeState,
  };
}
