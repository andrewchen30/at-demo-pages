'use client';

import { useState, useRef, useEffect } from 'react';

// -------- Behavior mapping from training checklist --------
const BEHAVIOR_MAPPING = [
  { ability_key: 'clarify_needs', item_key: 'purpose', label: '我有確認學生想學什麼類型嗎？' },
  { ability_key: 'clarify_needs', item_key: 'context', label: '我有確認學生會在哪些場景、和哪些對象使用嗎？' },
  { ability_key: 'clarify_needs', item_key: 'target_level', label: '我有確認學生希望達到的程度嗎？' },
  { ability_key: 'clarify_needs', item_key: 'past_experience', label: '我有和學生聊過去的學習經驗嗎？' },
  { ability_key: 'clarify_needs', item_key: 'motivation', label: '我有確認學生的學習動機嗎?' },

  { ability_key: 'level_analysis', item_key: 'focus_skill', label: '我有確認並與學生討論最想加強的能力為何嗎？' },
  { ability_key: 'level_analysis', item_key: 'exam_or_self_rating', label: '我有詢問或確認學生的檢定經驗與自評程度，讓他知道我了解他的背景嗎？' },
  { ability_key: 'level_analysis', item_key: 'quick_assessment', label: '我有透過對話或小測驗了解學生程度，並清楚說出我的觀察嗎？' },
  { ability_key: 'level_analysis', item_key: 'quantified_level', label: '我有用明確的數字或指標，說明學生的程度與目標嗎？' },
  { ability_key: 'level_analysis', item_key: 'current_weakness', label: '我有說明學生目前最大的差距或弱點嗎？' },
  { ability_key: 'level_analysis', item_key: 'improvement_direction', label: '我有說明學生可能的問題，或指出可以調整的學習方式嗎？' },
  { ability_key: 'level_analysis', item_key: 'why_past_ineffective', label: '我有解釋為什麼以前的方法沒幫上忙，並提出新的建議嗎？' },

  { ability_key: 'demo_teaching', item_key: 'materials_or_methods', label: '我有提供至少一種教材或方式，讓學生實際參與嗎？' },
  { ability_key: 'demo_teaching', item_key: 'invite_practice', label: '我有鼓勵學生嘗試練習或回答嗎？' },
  { ability_key: 'demo_teaching', item_key: 'why_suitable', label: '我有解釋這份教材 / 方法為什麼適合他嗎？' },
  { ability_key: 'demo_teaching', item_key: 'student_feedback', label: '我有詢問或確認學生對這種方式的感受嗎？' },
  { ability_key: 'demo_teaching', item_key: 'specific_feedback', label: '我有給學生明確的回饋嗎？' },
  { ability_key: 'demo_teaching', item_key: 'future_direction', label: '我有分享未來的學習過程，會怎麼幫助他持續進步嗎？' },

  { ability_key: 'learning_plan', item_key: 'share_experience', label: '我有分享過去的教學經驗或學生案，讓學生覺得「這個老師有經驗，可以帶我成功」嗎？' },
  { ability_key: 'learning_plan', item_key: 'plan_matches_needs', label: '我的計畫可以對應到學生的學習需求與目標嗎？' },
  { ability_key: 'learning_plan', item_key: 'long_term_goal', label: '我有和學生討論長期目標嗎？（核心需求，不在於時間長短）' },
  { ability_key: 'learning_plan', item_key: 'breakdown_to_tasks', label: '我有把長期目標拆成近期的短期目標，並和學生討論嗎？' },

  { ability_key: 'address_concerns', item_key: 'express_or_ask_concerns', label: '我有主動確認學生是否有顧慮或需要調整嗎？' },
  { ability_key: 'address_concerns', item_key: 'address_concerns_solution', label: '我有正面回應學生的顧慮並給具體解法嗎？' },
  { ability_key: 'address_concerns', item_key: 'after_class_resources', label: '我有提醒學生課後可使用的學習資源嗎？' },
  { ability_key: 'address_concerns', item_key: 'promotion_or_package', label: '我有提醒學生平台有優惠券嗎？' },
  { ability_key: 'address_concerns', item_key: 'plan_or_frequency', label: '我有建議或回應學生對課堂包選擇的問題嗎？' },
];

// -------- Types --------
interface BehaviorItem {
  status: string;
  item_key: string;
  ability_key: string;
}

interface Model {
  headers: string[];
  rowKeys: string[];
  appointmentToTeacher: Map<string, string>;
  teacherDisplayMap: Map<string, string>;
  appointmentDisplayMap: Map<string, string>;
  appointmentCreatedAtMap: Map<string, string>;
  dataset: Map<string, Map<string, 'pass' | 'fail'>>;
  teachers: string[];
}

interface Mapping {
  order: string[];
  labelByRowKey: Map<string, string>;
}

// -------- Utilities --------
function normalizeId(value: string | null | undefined): string {
  return String(value == null ? '' : value).replace(/,/g, '').trim();
}

function firstDisplay(value: string | null | undefined): string {
  return String(value == null ? '' : value).trim();
}

function safePercent(numerator: number, denominator: number): string {
  if (denominator === 0) return '0%';
  const pct = Math.round((numerator * 10000) / denominator) / 100;
  return pct.toFixed(2) + '%';
}

// -------- CSV Parser (RFC4180-like) --------
function parseCsv(text: string): string[][] {
  // Handle BOM
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        const next = text[i + 1];
        if (next === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(field);
        field = '';
      } else if (char === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else if (char === '\r') {
        // ignore CR; handle on next LF
      } else {
        field += char;
      }
    }
  }
  // flush tail
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // filter out empty trailing lines
  const compact = rows.filter((r) => !(r.length === 1 && r[0].trim() === ''));
  return compact;
}

