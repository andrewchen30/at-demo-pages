import type { DirectorInput, PersonaEntry } from '../types/student-role';

export interface StudentAIParams {
  persona: string;
  dialog: string;
}

export interface CoachAIParams {
  check_list: string;
}

const CHECK_LIST_FOR_TEACHER: readonly string[][] = [
  [
    '我有確認學生想學什麼類型的英文嗎？',
    '我有確認學生會在哪些場景、和哪些對象使用英文嗎？',
    '我有確認學生希望達到的程度嗎？',
    '我有和學生聊過去的學習經驗嗎？哪些方式有幫助？哪些沒幫助？覺得還缺少什麼？',
    '我有確認學生的學習動機嗎？進步或不進步可能會帶來什麼影響？達成可能會帶給他什麼價值？',
  ],
  [
    '我有確認學生最想加強的能力嗎？',
    '我有詢問學生過去有沒有考過檢定，或覺得自己程度大概如何嗎？',
    '我有透過小測驗或對話，確認學生的目前能力嗎？',
    '我有用更明確的數字或指標，呈現學生的程度與目標嗎？',
    '我有指出差距最大的一項能力或是弱點嗎？',
    '我有解釋學生可能的問題，或指出需要改善的學習方式嗎？',
    '我有說明為什麼以前的方法沒幫上忙嗎？',
  ],
  [
    '我有提供至少一種教材或方式，讓學生實際參與嗎？',
    '我有鼓勵學生嘗試練習或回答嗎？',
    '我有解釋這份教材 / 方法為什麼適合他嗎？',
    '我有詢問或確認學生對這種方式的感受嗎？',
    '我有給學生明確的回饋嗎？',
    '我有分享未來的學習過程，會怎麼幫助他持續進步嗎？',
  ],
  [
    '我有分享過去的教學經驗或學生案例，讓學生覺得「這個老師有經驗，可以帶我成功」嗎？（非必要，但有的話更好）',
    '我的計畫可以對應到學生的學習需求與目標嗎？',
    '我有和學生討論長期目標嗎？（核心需求，不在於時間長短）要達到的程度是什麼？預計多久能完成？追蹤或驗收的頻率？如果沒達到，怎麼調整？',
    '我有把長期目標拆成近期的短期目標，並和學生討論嗎？近期要先練什麼？可能多久會有效果？怎麼追蹤進度？',
  ],
  [
    '我有主動確認學生是否有顧慮或需要調整嗎？',
    '如果學生有提出顧慮，我有正面回應並給具體解法嗎？',
    '我有提醒學生課後可使用的學習資源嗎？',
    '我有提醒學生平台有優惠券嗎？',
    '我有建議或回應學生對課堂包選擇的問題嗎？(非必要，但有的話更好)',
  ],
];

export const CHECK_LIST_FOR_AI: readonly string[][] = [
  [
    '對話中有提到學生想學英文的用途嗎？（如旅遊、工作、考試等）',
    '對話中有提到學生英文會用在什麼情境嗎？（如餐廳、公司、朋友間等）',
    '對話中有提到學生希望英文達到什麼程度嗎？（如能流利溝通、達到特定考試分數）',
    '對話中有提到學生過去學英文的方式或經驗嗎？（如有效或沒效的方法）',
    '對話中有提到學生學英文的原因或動機嗎？（如為了升職、出國、興趣、改變現況等）',
  ],
  [
    '對話中有提到學生最想加強哪一項英文能力嗎？（聽、說、讀、寫）',
    '對話中有提到學生是否考過英文檢定或自評程度嗎？（如多益分數、CEFR 等級、自認程度）',
    '對話中有出現簡短測驗、對話練習或其他方式評估學生程度的內容嗎？',
    '對話中有提到明確數字或指標說明學生程度嗎？（如分數、等級、可量化描述）',
    '對話中有提到學生目前最需要加強的能力或弱點嗎？（無論是老師指出或學生自述）',
    '對話中有說明學生目前的問題或提供改善方向嗎？（無論是老師建議或學生自我反思）',
    '對話中有討論學生以往學習方法為什麼沒效果嗎？（如缺乏練習、太無聊、沒持續等）',
  ],
  [
    '對話中有提供教材或教學方式讓學生參與或了解嗎？（老師展示、提到教材、或學生描述嘗試內容皆可）',
    '對話中有鼓勵或邀請學生嘗試練習、回答問題或參與活動嗎？',
    '對話中有解釋教材或教學方式為什麼適合學生嗎？（老師說明或學生回饋皆可）',
    '對話中有提到學生對教材、練習或活動的感受嗎？（覺得有幫助、太難、太快等）',
    '對話中有提供具體的學習回饋嗎？（包含老師給或學生自評都可）',
    '對話中有提到未來的學習方向或如何持續進步嗎？（包含老師規劃或學生期望）',
  ],
  [
    '對話中有出現老師分享教學經驗或學生案例來建立信任或展示專業的內容嗎？（非必要）',
    '對話中有提到學習計畫如何對應學生的需求與目標嗎？',
    '對話中有討論長期學習目標或預期完成時間嗎？（如幾個月內達成、多久能提升）',
    '對話中有將長期目標拆解成短期任務或階段性安排嗎？（老師提或學生認同皆可）',
  ],
  [
    '對話中有出現學生表達顧慮或老師主動詢問學生是否有顧慮或需要調整嗎？',
    '對話中有正面回應學生的顧慮或提供具體解法嗎？（如課程節奏、教材難度、費用問題等）',
    '對話中有提到課後可使用的學習資源嗎？（平台功能、練習工具、影片教材等）',
    '對話中有提到平台優惠、折扣或課堂包資訊嗎？（老師提醒或學生詢問皆可）',
    '對話中有討論課堂包選擇、上課頻率或購課方案嗎？（非必要，但若提到則計入）',
  ],
];

