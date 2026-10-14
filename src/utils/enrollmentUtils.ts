import { User, Subject, Assessment, ScoreRecord, AttendanceRecord } from '../types';

/**
 * Encodes adviserId into section description without requiring database schema changes.
 * e.g., "Main lecture room [adviser:teacher-123]"
 */
export function encodeSectionDescription(description?: string, adviserId?: string): string {
  const cleanDesc = (description || '').replace(/\[adviser:[^\]]+\]/g, '').trim();
  if (!adviserId) return cleanDesc;
  return cleanDesc ? `${cleanDesc} [adviser:${adviserId}]` : `[adviser:${adviserId}]`;
}

/**
 * Decodes raw section description into clean description and adviserId.
 */
export function decodeSectionDescription(rawDesc?: string): { description?: string; adviserId?: string } {
  if (!rawDesc) return { description: undefined, adviserId: undefined };
  const match = rawDesc.match(/\[adviser:([^\]]+)\]/);
  const adviserId = match ? match[1].trim() : undefined;
  const description = rawDesc.replace(/\[adviser:[^\]]+\]/g, '').trim() || undefined;
  return { description, adviserId };
}

/**
 * Parses comma-separated section IDs or array into clean string array.
 */
export function parseSectionIds(raw?: string | string[]): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

/**
 * Formats section IDs array into comma-separated string for database persistence.
 */
export function formatSectionIds(ids?: string[] | string): string | null {
  if (!ids) return null;
  if (typeof ids === 'string') {
    const list = ids.split(',').map((s) => s.trim()).filter(Boolean);
    return list.length > 0 ? list.join(',') : null;
  }
  const filtered = ids.map((s) => (s || '').trim()).filter(Boolean);
  const unique = Array.from(new Set(filtered));
  return unique.length > 0 ? unique.join(',') : null;
}

/**
 * Returns all section IDs a student is enrolled in.
 */
export function getStudentSectionIds(student?: User | null): string[] {
  if (!student) return [];
  const set = new Set<string>();
  if (student.sectionId) {
    student.sectionId.split(',').map((s) => s.trim()).filter(Boolean).forEach((id) => set.add(id));
  }
  if (student.sectionIds && Array.isArray(student.sectionIds)) {
    student.sectionIds.map((s) => (s || '').trim()).filter(Boolean).forEach((id) => set.add(id));
  }
  return Array.from(set);
}

/**
 * Checks whether a student belongs to a given section ID.
 */
export function isStudentInSection(student?: User | null, sectionId?: string): boolean {
  if (!student || !sectionId) return false;
  const enrolledIds = getStudentSectionIds(student);
  return enrolledIds.includes(sectionId);
}

/**
 * Returns all subjects a student is enrolled in or actively participating in.
 * Includes:
 * 1. Subjects under any of the student's enrolled sections/cohorts (multi-class support)
 * 2. Subjects where the student has recorded assessment scores
 * 3. Subjects where the student has recorded attendance records
 */
export function getStudentEnrolledSubjects(
  student?: User | null,
  subjects: Subject[] = [],
  assessments: Assessment[] = [],
  scores: ScoreRecord[] = [],
  attendance: AttendanceRecord[] = []
): Subject[] {
  if (!student) return [];
  const enrolledSecIds = getStudentSectionIds(student);

  // Subject IDs where student has recorded activity
  const activeSubjectIds = new Set<string>();

  if (student.id) {
    if (assessments.length > 0 && scores.length > 0) {
      const studentAssIds = new Set(
        scores.filter((sc) => sc.studentId === student.id).map((sc) => sc.assessmentId)
      );
      assessments
        .filter((ass) => studentAssIds.has(ass.id))
        .forEach((ass) => activeSubjectIds.add(ass.subjectId));
    }

    if (attendance.length > 0) {
      attendance
        .filter((att) => att.studentId === student.id)
        .forEach((att) => activeSubjectIds.add(att.subjectId));
    }
  }

  // Deduplicate matched subjects
  const matchedSubjectsMap = new Map<string, Subject>();

  subjects.forEach((subj) => {
    const isInEnrolledSection = enrolledSecIds.includes(subj.sectionId);
    const hasActivity = activeSubjectIds.has(subj.id);

    if (isInEnrolledSection || hasActivity) {
      matchedSubjectsMap.set(subj.id, subj);
    }
  });

  return Array.from(matchedSubjectsMap.values());
}

/**
 * Normalizes course codes for curriculum matching across multiple sections/cohorts.
 * e.g., "IPT101", "IPT 101", "ipt-101", "IPT_101" -> "IPT101"
 */
export function normalizeCourseCode(code?: string, name?: string): string {
  if (code && code.trim().length > 0) {
    return code.trim().toUpperCase().replace(/[\s\-_]+/g, '');
  }
  if (name && name.trim().length > 0) {
    return name.trim().toUpperCase().replace(/[\s\-_]+/g, '');
  }
  return '';
}

