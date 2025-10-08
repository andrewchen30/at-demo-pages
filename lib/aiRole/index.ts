// Central exports for AI roles decoupled from API route handlers.
export type { AIRole, AIRoleName, AskFunction, AskResult } from './types';
export type { RoleOptions } from './utils/createRoleAsk';

export { createRoleAsk } from './utils/createRoleAsk';
export { studentRole } from './student';
export { directorRole } from './director';
export { scriptWriterRole } from './scriptWriter';
export { coachRole } from './coach';
export { judgeRole } from './judge';

import type { AIRole, AIRoleName } from './types';
import { coachRole } from './coach';
import { directorRole } from './director';
import { judgeRole } from './judge';
import { scriptWriterRole } from './scriptWriter';
import { studentRole } from './student';

const rolesByName: Record<AIRoleName, AIRole> = {
  student: studentRole,
  director: directorRole,
  scriptWriter: scriptWriterRole,
  coach: coachRole,
  judge: judgeRole,
};

export const aiRoles = rolesByName;

export function getAIRole(name: AIRoleName): AIRole {
  const role = rolesByName[name];
  if (!role) {
    throw new Error(`Unknown AI role: ${name}`);
  }
  return role;
}
