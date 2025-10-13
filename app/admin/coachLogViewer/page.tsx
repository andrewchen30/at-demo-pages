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
  conversationTime?: string; // 實際對話時間
  isCollapsed: boolean;
  startTag?: string;
  endTag?: string;
  coachFeedback?: string;
  rawInput?: string; // 原始輸入內容
}

const STORAGE_KEY = 'coachLogViewer_conversations';
const START_TAG = 'Judge 產生的 JSON，含 summary 與 results。';
const END_TAG = '：只用來調整語氣（親切、鼓勵），不可分析或引用其內容。';

export default function CoachLogViewerPage() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [conversationTime, setConversationTime] = useState('');
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [editingRawInputId, setEditingRawInputId] = useState<string | null>(null);
  const [editingRawInputValue, setEditingRawInputValue] = useState('');

  // 從 localStorage 載入資料
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setConversations(parsed);
        // 自動選擇第一個對話
        if (parsed.length > 0) {
          setSelectedConversationId(parsed[0].id);
        }
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

    const lines = contentToParse.split('\n');
    const parsedMessages: ChatMessage[] = [];
    let currentMessage: ChatMessage | null = null;

    for (const line of lines) {
      // 匹配 "學生: " 或 "老師: " 開頭
      const studentMatch = line.match(/^學生[:：]\s*(.*)$/);
      const teacherMatch = line.match(/^老師[:：]\s*(.*)$/);

      if (studentMatch) {
        // 如果有進行中的訊息，先儲存
        if (currentMessage) {
          parsedMessages.push(currentMessage);
        }
        // 開始新的學生訊息
        currentMessage = {
          role: 'student',
          content: studentMatch[1].trim(),
        };
      } else if (teacherMatch) {
        // 如果有進行中的訊息，先儲存
        if (currentMessage) {
          parsedMessages.push(currentMessage);
        }
        // 開始新的老師訊息
        currentMessage = {
          role: 'teacher',
          content: teacherMatch[1].trim(),
        };
      } else if (currentMessage && line.trim()) {
        // 如果當前有進行中的訊息，且這行不是空行，則累加到內容中
        currentMessage.content += '\n' + line.trim();
      }
    }

    // 不要忘記加入最後一個訊息
    if (currentMessage) {
      parsedMessages.push(currentMessage);
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

      // 創建新的對話記錄（使用時間戳 + 隨機數確保唯一性）
      const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newConversation: ConversationRecord = {
        id: uniqueId,
        title: `對話記錄 ${new Date().toLocaleString('zh-TW')}`,
        messages: parsed,
        createdAt: new Date().toISOString(),
        conversationTime: conversationTime.trim() || undefined,
        isCollapsed: false,
        startTag: hasStartTag ? START_TAG : undefined,
        endTag: hasEndTag ? END_TAG : undefined,
        coachFeedback: outputText.trim() || undefined,
        rawInput: inputText, // 儲存原始輸入
      };

      setConversations([newConversation, ...conversations]);
      setSelectedConversationId(newConversation.id); // 自動選擇新增的對話
      setInputText('');
      setOutputText('');
      setConversationTime('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '解析失敗');
    }
  };

  const deleteConversation = (id: string) => {
    const currentIndex = conversations.findIndex((conv) => conv.id === id);
    const updated = conversations.filter((conv) => conv.id !== id);
    setConversations(updated);

    // 如果刪除的是選中的對話，自動選擇下一個
    if (selectedConversationId === id) {
      if (updated.length > 0) {
        // 優先選擇下一個，如果沒有就選擇上一個
        const nextIndex = Math.min(currentIndex, updated.length - 1);
        setSelectedConversationId(updated[nextIndex].id);
      } else {
        setSelectedConversationId(null);
      }
    }

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

  const startEditingRawInput = (id: string, currentRawInput: string | undefined) => {
    setEditingRawInputId(id);
    setEditingRawInputValue(currentRawInput || '');
  };

  const saveRawInput = (id: string) => {
    setConversations(
      conversations.map((conv) => (conv.id === id ? { ...conv, rawInput: editingRawInputValue } : conv))
    );
    setEditingRawInputId(null);
    setEditingRawInputValue('');
  };

  const cancelEditingRawInput = () => {
    setEditingRawInputId(null);
    setEditingRawInputValue('');
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

  const reparseAllConversations = () => {
    if (!confirm('確定要重新解析所有對話記錄嗎？這會使用目前的 parser 重新處理所有 raw input。')) {
      return;
    }

    let successCount = 0;
    let failCount = 0;
    const updatedConversations = conversations.map((conv) => {
      if (!conv.rawInput) {
        // 如果沒有 rawInput，保持原樣
        return conv;
      }

      try {
        const { messages: parsed, hasStartTag, hasEndTag } = parseMessages(conv.rawInput);
        if (parsed.length > 0) {
          successCount++;
          return {
            ...conv,
            messages: parsed,
            startTag: hasStartTag ? START_TAG : undefined,
            endTag: hasEndTag ? END_TAG : undefined,
          };
        } else {
          failCount++;
          return conv;
        }
      } catch (err) {
        failCount++;
        console.error(`重新解析對話 ${conv.id} 失敗:`, err);
        return conv;
      }
    });

    setConversations(updatedConversations);
    alert(`重新解析完成！\n✅ 成功: ${successCount}\n❌ 失敗或略過: ${failCount}`);
  };

  const clearAllConversations = () => {
    const count = conversations.length;
    if (count === 0) {
      return;
    }

    if (
      !confirm(`⚠️ 警告：此操作將永久刪除所有 ${count} 個對話記錄！\n\n建議先匯出備份再進行清除。\n\n確定要繼續嗎？`)
    ) {
      return;
    }

    // 二次確認
    if (!confirm(`🚨 最後確認：真的要刪除全部 ${count} 個對話記錄嗎？\n\n此操作無法復原！`)) {
      return;
    }

    setConversations([]);
    setSelectedConversationId(null);
    localStorage.removeItem(STORAGE_KEY);
    alert(`✅ 已清除所有對話記錄（共 ${count} 個）`);
  };

  const selectedConversation = conversations.find((conv) => conv.id === selectedConversationId);

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
            對話記錄檢視器
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--muted)' }}>將 developer message 格式轉換為聊天記錄並視覺化呈現</p>
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

      {/* 三欄式佈局 */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* 左側邊欄 - 新增對話記錄 */}
        <div
          style={{
            width: '320px',
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
            <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)' }}>新增對話記錄</h2>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            <div style={{ marginBottom: '12px' }}>
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
                  padding: '8px',
                  backgroundColor: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: '6px',
                  fontSize: '11px',
                  color: '#0c4a6e',
                }}
              >
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>💡 支援格式：</div>
                <div style={{ lineHeight: '1.5' }}>
                  <div>• 標準：學生/老師對話</div>
                  <div>• 完整：含開始/結束標籤</div>
                </div>
              </div>
              <textarea
                id="input-text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="貼上對話記錄..."
                style={{
                  width: '100%',
                  minHeight: '150px',
                  padding: '10px',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg)',
                  color: 'var(--text)',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  resize: 'vertical',
                  lineHeight: '1.4',
                }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label
                htmlFor="conversation-time"
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '500',
                  color: 'var(--text)',
                  fontSize: '13px',
                }}
              >
                對話時間
              </label>
              <div
                style={{
                  marginBottom: '8px',
                  padding: '8px',
                  backgroundColor: '#f3e8ff',
                  border: '1px solid #d8b4fe',
                  borderRadius: '6px',
                  fontSize: '11px',
                  color: '#581c87',
                }}
              >
                <div style={{ lineHeight: '1.5' }}>🕐 選填：實際對話發生的時間</div>
              </div>
              <input
                id="conversation-time"
                type="text"
                value={conversationTime}
                onChange={(e) => setConversationTime(e.target.value)}
                placeholder="例如：2025/01/13 14:30:45"
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

            <div style={{ marginBottom: '12px' }}>
              <label
                htmlFor="output-text"
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '500',
                  color: 'var(--text)',
                  fontSize: '13px',
                }}
              >
                貼上教練回饋 (output_text)
              </label>
              <div
                style={{
                  marginBottom: '8px',
                  padding: '8px',
                  backgroundColor: '#fef3c7',
                  border: '1px solid #fde68a',
                  borderRadius: '6px',
                  fontSize: '11px',
                  color: '#92400e',
                }}
              >
                <div style={{ lineHeight: '1.5' }}>💬 選填：教練對此對話的回饋</div>
              </div>
              <textarea
                id="output-text"
                value={outputText}
                onChange={(e) => setOutputText(e.target.value)}
                placeholder="貼上教練回饋..."
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '10px',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg)',
                  color: 'var(--text)',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  resize: 'vertical',
                  lineHeight: '1.4',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <button
                className="btn"
                onClick={handleParse}
                disabled={!inputText.trim()}
                style={{
                  background: inputText.trim() ? '#6b7280' : '#e5e7eb',
                  width: '100%',
                  fontSize: '12px',
                  padding: '7px',
                }}
              >
                ✨ 解析並新增
              </button>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  className="btn"
                  onClick={exportAllData}
                  disabled={conversations.length === 0}
                  style={{
                    background: conversations.length > 0 ? '#e5e7eb' : '#f3f4f6',
                    flex: 1,
                    fontSize: '12px',
                    padding: '7px',
                  }}
                >
                  📥 匯出
                </button>
                <button
                  className="btn"
                  onClick={importData}
                  style={{
                    background: '#e5e7eb',
                    flex: 1,
                    fontSize: '12px',
                    padding: '7px',
                  }}
                >
                  📤 匯入
                </button>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  className="btn"
                  onClick={reparseAllConversations}
                  disabled={conversations.length === 0 || conversations.every((c) => !c.rawInput)}
                  style={{
                    background:
                      conversations.length > 0 && conversations.some((c) => c.rawInput) ? '#e5e7eb' : '#f3f4f6',
                    flex: 1,
                    fontSize: '12px',
                    padding: '7px',
                  }}
                >
                  🔄 重新解析
                </button>
                <button
                  className="btn"
                  onClick={clearAllConversations}
                  disabled={conversations.length === 0}
                  style={{
                    background: conversations.length > 0 ? '#e5e7eb' : '#f3f4f6',
                    flex: 1,
                    fontSize: '12px',
                    padding: '7px',
                  }}
                >
                  🗑️ 清除
                </button>
              </div>
            </div>

            {error && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '10px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  color: '#dc2626',
                  fontSize: '12px',
                }}
              >
                ⚠️ {error}
              </div>
            )}
          </div>
        </div>

        {/* 中間邊欄 - 對話記錄列表 */}
        <div
          style={{
            width: '280px',
            borderRight: '1px solid var(--border)',
            backgroundColor: 'var(--bg)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '16px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)' }}>對話列表</h2>
            <span
              style={{
                fontSize: '12px',
                color: 'var(--muted)',
                backgroundColor: 'var(--panel)',
                padding: '4px 8px',
                borderRadius: '12px',
              }}
            >
              {conversations.length}
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {conversations.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: 'var(--muted)',
                }}
              >
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>💬</div>
                <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>尚無對話記錄</div>
                <div style={{ fontSize: '12px' }}>請在左側新增</div>
              </div>
            ) : (
              <div>
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConversationId(conv.id)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                      backgroundColor: selectedConversationId === conv.id ? '#f0f9ff' : 'transparent',
                      borderLeft: selectedConversationId === conv.id ? '3px solid #3b82f6' : '3px solid transparent',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedConversationId !== conv.id) {
                        e.currentTarget.style.backgroundColor = 'var(--panel)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedConversationId !== conv.id) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <div
                      style={{
                        fontWeight: '600',
                        fontSize: '13px',
                        color: 'var(--text)',
                        marginBottom: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {conv.title}
                      {!conv.rawInput && (
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            backgroundColor: '#fecaca',
                            color: '#991b1b',
                            borderRadius: '4px',
                            fontWeight: '600',
                          }}
                          title="缺少 raw input"
                        >
                          ⚠️
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--muted)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      <div>{conv.messages.length} 則訊息</div>
                      <div style={{ fontSize: '10px' }}>{conv.conversationTime || '未知'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 右側主要內容 - 對話詳情 */}
        <div
          style={{
            flex: 1,
            backgroundColor: 'var(--bg)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {selectedConversation ? (
            <>
              {/* 對話標題列 */}
              <div
                style={{
                  padding: '16px 24px',
                  borderBottom: '1px solid var(--border)',
                  backgroundColor: 'var(--panel)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ flex: 1 }}>
                  {editingTitleId === selectedConversation.id ? (
                    <input
                      type="text"
                      value={editingTitleValue}
                      onChange={(e) => setEditingTitleValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          saveTitle(selectedConversation.id);
                        } else if (e.key === 'Escape') {
                          cancelEditingTitle();
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '2px solid #3b82f6',
                        borderRadius: '6px',
                        fontSize: '16px',
                        fontWeight: '600',
                        outline: 'none',
                      }}
                      autoFocus
                    />
                  ) : (
                    <>
                      <div style={{ fontWeight: '600', fontSize: '16px', color: 'var(--text)', marginBottom: '4px' }}>
                        {selectedConversation.title}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                        {selectedConversation.messages.length} 則訊息 •{' '}
                        {selectedConversation.conversationTime || '未知'}
                      </div>
                    </>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {editingTitleId === selectedConversation.id ? (
                    <>
                      <button
                        onClick={() => saveTitle(selectedConversation.id)}
                        style={{
                          padding: '8px 16px',
                          border: 'none',
                          borderRadius: '6px',
                          background: '#10b981',
                          color: 'white',
                          fontSize: '13px',
                          cursor: 'pointer',
                          fontWeight: '500',
                        }}
                      >
                        ✓ 儲存
                      </button>
                      <button
                        onClick={cancelEditingTitle}
                        style={{
                          padding: '8px 16px',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          background: 'white',
                          color: 'var(--text)',
                          fontSize: '13px',
                          cursor: 'pointer',
                        }}
                      >
                        ✕ 取消
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEditingTitle(selectedConversation.id, selectedConversation.title)}
                        style={{
                          padding: '8px 16px',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          background: 'white',
                          color: 'var(--text)',
                          fontSize: '13px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          fontWeight: '500',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#f1f5f9';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'white';
                        }}
                      >
                        ✏️ 編輯標題
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('確定要刪除這個對話記錄嗎？')) {
                            deleteConversation(selectedConversation.id);
                          }
                        }}
                        style={{
                          padding: '8px 16px',
                          border: '1px solid #fecaca',
                          borderRadius: '6px',
                          background: 'white',
                          color: '#ef4444',
                          fontSize: '13px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          fontWeight: '500',
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
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    maxWidth: '900px',
                    margin: '0 auto',
                  }}
                >
                  {selectedConversation.messages.map((message, index) => (
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
                            fontWeight: '500',
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
                            lineHeight: '1.6',
                            wordBreak: 'break-word',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                          }}
                        >
                          {message.content}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* 教練回饋 */}
                  {selectedConversation.coachFeedback && (
                    <div
                      style={{
                        marginTop: '24px',
                        padding: '16px',
                        backgroundColor: '#fef3c7',
                        border: '2px solid #fbbf24',
                        borderRadius: '12px',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '12px',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#92400e',
                        }}
                      >
                        <span style={{ fontSize: '18px' }}>🎯</span>
                        <span>教練回饋</span>
                      </div>
                      <div
                        style={{
                          fontSize: '14px',
                          lineHeight: '1.6',
                          color: '#78350f',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                      >
                        {selectedConversation.coachFeedback}
                      </div>
                    </div>
                  )}

                  {/* Raw Input 編輯區 */}
                  <div
                    style={{
                      marginTop: '24px',
                      padding: '16px',
                      backgroundColor: selectedConversation.rawInput ? '#f0fdf4' : '#fef2f2',
                      border: selectedConversation.rawInput ? '2px solid #86efac' : '2px solid #fca5a5',
                      borderRadius: '12px',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '12px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: selectedConversation.rawInput ? '#166534' : '#991b1b',
                        }}
                      >
                        <span style={{ fontSize: '18px' }}>{selectedConversation.rawInput ? '📝' : '⚠️'}</span>
                        <span>Raw Input {selectedConversation.rawInput ? '' : '（缺失）'}</span>
                      </div>
                      {editingRawInputId !== selectedConversation.id && (
                        <button
                          onClick={() => startEditingRawInput(selectedConversation.id, selectedConversation.rawInput)}
                          style={{
                            padding: '6px 12px',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            background: 'white',
                            color: 'var(--text)',
                            fontSize: '12px',
                            cursor: 'pointer',
                            fontWeight: '500',
                          }}
                        >
                          {selectedConversation.rawInput ? '✏️ 編輯' : '➕ 補充'}
                        </button>
                      )}
                    </div>

                    {editingRawInputId === selectedConversation.id ? (
                      <>
                        <textarea
                          value={editingRawInputValue}
                          onChange={(e) => setEditingRawInputValue(e.target.value)}
                          placeholder="貼上原始輸入內容..."
                          style={{
                            width: '100%',
                            minHeight: '200px',
                            padding: '12px',
                            border: '2px solid #3b82f6',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontFamily: 'monospace',
                            lineHeight: '1.5',
                            resize: 'vertical',
                            marginBottom: '12px',
                          }}
                          autoFocus
                        />
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => saveRawInput(selectedConversation.id)}
                            style={{
                              padding: '8px 16px',
                              border: 'none',
                              borderRadius: '6px',
                              background: '#10b981',
                              color: 'white',
                              fontSize: '13px',
                              cursor: 'pointer',
                              fontWeight: '500',
                            }}
                          >
                            ✓ 儲存
                          </button>
                          <button
                            onClick={cancelEditingRawInput}
                            style={{
                              padding: '8px 16px',
                              border: '1px solid var(--border)',
                              borderRadius: '6px',
                              background: 'white',
                              color: 'var(--text)',
                              fontSize: '13px',
                              cursor: 'pointer',
                            }}
                          >
                            ✕ 取消
                          </button>
                        </div>
                      </>
                    ) : (
                      <div
                        style={{
                          fontSize: '13px',
                          lineHeight: '1.6',
                          color: selectedConversation.rawInput ? '#15803d' : '#991b1b',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          fontFamily: 'monospace',
                          maxHeight: '200px',
                          overflowY: 'auto',
                          padding: '8px',
                          backgroundColor: 'rgba(255, 255, 255, 0.5)',
                          borderRadius: '6px',
                        }}
                      >
                        {selectedConversation.rawInput ||
                          '此記錄缺少 raw input，無法使用重新解析功能。請點擊「補充」按鈕新增。'}
                      </div>
                    )}
                  </div>
                </div>

                {/* JSON 檢視 */}
                <div
                  style={{
                    marginTop: '32px',
                    maxWidth: '900px',
                    margin: '32px auto 0',
                    padding: '16px',
                    backgroundColor: 'var(--panel)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                  }}
                >
                  <details>
                    <summary
                      style={{
                        cursor: 'pointer',
                        fontWeight: '600',
                        color: 'var(--text)',
                        userSelect: 'none',
                        fontSize: '14px',
                      }}
                    >
                      🔍 檢視 JSON 格式
                    </summary>
                    <pre
                      style={{
                        marginTop: '12px',
                        padding: '12px',
                        backgroundColor: 'var(--bg)',
                        borderRadius: '6px',
                        fontSize: '12px',
                        overflow: 'auto',
                        maxHeight: '300px',
                        fontFamily: 'monospace',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {JSON.stringify(selectedConversation.messages, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>
            </>
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--muted)',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>💬</div>
                <div style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>請選擇一個對話</div>
                <div style={{ fontSize: '14px' }}>從左側列表中選擇對話記錄來查看詳細內容</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
