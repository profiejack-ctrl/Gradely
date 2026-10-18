import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import {
  Assessment,
  Subject,
  MatrixCategory,
  MatrixSubCategory,
  GradingPeriod,
} from '../../types';
import { NeuButton } from '../common/NeuButton';
import { NeuBadge } from '../common/NeuBadge';
import { NeuSelect, NeuInput } from '../common/NeuInput';
import { AssessmentModal } from './AssessmentModal';
import { MatrixConfigModal } from './MatrixConfigModal';
import { BulkStudentUploadModal } from './BulkStudentUploadModal';
import { ImportOfficialGradesModal } from './ImportOfficialGradesModal';
import {
  calculateStudentSubjectPerformance,
  calculatePeriodSummary,
  calculateAttendanceStats,
} from '../../utils/gradeCalculator';
import {
  exportGradebookToOfficialSMSCSV,
  exportGradebookToSummaryReportCSV,
} from '../../utils/exportUtils';
import {
  Plus,
  Sliders,
  Download,
  Printer,
  Search,
  Trash2,
  Edit,
  CalendarCheck,
  AlertTriangle,
  Upload,
  Award,
  ArrowUpDown,
  GraduationCap,
  ChevronDown,
  FileSpreadsheet,
  Zap,
} from 'lucide-react';
import { compareByLastName, formatLastFirst } from '../../utils/nameUtils';
import { isStudentInSection } from '../../utils/enrollmentUtils';

interface GradebookColumn {
  key: string;
  parentCategory: MatrixCategory;
  subCategory?: MatrixSubCategory;
  isAttendance?: boolean;
  assessment?: Assessment;
  emptyLabel?: string;
  initialCategoryId?: string;
}

