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
    const storedName = localStorage.getItem('teacherName');
    if (storedName) {
      setTeacherName(storedName);
      setNameInputValue(storedName);
    } else {
      setIsNameDialogOpen(true);
    }
  }, []);

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

  // 簡單的 Markdown 渲染函數
  const renderMarkdown = (markdown: string) => {
    const lines = markdown.trim().split('\n');
    const elements: JSX.Element[] = [];
    let key = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 標題
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={key++} className="guide-h2">
            {line.replace('## ', '')}
          </h2>
        );
      } else if (line.startsWith('### ')) {
        elements.push(
          <h3 key={key++} className="guide-h3">
            {line.replace('### ', '')}
          </h3>
        );
      } else if (line.startsWith('#### ')) {
        elements.push(
          <h4 key={key++} className="guide-h4">
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
          <ul key={key++} className="guide-ul">
            {listItems.map((item, idx) => (
              <li key={idx}>{item}</li>
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
          <p key={key++} className="guide-p">
            {line}
          </p>
        );
      }
    }

    return elements;
  };

  return (
    <>
      <main className="guide-page">
        <div className="guide-container">
          {/* 左側側邊欄 */}
          <aside className="guide-sidebar">
            <div className="guide-sidebar-header">
              <h2 className="guide-sidebar-title">體驗課培訓主題</h2>
            </div>
            <div className="guide-cards-container">
              {Object.entries(CHAPTER_GOALS).map(([number, info]) => (
                <button
                  key={number}
                  className={`guide-card ${Number(number) === selectedChapter ? 'active' : ''}`}
                  onClick={() => setSelectedChapter(Number(number))}
                >
                  <div className="guide-card-header">
                    <span className="guide-card-number">Part {number}</span>
                  </div>
                  <div className="guide-card-title">{info.title}</div>
                  <div className="guide-card-goal">{info.goal}</div>
                </button>
              ))}
            </div>
          </aside>

          {/* 右側內容區 */}
          <div className="guide-content-area">
            <div className="guide-content-inner">
              {/* 大標題 */}
              <header className="guide-header">
                <h1 className="guide-title">{currentContent.title}</h1>
              </header>

              {/* YouTube 影片 */}
              <div className="guide-video-container">
                <iframe
                  className="guide-video"
                  src={currentContent.videoUrl}
                  title={currentContent.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              {/* Markdown 內容 */}
              <article className="guide-article">{renderMarkdown(currentContent.content)}</article>
            </div>
          </div>
        </div>

        {/* 底部固定 Bar */}
        <div className="guide-bottom-bar">
          <div className="guide-bottom-bar-content">
            <div className="guide-teacher-info">
              <div className="guide-teacher-label">老師姓名</div>
              <div className="guide-teacher-name">{teacherName || '尚未設定'}</div>
              <button type="button" className="guide-teacher-edit-btn" onClick={handleEditName}>
                {teacherName ? '變更' : '設定'}
              </button>
            </div>
            <Link
              href={`/trialLesson/sim?chapter=${selectedChapter}`}
              className="guide-practice-btn"
              onClick={handlePracticeClick}
            >
              <span className="practice-btn-icon">🎯</span>
              <span className="practice-btn-text">
                <span className="practice-btn-main">立即開始練習</span>
                <span className="practice-btn-sub">
                  Chapter {selectedChapter} - {chapterInfo?.title}
                </span>
              </span>
              <span className="practice-btn-arrow">→</span>
            </Link>
          </div>
        </div>
      </main>

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
                    htmlFor="guide-teacher-name"
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
                    id="guide-teacher-name"
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

      <style jsx>{`
        .guide-page {
          min-height: 100vh;
          background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
          padding-bottom: 100px;
        }

        .guide-container {
          display: flex;
          max-width: 1400px;
          margin: 0 auto;
          min-height: calc(100vh - 100px);
        }

        /* 左側側邊欄 */
        .guide-sidebar {
          width: 320px;
          background: #ffffff;
          border-right: 1px solid var(--border);
          position: sticky;
          top: 0;
          height: calc(100vh - 100px);
          overflow-y: auto;
        }

        .guide-sidebar-header {
          padding: 32px 24px 24px;
          border-bottom: 1px solid var(--border);
        }

        .guide-sidebar-title {
          font-size: 20px;
          font-weight: 700;
          color: var(--text);
          margin: 0;
        }

        .guide-cards-container {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .guide-card {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
          padding: 20px;
          background: #ffffff;
          border: 2px solid var(--border);
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          text-align: left;
          width: 100%;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .guide-card:hover {
          border-color: #3b82f6;
          box-shadow: 0 4px 16px rgba(59, 130, 246, 0.15);
          transform: translateY(-2px);
        }

        .guide-card.active {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          border-color: #2563eb;
          box-shadow: 0 8px 24px rgba(59, 130, 246, 0.25);
        }

        .guide-card-header {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .guide-card-number {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 6px;
          background: #f1f5f9;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .guide-card.active .guide-card-number {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }

        .guide-card-title {
          font-size: 16px;
          font-weight: 600;
          line-height: 1.4;
          color: var(--text);
        }

        .guide-card.active .guide-card-title {
          color: white;
        }

        .guide-card-goal {
          font-size: 13px;
          line-height: 1.5;
          color: var(--muted);
        }

        .guide-card.active .guide-card-goal {
          color: rgba(255, 255, 255, 0.85);
        }

        /* 右側內容區 */
        .guide-content-area {
          flex: 1;
          overflow-y: auto;
          background: var(--panel);
        }

        .guide-content-inner {
          max-width: 900px;
          margin: 0 auto;
          padding: 48px 32px;
        }

        .guide-header {
          margin-bottom: 32px;
        }

        .guide-title {
          font-size: 36px;
          font-weight: 700;
          color: var(--text);
          margin: 0;
          line-height: 1.2;
        }

        /* YouTube 影片 */
        .guide-video-container {
          position: relative;
          width: 100%;
          padding-bottom: 56.25%; /* 16:9 比例 */
          margin-bottom: 40px;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
        }

        .guide-video {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: none;
        }

        /* Markdown 內容樣式 */
        .guide-article {
          background: #ffffff;
          border-radius: 16px;
          padding: 40px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .guide-article :global(.guide-h2) {
          font-size: 28px;
          font-weight: 700;
          color: var(--text);
          margin: 32px 0 16px 0;
          padding-bottom: 12px;
          border-bottom: 2px solid var(--border);
        }

        .guide-article :global(.guide-h2:first-child) {
          margin-top: 0;
        }

        .guide-article :global(.guide-h3) {
          font-size: 22px;
          font-weight: 600;
          color: var(--text);
          margin: 24px 0 12px 0;
        }

        .guide-article :global(.guide-h4) {
          font-size: 18px;
          font-weight: 600;
          color: var(--text);
          margin: 20px 0 10px 0;
        }

        .guide-article :global(.guide-p) {
          font-size: 16px;
          line-height: 1.8;
          color: var(--text);
          margin: 12px 0;
        }

        .guide-article :global(.guide-ul) {
          margin: 16px 0;
          padding-left: 24px;
        }

        .guide-article :global(.guide-ul li) {
          font-size: 16px;
          line-height: 1.8;
          color: var(--text);
          margin: 8px 0;
          list-style-type: disc;
        }

        /* 底部固定 Bar */
        .guide-bottom-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 100px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.98) 50%, #ffffff 100%);
          backdrop-filter: blur(10px);
          border-top: 2px solid #e0e7ff;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.08);
          z-index: 100;
        }

        .guide-bottom-bar-content {
          width: min(1160px, 100% - 64px);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }

        .guide-teacher-info {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          padding: 16px 20px;
          background: rgba(59, 130, 246, 0.08);
          border: 1px solid rgba(37, 99, 235, 0.2);
          border-radius: 14px;
          box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.6);
        }

        .guide-teacher-label {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.4px;
          color: #2563eb;
        }

        .guide-teacher-name {
          font-size: 16px;
          font-weight: 600;
          color: var(--text);
          min-width: 120px;
        }

        .guide-teacher-edit-btn {
          background: #ffffff;
          border: 1px solid rgba(37, 99, 235, 0.35);
          color: #2563eb;
          font-size: 14px;
          font-weight: 600;
          padding: 8px 18px;
          border-radius: 9999px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .guide-teacher-edit-btn:hover {
          background: rgba(37, 99, 235, 0.12);
          border-color: #2563eb;
        }

        .guide-teacher-edit-btn:focus-visible {
          outline: 3px solid rgba(37, 99, 235, 0.3);
          outline-offset: 2px;
        }

        .guide-practice-btn {
          display: inline-flex !important;
          flex-direction: row !important;
          align-items: center !important;
          justify-content: center !important;
          flex-wrap: nowrap !important;
          gap: 16px;
          padding: 22px 48px;
          background: linear-gradient(135deg, #f59e0b 0%, #ea580c 50%, #dc2626 100%);
          color: white;
          font-size: 20px;
          font-weight: 700;
          border-radius: 16px;
          text-decoration: none;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 12px 40px rgba(239, 68, 68, 0.4), 0 4px 12px rgba(0, 0, 0, 0.15),
            inset 0 -2px 8px rgba(0, 0, 0, 0.1);
          border: 3px solid #ffffff;
          position: relative;
          overflow: hidden;
          animation: pulse-glow 2s ease-in-out infinite;
          width: auto;
          max-width: 100%;
          flex-shrink: 0;
        }

        @keyframes pulse-glow {
          0%,
          100% {
            box-shadow: 0 12px 40px rgba(239, 68, 68, 0.4), 0 4px 12px rgba(0, 0, 0, 0.15),
              inset 0 -2px 8px rgba(0, 0, 0, 0.1);
          }
          50% {
            box-shadow: 0 16px 50px rgba(239, 68, 68, 0.6), 0 6px 16px rgba(0, 0, 0, 0.2),
              inset 0 -2px 8px rgba(0, 0, 0, 0.1);
          }
        }

        .guide-practice-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          transition: left 0.6s ease;
        }

        .guide-practice-btn:hover::before {
          left: 100%;
        }

        .guide-practice-btn:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 20px 60px rgba(239, 68, 68, 0.5), 0 8px 20px rgba(0, 0, 0, 0.2),
            inset 0 -2px 8px rgba(0, 0, 0, 0.1);
          animation: none;
        }

        .guide-practice-btn:active {
          transform: translateY(-2px) scale(1);
        }

        .practice-btn-icon {
          display: inline-block;
          font-size: 28px;
          animation: bounce 1.5s ease-in-out infinite;
          flex-shrink: 0;
          line-height: 1;
          vertical-align: middle;
        }

        @keyframes bounce {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }

        .practice-btn-text {
          display: inline-flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          gap: 4px;
          flex-shrink: 0;
          vertical-align: middle;
          padding: 0 12px;
        }

        .practice-btn-main {
          display: block;
          font-size: 20px;
          font-weight: 800;
          letter-spacing: 0.5px;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          white-space: nowrap;
          line-height: 1.3;
        }

        .practice-btn-sub {
          display: block;
          font-size: 13px;
          font-weight: 500;
          opacity: 0.95;
          letter-spacing: 0.3px;
          white-space: nowrap;
          line-height: 1.3;
        }

        .practice-btn-arrow {
          display: inline-block;
          font-size: 24px;
          font-weight: 700;
          transition: transform 0.3s ease;
          flex-shrink: 0;
          line-height: 1;
          vertical-align: middle;
        }

        .guide-practice-btn:hover .practice-btn-arrow {
          transform: translateX(6px);
        }

        /* 響應式設計 */
        @media (max-width: 1024px) {
          .guide-sidebar {
            width: 280px;
          }

          .guide-content-inner {
            padding: 32px 24px;
          }

          .guide-title {
            font-size: 28px;
          }

          .guide-bottom-bar-content {
            width: calc(100% - 48px);
            gap: 16px;
          }

          .guide-teacher-info {
            padding: 14px 18px;
          }
        }

        @media (max-width: 768px) {
          .guide-container {
            flex-direction: column;
          }

          .guide-sidebar {
            width: 100%;
            position: static;
            height: auto;
            border-right: none;
            border-bottom: 1px solid var(--border);
          }

          .guide-cards-container {
            flex-direction: row;
            overflow-x: auto;
            padding-bottom: 8px;
          }

          .guide-card {
            min-width: 260px;
            flex-shrink: 0;
          }

          .guide-content-inner {
            padding: 24px 16px;
          }

          .guide-article {
            padding: 24px;
          }

          .guide-bottom-bar {
            height: auto;
            padding: 16px;
          }

          .guide-bottom-bar-content {
            flex-direction: column;
            align-items: stretch;
            width: 100%;
            gap: 12px;
          }

          .guide-teacher-info {
            width: 100%;
            justify-content: space-between;
            gap: 12px;
          }

          .guide-teacher-name {
            flex: 1;
            min-width: auto;
          }

          .guide-practice-btn {
            width: 100%;
            gap: 12px;
            padding: 18px 28px;
            font-size: 16px;
            border-width: 2px;
            justify-content: space-between !important;
          }

          .practice-btn-icon {
            font-size: 24px;
          }

          .practice-btn-main {
            font-size: 16px;
          }

          .practice-btn-sub {
            font-size: 11px;
          }

          .practice-btn-arrow {
            font-size: 20px;
          }
        }
      `}</style>
    </>
  );
}
