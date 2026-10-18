import {
  Subject,
  User,
  Assessment,
  ScoreRecord,
  AttendanceRecord,
  MatrixCategory,
  MatrixSubCategory,
  CategoryScoreSummary,
  SubCategoryScoreSummary,
  GradingPeriod,
  PeriodGradeSummary,
  StudentSubjectPerformance,
  GRADING_PERIODS,
} from '../types';

/**
 * Calculates attendance metrics and percentage for a student in a specific subject
 */
export function calculateAttendanceStats(
  attendanceRecords: AttendanceRecord[],
  studentId: string,
  subjectId: string,
  period?: GradingPeriod
) {
  const records = attendanceRecords.filter((r) => {
    if (r.studentId !== studentId || r.subjectId !== subjectId) return false;
    if (period) {
      return !r.period || r.period === period;
    }
    return true;
  });

  if (records.length === 0) {
    return {
      rate: 0,
      total: 0,
      present: 0,
      late: 0,
      absent: 0,
      excused: 0,
    };
  }

  let present = 0;
  let late = 0;
  let absent = 0;
  let excused = 0;

  for (const record of records) {
    if (record.status === 'present') present++;
    else if (record.status === 'late') late++;
    else if (record.status === 'absent') absent++;
    else if (record.status === 'excused') excused++;
  }

  const scoreUnits = present * 1 + late * 0.5 + excused * 1;
  const rate =
    records.length > 0
      ? Math.min(100, Math.max(0, (scoreUnits / records.length) * 100))
      : 0;

  return {
    rate: Math.round(rate * 10) / 10,
    total: records.length,
    present,
    late,
    absent,
    excused,
  };
}

/**
 * Detects whether a grading category or subcategory represents Attendance.
 * Attendance is NOT transmutable under institutional grading rules; it is a fixed grade only.
 */
export function isAttendanceCategory(
  category: MatrixCategory | MatrixSubCategory | { name: string; id?: string }
): boolean {
  const name = (category.name || '').toLowerCase();
  const id = (category.id || '').toLowerCase();
  return (
    name.includes('attend') ||
    id.includes('attend') ||
    name.includes('roll call') ||
    id.includes('roll-call') ||
    name.includes('presence')
  );
}

/**
 * Detects whether a grading category represents a Project (e.g. CBO, Course-based Output, Capstone, Portfolio, OCR)
 * Projects are NOT transmutable under institutional grading rules; they are fixed grades only.
 */
export function isProjectCategory(
  category: MatrixCategory | MatrixSubCategory | { name: string; id?: string }
): boolean {
  const name = (category.name || '').toLowerCase();
  const id = (category.id || '').toLowerCase();
  return (
    name.includes('project') ||
    id.includes('project') ||
    name.includes('cbo') ||
    id.includes('cbo') ||
    name.includes('course-based') ||
    id.includes('course-based') ||
    name.includes('capstone') ||
    name.includes('portfolio') ||
    name.includes('ocr') ||
    id.includes('ocr') ||
    name.includes('off-campus') ||
    id.includes('off-campus')
  );
}

/**
 * Bestlink College of the Philippines (BCP) Institutional Rule (AY 2025-2026):
 * ONLY Written Works (WW), Performance Tasks (PT), and Periodic Examinations (WE/OE) are transmutable via Annex A.
 * Attendance and Projects (CBO, OCR, Capstone, Portfolio) are strictly non-transmutable (fixed grades only).
 */
