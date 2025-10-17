'use client';

import { useCallback, useMemo, useState } from 'react';
import type { BotType, WorkflowStep, ConnectionStatus, ChatHistoryEntry } from '../types';

export interface UseChatStateResult {
  chatHistory: ChatHistoryEntry[];
  preludeCount: number;
  workflowStep: WorkflowStep;
  currentBot: BotType;
  connectionStatus: ConnectionStatus;
  statusText: string;
  setChatHistory: React.Dispatch<React.SetStateAction<ChatHistoryEntry[]>>;
  setPreludeCount: React.Dispatch<React.SetStateAction<number>>;
  setWorkflowStep: React.Dispatch<React.SetStateAction<WorkflowStep>>;
  setConnectionStatus: React.Dispatch<React.SetStateAction<ConnectionStatus>>;
  clearChatHistory: () => void;
}

/**
 * Hook: 核心聊天狀態管理
 * 職責：
 * - 管理 chatHistory、preludeCount
 * - 管理 workflowStep、currentBot、connectionStatus
 * - 提供 statusText 衍生值
 * - 提供 clearChatHistory 函數
 */
export function useChatState(): UseChatStateResult {
  const [chatHistory, setChatHistory] = useState<ChatHistoryEntry[]>([]);
  const [preludeCount, setPreludeCount] = useState<number>(0);
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('idle');
  const [currentBot] = useState<BotType>('student');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');

  const statusText = useMemo(() => {
    if (connectionStatus === 'connected') return '已連接';
    if (connectionStatus === 'thinking') return '思考中...';
    return '未連接';
  }, [connectionStatus]);

  const clearChatHistory = useCallback(() => {
    setChatHistory([]);
    setPreludeCount(0);
    setConnectionStatus('disconnected');
    setWorkflowStep('idle');
  }, []);

  return {
    chatHistory,
    preludeCount,
    workflowStep,
    currentBot,
    connectionStatus,
    statusText,
    setChatHistory,
    setPreludeCount,
    setWorkflowStep,
    setConnectionStatus,
    clearChatHistory,
  };
}
