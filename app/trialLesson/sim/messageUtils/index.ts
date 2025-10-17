import type { UnifiedMessage, OpenAIChatMessage } from '../types';

// ============================================================================
// 工具函數
// ============================================================================

export { generateMessageId, formatDateTime, createMessage } from './utils';

// ============================================================================
// 抽象基類
// ============================================================================

export { MessageFormatter } from './base';

// ============================================================================
// 單例實例
// ============================================================================

export { msgForAIStudent } from './getMsgForAIStudent';
export { msgForAICoach } from './getMsgForAICoach';
export { msgForLog } from './getMsgForLog';
export { msgForTeacherUser } from './getMsgForTeacherUser';
export { msgForCoachFeedback } from './getMsgForCoachFeedback';

// ============================================================================
// 向後相容的函數導出
// ============================================================================

import { msgForAIStudent } from './getMsgForAIStudent';
import { msgForAICoach } from './getMsgForAICoach';
import { msgForLog } from './getMsgForLog';
import { msgForTeacherUser } from './getMsgForTeacherUser';
import { msgForCoachFeedback } from './getMsgForCoachFeedback';

/**
 * @deprecated 請使用 msgForAIStudent.format(messages) 代替
 */
export const getMessagesForAIStudent = (messages: UnifiedMessage[]): OpenAIChatMessage[] =>
  msgForAIStudent.format(messages);

/**
 * @deprecated 請使用 msgForAICoach.format(messages) 代替
 */
export const getMessagesForAICoach = (messages: UnifiedMessage[]): string => msgForAICoach.format(messages);

/**
 * @deprecated 請使用 msgForLog.format(messages) 代替
 */
export const getMessagesForLog = (messages: UnifiedMessage[]): string => msgForLog.format(messages);

/**
 * @deprecated 請使用 msgForTeacherUser.format(messages) 代替
 */
export const getMessagesForUIChat = (messages: UnifiedMessage[]): UnifiedMessage[] =>
  msgForTeacherUser.format(messages);

/**
 * @deprecated 請使用 msgForCoachFeedback.format(messages) 代替
 */
export const getMessagesForUICoach = (messages: UnifiedMessage[]): UnifiedMessage | null =>
  msgForCoachFeedback.format(messages);