// -------- Data Modeling --------
function buildModel(csvRows: string[][]): Model {
  if (!csvRows || csvRows.length === 0) {
    throw new Error('CSV 無內容');
  }
  const headers = csvRows[0].map((h) => h.trim());
  const body = csvRows.slice(1);

  // locate columns
  const idxItems = headers.findIndex((h) => h.toLowerCase().includes('items'));
  let idxTeacher = headers.findIndex((h) => h.trim() === 'teacher_id');
  let idxAppointment = headers.findIndex((h) => h.trim() === 'appointment_id');
  let idxCreatedAt = headers.findIndex((h) => h.trim() === 'created_at');

  // 檢查是否只有 2 欄（items 和合併的資訊欄）
  const hasMergedFormat =
    (headers.length <= 2 || idxTeacher === -1 || idxAppointment === -1) && body.length > 0;

  if (idxItems === -1) {
    throw new Error('找不到必要欄位：items');
  }

  const rowKeySet = new Set<string>();
  const appointmentToTeacher = new Map<string, string>();
  const teacherDisplayMap = new Map<string, string>();
  const appointmentDisplayMap = new Map<string, string>();
  const appointmentCreatedAtMap = new Map<string, string>();
  const dataset = new Map<string, Map<string, 'pass' | 'fail'>>();

  for (const r of body) {
    if (!r || r.length === 0) continue;
    const itemsStr = r[idxItems] ?? '';

    let teacherRaw = '';
    let appointmentRaw = '';
    let createdAt = '';

    if (hasMergedFormat && r.length >= 2) {
      // 合併格式：第二欄包含 "日期時間,teacher_id,appointment_id"
      const mergedStr = r[1] ?? '';
      const parts = mergedStr.split(',');
      if (parts.length >= 3) {
        appointmentRaw = parts[parts.length - 1].trim();
        teacherRaw = parts[parts.length - 2].trim();
        createdAt = parts.slice(0, parts.length - 2).join(',').trim();
      }
    } else {
      // 標準格式
      teacherRaw = r[idxTeacher] ?? '';
      appointmentRaw = r[idxAppointment] ?? '';
      createdAt = idxCreatedAt >= 0 ? r[idxCreatedAt] : '';
    }

    const teacher = normalizeId(teacherRaw);
    const appointment = normalizeId(appointmentRaw);
    if (!appointment) continue; // skip broken line

    appointmentToTeacher.set(appointment, teacher);
    if (!teacherDisplayMap.has(teacher)) teacherDisplayMap.set(teacher, firstDisplay(teacherRaw));
    if (!appointmentDisplayMap.has(appointment))
      appointmentDisplayMap.set(appointment, firstDisplay(appointmentRaw));
    if (createdAt) appointmentCreatedAtMap.set(appointment, firstDisplay(createdAt));

    let items: BehaviorItem[];
    try {
      items = JSON.parse(itemsStr);
    } catch (e) {
      items = [];
    }
    if (!Array.isArray(items)) continue;

    let appointmentMap = dataset.get(appointment);
    if (!appointmentMap) {
      appointmentMap = new Map();
      dataset.set(appointment, appointmentMap);
    }
    for (const it of items) {
      if (!it) continue;
      const ability = String(it.ability_key ?? '').trim();
      const item = String(it.item_key ?? '').trim();
      if (!ability || !item) continue;
      const status = String(it.status ?? '').trim().toLowerCase() === 'pass' ? 'pass' : 'fail';
      const rowKey = ability + ':' + item;
      rowKeySet.add(rowKey);
      appointmentMap.set(rowKey, status);
    }
  }

  // sort row keys by ability then item
  const rowKeys = Array.from(rowKeySet);
  rowKeys.sort((a, b) => {
    const [aa, ai] = a.split(':');
    const [ba, bi] = b.split(':');
    if (aa !== ba) return aa.localeCompare(ba);
    return ai.localeCompare(bi);
  });

  // unique teacher ids (normalized), keep display of first seen
  const teachers = Array.from(new Set(Array.from(appointmentToTeacher.values()))).filter((t) => t !== '');
  teachers.sort((a, b) => a.localeCompare(b));

  return {
    headers,
    rowKeys,
    appointmentToTeacher,
    teacherDisplayMap,
    appointmentDisplayMap,
    appointmentCreatedAtMap,
    dataset,
    teachers,
  };
}

function buildMappingFromConstant(): Mapping {
  const order: string[] = [];
  const labelByRowKey = new Map<string, string>();
  const seen = new Set<string>();
  for (const item of BEHAVIOR_MAPPING) {
    if (!item) continue;
    const ability = String(item.ability_key || '').trim();
    const key = String(item.item_key || '').trim();
    if (!ability || !key) continue;
    const rowKey = ability + ':' + key;
    if (!seen.has(rowKey)) {
      seen.add(rowKey);
      order.push(rowKey);
    }
    const rawLabel = item.label;
    const label = String(rawLabel == null || rawLabel === '' ? ability + ' / ' + key : rawLabel).trim();
    labelByRowKey.set(rowKey, label);
  }
  return { order, labelByRowKey };
}

