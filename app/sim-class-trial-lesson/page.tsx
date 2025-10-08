'use client';

import { useEffect } from 'react';
import { initializeAIChatInterface } from '@/lib/aiChatInterface';

export default function SimClassTrialLessonPage() {
  useEffect(() => {
    const cleanup = initializeAIChatInterface();
    return () => {
      cleanup?.();
    };
  }, []);

  return (
    <main className="ai-page">
      <div className="container">
        {/* 左側面板 */}
        <div className="left-panel">
          <div className="section">
            <div className="section-content">
              <button
                id="promptHistoryBtn"
                className="btn"
                style={{ background: '#f1f5f9', borderColor: '#e2e8f0', color: '#64748b', marginBottom: '8px' }}
              >
                📝 Prompt History
              </button>
              <button
                id="exportConfigBtn"
                className="btn"
                style={{ background: '#f1f5f9', borderColor: '#e2e8f0', color: '#64748b', marginBottom: '8px' }}
              >
                💾 Export Config
              </button>
              <button
                id="importConfigBtn"
                className="btn"
                style={{ background: '#f1f5f9', borderColor: '#e2e8f0', color: '#64748b', marginBottom: '8px' }}
              >
                📂 Import Config
              </button>
              <input type="file" id="importConfigFile" accept=".json" style={{ display: 'none' }} />
              <div
                id="importedFileName"
                style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '8px', display: 'none' }}
              >
                已匯入: <span id="fileNameText"></span>
              </div>
            </div>
          </div>

          <div className="workflow-status">
            <div className="workflow-status-header">AI Bot 狀態</div>
            <div className="workflow-status-item">
              <span className="workflow-status-name" id="scriptwriterTitle">
                編劇 Bot
              </span>
              <span className="bot-status scriptwriter" id="scriptwriterStatus">
                待機中
              </span>
            </div>
            <div className="workflow-status-item">
              <span className="workflow-status-name" id="studentTitle">
                學生 Bot
              </span>
              <span className="bot-status active" id="studentStatus">
                使用中
              </span>
            </div>
            <div className="workflow-status-item">
              <span className="workflow-status-name" id="coachTitle">
                教練 Bot
              </span>
              <span className="bot-status coach" id="coachStatus">
                待機中
              </span>
            </div>
          </div>

          <input type="hidden" id="scriptwriterVersion" />
          <input type="hidden" id="studentVersion" />
          <input type="hidden" id="coachVersion" />

          <div className="section">
            <div className="section-content">
              <button
                id="createNewStudentBtn"
                className="btn"
                style={{
                  background: 'linear-gradient(180deg, #a855f7, #9333ea)',
                  marginBottom: '8px',
                }}
              >
                創建新的學生角色
              </button>
              <button
                id="summaryBtn"
                className="btn"
                style={{ background: 'linear-gradient(180deg, #3b82f6, #2563eb)', marginBottom: '8px' }}
                disabled
              >
                <span id="summaryBtnText">教練總結</span>
              </button>
              <button id="clearChatBtn" className="btn secondary">
                清除對話
              </button>
            </div>
          </div>
        </div>

        {/* 中間聊天室 */}
        <div className="chat-container">
          <div className="chat-header">
            <div className="chat-title">AI 互動介面</div>
            <div className="chat-subtitle">
              <span className="status-indicator">
                <span className="status-dot" id="statusDot"></span>
                <span id="statusText">未連接</span>
              </span>
            </div>
          </div>

          <div className="chat-messages" id="chatMessages">
            <div className="empty-state">
              <div className="empty-state-icon">🤖</div>
              <div className="empty-state-text">開始與 AI 對話</div>
              <div className="empty-state-subtext">在下方輸入框中輸入您的訊息</div>
            </div>
          </div>

          <div className="chat-input-container">
            <div className="chat-input-wrapper">
              <textarea
                id="chatInput"
                className="chat-input"
                placeholder="輸入您的訊息... (按發送按鈕送出)"
                rows={1}
              ></textarea>
              <button id="sendBtn" className="send-btn">
                發送
              </button>
            </div>
          </div>
        </div>

        {/* 右側側邊欄 */}
        <div className="right-sidebar">
          <div className="sidebar-header">
            <div className="sidebar-header-content">
              <div className="sidebar-title" id="sidebarTitle">
                模擬體驗課 part-1
              </div>
              <div className="sidebar-subtitle" id="sidebarSubtitle">
                目標：建立學生與老師的初步互動
              </div>
            </div>
            <button className="chapter-switch-btn" id="chapterSwitchBtn" title="切換章節">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </button>
          </div>
          <div className="sidebar-content" id="sidebarContent">
            <div className="empty-sidebar">
              <div className="empty-sidebar-icon">📝</div>
              <div className="empty-sidebar-text">等待編劇產生系統訊息</div>
              <div className="empty-sidebar-subtext">點擊「創建新的學生角色」開始</div>
            </div>
          </div>
        </div>

        {/* 選擇章節 Dialog */}
        <div className="chapter-dialog-overlay" id="chapterDialogOverlay">
          <div className="chapter-dialog">
            <div className="chapter-dialog-header">
              <h3 className="chapter-dialog-title">選擇章節</h3>
              <button className="chapter-dialog-close" id="chapterDialogClose">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="chapter-dialog-content">
              <div className="chapter-options" id="chapterOptions"></div>
            </div>
          </div>
        </div>

        {/* Prompt History Dialog */}
        <div className="chapter-dialog-overlay" id="promptHistoryDialogOverlay">
          <div className="chapter-dialog">
            <div className="chapter-dialog-header">
              <h3 className="chapter-dialog-title">Prompt History</h3>
              <button className="chapter-dialog-close" id="promptHistoryDialogClose">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="chapter-dialog-content">
              <div className="prompt-history-content" id="promptHistoryContent">
                <div className="empty-sidebar">
                  <div className="empty-sidebar-icon">📝</div>
                  <div className="empty-sidebar-text">尚無 Prompt 記錄</div>
                  <div className="empty-sidebar-subtext">開始使用 AI 功能後會顯示記錄</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
