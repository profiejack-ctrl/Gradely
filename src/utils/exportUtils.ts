import { Subject, User, Assessment, ScoreRecord, AttendanceRecord, GradingPeriod } from '../types';
import { calculateStudentSubjectPerformance, calculatePeriodSummary } from './gradeCalculator';

/**
 * Generates and triggers download of a CSV file for a subject's gradebook
 */
export function exportGradebookToCSV(
  subject: Subject,
  students: User[],
  assessments: Assessment[],
  scores: ScoreRecord[],
  attendance: AttendanceRecord[],
  periodView: GradingPeriod | 'summary' = 'summary'
) {
  if (periodView === 'summary') {
    const headers = [
      'Student Number',
      'Student Name',
      'Email',
      'Prelim Grade (30%)',
      'Midterm Grade (30%)',
      'Finals Grade (40%)',
      'Semestral Final Grade %',
      'GPA',
      'Remarks',
    ];

    const rows = students.map((student) => {
      const perf = calculateStudentSubjectPerformance(
        subject,
        student,
        assessments,
        scores,
        attendance
      );

      return [
        `"${student.studentNumber || ''}"`,
        `"${student.name}"`,
        `"${student.email}"`,
        perf.periods.prelim.grade,
        perf.periods.midterm.grade,
        perf.periods.finals.grade,
        perf.finalGrade,
        perf.gpa.toFixed(2),
        perf.remarks,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `${subject.code}_Semestral_Summary_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  // Specific Period CSV
  const periodAssessments = assessments.filter(
    (a) => a.subjectId === subject.id && (a.period || 'prelim') === periodView
  );

  const headers = [
    'Student Number',
    'Student Name',
    'Email',
    'Attendance %',
    ...periodAssessments.map((a) => `${a.title} (Max: ${a.maxScore})`),
    `${periodView.toUpperCase()} Period Grade %`,
  ];

  const rows = students.map((student) => {
    const periodSumm = calculatePeriodSummary(
      subject,
      student,
      periodView,
      assessments,
      scores,
      attendance
    );

    const assessmentScores = periodAssessments.map((a) => {
      const rec = scores.find((s) => s.assessmentId === a.id && s.studentId === student.id);
      return rec ? rec.score : 0;
    });

    return [
      `"${student.studentNumber || ''}"`,
      `"${student.name}"`,
      `"${student.email}"`,
      periodSumm.attendanceRate,
      ...assessmentScores,
      periodSumm.grade,
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `${subject.code}_${periodView.toUpperCase()}_Gradebook_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Backs up entire system state to a JSON file
 */
export function exportSystemDataToJSON(data: Record<string, unknown>) {
  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(data, null, 2)
  )}`;
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', jsonString);
  downloadAnchor.setAttribute(
    'download',
    `AuraSMS_Backup_${new Date().toISOString().slice(0, 10)}.json`
  );
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
