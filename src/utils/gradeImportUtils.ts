import { Subject, MatrixCategory, GradingPeriod, AttendanceStatus } from '../types';
import { parseCSVToRows, formatStudentName } from './csvParser';

export interface DetectedAssessmentColumn {
  colIdx: number;
  colHeader: string;
  title: string;
  maxScore: number;
  categoryId: string;
  parentCategoryId?: string;
  categoryName: string;
  scoresCount: number;
}

export interface DetectedAttendanceColumn {
  colIdx: number;
  colHeader: string;
  sessionNumber: number;
}

export interface ParsedStudentGradeRow {
  studentNumber: string;
  rawName: string;
  displayName: string;
  scores: Record<string, number>; // colHeader -> score
  attendance: Record<number, AttendanceStatus>; // sessionNumber -> status
  totalPresent: number;
  totalAbsent: number;
}

export interface ParsedGradesResult {
  detectedPeriod: GradingPeriod;
  detectedPeriodSource: string;
  headers: string[];
  assessments: DetectedAssessmentColumn[];
  attendanceColumns: DetectedAttendanceColumn[];
  students: ParsedStudentGradeRow[];
  warnings: string[];
}

/**
 * Maps a column header from the official CSV template to the best matching category in the subject's grading matrix
 */
export function resolveMatrixCategoryForImport(
  colHeader: string,
  matrix: MatrixCategory[]
): {
  categoryId: string;
  parentCategoryId?: string;
  categoryName: string;
  suggestedTitle: string;
} {
  const cleanHeader = colHeader.toLowerCase().replace(/_+/g, ' ');

  // 1. Examinations (Checked FIRST so 'Written Examination' is not caught by Written Works)
  if (cleanHeader.includes('examination') || cleanHeader.includes('exam') || cleanHeader.includes('periodical')) {
    const isOral = cleanHeader.includes('oral') || cleanHeader.includes('defense');
    let periodName = 'Prelim';
    if (cleanHeader.includes('midterm')) periodName = 'Midterm';
    if (cleanHeader.includes('final')) periodName = 'Finals';

    const suggestedTitle = isOral
      ? `${periodName} Oral Examination`
      : `${periodName} Written Examination`;

    for (const cat of matrix) {
      if (
        cat.name.toLowerCase().includes('exam') ||
        cat.name.toLowerCase().includes('periodical') ||
        cat.id.toLowerCase().includes('exam')
      ) {
        if (cat.subCategories && cat.subCategories.length > 0) {
          const sub = isOral
            ? (cat.subCategories.find((s) => s.name.toLowerCase().includes('oral')) || cat.subCategories[0])
            : (cat.subCategories.find((s) => s.name.toLowerCase().includes('written') || s.id.toLowerCase().includes('we')) || cat.subCategories[0]);
          return {
            categoryId: sub.id,
            parentCategoryId: cat.id,
            categoryName: `${cat.name} › ${sub.name}`,
            suggestedTitle,
          };
        }
        return {
          categoryId: cat.id,
          categoryName: cat.name,
          suggestedTitle,
        };
      }
    }

    const examCat = matrix.find((c) => c.name.toLowerCase().includes('exam')) || matrix[matrix.length - 1];
    return {
      categoryId: examCat?.subCategories?.[0]?.id || examCat?.id || 'cat-exam',
      parentCategoryId: examCat?.id,
      categoryName: examCat?.name || 'Examination',
      suggestedTitle,
    };
  }

  // 2. Projects & Course-Based Outputs (e.g. Project_Output_1, Project_Requirement_1)
  if (cleanHeader.includes('project') || cleanHeader.includes('output') || cleanHeader.includes('cbo') || cleanHeader.includes('requirement')) {
    const numMatch = colHeader.match(/\d+$/);
    const num = numMatch ? numMatch[0] : '';
    const isRequirement = cleanHeader.includes('requirement') || cleanHeader.includes('ocr');
    const suggestedTitle = isRequirement
      ? (num ? `Project Requirement ${num}` : 'Project Requirement')
      : (num ? `Project Output ${num}` : 'Project Output');

    for (const cat of matrix) {
      if (
        cat.name.toLowerCase().includes('project') ||
        cat.name.toLowerCase().includes('cbo') ||
        cat.id.toLowerCase().includes('cbo')
      ) {
        if (cat.subCategories && cat.subCategories.length > 0) {
          const sub = isRequirement
            ? (cat.subCategories.find((s) => s.name.toLowerCase().includes('requirement') || s.id.toLowerCase().includes('ocr')) || cat.subCategories[0])
            : (cat.subCategories.find((s) => s.name.toLowerCase().includes('output') || s.id.toLowerCase().includes('cbo')) || cat.subCategories[0]);
          return {
            categoryId: sub.id,
            parentCategoryId: cat.id,
            categoryName: `${cat.name} › ${sub.name}`,
            suggestedTitle,
          };
        }
        return {
          categoryId: cat.id,
          categoryName: cat.name,
          suggestedTitle,
        };
      }
    }

    const fallbackCat = matrix.find((c) => c.weight > 20 && !c.name.toLowerCase().includes('exam')) || matrix[0];
    return {
      categoryId: fallbackCat?.subCategories?.[0]?.id || fallbackCat?.id || 'cat-proj',
      parentCategoryId: fallbackCat?.id,
      categoryName: fallbackCat?.name || 'Project',
      suggestedTitle,
    };
  }

  // 3. Performance Tasks / Classwork / Activities (e.g. Class Standing_Task_1)
  if (cleanHeader.includes('task') || cleanHeader.includes('performance') || cleanHeader.includes('pt') || cleanHeader.includes('act')) {
    const numMatch = colHeader.match(/\d+$/);
    const num = numMatch ? numMatch[0] : '';
    const suggestedTitle = num ? `Performance Task ${num}` : 'Performance Task';

    for (const cat of matrix) {
      if (cat.subCategories) {
        const sub = cat.subCategories.find(
          (s) =>
            s.name.toLowerCase().includes('task') ||
            s.name.toLowerCase().includes('performance') ||
            s.name.toLowerCase().includes('act') ||
            s.id.toLowerCase().includes('pt')
        );
        if (sub) {
          return {
            categoryId: sub.id,
            parentCategoryId: cat.id,
            categoryName: `${cat.name} › ${sub.name}`,
            suggestedTitle,
          };
        }
      }
    }

    const parent = matrix.find(
      (c) =>
        c.name.toLowerCase().includes('class standing') ||
        c.name.toLowerCase().includes('task')
    ) || matrix[0];

    return {
      categoryId: parent?.subCategories?.[0]?.id || parent?.id || 'cat-pt',
      parentCategoryId: parent?.id,
      categoryName: parent?.name || 'Class Standing',
      suggestedTitle,
    };
  }

  // 4. Quizzes / Written Works (e.g. Class Standing_Written_Works_2) - only if NOT an exam
  if ((cleanHeader.includes('written') || cleanHeader.includes('quiz') || cleanHeader.includes('ww')) && !cleanHeader.includes('exam')) {
    const numMatch = colHeader.match(/\d+$/);
    const num = numMatch ? numMatch[0] : '';
    const suggestedTitle = num ? `Written Work ${num}` : 'Written Work';

    // Search inside matrix subcategories first
    for (const cat of matrix) {
      if (cat.subCategories) {
        const sub = cat.subCategories.find(
          (s) =>
            s.name.toLowerCase().includes('written') ||
            s.name.toLowerCase().includes('quiz') ||
            s.id.toLowerCase().includes('ww')
        );
        if (sub) {
          return {
            categoryId: sub.id,
            parentCategoryId: cat.id,
            categoryName: `${cat.name} › ${sub.name}`,
            suggestedTitle,
          };
        }
      }
    }

    // Fallback to parent category
    const parent = matrix.find(
      (c) =>
        c.name.toLowerCase().includes('class standing') ||
        c.name.toLowerCase().includes('written')
    ) || matrix[0];

    return {
      categoryId: parent?.subCategories?.[0]?.id || parent?.id || 'cat-ww',
      parentCategoryId: parent?.id,
      categoryName: parent?.name || 'Class Standing',
      suggestedTitle,
    };
  }

  // Generic fallback
  const firstCat = matrix[0];
  return {
    categoryId: firstCat?.subCategories?.[0]?.id || firstCat?.id || 'cat-default',
    parentCategoryId: firstCat?.id,
    categoryName: firstCat?.name || 'General Assessment',
    suggestedTitle: colHeader.replace(/_/g, ' '),
  };
}

