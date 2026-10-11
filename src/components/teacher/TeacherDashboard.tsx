import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { NeuCard } from '../common/NeuCard';
import { NeuButton } from '../common/NeuButton';
import { NeuBadge } from '../common/NeuBadge';
import { NeuProgressBar } from '../common/NeuProgress';
import {
  Users,
  BookOpen,
  Layers,
  Award,
  Plus,
  Table,
  CalendarCheck,
  Sliders,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { calculateStudentSubjectPerformance } from '../../utils/gradeCalculator';
import { isStudentInSection } from '../../utils/enrollmentUtils';

interface TeacherDashboardProps {
  onNavigate: (tab: string, sectionId?: string, subjectId?: string) => void;
  onOpenSectionModal: () => void;
  onOpenSubjectModal: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  onNavigate,
  onOpenSectionModal,
  onOpenSubjectModal,
}) => {
  const { currentUser, isDean } = useAuth();
  const { sections, subjects, assessments, scores, attendance, students, teachers } = useData();

  // Dean oversight toggle: Deans can view all courses in the college or only their own courses
  const [deanViewAll, setDeanViewAll] = useState(isDean);

  // Scoped subjects: regular instructors only see subjects assigned to their user ID
  const accessibleSubjects = isDean && deanViewAll
    ? subjects
    : subjects.filter((s) => s.teacherId === currentUser?.id);

  // Scoped sections: sections where instructor is adviser OR teaches at least one course
  const accessibleSections = isDean && deanViewAll
    ? sections
    : sections.filter((sec) => sec.adviserId === currentUser?.id || subjects.some((s) => s.sectionId === sec.id && s.teacherId === currentUser?.id));

  // Compute stats strictly across accessible subjects
  let totalGradePoints = 0;
  let totalEvaluations = 0;
  let passingCount = 0;

  accessibleSubjects.forEach((subj) => {
    const sectionStudents = students.filter((s) => isStudentInSection(s, subj.sectionId));
    sectionStudents.forEach((stud) => {
      const perf = calculateStudentSubjectPerformance(
        subj,
        stud,
        assessments,
        scores,
        attendance
      );
      totalGradePoints += perf.finalGrade;
      totalEvaluations++;
      if (perf.isPassing) passingCount++;
    });
  });

  const overallAvgGrade = totalEvaluations > 0 ? Math.round((totalGradePoints / totalEvaluations) * 10) / 10 : 0;
  const overallPassingRate = totalEvaluations > 0 ? Math.round((passingCount / totalEvaluations) * 100) : 0;

  // Number of unique enrolled students in accessible courses
  const enrolledStudentCount = new Set(
    accessibleSubjects.flatMap((subj) => students.filter((s) => isStudentInSection(s, subj.sectionId)).map((s) => s.id))
  ).size;

  const currentAcademicYear = sections[0]?.academicYear || '2026-2027';
  const currentSemester = sections[0]?.semester || '1st Semester';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <div className="bg-white/95 dark:bg-[#0d1424] border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-6 sm:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xs dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1E3A8A] dark:text-blue-400">
              {isDean ? 'Dean Administration' : 'Instructor Dashboard'}
            </span>
            <NeuBadge variant="primary" size="sm">
              {currentAcademicYear} • {currentSemester}
            </NeuBadge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-slate-900 dark:text-white tracking-tight">
            Welcome back, {currentUser?.name}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Manage your classroom sections, customize grading matrices per course, record attendance, and monitor student academic performance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {isDean && (
            <NeuButton
              variant="secondary"
              size="md"
              onClick={() => onNavigate('faculty')}
              leftIcon={<Users className="w-4 h-4 text-slate-600 dark:text-slate-300" />}
            >
              Manage Faculty ({teachers.length})
            </NeuButton>
          )}
          <NeuButton
            variant="secondary"
            size="md"
            onClick={onOpenSectionModal}
            leftIcon={<Plus className="w-4 h-4 text-slate-600 dark:text-slate-300" />}
          >
            New Class
          </NeuButton>
          <NeuButton
            variant="primary"
            size="md"
            onClick={onOpenSubjectModal}
            leftIcon={<Plus className="w-4 h-4 text-white" />}
          >
            New Course
          </NeuButton>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <NeuCard className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#1E3A8A] dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">
              {accessibleSections.length}
            </div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {isDean && deanViewAll ? 'Total College Classes' : 'My Assigned Classes'}
            </div>
          </div>
        </NeuCard>

        <NeuCard className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">{accessibleSubjects.length}</div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Courses</div>
          </div>
        </NeuCard>

        <NeuCard className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900/50 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">{enrolledStudentCount}</div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Enrolled Students</div>
          </div>
        </NeuCard>

        <NeuCard className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">{overallAvgGrade}%</div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Class Average Grade</div>
          </div>
        </NeuCard>
      </div>

      {/* Quick Launchers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigate('gradebook')}
          className="p-5 rounded-2xl bg-white/95 dark:bg-[#0d1424] border border-slate-200/90 dark:border-slate-800/90 hover:border-[#1E3A8A]/40 dark:hover:border-blue-500/40 hover:shadow-md cursor-pointer transition-all duration-200 flex flex-col justify-between gap-3 group active:scale-[0.99]"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-[#1E3A8A] dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
              <Table className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#1E3A8A] dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Open Gradebook</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Multi-column spreadsheet for Quizzes, Activities, Projects & Exams.
            </p>
          </div>
        </div>

        <div
          onClick={() => onNavigate('attendance')}
          className="p-5 rounded-2xl bg-white/95 dark:bg-[#0d1424] border border-slate-200/90 dark:border-slate-800/90 hover:border-emerald-500/40 dark:hover:border-emerald-500/40 hover:shadow-md cursor-pointer transition-all duration-200 flex flex-col justify-between gap-3 group active:scale-[0.99]"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Take Daily Attendance</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Roll call with Present, Late, Absent, or Excused status tracking.
            </p>
          </div>
        </div>

        <div
          onClick={() => onNavigate('subjects')}
          className="p-5 rounded-2xl bg-white/95 dark:bg-[#0d1424] border border-slate-200/90 dark:border-slate-800/90 hover:border-orange-500/40 dark:hover:border-orange-500/40 hover:shadow-md cursor-pointer transition-all duration-200 flex flex-col justify-between gap-3 group active:scale-[0.99]"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950 text-[#F97316] dark:text-orange-400 border border-orange-100 dark:border-orange-900/50">
              <Sliders className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#F97316] dark:group-hover:text-orange-400 group-hover:translate-x-1 transition-all" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Grading Matrices</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Customize percentage weights per course with real-time 100% validation.
            </p>
          </div>
        </div>
      </div>

      {/* Classes Overview & Course List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Classes & Subjects */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-0.5">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Classes & Active Courses</span>
            </h2>

            <div className="flex items-center gap-2">
              {/* Dean Oversight Switcher */}
              {isDean && (
                <div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
                  <button
                    onClick={() => setDeanViewAll(true)}
                    className={`px-2 py-0.5 rounded-lg font-semibold transition-all ${
                      deanViewAll
                        ? 'bg-white dark:bg-[#0d1424] text-[#1E3A8A] dark:text-blue-400 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    All Courses ({subjects.length})
                  </button>
                  <button
                    onClick={() => setDeanViewAll(false)}
                    className={`px-2 py-0.5 rounded-lg font-semibold transition-all ${
                      !deanViewAll
                        ? 'bg-white dark:bg-[#0d1424] text-[#1E3A8A] dark:text-blue-400 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    My Courses ({subjects.filter((s) => s.teacherId === currentUser?.id).length})
                  </button>
                </div>
              )}

              <button
                onClick={() => onNavigate('sections')}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {isDean ? 'View All Classes →' : 'Manage Classes →'}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {accessibleSections.length === 0 ? (
              <NeuCard className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-[#1E3A8A] dark:text-blue-400 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center mx-auto shadow-2xs">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    No Assigned Classes Yet
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
                    You do not have any classes or teaching courses created yet. Click below to create your class or course.
                  </p>
                </div>
                <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
                  <NeuButton
                    variant="primary"
                    size="sm"
                    onClick={onOpenSectionModal}
                    leftIcon={<Plus className="w-4 h-4 text-white" />}
                  >
                    Create New Class
                  </NeuButton>
                  <NeuButton
                    variant="secondary"
                    size="sm"
                    onClick={() => onNavigate('sections')}
                  >
                    Manage Classes
                  </NeuButton>
                </div>
              </NeuCard>
            ) : (
              accessibleSections.map((sec) => {
                const secSubjects = accessibleSubjects.filter((s) => s.sectionId === sec.id);
                const secStudents = students.filter((s) => isStudentInSection(s, sec.id));

                return (
                  <NeuCard key={sec.id} className="space-y-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">{sec.name}</h3>
                          <NeuBadge variant="primary" size="sm">
                            {sec.gradeLevelOrYear}
                          </NeuBadge>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sec.description || sec.academicYear}</p>
                      </div>

                      <div className="flex items-center gap-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                        <span>{secStudents.length} Students</span>
                        <span>•</span>
                        <span>{secSubjects.length} Courses</span>
                      </div>
                    </div>

                    {/* Subject Chips */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {secSubjects.map((subj) => {
                        const instructor = teachers.find((t) => t.id === subj.teacherId);
                        return (
                          <div
                            key={subj.id}
                            onClick={() => onNavigate('gradebook', sec.id, subj.id)}
                            className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 cursor-pointer transition-all flex flex-col justify-between gap-2 group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                  {subj.code}
                                </span>
                                <h4 className="text-sm font-semibold text-slate-900 dark:text-white leading-tight mt-0.5">
                                  {subj.name}
                                </h4>
                                {isDean && deanViewAll && instructor && (
                                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
                                    Faculty: {instructor.name}
                                  </p>
                                )}
                              </div>
                              <NeuBadge variant="neutral" size="sm">
                                {subj.matrix.length} Matrix Items
                              </NeuBadge>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                              <span>{subj.schedule || 'MWF'}</span>
                              <span className="text-indigo-600 dark:text-indigo-400 font-semibold group-hover:underline">
                                Gradebook →
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </NeuCard>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Assessment Logs & Standing */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Assessment Activity</span>
            </h2>
          </div>

          <NeuCard className="space-y-4">
            <div className="space-y-2.5">
              {assessments.slice(0, 5).map((ass) => {
                const subj = subjects.find((s) => s.id === ass.subjectId);
                const category = subj?.matrix.find((c) => c.id === ass.categoryId);

                return (
                  <div
                    key={ass.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {ass.title}
                      </span>
                      <NeuBadge variant="info" size="sm">
                        {ass.maxScore} pts
                      </NeuBadge>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{subj?.code} • {category?.name || 'Graded'}</span>
                      <span>{ass.date}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-1.5">Class Passing Health</div>
              <NeuProgressBar value={overallPassingRate} showValue={true} />
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {passingCount} of {totalEvaluations} evaluations meeting passing threshold
              </div>
            </div>
          </NeuCard>
        </div>
      </div>
    </div>
  );
};
