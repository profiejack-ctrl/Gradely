import React, { useState, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Subject, LearningPlan, WeeklyTopic, GradingPeriod } from '../../types';
import { NeuCard } from '../common/NeuCard';
import { NeuButton } from '../common/NeuButton';
import { NeuBadge } from '../common/NeuBadge';
import { NeuSelect, NeuInput } from '../common/NeuInput';
import { NeuToggle } from '../common/NeuToggle';
import { GeminiApiKeyModal } from '../common/GeminiApiKeyModal';
import { WeeklyTopicModal } from './WeeklyTopicModal';
import {
  analyzeSyllabusWithGemini,
  generateDemoLearningPlan,
  hasGeminiApiKey,
} from '../../services/geminiService';
import {
  Sparkles,
  Upload,
  FileText,
  Eye,
  EyeOff,
  CheckCircle2,
  BookOpen,
  Edit2,
  Printer,
  Search,
  Plus,
  RefreshCw,
  Key,
  Users,
} from 'lucide-react';
import { normalizeCourseCode } from '../../utils/enrollmentUtils';

interface LearningPlanManagerProps {
  initialSubjectId?: string;
  onShowToast: (title: string, message?: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export const LearningPlanManager: React.FC<LearningPlanManagerProps> = ({
  initialSubjectId,
  onShowToast,
}) => {
  const { currentUser, isDean } = useAuth();
  const {
    sections,
    subjects,
    saveLearningPlan,
    updateWeeklyTopic,
    toggleWeeklyTopicPublish,
    toggleAllWeeklyTopicsPublish,
    getLearningPlanBySubjectId,
  } = useData();

  // Faculty course permissions
  const accessibleSubjects = isDean
    ? subjects
    : subjects.filter((s) => s.teacherId === currentUser?.id);

  interface CourseGroup {
    courseKey: string;
    courseCode: string;
    courseTitle: string;
    subjects: Subject[];
    primarySubject: Subject;
    sectionNames: string[];
  }

  // Deduplicate and group accessible subjects by Course Code
  // Multiple sections taking the same course share the same syllabus and weekly topics!
  const courseGroups = React.useMemo(() => {
    const map = new Map<string, CourseGroup>();

    accessibleSubjects.forEach((subj) => {
      const key = normalizeCourseCode(subj.code, subj.name) || subj.id;
      const section = sections.find((sec) => sec.id === subj.sectionId);
      const sectionName = section?.name || 'Unassigned';

      if (!map.has(key)) {
        map.set(key, {
          courseKey: key,
          courseCode: subj.code || key,
          courseTitle: subj.name,
          subjects: [subj],
          primarySubject: subj,
          sectionNames: sectionName !== 'Unassigned' ? [sectionName] : [],
        });
      } else {
        const group = map.get(key)!;
        group.subjects.push(subj);
        if (sectionName !== 'Unassigned' && !group.sectionNames.includes(sectionName)) {
          group.sectionNames.push(sectionName);
        }
      }
    });

    return Array.from(map.values());
  }, [accessibleSubjects, sections]);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(() => {
    if (initialSubjectId) return initialSubjectId;
    return accessibleSubjects[0]?.id || '';
  });

  React.useEffect(() => {
    if (initialSubjectId) {
      const matchedGroup = courseGroups.find(
        (g) => g.subjects.some((s) => s.id === initialSubjectId) || g.courseKey === initialSubjectId
      );
      if (matchedGroup) {
        setSelectedSubjectId(matchedGroup.primarySubject.id);
        return;
      }
    }
    if (courseGroups.length > 0 && !courseGroups.some((g) => g.subjects.some((s) => s.id === selectedSubjectId))) {
      setSelectedSubjectId(courseGroups[0].primarySubject.id);
    }
  }, [initialSubjectId, courseGroups, selectedSubjectId]);

  const activeCourseGroup: CourseGroup | undefined =
    courseGroups.find((g) => g.subjects.some((s) => s.id === selectedSubjectId)) ||
    courseGroups[0];

  const activeSubject: Subject | undefined =
    activeCourseGroup?.primarySubject || accessibleSubjects[0];

  const currentPlan: LearningPlan | undefined = activeSubject
    ? getLearningPlanBySubjectId(activeSubject.id)
    : undefined;

  // Upload & Generation States
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [topicToEdit, setTopicToEdit] = useState<WeeklyTopic | null>(null);

  const [uploadMode, setUploadMode] = useState<'upload' | 'paste'>('upload');
  const [syllabusText, setSyllabusText] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | undefined>(undefined);
  const [totalWeeks, setTotalWeeks] = useState(18);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisPhase, setAnalysisPhase] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<'all' | GradingPeriod>('all');
  const [showUploaderOverlay, setShowUploaderOverlay] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // File selection handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    if (file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = () => {
        const resultStr = reader.result as string;
        // strip data url header (e.g. "data:application/pdf;base64,")
        const base64 = resultStr.split(',')[1] || resultStr;
        setPdfBase64(base64);
      };
      reader.readAsDataURL(file);
    } else {
      // Plain text or markdown
      const reader = new FileReader();
      reader.onload = () => {
        setSyllabusText(reader.result as string);
        setPdfBase64(undefined);
      };
      reader.readAsText(file);
    }
  };

  // Run AI analysis
  const handleAnalyzeSyllabus = async () => {
    if (!activeSubject) return;

    if (!hasGeminiApiKey()) {
      setIsApiKeyModalOpen(true);
      onShowToast('API Key Required', 'Please set your Google Gemini API key to run syllabus analysis.', 'warning');
      return;
    }

    if (!syllabusText.trim() && !pdfBase64) {
      onShowToast('Missing Syllabus', 'Please upload a PDF/text syllabus or paste syllabus content.', 'warning');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisPhase('Connecting to Gemini AI agent...');

    try {
      setAnalysisPhase('Analyzing course curriculum & objectives...');
      await new Promise((r) => setTimeout(r, 600));

      setAnalysisPhase(`Structuring ${totalWeeks}-week learning plan & grading periods...`);
      const plan = await analyzeSyllabusWithGemini(activeSubject, {
        syllabusText: syllabusText.trim(),
        pdfBase64,
        fileName: selectedFile?.name,
        customInstructions: customInstructions.trim(),
        totalWeeks,
      });

      saveLearningPlan(plan);
      setShowUploaderOverlay(false);
      onShowToast(
        'Learning Plan Created',
        `Successfully generated ${plan.weeklyTopics.length} weekly topics for ${activeSubject.code}!`,
        'success'
      );
    } catch (err: any) {
      console.error('Syllabus analysis failed:', err);
      onShowToast('AI Analysis Failed', err.message || 'Error communicating with Gemini API.', 'error');
    } finally {
      setIsAnalyzing(false);
      setAnalysisPhase('');
    }
  };

  // Quick Demo Plan
  const handleGenerateDemo = () => {
    if (!activeSubject) return;
    const demoPlan = generateDemoLearningPlan(activeSubject);
    saveLearningPlan(demoPlan);
    setShowUploaderOverlay(false);
    onShowToast('Sample Plan Loaded', `Loaded authentic 18-week learning plan for ${activeSubject.code}.`, 'info');
  };

  // Switch Toggle for individual week
  const handleTogglePublish = (topicId: string, currentVal: boolean) => {
    if (!activeSubject) return;
    const nextVal = !currentVal;
    toggleWeeklyTopicPublish(activeSubject.id, topicId, nextVal);
    onShowToast(
      nextVal ? 'Topic Published' : 'Topic Set to Draft',
      nextVal
        ? 'Students enrolled in this course can now view this weekly topic and notes.'
        : 'Topic is now hidden from the student dashboard.',
      nextVal ? 'success' : 'info'
    );
  };

  // Bulk Publish / Unpublish
  const handleBulkPublish = (shouldPublish: boolean) => {
    if (!activeSubject) return;
    toggleAllWeeklyTopicsPublish(activeSubject.id, shouldPublish);
    onShowToast(
      shouldPublish ? 'All Weeks Published' : 'All Weeks Hidden',
      shouldPublish
        ? 'All weekly topics and lecture notes are now public to students.'
        : 'All weekly topics set to private draft mode.',
      'info'
    );
  };

  // Add Manual Week
  const handleAddWeek = () => {
    if (!activeSubject) return;
    const existing = currentPlan?.weeklyTopics || [];
    const nextWeekNum = existing.length + 1;
    let period: GradingPeriod = 'prelim';
    if (nextWeekNum > 12) period = 'finals';
    else if (nextWeekNum > 6) period = 'midterm';

    const newTopic: WeeklyTopic = {
      id: `topic-${activeSubject.id}-w${nextWeekNum}-${Date.now().toString(36)}`,
      weekNumber: nextWeekNum,
      period,
      title: `Week ${nextWeekNum}: Advanced Course Competencies`,
      learningOutcomes: ['Understand key module concepts', 'Complete relevant activities'],
      topics: ['Lecture discussion and interactive review'],
      activities: [`Weekly Worksheet ${nextWeekNum}`],
      notes: 'Study notes and key definitions for this week.',
      isPublished: false,
      updatedAt: new Date().toISOString(),
    };

    if (currentPlan) {
      saveLearningPlan({
        ...currentPlan,
        weeklyTopics: [...currentPlan.weeklyTopics, newTopic],
      });
    } else {
      saveLearningPlan({
        id: `plan-${activeSubject.id}`,
        subjectId: activeSubject.id,
        courseTitle: activeSubject.name,
        courseCode: activeSubject.code,
        learningOutcomes: ['Demonstrate subject competencies'],
        weeklyTopics: [newTopic],
        generatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    setTopicToEdit(newTopic);
    setIsTopicModalOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  if (accessibleSubjects.length === 0) {
    return (
      <div className="p-8 sm:p-12 text-center bg-white dark:bg-[#0d1424] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-xl mx-auto my-8 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-[#F97316] flex items-center justify-center mx-auto shadow-inner">
          <BookOpen className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">No Assigned Subjects</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
          You do not have any subjects registered yet. Create or assign a subject under "Subjects & Matrix" first.
        </p>
      </div>
    );
  }

  // Filtered Topics
  const allTopics = currentPlan?.weeklyTopics || [];
  const filteredTopics = allTopics
    .filter((t) => (selectedPeriodFilter === 'all' ? true : t.period === selectedPeriodFilter))
    .filter(
      (t) =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.topics.some((sub) => sub.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  const publishedCount = allTopics.filter((t) => t.isPublished).length;
  const draftCount = allTopics.length - publishedCount;

  return (
    <div className="space-y-6 animate-fade-in print:space-y-4">
      {/* ========================================================================= */}
      {/* TOP HEADER & CONTROLS                                                     */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 dark:bg-[#0d1424]/80 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs print:hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/50 text-[#F97316]">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              AI Course Learning Plans & Syllabus
            </h1>
            <NeuBadge variant="primary" size="sm" className="hidden sm:inline-flex">
              Gemini Powered
            </NeuBadge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Upload course syllabus to auto-generate 18-week learning plans, study notes, and toggle student publishing visibility.
          </p>
        </div>

        {/* Course / Subject Selector & Settings Buttons */}
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="w-64 sm:w-80 md:w-96">
            <NeuSelect
              value={activeCourseGroup?.primarySubject.id || selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              options={courseGroups.map((g) => {
                const sectionList = g.sectionNames.length > 0 ? ` (${g.sectionNames.join(', ')})` : '';
                return {
                  value: g.primarySubject.id,
                  label: `${g.courseCode} - ${g.courseTitle}${sectionList}`,
                };
              })}
            />
          </div>

          <NeuButton
            variant="secondary"
            size="sm"
            onClick={() => setIsApiKeyModalOpen(true)}
            leftIcon={<Key className="w-3.5 h-3.5 text-[#F97316]" />}
            title="Configure Google Gemini API key"
          >
            Gemini Settings
          </NeuButton>
        </div>
      </div>

      {/* Shared Course & Sections Synchronized Banner */}
      {activeCourseGroup && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-3 rounded-2xl bg-white/80 dark:bg-[#0d1424]/80 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 text-xs shadow-2xs print:hidden">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
              <Users className="w-4 h-4 text-[#F97316]" />
              <span>
                {activeCourseGroup.sectionNames.length > 1 ? 'Enrolled Sections (Shared Syllabus):' : 'Enrolled Section:'}
              </span>
            </div>
            {activeCourseGroup.sectionNames.length > 0 ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                {activeCourseGroup.sectionNames.map((secName) => (
                  <span
                    key={secName}
                    className="px-2.5 py-0.5 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-[#c2410c] dark:text-orange-300 font-bold border border-orange-200 dark:border-orange-800 text-xs shadow-2xs"
                  >
                    {secName}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-slate-400 italic">No section assigned</span>
            )}
          </div>

          {activeCourseGroup.sectionNames.length > 1 ? (
            <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Topics & public visibility automatically sync across all {activeCourseGroup.sectionNames.length} sections</span>
            </div>
          ) : (
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Standard 18-week curriculum structure for {activeCourseGroup.courseCode}
            </span>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW A: NO PLAN YET OR UPLOADER OVERLAY                                   */}
      {/* ========================================================================= */}
      {(!currentPlan || showUploaderOverlay) && (
        <NeuCard className="p-6 sm:p-8 space-y-6 border-2 border-dashed border-orange-200 dark:border-orange-900/40 bg-gradient-to-br from-white via-orange-50/20 to-white dark:from-[#0d1424] dark:via-orange-950/10 dark:to-[#0d1424]">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F97316] animate-pulse" />
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {currentPlan ? `Re-analyze Syllabus for ${activeSubject?.code}` : `Upload Syllabus for ${activeSubject?.code} - ${activeSubject?.name}`}
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload your course syllabus file (PDF, TXT, DOC) or paste your course outline. The AI Agent will decompose it into structured weekly competencies, objectives, and study notes.
              </p>
            </div>

            {currentPlan && (
              <NeuButton
                variant="secondary"
                size="sm"
                onClick={() => setShowUploaderOverlay(false)}
              >
                Cancel
              </NeuButton>
            )}
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl max-w-xs">
            <button
              type="button"
              onClick={() => setUploadMode('upload')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                uploadMode === 'upload'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Upload Document
            </button>
            <button
              type="button"
              onClick={() => setUploadMode('paste')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                uploadMode === 'paste'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Paste Outline / Text
            </button>
          </div>

          {/* Document Upload Zone */}
          {uploadMode === 'upload' ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#F97316] dark:hover:border-orange-500 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-white/60 dark:bg-slate-900/40 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.md,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-[#F97316] flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                <Upload className="w-7 h-7" />
              </div>

              {selectedFile ? (
                <div className="space-y-1">
                  <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>{selectedFile.name}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB • Ready for AI analysis
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    Click to browse or drop syllabus file here
                  </p>
                  <p className="text-xs text-slate-400">
                    Supports PDF, DOCX, TXT, and Markdown files
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Paste Course Syllabus / Outline Content
              </label>
              <textarea
                className="w-full h-44 text-xs p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F97316]/50 resize-y font-mono leading-relaxed"
                placeholder="Paste course description, objectives, weekly schedule, grading policies, textbooks, and topic outlines here..."
                value={syllabusText}
                onChange={(e) => setSyllabusText(e.target.value)}
              />
            </div>
          )}

          {/* Configuration Options */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                Semester Duration
              </label>
              <NeuSelect
                value={totalWeeks}
                onChange={(e) => setTotalWeeks(Number(e.target.value))}
                options={[
                  { value: 18, label: '18 Weeks (Standard Collegiate)' },
                  { value: 15, label: '15 Weeks (Trimester / Intensive)' },
                  { value: 12, label: '12 Weeks (Quarterly)' },
                  { value: 9, label: '9 Weeks (Mid-term Intensive)' },
                ]}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                Special AI Directives (Optional)
              </label>
              <NeuInput
                type="text"
                placeholder="e.g. Include hands-on TypeScript labs; emphasize midterm project deliverables"
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
              />
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <NeuButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleGenerateDemo}
                leftIcon={<BookOpen className="w-3.5 h-3.5 text-slate-500" />}
              >
                Use Sample 18-Week Plan
              </NeuButton>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <NeuButton
                type="button"
                variant="primary"
                size="md"
                className="w-full sm:w-auto"
                onClick={handleAnalyzeSyllabus}
                disabled={isAnalyzing}
                leftIcon={<Sparkles className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />}
              >
                {isAnalyzing ? analysisPhase || 'Analyzing Syllabus...' : 'Analyze with Gemini AI'}
              </NeuButton>
            </div>
          </div>
        </NeuCard>
      )}

      {/* ========================================================================= */}
      {/* VIEW B: ACTIVE LEARNING PLAN DASHBOARD                                    */}
      {/* ========================================================================= */}
      {currentPlan && !showUploaderOverlay && (
        <>
          {/* Plan Meta Banner */}
          <NeuCard className="p-5 sm:p-6 bg-white dark:bg-[#0d1424] space-y-4">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-950/60 text-[#c2410c] dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                    {currentPlan.courseCode}
                  </span>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                    {currentPlan.courseTitle}
                  </h2>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {currentPlan.description}
                </p>
                {currentPlan.prerequisites && (
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-400">Prerequisites:</span>
                    <span>{currentPlan.prerequisites}</span>
                  </div>
                )}
                {activeCourseGroup && activeCourseGroup.sectionNames.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Enrolled Sections:</span>
                    </span>
                    {activeCourseGroup.sectionNames.map((name) => (
                      <span
                        key={name}
                        className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-[#1E3A8A] dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-900 text-[11px]"
                      >
                        {name}
                      </span>
                    ))}
                    {activeCourseGroup.sectionNames.length > 1 && (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold ml-1">
                        • Shared Syllabus & Synchronized Topics
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Status Stats & Action Controls */}
              <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-2.5 shrink-0">
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    <span>{publishedCount} Public</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>{draftCount} Drafts</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <NeuButton
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowUploaderOverlay(true)}
                    leftIcon={<RefreshCw className="w-3 h-3 text-slate-500" />}
                  >
                    Re-analyze Syllabus
                  </NeuButton>
                  <NeuButton
                    variant="secondary"
                    size="sm"
                    onClick={handlePrint}
                    leftIcon={<Printer className="w-3 h-3 text-slate-500" />}
                  >
                    Print
                  </NeuButton>
                </div>
              </div>
            </div>

            {/* Course Learning Outcomes */}
            {currentPlan.learningOutcomes && currentPlan.learningOutcomes.length > 0 && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Overarching Course Learning Outcomes (OBE Aligned)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
                  {currentPlan.learningOutcomes.map((outcome, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80">
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

          {/* ===================================================================== */}
          {/* TOOLBAR: PERIOD FILTER, SEARCH & BULK PUBLISH SWITCH                  */}
          {/* ===================================================================== */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Period Filter Tabs */}
            <div className="flex items-center gap-1 p-1 bg-white dark:bg-[#0d1424] border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto shadow-2xs">
              {(['all', 'prelim', 'midterm', 'finals'] as const).map((period) => {
                const isActive = selectedPeriodFilter === period;
                return (
                  <button
                    key={period}
                    type="button"
                    onClick={() => setSelectedPeriodFilter(period)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize whitespace-nowrap ${
                      isActive
                        ? 'bg-[#F97316] text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {period === 'all' ? 'All Weeks' : `${period} Period`}
                  </button>
                );
              })}
            </div>

            {/* Search and Bulk Switch Controls */}
            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
              <div className="relative flex-1 sm:w-60">
                <NeuInput
                  type="text"
                  placeholder="Search topics or notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<Search className="w-3.5 h-3.5 text-slate-400" />}
                  className="text-xs"
                />
              </div>

              {/* Bulk Publish Switch Dropdown / Button */}
              <div className="flex items-center gap-1 bg-white dark:bg-[#0d1424] p-1 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs text-xs">
                <button
                  type="button"
                  onClick={() => handleBulkPublish(true)}
                  className="px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold transition-colors flex items-center gap-1.5"
                  title="Make all weekly topics visible to enrolled students"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Publish All</span>
                </button>
                <div className="w-px h-4 bg-slate-200 dark:bg-slate-700" />
                <button
                  type="button"
                  onClick={() => handleBulkPublish(false)}
                  className="px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold transition-colors flex items-center gap-1.5"
                  title="Hide all weekly topics from students"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Draft All</span>
                </button>
              </div>

              <NeuButton
                variant="primary"
                size="sm"
                onClick={handleAddWeek}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Week
              </NeuButton>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* WEEKLY TOPICS CARDS                                                   */}
          {/* ===================================================================== */}
          {filteredTopics.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-[#0d1424] rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
              No weekly topics found matching your criteria.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTopics.map((topic) => {
                const isPrelim = topic.period === 'prelim';
                const isMidterm = topic.period === 'midterm';

                return (
                  <NeuCard
                    key={topic.id}
                    className={`p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 border ${
                      topic.isPublished
                        ? 'border-emerald-300/80 dark:border-emerald-900/60 bg-white dark:bg-[#0d1424]'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 opacity-90'
                    }`}
                  >
                    {/* Topic Header & Teacher Switch */}
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
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

                            {/* Publication Status Pill */}
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                topic.isPublished
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                                  : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              {topic.isPublished ? (
                                <>
                                  <Eye className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                  <span>Public</span>
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-3 h-3 text-slate-400" />
                                  <span>Draft</span>
                                </>
                              )}
                            </span>
                          </div>

                          <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                            {topic.title}
                          </h3>
                        </div>

                        {/* TEACHER SWITCH: Public to Students */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <div className="flex items-center gap-1.5" title="Toggle student visibility">
                            <NeuToggle
                              checked={topic.isPublished}
                              onChange={() => handleTogglePublish(topic.id, topic.isPublished)}
                            />
                          </div>
                          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                            {topic.isPublished ? 'Visible' : 'Hidden'}
                          </span>
                        </div>
                      </div>

                      {/* Covered Topics */}
                      {topic.topics && topic.topics.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Covered Topics:
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
                            Weekly Objectives:
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

                      {/* Lecture Notes & Study Guide Preview */}
                      {topic.notes && (
                        <div className="p-3 rounded-xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-900/40 text-xs space-y-1">
                          <div className="font-bold text-[11px] text-[#c2410c] dark:text-orange-400 flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            <span>Teacher's Study Note:</span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed line-clamp-3">
                            {topic.notes}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Card Footer Actions */}
                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="text-[10px] text-slate-400">
                        {topic.activities?.length ? `${topic.activities.length} Suggested Task(s)` : 'No tasks assigned'}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setTopicToEdit(topic);
                            setIsTopicModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs font-semibold"
                          title="Edit weekly topic details and notes"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                          <span>Edit</span>
                        </button>
                      </div>
                    </div>
                  </NeuCard>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* MODALS                                                                    */}
      {/* ========================================================================= */}
      <GeminiApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onSaved={() => {
          onShowToast('Gemini Ready', 'Your API key is saved. You can now analyze syllabus documents.', 'success');
        }}
        onShowToast={onShowToast}
      />

      <WeeklyTopicModal
        isOpen={isTopicModalOpen}
        onClose={() => {
          setIsTopicModalOpen(false);
          setTopicToEdit(null);
        }}
        topic={topicToEdit}
        onSave={(updated) => {
          if (!activeSubject) return;
          updateWeeklyTopic(activeSubject.id, updated.id, updated);
          onShowToast('Topic Updated', `Week ${updated.weekNumber} updated successfully.`, 'success');
        }}
      />
    </div>
  );
};
