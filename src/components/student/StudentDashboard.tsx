import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { NeuCard } from '../common/NeuCard';
import { NeuButton } from '../common/NeuButton';
import { NeuBadge } from '../common/NeuBadge';
import { NeuCircularGauge } from '../common/NeuProgress';
import { calculateStudentSubjectPerformance, convertToGPA } from '../../utils/gradeCalculator';
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
  const { sections, subjects, assessments, scores, attendance } = useData();

  const student = currentUser;
  const enrolledSection = sections.find((s) => s.id === student?.sectionId);
  const enrolledSubjects = subjects.filter((s) => s.sectionId === student?.sectionId);

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

  const totalGradeSum = subjectPerformances.reduce((acc, p) => acc + p.finalGrade, 0);
  const avgGrade =
    subjectPerformances.length > 0
      ? Math.round((totalGradeSum / subjectPerformances.length) * 10) / 10
      : 0;

  const totalAttSum = subjectPerformances.reduce((acc, p) => acc + p.attendanceRate, 0);
  const avgAttendance =
    subjectPerformances.length > 0
      ? Math.round((totalAttSum / subjectPerformances.length) * 10) / 10
      : 100;

  const gpa = convertToGPA(avgGrade);
  const hasHonors = avgGrade >= 90;

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
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-xs">
        <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
          <img
            src={student?.avatar}
            alt={student?.name}
            className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl object-cover ring-2 ring-orange-500/20 shadow-xs shrink-0"
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
            <h1 className="text-lg sm:text-3xl font-bold font-heading text-slate-900 dark:text-white tracking-tight truncate">
              Hello, {student?.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate">
              Student ID: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{student?.studentNumber}</span> •{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">{enrolledSection?.name}</span> ({enrolledSection?.gradeLevelOrYear})
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto shrink-0">
          <NeuButton
            variant="secondary"
            size="md"
            onClick={() => onNavigate('student-simulator')}
            leftIcon={<Calculator className="w-4 h-4 text-[#F97316] dark:text-orange-400" />}
            className="w-full justify-center text-xs sm:text-sm"
          >
            "What-If" Calculator
          </NeuButton>
          <NeuButton
            variant="primary"
            size="md"
            onClick={() => onNavigate('student-subjects')}
            leftIcon={<BookOpen className="w-4 h-4 text-white" />}
            className="w-full justify-center text-xs sm:text-sm shadow-sm"
          >
            View All Records
          </NeuButton>
        </div>
      </div>

      {/* Academic Highlights & Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Overall Standing Gauge */}
        <NeuCard className="flex flex-col items-center justify-center p-4.5 sm:p-6 text-center space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-500" />
            <span>Cumulative Semestral Grade</span>
          </div>
          <NeuCircularGauge
            value={avgGrade}
            label={avgGrade >= 75 ? 'Passing' : 'Action Required'}
            size={135}
          />
          <div className="flex items-center gap-2">
            <NeuBadge variant={hasHonors ? 'primary' : avgGrade >= 75 ? 'success' : 'danger'}>
              GPA: {gpa.toFixed(2)} {hasHonors ? '• Honors' : ''}
            </NeuBadge>
          </div>
        </NeuCard>

        {/* Attendance Health Gauge */}
        <NeuCard className="flex flex-col items-center justify-center p-4.5 sm:p-6 text-center space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <CalendarCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Attendance Health Rate</span>
          </div>
          <NeuCircularGauge
            value={avgAttendance}
            label="Presence Rate"
            size={135}
            color="#10b981"
          />
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {avgAttendance >= 90
              ? 'Excellent classroom presence'
              : 'Keep attendance high to maintain grade points'}
          </div>
        </NeuCard>

        {/* Quick Insights Card */}
        <NeuCard className="flex flex-col justify-between p-4.5 sm:p-6 space-y-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>3-Quarter Period System</span>
            </div>
            <div className="space-y-2.5">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Enrolled Courses:</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{enrolledSubjects.length} Courses</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Passing Standing:</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {subjectPerformances.filter((p) => p.isPassing).length} / {subjectPerformances.length} Passed
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Quarter Weights:</span>
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

      {/* Enrolled Courses & Real-time Record Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>My Enrolled Courses & Period Standing</span>
          </h2>
          <span className="text-xs text-slate-400">Click any course to view score breakdown</span>
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
                      <span className="text-xl font-black text-slate-900 dark:text-white">{perf.finalGrade}%</span>
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
                            <div className="text-xs sm:text-sm font-black text-[#1E3A8A] dark:text-blue-300">
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
