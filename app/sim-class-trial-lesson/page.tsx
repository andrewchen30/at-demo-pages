'use client';

import { FormEvent, Suspense, useCallback, useEffect, useState } from 'react';

import { useTrialLessonChat } from './aiChatInterface';

function SimClassTrialLessonContent() {
  const {
    adminMode,
    workflowStep,
    connectionStatus,
    chatHistory,
    promptHistoryView,
    scriptwriterResponse,
    systemMessage,
    systemUserBrief,
    systemDialog,
    systemChecklist,
    chapterNumber,
    isChapterDialogOpen,
    isPromptHistoryOpen,
    isJsonCollapsed,
    isThinking,
    isCreatingStudent,
    isSummarizing,
    flash,
    importedFileName,
    statusText,
    canSummarize,
    chapterInfo,
    chapterOptions,
    scriptwriterJson,
    chatInputRef,
    exportLinkRef,
    importInputRef,
    autoResizeTextarea,
    startScriptwriter,
    sendMessage,
    generateSummary,
    clearChat,
    exportConfig,
    importConfig,
    handleImportClick,
    openChapterDialog,
    closeChapterDialog,
    openPromptHistory,
    closePromptHistory,
    selectChapter,
    toggleJsonCollapsed,
    dismissFlash,
  } = useTrialLessonChat();

  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false);
  const [teacherName, setTeacherName] = useState('');
  const [nameInputValue, setNameInputValue] = useState('');
  const [chatLogId, setChatLogId] = useState('');
  const [chatLogCreated, setChatLogCreated] = useState(false);

  // 生成 UUID
  const generateUUID = (): string => {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  // 格式化日期時間為 YYYY-MM-DD-HH-mm-ss (使用 +8 時區)
  const formatDateTime = (date: Date): string => {
    // 轉換為 +8 時區（台北時區）
    const utcTime = date.getTime() + date.getTimezoneOffset() * 60000;
    const taipei = new Date(utcTime + 8 * 3600000);

    const year = taipei.getFullYear();
    const month = String(taipei.getMonth() + 1).padStart(2, '0');
    const day = String(taipei.getDate()).padStart(2, '0');
    const hours = String(taipei.getHours()).padStart(2, '0');
    const minutes = String(taipei.getMinutes()).padStart(2, '0');
    const seconds = String(taipei.getSeconds()).padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
  };

  // 格式化系統提示為純文字
  const formatSystemPrompt = useCallback((): string => {
    const sections: string[] = [];

    // 章節資訊
    if (chapterInfo) {
      sections.push(`=== 章節資訊 ===`);
      sections.push(`標題: ${chapterInfo.title}`);
      sections.push(`目標: ${chapterInfo.goal}`);
      sections.push('');
    }

    // 背景資訊
    if (systemUserBrief.length > 0) {
      sections.push(`=== 背景資訊 ===`);
      systemUserBrief.forEach((item) => {
        sections.push(item);
      });
      sections.push('');
    }

    // 對話內容（只在非第一章時顯示）
    if (chapterNumber !== 1 && systemDialog.length > 0) {
      sections.push(`=== 對話內容 ===`);
      systemDialog.forEach((item) => {
        sections.push(item);
      });
      sections.push('');
    }

    // 檢查重點
    if (systemChecklist.length > 0) {
      sections.push(`=== 檢查重點 ===`);
      systemChecklist.forEach((item) => {
        sections.push(item);
      });
    }

    return sections.join('\n');
  }, [chapterInfo, chapterNumber, systemUserBrief, systemDialog, systemChecklist]);

  // 格式化對話記錄
  const formatChatHistory = useCallback((history: typeof chatHistory): string => {
    const baseTime = new Date();
    const lines: string[] = [];

    history.forEach((msg, index) => {
      // 為每則訊息添加索引對應的秒數差異，讓時間戳記有所區別
      const msgTime = new Date(baseTime.getTime() + index * 1000);
      const timestamp = formatDateTime(msgTime);

      // 檢查是否為教練總結
      const isCoachFeedback = msg.content.includes('教練總結');

      // 決定角色名稱
      let role = msg.role === 'user' ? '老師' : '學生';
      if (isCoachFeedback) {
        role = '教練';
      }

      // 將訊息內容中的換行改為分號
      const content = msg.content.replace(/\n/g, ';');

      // 如果是教練總結，前後加上分隔線（獨立的行）
      if (isCoachFeedback) {
        lines.push('=====');
        lines.push(`[${role}] (${timestamp}): ${content}`);
        lines.push('=====');
      } else {
        lines.push(`[${role}] (${timestamp}): ${content}`);
      }
    });

    return lines.join('\n');
  }, []);

  // 建立 ChatLog 記錄
  const createChatLog = useCallback(
    async (teacherName: string, chatLogId: string) => {
      try {
        console.log('準備建立 ChatLog 記錄:', { teacherName, chatLogId });

        // 格式化對話記錄
        const formattedChatHistory = formatChatHistory(chatHistory);

        // 格式化系統提示
        const formattedSystemPrompt = formatSystemPrompt();

        // 輸出格式化後的內容供檢查
        console.log('=== 格式化的 chat_history ===');
        console.log(formattedChatHistory);
        console.log('=== 換行符號數量 ===', (formattedChatHistory.match(/\n/g) || []).length);

        const response = await fetch('/api/chat-logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_log_id: chatLogId,
            teacher_name: teacherName,
            chat_history: formattedChatHistory,
            chat_count: chatHistory.length,
            background_info: formattedSystemPrompt,
          }),
        });

        const result = await response.json();
        if (result.success) {
          console.log('成功建立 ChatLog 記錄:', result);
          setChatLogCreated(true);
        } else {
          console.error('建立 ChatLog 記錄失敗:', result.error);
        }
      } catch (error) {
        console.error('建立 ChatLog 記錄時發生錯誤:', error);
      }
    },
    [chatHistory, formatChatHistory, formatSystemPrompt]
  );

  // 更新 ChatLog 記錄
  const updateChatLog = useCallback(
    async (chatLogId: string) => {
      try {
        console.log('準備更新 ChatLog 記錄:', { chatLogId });

        // 格式化對話記錄
        const formattedChatHistory = formatChatHistory(chatHistory);

        // 格式化系統提示
        const formattedSystemPrompt = formatSystemPrompt();

        const response = await fetch('/api/chat-logs', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_log_id: chatLogId,
            chat_history: formattedChatHistory,
            chat_count: chatHistory.length,
            background_info: formattedSystemPrompt,
          }),
        });

        const result = await response.json();
        if (result.success) {
          console.log('成功更新 ChatLog 記錄:', result);
        } else {
          console.error('更新 ChatLog 記錄失敗:', result.error);
        }
      } catch (error) {
        console.error('更新 ChatLog 記錄時發生錯誤:', error);
      }
    },
    [chatHistory, formatChatHistory, formatSystemPrompt]
  );

  // 初始化：生成 chat_log_id 和檢查老師名字
  useEffect(() => {
    // 每次進入頁面時生成新的 chat_log_id
    const newChatLogId = generateUUID();
    setChatLogId(newChatLogId);
    console.log('生成新的 chat_log_id:', newChatLogId);

    // 檢查 localStorage 中是否已有老師名字
    const storedName = localStorage.getItem('teacherName');
    console.log('檢查 localStorage 中的老師名字:', storedName);
    if (storedName) {
      console.log('找到已儲存的名字，啟動編劇（等待第一次對話後才建立 ChatLog）');
      setTeacherName(storedName);
      // 啟動編劇
      startScriptwriter();
    } else {
      console.log('沒有找到名字，顯示輸入對話框');
      // 如果沒有名字，顯示對話框
      setIsNameDialogOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 監聽對話記錄，在第一次 AI 回覆後建立 ChatLog，之後持續更新
  useEffect(() => {
    // 如果尚未建立 ChatLog
    if (!chatLogCreated) {
      // 檢查條件：
      // 1. 有老師名字
      // 2. 有 chat_log_id
      // 3. chatHistory 至少有 2 則訊息（1 則用戶 + 1 則 AI）
      // 4. 最後一則訊息是 assistant（確保 AI 已完成回覆）
      if (
        teacherName &&
        chatLogId &&
        chatHistory.length >= 2 &&
        chatHistory[chatHistory.length - 1]?.role === 'assistant'
      ) {
        // 檢查是否有至少一對完整對話（user -> assistant）
        const hasUserMessage = chatHistory.some((msg) => msg.role === 'user');
        const hasAssistantMessage = chatHistory.some((msg) => msg.role === 'assistant');

        if (hasUserMessage && hasAssistantMessage) {
          console.log('偵測到第一次對話完成，建立 ChatLog 記錄');
          createChatLog(teacherName, chatLogId);
        }
      }
    } else {
      // 如果已建立 ChatLog，只在有新的 assistant 訊息時更新（避免過於頻繁）
      // 這樣可以確保每次對話完成（包括教練總結）都會更新記錄
      const lastMessage = chatHistory[chatHistory.length - 1];
      if (chatLogId && lastMessage && lastMessage.role === 'assistant') {
        console.log('對話已更新（AI/教練回覆完成），更新 ChatLog 記錄');
        updateChatLog(chatLogId);
      }
    }
  }, [chatHistory, chatLogCreated, teacherName, chatLogId, createChatLog, updateChatLog]);

  const handleNameSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = nameInputValue.trim();
    if (trimmedName) {
      // 儲存到 localStorage
      localStorage.setItem('teacherName', trimmedName);
      setTeacherName(trimmedName);
      setIsNameDialogOpen(false);
      // 啟動編劇（不立即建立 ChatLog，等第一次對話完成後）
      startScriptwriter();
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await sendMessage();
  };

  const handleKeyDown = async (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 檢查是否按下 Cmd+Enter (Mac) 或 Ctrl+Enter (Windows/Linux)
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      await sendMessage();
    }
  };

  return (
    <main className="ai-page">
      <div className="container">
        <div className="left-panel">
          {adminMode && (
            <>
              <div className="section">
                <div className="section-content">
                  <button
                    className="btn"
                    style={{ background: '#f1f5f9', borderColor: '#e2e8f0', color: '#64748b', marginBottom: '8px' }}
                    onClick={openPromptHistory}
                  >
                    📝 Prompt History
                  </button>
                  <button
                    className="btn"
                    style={{ background: '#f1f5f9', borderColor: '#e2e8f0', color: '#64748b', marginBottom: '8px' }}
                    onClick={exportConfig}
                  >
                    💾 Export Config
                  </button>
                  <a ref={exportLinkRef} style={{ display: 'none' }} />
                  <button
                    className="btn"
                    style={{ background: '#f1f5f9', borderColor: '#e2e8f0', color: '#64748b', marginBottom: '8px' }}
                    onClick={handleImportClick}
                  >
                    📂 Import Config
                  </button>
                  <input
                    ref={importInputRef}
                    type="file"
                    accept=".json"
                    style={{ display: 'none' }}
                    onChange={(event) => importConfig(event.target.files?.[0] ?? null)}
                  />
                  {importedFileName && (
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '8px' }}>
                      已匯入: <span>{importedFileName}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="workflow-status">
            {/* <div className="workflow-status-header">AI Bot 狀態</div> */}
            <div className="workflow-status-item">
              <span className="workflow-status-name">目前章節</span>
              <span className="bot-status scriptwriter">
                {chapterInfo ? `${chapterInfo.title}` : `章節 ${chapterNumber}`}
              </span>
            </div>
            <div className="workflow-status-item">
              <span className="workflow-status-name">聊天狀態</span>
              <span className={`bot-status ${connectionStatus === 'connected' ? 'active' : ''}`}>{statusText}</span>
            </div>
            <div className="workflow-status-item">
              <span className="workflow-status-name">教練 Bot</span>
              <span className="bot-status coach">{isSummarizing ? '產生中' : '待機中'}</span>
            </div>
          </div>

          <div className="section">
            <div className="section-content">
              <button
                className="btn"
                style={{
                  background: 'linear-gradient(180deg, #a855f7, #9333ea)',
                  marginBottom: '8px',
                }}
                onClick={startScriptwriter}
                disabled={isCreatingStudent || isSummarizing || isThinking}
              >
                {isCreatingStudent ? '載入學生角色中...' : '🎲 新的學生角色'}
              </button>
              <button
                className="btn"
                style={{ background: 'linear-gradient(180deg, #3b82f6, #2563eb)', marginBottom: '8px' }}
                onClick={generateSummary}
                disabled={!canSummarize || isCreatingStudent || isSummarizing || isThinking}
              >
                {isSummarizing ? '教練總結中...' : '教練總結'}
              </button>
              {/* <button className="btn secondary" onClick={clearChat} disabled={isCreatingStudent || isSummarizing || isThinking}>
                清除對話
              </button> */}
            </div>
          </div>
        </div>

        <div className="chat-container">
          <div className="chat-header">
            <div className="chat-title">AI 互動介面</div>
            <div className="chat-subtitle">
              <span className="status-indicator">
                <span className={`status-dot ${connectionStatus === 'connected' ? 'connected' : ''}`}></span>
                <span>{statusText}</span>
              </span>
            </div>
          </div>

          {flash && (
            <div
              role="alert"
              className={`flash-message ${flash.type}`}
              style={{ marginBottom: '12px', cursor: 'pointer' }}
              onClick={dismissFlash}
            >
              {flash.message}
            </div>
          )}

          <div className="chat-messages">
            {chatHistory.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🤖</div>
                <div className="empty-state-text">開始與 AI 對話</div>
                <div className="empty-state-subtext">在下方輸入框中輸入您的訊息</div>
              </div>
            ) : (
              chatHistory.map((message, index) => (
                <div key={index} className={`message ${message.role === 'user' ? 'user' : 'assistant'}`}>
                  <div className="message-avatar">{message.role === 'user' ? '你' : '學生'}</div>
                  <div className="message-content">
                    {message.content.split('\n').map((line, lineIndex) => (
                      <p key={lineIndex}>{line}</p>
                    ))}
                  </div>
                </div>
              ))
            )}
            {isThinking && (
              <div className="message assistant">
                <div className="message-avatar">學生</div>
                <div className="thinking-indicator">
                  <span>思考中</span>
                  <div className="thinking-dots">
                    <div className="thinking-dot" />
                    <div className="thinking-dot" />
                    <div className="thinking-dot" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <form className="chat-input-container" onSubmit={handleSubmit}>
            <div className="chat-input-wrapper">
              <textarea
                ref={chatInputRef}
                className="chat-input"
                placeholder="輸入您的訊息... (Cmd+Enter 或按發送按鈕送出)"
                rows={1}
                onInput={autoResizeTextarea}
                onKeyDown={handleKeyDown}
                disabled={isCreatingStudent || isSummarizing || isThinking || workflowStep === 'idle'}
              />
              <button
                className="send-btn"
                type="submit"
                disabled={isCreatingStudent || isSummarizing || isThinking || workflowStep === 'idle'}
              >
                {isThinking ? '發送中...' : '發送'}
              </button>
            </div>
          </form>
        </div>

        <div className="right-sidebar">
          <div className="sidebar-header">
            <div className="sidebar-header-content">
              <div className="sidebar-title">{chapterInfo?.title ?? `章節 ${chapterNumber}`}</div>
              <div className="sidebar-subtitle">目標：{chapterInfo?.goal ?? '尚未選擇章節'}</div>
            </div>
            {/* <button className="chapter-switch-btn" title="切換章節" onClick={openChapterDialog}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </button> */}
          </div>
          <div className="sidebar-content">
            {!systemMessage ? (
              <div className="empty-sidebar">
                <div className="empty-sidebar-icon">📝</div>
                <div className="empty-sidebar-text">等待編劇產生系統訊息</div>
                <div className="empty-sidebar-subtext">點擊「🎲 新的學生角色」開始</div>
              </div>
            ) : (
              <div className="system-message">
                <div className="system-message-header">
                  <div className="system-message-icon">S</div>
                  <div className="system-message-title">系統提示</div>
                </div>

                <div className="system-message-title">【背景資訊】</div>
                <div className="system-message-content">
                  {systemUserBrief.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </div>
                {chapterNumber !== 1 && (
                  <>
                    <div className="system-message-title">【對話內容】</div>
                    <div className="system-message-content">
                      {systemDialog.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </div>
                  </>
                )}
                <div className="system-message-title">【檢查重點】</div>
                <div className="system-message-content">
                  {systemChecklist.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </div>

                {/* <div className="system-message-content">{systemMessage}</div> */}
              </div>
            )}

            {/* {scriptwriterResponse && (
              <div className="json-section">
                <button className="json-toggle" type="button" onClick={toggleJsonCollapsed}>
                  {isJsonCollapsed ? '展開學生角色 JSON' : '收合學生角色 JSON'}
                </button>
                {!isJsonCollapsed && scriptwriterJson && (
                  <pre className="json-content">{scriptwriterJson}</pre>
                )}
              </div>
            )} */}
          </div>
        </div>

        {isChapterDialogOpen && (
          <div className="chapter-dialog-overlay" role="dialog" aria-modal="true" style={{ display: 'flex' }}>
            <div className="chapter-dialog">
              <div className="chapter-dialog-header">
                <h3 className="chapter-dialog-title">選擇章節</h3>
                <button className="chapter-dialog-close" onClick={closeChapterDialog} aria-label="關閉章節選擇">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              <div className="chapter-dialog-content">
                <div className="chapter-options">
                  {chapterOptions.map((option) => (
                    <button
                      key={option.number}
                      type="button"
                      className={`chapter-option ${option.selected ? 'selected' : ''}`}
                      onClick={() => selectChapter(option.number)}
                    >
                      <div className="chapter-option-title">{option.title}</div>
                      <div className="chapter-option-goal">目標：{option.goal}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {isPromptHistoryOpen && (
          <div className="chapter-dialog-overlay" role="dialog" aria-modal="true" style={{ display: 'flex' }}>
            <div className="chapter-dialog">
              <div className="chapter-dialog-header">
                <h3 className="chapter-dialog-title">Prompt History</h3>
                <button className="chapter-dialog-close" onClick={closePromptHistory} aria-label="關閉 Prompt History">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              <div className="chapter-dialog-content">
                {promptHistoryView.length === 0 ? (
                  <div className="empty-sidebar">
                    <div className="empty-sidebar-icon">📝</div>
                    <div className="empty-sidebar-text">尚無 Prompt 記錄</div>
                    <div className="empty-sidebar-subtext">開始使用 AI 功能後會顯示記錄</div>
                  </div>
                ) : (
                  <div className="prompt-history-content">
                    {promptHistoryView.map((record) => (
                      <div key={record.timestamp} className="prompt-history-item">
                        <div className="prompt-history-header">
                          <span className="prompt-history-time">{record.formattedTimestamp}</span>
                          <span className="prompt-history-bot">{record.displayBotType}</span>
                        </div>
                        <pre className="prompt-history-json">{record.formattedJson}</pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {isNameDialogOpen && (
          <div className="chapter-dialog-overlay" role="dialog" aria-modal="true" style={{ display: 'flex' }}>
            <div className="chapter-dialog">
              <div className="chapter-dialog-header">
                <h3 className="chapter-dialog-title">👋 歡迎使用 AI 教學工具</h3>
              </div>
              <div className="chapter-dialog-content">
                <form onSubmit={handleNameSubmit} style={{ padding: '20px' }}>
                  <div style={{ marginBottom: '20px' }}>
                    <label
                      htmlFor="teacher-name"
                      style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontWeight: '500',
                        fontSize: '14px',
                      }}
                    >
                      請輸入您的名字
                    </label>
                    <input
                      id="teacher-name"
                      type="text"
                      value={nameInputValue}
                      onChange={(e) => setNameInputValue(e.target.value)}
                      placeholder="請輸入名字"
                      required
                      autoFocus
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                      }}
                      onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
                      onBlur={(e) => (e.target.style.borderColor = '#e2e8f0')}
                    />
                    <p
                      style={{
                        marginTop: '8px',
                        fontSize: '12px',
                        color: '#64748b',
                        lineHeight: '1.5',
                      }}
                    >
                      💡 請輸入與 AmazingTalker 站上相同的名字
                    </p>
                  </div>
                  <button
                    type="submit"
                    className="btn"
                    style={{
                      width: '100%',
                      background: 'linear-gradient(180deg, #3b82f6, #2563eb)',
                      padding: '12px',
                      fontSize: '14px',
                      fontWeight: '500',
                    }}
                  >
                    確認
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function SimClassTrialLessonPage() {
  return (
    <Suspense
      fallback={
        <main className="ai-page">
          <div className="container">
            <div className="chat-container">
              <div className="chat-header">
                <div className="chat-title">載入中...</div>
              </div>
            </div>
          </div>
        </main>
      }
    >
      <SimClassTrialLessonContent />
    </Suspense>
  );
}
