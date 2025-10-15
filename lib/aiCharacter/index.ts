// Central exports for AI roles decoupled from API route handlers.
export type { AIRole, AIRoleName, AskFunction, AskResult } from './types';
export type { RoleOptions } from './utils/createRoleAsk';

export { createRoleAsk } from './utils/createRoleAsk';
export { directorRole } from './director/director';
export { scriptWriterRole } from './director/scriptWriter';
export { coachRole } from './coach';
export { judgeRole } from './judge';
export { studentRole } from './student';

import type { AIRole, AIRoleName } from './types';
import { coachRole } from './coach';
import { directorRole } from './director/director';
import { judgeRole } from './judge';
import { scriptWriterRole } from './director/scriptWriter';
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