/**
 * Parses official school grade CSV files (such as 36-column SMS prelim/midterm/finals grade sheets)
 */
export function parseOfficialGradesCSV(
  csvContent: string,
  subject: Subject,
  periodFallback: GradingPeriod = 'prelim'
): ParsedGradesResult {
  const rows = parseCSVToRows(csvContent);
  const warnings: string[] = [];

  if (rows.length < 2) {
    return {
      detectedPeriod: periodFallback,
      detectedPeriodSource: 'Default selection (file too short)',
      headers: [],
      assessments: [],
      attendanceColumns: [],
      students: [],
      warnings: ['CSV file is empty or missing headers.'],
    };
  }

  const headers = rows[0].map((h) => h.trim());

  // 1. Detect Grading Period from column headers
  let detectedPeriod: GradingPeriod = periodFallback;
  let detectedPeriodSource = `Default period (${periodFallback})`;

  const joinedHeaders = headers.join(' ').toLowerCase();
  if (joinedHeaders.includes('prelim')) {
    detectedPeriod = 'prelim';
    detectedPeriodSource = 'Detected "Prelim" in examination headers';
  } else if (joinedHeaders.includes('midterm')) {
    detectedPeriod = 'midterm';
    detectedPeriodSource = 'Detected "Midterm" in examination headers';
  } else if (joinedHeaders.includes('final')) {
    detectedPeriod = 'finals';
    detectedPeriodSource = 'Detected "Final" in examination headers';
  }

  // 2. Identify Overall / Max Score Row (usually row 1, index 1)
  let overallRow: string[] | null = null;
  let dataStartIndex = 1;

  if (rows.length > 1) {
    const candidateRow = rows[1];
    const firstCell = (candidateRow[0] || '').trim().toLowerCase();
    const secondCell = (candidateRow[1] || '').trim().toLowerCase();

    if (
      firstCell === '-' ||
      firstCell === 'overall' ||
      firstCell === 'max' ||
      secondCell === 'overall' ||
      secondCell === 'total' ||
      secondCell === 'max'
    ) {
      overallRow = candidateRow;
      dataStartIndex = 2;
    }
  }

  // 3. Identify ID and Name column indices
  let idIndex = headers.findIndex((h) =>
    /^(student_id|student_number|student_no|id_number|id_no|id|stud_id)$/i.test(h.trim())
  );
  if (idIndex === -1) idIndex = 0;

  let nameIndex = headers.findIndex(
    (h, idx) => idx !== idIndex && /^(student_name|student name|fullname|full_name|name|student)$/i.test(h.trim())
  );
  if (nameIndex === -1) nameIndex = 1;

  // 4. Detect Attendance and Assessment Columns
  const attendanceColumns: DetectedAttendanceColumn[] = [];
  const assessmentCandidates: Array<{
    colIdx: number;
    colHeader: string;
    maxScore: number;
  }> = [];

  for (let c = 0; c < headers.length; c++) {
    if (c === idIndex || c === nameIndex) continue;
    const header = headers[c];
    if (!header) continue;

    if (/attendance|att_/i.test(header)) {
      const matchNum = header.match(/\d+/g);
      const sessionNumber = matchNum ? parseInt(matchNum[matchNum.length - 1], 10) : attendanceColumns.length + 1;
      attendanceColumns.push({
        colIdx: c,
        colHeader: header,
        sessionNumber,
      });
      continue;
    }

    // Determine max score for this column
    let maxScore = 0;
    if (overallRow && overallRow[c] !== undefined && overallRow[c] !== '') {
      maxScore = parseFloat(overallRow[c]) || 0;
    }

    // If maxScore is > 0, or if overall row is absent, scan student rows to find scores
    if (maxScore > 0) {
      assessmentCandidates.push({ colIdx: c, colHeader: header, maxScore });
    } else {
      // Some official exports write 0/blank in the summary row even though
      // students have values in the assessment column. Keep those columns by
      // deriving a fallback maximum from the student rows instead of silently
      // dropping the entire assessment.
      let highest = 0;
      let hasData = false;
      for (let r = dataStartIndex; r < rows.length; r++) {
        const val = parseFloat(rows[r][c]);
        if (!isNaN(val) && val > 0) {
          hasData = true;
          if (val > highest) highest = val;
        }
      }
      if (hasData) {
        assessmentCandidates.push({
          colIdx: c,
          colHeader: header,
          maxScore: highest > 0 ? highest : 100,
        });
        if (overallRow) {
          warnings.push(`Assessment "${header}" had no max score in the summary row; max score was inferred from student values.`);
        }
      }
    }
  }

  // 5. Build Assessments with mapped categories
  const assessments: DetectedAssessmentColumn[] = assessmentCandidates.map((cand) => {
    const mapping = resolveMatrixCategoryForImport(cand.colHeader, subject.matrix || []);
    return {
      colIdx: cand.colIdx,
      colHeader: cand.colHeader,
      title: mapping.suggestedTitle,
      maxScore: cand.maxScore,
      categoryId: mapping.categoryId,
      parentCategoryId: mapping.parentCategoryId,
      categoryName: mapping.categoryName,
      scoresCount: 0,
    };
  });

  // 6. Parse Student Rows
  const students: ParsedStudentGradeRow[] = [];

  for (let r = dataStartIndex; r < rows.length; r++) {
    const row = rows[r];
    const rawId = (row[idIndex] || '').trim();
    const rawName = (row[nameIndex] || '').trim();

    if (!rawId && !rawName) continue;
    if (rawId === '-' || rawId.toLowerCase() === 'overall' || rawName.toLowerCase() === 'overall') continue;

    const { displayName } = formatStudentName(rawName || `Student ${rawId}`);
    const scores: Record<string, number> = {};
    const attendance: Record<number, AttendanceStatus> = {};
    let totalPresent = 0;
    let totalAbsent = 0;

    // Parse scores for each detected assessment
    assessments.forEach((ass) => {
      const cellVal = (row[ass.colIdx] || '').trim();
      if (cellVal !== '' && !isNaN(Number(cellVal))) {
        const numVal = parseFloat(cellVal);
        scores[ass.colHeader] = numVal;
        ass.scoresCount++;
      }
    });

    // Parse attendance for each session
    attendanceColumns.forEach((att) => {
      const cellVal = (row[att.colIdx] || '').trim();
      if (cellVal === '1' || /present|p/i.test(cellVal)) {
        attendance[att.sessionNumber] = 'present';
        totalPresent++;
      } else if (cellVal === '0' || /absent|a/i.test(cellVal)) {
        attendance[att.sessionNumber] = 'absent';
        totalAbsent++;
      }
    });

    students.push({
      studentNumber: rawId,
      rawName,
      displayName,
      scores,
      attendance,
      totalPresent,
      totalAbsent,
    });
  }

  return {
    detectedPeriod,
    detectedPeriodSource,
    headers,
    assessments,
    attendanceColumns,
    students,
    warnings,
  };
}

/**
 * Generates dates for attendance sessions
 * Defaults to starting on `startDate` (or '2026-06-01') and advancing by class days (e.g. MWF or weekly)
 */
export function generateAttendanceSessionDates(
  count: number,
  startDateStr = '2026-06-01'
): string[] {
  const dates: string[] = [];
  let curr = new Date(startDateStr);
  if (isNaN(curr.getTime())) {
    curr = new Date('2026-06-01');
  }

  while (dates.length < count) {
    const day = curr.getDay(); // 0 = Sun, 6 = Sat
    if (day !== 0 && day !== 6) {
      // Valid weekday
      const yyyy = curr.getFullYear();
      const mm = String(curr.getMonth() + 1).padStart(2, '0');
      const dd = String(curr.getDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
    }
    // Advance by 2 or 3 days to simulate class schedule (e.g. Mon, Wed, Fri)
    curr.setDate(curr.getDate() + (day === 5 ? 3 : 2));
  }

  return dates;
}
