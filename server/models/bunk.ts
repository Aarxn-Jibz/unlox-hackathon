import type {
  AttendanceRecord,
  CreateAttendanceRecordDTO,
  UpdateAttendanceRecordDTO,
  SubjectAttendance,
} from '../../types';

interface AttendanceRecordRow {
  id: string;
  subject_id: string;
  date: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface AttendanceStatsRow {
  subject_id: string;
  subject_name: string;
  target_percentage: number | null;
  attended_count: number | null;
  total_count: number | null;
}

export class AttendanceRepository {
  constructor(private db: D1Database) {}

  async findRecordsBySubjectId(subjectId: string): Promise<AttendanceRecord[]> {
    const { results } = await this.db
      .prepare('SELECT * FROM attendance_records WHERE subject_id = ? ORDER BY date DESC')
      .bind(subjectId)
      .all<AttendanceRecordRow>();

    return (results || []).map((row) => ({
      id: row.id,
      subjectId: row.subject_id,
      date: row.date,
      status: row.status as 'attended' | 'absent' | 'cancelled',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async createRecord(dto: CreateAttendanceRecordDTO): Promise<AttendanceRecord> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO attendance_records (id, subject_id, date, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, dto.subjectId, dto.date, dto.status, now, now)
      .run();

    return {
      id,
      subjectId: dto.subjectId,
      date: dto.date,
      status: dto.status,
      createdAt: now,
      updatedAt: now,
    };
  }

  async updateRecord(id: string, dto: UpdateAttendanceRecordDTO): Promise<boolean> {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: unknown[] = [];

    if (dto.status !== undefined) {
      fields.push('status = ?');
      values.push(dto.status);
    }
    if (dto.date !== undefined) {
      fields.push('date = ?');
      values.push(dto.date);
    }

    if (fields.length === 0) return true;

    fields.push('updated_at = ?');
    values.push(now);

    values.push(id);

    const result = await this.db
      .prepare(`UPDATE attendance_records SET ${fields.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    return result.success;
  }

  async deleteRecord(id: string): Promise<boolean> {
    const result = await this.db
      .prepare('DELETE FROM attendance_records WHERE id = ?')
      .bind(id)
      .run();
    return result.success;
  }

  async getSubjectAttendanceStats(userId: string): Promise<SubjectAttendance[]> {
    // We join subjects with their attendance_records to compute statistics
    const query = `
      SELECT 
        s.id AS subject_id,
        s.name AS subject_name,
        s.target_percentage,
        SUM(CASE WHEN r.status = 'attended' THEN 1 ELSE 0 END) AS attended_count,
        SUM(CASE WHEN r.status IN ('attended', 'absent') THEN 1 ELSE 0 END) AS total_count
      FROM subjects s
      LEFT JOIN attendance_records r ON s.id = r.subject_id
      WHERE s.user_id = ?
      GROUP BY s.id, s.name, s.target_percentage
      ORDER BY s.name ASC
    `;

    const { results } = await this.db.prepare(query).bind(userId).all<AttendanceStatsRow>();

    return (results || []).map((row) => {
      const attended = row.attended_count || 0;
      const total = row.total_count || 0;
      const targetPct = row.target_percentage ?? 75.0;
      const percentage = total > 0 ? (attended / total) * 100 : 0.0;

      let bunksPossible = 0;
      let classesToAttend = 0;

      const targetFraction = targetPct / 100;

      if (total === 0) {
        bunksPossible = 0;
        classesToAttend = 0;
      } else if (percentage >= targetPct) {
        // (attended) / (total + bunks) >= targetFraction
        // attended >= targetFraction * (total + bunks)
        // attended / targetFraction >= total + bunks
        // bunks <= (attended / targetFraction) - total
        bunksPossible = Math.floor(attended / targetFraction - total);
        if (bunksPossible < 0) bunksPossible = 0;
      } else {
        // (attended + x) / (total + x) >= targetFraction
        // attended + x >= targetFraction * total + targetFraction * x
        // x * (1 - targetFraction) >= targetFraction * total - attended
        // x >= (targetFraction * total - attended) / (1 - targetFraction)
        classesToAttend = Math.ceil((targetFraction * total - attended) / (1 - targetFraction));
      }

      return {
        id: row.subject_id,
        subjectName: row.subject_name,
        attended,
        total,
        targetPercentage: targetPct,
        percentage,
        bunksPossible,
        classesToAttend,
      };
    });
  }

  async detectSubjectsBelowSafetyLine(userId: string): Promise<SubjectAttendance[]> {
    const stats = await this.getSubjectAttendanceStats(userId);
    // Safety line is typically 75% or the subject's specific target percentage.
    // Let's filter those where percentage is less than their target percentage.
    return stats.filter((s) => s.total > 0 && s.percentage < s.targetPercentage);
  }
}