export function isTransmutableComponent(
  item: MatrixCategory | MatrixSubCategory | { name: string; id?: string; isTransmutable?: boolean },
  parentCategory?: MatrixCategory | { name: string; id?: string; isTransmutable?: boolean }
): boolean {
  // 1. Explicit override if present
  if ('isTransmutable' in item && (item as { isTransmutable?: boolean }).isTransmutable !== undefined) {
    return Boolean((item as { isTransmutable?: boolean }).isTransmutable);
  }
  if (
    parentCategory &&
    'isTransmutable' in parentCategory &&
    (parentCategory as { isTransmutable?: boolean }).isTransmutable !== undefined
  ) {
    if (!(parentCategory as { isTransmutable?: boolean }).isTransmutable) return false;
  }

  // 2. Attendance is strictly non-transmutable (fixed grade)
  if (isAttendanceCategory(item) || (parentCategory && isAttendanceCategory(parentCategory))) {
    return false;
  }

  // 3. Projects are strictly non-transmutable (fixed grade)
  if (isProjectCategory(item) || (parentCategory && isProjectCategory(parentCategory))) {
    return false;
  }

  const name = (item.name || '').toLowerCase();
  const id = (item.id || '').toLowerCase();
  const parentName = parentCategory ? (parentCategory.name || '').toLowerCase() : '';
  const combined = `${name} ${id} ${parentName}`;

  // Written Works (quizzes, essays, case studies, assignments, exercises, homework)
  const isWW =
    combined.includes('written') ||
    combined.includes('quiz') ||
    combined.includes('seatwork') ||
    combined.includes('exercise') ||
    combined.includes('assignment') ||
    combined.includes('homework') ||
    combined.includes('essay') ||
    combined.includes('ww');

  // Performance Tasks (lab activities, practical exercises, demonstrations, simulations, recitations, group work)
  const isPT =
    combined.includes('performance') ||
    combined.includes('task') ||
    combined.includes('pt') ||
    combined.includes('lab') ||
    combined.includes('activity') ||
    combined.includes('simulation') ||
    combined.includes('demonstration') ||
    combined.includes('recitation') ||
    combined.includes('practicum');

  // Periodic Examinations (Written Exams WE, Oral Exams OE, Defense, Periodic Test)
  const isExam =
    combined.includes('exam') ||
    combined.includes('we') ||
    combined.includes('oe') ||
    combined.includes('test') ||
    combined.includes('defense') ||
    combined.includes('periodic') ||
    combined.includes('prelim') ||
    combined.includes('midterm') ||
    combined.includes('final');

  return isWW || isPT || isExam;
}

/**
 * Bestlink College of the Philippines (BCP) Official Transmutation Table (Annex A - Collegiate Level)
 * Initial Grade = (Raw Score / Total Items) * 100
 *
 * Transmutation Bracket Mapping:
 * - No attempt: 50
 * - 0: 65
 * - 1-6: 66, 7-12: 67, 13-18: 68, 19-24: 69, 25-30: 70
 * - 31-36: 71, 37-42: 72, 43-45: 73, 46-48: 74
 * - 49-50: 75 (Official Collegiate Passing Grade Threshold: 50% = 75)
 * - 51-52: 76, 53-54: 77, 55-56: 78, 57-58: 79, 59-60: 80
 * - 61-62: 81, 63-64: 82, 65-66: 83, 67-68: 84, 69-70: 85
 * - 71-72: 86, 73-74: 87, 75-76: 88, 77-78: 89, 79-80: 90
 * - 81-82: 91, 83-84: 92, 85-86: 93, 87-88: 94, 89-90: 95
 * - 91-92: 96, 93-94: 97, 95-96: 98, 97-98: 99, 99-100: 100
 */
export function transmuteGrade(rawPercentage: number, hasAttempt: boolean = true): number {
  if (!hasAttempt) return 50;
  const raw = Math.min(100, Math.max(0, Math.round(rawPercentage)));
  if (raw === 0) return 65;
  if (raw <= 6) return 66;
  if (raw <= 12) return 67;
  if (raw <= 18) return 68;
  if (raw <= 24) return 69;
  if (raw <= 30) return 70;
  if (raw <= 36) return 71;
  if (raw <= 42) return 72;
  if (raw <= 45) return 73;
  if (raw <= 48) return 74;
  if (raw <= 50) return 75;
  if (raw <= 52) return 76;
  if (raw <= 54) return 77;
  if (raw <= 56) return 78;
  if (raw <= 58) return 79;
  if (raw <= 60) return 80;
  if (raw <= 62) return 81;
  if (raw <= 64) return 82;
  if (raw <= 66) return 83;
  if (raw <= 68) return 84;
  if (raw <= 70) return 85;
  if (raw <= 72) return 86;
  if (raw <= 74) return 87;
  if (raw <= 76) return 88;
  if (raw <= 78) return 89;
  if (raw <= 80) return 90;
  if (raw <= 82) return 91;
  if (raw <= 84) return 92;
  if (raw <= 86) return 93;
  if (raw <= 88) return 94;
  if (raw <= 90) return 95;
  if (raw <= 92) return 96;
  if (raw <= 94) return 97;
  if (raw <= 96) return 98;
  if (raw <= 98) return 99;
  return 100;
}

