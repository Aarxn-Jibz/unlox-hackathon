-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  branch TEXT,
  semester INTEGER,
  attendance_target REAL DEFAULT 75.0,
  academic_goals TEXT, -- JSON array of strings
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'todo', -- 'todo', 'in_progress', 'completed'
  priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high'
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  attended INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  target_percentage REAL DEFAULT 75.0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Deadlines Table
CREATE TABLE IF NOT EXISTS deadlines (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed'
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Placement Attempts Table
CREATE TABLE IF NOT EXISTS placement_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_name TEXT NOT NULL,
  role TEXT NOT NULL,
  stage TEXT NOT NULL, -- 'applied', 'online_assessment', 'interview', 'offered', 'rejected'
  date TEXT NOT NULL,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Subjects Table
CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  target_percentage REAL NOT NULL DEFAULT 75.0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, name)
);

-- Attendance Records Table
CREATE TABLE IF NOT EXISTS attendance_records (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD
  status TEXT NOT NULL, -- 'attended', 'absent', 'cancelled'
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

-- Documents Table
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Flashcards Table
CREATE TABLE IF NOT EXISTS flashcards (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  document_id TEXT,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
);

-- Automation Logs Table
CREATE TABLE IF NOT EXISTS automation_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  integration_type TEXT NOT NULL, -- 'telegram', 'calendar', 'reminder'
  status TEXT NOT NULL, -- 'success', 'failed', 'pending'
  details TEXT, -- JSON details or error logs
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance and query optimization
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_deadlines_user_id ON deadlines(user_id);
CREATE INDEX IF NOT EXISTS idx_placement_attempts_user_id ON placement_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_subject_id ON attendance_records(subject_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_user_id ON flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_document_id ON flashcards(document_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_user_id ON automation_logs(user_id);

-- Telegram Chats Table
CREATE TABLE IF NOT EXISTS telegram_chats (
  chat_id TEXT PRIMARY KEY,
  user_id TEXT,
  active_state TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Telegram Messages Table
CREATE TABLE IF NOT EXISTS telegram_messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  sender TEXT NOT NULL, -- 'user' or 'bot'
  message_text TEXT NOT NULL,
  command TEXT, -- NULLABLE, e.g. '/bunk'
  reply_to_message_id TEXT, -- NULLABLE
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chat_id) REFERENCES telegram_chats(chat_id) ON DELETE CASCADE
);

-- Indexes for Telegram tables
CREATE INDEX IF NOT EXISTS idx_telegram_chats_user_id ON telegram_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_messages_chat_id ON telegram_messages(chat_id);