const BRIEF_TEMPLATE: readonly string[][] = [
  ['1. 基本資料：{identity}', '2. 科目：{subject}、{usage_scenario}'],
  ['1. 基本資料：{identity}、{usage_context}', '2. 學習動機：{extrinsic_motivation}'],
  [
    '1. 基本資料：{identity}、{usage_context}',
    '2. 學習動機：{extrinsic_motivation}',
    '3. 目前程度：{current_performance}、{strengths}、{biggest_gap}',
    '4. 學習痛點：{learning_blindspots}',
  ],
  [
    '1. 基本資料：{identity}、{usage_context}',
    '2. 學習動機：{extrinsic_motivation}、{intrinsic_motivation}',
    '3. 目前程度：{current_performance}、{strengths}、{biggest_gap}',
    '4. 學習目標：{target_level}',
  ],
  [
    '1. 基本資料：{identity}、{usage_context}',
    '2. 學習動機：{extrinsic_motivation}、{intrinsic_motivation}',
    '3. 目前程度：{current_performance}、{strengths}、{biggest_gap}',
    '4. 學習目標：{target_level}、{short_term_goal}、{long_term_goal}、{long_term_outcome}',
    '5. 學習痛點：{learning_blindspots}',
  ],
];

export function getCheckListForTeacher(partN: number): string {
  const list = CHECK_LIST_FOR_TEACHER[partN - 1] || [];
  return list.join('\n');
}

export function getCheckListForAI(partN: number): string {
  const list = CHECK_LIST_FOR_AI[partN - 1] || [];
  return list.join('\n');
}

function getPersona(input: DirectorInput, partN: number): string {
  const personaPart = (input.persona || [])
    .filter((p) => p.index >= 0 && p.index < partN)
    .map((p) => `${p.information_title}: ${p.information}`)
    .join('\n');
  return personaPart;
}

function getDialog(input: DirectorInput, partN: number): string {
  const scriptObj = (input.scripts || []).find((s) => s.index === partN - 1);
  const dialogPart = scriptObj ? scriptObj.script.join('\n') : '';
  return dialogPart;
}

function fillTemplate(template: string, persona: PersonaEntry[]): string {
  const lookup: Record<string, string> = {};
  persona.forEach((p) => {
    lookup[p.information_key] = p.information;
  });

  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return lookup[key] !== undefined ? lookup[key] : match;
  });
}

function getUserBrief(input: DirectorInput, partN: number): string {
  const personaPart = (input.persona || []).filter((p) => p.index >= 0 && p.index < partN);

  const template = BRIEF_TEMPLATE[partN - 1] || [];
  return template.map((p) => fillTemplate(p, personaPart)).join('\n');
}

export function getStudentAIParams(input: DirectorInput, partN: number): StudentAIParams {
  return {
    persona: getPersona(input, partN),
    dialog: getDialog(input, partN),
  };
}

export function getCoachAIParams(input: DirectorInput, partN: number): CoachAIParams {
  return {
    check_list: getCheckListForAI(partN),
  };
}

export function getTeacherHintText(input: DirectorInput, partN: number): string {
  return `【背景資訊】\n${getUserBrief(input, partN)}\n\n【對話內容】\n${getDialog(
    input,
    partN
  )}\n\n【檢查重點】\n${getCheckListForTeacher(partN)}`;
}
