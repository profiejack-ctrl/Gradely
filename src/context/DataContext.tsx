import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  Section,
  Subject,
  Assessment,
  ScoreRecord,
  AttendanceRecord,
  User,
  MatrixCategory,
  AttendanceStatus,
  GradingMatrixTemplate,
  GradingPeriod,
  Holiday,
  LearningPlan,
  WeeklyTopic,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_SECTIONS,
  INITIAL_SUBJECTS,
  INITIAL_ASSESSMENTS,
  INITIAL_SCORES,
  INITIAL_ATTENDANCE,
  INITIAL_GLOBAL_TEMPLATES,
  INITIAL_HOLIDAYS,
} from '../data/initialData';
import { syncEngine } from '../services/apiSyncEngine';
import { teachersApi } from '../services/apiClient';
import { USERS_STORAGE_KEY } from './AuthContext';
import {
  encodeSectionDescription,
  formatSectionIds,
  getStudentSectionIds,
  normalizeCourseCode,
} from '../utils/enrollmentUtils';
import { formatStudentName } from '../utils/csvParser';

interface DataContextType {
  sections: Section[];
  subjects: Subject[];
  assessments: Assessment[];
  scores: ScoreRecord[];
  attendance: AttendanceRecord[];
  students: User[];
  teachers: User[];
  allUsers: User[];
  matrixTemplates: GradingMatrixTemplate[];
  holidays: Holiday[];
  learningPlans: LearningPlan[];

  // Faculty
  addTeacher: (teacher: Omit<User, 'id' | 'role'>, initialPassword?: string, mustChangePassword?: boolean) => Promise<User | null>;
  updateTeacher: (id: string, data: Partial<User>, newPassword?: string) => void;
  deleteTeacher: (id: string) => boolean;

  // Sections
  addSection: (section: Omit<Section, 'id'>) => Section;
  updateSection: (id: string, data: Partial<Section>) => void;
  deleteSection: (id: string) => void;

  // Subjects
  addSubject: (subject: Omit<Subject, 'id'>) => Subject;
  updateSubject: (id: string, data: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;
  updateSubjectMatrix: (subjectId: string, matrix: MatrixCategory[], passingGrade?: number, useTransmutation?: boolean) => void;

  // Global Templates
  saveMatrixTemplate: (template: Omit<GradingMatrixTemplate, 'id'>, idToUpdate?: string) => GradingMatrixTemplate;
  deleteMatrixTemplate: (id: string) => void;
  applyTemplateGlobally: (templateId: string) => void;
  applyTemplateToSubject: (subjectId: string, templateId: string) => void;

  // Assessments
  addAssessment: (assessment: Omit<Assessment, 'id'>) => Assessment;
  updateAssessment: (id: string, data: Partial<Assessment>) => void;
  deleteAssessment: (id: string) => void;

  // Scores
  setScore: (assessmentId: string, studentId: string, score: number, remarks?: string) => void;
  deleteScore: (assessmentId: string, studentId: string) => void;
  batchUpdateScores: (updates: { assessmentId: string; studentId: string; score: number; remarks?: string }[]) => void;
  importOfficialGrades: (payload: {
    subjectId: string;
    sectionId: string;
    period: GradingPeriod;
    assessments: Array<{
      colHeader: string;
      title: string;
      maxScore: number;
      categoryId: string;
      parentCategoryId?: string;
    }>;
    scores: Array<{
      colHeader: string;
      studentNumber: string;
      score: number;
      remarks?: string;
    }>;
    attendance?: Array<{
      sessionIndex: number;
      studentNumber: string;
      date: string;
      status: AttendanceStatus;
    }>;
    studentsToEnroll?: Array<{
      studentNumber: string;
      name: string;
    }>;
  }) => {
    studentsEnrolled: number;
    assessmentsCount: number;
    scoresCount: number;
    attendanceCount: number;
  };

  // Attendance
  setAttendance: (
    subjectId: string,
    studentId: string,
    date: string,
    status: AttendanceStatus,
    note?: string,
    period?: GradingPeriod
  ) => void;
  markAllAttendance: (
    subjectId: string,
    studentIds: string[],
    date: string,
    status: AttendanceStatus,
    period?: GradingPeriod
  ) => void;
  clearAttendanceForDate: (
    subjectId: string,
    date: string,
    studentIds?: string[]
  ) => void;
  deleteAttendanceRecord: (id: string) => void;

  // Holidays
  addHoliday: (holiday: Omit<Holiday, 'id'>) => Holiday;
  deleteHoliday: (id: string) => void;

  // Students
  addStudent: (student: Omit<User, 'id' | 'role'>) => User;
  bulkAddStudents: (students: Omit<User, 'id' | 'role'>[]) => User[];
  updateStudent: (id: string, data: Partial<User>, options?: { skipSync?: boolean }) => void;
  deleteStudent: (id: string) => void;
  resetUserPassword: (userId: string) => Promise<{ success: boolean; initialPassword: string; error?: string; user?: User }>;

  // AI Learning Plans & Syllabus
  saveLearningPlan: (plan: LearningPlan) => void;
  updateWeeklyTopic: (subjectId: string, topicId: string, updates: Partial<WeeklyTopic>) => void;
  toggleWeeklyTopicPublish: (subjectId: string, topicId: string, isPublished: boolean) => void;
  toggleAllWeeklyTopicsPublish: (subjectId: string, isPublished: boolean) => void;
  deleteLearningPlan: (subjectId: string) => void;
  getLearningPlanBySubjectId: (subjectId: string) => LearningPlan | undefined;

  // Backup & Reset & Sync
  resetToDefault: () => void;
  getRawData: () => Record<string, unknown>;
  importData: (jsonData: string) => boolean;
  pullFromCloud: (force?: boolean) => Promise<void>;
  pushAllToCloud: () => Promise<{ success: boolean; error?: any }>;
  startFreshOfficial: (options?: { wipeCloud?: boolean }) => Promise<void>;
  rolloverAcademicYear: (
    newAcademicYear: string,
    newSemester: string,
    options: { clearScores: boolean; clearAttendance: boolean; clearAssessments: boolean; syncToCloud?: boolean }
  ) => Promise<void>;
  resetToDemoData: (syncToCloud?: boolean) => Promise<void>;
}

const STORAGE_KEY = 'gradely_data_store_v3';

// Helper to filter out legacy templates that the user has decommissioned
export const isDeprecatedTemplate = (name: string, id: string): boolean => {
  const n = (name || '').toLowerCase();
  const i = (id || '').toLowerCase();
  return (
    n.includes('lecture standard') ||
    n.includes('deped') ||
    n.includes('k-12') ||
    n.includes('k12') ||
    i.includes('lecture-standard') ||
    i.includes('deped')
  );
};

const getInitialData = <T,>(suffix: string, fallbackDefault: T): T => {
  const saved = localStorage.getItem(`${STORAGE_KEY}_${suffix}`) || localStorage.getItem(`aurasms_data_store_v3_${suffix}`);
  return saved ? JSON.parse(saved) : fallbackDefault;
};

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [matrixTemplates, setMatrixTemplates] = useState<GradingMatrixTemplate[]>(() => {
    const rawTemplates: GradingMatrixTemplate[] = getInitialData('templates', INITIAL_GLOBAL_TEMPLATES);
    const valid = rawTemplates.filter((t) => !isDeprecatedTemplate(t.name, t.id));
    return valid.length > 0 ? valid : INITIAL_GLOBAL_TEMPLATES;
  });

  const [sections, setSections] = useState<Section[]>(() => {
    return getInitialData('sections', INITIAL_SECTIONS);
  });

