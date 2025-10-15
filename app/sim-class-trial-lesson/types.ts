import type { RefObject } from 'react';
import type { DirectorInput } from '@/lib/aiRole/student/types';

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

export interface PromptHistoryRecord {
  timestamp: number;
  botType: BotType | string;
  url: string;
  requestBody: unknown;
  response: unknown;
}

export interface FlashMessage {
  type: 'success' | 'error';
  message: string;
}

export interface UseTrialLessonChatResult {
  adminMode: boolean;
  workflowStep: WorkflowStep;
  currentBot: BotType;
  connectionStatus: ConnectionStatus;
  chatHistory: ChatHistoryEntry[];
  promptHistory: PromptHistoryRecord[];
  scriptwriterResponse: DirectorInput | null;
  systemMessage: string;
  systemUserBrief: string[];
  systemDialog: string[];
  systemChecklist: string[];
  chapterNumber: number;
  isChapterDialogOpen: boolean;
  isPromptHistoryOpen: boolean;
  isJsonCollapsed: boolean;
  isThinking: boolean;
  isCreatingStudent: boolean;
  isSummarizing: boolean;
  flash: FlashMessage | null;
  importedFileName: string;
  statusText: string;
  canSummarize: boolean;
  chapterInfo: { title: string; goal: string } | undefined;
  chapterOptions: Array<{ number: number; title: string; goal: string; selected: boolean }>;
  promptHistoryView: Array<
    PromptHistoryRecord & { formattedTimestamp: string; displayBotType: string; formattedJson: string }
  >;
  scriptwriterJson: string | null;
  chatInputRef: RefObject<HTMLTextAreaElement>;
  exportLinkRef: RefObject<HTMLAnchorElement>;
  importInputRef: RefObject<HTMLInputElement>;
  autoResizeTextarea: () => void;
  startScriptwriter: () => Promise<void>;
  sendMessage: () => Promise<void>;
  generateSummary: () => Promise<string | undefined>;
  clearChat: () => void;
  exportConfig: () => void;
  importConfig: (file: File | null) => void;
  handleImportClick: () => void;
  openChapterDialog: () => void;
  closeChapterDialog: () => void;
  openPromptHistory: () => void;
  closePromptHistory: () => void;
  selectChapter: (chapterNumber: number) => void;
  toggleJsonCollapsed: () => void;
  dismissFlash: () => void;
}
