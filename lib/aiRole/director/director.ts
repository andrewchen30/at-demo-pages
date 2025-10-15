import { createRoleAsk } from '../utils/createRoleAsk';
import type { AIRole } from '../types';
import {
  getRandomStudentRole,
  appendStudentRoles,
  clearStudentRoles,
  getStudentRoleCount,
  StudentRoleStoreEmptyError,
  StudentRoleInvalidCountError,
  ensureRolesLoaded,
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

// 模組初始化時嘗試載入資料（失敗時靜默，首次使用時會再載入）
(async () => {
  try {
    await ensureRolesLoaded();
  } catch {}
})();
