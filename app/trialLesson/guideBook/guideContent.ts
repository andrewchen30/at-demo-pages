export interface GuideContent {
  title: string;
  sidebarTitle: string;
  goal: string;
  videoUrl: string;
  content: string;
}

export const GUIDE_CONTENT: Record<number, GuideContent> = {
  1: {
    title: '體驗課 part-1 釐清需求',
    sidebarTitle: '釐清學生需求',
    goal: '讓學生更清楚自己想學什麼、為什麼要學',
    videoUrl: 'https://drive.google.com/file/d/1aCPs8-zUsCneXU8ugOm3jtDwap7zLVl5/preview',
    content: `

總結：幫助學生釐清需求與痛點，學生會更清楚方向，老師也能設計更合適的課程。

### 我有確認學生想學什麼類型的英文嗎？
例如：會話、考試、工作

### 我有確認學生會在哪些場景、和哪些對象使用英文嗎？
例如：國外客戶會議、出國旅遊與當地人互動

### 我有確認學生希望達到的程度嗎？
例如：能流利對話、拿到多益金色證書

### 我有和學生聊過去的學習經驗嗎？
- 哪些方式有幫助？
- 哪些沒幫助？
- 覺得還缺少什麼？

### 我有確認學生的學習動機嗎？
- 進步或不進步可能會帶來什麼影響？
- 達成可能會帶給他什麼價值？
例如：想要換工作、想要明年出國唸書、怕被同事覺得不專業
`,
  },
  2: {
    title: '體驗課 part-2 程度分析',
    sidebarTitle: '分析學生程度',
    goal: '幫學生理解「現在」與「想達成」的程度',
    videoUrl: 'https://drive.google.com/file/d/10V3ApAMJga-hEJgOtiqmzoPE4uu7WsSo/preview',
    content: `
總結：協助學生比較現在與目標的落差，理解為什麼需要學習，以及該把重點放在哪裡。

### 我有確認學生最想加強的能力嗎？
例如：聽、說、讀、寫

### 我有詢問學生過去有沒有考過檢定，或覺得自己程度大概如何嗎？

### 我有透過小測驗或對話，確認學生的目前能力嗎？
例如：聽力 → 播放影片或音樂測試理解；口說 → 簡單自我介紹

### 我有用更明確的數字或指標，呈現學生的程度與目標嗎？
例如：現在是 CEFR B1，目標是 B2

### 我有指出差距最大的一項能力或是弱點嗎？
例如：聽力 60 分 vs 目標 80 分；都用中文思考英文

### 我有解釋學生可能的問題，或指出需要改善的學習方式嗎？
例如：口說 → 詞彙太簡單；寫作 → 文法錯誤。或是以下常見問題：需要靠翻譯成母語來理解、語法或用詞受到母語影響、聽力/閱讀練習量不足、口說/寫作練習量不足、依賴死記硬背無法應用、過度考試導向學習、害怕犯錯、沒有在真實情境中應用、對文化差異不熟悉。

### 我有說明為什麼以前的方法沒幫上忙嗎？
例如：以前只背單字，但很少開口練習的話，口說也無法進步
`,
  },
  3: {
    title: '示範教學內容',
    sidebarTitle: '讓學生體驗到「問題能夠被解決」',
    goal: '讓學生體驗「問題能被解決」',
    videoUrl: 'https://drive.google.com/file/d/1VVhACurnfRlqdvgwKMdKwv9U6-OSl8DU/preview',
    content: `
總結：透過一小段示範教學，讓學生親身感受上課方法對自己是有幫助的。

### 我有提供至少一種教材或方式，讓學生實際參與嗎？

### 我有鼓勵學生嘗試練習或回答嗎？
例如：確保學生有「開口 / 動手」的機會

### 我有解釋這份教材 / 方法為什麼適合他嗎？
例如：讓學生知道，這個教學方式可以如何幫他克服目前的弱點

### 我有詢問或確認學生對這種方式的感受嗎？
例如：覺得有幫助嗎？覺得難不難？

### 我有給學生明確的回饋嗎？
例如： 你的句子結構進步了，但文法時態要再注意

### 我有分享未來的學習過程，會怎麼幫助他持續進步嗎？
例如：我們之後可以用更多真實對話練習，幫你克服開口卡詞的問題
`,
  },
  4: {
    title: '體驗課 part-4 學習計畫',
    sidebarTitle: '規劃學習計畫',
    goal: '讓學生知道可以怎麼開始、可能多久會有效果',
    videoUrl: 'https://drive.google.com/file/d/1JsAaiquaK3sMFT1Hd90iqsP-bLr_MUaD/preview',
    content: `

`,
  },
  5: {
    title: '體驗課 part-5 解決疑慮',
    sidebarTitle: '解決學生疑慮',
    goal: '幫助學生放心做下一步決定',
    videoUrl: 'https://drive.google.com/file/d/15cr64ds9tcFmHVu1VClZH_rVZiURn3ni/preview',
    content: `

`,
  },
};
