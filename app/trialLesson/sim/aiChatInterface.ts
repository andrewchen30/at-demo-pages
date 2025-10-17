'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  getCoachAIParams,
  getStudentAIParams,
  getTeacherHintText,
  getUserBrief,
  getDialog,
  getCheckListForTeacher,
  getScriptedChatHistory,
} from '@/lib/aiCharacter/director/utils';
import type { DirectorInput } from '@/lib/aiCharacter/student/types';
import type {
  BotType,
  WorkflowStep,
  ConnectionStatus,
  ChatHistoryEntry,
  FlashMessage,
  UseTrialLessonChatResult,
} from './types';
import { GUIDE_CONTENT } from '@/app/trialLesson/guideBook/guideContent';
import { createMessage, getMessagesForAIStudent, getMessagesForAICoach } from './messageUtils/index';
import { parseJudgeResult, type JudgeResultData } from './judgeParser';

export function useTrialLessonChat(): UseTrialLessonChatResult {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 移除 adminMode 對外回傳，但內部仍可依網址參數切行為（若未來需要可完全刪除）
  const [adminMode, setAdminMode] = useState(false);
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('idle');
  const [currentBot] = useState<BotType>('student');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');

  const [chatHistory, setChatHistory] = useState<ChatHistoryEntry[]>([]);
  const [preludeCount, setPreludeCount] = useState<number>(0);
  const [scriptwriterResponse, setScriptwriterResponse] = useState<DirectorInput | null>(null);
  const [systemMessage, setSystemMessage] = useState('');
  const [systemUserBrief, setSystemUserBrief] = useState<string[]>([]);
  const [systemDialog, setSystemDialog] = useState<string[]>([]);
  const [systemChecklist, setSystemChecklist] = useState<string[]>([]);

  const [chapterNumber, setChapterNumber] = useState<number>(1);
  // 移除 JSON 摺疊功能

  const [isThinking, setIsThinking] = useState(false);
  const [isCreatingStudent, setIsCreatingStudent] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isJudging, setIsJudging] = useState(false);
  const [latestJudgeResult, setLatestJudgeResult] = useState<JudgeResultData | null>(null);

  const [flash, setFlash] = useState<FlashMessage | null>(null);

  const judgeAbortControllerRef = useRef<AbortController | null>(null);
  // 移除 scriptwriterJson 對外回傳

  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const admin = searchParams?.get('admin') === 'true';
    setAdminMode(admin);
  }, [searchParams]);

  // 從 URL 同步 chapter 到 state，如果 URL 沒有參數則預設為 1
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlChapter = searchParams?.get('chapter');
    const parsed = urlChapter ? Number(urlChapter) : NaN;
    const isValid = Number.isInteger(parsed) && GUIDE_CONTENT[parsed];
    const finalChapter = isValid ? parsed : 1;

    // 只在 chapter 真的不同時才更新 state
    if (finalChapter !== chapterNumber) {
      setChapterNumber(finalChapter);
    }

    // 如果 URL 沒有 chapter 參數或參數無效，更新 URL
    if (!isValid) {
      const params = new URLSearchParams(window.location.search);
      params.set('chapter', String(finalChapter));
      router.replace(`${window.location.pathname}?${params.toString()}`);
    }
  }, [searchParams, router, chapterNumber]);

  // 當 scriptwriterResponse 或 chapter 改變時，更新系統訊息和前情提要
  useEffect(() => {
    if (!scriptwriterResponse || !GUIDE_CONTENT[chapterNumber]) return;

    setWorkflowStep('student');
    setSystemMessage(getTeacherHintText(scriptwriterResponse, chapterNumber));
    setSystemUserBrief(getUserBrief(scriptwriterResponse, chapterNumber).split('\n'));
    setSystemDialog(getDialog(scriptwriterResponse, chapterNumber).split('\n'));
    setSystemChecklist(getCheckListForTeacher(chapterNumber).split('\n'));

    // 若聊天室目前為空，插入前情提要（劇本對話），並記錄前情數量
    setChatHistory((prev) => {
      if (prev.length > 0) return prev;
      const scripted = getScriptedChatHistory(scriptwriterResponse, chapterNumber);
      if (!Array.isArray(scripted) || scripted.length === 0) return prev;

      // 將舊格式轉換為新的 UnifiedMessage 格式
      // 舊格式中 user = 老師, assistant = 學生
      // 保留原始角色以便 UI 正確顯示，標記為腳本訊息 (isScript: true)
      const convertedScripted = scripted.map((msg: any) => {
        const role = msg.role === 'user' ? 'teacher' : 'student';
        return createMessage(role, msg.content || msg.text, true);
      });

      setPreludeCount(convertedScripted.length);
      return [...convertedScripted];
    });
  }, [scriptwriterResponse, chapterNumber]);

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), 3000);
    return () => clearTimeout(timer);
  }, [flash]);

  const chapterInfo = GUIDE_CONTENT[chapterNumber];

  const statusText = useMemo(() => {
    if (connectionStatus === 'connected') return '已連接';
    if (connectionStatus === 'thinking') return '思考中...';
    return '未連接';
  }, [connectionStatus]);

  const canSummarize = chatHistory.length > 0;

  const chapterOptions = useMemo(
    () =>
      Object.entries(GUIDE_CONTENT).map(([number, info]) => ({
        number: Number(number),
        title: info.title,
        goal: info.goal,
        selected: Number(number) === chapterNumber,
      })),
    [chapterNumber]
  );

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

    const messages = getMessagesForAIStudent(chatHistory);
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

  const startScriptwriter = useCallback(async () => {
    clearChat();
    setWorkflowStep('scriptwriter');
    setIsCreatingStudent(true);
    try {
      const response = await fetch(`/api/students/random?t=${Date.now()}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData?.error?.message || response.statusText || '無法取得學生角色';
        throw new Error(message);
      }
      const data = await response.json();
      const role = data?.role;
      let parsedRole: DirectorInput;
      if (typeof role === 'string') {
        parsedRole = JSON.parse(role) as DirectorInput;
      } else {
        parsedRole = role as DirectorInput;
      }
      if (!parsedRole?.persona || !parsedRole?.scripts) {
        throw new Error('劇本資料不完整，缺少必要欄位');
      }

      setScriptwriterResponse(parsedRole);
      // scriptwriterJson 已移除

      setWorkflowStep('student');
      setSystemMessage(getTeacherHintText(parsedRole, chapterNumber));
      setSystemUserBrief(getUserBrief(parsedRole, chapterNumber).split('\n'));
      setSystemDialog(getDialog(parsedRole, chapterNumber).split('\n'));
      setSystemChecklist(getCheckListForTeacher(chapterNumber).split('\n'));

      // setFlash({ type: 'success', message: '已載入新的學生角色' });
    } catch (e) {
      const message = e instanceof Error ? e.message : '未知錯誤';
      setFlash({ type: 'error', message: `載入學生角色失敗: ${message}` });
      setWorkflowStep('idle');
    } finally {
      setIsCreatingStudent(false);
    }
  }, [chapterNumber]);

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
  }, [autoResizeTextarea, callOpenAI, callJudgeAPI]);

  const generateSummary = useCallback(async (): Promise<
    | {
        judgeResult: JudgeResultData;
        coachResult: string;
      }
    | undefined
  > => {
    if (chatHistory.length === 0) {
      setFlash({ type: 'error', message: '沒有對話記錄可以總結' });
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
      setFlash({ type: 'error', message: `教練 Bot 錯誤: ${text}` });
      return undefined;
    } finally {
      setIsSummarizing(false);
    }
  }, [callOpenAI, callJudgeAPI, chatHistory.length, latestJudgeResult, isJudging]);

  const clearChat = useCallback(() => {
    setChatHistory([]);
    setConnectionStatus('disconnected');
    setWorkflowStep('idle');
    setSystemMessage('');
    setSystemUserBrief([]);
    setSystemDialog([]);
    setSystemChecklist([]);

    // 清除 judge 狀態
    setLatestJudgeResult(null);
    setIsJudging(false);
    if (judgeAbortControllerRef.current) {
      judgeAbortControllerRef.current.abort();
      judgeAbortControllerRef.current = null;
    }

    setScriptwriterResponse(null);
    // scriptwriterJson 已移除
  }, []);

  // 移除 export/import 相關功能（已不再使用）

  const dismissFlash = useCallback(() => setFlash(null), []);

  // Cleanup effect: 取消進行中的 judge 請求
  useEffect(() => {
    return () => {
      if (judgeAbortControllerRef.current) {
        judgeAbortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    workflowStep,
    currentBot,
    connectionStatus,
    chatHistory,
    preludeCount,
    systemMessage,
    systemUserBrief,
    systemDialog,
    systemChecklist,
    chapterNumber,
    isThinking,
    isCreatingStudent,
    isSummarizing,
    isJudging,
    latestJudgeResult,
    flash,
    statusText,
    canSummarize,
    chapterInfo,
    chapterOptions,
    chatInputRef,
    autoResizeTextarea,
    startScriptwriter,
    sendMessage,
    generateSummary,
    clearChat,
    dismissFlash,
  };
}
