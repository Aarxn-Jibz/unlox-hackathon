import type {
  Task,
  CreateTaskDTO,
  UpdateTaskDTO,
  SubjectAttendance,
  PlacementAttempt,
  CreatePlacementAttemptDTO,
} from '../../types';

interface TaskRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

interface AttendanceRow {
  id: string;
  user_id: string;
  subject_name: string;
  attended: number;
  total: number;
  target_percentage: number;
  created_at: string;
  updated_at: string;
}

interface PlacementAttemptRow {
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

interface DeadlineRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// Tasks queries
export async function getTasksByUserId(db: D1Database, userId: string): Promise<Task[]> {
  const { results } = await db
    .prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY due_date ASC')
    .bind(userId)
    .all<TaskRow>();

  return (results || []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description || undefined,
    dueDate: row.due_date || undefined,
    status: row.status as 'todo' | 'in_progress' | 'completed',
    priority: row.priority as 'low' | 'medium' | 'high',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function createTask(
  db: D1Database,
  userId: string,
  dto: CreateTaskDTO,
): Promise<Task> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO tasks (id, user_id, title, description, due_date, status, priority, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      userId,
      dto.title,
      dto.description || null,
      dto.dueDate || null,
      dto.status,
      dto.priority,
      now,
      now,
    )
    .run();

  return {
    id,
    userId,
    ...dto,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateTask(
  db: D1Database,
  userId: string,
  taskId: string,
  dto: UpdateTaskDTO,
): Promise<boolean> {
  const now = new Date().toISOString();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (dto.title !== undefined) {
    fields.push('title = ?');
    values.push(dto.title);
  }
  if (dto.description !== undefined) {
    fields.push('description = ?');
    values.push(dto.description || null);
  }
  if (dto.dueDate !== undefined) {
    fields.push('due_date = ?');
    values.push(dto.dueDate || null);
  }
  if (dto.status !== undefined) {
    fields.push('status = ?');
    values.push(dto.status);
  }
  if (dto.priority !== undefined) {
    fields.push('priority = ?');
    values.push(dto.priority);
  }

  if (fields.length === 0) return true;

  fields.push('updated_at = ?');
  values.push(now);

  values.push(taskId);
  values.push(userId);

  const result = await db
    .prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`)
    .bind(...values)
    .run();

  return result.success;
}

export async function deleteTask(db: D1Database, userId: string, taskId: string): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?')
    .bind(taskId, userId)
    .run();
  return result.success;
}

// Attendance queries
export async function getAttendanceByUserId(
  db: D1Database,
  userId: string,
): Promise<SubjectAttendance[]> {
  const { results } = await db
    .prepare('SELECT * FROM attendance WHERE user_id = ?')
    .bind(userId)
    .all<AttendanceRow>();

  return (results || []).map((row) => {
    const percentage = row.total > 0 ? (row.attended / row.total) * 100 : 0;

    // Bunk calculation
    // If current percentage >= target, count how many bunks we can afford before falling below target
    // target = target_percentage / 100
    // (attended) / (total + bunks) >= target => attended / target >= total + bunks => bunks <= (attended / target) - total
    const target = (row.target_percentage || 75.0) / 100;
    let bunksPossible = 0;
    let classesToAttend = 0;

    if (row.total === 0) {
      bunksPossible = 0;
      classesToAttend = 0;
    } else if (percentage >= row.target_percentage) {
      bunksPossible = Math.floor(row.attended / target - row.total);
      if (bunksPossible < 0) bunksPossible = 0;
    } else {
      // (attended + classesToAttend) / (total + classesToAttend) >= target
      // attended + classesToAttend >= target * total + target * classesToAttend
      // classesToAttend * (1 - target) >= target * total - attended
      // classesToAttend >= (target * total - attended) / (1 - target)
      classesToAttend = Math.ceil((target * row.total - row.attended) / (1 - target));
    }

    return {
      id: row.id,
      subjectName: row.subject_name,
      attended: row.attended,
      total: row.total,
      targetPercentage: row.target_percentage,
      percentage,
      bunksPossible,
      classesToAttend,
    };
  });
}

export async function upsertAttendance(
  db: D1Database,
  userId: string,
  subject: {
    subjectName: string;
    attended: number;
    total: number;
    targetPercentage?: number;
  },
): Promise<void> {
  const now = new Date().toISOString();
  const target = subject.targetPercentage ?? 75.0;

  // Check if exists
  const existing = await db
    .prepare('SELECT id FROM attendance WHERE user_id = ? AND subject_name = ?')
    .bind(userId, subject.subjectName)
    .first<AttendanceRow>();

  if (existing) {
    await db
      .prepare(
        `UPDATE attendance 
         SET attended = ?, total = ?, target_percentage = ?, updated_at = ? 
         WHERE id = ?`,
      )
      .bind(subject.attended, subject.total, target, now, existing.id)
      .run();
  } else {
    const id = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO attendance (id, user_id, subject_name, attended, total, target_percentage, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, userId, subject.subjectName, subject.attended, subject.total, target, now, now)
      .run();
  }
}

// Placement Attempts queries
export async function getPlacementAttemptsByUserId(
  db: D1Database,
  userId: string,
): Promise<PlacementAttempt[]> {
  const { results } = await db
    .prepare('SELECT * FROM placement_attempts WHERE user_id = ? ORDER BY date DESC')
    .bind(userId)
    .all<PlacementAttemptRow>();

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

export async function createPlacementAttempt(
  db: D1Database,
  userId: string,
  dto: CreatePlacementAttemptDTO,
): Promise<PlacementAttempt> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db
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

// Deadlines queries
export interface Deadline {
  id: string;
  userId: string;
  title: string;
  description?: string;
  dueDate: string;
  status: 'pending' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export async function getDeadlinesByUserId(db: D1Database, userId: string): Promise<Deadline[]> {
  const { results } = await db
    .prepare('SELECT * FROM deadlines WHERE user_id = ? ORDER BY due_date ASC')
    .bind(userId)
    .all<DeadlineRow>();

  return (results || []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description || undefined,
    dueDate: row.due_date,
    status: row.status as 'pending' | 'completed',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}
