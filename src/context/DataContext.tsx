import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
import { syncEngine } from '../services/syncEngine';
import { saveStoredCredential, USERS_STORAGE_KEY } from './AuthContext';
import {
  encodeSectionDescription,
  formatSectionIds,
  getStudentSectionIds,
} from '../utils/enrollmentUtils';

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

  // Faculty
  addTeacher: (teacher: Omit<User, 'id' | 'role'>, initialPassword?: string, mustChangePassword?: boolean) => User;
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
  updateSubjectMatrix: (subjectId: string, matrix: MatrixCategory[], passingGrade?: number) => void;

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
  batchUpdateScores: (updates: { assessmentId: string; studentId: string; score: number; remarks?: string }[]) => void;

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

  // Holidays
  addHoliday: (holiday: Omit<Holiday, 'id'>) => Holiday;
  deleteHoliday: (id: string) => void;

  // Students
  addStudent: (student: Omit<User, 'id' | 'role'>) => User;
  bulkAddStudents: (students: Omit<User, 'id' | 'role'>[]) => User[];
  updateStudent: (id: string, data: Partial<User>) => void;
  deleteStudent: (id: string) => void;

  // Backup & Reset & Sync
  resetToDefault: () => void;
  getRawData: () => Record<string, unknown>;
  importData: (jsonData: string) => boolean;
  pullFromCloud: () => Promise<void>;
  pushAllToCloud: () => Promise<{ success: boolean; error?: any }>;
  startFreshOfficial: (options?: { wipeCloud?: boolean }) => Promise<void>;
  rolloverAcademicYear: (
    newAcademicYear: string,
    newSemester: string,
    options: { clearScores: boolean; clearAttendance: boolean; clearAssessments: boolean; syncToCloud?: boolean }
  ) => Promise<void>;
  resetToDemoData: (syncToCloud?: boolean) => Promise<void>;
}

