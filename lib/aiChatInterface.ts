'use client';

import { getCoachAIParams, getStudentAIParams, getTeacherHintText } from '@/lib/utils/student-role-utils';
import type { DirectorInput } from '@/lib/types/student-role';

type BotType = 'director' | 'scriptwriter' | 'student' | 'coach' | 'teacher' | 'judge';
type WorkflowStep = 'idle' | 'scriptwriter' | 'student';
type MessageRole = 'user' | 'assistant';
type DisplayRole = MessageRole | 'coach';
type ConnectionStatus = 'connected' | 'disconnected' | 'thinking';

interface ChapterGoal {
  title: string;
  goal: string;
}

type ChapterGoalsMap = Record<number, ChapterGoal>;

interface OpenAIMessageContent {
  type: 'input_text' | 'output_text';
  text: string;
}

interface OpenAIChatMessage {
  role: MessageRole;
  content: OpenAIMessageContent[];
}

interface ChatHistoryEntry {
  role: MessageRole;
  content: string;
}

interface PromptHistoryRecord {
  timestamp: number;
  botType: BotType | string;
  url: string;
  requestBody: unknown;
  response: unknown;
}

interface ElementRefs {
  scriptwriterStatus: HTMLElement;
  scriptwriterTitle: HTMLElement;
  premiseInfo: HTMLElement;
  studentStatus: HTMLElement;
  studentTitle: HTMLElement;
  coachStatus: HTMLElement;
  coachTitle: HTMLElement;
  createNewStudentBtn: HTMLButtonElement;
  clearChatBtn: HTMLButtonElement;
  summaryBtn: HTMLButtonElement;
  summaryBtnText: HTMLElement;
  promptHistoryBtn: HTMLButtonElement;
  exportConfigBtn: HTMLButtonElement;
  importConfigBtn: HTMLButtonElement;
  importConfigFile: HTMLInputElement;
  importedFileName: HTMLElement;
  fileNameText: HTMLElement;
  chatMessages: HTMLElement;
  chatInput: HTMLTextAreaElement;
  sendBtn: HTMLButtonElement;
  statusDot: HTMLElement;
  statusText: HTMLElement;
  sidebarContent: HTMLElement;
  sidebarTitle: HTMLElement;
  sidebarSubtitle: HTMLElement;
  chapterSwitchBtn: HTMLButtonElement;
  chapterDialogOverlay: HTMLElement;
  chapterDialogClose: HTMLElement;
  chapterOptions: HTMLElement;
  promptHistoryDialogOverlay: HTMLElement;
  promptHistoryDialogClose: HTMLElement;
  promptHistoryContent: HTMLElement;
}

interface EventHandlers {
  sendMessage: () => void;
  autoResize: () => void;
  startScriptwriter: () => void;
  generateSummary: () => void;
  clearChat: () => void;
  showPromptHistory: () => void;
  exportConfig: () => void;
  importConfigClick: () => void;
  importConfig: (event: Event) => void;
  showChapterDialog: () => void;
  hideChapterDialog: () => void;
  hideChapterDialogOverlay: (event: Event) => void;
  hidePromptHistoryDialog: () => void;
  hidePromptHistoryDialogOverlay: (event: Event) => void;
}

declare global {
  interface Window {
    toggleSection?: (sectionId: string) => void;
    toggleJsonDisplay?: () => void;
    /**
     * 由編劇 API 回傳的最新角色資料，若尚未載入則為 null。
     */
    scriptwriterResponse?: DirectorInput | null;
  }
}

let aiChatInstance: AIChatInterface | null = null;

// 全域函數：切換區塊收合
function toggleSection(sectionId: string): void {
  const section = document.getElementById(sectionId);
  if (!section) {
    return;
  }
  section.classList.toggle('collapsed');
}

// 全域函數：切換 JSON 顯示收合
function toggleJsonDisplay(): void {
  const jsonContent = document.getElementById('jsonContent');
  const toggleBtn = document.querySelector<HTMLButtonElement>('.json-toggle');

  if (jsonContent && toggleBtn) {
    jsonContent.classList.toggle('collapsed');
    toggleBtn.textContent = jsonContent.classList.contains('collapsed') ? '展開' : '收合';
  }
}

