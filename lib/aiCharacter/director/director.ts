import { createRoleAsk } from '../utils/createRoleAsk';
import type { AIRole } from '../types';
// removed legacy import from studentRoleScript
// rename: studentRoleScript -> studentScript
import {
  getRandomStudentRole as getRandomStudentRole_new,
  appendStudentRoles as appendStudentRoles_new,
  clearStudentRoles as clearStudentRoles_new,
  getStudentRoleCount as getStudentRoleCount_new,
  StudentRoleStoreEmptyError as StudentRoleStoreEmptyError_new,
  StudentRoleInvalidCountError as StudentRoleInvalidCountError_new,
  ensureRolesLoaded as ensureRolesLoaded_new,
} from './studentScript';

export const directorRole: AIRole & {
  getRandomStudentRole: typeof getRandomStudentRole_new;
  appendStudentRoles: typeof appendStudentRoles_new;
  clearStudentRoles: typeof clearStudentRoles_new;
  getStudentRoleCount: typeof getStudentRoleCount_new;
  StudentRoleStoreEmptyError: typeof StudentRoleStoreEmptyError_new;
  StudentRoleInvalidCountError: typeof StudentRoleInvalidCountError_new;
} = {
  name: 'director',
  ask: createRoleAsk({
    botIdEnvVar: 'OPENAI_DIRECTOR_BOT_ID',
    fallbackBotIdEnvVar: 'OPENAI_SCRIPTWRITER_BOT_ID',
  }),
  getRandomStudentRole: getRandomStudentRole_new,
  appendStudentRoles: appendStudentRoles_new,
  clearStudentRoles: clearStudentRoles_new,
  getStudentRoleCount: getStudentRoleCount_new,
  StudentRoleStoreEmptyError: StudentRoleStoreEmptyError_new,
  StudentRoleInvalidCountError: StudentRoleInvalidCountError_new,
};

// 模組初始化時嘗試載入資料（失敗時靜默，首次使用時會再載入）
(async () => {
  try {
    await ensureRolesLoaded_new();
  } catch {}
})();
