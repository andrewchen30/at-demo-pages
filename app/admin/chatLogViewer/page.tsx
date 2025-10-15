'use client';

import { useState, useEffect } from 'react';

interface ChatMessage {
  timestamp: string;
  role: 'student' | 'teacher';
  content: string;
}

interface ChatLogRecord {
  id: string;
  teacher_name: string;
  chat_history: string;
  chat_count: number;
  background_info: string;
  created_at: string;
  updated_at: string;
  messages?: ChatMessage[]; // parsed messages
}

export default function ChatLogViewerPage() {
  const [chatLogs, setChatLogs] = useState<ChatLogRecord[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ChatLogRecord[]>([]);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [teacherNameFilter, setTeacherNameFilter] = useState<string>('');
  const [availableTeachers, setAvailableTeachers] = useState<string[]>([]);

  // 從 API 載入資料
  useEffect(() => {
    fetchChatLogs();
  }, []);

  const fetchChatLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/chat-logs');
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '獲取資料失敗');
      }

      // 解析所有 chat_history
      const logsWithParsedMessages = result.data.map((log: ChatLogRecord) => ({
        ...log,
        messages: parseChatHistory(log.chat_history),
      }));

      // 從新到舊排序 (by created_at)
      logsWithParsedMessages.sort(
        (a: ChatLogRecord, b: ChatLogRecord) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setChatLogs(logsWithParsedMessages);
      setFilteredLogs(logsWithParsedMessages);

      // 提取所有不重複的 teacher_name
      const teachers = Array.from(new Set(logsWithParsedMessages.map((log: ChatLogRecord) => log.teacher_name))).sort();
      setAvailableTeachers(teachers);

      // 自動選擇第一個
      if (logsWithParsedMessages.length > 0) {
        setSelectedLogId(logsWithParsedMessages[0].id);
      }
    } catch (err) {
      console.error('載入資料失敗:', err);
      setError(err instanceof Error ? err.message : '載入資料失敗');
    } finally {
      setLoading(false);
    }
  };

  // 解析 chat_history
  const parseChatHistory = (chatHistory: string): ChatMessage[] => {
    if (!chatHistory || chatHistory.trim() === '') {
      return [];
    }

    try {
      // 嘗試解析為 JSON
      const parsed = JSON.parse(chatHistory);
      if (Array.isArray(parsed)) {
        return parsed as ChatMessage[];
      }
    } catch {
      // 如果不是 JSON，嘗試文字解析
    }

    // 文字格式解析
    const lines = chatHistory.split('\n');
    const messages: ChatMessage[] = [];
    let currentMessage: ChatMessage | null = null;

    for (const line of lines) {
      // 格式 1: [角色] (時間): 內容
      // 例如: [老師] (2025/10/15 14:12:56): 嗨請問你想學什麼語言？
      const match1 = line.match(/^\[(學生|老師|student|teacher)\]\s*\(([^)]+)\)[:：]\s*(.*)$/i);

      // 格式 2: [時間] 角色: 內容
      // 例如: [2025-01-15 14:30:45] 學生: 內容
      const match2 = line.match(/^\[([^\]]+)\]\s*(學生|老師|student|teacher)[:：]\s*(.*)$/i);

      if (match1) {
        // 如果有進行中的訊息，先儲存
        if (currentMessage) {
          messages.push(currentMessage);
        }

        const roleText = match1[1].toLowerCase();
        const role = roleText === '學生' || roleText === 'student' ? 'student' : 'teacher';
        const timestamp = match1[2];
        const content = match1[3].trim();

        currentMessage = {
          timestamp,
          role,
          content,
        };
      } else if (match2) {
        // 如果有進行中的訊息，先儲存
        if (currentMessage) {
          messages.push(currentMessage);
        }

        const timestamp = match2[1];
        const roleText = match2[2].toLowerCase();
        const role = roleText === '學生' || roleText === 'student' ? 'student' : 'teacher';
        const content = match2[3].trim();

        currentMessage = {
          timestamp,
          role,
          content,
        };
      } else if (currentMessage && line.trim()) {
        // 如果當前有進行中的訊息，且這行不是空行，則累加到內容中
        currentMessage.content += '\n' + line.trim();
      }
    }

    // 不要忘記加入最後一個訊息
    if (currentMessage) {
      messages.push(currentMessage);
    }

    // 如果文字解析也失敗，嘗試簡單的角色匹配（無時間戳）
    if (messages.length === 0) {
      currentMessage = null;
      for (const line of lines) {
        const studentMatch = line.match(/^(學生|student)[:：]\s*(.*)$/i);
        const teacherMatch = line.match(/^(老師|teacher)[:：]\s*(.*)$/i);

        if (studentMatch) {
          if (currentMessage) {
            messages.push(currentMessage);
          }
          currentMessage = {
            timestamp: '',
            role: 'student',
            content: studentMatch[2].trim(),
          };
        } else if (teacherMatch) {
          if (currentMessage) {
            messages.push(currentMessage);
          }
          currentMessage = {
            timestamp: '',
            role: 'teacher',
            content: teacherMatch[2].trim(),
          };
        } else if (currentMessage && line.trim()) {
          currentMessage.content += '\n' + line.trim();
        }
      }

      if (currentMessage) {
        messages.push(currentMessage);
      }
    }

    return messages;
  };

  // Filter by teacher_name
  useEffect(() => {
    if (teacherNameFilter === '') {
      setFilteredLogs(chatLogs);
    } else {
      const filtered = chatLogs.filter((log) => log.teacher_name === teacherNameFilter);
      setFilteredLogs(filtered);
      // 如果當前選中的 log 不在過濾結果中，自動選擇第一個
      if (filtered.length > 0 && !filtered.find((log) => log.id === selectedLogId)) {
        setSelectedLogId(filtered[0].id);
      } else if (filtered.length === 0) {
        setSelectedLogId(null);
      }
    }
  }, [teacherNameFilter, chatLogs, selectedLogId]);

  const selectedLog = filteredLogs.find((log) => log.id === selectedLogId);

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
          <p style={{ fontSize: '13px', color: 'var(--muted)' }}>從 Google Spreadsheet 載入並檢視聊天記錄</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            className="btn"
            onClick={fetchChatLogs}
            disabled={loading}
            style={{
              background: loading ? '#e5e7eb' : '#6b7280',
              color: 'white',
              fontSize: '13px',
              padding: '8px 16px',
            }}
          >
            {loading ? '載入中...' : '🔄 重新載入'}
          </button>
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
      </div>

      {error && (
        <div
          style={{
            padding: '16px 24px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderBottom: '1px solid #fecaca',
            color: '#dc2626',
            fontSize: '14px',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* 三欄式佈局 */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* 左側邊欄 - 對話列表 */}
        <div
          style={{
            width: '320px',
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
                {filteredLogs.length}
              </span>
            </div>

            {/* Teacher Filter */}
            <div style={{ marginBottom: '8px' }}>
              <label
                htmlFor="teacher-filter"
                style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: 'var(--text)',
                }}
              >
                篩選教師
              </label>
              <select
                id="teacher-filter"
                value={teacherNameFilter}
                onChange={(e) => setTeacherNameFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg)',
                  color: 'var(--text)',
                  fontSize: '13px',
                }}
              >
                <option value="">全部教師</option>
                {availableTeachers.map((teacher) => (
                  <option key={teacher} value={teacher}>
                    {teacher}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: 'var(--muted)',
                }}
              >
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>⏳</div>
                <div style={{ fontSize: '14px', fontWeight: '500' }}>載入中...</div>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: 'var(--muted)',
                }}
              >
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>💬</div>
                <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>尚無對話記錄</div>
                <div style={{ fontSize: '12px' }}>
                  {teacherNameFilter ? '此教師沒有對話記錄' : '資料庫中沒有任何記錄'}
                </div>
              </div>
            ) : (
              <div>
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLogId(log.id)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                      backgroundColor: selectedLogId === log.id ? '#f0f9ff' : 'transparent',
                      borderLeft: selectedLogId === log.id ? '3px solid #3b82f6' : '3px solid transparent',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedLogId !== log.id) {
                        e.currentTarget.style.backgroundColor = 'var(--panel)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedLogId !== log.id) {
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
                      👨‍🏫 {log.teacher_name}
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
                      <div>{log.messages?.length || 0} 則訊息</div>
                      <div style={{ fontSize: '10px' }}>
                        {new Date(log.created_at).toLocaleString('zh-TW', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 中間主要內容 - 對話內容 */}
        <div
          style={{
            flex: 1,
            backgroundColor: 'var(--bg)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {selectedLog ? (
            <>
              {/* 對話標題列 */}
              <div
                style={{
                  padding: '16px 24px',
                  borderBottom: '1px solid var(--border)',
                  backgroundColor: 'var(--panel)',
                }}
              >
                <div style={{ fontWeight: '600', fontSize: '16px', color: 'var(--text)', marginBottom: '4px' }}>
                  👨‍🏫 教師：{selectedLog.teacher_name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  {selectedLog.messages?.length || 0} 則訊息 • 建立於{' '}
                  {new Date(selectedLog.created_at).toLocaleString('zh-TW')}
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
                  {selectedLog.messages && selectedLog.messages.length > 0 ? (
                    selectedLog.messages.map((message, index) => (
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
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              justifyContent: message.role === 'student' ? 'flex-start' : 'flex-end',
                            }}
                          >
                            <span>{message.role === 'student' ? '學生' : '老師'}</span>
                            {message.timestamp && (
                              <span style={{ fontSize: '10px', opacity: 0.7 }}>{message.timestamp}</span>
                            )}
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
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            {message.content}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '40px 20px',
                        color: 'var(--muted)',
                      }}
                    >
                      <div style={{ fontSize: '36px', marginBottom: '12px' }}>📭</div>
                      <div style={{ fontSize: '14px', fontWeight: '500' }}>此記錄沒有對話內容</div>
                    </div>
                  )}
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

        {/* 右側邊欄 - Background Info */}
        <div
          style={{
            width: '320px',
            borderLeft: '1px solid var(--border)',
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
            <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)' }}>背景資訊</h2>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {selectedLog ? (
              <>
                <div
                  style={{
                    marginBottom: '16px',
                    padding: '12px',
                    backgroundColor: 'var(--bg)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'var(--muted)',
                      marginBottom: '8px',
                    }}
                  >
                    對話 ID
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      color: 'var(--text)',
                      wordBreak: 'break-all',
                    }}
                  >
                    {selectedLog.id}
                  </div>
                </div>

                <div
                  style={{
                    marginBottom: '16px',
                    padding: '12px',
                    backgroundColor: 'var(--bg)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'var(--muted)',
                      marginBottom: '8px',
                    }}
                  >
                    Background Info
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      lineHeight: '1.6',
                      color: 'var(--text)',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      fontStyle: selectedLog.background_info ? 'normal' : 'italic',
                    }}
                  >
                    {selectedLog.background_info || '無背景資訊'}
                  </div>
                </div>

                <div
                  style={{
                    marginBottom: '16px',
                    padding: '12px',
                    backgroundColor: 'var(--bg)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'var(--muted)',
                      marginBottom: '8px',
                    }}
                  >
                    建立時間
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text)' }}>
                    {new Date(selectedLog.created_at).toLocaleString('zh-TW')}
                  </div>
                </div>

                <div
                  style={{
                    padding: '12px',
                    backgroundColor: 'var(--bg)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'var(--muted)',
                      marginBottom: '8px',
                    }}
                  >
                    更新時間
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text)' }}>
                    {new Date(selectedLog.updated_at).toLocaleString('zh-TW')}
                  </div>
                </div>
              </>
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: 'var(--muted)',
                }}
              >
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>📋</div>
                <div style={{ fontSize: '14px' }}>選擇對話以查看背景資訊</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