const SAMPLE_CSV = `analysis → items,created_at,teacher_id,appointment_id
"[{""status"": ""pass"", ""item_key"": ""purpose"", ""ability_key"": ""clarify_needs""}, {""status"": ""pass"", ""item_key"": ""context"", ""ability_key"": ""clarify_needs""}, {""status"": ""fail"", ""item_key"": ""target_level"", ""ability_key"": ""clarify_needs""}, {""status"": ""fail"", ""item_key"": ""past_experience"", ""ability_key"": ""clarify_needs""}, {""status"": ""fail"", ""item_key"": ""motivation"", ""ability_key"": ""clarify_needs""}, {""status"": ""fail"", ""item_key"": ""focus_skill"", ""ability_key"": ""level_analysis""}, {""status"": ""fail"", ""item_key"": ""exam_or_self_rating"", ""ability_key"": ""level_analysis""}, {""status"": ""fail"", ""item_key"": ""quick_assessment"", ""ability_key"": ""level_analysis""}, {""status"": ""fail"", ""item_key"": ""quantified_level"", ""ability_key"": ""level_analysis""}, {""status"": ""pass"", ""item_key"": ""current_weakness"", ""ability_key"": ""level_analysis""}, {""status"": ""pass"", ""item_key"": ""improvement_direction"", ""ability_key"": ""level_analysis""}, {""status"": ""fail"", ""item_key"": ""why_past_ineffective"", ""ability_key"": ""level_analysis""}, {""status"": ""pass"", ""item_key"": ""materials_or_methods"", ""ability_key"": ""demo_teaching""}, {""status"": ""pass"", ""item_key"": ""invite_practice"", ""ability_key"": ""demo_teaching""}, {""status"": ""pass"", ""item_key"": ""why_suitable"", ""ability_key"": ""demo_teaching""}, {""status"": ""pass"", ""item_key"": ""student_feedback"", ""ability_key"": ""demo_teaching""}, {""status"": ""fail"", ""item_key"": ""specific_feedback"", ""ability_key"": ""demo_teaching""}, {""status"": ""pass"", ""item_key"": ""future_direction"", ""ability_key"": ""demo_teaching""}, {""status"": ""pass"", ""item_key"": ""share_experience"", ""ability_key"": ""learning_plan""}, {""status"": ""pass"", ""item_key"": ""plan_matches_needs"", ""ability_key"": ""learning_plan""}, {""status"": ""fail"", ""item_key"": ""long_term_goal"", ""ability_key"": ""learning_plan""}, {""status"": ""fail"", ""item_key"": ""breakdown_to_tasks"", ""ability_key"": ""learning_plan""}, {""status"": ""pass"", ""item_key"": ""express_or_ask_concerns"", ""ability_key"": ""address_concerns""}, {""status"": ""pass"", ""item_key"": ""address_concerns_solution"", ""ability_key"": ""address_concerns""}, {""status"": ""pass"", ""item_key"": ""after_class_resources"", ""ability_key"": ""address_concerns""}, {""status"": ""fail"", ""item_key"": ""promotion_or_package"", ""ability_key"": ""address_concerns""}, {""status"": ""pass"", ""item_key"": ""plan_or_frequency"", ""ability_key"": ""address_concerns""}]","Nov 14, 2025, 2:22 AM","848,906","26,774,675"
"[{""status"": ""pass"", ""item_key"": ""purpose"", ""ability_key"": ""clarify_needs""}, {""status"": ""pass"", ""item_key"": ""context"", ""ability_key"": ""clarify_needs""}, {""status"": ""fail"", ""item_key"": ""target_level"", ""ability_key"": ""clarify_needs""}, {""status"": ""fail"", ""item_key"": ""past_experience"", ""ability_key"": ""clarify_needs""}, {""status"": ""pass"", ""item_key"": ""motivation"", ""ability_key"": ""clarify_needs""}, {""status"": ""pass"", ""item_key"": ""focus_skill"", ""ability_key"": ""level_analysis""}, {""status"": ""fail"", ""item_key"": ""exam_or_self_rating"", ""ability_key"": ""level_analysis""}, {""status"": ""pass"", ""item_key"": ""quick_assessment"", ""ability_key"": ""level_analysis""}, {""status"": ""fail"", ""item_key"": ""quantified_level"", ""ability_key"": ""level_analysis""}, {""status"": ""pass"", ""item_key"": ""current_weakness"", ""ability_key"": ""level_analysis""}, {""status"": ""pass"", ""item_key"": ""improvement_direction"", ""ability_key"": ""level_analysis""}, {""status"": ""pass"", ""item_key"": ""why_past_ineffective"", ""ability_key"": ""level_analysis""}, {""status"": ""pass"", ""item_key"": ""materials_or_methods"", ""ability_key"": ""demo_teaching""}, {""status"": ""pass"", ""item_key"": ""invite_practice"", ""ability_key"": ""demo_teaching""}, {""status"": ""pass"", ""item_key"": ""why_suitable"", ""ability_key"": ""demo_teaching""}, {""status"": ""fail"", ""item_key"": ""student_feedback"", ""ability_key"": ""demo_teaching""}, {""status"": ""pass"", ""item_key"": ""specific_feedback"", ""ability_key"": ""demo_teaching""}, {""status"": ""pass"", ""item_key"": ""future_direction"", ""ability_key"": ""demo_teaching""}, {""status"": ""pass"", ""item_key"": ""share_experience"", ""ability_key"": ""learning_plan""}, {""status"": ""pass"", ""item_key"": ""plan_matches_needs"", ""ability_key"": ""learning_plan""}, {""status"": ""fail"", ""item_key"": ""long_term_goal"", ""ability_key"": ""learning_plan""}, {""status"": ""pass"", ""item_key"": ""breakdown_to_tasks"", ""ability_key"": ""learning_plan""}, {""status"": ""pass"", ""item_key"": ""express_or_ask_concerns"", ""ability_key"": ""address_concerns""}, {""status"": ""pass"", ""item_key"": ""address_concerns_solution"", ""ability_key"": ""address_concerns""}, {""status"": ""fail"", ""item_key"": ""after_class_resources"", ""ability_key"": ""address_concerns""}, {""status"": ""fail"", ""item_key"": ""promotion_or_package"", ""ability_key"": ""address_concerns""}, {""status"": ""pass"", ""item_key"": ""plan_or_frequency"", ""ability_key"": ""address_concerns""}]","Nov 15, 2025, 2:12 PM","857,181","26,795,964"
"[{""status"": ""pass"", ""item_key"": ""purpose"", ""ability_key"": ""clarify_needs""}, {""status"": ""pass"", ""item_key"": ""context"", ""ability_key"": ""clarify_needs""}, {""status"": ""pass"", ""item_key"": ""target_level"", ""ability_key"": ""clarify_needs""}, {""status"": ""fail"", ""item_key"": ""past_experience"", ""ability_key"": ""clarify_needs""}, {""status"": ""pass"", ""item_key"": ""motivation"", ""ability_key"": ""clarify_needs""}, {""status"": ""pass"", ""item_key"": ""focus_skill"", ""ability_key"": ""level_analysis""}, {""status"": ""pass"", ""item_key"": ""exam_or_self_rating"", ""ability_key"": ""level_analysis""}, {""status"": ""pass"", ""item_key"": ""quick_assessment"", ""ability_key"": ""level_analysis""}, {""status"": ""fail"", ""item_key"": ""quantified_level"", ""ability_key"": ""level_analysis""}, {""status"": ""fail"", ""item_key"": ""current_weakness"", ""ability_key"": ""level_analysis""}, {""status"": ""pass"", ""item_key"": ""improvement_direction"", ""ability_key"": ""level_analysis""}, {""status"": ""fail"", ""item_key"": ""why_past_ineffective"", ""ability_key"": ""level_analysis""}, {""status"": ""pass"", ""item_key"": ""materials_or_methods"", ""ability_key"": ""demo_teaching""}, {""status"": ""pass"", ""item_key"": ""invite_practice"", ""ability_key"": ""demo_teaching""}, {""status"": ""pass"", ""item_key"": ""why_suitable"", ""ability_key"": ""demo_teaching""}, {""status"": ""fail"", ""item_key"": ""student_feedback"", ""ability_key"": ""demo_teaching""}, {""status"": ""pass"", ""item_key"": ""specific_feedback"", ""ability_key"": ""demo_teaching""}, {""status"": ""pass"", ""item_key"": ""future_direction"", ""ability_key"": ""demo_teaching""}, {""status"": ""pass"", ""item_key"": ""share_experience"", ""ability_key"": ""learning_plan""}, {""status"": ""pass"", ""item_key"": ""plan_matches_needs"", ""ability_key"": ""learning_plan""}, {""status"": ""pass"", ""item_key"": ""long_term_goal"", ""ability_key"": ""learning_plan""}, {""status"": ""pass"", ""item_key"": ""breakdown_to_tasks"", ""ability_key"": ""learning_plan""}, {""status"": ""pass"", ""item_key"": ""express_or_ask_concerns"", ""ability_key"": ""address_concerns""}, {""status"": ""pass"", ""item_key"": ""address_concerns_solution"", ""ability_key"": ""address_concerns""}, {""status"": ""fail"", ""item_key"": ""after_class_resources"", ""ability_key"": ""address_concerns""}, {""status"": ""fail"", ""item_key"": ""promotion_or_package"", ""ability_key"": ""address_concerns""}, {""status"": ""pass"", ""item_key"": ""plan_or_frequency"", ""ability_key"": ""address_concerns""}]","Nov 16, 2025, 8:02 AM","857,181","26,810,808"
"[{""status"": ""pass"", ""item_key"": ""purpose"", ""ability_key"": ""clarify_needs""}, {""status"": ""pass"", ""item_key"": ""context"", ""ability_key"": ""clarify_needs""}, {""status"": ""pass"", ""item_key"": ""target_level"", ""ability_key"": ""clarify_needs""}, {""status"": ""pass"", ""item_key"": ""past_experience"", ""ability_key"": ""clarify_needs""}, {""status"": ""pass"", ""item_key"": ""motivation"", ""ability_key"": ""clarify_needs""}, {""status"": ""pass"", ""item_key"": ""focus_skill"", ""ability_key"": ""level_analysis""}, {""status"": ""fail"", ""item_key"": ""exam_or_self_rating"", ""ability_key"": ""level_analysis""}, {""status"": ""fail"", ""item_key"": ""quick_assessment"", ""ability_key"": ""level_analysis""}, {""status"": ""fail"", ""item_key"": ""quantified_level"", ""ability_key"": ""level_analysis""}, {""status"": ""pass"", ""item_key"": ""current_weakness"", ""ability_key"": ""level_analysis""}, {""status"": ""pass"", ""item_key"": ""improvement_direction"", ""ability_key"": ""level_analysis""}, {""status"": ""pass"", ""item_key"": ""why_past_ineffective"", ""ability_key"": ""level_analysis""}, {""status"": ""fail"", ""item_key"": ""materials_or_methods"", ""ability_key"": ""demo_teaching""}, {""status"": ""fail"", ""item_key"": ""invite_practice"", ""ability_key"": ""demo_teaching""}, {""status"": ""fail"", ""item_key"": ""why_suitable"", ""ability_key"": ""demo_teaching""}, {""status"": ""fail"", ""item_key"": ""student_feedback"", ""ability_key"": ""demo_teaching""}, {""status"": ""fail"", ""item_key"": ""specific_feedback"", ""ability_key"": ""demo_teaching""}, {""status"": ""fail"", ""item_key"": ""future_direction"", ""ability_key"": ""demo_teaching""}, {""status"": ""fail"", ""item_key"": ""share_experience"", ""ability_key"": ""learning_plan""}, {""status"": ""fail"", ""item_key"": ""plan_matches_needs"", ""ability_key"": ""learning_plan""}, {""status"": ""fail"", ""item_key"": ""long_term_goal"", ""ability_key"": ""learning_plan""}, {""status"": ""fail"", ""item_key"": ""breakdown_to_tasks"", ""ability_key"": ""learning_plan""}, {""status"": ""pass"", ""item_key"": ""express_or_ask_concerns"", ""ability_key"": ""address_concerns""}, {""status"": ""fail"", ""item_key"": ""address_concerns_solution"", ""ability_key"": ""address_concerns""}, {""status"": ""fail"", ""item_key"": ""after_class_resources"", ""ability_key"": ""address_concerns""}, {""status"": ""fail"", ""item_key"": ""promotion_or_package"", ""ability_key"": ""address_concerns""}, {""status"": ""fail"", ""item_key"": ""plan_or_frequency"", ""ability_key"": ""address_concerns""}]","Nov 17, 2025, 6:42 AM","294,989","26,827,539"
"[{""status"": ""pass"", ""item_key"": ""purpose"", ""ability_key"": ""clarify_needs""}, {""status"": ""pass"", ""item_key"": ""context"", ""ability_key"": ""clarify_needs""}, {""status"": ""pass"", ""item_key"": ""target_level"", ""ability_key"": ""clarify_needs""}, {""status"": ""fail"", ""item_key"": ""past_experience"", ""ability_key"": ""clarify_needs""}, {""status"": ""pass"", ""item_key"": ""motivation"", ""ability_key"": ""clarify_needs""}, {""status"": ""pass"", ""item_key"": ""focus_skill"", ""ability_key"": ""level_analysis""}, {""status"": ""fail"", ""item_key"": ""exam_or_self_rating"", ""ability_key"": ""level_analysis""}, {""status"": ""fail"", ""item_key"": ""quick_assessment"", ""ability_key"": ""level_analysis""}, {""status"": ""fail"", ""item_key"": ""quantified_level"", ""ability_key"": ""level_analysis""}, {""status"": ""pass"", ""item_key"": ""current_weakness"", ""ability_key"": ""level_analysis""}, {""status"": ""pass"", ""item_key"": ""improvement_direction"", ""ability_key"": ""level_analysis""}, {""status"": ""fail"", ""item_key"": ""why_past_ineffective"", ""ability_key"": ""level_analysis""}, {""status"": ""pass"", ""item_key"": ""materials_or_methods"", ""ability_key"": ""demo_teaching""}, {""status"": ""pass"", ""item_key"": ""invite_practice"", ""ability_key"": ""demo_teaching""}, {""status"": ""pass"", ""item_key"": ""why_suitable"", ""ability_key"": ""demo_teaching""}, {""status"": ""pass"", ""item_key"": ""student_feedback"", ""ability_key"": ""demo_teaching""}, {""status"": ""pass"", ""item_key"": ""specific_feedback"", ""ability_key"": ""demo_teaching""}, {""status"": ""pass"", ""item_key"": ""future_direction"", ""ability_key"": ""demo_teaching""}, {""status"": ""pass"", ""item_key"": ""share_experience"", ""ability_key"": ""learning_plan""}, {""status"": ""pass"", ""item_key"": ""plan_matches_needs"", ""ability_key"": ""learning_plan""}, {""status"": ""fail"", ""item_key"": ""long_term_goal"", ""ability_key"": ""learning_plan""}, {""status"": ""pass"", ""item_key"": ""breakdown_to_tasks"", ""ability_key"": ""learning_plan""}, {""status"": ""pass"", ""item_key"": ""express_or_ask_concerns"", ""ability_key"": ""address_concerns""}, {""status"": ""pass"", ""item_key"": ""address_concerns_solution"", ""ability_key"": ""address_concerns""}, {""status"": ""fail"", ""item_key"": ""after_class_resources"", ""ability_key"": ""address_concerns""}, {""status"": ""fail"", ""item_key"": ""promotion_or_package"", ""ability_key"": ""address_concerns""}, {""status"": ""pass"", ""item_key"": ""plan_or_frequency"", ""ability_key"": ""address_concerns""}]","Nov 17, 2025, 12:09 PM","857,181","26,815,929"
"[{""status"": ""pass"", ""item_key"": ""purpose"", ""ability_key"": ""clarify_needs""}, {""status"": ""pass"", ""item_key"": ""context"", ""ability_key"": ""clarify_needs""}, {""status"": ""pass"", ""item_key"": ""target_level"", ""ability_key"": ""clarify_needs""}, {""status"": ""fail"", ""item_key"": ""past_experience"", ""ability_key"": ""clarify_needs""}, {""status"": ""pass"", ""item_key"": ""motivation"", ""ability_key"": ""clarify_needs""}, {""status"": ""pass"", ""item_key"": ""focus_skill"", ""ability_key"": ""level_analysis""}, {""status"": ""fail"", ""item_key"": ""exam_or_self_rating"", ""ability_key"": ""level_analysis""}, {""status"": ""pass"", ""item_key"": ""quick_assessment"", ""ability_key"": ""level_analysis""}, {""status"": ""fail"", ""item_key"": ""quantified_level"", ""ability_key"": ""level_analysis""}, {""status"": ""pass"", ""item_key"": ""current_weakness"", ""ability_key"": ""level_analysis""}, {""status"": ""pass"", ""item_key"": ""improvement_direction"", ""ability_key"": ""level_analysis""}, {""status"": ""fail"", ""item_key"": ""why_past_ineffective"", ""ability_key"": ""level_analysis""}, {""status"": ""pass"", ""item_key"": ""materials_or_methods"", ""ability_key"": ""demo_teaching""}, {""status"": ""pass"", ""item_key"": ""invite_practice"", ""ability_key"": ""demo_teaching""}, {""status"": ""pass"", ""item_key"": ""why_suitable"", ""ability_key"": ""demo_teaching""}, {""status"": ""fail"", ""item_key"": ""student_feedback"", ""ability_key"": ""demo_teaching""}, {""status"": ""pass"", ""item_key"": ""specific_feedback"", ""ability_key"": ""demo_teaching""}, {""status"": ""pass"", ""item_key"": ""future_direction"", ""ability_key"": ""demo_teaching""}, {""status"": ""pass"", ""item_key"": ""share_experience"", ""ability_key"": ""learning_plan""}, {""status"": ""pass"", ""item_key"": ""plan_matches_needs"", ""ability_key"": ""learning_plan""}, {""status"": ""pass"", ""item_key"": ""long_term_goal"", ""ability_key"": ""learning_plan""}, {""status"": ""pass"", ""item_key"": ""breakdown_to_tasks"", ""ability_key"": ""learning_plan""}, {""status"": ""pass"", ""item_key"": ""express_or_ask_concerns"", ""ability_key"": ""address_concerns""}, {""status"": ""pass"", ""item_key"": ""address_concerns_solution"", ""ability_key"": ""address_concerns""}, {""status"": ""fail"", ""item_key"": ""after_class_resources"", ""ability_key"": ""address_concerns""}, {""status"": ""fail"", ""item_key"": ""promotion_or_package"", ""ability_key"": ""address_concerns""}, {""status"": ""pass"", ""item_key"": ""plan_or_frequency"", ""ability_key"": ""address_concerns""}]","Nov 17, 2025, 1:05 PM","857,181","26,814,762"
"[{""status"": ""pass"", ""item_key"": ""purpose"", ""ability_key"": ""clarify_needs""}, {""status"": ""pass"", ""item_key"": ""context"", ""ability_key"": ""clarify_needs""}, {""status"": ""pass"", ""item_key"": ""target_level"", ""ability_key"": ""clarify_needs""}, {""status"": ""pass"", ""item_key"": ""past_experience"", ""ability_key"": ""clarify_needs""}, {""status"": ""pass"", ""item_key"": ""motivation"", ""ability_key"": ""clarify_needs""}, {""status"": ""pass"", ""item_key"": ""focus_skill"", ""ability_key"": ""level_analysis""}, {""status"": ""pass"", ""item_key"": ""exam_or_self_rating"", ""ability_key"": ""level_analysis""}, {""status"": ""pass"", ""item_key"": ""quick_assessment"", ""ability_key"": ""level_analysis""}, {""status"": ""fail"", ""item_key"": ""quantified_level"", ""ability_key"": ""level_analysis""}, {""status"": ""pass"", ""item_key"": ""current_weakness"", ""ability_key"": ""level_analysis""}, {""status"": ""pass"", ""item_key"": ""improvement_direction"", ""ability_key"": ""level_analysis""}, {""status"": ""fail"", ""item_key"": ""why_past_ineffective"", ""ability_key"": ""level_analysis""}, {""status"": ""pass"", ""item_key"": ""materials_or_methods"", ""ability_key"": ""demo_teaching""}, {""status"": ""pass"", ""item_key"": ""invite_practice"", ""ability_key"": ""demo_teaching""}, {""status"": ""pass"", ""item_key"": ""why_suitable"", ""ability_key"": ""demo_teaching""}, {""status"": ""pass"", ""item_key"": ""student_feedback"", ""ability_key"": ""demo_teaching""}, {""status"": ""pass"", ""item_key"": ""specific_feedback"", ""ability_key"": ""demo_teaching""}, {""status"": ""pass"", ""item_key"": ""future_direction"", ""ability_key"": ""demo_teaching""}, {""status"": ""pass"", ""item_key"": ""share_experience"", ""ability_key"": ""learning_plan""}, {""status"": ""pass"", ""item_key"": ""plan_matches_needs"", ""ability_key"": ""learning_plan""}, {""status"": ""pass"", ""item_key"": ""long_term_goal"", ""ability_key"": ""learning_plan""}, {""status"": ""pass"", ""item_key"": ""breakdown_to_tasks"", ""ability_key"": ""learning_plan""}, {""status"": ""pass"", ""item_key"": ""express_or_ask_concerns"", ""ability_key"": ""address_concerns""}, {""status"": ""pass"", ""item_key"": ""address_concerns_solution"", ""ability_key"": ""address_concerns""}, {""status"": ""fail"", ""item_key"": ""after_class_resources"", ""ability_key"": ""address_concerns""}, {""status"": ""pass"", ""item_key"": ""promotion_or_package"", ""ability_key"": ""address_concerns""}, {""status"": ""pass"", ""item_key"": ""plan_or_frequency"", ""ability_key"": ""address_concerns""}]","Nov 18, 2025, 10:10 AM","857,181","26,832,704"`;

