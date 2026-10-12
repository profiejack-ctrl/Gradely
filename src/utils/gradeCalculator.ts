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
      rate: 100,
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
      : 100;

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
  period?: GradingPeriod
): SubCategoryScoreSummary {
  const isAttendance =
    subCat.name.toLowerCase().includes('attend') ||
    subCat.id.toLowerCase().includes('attend');

  if (isAttendance) {
    const attStats = calculateAttendanceStats(attendanceRecords, studentId, subjectId, period);
    const rawPct = attStats.total > 0 ? attStats.rate : 100;
    const weighted = (rawPct * subCat.weight) / 100;

    return {
      subCategory: subCat,
      earnedPoints: Math.round(rawPct),
      maxPoints: 100,
      rawPercentage: Math.round(rawPct * 10) / 10,
      weightedContribution: Math.round(weighted * 10) / 10,
      assessmentCount: attStats.total,
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

  if (subAssessments.length === 0) {
    return {
      subCategory: subCat,
      earnedPoints: 0,
      maxPoints: 0,
      rawPercentage: 100,
      weightedContribution: (100 * subCat.weight) / 100,
      assessmentCount: 0,
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
      totalEarned += Math.max(0, scoreRec.score);
    }
  }

  const rawPct = totalMax > 0 ? (totalEarned / totalMax) * 100 : 100;
  const weighted = (rawPct * subCat.weight) / 100;

  return {
    subCategory: subCat,
    earnedPoints: Math.round(totalEarned * 10) / 10,
    maxPoints: totalMax,
    rawPercentage: Math.round(rawPct * 10) / 10,
    weightedContribution: Math.round(weighted * 10) / 10,
    assessmentCount: subAssessments.length,
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
  period?: GradingPeriod
): CategoryScoreSummary {
  // If category has nested subcategories (e.g. Class Standing -> Attendance, Performance Task, Quizzes)
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
        period
      )
    );

    let parentRawPct = 0;
    let totalAssessments = 0;
    let totalEarned = 0;
    let totalMax = 0;

    for (const sub of subSummaries) {
      parentRawPct += sub.weightedContribution;
      totalAssessments += sub.assessmentCount;
      totalEarned += sub.earnedPoints;
      totalMax += sub.maxPoints;
    }

    const roundedParentPct = Math.min(100, Math.max(0, Math.round(parentRawPct * 10) / 10));
    const parentWeighted = (roundedParentPct * category.weight) / 100;

    return {
      category,
      earnedPoints: Math.round(totalEarned * 10) / 10,
      maxPoints: totalMax,
      rawPercentage: roundedParentPct,
      weightedContribution: Math.round(parentWeighted * 10) / 10,
      assessmentCount: totalAssessments,
      subCategorySummaries: subSummaries,
    };
  }

  // Flat category (e.g. Exams 25%, Projects 40%, or standalone Attendance)
  const isAttendanceCat =
    category.name.toLowerCase().includes('attend') ||
    category.id.toLowerCase().includes('attend');

  if (isAttendanceCat) {
    const attStats = calculateAttendanceStats(attendanceRecords, studentId, subjectId, period);
    const rawPct = attStats.total > 0 ? attStats.rate : 100;
    const weighted = (rawPct * category.weight) / 100;

    return {
      category,
      earnedPoints: Math.round(rawPct),
      maxPoints: 100,
      rawPercentage: Math.round(rawPct * 10) / 10,
      weightedContribution: Math.round(weighted * 10) / 10,
      assessmentCount: attStats.total,
    };
  }

  // Regular non-attendance flat category
  const categoryAssessments = assessments.filter((a) => {
    if (a.subjectId !== subjectId) return false;
    if (period && (a.period || 'prelim') !== period) return false;
    return a.categoryId === category.id || a.parentCategoryId === category.id;
  });

  if (categoryAssessments.length === 0) {
    return {
      category,
      earnedPoints: 0,
      maxPoints: 0,
      rawPercentage: 100,
      weightedContribution: (100 * category.weight) / 100,
      assessmentCount: 0,
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
      totalEarned += Math.max(0, scoreRec.score);
    }
  }

  const rawPct = totalMax > 0 ? (totalEarned / totalMax) * 100 : 100;
  const weighted = (rawPct * category.weight) / 100;

  return {
    category,
    earnedPoints: Math.round(totalEarned * 10) / 10,
    maxPoints: totalMax,
    rawPercentage: Math.round(rawPct * 10) / 10,
    weightedContribution: Math.round(weighted * 10) / 10,
    assessmentCount: categoryAssessments.length,
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

  const categories: CategoryScoreSummary[] = subject.matrix.map((cat) =>
    calculateCategorySummary(
      cat,
      subject.id,
      student.id,
      assessments,
      scores,
      attendanceRecords,
      period
    )
  );

  const attStats = calculateAttendanceStats(attendanceRecords, student.id, subject.id, period);

  let totalWeighted = 0;
  for (const cat of categories) {
    totalWeighted += cat.weightedContribution;
  }

  const periodGrade = Math.min(100, Math.max(0, Math.round(totalWeighted * 10) / 10));
  const isPassing = periodGrade >= subject.passingGrade;

  return {
    period,
    periodName: periodConfig.shortName,
    weight: periodConfig.weight,
    grade: periodGrade,
    categories,
    attendanceRate: attStats.rate,
    assessmentCount: periodAssessments.length,
    isPassing,
    hasRecords: periodAssessments.length > 0 || attStats.total > 0,
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

  // Weighted Semestral Formula: 30% Prelim + 30% Midterm + 40% Finals
  // If not all terms have records yet, calculate running proportional grade from active terms
  const activePeriods = [prelim, midterm, finals].filter((p) => p.hasRecords);

  let finalGrade = 0;
  if (activePeriods.length === 0) {
    // If no records in any period, default to overall matrix
    const defaultCategories: CategoryScoreSummary[] = subject.matrix.map((cat) =>
      calculateCategorySummary(
        cat,
        subject.id,
        student.id,
        assessments,
        scores,
        attendanceRecords
      )
    );
    finalGrade = defaultCategories.reduce((sum, c) => sum + c.weightedContribution, 0);
  } else if (activePeriods.length === 3) {
    // Full 3-quarter standard semestral calculation
    finalGrade = prelim.grade * 0.3 + midterm.grade * 0.3 + finals.grade * 0.4;
  } else {
    // Proportional weighted average of active quarters
    const activeWeightSum = activePeriods.reduce((sum, p) => sum + p.weight, 0);
    const weightedPoints = activePeriods.reduce(
      (sum, p) => sum + p.grade * (p.weight / 100),
      0
    );
    finalGrade = (weightedPoints / (activeWeightSum / 100));
  }

  finalGrade = Math.min(100, Math.max(0, Math.round(finalGrade * 10) / 10));

  const overallCategories: CategoryScoreSummary[] = subject.matrix.map((cat) =>
    calculateCategorySummary(
      cat,
      subject.id,
      student.id,
      assessments,
      scores,
      attendanceRecords
    )
  );

  const attStats = calculateAttendanceStats(attendanceRecords, student.id, subject.id);
  const isPassing = finalGrade >= subject.passingGrade;
  const gpa = convertToGPA(finalGrade);

  let remarks: 'Passed' | 'Failed' | 'Incomplete' | 'Honors' = 'Passed';
  if (finalGrade >= 95) {
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
    gpa,
    isPassing,
    remarks,
    periods,
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
