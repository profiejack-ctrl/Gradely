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

export const INITIAL_GLOBAL_TEMPLATES: GradingMatrixTemplate[] = [];

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
