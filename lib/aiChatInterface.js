'use client';

import { getCoachAIParams, getStudentAIParams, getTeacherHintText } from './parser-01';

let aiChatInstance = null;

// 全域函數：切換區塊收合
function toggleSection(sectionId) {
  const section = document.getElementById(sectionId);
  section.classList.toggle('collapsed');
}

// 全域函數：切換 JSON 顯示收合
function toggleJsonDisplay() {
  const jsonContent = document.getElementById('jsonContent');
  const toggleBtn = document.querySelector('.json-toggle');

  if (jsonContent) {
    jsonContent.classList.toggle('collapsed');
    toggleBtn.textContent = jsonContent.classList.contains('collapsed') ? '展開' : '收合';
  }
}

class AIChatInterface {
  constructor() {
    this.currentBot = 'student'; // 預設使用學生bot
    this.workflowStep = 'idle'; // idle, scriptwriter, student, coach
    this.chatHistory = [];
    this.promptHistory = []; // 儲存 prompt 記錄

    // 章節目標資料
    // 1 釐清需求：讓學生更清楚自己想學什麼、為什麼要學
    // 2 程度分析：幫學生看清楚「現在的程度」與「想要達到的程度」
    // 3 示範教學：讓學生體驗「問題能被解決」
    // 4 學習計畫：讓學生知道可以怎麼開始、可能多久會有效果
    // 5 解決疑慮：幫助學生放心做下一步決定
    this.chapterGoals = {
      1: {
        title: '體驗課 part-1 釐清需求',
        goal: '讓學生更清楚自己想學什麼、為什麼要學',
      },
      2: {
        title: '體驗課 part-2 程度分析',
        goal: '幫學生看清楚「現在的程度」與「想要達到的程度」',
      },
      3: {
        title: '體驗課 part-3 示範教學',
        goal: '讓學生體驗「問題能被解決」',
      },
      4: {
        title: '體驗課 part-4 學習計畫',
        goal: '讓學生知道可以怎麼開始、可能多久會有效果',
      },
      5: {
        title: '體驗課 part-5 解決疑慮',
        goal: '幫助學生放心做下一步決定',
      },
    };

    this.initializeElements();
    this.adminMode = this.checkAdminMode();
    this.updateAdminControlsVisibility();
    this.initializeEventListeners();
    const hasInitialChapter = this.syncChapterSelection();
    this.loadSettings();
    this.updateStatus('disconnected');

    // 檢查是否有 scriptwriterResponse，有的話加入系統訊息並更新狀態
    this.checkAndLoadScriptwriterResponse();

    this.updateSummaryButton();
    this.updateSidebarInfo();

    if (!hasInitialChapter) {
      setTimeout(() => this.showChapterDialog(), 0);
    }
  }

  initializeElements() {
    this.elements = {
      // 左側面板 - 編劇 Bot
      scriptwriterStatus: document.getElementById('scriptwriterStatus'),
      scriptwriterTitle: document.getElementById('scriptwriterTitle'),
      premiseInfo: document.getElementById('premiseInfo'),

      // 左側面板 - 學生 Bot
      studentStatus: document.getElementById('studentStatus'),
      studentTitle: document.getElementById('studentTitle'),

      // 左側面板 - 教練 Bot
      coachStatus: document.getElementById('coachStatus'),
      coachTitle: document.getElementById('coachTitle'),

      // 控制按鈕
      createNewStudentBtn: document.getElementById('createNewStudentBtn'),
      clearChatBtn: document.getElementById('clearChatBtn'),
      summaryBtn: document.getElementById('summaryBtn'),
      summaryBtnText: document.getElementById('summaryBtnText'),
      promptHistoryBtn: document.getElementById('promptHistoryBtn'),
      exportConfigBtn: document.getElementById('exportConfigBtn'),
      importConfigBtn: document.getElementById('importConfigBtn'),
      importConfigFile: document.getElementById('importConfigFile'),
      importedFileName: document.getElementById('importedFileName'),
      fileNameText: document.getElementById('fileNameText'),

      // 中間聊天室
      chatMessages: document.getElementById('chatMessages'),
      chatInput: document.getElementById('chatInput'),
      sendBtn: document.getElementById('sendBtn'),
      statusDot: document.getElementById('statusDot'),
      statusText: document.getElementById('statusText'),

      // 右側側邊欄
      sidebarContent: document.getElementById('sidebarContent'),
      sidebarTitle: document.getElementById('sidebarTitle'),
      sidebarSubtitle: document.getElementById('sidebarSubtitle'),
      chapterSwitchBtn: document.getElementById('chapterSwitchBtn'),
      chapterDialogOverlay: document.getElementById('chapterDialogOverlay'),
      chapterDialogClose: document.getElementById('chapterDialogClose'),
      chapterOptions: document.getElementById('chapterOptions'),

      // Prompt History Dialog
      promptHistoryDialogOverlay: document.getElementById('promptHistoryDialogOverlay'),
      promptHistoryDialogClose: document.getElementById('promptHistoryDialogClose'),
      promptHistoryContent: document.getElementById('promptHistoryContent'),
    };
  }

