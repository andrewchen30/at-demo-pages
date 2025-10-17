import type { UnifiedMessage, MessageRole } from '../types';

/**
 * 訊息格式化器抽象基類
 * 定義通用的訊息過濾和轉換流程
 */
export abstract class MessageFormatter<TOutput> {
  protected abstract roleWhitelist: MessageRole[];

  abstract parseRoleName(role: MessageRole): string;

  abstract parseContentType(role: MessageRole): 'input_text' | 'output_text';

  protected filterMessages(messages: UnifiedMessage[]): UnifiedMessage[] {
    return messages.filter((msg) => this.roleWhitelist.includes(msg.role));
  }

  protected abstract transform(messages: UnifiedMessage[]): TOutput;

  public format(messages: UnifiedMessage[]): TOutput {
    const filtered = this.filterMessages(messages);
    return this.transform(filtered);
  }
}
