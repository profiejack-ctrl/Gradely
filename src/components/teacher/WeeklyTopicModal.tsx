import React, { useState, useEffect } from 'react';
import { WeeklyTopic, GradingPeriod } from '../../types';
import { NeuModal } from '../common/NeuModal';
import { NeuButton } from '../common/NeuButton';
import { NeuInput, NeuSelect } from '../common/NeuInput';
import { NeuToggle } from '../common/NeuToggle';
import { Eye, EyeOff, FileText } from 'lucide-react';

interface WeeklyTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic: WeeklyTopic | null;
  onSave: (updatedTopic: WeeklyTopic) => void;
}

export const WeeklyTopicModal: React.FC<WeeklyTopicModalProps> = ({
  isOpen,
  onClose,
  topic,
  onSave,
}) => {
  const [weekNumber, setWeekNumber] = useState(1);
  const [period, setPeriod] = useState<GradingPeriod>('prelim');
  const [title, setTitle] = useState('');
  const [learningOutcomesText, setLearningOutcomesText] = useState('');
  const [topicsText, setTopicsText] = useState('');
  const [activitiesText, setActivitiesText] = useState('');
  const [notes, setNotes] = useState('');
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    if (topic) {
      setWeekNumber(topic.weekNumber);
      setPeriod(topic.period);
      setTitle(topic.title);
      setLearningOutcomesText((topic.learningOutcomes || []).join('\n'));
      setTopicsText((topic.topics || []).join('\n'));
      setActivitiesText((topic.activities || []).join('\n'));
      setNotes(topic.notes || '');
      setIsPublished(topic.isPublished);
    }
  }, [topic, isOpen]);

  if (!topic) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const outcomes = learningOutcomesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const subtopics = topicsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const activities = activitiesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const updated: WeeklyTopic = {
      ...topic,
      weekNumber,
      period,
      title: title.trim(),
      learningOutcomes: outcomes.length > 0 ? outcomes : ['Master weekly competencies'],
      topics: subtopics.length > 0 ? subtopics : ['Class lecture and discussion'],
      activities,
      notes: notes.trim(),
      isPublished,
      updatedAt: new Date().toISOString(),
    };

    onSave(updated);
    onClose();
  };

  return (
    <NeuModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Week ${weekNumber} Topic & Study Notes`}
      subtitle="Refine learning objectives, subtopics, student notes, and publishing visibility"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Visibility Switch Card */}
        <div className={`p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between ${
          isPublished
            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              isPublished
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
            }`}>
              {isPublished ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Student Visibility Switch</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  isPublished
                    ? 'bg-emerald-200/80 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                }`}>
                  {isPublished ? 'Public to Students' : 'Draft (Teacher Only)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {isPublished
                  ? 'Students enrolled in this course can view this weekly topic, objectives, and study notes.'
                  : 'Hidden from student dashboard until you toggle this switch to public.'}
              </p>
            </div>
          </div>

          <NeuToggle
            checked={isPublished}
            onChange={(checked: boolean) => setIsPublished(checked)}
          />
        </div>

        {/* Basic Topic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
              Week Number
            </label>
            <NeuInput
              type="number"
              min={1}
              max={30}
              value={weekNumber}
              onChange={(e) => setWeekNumber(Number(e.target.value))}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
              Grading Period
            </label>
            <NeuSelect
              value={period}
              onChange={(e) => setPeriod(e.target.value as GradingPeriod)}
              options={[
                { value: 'prelim', label: 'Prelim Period' },
                { value: 'midterm', label: 'Midterm Period' },
                { value: 'finals', label: 'Finals Period' },
              ]}
            />
          </div>

          <div className="sm:col-span-1 flex items-end pb-1 text-[11px] text-slate-500">
            <span>Period weight is factored automatically in collegiate grade calculation.</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
            Weekly Topic Title
          </label>
          <NeuInput
            type="text"
            placeholder="e.g. Week 1: Introduction to Web Systems and Modern Client-Server Models"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        {/* Learning Outcomes & Topics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1 flex items-center justify-between">
              <span>Learning Outcomes</span>
              <span className="text-[10px] lowercase text-slate-400 font-normal">one per line</span>
            </label>
            <textarea
              className="w-full h-24 text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F97316]/50 resize-none font-sans"
              value={learningOutcomesText}
              onChange={(e) => setLearningOutcomesText(e.target.value)}
              placeholder="Students will be able to..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1 flex items-center justify-between">
              <span>Covered Topics & Concepts</span>
              <span className="text-[10px] lowercase text-slate-400 font-normal">one per line</span>
            </label>
            <textarea
              className="w-full h-24 text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F97316]/50 resize-none font-sans"
              value={topicsText}
              onChange={(e) => setTopicsText(e.target.value)}
              placeholder="Key concepts, frameworks, definitions..."
            />
          </div>
        </div>

        {/* Suggested Activities */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1 flex items-center justify-between">
            <span>Suggested Activities, Lab Tasks & Readings</span>
            <span className="text-[10px] lowercase text-slate-400 font-normal">one per line</span>
          </label>
          <textarea
            className="w-full h-16 text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F97316]/50 resize-none font-sans"
            value={activitiesText}
            onChange={(e) => setActivitiesText(e.target.value)}
            placeholder="e.g. Lab Exercise 1, Chapter 2 Reading, Quiz 1 Preparation..."
          />
        </div>

        {/* Teacher Lecture Note & Study Guide */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-[#F97316]" />
            <span>Teacher's Lecture Notes & Student Study Guide</span>
          </label>
          <textarea
            className="w-full h-32 text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F97316]/50 resize-y font-sans leading-relaxed"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Write key notes, lecture summary, formulas, or reminders for your students to study..."
          />
          <p className="text-[11px] text-slate-500 mt-1">
            These notes will be displayed in the Student Study Hub whenever this weekly topic is set to Public.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <NeuButton type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </NeuButton>
          <NeuButton type="submit" variant="primary" size="sm">
            Save Weekly Topic
          </NeuButton>
        </div>
      </form>
    </NeuModal>
  );
};
