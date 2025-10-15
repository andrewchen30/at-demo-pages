import type { AIGenStudent, ModelDef } from '../database/types';
import { AIGenStudentModel } from '../database/types';
import type { DB } from '../database/types';
import { withDB } from '../database/client';

export const AIGenStudentsRepo = {
  model: AIGenStudentModel as ModelDef<AIGenStudent>,

  async create(
    row: Omit<AIGenStudent, 'id' | 'created_at' | 'updated_at'> & Partial<Pick<AIGenStudent, 'id'>>
  ): Promise<string> {
    return withDB(this.model, async (db: DB) => {
      return db.appendRow(this.model, row as AIGenStudent);
    });
  },

  async list(opts?: { offset?: number; limit?: number; orderBy?: keyof AIGenStudent }): Promise<AIGenStudent[]> {
    return withDB(this.model, async (db: DB) => {
      return db.list(this.model, opts);
    });
  },

  async clearAll(): Promise<void> {
    return withDB(this.model, async (db: DB) => {
      await db.clearModel(this.model);
    });
  },
};
