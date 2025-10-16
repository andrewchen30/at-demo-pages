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
  MessageRole,
  ConnectionStatus,
  OpenAIMessageContent,
  OpenAIChatMessage,
  ChatHistoryEntry,
  FlashMessage,
  UseTrialLessonChatResult,
} from './types';
import { GUIDE_CONTENT } from '@/app/trialLesson/guideBook/guideContent';

export function useTrialLessonChat(): UseTrialLessonChatResult {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('idle');
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

  const [flash, setFlash] = useState<FlashMessage | null>(null);
  // 移除 scriptwriterJson 對外回傳

  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);

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
      setPreludeCount(scripted.length);
      return [...scripted];
    });
  }, [scriptwriterResponse, chapterNumber]);

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), 3000);
    return () => clearTimeout(timer);
  }, [flash]);

  const chapterInfo = GUIDE_CONTENT[chapterNumber];

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

  const getChatMessages = useCallback((): OpenAIChatMessage[] => {
    return chatHistory.map((msg) => ({
      role: msg.role,
      content: [{ type: msg.role === 'user' ? 'input_text' : 'output_text', text: msg.content }],
    }));
  }, [chatHistory]);

  const appendUserMessage = useCallback((messages: OpenAIChatMessage[], message: string): OpenAIChatMessage[] => {
    return [
      ...messages,
      {
        role: 'user' as MessageRole,
        content: [{ type: 'input_text', text: message }],
      },
    ];
  }, []);

  const getChatMessagesText = useCallback((): string => {
    return chatHistory.map((m) => `${m.role === 'user' ? '老師' : '學生'}: ${m.content}`).join('\n');
  }, [chatHistory]);

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
            chat_history: getChatMessagesText(),
          } as Record<string, unknown>;
        default:
          return {};
      }
    },
    [scriptwriterResponse, chapterNumber, getChatMessagesText]
  );

  const callOpenAI = useCallback(
    async (
      botType: BotType = 'student',
      input?: string | OpenAIChatMessage[]
    ): Promise<{ result: string; judgeResult?: string }> => {
      const botEndpointMap: Record<BotType, string> = {
        student: '/api/students/chat',
        coach: '/api/coaches/feedback',
      };
      const url = botEndpointMap[botType];
      const variables = getVariables(botType);

      let preparedInput: OpenAIChatMessage[];
      if (!input) {
        preparedInput = [{ role: 'user', content: [{ type: 'input_text', text: '' }] }];
      } else if (typeof input === 'string') {
        preparedInput = [{ role: 'user', content: [{ type: 'input_text', text: input }] }];
      } else {
        preparedInput = input;
      }

      const body = { variables, input: preparedInput };

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
    [getVariables]
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

    const chatMessage = getChatMessages();

    setChatHistory((prev) => [...prev, { role: 'user', content: message }]);
    if (el) {
      el.value = '';
      autoResizeTextarea();
    }
    setIsThinking(true);
    setConnectionStatus('thinking');
    try {
      const response = await callOpenAI('student', appendUserMessage(chatMessage, message));
      setChatHistory((prev) => [...prev, { role: 'assistant', content: response.result }]);
      setConnectionStatus('connected');
    } catch (e) {
      const text = e instanceof Error ? e.message : '未知錯誤';
      setChatHistory((prev) => [...prev, { role: 'assistant', content: `錯誤: ${text}` }]);
      setConnectionStatus('disconnected');
    } finally {
      setIsThinking(false);
    }
  }, [autoResizeTextarea, callOpenAI, getChatMessages, appendUserMessage]);

  const generateSummary = useCallback(async (): Promise<{
    judgeResult: string;
    coachResult: string;
  }> => {
    if (chatHistory.length === 0) {
      setFlash({ type: 'error', message: '沒有對話記錄可以總結' });
      return;
    }
    setIsSummarizing(true);
    try {
      const response = await callOpenAI('coach');
      // 只返回文字版本的回饋，不加到聊天記錄中
      return {
        judgeResult: response.judgeResult,
        coachResult: response.result,
      };
    } catch (e) {
      const text = e instanceof Error ? e.message : '未知錯誤';
      setFlash({ type: 'error', message: `教練 Bot 錯誤: ${text}` });
    } finally {
      setIsSummarizing(false);
    }
  }, [callOpenAI, chatHistory.length]);

  const clearChat = useCallback(() => {
    setChatHistory([]);
    setConnectionStatus('disconnected');
    setWorkflowStep('idle');
    setSystemMessage('');
    setSystemUserBrief([]);
    setSystemDialog([]);
    setSystemChecklist([]);

    setScriptwriterResponse(null);
    // scriptwriterJson 已移除
  }, []);

  // 移除 export/import 相關功能（已不再使用）

  const dismissFlash = useCallback(() => setFlash(null), []);

  return {
    workflowStep,
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
    flash,
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