/**
 * Calculates scores for an individual subcategory (e.g., Attendance 10%, Performance Task 50%, Quizzes 40%)
 */
export function calculateSubCategorySummary(
  subCat: MatrixSubCategory,
  parentCat: MatrixCategory,
  subjectId: string,
  studentId: string,
  assessments: Assessment[],
  scores: ScoreRecord[],
  attendanceRecords: AttendanceRecord[],
  period?: GradingPeriod,
  useTransmutation: boolean = true
): SubCategoryScoreSummary {
  const isAttendance = isAttendanceCategory(subCat) || isAttendanceCategory(parentCat);

  if (isAttendance) {
    const attStats = calculateAttendanceStats(attendanceRecords, studentId, subjectId, period);
    const rawPct = attStats.total > 0 ? attStats.rate : 0;
    const roundedRawPct = Math.round(rawPct * 10) / 10;
    // Attendance is strictly fixed (non-transmutable)
    const weighted = (roundedRawPct * subCat.weight) / 100;

    return {
      subCategory: subCat,
      earnedPoints: Math.round(rawPct),
      maxPoints: 100,
      rawPercentage: roundedRawPct,
      transmutedPercentage: roundedRawPct,
      weightedContribution: Math.round(weighted * 10) / 10,
      assessmentCount: attStats.total,
      isTransmutable: false,
    };
  }

  // Filter assessments matching subCat.id or category name and period
  const subAssessments = assessments.filter((a) => {
    if (a.subjectId !== subjectId) return false;
    if (period && (a.period || 'prelim') !== period) return false;

    return (
      a.categoryId === subCat.id ||
      (a.parentCategoryId === parentCat.id && a.categoryId === subCat.id) ||
      (!a.parentCategoryId &&
        a.title.toLowerCase().includes(subCat.name.toLowerCase().slice(0, 4)))
    );
  });

  // Only Written Works, Performance Tasks, and Exam are transmutable
  const isTransmutable = useTransmutation && isTransmutableComponent(subCat, parentCat);

  if (subAssessments.length === 0) {
    return {
      subCategory: subCat,
      earnedPoints: 0,
      maxPoints: 0,
      rawPercentage: 0,
      transmutedPercentage: 0,
      weightedContribution: 0,
      assessmentCount: 0,
      isTransmutable,
    };
  }

  let totalEarned = 0;
  let totalMax = 0;

  for (const assessment of subAssessments) {
    const scoreRec = scores.find(
      (s) => s.assessmentId === assessment.id && s.studentId === studentId
    );
    totalMax += assessment.maxScore;
    if (scoreRec) {
      totalEarned += Math.min(assessment.maxScore, Math.max(0, scoreRec.score));
    }
  }

  const rawPct = totalMax > 0 ? (totalEarned / totalMax) * 100 : 0;
  const roundedRawPct = Math.round(rawPct * 10) / 10;
  const effectivePct = isTransmutable ? transmuteGrade(roundedRawPct, true) : roundedRawPct;
  const weighted = (effectivePct * subCat.weight) / 100;

  return {
    subCategory: subCat,
    earnedPoints: Math.round(totalEarned * 10) / 10,
    maxPoints: totalMax,
    rawPercentage: roundedRawPct,
    transmutedPercentage: Math.round(effectivePct * 10) / 10,
    weightedContribution: Math.round(weighted * 10) / 10,
    assessmentCount: subAssessments.length,
    isTransmutable,
  };
}

/**
 * Calculates the performance summary for a specific top-level matrix category
 */
