import { createRoleAsk } from '../utils/createRoleAsk';
import type { AIRole } from '../types';
import {
  getRandomStudentRole,
  appendStudentRoles,
  clearStudentRoles,
  getStudentRoleCount,
  StudentRoleStoreEmptyError,
  StudentRoleInvalidCountError,
} from './studentRoleScript';

export const directorRole: AIRole & {
  getRandomStudentRole: typeof getRandomStudentRole;
  appendStudentRoles: typeof appendStudentRoles;
  clearStudentRoles: typeof clearStudentRoles;
  getStudentRoleCount: typeof getStudentRoleCount;
  StudentRoleStoreEmptyError: typeof StudentRoleStoreEmptyError;
  StudentRoleInvalidCountError: typeof StudentRoleInvalidCountError;
} = {
  name: 'director',
  ask: createRoleAsk({
    botIdEnvVar: 'OPENAI_DIRECTOR_BOT_ID',
    fallbackBotIdEnvVar: 'OPENAI_SCRIPTWRITER_BOT_ID',
  }),
  getRandomStudentRole,
  appendStudentRoles,
  clearStudentRoles,
  getStudentRoleCount,
  StudentRoleStoreEmptyError,
  StudentRoleInvalidCountError,
};