  checkAdminMode() {
    if (typeof window === 'undefined') {
      return false;
    }

    const params = new URLSearchParams(window.location.search);
    return params.get('admin') === 'true';
  }

  updateAdminControlsVisibility() {
    const shouldShowAdminControls = this.adminMode;
    const adminControls = [
      this.elements.promptHistoryBtn,
      this.elements.exportConfigBtn,
      this.elements.importConfigBtn,
    ];

    adminControls.forEach((element) => {
      if (!element) {
        return;
      }

      element.hidden = !shouldShowAdminControls;
    });
  }

  initializeEventListeners() {
    // 儲存事件處理器的引用，以便稍後清理
    this.handlers = {
      sendMessage: () => this.sendMessage(),
      autoResize: () => this.autoResizeTextarea(),
      startScriptwriter: () => this.startScriptwriter(),
      generateSummary: () => this.generateSummary(),
      clearChat: () => this.clearChat(),
      showPromptHistory: () => this.showPromptHistoryDialog(),
      exportConfig: () => this.exportConfig(),
      importConfigClick: () => this.elements.importConfigFile.click(),
      importConfig: (e) => this.importConfig(e),
      showChapterDialog: () => this.showChapterDialog(),
      hideChapterDialog: () => this.hideChapterDialog(),
      hideChapterDialogOverlay: (e) => {
        if (e.target === this.elements.chapterDialogOverlay) {
          this.hideChapterDialog();
        }
      },
      hidePromptHistoryDialog: () => this.hidePromptHistoryDialog(),
      hidePromptHistoryDialogOverlay: (e) => {
        if (e.target === this.elements.promptHistoryDialogOverlay) {
          this.hidePromptHistoryDialog();
        }
      },
    };

    // 發送按鈕
    this.elements.sendBtn.addEventListener('click', this.handlers.sendMessage);

    // 自動調整輸入框高度
    this.elements.chatInput.addEventListener('input', this.handlers.autoResize);

    // 取得新的學生角色
    this.elements.createNewStudentBtn.addEventListener('click', this.handlers.startScriptwriter);

    // 總結按鈕
    this.elements.summaryBtn.addEventListener('click', this.handlers.generateSummary);

    // 清除對話
    this.elements.clearChatBtn.addEventListener('click', this.handlers.clearChat);

    // Prompt History 按鈕
    this.elements.promptHistoryBtn.addEventListener('click', this.handlers.showPromptHistory);

    // Export Config 按鈕
    this.elements.exportConfigBtn.addEventListener('click', this.handlers.exportConfig);

    // Import Config 按鈕
    this.elements.importConfigBtn.addEventListener('click', this.handlers.importConfigClick);
    this.elements.importConfigFile.addEventListener('change', this.handlers.importConfig);

    // 切換章節按鈕
    this.elements.chapterSwitchBtn.addEventListener('click', this.handlers.showChapterDialog);

    // 關閉章節選擇 dialog
    this.elements.chapterDialogClose.addEventListener('click', this.handlers.hideChapterDialog);
    this.elements.chapterDialogOverlay.addEventListener('click', this.handlers.hideChapterDialogOverlay);

    // 關閉 Prompt History dialog
    this.elements.promptHistoryDialogClose.addEventListener('click', this.handlers.hidePromptHistoryDialog);
    this.elements.promptHistoryDialogOverlay.addEventListener('click', this.handlers.hidePromptHistoryDialogOverlay);
  }

