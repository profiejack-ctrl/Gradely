import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Subject, AttendanceStatus, GradingPeriod, GRADING_PERIODS, Assessment } from '../../types';
import { NeuCard } from '../common/NeuCard';
import { NeuButton } from '../common/NeuButton';
import { NeuBadge } from '../common/NeuBadge';
import { NeuSegmentedControl } from '../common/NeuToggle';
import { NeuCircularGauge } from '../common/NeuProgress';
import {
  calculateStudentSubjectPerformance,
  calculateAttendanceStats,
} from '../../utils/gradeCalculator';
import { getStudentEnrolledSubjects } from '../../utils/enrollmentUtils';
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  XCircle,
  HelpCircle,
  Calculator,
  ArrowLeft,
  Award,
  Layers,
} from 'lucide-react';

interface StudentSubjectViewProps {
  selectedSubjectId?: string;
  onBack: () => void;
  onOpenSimulator: (subjectId: string) => void;
}

type PeriodTabMode = 'all-semestral' | GradingPeriod;
type RecordTypeTab = 'all' | 'attendance' | 'quizzes' | 'activities' | 'projects' | 'exams';

export const StudentSubjectView: React.FC<StudentSubjectViewProps> = ({
  selectedSubjectId,
  onBack,
  onOpenSimulator,
}) => {
  const { currentUser } = useAuth();
  const { allUsers, subjects, assessments, scores, attendance } = useData();

  // Authoritatively resolve student from DataContext, falling back to currentUser
  const student = (currentUser ? allUsers.find((u) => u.id === currentUser.id) : null) || currentUser;
  const enrolledSubjects = getStudentEnrolledSubjects(
    student,
    subjects,
    assessments,
    scores,
    attendance
  );

  const [activeSubjectId, setActiveSubjectId] = useState<string>(
    selectedSubjectId || enrolledSubjects[0]?.id || ''
  );

  React.useEffect(() => {
    if (selectedSubjectId && enrolledSubjects.some((s) => s.id === selectedSubjectId)) {
      setActiveSubjectId(selectedSubjectId);
    } else if (enrolledSubjects.length > 0 && !enrolledSubjects.some((s) => s.id === activeSubjectId)) {
      setActiveSubjectId(enrolledSubjects[0].id);
    }
  }, [selectedSubjectId, enrolledSubjects, activeSubjectId]);

  const [activePeriod, setActivePeriod] = useState<PeriodTabMode>('all-semestral');
  const [activeRecordType, setActiveRecordType] = useState<RecordTypeTab>('all');

  const currentSubject: Subject | undefined =
    enrolledSubjects.find((s) => s.id === activeSubjectId) || enrolledSubjects[0];

  if (!currentSubject || !student) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">No Course Selected</h2>
        <NeuButton variant="secondary" onClick={onBack}>
          Return to Dashboard
        </NeuButton>
      </div>
    );
  }

  // Calculate full semestral and period performance
  const perf = calculateStudentSubjectPerformance(
    currentSubject,
    student,
    assessments,
    scores,
    attendance
  );

  const activePeriodSummary =
    activePeriod !== 'all-semestral'
      ? perf.periods[activePeriod]
      : null;

  const attStats = calculateAttendanceStats(
    attendance,
    student.id,
    currentSubject.id,
    activePeriod !== 'all-semestral' ? activePeriod : undefined
  );

  // Filter assessments based on active period tab
  const allSubjectAssessments = assessments.filter((a) => a.subjectId === currentSubject.id);
  const displayedAssessments = allSubjectAssessments.filter((a) => {
    if (activePeriod === 'all-semestral') return true;
    return (a.period || 'prelim') === activePeriod;
  });

  const subjectAttendance = attendance.filter((a) => {
    if (a.subjectId !== currentSubject.id || a.studentId !== student.id) return false;
    if (activePeriod === 'all-semestral') return true;
    return !a.period || a.period === activePeriod;
  });

  // Group assessments by category
  const quizzes = displayedAssessments.filter(
    (a) => a.title.toLowerCase().includes('quiz') || a.categoryId.includes('quiz')
  );
  const activities = displayedAssessments.filter(
    (a) =>
      a.title.toLowerCase().includes('lab') ||
      a.title.toLowerCase().includes('act') ||
      a.title.toLowerCase().includes('pt') ||
      a.categoryId.includes('act') ||
      a.categoryId.includes('pt') ||
      a.categoryId.includes('lab')
  );
  const projects = displayedAssessments.filter(
    (a) =>
      a.title.toLowerCase().includes('proj') ||
      a.title.toLowerCase().includes('capstone') ||
      a.categoryId.includes('proj')
  );
  const exams = displayedAssessments.filter(
    (a) =>
      a.title.toLowerCase().includes('exam') ||
      a.title.toLowerCase().includes('term') ||
      a.categoryId.includes('exam')
  );

  const recordTypeOptions = [
    { value: 'all', label: 'All Records', badge: displayedAssessments.length + subjectAttendance.length },
    { value: 'attendance', label: 'Attendance', badge: `${attStats.rate}%` },
    { value: 'quizzes', label: 'Quizzes', badge: quizzes.length },
    { value: 'activities', label: 'Performance Tasks', badge: activities.length },
    { value: 'projects', label: 'Projects', badge: projects.length },
    { value: 'exams', label: 'Exams', badge: exams.length },
  ];

  const renderAttendanceStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case 'present':
        return (
          <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Present
          </span>
        );
      case 'late':
        return (
          <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Late (+0.5)
          </span>
        );
      case 'absent':
        return (
          <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> Absent (0)
          </span>
        );
      case 'excused':
        return (
          <span className="px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 text-xs font-semibold flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" /> Excused Pass
          </span>
        );
    }
  };

  const renderAssessmentCard = (ass: Assessment) => {
    const scoreRec = scores.find((s) => s.assessmentId === ass.id && s.studentId === student.id);
    const earned = scoreRec?.score !== undefined ? scoreRec.score : null;
    const percentage = earned !== null ? Math.round((earned / ass.maxScore) * 100) : null;
    const cat = currentSubject.matrix.find((c) => c.id === ass.categoryId || c.id === ass.parentCategoryId);

    return (
      <div
        key={ass.id}
        className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
      >
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{ass.title}</h4>
            <NeuBadge variant="neutral" size="sm">
              {cat?.name || 'Assessment'}
            </NeuBadge>
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {(ass.period || 'prelim').toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Recorded: {ass.date} {ass.description ? `• ${ass.description}` : ''}
          </p>
          {scoreRec?.remarks && (
            <p className="text-xs font-medium text-orange-600 dark:text-orange-400 mt-0.5">
              Teacher Feedback: "{scoreRec.remarks}"
            </p>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
          <div className="text-left sm:text-right">
            <div className="text-base font-bold text-slate-900 dark:text-white">
              {earned !== null ? `${earned} / ${ass.maxScore}` : `Not Graded`}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              {percentage !== null ? `${percentage}% Earned` : 'Pending'}
            </div>
          </div>

          <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
            <span className={percentage !== null && percentage >= 75 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
              {percentage !== null ? `${percentage}%` : '—'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top Breadcrumb & Course Selector */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <NeuButton variant="secondary" size="icon" onClick={onBack} title="Back to Overview">
            <ArrowLeft className="w-4 h-4 text-slate-700 dark:text-slate-200" />
          </NeuButton>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold text-[#1E3A8A] dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
                {currentSubject.code}
              </span>
              <h1 className="text-base sm:text-xl font-bold font-heading text-slate-900 dark:text-white truncate">
                {currentSubject.name}
              </h1>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {currentSubject.schedule} • Pass Target: {currentSubject.passingGrade}%
            </p>
          </div>
        </div>

        {/* Switch Subject Dropdown */}
        <div className="grid grid-cols-1 sm:flex sm:items-center gap-2 w-full sm:w-auto">
          <select
            value={activeSubjectId}
            onChange={(e) => setActiveSubjectId(e.target.value)}
            className="bg-white dark:bg-[#0d1424] border border-slate-200/90 dark:border-slate-800 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none cursor-pointer w-full sm:w-auto shadow-xs"
          >
            {enrolledSubjects.map((s) => (
              <option key={s.id} value={s.id} className="bg-white dark:bg-[#0d1424]">
                {s.code} - {s.name}
              </option>
            ))}
          </select>

          <NeuButton
            variant="primary"
            size="sm"
            onClick={() => onOpenSimulator(currentSubject.id)}
            leftIcon={<Calculator className="w-3.5 h-3.5 text-white" />}
            className="w-full sm:w-auto justify-center shadow-sm"
          >
            "What-If" Calculator
          </NeuButton>
        </div>
      </div>

      {/* 3-Quarter Period Switcher Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 bg-slate-100/80 dark:bg-[#090e1a]/80 rounded-2xl border border-slate-200/90 dark:border-slate-800/90">
        <button
          onClick={() => setActivePeriod('all-semestral')}
          className={`px-2.5 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all text-center truncate ${
            activePeriod === 'all-semestral'
              ? 'bg-white dark:bg-[#0d1424] text-[#1E3A8A] dark:text-blue-300 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          🌟 Semestral ({perf.finalGrade}%)
        </button>

        {GRADING_PERIODS.map((p) => {
          const isSelected = activePeriod === p.id;
          const pSumm = perf.periods[p.id];
          return (
            <button
              key={p.id}
              onClick={() => setActivePeriod(p.id)}
              className={`px-2 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all text-center truncate ${
                isSelected
                  ? 'bg-white dark:bg-[#0d1424] text-[#F97316] dark:text-orange-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {p.shortName} ({p.weight}%) • {pSumm?.grade || 0}%
            </button>
          );
        })}
      </div>

      {/* Grade Computation & Matrix Breakdown Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Score Gauge Card */}
        <NeuCard className="flex flex-col items-center justify-center p-6 text-center space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>
              {activePeriod === 'all-semestral'
                ? 'Semestral Standing (100%)'
                : `${activePeriod.toUpperCase()} Period Grade (${activePeriodSummary?.weight}% Weight)`}
            </span>
          </div>
          <NeuCircularGauge
            value={activePeriod === 'all-semestral' ? perf.finalGrade : (activePeriodSummary?.grade || 0)}
            label={activePeriod === 'all-semestral' ? perf.remarks : (activePeriodSummary?.isPassing ? 'Passing' : 'Below Passing')}
            size={135}
          />
          <div className="flex items-center gap-2">
            <NeuBadge
              variant={
                (activePeriod === 'all-semestral' ? perf.isPassing : activePeriodSummary?.isPassing)
                  ? 'success'
                  : 'danger'
              }
            >
              {(activePeriod === 'all-semestral' ? perf.isPassing : activePeriodSummary?.isPassing)
                ? 'Passing Target Met'
                : 'Below Passing'}
            </NeuBadge>
            {activePeriod === 'all-semestral' && (
              <NeuBadge variant={perf.isPassing ? 'primary' : 'danger'}>
                Grade Equiv: {perf.gpa.toFixed(2)}
              </NeuBadge>
            )}
          </div>
        </NeuCard>

        {/* 3-Quarter Term Cards or Category Matrix */}
        <NeuCard className="lg:col-span-2 space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {activePeriod === 'all-semestral'
                  ? '3-Quarter Period Breakdown (30% Prelim + 30% Midterm + 40% Finals)'
                  : `${activePeriod.toUpperCase()} Period Grading Matrix (${activePeriodSummary?.weight}% of Semestral Grade)`}
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Passing: {currentSubject.passingGrade}%
            </span>
          </div>

          {activePeriod === 'all-semestral' ? (
            /* Semestral 3-Quarter Cards */
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {GRADING_PERIODS.map((p) => {
                const pSumm = perf.periods[p.id];
                return (
                  <button
                    key={p.id}
                    onClick={() => setActivePeriod(p.id)}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between text-left hover:border-indigo-400 transition-all group"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {p.shortName}
                        </span>
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950">
                          {p.weight}% Term
                        </span>
                      </div>
                      <div className="text-2xl font-black text-slate-900 dark:text-white mt-1.5">
                        {pSumm?.grade || 0}%
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {pSumm?.assessmentCount || 0} Graded Items
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 group-hover:underline">
                      View {p.shortName} Records →
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            /* Period Specific Matrix Categories */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {activePeriodSummary?.categories.map((catSummary) => (
                <div
                  key={catSummary.category.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {catSummary.category.name}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {catSummary.category.weight}% Weight
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      Score: {catSummary.rawPercentage}%
                    </span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      +{catSummary.weightedContribution}% pts
                    </span>
                  </div>

                  <div className="w-full bg-slate-200/70 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-600 dark:bg-indigo-500"
                      style={{ width: `${Math.min(100, catSummary.rawPercentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </NeuCard>
      </div>

      {/* Record Category Tabs */}
      <div className="space-y-3.5">
        <NeuSegmentedControl
          options={recordTypeOptions}
          value={activeRecordType}
          onChange={(val) => setActiveRecordType(val as RecordTypeTab)}
        />

        {/* Graded Assessment Tasks */}
        {(activeRecordType === 'all' ||
          activeRecordType === 'quizzes' ||
          activeRecordType === 'activities' ||
          activeRecordType === 'projects' ||
          activeRecordType === 'exams') && (
          <div className="space-y-2.5">
            {activeRecordType === 'all' && (
              <div className="flex items-center justify-between px-0.5 pt-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {activePeriod === 'all-semestral'
                    ? `All Graded Tasks (${displayedAssessments.length})`
                    : `${activePeriod.toUpperCase()} Period Graded Tasks (${displayedAssessments.length})`}
                </h3>
              </div>
            )}

            {activeRecordType === 'all' &&
              (displayedAssessments.length > 0 ? (
                displayedAssessments.map((ass) => renderAssessmentCard(ass))
              ) : (
                <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                  No assessments recorded for this period yet.
                </div>
              ))}

            {activeRecordType === 'quizzes' && (
              quizzes.length > 0 ? (
                quizzes.map((ass) => renderAssessmentCard(ass))
              ) : (
                <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                  No quizzes recorded for this period yet.
                </div>
              )
            )}

            {activeRecordType === 'activities' && (
              activities.length > 0 ? (
                activities.map((ass) => renderAssessmentCard(ass))
              ) : (
                <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                  No lab exercises or performance tasks recorded for this period yet.
                </div>
              )
            )}

            {activeRecordType === 'projects' && (
              projects.length > 0 ? (
                projects.map((ass) => renderAssessmentCard(ass))
              ) : (
                <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                  No project submissions recorded for this period yet.
                </div>
              )
            )}

            {activeRecordType === 'exams' && (
              exams.length > 0 ? (
                exams.map((ass) => renderAssessmentCard(ass))
              ) : (
                <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                  No examinations recorded for this period yet.
                </div>
              )
            )}
          </div>
        )}

        {/* Tab: Attendance Log */}
        {(activeRecordType === 'all' || activeRecordType === 'attendance') && (
          <div className="space-y-2.5 pt-3">
            <div className="flex items-center justify-between px-0.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <CalendarCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Attendance Roll-Call Logs ({subjectAttendance.length} Sessions)
              </h3>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                Attendance Rate: {attStats.rate}%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {subjectAttendance.length === 0 ? (
                <div className="col-span-3 p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                  No attendance roll-calls recorded for this subject yet.
                </div>
              ) : (
                subjectAttendance.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2.5 shadow-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{rec.date}</span>
                        {rec.period && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {rec.period}
                          </span>
                        )}
                      </div>
                      {rec.note && <div className="text-[11px] text-slate-500 mt-0.5">{rec.note}</div>}
                    </div>
                    {renderAttendanceStatusBadge(rec.status)}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