export default function TrialClassAnalysisResultParserPage() {
  const [csvInput, setCsvInput] = useState('');
  const [model, setModel] = useState<Model | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState('__ALL__');
  const [status, setStatus] = useState('');
  const [tooltip, setTooltip] = useState({ show: false, text: '', x: 0, y: 0 });
  const tableRef = useRef<HTMLTableElement>(null);
  const mapping = buildMappingFromConstant();

  const handleLoadSample = () => {
    setCsvInput(SAMPLE_CSV);
    setStatus('已載入範例到文字框。點擊「解析 CSV」以顯示結果。');
  };

  const handleParse = () => {
    const text = csvInput.trim();
    if (!text) {
      setStatus('請先貼上 CSV 內容。');
      return;
    }
    setStatus('解析中…');
    try {
      const rows = parseCsv(text);
      const newModel = buildModel(rows);
      setModel(newModel);
      setSelectedTeacher('__ALL__');
      const dataCount = newModel.dataset.size;
      const rowCount = newModel.rowKeys.length;
      const teacherCount = newModel.teachers.length;
      setStatus(`✓ 解析成功！找到 ${dataCount} 筆 appointment、${rowCount} 個評估項目、${teacherCount} 位教師`);
    } catch (err) {
      console.error(err);
      setStatus('✗ 解析失敗：' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleTooltip = (e: React.MouseEvent<HTMLTableCellElement>, text: string) => {
    if (text) {
      setTooltip({ show: true, text, x: e.clientX + 12, y: e.clientY + 12 });
    }
  };

  const handleTooltipMove = (e: React.MouseEvent<HTMLTableElement>) => {
    if (tooltip.show) {
      setTooltip({ ...tooltip, x: e.clientX + 12, y: e.clientY + 12 });
    }
  };

  const handleTooltipLeave = () => {
    setTooltip({ show: false, text: '', x: 0, y: 0 });
  };

  if (!model) {
    return (
      <main className="min-h-screen bg-white">
        <style jsx>{`
          :root {
            --green-bg: #dcfce7;
            --green-fg: #166534;
            --red-bg: #fee2e2;
            --red-fg: #991b1b;
            --border: #e5e7eb;
            --header-bg: #f8fafc;
            --text: #111827;
            --muted: #6b7280;
          }
        `}</style>
        <div className="max-w-[1200px] mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold m-0">Training Result Reader</h2>
            <a
              href="/admin"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
            >
              ← 返回管理後台
            </a>
          </div>
          <div className="flex flex-wrap gap-3 items-center mb-3">
            <div className="inline-flex items-center gap-2">
              <label htmlFor="teacherFilter" className="text-sm">teacher_id</label>
              <select id="teacherFilter" className="text-sm px-2.5 py-2 border border-gray-300 rounded-lg bg-white" disabled>
                <option value="__ALL__">全部</option>
              </select>
            </div>
            <div className="inline-flex items-center gap-2">
              <button
                type="button"
                onClick={handleLoadSample}
                className="text-sm px-2.5 py-2 border border-gray-900 rounded-lg bg-gray-900 text-white cursor-pointer hover:opacity-90"
              >
                載入範例
              </button>
              <button
                type="button"
                onClick={handleParse}
                className="text-sm px-2.5 py-2 border border-gray-900 rounded-lg bg-gray-900 text-white cursor-pointer hover:opacity-90"
              >
                解析 CSV
              </button>
            </div>
          </div>
          <div className="text-gray-500 text-[13px] mb-2.5">
            請將 CSV 內容貼到下方文字框，然後點擊「解析 CSV」。列為 ability_key + item_key，欄為 appointment_id；達成顯示綠色，未達成顯示紅色。ALL
            依目前篩選計算總覽與達成率（缺失視為未達成）。
          </div>
          <div className="mb-3">
            <textarea
              id="csvInput"
              placeholder="請貼上 CSV 內容..."
              value={csvInput}
              onChange={(e) => setCsvInput(e.target.value)}
              className="w-full min-h-[120px] font-mono text-[13px] p-2.5 border border-gray-300 rounded-lg resize-y"
            />
          </div>
          <div className="flex items-center gap-3.5 my-2 text-[13px] text-gray-500">
            <span className="inline-flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full border inline-block"
                style={{ backgroundColor: '#dcfce7', borderColor: '#166534' }}
              ></span>
              達成
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full border inline-block"
                style={{ backgroundColor: '#fee2e2', borderColor: '#991b1b' }}
              ></span>
              未達成
            </span>
          </div>
          <div className="border border-gray-300 rounded-[10px] overflow-hidden">
            <div className="overflow-auto max-w-full">
              <table className="w-max min-w-full border-collapse border-spacing-0 text-sm" aria-label="analysis result table">
                <thead></thead>
                <tbody>
                  <tr>
                    <td className="p-10 text-center text-gray-500">
                      尚未載入資料。請貼上 CSV 內容後點擊「解析 CSV」。
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          {status && <div className="mt-2.5 text-[13px] text-gray-500">{status}</div>}
        </div>
      </main>
    );
  }

  const allAppointments = Array.from(model.dataset.keys());
  const visibleAppointments = allAppointments
    .filter((a) => {
      if (selectedTeacher === '__ALL__') return true;
      const t = model.appointmentToTeacher.get(a) || '';
      return t === selectedTeacher;
    })
    .sort((a, b) => a.localeCompare(b));

  let effectiveRowKeys = model.rowKeys.slice();
  if (mapping && Array.isArray(mapping.order)) {
    const inMap: string[] = [];
    const mappedSet = new Set(mapping.order);
    for (const rk of mapping.order) {
      if (effectiveRowKeys.includes(rk)) inMap.push(rk);
    }
    const rest = effectiveRowKeys.filter((rk) => !mappedSet.has(rk));
    effectiveRowKeys = inMap.concat(rest);
  }

  const colPassCounts = new Array(visibleAppointments.length).fill(0);

  return (
    <main className="min-h-screen bg-white">
      <style jsx>{`
        :root {
          --green-bg: #dcfce7;
          --green-fg: #166534;
          --red-bg: #fee2e2;
          --red-fg: #991b1b;
          --border: #e5e7eb;
          --header-bg: #f8fafc;
          --text: #111827;
          --muted: #6b7280;
        }
        .tooltip-bubble {
          position: fixed;
          z-index: 9999;
          max-width: 320px;
          background: #111827;
          color: #f9fafb;
          padding: 8px 10px;
          border-radius: 6px;
          font-size: 12px;
          box-shadow: 0 10px 25px rgba(15, 23, 42, 0.45);
          pointer-events: none;
          opacity: 0;
          transform: translateY(4px);
          transition: opacity 0.08s ease-out, transform 0.08s ease-out;
        }
        .tooltip-bubble.show {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
      <div className="max-w-[1200px] mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold m-0">Training Result Reader</h2>
          <a
            href="/admin"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
          >
            ← 返回管理後台
          </a>
        </div>
        <div className="flex flex-wrap gap-3 items-center mb-3">
          <div className="inline-flex items-center gap-2">
            <label htmlFor="teacherFilter" className="text-sm">teacher_id</label>
            <select
              id="teacherFilter"
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value || '__ALL__')}
              className="text-sm px-2.5 py-2 border border-gray-300 rounded-lg bg-white"
            >
              <option value="__ALL__">全部</option>
              {model.teachers.map((teacher) => (
                <option key={teacher} value={teacher}>
                  {model.teacherDisplayMap.get(teacher) || teacher}
                </option>
              ))}
            </select>
          </div>
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={handleLoadSample}
              className="text-sm px-2.5 py-2 border border-gray-900 rounded-lg bg-gray-900 text-white cursor-pointer hover:opacity-90"
            >
              載入範例
            </button>
            <button
              type="button"
              onClick={handleParse}
              className="text-sm px-2.5 py-2 border border-gray-900 rounded-lg bg-gray-900 text-white cursor-pointer hover:opacity-90"
            >
              解析 CSV
            </button>
          </div>
        </div>
        <div className="text-gray-500 text-[13px] mb-2.5">
          請將 CSV 內容貼到下方文字框，然後點擊「解析 CSV」。列為 ability_key + item_key，欄為 appointment_id；達成顯示綠色，未達成顯示紅色。ALL
          依目前篩選計算總覽與達成率（缺失視為未達成）。
        </div>
        <div className="mb-3">
          <textarea
            id="csvInput"
            placeholder="請貼上 CSV 內容..."
            value={csvInput}
            onChange={(e) => setCsvInput(e.target.value)}
            className="w-full min-h-[120px] font-mono text-[13px] p-2.5 border border-gray-300 rounded-lg resize-y"
          />
        </div>
        <div className="flex items-center gap-3.5 my-2 text-[13px] text-gray-500">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full border inline-block"
              style={{ backgroundColor: '#dcfce7', borderColor: '#166534' }}
            ></span>
            達成
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full border inline-block"
              style={{ backgroundColor: '#fee2e2', borderColor: '#991b1b' }}
            ></span>
            未達成
          </span>
        </div>
        <div className="border border-gray-300 rounded-[10px] overflow-hidden">
          <div className="overflow-auto max-w-full">
            <table
              ref={tableRef}
              className="w-max min-w-full border-collapse border-spacing-0 text-sm"
              aria-label="analysis result table"
              onMouseMove={handleTooltipMove}
              onMouseLeave={handleTooltipLeave}
            >
              <thead>
                <tr>
                  <th
                    className="sticky top-0 left-0 bg-[var(--header-bg)] z-[6] text-left font-semibold border-b border-r border-gray-300 py-2.5 px-3 whitespace-nowrap max-w-[220px]"
                    style={{ backgroundColor: 'var(--header-bg)' }}
                  >
                    ability_key / item_key
                  </th>
                  {visibleAppointments.map((appt) => {
                    const idLabel = model.appointmentDisplayMap.get(appt) || appt;
                    const createdAt = model.appointmentCreatedAtMap.get(appt);
                    return (
                      <th
                        key={appt}
                        className="sticky top-0 bg-[var(--header-bg)] z-[5] text-left font-semibold border-b border-r border-gray-300 py-2.5 px-3 whitespace-nowrap"
                        style={{ backgroundColor: 'var(--header-bg)' }}
                      >
                        {createdAt ? (
                          <>
                            {idLabel}
                            <br />
                            <span className="text-gray-500">{createdAt}</span>
                          </>
                        ) : (
                          idLabel
                        )}
                      </th>
                    );
                  })}
                  <th
                    className="sticky top-0 bg-[var(--header-bg)] z-[5] text-left font-semibold border-b border-gray-300 py-2.5 px-3 whitespace-nowrap font-semibold bg-gray-50"
                    style={{ backgroundColor: '#fafafa' }}
                  >
                    ALL
                  </th>
                </tr>
              </thead>
              <tbody>
                {effectiveRowKeys.map((rowKey) => {
                  const [ability, item] = rowKey.split(':');
                  let passCount = 0;
                  const total = visibleAppointments.length;

                  const baseText = ability + ' / ' + item;
                  let tooltipText = baseText;
                  if (mapping && mapping.labelByRowKey && mapping.labelByRowKey.has(rowKey)) {
                    tooltipText = mapping.labelByRowKey.get(rowKey) || baseText;
                  }

                  return (
                    <tr key={rowKey}>
                      <td
                        className="sticky left-0 bg-white text-left font-medium border-r border-b border-gray-300 max-w-[220px] py-2 px-2.5 z-[4]"
                        style={{ backgroundColor: '#fff' }}
                        title={tooltipText}
                        data-tooltip={tooltipText}
                        onMouseEnter={(e) => handleTooltip(e, tooltipText)}
                      >
                        {baseText}
                      </td>
                      {visibleAppointments.map((appt, colIdx) => {
                        const m = model.dataset.get(appt);
                        const status = m ? m.get(rowKey) : undefined;
                        const isPass = status === 'pass';
                        if (isPass) {
                          passCount += 1;
                          colPassCounts[colIdx] += 1;
                        }

                        return (
                          <td
                            key={appt}
                            className="py-2 px-2.5 text-center whitespace-nowrap border-b border-gray-300 border-r border-gray-300 font-semibold"
                            style={{
                              backgroundColor: isPass ? '#dcfce7' : '#fee2e2',
                              color: isPass ? '#166534' : '#991b1b',
                            }}
                          >
                            {isPass ? '✓' : '✗'}
                          </td>
                        );
                      })}
                      <td className="font-semibold bg-gray-50 py-2 px-2.5 text-center whitespace-nowrap border-b border-gray-300" style={{ backgroundColor: '#fafafa' }}>
                        {passCount}/{total} ({safePercent(passCount, total)})
                      </td>
                    </tr>
                  );
                })}
                {effectiveRowKeys.length > 0 && visibleAppointments.length > 0 && (
                  <tr>
                    <td
                      className="sticky left-0 bg-white text-left font-medium border-r border-gray-300 max-w-[220px] py-2 px-2.5 z-[4] font-semibold bg-gray-50"
                      style={{ backgroundColor: '#fafafa' }}
                    >
                      達成率 (每欄)
                    </td>
                    {colPassCounts.map((passCount, idx) => {
                      const totalRows = effectiveRowKeys.length;
                      return (
                        <td
                          key={idx}
                          className="font-semibold bg-gray-50 py-2 px-2.5 text-center whitespace-nowrap border-b-0 border-r border-gray-300"
                          style={{ backgroundColor: '#fafafa' }}
                        >
                          {passCount}/{totalRows} ({safePercent(passCount, totalRows)})
                        </td>
                      );
                    })}
                    <td className="font-semibold bg-gray-50 py-2 px-2.5 text-center whitespace-nowrap border-b-0" style={{ backgroundColor: '#fafafa' }}>
                      {colPassCounts.reduce((a, b) => a + b, 0)}/{effectiveRowKeys.length * visibleAppointments.length} (
                      {safePercent(
                        colPassCounts.reduce((a, b) => a + b, 0),
                        effectiveRowKeys.length * visibleAppointments.length
                      )}
                      )
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        {status && <div className="mt-2.5 text-[13px] text-gray-500">{status}</div>}
        {tooltip.show && (
          <div
            className="tooltip-bubble show"
            style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
          >
            {tooltip.text}
          </div>
        )}
      </div>
    </main>
  );
}
