import type { Task, CreateTaskDTO, UpdateTaskDTO } from '../../types';

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

export class TaskRepository {
  constructor(private db: D1Database) {}

  async findByUserId(userId: string): Promise<Task[]> {
    const { results } = await this.db
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

  async create(userId: string, dto: CreateTaskDTO): Promise<Task> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
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
        dto.status || 'todo',
        dto.priority || 'medium',
        now,
        now,
      )
      .run();

    return {
      id,
      userId,
      title: dto.title,
      description: dto.description,
      dueDate: dto.dueDate,
      status: dto.status || 'todo',
      priority: dto.priority || 'medium',
      createdAt: now,
      updatedAt: now,
    };
  }

  async update(userId: string, taskId: string, dto: UpdateTaskDTO): Promise<boolean> {
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

    const result = await this.db
      .prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`)
      .bind(...values)
      .run();

    return result.success;
  }

  async delete(userId: string, taskId: string): Promise<boolean> {
    const result = await this.db
      .prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?')
      .bind(taskId, userId)
      .run();
    return result.success;
  }
}
