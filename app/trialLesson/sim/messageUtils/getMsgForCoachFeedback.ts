import type { UnifiedMessage, MessageRole } from '../types';
import { MessageFormatter } from './base';

/**
 * 教練回饋格式化器
 * - 只包含 coach 角色
 * - 返回最後一則 coach 訊息或 null
 * - 返回 UnifiedMessage | null
 */
class GetMsgForCoachFeedback extends MessageFormatter<UnifiedMessage | null> {
  protected roleWhitelist: MessageRole[] = ['coach'];

  parseRoleName(role: MessageRole): string {
    if (role === 'coach') return '教練';
    return role;
  }

  parseContentType(role: MessageRole): 'input_text' | 'output_text' {
    // Coach 訊息不區分 input/output，預設返回 output_text
    return 'output_text';
  }

  protected transform(messages: UnifiedMessage[]): UnifiedMessage | null {
    return messages.length > 0 ? messages[messages.length - 1] : null;
  }
}

export const msgForCoachFeedback = new GetMsgForCoachFeedback();
