-- =============================================================================
-- Gradely SMS - Production Database Seeder
-- Run this in your Supabase Dashboard > SQL Editor
-- =============================================================================

-- 1. Create or Update Default Dean Account
INSERT INTO users (id, name, email, role, title, department, avatar, must_change_password)
VALUES (
    'dean-rommel-constantino',
    'Rommel Constantino',
    'rommel.constantino@gradely.edu',
    'dean',
    'College Dean & Department Head',
    'College of Information and Computing Sciences',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    FALSE
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    title = EXCLUDED.title,
    department = EXCLUDED.department,
    must_change_password = EXCLUDED.must_change_password,
    updated_at = NOW();

-- Also ensure a clean generic alias 'dean@gradely.edu' points to the same account if preferred
INSERT INTO users (id, name, email, role, title, department, avatar, must_change_password)
VALUES (
    'dean-admin',
    'College Dean',
    'dean@gradely.edu',
    'dean',
    'College Dean & Administrator',
    'Academic Affairs',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=DeanAdmin',
    FALSE
)
ON CONFLICT (id) DO NOTHING;

-- 2. Seed Credentials in Auth Vault (Default password: password123)
-- Bcrypt Hash for 'password123': $2a$10$SUXwVoUsYTJPjyDwUjMHd.CPWp7iUu.MnOfHwGCNA4kJTf1f2X7vK
INSERT INTO grading_matrix_templates (id, name, description, is_default, passing_grade, matrix)
VALUES (
    'sys-auth-vault',
    '__auth_vault__',
    'System auth vault - do not delete',
    FALSE,
    0,
    '[
        {
            "userId": "dean-rommel-constantino",
            "email": "rommel.constantino@gradely.edu",
            "passwordHash": "$2a$10$SUXwVoUsYTJPjyDwUjMHd.CPWp7iUu.MnOfHwGCNA4kJTf1f2X7vK",
            "mustChange": false
        },
        {
            "userId": "dean-admin",
            "email": "dean@gradely.edu",
            "passwordHash": "$2a$10$SUXwVoUsYTJPjyDwUjMHd.CPWp7iUu.MnOfHwGCNA4kJTf1f2X7vK",
            "mustChange": false
        }
    ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    matrix = (
        SELECT COALESCE(
            jsonb_agg(elem),
            '[]'::jsonb
        )
        FROM jsonb_array_elements(grading_matrix_templates.matrix) AS elem
        WHERE elem->>'userId' NOT IN ('dean-rommel-constantino', 'dean-admin')
          AND elem->>'email' NOT IN ('rommel.constantino@gradely.edu', 'dean@gradely.edu')
    ) || '[
        {
            "userId": "dean-rommel-constantino",
            "email": "rommel.constantino@gradely.edu",
            "passwordHash": "$2a$10$SUXwVoUsYTJPjyDwUjMHd.CPWp7iUu.MnOfHwGCNA4kJTf1f2X7vK",
            "mustChange": false
        },
        {
            "userId": "dean-admin",
            "email": "dean@gradely.edu",
            "passwordHash": "$2a$10$SUXwVoUsYTJPjyDwUjMHd.CPWp7iUu.MnOfHwGCNA4kJTf1f2X7vK",
            "mustChange": false
        }
    ]'::jsonb,
    updated_at = NOW();

-- 3. Seed BCP Default Grading Templates
INSERT INTO grading_matrix_templates (id, name, description, is_default, passing_grade, matrix)
VALUES
(
    'tmpl-bcp-proflab',
    'BCP - Professional Subjects (Laboratory)',
    'Official Bestlink College distribution for Laboratory Professional subjects: Class Standing (35%), Project (40%), Examination (25%).',
    TRUE,
    75,
    '[
        {"id":"cat-proflab-cs","name":"Class Standing","weight":35,"color":"emerald","description":"Attendance (10%), Written Works (40%), Performance Tasks (50%)","subCategories":[{"id":"sub-proflab-att","name":"Attendance","weight":10,"description":"Roll call & lab attendance"},{"id":"sub-proflab-ww","name":"Written Works","weight":40,"description":"Quizzes & written exercises"},{"id":"sub-proflab-pt","name":"Performance Tasks","weight":50,"description":"Hands-on lab exercises & coding activities"}]},
        {"id":"cat-proflab-cbo","name":"Project (CBO)","weight":40,"color":"indigo","description":"Course-based Outputs (100%)","isTransmutable":false,"subCategories":[{"id":"sub-proflab-cbo","name":"Course-based Outputs","weight":100,"description":"Software prototype, lab system, or project output"}]},
        {"id":"cat-proflab-exam","name":"Examination (WE)","weight":25,"color":"rose","description":"Periodic Written Examination (100%)","subCategories":[{"id":"sub-proflab-we","name":"Written Examination","weight":100,"description":"Major periodic exam"}]}
    ]'::jsonb
),
(
    'tmpl-bcp-gened',
    'BCP - General Education (GenEd)',
    'Official Bestlink College grading distribution for GenEd subjects: Class Standing (40%), Project (25%), Examination (35%).',
    FALSE,
    75,
    '[
        {"id":"cat-gened-cs","name":"Class Standing","weight":40,"color":"emerald","description":"Attendance (10%), Written Works (50%), Performance Tasks (40%)","subCategories":[{"id":"sub-gened-att","name":"Attendance","weight":10,"description":"Roll call & engagement"},{"id":"sub-gened-ww","name":"Written Works","weight":50,"description":"Quizzes & conceptual exercises"},{"id":"sub-gened-pt","name":"Performance Tasks","weight":40,"description":"Class activities & seatwork"}]},
        {"id":"cat-gened-cbo","name":"Project (CBO)","weight":25,"color":"indigo","description":"Course-based Outputs (100%)","isTransmutable":false,"subCategories":[{"id":"sub-gened-cbo","name":"Course-based Outputs","weight":100,"description":"Projects, portfolios, or term papers"}]},
        {"id":"cat-gened-exam","name":"Examination (WE)","weight":35,"color":"rose","description":"Periodic Written Examination (100%)","subCategories":[{"id":"sub-gened-we","name":"Written Examination","weight":100,"description":"Major periodic examinations"}]}
    ]'::jsonb
),
(
    'tmpl-bcp-profnonlab',
    'BCP - Professional Subjects (Non-Laboratory)',
    'Official Bestlink College distribution for Non-Laboratory Professional subjects: Class Standing (40%), Project (35%), Examination (25%).',
    FALSE,
    75,
    '[
        {"id":"cat-nonlab-cs","name":"Class Standing","weight":40,"color":"emerald","description":"Attendance (10%), Written Works (40%), Performance Tasks (50%)","subCategories":[{"id":"sub-nonlab-att","name":"Attendance","weight":10,"description":"Roll call & class participation"},{"id":"sub-nonlab-ww","name":"Written Works","weight":40,"description":"Quizzes, homework & seatwork"},{"id":"sub-nonlab-pt","name":"Performance Tasks","weight":50,"description":"Individual / group class activities"}]},
        {"id":"cat-nonlab-cbo","name":"Project (CBO)","weight":35,"color":"indigo","description":"Course-based Outputs (100%)","isTransmutable":false,"subCategories":[{"id":"sub-nonlab-cbo","name":"Course-based Outputs","weight":100,"description":"Case study, research paper, or term project"}]},
        {"id":"cat-nonlab-exam","name":"Examination (WE)","weight":25,"color":"rose","description":"Periodic Written Examination (100%)","subCategories":[{"id":"sub-nonlab-we","name":"Written Examination","weight":100,"description":"Major periodic exam"}]}
    ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_default = EXCLUDED.is_default,
    passing_grade = EXCLUDED.passing_grade,
    matrix = EXCLUDED.matrix,
    updated_at = NOW();

-- 4. Seed Official Academic Calendar Holidays
INSERT INTO holidays (id, date, title, type, description)
VALUES
    ('hol-1', '2026-08-31', 'National Heroes Day', 'national', 'Regular National Holiday'),
    ('hol-2', '2026-09-21', 'School Foundation Anniversary', 'school', 'Institutional Celebration'),
    ('hol-3', '2026-10-15', 'Midterm Break & Study Day', 'break', 'Academic break prior to term exams'),
    ('hol-4', '2026-10-31', 'Special Non-Working Holiday', 'national', 'All Saints Eve'),
    ('hol-5', '2026-11-01', 'All Saints Day', 'national', 'National Special Non-Working Day'),
    ('hol-6', '2026-11-02', 'All Souls Day', 'national', 'Special Working Holiday'),
    ('hol-7', '2026-11-30', 'Bonifacio Day', 'national', 'Regular National Holiday'),
    ('hol-8', '2026-12-08', 'Feast of the Immaculate Conception', 'national', 'Special Non-Working Holiday'),
    ('hol-9', '2026-12-25', 'Christmas Day', 'national', 'Regular National Holiday'),
    ('hol-10', '2026-12-30', 'Rizal Day', 'national', 'Regular National Holiday')
ON CONFLICT (id) DO UPDATE SET
    date = EXCLUDED.date,
    title = EXCLUDED.title,
    type = EXCLUDED.type,
    description = EXCLUDED.description;
