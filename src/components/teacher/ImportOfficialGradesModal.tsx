import React, { useState, useEffect, useId, useMemo } from 'react';
import { Subject, Section, GradingPeriod, AttendanceStatus, User } from '../../types';
import { NeuModal } from '../common/NeuModal';
import { NeuButton } from '../common/NeuButton';
import { NeuBadge } from '../common/NeuBadge';
import { NeuSelect, NeuInput } from '../common/NeuInput';
import { useData } from '../../context/DataContext';
import {
  parseOfficialGradesCSV,
  generateAttendanceSessionDates,
  ParsedGradesResult,
} from '../../utils/gradeImportUtils';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  Search,
  Sparkles,
  CalendarCheck,
  UserPlus,
  Layers,
} from 'lucide-react';
import { formatLastFirst } from '../../utils/nameUtils';

export const SAMPLE_OFFICIAL_PRELIM_CSV = `student_id,student_name,Class Standing_Attendance_1,Class Standing_Attendance_2,Class Standing_Attendance_3,Class Standing_Attendance_4,Class Standing_Attendance_5,Class Standing_Attendance_6,Class Standing_Attendance_7,Class Standing_Attendance_8,Class Standing_Attendance_9,Class Standing_Attendance_10,Class Standing_Written_Works_1,Class Standing_Written_Works_2,Class Standing_Written_Works_3,Class Standing_Written_Works_4,Class Standing_Written_Works_5,Class Standing_Written_Works_6,Class Standing_Written_Works_7,Class Standing_Written_Works_8,Class Standing_Written_Works_9,Class Standing_Written_Works_10,Class Standing_Task_1,Class Standing_Task_2,Class Standing_Task_3,Class Standing_Task_4,Class Standing_Task_5,Class Standing_Task_6,Class Standing_Task_7,Class Standing_Task_8,Class Standing_Task_9,Class Standing_Task_10,Project_Output_1,Project_Requirement_1,Examination_Prelim_Written_Examination,Examination_Prelim_Oral_Examination
-,overall,1,1,1,1,1,1,1,1,1,1,0,25,0,0,0,0,0,0,0,0,100,0,100,0,0,0,0,0,0,0,100,0,50,0
250102531,"Abayon, Shawn Daniel",1,1,0,0,0,0,0,1,1,1,,14,,,,,,,,,100,,0,,,,,,,,95,,37,
250103247,"Ajoc, Mark Gabriel",1,1,1,1,1,1,1,1,1,1,,12,,,,,,,,,100,,100,,,,,,,,95,,50,
230103059,"Algodon, Mark Ryan",1,0,0,1,0,0,0,0,1,1,,0,,,,,,,,,0,,0,,,,,,,,,,19,
250103294,"Arbis, Jury",1,1,1,1,1,1,0,1,1,1,,12,,,,,,,,,100,,100,,,,,,,,85,,27,
250104565,"Babaran, John Carlo",1,1,0,1,0,1,0,1,1,1,,8,,,,,,,,,90,,0,,,,,,,,95,,38,
250104888,"BaÑares, Kassirine Bryce",1,1,1,1,0,1,0,1,1,1,,13,,,,,,,,,100,,100,,,,,,,,100,,38,
250100562,"Banay, John Riel",1,1,1,1,0,1,0,1,1,1,,17,,,,,,,,,100,,100,,,,,,,,100,,48,
250102999,"Belleza, Jaysel",1,1,1,1,1,1,1,1,1,1,,20,,,,,,,,,100,,100,,,,,,,,90,,50,
250100664,"Belmi, Xena Lewis",1,1,0,1,1,1,1,1,1,1,,22,,,,,,,,,100,,100,,,,,,,,100,,50,
250100870,"Benitez, John Lloyd",1,1,1,1,0,1,0,1,1,1,,18,,,,,,,,,100,,0,,,,,,,,100,,38,
240113774,"Beraya, Clark Anthony",1,1,1,1,1,1,1,1,1,1,,14,,,,,,,,,100,,100,,,,,,,,100,,50,
250103154,"Brizuela, Jayson",1,1,1,1,1,1,1,1,1,1,,25,,,,,,,,,100,,100,,,,,,,,100,,50,
250101587,"Burgonio, Emie Rose",1,1,1,1,0,1,1,1,1,1,,14,,,,,,,,,100,,100,,,,,,,,90,,46,
250100494,"Butal, Seanb",1,1,1,1,1,1,0,1,1,1,,15,,,,,,,,,95,,100,,,,,,,,100,,28,
250100091,"Cainoy, Ma Grace",1,1,1,1,1,1,1,1,1,1,,17,,,,,,,,,100,,100,,,,,,,,90,,50,
250104499,"Calixtro, Majelyn",1,1,1,1,0,0,0,1,1,1,,22,,,,,,,,,90,,0,,,,,,,,100,,33,
250102912,"Cardaño, Catherine",1,1,1,1,1,1,1,1,1,1,,16,,,,,,,,,100,,0,,,,,,,,90,,50,
250100419,"CariÑo, Michael Vincent",1,1,1,1,1,1,1,1,1,1,,14,,,,,,,,,100,,100,,,,,,,,100,,50,
250103177,"Fabro, John Zedric",1,1,0,1,0,1,0,1,1,1,,10,,,,,,,,,100,,100,,,,,,,,90,,29,
250100014,"Gabuay, Rubylen Mae",1,1,0,0,1,0,1,1,1,1,,19,,,,,,,,,100,,100,,,,,,,,85,,44,
250103201,"Gines, Frinze James",1,1,1,1,1,1,1,1,1,1,,19,,,,,,,,,100,,100,,,,,,,,90,,50,
250106070,"Hajie Rakim, Fatak",1,1,1,1,1,1,0,1,1,1,,25,,,,,,,,,100,,100,,,,,,,,100,,47,
250102824,"Hisona, Adam Von",1,1,1,1,0,1,1,1,1,1,,21,,,,,,,,,100,,100,,,,,,,,85,,39,
250102925,"Huab, Gunther",1,1,1,1,1,1,1,1,1,1,,19,,,,,,,,,100,,100,,,,,,,,100,,50,
250100325,"Ibañez, Denver",1,1,1,1,1,1,0,1,1,1,,11,,,,,,,,,100,,100,,,,,,,,100,,32,
250100324,"Ibañez, Dranreb",1,1,1,1,1,1,0,1,1,1,,10,,,,,,,,,100,,100,,,,,,,,100,,32,
250106266,"Lancero, Janelle Faye",1,1,1,1,0,1,1,1,1,1,,13,,,,,,,,,100,,100,,,,,,,,85,,35,
250103241,"Landoy, Kathleen Joy",1,1,1,1,1,1,1,1,1,1,,6,,,,,,,,,100,,100,,,,,,,,100,,50,
240102931,"Lastimoso, Silvino",1,1,1,1,1,1,1,1,1,1,,24,,,,,,,,,100,,100,,,,,,,,100,,50,
250101467,"Lloren, Mark Jenrix",1,1,1,1,1,1,1,1,1,1,,12,,,,,,,,,100,,100,,,,,,,,90,,50,
250103429,"Lucero, Princess Yhamine",1,1,0,1,1,1,0,1,1,1,,12,,,,,,,,,100,,100,,,,,,,,100,,27,
250100759,"Macalalag, Ariez King",1,1,1,1,1,1,1,1,1,1,,20,,,,,,,,,90,,100,,,,,,,,100,,50,
250103336,"Maglente, Jastine",1,1,1,1,1,1,1,1,1,1,,15,,,,,,,,,100,,100,,,,,,,,100,,50,
250103164,"Mangaoang, John Michael",1,1,0,1,0,0,0,1,1,1,,13,,,,,,,,,90,,0,,,,,,,,100,,40,
240110919,"Maravilla, Mark Anthony",1,1,1,1,0,0,0,0,1,1,,0,,,,,,,,,100,,0,,,,,,,,,,40,
250104884,"Marco, John Bernard",1,1,0,1,1,1,0,1,1,1,,16,,,,,,,,,95,,100,,,,,,,,100,,43,
250102986,"Mascosa, Elaiza May",1,1,1,1,0,1,1,1,1,1,,20,,,,,,,,,100,,100,,,,,,,,85,,40,
250103013,"Mayam, Jen-jen",1,1,1,1,1,1,1,1,1,1,,21,,,,,,,,,95,,100,,,,,,,,85,,50,
250100760,"Moreno, Richard",1,1,1,1,1,1,1,1,1,1,,20,,,,,,,,,100,,100,,,,,,,,100,,50,
230116991,"Navarro, Hunwell John",1,1,1,1,1,1,1,1,1,1,,15,,,,,,,,,100,,100,,,,,,,,100,,50,
250101586,"Nicolas, Sofia Leigh",1,1,1,1,1,1,1,1,1,1,,12,,,,,,,,,100,,100,,,,,,,,90,,50,
250101446,"Ocon, Carl Andrew",1,1,1,1,1,1,1,1,1,1,,18,,,,,,,,,100,,100,,,,,,,,90,,50,
230103533,"Orizal, Darylle Jay",0,0,0,0,0,0,0,0,0,0,,0,,,,,,,,,0,,0,,,,,,,,,,0,
250104074,"Palma, Dan Eduard",1,1,1,1,1,1,1,1,1,1,,19,,,,,,,,,100,,100,,,,,,,,100,,50,
250105637,"Panganiban, Reymund",0,0,0,0,0,0,0,0,1,1,,0,,,,,,,,,100,,0,,,,,,,,,,15,
250106005,"Ramos, Raffy",1,1,1,1,1,1,1,1,1,1,,21,,,,,,,,,100,,100,,,,,,,,100,,50,
250103286,"Romanca, Jake Kent",1,1,1,1,1,1,0,1,1,1,,25,,,,,,,,,100,,100,,,,,,,,100,,50,
250100493,"Rosatase, Christian",1,1,0,1,1,1,0,1,1,1,,25,,,,,,,,,100,,100,,,,,,,,100,,48,
250103160,"Salvador, Jahna Honey Kim",1,1,0,1,0,1,1,1,1,1,,21,,,,,,,,,100,,100,,,,,,,,90,,31,
250103108,"Superal, Tricia Mae",1,1,1,1,1,1,1,1,1,1,,15,,,,,,,,,100,,100,,,,,,,,95,,50,
250103383,"Tercenio, Billy Jhon",1,1,1,1,0,0,1,1,1,1,,17,,,,,,,,,100,,0,,,,,,,,100,,36,
250100188,"Tolledo, Jerwin",1,1,1,1,1,1,1,1,1,1,,15,,,,,,,,,100,,100,,,,,,,,85,,50,
250101714,"Velasco, Airizthea Nicole",1,1,0,1,0,1,0,0,1,1,,0,,,,,,,,,100,,100,,,,,,,,95,,24,`;

