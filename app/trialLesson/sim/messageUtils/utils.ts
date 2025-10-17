import type { UnifiedMessage, MessageRole } from '../types';

/**
 * 生成唯一的訊息 ID
 */
export function generateMessageId(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 格式化日期時間為 YYYY/MM/DD HH:mm:ss (使用 +8 時區)
 */
export function formatDateTime(date: Date): string {
  // 轉換為 +8 時區（台北時區）
  const utcTime = date.getTime() + date.getTimezoneOffset() * 60000;
  const taipei = new Date(utcTime + 8 * 3600000);

  const year = taipei.getFullYear();
  const month = String(taipei.getMonth() + 1).padStart(2, '0');
  const day = String(taipei.getDate()).padStart(2, '0');
  const hours = String(taipei.getHours()).padStart(2, '0');
  const minutes = String(taipei.getMinutes()).padStart(2, '0');
  const seconds = String(taipei.getSeconds()).padStart(2, '0');
  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 建立新訊息，自動生成 id 和 timestamp
 */
export function createMessage(role: MessageRole, text: string, isScript: boolean = false): UnifiedMessage {
  return {
    id: generateMessageId(),
    timestamp: new Date(),
    role,
    text,
    isScript,
  };
}
