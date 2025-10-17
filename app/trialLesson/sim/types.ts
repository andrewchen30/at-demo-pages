import type { RefObject } from 'react';
import type { DirectorInput } from '@/lib/aiCharacter/student/types';
import type { JudgeResultData } from './judgeParser';

export type BotType = 'student' | 'coach';
export type WorkflowStep = 'idle' | 'scriptwriter' | 'student';
export type MessageRole = 'teacher' | 'student' | 'coach' | 'judge' | 'director';
export type ConnectionStatus = 'connected' | 'disconnected' | 'thinking';

export interface OpenAIMessageContent {
  type: 'input_text' | 'output_text';
  text: string;
}

export interface OpenAIChatMessage {
  role: 'user' | 'assistant';
  content: OpenAIMessageContent[];
}

// 統一的訊息結構
export interface UnifiedMessage {
  id: string; // 訊息唯一識別碼
  timestamp: Date; // 訊息建立的真實時間
  role: MessageRole; // 語意化角色名稱
  text: string; // 訊息內容
  isScript: boolean; // 是否為腳本訊息（前情提要）
}

// 保留舊的型別作為相容性
export type ChatHistoryEntry = UnifiedMessage;

export interface FlashMessage {
  type: 'success' | 'error';
  message: string;
}

export interface UseTrialLessonChatResult {
  workflowStep: WorkflowStep;
  currentBot: BotType;
  connectionStatus: ConnectionStatus;
  chatHistory: ChatHistoryEntry[];
  preludeCount: number;
  systemMessage: string;
  systemUserBrief: string[];
  systemDialog: string[];
  systemChecklist: string[];
  chapterNumber: number;
  isThinking: boolean;
  isCreatingStudent: boolean;
  isSummarizing: boolean;
  isJudging: boolean;
  latestJudgeResult: JudgeResultData | null;
  flash: FlashMessage | null;
  statusText: string;
  canSummarize: boolean;
  chapterInfo: { title: string; goal: string; sidebarTitle: string } | undefined;
  chapterOptions: Array<{ number: number; title: string; goal: string; selected: boolean }>;
  chatInputRef: RefObject<HTMLTextAreaElement>;
  autoResizeTextarea: () => void;
  startScriptwriter: () => Promise<void>;
  sendMessage: () => Promise<void>;
  generateSummary: () => Promise<
    | {
        judgeResult: JudgeResultData;
        coachResult: string;
      }
    | undefined
  >;
  clearChat: () => void;
  dismissFlash: () => void;
}
