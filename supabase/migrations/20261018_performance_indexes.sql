-- Supporting indexes for grade imports, gradebook loading, and section-scoped
-- ownership checks. The score and attendance uniqueness constraints already
-- provide indexes for their full conflict keys, so only the common lookup
-- prefixes are added here.

CREATE INDEX IF NOT EXISTS users_section_id_idx
  ON users (section_id);

CREATE INDEX IF NOT EXISTS subjects_section_teacher_idx
  ON subjects (section_id, teacher_id);

CREATE INDEX IF NOT EXISTS assessments_subject_period_idx
  ON assessments (subject_id, period);

CREATE INDEX IF NOT EXISTS attendance_subject_student_date_idx
  ON attendance_records (subject_id, student_id, date);
