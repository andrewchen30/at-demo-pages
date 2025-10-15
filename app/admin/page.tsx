'use client';

import { useState, useEffect, type CSSProperties } from 'react';

type RefreshState = 'idle' | 'loading' | 'success' | 'error';

const DEFAULT_BATCH_SIZE = 20;

const ADMIN_TOOLS = [
  {
    href: '/admin/chatLogViewer',
    title: 'ChatLog 檢視器',
    description: '從 Google Spreadsheet 載入 ChatLog 記錄，檢視師生對話內容、背景資訊，支援按教師篩選與時間排序。',
    accent: 'linear-gradient(90deg, #8b5cf6, #7c3aed)',
  },
  {
    href: '/admin/database-test',
    title: 'Google Spreadsheet 資料庫測試',
    description: '測試 Google Spreadsheet 輕量級資料庫的 CRUD 功能，包含新增、讀取、更新與 Upsert 操作。',
    accent: 'linear-gradient(90deg, #10b981, #059669)',
  },
];

export default function AdminPage() {
  const [refreshState, setRefreshState] = useState<RefreshState>('idle');
  const [clearState, setClearState] = useState<RefreshState>('idle');
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const isPending = refreshState === 'loading' || clearState === 'loading';

  // 載入時獲取當前角色總數
  useEffect(() => {
    const fetchTotal = async () => {
      try {
        const response = await fetch('/api/students/count');
        if (response.ok) {
          const data = await response.json();
          setTotal(data.total);
        }
      } catch (error) {
        console.error('無法獲取角色總數:', error);
      }
    };
    fetchTotal();
  }, []);

  const handleRefresh = async () => {
    setRefreshState('loading');
    setAlert(null);

    try {
      const response = await fetch('/api/students/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ count: DEFAULT_BATCH_SIZE }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errMsg = errorData?.error?.message || response.statusText || '刷新學生角色失敗';
        throw new Error(errMsg);
      }

      const data = await response.json();
      const refreshedTotal = typeof data.total === 'number' ? data.total : null;
      const addedCount = typeof data.added === 'number' ? data.added : DEFAULT_BATCH_SIZE;

      setTotal(refreshedTotal);
      setRefreshState('success');
      setClearState((prev) => (prev === 'loading' ? 'idle' : prev));
      setAlert({
        type: 'success',
        text: `已新增 ${addedCount} 個學生角色，總數為 ${refreshedTotal ?? '未知'}。`,
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : '刷新學生角色失敗';
      setRefreshState('error');
      setAlert({ type: 'error', text: errMsg });
    }
  };

  const handleClear = async () => {
    setClearState('loading');
    setAlert(null);

    try {
      const response = await fetch('/api/students/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errMsg = errorData?.error?.message || response.statusText || '清除學生角色快取失敗';
        throw new Error(errMsg);
      }

      const data = await response.json();
      const remainingTotal = typeof data.total === 'number' ? data.total : 0;

      setTotal(remainingTotal);
      setClearState('success');
      setRefreshState((prev) => (prev === 'loading' ? 'idle' : prev));
      setAlert({
        type: 'success',
        text: '已清除學生角色快取。',
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : '清除學生角色快取失敗';
      setClearState('error');
      setAlert({ type: 'error', text: errMsg });
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-[1200px] w-full mx-auto px-5 py-10 flex flex-col gap-6">
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
          <div className="p-5 flex flex-col gap-2 border-b border-slate-200">
            <h1 className="text-xl font-semibold text-slate-800">管理後台</h1>
            <p className="text-sm text-slate-500 leading-6">管理系統資料與工具</p>
          </div>
          <div className="p-5" style={{ marginBottom: '32px' }}>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 items-stretch">
              {ADMIN_TOOLS.map((tool) => (
                <a
                  key={tool.href}
                  href={tool.href}
                  className="relative flex flex-col gap-3 p-5 bg-white border border-slate-200 rounded-xl text-slate-900 no-underline min-h-[180px] transition ease-in-out duration-200 overflow-hidden hover:-translate-y-0.5 hover:shadow-xl"
                  style={{ ['--admin-card-accent' as any]: tool.accent } as CSSProperties}
                >
                  <span className="text-base font-semibold leading-6 m-0 whitespace-normal break-words">
                    {tool.title}
                  </span>
                  <p className="text-sm leading-6 text-slate-500 m-0 whitespace-normal flex-1 break-words">
                    {tool.description}
                  </p>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
                    前往<span aria-hidden="true">→</span>
                  </span>
                  <span
                    className="absolute inset-x-0 top-0 h-1"
                    style={{ background: 'var(--admin-card-accent, linear-gradient(90deg, #0ea5e9, #0284c7))' }}
                  />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
          <div className="p-5 flex flex-col gap-2 border-b border-slate-200">
            <h1 className="text-xl font-semibold text-slate-800">學生角色資料庫</h1>
            <p className="text-sm text-slate-500 leading-6">
              透過 AI 預先生成學生角色，儲存於伺服器以供模擬教學時隨機使用。
            </p>
          </div>
          <div className="p-5">
            <div className="flex flex-col gap-2 max-w-[400px]">
              <button
                className="w-full bg-gradient-to-b from-sky-500 to-sky-600 border border-white/30 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleRefresh}
                disabled={isPending}
              >
                {refreshState === 'loading' ? '生成中...' : `新增 ${DEFAULT_BATCH_SIZE} 個學生角色`}
              </button>
              <button
                className="w-full bg-gradient-to-b from-rose-500 to-rose-600 border border-white/30 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleClear}
                disabled={isPending}
              >
                {clearState === 'loading' ? '清除中...' : '清除學生角色快取'}
              </button>
            </div>
            <div className="mt-4 text-sm text-slate-500">
              <div>資料庫中的角色數量：{total ?? '載入中...'}</div>
              <div>模擬環境中將從資料庫中隨機選擇角色使用。</div>
            </div>
            {alert && (
              <div className={`mt-4 text-sm ${alert.type === 'error' ? 'text-rose-500' : 'text-emerald-600'}`}>
                {alert.text}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
