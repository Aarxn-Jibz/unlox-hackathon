import type { UserProfile, UserOnboarding } from '../../types';

export interface DBUser {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: string;
  branch: string | null;
  semester: number | null;
  attendance_target: number | null;
  academic_goals: string | null; // stored as JSON string
  created_at: string;
  updated_at: string;
}

export function mapToUserProfile(dbUser: DBUser): UserProfile {
  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role as 'student' | 'admin',
    branch: dbUser.branch || undefined,
    semester: dbUser.semester || undefined,
    attendanceTarget: dbUser.attendance_target || undefined,
    academicGoals: dbUser.academic_goals ? JSON.parse(dbUser.academic_goals) : undefined,
    createdAt: dbUser.created_at,
    updatedAt: dbUser.updated_at,
  };
}

export async function getUserByEmail(db: D1Database, email: string): Promise<DBUser | null> {
  const result = await db
    .prepare('SELECT * FROM users WHERE email = ?')
    .bind(email)
    .first<DBUser>();
  return result || null;
}

export async function getUserById(db: D1Database, id: string): Promise<DBUser | null> {
  const result = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<DBUser>();
  return result || null;
}

export async function createUser(
  db: D1Database,
  id: string,
  email: string,
  passwordHash: string,
  name: string,
): Promise<UserProfile> {
  const now = new Date().toISOString();
  await db
    .prepare(
      'INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(id, email, passwordHash, name, 'student', now, now)
    .run();

  return {
    id,
    email,
    name,
    role: 'student',
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateUserOnboarding(
  db: D1Database,
  id: string,
  onboarding: UserOnboarding,
): Promise<UserProfile | null> {
  const now = new Date().toISOString();
  const goalsJson = onboarding.academicGoals ? JSON.stringify(onboarding.academicGoals) : null;

  await db
    .prepare(
      `UPDATE users 
       SET branch = ?, semester = ?, attendance_target = ?, academic_goals = ?, updated_at = ? 
       WHERE id = ?`,
    )
    .bind(onboarding.branch, onboarding.semester, onboarding.attendanceTarget, goalsJson, now, id)
    .run();

  const updated = await getUserById(db, id);
  return updated ? mapToUserProfile(updated) : null;
}

export class UserRepository {
  db: D1Database;
  constructor(db: D1Database) {
    this.db = db;
  }

  async findByEmail(email: string): Promise<DBUser | null> {
    const result = await this.db
      .prepare('SELECT * FROM users WHERE email = ?')
      .bind(email)
      .first<DBUser>();
    return result || null;
  }

  async findById(id: string): Promise<DBUser | null> {
    const result = await this.db
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(id)
      .first<DBUser>();
    return result || null;
  }

  async create(
    id: string,
    email: string,
    passwordHash: string,
    name: string,
  ): Promise<UserProfile> {
    const now = new Date().toISOString();
    await this.db
      .prepare(
        'INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .bind(id, email, passwordHash, name, 'student', now, now)
      .run();

    return {
      id,
      email,
      name,
      role: 'student',
      createdAt: now,
      updatedAt: now,
    };
  }

  async updateOnboarding(id: string, onboarding: UserOnboarding): Promise<UserProfile | null> {
    const now = new Date().toISOString();
    const goalsJson = onboarding.academicGoals ? JSON.stringify(onboarding.academicGoals) : null;

    await this.db
      .prepare(
        `UPDATE users 
         SET branch = ?, semester = ?, attendance_target = ?, academic_goals = ?, updated_at = ? 
         WHERE id = ?`,
      )
      .bind(onboarding.branch, onboarding.semester, onboarding.attendanceTarget, goalsJson, now, id)
      .run();

    const updated = await this.findById(id);
    return updated ? mapToUserProfile(updated) : null;
  }
}
