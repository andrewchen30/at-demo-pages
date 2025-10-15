'use client';

import { useState, useEffect } from 'react';

interface ChatLog {
  id: string;
  teacher_key: string;
  chat_history: string;
  chat_count: number;
  background_info: string;
  created_at: string;
  updated_at: string;
}

type OperationState = 'idle' | 'loading' | 'success' | 'error';

export default function DatabaseTestPage() {
  const [records, setRecords] = useState<ChatLog[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [operationState, setOperationState] = useState<OperationState>('idle');
  const [message, setMessage] = useState<string>('');
  const [lastOperation, setLastOperation] = useState<string>('');

  // 載入資料
  const fetchRecords = async () => {
    try {
      const response = await fetch('/api/database/test');
      const data = await response.json();
      if (data.success) {
        setRecords(data.records || []);
      }
    } catch (error) {
      console.error('載入資料失敗:', error);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  // 執行操作的通用函數
  const executeOperation = async (action: string, data: any, operationName: string) => {
    setOperationState('loading');
    setMessage('');
    setLastOperation(operationName);

    try {
      const response = await fetch('/api/database/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, data }),
      });

      const result = await response.json();

      if (result.success) {
        setOperationState('success');
        setMessage(result.message || '操作成功');

        // 如果是 appendRow，自動選擇新建立的 ID
        if (action === 'appendRow' && result.id) {
          setSelectedId(result.id);
        }

        // 重新載入資料
        await fetchRecords();
      } else {
        setOperationState('error');
        setMessage(result.error || '操作失敗');
      }
    } catch (error) {
      setOperationState('error');
      setMessage(error instanceof Error ? error.message : '發生錯誤');
    }
  };

  // 測試 1: appendRow - 新增資料
  const testAppendRow = () => {
    const timestamp = new Date().toLocaleString('zh-TW');
    executeOperation(
      'appendRow',
      {
        teacher_key: `TEACHER_${Date.now()}`,
        chat_history: `user: Hello!
assistant: Hi there!`,
        chat_count: 1,
        background_info: `測試資料 - ${timestamp}`,
      },
      'appendRow'
    );
  };

  // 測試 2: updateById - 更新資料
  const testUpdateById = () => {
    if (!selectedId) {
      setOperationState('error');
      setMessage('請先選擇一筆資料（或新增一筆）');
      return;
    }

    executeOperation(
      'updateById',
      {
        id: selectedId,
        patch: {
          chat_count: Math.floor(Math.random() * 100),
          background_info: `已更新 - ${new Date().toLocaleString('zh-TW')}`,
        },
      },
      'updateById'
    );
  };

  // 測試 3: upsertByKey - 根據 teacher_key upsert
  const testUpsertByKey = () => {
    const teacherKey = 'TEACHER_UPSERT_TEST';
    executeOperation(
      'upsertByKey',
      {
        key: teacherKey,
        row: {
          teacher_key: teacherKey,
          chat_history: JSON.stringify([
            { role: 'user', content: 'Test upsert' },
            { role: 'assistant', content: 'Upserted successfully!' },
          ]),
          chat_count: Math.floor(Math.random() * 50),
          background_info: `Upsert 測試 - ${new Date().toLocaleString('zh-TW')}`,
        },
      },
      'upsertByKey'
    );
  };

  // 測試 4: getById - 取得單筆資料
  const testGetById = () => {
    if (!selectedId) {
      setOperationState('error');
      setMessage('請先選擇一筆資料');
      return;
    }

    executeOperation('getById', { id: selectedId }, 'getById');
  };

  const selectedRecord = records.find((r) => r.id === selectedId);

  return (
    <main className="ai-page" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* 頂部導航欄 */}
      <div
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text)', marginBottom: '4px' }}>
            Google Spreadsheet 資料庫測試
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--muted)' }}>測試 CRUD 操作：新增、讀取、更新、Upsert</p>
        </div>
        <a
          href="/admin"
          style={{
            color: 'var(--accent)',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          ← 返回管理後台
        </a>
      </div>

      {/* 主要內容 */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* 左側 - 操作面板 */}
        <div
          style={{
            width: '380px',
            borderRight: '1px solid var(--border)',
            backgroundColor: 'var(--panel)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '16px',
              borderBottom: '1px solid var(--border)',
              backgroundColor: 'var(--bg)',
            }}
          >
            <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)' }}>測試操作</h2>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {/* 選擇的 ID */}
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '500',
                  color: 'var(--text)',
                  fontSize: '13px',
                }}
              >
                選擇的 ID
              </label>
              <input
                type="text"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                placeholder="從右側列表選擇或手動輸入"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg)',
                  color: 'var(--text)',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                }}
              />
            </div>

            {/* 測試按鈕 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* 測試 1: appendRow */}
              <div
                style={{
                  padding: '16px',
                  backgroundColor: '#f0f9ff',
                  border: '2px solid #3b82f6',
                  borderRadius: '8px',
                }}
              >
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1e40af', marginBottom: '8px' }}>
                  1️⃣ 測試 appendRow
                </h3>
                <p style={{ fontSize: '12px', color: '#1e3a8a', marginBottom: '12px' }}>新增一筆測試資料到資料庫</p>
                <button
                  className="btn"
                  onClick={testAppendRow}
                  disabled={operationState === 'loading'}
                  style={{
                    background: 'linear-gradient(180deg, #3b82f6, #2563eb)',
                    width: '100%',
                    fontSize: '13px',
                  }}
                >
                  {operationState === 'loading' && lastOperation === 'appendRow' ? '執行中...' : '➕ 新增資料'}
                </button>
              </div>

              {/* 測試 2: updateById */}
              <div
                style={{
                  padding: '16px',
                  backgroundColor: '#fef3c7',
                  border: '2px solid #f59e0b',
                  borderRadius: '8px',
                }}
              >
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#92400e', marginBottom: '8px' }}>
                  2️⃣ 測試 updateById
                </h3>
                <p style={{ fontSize: '12px', color: '#78350f', marginBottom: '12px' }}>
                  根據 ID 更新資料（需先選擇 ID）
                </p>
                <button
                  className="btn"
                  onClick={testUpdateById}
                  disabled={operationState === 'loading' || !selectedId}
                  style={{
                    background: selectedId ? 'linear-gradient(180deg, #f59e0b, #d97706)' : '#d1d5db',
                    width: '100%',
                    fontSize: '13px',
                  }}
                >
                  {operationState === 'loading' && lastOperation === 'updateById' ? '執行中...' : '✏️ 更新資料'}
                </button>
              </div>

              {/* 測試 3: upsertByKey */}
              <div
                style={{
                  padding: '16px',
                  backgroundColor: '#f3e8ff',
                  border: '2px solid #a855f7',
                  borderRadius: '8px',
                }}
              >
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#6b21a8', marginBottom: '8px' }}>
                  3️⃣ 測試 upsertByKey
                </h3>
                <p style={{ fontSize: '12px', color: '#581c87', marginBottom: '12px' }}>
                  根據 teacher_key 更新或新增（固定 key: TEACHER_UPSERT_TEST）
                </p>
                <button
                  className="btn"
                  onClick={testUpsertByKey}
                  disabled={operationState === 'loading'}
                  style={{
                    background: 'linear-gradient(180deg, #a855f7, #9333ea)',
                    width: '100%',
                    fontSize: '13px',
                  }}
                >
                  {operationState === 'loading' && lastOperation === 'upsertByKey' ? '執行中...' : '🔄 Upsert 資料'}
                </button>
              </div>

              {/* 測試 4: getById */}
              <div
                style={{
                  padding: '16px',
                  backgroundColor: '#dcfce7',
                  border: '2px solid #10b981',
                  borderRadius: '8px',
                }}
              >
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#065f46', marginBottom: '8px' }}>
                  4️⃣ 測試 getById
                </h3>
                <p style={{ fontSize: '12px', color: '#064e3b', marginBottom: '12px' }}>
                  根據 ID 取得單筆資料（需先選擇 ID）
                </p>
                <button
                  className="btn"
                  onClick={testGetById}
                  disabled={operationState === 'loading' || !selectedId}
                  style={{
                    background: selectedId ? 'linear-gradient(180deg, #10b981, #059669)' : '#d1d5db',
                    width: '100%',
                    fontSize: '13px',
                  }}
                >
                  {operationState === 'loading' && lastOperation === 'getById' ? '執行中...' : '🔍 取得資料'}
                </button>
              </div>

              {/* 重新載入按鈕 */}
              <button
                className="btn"
                onClick={fetchRecords}
                disabled={operationState === 'loading'}
                style={{
                  background: '#e5e7eb',
                  width: '100%',
                  fontSize: '13px',
                  marginTop: '8px',
                }}
              >
                🔄 重新載入資料
              </button>
            </div>

            {/* 操作結果 */}
            {message && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px',
                  backgroundColor: operationState === 'error' ? '#fef2f2' : '#f0fdf4',
                  border: `1px solid ${operationState === 'error' ? '#fecaca' : '#bbf7d0'}`,
                  borderRadius: '6px',
                  color: operationState === 'error' ? '#dc2626' : '#15803d',
                  fontSize: '13px',
                }}
              >
                {operationState === 'error' ? '❌' : '✅'} {message}
              </div>
            )}
          </div>
        </div>

        {/* 右側 - 資料列表 */}
        <div
          style={{
            flex: 1,
            backgroundColor: 'var(--bg)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '16px 24px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)' }}>資料列表</h2>
            <span
              style={{
                fontSize: '12px',
                color: 'var(--muted)',
                backgroundColor: 'var(--panel)',
                padding: '4px 8px',
                borderRadius: '12px',
              }}
            >
              共 {records.length} 筆
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            {records.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: 'var(--muted)',
                }}
              >
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>尚無資料</div>
                <div style={{ fontSize: '14px' }}>請點擊左側「新增資料」按鈕來建立第一筆資料</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '16px', maxWidth: '1200px', margin: '0 auto' }}>
                {records.map((record) => (
                  <div
                    key={record.id}
                    onClick={() => setSelectedId(record.id)}
                    style={{
                      padding: '16px',
                      border: selectedId === record.id ? '2px solid #3b82f6' : '1px solid var(--border)',
                      borderRadius: '8px',
                      backgroundColor: selectedId === record.id ? '#f0f9ff' : 'var(--panel)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: '4px' }}>
                          ID: {record.id}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Teacher: {record.teacher_key}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            fontSize: '12px',
                            color: 'var(--accent)',
                            backgroundColor: 'var(--bg)',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontWeight: '600',
                          }}
                        >
                          對話數: {record.chat_count}
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '8px' }}>
                      背景: {record.background_info}
                    </div>

                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--muted)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        paddingTop: '8px',
                        borderTop: '1px solid var(--border)',
                      }}
                    >
                      <span>建立: {new Date(record.created_at).toLocaleString('zh-TW')}</span>
                      <span>更新: {new Date(record.updated_at).toLocaleString('zh-TW')}</span>
                    </div>

                    {selectedId === record.id && (
                      <details style={{ marginTop: '12px' }}>
                        <summary
                          style={{
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#3b82f6',
                            userSelect: 'none',
                          }}
                        >
                          🔍 檢視對話歷史 JSON
                        </summary>
                        <pre
                          style={{
                            marginTop: '8px',
                            padding: '12px',
                            backgroundColor: 'var(--bg)',
                            borderRadius: '6px',
                            fontSize: '11px',
                            overflow: 'auto',
                            maxHeight: '200px',
                            fontFamily: 'monospace',
                            border: '1px solid var(--border)',
                          }}
                        >
                          {record.chat_history}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
