export interface ParsedStudentRow {
  studentNumber: string;
  name: string;
  originalName: string;
  email: string;
  sectionId: string;
  attendanceCount: number;
  scoresCount: number;
  rawRecord: Record<string, string>;
}

export interface ParseMasterlistResult {
  students: ParsedStudentRow[];
  headers: string[];
  totalRows: number;
  attendanceColumns: string[];
  writtenWorksColumns: string[];
  taskColumns: string[];
  projectColumns: string[];
  examColumns: string[];
  warnings: string[];
}

/**
 * Standard RFC 4180 compliant CSV line parser supporting quoted cells with commas
 */
export function parseCSVToRows(text: string): string[][] {
  const clean = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!clean) return [];

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const nextChar = clean[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentCell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if (char === '\n' && !inQuotes) {
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Converts "Lastname, Firstname Middlename" or "Firstname Lastname" to standard display name
 */
export function formatStudentName(rawName: string): { displayName: string; emailHandle: string } {
  let clean = rawName.trim().replace(/^"|"$/g, '');

  if (clean.includes(',')) {
    const parts = clean.split(',').map((p) => p.trim());
    const lastName = parts[0] || '';
    const firstMiddle = parts[1] || '';
    const displayName = `${firstMiddle} ${lastName}`.trim();
    const emailFirst = firstMiddle.split(' ')[0] || 'student';
    const emailHandle = `${emailFirst.toLowerCase().replace(/[^a-z0-9]/g, '')}.${lastName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    return { displayName, emailHandle };
  }

  const parts = clean.split(' ').filter(Boolean);
  const firstName = parts[0] || 'student';
  const lastName = parts[parts.length - 1] || 'user';
  const emailHandle = `${firstName.toLowerCase().replace(/[^a-z0-9]/g, '')}.${lastName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  return { displayName: clean, emailHandle };
}

/**
 * Parses a student masterlist CSV text into structured student records and column categories
 */
export function parseStudentMasterlist(csvText: string, targetSectionId: string): ParseMasterlistResult {
  const rows = parseCSVToRows(csvText);
  const warnings: string[] = [];

  if (rows.length < 2) {
    return {
      students: [],
      headers: [],
      totalRows: 0,
      attendanceColumns: [],
      writtenWorksColumns: [],
      taskColumns: [],
      projectColumns: [],
      examColumns: [],
      warnings: ['CSV file is empty or does not contain headers and student records.'],
    };
  }

  const headers = rows[0].map((h) => h.trim());

  // 1. Identify Student ID Column
  let idIndex = headers.findIndex((h) =>
    /^(student_id|student_number|student_no|id_number|id_no|id|stud_id|lrn)$/i.test(h.trim())
  );
  if (idIndex === -1) {
    idIndex = headers.findIndex((h) => /student_id|student_number|id_number|stud_id/i.test(h.trim()));
  }
  if (idIndex === -1) {
    idIndex = headers.findIndex((h) => /id/i.test(h.trim()) && !/name/i.test(h.trim()));
  }
  if (idIndex === -1) {
    idIndex = 0;
  }

  // 2. Identify Student Name Column (must NOT be idIndex)
  let nameIndex = headers.findIndex(
    (h, idx) => idx !== idIndex && /^(student_name|student name|fullname|full_name|name|student|learner_name|learner name)$/i.test(h.trim())
  );
  if (nameIndex === -1) {
    nameIndex = headers.findIndex((h, idx) => idx !== idIndex && /student_name|full_name|fullname|learner_name/i.test(h.trim()));
  }
  if (nameIndex === -1) {
    nameIndex = headers.findIndex((h, idx) => idx !== idIndex && /name/i.test(h.trim()) && !/id|number|no\b/i.test(h.trim()));
  }
  if (nameIndex === -1) {
    nameIndex = idIndex === 0 ? 1 : 0;
  }

  const resolvedIdIndex = idIndex;
  const resolvedNameIndex = nameIndex;

  // Identify special columns
  const attendanceColumns = headers.filter((h) => /attendance|att_/i.test(h));
  const writtenWorksColumns = headers.filter((h) => /written_work|quiz|ww_/i.test(h));
  const taskColumns = headers.filter((h) => /task|performance|pt_/i.test(h));
  const projectColumns = headers.filter((h) => /project|output|requirement/i.test(h));
  const examColumns = headers.filter((h) => /exam|periodical|quarterly/i.test(h));

  const students: ParsedStudentRow[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const rawId = (row[resolvedIdIndex] || '').trim();
    const rawName = (row[resolvedNameIndex] || '').trim();

    // Skip summary / overall rows like "-,overall,1,1..."
    if (
      !rawId ||
      rawId === '-' ||
      rawId.toLowerCase() === 'overall' ||
      rawId.toLowerCase() === 'total' ||
      rawName.toLowerCase() === 'overall' ||
      rawName.toLowerCase() === 'max'
    ) {
      continue;
    }

    const { displayName, emailHandle } = formatStudentName(rawName || `Student ${rawId}`);
    const cleanIdSuffix = rawId.toLowerCase().replace(/[^a-z0-9]/g, '');
    const email = `${emailHandle}${cleanIdSuffix ? `.${cleanIdSuffix}` : `.${r}`}@student.gradely.edu`;

    // Map raw record
    const rawRecord: Record<string, string> = {};
    let attendanceCount = 0;
    let scoresCount = 0;

    headers.forEach((h, idx) => {
      const val = (row[idx] || '').trim();
      rawRecord[h] = val;
      if (attendanceColumns.includes(h) && (val === '1' || /present|p/i.test(val))) {
        attendanceCount++;
      }
      if (
        (writtenWorksColumns.includes(h) ||
          taskColumns.includes(h) ||
          projectColumns.includes(h) ||
          examColumns.includes(h)) &&
        val !== '' &&
        !isNaN(Number(val))
      ) {
        scoresCount++;
      }
    });

    students.push({
      studentNumber: rawId,
      name: displayName,
      originalName: rawName,
      email,
      sectionId: targetSectionId,
      attendanceCount,
      scoresCount,
      rawRecord,
    });
  }

  return {
    students,
    headers,
    totalRows: rows.length - 1,
    attendanceColumns,
    writtenWorksColumns,
    taskColumns,
    projectColumns,
    examColumns,
    warnings,
  };
}

/**
 * Returns sample CSV template text for download
 */
export function generateSampleStudentCSV(): string {
  return `student_id,student_name,Class Standing_Attendance_1,Class Standing_Attendance_2,Class Standing_Attendance_3,Class Standing_Written_Works_1,Class Standing_Task_1,Project_Output_1,Examination_Final_Written_Examination
22120613,"Aguirre, Joshua Pancho",1,1,1,45,48,92,88
22016894,"Arce, Jhon Raze Gasic",1,1,1,40,46,90,85
230117475,"Barredo, Khian Lhei",1,1,1,48,50,95,92
230115607,"Borcena, Rodel",1,1,1,42,44,88,80
250105374,"Borces, Martin Nando",1,1,1,47,49,94,90`;
}
