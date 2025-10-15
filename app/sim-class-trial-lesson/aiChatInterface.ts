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
  PromptHistoryRecord,
  FlashMessage,
  UseTrialLessonChatResult,
} from './types';
import { CHAPTER_GOALS, BOT_LABELS } from './constants';

export function useTrialLessonChat(): UseTrialLessonChatResult {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [adminMode, setAdminMode] = useState(false);
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('idle');
  const [currentBot] = useState<BotType>('student');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');

  const [chatHistory, setChatHistory] = useState<ChatHistoryEntry[]>([]);
  const [promptHistory, setPromptHistory] = useState<PromptHistoryRecord[]>([]);
  const [scriptwriterResponse, setScriptwriterResponse] = useState<DirectorInput | null>(null);
  const [systemMessage, setSystemMessage] = useState('');
  const [systemUserBrief, setSystemUserBrief] = useState<string[]>([]);
  const [systemDialog, setSystemDialog] = useState<string[]>([]);
  const [systemChecklist, setSystemChecklist] = useState<string[]>([]);

  const [chapterNumber, setChapterNumber] = useState<number>(1);
  const [isChapterDialogOpen, setIsChapterDialogOpen] = useState(false);
  const [isPromptHistoryOpen, setIsPromptHistoryOpen] = useState(false);
  const [isJsonCollapsed, setIsJsonCollapsed] = useState(false);

  const [isThinking, setIsThinking] = useState(false);
  const [isCreatingStudent, setIsCreatingStudent] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isLastMessageCoach, setIsLastMessageCoach] = useState(false);

  const [flash, setFlash] = useState<FlashMessage | null>(null);
  const [importedFileName, setImportedFileName] = useState('');
  const [scriptwriterJson, setScriptwriterJson] = useState<string | null>(null);

  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);
  const exportLinkRef = useRef<HTMLAnchorElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const admin = searchParams?.get('admin') === 'true';
    setAdminMode(admin);
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlPart = searchParams?.get('part');
    if (urlPart && Number.isInteger(Number(urlPart)) && CHAPTER_GOALS[Number(urlPart)]) {
      setChapterNumber(Number(urlPart));
      localStorage.setItem('selectedNumber', String(urlPart));
    } else {
      const stored = localStorage.getItem('selectedNumber');
      const parsed = stored ? Number(stored) : 1;
      setChapterNumber(CHAPTER_GOALS[parsed] ? parsed : 1);
      const params = new URLSearchParams(window.location.search);
      params.set('part', String(CHAPTER_GOALS[parsed] ? parsed : 1));
      router.replace(`${window.location.pathname}?${params.toString()}`);
    }
  }, [router, searchParams]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!CHAPTER_GOALS[chapterNumber]) return;

    localStorage.setItem('selectedNumber', String(chapterNumber));
    const params = new URLSearchParams(window.location.search);
    params.set('part', String(chapterNumber));
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

  useEffect(() => {
    setIsLastMessageCoach(getIsLastMessageCoach());
  }, [chatHistory]);

  const chapterInfo = CHAPTER_GOALS[chapterNumber];

  const statusText = useMemo(() => {
    if (connectionStatus === 'connected') return '已連接';
    if (connectionStatus === 'thinking') return '思考中...';
    return '未連接';
  }, [connectionStatus]);

  const canSummarize = chatHistory.length > 0 && !isLastMessageCoach;

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

  const promptHistoryView = useMemo(
    () =>
      promptHistory.map((record) => ({
        ...record,
        formattedTimestamp: new Date(record.timestamp).toLocaleString('zh-TW'),
        displayBotType: BOT_LABELS[record.botType] ?? record.botType,
        formattedJson: JSON.stringify(
          {
            botType: record.botType,
            url: record.url,
            requestBody: record.requestBody,
            response: record.response ?? null,
          },
          null,
          2
        ),
      })),
    [promptHistory]
  );

  const autoResizeTextarea = useCallback(() => {
    const el = chatInputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, []);

  const getChatMessages = useCallback((): OpenAIChatMessage[] => {
    return chatHistory
      .filter((m) => !m.content.includes('教練總結'))
      .map((msg) => ({
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
    return chatHistory
      .filter((m) => !m.content.includes('教練總結'))
      .map((m) => `${m.role === 'user' ? '老師' : '學生'}: ${m.content}`)
      .join('\n');
  }, [chatHistory]);

  const getIsLastMessageCoach = useCallback((): boolean => {
    const lastMessage = chatHistory.at(-1);
    if (!lastMessage || !lastMessage.content) {
      return false;
    }

    return lastMessage.content.includes('教練總結');
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

  const recordPromptHistory = useCallback(
    (botType: BotType | string, url: string, requestBody: unknown, response: unknown = null) => {
      setPromptHistory((prev) => [...prev, { timestamp: Date.now(), botType, url, requestBody, response }]);
    },
    []
  );

  const updateLastPromptResponse = useCallback((resp: unknown) => {
    setPromptHistory((prev) => {
      if (prev.length === 0) return prev;
      const copy = [...prev];
      copy[copy.length - 1] = { ...copy[copy.length - 1], response: resp };
      return copy;
    });
  }, []);

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
      recordPromptHistory(botType, url, body);

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
      updateLastPromptResponse(data.raw || data);
      return {
        result: data.result ?? '',
        judgeResult: data.judgeResult,
      };
    },
    [getVariables, recordPromptHistory, updateLastPromptResponse]
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

      recordPromptHistory('scriptwriter', '/api/students/random', { method: 'GET' }, data);

      setWorkflowStep('student');
      setSystemMessage(getTeacherHintText(parsedRole, chapterNumber));
      setSystemUserBrief(getUserBrief(parsedRole, chapterNumber).split('\n'));
      setSystemDialog(getDialog(parsedRole, chapterNumber).split('\n'));
      setSystemChecklist(getCheckListForTeacher(chapterNumber).split('\n'));

      setFlash({ type: 'success', message: '已載入新的學生角色' });
    } catch (e) {
      const message = e instanceof Error ? e.message : '未知錯誤';
      setFlash({ type: 'error', message: `載入學生角色失敗: ${message}` });
      setWorkflowStep('idle');
    } finally {
      setIsCreatingStudent(false);
    }
  }, [chapterNumber, recordPromptHistory]);

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

  const generateSummary = useCallback(async (): Promise<string | undefined> => {
    if (chatHistory.length === 0) {
      setFlash({ type: 'error', message: '沒有對話記錄可以總結' });
      return;
    }
    setIsSummarizing(true);
    try {
      const response = await callOpenAI('coach');
      setChatHistory((prev) => [...prev, { role: 'assistant', content: `📋 **教練總結**\n\n${response.result}` }]);
      return response.judgeResult;
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
    setPromptHistory([]);
  }, []);

  const exportConfig = useCallback(() => {
    const dataStr = JSON.stringify({ chapter: chapterNumber }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = exportLinkRef.current;
    if (a) {
      a.href = url;
      a.download = `ai-chat-config-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    }
  }, [chapterNumber]);

  const importConfig = useCallback((file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') throw new Error('檔案內容無法解析');
        const json = JSON.parse(text) as { chapter?: number };
        if (typeof json.chapter === 'number' && CHAPTER_GOALS[json.chapter]) {
          setChapterNumber(json.chapter);
        }
        setImportedFileName(file.name);
        setFlash({ type: 'success', message: '配置已成功匯入' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : '未知錯誤';
        setFlash({ type: 'error', message: `匯入配置失敗: ${msg}` });
      }
    };
    reader.readAsText(file);
  }, []);

  const handleImportClick = useCallback(() => {
    importInputRef.current?.click();
  }, []);

  const openChapterDialog = useCallback(() => setIsChapterDialogOpen(true), []);
  const closeChapterDialog = useCallback(() => setIsChapterDialogOpen(false), []);
  const openPromptHistory = useCallback(() => setIsPromptHistoryOpen(true), []);
  const closePromptHistory = useCallback(() => setIsPromptHistoryOpen(false), []);

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
    promptHistory,
    scriptwriterResponse,
    systemMessage,
    systemUserBrief,
    systemDialog,
    systemChecklist,
    chapterNumber,
    isChapterDialogOpen,
    isPromptHistoryOpen,
    isJsonCollapsed,
    isThinking,
    isCreatingStudent,
    isSummarizing,
    flash,
    importedFileName,
    statusText,
    canSummarize,
    chapterInfo,
    chapterOptions,
    promptHistoryView,
    scriptwriterJson,
    chatInputRef,
    exportLinkRef,
    importInputRef,
    autoResizeTextarea,
    startScriptwriter,
    sendMessage,
    generateSummary,
    clearChat,
    exportConfig,
    importConfig,
    handleImportClick,
    openChapterDialog,
    closeChapterDialog,
    openPromptHistory,
    closePromptHistory,
    selectChapter,
    toggleJsonCollapsed,
    dismissFlash,
  };
}
