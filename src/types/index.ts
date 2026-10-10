export type UserRole = 'dean' | 'teacher' | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  studentNumber?: string; // e.g. 2026-0012
  sectionId?: string;     // Enrolled section ID (for students)
  title?: string;         // e.g. "Lead Instructor", "Professor"
  department?: string;    // e.g. "Computer Science & IT"
  mustChangePassword?: boolean; // Required to change temporary password on first login
  customPassword?: string;      // Student custom password
}

export interface Section {
  id: string;
  name: string;             // e.g., "BSCS 3-A" or "Grade 10 - Sapphire"
  gradeLevelOrYear: string; // e.g., "3rd Year" or "Grade 10"
  academicYear: string;     // e.g., "2025-2026"
  semester: string;         // e.g., "1st Semester" or "Full Year"
  description?: string;
  room?: string;            // e.g., "Lab 402"
}

export interface MatrixSubCategory {
  id: string;
  name: string;             // e.g. "Attendance", "Performance Task", "Quizzes"
  weight: number;           // Weight within the parent category (e.g. 10%, 50%, 40% = 100%)
  description?: string;
}

export interface MatrixCategory {
  id: string;
  name: string;             // e.g. "Class Standing", "Exams", "Projects"
  weight: number;           // Weight in final grade (e.g. 35%, 25%, 40% = 100%)
  description?: string;
  color?: string;           // Badge accent color
  subCategories?: MatrixSubCategory[]; // Sub-components (e.g. Attendance 10%, Performance Task 50%, Quizzes 40%)
}

export interface GradingMatrixTemplate {
  id: string;
  name: string;             // e.g. "Laboratory Standard", "General Lecture"
  description?: string;
  isDefault?: boolean;
  passingGrade: number;
  matrix: MatrixCategory[];
}

export interface Subject {
  id: string;
  sectionId: string;
  name: string;             // e.g., "Web Systems & Technologies"
  code: string;             // e.g., "CS-301"
  teacherId: string;
  passingGrade: number;     // e.g., 75
  matrix: MatrixCategory[]; // Customizable grading matrix
  schedule?: string;        // e.g., "MWF 9:00 AM - 10:30 AM"
  units?: number;           // e.g., 3
}

export type GradingPeriod = 'prelim' | 'midterm' | 'finals';

export const GRADING_PERIODS: { id: GradingPeriod; name: string; weight: number; shortName: string }[] = [
  { id: 'prelim', name: 'Prelim Period', weight: 30, shortName: 'Prelim' },
  { id: 'midterm', name: 'Midterm Period', weight: 30, shortName: 'Midterm' },
  { id: 'finals', name: 'Finals Period', weight: 40, shortName: 'Finals' },
];

export interface Assessment {
  id: string;
  subjectId: string;
  categoryId: string;       // References MatrixCategory.id or MatrixSubCategory.id
  parentCategoryId?: string;// Optional reference to parent MatrixCategory.id
  period?: GradingPeriod;   // Prelim, Midterm, or Finals (default: prelim)
  title: string;            // e.g. "Quiz 1 - Modern CSS & Layouts"
  maxScore: number;         // e.g. 50
  date: string;             // YYYY-MM-DD
  dueDate?: string;
  description?: string;
}

export interface ScoreRecord {
  id: string;
  assessmentId: string;
  studentId: string;
  score: number;            // Raw points earned
  submittedAt?: string;
  remarks?: string;
}

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused';

export interface AttendanceRecord {
  id: string;
  subjectId: string;
  studentId: string;
  date: string;             // YYYY-MM-DD
  status: AttendanceStatus;
  period?: GradingPeriod;   // Prelim, Midterm, or Finals association
  note?: string;
}

export interface Holiday {
  id: string;
  date: string;             // YYYY-MM-DD
  title: string;            // e.g. "National Heroes Day", "All Saints' Day"
  type: 'national' | 'school' | 'suspension' | 'break';
  description?: string;
}


export interface SubCategoryScoreSummary {
  subCategory: MatrixSubCategory;
  earnedPoints: number;
  maxPoints: number;
  rawPercentage: number;
  weightedContribution: number; // rawPercentage * (weight / 100)
  assessmentCount: number;
}

export interface CategoryScoreSummary {
  category: MatrixCategory;
  earnedPoints: number;
  maxPoints: number;
  rawPercentage: number;        // (earned / max) * 100, or aggregated from subCategories
  weightedContribution: number; // rawPercentage * (category.weight / 100)
  assessmentCount: number;
  subCategorySummaries?: SubCategoryScoreSummary[];
}

export interface PeriodGradeSummary {
  period: GradingPeriod;
  periodName: string;
  weight: number;               // Term weight, e.g. 30 for Prelim, 30 for Midterm, 40 for Finals
  grade: number;                // Computed weighted percentage (0-100)
  categories: CategoryScoreSummary[];
  attendanceRate: number;
  assessmentCount: number;
  isPassing: boolean;
  hasRecords: boolean;
}

export interface StudentSubjectPerformance {
  subject: Subject;
  student: User;
  categories: CategoryScoreSummary[];
  attendanceRate: number;    // %
  finalGrade: number;        // Computed semestral grade (30% Prelim + 30% Midterm + 40% Finals)
  gpa: number;               // Converted GPA (e.g. 4.0 scale)
  isPassing: boolean;
  remarks: 'Passed' | 'Failed' | 'Incomplete' | 'Honors';
  periods: Record<GradingPeriod, PeriodGradeSummary>;
}

