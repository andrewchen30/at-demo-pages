import type { RefObject } from 'react';
import type { DirectorInput } from '@/lib/aiCharacter/student/types';

export type BotType = 'student' | 'coach';
export type WorkflowStep = 'idle' | 'scriptwriter' | 'student';
export type MessageRole = 'user' | 'assistant';
export type DisplayRole = MessageRole | 'coach';
export type ConnectionStatus = 'connected' | 'disconnected' | 'thinking';

export interface OpenAIMessageContent {
  type: 'input_text' | 'output_text';
  text: string;
}

export interface OpenAIChatMessage {
  role: MessageRole;
  content: OpenAIMessageContent[];
}

export interface ChatHistoryEntry {
  role: MessageRole;
  content: string;
}

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
  isChapterDialogOpen: boolean;
  isThinking: boolean;
  isCreatingStudent: boolean;
  isSummarizing: boolean;
  flash: FlashMessage | null;
  statusText: string;
  canSummarize: boolean;
  chapterInfo: { title: string; goal: string } | undefined;
  chapterOptions: Array<{ number: number; title: string; goal: string; selected: boolean }>;
  chatInputRef: RefObject<HTMLTextAreaElement>;
  autoResizeTextarea: () => void;
  startScriptwriter: () => Promise<void>;
  sendMessage: () => Promise<void>;
  generateSummary: () => Promise<{
    judgeResult: string;
    coachResult: string;
  }>;
  clearChat: () => void;
  closeChapterDialog: () => void;
  selectChapter: (chapterNumber: number) => void;
  dismissFlash: () => void;
}
