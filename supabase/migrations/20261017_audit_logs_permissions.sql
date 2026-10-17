-- =============================================================================
-- Migration: Enable audit_logs write access for hybrid / anon key setups
-- If your backend uses the anon key instead of the service_role key, run this in
-- the Supabase SQL Editor to grant insert permissions on the audit_logs table.
-- =============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE audit_logs TO anon, authenticated;

-- Allow inserts and reads for audit trail logging
DROP POLICY IF EXISTS "Allow audit logging" ON audit_logs;
CREATE POLICY "Allow audit logging" ON audit_logs
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);