  cleanup() {
    // 移除所有事件監聽器
    if (this.handlers) {
      this.elements.sendBtn?.removeEventListener('click', this.handlers.sendMessage);
      this.elements.chatInput?.removeEventListener('input', this.handlers.autoResize);
      this.elements.createNewStudentBtn?.removeEventListener('click', this.handlers.startScriptwriter);
      this.elements.summaryBtn?.removeEventListener('click', this.handlers.generateSummary);
      this.elements.clearChatBtn?.removeEventListener('click', this.handlers.clearChat);
      this.elements.promptHistoryBtn?.removeEventListener('click', this.handlers.showPromptHistory);
      this.elements.exportConfigBtn?.removeEventListener('click', this.handlers.exportConfig);
      this.elements.importConfigBtn?.removeEventListener('click', this.handlers.importConfigClick);
      this.elements.importConfigFile?.removeEventListener('change', this.handlers.importConfig);
      this.elements.chapterSwitchBtn?.removeEventListener('click', this.handlers.showChapterDialog);
      this.elements.chapterDialogClose?.removeEventListener('click', this.handlers.hideChapterDialog);
      this.elements.chapterDialogOverlay?.removeEventListener('click', this.handlers.hideChapterDialogOverlay);
      this.elements.promptHistoryDialogClose?.removeEventListener('click', this.handlers.hidePromptHistoryDialog);
      this.elements.promptHistoryDialogOverlay?.removeEventListener(
        'click',
        this.handlers.hidePromptHistoryDialogOverlay
      );
    }
  }

  autoResizeTextarea() {
    const textarea = this.elements.chatInput;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }

  loadSettings() {
    if (localStorage.getItem('aiChatSettings')) {
      localStorage.removeItem('aiChatSettings');
    }
    this.updateBotTitles();
  }

  checkAndLoadScriptwriterResponse() {
    const scriptResponse = getScript();
    if (scriptResponse && Object.keys(scriptResponse).length > 0) {
      // 如果有 scriptwriterResponse，設定為 student 階段並加入系統訊息
      this.workflowStep = 'student';
      this.currentBot = 'student';

      // 更新 bot 狀態
      this.elements.studentStatus.textContent = '使用中';
      this.elements.studentStatus.className = 'bot-status active';
      this.elements.scriptwriterStatus.textContent = '已完成';
      this.elements.scriptwriterStatus.className = 'bot-status scriptwriter';

      // 將系統訊息顯示在右側側邊欄
      this.addSystemMessage(getTeacherHintText(scriptResponse, this.getChapterNumber()));
    }
  }

  updateBotTitles() {
    this.elements.scriptwriterTitle.textContent = '編劇 Bot';
    this.elements.studentTitle.textContent = '學生 Bot';
    this.elements.coachTitle.textContent = '教練 Bot';
  }

  syncChapterSelection() {
    const chapterFromQuery = this.getChapterFromQuery();
    if (chapterFromQuery !== null) {
      localStorage.setItem('selectedNumber', chapterFromQuery.toString());
      this.updateChapterQueryParam(chapterFromQuery);
      return true;
    }

    const storedRaw = localStorage.getItem('selectedNumber');
    if (storedRaw !== null) {
      const storedValue = Number.parseInt(storedRaw, 10);
      if (this.isValidChapterNumber(storedValue)) {
        this.updateChapterQueryParam(storedValue);
        return true;
      }
      localStorage.removeItem('selectedNumber');
    }

    this.clearChapterQueryParam();
    return false;
  }

  isValidChapterNumber(chapterNumber) {
    return Number.isInteger(chapterNumber) && this.chapterGoals[chapterNumber] !== undefined;
  }

  getChapterFromQuery() {
    if (typeof window === 'undefined') {
      return null;
    }

    const params = new URLSearchParams(window.location.search);
    const partParam = params.get('part');

    if (!partParam) {
      return null;
    }

    const parsed = parseInt(partParam, 10);
    return this.isValidChapterNumber(parsed) ? parsed : null;
  }

