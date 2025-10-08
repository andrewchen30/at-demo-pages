import { createRoleAsk } from '../utils/createRoleAsk';
import type { AIRole } from '../types';

export const scriptWriterRole: AIRole = {
  name: 'scriptWriter',
  ask: createRoleAsk({
    botIdEnvVar: 'OPENAI_SCRIPTWRITER_BOT_ID',
  }),
};
