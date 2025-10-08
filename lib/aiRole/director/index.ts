import { createRoleAsk } from '../utils/createRoleAsk';
import type { AIRole } from '../types';

export const directorRole: AIRole = {
  name: 'director',
  ask: createRoleAsk({
    botIdEnvVar: 'OPENAI_DIRECTOR_BOT_ID',
    fallbackBotIdEnvVar: 'OPENAI_SCRIPTWRITER_BOT_ID',
  }),
};
