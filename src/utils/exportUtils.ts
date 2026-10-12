import { Subject, User, Assessment, ScoreRecord, AttendanceRecord, GradingPeriod, MatrixCategory } from '../types';
import { calculateStudentSubjectPerformance } from './gradeCalculator';
import { formatLastFirst, compareByLastName } from './nameUtils';

/**
 * Exact 36 column headers expected by the official school SMS portal
 */
export const OFFICIAL_SMS_HEADERS = [
  'student_id',
  'student_name',
  'Class Standing_Attendance_1',
  'Class Standing_Attendance_2',
  'Class Standing_Attendance_3',
  'Class Standing_Attendance_4__',
  'Class Standing_Attendance_5',
  'Class Standing_Attendance_6',
  'Class Standing_Attendance_7',
  'Class Standing_Attendance_8',
  'Class Standing_Attendance_9',
  'Class Standing_Attendance_10',
  'Class Standing_Written_Works_1',
  'Class Standing_Written_Works_2',
  'Class Standing_Written_Works_3',
  'Class Standing_Written_Works_4',
  'Class Standing_Written_Works_5',
  'Class Standing_Written_Works_6',
  'Class Standing_Written_Works_7',
  'Class Standing_Written_Works_8',
  'Class Standing_Written_Works_9',
  'Class Standing_Written_Works_10',
  'Class Standing_Task_1',
  'Class Standing_Task_2',
  'Class Standing_Task_3',
  'Class Standing_Task_4',
  'Class Standing_Task_5',
  'Class Standing_Task_6',
  'Class Standing_Task_7',
  'Class Standing_Task_8',
  'Class Standing_Task_9',
  'Class Standing_Task_10',
  'Project_Output_1',
  'Project_Requirement_1',
  'Examination_Final_Written_Examination',
  'Examination_Final_Oral_Examiantion',
] as const;

/**
 * Categorizes assessments into the official school SMS groupings:
 * - Written Works (Quizzes)
 * - Tasks (Performance Tasks / Classwork / Activities)
 * - Projects (Outputs / Requirements)
 * - Examinations (Written Exam / Oral Exam)
 */
function classifyAssessments(
  subjectAssessments: Assessment[],
  matrix: MatrixCategory[]
): {
  writtenWorks: Assessment[];
  tasks: Assessment[];
  projects: Assessment[];
  exams: Assessment[];
} {
  const writtenWorks: Assessment[] = [];
  const tasks: Assessment[] = [];
  const projects: Assessment[] = [];
  const exams: Assessment[] = [];
  const remainder: Assessment[] = [];

  const getCategoryText = (a: Assessment): string => {
    const parentCat = matrix.find((c) => c.id === a.parentCategoryId || c.id === a.categoryId);
    const subCat = parentCat?.subCategories?.find((s) => s.id === a.categoryId);
    return `${parentCat?.name || ''} ${subCat?.name || ''}`.toLowerCase();
  };

  for (const a of subjectAssessments) {
    const catText = getCategoryText(a);
    const titleText = a.title.toLowerCase();

    // 1. Quizzes / Written Works (User instruction: Written works = Quiz)
    if (
      catText.includes('written') ||
      catText.includes('quiz') ||
      titleText.includes('quiz') ||
      titleText.includes('written') ||
      /^q\s*\d+/i.test(a.title) ||
      /^ww\s*\d+/i.test(a.title)
    ) {
      writtenWorks.push(a);
    }
    // 2. Exams
    else if (
      catText.includes('exam') ||
      catText.includes('periodical') ||
      titleText.includes('exam') ||
      titleText.includes('periodical')
    ) {
      exams.push(a);
    }
    // 3. Projects & Outputs
    else if (
      catText.includes('project') ||
      catText.includes('output') ||
      catText.includes('requirement') ||
      catText.includes('capstone') ||
      titleText.includes('project') ||
      titleText.includes('output') ||
      titleText.includes('requirement') ||
      titleText.includes('capstone')
    ) {
      projects.push(a);
    }
    // 4. Tasks / Performance Tasks / Class Activities
    else if (
      catText.includes('task') ||
      catText.includes('performance') ||
      catText.includes('activity') ||
      catText.includes('act') ||
      catText.includes('lab') ||
      catText.includes('seatwork') ||
      titleText.includes('task') ||
      titleText.includes('activity') ||
      titleText.includes('lab') ||
      /^pt\s*\d+/i.test(a.title) ||
      /^act\s*\d+/i.test(a.title)
    ) {
      tasks.push(a);
    } else {
      remainder.push(a);
    }
  }

  // Allocate any unclassified assessments to appropriate slots
  for (const a of remainder) {
    if (a.maxScore <= 50 && writtenWorks.length < 10) {
      writtenWorks.push(a);
    } else if (tasks.length < 10) {
      tasks.push(a);
    } else if (projects.length < 2) {
      projects.push(a);
    } else if (exams.length < 2) {
      exams.push(a);
    } else if (writtenWorks.length < 10) {
      writtenWorks.push(a);
    } else {
      tasks.push(a);
    }
  }

  // Sort each category chronologically, then by numeric title
  const sortFn = (x: Assessment, y: Assessment) =>
    (x.date || '').localeCompare(y.date || '') ||
    x.title.localeCompare(y.title, undefined, { numeric: true });

  writtenWorks.sort(sortFn);
  tasks.sort(sortFn);
  projects.sort(sortFn);
  exams.sort(sortFn);

  return { writtenWorks, tasks, projects, exams };
}

