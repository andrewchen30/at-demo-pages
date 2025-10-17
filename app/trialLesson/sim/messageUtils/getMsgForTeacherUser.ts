import type { UnifiedMessage, MessageRole } from '../types';
import { MessageFormatter } from './base';

/**
 * 老師用戶 UI 格式化器（聊天室顯示）
 * - 包含 teacher, student, director 角色（排除 coach）
 * - 保留完整的 UnifiedMessage 格式
 * - 返回 UnifiedMessage[]
 */
class GetMsgForTeacherUser extends MessageFormatter<UnifiedMessage[]> {
  protected roleWhitelist: MessageRole[] = ['teacher', 'student', 'director'];

  parseRoleName(role: MessageRole): string {
    if (role === 'teacher') return '老師';
    if (role === 'student') return '學生';
    if (role === 'director') return '前情提要';
    return role;
  }

  parseContentType(role: MessageRole): 'input_text' | 'output_text' {
    return role === 'teacher' ? 'input_text' : 'output_text';
  }

  protected transform(messages: UnifiedMessage[]): UnifiedMessage[] {
    return messages;
  }
}

export const msgForTeacherUser = new GetMsgForTeacherUser();
