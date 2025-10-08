import type { DirectorInput } from '../../student/types';

export interface StudentAIParams {
  persona: string;
  dialog: string;
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

export function getStudentAIParams(input: DirectorInput, partN: number): StudentAIParams {
  return {
    persona: getPersona(input, partN),
    dialog: getDialog(input, partN),
  };
}

