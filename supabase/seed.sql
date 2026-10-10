-- =============================================================================
-- AuraSMS - Initial Seed Data for Supabase PostgreSQL
-- =============================================================================

-- 1. Users
INSERT INTO users (id, name, email, role, student_number, section_id, avatar, title, department) VALUES
('teacher-1', 'Prof. Alex Mercer', 'alex.mercer@aurasms.edu', 'teacher', NULL, NULL, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', 'Department Chair & Professor', 'College of Information and Computing Sciences'),
('stud-1', 'Sophia Chen', 'sophia.chen@student.aurasms.edu', 'student', '2026-0101', 'sec-1', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80', NULL, NULL),
('stud-2', 'Liam Davis', 'liam.davis@student.aurasms.edu', 'student', '2026-0102', 'sec-1', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80', NULL, NULL),
('stud-3', 'Ethan Walker', 'ethan.walker@student.aurasms.edu', 'student', '2026-0103', 'sec-1', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', NULL, NULL),
('stud-4', 'Mia Rodriguez', 'mia.rodriguez@student.aurasms.edu', 'student', '2026-0104', 'sec-1', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', NULL, NULL),
('stud-5', 'Noah Taylor', 'noah.taylor@student.aurasms.edu', 'student', '2026-0105', 'sec-1', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', NULL, NULL),
('stud-6', 'Ava Johnson', 'ava.johnson@student.aurasms.edu', 'student', '2026-0201', 'sec-2', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80', NULL, NULL),
('stud-7', 'Lucas Brown', 'lucas.brown@student.aurasms.edu', 'student', '2026-0202', 'sec-2', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- 2. Sections
INSERT INTO sections (id, name, grade_level_or_year, academic_year, semester, room, description) VALUES
('sec-1', 'BSCS 3-A', '3rd Year College', '2025-2026', '1st Semester', 'Computer Lab 304', 'Bachelor of Science in Computer Science - Section 3A'),
('sec-2', 'Grade 11 - STEM A', 'Grade 11', '2025-2026', '1st Semester', 'Science Wing Rm 202', 'Senior High School STEM Academic Track')
ON CONFLICT (id) DO NOTHING;

-- 3. Matrix Templates
INSERT INTO grading_matrix_templates (id, name, description, is_default, passing_grade, matrix) VALUES
('tmpl-lab-standard', 'Laboratory Standard (Class Standing 35%, Exams 25%, Projects 40%)', 'Specialized for Laboratory courses. Class Standing (35%) includes Attendance (10%), Performance Tasks (50%), and Quizzes (40%).', TRUE, 75,
'[{"id":"cat-cs","name":"Class Standing","weight":35,"color":"emerald","description":"Composite class standing components","subCategories":[{"id":"sub-att","name":"Attendance","weight":10,"description":"Class attendance and recitation"},{"id":"sub-pt","name":"Performance Task","weight":50,"description":"Hands-on lab experiments and outputs"},{"id":"sub-quiz","name":"Quizzes","weight":40,"description":"Weekly theory and concept checks"}]},{"id":"cat-exam","name":"Exams","weight":25,"color":"rose","description":"Major periodic examinations (Prelim, Midterm, Finals)"},{"id":"cat-proj","name":"Projects","weight":40,"color":"purple","description":"Periodic projects, machine problems, and capstone milestones"}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 4. Subjects
INSERT INTO subjects (id, section_id, teacher_id, name, code, schedule, units, passing_grade, matrix) VALUES
('subj-1', 'sec-1', 'teacher-1', 'Web Systems & Technologies', 'CS-301', 'Mon / Wed 09:00 AM - 11:00 AM', 3, 75,
'[{"id":"cat-cs","name":"Class Standing","weight":35,"color":"emerald","description":"Composite class standing components","subCategories":[{"id":"sub-att","name":"Attendance","weight":10,"description":"Class attendance and recitation"},{"id":"sub-pt","name":"Performance Task","weight":50,"description":"Hands-on lab experiments and outputs"},{"id":"sub-quiz","name":"Quizzes","weight":40,"description":"Weekly theory and concept checks"}]},{"id":"cat-exam","name":"Exams","weight":25,"color":"rose","description":"Major periodic examinations (Prelim, Midterm, Finals)"},{"id":"cat-proj","name":"Projects","weight":40,"color":"purple","description":"Periodic projects, machine problems, and capstone milestones"}]'::jsonb),
('subj-2', 'sec-1', 'teacher-1', 'Database Management Systems', 'CS-302', 'Tue / Thu 01:00 PM - 03:00 PM', 3, 75,
'[{"id":"cat-cs","name":"Class Standing","weight":35,"color":"emerald","description":"Composite class standing components","subCategories":[{"id":"sub-att","name":"Attendance","weight":10,"description":"Class attendance and recitation"},{"id":"sub-pt","name":"Performance Task","weight":50,"description":"Hands-on lab experiments and outputs"},{"id":"sub-quiz","name":"Quizzes","weight":40,"description":"Weekly theory and concept checks"}]},{"id":"cat-exam","name":"Exams","weight":25,"color":"rose","description":"Major periodic examinations (Prelim, Midterm, Finals)"},{"id":"cat-proj","name":"Projects","weight":40,"color":"purple","description":"Periodic projects, machine problems, and capstone milestones"}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 5. Holidays
INSERT INTO holidays (id, date, title, type, description) VALUES
('hol-1', '2026-08-31', 'National Heroes Day', 'national', 'Regular National Holiday'),
('hol-2', '2026-09-21', 'School Foundation Anniversary', 'school', 'University-wide Celebrations'),
('hol-3', '2026-10-15', 'Midterm Break & Study Day', 'break', 'Academic break prior to term exams'),
('hol-4', '2026-10-31', 'Special Non-Working Holiday', 'national', 'All Saints Eve'),
('hol-5', '2026-11-01', 'All Saints Day', 'national', 'National Special Non-Working Day'),
('hol-6', '2026-11-02', 'All Souls Day', 'national', 'Special Working Holiday'),
('hol-7', '2026-11-30', 'Bonifacio Day', 'national', 'Regular National Holiday'),
('hol-8', '2026-12-08', 'Feast of the Immaculate Conception', 'national', 'Special Non-Working Holiday'),
('hol-9', '2026-12-25', 'Christmas Day', 'national', 'Regular National Holiday'),
('hol-10', '2026-12-30', 'Rizal Day', 'national', 'Regular National Holiday')
ON CONFLICT (id) DO NOTHING;
