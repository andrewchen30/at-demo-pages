const CHECK_LIST_FOR_TEACHER = [
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

const CHECK_LIST_FOR_AI = [
  [
    '老師有詢問學生最想加強哪一項英文能力嗎？（聽、說、讀、寫）',
    '老師有詢問學生有沒有考過英文檢定或自評程度嗎？',
    '老師有用簡短測驗或對話來了解學生程度嗎？',
    '老師有用明確數字或指標說明學生程度或目標嗎？（如分數、等級）',
    '老師有指出學生目前最需要加強的能力或弱點嗎？',
    '老師有說明學生目前的問題或給改善方向嗎？',
    '老師有說明學生以前的學習方法為什麼沒效果嗎？',
  ],
  [
    '老師有詢問學生最想加強哪一項英文能力嗎？',
    '老師有詢問學生是否考過檢定或自評程度嗎？',
    '老師有用簡短測驗或對話了解學生程度嗎？',
    '老師有用數字或指標說明學生的程度或目標嗎？',
    '老師有指出學生目前最需要加強的能力或弱點嗎？',
    '老師有說明學生的問題或提供改善方向嗎？',
    '老師有說明學生以前的學習方法為何沒效果嗎？',
  ],
  [
    '老師有提供教材或教學方式讓學生實際參與嗎？',
    '老師有鼓勵學生練習或回答問題嗎？',
    '老師有解釋教材或教學方式為何適合學生嗎？',
    '老師有詢問學生對教材或活動的感受嗎？',
    '老師有給學生具體的學習回饋嗎？',
    '老師有說明未來的學習方向或如何持續進步嗎？',
  ],
  [
    '老師有分享教學經驗或學生案例來建立信任或展現專業嗎？（非必要）',
    '老師有說明學習計畫如何對應學生的需求與目標嗎？',
    '老師有與學生討論長期學習目標或完成時間嗎？',
    '老師有將長期目標拆解成短期任務並與學生討論嗎？',
  ],
  [
    '老師有主動詢問學生是否有顧慮或需要調整嗎？',
    '老師有正面回應學生的顧慮並提供具體解法嗎？',
    '老師有提醒學生課後可使用的學習資源嗎？',
    '老師有提醒學生平台優惠或折扣資訊嗎？',
    '老師有回應或建議學生課堂包的選擇嗎？（非必要）',
  ],
];

const BRIEF_TEMPLATE = [
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

function getCheckListForTeacher(part_n) {
  const list = CHECK_LIST_FOR_TEACHER[part_n - 1];
  return list.join('\n');
}

function getCheckListForAI(part_n) {
  const list = CHECK_LIST_FOR_AI[part_n - 1];
  return list.join('\n');
}

function getPersona(input, part_n) {
  // Process persona: filter and format
  const personaPart = input.persona
    .filter((p) => p.index >= 0 && p.index < part_n) // keep 0 to part_n - 1
    .map((p) => `${p.information_title}: ${p.information}`)
    .join('\n');
  return personaPart;
}

function getDialog(input, part_n) {
  // Process script: pick script at index part_n - 1
  const scriptObj = input.scripts.find((s) => s.index === part_n - 1);
  const dialogPart = scriptObj ? scriptObj.scripts.join('\n') : '';
  return dialogPart;
}

function fillTemplate(template, persona) {
  // Build a lookup dictionary from persona
  const lookup = {};
  persona.forEach((p) => {
    lookup[p.information_key] = p.information;
  });

  // Replace placeholders in the template
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return lookup[key] !== undefined ? lookup[key] : match;
  });
}

function getUserBrief(input, part_n) {
  const personaPart = input.persona.filter((p) => p.index >= 0 && p.index < part_n);

  return BRIEF_TEMPLATE[part_n - 1].map((p) => fillTemplate(p, personaPart)).join('\n');
}

function getStudentAIParams(input, part_n) {
  return {
    persona: getPersona(input, part_n),
    dialog: getDialog(input, part_n),
  };
}

function getCoachAIParams(input, part_n) {
  return {
    check_list: getCheckListForAI(part_n),
  };
}

function getTeacherHintText(input, part_n) {
  return `【背景資訊】\n${getUserBrief(input, part_n)}\n\n【對話內容】\n${getDialog(
    input,
    part_n
  )}\n\n【檢查重點】\n${getCheckListForTeacher(part_n)}`;
}
