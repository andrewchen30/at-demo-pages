// --- Input data (paste your two JSON blocks here) ---
const templates = [
  {
    index: 0,
    script: [
      '老師：嗨，很高興見到你！你目前是學生還是上班族呢？',
      '學生：我是{identity}。',
      '老師：好呀～那接下來想學{subject}，主要是希望幫助到哪一方面呢？',
      '學生：我想先專注在{usage_scenario_tag}。',
    ],
  },
  {
    index: 1,
    script: [
      '老師：嗨，很高興見到你！想先了解，你平常大部分是在哪些場合需要用到{subject}呢？',
      '學生：我是一名{identity}，平常在{usage_scenario_tag}需要用到{subject}。',
      '老師：了解～所以在工作上蠻常碰到的。那你當初決定學{subject}，最主要的原因是什麼呢？',
      '學生：主要是{extrinsic_motivation}。',
    ],
  },
  {
    index: 2,
    script: [
      '老師：嗨，很高興見到你！想先了解，你平常多半在哪些場合需要用到{subject}？怎麼會想開始學呢？',
      '學生：我是一名{identity}，平常在{usage_scenario_tag}需要用到{subject}。一開始是因為{extrinsic_motivation}。',
      '老師：嗯，我大概抓到你的程度，大約在{current_performance}。你覺得哪裡比較順？哪裡最容易卡？',
      '學生：我覺得{strengths}還可以，但{biggest_gap}常卡住。以前{learning_blindspots}，所以一直沒改善。',
    ],
  },
  {
    index: 3,
    script: [
      '老師：嗨，很高興見到你！想先了解一下，你平常主要是在哪些場合需要用到{subject}？',
      '學生：我是一名{identity}，平常在{usage_scenario_tag}需要用{subject}。',
      '老師：原來如此～那你會想學{subject}，最主要的原因是什麼呢？你對未來有一些想要達到的期待嗎？',
      '學生：對啊，一開始是因為{extrinsic_motivation}，可是久了會希望{intrinsic_motivation}。現在大概{current_performance}。我覺得{strengths}還算可以，不過常在{biggest_gap}，容易卡住。',
      '老師：嗯嗯，我懂～其實很多學生也跟你一樣，會在這種情況下遇到瓶頸。',
      '學生：對啊，真的常常這樣，我會希望自己能達成{target_level}。',
    ],
  },
  {
    index: 4,
    script: [
      '老師：嗨，很高興見到你！想先了解一下，你平常多半在哪些場合會用到{subject}？為什麼想開始學呢？',
      '學生：我是一名{identity}，平常在{usage_scenario_tag}需要用到{subject}。一開始是因為{extrinsic_motivation}，後來也希望{intrinsic_motivation}。',
      '老師：了解～所以不只是眼前的需求，也希望有更長遠的改變。以我看，你大概在{current_performance}。你自己覺得呢？哪些地方比較有把握？哪些地方比較困難？',
      '學生：對啊，我覺得{strengths}還可以，但{biggest_gap}常常讓我卡住，尤其在{使用場景與對象}很容易緊張。以前{past_experience}{learning_blindspots}，所以一直沒改善。我希望短期能先往{target_level}靠近，做到{short_term_goal}，再慢慢往{long_term_goal}，最後能{long_term_outcome}。',
    ],
  },
];

// Build a flat key→value map from persona.persona[*].information_key → information
function buildPersonaMap(persona) {
  const map = {};
  for (const item of persona.persona || []) {
    if (item.information_key) {
      map[item.information_key] = item.information;
    }
  }
  return map;
}

// Optional aliases so placeholders can differ from persona keys (e.g., non-ASCII keys)
const ALIASES = {
  // placeholder : persona information_key
  使用場景與對象: 'usage_context',
  // Add more if your templates introduce new placeholder labels
};

// Replace {placeholders} in a string using the map (with alias support)
function replacePlaceholders(str, dataMap, aliases = ALIASES) {
  return str.replace(/\{([^}]+)\}/g, (_, rawKey) => {
    const key = rawKey.trim();
    const actualKey = key in dataMap ? key : aliases[key] || key;
    return actualKey in dataMap ? String(dataMap[actualKey]) : `{${rawKey}}`; // keep as-is if missing
  });
}

// Fill every line of every script in the templates
export function getScripts(persona) {
  const dataMap = buildPersonaMap(persona);
  const data = getTemplate().map((block) => ({
    index: block.index,
    script: (block.script || []).map((line) => replacePlaceholders(line, dataMap)),
  }));
  return {
    scripts: data,
  };
}

export function getTemplate() {
  return [...templates];
}
