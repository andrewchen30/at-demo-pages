'use client';

import { useCallback, useEffect, useState } from 'react';
import type { DirectorInput } from '@/lib/aiCharacter/student/types';
import type { ChatHistoryEntry } from '../types';
import {
  getTeacherHintText,
  getUserBrief,
  getDialog,
  getCheckListForTeacher,
  getScriptedChatHistory,
} from '@/lib/aiCharacter/director/utils';
import { createMessage } from '../messageUtils/index';
import { GUIDE_CONTENT } from '@/app/trialLesson/guideBook/guideContent';

export interface UseScriptWriterParams {
  chapterNumber: number;
  setChatHistory: React.Dispatch<React.SetStateAction<ChatHistoryEntry[]>>;
  setPreludeCount: React.Dispatch<React.SetStateAction<number>>;
  setWorkflowStep: React.Dispatch<React.SetStateAction<any>>;
  showFlash: (flash: { type: 'success' | 'error'; message: string }) => void;
}

export interface UseScriptWriterResult {
  scriptwriterResponse: DirectorInput | null;
  isCreatingStudent: boolean;
  systemMessage: string;
  systemUserBrief: string[];
  systemDialog: string[];
  systemChecklist: string[];
  startScriptwriter: () => Promise<void>;
  clearScriptWriter: () => void;
}

/**
 * Hook: 學生角色和劇本管理
 * 職責：
 * - 管理 scriptwriterResponse、isCreatingStudent
 * - 管理系統訊息：systemMessage、systemUserBrief、systemDialog、systemChecklist
 * - 提供 startScriptwriter 函數
 * - 監聽 scriptwriterResponse 變化，自動更新系統訊息和前情提要
 */
export function useScriptWriter({
  chapterNumber,
  setChatHistory,
  setPreludeCount,
  setWorkflowStep,
  showFlash,
}: UseScriptWriterParams): UseScriptWriterResult {
  const [scriptwriterResponse, setScriptwriterResponse] = useState<DirectorInput | null>(null);
  const [isCreatingStudent, setIsCreatingStudent] = useState(false);
  const [systemMessage, setSystemMessage] = useState('');
  const [systemUserBrief, setSystemUserBrief] = useState<string[]>([]);
  const [systemDialog, setSystemDialog] = useState<string[]>([]);
  const [systemChecklist, setSystemChecklist] = useState<string[]>([]);

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
  }, [scriptwriterResponse, chapterNumber, setChatHistory, setPreludeCount, setWorkflowStep]);

  const startScriptwriter = useCallback(async () => {
    // 清空聊天記錄
    setChatHistory([]);
    setPreludeCount(0);

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
      setWorkflowStep('student');
      setSystemMessage(getTeacherHintText(parsedRole, chapterNumber));
      setSystemUserBrief(getUserBrief(parsedRole, chapterNumber).split('\n'));
      setSystemDialog(getDialog(parsedRole, chapterNumber).split('\n'));
      setSystemChecklist(getCheckListForTeacher(chapterNumber).split('\n'));
    } catch (e) {
      const message = e instanceof Error ? e.message : '未知錯誤';
      showFlash({ type: 'error', message: `載入學生角色失敗: ${message}` });
      setWorkflowStep('idle');
    } finally {
      setIsCreatingStudent(false);
    }
  }, [chapterNumber, setChatHistory, setPreludeCount, setWorkflowStep, showFlash]);

  const clearScriptWriter = useCallback(() => {
    setScriptwriterResponse(null);
    setSystemMessage('');
    setSystemUserBrief([]);
    setSystemDialog([]);
    setSystemChecklist([]);
  }, []);

  return {
    scriptwriterResponse,
    isCreatingStudent,
    systemMessage,
    systemUserBrief,
    systemDialog,
    systemChecklist,
    startScriptwriter,
    clearScriptWriter,
  };
}
