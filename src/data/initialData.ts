import {
  User,
  Section,
  Subject,
  Assessment,
  ScoreRecord,
  AttendanceRecord,
  GradingMatrixTemplate,
  Holiday,
} from '../types';

export const INITIAL_HOLIDAYS: Holiday[] = [
  { id: 'hol-1', date: '2026-08-31', title: 'National Heroes Day', type: 'national' },
  { id: 'hol-2', date: '2026-09-21', title: 'School Foundation Anniversary', type: 'school' },
  { id: 'hol-3', date: '2026-10-15', title: 'Midterm Break & Study Day', type: 'break' },
  { id: 'hol-4', date: '2026-10-31', title: 'Special Non-Working Holiday', type: 'national' },
  { id: 'hol-5', date: '2026-11-01', title: "All Saints' Day", type: 'national' },
  { id: 'hol-6', date: '2026-11-02', title: "All Souls' Day", type: 'national' },
  { id: 'hol-7', date: '2026-11-30', title: 'Bonifacio Day', type: 'national' },
  { id: 'hol-8', date: '2026-12-08', title: 'Feast of the Immaculate Conception', type: 'national' },
  { id: 'hol-9', date: '2026-12-25', title: 'Christmas Day', type: 'national' },
  { id: 'hol-10', date: '2026-12-30', title: 'Rizal Day', type: 'national' },
];

export const INITIAL_GLOBAL_TEMPLATES: GradingMatrixTemplate[] = [
  {
    id: 'tmpl-lab-standard',
    name: 'Laboratory Standard (Class Standing 35%, Exams 25%, Projects 40%)',
    description: 'Specialized for Laboratory courses. Class Standing (35%) includes Attendance (10%), Performance Tasks (50%), and Quizzes (40%).',
    isDefault: true,
    passingGrade: 75,
    matrix: [
      {
        id: 'cat-cs',
        name: 'Class Standing',
        weight: 35,
        color: 'emerald',
        description: 'Composite class standing components',
        subCategories: [
          { id: 'sub-att', name: 'Attendance', weight: 10, description: 'Class attendance and recitation' },
          { id: 'sub-pt', name: 'Performance Task', weight: 50, description: 'Hands-on lab experiments and outputs' },
          { id: 'sub-quiz', name: 'Quizzes', weight: 40, description: 'Weekly theory and concept checks' },
        ],
      },
      {
        id: 'cat-exam',
        name: 'Exams',
        weight: 25,
        color: 'rose',
        description: 'Major periodic examinations (Prelim, Midterm, Finals)',
      },
      {
        id: 'cat-proj',
        name: 'Projects',
        weight: 40,
        color: 'purple',
        description: 'Periodic projects, machine problems, and capstone milestones',
      },
    ],
  },
  {
    id: 'tmpl-lecture-standard',
    name: 'Lecture Standard (Att 10%, Quizzes 20%, Activities 20%, Projects 25%, Exams 25%)',
    description: 'Balanced college lecture course matrix.',
    isDefault: false,
    passingGrade: 75,
    matrix: [
      { id: 'cat-att-std', name: 'Attendance', weight: 10, color: 'blue' },
      { id: 'cat-quiz-std', name: 'Quizzes', weight: 20, color: 'amber' },
      { id: 'cat-act-std', name: 'Activities', weight: 20, color: 'emerald' },
      { id: 'cat-proj-std', name: 'Projects', weight: 25, color: 'purple' },
      { id: 'cat-exam-std', name: 'Exams', weight: 25, color: 'rose' },
    ],
  },
  {
    id: 'tmpl-deped-model',
    name: 'DepEd / K-12 Model (Written Work 30%, Performance Tasks 50%, Exam 20%)',
    description: 'Senior High School standard distribution.',
    isDefault: false,
    passingGrade: 75,
    matrix: [
      { id: 'cat-ww', name: 'Written Work (Quizzes/Tests)', weight: 30, color: 'amber' },
      { id: 'cat-pt', name: 'Performance Tasks & Projects', weight: 50, color: 'emerald' },
      { id: 'cat-qe', name: 'Quarterly Examination', weight: 20, color: 'rose' },
    ],
  },
];

export const INITIAL_USERS: User[] = [
  {
    id: 'dean-rommel-constantino',
    name: 'Rommel Constantino',
    email: 'rommel.constantino@aurasms.edu',
    role: 'dean',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    title: 'College Dean & Department Head',
    department: 'College of Information and Computing Sciences',
  },
];

export const INITIAL_SECTIONS: Section[] = [];

export const INITIAL_SUBJECTS: Subject[] = [];

export const INITIAL_ASSESSMENTS: Assessment[] = [];

export const INITIAL_SCORES: ScoreRecord[] = [];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [];
