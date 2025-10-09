'use client';

import { FormEvent, Suspense } from 'react';

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await sendMessage();
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
                placeholder="輸入您的訊息... (按發送按鈕送出)"
                rows={1}
                onInput={autoResizeTextarea}
                disabled={isCreatingStudent || isSummarizing || isThinking || workflowStep === 'idle'}
              />
              <button className="send-btn" type="submit" disabled={isCreatingStudent || isSummarizing || isThinking || workflowStep === 'idle'}>
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
                  {
                    systemUserBrief.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))
                  }
                </div>
                <div className="system-message-title">【對話內容】</div>
                <div className="system-message-content">
                  {
                    systemDialog.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))
                  }
                </div>
                <div className="system-message-title">【檢查重點】</div>
                <div className="system-message-content">
                  {
                    systemChecklist.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))
                  }
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
          <div className="chapter-dialog-overlay" role="dialog" aria-modal="true">
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
          <div className="chapter-dialog-overlay" role="dialog" aria-modal="true">
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
