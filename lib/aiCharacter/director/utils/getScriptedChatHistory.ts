import type { DirectorInput } from '@/lib/aiCharacter/student/types';
import type { ChatHistoryEntry, MessageRole } from '@/app/trialLesson/sim/types';

/**
 * 將 DirectorInput 中的 script 轉換為 chat room 格式的對話記錄
 *
 * @param input - DirectorInput 物件，包含 scripts 陣列
 * @param partN - 章節編號（1-based index）
 * @returns ChatHistoryEntry[] - chat room 格式的對話記錄陣列
 *
 * @example
 * // 假設 script 內容為：
 * // ['老師：嗨，很高興見到你！', '學生：你好！']
 * // 會轉換為：
 * // [
 * //   { role: 'user', content: '嗨，很高興見到你！' },
 * //   { role: 'assistant', content: '你好！' }
 * // ]
 */
export function getScriptedChatHistory(input: DirectorInput, partN: number): ChatHistoryEntry[] {
  // 找到對應章節的 script
  const scriptObj = (input.scripts || []).find((s) => s.index === partN - 1);

  if (!scriptObj || !scriptObj.script) {
    return [];
  }

  // 將每個 script 元素解析成 ChatHistoryEntry
  const chatHistory: ChatHistoryEntry[] = scriptObj.script
    .map((line) => {
      // 嘗試匹配 "角色：內容" 的格式
      const match = line.match(/^(老師|學生)[:：]\s*(.*)$/);

      if (!match) {
        // 如果格式不符，跳過這行
        return null;
      }

      const [, roleName, content] = match;

      // 判斷 MessageRole
      // 老師 -> user, 學生 -> assistant
      const role: 'user' | 'assistant' = roleName === '老師' ? 'user' : 'assistant';

      return {
        role,
        content: content.trim(),
      } as ChatHistoryEntry;
    })
    .filter((entry): entry is ChatHistoryEntry => entry !== null);

  return chatHistory;
}
