-- Apply this migration to an existing Supabase project.
-- It is safe to run repeatedly.
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

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON audit_logs FROM anon, authenticated;

DO $$
BEGIN
  ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('dean', 'teacher', 'student'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE assessments ADD CONSTRAINT assessments_max_score_positive
    CHECK (max_score > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE score_records ADD CONSTRAINT score_records_non_negative
    CHECK (score >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
