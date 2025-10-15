import { createRoleAsk } from '../utils/createRoleAsk';
import type { AIRole } from '../types';

export type StudentVariables = Record<string, unknown> & {
  persona: string;
  dialog?: string;
};

export const studentRole: AIRole<StudentVariables> = {
  name: 'student',
  ask: createRoleAsk<StudentVariables>({
    botIdEnvVar: 'OPENAI_STUDENT_BOT_ID',
  }),
};
