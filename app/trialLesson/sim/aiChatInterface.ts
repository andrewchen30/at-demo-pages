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
} from '@/lib/aiRole/director/utils';
import type { DirectorInput } from '@/lib/aiRole/student/types';
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
import { CHAPTER_GOALS } from './constants';

export function useTrialLessonChat(): UseTrialLessonChatResult {
  const router = useRouter();
  const searchParams = useSearchParams();

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
  const [isChapterDialogOpen, setIsChapterDialogOpen] = useState(false);
  const [isJsonCollapsed, setIsJsonCollapsed] = useState(false);

  const [isThinking, setIsThinking] = useState(false);
  const [isCreatingStudent, setIsCreatingStudent] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const [flash, setFlash] = useState<FlashMessage | null>(null);
  const [scriptwriterJson, setScriptwriterJson] = useState<string | null>(null);

  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const admin = searchParams?.get('admin') === 'true';
    setAdminMode(admin);
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlChapter = searchParams?.get('chapter');
    if (urlChapter && Number.isInteger(Number(urlChapter)) && CHAPTER_GOALS[Number(urlChapter)]) {
      setChapterNumber(Number(urlChapter));
      localStorage.setItem('selectedNumber', String(urlChapter));
    } else {
      const stored = localStorage.getItem('selectedNumber');
      const parsed = stored ? Number(stored) : 1;
      setChapterNumber(CHAPTER_GOALS[parsed] ? parsed : 1);
      const params = new URLSearchParams(window.location.search);
      params.set('chapter', String(CHAPTER_GOALS[parsed] ? parsed : 1));
      router.replace(`${window.location.pathname}?${params.toString()}`);
    }
  }, [router, searchParams]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!CHAPTER_GOALS[chapterNumber]) return;

    localStorage.setItem('selectedNumber', String(chapterNumber));
    const params = new URLSearchParams(window.location.search);
    params.set('chapter', String(chapterNumber));
    router.replace(`${window.location.pathname}?${params.toString()}`);

    if (scriptwriterResponse) {
      setSystemMessage(getTeacherHintText(scriptwriterResponse, chapterNumber));
      setSystemUserBrief(getUserBrief(scriptwriterResponse, chapterNumber).split('\n'));
      setSystemDialog(getDialog(scriptwriterResponse, chapterNumber).split('\n'));
      setSystemChecklist(getCheckListForTeacher(chapterNumber).split('\n'));
    }
  }, [chapterNumber, router, scriptwriterResponse]);

  useEffect(() => {
    if (scriptwriterResponse) {
      setWorkflowStep('student');
      setSystemMessage(getTeacherHintText(scriptwriterResponse, chapterNumber));
      setSystemUserBrief(getUserBrief(scriptwriterResponse, chapterNumber).split('\n'));
      setSystemDialog(getDialog(scriptwriterResponse, chapterNumber).split('\n'));
      setSystemChecklist(getCheckListForTeacher(chapterNumber).split('\n'));
      setScriptwriterJson(JSON.stringify(scriptwriterResponse, null, 2));
      // 若聊天室目前為空，插入前情提要（劇本對話），並記錄前情數量
      setChatHistory((prev) => {
        if (prev.length > 0) return prev;
        const scripted = getScriptedChatHistory(scriptwriterResponse, chapterNumber);
        if (!Array.isArray(scripted) || scripted.length === 0) return prev;
        setPreludeCount(scripted.length);
        return [...scripted];
      });
    }
  }, [scriptwriterResponse, chapterNumber]);

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), 3000);
    return () => clearTimeout(timer);
  }, [flash]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = localStorage.getItem('selectedNumber');
    if (!stored) {
      setIsChapterDialogOpen(true);
    }
  }, []);

  const chapterInfo = CHAPTER_GOALS[chapterNumber];

  const statusText = useMemo(() => {
    if (connectionStatus === 'connected') return '已連接';
    if (connectionStatus === 'thinking') return '思考中...';
    return '未連接';
  }, [connectionStatus]);

  const canSummarize = chatHistory.length > 0;

  const chapterOptions = useMemo(
    () =>
      Object.entries(CHAPTER_GOALS).map(([number, info]) => ({
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
      setScriptwriterJson(JSON.stringify(parsedRole, null, 2));

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
    setScriptwriterJson(null);
  }, []);

  // 移除 export/import 相關功能（已不再使用）

  const openChapterDialog = useCallback(() => setIsChapterDialogOpen(true), []);
  const closeChapterDialog = useCallback(() => setIsChapterDialogOpen(false), []);

  const selectChapter = useCallback((n: number) => {
    setChapterNumber(n);
    setIsChapterDialogOpen(false);
  }, []);

  const toggleJsonCollapsed = useCallback(() => {
    setIsJsonCollapsed((prev) => !prev);
  }, []);

  const dismissFlash = useCallback(() => setFlash(null), []);

  return {
    adminMode,
    workflowStep,
    currentBot,
    connectionStatus,
    chatHistory,
    preludeCount,
    scriptwriterResponse,
    systemMessage,
    systemUserBrief,
    systemDialog,
    systemChecklist,
    chapterNumber,
    isChapterDialogOpen,
    isJsonCollapsed,
    isThinking,
    isCreatingStudent,
    isSummarizing,
    flash,
    statusText,
    canSummarize,
    chapterInfo,
    chapterOptions,
    scriptwriterJson,
    chatInputRef,
    autoResizeTextarea,
    startScriptwriter,
    sendMessage,
    generateSummary,
    clearChat,
    openChapterDialog,
    closeChapterDialog,
    selectChapter,
    toggleJsonCollapsed,
    dismissFlash,
  };
}