  const [subjects, setSubjects] = useState<Subject[]>(() => {
    const rawSubjects: Subject[] = getInitialData('subjects', INITIAL_SUBJECTS);
    return rawSubjects.map((s) => {
      let matrix = s.matrix || [];
      let useTransmutation = s.useTransmutation !== undefined ? s.useTransmutation : true;
      if (matrix && !Array.isArray(matrix) && typeof matrix === 'object') {
        useTransmutation = (matrix as any).useTransmutation !== false;
        matrix = (matrix as any).categories || [];
      }
      return {
        ...s,
        matrix,
        useTransmutation,
      };
    });
  });

  const [assessments, setAssessments] = useState<Assessment[]>(() => {
    return getInitialData('assessments', INITIAL_ASSESSMENTS);
  });

  const [scores, setScores] = useState<ScoreRecord[]>(() => {
    return getInitialData('scores', INITIAL_SCORES);
  });

  const [attendance, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    return getInitialData('attendance', INITIAL_ATTENDANCE);
  });

  const [holidays, setHolidays] = useState<Holiday[]>(() => {
    return getInitialData('holidays', INITIAL_HOLIDAYS);
  });

  const [allUsers, setAllUsers] = useState<User[]>(() => {
    return getInitialData('users', INITIAL_USERS);
  });

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_templates`, JSON.stringify(matrixTemplates));
  }, [matrixTemplates]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_sections`, JSON.stringify(sections));
  }, [sections]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_subjects`, JSON.stringify(subjects));
  }, [subjects]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_assessments`, JSON.stringify(assessments));
  }, [assessments]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_scores`, JSON.stringify(scores));
  }, [scores]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_attendance`, JSON.stringify(attendance));
  }, [attendance]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_holidays`, JSON.stringify(holidays));
  }, [holidays]);

  const [learningPlans, setLearningPlans] = useState<LearningPlan[]>(() => {
    return getInitialData('learning_plans', []);
  });

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_users`, JSON.stringify(allUsers));
  }, [allUsers]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_learning_plans`, JSON.stringify(learningPlans));
  }, [learningPlans]);

  const lastPullRef = useRef<number>(0);
  const isPullingRef = useRef<boolean>(false);

  // Pull authoritative remote data directly from Supabase cloud
  const pullFromCloud = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && (now - lastPullRef.current < 5000 || isPullingRef.current)) {
      return;
    }
    // If local mutations are queued or in flight, do not stomp pending local changes
    if (syncEngine.getQueue().length > 0) return;

    isPullingRef.current = true;
    lastPullRef.current = now;
    try {
      const remote = await syncEngine.pullAll();
      if (!remote) return;

      if (remote.users) {
        setAllUsers(remote.users);
      }
      if (remote.sections) {
        setSections(remote.sections);
      }
      if (remote.matrixTemplates) {
        const filtered = remote.matrixTemplates.filter((t: GradingMatrixTemplate) => !isDeprecatedTemplate(t.name, t.id));
        setMatrixTemplates(filtered.length > 0 ? filtered : INITIAL_GLOBAL_TEMPLATES);
      }
      if (remote.subjects) {
        setSubjects(remote.subjects.map((s: Subject) => {
          let matrix = s.matrix || [];
          let useTransmutation = s.useTransmutation !== undefined ? s.useTransmutation : true;
          if (matrix && !Array.isArray(matrix) && typeof matrix === 'object') {
            useTransmutation = (matrix as any).useTransmutation !== false;
            matrix = (matrix as any).categories || [];
          }
          return {
            ...s,
            matrix,
            useTransmutation,
          };
        }));
      }
      if (remote.assessments) {
        setAssessments(remote.assessments);
      }
      if (remote.scores) {
        setScores(remote.scores);
      }
      if (remote.attendance) {
        setAttendanceRecords(remote.attendance);
      }
      if (remote.holidays) {
        setHolidays(remote.holidays);
      }
    } finally {
      isPullingRef.current = false;
    }
  }, []);

  const pushAllToCloud = useCallback(async () => {
    return await syncEngine.pushAllData({
      users: allUsers,
      sections,
      templates: matrixTemplates,
      subjects,
      assessments,
      scores,
      attendance,
      holidays,
    });
  }, [allUsers, sections, matrixTemplates, subjects, assessments, scores, attendance, holidays]);

  useEffect(() => {
    // Initial sync on mount: flush any pending offline mutations first, then pull authoritative cloud data
    const initSync = async () => {
      if (syncEngine.getQueue().length > 0) {
        await syncEngine.flushQueue();
      }
      await pullFromCloud(true);
    };
    void initSync();

    // Subscribe to realtime database changes (poll every 30s)
    syncEngine.initRealtime(() => {
      void pullFromCloud();
    });

    // Cross-tab synchronization via localStorage: sync state in-memory directly without triggering network calls
    const handleStorage = (e: StorageEvent) => {
      if (!e.key || !e.key.startsWith(STORAGE_KEY) || !e.newValue) return;
      try {
        const parsed = JSON.parse(e.newValue);
        if (e.key.endsWith('_users')) setAllUsers(parsed);
        else if (e.key.endsWith('_sections')) setSections(parsed);
        else if (e.key.endsWith('_subjects')) {
          setSubjects(parsed.map((s: Subject) => ({
            ...s,
            matrix: Array.isArray(s.matrix) ? s.matrix : (s.matrix as any)?.categories || [],
            useTransmutation: s.useTransmutation !== undefined ? s.useTransmutation : true,
          })));
        } else if (e.key.endsWith('_assessments')) setAssessments(parsed);
        else if (e.key.endsWith('_scores')) setScores(parsed);
        else if (e.key.endsWith('_attendance')) setAttendanceRecords(parsed);
        else if (e.key.endsWith('_templates')) {
          const valid = parsed.filter((t: GradingMatrixTemplate) => !isDeprecatedTemplate(t.name, t.id));
          setMatrixTemplates(valid.length > 0 ? valid : INITIAL_GLOBAL_TEMPLATES);
        } else if (e.key.endsWith('_holidays')) setHolidays(parsed);
        else if (e.key.endsWith('_learning_plans')) setLearningPlans(parsed);
      } catch {
        // ignore parse error
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, [pullFromCloud]);

  // Derived: Active students & faculty
  const students = allUsers.filter((u) => u.role === 'student');
  const teachers = allUsers.filter((u) => u.role === 'teacher' || u.role === 'dean');

  // --- Section actions ---
  const addSection = (secData: Omit<Section, 'id'>): Section => {
    const newSection: Section = {
      ...secData,
      id: `sec-${Date.now().toString(36)}`,
      adviserId: secData.adviserId,
    };
    setSections((prev) => [...prev, newSection]);
    syncEngine.enqueue('sections', 'UPSERT', {
      id: newSection.id,
      name: newSection.name,
      grade_level_or_year: newSection.gradeLevelOrYear,
      academic_year: newSection.academicYear,
      semester: newSection.semester,
      room: newSection.room || null,
      description: encodeSectionDescription(newSection.description, newSection.adviserId) || null,
    });
    return newSection;
  };

  const updateSection = (id: string, data: Partial<Section>) => {
    setSections((prev) => {
      const updated = prev.map((s) => (s.id === id ? { ...s, ...data } : s));
      const target = updated.find((s) => s.id === id);
      if (target) {
        syncEngine.enqueue('sections', 'UPSERT', {
          id: target.id,
          name: target.name,
          grade_level_or_year: target.gradeLevelOrYear,
          academic_year: target.academicYear,
          semester: target.semester,
          room: target.room || null,
          description: encodeSectionDescription(target.description, target.adviserId) || null,
        });
      }
      return updated;
    });
  };

  const deleteSection = (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
    setSubjects((prev) => prev.filter((s) => s.sectionId !== id));
    setAllUsers((prev) =>
      prev.map((u) => {
        const secIds = getStudentSectionIds(u).filter((sId) => sId !== id);
        return {
          ...u,
          sectionIds: secIds,
          sectionId: secIds[0] || undefined,
        };
      })
    );
    syncEngine.enqueue('sections', 'DELETE', { id });
  };

  // --- Subject actions ---
  const addSubject = (subjData: Omit<Subject, 'id'>): Subject => {
    const newSubj: Subject = {
      ...subjData,
      id: `subj-${Date.now().toString(36)}`,
      useTransmutation: subjData.useTransmutation !== false,
    };
    setSubjects((prev) => [...prev, newSubj]);
    syncEngine.enqueue('subjects', 'UPSERT', {
      id: newSubj.id,
      section_id: newSubj.sectionId,
      teacher_id: newSubj.teacherId,
      name: newSubj.name,
      code: newSubj.code,
      schedule: newSubj.schedule,
      units: newSubj.units,
      passing_grade: newSubj.passingGrade,
      matrix: {
        categories: newSubj.matrix,
        useTransmutation: newSubj.useTransmutation !== false,
      },
    });
    return newSubj;
  };

  const updateSubject = (id: string, data: Partial<Subject>) => {
    setSubjects((prev) => {
      const updated = prev.map((s) => (s.id === id ? { ...s, ...data } : s));
      const target = updated.find((s) => s.id === id);
      if (target) {
        syncEngine.enqueue('subjects', 'UPSERT', {
          id: target.id,
          section_id: target.sectionId,
          teacher_id: target.teacherId,
          name: target.name,
          code: target.code,
          schedule: target.schedule,
          units: target.units,
          passing_grade: target.passingGrade,
          matrix: {
            categories: target.matrix,
            useTransmutation: target.useTransmutation !== false,
          },
        });
      }
      return updated;
    });
  };

  const deleteSubject = (id: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    setAssessments((prev) => prev.filter((a) => a.subjectId !== id));
    setAttendanceRecords((prev) => prev.filter((a) => a.subjectId !== id));
    syncEngine.enqueue('subjects', 'DELETE', { id });
  };

  const updateSubjectMatrix = (
    subjectId: string,
    matrix: MatrixCategory[],
    passingGrade?: number,
    useTransmutation?: boolean
  ) => {
    setSubjects((prev) => {
      const updated = prev.map((s) =>
        s.id === subjectId
          ? {
              ...s,
              matrix,
              passingGrade: passingGrade !== undefined ? passingGrade : s.passingGrade,
              useTransmutation: useTransmutation !== undefined ? useTransmutation : (s.useTransmutation !== false),
            }
          : s
      );
      const target = updated.find((s) => s.id === subjectId);
      if (target) {
        syncEngine.enqueue('subjects', 'UPSERT', {
          id: target.id,
          section_id: target.sectionId,
          teacher_id: target.teacherId,
          name: target.name,
          code: target.code,
          schedule: target.schedule,
          units: target.units,
          passing_grade: target.passingGrade,
          matrix: {
            categories: target.matrix,
            useTransmutation: target.useTransmutation !== false,
          },
        });
      }
      return updated;
    });
  };

  // --- Global Template actions ---
  const saveMatrixTemplate = (templateData: Omit<GradingMatrixTemplate, 'id'>, idToUpdate?: string): GradingMatrixTemplate => {
    let savedTemplate: GradingMatrixTemplate;
    if (idToUpdate) {
      savedTemplate = { ...templateData, id: idToUpdate };
      setMatrixTemplates((prev) => prev.map((t) => (t.id === idToUpdate ? savedTemplate : t)));
    } else {
      savedTemplate = {
        ...templateData,
        id: `tmpl-${Date.now().toString(36)}`,
      };
      setMatrixTemplates((prev) => [...prev, savedTemplate]);
    }
    syncEngine.enqueue('grading_matrix_templates', 'UPSERT', {
      id: savedTemplate.id,
      name: savedTemplate.name,
      description: savedTemplate.description,
      is_default: savedTemplate.isDefault,
      passing_grade: savedTemplate.passingGrade,
      matrix: {
        categories: savedTemplate.matrix,
        useTransmutation: savedTemplate.useTransmutation !== false,
      },
    });
    return savedTemplate;
  };

  const deleteMatrixTemplate = (id: string) => {
    setMatrixTemplates((prev) => prev.filter((t) => t.id !== id));
    syncEngine.enqueue('grading_matrix_templates', 'DELETE', { id });
  };

  const applyTemplateGlobally = (templateId: string) => {
    const template = matrixTemplates.find((t) => t.id === templateId);
    if (!template) return;
    setSubjects((prev) => {
      const updated = prev.map((s) => ({
        ...s,
        matrix: JSON.parse(JSON.stringify(template.matrix)),
        passingGrade: template.passingGrade || s.passingGrade,
        useTransmutation: template.useTransmutation !== undefined ? template.useTransmutation : true,
      }));
      updated.forEach((s) => {
        syncEngine.enqueue('subjects', 'UPSERT', {
          id: s.id,
          section_id: s.sectionId,
          teacher_id: s.teacherId,
          name: s.name,
          code: s.code,
          schedule: s.schedule,
          units: s.units,
          passing_grade: s.passingGrade,
          matrix: {
            categories: s.matrix,
            useTransmutation: s.useTransmutation !== false,
          },
        });
      });
      return updated;
    });
  };

  const applyTemplateToSubject = (subjectId: string, templateId: string) => {
    const template = matrixTemplates.find((t) => t.id === templateId);
    if (!template) return;
    setSubjects((prev) => {
      const updated = prev.map((s) =>
        s.id === subjectId
          ? {
              ...s,
              matrix: JSON.parse(JSON.stringify(template.matrix)),
              passingGrade: template.passingGrade || s.passingGrade,
              useTransmutation: template.useTransmutation !== undefined ? template.useTransmutation : true,
            }
          : s
      );
      const target = updated.find((s) => s.id === subjectId);
      if (target) {
        syncEngine.enqueue('subjects', 'UPSERT', {
          id: target.id,
          section_id: target.sectionId,
          teacher_id: target.teacherId,
          name: target.name,
          code: target.code,
          schedule: target.schedule,
          units: target.units,
          passing_grade: target.passingGrade,
          matrix: {
            categories: target.matrix,
            useTransmutation: target.useTransmutation !== false,
          },
        });
      }
      return updated;
    });
  };

  // --- Assessment actions ---
  const addAssessment = (assessmentData: Omit<Assessment, 'id'>): Assessment => {
    const newAss: Assessment = {
      ...assessmentData,
      id: `ass-${Date.now().toString(36)}`,
      period: assessmentData.period || 'prelim',
    };
    setAssessments((prev) => [...prev, newAss]);
    syncEngine.enqueue('assessments', 'UPSERT', {
      id: newAss.id,
      subject_id: newAss.subjectId,
      category_id: newAss.categoryId,
      parent_category_id: newAss.parentCategoryId,
      period: newAss.period,
      title: newAss.title,
      max_score: newAss.maxScore,
      date: newAss.date,
      due_date: newAss.dueDate,
      description: newAss.description,
    });
    return newAss;
  };

  const updateAssessment = (id: string, data: Partial<Assessment>) => {
    setAssessments((prev) => {
      const updated = prev.map((a) => (a.id === id ? { ...a, ...data } : a));
      const target = updated.find((a) => a.id === id);
      if (target) {
        syncEngine.enqueue('assessments', 'UPSERT', {
          id: target.id,
          subject_id: target.subjectId,
          category_id: target.categoryId,
          parent_category_id: target.parentCategoryId,
          period: target.period,
          title: target.title,
          max_score: target.maxScore,
          date: target.date,
          due_date: target.dueDate,
          description: target.description,
        });
      }
      return updated;
    });
  };

  const deleteAssessment = (id: string) => {
    setAssessments((prev) => prev.filter((a) => a.id !== id));
    setScores((prev) => prev.filter((s) => s.assessmentId !== id));
    syncEngine.enqueue('assessments', 'DELETE', { id });
  };

  // --- Score actions ---
  const setScore = (
    assessmentId: string,
    studentId: string,
    score: number,
    remarks?: string
  ) => {
    setScores((prev) => {
      const idx = prev.findIndex(
        (s) => s.assessmentId === assessmentId && s.studentId === studentId
      );
      let recordId = `sc-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
      let updated: ScoreRecord[];

      if (idx >= 0) {
        recordId = prev[idx].id;
        updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          score,
          remarks: remarks !== undefined ? remarks : updated[idx].remarks,
        };
      } else {
        updated = [
          ...prev,
          {
            id: recordId,
            assessmentId,
            studentId,
            score,
            remarks,
          },
        ];
      }

      syncEngine.enqueue('score_records', 'UPSERT', {
        id: recordId,
        assessment_id: assessmentId,
        student_id: studentId,
        score,
        remarks,
      });

      return updated;
    });
  };

  const deleteScore = (assessmentId: string, studentId: string) => {
    setScores((prev) => {
      const existing = prev.find(
        (s) => s.assessmentId === assessmentId && s.studentId === studentId
      );
      if (!existing) return prev;
      syncEngine.enqueue('score_records', 'DELETE', { id: existing.id });
      return prev.filter(
        (s) => !(s.assessmentId === assessmentId && s.studentId === studentId)
      );
    });
  };

  const batchUpdateScores = (
    updates: { assessmentId: string; studentId: string; score: number; remarks?: string }[]
  ) => {
    setScores((prev) => {
      const copy = [...prev];
      updates.forEach((u) => {
        const idx = copy.findIndex(
          (s) => s.assessmentId === u.assessmentId && s.studentId === u.studentId
        );
        let recId = `sc-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
        if (idx >= 0) {
          recId = copy[idx].id;
          copy[idx] = {
            ...copy[idx],
            score: u.score,
            remarks: u.remarks !== undefined ? u.remarks : copy[idx].remarks,
          };
        } else {
          copy.push({
            id: recId,
            assessmentId: u.assessmentId,
            studentId: u.studentId,
            score: u.score,
            remarks: u.remarks,
          });
        }

        syncEngine.enqueue('score_records', 'UPSERT', {
          id: recId,
          assessment_id: u.assessmentId,
          student_id: u.studentId,
          score: u.score,
          remarks: u.remarks,
        });
      });
      return copy;
    });
  };

  const importOfficialGrades = (payload: {
    subjectId: string;
    sectionId: string;
    period: GradingPeriod;
    assessments: Array<{
      colHeader: string;
      title: string;
      maxScore: number;
      categoryId: string;
      parentCategoryId?: string;
    }>;
    scores: Array<{
      colHeader: string;
      studentNumber: string;
      score: number;
      remarks?: string;
    }>;
    attendance?: Array<{
      sessionIndex: number;
      studentNumber: string;
      date: string;
      status: AttendanceStatus;
    }>;
    studentsToEnroll?: Array<{
      studentNumber: string;
      name: string;
    }>;
  }) => {
    const {
      subjectId,
      sectionId,
      period,
      assessments: importAssessments,
      scores: importScores,
      attendance: importAtt,
      studentsToEnroll = [],
    } = payload;

    // 1. Process Students: Enroll any new or existing students into this section
    const updatedUsers = [...allUsers];
    const userUpserts: any[] = [];
    const studentNumberToUserMap: Map<string, User> = new Map();

    // Index existing students
    updatedUsers.forEach((u) => {
      if (u.studentNumber) {
        studentNumberToUserMap.set(u.studentNumber.trim(), u);
      }
    });

    if (studentsToEnroll.length > 0) {
      studentsToEnroll.forEach((st, idx) => {
        const cleanNumber = (st.studentNumber || '').trim();
        const existingStudent = cleanNumber ? studentNumberToUserMap.get(cleanNumber) : undefined;

        if (existingStudent) {
          const secIds = getStudentSectionIds(existingStudent);
          if (!secIds.includes(sectionId)) {
            const combinedSecIds = [...secIds, sectionId];
            const updated: User = {
              ...existingStudent,
              sectionId: existingStudent.sectionId || sectionId,
              sectionIds: combinedSecIds,
            };
            const userIdx = updatedUsers.findIndex((u) => u.id === existingStudent.id);
            if (userIdx >= 0) updatedUsers[userIdx] = updated;
            studentNumberToUserMap.set(cleanNumber, updated);
            userUpserts.push({
              id: updated.id,
              name: updated.name,
              email: updated.email,
              role: updated.role,
              student_number: updated.studentNumber || null,
              section_id: formatSectionIds(combinedSecIds),
              avatar: updated.avatar || null,
              department: updated.department || null,
              title: updated.title || null,
            });
          }
        } else {
          const { displayName, emailHandle } = formatStudentName(st.name || `Student ${cleanNumber}`);
          const cleanIdSuffix = cleanNumber.toLowerCase().replace(/[^a-z0-9]/g, '');
          const email = `${emailHandle}${cleanIdSuffix ? `.${cleanIdSuffix}` : `.${idx + 1}`}@student.gradely.edu`;
          const newStudent: User = {
            id: `stud-${Date.now().toString(36)}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
            name: displayName,
            email,
            role: 'student',
            studentNumber: cleanNumber,
            sectionId,
            sectionIds: [sectionId],
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`,
          };
          updatedUsers.push(newStudent);
          if (cleanNumber) studentNumberToUserMap.set(cleanNumber, newStudent);
          userUpserts.push({
            id: newStudent.id,
            name: newStudent.name,
            email: newStudent.email,
            role: newStudent.role,
            student_number: newStudent.studentNumber || null,
            section_id: sectionId,
            avatar: newStudent.avatar || null,
            department: null,
            title: null,
          });
        }
      });

      setAllUsers(updatedUsers);
      if (userUpserts.length > 0) {
        syncEngine.enqueueBatch('users', 'UPSERT', userUpserts);
      }
    }

    // 2. Process Assessments: Create or update target assessments in this subject & period
    const updatedAssessments = [...assessments];
    const assessmentUpserts: any[] = [];
    const colToAssessmentMap: Record<string, Assessment> = {};

    importAssessments.forEach((ass) => {
      // 1. Tag match via colHeader
      let existing = updatedAssessments.find(
        (a) =>
          a.subjectId === subjectId &&
          (a.period || 'prelim') === period &&
          a.description?.includes(`[csv_col:${ass.colHeader}]`)
      );

      // 2. Exact title match in same period and category
      if (!existing) {
        existing = updatedAssessments.find(
          (a) =>
            a.subjectId === subjectId &&
            (a.period || 'prelim') === period &&
            a.title.toLowerCase().trim() === ass.title.toLowerCase().trim() &&
            (a.categoryId === ass.categoryId || a.parentCategoryId === ass.parentCategoryId)
        );
      }

      // 3. Special cleanup of previous mis-mapped exam:
      // If ass is Examination and an assessment exists in the same subject & period with maxScore 50 and category in Examination that was previously named "Written Work 2" or "Written Work", re-purpose and correct it!
      if (!existing && (ass.colHeader.includes('Examination') || ass.title.includes('Examination'))) {
        existing = updatedAssessments.find(
          (a) =>
            a.subjectId === subjectId &&
            (a.period || 'prelim') === period &&
            a.maxScore === ass.maxScore &&
            (a.categoryId === ass.categoryId || a.parentCategoryId === ass.parentCategoryId) &&
            a.title.toLowerCase().includes('written work')
        );
      }

      const description = `[csv_col:${ass.colHeader}]`;

      if (existing) {
        const updated: Assessment = {
          ...existing,
          title: ass.title,
          maxScore: ass.maxScore,
          categoryId: ass.categoryId || existing.categoryId,
          parentCategoryId: ass.parentCategoryId || existing.parentCategoryId,
          description,
        };
        const idx = updatedAssessments.findIndex((a) => a.id === existing!.id);
        updatedAssessments[idx] = updated;
        colToAssessmentMap[ass.colHeader] = updated;
        assessmentUpserts.push({
          id: updated.id,
          subject_id: updated.subjectId,
          category_id: updated.categoryId,
          parent_category_id: updated.parentCategoryId,
          period: updated.period,
          title: updated.title,
          max_score: updated.maxScore,
          date: updated.date,
          due_date: updated.dueDate,
          description: updated.description,
        });
      } else {
        const newAss: Assessment = {
          id: `ass-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`,
          subjectId,
          categoryId: ass.categoryId,
          parentCategoryId: ass.parentCategoryId,
          period,
          title: ass.title,
          maxScore: ass.maxScore,
          date: new Date().toISOString().split('T')[0],
          description,
        };
        updatedAssessments.push(newAss);
        colToAssessmentMap[ass.colHeader] = newAss;
        assessmentUpserts.push({
          id: newAss.id,
          subject_id: newAss.subjectId,
          category_id: newAss.categoryId,
          parent_category_id: newAss.parentCategoryId,
          period: newAss.period,
          title: newAss.title,
          max_score: newAss.maxScore,
          date: newAss.date,
          due_date: newAss.dueDate,
          description: newAss.description,
        });
      }
    });

    setAssessments(updatedAssessments);
    if (assessmentUpserts.length > 0) {
      syncEngine.enqueueBatch('assessments', 'UPSERT', assessmentUpserts);
    }

    // 3. Process Scores
    const updatedScores = [...scores];
    const scoreUpserts: any[] = [];

    importScores.forEach((sc) => {
      const targetAss = colToAssessmentMap[sc.colHeader];
      const student = studentNumberToUserMap.get((sc.studentNumber || '').trim());
      if (!targetAss || !student) return;

      const existingIdx = updatedScores.findIndex(
        (s) => s.assessmentId === targetAss.id && s.studentId === student.id
      );
      const recId = existingIdx >= 0
        ? updatedScores[existingIdx].id
        : `sc-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;

      const scoreRecord: ScoreRecord = {
        id: recId,
        assessmentId: targetAss.id,
        studentId: student.id,
        score: sc.score,
        remarks: sc.remarks,
      };

      if (existingIdx >= 0) {
        updatedScores[existingIdx] = scoreRecord;
      } else {
        updatedScores.push(scoreRecord);
      }

      scoreUpserts.push({
        id: recId,
        assessment_id: targetAss.id,
        student_id: student.id,
        score: sc.score,
        remarks: sc.remarks,
      });
    });

    setScores(updatedScores);
    if (scoreUpserts.length > 0) {
      syncEngine.enqueueBatch('score_records', 'UPSERT', scoreUpserts);
    }

    // 4. Process Attendance (if provided)
    const updatedAttendance = [...attendance];
    const attendanceUpserts: any[] = [];

    if (importAtt && importAtt.length > 0) {
      importAtt.forEach((att) => {
        const student = studentNumberToUserMap.get((att.studentNumber || '').trim());
        if (!student) return;

        const existingIdx = updatedAttendance.findIndex(
          (a) => a.subjectId === subjectId && a.studentId === student.id && a.date === att.date
        );
        const recId = existingIdx >= 0
          ? updatedAttendance[existingIdx].id
          : `att-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;

        const attRecord: AttendanceRecord = {
          id: recId,
          subjectId,
          studentId: student.id,
          date: att.date,
          status: att.status,
          period,
          note: `Session ${att.sessionIndex}`,
        };

        if (existingIdx >= 0) {
          updatedAttendance[existingIdx] = attRecord;
        } else {
          updatedAttendance.push(attRecord);
        }

        attendanceUpserts.push({
          id: recId,
          subject_id: subjectId,
          student_id: student.id,
          date: att.date,
          status: att.status,
          period,
          note: attRecord.note,
        });
      });

      setAttendanceRecords(updatedAttendance);
      if (attendanceUpserts.length > 0) {
        syncEngine.enqueueBatch('attendance_records', 'UPSERT', attendanceUpserts);
      }
    }

    return {
      studentsEnrolled: studentsToEnroll.length,
      assessmentsCount: importAssessments.length,
      scoresCount: scoreUpserts.length,
      attendanceCount: attendanceUpserts.length,
    };
  };

  // --- Attendance actions ---
  const setAttendance = (
    subjectId: string,
    studentId: string,
    date: string,
    status: AttendanceStatus,
    note?: string,
    period?: GradingPeriod
  ) => {
    const periodToUse = period || 'prelim';
    const existing = attendance.find(
      (a) => a.subjectId === subjectId && a.studentId === studentId && a.date === date
    );
    const recId = existing?.id || `att-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
    const resolvedPeriod = period !== undefined ? period : (existing?.period || periodToUse);
    const resolvedNote = note !== undefined ? note : existing?.note;

    setAttendanceRecords((prev) => {
      const idx = prev.findIndex(
        (a) => a.subjectId === subjectId && a.studentId === studentId && a.date === date
      );
      const record: AttendanceRecord = {
        id: recId,
        subjectId,
        studentId,
        date,
        status,
        period: resolvedPeriod,
        note: resolvedNote,
      };

      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = record;
        return updated;
      }
      return [...prev, record];
    });

    syncEngine.enqueue('attendance_records', 'UPSERT', {
      id: recId,
      subject_id: subjectId,
      student_id: studentId,
      date,
      period: resolvedPeriod,
      status,
      note: resolvedNote || null,
    });
  };

  const markAllAttendance = (
    subjectId: string,
    studentIds: string[],
    date: string,
    status: AttendanceStatus,
    period?: GradingPeriod
  ) => {
    if (!studentIds || studentIds.length === 0) return;
    const periodToUse = period || 'prelim';

    const prevMap = new Map(
      attendance
        .filter((a) => a.subjectId === subjectId && a.date === date)
        .map((r) => [r.studentId, r])
    );

    const payloadsToSync: any[] = [];
    const newRecords: AttendanceRecord[] = studentIds.map((sId) => {
      const existing = prevMap.get(sId);
      const id = existing?.id || `att-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
      payloadsToSync.push({
        id,
        subject_id: subjectId,
        student_id: sId,
        date,
        period: periodToUse,
        status,
        note: existing?.note || null,
      });
      return {
        id,
        subjectId,
        studentId: sId,
        date,
        status,
        period: periodToUse,
        note: existing?.note,
      };
    });

    const studentIdSet = new Set(studentIds);
    setAttendanceRecords((prev) => {
      const filtered = prev.filter(
        (a) => !(a.subjectId === subjectId && a.date === date && studentIdSet.has(a.studentId))
      );
      return [...filtered, ...newRecords];
    });

    if (payloadsToSync.length > 0) {
      syncEngine.enqueueBatch('attendance_records', 'UPSERT', payloadsToSync);
    }
  };

  const clearAttendanceForDate = (
    subjectId: string,
    date: string,
    studentIds?: string[]
  ) => {
    const studentIdSet = studentIds && studentIds.length > 0 ? new Set(studentIds) : null;
    const toDelete = attendance.filter((a) => {
      if (a.subjectId !== subjectId || a.date !== date) return false;
      if (studentIdSet && !studentIdSet.has(a.studentId)) return false;
      return true;
    });

    if (toDelete.length === 0) return;

    const deleteIds = new Set(toDelete.map((a) => a.id));
    setAttendanceRecords((prev) => prev.filter((a) => !deleteIds.has(a.id)));

    syncEngine.enqueueBatch(
      'attendance_records',
      'DELETE',
      toDelete.map((a) => ({ id: a.id }))
    );
  };

  const deleteAttendanceRecord = (id: string) => {
    setAttendanceRecords((prev) => prev.filter((a) => a.id !== id));
    syncEngine.enqueue('attendance_records', 'DELETE', { id });
  };

  // --- Holiday actions ---
  const addHoliday = (holData: Omit<Holiday, 'id'>): Holiday => {
    const newHol: Holiday = {
      ...holData,
      id: `hol-${Date.now().toString(36)}`,
    };
    setHolidays((prev) => [...prev, newHol]);
    syncEngine.enqueue('holidays', 'UPSERT', newHol);
    return newHol;
  };

  const deleteHoliday = (id: string) => {
    setHolidays((prev) => prev.filter((h) => h.id !== id));
    syncEngine.enqueue('holidays', 'DELETE', { id });
  };

  const addStudent = (studData: Omit<User, 'id' | 'role'>): User => {
    const studentSecIds = Array.from(new Set([
      ...(studData.sectionIds || []),
      ...(studData.sectionId ? [studData.sectionId] : []),
    ])).filter(Boolean);

    const cleanNumber = (studData.studentNumber || '').trim();
    const cleanEmail = (studData.email || '').trim().toLowerCase();

    // Check if student exists already
    const existingIdx = allUsers.findIndex((u) => {
      if (u.role !== 'student') return false;
      if (cleanNumber && u.studentNumber && u.studentNumber.trim() === cleanNumber) return true;
      if (cleanEmail && u.email && u.email.trim().toLowerCase() === cleanEmail) return true;
      return false;
    });

    if (existingIdx !== -1) {
      const existingStudent = allUsers[existingIdx];
      const existingSecIds = getStudentSectionIds(existingStudent);
      const combinedSecIds = Array.from(new Set([...existingSecIds, ...studentSecIds])).filter(Boolean);

      const updatedStudent: User = {
        ...existingStudent,
        ...studData,
        sectionId: combinedSecIds[0] || undefined,
        sectionIds: combinedSecIds,
      };

      setAllUsers((prev) => prev.map((u) => (u.id === updatedStudent.id ? updatedStudent : u)));

      syncEngine.enqueue('users', 'UPSERT', {
        id: updatedStudent.id,
        name: updatedStudent.name,
        email: updatedStudent.email,
        role: updatedStudent.role,
        student_number: updatedStudent.studentNumber || null,
        section_id: formatSectionIds(combinedSecIds),
        avatar: updatedStudent.avatar || null,
        department: updatedStudent.department || null,
        title: updatedStudent.title || null,
      });

      return updatedStudent;
    }

    const newStudent: User = {
      ...studData,
      id: `stud-${Date.now().toString(36)}`,
      role: 'student',
      mustChangePassword: true,
      sectionId: studentSecIds[0] || undefined,
      sectionIds: studentSecIds,
      avatar: studData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(studData.name)}`,
    };
    setAllUsers((prev) => [...prev, newStudent]);
    syncEngine.enqueue('users', 'UPSERT', {
      id: newStudent.id,
      name: newStudent.name,
      email: newStudent.email,
      role: newStudent.role,
      student_number: newStudent.studentNumber || null,
      section_id: formatSectionIds(studentSecIds),
      avatar: newStudent.avatar || null,
      department: newStudent.department || null,
      title: newStudent.title || null,
    });
    return newStudent;
  };

  const bulkAddStudents = (studentsData: Omit<User, 'id' | 'role'>[]): User[] => {
    const existingUsers = [...allUsers];
    const addedStudents: User[] = [];
    const payloadsToUpsert: any[] = [];

    studentsData.forEach((studData, idx) => {
      const cleanNumber = (studData.studentNumber || '').trim();
      const cleanEmail = (studData.email || '').trim().toLowerCase();

      // Match existing student ONLY if studentNumber matches non-empty, OR email matches non-empty
      const existingIdx = existingUsers.findIndex((u) => {
        if (u.role !== 'student') return false;
        if (cleanNumber && u.studentNumber && u.studentNumber.trim() === cleanNumber) return true;
        if (cleanEmail && u.email && u.email.trim().toLowerCase() === cleanEmail) return true;
        return false;
      });

      const incomingSecIds = Array.from(new Set([
        ...(studData.sectionIds || []),
        ...(studData.sectionId ? [studData.sectionId] : []),
      ])).filter(Boolean);

      if (existingIdx !== -1) {
        const existingStudent = existingUsers[existingIdx];
        const existingSecIds = getStudentSectionIds(existingStudent);
        const combinedSecIds = Array.from(new Set([...existingSecIds, ...incomingSecIds])).filter(Boolean);

        const updated: User = {
          ...existingStudent,
          ...studData,
          sectionId: combinedSecIds[0] || undefined,
          sectionIds: combinedSecIds,
          role: 'student',
        };
        existingUsers[existingIdx] = updated;
        addedStudents.push(updated);
        payloadsToUpsert.push({
          id: updated.id,
          name: updated.name,
          email: updated.email,
          role: updated.role,
          student_number: updated.studentNumber || null,
          section_id: formatSectionIds(combinedSecIds),
          avatar: updated.avatar || null,
          department: updated.department || null,
          title: updated.title || null,
        });
      } else {
        const newStudent: User = {
          ...studData,
          id: `stud-${Date.now().toString(36)}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
          role: 'student',
          mustChangePassword: true,
          sectionId: incomingSecIds[0] || undefined,
          sectionIds: incomingSecIds,
          avatar:
            studData.avatar ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(studData.name)}`,
        };
        existingUsers.push(newStudent);
        addedStudents.push(newStudent);
        payloadsToUpsert.push({
          id: newStudent.id,
          name: newStudent.name,
          email: newStudent.email,
          role: newStudent.role,
          student_number: newStudent.studentNumber || null,
          section_id: formatSectionIds(incomingSecIds),
          avatar: newStudent.avatar || null,
          department: newStudent.department || null,
          title: newStudent.title || null,
        });
      }
    });

    // Update state immediately
    setAllUsers(existingUsers);

    // Enqueue all records to Supabase in a single batch
    if (payloadsToUpsert.length > 0) {
      syncEngine.enqueueBatch('users', 'UPSERT', payloadsToUpsert);
    }

    return addedStudents;
  };

  const updateStudent = (id: string, data: Partial<User>, options?: { skipSync?: boolean }) => {
    setAllUsers((prev) => {
      const updated = prev.map((u) => {
        if (u.id !== id) return u;
        const targetSecIds = data.sectionIds !== undefined
          ? data.sectionIds
          : (data.sectionId !== undefined ? [data.sectionId] : getStudentSectionIds(u));
        return {
          ...u,
          ...data,
          sectionId: targetSecIds[0] || data.sectionId,
          sectionIds: targetSecIds,
        };
      });
      const target = updated.find((u) => u.id === id);
      if (target && !options?.skipSync) {
        const secIds = getStudentSectionIds(target);
        syncEngine.enqueue('users', 'UPSERT', {
          id: target.id,
          name: target.name,
          email: target.email,
          role: target.role,
          student_number: target.studentNumber || null,
          section_id: formatSectionIds(secIds),
          avatar: target.avatar || null,
          department: target.department || null,
          title: target.title || null,
        });
      }
      return updated;
    });
  };

  const deleteStudent = (id: string) => {
    setAllUsers((prev) => prev.filter((u) => u.id !== id));
    setScores((prev) => prev.filter((s) => s.studentId !== id));
    setAttendanceRecords((prev) => prev.filter((a) => a.studentId !== id));
    syncEngine.enqueue('users', 'DELETE', { id });
  };

  const resetUserPassword = async (
    userId: string
  ): Promise<{ success: boolean; initialPassword: string; error?: string; user?: User }> => {
    const targetUser = allUsers.find((u) => u.id === userId);
    if (!targetUser) {
      return { success: false, initialPassword: '', error: 'User not found in system.' };
    }

    const resetResponse = await teachersApi.resetPassword(userId);
    if (resetResponse.error || !resetResponse.data) {
      return { success: false, initialPassword: '', error: resetResponse.error || 'Password reset was rejected by the server.' };
    }
    const serverReset = resetResponse.data as { initialPassword: string; user?: User };
    const serverUser = serverReset.user || targetUser;

    // Determine initial password based on role:
    // The protected backend generates the temporary password.
    const initialPassword = serverReset.initialPassword;

    const updatedUser: User = {
      ...serverUser,
      mustChangePassword: true,
    };

    // 1. Update persistent auth vault (localStorage and Supabase sys-auth-vault)
    // Update state in DataContext & cached local storage. The password itself
    // never enters local state or localStorage.
    setAllUsers((prev) => {
      const copy = prev.map((u) => (u.id === userId ? updatedUser : u));
      try {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(copy));
      } catch (e) {}
      return copy;
    });

    return { success: true, initialPassword, user: updatedUser };
  };

  // --- Faculty / Teacher actions ---
  const addTeacher = async (
    teacherData: Omit<User, 'id' | 'role'>,
    initialPassword = '',
    mustChangePassword = false
  ): Promise<User | null> => {
    const response = await teachersApi.create({
      name: teacherData.name,
      email: teacherData.email,
      password: initialPassword,
      role: 'teacher',
      title: teacherData.title,
      department: teacherData.department,
    });

    if (response.error || !response.data) return null;
    const created = response.data as User;
    const newTeacher: User = {
      ...created,
      avatar: created.avatar || teacherData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(teacherData.name)}`,
      mustChangePassword: created.mustChangePassword ?? (mustChangePassword || true),
    };

    setAllUsers((prev) => {
      const updated = [...prev.filter((user) => user.id !== newTeacher.id), newTeacher];
      try {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    return newTeacher;
  };

  const updateTeacher = (id: string, data: Partial<User>, newPassword?: string) => {
    setAllUsers((prev) => {
      const updated = prev.map((u) => {
        if (u.id === id) {
          const next = { ...u, ...data };
          if (newPassword) {
            void teachersApi.update(id, { password: newPassword });
          }
          return next;
        }
        return u;
      });

      const target = updated.find((u) => u.id === id);
      if (target) {
        if (newPassword) {
          void teachersApi.update(id, { password: newPassword });
        }
        try {
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updated));
        } catch (e) {}
        syncEngine.enqueue('users', 'UPSERT', {
          id: target.id,
          name: target.name,
          email: target.email,
          role: target.role,
          avatar: target.avatar || null,
          department: target.department || null,
          title: target.title || null,
        });
      }
      return updated;
    });
  };

  const deleteTeacher = (id: string): boolean => {
    const currentTeachers = allUsers.filter((u) => u.role === 'teacher');
    if (currentTeachers.length <= 1) {
      return false; // Prevent removing the last teacher in the system
    }
    setAllUsers((prev) => {
      const updated = prev.filter((u) => u.id !== id);
      try {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    syncEngine.enqueue('users', 'DELETE', { id });
    return true;
  };

  // --- Reset & Backup ---
  const startFreshOfficial = async (options?: { wipeCloud?: boolean }) => {
    // Keep only teachers and deans, delete mock students
    const teachersOnly = allUsers.filter((u) => u.role === 'teacher' || u.role === 'dean');
    const templatesToKeep = matrixTemplates.length > 0 ? matrixTemplates : INITIAL_GLOBAL_TEMPLATES;
    setAllUsers(teachersOnly);
    setSections([]);
    setSubjects([]);
    setAssessments([]);
    setScores([]);
    setAttendanceRecords([]);
    setHolidays(INITIAL_HOLIDAYS);
    setMatrixTemplates(templatesToKeep);

    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(teachersOnly));
    localStorage.setItem(`${STORAGE_KEY}_users`, JSON.stringify(teachersOnly));
    try {
      localStorage.removeItem('aurasms_data_store_v3_users');
    } catch (e) {}
    localStorage.setItem(`${STORAGE_KEY}_sections`, JSON.stringify([]));
    localStorage.setItem(`${STORAGE_KEY}_subjects`, JSON.stringify([]));
    localStorage.setItem(`${STORAGE_KEY}_assessments`, JSON.stringify([]));
    localStorage.setItem(`${STORAGE_KEY}_scores`, JSON.stringify([]));
    localStorage.setItem(`${STORAGE_KEY}_attendance`, JSON.stringify([]));
    localStorage.setItem(`${STORAGE_KEY}_holidays`, JSON.stringify(INITIAL_HOLIDAYS));
    localStorage.setItem(`${STORAGE_KEY}_templates`, JSON.stringify(templatesToKeep));

    syncEngine.clearQueue();

    if (options?.wipeCloud) {
      const wipeResult = await syncEngine.wipeCloudDatabase({ keepTeachersAndTemplates: true });
      if (wipeResult.error) {
        throw new Error(typeof wipeResult.error === 'string' ? wipeResult.error : 'Failed to wipe cloud database');
      }
    }
  };

  const rolloverAcademicYear = async (
    newAcademicYear: string,
    newSemester: string,
    options: { clearScores: boolean; clearAttendance: boolean; clearAssessments: boolean; syncToCloud?: boolean }
  ) => {
    const updatedSections = sections.map((sec) => ({
      ...sec,
      academicYear: newAcademicYear,
      semester: newSemester,
    }));
    setSections(updatedSections);
    localStorage.setItem(`${STORAGE_KEY}_sections`, JSON.stringify(updatedSections));

    let updatedAssessments = assessments;
    if (options.clearAssessments) {
      updatedAssessments = [];
      setAssessments([]);
      localStorage.setItem(`${STORAGE_KEY}_assessments`, JSON.stringify([]));
    }

    if (options.clearScores) {
      setScores([]);
      localStorage.setItem(`${STORAGE_KEY}_scores`, JSON.stringify([]));
    }

    if (options.clearAttendance) {
      setAttendanceRecords([]);
      localStorage.setItem(`${STORAGE_KEY}_attendance`, JSON.stringify([]));
    }

    syncEngine.clearQueue();

    if (options.syncToCloud) {
      await syncEngine.pushAllData({
        users: allUsers,
        sections: updatedSections,
        templates: matrixTemplates,
        subjects,
        assessments: updatedAssessments,
        scores: options.clearScores ? [] : scores,
        attendance: options.clearAttendance ? [] : attendance,
        holidays,
      });
    }
  };

  const resetToDemoData = async (syncToCloud?: boolean) => {
    resetToDefault();
    syncEngine.clearQueue();
    if (syncToCloud) {
      await syncEngine.wipeCloudDatabase({ keepTeachersAndTemplates: false });
      await syncEngine.pushAllData({
        users: INITIAL_USERS,
        sections: INITIAL_SECTIONS,
        templates: INITIAL_GLOBAL_TEMPLATES,
        subjects: INITIAL_SUBJECTS,
        assessments: INITIAL_ASSESSMENTS,
        scores: INITIAL_SCORES,
        attendance: INITIAL_ATTENDANCE,
        holidays: INITIAL_HOLIDAYS,
      });
    }
  };

  const resetToDefault = () => {
    localStorage.removeItem(`${STORAGE_KEY}_templates`);
    localStorage.removeItem(`${STORAGE_KEY}_sections`);
    localStorage.removeItem(`${STORAGE_KEY}_subjects`);
    localStorage.removeItem(`${STORAGE_KEY}_assessments`);
    localStorage.removeItem(`${STORAGE_KEY}_scores`);
    localStorage.removeItem(`${STORAGE_KEY}_attendance`);
    localStorage.removeItem(`${STORAGE_KEY}_holidays`);
    localStorage.removeItem(`${STORAGE_KEY}_users`);
    localStorage.removeItem(`${STORAGE_KEY}_learning_plans`);

    setMatrixTemplates(INITIAL_GLOBAL_TEMPLATES);
    setSections(INITIAL_SECTIONS);
    setSubjects(INITIAL_SUBJECTS);
    setAssessments(INITIAL_ASSESSMENTS);
    setScores(INITIAL_SCORES);
    setAttendanceRecords(INITIAL_ATTENDANCE);
    setHolidays(INITIAL_HOLIDAYS);
    setAllUsers(INITIAL_USERS);
    setLearningPlans([]);
  };

  // Shared helper: Checks whether a learning plan corresponds to a given subject (by ID, courseCode, or peer section)
  const isPlanForSubject = useCallback(
    (plan: LearningPlan, subjId: string): boolean => {
      if (!plan || !subjId) return false;
      if (plan.subjectId === subjId) return true;
      if (plan.subjectIds && plan.subjectIds.includes(subjId)) return true;

      const targetSubj = subjects.find((s) => s.id === subjId);
      if (!targetSubj) return false;

      const targetCode = normalizeCourseCode(targetSubj.code, targetSubj.name);
      if (!targetCode) return false;

      const planCode = normalizeCourseCode(plan.courseCode, plan.courseTitle);
      if (planCode && planCode === targetCode) return true;

      const planSubj = subjects.find((s) => s.id === plan.subjectId);
      if (planSubj && normalizeCourseCode(planSubj.code, planSubj.name) === targetCode) return true;

      return false;
    },
    [subjects]
  );

  const saveLearningPlan = useCallback(
    (plan: LearningPlan) => {
      setLearningPlans((prev) => {
        const targetSubj = subjects.find((s) => s.id === plan.subjectId);
        const courseKey = normalizeCourseCode(
          plan.courseCode || targetSubj?.code,
          plan.courseTitle || targetSubj?.name
        );

        // Find all subjects that share this same course code across all sections
        const matchingSubjects = subjects.filter(
          (s) => normalizeCourseCode(s.code, s.name) === courseKey
        );
        const linkedSubjectIds = Array.from(
          new Set([plan.subjectId, ...(plan.subjectIds || []), ...matchingSubjects.map((s) => s.id)])
        ).filter(Boolean);

        const enrichedPlan: LearningPlan = {
          ...plan,
          courseCode: plan.courseCode || targetSubj?.code || 'COURSE',
          courseTitle: plan.courseTitle || targetSubj?.name || 'Course Title',
          subjectIds: linkedSubjectIds,
          updatedAt: new Date().toISOString(),
        };

        const existingIdx = prev.findIndex(
          (p) =>
            p.id === plan.id ||
            p.subjectId === plan.subjectId ||
            isPlanForSubject(p, plan.subjectId) ||
            (courseKey && normalizeCourseCode(p.courseCode, p.courseTitle) === courseKey)
        );

        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = enrichedPlan;
          // Filter out any other duplicate plans with the same course key
          return updated.filter(
            (p, idx) =>
              idx === existingIdx ||
              normalizeCourseCode(p.courseCode, p.courseTitle) !== courseKey
          );
        }

        return [...prev, enrichedPlan];
      });
    },
    [subjects, isPlanForSubject]
  );

  const updateWeeklyTopic = useCallback(
    (subjectId: string, topicId: string, updates: Partial<WeeklyTopic>) => {
      setLearningPlans((prev) =>
        prev.map((plan) => {
          if (!isPlanForSubject(plan, subjectId)) return plan;
          const updatedTopics = plan.weeklyTopics.map((topic) =>
            topic.id === topicId ? { ...topic, ...updates, updatedAt: new Date().toISOString() } : topic
          );
          return { ...plan, weeklyTopics: updatedTopics, updatedAt: new Date().toISOString() };
        })
      );
    },
    [isPlanForSubject]
  );

  const toggleWeeklyTopicPublish = useCallback(
    (subjectId: string, topicId: string, isPublished: boolean) => {
      setLearningPlans((prev) =>
        prev.map((plan) => {
          if (!isPlanForSubject(plan, subjectId)) return plan;
          const updatedTopics = plan.weeklyTopics.map((topic) =>
            topic.id === topicId ? { ...topic, isPublished, updatedAt: new Date().toISOString() } : topic
          );
          return { ...plan, weeklyTopics: updatedTopics, updatedAt: new Date().toISOString() };
        })
      );
    },
    [isPlanForSubject]
  );

  const toggleAllWeeklyTopicsPublish = useCallback(
    (subjectId: string, isPublished: boolean) => {
      setLearningPlans((prev) =>
        prev.map((plan) => {
          if (!isPlanForSubject(plan, subjectId)) return plan;
          const updatedTopics = plan.weeklyTopics.map((topic) => ({
            ...topic,
            isPublished,
            updatedAt: new Date().toISOString(),
          }));
          return { ...plan, weeklyTopics: updatedTopics, updatedAt: new Date().toISOString() };
        })
      );
    },
    [isPlanForSubject]
  );

  const deleteLearningPlan = useCallback(
    (subjectId: string) => {
      setLearningPlans((prev) => prev.filter((p) => !isPlanForSubject(p, subjectId)));
    },
    [isPlanForSubject]
  );

  const getLearningPlanBySubjectId = useCallback(
    (subjectId: string) => {
      // Direct ID match first
      const direct = learningPlans.find((p) => p.subjectId === subjectId);
      if (direct) return direct;
      // Multi-section shared course match
      return learningPlans.find((p) => isPlanForSubject(p, subjectId));
    },
    [learningPlans, isPlanForSubject]
  );

  const getRawData = () => ({
    templates: matrixTemplates,
    sections,
    subjects,
    assessments,
    scores,
    attendance,
    holidays,
    allUsers,
    learningPlans,
  });

  const importData = (jsonData: string): boolean => {
    try {
      const parsed = JSON.parse(jsonData);
      if (parsed.templates) setMatrixTemplates(parsed.templates);
      if (parsed.sections) setSections(parsed.sections);
      if (parsed.subjects) setSubjects(parsed.subjects);
      if (parsed.assessments) setAssessments(parsed.assessments);
      if (parsed.scores) setScores(parsed.scores);
      if (parsed.attendance) setAttendanceRecords(parsed.attendance);
      if (parsed.holidays) setHolidays(parsed.holidays);
      if (parsed.allUsers) setAllUsers(parsed.allUsers);
      if (parsed.learningPlans) setLearningPlans(parsed.learningPlans);
      return true;
    } catch (e) {
      console.error('Failed to import JSON data', e);
      return false;
    }
  };

  return (
    <DataContext.Provider
      value={{
        sections,
        subjects,
        assessments,
        scores,
        attendance,
        students,
        teachers,
        allUsers,
        matrixTemplates,
        holidays,
        learningPlans,
        saveLearningPlan,
        updateWeeklyTopic,
        toggleWeeklyTopicPublish,
        toggleAllWeeklyTopicsPublish,
        deleteLearningPlan,
        getLearningPlanBySubjectId,
        addTeacher,
        updateTeacher,
        deleteTeacher,
        addSection,
        updateSection,
        deleteSection,
        addSubject,
        updateSubject,
        deleteSubject,
        updateSubjectMatrix,
        saveMatrixTemplate,
        deleteMatrixTemplate,
        applyTemplateGlobally,
        applyTemplateToSubject,
        addAssessment,
        updateAssessment,
        deleteAssessment,
        setScore,
        deleteScore,
        batchUpdateScores,
        importOfficialGrades,
        setAttendance,
        markAllAttendance,
        clearAttendanceForDate,
        deleteAttendanceRecord,
        addHoliday,
        deleteHoliday,
        addStudent,
        bulkAddStudents,
        updateStudent,
        deleteStudent,
        resetUserPassword,
        resetToDefault,
        getRawData,
        importData,
        pullFromCloud,
        pushAllToCloud,
        startFreshOfficial,
        rolloverAcademicYear,
        resetToDemoData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
