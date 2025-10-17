'use client';

import { FormEvent, Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

import { useChapterNavigation } from './hooks/useChapterNavigation';
import { useChatState } from './hooks/useChatState';
import { useFlashMessage } from './hooks/useFlashMessage';
import { useScriptWriter } from './hooks/useScriptWriter';
import { useJudgeEvaluation } from './hooks/useJudgeEvaluation';
import { useChatActions } from './hooks/useChatActions';
import { GUIDE_CONTENT } from '@/app/trialLesson/guideBook/guideContent';
import {
  getMessagesForUIChat,
  getMessagesForUICoach,
  getMessagesForLog,
  generateMessageId,
} from './messageUtils/index';
import { checkAllJudgeSuccess, formatJudgeResultForDisplay, getJudgeStats, type JudgeResultData } from './judgeParser';

function SimClassTrialLessonContent() {
  // 1. 獨立的 hooks
  const { chapterNumber, chapterInfo } = useChapterNavigation();
  const {
    chatHistory,
    preludeCount,
    workflowStep,
    connectionStatus,
    setChatHistory,
    setPreludeCount,
    setWorkflowStep,
    setConnectionStatus,
    clearChatHistory,
  } = useChatState();
  const { flash, showFlash, dismissFlash } = useFlashMessage();

  // 2. 依賴其他 hooks 的 hooks
  const {
    scriptwriterResponse,
    isCreatingStudent,
    systemMessage,
    systemUserBrief,
    systemDialog,
    systemChecklist,
    startScriptwriter,
    clearScriptWriter,
  } = useScriptWriter({
    chapterNumber,
    setChatHistory,
    setPreludeCount,
    setWorkflowStep,
    showFlash,
  });

  const { isJudging, latestJudgeResult, callJudgeAPI, clearJudgeState } = useJudgeEvaluation({
    scriptwriterResponse,
    chapterNumber,
    chatHistory,
  });

  // 3. useChatActions 需要管理自己的 isThinking 和 isSummarizing 狀態
  const [isThinking, setIsThinking] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const { canSummarize, chatInputRef, autoResizeTextarea, sendMessage, generateSummary } = useChatActions({
    scriptwriterResponse,
    chapterNumber,
    chatHistory,
    workflowStep,
    isCreatingStudent,
    isSummarizing,
    isJudging,
    latestJudgeResult,
    setChatHistory,
    setConnectionStatus,
    setIsThinking,
    setIsSummarizing,
    callJudgeAPI,
    showFlash,
  });

  // 4. 組合多個 hooks 的清理函數
  const clearChat = useCallback(() => {
    clearChatHistory();
    clearScriptWriter();
    clearJudgeState();
  }, [clearChatHistory, clearScriptWriter, clearJudgeState]);

  const [teacherName, setTeacherName] = useState('');
  const [chatLogId, setChatLogId] = useState('');
  const [chatLogCreated, setChatLogCreated] = useState(false);
  const [judgeResult, setJudgeResult] = useState<JudgeResultData | null>(null);
  const [coachResult, setCoachResult] = useState<string>('');
  const [isExperiencePopoutVisible, setIsExperiencePopoutVisible] = useState(true);
  const [isCoachFeedbackPopoutVisible, setIsCoachFeedbackPopoutVisible] = useState(false);
  const [showFeedbackTooltip, setShowFeedbackTooltip] = useState(false);
  const [lastFeedbackMessageCount, setLastFeedbackMessageCount] = useState(0);
  const [isChangeStudentDialogOpen, setIsChangeStudentDialogOpen] = useState(false);

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
    if (judgeResult) {
      sections.push('');
      sections.push('=== 最終裁判結果 ===');
      sections.push(formatJudgeResultForDisplay(judgeResult));
    }

    return sections.join('\n');
  }, [chapterInfo, chapterNumber, systemUserBrief, systemDialog, systemChecklist, judgeResult]);

  // 建立 ChatLog 記錄
  const createChatLog = useCallback(
    async (teacherName: string, chatLogId: string) => {
      try {
        // 只記錄前情提要之後的訊息
        const messagesAfterPrelude = chatHistory.slice(preludeCount);
        const formattedChatHistory = getMessagesForLog(messagesAfterPrelude);
        const formattedSystemPrompt = formatSystemPrompt();

        console.log('建立 ChatLog - 對話記錄預覽 (前 200 字):', formattedChatHistory.substring(0, 200));

        // 計算記錄的訊息數量（排除前情提要）
        const loggedMessages = messagesAfterPrelude.filter(
          (msg) => msg.role === 'teacher' || msg.role === 'student' || msg.role === 'coach'
        );
        console.log('建立 ChatLog - 訊息總數:', loggedMessages.length);

        const response = await fetch('/api/chat-logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_log_id: chatLogId,
            teacher_name: teacherName,
            chat_history: formattedChatHistory,
            chat_count: loggedMessages.length,
            background_info: formattedSystemPrompt,
          }),
        });

        const result = await response.json();
        if (result.success) {
          console.log('成功建立 ChatLog 記錄');
          setChatLogCreated(true);
        } else {
          console.error('建立 ChatLog 記錄失敗:', result.error);
        }
      } catch (error) {
        console.error('建立 ChatLog 記錄時發生錯誤:', error);
      }
    },
    [chatHistory, preludeCount, formatSystemPrompt]
  );

  // 更新 ChatLog 記錄
  const updateChatLog = useCallback(
    async (chatLogId: string) => {
      try {
        // 只記錄前情提要之後的訊息
        const messagesAfterPrelude = chatHistory.slice(preludeCount);
        const formattedChatHistory = getMessagesForLog(messagesAfterPrelude);
        const formattedSystemPrompt = formatSystemPrompt();

        console.log('更新 ChatLog - 對話記錄預覽 (前 200 字):', formattedChatHistory.substring(0, 200));

        // 計算記錄的訊息數量（排除前情提要）
        const loggedMessages = messagesAfterPrelude.filter(
          (msg) => msg.role === 'teacher' || msg.role === 'student' || msg.role === 'coach'
        );
        console.log('更新 ChatLog - 訊息總數:', loggedMessages.length);

        const response = await fetch('/api/chat-logs', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_log_id: chatLogId,
            chat_history: formattedChatHistory,
            chat_count: loggedMessages.length,
            background_info: formattedSystemPrompt,
          }),
        });

        const result = await response.json();
        if (!result.success) {
          console.error('更新 ChatLog 記錄失敗:', result.error);
        } else {
          console.log('成功更新 ChatLog 記錄');
        }
      } catch (error) {
        console.error('更新 ChatLog 記錄時發生錯誤:', error);
      }
    },
    [chatHistory, preludeCount, formatSystemPrompt]
  );

  // 初始化：生成 chat_log_id 和檢查老師名字
  useEffect(() => {
    // 每次進入頁面時生成新的 chat_log_id
    const newChatLogId = generateMessageId();
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
      // 3. chatHistory 長度超過前情提要的數量（表示有新的對話）
      // 4. 最後一則訊息是 student（確保 AI 已完成回覆）
      if (
        teacherName &&
        chatLogId &&
        chatHistory.length > preludeCount &&
        chatHistory[chatHistory.length - 1]?.role === 'student'
      ) {
        // 確保前情提要之後至少有一對新的對話（teacher -> student）
        const newMessages = chatHistory.slice(preludeCount);
        const hasNewTeacherMessage = newMessages.some((msg) => msg.role === 'teacher');
        const hasNewStudentMessage = newMessages.some((msg) => msg.role === 'student');

        if (hasNewTeacherMessage && hasNewStudentMessage) {
          console.log('偵測到老師第一次新對話完成，建立 ChatLog 記錄');
          console.log('對話總數:', chatHistory.length, '前情提要數:', preludeCount);
          createChatLog(teacherName, chatLogId);
        }
      }
    } else {
      // 如果已建立 ChatLog，在有新的 student 或 coach 訊息時更新
      const lastMessage = chatHistory[chatHistory.length - 1];
      if (chatLogId && lastMessage && (lastMessage.role === 'student' || lastMessage.role === 'coach')) {
        console.log('更新 ChatLog 記錄，最新訊息角色:', lastMessage.role);
        console.log('對話總數:', chatHistory.length);
        updateChatLog(chatLogId);
      }
    }
  }, [chatHistory, chatLogCreated, teacherName, chatLogId, preludeCount, createChatLog, updateChatLog]);

  // 監聽老師發送的訊息數量，超過 3 句時顯示 tooltip
  useEffect(() => {
    // 計算老師發送的訊息數量（排除前情提要）
    const teacherMessages = chatHistory.slice(preludeCount).filter((msg) => msg.role === 'teacher');

    // 計算從上次取得回饋後的新訊息數
    const newMessagesCount = teacherMessages.length - lastFeedbackMessageCount;

    if (newMessagesCount >= 3 && !showFeedbackTooltip) {
      setShowFeedbackTooltip(true);
    }
  }, [chatHistory, preludeCount, lastFeedbackMessageCount, showFeedbackTooltip]);

  // 處理教練總結按鈕
  const handleGenerateSummary = useCallback(async () => {
    setShowFeedbackTooltip(false); // 隱藏 tooltip

    // 記錄當前老師訊息數量，作為下次計算的基準
    const teacherMessages = chatHistory.slice(preludeCount).filter((msg) => msg.role === 'teacher');
    setLastFeedbackMessageCount(teacherMessages.length);

    const result = await generateSummary();
    if (result) {
      setJudgeResult(result.judgeResult);
      setCoachResult(result.coachResult);
      setIsCoachFeedbackPopoutVisible(true);
    } else {
      // 如果沒有結果，不顯示 popout
      console.warn('無法取得教練回饋');
    }
  }, [generateSummary, chatHistory, preludeCount]);

  // 關閉回饋紀錄 popout
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
    if (GUIDE_CONTENT[nextChapter]) {
      // 導航到教戰手冊頁面，並設定下一個章節
      window.location.href = '/trialLesson/guideBook?chapter=' + nextChapter;
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

  const handleChangeStudentClick = () => {
    setIsChangeStudentDialogOpen(true);
  };

  const handleConfirmChangeStudent = () => {
    setIsChangeStudentDialogOpen(false);
    // 清除當前狀態並開始新的學生角色
    clearChat();
    startScriptwriter();
  };

  const handleCancelChangeStudent = () => {
    setIsChangeStudentDialogOpen(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-800 overflow-hidden">
      <div className="grid grid-cols-[440px_1fr] min-h-screen gap-px bg-slate-200 w-full max-w-none m-0 p-0">
        <div className="bg-slate-50 p-5 overflow-y-auto border-r border-slate-200 flex flex-col gap-4">
          {/* 移除 Import/Export 區塊 */}

          {/* 回到選單按鈕 */}
          <Link
            href={`/trialLesson/guideBook?chapter=${chapterNumber}`}
            className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm font-medium transition-all cursor-pointer hover:bg-slate-50 hover:border-slate-300"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>回到選單</span>
          </Link>

          {/* 重點提示卡片 */}
          <div className="bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden flex-none">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
              <div className="flex flex-col gap-1">
                <div className="text-base font-semibold text-slate-800">重點提示</div>
                <div className="text-xs text-slate-500">{chapterInfo?.title ?? `章節 ${chapterNumber}`}</div>
              </div>
            </div>
            <div className="overflow-y-auto p-4 max-h-[336px]">
              {!systemMessage ? (
                <div className="text-center text-slate-500 p-10">
                  <div className="text-3xl mb-3">📝</div>
                  <div className="text-[15px] font-semibold mb-1">等待編劇產生重點提示</div>
                  <div className="text-sm">點擊「更換」開始</div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="text-sm leading-6 text-slate-800 whitespace-pre-wrap px-4">
                    {systemChecklist.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 回饋紀錄卡片 */}
          <div className="bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden flex-1 min-h-0">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
              <div className="flex flex-col gap-1">
                <div className="text-base font-semibold text-slate-800">回饋紀錄</div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {!coachResult ? (
                <div className="text-center text-slate-500 p-10">
                  <div className="text-3xl mb-3">💬</div>
                  <div className="text-[15px] font-semibold mb-1">尚無回饋紀錄</div>
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

          {/* 換一個學生挑戰按鈕 */}
          <button
            type="button"
            className="w-full bg-white border border-slate-200 text-slate-800 font-semibold text-sm px-5 py-3 rounded-xl transition-all hover:bg-slate-50 hover:border-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleChangeStudentClick}
            disabled={isCreatingStudent || isSummarizing || isThinking}
          >
            換一個學生挑戰
          </button>
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
            {(systemUserBrief.length > 0 || isCreatingStudent) && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 mx-auto mb-5 max-w-[600px] w-full self-center">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
                  <h3 className="text-base font-semibold text-slate-800 m-0">學生背景資訊</h3>
                  <button
                    className="bg-slate-50 border border-slate-200 rounded-md px-3.5 py-1.5 text-[13px] font-medium text-slate-800 transition-all hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleChangeStudentClick}
                    disabled={isCreatingStudent || isSummarizing || isThinking}
                    title="更換學生角色"
                  >
                    換一個學生
                  </button>
                </div>
                {isCreatingStudent && systemUserBrief.length === 0 ? (
                  <div className="space-y-3 animate-pulse">
                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-4 bg-slate-200 rounded w-full"></div>
                    <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                    <div className="h-4 bg-slate-200 rounded w-4/5"></div>
                  </div>
                ) : (
                  <div className="text-sm leading-6 text-slate-800">
                    {systemUserBrief.map((item, index) => (
                      <p key={index}>{item}</p>
                    ))}
                  </div>
                )}
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
                        message.role === 'teacher' ? 'self-end flex-row-reverse' : 'self-start'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold bg-emerald-500 text-white flex-shrink-0">
                        {message.role === 'teacher' ? '你' : '生'}
                      </div>
                      <div
                        className={`rounded-xl border px-4 py-3 leading-6 ${
                          message.role === 'teacher'
                            ? 'bg-emerald-500 text-white border-emerald-300/30'
                            : 'bg-white text-slate-800 border-slate-200'
                        }`}
                      >
                        {message.text.split('\n').map((line, lineIndex) => (
                          <p key={lineIndex}>{line}</p>
                        ))}
                      </div>
                    </div>
                  ))}

                {/* 正式分隔線：前情提要與後續對話 */}
                {preludeCount > 0 && (
                  <div
                    className="flex items-center gap-3 my-4 text-slate-600 text-sm font-medium"
                    role="separator"
                    aria-label="前情提要分隔線"
                  >
                    <div className="flex-1 h-px bg-slate-200" />
                    <div className="whitespace-nowrap">前情提要結束，以下開始與學生互動</div>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>
                )}

                {/* 後續對話 */}
                {chatHistory
                  .slice(preludeCount)
                  .filter((message) => message.role !== 'coach')
                  .map((message, index) => (
                    <div
                      key={`chat-${index}`}
                      className={`flex gap-3 max-w-[80%] ${
                        message.role === 'teacher' ? 'self-end flex-row-reverse' : 'self-start'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                          message.role === 'teacher' ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white'
                        }`}
                      >
                        {message.role === 'teacher' ? '你' : '生'}
                      </div>
                      <div
                        className={`rounded-xl border px-4 py-3 leading-6 ${
                          message.role === 'teacher'
                            ? 'bg-emerald-500 text-white border-emerald-300/30'
                            : 'bg-white text-slate-800 border-slate-200'
                        }`}
                      >
                        {message.text.split('\n').map((line, lineIndex) => (
                          <p key={lineIndex}>{line}</p>
                        ))}
                      </div>
                    </div>
                  ))}
              </>
            )}
            {isThinking && (
              <div className="flex gap-3 max-w-[80%] self-start">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold bg-blue-500 text-white flex-shrink-0">
                  生
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

          {/* 永久提示訊息 */}
          <div className="px-5 py-3 bg-white border-t border-slate-200">
            <div className="bg-[#333] text-white px-5 py-3 text-sm font-medium rounded-xl">
              這是一個模擬體驗課，請將訊息內容視為課中對話過程，如果有需要分享影片或圖片，請以問字描述或以文字提供內容
            </div>
          </div>

          <form className="p-5 pt-0 bg-white" onSubmit={handleSubmit}>
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
                {isThinking ? '發送中...' : '輸入訊息'}
              </button>
              <div className="relative">
                <button
                  type="button"
                  className="bg-gradient-to-b from-blue-500 to-blue-600 text-white px-5 py-3 rounded-xl text-sm font-medium transition-all min-w-[100px] hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleGenerateSummary}
                  disabled={!canSummarize || isCreatingStudent || isSummarizing || isThinking}
                  onMouseEnter={() => setShowFeedbackTooltip(false)}
                >
                  {isSummarizing ? (isJudging ? '評估中...' : '分析中...') : '獲得建議'}
                </button>
                {showFeedbackTooltip && (
                  <div className="absolute bottom-full right-0 mb-3 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold rounded-lg whitespace-nowrap shadow-xl animate-[bounce_2s_ease-in-out_infinite] pointer-events-none z-10">
                    想知道表現得如何？點「獲得建議」看看教練建議！
                    <div className="absolute top-full right-8 -mt-px border-[6px] border-transparent border-t-amber-500"></div>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
      {isExperiencePopoutVisible && (
        <div className="fixed inset-0 flex items-center justify-center p-6 bg-slate-900/45 backdrop-blur-sm z-[1200]">
          <div className="relative w-[min(420px,100%)] bg-gradient-to-br from-white via-slate-50 to-blue-50 rounded-2xl p-10 text-center shadow-2xl [box-shadow:0_25px_50px_-12px_rgba(15,23,42,0.35),inset_0_0_0_1px_rgba(148,163,184,0.18)] overflow-hidden">
            <div className="absolute -left-20 -top-28 w-60 h-60 rounded-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.25),transparent_70%)] pointer-events-none" />
            <div className="absolute -right-24 -bottom-36 w-56 h-56 rounded-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.18),transparent_70%)] pointer-events-none" />
            {isCreatingStudent ? (
              <>
                <div className="relative w-16 h-16 mx-auto mb-5 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-3xl text-white shadow-[0_12px_20px_-8px_rgba(99,102,241,0.5)] animate-pulse">
                  <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
                <h2
                  id="experience-popout-title"
                  className="relative text-[26px] font-bold text-slate-800 tracking-wide mb-3"
                >
                  正在為您準備學生...
                </h2>
                <p className="relative text-[15px] text-slate-600 leading-7 mb-4">
                  我們正在為您準備一位學生，請稍候片刻
                </p>
                <div className="relative flex justify-center items-center gap-1.5 mb-7">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-[bounce_1s_infinite_0ms]" />
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-[bounce_1s_infinite_150ms]" />
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-[bounce_1s_infinite_300ms]" />
                </div>
              </>
            ) : (
              <>
                <div className="relative w-16 h-16 mx-auto mb-5 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-3xl text-white shadow-[0_12px_20px_-8px_rgba(99,102,241,0.5)]">
                  ✨
                </div>
                <h2
                  id="experience-popout-title"
                  className="relative text-[26px] font-bold text-slate-800 tracking-wide mb-3"
                >
                  體驗課即將開始！
                </h2>
                <p className="relative text-[15px] text-slate-600 leading-7 mb-4">
                  有一位學生已經準備好上課囉！練習結束後，別忘了點「獲得建議」，教練會建議你怎麼做得更好！
                </p>
                <p className="relative text-[13px] text-slate-500 leading-6 mb-7 italic">
                  *對話只能支援文字，請勿傳送圖片、連結或影片呦。
                </p>
                <button
                  type="button"
                  className="relative w-full rounded-full px-6 py-3.5 bg-gradient-to-br from-blue-500 to-blue-600 text-white text-[15px] font-semibold shadow-[0_18px_30px_-15px_rgba(37,99,235,0.75)] transition hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400 active:translate-y-0"
                  onClick={() => setIsExperiencePopoutVisible(false)}
                >
                  開始練習
                </button>
              </>
            )}
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
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    {checkAllJudgeSuccess(judgeResult)
                      ? '做得很好！這個主題已經完美掌握了'
                      : '你正在進步！來看看目前的表現吧'}
                  </h2>
                </div>
              </div>
              <button
                className="w-9 h-9 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-all flex items-center justify-center flex-shrink-0"
                onClick={closeCoachFeedbackPopout}
                aria-label="關閉回饋紀錄"
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
              <p className="text-sm text-slate-600 leading-6 mb-4 text-center">
                {checkAllJudgeSuccess(judgeResult)
                  ? '下一個主題還有全新的挑戰等著你，快去看看吧！'
                  : '接下來，你可以繼續和這位學生對話'}
              </p>
              {checkAllJudgeSuccess(judgeResult) ? (
                <button
                  type="button"
                  className="w-full rounded-xl px-6 py-4 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white text-base font-semibold shadow-lg transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0"
                  onClick={handleNextChapter}
                >
                  前往下一主題
                </button>
              ) : (
                <button
                  type="button"
                  className="w-full rounded-xl px-6 py-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white text-base font-semibold shadow-lg transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0"
                  onClick={handleContinuePractice}
                >
                  繼續對話
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {isChangeStudentDialogOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-[500px] w-[90%] overflow-hidden">
            <div className="p-5 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800 m-0">⚠️ 確認更換學生</h3>
            </div>
            <div className="p-5">
              <div className="mb-6">
                <p className="text-base text-slate-700 leading-7">
                  更換學生將會清除目前的對話紀錄，並開始一個全新的學生角色模擬。
                </p>
                <p className="text-base text-slate-700 leading-7 mt-3">確定要繼續嗎？</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  className="flex-1 bg-white border-2 border-slate-300 text-slate-700 font-semibold px-4 py-3 rounded-lg text-sm transition-all hover:bg-slate-50 hover:border-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
                  onClick={handleCancelChangeStudent}
                >
                  繼續談話
                </button>
                <button
                  type="button"
                  className="flex-1 bg-gradient-to-b from-purple-500 to-purple-600 text-white font-semibold px-4 py-3 rounded-lg text-sm transition-all hover:from-purple-600 hover:to-purple-700 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-400"
                  onClick={handleConfirmChangeStudent}
                >
                  更換學生
                </button>
              </div>
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