export function calculateCategorySummary(
  category: MatrixCategory,
  subjectId: string,
  studentId: string,
  assessments: Assessment[],
  scores: ScoreRecord[],
  attendanceRecords: AttendanceRecord[],
  period?: GradingPeriod,
  useTransmutation: boolean = true
): CategoryScoreSummary {
  const isProject = isProjectCategory(category);
  const isAttendance = isAttendanceCategory(category);

  // If category has nested subcategories (e.g. Class Standing -> Attendance 10%, Quizzes 40%, Performance Tasks 50%)
  if (category.subCategories && category.subCategories.length > 0) {
    const subSummaries = category.subCategories.map((sub) =>
      calculateSubCategorySummary(
        sub,
        category,
        subjectId,
        studentId,
        assessments,
        scores,
        attendanceRecords,
        period,
        useTransmutation
      )
    );

    let parentEffectivePct = 0;
    let parentRawPct = 0;
    let totalAssessments = 0;
    let totalEarned = 0;
    let totalMax = 0;

    for (const sub of subSummaries) {
      parentEffectivePct += sub.weightedContribution;
      parentRawPct += (sub.rawPercentage * sub.subCategory.weight) / 100;
      totalAssessments += sub.assessmentCount;
      totalEarned += sub.earnedPoints;
      totalMax += sub.maxPoints;
    }

    const roundedParentEffectivePct = Math.min(100, Math.max(0, Math.round(parentEffectivePct * 10) / 10));
    const roundedParentRawPct = Math.min(100, Math.max(0, Math.round(parentRawPct * 10) / 10));

    // Notice: Each transmutable subcomponent (Written Works, Performance Tasks, Exam)
    // already had transmuteGrade() applied to compute its weightedContribution.
    // Non-transmutable subcomponents (Attendance, Projects) contributed their fixed raw rate.
    // The parent category (e.g. Class Standing) is the weighted sum of these subcomponents,
    // so we NEVER apply transmuteGrade() to the parent composite again!
    const parentWeighted = (roundedParentEffectivePct * category.weight) / 100;

    const hasTransmutableSub = subSummaries.some((s) => s.isTransmutable);

    return {
      category,
      earnedPoints: Math.round(totalEarned * 10) / 10,
      maxPoints: totalMax,
      rawPercentage: roundedParentRawPct,
      transmutedPercentage: roundedParentEffectivePct,
      weightedContribution: Math.round(parentWeighted * 10) / 10,
      assessmentCount: totalAssessments,
      subCategorySummaries: subSummaries,
      isTransmutable: hasTransmutableSub,
      isProject,
    };
  }

  // Standalone Attendance category
  if (isAttendance) {
    const attStats = calculateAttendanceStats(attendanceRecords, studentId, subjectId, period);
    const rawPct = attStats.total > 0 ? attStats.rate : 0;
    const roundedRawPct = Math.round(rawPct * 10) / 10;
    // Attendance is strictly fixed (non-transmutable)
    const weighted = (roundedRawPct * category.weight) / 100;

    return {
      category,
      earnedPoints: Math.round(rawPct),
      maxPoints: 100,
      rawPercentage: roundedRawPct,
      transmutedPercentage: roundedRawPct,
      weightedContribution: Math.round(weighted * 10) / 10,
      assessmentCount: attStats.total,
      isTransmutable: false,
      isProject: false,
    };
  }

  // Standalone regular category (e.g. Project 40%, Examination 25%, Written Works 30%)
  const categoryAssessments = assessments.filter((a) => {
    if (a.subjectId !== subjectId) return false;
    if (period && (a.period || 'prelim') !== period) return false;
    return a.categoryId === category.id || a.parentCategoryId === category.id;
  });

  const isTransmutable = useTransmutation && isTransmutableComponent(category);

  if (categoryAssessments.length === 0) {
    return {
      category,
      earnedPoints: 0,
      maxPoints: 0,
      rawPercentage: 0,
      transmutedPercentage: 0,
      weightedContribution: 0,
      assessmentCount: 0,
      isTransmutable,
      isProject,
    };
  }

  let totalEarned = 0;
  let totalMax = 0;

  for (const assessment of categoryAssessments) {
    const scoreRec = scores.find(
      (s) => s.assessmentId === assessment.id && s.studentId === studentId
    );
    totalMax += assessment.maxScore;
    if (scoreRec) {
      totalEarned += Math.min(assessment.maxScore, Math.max(0, scoreRec.score));
    }
  }

  const rawPct = totalMax > 0 ? (totalEarned / totalMax) * 100 : 0;
  const roundedRawPct = Math.round(rawPct * 10) / 10;

  // Transmute ONLY Written Works, Performance Tasks, and Exam.
  // Attendance and Projects remain fixed.
  let effectivePct = roundedRawPct;
  if (isTransmutable && categoryAssessments.length > 0) {
    effectivePct = transmuteGrade(roundedRawPct, true);
  }

  const weighted = (effectivePct * category.weight) / 100;

  return {
    category,
    earnedPoints: Math.round(totalEarned * 10) / 10,
    maxPoints: totalMax,
    rawPercentage: roundedRawPct,
    transmutedPercentage: Math.round(effectivePct * 10) / 10,
    weightedContribution: Math.round(weighted * 10) / 10,
    assessmentCount: categoryAssessments.length,
    isTransmutable,
    isProject,
  };
}