const STORAGE_KEY = 'aurasms_data_store_v3';

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [matrixTemplates, setMatrixTemplates] = useState<GradingMatrixTemplate[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_templates`);
    return saved ? JSON.parse(saved) : INITIAL_GLOBAL_TEMPLATES;
  });

  const [sections, setSections] = useState<Section[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_sections`);
    return saved ? JSON.parse(saved) : INITIAL_SECTIONS;
  });

  const [subjects, setSubjects] = useState<Subject[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_subjects`);
    return saved ? JSON.parse(saved) : INITIAL_SUBJECTS;
  });

  const [assessments, setAssessments] = useState<Assessment[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_assessments`);
    return saved ? JSON.parse(saved) : INITIAL_ASSESSMENTS;
  });

  const [scores, setScores] = useState<ScoreRecord[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_scores`);
    return saved ? JSON.parse(saved) : INITIAL_SCORES;
  });

  const [attendance, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_attendance`);
    return saved ? JSON.parse(saved) : INITIAL_ATTENDANCE;
  });

  const [holidays, setHolidays] = useState<Holiday[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_holidays`);
    return saved ? JSON.parse(saved) : INITIAL_HOLIDAYS;
  });

  const [allUsers, setAllUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_users`);
    return saved ? JSON.parse(saved) : INITIAL_USERS;
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

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_users`, JSON.stringify(allUsers));
  }, [allUsers]);

  // Pull authoritative remote data directly from Supabase cloud
  const pullFromCloud = useCallback(async () => {
    const remote = await syncEngine.pullAll();
    if (!remote) return;

    if (remote.users) {
      setAllUsers(remote.users);
    }
    if (remote.sections) {
      setSections(remote.sections);
    }
    if (remote.matrixTemplates) {
      setMatrixTemplates(remote.matrixTemplates);
    }
    if (remote.subjects) {
      setSubjects(remote.subjects);
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
    // Initial fetch from cloud
    pullFromCloud();

    // Subscribe to realtime database changes
    syncEngine.initRealtime(() => {
      pullFromCloud();
    });

    // Cross-tab synchronization via localStorage storage event
    const handleStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith(STORAGE_KEY)) {
        pullFromCloud();
      }
    };
    window.addEventListener('storage', handleStorage);

    // Re-sync when user tabs back or focuses browser window
    const handleFocus = () => {
      pullFromCloud();
    };
    window.addEventListener('focus', handleFocus);

    // Periodic gentle background poll (every 12 seconds)
    const pollTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        pullFromCloud();
      }
    }, 12000);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
      clearInterval(pollTimer);
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
      matrix: newSubj.matrix,
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
          matrix: target.matrix,
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

  const updateSubjectMatrix = (subjectId: string, matrix: MatrixCategory[], passingGrade?: number) => {
    setSubjects((prev) => {
      const updated = prev.map((s) =>
        s.id === subjectId
          ? {
              ...s,
              matrix,
              passingGrade: passingGrade !== undefined ? passingGrade : s.passingGrade,
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
          matrix: target.matrix,
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
      matrix: savedTemplate.matrix,
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
          matrix: s.matrix,
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
          matrix: target.matrix,
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

  // --- Attendance actions ---
  const setAttendance = (
    subjectId: string,
    studentId: string,
    date: string,
    status: AttendanceStatus,
    note?: string,
    period?: GradingPeriod
  ) => {
    setAttendanceRecords((prev) => {
      const idx = prev.findIndex(
        (a) => a.subjectId === subjectId && a.studentId === studentId && a.date === date
      );
      let recId = `att-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
      let updated: AttendanceRecord[];

      if (idx >= 0) {
        recId = prev[idx].id;
        updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          status,
          period: period !== undefined ? period : updated[idx].period,
          note: note !== undefined ? note : updated[idx].note,
        };
      } else {
        updated = [
          ...prev,
          {
            id: recId,
            subjectId,
            studentId,
            date,
            status,
            period: period || 'prelim',
            note,
          },
        ];
      }

      syncEngine.enqueue('attendance_records', 'UPSERT', {
        id: recId,
        subject_id: subjectId,
        student_id: studentId,
        date,
        period: period || 'prelim',
        status,
        note,
      });

      return updated;
    });
  };

  const markAllAttendance = (
    subjectId: string,
    studentIds: string[],
    date: string,
    status: AttendanceStatus,
    period?: GradingPeriod
  ) => {
    setAttendanceRecords((prev) => {
      const prevMap = new Map(
        prev
          .filter((a) => a.subjectId === subjectId && a.date === date)
          .map((r) => [r.studentId, r])
      );

      const filtered = prev.filter(
        (a) => !(a.subjectId === subjectId && a.date === date && studentIds.includes(a.studentId))
      );
      const newRecords: AttendanceRecord[] = studentIds.map((sId) => {
        const existing = prevMap.get(sId);
        const id = existing?.id || `att-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
        syncEngine.enqueue('attendance_records', 'UPSERT', {
          id,
          subject_id: subjectId,
          student_id: sId,
          date,
          period: period || existing?.period || 'prelim',
          status,
        });
        return {
          id,
          subjectId,
          studentId: sId,
          date,
          status,
          period: period || existing?.period || 'prelim',
        };
      });
      return [...filtered, ...newRecords];
    });
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

  const updateStudent = (id: string, data: Partial<User>) => {
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
      if (target) {
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

  // --- Faculty / Teacher actions ---
  const addTeacher = (
    teacherData: Omit<User, 'id' | 'role'>,
    initialPassword = 'teacher123',
    mustChangePassword = false
  ): User => {
    const newTeacher: User = {
      ...teacherData,
      id: `teacher-${Date.now().toString(36)}`,
      role: 'teacher',
      avatar:
        teacherData.avatar ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(teacherData.name)}`,
      mustChangePassword,
      customPassword: initialPassword,
    };

    saveStoredCredential(newTeacher, initialPassword, mustChangePassword);

    setAllUsers((prev) => {
      const updated = [...prev, newTeacher];
      try {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    syncEngine.enqueue('users', 'UPSERT', {
      id: newTeacher.id,
      name: newTeacher.name,
      email: newTeacher.email,
      role: newTeacher.role,
      avatar: newTeacher.avatar || null,
      department: newTeacher.department || null,
      title: newTeacher.title || null,
    });

    return newTeacher;
  };

  const updateTeacher = (id: string, data: Partial<User>, newPassword?: string) => {
    setAllUsers((prev) => {
      const updated = prev.map((u) => {
        if (u.id === id) {
          const next = { ...u, ...data };
          if (newPassword) {
            next.customPassword = newPassword;
            saveStoredCredential(next, newPassword, false);
          }
          return next;
        }
        return u;
      });

      const target = updated.find((u) => u.id === id);
      if (target) {
        if (newPassword) {
          saveStoredCredential(target, newPassword, false);
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
    setAllUsers(teachersOnly);
    setSections([]);
    setSubjects([]);
    setAssessments([]);
    setScores([]);
    setAttendanceRecords([]);
    setHolidays(INITIAL_HOLIDAYS);
    setMatrixTemplates(INITIAL_GLOBAL_TEMPLATES);

    localStorage.setItem(`${STORAGE_KEY}_users`, JSON.stringify(teachersOnly));
    localStorage.setItem(`${STORAGE_KEY}_sections`, JSON.stringify([]));
    localStorage.setItem(`${STORAGE_KEY}_subjects`, JSON.stringify([]));
    localStorage.setItem(`${STORAGE_KEY}_assessments`, JSON.stringify([]));
    localStorage.setItem(`${STORAGE_KEY}_scores`, JSON.stringify([]));
    localStorage.setItem(`${STORAGE_KEY}_attendance`, JSON.stringify([]));
    localStorage.setItem(`${STORAGE_KEY}_holidays`, JSON.stringify(INITIAL_HOLIDAYS));
    localStorage.setItem(`${STORAGE_KEY}_templates`, JSON.stringify(INITIAL_GLOBAL_TEMPLATES));

    syncEngine.clearQueue();

    if (options?.wipeCloud) {
      await syncEngine.wipeCloudDatabase({ keepTeachersAndTemplates: true });
      await syncEngine.pushAllData({
        users: teachersOnly,
        sections: [],
        templates: INITIAL_GLOBAL_TEMPLATES,
        subjects: [],
        assessments: [],
        scores: [],
        attendance: [],
        holidays: INITIAL_HOLIDAYS,
      });
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
      await syncEngine.wipeCloudDatabase({ keepTeachersAndTemplates: false });
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

    setMatrixTemplates(INITIAL_GLOBAL_TEMPLATES);
    setSections(INITIAL_SECTIONS);
    setSubjects(INITIAL_SUBJECTS);
    setAssessments(INITIAL_ASSESSMENTS);
    setScores(INITIAL_SCORES);
    setAttendanceRecords(INITIAL_ATTENDANCE);
    setHolidays(INITIAL_HOLIDAYS);
    setAllUsers(INITIAL_USERS);
  };

  const getRawData = () => ({
    templates: matrixTemplates,
    sections,
    subjects,
    assessments,
    scores,
    attendance,
    holidays,
    allUsers,
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
        batchUpdateScores,
        setAttendance,
        markAllAttendance,
        addHoliday,
        deleteHoliday,
        addStudent,
        bulkAddStudents,
        updateStudent,
        deleteStudent,
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
