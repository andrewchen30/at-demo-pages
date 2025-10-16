'use client';

import { FormEvent, Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

import { useTrialLessonChat } from './aiChatInterface';
import { CHAPTER_GOALS } from './constants';

function SimClassTrialLessonContent() {
  const {
    workflowStep,
    connectionStatus,
    chatHistory,
    preludeCount,
    systemMessage,
    systemUserBrief,
    systemDialog,
    systemChecklist,
    chapterNumber,
    isChapterDialogOpen,
    isThinking,
    isCreatingStudent,
    isSummarizing,
    flash,
    statusText,
    canSummarize,
    chapterInfo,
    chapterOptions,
    chatInputRef,
    autoResizeTextarea,
    startScriptwriter,
    sendMessage,
    generateSummary,
    clearChat,
    closeChapterDialog,
    selectChapter,
    dismissFlash,
  } = useTrialLessonChat();

  const [teacherName, setTeacherName] = useState('');
  const [chatLogId, setChatLogId] = useState('');
  const [chatLogCreated, setChatLogCreated] = useState(false);
  const [judgeResult, setJudgeResult] = useState<string>('');
  const [coachResult, setCoachResult] = useState<string>('');
  const [isChecklistVisible, setIsChecklistVisible] = useState(true);
  const [isExperiencePopoutVisible, setIsExperiencePopoutVisible] = useState(true);
  const [isCoachFeedbackPopoutVisible, setIsCoachFeedbackPopoutVisible] = useState(false);
  const [showFeedbackTooltip, setShowFeedbackTooltip] = useState(false);

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

  // 監聽老師發送的訊息數量，超過 3 句時顯示 tooltip
  useEffect(() => {
    // 計算老師發送的訊息數量（排除前情提要）
    const teacherMessages = chatHistory.slice(preludeCount).filter((msg) => msg.role === 'user');

    if (teacherMessages.length > 3 && !coachResult && !showFeedbackTooltip) {
      setShowFeedbackTooltip(true);
      // 5 秒後自動隱藏 tooltip
      const timer = setTimeout(() => {
        setShowFeedbackTooltip(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [chatHistory, preludeCount, coachResult, showFeedbackTooltip]);

  // 檢查 judgeResult 是否全部成功
  const checkAllJudgeSuccess = useCallback((judgeResultText: string): boolean => {
    if (!judgeResultText) return false;

    return !judgeResultText.includes('✘');
  }, []);

  // 處理教練總結按鈕
  const handleGenerateSummary = useCallback(async () => {
    setShowFeedbackTooltip(false); // 隱藏 tooltip
    const result = await generateSummary();
    if (result) {
      setJudgeResult(result.judgeResult);
      setCoachResult(result.coachResult);
      setIsCoachFeedbackPopoutVisible(true);
    }
  }, [generateSummary]);

  // 關閉教練回饋 popout
  const closeCoachFeedbackPopout = useCallback(() => {
    setIsCoachFeedbackPopoutVisible(false);
  }, []);

  // 繼續練習（關閉 popout）
  const handleContinuePractice = useCallback(() => {
    closeCoachFeedbackPopout();
  }, [closeCoachFeedbackPopout]);

  // 前往下一個主題
  const handleNextChapter = useCallback(() => {
    const nextChapter = chapterNumber + 1;
    if (CHAPTER_GOALS[nextChapter]) {
      // 導航到教戰手冊頁面，並設定下一個章節
      localStorage.setItem('selectedNumber', String(nextChapter));
      window.location.href = '/trialLesson/guideBook';
    } else {
      // 已經是最後一章，返回教戰手冊首頁
      window.location.href = '/trialLesson/guideBook';
    }
  }, [chapterNumber]);

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
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-800 overflow-hidden">
      <div className="grid grid-cols-[440px_1fr] min-h-screen gap-px bg-slate-200 w-full max-w-none m-0 p-0">
        <div className="bg-slate-50 p-5 overflow-y-auto border-r border-slate-200 flex flex-col gap-4">
          {/* 移除 Import/Export 區塊 */}

          {/* 回到選單按鈕 */}
          <Link
            href="/trialLesson/guideBook"
            className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm font-medium transition-all cursor-pointer hover:bg-slate-50 hover:border-slate-300"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>回到選單</span>
          </Link>

          {/* 檢查清單卡片 */}
          <div className="bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden flex-none">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
              <div className="flex flex-col gap-1">
                <div className="text-base font-semibold text-slate-800">檢查清單</div>
                <div className="text-xs text-slate-500">{chapterInfo?.title ?? `章節 ${chapterNumber}`}</div>
              </div>
              <button
                className="bg-white border border-slate-200 rounded-lg w-9 h-9 inline-flex items-center justify-center cursor-pointer text-slate-500 transition-all hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800 flex-shrink-0"
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
            <div className="overflow-y-auto p-4 max-h-[280px]">
              {!systemMessage ? (
                <div className="text-center text-slate-500 p-10">
                  <div className="text-3xl mb-3">📝</div>
                  <div className="text-[15px] font-semibold mb-1">等待編劇產生檢查清單</div>
                  <div className="text-sm">點擊「更換」開始</div>
                </div>
              ) : isChecklistVisible ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="text-sm leading-6 text-slate-800 whitespace-pre-wrap px-4">
                    {systemChecklist.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center text-slate-500 p-10">
                  <div className="text-3xl mb-3">👁️</div>
                  <div className="text-[15px] font-semibold mb-1">檢查清單已隱藏</div>
                  <div className="text-sm">點擊右上角按鈕顯示</div>
                </div>
              )}
            </div>
          </div>

          {/* 教練回饋卡片 */}
          <div className="bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden flex-1 min-h-0">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
              <div className="flex flex-col gap-1">
                <div className="text-base font-semibold text-slate-800">前次教練回饋</div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {!coachResult ? (
                <div className="text-center text-slate-500 p-10">
                  <div className="text-3xl mb-3">💬</div>
                  <div className="text-[15px] font-semibold mb-1">尚無教練回饋</div>
                  <div className="text-sm">在聊天室下方點擊「取得回饋」按鈕</div>
                </div>
              ) : (
                <div className="text-sm leading-[1.4] text-slate-800">
                  {coachResult.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col h-screen bg-slate-50">
          <div className="p-5 border-b border-slate-200 bg-white">
            <div className="text-lg font-semibold text-slate-800">{chapterInfo?.title ?? `章節 ${chapterNumber}`}</div>
            <div className="text-xs text-slate-500 mt-1">目標：{chapterInfo?.goal ?? ''}</div>
          </div>

          {flash && (
            <div
              role="alert"
              onClick={dismissFlash}
              className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] min-w-[320px] max-w-[500px] px-6 py-4 rounded-xl text-sm font-medium leading-6 shadow-xl backdrop-blur-md cursor-pointer transition-all animate-[slideUp_0.3s_ease-out] ${
                flash.type === 'error'
                  ? 'bg-gradient-to-br from-rose-500/95 to-rose-600/95 text-white border border-white/30'
                  : 'bg-gradient-to-br from-emerald-500/95 to-emerald-600/95 text-white border border-white/30'
              }`}
            >
              {flash.message}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
            {/* 學生資訊卡片 */}
            {systemUserBrief.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 mx-auto mb-5 max-w-[600px] w-full self-center">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
                  <h3 className="text-base font-semibold text-slate-800 m-0">學生資訊</h3>
                  <button
                    className="bg-slate-50 border border-slate-200 rounded-md px-3.5 py-1.5 text-[13px] font-medium text-slate-800 transition-all hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={startScriptwriter}
                    disabled={isCreatingStudent || isSummarizing || isThinking}
                    title="更換學生角色"
                  >
                    更換
                  </button>
                </div>
                <div className="text-sm leading-6 text-slate-800">
                  {systemUserBrief.map((item, index) => (
                    <p key={index}>{item}</p>
                  ))}
                </div>
              </div>
            )}

            {chatHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center">
                <div className="text-5xl mb-4">🤖</div>
                <div className="text-lg mb-2">開始與 AI 對話</div>
                <div className="text-sm">在下方輸入框中輸入您的訊息</div>
              </div>
            ) : (
              <>
                {/* 前情提要 */}
                {preludeCount > 0 &&
                  chatHistory.slice(0, preludeCount).map((message, index) => (
                    <div
                      key={`prelude-${index}`}
                      className={`flex gap-3 max-w-[80%] ${
                        message.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold bg-emerald-500 text-white">
                        {message.role === 'user' ? '你' : '學生'}
                      </div>
                      <div
                        className={`rounded-xl border px-4 py-3 leading-6 ${
                          message.role === 'user'
                            ? 'bg-emerald-500 text-white border-emerald-300/30'
                            : 'bg-white text-slate-800 border-slate-200'
                        }`}
                      >
                        {message.content.split('\n').map((line, lineIndex) => (
                          <p key={lineIndex}>{line}</p>
                        ))}
                      </div>
                    </div>
                  ))}

                {/* 正式分隔線：前情提要與後續對話 */}
                {preludeCount > 0 && (
                  <div
                    className="flex items-center gap-3 my-4 text-slate-500 text-xs"
                    role="separator"
                    aria-label="前情提要分隔線"
                  >
                    <div className="flex-1 h-px bg-slate-200" />
                    <div className="whitespace-nowrap">前情提要結束，以下開始與學生互動</div>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>
                )}

                {/* 後續對話 */}
                {chatHistory.slice(preludeCount).map((message, index) => (
                  <div
                    key={`chat-${index}`}
                    className={`flex gap-3 max-w-[80%] ${
                      message.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                        message.role === 'user' ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white'
                      }`}
                    >
                      {message.role === 'user' ? '你' : '學生'}
                    </div>
                    <div
                      className={`rounded-xl border px-4 py-3 leading-6 ${
                        message.role === 'user'
                          ? 'bg-emerald-500 text-white border-emerald-300/30'
                          : 'bg-white text-slate-800 border-slate-200'
                      }`}
                    >
                      {message.content.split('\n').map((line, lineIndex) => (
                        <p key={lineIndex}>{line}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
            {isThinking && (
              <div className="flex gap-3 max-w-[80%] self-start">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold bg-blue-500 text-white">
                  學生
                </div>
                <div className="flex items-center gap-2 text-slate-500 text-sm px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl max-w-[200px]">
                  <span>思考中</span>
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-[thinking_1.4s_infinite_ease-in-out_-0.32s]" />
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-[thinking_1.4s_infinite_ease-in-out_-0.16s]" />
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-[thinking_1.4s_infinite_ease-in-out]" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <form className="p-5 border-t border-slate-200 bg-white" onSubmit={handleSubmit}>
            <div className="flex gap-3 items-end">
              <textarea
                ref={chatInputRef}
                className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-[14px] outline-none resize-none min-h-[44px] max-h-[120px] leading-6 focus:border-blue-500 focus:[box-shadow:0_0_0_2px_rgba(59,130,246,0.2)]"
                placeholder="輸入您的訊息... (Cmd+Enter 或按發送按鈕送出)"
                rows={1}
                onInput={autoResizeTextarea}
                onKeyDown={handleKeyDown}
                disabled={isCreatingStudent || isSummarizing || isThinking || workflowStep === 'idle'}
              />
              <button
                className="bg-emerald-500 text-white px-5 py-3 rounded-xl text-sm font-medium transition-all min-w-[80px] hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed"
                type="submit"
                disabled={isCreatingStudent || isSummarizing || isThinking || workflowStep === 'idle'}
              >
                {isThinking ? '發送中...' : '發送'}
              </button>
              <div className="relative">
                <button
                  type="button"
                  className="bg-gradient-to-b from-blue-500 to-blue-600 text-white px-5 py-3 rounded-xl text-sm font-medium transition-all min-w-[100px] hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleGenerateSummary}
                  disabled={!canSummarize || isCreatingStudent || isSummarizing || isThinking}
                  onMouseEnter={() => setShowFeedbackTooltip(false)}
                >
                  {isSummarizing ? '產生中...' : '取得回饋'}
                </button>
                {showFeedbackTooltip && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap shadow-lg animate-[slideUp_0.3s_ease-out] pointer-events-none z-10">
                    點擊取得回饋
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-800"></div>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>

        {isChapterDialogOpen && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]"
            role="dialog"
            aria-modal="true"
          >
            <div className="bg-white rounded-xl shadow-2xl max-w-[500px] w-[90%] max-h-[80vh] overflow-hidden">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800 m-0">選擇章節</h3>
                <button
                  className="w-8 h-8 rounded-md hover:bg-slate-50 text-slate-500"
                  onClick={closeChapterDialog}
                  aria-label="關閉章節選擇"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              <div className="p-5">
                <div className="flex flex-col gap-3">
                  {chapterOptions.map((option) => (
                    <button
                      key={option.number}
                      type="button"
                      className={`p-4 border border-slate-200 rounded-lg cursor-pointer transition-all bg-white hover:border-blue-500 hover:bg-slate-50 ${
                        option.selected ? 'border-blue-500 bg-blue-50' : ''
                      }`}
                      onClick={() => selectChapter(option.number)}
                    >
                      <div className="text-base font-semibold text-slate-800 mb-1">{option.title}</div>
                      <div className="text-sm text-slate-500 leading-[1.4]">目標：{option.goal}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {isExperiencePopoutVisible && (
        <div className="fixed inset-0 flex items-center justify-center p-6 bg-slate-900/45 backdrop-blur-sm z-[1200]">
          <div className="relative w-[min(420px,100%)] bg-gradient-to-br from-white via-slate-50 to-blue-50 rounded-2xl p-10 text-center shadow-2xl [box-shadow:0_25px_50px_-12px_rgba(15,23,42,0.35),inset_0_0_0_1px_rgba(148,163,184,0.18)] overflow-hidden">
            <div className="absolute -left-20 -top-28 w-60 h-60 rounded-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.25),transparent_70%)] pointer-events-none" />
            <div className="absolute -right-24 -bottom-36 w-56 h-56 rounded-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.18),transparent_70%)] pointer-events-none" />
            <div className="relative w-16 h-16 mx-auto mb-5 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-3xl text-white shadow-[0_12px_20px_-8px_rgba(99,102,241,0.5)]">
              ✨
            </div>
            <h2
              id="experience-popout-title"
              className="relative text-[26px] font-bold text-slate-800 tracking-wide mb-3"
            >
              體驗課開始！
            </h2>
            <p className="relative text-[15px] text-slate-600 leading-7 mb-7">
              與模擬學生展開對話，體驗 AmazingTalker 體驗課的完整流程。
            </p>
            <button
              type="button"
              className="relative w-full rounded-full px-6 py-3.5 bg-gradient-to-br from-blue-500 to-blue-600 text-white text-[15px] font-semibold shadow-[0_18px_30px_-15px_rgba(37,99,235,0.75)] transition hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400 active:translate-y-0"
              onClick={() => setIsExperiencePopoutVisible(false)}
            >
              開始模擬練習
            </button>
          </div>
        </div>
      )}
      {isCoachFeedbackPopoutVisible && coachResult && (
        <div className="fixed inset-0 flex items-center justify-center p-6 bg-slate-900/50 backdrop-blur-sm z-[1300]">
          <div className="relative w-[min(700px,90%)] max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            {/* 標題列 */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-white flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xl shadow-md">
                  🎓
                </div>
                <h2 className="text-xl font-bold text-slate-800">教練回饋</h2>
              </div>
              <button
                className="w-9 h-9 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-all flex items-center justify-center"
                onClick={closeCoachFeedbackPopout}
                aria-label="關閉教練回饋"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* 內容區域 */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                <div className="text-sm leading-7 text-slate-800 whitespace-pre-wrap">
                  {coachResult.split('\n').map((line, i) => (
                    <p key={i} className="mb-2">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            {/* 按鈕區域 */}
            <div className="p-6 border-t border-slate-200 bg-slate-50 flex-shrink-0">
              {checkAllJudgeSuccess(judgeResult) ? (
                <button
                  type="button"
                  className="w-full rounded-xl px-6 py-4 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white text-base font-semibold shadow-lg transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0"
                  onClick={handleNextChapter}
                >
                  🎉 前往下一個主題
                </button>
              ) : (
                <button
                  type="button"
                  className="w-full rounded-xl px-6 py-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white text-base font-semibold shadow-lg transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0"
                  onClick={handleContinuePractice}
                >
                  💪 繼續練習
                </button>
              )}
            </div>
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
        <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
          <div className="grid grid-cols-[440px_1fr] min-h-screen gap-px bg-slate-200 w-full max-w-none m-0 p-0">
            <div className="flex flex-col h-screen bg-slate-50">
              <div className="p-5 border-b border-slate-200 bg-white">
                <div className="text-lg font-semibold text-slate-800">載入中...</div>
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
