import type { Subject, CreateSubjectDTO, UpdateSubjectDTO } from '../../types';

interface SubjectRow {
  id: string;
  user_id: string;
  name: string;
  target_percentage: number;
}

export class SubjectRepository {
  constructor(private db: D1Database) {}

  async findByUserId(userId: string): Promise<Subject[]> {
    const { results } = await this.db
      .prepare('SELECT * FROM subjects WHERE user_id = ? ORDER BY name ASC')
      .bind(userId)
      .all<SubjectRow>();

    return (results || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      targetPercentage: row.target_percentage,
    }));
  }

  async findById(id: string, userId: string): Promise<Subject | null> {
    const result = await this.db
      .prepare('SELECT * FROM subjects WHERE id = ? AND user_id = ?')
      .bind(id, userId)
      .first<SubjectRow>();

    if (!result) return null;

    return {
      id: result.id,
      userId: result.user_id,
      name: result.name,
      targetPercentage: result.target_percentage,
    };
  }

  async create(userId: string, dto: CreateSubjectDTO): Promise<Subject> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const targetPercentage = dto.targetPercentage ?? 75.0;

    await this.db
      .prepare(
        `INSERT INTO subjects (id, user_id, name, target_percentage, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, userId, dto.name, targetPercentage, now, now)
      .run();

    return {
      id,
      userId,
      name: dto.name,
      targetPercentage,
    };
  }

  async update(userId: string, id: string, dto: UpdateSubjectDTO): Promise<boolean> {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: unknown[] = [];

    if (dto.name !== undefined) {
      fields.push('name = ?');
      values.push(dto.name);
    }
    if (dto.targetPercentage !== undefined) {
      fields.push('target_percentage = ?');
      values.push(dto.targetPercentage);
    }

    if (fields.length === 0) return true;

    fields.push('updated_at = ?');
    values.push(now);

    values.push(id);
    values.push(userId);

    const result = await this.db
      .prepare(`UPDATE subjects SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`)
      .bind(...values)
      .run();

    return result.success;
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const result = await this.db
      .prepare('DELETE FROM subjects WHERE id = ? AND user_id = ?')
      .bind(id, userId)
      .run();
    return result.success;
  }
}
