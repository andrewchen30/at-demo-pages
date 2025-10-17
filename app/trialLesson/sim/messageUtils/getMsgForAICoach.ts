import type { UnifiedMessage, MessageRole } from '../types';
import { MessageFormatter } from './base';

/**
 * 教練 AI 格式化器
 * - 只包含 teacher 和 student 角色
 * - 過濾掉腳本訊息（isScript: true）
 * - 格式化為 "老師: xxx\n學生: xxx" 的純文字
 * - 返回 string
 */
class GetMsgForAICoach extends MessageFormatter<string> {
  protected roleWhitelist: MessageRole[] = ['teacher', 'student'];

  parseRoleName(role: MessageRole): string {
    if (role === 'teacher') return '老師';
    if (role === 'student') return '學生';
    return role;
  }

  parseContentType(role: MessageRole): 'input_text' | 'output_text' {
    return role === 'teacher' ? 'input_text' : 'output_text';
  }

  protected transform(messages: UnifiedMessage[]): string {
    return messages
      .filter((msg) => !msg.isScript) // 過濾掉腳本訊息
      .map((msg) => {
        const roleName = this.parseRoleName(msg.role);
        return `${roleName}: ${msg.text}`;
      })
      .join('\n');
  }
}

export const msgForAICoach = new GetMsgForAICoach();
