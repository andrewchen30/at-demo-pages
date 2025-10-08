import { createRoleAsk } from '../utils/createRoleAsk';
import type { AIRole } from '../types';

type StudentVariables = {
  persona: string;
  dialog?: string;
};

export const studentRole: AIRole<StudentVariables> = {
  name: 'student',
  ask: createRoleAsk<StudentVariables>({
    botIdEnvVar: 'OPENAI_STUDENT_BOT_ID',
  }),
};
