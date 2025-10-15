import { createRoleAsk } from './utils/createRoleAsk';
import type { AIRole } from './types';

type CoachVariables = {
  judge_output: string;
  chat_history: string;
};

export const coachRole: AIRole<CoachVariables> = {
  name: 'coach',
  ask: createRoleAsk<CoachVariables>({
    botIdEnvVar: 'OPENAI_COACH_BOT_ID',
  }),
};
