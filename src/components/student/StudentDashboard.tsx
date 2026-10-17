import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { NeuCard } from '../common/NeuCard';
import { NeuButton } from '../common/NeuButton';
import { NeuBadge } from '../common/NeuBadge';
import { NeuCircularGauge } from '../common/NeuProgress';
import { calculateStudentSubjectPerformance, convertToGPA } from '../../utils/gradeCalculator';
import { getStudentSectionIds, getStudentEnrolledSubjects } from '../../utils/enrollmentUtils';
import { GRADING_PERIODS } from '../../types';
import {
  BookOpen,
  CalendarCheck,
  Award,
  Sparkles,
  ArrowRight,
  Calculator,
  CheckCircle2,
  PieChart,
  FileSpreadsheet,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface StudentDashboardProps {
  onSelectSubject: (subjectId: string) => void;
  onNavigate: (tab: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  onSelectSubject,
  onNavigate,
}) => {
  const { currentUser } = useAuth();
  const { allUsers, sections, subjects, assessments, scores, attendance } = useData();

  // Authoritatively resolve student from DataContext, falling back to currentUser from AuthContext
  const student = (currentUser ? allUsers.find((u) => u.id === currentUser.id) : null) || currentUser;
  const enrolledSecIds = getStudentSectionIds(student);
  const enrolledSections = sections.filter((s) => enrolledSecIds.includes(s.id));
  const enrolledSubjects = getStudentEnrolledSubjects(
    student,
    subjects,
    assessments,
    scores,
    attendance
  );

  // Evaluate performance across all enrolled subjects
  const subjectPerformances = enrolledSubjects.map((subj) =>
    calculateStudentSubjectPerformance(
      subj,
      student!,
      assessments,
      scores,
      attendance
    )
  );

  // Distinguish active subjects with records from unrecorded ones
  const evaluatedPerformances = subjectPerformances.filter(
    (p) =>
      p.periods.prelim.hasRecords ||
      p.periods.midterm.hasRecords ||
      p.periods.finals.hasRecords ||
      p.attendanceRate !== 100 ||
      p.finalGrade > 0
  );

  const activePerformances = evaluatedPerformances.length > 0 ? evaluatedPerformances : subjectPerformances;

  // Academic loads & Unit weights
  const totalEnrolledUnits = subjectPerformances.reduce((acc, p) => acc + (p.subject.units || 3), 0);
  const activeUnits = activePerformances.reduce((acc, p) => acc + (p.subject.units || 3), 0);
  const passedUnits = subjectPerformances.filter((p) => p.isPassing).reduce((acc, p) => acc + (p.subject.units || 3), 0);

  // Unit-weighted Semestral Average (%):
  const weightedGradeSum = activePerformances.reduce(
    (acc, p) => acc + p.finalGrade * (p.subject.units || 3),
    0
  );
  const avgGrade =
    activeUnits > 0
      ? Math.round((weightedGradeSum / activeUnits) * 10) / 10
      : 0;

  // General Weighted Average (GWA) on collegiate 1.00 - 5.00 scale:
  const weightedGpaSum = activePerformances.reduce(
    (acc, p) => acc + p.gpa * (p.subject.units || 3),
    0
  );
  const gwa =
    activeUnits > 0
      ? Math.round((weightedGpaSum / activeUnits) * 100) / 100
      : (activePerformances.length > 0 ? convertToGPA(avgGrade) : 5.0);

  const totalAttSum = subjectPerformances.reduce((acc, p) => acc + p.attendanceRate, 0);
  const avgAttendance =
    subjectPerformances.length > 0
      ? Math.round((totalAttSum / subjectPerformances.length) * 10) / 10
      : 100;

  const hasHonors = (gwa <= 1.5 && avgGrade >= 90) || avgGrade >= 90;

  // Subject-by-Subject Semestral Grade Slider State
  const [activeSubjectIndex, setActiveSubjectIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const safeSubjectIndex =
    subjectPerformances.length > 0
      ? Math.min(activeSubjectIndex, subjectPerformances.length - 1)
      : 0;

  const currentSubjectPerf = subjectPerformances[safeSubjectIndex];

  const handlePrevSubject = () => {
    if (subjectPerformances.length <= 1) return;
    setActiveSubjectIndex((prev) =>
      prev > 0 ? prev - 1 : subjectPerformances.length - 1
    );
  };

  const handleNextSubject = () => {
    if (subjectPerformances.length <= 1) return;
    setActiveSubjectIndex((prev) =>
      prev < subjectPerformances.length - 1 ? prev + 1 : 0
    );
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;

    // Only swipe if horizontal swipe exceeds vertical motion by significant threshold
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 35) {
      if (diffX > 0) {
        handleNextSubject();
      } else {
        handlePrevSubject();
      }
    }
    setTouchStartX(null);
    setTouchStartY(null);
  };

  useEffect(() => {
    if (hasHonors) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    }
  }, [hasHonors]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Student Welcome Header */}
      <div className="bg-white/95 dark:bg-[#0d1424] border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-4 sm:p-6 lg:p-7 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-5 shadow-xs dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
        <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
          <img
            src={student?.avatar}
            alt={student?.name}
            className="w-14 h-14 sm:w-16 md:w-20 sm:h-16 md:h-20 rounded-2xl object-cover ring-2 ring-orange-500/20 shadow-xs shrink-0"
          />
          <div className="space-y-0.5 sm:space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#1E3A8A] dark:text-blue-400">
                Student Academic Hub
              </span>
              <NeuBadge variant="success" size="sm">
                Active Student
              </NeuBadge>
            </div>
            <h1 className="text-lg sm:text-2xl md:text-3xl font-bold font-heading text-slate-900 dark:text-white tracking-tight truncate">
              Hello, {student?.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Student ID: <span className="font-mono font-bold text-slate-800 dark:text-slate-200 tabular-nums">{student?.studentNumber}</span> •{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {enrolledSections.length > 0
                  ? enrolledSections.map((s) => s.name).join(', ')
                  : 'Unassigned Section'}
              </span>
              {enrolledSections[0]?.gradeLevelOrYear ? (
                <> <br /> ({enrolledSections.map((s) => s.gradeLevelOrYear).filter((v, i, a) => a.indexOf(v) === i).join(' • ')})</>
              ) : null}
            </p>
          </div>
        </div>

        <div className="flex flex-row sm:flex-row xl:flex-col items-center gap-2 w-full xl:w-auto shrink-0">
          <NeuButton
            variant="secondary"
            size="md"
            onClick={() => onNavigate('student-simulator')}
            leftIcon={<Calculator className="w-4 h-4 text-[#F97316] dark:text-orange-400" />}
            className="flex-1 sm:flex-initial justify-center text-xs sm:text-sm"
          >
            "What-If" Calculator
          </NeuButton>
          <NeuButton
            variant="primary"
            size="md"
            onClick={() => onNavigate('student-subjects')}
            leftIcon={<BookOpen className="w-4 h-4 text-white" />}
            className="flex-1 sm:flex-initial justify-center text-xs sm:text-sm shadow-sm"
          >
            View All Records
          </NeuButton>
        </div>
      </div>

      {/* Academic Highlights & Gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-col sm:gap-4">
        {/* Subject-by-Subject Semestral Grade Slider Card */}
        <NeuCard
          className="flex flex-col justify-between p-4 sm:p-5 relative select-none touch-pan-y"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Card Top: Subject Navigation Header */}
          <div className="flex items-center justify-between gap-1 pb-2 border-b border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handlePrevSubject}
              disabled={subjectPerformances.length <= 1}
              className="p-1 sm:p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-25 disabled:cursor-not-allowed transition-all"
              aria-label="Previous subject"
              title="Previous subject (or swipe right)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="text-center min-w-0 flex-1 px-1">
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md truncate max-w-[130px] sm:max-w-none">
                  {currentSubjectPerf?.subject.code || 'No Subject'}
                </span>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                  {currentSubjectPerf?.subject.units || 3} Units
                </span>
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5" title={currentSubjectPerf?.subject.name}>
                {currentSubjectPerf?.subject.name || 'Enrolled Course'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleNextSubject}
              disabled={subjectPerformances.length <= 1}
              className="p-1 sm:p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-25 disabled:cursor-not-allowed transition-all"
              aria-label="Next subject"
              title="Next subject (or swipe left)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card Center: Circular Gauge for Selected Subject */}
          <div className="flex flex-col items-center justify-center py-2.5 text-center space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span>Semestral Grade</span>
            </div>

            <NeuCircularGauge
              value={currentSubjectPerf?.finalGrade || 0}
              label={
                currentSubjectPerf && currentSubjectPerf.finalGrade >= 75
                  ? 'Passing'
                  : 'Action Required'
              }
              size={120}
              color={
                currentSubjectPerf && currentSubjectPerf.finalGrade >= 75
                  ? '#10b981'
                  : '#ef4444'
              }
            />

            <div className="flex items-center gap-2 flex-wrap justify-center">
              <NeuBadge
                variant={
                  currentSubjectPerf?.remarks === 'Honors'
                    ? 'primary'
                    : currentSubjectPerf?.isPassing
                    ? 'success'
                    : 'danger'
                }
              >
                Grade Equiv: {currentSubjectPerf?.gpa ? currentSubjectPerf.gpa.toFixed(2) : '5.00'}{' '}
                {currentSubjectPerf?.remarks ? `• ${currentSubjectPerf.remarks}` : ''}
              </NeuBadge>
              {currentSubjectPerf?.useTransmutation && (
                <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-500/20">
                  ⚡ BCP Annex A
                </span>
              )}
            </div>

            {/* Mini 3-Quarter Period Breakdown for this subject */}
            {currentSubjectPerf && (
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 pt-0.5">
                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800" title="Prelim (30%)">
                  P: {currentSubjectPerf.periods.prelim?.grade ?? 0}%
                </span>
                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800" title="Midterm (30%)">
                  M: {currentSubjectPerf.periods.midterm?.grade ?? 0}%
                </span>
                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800" title="Finals (40%)">
                  F: {currentSubjectPerf.periods.finals?.grade ?? 0}%
                </span>
              </div>
            )}
          </div>

          {/* Card Bottom: Dots Indicator & Swipe Prompt */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center gap-1.5">
            {subjectPerformances.length > 1 && (
              <div className="flex items-center justify-center gap-1.5">
                {subjectPerformances.map((perf, idx) => (
                  <button
                    key={perf.subject.id}
                    type="button"
                    onClick={() => setActiveSubjectIndex(idx)}
                    className={`h-2 rounded-full transition-all ${
                      idx === safeSubjectIndex
                        ? 'w-5 bg-indigo-600 dark:bg-indigo-400'
                        : 'w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                    }`}
                    aria-label={`Go to ${perf.subject.code}`}
                    title={perf.subject.code}
                  />
                ))}
              </div>
            )}

            <div className="flex items-center justify-between w-full text-[10px] text-slate-400 dark:text-slate-500 font-medium px-0.5">
              <span>
                {subjectPerformances.length > 1
                  ? `${safeSubjectIndex + 1} of ${subjectPerformances.length} Subjects`
                  : '1 Enrolled Subject'}
              </span>
              {subjectPerformances.length > 1 && (
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                  Swipe ↔ to switch
                </span>
              )}
            </div>
          </div>
        </NeuCard>

        {/* Attendance Health Gauge */}
        <NeuCard className="flex flex-col items-center justify-center p-4 sm:p-5 text-center space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <CalendarCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Attendance Rate ({currentSubjectPerf?.subject.code || 'Overall'})</span>
          </div>
          <NeuCircularGauge
            value={currentSubjectPerf?.attendanceRate ?? avgAttendance}
            label="Presence Rate"
            size={120}
            color="#10b981"
          />
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {(currentSubjectPerf?.attendanceRate ?? avgAttendance) >= 90
              ? 'Excellent classroom presence'
              : 'Keep attendance high to maintain grade points'}
          </div>
        </NeuCard>

        {/* Quick Insights Card */}
        <NeuCard className="flex flex-col justify-between p-4 sm:p-5 space-y-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Academic Load & Status</span>
            </div>
            <div className="space-y-2.5">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Total Units Enrolled:</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{totalEnrolledUnits} Units ({enrolledSubjects.length} Courses)</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Units Passed:</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {passedUnits} of {totalEnrolledUnits} Units ({subjectPerformances.filter((p) => p.isPassing).length} Passed)
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Period Weights:</span>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">30% P • 30% M • 40% F</span>
              </div>
            </div>
          </div>

          <NeuButton
            variant="secondary"
            size="sm"
            onClick={() => onNavigate('student-matrix')}
            leftIcon={<PieChart className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
            className="w-full mt-1"
          >
            Review Grading Matrix Weights →
          </NeuButton>
        </NeuCard>
      </div>

      {/* Official Consolidated Semestral Report Card Table */}
      <NeuCard className="p-4 sm:p-6 space-y-4 overflow-hidden border border-slate-200/90 dark:border-slate-800/90 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Official Semestral Grade Summary & Report Card
              </h2>
              <NeuBadge variant="primary" size="sm">
                Multi-Subject View
              </NeuBadge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Consolidated evaluation of all enrolled subjects: 30% Prelim + 30% Midterm + 40% Finals. Cumulative GWA is weighted by course credit units on the 1.00 – 5.00 collegiate grading scale.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-800/60 text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">General Weighted Avg</span>
              <span className="text-lg font-black font-mono text-indigo-700 dark:text-indigo-300 tabular-nums">
                {gwa.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="inline-block min-w-full align-middle px-4 sm:px-0">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th scope="col" className="py-3 px-3">#</th>
                  <th scope="col" className="py-3 px-3">Course Code & Title</th>
                  <th scope="col" className="py-3 px-3 text-center">Units</th>
                  <th scope="col" className="py-3 px-3 text-center">Prelim (30%)</th>
                  <th scope="col" className="py-3 px-3 text-center">Midterm (30%)</th>
                  <th scope="col" className="py-3 px-3 text-center">Finals (40%)</th>
                  <th scope="col" className="py-3 px-3 text-center font-bold text-slate-700 dark:text-slate-200">Semestral %</th>
                  <th scope="col" className="py-3 px-3 text-center font-bold text-indigo-600 dark:text-indigo-400">Grade Equiv (1.00 - 5.00)</th>
                  <th scope="col" className="py-3 px-3 text-center">Remarks</th>
                  <th scope="col" className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                {subjectPerformances.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400 dark:text-slate-500">
                      No enrolled subjects found.
                    </td>
                  </tr>
                ) : (
                  subjectPerformances.map((perf, index) => {
                    const subj = perf.subject;
                    const units = subj.units || 3;
                    const prelimGrade = perf.periods.prelim?.grade ?? 0;
                    const midtermGrade = perf.periods.midterm?.grade ?? 0;
                    const finalsGrade = perf.periods.finals?.grade ?? 0;

                    return (
                      <tr
                        key={subj.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-3 text-slate-400 text-xs font-mono">{index + 1}</td>
                        <td className="py-3.5 px-3">
                          <div className="flex flex-col">
                            <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                              {subj.code}
                            </span>
                            <span className="font-semibold text-slate-900 dark:text-white line-clamp-1">
                              {subj.name}
                            </span>
                            {subj.schedule && (
                              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                {subj.schedule}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                          {units}
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono text-slate-700 dark:text-slate-300 tabular-nums">
                          {prelimGrade > 0 ? `${prelimGrade}%` : <span className="text-slate-400 dark:text-slate-600">—</span>}
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono text-slate-700 dark:text-slate-300 tabular-nums">
                          {midtermGrade > 0 ? `${midtermGrade}%` : <span className="text-slate-400 dark:text-slate-600">—</span>}
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono text-slate-700 dark:text-slate-300 tabular-nums">
                          {finalsGrade > 0 ? `${finalsGrade}%` : <span className="text-slate-400 dark:text-slate-600">—</span>}
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                          {perf.finalGrade > 0 ? (
                            <div>
                              <span>{perf.finalGrade}%</span>
                              {perf.useTransmutation && perf.rawFinalGrade !== undefined && (
                                <div className="text-[10px] text-slate-400 font-normal">
                                  Raw: {perf.rawFinalGrade}%
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-600">0%</span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm tabular-nums">
                          {perf.gpa.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-3 text-center">
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
                        <td className="py-3.5 px-3 text-right">
                          <NeuButton
                            variant="secondary"
                            size="sm"
                            onClick={() => onSelectSubject(subj.id)}
                            className="text-xs"
                          >
                            Details
                          </NeuButton>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {subjectPerformances.length > 0 && (
                <tfoot className="bg-slate-50/90 dark:bg-slate-800/80 font-bold border-t-2 border-slate-200 dark:border-slate-700">
                  <tr>
                    <td colSpan={2} className="py-3.5 px-3 text-slate-700 dark:text-slate-200">
                      <div className="flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Cumulative Semestral Summary</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono text-slate-900 dark:text-white">
                      {totalEnrolledUnits} Units
                    </td>
                    <td colSpan={3} className="py-3.5 px-3 text-center text-xs text-slate-500 dark:text-slate-400 font-normal">
                      Passed: <span className="font-bold text-emerald-600 dark:text-emerald-400">{passedUnits} Units</span>
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono text-slate-900 dark:text-white text-sm">
                      {avgGrade}%
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono text-indigo-700 dark:text-indigo-300 text-base">
                      {gwa.toFixed(2)}
                    </td>
                    <td colSpan={2} className="py-3.5 px-3 text-center">
                      <NeuBadge variant={hasHonors ? 'primary' : avgGrade >= 75 ? 'success' : 'danger'}>
                        {hasHonors ? 'Academic Honors' : avgGrade >= 75 ? 'Regular Passing' : 'Academic Warning'}
                      </NeuBadge>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </NeuCard>

      {/* Enrolled Courses & Real-time Record Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Course Drill-Down & Period Cards</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjectPerformances.map((perf) => {
            const subj = perf.subject;

            return (
              <NeuCard
                key={subj.id}
                onClick={() => onSelectSubject(subj.id)}
                interactive
                className="space-y-3.5 flex flex-col justify-between"
              >
                <div>
                  {/* Subject Header */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                        {subj.code}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1.5 leading-snug">
                        {subj.name}
                      </h3>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subj.schedule}</div>
                    </div>

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
                  </div>

                  {/* Computed Semestral Score */}
                  <div className="py-2.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Semestral Final Grade:</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-black font-mono text-slate-900 dark:text-white tabular-nums">{perf.finalGrade}%</span>
                        <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">({perf.gpa.toFixed(2)})</span>
                      </div>
                    </div>

                    {/* 3-Quarter Period mini breakdown */}
                    <div className="grid grid-cols-3 gap-1 sm:gap-1.5 pt-1">
                      {GRADING_PERIODS.map((p) => {
                        const pSumm = perf.periods[p.id];
                        return (
                          <div
                            key={p.id}
                            className="p-1.5 sm:p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 text-center space-y-0.5"
                          >
                            <div className="text-[9.5px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                              {p.shortName} ({p.weight}%)
                            </div>
                            <div className="text-xs sm:text-sm font-black font-mono text-[#1E3A8A] dark:text-blue-300 tabular-nums">
                              {pSumm?.grade || 0}%
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Footer action */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-[#c2410c] dark:text-orange-400">
                  <span>View Full Quarter Breakdown</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </NeuCard>
            );
          })}
        </div>
      </div>
    </div>
  );
};
