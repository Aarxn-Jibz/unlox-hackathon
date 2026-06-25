import type { AutomationLog, CreateAutomationLogDTO } from '../../types';

interface AutomationLogRow {
  id: string;
  user_id: string;
  integration_type: string;
  status: string;
  details: string | null;
  created_at: string;
}

export class AutomationRepository {
  constructor(private db: D1Database) {}

  async findByUserId(userId: string, limit = 20): Promise<AutomationLog[]> {
    const { results } = await this.db
      .prepare('SELECT * FROM automation_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?')
      .bind(userId, limit)
      .all<AutomationLogRow>();

    return (results || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      integrationType: row.integration_type as 'telegram' | 'calendar' | 'reminder',
      status: row.status as 'success' | 'failed' | 'pending',
      details: row.details || undefined,
      createdAt: row.created_at,
    }));
  }

  async create(userId: string, dto: CreateAutomationLogDTO): Promise<AutomationLog> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO automation_logs (id, user_id, integration_type, status, details, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, userId, dto.integrationType, dto.status, dto.details || null, now)
      .run();

    return {
      id,
      userId,
      integrationType: dto.integrationType,
      status: dto.status,
      details: dto.details,
      createdAt: now,
    };
  }
}
