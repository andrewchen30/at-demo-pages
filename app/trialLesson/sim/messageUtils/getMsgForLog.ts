import type { UnifiedMessage, MessageRole } from '../types';
import { MessageFormatter } from './base';
import { formatDateTime } from './utils';

/**
 * ChatLog 格式化器
 * - 包含 teacher, student, coach 角色（排除前情提要的 director）
 * - 格式：`[角色名稱] (時間戳記): 內容`
 * - coach 訊息前後加分隔線
 * - 返回 string
 */
class GetMsgForLog extends MessageFormatter<string> {
  protected roleWhitelist: MessageRole[] = ['teacher', 'student', 'coach'];

  parseRoleName(role: MessageRole): string {
    if (role === 'teacher') return '老師';
    if (role === 'student') return '學生';
    if (role === 'coach') return '教練';
    return role;
  }

  parseContentType(role: MessageRole): 'input_text' | 'output_text' {
    return role === 'teacher' ? 'input_text' : 'output_text';
  }

  protected transform(messages: UnifiedMessage[]): string {
    const lines: string[] = [];

    messages.forEach((msg) => {
      const timestamp = formatDateTime(msg.timestamp);
      const roleName = this.parseRoleName(msg.role);
      // 將訊息內容中的換行改為分號
      const content = msg.text.replace(/\n/g, ';');

      // 如果是教練回饋，前後加上分隔線（獨立的行）
      if (msg.role === 'coach') {
        lines.push('=====');
        lines.push(`[${roleName}] (${timestamp}): ${content}`);
        lines.push('=====');
      } else {
        lines.push(`[${roleName}] (${timestamp}): ${content}`);
      }
    });

    return lines.join('\n');
  }
}

export const msgForLog = new GetMsgForLog();
