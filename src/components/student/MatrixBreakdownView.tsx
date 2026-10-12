import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { NeuCard } from '../common/NeuCard';
import { NeuBadge } from '../common/NeuBadge';
import { calculateStudentSubjectPerformance } from '../../utils/gradeCalculator';
import { getStudentEnrolledSubjects } from '../../utils/enrollmentUtils';
import { PieChart, Sparkles } from 'lucide-react';

export const MatrixBreakdownView: React.FC = () => {
  const { currentUser } = useAuth();
  const { allUsers, subjects, assessments, scores, attendance } = useData();

  const student = (currentUser ? allUsers.find((u) => u.id === currentUser.id) : null) || currentUser;
  const enrolledSubjects = getStudentEnrolledSubjects(
    student,
    subjects,
    assessments,
    scores,
    attendance
  );

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <PieChart className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Course Grading Matrix Breakdown
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Complete transparent formula and weight allocations customized by your instructors for each enrolled subject.
        </p>
      </div>

      {/* Subject Matrices */}
      <div className="space-y-4">
        {enrolledSubjects.map((subj) => {
          const perf = calculateStudentSubjectPerformance(
            subj,
            student!,
            assessments,
            scores,
            attendance
          );

          return (
            <NeuCard key={subj.id} className="space-y-4">
              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                      {subj.code}
                    </span>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">{subj.name}</h2>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Passing Grade: <span className="font-semibold text-slate-800 dark:text-slate-200">{subj.passingGrade}%</span> • Instructor: Prof. Alex Mercer
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                  <div className="text-left sm:text-right">
                    <div className="text-[11px] sm:text-xs text-slate-500 font-medium">Your Semestral Grade</div>
                    <div className="text-lg sm:text-xl font-bold text-indigo-600 dark:text-indigo-400">{perf.finalGrade}%</div>
                  </div>
                  <NeuBadge variant={perf.isPassing ? 'success' : 'danger'}>
                    {perf.remarks}
                  </NeuBadge>
                </div>
              </div>

              {/* Matrix Criteria Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {perf.categories.map((catSummary) => {
                  return (
                    <div
                      key={catSummary.category.id}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between gap-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            {catSummary.category.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {catSummary.category.description || 'Assessment component'}
                          </p>
                        </div>
                        <NeuBadge variant="neutral" size="sm">
                          {catSummary.category.weight}%
                        </NeuBadge>
                      </div>

                      <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-700/80">
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>Raw Score:</span>
                          <span className="text-slate-900 dark:text-slate-100 font-semibold">
                            {catSummary.rawPercentage}% ({catSummary.assessmentCount} items)
                          </span>
                        </div>

                        <div className="flex justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          <span>Contribution:</span>
                          <span>+{catSummary.weightedContribution}% pts</span>
                        </div>

                        <div className="w-full bg-slate-200/70 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full rounded-full bg-indigo-600 dark:bg-indigo-500"
                            style={{ width: `${Math.min(100, catSummary.rawPercentage)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mathematical Formula Explanation */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-500">
                <span className="flex items-center gap-1.5 font-medium flex-wrap">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="break-words">
                    Final Grade = {perf.categories.map((c) => `(${c.rawPercentage}% × ${c.category.weight}%)`).join(' + ')}
                  </span>
                </span>
                <span className="font-bold text-slate-900 dark:text-white text-sm shrink-0 self-end sm:self-auto">
                  = {perf.finalGrade}%
                </span>
              </div>
            </NeuCard>
          );
        })}
      </div>
    </div>
  );
};
