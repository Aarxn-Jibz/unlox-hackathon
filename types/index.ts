// User Profile & Onboarding
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'admin';
  branch?: string;
  semester?: number;
  attendanceTarget?: number;
  academicGoals?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UserOnboarding {
  branch: string;
  semester: number;
  attendanceTarget: number;
  academicGoals?: string[];
}

// Authentication
export interface SignupRequest {
  email: string;
  passwordHash?: string; // Optional depending on how it's handled on client/server boundary
  password?: string; // Raw password sent from client
  name: string;
}

export interface LoginRequest {
  email: string;
  password?: string;
}

export interface LoginResponse {
  token: string;
  user: UserProfile;
}

// Task Management
export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  dueDate?: string;
  status: 'todo' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
}

export type CreateTaskDTO = Omit<Task, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
export type UpdateTaskDTO = Partial<CreateTaskDTO>;

// Bunk Calculator
export interface SubjectAttendance {
  id?: string;
  subjectName: string;
  attended: number;
  total: number;
  targetPercentage: number;
  percentage: number;
  bunksPossible: number;
  classesToAttend: number;
}

export interface BunkCalcInput {
  subjects: {
    subjectName: string;
    attended: number;
    total: number;
    targetPercentage?: number;
  }[];
}

export interface BunkCalcOutput {
  subjects: SubjectAttendance[];
  overallPercentage: number;
}

// Notice Summarizer
export interface NoticePayload {
  title: string;
  content: string;
  date?: string;
}

export interface NoticeSummary {
  originalTitle: string;
  summary: string;
  actionItems: string[];
  keyDates: { event: string; date: string }[];
  urgency: 'low' | 'medium' | 'high';
}

// Placement Attempts
export interface PlacementAttempt {
  id: string;
  userId: string;
  companyName: string;
  role: string;
  stage: 'applied' | 'online_assessment' | 'interview' | 'offered' | 'rejected';
  date: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type CreatePlacementAttemptDTO = Omit<
  PlacementAttempt,
  'id' | 'userId' | 'createdAt' | 'updatedAt'
>;
export type UpdatePlacementAttemptDTO = Partial<CreatePlacementAttemptDTO>;

// Subjects
export interface Subject {
  id: string;
  userId: string;
  name: string;
  targetPercentage: number;
}

export type CreateSubjectDTO = Omit<Subject, 'id' | 'userId'>;
export type UpdateSubjectDTO = Partial<CreateSubjectDTO>;

// Attendance Records
export interface AttendanceRecord {
  id: string;
  subjectId: string;
  date: string; // YYYY-MM-DD
  status: 'attended' | 'absent' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export type CreateAttendanceRecordDTO = Omit<AttendanceRecord, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateAttendanceRecordDTO = Partial<
  Omit<AttendanceRecord, 'id' | 'subjectId' | 'createdAt' | 'updatedAt'>
>;

// Documents (textbooks/PDFs uploaded to R2)
export interface DocumentMetadata {
  id: string;
  userId: string;
  r2Key: string;
  name: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateDocumentDTO = Omit<DocumentMetadata, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;

// Flashcards
export interface Flashcard {
  id: string;
  userId: string;
  documentId?: string; // Optional reference to document
  front: string;
  back: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFlashcardDTO {
  documentId?: string;
  front: string;
  back: string;
}

// Automation Logs (n8n webhooks)
export interface AutomationLog {
  id: string;
  userId: string;
  integrationType: 'telegram' | 'calendar' | 'reminder';
  status: 'success' | 'failed' | 'pending';
  details?: string; // JSON detail payload or error message
  createdAt: string;
}

export type CreateAutomationLogDTO = Omit<AutomationLog, 'id' | 'createdAt'>;

// Environment bindings for cloudflare workers
export interface Env {
  DB: D1Database;
  JWT_SECRET?: string;
  ALLOWED_ORIGINS?: string;
  TELEGRAM_BOT_TOKEN?: string;
}