interface ImportOfficialGradesModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
  sections: Section[];
  selectedSubjectId?: string;
  selectedSectionId?: string;
  activePeriod?: GradingPeriod;
  onShowToast: (title: string, message?: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export const ImportOfficialGradesModal: React.FC<ImportOfficialGradesModalProps> = ({
  isOpen,
  onClose,
  subjects,
  sections,
  selectedSubjectId,
  selectedSectionId,
  activePeriod = 'prelim',
  onShowToast,
}) => {
  const fileInputId = useId();
  const { students: allStudents, importOfficialGrades } = useData();

  // Selection states
  const [targetSectionId, setTargetSectionId] = useState<string>('');
  const [targetSubjectId, setTargetSubjectId] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<GradingPeriod>(activePeriod);

  // Tab & Input states
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('paste');
  const [csvText, setCsvText] = useState<string>('');
  const [parsedResult, setParsedResult] = useState<ParsedGradesResult | null>(null);

  // Configuration toggles
  const [importAttendance, setImportAttendance] = useState<boolean>(true);
  const [attendanceStartDate, setAttendanceStartDate] = useState<string>('2026-06-01');
  const [autoEnrollMissingStudents, setAutoEnrollMissingStudents] = useState<boolean>(true);
  const [previewFilter, setPreviewFilter] = useState<string>('');
  const [isImporting, setIsImporting] = useState<boolean>(false);

  // Custom Category Mappings (colHeader -> categoryId)
  const [customMappings, setCustomMappings] = useState<Record<string, { categoryId: string; parentCategoryId?: string }>>({});

  // Sync initial target section and subject
  useEffect(() => {
    if (isOpen) {
      const initialSec = selectedSectionId || sections[0]?.id || '';
      setTargetSectionId(initialSec);

      const sectionSubjs = subjects.filter((s) => s.sectionId === initialSec);
      const initialSubj = selectedSubjectId && sectionSubjs.some((s) => s.id === selectedSubjectId)
        ? selectedSubjectId
        : sectionSubjs[0]?.id || subjects[0]?.id || '';
      setTargetSubjectId(initialSubj);
      setSelectedPeriod(activePeriod);

      if (csvText) {
        handleReparse(csvText, initialSubj, activePeriod);
      }
    }
  }, [isOpen, selectedSectionId, selectedSubjectId, activePeriod]);

  // Target Subject Object
  const currentSubject = subjects.find((s) => s.id === targetSubjectId) || subjects[0];
  const targetSection = sections.find((s) => s.id === targetSectionId) || sections[0];

  const handleReparse = (text: string, subjId: string, periodFallback: GradingPeriod) => {
    setCsvText(text);
    if (!text.trim()) {
      setParsedResult(null);
      return;
    }
    const subj = subjects.find((s) => s.id === subjId) || subjects[0];
    if (!subj) return;

    const res = parseOfficialGradesCSV(text, subj, periodFallback);
    setParsedResult(res);
    setSelectedPeriod(res.detectedPeriod);

    // Initialize custom mappings from parsed result
    const initialMap: Record<string, { categoryId: string; parentCategoryId?: string }> = {};
    res.assessments.forEach((ass) => {
      initialMap[ass.colHeader] = {
        categoryId: ass.categoryId,
        parentCategoryId: ass.parentCategoryId,
      };
    });
    setCustomMappings(initialMap);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        handleReparse(content, targetSubjectId, selectedPeriod);
      }
    };
    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    setActiveTab('paste');
    handleReparse(SAMPLE_OFFICIAL_PRELIM_CSV, targetSubjectId, selectedPeriod);
    onShowToast('Official Prelim CSV Loaded', '53 student grade records loaded for review.', 'info');
  };

  // Build matrix category options for category dropdowns
  const categoryOptions = useMemo(() => {
    if (!currentSubject || !currentSubject.matrix) return [];
    const opts: { value: string; label: string; parentId?: string }[] = [];

    currentSubject.matrix.forEach((cat) => {
      if (cat.subCategories && cat.subCategories.length > 0) {
        cat.subCategories.forEach((sub) => {
          opts.push({
            value: sub.id,
            label: `${cat.name} › ${sub.name} (${sub.weight}%)`,
            parentId: cat.id,
          });
        });
      } else {
        opts.push({
          value: cat.id,
          label: `${cat.name} (${cat.weight}%)`,
          parentId: undefined,
        });
      }
    });
    return opts;
  }, [currentSubject]);

  // Match students against existing enrolled roster
  const studentMatchAnalysis = useMemo(() => {
    if (!parsedResult) return { matched: [], unmatched: [], matchRate: 0 };

    const matched: Array<{ csvRow: any; student: User }> = [];
    const unmatched: any[] = [];

    parsedResult.students.forEach((row) => {
      const cleanNum = row.studentNumber.trim();
      const existing = allStudents.find((s) => {
        if (cleanNum && s.studentNumber && s.studentNumber.trim() === cleanNum) return true;
        if (formatLastFirst(s.name).toLowerCase() === row.rawName.toLowerCase()) return true;
        if (s.name.toLowerCase() === row.displayName.toLowerCase()) return true;
        return false;
      });

      if (existing) {
        matched.push({ csvRow: row, student: existing });
      } else {
        unmatched.push(row);
      }
    });

    const matchRate = parsedResult.students.length > 0
      ? Math.round((matched.length / parsedResult.students.length) * 100)
      : 0;

    return { matched, unmatched, matchRate };
  }, [parsedResult, allStudents]);

  // Filtered student preview rows
  const filteredPreviewStudents = useMemo(() => {
    if (!parsedResult) return [];
    if (!previewFilter.trim()) return parsedResult.students;
    const q = previewFilter.toLowerCase().trim();
    return parsedResult.students.filter(
      (s) =>
        s.studentNumber.toLowerCase().includes(q) ||
        s.rawName.toLowerCase().includes(q) ||
        s.displayName.toLowerCase().includes(q)
    );
  }, [parsedResult, previewFilter]);

  // Calculate total scores to import
  const totalScoresCount = useMemo(() => {
    if (!parsedResult) return 0;
    return parsedResult.assessments.reduce((acc, a) => acc + a.scoresCount, 0);
  }, [parsedResult]);

  const handleImportNow = async () => {
    if (!parsedResult || !currentSubject || !targetSection) return;

    setIsImporting(true);
    try {
      // 1. Prepare Assessments
      const assessmentsPayload = parsedResult.assessments.map((ass) => {
        const mapping = customMappings[ass.colHeader] || {
          categoryId: ass.categoryId,
          parentCategoryId: ass.parentCategoryId,
        };
        return {
          colHeader: ass.colHeader,
          title: ass.title,
          maxScore: ass.maxScore,
          categoryId: mapping.categoryId,
          parentCategoryId: mapping.parentCategoryId,
        };
      });

      // 2. Prepare Scores
      const scoresPayload: Array<{
        colHeader: string;
        studentNumber: string;
        score: number;
      }> = [];

      parsedResult.students.forEach((st) => {
        Object.entries(st.scores).forEach(([colHeader, scoreVal]) => {
          scoresPayload.push({
            colHeader,
            studentNumber: st.studentNumber,
            score: scoreVal,
          });
        });
      });

      // 3. Prepare Attendance (if enabled)
      let attendancePayload: Array<{
        sessionIndex: number;
        studentNumber: string;
        date: string;
        status: AttendanceStatus;
      }> | undefined;

      if (importAttendance && parsedResult.attendanceColumns.length > 0) {
        const sessionDates = generateAttendanceSessionDates(
          parsedResult.attendanceColumns.length,
          attendanceStartDate
        );

        attendancePayload = [];
        parsedResult.students.forEach((st) => {
          parsedResult.attendanceColumns.forEach((attCol, idx) => {
            const status = st.attendance[attCol.sessionNumber] || 'absent';
            const sessionDate = sessionDates[idx] || `2026-06-${String(idx + 1).padStart(2, '0')}`;
            attendancePayload!.push({
              sessionIndex: attCol.sessionNumber,
              studentNumber: st.studentNumber,
              date: sessionDate,
              status,
            });
          });
        });
      }

      // 4. Prepare Students to Enroll (if autoEnroll is enabled)
      const studentsToEnroll = autoEnrollMissingStudents
        ? studentMatchAnalysis.unmatched.map((st) => ({
            studentNumber: st.studentNumber,
            name: st.rawName,
          }))
        : [];

      // 5. Execute import
      const summary = await importOfficialGrades({
        subjectId: currentSubject.id,
        sectionId: targetSection.id,
        period: selectedPeriod,
        assessments: assessmentsPayload,
        scores: scoresPayload,
        attendance: attendancePayload,
        studentsToEnroll,
      });

      onShowToast(
        'Grades Imported Successfully',
        `Imported ${summary.scoresCount} scores across ${summary.assessmentsCount} assessments for ${currentSubject.code}. ${
          summary.attendanceCount > 0 ? `Plus ${summary.attendanceCount} attendance logs.` : ''
        }`,
        'success'
      );

      onClose();
    } catch (err: any) {
      console.error('Grade import error:', err);
      onShowToast('Import Failed', err.message || 'An error occurred during grade import.', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <NeuModal
      isOpen={isOpen}
      onClose={onClose}
      title="Import Official Grades (CSV)"
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Course, Section & Period Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
          <div>
            <NeuSelect
              label="Target Section"
              value={targetSectionId}
              options={sections.map((s) => ({ value: s.id, label: `${s.name} (${s.gradeLevelOrYear})` }))}
              onChange={(e) => {
                setTargetSectionId(e.target.value);
                const subjs = subjects.filter((s) => s.sectionId === e.target.value);
                if (subjs[0]) setTargetSubjectId(subjs[0].id);
              }}
            />
          </div>

          <div>
            <NeuSelect
              label="Target Course / Subject"
              value={targetSubjectId}
              options={subjects
                .filter((s) => !targetSectionId || s.sectionId === targetSectionId)
                .map((s) => ({ value: s.id, label: `${s.code} - ${s.name}` }))}
              onChange={(e) => {
                setTargetSubjectId(e.target.value);
                if (csvText) handleReparse(csvText, e.target.value, selectedPeriod);
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Grading Period
            </label>
            <div className="grid grid-cols-3 gap-1 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
              {(['prelim', 'midterm', 'finals'] as GradingPeriod[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSelectedPeriod(p)}
                  className={`py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                    selectedPeriod === p
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Input Mode Tabs */}
        <div>
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('paste')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'paste'
                    ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Paste CSV Data</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'upload'
                    ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload .CSV File</span>
              </button>
            </div>

            <NeuButton
              variant="secondary"
              size="sm"
              onClick={handleLoadSample}
              leftIcon={<Sparkles className="w-3.5 h-3.5 text-amber-500" />}
              className="text-xs"
            >
              Load Official Prelim Data
            </NeuButton>
          </div>

          {activeTab === 'upload' ? (
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors bg-white dark:bg-[#0b1329]">
              <input
                id={fileInputId}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label htmlFor={fileInputId} className="cursor-pointer space-y-2 block">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Click to select official grades CSV file
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Supports the official 36-column school SMS format with row 2 max score definitions
                </p>
              </label>
            </div>
          ) : (
            <div>
              <textarea
                value={csvText}
                onChange={(e) => handleReparse(e.target.value, targetSubjectId, selectedPeriod)}
                placeholder="Paste the official school SMS CSV content here (starting with student_id,student_name...)"
                rows={6}
                className="w-full text-xs font-mono p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-200 resize-y"
              />
            </div>
          )}
        </div>

        {/* Parsed Result Display */}
        {parsedResult && (
          <div className="space-y-4 animate-fade-in">
            {/* Quick Metrics Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900">
                <div className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Students Detected
                </div>
                <div className="text-xl font-bold text-indigo-950 dark:text-indigo-100 mt-0.5">
                  {parsedResult.students.length}
                </div>
                <div className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-0.5">
                  {studentMatchAnalysis.matched.length} matched ({studentMatchAnalysis.matchRate}%)
                </div>
              </div>

              <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-xl border border-emerald-100 dark:border-emerald-900">
                <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Assessments
                </div>
                <div className="text-xl font-bold text-emerald-950 dark:text-emerald-100 mt-0.5">
                  {parsedResult.assessments.length}
                </div>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                  {totalScoresCount} total grade scores
                </div>
              </div>

              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/40 rounded-xl border border-amber-100 dark:border-amber-900">
                <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  Attendance Logs
                </div>
                <div className="text-xl font-bold text-amber-950 dark:text-amber-100 mt-0.5">
                  {parsedResult.attendanceColumns.length} Sessions
                </div>
                <div className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                  {parsedResult.students.length * parsedResult.attendanceColumns.length} records
                </div>
              </div>

              <div className="p-3 bg-purple-50/70 dark:bg-purple-950/40 rounded-xl border border-purple-100 dark:border-purple-900">
                <div className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                  Target Period
                </div>
                <div className="text-xl font-bold text-purple-950 dark:text-purple-100 mt-0.5 capitalize">
                  {selectedPeriod}
                </div>
                <div className="text-[10px] text-purple-700 dark:text-purple-300 mt-0.5 truncate" title={parsedResult.detectedPeriodSource}>
                  {parsedResult.detectedPeriodSource}
                </div>
              </div>
            </div>

            {/* Assessment Mapping Configuration */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>Detected Assessments & Matrix Mapping</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Review and adjust which grading category each assessment column is mapped into.
                  </p>
                </div>
                <NeuBadge variant="primary" size="sm">
                  {currentSubject.code}
                </NeuBadge>
              </div>

              <div className="space-y-2">
                {parsedResult.assessments.map((ass) => {
                  const currentCategory = customMappings[ass.colHeader]?.categoryId || ass.categoryId;
                  return (
                    <div
                      key={ass.colHeader}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                    >
                      <div className="min-w-44">
                        <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{ass.title}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                            Max: {ass.maxScore}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5 truncate" title={ass.colHeader}>
                          {ass.colHeader}
                        </div>
                      </div>

                      <div className="flex-1 w-full md:w-auto">
                        <select
                          value={currentCategory}
                          onChange={(e) => {
                            const selectedOpt = categoryOptions.find((o) => o.value === e.target.value);
                            setCustomMappings((prev) => ({
                              ...prev,
                              [ass.colHeader]: {
                                categoryId: e.target.value,
                                parentCategoryId: selectedOpt?.parentId,
                              },
                            }));
                          }}
                          className="w-full text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium"
                        >
                          {categoryOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="text-right text-xs text-slate-500 whitespace-nowrap self-end md:self-auto">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{ass.scoresCount}</span> scores recorded
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Attendance & Enrollment Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Attendance Options */}
              <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="import-att-checkbox"
                    checked={importAttendance}
                    onChange={(e) => setImportAttendance(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <label htmlFor="import-att-checkbox" className="text-xs font-bold text-slate-900 dark:text-white cursor-pointer flex items-center gap-1.5">
                    <CalendarCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Import {parsedResult.attendanceColumns.length} Attendance Sessions</span>
                  </label>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-6">
                  Saves 10 session logs to the Attendance Roll Call tracker so students receive attendance percentages.
                </p>
                {importAttendance && (
                  <div className="pl-6 pt-1">
                    <NeuInput
                      label="Session 1 Starting Date"
                      type="date"
                      value={attendanceStartDate}
                      onChange={(e) => setAttendanceStartDate(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Roster Enrollment Options */}
              <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="auto-enroll-checkbox"
                    checked={autoEnrollMissingStudents}
                    onChange={(e) => setAutoEnrollMissingStudents(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <label htmlFor="auto-enroll-checkbox" className="text-xs font-bold text-slate-900 dark:text-white cursor-pointer flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Auto-Enroll Unmatched Students ({studentMatchAnalysis.unmatched.length})</span>
                  </label>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-6">
                  Automatically enrolls missing student numbers from the CSV into <strong>{targetSection?.name}</strong> so no grades are left unassigned.
                </p>
              </div>
            </div>

            {/* Interactive Preview Table */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Preview Student Grade Roster
                  </h3>
                  <p className="text-xs text-slate-500">
                    Showing {filteredPreviewStudents.length} of {parsedResult.students.length} students
                  </p>
                </div>
                <div className="w-full sm:w-60">
                  <NeuInput
                    placeholder="Search student in preview..."
                    value={previewFilter}
                    onChange={(e) => setPreviewFilter(e.target.value)}
                    leftIcon={<Search className="w-3.5 h-3.5 text-slate-400" />}
                  />
                </div>
              </div>

              <div className="max-h-64 overflow-auto rounded-xl border border-slate-200/80 dark:border-slate-800">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 sticky top-0 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-2.5">Student ID</th>
                      <th className="p-2.5">Name</th>
                      <th className="p-2.5 text-center">Status</th>
                      {parsedResult.assessments.map((ass) => (
                        <th key={ass.colHeader} className="p-2.5 text-center whitespace-nowrap">
                          {ass.title}
                          <span className="block text-[9.5px] font-normal text-slate-400">/{ass.maxScore}</span>
                        </th>
                      ))}
                      <th className="p-2.5 text-center">Attendance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {filteredPreviewStudents.map((st) => {
                      const isExisting = allStudents.some(
                        (s) =>
                          (s.studentNumber && s.studentNumber.trim() === st.studentNumber.trim()) ||
                          formatLastFirst(s.name).toLowerCase() === st.rawName.toLowerCase()
                      );

                      return (
                        <tr key={st.studentNumber} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                          <td className="p-2.5 font-mono text-slate-900 dark:text-white font-bold">{st.studentNumber}</td>
                          <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">{st.rawName}</td>
                          <td className="p-2.5 text-center">
                            {isExisting ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                Enrolled
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                                New
                              </span>
                            )}
                          </td>
                          {parsedResult.assessments.map((ass) => (
                            <td key={ass.colHeader} className="p-2.5 text-center font-mono font-bold">
                              {st.scores[ass.colHeader] !== undefined ? (
                                <span className="text-slate-800 dark:text-slate-100">{st.scores[ass.colHeader]}</span>
                              ) : (
                                <span className="text-slate-300 dark:text-slate-600">-</span>
                              )}
                            </td>
                          ))}
                          <td className="p-2.5 text-center text-xs font-mono">
                            <span className="text-emerald-600 font-bold">{st.totalPresent}</span>
                            <span className="text-slate-400">/{parsedResult.attendanceColumns.length}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
          <NeuButton variant="secondary" onClick={onClose}>
            Cancel
          </NeuButton>

          <NeuButton
            variant="primary"
            disabled={!parsedResult || parsedResult.students.length === 0 || isImporting}
            isLoading={isImporting}
            onClick={handleImportNow}
            leftIcon={<CheckCircle2 className="w-4 h-4 text-white" />}
          >
            Import {totalScoresCount} Official Grades
          </NeuButton>
        </div>
      </div>
    </NeuModal>
  );
};