interface GradebookProps {
  initialSectionId?: string;
  initialSubjectId?: string;
  onNavigateToAttendance: (sectionId: string, subjectId: string, period?: GradingPeriod) => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

type PeriodViewMode = GradingPeriod | 'summary';

export const Gradebook: React.FC<GradebookProps> = ({
  initialSectionId,
  initialSubjectId,
  onNavigateToAttendance,
  onShowToast,
}) => {
  const { currentUser, isDean } = useAuth();
  const {
    sections,
    subjects,
    assessments,
    scores,
    attendance,
    students,
    setScore,
    deleteScore,
    addAssessment,
    updateAssessment,
    deleteAssessment,
    updateSubjectMatrix,
  } = useData();

  const [deanViewAll, setDeanViewAll] = useState(false);

  const accessibleSubjects = isDean && deanViewAll
    ? subjects
    : subjects.filter((s) => s.teacherId === currentUser?.id);

  const accessibleSections = isDean && deanViewAll
    ? sections
    : sections.filter((sec) => sec.adviserId === currentUser?.id || accessibleSubjects.some((s) => s.sectionId === sec.id));

  const [selectedSectionId, setSelectedSectionId] = useState<string>(() => {
    if (initialSectionId && accessibleSections.some((s) => s.id === initialSectionId)) {
      return initialSectionId;
    }
    return accessibleSections[0]?.id || '';
  });

  const sectionSubjects = accessibleSubjects.filter((s) => s.sectionId === selectedSectionId);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(() => {
    if (initialSubjectId && sectionSubjects.some((s) => s.id === initialSubjectId)) {
      return initialSubjectId;
    }
    return sectionSubjects[0]?.id || '';
  });

  useEffect(() => {
    if (accessibleSections.length > 0 && !accessibleSections.some((s) => s.id === selectedSectionId)) {
      const nextSec = accessibleSections[0].id;
      setSelectedSectionId(nextSec);
      const subjs = accessibleSubjects.filter((s) => s.sectionId === nextSec);
      setSelectedSubjectId(subjs[0]?.id || '');
    }
  }, [accessibleSections, selectedSectionId, accessibleSubjects]);

  useEffect(() => {
    if (sectionSubjects.length > 0 && !sectionSubjects.some((s) => s.id === selectedSubjectId)) {
      setSelectedSubjectId(sectionSubjects[0].id);
    }
  }, [sectionSubjects, selectedSubjectId]);

  const [activePeriodTab, setActivePeriodTab] = useState<PeriodViewMode>('prelim');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [assessmentToEdit, setAssessmentToEdit] = useState<Assessment | null>(null);
  const [initialAssessmentCategoryId, setInitialAssessmentCategoryId] = useState<string | undefined>(undefined);
  const [initialAssessmentPeriod, setInitialAssessmentPeriod] = useState<GradingPeriod>('prelim');
  const [isMatrixModalOpen, setIsMatrixModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isImportGradesModalOpen, setIsImportGradesModalOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Active subject object
  const activeSubject: Subject | undefined = sectionSubjects.find(
    (s) => s.id === selectedSubjectId
  ) || sectionSubjects[0];

  // Sorting and display states
  const [studentSortBy, setStudentSortBy] = useState<'last-name-asc' | 'last-name-desc' | 'first-name-asc' | 'student-number'>('last-name-asc');
  const [displayLastFirst, setDisplayLastFirst] = useState(true);

  // Students in section
  const sectionStudents = students.filter((s) => isStudentInSection(s, selectedSectionId));
  const filteredStudents = sectionStudents.filter(
    (stud) =>
      stud.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (stud.studentNumber && stud.studentNumber.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    if (studentSortBy === 'last-name-asc') {
      return compareByLastName(a.name, b.name, 'asc');
    }
    if (studentSortBy === 'last-name-desc') {
      return compareByLastName(a.name, b.name, 'desc');
    }
    if (studentSortBy === 'first-name-asc') {
      return a.name.localeCompare(b.name);
    }
    if (studentSortBy === 'student-number') {
      return (a.studentNumber || '').localeCompare(b.studentNumber || '');
    }
    return 0;
  });

  // Assessments for active subject
  const subjectAssessments = activeSubject
    ? assessments.filter((a) => a.subjectId === activeSubject.id)
    : [];

  const handleScoreChange = (assessmentId: string, studentId: string, rawVal: string, maxScore: number) => {
    if (rawVal.trim() === '') {
      deleteScore(assessmentId, studentId);
      return;
    }
    const num = Number(rawVal);
    if (isNaN(num)) return;
    const validScore = Math.max(0, Math.min(maxScore, num));
    setScore(assessmentId, studentId, validScore);
  };

  const handleAddAssessment = (catId?: string, period?: GradingPeriod) => {
    setAssessmentToEdit(null);
    setInitialAssessmentCategoryId(catId);
    setInitialAssessmentPeriod(period || (activePeriodTab === 'summary' ? 'prelim' : activePeriodTab));
    setIsAssessmentModalOpen(true);
  };

  const handleEditAssessment = (assessment: Assessment) => {
    setAssessmentToEdit(assessment);
    setInitialAssessmentCategoryId(assessment.categoryId);
    setInitialAssessmentPeriod(assessment.period || 'prelim');
    setIsAssessmentModalOpen(true);
  };

  const handleDeleteAssessment = (ass: Assessment) => {
    if (window.confirm(`Delete assessment "${ass.title}" and all student scores?`)) {
      deleteAssessment(ass.id);
      onShowToast('Assessment Deleted', `"${ass.title}" has been removed.`, 'warning');
    }
  };

  const handleSaveAssessment = (data: Omit<Assessment, 'id'>, idToUpdate?: string) => {
    if (idToUpdate) {
      updateAssessment(idToUpdate, data);
      onShowToast('Assessment Updated', `"${data.title}" has been updated.`, 'success');
    } else {
      addAssessment(data);
      onShowToast('Assessment Created', `"${data.title}" added to gradebook.`, 'success');
    }
  };

  const handleExportOfficialSMS = () => {
    if (!activeSubject) return;
    exportGradebookToOfficialSMSCSV(activeSubject, sectionStudents, assessments, scores, attendance, activePeriodTab);
    onShowToast('School SMS CSV Exported', `${activeSubject.code} exported in official 36-column school SMS format.`, 'success');
    setIsExportMenuOpen(false);
  };

  const handleExportSummaryReport = () => {
    if (!activeSubject) return;
    exportGradebookToSummaryReportCSV(activeSubject, sectionStudents, assessments, scores, attendance);
    onShowToast('Summary Report Exported', `${activeSubject.code} Collegiate Semestral Summary grade sheet exported.`, 'success');
    setIsExportMenuOpen(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const sectionOptions = accessibleSections.map((s) => ({
    value: s.id,
    label: `${s.name} (${s.gradeLevelOrYear})`,
  }));

  const subjectOptions = sectionSubjects.map((s) => ({
    value: s.id,
    label: `${s.code} - ${s.name}`,
  }));

  if (accessibleSubjects.length === 0) {
    return (
      <div className="p-8 sm:p-12 text-center bg-white dark:bg-[#0d1424] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm max-w-xl mx-auto my-8 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-[#1E3A8A] dark:text-blue-400 flex items-center justify-center mx-auto shadow-inner">
          <GraduationCap className="w-8 h-8 text-[#F97316]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">No Courses Assigned Yet</h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
            You do not currently have any active course loads assigned to your faculty account.
            Once the College Dean provisions courses or subjects to you, your gradebook sheets and grading matrices will appear here.
          </p>
        </div>
        {isDean && (
          <div className="pt-2">
            <NeuButton
              variant="primary"
              size="sm"
              onClick={() => setDeanViewAll(true)}
            >
              Switch to Dean All-College View
            </NeuButton>
          </div>
        )}
      </div>
    );
  }

  if (!activeSubject) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">No Courses in this Section</h2>
        <p className="text-xs text-slate-500">Create or assign a course for this class to start recording grades.</p>
        {isDean && !deanViewAll && (
          <div className="pt-2">
            <NeuButton
              variant="secondary"
              size="sm"
              onClick={() => setDeanViewAll(true)}
            >
              Show All College Courses (Dean)
            </NeuButton>
          </div>
        )}
      </div>
    );
  }

  // Count assessments per period
  const prelimCount = subjectAssessments.filter((a) => (a.period || 'prelim') === 'prelim').length;
  const midtermCount = subjectAssessments.filter((a) => a.period === 'midterm').length;
  const finalsCount = subjectAssessments.filter((a) => a.period === 'finals').length;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header Controls */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Interactive Gradebook
            </h1>
            <NeuBadge variant="primary" size="sm">
              {activeSubject.code}
            </NeuBadge>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
              3-Period Quarter System
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage <strong>Prelim (30%)</strong>, <strong>Midterm (30%)</strong>, and <strong>Finals (40%)</strong> period sheets with live matrix calculations.
          </p>
        </div>

        {/* Section and Subject Switchers */}
        <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto">
          {isDean && (
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold self-end xl:self-auto mb-1 xl:mb-0">
              <button
                type="button"
                onClick={() => setDeanViewAll(false)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  !deanViewAll
                    ? 'bg-white dark:bg-slate-700 text-[#1E3A8A] dark:text-blue-300 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                My Courses
              </button>
              <button
                type="button"
                onClick={() => setDeanViewAll(true)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  deanViewAll
                    ? 'bg-white dark:bg-slate-700 text-[#F97316] dark:text-orange-400 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                All Courses (Dean)
              </button>
            </div>
          )}

          <div className="w-full sm:w-44 md:w-48">
            <NeuSelect
              label="Class / Section"
              options={sectionOptions}
              value={selectedSectionId}
              onChange={(e) => {
                setSelectedSectionId(e.target.value);
                const subjs = accessibleSubjects.filter((s) => s.sectionId === e.target.value);
                if (subjs[0]) setSelectedSubjectId(subjs[0].id);
              }}
            />
          </div>

          <div className="w-full sm:w-56 md:w-60">
            <NeuSelect
              label="Subject Course"
              options={subjectOptions}
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 3-Quarter Period Navigation Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-2 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Prelim Tab */}
          <button
            onClick={() => setActivePeriodTab('prelim')}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 ${
              activePeriodTab === 'prelim'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'
            }`}
          >
            <span>1️⃣ Prelim</span>
            <span
              className={`text-[9.5px] sm:text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                activePeriodTab === 'prelim'
                  ? 'bg-white/20 text-white'
                  : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
              }`}
            >
              30% • {prelimCount}
            </span>
          </button>

          {/* Midterm Tab */}
          <button
            onClick={() => setActivePeriodTab('midterm')}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 ${
              activePeriodTab === 'midterm'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'
            }`}
          >
            <span>2️⃣ Midterm</span>
            <span
              className={`text-[9.5px] sm:text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                activePeriodTab === 'midterm'
                  ? 'bg-white/20 text-white'
                  : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
              }`}
            >
              30% • {midtermCount}
            </span>
          </button>

          {/* Finals Tab */}
          <button
            onClick={() => setActivePeriodTab('finals')}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 ${
              activePeriodTab === 'finals'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'
            }`}
          >
            <span>3️⃣ Finals</span>
            <span
              className={`text-[9.5px] sm:text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                activePeriodTab === 'finals'
                  ? 'bg-white/20 text-white'
                  : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
              }`}
            >
              40% • {finalsCount}
            </span>
          </button>

          {/* Semestral Summary Master Tab */}
          <button
            onClick={() => setActivePeriodTab('summary')}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 ${
              activePeriodTab === 'summary'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>🌟 Summary (100%)</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const nextState = !(activeSubject.useTransmutation !== false);
              updateSubjectMatrix(activeSubject.id, activeSubject.matrix, activeSubject.passingGrade, nextState);
              onShowToast(
                nextState ? 'Transmutation Enabled' : 'Transmutation Disabled',
                nextState
                  ? 'Grades are now transmuted using official BCP Annex A (50% = 75 Passing).'
                  : 'Grades are now calculated using exact raw percentages.',
                'info'
              );
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              activeSubject.useTransmutation !== false
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title="Click to toggle between BCP Annex A Transmutation and Raw Percentage"
          >
            <Zap className={`w-3.5 h-3.5 ${activeSubject.useTransmutation !== false ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
            <span>Transmutation: {activeSubject.useTransmutation !== false ? 'ON (BCP Annex A)' : 'OFF (Raw %)'}</span>
          </button>

          <NeuButton
            variant="secondary"
            size="sm"
            onClick={() => setIsMatrixModalOpen(true)}
            leftIcon={<Sliders className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
          >
            Grading Matrix
          </NeuButton>

          <NeuButton
            variant="secondary"
            size="sm"
            onClick={() =>
              onNavigateToAttendance(
                activeSubject.sectionId,
                activeSubject.id,
                activePeriodTab === 'summary' ? 'prelim' : activePeriodTab
              )
            }
            leftIcon={<CalendarCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
          >
            Roll Call
          </NeuButton>

          <NeuButton
            variant="primary"
            size="sm"
            onClick={() => handleAddAssessment(undefined, activePeriodTab === 'summary' ? 'prelim' : activePeriodTab)}
            leftIcon={<Plus className="w-3.5 h-3.5 text-white" />}
          >
            Add Assessment
          </NeuButton>
        </div>
      </div>

      {/* Gradebook Table Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 px-0.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
          <div className="w-full sm:w-60">
            <NeuInput
              placeholder="Search student name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>

          <div className="w-full sm:w-52">
            <NeuSelect
              options={[
                { value: 'last-name-asc', label: 'Sort: Last Name (A-Z)' },
                { value: 'last-name-desc', label: 'Sort: Last Name (Z-A)' },
                { value: 'first-name-asc', label: 'Sort: First Name (A-Z)' },
                { value: 'student-number', label: 'Sort: Student ID' },
              ]}
              value={studentSortBy}
              onChange={(e) => setStudentSortBy(e.target.value as any)}
            />
          </div>

          <NeuButton
            variant="secondary"
            size="sm"
            onClick={() => setDisplayLastFirst(!displayLastFirst)}
            title={displayLastFirst ? 'Display: Last Name, First Name' : 'Display: First Name Last Name'}
            leftIcon={<ArrowUpDown className="w-3.5 h-3.5 text-[#F97316]" />}
            className="text-xs whitespace-nowrap"
          >
            {displayLastFirst ? 'Last, First' : 'First Last'}
          </NeuButton>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
          <NeuButton
            variant="secondary"
            size="sm"
            onClick={() => setIsBulkModalOpen(true)}
            leftIcon={<Upload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
          >
            Import Masterlist
          </NeuButton>

          <NeuButton
            variant="secondary"
            size="sm"
            onClick={() => setIsImportGradesModalOpen(true)}
            leftIcon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
            title="Import official 36-column SMS prelim/midterm/finals grade CSV"
          >
            Import Grades (CSV)
          </NeuButton>

          {/* Export CSV / SMS Dropdown */}
          <div className="relative">
            <div className="inline-flex rounded-xl shadow-xs overflow-hidden">
              <NeuButton
                variant="secondary"
                size="sm"
                onClick={handleExportOfficialSMS}
                leftIcon={<Download className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />}
                className="rounded-r-none border-r border-slate-200 dark:border-slate-700"
                title="Export directly in the official School SMS 36-column format"
              >
                Export School SMS CSV
              </NeuButton>
              <button
                type="button"
                onClick={() => setIsExportMenuOpen((prev) => !prev)}
                className="px-2 py-1.5 bg-white dark:bg-[#111827] border border-l-0 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors flex items-center justify-center rounded-r-xl"
                aria-label="Export options"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExportMenuOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {isExportMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setIsExportMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-30 py-1 text-xs divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in-50 zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsExportMenuOpen(false);
                      setIsImportGradesModalOpen(true);
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-start gap-2.5 text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">Import Official Grades (CSV)</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        Import official 36-column Prelim/Midterm/Finals grade CSV with auto-mapping & attendance logs.
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportOfficialSMS}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-start gap-2.5 text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    <Download className="w-4 h-4 text-[#1E3A8A] dark:text-blue-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">Official School SMS CSV</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        36-column official template (Written works = Quiz). Fully compatible with school portal upload.
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportSummaryReport}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-start gap-2.5 text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">Collegiate Summary Sheet</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        Periodical weighted % (Prelim, Midterm, Finals) with Semestral 1.00–5.00 Transmuted Grade.
                      </div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          <NeuButton
            variant="secondary"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />}
          >
            Print Sheet
          </NeuButton>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: SEMESTRAL MASTER SUMMARY TABLE                                   */}
      {/* ========================================================================= */}
      {activePeriodTab === 'summary' ? (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#0d1424] border border-slate-200/90 dark:border-slate-800/90 rounded-2xl overflow-hidden shadow-xs dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/90 dark:border-slate-800/90 bg-slate-50/90 dark:bg-[#090e1a]">
                    <th className="p-3 sticky left-0 bg-slate-50 dark:bg-[#090e1a] z-20 min-w-[80px]">
                      Student ID
                    </th>
                    <th className="p-3 sticky left-[80px] bg-slate-50 dark:bg-[#090e1a] z-20 min-w-[160px] border-r border-slate-200 dark:border-slate-800">
                      Student Name
                    </th>
                    <th className="p-3 text-center min-w-[130px] border-r border-slate-200 dark:border-slate-800">
                      <div className="font-bold text-slate-800 dark:text-slate-200">1️⃣ Prelim Period</div>
                      <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">Weight: 30%</div>
                    </th>
                    <th className="p-3 text-center min-w-[130px] border-r border-slate-200 dark:border-slate-800">
                      <div className="font-bold text-slate-800 dark:text-slate-200">2️⃣ Midterm Period</div>
                      <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">Weight: 30%</div>
                    </th>
                    <th className="p-3 text-center min-w-[130px] border-r border-slate-200 dark:border-slate-800">
                      <div className="font-bold text-slate-800 dark:text-slate-200">3️⃣ Finals Period</div>
                      <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">Weight: 40%</div>
                    </th>
                    <th className="p-3 text-center font-bold bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 min-w-[110px] border-r border-slate-200 dark:border-slate-800">
                      Semestral Grade
                    </th>
                    <th className="p-3 text-center font-bold min-w-[85px] border-r border-slate-200 dark:border-slate-800">
                      <div>Grade Equiv.</div>
                      <div className="text-[10px] text-slate-400 font-normal">1.00 - 5.00</div>
                    </th>
                    <th className="p-3 text-center font-bold min-w-[90px]">
                      Final Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {sortedStudents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        No students found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    sortedStudents.map((student) => {
                      const perf = calculateStudentSubjectPerformance(
                        activeSubject,
                        student,
                        assessments,
                        scores,
                        attendance
                      );

                      return (
                        <tr
                          key={student.id}
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors duration-100"
                        >
                          <td className="p-3 sticky left-0 bg-white dark:bg-[#0d1424] z-10 font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                            {student.studentNumber || student.id.slice(0, 6)}
                          </td>

                          <td className="p-3 sticky left-[80px] bg-white dark:bg-[#0d1424] z-10 border-r border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                              <img
                                src={student.avatar}
                                alt={student.name}
                                className="w-6 h-6 rounded-md object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                              />
                              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                                {displayLastFirst ? formatLastFirst(student.name) : student.name}
                              </span>
                            </div>
                          </td>

                          {/* Prelim Cell */}
                          <td className="p-3 text-center border-r border-slate-200 dark:border-slate-800">
                            <button
                              onClick={() => setActivePeriodTab('prelim')}
                              className="font-bold text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                              title="Click to view Prelim details"
                            >
                              {perf.periods.prelim.grade}%
                            </button>
                            <div className="text-[10px] text-slate-400">
                              {perf.periods.prelim.assessmentCount} items recorded
                            </div>
                          </td>

                          {/* Midterm Cell */}
                          <td className="p-3 text-center border-r border-slate-200 dark:border-slate-800">
                            <button
                              onClick={() => setActivePeriodTab('midterm')}
                              className="font-bold text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                              title="Click to view Midterm details"
                            >
                              {perf.periods.midterm.grade}%
                            </button>
                            <div className="text-[10px] text-slate-400">
                              {perf.periods.midterm.assessmentCount} items recorded
                            </div>
                          </td>

                          {/* Finals Cell */}
                          <td className="p-3 text-center border-r border-slate-200 dark:border-slate-800">
                            <button
                              onClick={() => setActivePeriodTab('finals')}
                              className="font-bold text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                              title="Click to view Finals details"
                            >
                              {perf.periods.finals.grade}%
                            </button>
                            <div className="text-[10px] text-slate-400">
                              {perf.periods.finals.assessmentCount} items recorded
                            </div>
                          </td>

                          {/* Semestral Final Grade */}
                          <td className="p-3 text-center font-bold text-base bg-indigo-50/30 dark:bg-indigo-950/20 border-r border-slate-200 dark:border-slate-800">
                            <span
                              className={
                                perf.isPassing
                                  ? 'text-slate-900 dark:text-slate-100 font-extrabold'
                                  : 'text-rose-600 dark:text-rose-400 font-extrabold'
                              }
                            >
                              {perf.finalGrade}%
                            </span>
                            {perf.useTransmutation && perf.rawFinalGrade !== undefined && (
                              <div className="text-[10px] text-slate-400 font-normal">
                                Raw: {perf.rawFinalGrade}%
                              </div>
                            )}
                          </td>

                          {/* Grade Equivalent */}
                          <td className="p-3 text-center font-mono font-bold text-xs border-r border-slate-200 dark:border-slate-800">
                            <span
                              className={
                                perf.gpa <= 3.0
                                  ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                                  : 'text-rose-600 dark:text-rose-400 font-extrabold'
                              }
                            >
                              {perf.gpa.toFixed(2)}
                            </span>
                          </td>

                          {/* Remarks */}
                          <td className="p-3 text-center">
                            <NeuBadge
                              variant={
                                perf.remarks === 'Honors'
                                  ? 'primary'
                                  : perf.isPassing
                                  ? 'success'
                                  : 'danger'
                              }
                              size="sm"
                            >
                              {perf.remarks}
                            </NeuBadge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* VIEW 2: PERIOD SPECIFIC SPREADSHEET (Prelim, Midterm, Finals)             */
        /* ========================================================================= */
        <div className="bg-white dark:bg-[#0d1424] border border-slate-200/90 dark:border-slate-800/90 rounded-2xl overflow-hidden shadow-xs dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
          <div className="overflow-x-auto custom-scrollbar">
            {(() => {
              const currentPeriod = activePeriodTab as GradingPeriod;
              const periodAssessments = subjectAssessments.filter(
                (a) => (a.period || 'prelim') === currentPeriod
              );

              // Generate columns for this period
              const columns: GradebookColumn[] = [];

              activeSubject.matrix.forEach((cat) => {
                if (cat.subCategories && cat.subCategories.length > 0) {
                  cat.subCategories.forEach((subCat) => {
                    const isAtt =
                      subCat.name.toLowerCase().includes('attend') ||
                      subCat.id.toLowerCase().includes('attend');

                    if (isAtt) {
                      columns.push({
                        key: `att-${cat.id}-${subCat.id}`,
                        parentCategory: cat,
                        subCategory: subCat,
                        isAttendance: true,
                      });
                    } else {
                      // Find assessments in this period matching subcategory
                      const subAssessments = periodAssessments.filter(
                        (a) =>
                          a.categoryId === subCat.id ||
                          (a.parentCategoryId === cat.id && a.categoryId === subCat.id) ||
                          (!a.parentCategoryId &&
                            a.categoryId === cat.id &&
                            a.title.toLowerCase().includes(subCat.name.toLowerCase().slice(0, 4)))
                      );

                      if (subAssessments.length === 0) {
                        columns.push({
                          key: `empty-${cat.id}-${subCat.id}`,
                          parentCategory: cat,
                          subCategory: subCat,
                          emptyLabel: `+ Add ${subCat.name}`,
                          initialCategoryId: subCat.id,
                        });
                      } else {
                        subAssessments.forEach((ass) => {
                          columns.push({
                            key: `ass-${ass.id}`,
                            parentCategory: cat,
                            subCategory: subCat,
                            assessment: ass,
                          });
                        });
                      }
                    }
                  });

                  // Add extra assessments in this category not caught by subcategory match
                  const matchedIds = new Set(
                    columns.filter((c) => c.assessment).map((c) => c.assessment!.id)
                  );
                  const extraAssessments = periodAssessments.filter(
                    (a) =>
                      (a.categoryId === cat.id || a.parentCategoryId === cat.id) &&
                      !matchedIds.has(a.id)
                  );
                  extraAssessments.forEach((ass) => {
                    columns.push({
                      key: `ass-${ass.id}`,
                      parentCategory: cat,
                      assessment: ass,
                    });
                  });
                } else {
                  // Flat category
                  const isAtt =
                    cat.name.toLowerCase().includes('attend') ||
                    cat.id.toLowerCase().includes('attend');

                  if (isAtt) {
                    columns.push({
                      key: `att-${cat.id}`,
                      parentCategory: cat,
                      isAttendance: true,
                    });
                  } else {
                    const catAssessments = periodAssessments.filter(
                      (a) => a.categoryId === cat.id || a.parentCategoryId === cat.id
                    );

                    if (catAssessments.length === 0) {
                      columns.push({
                        key: `empty-${cat.id}`,
                        parentCategory: cat,
                        emptyLabel: `+ Add ${cat.name}`,
                        initialCategoryId: cat.id,
                      });
                    } else {
                      catAssessments.forEach((ass) => {
                        columns.push({
                          key: `ass-${ass.id}`,
                          parentCategory: cat,
                          assessment: ass,
                        });
                      });
                    }
                  }
                }
              });

              return (
                <table className="w-full text-left text-xs border-collapse">
                  {/* Top Level Category Group Headers */}
                  <thead>
                    <tr className="border-b border-slate-200/90 dark:border-slate-800/90 bg-slate-50/90 dark:bg-[#090e1a]">
                      <th
                        colSpan={2}
                        className="p-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 sticky left-0 bg-slate-50 dark:bg-[#090e1a] z-20 border-r border-slate-200 dark:border-slate-800"
                      >
                        Student ({filteredStudents.length})
                      </th>

                      {/* Dynamic Category Group Spans */}
                      {activeSubject.matrix.map((cat) => {
                        const catCols = columns.filter((col) => col.parentCategory.id === cat.id);
                        const colSpan = Math.max(1, catCols.length);

                        return (
                          <th
                            key={cat.id}
                            colSpan={colSpan}
                            className="p-3 text-center font-bold text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800"
                          >
                            <div className="flex items-center justify-center gap-1.5">
                              <span>{cat.name}</span>
                              <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded">
                                {cat.weight}%
                              </span>
                            </div>
                          </th>
                        );
                      })}

                      {/* Period Grade Column Header */}
                      <th
                        colSpan={2}
                        className="p-3 text-center font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/30 min-w-[140px]"
                      >
                        {currentPeriod.toUpperCase()} Standing
                      </th>
                    </tr>

                    {/* Second Level Subcategories & Assessment Items Header */}
                    <tr className="border-b border-slate-200/90 dark:border-slate-800/90 bg-slate-100/50 dark:bg-[#0b101d] text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      <th className="p-2.5 sticky left-0 bg-white dark:bg-[#0d1424] z-20 min-w-[75px]">
                        ID
                      </th>
                      <th className="p-2.5 sticky left-[75px] bg-white dark:bg-[#0d1424] z-20 min-w-[150px] border-r border-slate-200 dark:border-slate-800">
                        Name
                      </th>

                      {/* Dynamic Columns */}
                      {columns.map((col) => {
                        if (col.isAttendance) {
                          return (
                            <th
                              key={col.key}
                              className="p-2.5 text-center border-r border-slate-200 dark:border-slate-800 min-w-[95px]"
                            >
                              <div className="font-bold text-slate-700 dark:text-slate-300">
                                {col.subCategory?.name || 'Attendance'}
                              </div>
                              <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                                {col.subCategory ? `${col.subCategory.weight}% of CS` : 'Roll %'}
                              </div>
                            </th>
                          );
                        }

                        if (col.emptyLabel) {
                          return (
                            <th
                              key={col.key}
                              className="p-2.5 text-center text-slate-400 italic font-normal border-r border-slate-200 dark:border-slate-800 min-w-[125px]"
                            >
                              <div className="text-[10px] text-slate-500 font-bold mb-0.5 uppercase tracking-wider">
                                {col.subCategory?.name || col.parentCategory.name} (
                                {col.subCategory?.weight || col.parentCategory.weight}%)
                              </div>
                              <button
                                onClick={() => handleAddAssessment(col.initialCategoryId, currentPeriod)}
                                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center justify-center gap-1 mx-auto bg-indigo-50/70 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md font-semibold"
                              >
                                <Plus className="w-3 h-3" /> Add Item
                              </button>
                            </th>
                          );
                        }

                        const ass = col.assessment!;
                        return (
                          <th
                            key={col.key}
                            className="p-2 text-center border-r border-slate-200 dark:border-slate-800 min-w-[115px] group relative"
                          >
                            {col.subCategory && (
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                                {col.subCategory.name}
                              </span>
                            )}
                            <div
                              className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[105px] mx-auto"
                              title={ass.title}
                            >
                              {ass.title}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1 mt-0.5">
                              <span>Max: {ass.maxScore}</span>
                              <button
                                onClick={() => handleEditAssessment(ass)}
                                className="text-slate-400 hover:text-indigo-600 p-0.5"
                                title="Edit"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteAssessment(ass)}
                                className="text-slate-400 hover:text-rose-600 p-0.5"
                                title="Delete"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </th>
                        );
                      })}

                      <th className="p-2 text-center min-w-[75px] font-bold">
                        {currentPeriod.toUpperCase()} %
                      </th>
                      <th className="p-2 text-center min-w-[75px] font-bold">
                        Status
                      </th>
                    </tr>
                  </thead>

                  {/* Students Data Rows */}
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {sortedStudents.length === 0 ? (
                      <tr>
                        <td colSpan={columns.length + 4} className="p-8 text-center text-slate-400">
                          No students found matching your criteria.
                        </td>
                      </tr>
                    ) : (
                      sortedStudents.map((student) => {
                        const periodSumm = calculatePeriodSummary(
                          activeSubject,
                          student,
                          currentPeriod,
                          assessments,
                          scores,
                          attendance
                        );

                        const attStats = calculateAttendanceStats(
                          attendance,
                          student.id,
                          activeSubject.id,
                          currentPeriod
                        );

                        return (
                          <tr
                            key={student.id}
                            className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors duration-100"
                          >
                            {/* Student ID */}
                            <td className="p-2.5 sticky left-0 bg-white dark:bg-[#0d1424] z-10 font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                              {student.studentNumber || student.id.slice(0, 6)}
                            </td>

                            {/* Student Avatar & Name */}
                            <td className="p-2.5 sticky left-[75px] bg-white dark:bg-[#0d1424] z-10 border-r border-slate-200 dark:border-slate-800">
                              <div className="flex items-center gap-2 min-w-[140px]">
                                <img
                                  src={student.avatar}
                                  alt={student.name}
                                  className="w-6 h-6 rounded-md object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                                />
                                <div className="min-w-0">
                                  <span className="font-semibold text-slate-900 dark:text-slate-100 truncate block">
                                    {displayLastFirst ? formatLastFirst(student.name) : student.name}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Dynamic Cells */}
                            {columns.map((col) => {
                              if (col.isAttendance) {
                                return (
                                  <td
                                    key={`${col.key}-${student.id}`}
                                    className="p-2 text-center border-r border-slate-200 dark:border-slate-800"
                                  >
                                    <span
                                      className={`font-mono font-bold px-1.5 py-0.5 rounded text-xs ${
                                        attStats.rate >= 90
                                          ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60'
                                          : attStats.rate >= 75
                                          ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60'
                                          : 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60'
                                      }`}
                                    >
                                      {attStats.rate}%
                                    </span>
                                  </td>
                                );
                              }

                              if (col.emptyLabel) {
                                return (
                                  <td
                                    key={`${col.key}-${student.id}`}
                                    className="p-2 text-center text-slate-400 border-r border-slate-200 dark:border-slate-800"
                                  >
                                    —
                                  </td>
                                );
                              }

                              const ass = col.assessment!;
                              const scoreRec = scores.find(
                                (s) => s.assessmentId === ass.id && s.studentId === student.id
                              );
                              const currentScore = scoreRec !== undefined && typeof scoreRec.score === 'number' ? scoreRec.score : '';

                              return (
                                <td
                                  key={`${col.key}-${student.id}`}
                                  className="p-1.5 text-center border-r border-slate-200 dark:border-slate-800"
                                >
                                  <div className="inline-flex items-center justify-center">
                                    <input
                                      type="number"
                                      min="0"
                                      max={ass.maxScore}
                                      value={currentScore}
                                      onChange={(e) =>
                                        handleScoreChange(
                                          ass.id,
                                          student.id,
                                          e.target.value,
                                          ass.maxScore
                                        )
                                      }
                                      className="w-11 py-1 px-1 text-center font-bold text-slate-900 dark:text-slate-100 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                      placeholder="—"
                                    />
                                  </div>
                                </td>
                              );
                            })}

                            {/* Period Grade % */}
                            <td className="p-2 text-center font-bold text-sm border-r border-slate-200 dark:border-slate-800">
                              <span
                                className={
                                  periodSumm.isPassing
                                    ? 'text-slate-900 dark:text-slate-100'
                                    : 'text-rose-600 dark:text-rose-400'
                                }
                              >
                                {periodSumm.grade}%
                              </span>
                              {periodSumm.useTransmutation && periodSumm.hasRecords && periodSumm.rawGrade !== undefined && (
                                <div className="text-[10px] text-slate-400 font-normal">
                                  Raw: {periodSumm.rawGrade}%
                                </div>
                              )}
                            </td>

                            {/* Status */}
                            <td className="p-2 text-center">
                              <NeuBadge
                                variant={periodSumm.isPassing ? 'success' : 'danger'}
                                size="sm"
                              >
                                {periodSumm.isPassing ? 'Passing' : 'Failing'}
                              </NeuBadge>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              );
            })()}
          </div>
        </div>
      )}

      {/* Modals */}
      <BulkStudentUploadModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        sections={accessibleSections}
        selectedSectionId={selectedSectionId}
        onShowToast={onShowToast}
      />

      <ImportOfficialGradesModal
        isOpen={isImportGradesModalOpen}
        onClose={() => setIsImportGradesModalOpen(false)}
        subjects={accessibleSubjects}
        sections={accessibleSections}
        selectedSubjectId={activeSubject?.id}
        selectedSectionId={selectedSectionId}
        activePeriod={activePeriodTab === 'summary' ? 'prelim' : activePeriodTab}
        onShowToast={onShowToast}
      />

      <AssessmentModal
        isOpen={isAssessmentModalOpen}
        onClose={() => setIsAssessmentModalOpen(false)}
        subject={activeSubject}
        assessmentToEdit={assessmentToEdit}
        initialCategoryId={initialAssessmentCategoryId}
        initialPeriod={initialAssessmentPeriod}
        onSave={handleSaveAssessment}
      />

      <MatrixConfigModal
        isOpen={isMatrixModalOpen}
        onClose={() => setIsMatrixModalOpen(false)}
        subject={activeSubject}
        onSave={(subjId, matrix, passGrade, useTransmute) => {
          updateSubjectMatrix(subjId, matrix, passGrade, useTransmute);
          onShowToast('Matrix Saved', 'Grading weights updated for this course.', 'success');
        }}
      />
    </div>
  );
};
