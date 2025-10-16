'use client';

import { FormEvent, MouseEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { CHAPTER_GOALS } from '@/app/trialLesson/sim/constants';

// Demo 內容資料
const GUIDE_CONTENT: Record<
  number,
  {
    title: string;
    videoUrl: string;
    content: string;
  }
> = {
  1: {
    title: '體驗課 part-1 釐清需求',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    content: `
## 📚 學習目標

讓學生更清楚自己想學什麼、為什麼要學

## 💡 核心概念

在體驗課的第一部分，我們的主要目標是幫助學生釐清他們的學習需求。這個階段非常關鍵，因為只有當學生明確知道自己想要什麼，才能制定出有效的學習計劃。

### 重點技巧

1. **開放式提問**
   - 「是什麼讓你想要學習英文？」
   - 「你希望透過學習英文達到什麼目標？」
   - 「在你的工作/生活中，英文會用在哪些場景？」

2. **深入挖掘動機**
   - 不要滿足於表面答案
   - 透過追問了解真實需求
   - 找出學生的痛點和期待

3. **建立連結**
   - 將學習目標與實際應用場景連結
   - 幫助學生看到學習的價值
   - 創造學習的緊迫感

## 📝 實戰步驟

### Step 1: 破冰與建立信任
- 用輕鬆的方式開場
- 表現出真誠的興趣
- 創造舒適的對話環境

### Step 2: 探索學習動機
- 詢問學習英文的原因
- 了解過去的學習經驗
- 找出目前遇到的困難

### Step 3: 確認具體目標
- 將模糊的想法具體化
- 設定可衡量的目標
- 確認時間軸和優先順序

## ⚠️ 常見錯誤

- ❌ 急於推銷課程
- ❌ 沒有認真傾聽學生的回答
- ❌ 用專業術語讓學生感到壓力
- ❌ 忽略學生的情緒和感受

## ✅ 成功指標

- 學生能清楚說出學習目標
- 學生感受到被理解和支持
- 建立了良好的信任關係
- 為後續環節奠定基礎
`,
  },
  2: {
    title: '體驗課 part-2 程度分析',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    content: `
## 📚 學習目標

幫學生看清楚「現在的程度」與「想要達到的程度」

## 💡 核心概念

程度分析是體驗課中最關鍵的環節之一。透過專業的評估，幫助學生清楚認識自己目前的英文能力，並了解與目標之間的差距。

### 評估維度

1. **聽力理解**
   - 日常對話理解程度
   - 專業領域詞彙掌握度
   - 語速適應能力

2. **口語表達**
   - 發音準確度
   - 詞彙豐富度
   - 文法正確性
   - 流暢度

3. **實際應用能力**
   - 工作場景應對
   - 社交情境表達
   - 問題解決能力

## 📝 實戰步驟

### Step 1: 設計評估情境
- 根據學生需求設計對話主題
- 從簡單到複雜循序漸進
- 觀察學生的反應和表現

### Step 2: 進行能力檢測
- 自然地融入對話中
- 記錄關鍵表現
- 注意學生的舒適度

### Step 3: 給予專業反饋
- 先肯定優點
- 指出具體的改進空間
- 用實例說明差距

## 🎯 分析框架

### 現況評估
- A1-A2: 基礎入門
- B1-B2: 中級進階
- C1-C2: 高級精通

### 目標設定
- 短期目標（3個月）
- 中期目標（6個月）
- 長期目標（1年）

## ⚠️ 注意事項

- 保持客觀專業
- 避免打擊學生信心
- 用鼓勵的方式指出問題
- 強調進步的可能性
`,
  },
  3: {
    title: '體驗課 part-3 示範教學',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    content: `
## 📚 學習目標

讓學生體驗「問題能被解決」

## 💡 核心概念

示範教學是體驗課的高潮部分。在這個環節中，我們要實際展示如何解決學生的問題，讓學生親身感受到進步的可能性。

### 教學重點

1. **針對性解決問題**
   - 選擇學生最關心的問題
   - 提供立即可用的解決方案
   - 讓學生看到明顯的改善

2. **展現教學特色**
   - 突出你的教學方法
   - 展示專業能力
   - 創造「wow」時刻

3. **建立學習信心**
   - 讓學生體驗成功
   - 給予正向回饋
   - 強化學習動機

## 📝 教學設計

### 問題選擇標準
- 具有代表性
- 能快速見效
- 與學生目標相關
- 難度適中

### 示範教學流程

#### 1. 問題呈現
- 清楚說明要解決的問題
- 確認學生理解
- 建立期待

#### 2. 方法講解
- 說明解決策略
- 拆解步驟
- 提供範例

#### 3. 實際演練
- 學生親自嘗試
- 即時糾正
- 引導改進

#### 4. 效果確認
- 對比前後差異
- 獲得學生認可
- 強化學習信心

## 🎨 教學技巧

### 互動技巧
- 高頻率提問
- 鼓勵學生參與
- 創造輕鬆氛圍

### 回饋技巧
- 具體指出進步
- 用數據或實例說明
- 建立持續改進的期待

## ✅ 成功指標

- 學生有「原來如此」的頓悟感
- 明顯感受到進步
- 對後續學習充滿期待
- 認可你的教學能力
`,
  },
  4: {
    title: '體驗課 part-4 學習計畫',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    content: `
## 📚 學習目標

讓學生知道可以怎麼開始、可能多久會有效果

## 💡 核心概念

學習計畫環節是將前面的評估和示範具體化的過程。一個清晰、可行的學習計畫能幫助學生看到明確的方向，降低開始學習的門檻。

### 計畫要素

1. **明確的學習路徑**
   - 起點：當前程度
   - 終點：目標程度
   - 里程碑：階段性目標

2. **具體的時間規劃**
   - 每週學習頻率
   - 單次學習時長
   - 預期達成時間

3. **清楚的學習內容**
   - 主題安排
   - 技能訓練
   - 實戰練習

## 📝 計畫制定步驟

### Step 1: 目標拆解
- 將大目標分解為小目標
- 設定可衡量的指標
- 確定優先順序

### Step 2: 資源規劃
- 課程安排
- 教材選擇
- 練習工具

### Step 3: 時間估算
- 基於學生可投入時間
- 參考過往經驗
- 留有彈性空間

### Step 4: 成效預測
- 1個月後的變化
- 3個月後的進步
- 6個月後的成果

## 🎯 計畫範例

### 初級學習者（3個月計畫）

**第1個月：建立基礎**
- 週頻率：3次/週
- 重點：發音、基礎詞彙
- 目標：能進行簡單自我介紹

**第2個月：強化應用**
- 週頻率：3次/週
- 重點：日常對話、句型練習
- 目標：能應對基本生活情境

**第3個月：實戰演練**
- 週頻率：2-3次/週
- 重點：情境對話、文化理解
- 目標：能獨立完成簡單溝通

## 💡 溝通技巧

### 建立信心
- 強調可行性
- 分享成功案例
- 展示清晰的路徑

### 管理期待
- 誠實告知所需時間
- 說明可能的挑戰
- 提供解決方案

## ⚠️ 注意事項

- 避免過度承諾
- 計畫要個人化
- 保持靈活調整的空間
- 確認學生理解並認同
`,
  },
  5: {
    title: '體驗課 part-5 解決疑慮',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    content: `
## 📚 學習目標

幫助學生放心做下一步決定

## 💡 核心概念

在體驗課的最後階段，學生可能會有各種疑慮和顧慮。作為老師，我們需要用專業、誠懇的態度，幫助學生消除疑慮，做出對自己最好的決定。

### 常見疑慮類型

1. **時間相關**
   - 「我工作很忙，能配合嗎？」
   - 「多久能看到效果？」
   - 「如果中途有事怎麼辦？」

2. **效果相關**
   - 「真的能幫我解決問題嗎？」
   - 「我基礎很差，跟得上嗎？」
   - 「之前學過很多次都失敗了」

3. **經濟相關**
   - 「學費是否划算？」
   - 「有沒有優惠？」
   - 「可以先試幾堂課嗎？」

## 📝 應對策略

### 傾聽與理解
- 給學生充分表達的機會
- 不要急著反駁
- 理解背後的真實顧慮

### 針對性回應

#### 時間疑慮
- 說明課程彈性安排
- 分享在職學習者案例
- 提供時間管理建議

#### 效果疑慮
- 回顧體驗課中的進步
- 提供學習保證
- 分享相似案例的成功經驗

#### 經濟疑慮
- 說明投資報酬率
- 提供付款彈性
- 強調長期價值

## 🎯 溝通技巧

### 建立信任
- 誠實透明
- 不誇大承諾
- 展現專業度

### 同理心溝通
- 「我理解你的顧慮」
- 「很多學生一開始也有這個擔心」
- 「讓我們一起找解決方案」

### 給予選擇權
- 不強迫決定
- 提供思考時間
- 尊重學生的選擇

## 💪 結束技巧

### 正面結束
無論學生是否決定上課，都要：
- 感謝學生的時間
- 總結今天的收穫
- 保持聯繫管道

### 追蹤機制
- 提供聯絡方式
- 發送學習資料
- 適時關心進度

## ⚠️ 重要提醒

- **保持專業**：不要因為學生猶豫而改變態度
- **真誠服務**：以學生利益為優先
- **長期思維**：好的服務會帶來好的口碑
- **持續改進**：從每次體驗課中學習

## ✅ 成功指標

- 學生的疑慮得到解答
- 學生感受到被尊重
- 無論結果都留下好印象
- 建立長期合作可能性
`,
  },
};

export default function GuideBookPage() {
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false);
  const [teacherName, setTeacherName] = useState('');
  const [nameInputValue, setNameInputValue] = useState('');

  const currentContent = GUIDE_CONTENT[selectedChapter];
  const chapterInfo = CHAPTER_GOALS[selectedChapter];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // 初始化：從 URL query 讀取 chapter，若無則預設為 1 並寫回 URL
    try {
      const url = new URL(window.location.href);
      const chapterParam = url.searchParams.get('chapter');
      const parsed = chapterParam ? Number(chapterParam) : NaN;
      const isValid = Number.isInteger(parsed) && parsed >= 1 && parsed <= Object.keys(CHAPTER_GOALS).length;
      const initialChapter = isValid ? parsed : 1;
      setSelectedChapter(initialChapter);
      if (!isValid || chapterParam === null) {
        url.searchParams.set('chapter', String(initialChapter));
        window.history.replaceState(null, '', url.toString());
      }
    } catch {}

    const storedName = localStorage.getItem('teacherName');
    if (storedName) {
      setTeacherName(storedName);
      setNameInputValue(storedName);
    } else {
      setIsNameDialogOpen(true);
    }
  }, []);

  // 監聽瀏覽器返回/前進，保持 state 與 URL 同步
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => {
      try {
        const url = new URL(window.location.href);
        const chapterParam = url.searchParams.get('chapter');
        const parsed = chapterParam ? Number(chapterParam) : NaN;
        const isValid = Number.isInteger(parsed) && parsed >= 1 && parsed <= Object.keys(CHAPTER_GOALS).length;
        setSelectedChapter(isValid ? parsed : 1);
      } catch {}
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  // 當 selectedChapter 改變時，將 chapter 寫入 URL（pushState 以便可返回）
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      const currentParam = url.searchParams.get('chapter');
      const nextValue = String(selectedChapter);
      if (currentParam !== nextValue) {
        url.searchParams.set('chapter', nextValue);
        window.history.pushState(null, '', url.toString());
      }
    } catch {}
  }, [selectedChapter]);

  const handleNameSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = nameInputValue.trim();
    if (!trimmedName) return;
    localStorage.setItem('teacherName', trimmedName);
    setTeacherName(trimmedName);
    setIsNameDialogOpen(false);
  };

  const handlePracticeClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!teacherName.trim()) {
      event.preventDefault();
      setNameInputValue(teacherName);
      setIsNameDialogOpen(true);
    }
  };

  const handleEditName = () => {
    setNameInputValue(teacherName);
    setIsNameDialogOpen(true);
  };

  // 簡單的 Markdown 渲染函數（以 Tailwind 呈現）
  const renderMarkdown = (markdown: string) => {
    const lines = markdown.trim().split('\n');
    const elements: JSX.Element[] = [];
    let key = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 標題
      if (line.startsWith('## ')) {
        elements.push(
          <h2
            key={key++}
            className="text-[28px] font-bold text-slate-800 mt-8 mb-4 pb-3 border-b-2 border-slate-200 first:mt-0"
          >
            {line.replace('## ', '')}
          </h2>
        );
      } else if (line.startsWith('### ')) {
        elements.push(
          <h3 key={key++} className="text-[22px] font-semibold text-slate-800 my-6">
            {line.replace('### ', '')}
          </h3>
        );
      } else if (line.startsWith('#### ')) {
        elements.push(
          <h4 key={key++} className="text-[18px] font-semibold text-slate-800 my-5">
            {line.replace('#### ', '')}
          </h4>
        );
      }
      // 無序列表
      else if (line.startsWith('- ')) {
        const listItems: string[] = [];
        let j = i;
        while (j < lines.length && lines[j].startsWith('- ')) {
          listItems.push(lines[j].replace(/^- /, ''));
          j++;
        }
        elements.push(
          <ul key={key++} className="my-4 pl-6 list-disc">
            {listItems.map((item, idx) => (
              <li key={idx} className="text-base leading-8 text-slate-800 my-2">
                {item}
              </li>
            ))}
          </ul>
        );
        i = j - 1;
      }
      // 空行
      else if (line.trim() === '') {
        continue;
      }
      // 一般段落
      else {
        elements.push(
          <p key={key++} className="text-base leading-8 text-slate-800 my-3">
            {line}
          </p>
        );
      }
    }

    return elements;
  };

  return (
    <>
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-[100px]">
        <div className="flex w-full min-h-[calc(100vh-100px)] md:flex-row flex-col">
          {/* 左側側邊欄 */}
          <aside className="md:w-[320px] w-full bg-white md:border-r border-slate-200 md:sticky md:top-0 md:h-[calc(100vh-100px)] md:flex md:flex-col md:overflow-hidden">
            <div className="px-6 pt-8 pb-6 border-b border-slate-200">
              <h2 className="text-[20px] font-bold text-slate-800 m-0">體驗課培訓主題</h2>
            </div>
            <div className="p-4 flex md:flex-col flex-row gap-3 md:flex-1 md:overflow-y-auto overflow-x-auto">
              {Object.entries(CHAPTER_GOALS).map(([number, info]) => (
                <button
                  key={number}
                  className={`min-w-[240px] md:min-w-0 flex flex-col items-start gap-2.5 p-4 bg-white border rounded-2xl cursor-pointer transition text-left w-full shadow-[0_1px_4px_rgba(0,0,0,0.04)] ${
                    Number(number) === selectedChapter
                      ? 'bg-gradient-to-br from-blue-600 to-blue-700 border-blue-700 shadow-[0_6px_18px_rgba(59,130,246,0.22)]'
                      : 'border-slate-200 hover:border-blue-500 hover:shadow-[0_2px_10px_rgba(59,130,246,0.12)] hover:-translate-y-0.5'
                  }`}
                  onClick={() => setSelectedChapter(Number(number))}
                >
                  <div className="w-full flex items-center justify-between">
                    <span
                      className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-md uppercase tracking-[0.5px] ${
                        Number(number) === selectedChapter ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      Part {number}
                    </span>
                  </div>
                  <div
                    className={`text-[15px] font-semibold leading-[1.4] ${
                      Number(number) === selectedChapter ? 'text-white' : 'text-slate-800'
                    }`}
                  >
                    {info.title}
                  </div>
                  <div
                    className={`text-[13px] leading-6 ${
                      Number(number) === selectedChapter ? 'text-white/85' : 'text-slate-500'
                    }`}
                  >
                    {info.goal}
                  </div>
                </button>
              ))}
            </div>
            {/* 老師姓名設定（移至側邊欄左下角） */}
            <div className="px-6 pb-6 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-4 flex-wrap bg-blue-50/80 border border-blue-600/20 rounded-[14px] px-5 py-3 shadow-[inset_0_1px_2px_rgba(255,255,255,0.6)]">
                <div className="text-xs font-bold tracking-[0.04em] text-blue-600">老師姓名</div>
                <div className="text-base font-semibold text-slate-800 min-w-[120px]">{teacherName || '尚未設定'}</div>
                <button
                  type="button"
                  className="bg-white border border-blue-600/35 text-blue-600 text-sm font-semibold px-4 py-2 rounded-full transition hover:bg-blue-600/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-300"
                  onClick={handleEditName}
                >
                  {teacherName ? '變更' : '設定'}
                </button>
              </div>
            </div>
          </aside>

          {/* 右側內容區 */}
          <div className="flex-1 overflow-y-auto bg-slate-50">
            <div className="max-w-[900px] mx-auto p-12 md:p-8">
              {/* 大標題 */}
              <header className="mb-8">
                <h1 className="text-[36px] font-bold text-slate-800 m-0 leading-[1.2]">{currentContent.title}</h1>
              </header>

              {/* YouTube 影片 */}
              <div className="relative w-full pb-[56.25%] mb-10 rounded-2xl overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.1)]">
                <iframe
                  className="absolute inset-0 w-full h-full border-0"
                  src={currentContent.videoUrl}
                  title={currentContent.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              {/* Markdown 內容 */}
              <article className="bg-white rounded-2xl p-10 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                {renderMarkdown(currentContent.content)}
              </article>
            </div>
          </div>
        </div>

        {/* 底部固定 Bar */}
        <div className="fixed bottom-0 left-0 right-0 md:left-[320px] bg-white/90 backdrop-blur-md border-t border-slate-200 flex items-center justify-center shadow-[0_-6px_24px_rgba(0,0,0,0.06)] z-[100] p-4 md:h-[88px]">
          <div className="w-[min(1160px,calc(100%-64px))] flex items-center justify-center gap-4 md:flex-row flex-col">
            <Link
              href={`/trialLesson/sim?chapter=${selectedChapter}`}
              className="group inline-flex items-center justify-center gap-3 px-8 py-3 bg-gradient-to-b from-blue-600 to-blue-700 text-white text-base font-semibold rounded-full no-underline transition shadow-[0_8px_20px_rgba(37,99,235,0.35)] border border-white/20 hover:brightness-105 w-auto max-w-full"
              onClick={handlePracticeClick}
            >
              <span className="whitespace-nowrap">立刻開始</span>
              <span className="text-sm opacity-90 hidden md:inline">
                Chapter {selectedChapter} - {chapterInfo?.title}
              </span>
              <span className="text-[18px] font-bold transition-transform group-hover:translate-x-1.5">→</span>
            </Link>
          </div>
        </div>
      </main>

      {isNameDialogOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-[500px] w-[90%] overflow-hidden">
            <div className="p-5 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800 m-0">👋 歡迎使用 AI 教學工具</h3>
            </div>
            <div className="p-5">
              <form onSubmit={handleNameSubmit}>
                <div className="mb-5">
                  <label htmlFor="guide-teacher-name" className="block mb-2 font-medium text-sm">
                    請輸入您的名字
                  </label>
                  <input
                    id="guide-teacher-name"
                    type="text"
                    value={nameInputValue}
                    onChange={(e) => setNameInputValue(e.target.value)}
                    placeholder="請輸入名字"
                    required
                    autoFocus
                    className="w-full p-3 border border-slate-200 rounded-lg text-sm outline-none transition focus:border-blue-500"
                  />
                  <p className="mt-2 text-xs text-slate-500 leading-6">💡 請輸入與 AmazingTalker 站上相同的名字</p>
                </div>
                <button
                  type="submit"
                  className="w-full bg-gradient-to-b from-blue-500 to-blue-600 text-white px-4 py-3 rounded-lg text-sm font-medium"
                >
                  確認
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
