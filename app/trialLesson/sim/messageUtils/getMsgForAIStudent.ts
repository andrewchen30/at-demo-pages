import type { UnifiedMessage, MessageRole, OpenAIChatMessage } from '../types';
import { MessageFormatter } from './base';

/**
 * 學生 AI API 格式化器
 * - 只包含 teacher 和 student 角色
 * - teacher → user, student → assistant
 * - 返回 OpenAIChatMessage[]
 */
class GetMsgForAIStudent extends MessageFormatter<OpenAIChatMessage[]> {
  protected roleWhitelist: MessageRole[] = ['teacher', 'student'];

  parseRoleName(role: MessageRole): string {
    if (role === 'teacher') return 'user';
    if (role === 'student') return 'assistant';
    throw new Error(`Invalid role for AI student: ${role}`);
  }

  parseContentType(role: MessageRole): 'input_text' | 'output_text' {
    return role === 'teacher' ? 'input_text' : 'output_text';
  }

  private parseRole(role: MessageRole): 'user' | 'assistant' {
    return this.parseRoleName(role) as 'user' | 'assistant';
  }

  protected transform(messages: UnifiedMessage[]): OpenAIChatMessage[] {
    return messages.map((msg) => ({
      role: this.parseRole(msg.role),
      content: [
        {
          type: this.parseContentType(msg.role),
          text: msg.text,
        },
      ],
    }));
  }
}

export const msgForAIStudent = new GetMsgForAIStudent();
