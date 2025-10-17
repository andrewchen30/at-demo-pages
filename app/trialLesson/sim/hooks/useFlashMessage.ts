'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FlashMessage } from '../types';

export interface UseFlashMessageResult {
  flash: FlashMessage | null;
  showFlash: (flash: FlashMessage) => void;
  dismissFlash: () => void;
}

/**
 * Hook: Flash 訊息管理
 * 職責：
 * - 管理 flash 狀態
 * - 提供 showFlash 函數
 * - 提供 dismissFlash 函數
 * - 自動消失的 effect（3 秒）
 */
export function useFlashMessage(): UseFlashMessageResult {
  const [flash, setFlash] = useState<FlashMessage | null>(null);

  const showFlash = useCallback((newFlash: FlashMessage) => {
    setFlash(newFlash);
  }, []);

  const dismissFlash = useCallback(() => {
    setFlash(null);
  }, []);

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), 3000);
    return () => clearTimeout(timer);
  }, [flash]);

  return {
    flash,
    showFlash,
    dismissFlash,
  };
}
