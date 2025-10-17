import type { DirectorInput } from '@/lib/aiCharacter/student/types';

/**
 * 將 DirectorInput 中的 script 轉換為舊格式的對話記錄
 * 注意：這個函數回傳的是簡化的舊格式 { role, content }，
 * 呼叫方需要將其轉換為新的 UnifiedMessage 格式
 *
 * @param input - DirectorInput 物件，包含 scripts 陣列
 * @param partN - 章節編號（1-based index）
 * @returns 舊格式的對話記錄陣列 { role: 'user' | 'assistant', content: string }[]
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
export function getScriptedChatHistory(
  input: DirectorInput,
  partN: number
): Array<{ role: 'user' | 'assistant'; content: string }> {
  // 找到對應章節的 script
  const scriptObj = (input.scripts || []).find((s) => s.index === partN - 1);

  if (!scriptObj || !scriptObj.script) {
    return [];
  }

  // 將每個 script 元素解析成對話記錄
  const chatHistory = scriptObj.script
    .map((line) => {
      // 嘗試匹配 "角色：內容" 的格式
      const match = line.match(/^(老師|學生)[:：]\s*(.*)$/);

      if (!match) {
        // 如果格式不符，跳過這行
        return null;
      }

      const [, roleName, content] = match;

      // 判斷角色
      // 老師 -> user, 學生 -> assistant
      const role: 'user' | 'assistant' = roleName === '老師' ? 'user' : 'assistant';

      return {
        role,
        content: content.trim(),
      };
    })
    .filter((entry): entry is { role: 'user' | 'assistant'; content: string } => entry !== null);

  return chatHistory;
}