/**
 * Generates and downloads a CSV file formatted EXACTLY to the official School SMS portal template:
 * - 36 columns matching student_id, student_name, Attendance (1-10), Written Works (1-10), Task (1-10), Project (1-2), Exam (Written, Oral)
 * - Row 2: -,overall,1,1,... with maximum scores
 * - Rows 3+: Student scores with "LastName, FirstName" alphabetical ordering
 */
export function exportGradebookToOfficialSMSCSV(
  subject: Subject,
  students: User[],
  assessments: Assessment[],
  scores: ScoreRecord[],
  attendance: AttendanceRecord[],
  periodView: GradingPeriod | 'summary' = 'summary'
) {
  // 1. Filter assessments for target subject (and grading period if specific period is active)
  const subjectAssessments = assessments.filter(
    (a) => a.subjectId === subject.id && (periodView === 'summary' || (a.period || 'prelim') === periodView)
  );

  const { writtenWorks, tasks, projects, exams } = classifyAssessments(
    subjectAssessments,
    subject.matrix || []
  );

  const wwCols = writtenWorks.slice(0, 10);
  const taskCols = tasks.slice(0, 10);
  const projectCols = projects.slice(0, 2);

  // Identify Written Exam vs Oral Exam
  const oralExam = exams.find((e) => e.title.toLowerCase().includes('oral'));
  const writtenExam = exams.find((e) => e !== oralExam) || exams[0];
  const secondaryExam = oralExam || (exams.length > 1 && exams[1] !== writtenExam ? exams[1] : undefined);

  // 2. Attendance sessions
  const subjectAttendance = attendance.filter(
    (a) => a.subjectId === subject.id && (periodView === 'summary' || (a.period || 'prelim') === periodView)
  );
  const distinctDates = Array.from(new Set(subjectAttendance.map((a) => a.date))).sort();

  // 3. Row 2: "overall" max score row
  const overallRow: string[] = [
    '-',
    'overall',
    // 10 Attendance columns: 1 for each session slot
    ...Array.from({ length: 10 }).map(() => '1'),
    // 10 Written Works (Quizzes) max scores
    ...Array.from({ length: 10 }).map((_, i) => (wwCols[i] ? String(wwCols[i].maxScore) : '')),
    // 10 Task max scores
    ...Array.from({ length: 10 }).map((_, i) => (taskCols[i] ? String(taskCols[i].maxScore) : '')),
    // 2 Project max scores
    projectCols[0] ? String(projectCols[0].maxScore) : '',
    projectCols[1] ? String(projectCols[1].maxScore) : '',
    // 2 Examination max scores
    writtenExam ? String(writtenExam.maxScore) : '',
    secondaryExam ? String(secondaryExam.maxScore) : '',
  ];

  // 4. Student Rows: Sorted alphabetically by Last Name
  const sortedStudents = [...students].sort((a, b) => compareByLastName(a.name, b.name, 'asc'));

  const studentRows: string[][] = sortedStudents.map((student) => {
    // Attendance 1 to 10
    const attendanceValues: string[] = Array.from({ length: 10 }).map((_, i) => {
      if (distinctDates.length > 0) {
        if (i < distinctDates.length) {
          const d = distinctDates[i];
          const rec = subjectAttendance.find((a) => a.studentId === student.id && a.date === d);
          if (rec) {
            return rec.status === 'absent' ? '0' : '1';
          }
          return '0';
        }
        return '';
      }
      // If no roll call logs recorded in Gradely yet, default to '1' matching initial school template
      return '1';
    });

    // Written Works 1 to 10
    const writtenWorksValues: string[] = Array.from({ length: 10 }).map((_, i) => {
      const ass = wwCols[i];
      if (!ass) return '';
      const sc = scores.find((s) => s.assessmentId === ass.id && s.studentId === student.id);
      return sc !== undefined ? String(sc.score) : '';
    });

    // Task 1 to 10
    const taskValues: string[] = Array.from({ length: 10 }).map((_, i) => {
      const ass = taskCols[i];
      if (!ass) return '';
      const sc = scores.find((s) => s.assessmentId === ass.id && s.studentId === student.id);
      return sc !== undefined ? String(sc.score) : '';
    });

    // Projects
    const projectValues: string[] = [
      (() => {
        const ass = projectCols[0];
        if (!ass) return '';
        const sc = scores.find((s) => s.assessmentId === ass.id && s.studentId === student.id);
        return sc !== undefined ? String(sc.score) : '';
      })(),
      (() => {
        const ass = projectCols[1];
        if (!ass) return '';
        const sc = scores.find((s) => s.assessmentId === ass.id && s.studentId === student.id);
        return sc !== undefined ? String(sc.score) : '';
      })(),
    ];

    // Exams
    const examValues: string[] = [
      (() => {
        if (!writtenExam) return '';
        const sc = scores.find((s) => s.assessmentId === writtenExam.id && s.studentId === student.id);
        return sc !== undefined ? String(sc.score) : '';
      })(),
      (() => {
        if (!secondaryExam) return '';
        const sc = scores.find((s) => s.assessmentId === secondaryExam.id && s.studentId === student.id);
        return sc !== undefined ? String(sc.score) : '';
      })(),
    ];

    return [
      student.studentNumber || '',
      formatLastFirst(student.name),
      ...attendanceValues,
      ...writtenWorksValues,
      ...taskValues,
      ...projectValues,
      ...examValues,
    ];
  });

  // 5. Serialize to CSV lines
  // Header line (unquoted header names matching official template)
  const headerLine = OFFICIAL_SMS_HEADERS.join(',');

  // Function to wrap values in double quotes, escaping any inner quotes
  const quoteRow = (row: string[]): string =>
    row.map((val) => `"${(val ?? '').toString().replace(/"/g, '""')}"`).join(',');

  const csvLines = [
    headerLine,
    quoteRow(overallRow),
    ...studentRows.map(quoteRow),
  ];

  const csvContent = csvLines.join('\r\n');

  // Trigger browser download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const periodLabel = periodView === 'summary' ? 'Official_SMS' : `${periodView.toUpperCase()}_Official_SMS`;
  link.setAttribute(
    'download',
    `${subject.code}_${periodLabel}_Grades_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates and downloads the Collegiate Semestral Summary Report CSV
 * Includes Prelim %, Midterm %, Finals %, Final Grade %, GPA 1.00 - 5.00, and Remarks
 */
export function exportGradebookToSummaryReportCSV(
  subject: Subject,
  students: User[],
  assessments: Assessment[],
  scores: ScoreRecord[],
  attendance: AttendanceRecord[]
) {
  const headers = [
    'Student Number',
    'Student Name',
    'Email',
    'Prelim Grade (30%)',
    'Midterm Grade (30%)',
    'Finals Grade (40%)',
    'Semestral Final Grade %',
    'Grade Equivalent (1.00 - 5.00)',
    'Remarks',
  ];

  const sortedStudents = [...students].sort((a, b) => compareByLastName(a.name, b.name, 'asc'));

  const rows = sortedStudents.map((student) => {
    const perf = calculateStudentSubjectPerformance(
      subject,
      student,
      assessments,
      scores,
      attendance
    );

    return [
      `"${student.studentNumber || ''}"`,
      `"${formatLastFirst(student.name)}"`,
      `"${student.email}"`,
      perf.periods.prelim.grade,
      perf.periods.midterm.grade,
      perf.periods.finals.grade,
      perf.finalGrade,
      perf.gpa.toFixed(2),
      perf.remarks,
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `${subject.code}_Semestral_Summary_Report_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Primary gradebook export handler. Default exports to Official School SMS format.
 */
export function exportGradebookToCSV(
  subject: Subject,
  students: User[],
  assessments: Assessment[],
  scores: ScoreRecord[],
  attendance: AttendanceRecord[],
  periodView: GradingPeriod | 'summary' = 'summary',
  format: 'official_sms' | 'summary_report' = 'official_sms'
) {
  if (format === 'summary_report') {
    return exportGradebookToSummaryReportCSV(subject, students, assessments, scores, attendance);
  }
  return exportGradebookToOfficialSMSCSV(subject, students, assessments, scores, attendance, periodView);
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
    `Gradely_Backup_${new Date().toISOString().slice(0, 10)}.json`
  );
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
