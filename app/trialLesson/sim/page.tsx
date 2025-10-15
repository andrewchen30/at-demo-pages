'use client';

import { FormEvent, Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

import { useTrialLessonChat } from './aiChatInterface';

function SimClassTrialLessonContent() {
  const {
    adminMode,
    workflowStep,
    connectionStatus,
    chatHistory,
    preludeCount,
    scriptwriterResponse,
    systemMessage,
    systemUserBrief,
    systemDialog,
    systemChecklist,
    chapterNumber,
    isChapterDialogOpen,
    isJsonCollapsed,
    isThinking,
    isCreatingStudent,
    isSummarizing,
    flash,
    statusText,
    canSummarize,
    chapterInfo,
    chapterOptions,
    scriptwriterJson,
    chatInputRef,
    autoResizeTextarea,
    startScriptwriter,
    sendMessage,
    generateSummary,
    clearChat,
    openChapterDialog,
    closeChapterDialog,
    selectChapter,
    toggleJsonCollapsed,
    dismissFlash,
  } = useTrialLessonChat();

  const [teacherName, setTeacherName] = useState('');
  const [chatLogId, setChatLogId] = useState('');
  const [chatLogCreated, setChatLogCreated] = useState(false);
  const [judgeResult, setJudgeResult] = useState<string>('');
  const [coachResult, setCoachResult] = useState<string>('');
  const [isChecklistVisible, setIsChecklistVisible] = useState(true);
  const [isExperiencePopoutVisible, setIsExperiencePopoutVisible] = useState(true);

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

    // Judge Result（如果有的話）
    if (!!judgeResult) {
      sections.push('');
      sections.push('=== Judge Result ===');
      sections.push(judgeResult);
    }

    return sections.join('\n');
  }, [chapterInfo, chapterNumber, systemUserBrief, systemDialog, systemChecklist, judgeResult]);

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
        const formattedChatHistory = formatChatHistory(chatHistory);
        const formattedSystemPrompt = formatSystemPrompt();

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
    async (chatLogId: string, includeJudgeResult: boolean = false) => {
      try {
        const formattedChatHistory = formatChatHistory(chatHistory);
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
        if (!result.success) {
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
    } else {
      console.warn('沒有找到老師名字，請先在教戰手冊頁面設定');
    }

    // 確保能立即開始練習
    startScriptwriter();
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
        // 檢查是否為教練總結
        const isCoachFeedback = lastMessage.content.includes('教練總結');
        // 如果是教練總結，在 background_info 中包含 judge_result
        updateChatLog(chatLogId, isCoachFeedback);
      }
    }
  }, [chatHistory, chatLogCreated, teacherName, chatLogId, createChatLog, updateChatLog]);

  // 處理教練總結按鈕
  const handleGenerateSummary = useCallback(async () => {
    const result = await generateSummary();
    if (result) {
      setJudgeResult(result.judgeResult);
      setCoachResult(result.coachResult);
    }
  }, [generateSummary]);

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
          {/* 移除 Import/Export 區塊 */}

          {/* 回到選單按鈕 */}
          <Link href="/trialLesson/guideBook" className="back-to-menu-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>回到選單</span>
          </Link>

          {/* 檢查清單卡片 */}
          <div className="sidebar-card">
            <div className="sidebar-card-header">
              <div className="sidebar-card-header-content">
                <div className="sidebar-card-title">檢查清單</div>
                <div className="sidebar-card-subtitle">{chapterInfo?.title ?? `章節 ${chapterNumber}`}</div>
              </div>
              <button
                className="sidebar-card-toggle-btn"
                title={isChecklistVisible ? '隱藏檢查清單' : '顯示檢查清單'}
                onClick={() => setIsChecklistVisible(!isChecklistVisible)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {isChecklistVisible ? (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </>
                  ) : (
                    <>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </>
                  )}
                </svg>
              </button>
            </div>
            <div className="sidebar-card-content">
              {!systemMessage ? (
                <div className="empty-sidebar">
                  <div className="empty-sidebar-icon">📝</div>
                  <div className="empty-sidebar-text">等待編劇產生檢查清單</div>
                  <div className="empty-sidebar-subtext">點擊「更換」開始</div>
                </div>
              ) : isChecklistVisible ? (
                <div className="system-message">
                  <div className="system-message-content">
                    {systemChecklist.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="empty-sidebar">
                  <div className="empty-sidebar-icon">👁️</div>
                  <div className="empty-sidebar-text">檢查清單已隱藏</div>
                  <div className="empty-sidebar-subtext">點擊右上角按鈕顯示</div>
                </div>
              )}
            </div>
          </div>

          {/* 教練回饋卡片 */}
          <div className="sidebar-card">
            <div className="sidebar-card-header">
              <div className="sidebar-card-header-content">
                <div className="sidebar-card-title">教練回饋</div>
              </div>
              <button
                className="sidebar-card-action-btn"
                onClick={handleGenerateSummary}
                disabled={!canSummarize || isCreatingStudent || isSummarizing || isThinking}
                title="取得教練回饋"
              >
                {isSummarizing ? '產生中...' : '取得回饋'}
              </button>
            </div>
            <div className="sidebar-card-content">
              {!coachResult ? (
                <div className="empty-sidebar">
                  <div className="empty-sidebar-icon">💬</div>
                  <div className="empty-sidebar-text">尚無教練回饋</div>
                  <div className="empty-sidebar-subtext">點擊右上角按鈕取得回饋</div>
                </div>
              ) : (
                <div className="feedback-content">
                  {coachResult.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              )}
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
            <div role="alert" className={`flash-message ${flash.type}`} onClick={dismissFlash}>
              {flash.message}
            </div>
          )}

          <div className="chat-messages">
            {/* 學生資訊卡片 */}
            {systemUserBrief.length > 0 && (
              <div className="student-info-card">
                <div className="student-info-header">
                  <h3 className="student-info-title">學生資訊</h3>
                  <button
                    className="student-info-change-btn"
                    onClick={startScriptwriter}
                    disabled={isCreatingStudent || isSummarizing || isThinking}
                    title="更換學生角色"
                  >
                    更換
                  </button>
                </div>
                <div className="student-info-content">
                  {systemUserBrief.map((item, index) => (
                    <p key={index}>{item}</p>
                  ))}
                </div>
              </div>
            )}

            {chatHistory.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🤖</div>
                <div className="empty-state-text">開始與 AI 對話</div>
                <div className="empty-state-subtext">在下方輸入框中輸入您的訊息</div>
              </div>
            ) : (
              <>
                {/* 前情提要 */}
                {preludeCount > 0 &&
                  chatHistory.slice(0, preludeCount).map((message, index) => (
                    <div
                      key={`prelude-${index}`}
                      className={`message ${message.role === 'user' ? 'user' : 'assistant'}`}
                    >
                      <div className="message-avatar">{message.role === 'user' ? '你' : '學生'}</div>
                      <div className="message-content">
                        {message.content.split('\n').map((line, lineIndex) => (
                          <p key={lineIndex}>{line}</p>
                        ))}
                      </div>
                    </div>
                  ))}

                {/* 正式分隔線：前情提要與後續對話 */}
                {preludeCount > 0 && (
                  <div
                    className="chat-separator"
                    role="separator"
                    aria-label="前情提要分隔線"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      margin: '16px 0',
                      color: 'var(--muted)',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                    <div style={{ whiteSpace: 'nowrap' }}>前情提要結束，以下開始與學生互動</div>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                  </div>
                )}

                {/* 後續對話 */}
                {chatHistory.slice(preludeCount).map((message, index) => (
                  <div key={`chat-${index}`} className={`message ${message.role === 'user' ? 'user' : 'assistant'}`}>
                    <div className="message-avatar">{message.role === 'user' ? '你' : '學生'}</div>
                    <div className="message-content">
                      {message.content.split('\n').map((line, lineIndex) => (
                        <p key={lineIndex}>{line}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </>
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
      </div>
      {isExperiencePopoutVisible && (
        <div
          className="experience-popout-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="experience-popout-title"
        >
          <div className="experience-popout">
            <div className="experience-popout-icon" aria-hidden="true">
              ✨
            </div>
            <h2 id="experience-popout-title" className="experience-popout-title">
              體驗課開始！
            </h2>
            <p className="experience-popout-text">與模擬學生展開對話，體驗 AmazingTalker 體驗課的完整流程。</p>
            <button
              type="button"
              className="experience-popout-button"
              onClick={() => setIsExperiencePopoutVisible(false)}
            >
              開始模擬練習
            </button>
          </div>
        </div>
      )}
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
