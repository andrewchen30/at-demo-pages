import type { DirectorInput } from '../../student/types';
import { getCheckListForAI } from './getCheckListForAI';

export interface CoachAIParams {
  check_list: string;
}

export function getCoachAIParams(input: DirectorInput, partN: number): CoachAIParams {
  return {
    check_list: getCheckListForAI(partN),
  };
}
