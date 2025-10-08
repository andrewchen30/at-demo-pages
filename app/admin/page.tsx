'use client';

import { useState, useEffect } from 'react';

type RefreshState = 'idle' | 'loading' | 'success' | 'error';

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
        const response = await fetch('/api/ai/student/roles/count');
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
      const response = await fetch('/api/ai/student/roles/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errMsg = errorData?.error?.message || response.statusText || '刷新學生角色失敗';
        throw new Error(errMsg);
      }

      const data = await response.json();
      const refreshedTotal = typeof data.total === 'number' ? data.total : null;
      const addedCount = typeof data.added === 'number' ? data.added : 10;

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
      const response = await fetch('/api/ai/student/roles/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errMsg =
          errorData?.error?.message || response.statusText || '清除學生角色快取失敗';
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
      const errMsg =
        error instanceof Error ? error.message : '清除學生角色快取失敗';
      setClearState('error');
      setAlert({ type: 'error', text: errMsg });
    }
  };

  return (
    <main className="ai-page">
      <div className="container">
        <div className="section">
          <div className="section-header">
            <h1 className="section-title">學生角色資料庫</h1>
            <p className="section-subtitle">透過 AI 預先生成學生角色，儲存於伺服器以供模擬教學時隨機使用。</p>
          </div>
          <div className="section-content">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                className="btn"
                onClick={handleRefresh}
                disabled={isPending}
                style={{ background: 'linear-gradient(180deg, #0ea5e9, #0284c7)' }}
              >
                {refreshState === 'loading' ? '生成中...' : '新增 10 個學生角色'}
              </button>
              <button
                className="btn"
                onClick={handleClear}
                disabled={isPending}
                style={{ background: 'linear-gradient(180deg, #f87171, #ef4444)' }}
              >
                {clearState === 'loading' ? '清除中...' : '清除學生角色快取'}
              </button>
            </div>
            <div style={{ marginTop: '16px', fontSize: '14px', color: 'var(--muted)' }}>
              <div>資料庫中的角色數量：{total ?? '載入中...'}</div>
              <div>模擬環境中的難有將從資料庫中隨機選擇角色使用。</div>
            </div>
            {alert && (
              <div
                style={{
                  marginTop: '16px',
                  fontSize: '14px',
                  color: alert.type === 'error' ? 'var(--error)' : 'var(--accent)',
                }}
              >
                {alert.text}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
