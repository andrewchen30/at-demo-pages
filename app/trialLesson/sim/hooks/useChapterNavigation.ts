'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GUIDE_CONTENT } from '@/app/trialLesson/guideBook/guideContent';

export interface UseChapterNavigationResult {
  chapterNumber: number;
  chapterInfo: { title: string; goal: string; sidebarTitle: string } | undefined;
  chapterOptions: Array<{ number: number; title: string; goal: string; selected: boolean }>;
}

/**
 * Hook: 章節導航和 URL 參數管理
 * 職責：
 * - 管理 chapterNumber 狀態
 * - 從 URL searchParams 同步 chapter
 * - 提供 chapterInfo 和 chapterOptions 衍生值
 * - 當 URL 無效時更新 URL
 */
export function useChapterNavigation(): UseChapterNavigationResult {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [chapterNumber, setChapterNumber] = useState<number>(1);

  // 從 URL 同步 chapter 到 state，如果 URL 沒有參數則預設為 1
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlChapter = searchParams?.get('chapter');
    const parsed = urlChapter ? Number(urlChapter) : NaN;
    const isValid = Number.isInteger(parsed) && GUIDE_CONTENT[parsed];
    const finalChapter = isValid ? parsed : 1;

    // 只在 chapter 真的不同時才更新 state
    if (finalChapter !== chapterNumber) {
      setChapterNumber(finalChapter);
    }

    // 如果 URL 沒有 chapter 參數或參數無效，更新 URL
    if (!isValid) {
      const params = new URLSearchParams(window.location.search);
      params.set('chapter', String(finalChapter));
      router.replace(`${window.location.pathname}?${params.toString()}`);
    }
  }, [searchParams, router, chapterNumber]);

  const chapterInfo = GUIDE_CONTENT[chapterNumber];

  const chapterOptions = useMemo(
    () =>
      Object.entries(GUIDE_CONTENT).map(([number, info]) => ({
        number: Number(number),
        title: info.title,
        goal: info.goal,
        selected: Number(number) === chapterNumber,
      })),
    [chapterNumber]
  );

  return {
    chapterNumber,
    chapterInfo,
    chapterOptions,
  };
}