  updateChapterQueryParam(chapterNumber) {
    if (typeof window === 'undefined') {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set('part', chapterNumber.toString());
    const currentState = window.history.state ?? {};
    window.history.replaceState(currentState, '', `${url.pathname}${url.search}${url.hash}`);
  }

  clearChapterQueryParam() {
    if (typeof window === 'undefined') {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.delete('part');
    const currentState = window.history.state ?? {};
    window.history.replaceState(currentState, '', `${url.pathname}${url.search}${url.hash}`);
  }

  selectChapterNumber(chapterNumber) {
    if (!this.isValidChapterNumber(chapterNumber)) {
      return;
    }

    // 儲存選中的數值到 localStorage
    localStorage.setItem('selectedNumber', chapterNumber.toString());
    this.updateChapterQueryParam(chapterNumber);

    // 更新側邊欄資訊
    this.updateSidebarInfo();

    // 更新章節後重新載入系統提示
    this.reloadSystemPrompt();
  }

  getChapterNumber() {
    const chapterFromQuery = this.getChapterFromQuery();
    if (chapterFromQuery !== null) {
      return chapterFromQuery;
    }

    const storedValue = parseInt(localStorage.getItem('selectedNumber') || '1', 10);
    return this.isValidChapterNumber(storedValue) ? storedValue : 1;
  }

  updateSidebarInfo() {
    const chapterNumber = this.getChapterNumber();
    const chapterInfo = this.chapterGoals[chapterNumber];

    if (chapterInfo) {
      this.elements.sidebarTitle.textContent = chapterInfo.title;
      this.elements.sidebarSubtitle.textContent = `目標：${chapterInfo.goal}`;
    }
  }

  showChapterDialog() {
    // 生成章節選項
    this.generateChapterOptions();

    // 顯示 dialog
    this.elements.chapterDialogOverlay.classList.add('show');
  }

  hideChapterDialog() {
    this.elements.chapterDialogOverlay.classList.remove('show');
  }

  generateChapterOptions() {
    const currentChapter = this.getChapterNumber();

    // 清空現有選項
    this.elements.chapterOptions.innerHTML = '';

    // 生成章節選項
    Object.entries(this.chapterGoals).forEach(([chapterNumber, chapterInfo]) => {
      const optionDiv = document.createElement('div');
      optionDiv.className = `chapter-option ${parseInt(chapterNumber) === currentChapter ? 'selected' : ''}`;
      optionDiv.dataset.chapter = chapterNumber;

      optionDiv.innerHTML = `
        <div class="chapter-option-title">${chapterInfo.title}</div>
        <div class="chapter-option-goal">目標：${chapterInfo.goal}</div>
      `;

      // 點擊事件
      optionDiv.addEventListener('click', () => {
        this.selectChapterFromDialog(parseInt(chapterNumber));
      });

      this.elements.chapterOptions.appendChild(optionDiv);
    });
  }

  selectChapterFromDialog(chapterNumber) {
    // 直接調用 selectChapterNumber
    this.selectChapterNumber(chapterNumber);

    // 關閉 dialog
    this.hideChapterDialog();
  }

  reloadSystemPrompt() {
    // 檢查是否有 scriptwriterResponse
    const scriptResponse = getScript();
    if (scriptResponse && Object.keys(scriptResponse).length > 0) {
      // 清除現有聊天記錄
      this.clearChatMessages();

      // 重新設定工作流程狀態
      this.workflowStep = 'student';
      this.currentBot = 'student';

      // 更新 bot 狀態
      this.elements.studentStatus.textContent = '使用中';
      this.elements.studentStatus.className = 'bot-status active';
      this.elements.scriptwriterStatus.textContent = '已完成';
      this.elements.scriptwriterStatus.className = 'bot-status scriptwriter';

      // 將系統提示訊息顯示在右側側邊欄
      this.addSystemMessage(getTeacherHintText(scriptResponse, this.getChapterNumber()));

      // 更新總結按鈕狀態
      this.updateSummaryButton();
    }
  }

  clearChatMessages() {
    // 清除聊天記錄
    this.chatHistory = [];

    // 清除聊天顯示區域
    this.elements.chatMessages.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🤖</div>
        <div class="empty-state-text">開始與 AI 對話</div>
        <div class="empty-state-subtext">在下方輸入框中輸入您的訊息</div>
      </div>
    `;

    // 重置狀態
    this.updateStatus('disconnected');
  }

  getVariables(botType = 'student') {
    const selectedNumber = this.getChapterNumber();

    switch (botType) {
      case 'student':
        return {
          ...getStudentAIParams(getScript(), selectedNumber),
          native_language: 'zh-tw,繁體中文,中文',
          learning_language: '英文,美式英文',
        };
      case 'coach':
        return {
          ...getCoachAIParams(getScript(), selectedNumber),
          chat_history: this.getChatMessagesText(),
        };
      default:
        return {};
    }
  }

  // 啟動編劇 Bot
  async startScriptwriter() {
    this.workflowStep = 'scriptwriter';
    this.elements.createNewStudentBtn.disabled = true;
    this.elements.createNewStudentBtn.textContent = '載入學生角色中...';
    this.elements.scriptwriterStatus.textContent = '載入中';
    this.elements.scriptwriterStatus.className = 'bot-status scriptwriter';

    try {
      const response = await fetch('/api/student-roles/random');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData?.error?.message || response.statusText || '無法取得學生角色';
        throw new Error(message);
      }

      const data = await response.json();
      const role = data?.role;

      if (!role) {
        throw new Error('伺服器沒有提供學生角色資料');
      }

      let parsedRole;
      if (typeof role === 'string') {
        try {
          parsedRole = JSON.parse(role);
        } catch (error) {
          throw new Error(`伺服器角色資料解析失敗：${error instanceof Error ? error.message : '未知錯誤'}`);
        }
      } else {
        parsedRole = role;
      }

      const rawRole = typeof role === 'string' ? role : JSON.stringify(role);

      // 儲存到 localStorage
      window.scriptwriterResponse = parsedRole;
      localStorage.setItem('scriptwriterResponse', JSON.stringify(parsedRole));

      // 記錄快取取得的紀錄
      this.recordPromptHistory(
        'scriptwriter',
        '/api/student-roles/random',
        { cached: true },
        { ...data, role: rawRole }
      );

      // 處理 JSON 回應顯示
      this.displayJsonResponse(parsedRole);

      // 切換到學生 Bot
      this.workflowStep = 'student';
      this.currentBot = 'student';
      this.elements.studentStatus.textContent = '使用中';
      this.elements.studentStatus.className = 'bot-status active';
      this.elements.scriptwriterStatus.textContent = '已完成';
      this.elements.scriptwriterStatus.className = 'bot-status scriptwriter';

      this.addSystemMessage(getTeacherHintText(parsedRole, this.getChapterNumber()));
      this.updateSummaryButton();

      this.showSuccessMessage(`已載入新的學生角色`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知錯誤';
      this.showError(`載入學生角色失敗: ${message}`);
      this.elements.scriptwriterStatus.textContent = '錯誤';
      this.elements.scriptwriterStatus.className = 'bot-status';
    } finally {
      this.elements.createNewStudentBtn.disabled = false;
      this.elements.createNewStudentBtn.textContent = '🎲 新的學生角色';
    }
  }

  // 生成總結
  async generateSummary() {
    if (this.chatHistory.length === 0) {
      this.showError('沒有對話記錄可以總結');
      return;
    }

    this.elements.summaryBtn.disabled = true;
    this.elements.summaryBtnText.textContent = '總結中...';

    try {
      const summary = await this.callOpenAI('coach');

      this.addMessage(`📋 **教練總結**\n\n${summary}`, 'coach');
      this.elements.coachStatus.textContent = '已完成';
      this.elements.coachStatus.className = 'bot-status coach';
    } catch (error) {
      this.showError(`教練 Bot 錯誤: ${error.message}`);
    } finally {
      this.elements.summaryBtn.disabled = false;
      this.elements.summaryBtnText.textContent = '教練總結';
    }
  }

  // 更新總結按鈕狀態
  updateSummaryButton() {
    const hasChatHistory = this.chatHistory.length > 0;
    const canSummarize = hasChatHistory;

    this.elements.summaryBtn.disabled = !canSummarize;

    if (canSummarize) {
      this.elements.summaryBtnText.textContent = '教練總結';
    } else {
      this.elements.summaryBtnText.textContent = '教練總結';
    }
  }

  updateStatus(status) {
    const statusMap = {
      connected: { text: '已連接', class: 'connected' },
      disconnected: { text: '未連接', class: '' },
      thinking: { text: '思考中...', class: '' },
    };

    const statusInfo = statusMap[status] || statusMap['disconnected'];
    this.elements.statusText.textContent = statusInfo.text;
    this.elements.statusDot.className = `status-dot ${statusInfo.class}`;
  }

  addMessage(content, role = 'user') {
    // 移除空狀態
    const emptyState = this.elements.chatMessages.querySelector('.empty-state');
    if (emptyState) {
      emptyState.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    // 根據不同的 role 顯示不同的文字
    if (role === 'user') {
      avatar.textContent = '你';
    } else if (role === 'coach') {
      avatar.textContent = '教練';
    } else {
      avatar.textContent = '學生';
    }

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = content.replace(/\n/g, '<br>');

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    this.elements.chatMessages.appendChild(messageDiv);

    // 滾動到底部
    this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
  }

  addSystemMessage(content) {
    // 清除所有現有的系統訊息
    const existingMessages = this.elements.sidebarContent.querySelectorAll('.system-message');
    existingMessages.forEach((message) => message.remove());

    // 移除空狀態
    const emptySidebar = this.elements.sidebarContent.querySelector('.empty-sidebar');
    if (emptySidebar) {
      emptySidebar.remove();
    }

    const systemMessageDiv = document.createElement('div');
    systemMessageDiv.className = 'system-message';

    const headerDiv = document.createElement('div');
    headerDiv.className = 'system-message-header';

    const iconDiv = document.createElement('div');
    iconDiv.className = 'system-message-icon';
    iconDiv.textContent = 'S';

    const titleDiv = document.createElement('div');
    titleDiv.className = 'system-message-title';
    titleDiv.textContent = '系統提示';

    headerDiv.appendChild(iconDiv);
    headerDiv.appendChild(titleDiv);

    const contentDiv = document.createElement('div');
    contentDiv.className = 'system-message-content';
    contentDiv.textContent = content;

    systemMessageDiv.appendChild(headerDiv);
    systemMessageDiv.appendChild(contentDiv);
    this.elements.sidebarContent.appendChild(systemMessageDiv);

    // 滾動到底部
    this.elements.sidebarContent.scrollTop = this.elements.sidebarContent.scrollHeight;
  }

  addThinkingIndicator() {
    const thinkingDiv = document.createElement('div');
    thinkingDiv.className = 'message assistant';
    thinkingDiv.id = 'thinkingIndicator';

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = '學生';

    const thinkingContent = document.createElement('div');
    thinkingContent.className = 'thinking-indicator';
    thinkingContent.innerHTML = `
                <span>思考中</span>
                <div class="thinking-dots">
                    <div class="thinking-dot"></div>
                    <div class="thinking-dot"></div>
                    <div class="thinking-dot"></div>
                </div>
            `;

    thinkingDiv.appendChild(avatar);
    thinkingDiv.appendChild(thinkingContent);
    this.elements.chatMessages.appendChild(thinkingDiv);

    // 滾動到底部
    this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
  }

  removeThinkingIndicator() {
    const thinkingIndicator = document.getElementById('thinkingIndicator');
    if (thinkingIndicator) {
      thinkingIndicator.remove();
    }
  }

  async sendMessage() {
    const message = this.elements.chatInput.value.trim();
    if (!message) return;

    // 添加用戶訊息到聊天記錄
    this.chatHistory.push({ role: 'user', content: message });
    this.addMessage(message, 'user');
    this.elements.chatInput.value = '';
    this.autoResizeTextarea();

    // 顯示思考中狀態
    this.addThinkingIndicator();
    this.updateStatus('thinking');
    this.elements.sendBtn.disabled = true;

    try {
      const response = await this.callOpenAI(this.currentBot, this.getChatMessages());
      this.removeThinkingIndicator();

      // 添加 AI 回應到聊天記錄
      this.chatHistory.push({ role: 'assistant', content: response });
      this.addMessage(response, 'assistant');
      this.updateStatus('connected');

      // 更新總結按鈕狀態
      this.updateSummaryButton();
    } catch (error) {
      this.removeThinkingIndicator();
      this.addMessage(`錯誤: ${error.message}`, 'assistant');
      this.updateStatus('disconnected');
    } finally {
      this.elements.sendBtn.disabled = false;
    }
  }

  getChatMessages() {
    const messages = this.chatHistory
      .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
      .map((msg) => ({
        role: msg.role,
        content: [
          {
            type: msg.role === 'user' ? 'input_text' : 'output_text',
            text: msg.content,
          },
        ],
      }));

    console.log('messages: ', messages);

    return messages;
  }

  getChatMessagesText() {
    console.log('chatHistory: ', this.chatHistory);
    return this.chatHistory
      .filter((msg) => !msg.content[0]?.text?.includes('教練總結'))
      .map((msg) => `${msg.role === 'user' ? '老師' : '學生'}: ${msg.content}`)
      .join('\n');
  }

  async callOpenAI(botType = 'student', input) {
    const supportedBots = ['scriptwriter', 'student', 'coach'];
    if (!supportedBots.includes(botType)) {
      throw new Error('未知的 bot 類型');
    }

    const variables = this.getVariables(botType);

    if (!input) {
      input = [
        {
          role: 'user',
          content: [{ type: 'input_text', text: '' }],
        },
      ];
    } else if (typeof input === 'string') {
      input = [
        {
          role: 'user',
          content: [{ type: 'input_text', text: input }],
        },
      ];
    }

    const url = `/api/openai`;
    const body = {
      botType,
      variables,
      input,
    };

    // 記錄 API 呼叫（在發送前）
    this.recordPromptHistory(botType, url, body);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.error?.message || errorData.message || response.statusText;
      throw new Error(`API 錯誤: ${response.status} - ${message}`);
    }

    const data = await response.json();
    const result = data.result ?? '';

    // 更新最後一筆記錄的回應
    if (this.promptHistory.length > 0) {
      this.promptHistory[this.promptHistory.length - 1].response = data.raw || data;
    }

    return result;
  }

  displayJsonResponse(jsonResponse) {
    // 檢查 premiseInfo 元素是否存在
    if (!this.elements.premiseInfo) {
      console.warn('premiseInfo 元素不存在，跳過顯示 JSON 回應');
      return;
    }

    try {
      // 嘗試解析 JSON
      const jsonObj = typeof jsonResponse === 'string' ? JSON.parse(jsonResponse) : jsonResponse;
      const formattedJson = JSON.stringify(jsonObj, null, 2);

      // 更新前情提要顯示
      this.elements.premiseInfo.innerHTML = `
        <div class="json-display">
          <div class="json-header">
            <div class="json-title">編劇 Bot 回應 (JSON)</div>
            <button class="json-toggle" onclick="toggleJsonDisplay()">收合</button>
          </div>
          <div class="json-content" id="jsonContent">${formattedJson}</div>
        </div>
      `;
      this.elements.premiseInfo.className = 'premise-info has-content';
    } catch (error) {
      // 如果不是有效的 JSON，顯示原始回應
      this.elements.premiseInfo.textContent = jsonResponse;
      this.elements.premiseInfo.className = 'premise-info has-content';
    }
  }

  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;

    this.elements.chatMessages.appendChild(errorDiv);

    // 3秒後自動移除錯誤訊息
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.remove();
      }
    }, 3000);
  }

  clearChat() {
    this.elements.chatMessages.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🤖</div>
        <div class="empty-state-text">開始與 AI 對話</div>
        <div class="empty-state-subtext">在下方輸入框中輸入您的訊息</div>
      </div>
    `;
    this.updateStatus('disconnected');

    // 清除右側側邊欄
    this.elements.sidebarContent.innerHTML = `
      <div class="empty-sidebar">
        <div class="empty-sidebar-icon">📝</div>
        <div class="empty-sidebar-text">等待編劇產生系統訊息</div>
        <div class="empty-sidebar-subtext">點擊「🎲 新的學生角色」開始</div>
      </div>
    `;

    // 重置工作流程
    this.workflowStep = 'idle';
    this.currentBot = 'student';
    this.chatHistory = [];

    // 重置 bot 狀態
    this.elements.scriptwriterStatus.textContent = '待機中';
    this.elements.scriptwriterStatus.className = 'bot-status scriptwriter';
    this.elements.studentStatus.textContent = '使用中';
    this.elements.studentStatus.className = 'bot-status active';
    this.elements.coachStatus.textContent = '待機中';
    this.elements.coachStatus.className = 'bot-status coach';

    // 重置前情提要
    if (this.elements.premiseInfo) {
      this.elements.premiseInfo.textContent = '編劇回應';
      this.elements.premiseInfo.className = 'premise-info';
    }

    // 清除編劇回應的 localStorage
    localStorage.removeItem('scriptwriterResponse');
    window.scriptwriterResponse = null;

    // 重置按鈕
    this.elements.createNewStudentBtn.disabled = false;
    this.elements.createNewStudentBtn.textContent = '🎲 新的學生角色';
    this.updateSummaryButton();

    // 清除 prompt 歷史記錄
    this.promptHistory = [];
  }

  // 顯示 Prompt History 對話框
  showPromptHistoryDialog() {
    this.generatePromptHistoryContent();
    this.elements.promptHistoryDialogOverlay.classList.add('show');
  }

  // 隱藏 Prompt History 對話框
  hidePromptHistoryDialog() {
    this.elements.promptHistoryDialogOverlay.classList.remove('show');
  }

  // 生成 Prompt History 內容
  generatePromptHistoryContent() {
    if (this.promptHistory.length === 0) {
      this.elements.promptHistoryContent.innerHTML = `
        <div class="empty-sidebar">
          <div class="empty-sidebar-icon">📝</div>
          <div class="empty-sidebar-text">尚無 Prompt 記錄</div>
          <div class="empty-sidebar-subtext">開始使用 AI 功能後會顯示記錄</div>
        </div>
      `;
      return;
    }

    // 按時間從舊到新排序
    const sortedHistory = [...this.promptHistory].sort((a, b) => a.timestamp - b.timestamp);

    this.elements.promptHistoryContent.innerHTML = sortedHistory
      .map((record) => {
        const timeStr = new Date(record.timestamp).toLocaleString('zh-TW');
        const botName = this.getBotDisplayName(record.botType);

        return `
        <div class="prompt-history-item">
          <div class="prompt-history-header">
            <span class="prompt-history-time">${timeStr}</span>
            <span class="prompt-history-bot ${record.botType}">${botName}</span>
          </div>
          <div class="prompt-history-json">${this.formatPromptRecord(record)}</div>
        </div>
      `;
      })
      .join('');
  }

  // 獲取 Bot 顯示名稱
  getBotDisplayName(botType) {
    switch (botType) {
      case 'scriptwriter':
        return 'to: 編劇';
      case 'student':
        return 'to: 學生';
      case 'coach':
        return 'to: 教練';
      default:
        return botType;
    }
  }

  // 格式化 Prompt 記錄
  formatPromptRecord(record) {
    const formatted = {
      timestamp: new Date(record.timestamp).toLocaleString('zh-TW'),
      botType: record.botType,
      url: record.url,
      requestBody: record.requestBody,
      response: record.response || null,
    };

    return `// ${record.botType} Bot API 呼叫記錄\n// 時間: ${formatted.timestamp}\n${JSON.stringify(
      formatted,
      null,
      2
    )}`;
  }

  // 記錄 Prompt 歷史
  recordPromptHistory(botType, url, requestBody, response = null) {
    const record = {
      timestamp: Date.now(),
      botType: botType,
      url: url,
      requestBody: requestBody,
      response: response,
    };

    this.promptHistory.push(record);
  }

  // 匯出配置
  exportConfig() {
    const config = {
      chapter: this.getChapterNumber(),
    };

    // 建立下載連結
    const dataStr = JSON.stringify(config, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `ai-chat-config-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // 匯入配置
  importConfig(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target.result);

        // 載入章節設定（若提供）
        if (typeof config.chapter === 'number') {
          this.selectChapterNumber(config.chapter);
        }

        // 顯示檔案名稱
        this.elements.fileNameText.textContent = file.name;
        this.elements.importedFileName.style.display = 'block';

        // 顯示成功訊息
        this.showSuccessMessage('配置已成功匯入');
      } catch (error) {
        this.showError(`匯入配置失敗: ${error.message}`);
      }
    };

    reader.readAsText(file);

    // 重置 file input
    event.target.value = '';
  }

  // 顯示成功訊息
  showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'error-message';
    successDiv.style.background = 'rgba(34, 197, 94, 0.1)';
    successDiv.style.borderColor = 'rgba(34, 197, 94, 0.3)';
    successDiv.style.color = 'var(--accent)';
    successDiv.textContent = message;

    this.elements.chatMessages.appendChild(successDiv);

    // 3秒後自動移除訊息
    setTimeout(() => {
      if (successDiv.parentNode) {
        successDiv.remove();
      }
    }, 3000);
  }
}

// 頁面載入時立即從 localStorage 載入 scriptwriterResponse
function getScript() {
  const storedResponse = localStorage.getItem('scriptwriterResponse');
  if (storedResponse) {
    try {
      let response = JSON.parse(storedResponse);
      // 檢查如果還是字串就再次 parse
      if (typeof response === 'string') {
        response = JSON.parse(response);
      }
      return response;
    } catch (error) {
      console.error('載入 scriptwriterResponse 時發生錯誤:', error);
      return {};
    }
  }
}

export function initializeAIChatInterface() {
  if (typeof window === 'undefined') {
    return () => {};
  }

  window.toggleSection = toggleSection;
  window.toggleJsonDisplay = toggleJsonDisplay;

  if (typeof window.scriptwriterResponse === 'undefined') {
    window.scriptwriterResponse = null;
  }

  if (!aiChatInstance) {
    aiChatInstance = new AIChatInterface();
  }

  return () => {
    // 清理事件監聽器
    if (aiChatInstance) {
      aiChatInstance.cleanup();
    }
    aiChatInstance = null;
  };
}
