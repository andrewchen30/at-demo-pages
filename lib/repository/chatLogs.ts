import type { ChatLog, ModelDef } from '../database/types';
import { ChatLogModel } from '../database/types';
import type { DB } from '../database/types';
import { withDB } from '../database/client';

export const ChatLogsRepo = {
  model: ChatLogModel as ModelDef<ChatLog>,

  async create(row: Omit<ChatLog, 'id' | 'created_at' | 'updated_at'> & Partial<Pick<ChatLog, 'id'>>): Promise<string> {
    return withDB(this.model, async (db: DB) => {
      return db.appendRow(this.model, row as ChatLog);
    });
  },

  async updateById(id: string, patch: Partial<ChatLog>): Promise<void> {
    return withDB(this.model, async (db: DB) => {
      await db.updateRowById(this.model, id, patch);
    });
  },

  async upsertByTeacher(teacherName: string, row: ChatLog): Promise<void> {
    return withDB(this.model, async (db: DB) => {
      if (typeof db.upsertByKey !== 'function') {
        // Fallback：如果沒有提供 upsertByKey，就模擬
        const existing = await db.findFirst(this.model, { teacher_name: teacherName } as Partial<ChatLog>);
        if (existing && (existing as any).id) {
          await db.updateRowById(this.model, (existing as any).id, row);
        } else {
          await db.appendRow(this.model, row);
        }
        return;
      }
      await db.upsertByKey!(this.model, teacherName, row);
    });
  },

  async getById(id: string): Promise<ChatLog | null> {
    return withDB(this.model, async (db: DB) => {
      return db.getById(this.model, id);
    });
  },

  async findFirst(where: Partial<ChatLog>): Promise<ChatLog | null> {
    return withDB(this.model, async (db: DB) => {
      return db.findFirst(this.model, where);
    });
  },

  async list(opts?: { offset?: number; limit?: number; orderBy?: keyof ChatLog }): Promise<ChatLog[]> {
    return withDB(this.model, async (db: DB) => {
      return db.list(this.model, opts);
    });
  },
};
