'use client';

import { useState, useEffect } from 'react';

interface ChatMessage {
  role: 'student' | 'teacher';
  content: string;
}

interface ConversationRecord {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  isCollapsed: boolean;
  startTag?: string;
  endTag?: string;
}

const STORAGE_KEY = 'coachLogViewer_conversations';
const START_TAG = 'Judge 產生的 JSON，含 summary 與 results。';
const END_TAG = '：只用來調整語氣（親切、鼓勵），不可分析或引用其內容。';

export default function CoachLogViewerPage() {
  const [inputText, setInputText] = useState('');
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState('');

  // 從 localStorage 載入資料
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setConversations(parsed);
      } catch (err) {
        console.error('載入資料失敗:', err);
      }
    }
  }, []);

  // 儲存到 localStorage
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    }
  }, [conversations]);

  const parseMessages = (text: string): { messages: ChatMessage[]; hasStartTag: boolean; hasEndTag: boolean } => {
    // 檢查是否包含開始和結束標籤
    const hasStartTag = text.includes(START_TAG);
    const hasEndTag = text.includes(END_TAG);

    let contentToParse = text;

    // 如果有標籤，提取標籤之間的內容
    if (hasStartTag && hasEndTag) {
      const startIndex = text.indexOf(START_TAG);
      const endIndex = text.indexOf(END_TAG);

      if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
        // 提取兩個標籤之間的內容
        contentToParse = text.substring(startIndex + START_TAG.length, endIndex);
      }
    } else if (hasStartTag) {
      // 只有開始標籤，從標籤後開始
      const startIndex = text.indexOf(START_TAG);
      contentToParse = text.substring(startIndex + START_TAG.length);
    } else if (hasEndTag) {
      // 只有結束標籤，到標籤前結束
      const endIndex = text.indexOf(END_TAG);
      contentToParse = text.substring(0, endIndex);
    }

    const lines = contentToParse.split('\n').filter((line) => line.trim());
    const parsedMessages: ChatMessage[] = [];

    for (const line of lines) {
      // 匹配 "學生: " 或 "老師: " 開頭
      const studentMatch = line.match(/^學生[:：]\s*(.+)$/);
      const teacherMatch = line.match(/^老師[:：]\s*(.+)$/);

      if (studentMatch) {
        parsedMessages.push({
          role: 'student',
          content: studentMatch[1].trim(),
        });
      } else if (teacherMatch) {
        parsedMessages.push({
          role: 'teacher',
          content: teacherMatch[1].trim(),
        });
      }
    }

    return { messages: parsedMessages, hasStartTag, hasEndTag };
  };

  const handleParse = () => {
    setError(null);
    try {
      const { messages: parsed, hasStartTag, hasEndTag } = parseMessages(inputText);
      if (parsed.length === 0) {
        setError('無法解析任何訊息，請確認格式正確（學生: 或 老師: 開頭）');
        return;
      }

      // 創建新的對話記錄
      const newConversation: ConversationRecord = {
        id: Date.now().toString(),
        title: `對話記錄 ${new Date().toLocaleString('zh-TW')}`,
        messages: parsed,
        createdAt: new Date().toISOString(),
        isCollapsed: false,
        startTag: hasStartTag ? START_TAG : undefined,
        endTag: hasEndTag ? END_TAG : undefined,
      };

      setConversations([newConversation, ...conversations]);
      setInputText('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '解析失敗');
    }
  };

  const toggleCollapse = (id: string) => {
    setConversations(
      conversations.map((conv) => (conv.id === id ? { ...conv, isCollapsed: !conv.isCollapsed } : conv))
    );
  };

  const deleteConversation = (id: string) => {
    const updated = conversations.filter((conv) => conv.id !== id);
    setConversations(updated);
    // 如果刪除所有對話，清除 localStorage
    if (updated.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const startEditingTitle = (id: string, currentTitle: string) => {
    setEditingTitleId(id);
    setEditingTitleValue(currentTitle);
  };

  const saveTitle = (id: string) => {
    setConversations(conversations.map((conv) => (conv.id === id ? { ...conv, title: editingTitleValue } : conv)));
    setEditingTitleId(null);
    setEditingTitleValue('');
  };

  const cancelEditingTitle = () => {
    setEditingTitleId(null);
    setEditingTitleValue('');
  };

  const exportAllData = () => {
    const json = JSON.stringify(conversations, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coach-log-viewer-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string);
          if (Array.isArray(imported)) {
            // 合併現有資料，不清除原先的資料
            const merged = [...imported, ...conversations];
            setConversations(merged);
            setError(null);
          } else {
            setError('匯入的檔案格式不正確');
          }
        } catch (err) {
          setError('匯入失敗：' + (err instanceof Error ? err.message : '未知錯誤'));
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <main className="ai-page">
      <div className="container" style={{ display: 'block', padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* 頁首 */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
            對話記錄檢視器
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '12px' }}>
            將 developer message 格式轉換為聊天記錄並視覺化呈現
          </p>
          <a
            href="/admin"
            style={{
              display: 'inline-block',
              color: 'var(--accent)',
              textDecoration: 'none',
              fontSize: '14px',
            }}
          >
            ← 返回管理後台
          </a>
        </div>

        {/* 輸入區域 - 固定在最上方 */}
        <div
          className="section"
          style={{
            marginBottom: '24px',
            position: 'sticky',
            top: '20px',
            zIndex: 10,
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }}
        >
          <div className="section-header" style={{ cursor: 'default' }}>
            <h2 className="section-title">新增對話記錄</h2>
          </div>

          <div className="section-content">
            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="input-text"
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '500',
                  color: 'var(--text)',
                  fontSize: '13px',
                }}
              >
                貼上 Coach Message
              </label>
              <div
                style={{
                  marginBottom: '8px',
                  padding: '10px',
                  backgroundColor: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#0c4a6e',
                }}
              >
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>💡 支援兩種格式：</div>
                <div style={{ marginLeft: '20px', lineHeight: '1.6' }}>
                  <div>
                    1. <strong>標準格式：</strong>直接貼上「學生: ...」「老師: ...」的對話記錄
                  </div>
                  <div>
                    2. <strong>完整格式：</strong>包含開始標籤「
                    <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#059669' }}>
                      Judge 產生的 JSON...
                    </span>
                    」和結束標籤「
                    <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#dc2626' }}>
                      ：只用來調整語氣...
                    </span>
                    」的完整訊息
                  </div>
                </div>
              </div>
              <textarea
                id="input-text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="貼上對話記錄...&#10;&#10;支援格式 1：&#10;老師: 那我們可以多練習對話和聽力&#10;學生: 好，我也期待。&#10;&#10;或格式 2：&#10;...Judge 產生的 JSON，含 summary 與 results。&#10;老師: 那我們可以多練習對話和聽力&#10;學生: 好，我也期待。&#10;：只用來調整語氣（親切、鼓勵），不可分析或引用其內容。"
                style={{
                  width: '100%',
                  minHeight: '150px',
                  padding: '12px',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg)',
                  color: 'var(--text)',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  resize: 'vertical',
                  lineHeight: '1.5',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                className="btn"
                onClick={handleParse}
                disabled={!inputText.trim()}
                style={{
                  background: 'linear-gradient(180deg, #10b981, #059669)',
                  flex: '1',
                  minWidth: '120px',
                }}
              >
                ✨ 解析並新增
              </button>
              <button
                className="btn"
                onClick={exportAllData}
                disabled={conversations.length === 0}
                style={{
                  background: 'linear-gradient(180deg, #3b82f6, #2563eb)',
                  flex: '0 0 auto',
                }}
              >
                📥 匯出全部
              </button>
              <button
                className="btn"
                onClick={importData}
                style={{
                  background: 'linear-gradient(180deg, #f59e0b, #d97706)',
                  flex: '0 0 auto',
                }}
              >
                📤 匯入資料
              </button>
            </div>

            {error && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '12px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  color: '#dc2626',
                  fontSize: '13px',
                }}
              >
                ⚠️ {error}
              </div>
            )}
          </div>
        </div>

        {/* 對話記錄列表 */}
        <div style={{ marginTop: '24px' }}>
          {conversations.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: 'var(--muted)',
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
              <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>尚無對話記錄</div>
              <div style={{ fontSize: '14px' }}>請在上方貼上 developer message 開始解析</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {conversations.map((conv) => (
                <div key={conv.id} className="section">
                  {/* 可折疊的標題列 */}
                  <div
                    className="section-header"
                    style={{
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                    onClick={() => toggleCollapse(conv.id)}
                  >
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '16px', transition: 'transform 0.2s ease' }}>
                        {conv.isCollapsed ? '▶' : '▼'}
                      </span>
                      {editingTitleId === conv.id ? (
                        <input
                          type="text"
                          value={editingTitleValue}
                          onChange={(e) => setEditingTitleValue(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              saveTitle(conv.id);
                            } else if (e.key === 'Escape') {
                              cancelEditingTitle();
                            }
                          }}
                          style={{
                            flex: 1,
                            padding: '6px 12px',
                            border: '2px solid #3b82f6',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '600',
                            outline: 'none',
                          }}
                          autoFocus
                        />
                      ) : (
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text)' }}>{conv.title}</div>
                          <div
                            style={{
                              fontSize: '12px',
                              color: 'var(--muted)',
                              marginTop: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              flexWrap: 'wrap',
                            }}
                          >
                            <span>{conv.messages.length} 則訊息</span>
                            <span>•</span>
                            <span>{new Date(conv.createdAt).toLocaleString('zh-TW')}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                      {editingTitleId === conv.id ? (
                        <>
                          <button
                            onClick={() => saveTitle(conv.id)}
                            style={{
                              padding: '6px 12px',
                              border: 'none',
                              borderRadius: '6px',
                              background: '#10b981',
                              color: 'white',
                              fontSize: '12px',
                              cursor: 'pointer',
                            }}
                          >
                            ✓ 儲存
                          </button>
                          <button
                            onClick={cancelEditingTitle}
                            style={{
                              padding: '6px 12px',
                              border: '1px solid var(--border)',
                              borderRadius: '6px',
                              background: 'white',
                              color: 'var(--text)',
                              fontSize: '12px',
                              cursor: 'pointer',
                            }}
                          >
                            ✕ 取消
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEditingTitle(conv.id, conv.title)}
                            style={{
                              padding: '6px 12px',
                              border: '1px solid var(--border)',
                              borderRadius: '6px',
                              background: 'white',
                              color: 'var(--text)',
                              fontSize: '12px',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#f1f5f9';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'white';
                            }}
                          >
                            ✏️ 編輯
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('確定要刪除這個對話記錄嗎？')) {
                                deleteConversation(conv.id);
                              }
                            }}
                            style={{
                              padding: '6px 12px',
                              border: '1px solid #fecaca',
                              borderRadius: '6px',
                              background: 'white',
                              color: '#ef4444',
                              fontSize: '12px',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#fef2f2';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'white';
                            }}
                          >
                            🗑️ 刪除
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 對話內容 */}
                  {!conv.isCollapsed && (
                    <div className="section-content">
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '16px',
                          maxHeight: '500px',
                          overflowY: 'auto',
                          padding: '16px',
                          backgroundColor: 'var(--panel)',
                          borderRadius: '8px',
                        }}
                      >
                        {conv.messages.map((message, index) => (
                          <div
                            key={index}
                            style={{
                              display: 'flex',
                              justifyContent: message.role === 'student' ? 'flex-start' : 'flex-end',
                              width: '100%',
                            }}
                          >
                            <div
                              style={{
                                maxWidth: '70%',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                              }}
                            >
                              <div
                                style={{
                                  fontSize: '12px',
                                  color: 'var(--muted)',
                                  paddingLeft: message.role === 'student' ? '12px' : '0',
                                  paddingRight: message.role === 'teacher' ? '12px' : '0',
                                  textAlign: message.role === 'student' ? 'left' : 'right',
                                }}
                              >
                                {message.role === 'student' ? '學生' : '老師'}
                              </div>
                              <div
                                style={{
                                  padding: '12px 16px',
                                  borderRadius: '16px',
                                  backgroundColor: message.role === 'student' ? '#e0f2fe' : '#dbeafe',
                                  color: '#1e293b',
                                  fontSize: '14px',
                                  lineHeight: '1.5',
                                  wordBreak: 'break-word',
                                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                                }}
                              >
                                {message.content}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* JSON 檢視 */}
                      <div
                        style={{
                          marginTop: '16px',
                          padding: '12px',
                          backgroundColor: 'var(--bg)',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <details>
                          <summary
                            style={{
                              cursor: 'pointer',
                              fontWeight: '500',
                              color: 'var(--text)',
                              userSelect: 'none',
                              fontSize: '13px',
                            }}
                          >
                            🔍 檢視 JSON 格式
                          </summary>
                          <pre
                            style={{
                              marginTop: '12px',
                              padding: '12px',
                              backgroundColor: 'var(--panel)',
                              borderRadius: '8px',
                              fontSize: '12px',
                              overflow: 'auto',
                              maxHeight: '300px',
                              fontFamily: 'monospace',
                            }}
                          >
                            {JSON.stringify(conv.messages, null, 2)}
                          </pre>
                        </details>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