/**
 * Converts percentage grade (0-100) to Philippine Collegiate Grade Point Equivalent (1.00 - 5.00 scale)
 * Institutional nested formula:
 * =IF([@Column33]>=98,1,IF([@Column33]>=95,1.25,IF([@Column33]>=92,1.5,IF([@Column33]>=89,1.75,IF([@Column33]>=86,2,IF([@Column33]>=83,2.25,IF([@Column33]>=80,2.5,IF([@Column33]>=77,2.75,IF([@Column33]>=75,3,5)))))))))
 */
export function convertToGPA(grade: number): number {
  if (grade >= 98) return 1.0;
  if (grade >= 95) return 1.25;
  if (grade >= 92) return 1.5;
  if (grade >= 89) return 1.75;
  if (grade >= 86) return 2.0;
  if (grade >= 83) return 2.25;
  if (grade >= 80) return 2.5;
  if (grade >= 77) return 2.75;
  if (grade >= 75) return 3.0;
  return 5.0;
}

/**
 * Returns descriptive qualitative evaluation corresponding to 1.00 - 5.00 grade point
 */
export function getGradePointDescription(gradePoint: number): string {
  if (gradePoint <= 1.0) return 'Excellent';
  if (gradePoint <= 1.25) return 'Superior';
  if (gradePoint <= 1.5) return 'Very Good';
  if (gradePoint <= 1.75) return 'Good';
  if (gradePoint <= 2.0) return 'Very Satisfactory';
  if (gradePoint <= 2.25) return 'Satisfactory';
  if (gradePoint <= 2.5) return 'Fairly Satisfactory';
  if (gradePoint <= 2.75) return 'Fair';
  if (gradePoint <= 3.0) return 'Passing';
  return 'Failed';
}

/**
 * Calculates a specific period summary (Prelim, Midterm, or Finals)
 */
export function calculatePeriodSummary(
  subject: Subject,
  student: User,
  period: GradingPeriod,
  assessments: Assessment[],
  scores: ScoreRecord[],
  attendanceRecords: AttendanceRecord[]
): PeriodGradeSummary {
  const periodConfig = GRADING_PERIODS.find((p) => p.id === period) || {
    id: period,
    name: period.toUpperCase(),
    weight: period === 'finals' ? 40 : 30,
    shortName: period,
  };

  const periodAssessments = assessments.filter(
    (a) => a.subjectId === subject.id && (a.period || 'prelim') === period
  );

  const useTransmutation = subject.useTransmutation !== false;

  const categories: CategoryScoreSummary[] = subject.matrix.map((cat) =>
    calculateCategorySummary(
      cat,
      subject.id,
      student.id,
      assessments,
      scores,
      attendanceRecords,
      period,
      useTransmutation
    )
  );

  const attStats = calculateAttendanceStats(attendanceRecords, student.id, subject.id, period);
  const hasRecords = periodAssessments.length > 0 || attStats.total > 0;

  let totalEffectiveWeighted = 0;
  let totalRawWeighted = 0;
  for (const cat of categories) {
    totalEffectiveWeighted += cat.weightedContribution;
    totalRawWeighted += (cat.rawPercentage * cat.category.weight) / 100;
  }

  const rawPeriodGrade = Math.min(100, Math.max(0, Math.round(totalRawWeighted * 10) / 10));
  const effectivePeriodGrade = hasRecords
    ? Math.min(100, Math.max(0, Math.round(totalEffectiveWeighted * 10) / 10))
    : 0;

  const isPassing = effectivePeriodGrade >= subject.passingGrade;

  return {
    period,
    periodName: periodConfig.shortName,
    weight: periodConfig.weight,
    grade: effectivePeriodGrade,
    rawGrade: rawPeriodGrade,
    transmutedGrade: effectivePeriodGrade,
    useTransmutation,
    categories,
    attendanceRate: attStats.rate,
    assessmentCount: periodAssessments.length,
    isPassing,
    hasRecords,
  };
}

/**
 * Evaluates the full performance of a student in a subject across Prelim, Midterm, and Finals
 * Semestral Grade = 30% Prelim + 30% Midterm + 40% Finals
 */
