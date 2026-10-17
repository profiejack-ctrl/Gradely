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

export const BCP_GRADING_TEMPLATES: GradingMatrixTemplate[] = [
  {
    id: 'tmpl-bcp-gened',
    name: 'BCP - General Education (GenEd)',
    description: 'Official Bestlink College grading distribution for GenEd subjects: Class Standing (40%), Project (25%), Examination (35%).',
    isDefault: false,
    passingGrade: 75,
    useTransmutation: true,
    matrix: [
      {
        id: 'cat-gened-cs',
        name: 'Class Standing',
        weight: 40,
        color: 'emerald',
        description: 'Attendance (10%), Written Works (50%), Performance Tasks (40%)',
        subCategories: [
          { id: 'sub-gened-att', name: 'Attendance', weight: 10, description: 'Roll call & engagement' },
          { id: 'sub-gened-ww', name: 'Written Works', weight: 50, description: 'Quizzes & conceptual exercises' },
          { id: 'sub-gened-pt', name: 'Performance Tasks', weight: 40, description: 'Class activities & seatwork' },
        ],
      },
      {
        id: 'cat-gened-cbo',
        name: 'Project (CBO)',
        weight: 25,
        color: 'indigo',
        description: 'Course-based Outputs (100%)',
        isTransmutable: false,
        subCategories: [
          { id: 'sub-gened-cbo', name: 'Course-based Outputs', weight: 100, description: 'Projects, portfolios, or term papers' },
        ],
      },
      {
        id: 'cat-gened-exam',
        name: 'Examination (WE)',
        weight: 35,
        color: 'rose',
        description: 'Periodic Written Examination (100%)',
        subCategories: [
          { id: 'sub-gened-we', name: 'Written Examination', weight: 100, description: 'Major periodic examinations' },
        ],
      },
    ],
  },
  {
    id: 'tmpl-bcp-proflab',
    name: 'BCP - Professional Subjects (Laboratory)',
    description: 'Official Bestlink College distribution for Laboratory Professional subjects (e.g. IPT101, IT/CS Labs): Class Standing (35%), Project (40%), Examination (25%).',
    isDefault: true,
    passingGrade: 75,
    useTransmutation: true,
    matrix: [
      {
        id: 'cat-proflab-cs',
        name: 'Class Standing',
        weight: 35,
        color: 'emerald',
        description: 'Attendance (10%), Written Works (40%), Performance Tasks (50%)',
        subCategories: [
          { id: 'sub-proflab-att', name: 'Attendance', weight: 10, description: 'Roll call & lab attendance' },
          { id: 'sub-proflab-ww', name: 'Written Works', weight: 40, description: 'Quizzes & written exercises' },
          { id: 'sub-proflab-pt', name: 'Performance Tasks', weight: 50, description: 'Hands-on lab exercises & coding activities' },
        ],
      },
      {
        id: 'cat-proflab-cbo',
        name: 'Project (CBO)',
        weight: 40,
        color: 'indigo',
        description: 'Course-based Outputs (100%)',
        isTransmutable: false,
        subCategories: [
          { id: 'sub-proflab-cbo', name: 'Course-based Outputs', weight: 100, description: 'Software prototype, lab system, or project output' },
        ],
      },
      {
        id: 'cat-proflab-exam',
        name: 'Examination (WE)',
        weight: 25,
        color: 'rose',
        description: 'Periodic Written Examination (100%)',
        subCategories: [
          { id: 'sub-proflab-we', name: 'Written Examination', weight: 100, description: 'Major periodic exam' },
        ],
      },
    ],
  },
  {
    id: 'tmpl-bcp-profnonlab',
    name: 'BCP - Professional Subjects (Non-Laboratory)',
    description: 'Official Bestlink College distribution for Non-Laboratory Professional subjects: Class Standing (40%), Project (35%), Examination (25%).',
    isDefault: false,
    passingGrade: 75,
    useTransmutation: true,
    matrix: [
      {
        id: 'cat-nonlab-cs',
        name: 'Class Standing',
        weight: 40,
        color: 'emerald',
        description: 'Attendance (10%), Written Works (40%), Performance Tasks (50%)',
        subCategories: [
          { id: 'sub-nonlab-att', name: 'Attendance', weight: 10, description: 'Roll call & class participation' },
          { id: 'sub-nonlab-ww', name: 'Written Works', weight: 40, description: 'Quizzes, homework & seatwork' },
          { id: 'sub-nonlab-pt', name: 'Performance Tasks', weight: 50, description: 'Individual / group class activities' },
        ],
      },
      {
        id: 'cat-nonlab-cbo',
        name: 'Project (CBO)',
        weight: 35,
        color: 'indigo',
        description: 'Course-based Outputs (100%)',
        isTransmutable: false,
        subCategories: [
          { id: 'sub-nonlab-cbo', name: 'Course-based Outputs', weight: 100, description: 'Case study, research paper, or term project' },
        ],
      },
      {
        id: 'cat-nonlab-exam',
        name: 'Examination (WE)',
        weight: 25,
        color: 'rose',
        description: 'Periodic Written Examination (100%)',
        subCategories: [
          { id: 'sub-nonlab-we', name: 'Written Examination', weight: 100, description: 'Major periodic exam' },
        ],
      },
    ],
  },
  {
    id: 'tmpl-bcp-profboard',
    name: 'BCP - Professional Subjects (Board Courses)',
    description: 'Official Bestlink College distribution for Board Degree Programs: Class Standing (40%), Project (30%), Examination (30%).',
    isDefault: false,
    passingGrade: 75,
    useTransmutation: true,
    matrix: [
      {
        id: 'cat-board-cs',
        name: 'Class Standing',
        weight: 40,
        color: 'emerald',
        description: 'Attendance (10%), Written Works (40%), Performance Tasks (50%)',
        subCategories: [
          { id: 'sub-board-att', name: 'Attendance', weight: 10 },
          { id: 'sub-board-ww', name: 'Written Works', weight: 40 },
          { id: 'sub-board-pt', name: 'Performance Tasks', weight: 50 },
        ],
      },
      {
        id: 'cat-board-cbo',
        name: 'Project (CBO)',
        weight: 30,
        color: 'indigo',
        description: 'Course-based Outputs (100%)',
        isTransmutable: false,
        subCategories: [
          { id: 'sub-board-cbo', name: 'Course-based Outputs', weight: 100 },
        ],
      },
      {
        id: 'cat-board-exam',
        name: 'Examination (WE)',
        weight: 30,
        color: 'rose',
        description: 'Periodic Written Examination (100%)',
        subCategories: [
          { id: 'sub-board-we', name: 'Written Examination', weight: 100 },
        ],
      },
    ],
  },
  {
    id: 'tmpl-bcp-profnonboard',
    name: 'BCP - Professional Subjects (Non-Board Courses)',
    description: 'Official Bestlink College distribution for Non-Board Professional courses: Class Standing (35%), Project (40%), Examination (25%).',
    isDefault: false,
    passingGrade: 75,
    useTransmutation: true,
    matrix: [
      {
        id: 'cat-nonboard-cs',
        name: 'Class Standing',
        weight: 35,
        color: 'emerald',
        description: 'Attendance (10%), Written Works (40%), Performance Tasks (50%)',
        subCategories: [
          { id: 'sub-nonboard-att', name: 'Attendance', weight: 10 },
          { id: 'sub-nonboard-ww', name: 'Written Works', weight: 40 },
          { id: 'sub-nonboard-pt', name: 'Performance Tasks', weight: 50 },
        ],
      },
      {
        id: 'cat-nonboard-cbo',
        name: 'Project (CBO)',
        weight: 40,
        color: 'indigo',
        description: 'Course-based Outputs (100%)',
        isTransmutable: false,
        subCategories: [
          { id: 'sub-nonboard-cbo', name: 'Course-based Outputs', weight: 100 },
        ],
      },
      {
        id: 'cat-nonboard-exam',
        name: 'Examination (WE)',
        weight: 25,
        color: 'rose',
        description: 'Periodic Written Examination (100%)',
        subCategories: [
          { id: 'sub-nonboard-we', name: 'Written Examination', weight: 100 },
        ],
      },
    ],
  },
  {
    id: 'tmpl-bcp-profoffcampus',
    name: 'BCP - Professional Subjects (Off-Campus / OC)',
    description: 'Official Bestlink College distribution for Off-Campus immersion subjects: Class Standing (40%), Project (35%: CBO 40%, OCR 60%), Examination (25%).',
    isDefault: false,
    passingGrade: 75,
    useTransmutation: true,
    matrix: [
      {
        id: 'cat-oc-cs',
        name: 'Class Standing',
        weight: 40,
        color: 'emerald',
        description: 'Attendance (10%), Written Works (40%), Performance Tasks (50%)',
        subCategories: [
          { id: 'sub-oc-att', name: 'Attendance', weight: 10 },
          { id: 'sub-oc-ww', name: 'Written Works', weight: 40 },
          { id: 'sub-oc-pt', name: 'Performance Tasks', weight: 50 },
        ],
      },
      {
        id: 'cat-oc-proj',
        name: 'Project',
        weight: 35,
        color: 'indigo',
        description: 'Course-based Outputs (40%), Off-Campus Requirements (60%)',
        isTransmutable: false,
        subCategories: [
          { id: 'sub-oc-cbo', name: 'Course-based Outputs', weight: 40, description: 'Academic deliverables' },
          { id: 'sub-oc-ocr', name: 'Off-Campus Requirements', weight: 60, description: 'Field visits & community engagement' },
        ],
      },
      {
        id: 'cat-oc-exam',
        name: 'Examination (WE)',
        weight: 25,
        color: 'rose',
        description: 'Periodic Written Examination (100%)',
        subCategories: [
          { id: 'sub-oc-we', name: 'Written Examination', weight: 100 },
        ],
      },
    ],
  },
  {
    id: 'tmpl-bcp-nstp1',
    name: 'BCP - NSTP 1',
    description: 'Official Bestlink College grading distribution for NSTP 1: Class Standing (40%), Project (30%), Examination (30%).',
    isDefault: false,
    passingGrade: 75,
    useTransmutation: true,
    matrix: [
      {
        id: 'cat-nstp1-cs',
        name: 'Class Standing',
        weight: 40,
        color: 'emerald',
        description: 'Attendance (10%), Written Works (50%), Performance Tasks (40%)',
        subCategories: [
          { id: 'sub-nstp1-att', name: 'Attendance', weight: 10 },
          { id: 'sub-nstp1-ww', name: 'Written Works', weight: 50 },
          { id: 'sub-nstp1-pt', name: 'Performance Tasks', weight: 40 },
        ],
      },
      {
        id: 'cat-nstp1-cbo',
        name: 'Project (CBO)',
        weight: 30,
        color: 'indigo',
        description: 'Course-based Outputs (100%)',
        isTransmutable: false,
        subCategories: [
          { id: 'sub-nstp1-cbo', name: 'Course-based Outputs', weight: 100 },
        ],
      },
      {
        id: 'cat-nstp1-exam',
        name: 'Examination (WE)',
        weight: 30,
        color: 'rose',
        description: 'Periodic Written Examination (100%)',
        subCategories: [
          { id: 'sub-nstp1-we', name: 'Written Examination', weight: 100 },
        ],
      },
    ],
  },
  {
    id: 'tmpl-bcp-nstp2',
    name: 'BCP - NSTP 2',
    description: 'Official Bestlink College grading distribution for NSTP 2: Class Standing (30%), Project (40%: OCR 100%), Examination (30%).',
    isDefault: false,
    passingGrade: 75,
    useTransmutation: true,
    matrix: [
      {
        id: 'cat-nstp2-cs',
        name: 'Class Standing',
        weight: 30,
        color: 'emerald',
        description: 'Attendance (10%), Written Works (35%), Performance Tasks (55%)',
        subCategories: [
          { id: 'sub-nstp2-att', name: 'Attendance', weight: 10 },
          { id: 'sub-nstp2-ww', name: 'Written Works', weight: 35 },
          { id: 'sub-nstp2-pt', name: 'Performance Tasks', weight: 55 },
        ],
      },
      {
        id: 'cat-nstp2-proj',
        name: 'Project (OCR)',
        weight: 40,
        color: 'indigo',
        description: 'Off-Campus Community Outreach & Immersion (100%)',
        isTransmutable: false,
        subCategories: [
          { id: 'sub-nstp2-ocr', name: 'Off-Campus Requirements', weight: 100, description: 'Community outreach / immersion' },
        ],
      },
      {
        id: 'cat-nstp2-exam',
        name: 'Examination (WE)',
        weight: 30,
        color: 'rose',
        description: 'Periodic Written Examination (100%)',
        subCategories: [
          { id: 'sub-nstp2-we', name: 'Written Examination', weight: 100 },
        ],
      },
    ],
  },
  {
    id: 'tmpl-bcp-research',
    name: 'BCP - Research / Thesis / Capstone',
    description: 'Official Bestlink College distribution for Research & Capstone: Class Standing (25%), Project (40%), Examination (35%: Written 20%, Oral Defense 80%).',
    isDefault: false,
    passingGrade: 75,
    useTransmutation: true,
    matrix: [
      {
        id: 'cat-res-cs',
        name: 'Class Standing',
        weight: 25,
        color: 'emerald',
        description: 'Attendance (10%), Written Works (45%), Performance Tasks (45%)',
        subCategories: [
          { id: 'sub-res-att', name: 'Attendance', weight: 10 },
          { id: 'sub-res-ww', name: 'Written Works', weight: 45, description: 'Literature reviews & chapter drafts' },
          { id: 'sub-res-pt', name: 'Performance Tasks', weight: 45, description: 'Methodology, data collection, consultation' },
        ],
      },
      {
        id: 'cat-res-cbo',
        name: 'Project (CBO)',
        weight: 40,
        color: 'indigo',
        description: 'Final Research Manuscript & Prototype / System (100%)',
        isTransmutable: false,
        subCategories: [
          { id: 'sub-res-cbo', name: 'Course-based Outputs', weight: 100, description: 'Completed manuscript and deliverables' },
        ],
      },
      {
        id: 'cat-res-exam',
        name: 'Examination',
        weight: 35,
        color: 'rose',
        description: 'Written Examination (20%), Oral Examination / Title & Final Defense (80%)',
        subCategories: [
          { id: 'sub-res-we', name: 'Written Examination', weight: 20, description: 'Written research concepts examination' },
          { id: 'sub-res-oe', name: 'Oral Examination', weight: 80, description: 'Oral defense presentation & panel evaluation' },
        ],
      },
    ],
  },
  {
    id: 'tmpl-bcp-ojt',
    name: 'BCP - OJT / Practicum',
    description: 'Official Bestlink College distribution for On-the-Job Training & Practicum: Class Standing (50%), Project (35%), Examination (15%).',
    isDefault: false,
    passingGrade: 75,
    useTransmutation: true,
    matrix: [
      {
        id: 'cat-ojt-cs',
        name: 'Class Standing',
        weight: 50,
        color: 'emerald',
        description: 'Attendance/DTR (30%), Written Reports (40%), Work Performance PT (30%)',
        subCategories: [
          { id: 'sub-ojt-att', name: 'Attendance', weight: 30, description: 'Daily Time Record (DTR) & hours rendered' },
          { id: 'sub-ojt-ww', name: 'Written Works', weight: 40, description: 'Weekly progress reports & journals' },
          { id: 'sub-ojt-pt', name: 'Performance Tasks', weight: 30, description: 'HTE supervisor evaluation & work performance' },
        ],
      },
      {
        id: 'cat-ojt-proj',
        name: 'Project (Portfolio)',
        weight: 35,
        color: 'indigo',
        description: 'Comprehensive Practicum Portfolio & Documentation (100%)',
        isTransmutable: false,
        subCategories: [
          { id: 'sub-ojt-portfolio', name: 'Practicum Portfolio', weight: 100, description: 'Documentation, certificates & final report' },
        ],
      },
      {
        id: 'cat-ojt-exam',
        name: 'Examination (WE)',
        weight: 15,
        color: 'rose',
        description: 'OJT Exit Assessment / Exit Examination (100%)',
        subCategories: [
          { id: 'sub-ojt-we', name: 'Written Examination', weight: 100, description: 'Practicum exit examination' },
        ],
      },
    ],
  },
];

export const INITIAL_GLOBAL_TEMPLATES: GradingMatrixTemplate[] = BCP_GRADING_TEMPLATES;

export const INITIAL_USERS: User[] = [
  {
    id: 'dean-rommel-constantino',
    name: 'Rommel Constantino',
    email: 'rommel.constantino@gradely.edu',
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
