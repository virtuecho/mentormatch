PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'mentee',
  is_mentor_approved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id INTEGER PRIMARY KEY,
  full_name TEXT NOT NULL,
  bio TEXT,
  location TEXT,
  profile_image_url TEXT,
  linkedin_url TEXT,
  instagram_url TEXT,
  facebook_url TEXT,
  website_url TEXT,
  phone TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS educations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  university TEXT NOT NULL,
  degree TEXT NOT NULL,
  major TEXT NOT NULL,
  start_year INTEGER NOT NULL,
  end_year INTEGER,
  status TEXT NOT NULL DEFAULT 'on_going',
  logo_url TEXT,
  description TEXT,
  FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS experiences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  company TEXT NOT NULL,
  position TEXT NOT NULL,
  industry TEXT,
  expertise_json TEXT NOT NULL DEFAULT '[]',
  start_year INTEGER NOT NULL,
  end_year INTEGER,
  status TEXT NOT NULL DEFAULT 'on_going',
  description TEXT,
  FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mentor_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  document_url TEXT NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TEXT NOT NULL,
  reviewed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mentor_skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mentor_id INTEGER NOT NULL,
  skill_name TEXT NOT NULL,
  FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS availability_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mentor_id INTEGER NOT NULL,
  title TEXT,
  start_time TEXT NOT NULL,
  duration_mins INTEGER NOT NULL,
  location_type TEXT NOT NULL DEFAULT 'in_person',
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  max_participants INTEGER NOT NULL DEFAULT 2,
  note TEXT,
  is_booked INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic TEXT NOT NULL,
  description TEXT,
  availability_slot_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  num_participants INTEGER NOT NULL DEFAULT 1,
  note TEXT,
  mentee_id INTEGER NOT NULL,
  mentor_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  FOREIGN KEY (availability_slot_id) REFERENCES availability_slots(id) ON DELETE CASCADE,
  FOREIGN KEY (mentee_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_bookings_mentee ON bookings(mentee_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_mentor ON bookings(mentor_id, status);
CREATE INDEX IF NOT EXISTS idx_slots_mentor ON availability_slots(mentor_id, is_booked, start_time);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id, expires_at);
