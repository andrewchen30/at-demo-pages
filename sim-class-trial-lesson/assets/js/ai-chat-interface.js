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

// 全域物件儲存編劇 Bot 的回應
window.scriptwriterResponse = null;

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
        goal: '讓學生更清楚自己想學什麼、為什麼要學'
      },
      2: {
        title: '體驗課 part-2 程度分析',
        goal: '幫學生看清楚「現在的程度」與「想要達到的程度」'
      },
      3: {
        title: '體驗課 part-3 示範教學',
        goal: '讓學生體驗「問題能被解決」'
      },
      4: {
        title: '體驗課 part-4 學習計畫',
        goal: '讓學生知道可以怎麼開始、可能多久會有效果'
      },
      5: {
        title: '體驗課 part-5 解決疑慮',
        goal: '幫助學生放心做下一步決定'
      }
    };

    this.initializeElements();
    this.initializeEventListeners();
    this.loadSettings();
    this.updateStatus('disconnected');

    // 檢查是否有 scriptwriterResponse，有的話加入系統訊息並更新狀態
    this.checkAndLoadScriptwriterResponse();

    this.updateSummaryButton();
    this.updateSidebarInfo();
  }

  initializeElements() {
    this.elements = {

      // 左側面板 - 編劇 Bot
      scriptwriterBotId: document.getElementById('scriptwriterBotId'),
      scriptwriterVersion: document.getElementById('scriptwriterVersion'),
      scriptwriterStatus: document.getElementById('scriptwriterStatus'),
      scriptwriterTitle: document.getElementById('scriptwriterTitle'),
      premiseInfo: document.getElementById('premiseInfo'),

      // 左側面板 - 學生 Bot
      studentBotId: document.getElementById('studentBotId'),
      studentVersion: document.getElementById('studentVersion'),
      studentStatus: document.getElementById('studentStatus'),
      studentTitle: document.getElementById('studentTitle'),

      // 左側面板 - 教練 Bot
      coachBotId: document.getElementById('coachBotId'),
      coachVersion: document.getElementById('coachVersion'),
      coachStatus: document.getElementById('coachStatus'),
      coachTitle: document.getElementById('coachTitle'),

      // API 設定
      apiKey: document.getElementById('apiKey'),

      // 控制按鈕
      createNewStudentBtn: document.getElementById('createNewStudentBtn'),
      clearChatBtn: document.getElementById('clearChatBtn'),
      summaryBtn: document.getElementById('summaryBtn'),
      summaryBtnText: document.getElementById('summaryBtnText'),
      promptHistoryBtn: document.getElementById('promptHistoryBtn'),

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
      promptHistoryContent: document.getElementById('promptHistoryContent')
    };
  }

  initializeEventListeners() {
    // 發送按鈕
    this.elements.sendBtn.addEventListener('click', () => this.sendMessage());


    // 自動調整輸入框高度
    this.elements.chatInput.addEventListener('input', () => {
      this.autoResizeTextarea();
    });


    // 創建新的學生角色
    this.elements.createNewStudentBtn.addEventListener('click', () => this.startScriptwriter());

    // 總結按鈕
    this.elements.summaryBtn.addEventListener('click', () => this.generateSummary());

    // 清除對話
    this.elements.clearChatBtn.addEventListener('click', () => this.clearChat());

    // Prompt History 按鈕
    this.elements.promptHistoryBtn.addEventListener('click', () => this.showPromptHistoryDialog());


    // 設定變更時儲存
    const settingsElements = [
      this.elements.scriptwriterBotId, this.elements.scriptwriterVersion,
      this.elements.studentBotId, this.elements.studentVersion,
      this.elements.coachBotId, this.elements.coachVersion,
      this.elements.apiKey
    ];

    settingsElements.forEach(el => {
      if (el) {
        const eventType = el.tagName === 'SELECT' ? 'change' : 'input';
        el.addEventListener(eventType, () => {
          this.saveSettings();
          this.updateBotTitles();
        });
      }
    });


    // 切換章節按鈕
    this.elements.chapterSwitchBtn.addEventListener('click', () => this.showChapterDialog());

    // 關閉章節選擇 dialog
    this.elements.chapterDialogClose.addEventListener('click', () => this.hideChapterDialog());
    this.elements.chapterDialogOverlay.addEventListener('click', (e) => {
      if (e.target === this.elements.chapterDialogOverlay) {
        this.hideChapterDialog();
      }
    });

    // 關閉 Prompt History dialog
    this.elements.promptHistoryDialogClose.addEventListener('click', () => this.hidePromptHistoryDialog());
    this.elements.promptHistoryDialogOverlay.addEventListener('click', (e) => {
      if (e.target === this.elements.promptHistoryDialogOverlay) {
        this.hidePromptHistoryDialog();
      }
    });
  }

  autoResizeTextarea() {
    const textarea = this.elements.chatInput;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }

  loadSettings() {
    const settings = this.getStoredSettings();

    // 編劇 Bot 設定
    this.elements.scriptwriterBotId.value = settings.scriptwriterBotId || '';
    this.elements.scriptwriterVersion.value = settings.scriptwriterVersion || '';

    // 學生 Bot 設定
    this.elements.studentBotId.value = settings.studentBotId || '';
    this.elements.studentVersion.value = settings.studentVersion || '';

    // 教練 Bot 設定
    this.elements.coachBotId.value = settings.coachBotId || '';
    this.elements.coachVersion.value = settings.coachVersion || '';

    // API 設定
    this.elements.apiKey.value = settings.apiKey || '';


    // 更新所有 Bot 標題顯示版本
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
    // 更新編劇 Bot 標題
    const scriptwriterVersion = this.elements.scriptwriterVersion.value;
    const scriptwriterBaseName = '編劇 Bot';
    this.elements.scriptwriterTitle.textContent = scriptwriterVersion
      ? `${scriptwriterBaseName} - v${scriptwriterVersion}`
      : scriptwriterBaseName;

    // 更新學生 Bot 標題
    const studentVersion = this.elements.studentVersion.value;
    const studentBaseName = '學生 Bot';
    this.elements.studentTitle.textContent = studentVersion
      ? `${studentBaseName} - v${studentVersion}`
      : studentBaseName;

    // 更新教練 Bot 標題
    const coachVersion = this.elements.coachVersion.value;
    const coachBaseName = '教練 Bot';
    this.elements.coachTitle.textContent = coachVersion
      ? `${coachBaseName} - v${coachVersion}`
      : coachBaseName;
  }

  selectChapterNumber(chapterNumber) {
    // 儲存選中的數值到 localStorage
    localStorage.setItem('selectedNumber', chapterNumber.toString());

    // 更新側邊欄資訊
    this.updateSidebarInfo();

    // 更新章節後重新載入系統提示
    this.reloadSystemPrompt();
  }

  getChapterNumber() {
    return parseInt(localStorage.getItem('selectedNumber') || '1');
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



  saveSettings() {
    const settings = {
      // 編劇 Bot 設定
      scriptwriterBotId: this.elements.scriptwriterBotId.value,
      scriptwriterVersion: this.elements.scriptwriterVersion.value,

      // 學生 Bot 設定
      studentBotId: this.elements.studentBotId.value,
      studentVersion: this.elements.studentVersion.value,

      // 教練 Bot 設定
      coachBotId: this.elements.coachBotId.value,
      coachVersion: this.elements.coachVersion.value,

      // API 設定
      apiKey: this.elements.apiKey.value
    };
    localStorage.setItem('aiChatSettings', JSON.stringify(settings));
  }

  getStoredSettings() {
    try {
      return JSON.parse(localStorage.getItem('aiChatSettings') || '{}');
    } catch {
      return {};
    }
  }

  getVariables(botType = 'student') {
    const selectedNumber = this.getChapterNumber();
    const variables = getAIParams(getScript(), selectedNumber)

    switch (botType) {
      case 'student':
        delete variables.check_list
        break;
      case 'coach':
        delete variables.dialog
        break;
      default:
        return {}
    }

    return variables;
  }

  // 啟動編劇 Bot
  async startScriptwriter() {
    if (!this.elements.scriptwriterBotId.value.trim()) {
      this.showError('請先設定編劇 Bot ID');
      return;
    }

    if (!this.elements.apiKey.value.trim()) {
      this.showError('請先設定 OpenAI API Key');
      return;
    }

    this.workflowStep = 'scriptwriter';
    this.elements.createNewStudentBtn.disabled = true;
    this.elements.createNewStudentBtn.textContent = '編劇 Bot 運行中...';
    this.elements.scriptwriterStatus.textContent = '運行中';
    this.elements.scriptwriterStatus.className = 'bot-status scriptwriter';

    try {
      const response = await this.callOpenAI('scriptwriter', 'Please provide json response with premise information');

      // 儲存到全域物件
      window.scriptwriterResponse = response;

      // 儲存到 localStorage
      localStorage.setItem('scriptwriterResponse', response);

      // 處理 JSON 回應顯示
      this.displayJsonResponse(response);

      // 切換到學生 Bot
      this.workflowStep = 'student';
      this.currentBot = 'student';
      this.elements.studentStatus.textContent = '使用中';
      this.elements.studentStatus.className = 'bot-status active';
      this.elements.scriptwriterStatus.textContent = '已完成';
      this.elements.scriptwriterStatus.className = 'bot-status scriptwriter';

      this.addSystemMessage(getTeacherHintText(getScript(), this.getChapterNumber()));
      this.updateSummaryButton();

    } catch (error) {
      this.showError(`編劇 Bot 錯誤: ${error.message}`);
      this.elements.scriptwriterStatus.textContent = '錯誤';
      this.elements.scriptwriterStatus.className = 'bot-status';
    } finally {
      this.elements.createNewStudentBtn.disabled = false;
      this.elements.createNewStudentBtn.textContent = '創建新的學生角色';
    }
  }

  // 生成總結
  async generateSummary() {
    if (!this.elements.coachBotId.value.trim()) {
      this.showError('請先設定教練 Bot ID');
      return;
    }

    if (this.chatHistory.length === 0) {
      this.showError('沒有對話記錄可以總結');
      return;
    }

    this.elements.summaryBtn.disabled = true;
    this.elements.summaryBtnText.textContent = '總結中...';

    try {
      const chatHistoryText = this.chatHistory.map(msg =>
        `${msg.role === 'user' ? '用戶' : 'AI'}: ${msg.content}`
      ).join('\n\n');

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
      'connected': { text: '已連接', class: 'connected' },
      'disconnected': { text: '未連接', class: '' },
      'thinking': { text: '思考中...', class: '' }
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
    avatar.textContent = role === 'user' ? 'U' : 'AI';

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
    existingMessages.forEach(message => message.remove());

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
    avatar.textContent = 'AI';

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

    // 檢查必要設定
    if (!this.elements.apiKey.value.trim()) {
      this.showError('請先設定 OpenAI API Key');
      return;
    }

    // 檢查當前 bot 的設定
    const currentBotId = this.getCurrentBotId();
    if (!currentBotId) {
      this.showError(`請先設定 ${this.getCurrentBotName()} Bot ID`);
      return;
    }

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
      const response = await this.callOpenAI(this.currentBot);
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

  getCurrentBotId() {
    switch (this.currentBot) {
      case 'scriptwriter':
        return this.elements.scriptwriterBotId.value.trim();
      case 'student':
        return this.elements.studentBotId.value.trim();
      case 'coach':
        return this.elements.coachBotId.value.trim();
      default:
        return null;
    }
  }

  getCurrentBotName() {
    switch (this.currentBot) {
      case 'scriptwriter':
        return '編劇';
      case 'student':
        return '學生';
      case 'coach':
        return '教練';
      default:
        return '未知';
    }
  }

  getChatMessages() {
    const messages = this.chatHistory
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .map(msg => ({
        role: msg.role,
        content: [
          {
            type: msg.role === 'user' ? 'input_text' : 'output_text',
            text: msg.content
          }
        ]
      }));

    console.log('messages: ', messages);

    return messages;
  }

  async callOpenAI(botType = 'student', input = this.getChatMessages()) {
    const variables = this.getVariables(botType);

    // 根據 bot 類型獲取對應的設定
    let botId, version;
    switch (botType) {
      case 'scriptwriter':
        botId = this.elements.scriptwriterBotId.value.trim();
        version = this.elements.scriptwriterVersion.value.trim();
        break;
      case 'student':
        botId = this.elements.studentBotId.value.trim();
        version = this.elements.studentVersion.value.trim();
        break;
      case 'coach':
        botId = this.elements.coachBotId.value.trim();
        version = this.elements.coachVersion.value.trim();
        break;
      default:
        throw new Error('未知的 bot 類型');
    }

    if (!input) {
      input = [
        {
          role: 'user',
          content: [
            { type: 'input_text', text: '' }
          ]
        }
      ]
    } else if (typeof input === 'string') {
      input = [
        {
          role: 'user',
          content: [
            { type: 'input_text', text: input }
          ]
        }
      ]
    }

    // 使用 OpenAI responses API 來呼叫特定的 Bot
    const url = `https://api.openai.com/v1/responses`;
    const body = {
      prompt: {
        id: botId,
        version: version,
        variables: variables
      },
      input
    };

    // 記錄 API 呼叫（在發送前）
    this.recordPromptHistory(botType, url, body);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.elements.apiKey.value.trim()}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API 錯誤: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    // responses API 的回應格式與 chat completions 不同
    const result = (data.output || []).find(item => item.status === 'completed')?.content[0]?.text;

    // 更新最後一筆記錄的回應
    if (this.promptHistory.length > 0) {
      this.promptHistory[this.promptHistory.length - 1].response = data;
    }

    return result;
  }

  displayJsonResponse(jsonResponse) {
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
        <div class="empty-sidebar-subtext">點擊「創建新的學生角色」開始</div>
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
    this.elements.premiseInfo.textContent = '編劇回應';
    this.elements.premiseInfo.className = 'premise-info';

    // 清除編劇回應的 localStorage
    localStorage.removeItem('scriptwriterResponse');
    window.scriptwriterResponse = null;

    // 重置按鈕
    this.elements.createNewStudentBtn.disabled = false;
    this.elements.createNewStudentBtn.textContent = '創建新的學生角色';
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

    this.elements.promptHistoryContent.innerHTML = sortedHistory.map(record => {
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
    }).join('');
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
      response: record.response || null
    };

    return `// ${record.botType} Bot API 呼叫記錄\n// 時間: ${formatted.timestamp}\n${JSON.stringify(formatted, null, 2)}`;
  }

  // 記錄 Prompt 歷史
  recordPromptHistory(botType, url, requestBody, response = null) {
    const record = {
      timestamp: Date.now(),
      botType: botType,
      url: url,
      requestBody: requestBody,
      response: response
    };

    this.promptHistory.push(record);
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
      return {}
    }
  }
}

// 初始化應用程式
document.addEventListener('DOMContentLoaded', () => {
  new AIChatInterface();
});
