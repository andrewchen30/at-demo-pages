import type { DirectorInput, PersonaEntry } from '../../student/types';
import { getCheckListForTeacher } from './getCheckListForTeacher';

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

function getDialog(input: DirectorInput, partN: number): string {
  const scriptObj = (input.scripts || []).find((s) => s.index === partN - 1);
  const dialogPart = scriptObj ? scriptObj.script.join('\n') : '';
  return dialogPart;
}

export function getTeacherHintText(input: DirectorInput, partN: number): string {
  return `【背景資訊】\n${getUserBrief(input, partN)}\n\n【對話內容】\n${getDialog(
    input,
    partN
  )}\n\n【檢查重點】\n${getCheckListForTeacher(partN)}`;
}

