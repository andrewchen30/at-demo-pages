/**
 * Judge Result 類型定義和解析器
 */

/**
 * 單個檢查項目的結果
 */
export interface JudgeResultItem {
  /** 檢查項目名稱 */
  item: string;
  /** 狀態：✓ 或 ✔ 表示完成，✘ 表示未完成 */
  status: '✓' | '✔' | '✘';
  /** 判斷理由 */
  reason: string;
}

/**
 * Judge 結果的完整結構
 */
export interface JudgeResultData {
  /** 摘要文字，例如："老師完成 3 / 5 項行為。" */
  summary: string;
  /** 各項檢查結果 */
  results: JudgeResultItem[];
}

/**
 * 解析 Judge API 返回的 resultPreview JSON 字符串
 *
 * @param judgeResultString - Judge API 返回的字符串，可能包含 JSON
 * @returns 解析後的結構化數據，如果解析失敗則返回 null
 */
export function parseJudgeResult(judgeResultString: string | null | undefined): JudgeResultData | null {
  if (!judgeResultString || typeof judgeResultString !== 'string') {
    return null;
  }

  try {
    // 嘗試直接解析為 JSON
    const parsed = JSON.parse(judgeResultString) as JudgeResultData;

    // 驗證必要欄位
    if (!parsed.summary || !Array.isArray(parsed.results)) {
      console.warn('Judge result 格式不正確，缺少必要欄位');
      return null;
    }

    // 驗證每個 result 項目的格式
    const isValid = parsed.results.every(
      (item) =>
        typeof item.item === 'string' && (item.status === '✓' || item.status === '✔' || item.status === '✘') && typeof item.reason === 'string'
    );

    if (!isValid) {
      console.warn('Judge result items 格式不正確');
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('解析 Judge result 失敗:', error);
    return null;
  }
}

/**
 * 檢查 Judge 結果是否全部項目都成功（✓ 或 ✔）
 *
 * @param judgeData - 解析後的 Judge 數據
 * @returns true 表示全部成功，false 表示有未完成項目
 */
export function checkAllJudgeSuccess(judgeData: JudgeResultData | null): boolean {
  if (!judgeData) {
    return false;
  }

  return judgeData.results.every((item) => item.status === '✓' || item.status === '✔');
}

/**
 * 計算完成的項目數量和總項目數量
 *
 * @param judgeData - 解析後的 Judge 數據
 * @returns { completed: number, total: number }
 */
export function getJudgeStats(judgeData: JudgeResultData | null): { completed: number; total: number } {
  if (!judgeData) {
    return { completed: 0, total: 0 };
  }

  const completed = judgeData.results.filter((item) => item.status === '✓' || item.status === '✔').length;
  const total = judgeData.results.length;

  return { completed, total };
}

/**
 * 將 Judge 結果格式化為易讀的文字（用於顯示或記錄）
 *
 * @param judgeData - 解析後的 Judge 數據
 * @returns 格式化後的文字
 */
export function formatJudgeResultForDisplay(judgeData: JudgeResultData | null): string {
  if (!judgeData) {
    return '無評估結果';
  }

  const lines: string[] = [];
  lines.push(judgeData.summary);
  lines.push('');

  judgeData.results.forEach((item) => {
    lines.push(`${item.status} ${item.item}`);
    lines.push(`  理由：${item.reason}`);
  });

  return lines.join('\n');
}

/**
 * 取得未完成的項目列表
 *
 * @param judgeData - 解析後的 Judge 數據
 * @returns 未完成的項目陣列
 */
export function getIncompleteItems(judgeData: JudgeResultData | null): JudgeResultItem[] {
  if (!judgeData) {
    return [];
  }

  return judgeData.results.filter((item) => item.status === '✘');
}

/**
 * 取得已完成的項目列表
 *
 * @param judgeData - 解析後的 Judge 數據
 * @returns 已完成的項目陣列
 */
export function getCompletedItems(judgeData: JudgeResultData | null): JudgeResultItem[] {
  if (!judgeData) {
    return [];
  }

  return judgeData.results.filter((item) => item.status === '✓' || item.status === '✔');
}
