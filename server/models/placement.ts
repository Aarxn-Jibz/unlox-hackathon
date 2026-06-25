import type {
  PlacementAttempt,
  CreatePlacementAttemptDTO,
  UpdatePlacementAttemptDTO,
} from '../../types';

interface PlacementRow {
  id: string;
  user_id: string;
  company_name: string;
  role: string;
  stage: string;
  date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export class PlacementRepository {
  constructor(private db: D1Database) {}

  async findByUserId(userId: string): Promise<PlacementAttempt[]> {
    const { results } = await this.db
      .prepare('SELECT * FROM placement_attempts WHERE user_id = ? ORDER BY date DESC')
      .bind(userId)
      .all<PlacementRow>();

    return (results || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      companyName: row.company_name,
      role: row.role,
      stage: row.stage as 'applied' | 'online_assessment' | 'interview' | 'offered' | 'rejected',
      date: row.date,
      notes: row.notes || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async create(userId: string, dto: CreatePlacementAttemptDTO): Promise<PlacementAttempt> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO placement_attempts (id, user_id, company_name, role, stage, date, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, userId, dto.companyName, dto.role, dto.stage, dto.date, dto.notes || null, now, now)
      .run();

    return {
      id,
      userId,
      ...dto,
      createdAt: now,
      updatedAt: now,
    };
  }

  async update(userId: string, id: string, dto: UpdatePlacementAttemptDTO): Promise<boolean> {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: unknown[] = [];

    if (dto.companyName !== undefined) {
      fields.push('company_name = ?');
      values.push(dto.companyName);
    }
    if (dto.role !== undefined) {
      fields.push('role = ?');
      values.push(dto.role);
    }
    if (dto.stage !== undefined) {
      fields.push('stage = ?');
      values.push(dto.stage);
    }
    if (dto.date !== undefined) {
      fields.push('date = ?');
      values.push(dto.date);
    }
    if (dto.notes !== undefined) {
      fields.push('notes = ?');
      values.push(dto.notes || null);
    }

    if (fields.length === 0) return true;

    fields.push('updated_at = ?');
    values.push(now);

    values.push(id);
    values.push(userId);

    const result = await this.db
      .prepare(`UPDATE placement_attempts SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`)
      .bind(...values)
      .run();

    return result.success;
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const result = await this.db
      .prepare('DELETE FROM placement_attempts WHERE id = ? AND user_id = ?')
      .bind(id, userId)
      .run();
    return result.success;
  }
}
