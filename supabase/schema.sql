-- =============================================================================
-- AuraSMS - Student Management System Database Schema (Supabase / PostgreSQL)
-- 3-Quarter System (Prelim, Midterm, Finals) + Calendar & Attendance Sync
-- =============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table (Teachers, Students, and Admins / Deans)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT CHECK (role IN ('dean', 'teacher', 'student')) NOT NULL DEFAULT 'student',
    student_number TEXT,
    section_id TEXT,
    avatar TEXT,
    department TEXT,
    title TEXT,
    must_change_password BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Remove the legacy plaintext-password column from existing installations.
ALTER TABLE users DROP COLUMN IF EXISTS custom_password;

-- 2. Sections / Classes Table
CREATE TABLE IF NOT EXISTS sections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    grade_level_or_year TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    semester TEXT NOT NULL,
    room TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Grading Matrix Templates (Global customizable standards)
CREATE TABLE IF NOT EXISTS grading_matrix_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    passing_grade REAL DEFAULT 75,
    matrix JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- The previous browser vault stored plaintext credentials in this record.
-- Preserve only bcrypt entries; discard legacy plaintext entries.
UPDATE grading_matrix_templates
SET matrix = COALESCE((
    SELECT jsonb_agg(entry)
    FROM jsonb_array_elements(matrix) AS entry
    WHERE entry->>'passwordHash' ~ '^\$2[aby]\$'
), '[]'::jsonb)
WHERE id = 'sys-auth-vault' AND jsonb_typeof(matrix) = 'array';
DELETE FROM grading_matrix_templates
WHERE id = 'sys-auth-vault' AND (matrix IS NULL OR jsonb_typeof(matrix) <> 'array');

-- 4. Subjects / Course Offerings
CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY,
    section_id TEXT REFERENCES sections(id) ON DELETE CASCADE,
    teacher_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    schedule TEXT,
    units INTEGER DEFAULT 3,
    passing_grade REAL DEFAULT 75,
    matrix JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Assessments Table (Tagged with 3-Quarter Period)
CREATE TABLE IF NOT EXISTS assessments (
    id TEXT PRIMARY KEY,
    subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE,
    category_id TEXT NOT NULL,
    parent_category_id TEXT,
    period TEXT CHECK (period IN ('prelim', 'midterm', 'finals')) NOT NULL DEFAULT 'prelim',
    title TEXT NOT NULL,
    max_score REAL NOT NULL DEFAULT 50 CHECK (max_score > 0),
    date DATE NOT NULL,
    due_date DATE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Student Score Records
CREATE TABLE IF NOT EXISTS score_records (
    id TEXT PRIMARY KEY,
    assessment_id TEXT REFERENCES assessments(id) ON DELETE CASCADE,
    student_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    score REAL NOT NULL DEFAULT 0 CHECK (score >= 0),
    remarks TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(assessment_id, student_id)
);

-- 7. Class Attendance Records (Tagged with 3-Quarter Period)
CREATE TABLE IF NOT EXISTS attendance_records (
    id TEXT PRIMARY KEY,
    subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE,
    student_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    period TEXT CHECK (period IN ('prelim', 'midterm', 'finals')) NOT NULL DEFAULT 'prelim',
    status TEXT CHECK (status IN ('present', 'late', 'absent', 'excused')) NOT NULL DEFAULT 'present',
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(subject_id, student_id, date)
);

-- 8. Academic Calendar Holidays & Suspensions
CREATE TABLE IF NOT EXISTS holidays (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    title TEXT NOT NULL,
    type TEXT CHECK (type IN ('national', 'school', 'suspension', 'break')) NOT NULL DEFAULT 'national',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Append-only audit trail for roster, grade, attendance, and admin changes
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    actor_role TEXT,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT,
    before_data JSONB,
    after_data JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_actor_id_idx ON audit_logs(actor_id);

-- =============================================================================
-- Enable Row Level Security (RLS) & Public Policies for Demo/Hybrid Setup
-- =============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE grading_matrix_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- The browser must not access these tables directly. The backend uses the
-- service-role key and enforces authorization in application code.
-- Existing public policies must be removed during migration.
DROP POLICY IF EXISTS "Public full access users" ON users;
DROP POLICY IF EXISTS "Public full access sections" ON sections;
DROP POLICY IF EXISTS "Public full access matrix_templates" ON grading_matrix_templates;
DROP POLICY IF EXISTS "Public full access subjects" ON subjects;
DROP POLICY IF EXISTS "Public full access assessments" ON assessments;
DROP POLICY IF EXISTS "Public full access score_records" ON score_records;
DROP POLICY IF EXISTS "Public full access attendance_records" ON attendance_records;
DROP POLICY IF EXISTS "Public full access holidays" ON holidays;
DROP POLICY IF EXISTS "Public full access audit_logs" ON audit_logs;

-- No anon/authenticated CRUD policies are intentionally defined here.
-- Service-role access bypasses RLS for the protected backend only.
REVOKE ALL ON users, sections, grading_matrix_templates, subjects, assessments,
    score_records, attendance_records, holidays, audit_logs FROM anon, authenticated;

-- =============================================================================
-- Enable Realtime publication on all tables
-- =============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE sections;
ALTER PUBLICATION supabase_realtime ADD TABLE subjects;
ALTER PUBLICATION supabase_realtime ADD TABLE assessments;
ALTER PUBLICATION supabase_realtime ADD TABLE score_records;
ALTER PUBLICATION supabase_realtime ADD TABLE attendance_records;
ALTER PUBLICATION supabase_realtime ADD TABLE holidays;
ALTER PUBLICATION supabase_realtime ADD TABLE grading_matrix_templates;

-- =============================================================================
-- Migration Commands for Existing Supabase Databases:
-- Run these if your tables were already created previously:
-- =============================================================================
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
-- ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('dean', 'teacher', 'student'));
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;