export function calculateStudentSubjectPerformance(
  subject: Subject,
  student: User,
  assessments: Assessment[],
  scores: ScoreRecord[],
  attendanceRecords: AttendanceRecord[]
): StudentSubjectPerformance {
  const prelim = calculatePeriodSummary(
    subject,
    student,
    'prelim',
    assessments,
    scores,
    attendanceRecords
  );
  const midterm = calculatePeriodSummary(
    subject,
    student,
    'midterm',
    assessments,
    scores,
    attendanceRecords
  );
  const finals = calculatePeriodSummary(
    subject,
    student,
    'finals',
    assessments,
    scores,
    attendanceRecords
  );

  const periods: Record<GradingPeriod, PeriodGradeSummary> = {
    prelim,
    midterm,
    finals,
  };

  const useTransmutation = subject.useTransmutation !== false;
  const activePeriods = [prelim, midterm, finals].filter((p) => p.hasRecords);

  let finalGrade = 0;
  let rawFinalGrade = 0;

  if (activePeriods.length === 0) {
    // No records means the course is not graded yet, not 100% complete.
    const defaultCategories: CategoryScoreSummary[] = subject.matrix.map((cat) =>
      calculateCategorySummary(
        cat,
        subject.id,
        student.id,
        assessments,
        scores,
        attendanceRecords,
        undefined,
        useTransmutation
      )
    );
    rawFinalGrade = defaultCategories.reduce((sum, c) => sum + (c.rawPercentage * c.category.weight) / 100, 0);
    finalGrade = defaultCategories.reduce((sum, c) => sum + c.weightedContribution, 0);
  } else if (activePeriods.length === 3) {
    // Full 3-quarter standard semestral calculation
    finalGrade = prelim.grade * 0.3 + midterm.grade * 0.3 + finals.grade * 0.4;
    rawFinalGrade = (prelim.rawGrade || 0) * 0.3 + (midterm.rawGrade || 0) * 0.3 + (finals.rawGrade || 0) * 0.4;
  } else {
    // Proportional weighted average of active quarters
    const activeWeightSum = activePeriods.reduce((sum, p) => sum + p.weight, 0);
    const weightedPoints = activePeriods.reduce(
      (sum, p) => sum + p.grade * (p.weight / 100),
      0
    );
    finalGrade = (weightedPoints / (activeWeightSum / 100));

    const rawWeightedPoints = activePeriods.reduce(
      (sum, p) => sum + (p.rawGrade || 0) * (p.weight / 100),
      0
    );
    rawFinalGrade = rawWeightedPoints / (activeWeightSum / 100);
  }

  finalGrade = Math.min(100, Math.max(0, Math.round(finalGrade * 10) / 10));
  rawFinalGrade = Math.min(100, Math.max(0, Math.round(rawFinalGrade * 10) / 10));

  const overallCategories: CategoryScoreSummary[] = subject.matrix.map((cat) =>
    calculateCategorySummary(
      cat,
      subject.id,
      student.id,
      assessments,
      scores,
      attendanceRecords,
      undefined,
      useTransmutation
    )
  );

  const attStats = calculateAttendanceStats(attendanceRecords, student.id, subject.id);
  const isPassing = finalGrade >= subject.passingGrade;
  const gpa = convertToGPA(finalGrade);

  let remarks: 'Passed' | 'Failed' | 'Incomplete' | 'Honors' = 'Passed';
  if (activePeriods.length === 0) {
    remarks = 'Incomplete';
  } else if (finalGrade >= 95) {
    remarks = 'Honors';
  } else if (!isPassing) {
    remarks = 'Failed';
  }

  return {
    subject,
    student,
    categories: overallCategories,
    attendanceRate: attStats.rate,
    finalGrade,
    rawFinalGrade,
    transmutedFinalGrade: finalGrade,
    gpa,
    isPassing,
    remarks,
    periods,
    useTransmutation,
  };
}

/**
 * Helper to validate if grading matrix totals 100%
 */
export function validateMatrixTotal(matrix: { weight: number }[]): {
  isValid: boolean;
  total: number;
  diff: number;
} {
  const total = matrix.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
  return {
    isValid: total === 100,
    total,
    diff: 100 - total,
  };
}

/**
 * Helper to validate subcategories within a category total 100%
 */
export function validateSubCategoriesTotal(subCategories: { weight: number }[]): {
  isValid: boolean;
  total: number;
  diff: number;
} {
  const total = subCategories.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
  return {
    isValid: total === 100,
    total,
    diff: 100 - total,
  };
}
