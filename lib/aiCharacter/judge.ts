import { createRoleAsk } from './utils/createRoleAsk';
import type { AIRole } from './types';

type JudgeVariables = {
  chat_history: string;
  check_list: string;
};

export const judgeRole: AIRole<JudgeVariables> = {
  name: 'judge',
  ask: createRoleAsk<JudgeVariables>({
    botIdEnvVar: 'OPENAI_JUDGE_BOT_ID',
  }),
};
