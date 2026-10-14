import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Subject, LearningPlan, GradingPeriod } from '../../types';
import { NeuCard } from '../common/NeuCard';
import { NeuButton } from '../common/NeuButton';
import { NeuSelect, NeuInput } from '../common/NeuInput';
import { getStudentEnrolledSubjects, normalizeCourseCode } from '../../utils/enrollmentUtils';
import {
  Sparkles,
  BookOpen,
  FileText,
  CheckCircle2,
  Search,
  Check,
  Copy,
  Printer,
  GraduationCap,
  Clock,
} from 'lucide-react';

interface StudentLearningPlanViewProps {
  initialSubjectId?: string;
  onNavigateToScores?: (subjectId: string) => void;
}

export const StudentLearningPlanView: React.FC<StudentLearningPlanViewProps> = ({
  initialSubjectId,
  onNavigateToScores,
}) => {
  const { currentUser } = useAuth();
  const { allUsers, subjects, assessments, scores, attendance, getLearningPlanBySubjectId } = useData();

  const student = (currentUser ? allUsers.find((u) => u.id === currentUser.id) : null) || currentUser;

  const rawEnrolledSubjects = getStudentEnrolledSubjects(
    student,
    subjects,
    assessments,
    scores,
    attendance
  );

  // Deduplicate enrolled subjects by course code so multi-section enrollments share one clean entry
  const enrolledSubjects = React.useMemo(() => {
    const seen = new Set<string>();
    return rawEnrolledSubjects.filter((s) => {
      const code = normalizeCourseCode(s.code, s.name) || s.id;
      if (seen.has(code)) return false;
      seen.add(code);
      return true;
    });
  }, [rawEnrolledSubjects]);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    initialSubjectId || enrolledSubjects[0]?.id || ''
  );

  React.useEffect(() => {
    if (initialSubjectId && enrolledSubjects.some((s) => s.id === initialSubjectId)) {
      setSelectedSubjectId(initialSubjectId);
    } else if (enrolledSubjects.length > 0 && !enrolledSubjects.some((s) => s.id === selectedSubjectId)) {
      setSelectedSubjectId(enrolledSubjects[0].id);
    }
  }, [initialSubjectId, enrolledSubjects, selectedSubjectId]);

  const currentSubject: Subject | undefined =
    enrolledSubjects.find((s) => s.id === selectedSubjectId) || enrolledSubjects[0];

  const currentPlan: LearningPlan | undefined = currentSubject
    ? getLearningPlanBySubjectId(currentSubject.id)
    : undefined;

  // Filter ONLY published topics
  const allWeeklyTopics = currentPlan?.weeklyTopics || [];
  const publishedTopics = allWeeklyTopics.filter((t) => t.isPublished);

  const [selectedPeriod, setSelectedPeriod] = useState<'all' | GradingPeriod>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [completedTopicIds, setCompletedTopicIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`gradely_student_completed_topics_${student?.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleTopicCompleted = (topicId: string) => {
    setCompletedTopicIds((prev) => {
      const updated = prev.includes(topicId)
        ? prev.filter((id) => id !== topicId)
        : [...prev, topicId];
      try {
        localStorage.setItem(`gradely_student_completed_topics_${student?.id}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const filteredTopics = publishedTopics
    .filter((t) => (selectedPeriod === 'all' ? true : t.period === selectedPeriod))
    .filter(
      (t) =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.topics.some((sub) => sub.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  const [copiedTopicId, setCopiedTopicId] = useState<string | null>(null);

  const handleCopyNotes = (topicId: string, notesText?: string) => {
    if (!notesText) return;
    navigator.clipboard.writeText(notesText);
    setCopiedTopicId(topicId);
    setTimeout(() => setCopiedTopicId(null), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  if (enrolledSubjects.length === 0 || !currentSubject) {
    return (
      <div className="p-8 sm:p-12 text-center bg-white dark:bg-[#0d1424] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-xl mx-auto my-8 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-[#F97316] flex items-center justify-center mx-auto shadow-inner">
          <BookOpen className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">No Enrolled Courses Found</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
          You are not currently enrolled in any active classes or subjects. Please check with your adviser or department head.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in print:space-y-4">
      {/* ========================================================================= */}
      {/* TOP BAR & COURSE SELECTOR                                                 */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 dark:bg-[#0d1424]/80 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs print:hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/50 text-[#F97316]">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Course Learning Plan & Study Guides
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            View course syllabus objectives, weekly topics, and lecture study notes published by your instructor.
          </p>
        </div>

        {/* Course Dropdown */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-64 sm:w-72">
            <NeuSelect
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              options={enrolledSubjects.map((s) => ({
                value: s.id,
                label: `${s.code} - ${s.name}`,
              }))}
            />
          </div>

          <NeuButton
            variant="secondary"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer className="w-3.5 h-3.5 text-slate-500" />}
          >
            Print
          </NeuButton>

          {onNavigateToScores && (
            <NeuButton
              variant="secondary"
              size="sm"
              onClick={() => onNavigateToScores(currentSubject.id)}
              leftIcon={<GraduationCap className="w-3.5 h-3.5 text-blue-500" />}
            >
              My Grades
            </NeuButton>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* COURSE OVERVIEW BANNER                                                    */}
      {/* ========================================================================= */}
      <NeuCard className="p-5 sm:p-6 bg-white dark:bg-[#0d1424] space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md bg-orange-100 dark:bg-orange-950/60 text-[#c2410c] dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                {currentSubject.code}
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                {currentSubject.name}
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {currentPlan?.description || `Curriculum and weekly learning outline for ${currentSubject.name}.`}
            </p>
          </div>

          {/* Quick Study Progress */}
          <div className="p-3 rounded-xl bg-orange-50/60 dark:bg-orange-950/30 border border-orange-200/80 dark:border-orange-900/40 text-xs shrink-0 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F97316] text-white flex items-center justify-center font-bold">
              {publishedTopics.length > 0
                ? `${Math.round((completedTopicIds.filter((id) => publishedTopics.some((t) => t.id === id)).length / publishedTopics.length) * 100)}%`
                : '0%'}
            </div>
            <div>
              <div className="font-bold text-slate-900 dark:text-white">Study Progress</div>
              <div className="text-[11px] text-slate-500">
                {completedTopicIds.filter((id) => publishedTopics.some((t) => t.id === id)).length} of {publishedTopics.length} modules reviewed
              </div>
            </div>
          </div>
        </div>

        {/* Course Outcomes if defined */}
        {currentPlan?.learningOutcomes && currentPlan.learningOutcomes.length > 0 && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Target Course Learning Outcomes</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
              {currentPlan.learningOutcomes.map((outcome, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                  <span className="w-5 h-5 rounded-md bg-orange-100 dark:bg-orange-950/40 text-[#c2410c] dark:text-orange-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="leading-snug">{outcome}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </NeuCard>

      {/* ========================================================================= */}
      {/* FILTER & SEARCH TOOLBAR                                                   */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Period Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-white dark:bg-[#0d1424] border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto shadow-2xs">
          {(['all', 'prelim', 'midterm', 'finals'] as const).map((period) => {
            const isActive = selectedPeriod === period;
            return (
              <button
                key={period}
                type="button"
                onClick={() => setSelectedPeriod(period)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize whitespace-nowrap ${
                  isActive
                    ? 'bg-[#F97316] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {period === 'all' ? 'All Published Weeks' : `${period} Period`}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <NeuInput
            type="text"
            placeholder="Search topics or study notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-3.5 h-3.5 text-slate-400" />}
            className="text-xs"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PUBLISHED WEEKLY TOPICS & LECTURE NOTES                                  */}
      {/* ========================================================================= */}
      {publishedTopics.length === 0 ? (
        <div className="p-8 sm:p-12 text-center bg-white dark:bg-[#0d1424] rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            Curriculum Modules Currently in Preparation
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Your instructor has not published weekly topics or study notes for this course yet. Once published, your week-by-week study materials and lecture guides will appear here.
          </p>
        </div>
      ) : filteredTopics.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-[#0d1424] rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
          No published topics found matching "{searchQuery}".
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTopics.map((topic) => {
            const isCompleted = completedTopicIds.includes(topic.id);
            const isPrelim = topic.period === 'prelim';
            const isMidterm = topic.period === 'midterm';

            return (
              <NeuCard
                key={topic.id}
                className={`p-5 flex flex-col justify-between transition-all duration-200 border ${
                  isCompleted
                    ? 'border-emerald-300 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10'
                    : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0d1424]'
                }`}
              >
                <div className="space-y-3">
                  {/* Topic Header & Completed Checkbox */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                          isPrelim
                            ? 'bg-blue-100 text-[#1E3A8A] dark:bg-blue-950/60 dark:text-blue-300'
                            : isMidterm
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                        }`}
                      >
                        Week {topic.weekNumber} • {topic.period}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                        {topic.title}
                      </h3>
                    </div>

                    {/* Student "Reviewed" Toggle */}
                    <button
                      type="button"
                      onClick={() => toggleTopicCompleted(topic.id)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700'
                      }`}
                      title={isCompleted ? 'Mark as unreviewed' : 'Mark as reviewed'}
                    >
                      <CheckCircle2 className={`w-3.5 h-3.5 ${isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                      <span>{isCompleted ? 'Reviewed' : 'Mark Done'}</span>
                    </button>
                  </div>

                  {/* Covered Topics */}
                  {topic.topics && topic.topics.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Concepts Covered:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {topic.topics.map((t, i) => (
                          <span
                            key={i}
                            className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/50"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Learning Outcomes */}
                  {topic.learningOutcomes && topic.learningOutcomes.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Objectives:
                      </span>
                      <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside">
                        {topic.learningOutcomes.map((lo, i) => (
                          <li key={i} className="leading-tight">
                            {lo}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Suggested Activities */}
                  {topic.activities && topic.activities.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Assigned Activities & Readings:
                      </span>
                      <div className="space-y-1">
                        {topic.activities.map((act, i) => (
                          <div
                            key={i}
                            className="text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-[#F97316]" />
                            <span>{act}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Teacher's Lecture Notes & Study Guide */}
                  {topic.notes && (
                    <div className="p-3.5 rounded-xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200/70 dark:border-orange-900/40 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-[11px] text-[#c2410c] dark:text-orange-400 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5" />
                          <span>Instructor Study Note & Key Concepts:</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyNotes(topic.id, topic.notes)}
                          className="text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors"
                        >
                          {copiedTopicId === topic.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-600 font-semibold">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy Note</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed whitespace-pre-line font-sans">
                        {topic.notes}
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Week {topic.weekNumber} Curriculum Module</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Verified by Faculty</span>
                  </span>
                </div>
              </NeuCard>
            );
          })}
        </div>
      )}
    </div>
  );
};