class AIChatInterface {
  private currentBot: 'student' = 'student'; // 預設使用學生bot
  private workflowStep: WorkflowStep = 'idle'; // idle, scriptwriter, student, coach
  private chatHistory: ChatHistoryEntry[] = [];
  private promptHistory: PromptHistoryRecord[] = []; // 儲存 prompt 記錄
  private chapterGoals: ChapterGoalsMap;
  private elements!: ElementRefs;
  private handlers!: EventHandlers;
  private adminMode = false;

  constructor() {
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

  private initializeElements(): void {
    this.elements = {
      // 左側面板 - 編劇 Bot
      scriptwriterStatus: document.getElementById('scriptwriterStatus') as HTMLElement,
      scriptwriterTitle: document.getElementById('scriptwriterTitle') as HTMLElement,
      premiseInfo: document.getElementById('premiseInfo') as HTMLElement,

      // 左側面板 - 學生 Bot
      studentStatus: document.getElementById('studentStatus') as HTMLElement,
      studentTitle: document.getElementById('studentTitle') as HTMLElement,

      // 左側面板 - 教練 Bot
      coachStatus: document.getElementById('coachStatus') as HTMLElement,
      coachTitle: document.getElementById('coachTitle') as HTMLElement,

      // 控制按鈕
      createNewStudentBtn: document.getElementById('createNewStudentBtn') as HTMLButtonElement,
      clearChatBtn: document.getElementById('clearChatBtn') as HTMLButtonElement,
      summaryBtn: document.getElementById('summaryBtn') as HTMLButtonElement,
      summaryBtnText: document.getElementById('summaryBtnText') as HTMLElement,
      promptHistoryBtn: document.getElementById('promptHistoryBtn') as HTMLButtonElement,
      exportConfigBtn: document.getElementById('exportConfigBtn') as HTMLButtonElement,
      importConfigBtn: document.getElementById('importConfigBtn') as HTMLButtonElement,
      importConfigFile: document.getElementById('importConfigFile') as HTMLInputElement,
      importedFileName: document.getElementById('importedFileName') as HTMLElement,
      fileNameText: document.getElementById('fileNameText') as HTMLElement,

      // 中間聊天室
      chatMessages: document.getElementById('chatMessages') as HTMLElement,
      chatInput: document.getElementById('chatInput') as HTMLTextAreaElement,
      sendBtn: document.getElementById('sendBtn') as HTMLButtonElement,
      statusDot: document.getElementById('statusDot') as HTMLElement,
      statusText: document.getElementById('statusText') as HTMLElement,

      // 右側側邊欄
      sidebarContent: document.getElementById('sidebarContent') as HTMLElement,
      sidebarTitle: document.getElementById('sidebarTitle') as HTMLElement,
      sidebarSubtitle: document.getElementById('sidebarSubtitle') as HTMLElement,
      chapterSwitchBtn: document.getElementById('chapterSwitchBtn') as HTMLButtonElement,
      chapterDialogOverlay: document.getElementById('chapterDialogOverlay') as HTMLElement,
      chapterDialogClose: document.getElementById('chapterDialogClose') as HTMLElement,
      chapterOptions: document.getElementById('chapterOptions') as HTMLElement,

      // Prompt History Dialog
      promptHistoryDialogOverlay: document.getElementById('promptHistoryDialogOverlay') as HTMLElement,
      promptHistoryDialogClose: document.getElementById('promptHistoryDialogClose') as HTMLElement,
      promptHistoryContent: document.getElementById('promptHistoryContent') as HTMLElement,
    };
  }

  private checkAdminMode(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    const params = new URLSearchParams(window.location.search);
    return params.get('admin') === 'true';
  }

  private updateAdminControlsVisibility(): void {
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

  private initializeEventListeners(): void {
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
      importConfig: (e: Event) => this.importConfig(e),
      showChapterDialog: () => this.showChapterDialog(),
      hideChapterDialog: () => this.hideChapterDialog(),
      hideChapterDialogOverlay: (e: Event) => {
        if (e.target === this.elements.chapterDialogOverlay) {
          this.hideChapterDialog();
        }
      },
      hidePromptHistoryDialog: () => this.hidePromptHistoryDialog(),
      hidePromptHistoryDialogOverlay: (e: Event) => {
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

  cleanup(): void {
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

  autoResizeTextarea(): void {
    const textarea = this.elements.chatInput;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }

  loadSettings(): void {
    if (localStorage.getItem('aiChatSettings')) {
      localStorage.removeItem('aiChatSettings');
    }
    this.updateBotTitles();
  }

  checkAndLoadScriptwriterResponse(): void {
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

  private updateBotTitles(): void {
    this.elements.scriptwriterTitle.textContent = '編劇 Bot';
    this.elements.studentTitle.textContent = '學生 Bot';
    this.elements.coachTitle.textContent = '教練 Bot';
  }

  private syncChapterSelection(): boolean {
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

  private isValidChapterNumber(chapterNumber: number): boolean {
    return Number.isInteger(chapterNumber) && this.chapterGoals[chapterNumber] !== undefined;
  }

  private getChapterFromQuery(): number | null {
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

  private updateChapterQueryParam(chapterNumber: number): void {
    if (typeof window === 'undefined') {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set('part', chapterNumber.toString());
    const currentState = window.history.state ?? {};
    window.history.replaceState(currentState, '', `${url.pathname}${url.search}${url.hash}`);
  }

  private clearChapterQueryParam(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.delete('part');
    const currentState = window.history.state ?? {};
    window.history.replaceState(currentState, '', `${url.pathname}${url.search}${url.hash}`);
  }

  private selectChapterNumber(chapterNumber: number): void {
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

  private getChapterNumber(): number {
    const chapterFromQuery = this.getChapterFromQuery();
    if (chapterFromQuery !== null) {
      return chapterFromQuery;
    }

    const storedValue = parseInt(localStorage.getItem('selectedNumber') || '1', 10);
    return this.isValidChapterNumber(storedValue) ? storedValue : 1;
  }

  private updateSidebarInfo(): void {
    const chapterNumber = this.getChapterNumber();
    const chapterInfo = this.chapterGoals[chapterNumber];

    if (chapterInfo) {
      this.elements.sidebarTitle.textContent = chapterInfo.title;
      this.elements.sidebarSubtitle.textContent = `目標：${chapterInfo.goal}`;
    }
  }

  private showChapterDialog(): void {
    // 生成章節選項
    this.generateChapterOptions();

    // 顯示 dialog
    this.elements.chapterDialogOverlay.classList.add('show');
  }

  private hideChapterDialog(): void {
    this.elements.chapterDialogOverlay.classList.remove('show');
  }

  private generateChapterOptions(): void {
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

  private selectChapterFromDialog(chapterNumber: number): void {
    // 直接調用 selectChapterNumber
    this.selectChapterNumber(chapterNumber);

    // 關閉 dialog
    this.hideChapterDialog();
  }

  private reloadSystemPrompt(): void {
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

  private clearChatMessages(): void {
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

  private getVariables(botType: BotType = 'student'): Record<string, unknown> {
    const selectedNumber = this.getChapterNumber();
    const script: DirectorInput = getScript() ?? {};

    switch (botType) {
      case 'student':
        return {
          ...getStudentAIParams(script, selectedNumber),
          native_language: 'zh-tw,繁體中文,中文',
          learning_language: '英文,美式英文',
        };
      case 'coach':
        return {
          ...getCoachAIParams(script, selectedNumber),
          chat_history: this.getChatMessagesText(),
        };
      default:
        return {};
    }
  }

  // 啟動編劇 Bot
  async startScriptwriter(): Promise<void> {
    this.workflowStep = 'scriptwriter';
    this.elements.createNewStudentBtn.disabled = true;
    this.elements.createNewStudentBtn.textContent = '載入學生角色中...';
    this.elements.scriptwriterStatus.textContent = '載入中';
    this.elements.scriptwriterStatus.className = 'bot-status scriptwriter';

    try {
      const response = await fetch('/api/students/random');

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

      // 解析 role（可能是字串或物件）
      let parsedRole: DirectorInput;
      if (typeof role === 'string') {
        try {
          parsedRole = JSON.parse(role) as DirectorInput;
        } catch (error) {
          throw new Error(`伺服器角色資料解析失敗：${error instanceof Error ? error.message : '未知錯誤'}`);
        }
      } else {
        parsedRole = role as DirectorInput;
      }

      // 驗證資料完整性
      if (!parsedRole.persona || !parsedRole.scripts) {
        throw new Error('劇本資料不完整，缺少必要欄位');
      }

      // 儲存到 localStorage
      window.scriptwriterResponse = parsedRole;
      localStorage.setItem('scriptwriterResponse', JSON.stringify(parsedRole));

      // 記錄 API 呼叫記錄
      this.recordPromptHistory('scriptwriter', '/api/students/random', { method: 'GET' }, data);

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
  async generateSummary(): Promise<void> {
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '未知錯誤';
      this.showError(`教練 Bot 錯誤: ${message}`);
    } finally {
      this.elements.summaryBtn.disabled = false;
      this.elements.summaryBtnText.textContent = '教練總結';
    }
  }

  // 更新總結按鈕狀態
  private updateSummaryButton(): void {
    const hasChatHistory = this.chatHistory.length > 0;
    const canSummarize = hasChatHistory;

    this.elements.summaryBtn.disabled = !canSummarize;

    if (canSummarize) {
      this.elements.summaryBtnText.textContent = '教練總結';
    } else {
      this.elements.summaryBtnText.textContent = '教練總結';
    }
  }

  private updateStatus(status: ConnectionStatus): void {
    const statusMap: Record<ConnectionStatus, { text: string; class: string }> = {
      connected: { text: '已連接', class: 'connected' },
      disconnected: { text: '未連接', class: '' },
      thinking: { text: '思考中...', class: '' },
    };

    const statusInfo = statusMap[status] || statusMap.disconnected;
    this.elements.statusText.textContent = statusInfo.text;
    this.elements.statusDot.className = `status-dot ${statusInfo.class}`;
  }

  private addMessage(content: string, role: DisplayRole = 'user'): void {
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

  private addSystemMessage(content: string): void {
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

  private addThinkingIndicator(): void {
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

  private removeThinkingIndicator(): void {
    const thinkingIndicator = document.getElementById('thinkingIndicator');
    if (thinkingIndicator) {
      thinkingIndicator.remove();
    }
  }

  async sendMessage(): Promise<void> {
    const message = this.elements.chatInput.value.trim();
    if (!message) {
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
      const response = await this.callOpenAI(this.currentBot, this.getChatMessages());
      this.removeThinkingIndicator();

      // 添加 AI 回應到聊天記錄
      this.chatHistory.push({ role: 'assistant', content: response });
      this.addMessage(response, 'assistant');
      this.updateStatus('connected');

      // 更新總結按鈕狀態
      this.updateSummaryButton();
    } catch (error: unknown) {
      this.removeThinkingIndicator();
      const messageText = error instanceof Error ? error.message : '未知錯誤';
      this.addMessage(`錯誤: ${messageText}`, 'assistant');
      this.updateStatus('disconnected');
    } finally {
      this.elements.sendBtn.disabled = false;
    }
  }

  private getChatMessages(): OpenAIChatMessage[] {
    const messages = this.chatHistory
      .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
      .map<OpenAIChatMessage>((msg) => ({
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

  private getChatMessagesText(): string {
    console.log('chatHistory: ', this.chatHistory);
    return this.chatHistory
      .filter((msg) => !msg.content.includes('教練總結'))
      .map((msg) => `${msg.role === 'user' ? '老師' : '學生'}: ${msg.content}`)
      .join('\n');
  }

  private async callOpenAI(botType: BotType = 'student', input?: string | OpenAIChatMessage[]): Promise<string> {
    const botEndpointMap: Record<'student' | 'coach', string> = {
      student: '/api/students/chat',
      coach: '/api/coaches/feedback',
    };

    const url = botEndpointMap[botType];
    if (!url) {
      throw new Error('未知的 bot 類型');
    }

    const variables = this.getVariables(botType);

    let preparedInput: OpenAIChatMessage[];

    if (!input) {
      preparedInput = [
        {
          role: 'user',
          content: [{ type: 'input_text', text: '' }],
        },
      ];
    } else if (typeof input === 'string') {
      preparedInput = [
        {
          role: 'user',
          content: [{ type: 'input_text', text: input }],
        },
      ];
    } else {
      preparedInput = input;
    }

    const body = {
      variables,
      input: preparedInput,
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

  private displayJsonResponse(jsonResponse: unknown): void {
    // 檢查 premiseInfo 元素是否存在
    if (!this.elements.premiseInfo) {
      console.warn('premiseInfo 元素不存在，跳過顯示 JSON 回應');
      return;
    }

    try {
      // 嘗試解析 JSON
      const jsonObj = typeof jsonResponse === 'string' ? JSON.parse(jsonResponse) : (jsonResponse as object);
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
      this.elements.premiseInfo.textContent = String(jsonResponse);
      this.elements.premiseInfo.className = 'premise-info has-content';
    }
  }

  private showError(message: string): void {
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

  clearChat(): void {
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
  private showPromptHistoryDialog(): void {
    this.generatePromptHistoryContent();
    this.elements.promptHistoryDialogOverlay.classList.add('show');
  }

  // 隱藏 Prompt History 對話框
  private hidePromptHistoryDialog(): void {
    this.elements.promptHistoryDialogOverlay.classList.remove('show');
  }

  // 生成 Prompt History 內容
  private generatePromptHistoryContent(): void {
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
  private getBotDisplayName(botType: BotType | string): string {
    const labelMap: Record<string, string> = {
      director: '導演',
      scriptwriter: '編劇',
      student: '學生',
      coach: '教練',
      teacher: '老師',
      judge: '評審',
    };

    const label = labelMap[botType] ?? botType;
    return label.startsWith('to:') ? label : `to: ${label}`;
  }

  // 格式化 Prompt 記錄
  private formatPromptRecord(record: PromptHistoryRecord): string {
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
  private recordPromptHistory(
    botType: BotType | string,
    url: string,
    requestBody: unknown,
    response: unknown = null
  ): void {
    const record: PromptHistoryRecord = {
      timestamp: Date.now(),
      botType,
      url,
      requestBody,
      response,
    };

    this.promptHistory.push(record);
  }

  // 匯出配置
  exportConfig(): void {
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
  importConfig(event: Event): void {
    const input = event.target instanceof HTMLInputElement ? event.target : null;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const fileContent = e.target?.result;
        if (typeof fileContent !== 'string') {
          this.showError('匯入配置失敗: 檔案內容無法解析');
          return;
        }
        const config = JSON.parse(fileContent) as { chapter?: number };

        // 載入章節設定（若提供）
        if (typeof config.chapter === 'number') {
          this.selectChapterNumber(config.chapter);
        }

        // 顯示檔案名稱
        this.elements.fileNameText.textContent = file.name;
        this.elements.importedFileName.style.display = 'block';

        // 顯示成功訊息
        this.showSuccessMessage('配置已成功匯入');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : '未知錯誤';
        this.showError(`匯入配置失敗: ${message}`);
      }
    };

    reader.readAsText(file);

    // 重置 file input
    if (input) {
      input.value = '';
    }
  }

  // 顯示成功訊息
  private showSuccessMessage(message: string): void {
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
function getScript(): DirectorInput | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const storedResponse = localStorage.getItem('scriptwriterResponse');
  if (storedResponse) {
    try {
      let response: unknown = JSON.parse(storedResponse);
      // 檢查如果還是字串就再次 parse
      if (typeof response === 'string') {
        response = JSON.parse(response) as unknown;
      }
      return response as DirectorInput;
    } catch (error) {
      console.error('載入 scriptwriterResponse 時發生錯誤:', error);
      return null;
    }
  }

  return window.scriptwriterResponse ?? null;
}

export function initializeAIChatInterface(): () => void {
  if (typeof window === 'undefined') {
    return () => {
      // no-op on server
    };
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
