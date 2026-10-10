import React, { useState, useEffect } from 'react';
import { Assessment, Subject, GradingPeriod, GRADING_PERIODS } from '../../types';
import { NeuModal } from '../common/NeuModal';
import { NeuButton } from '../common/NeuButton';
import { NeuInput, NeuSelect, NeuTextarea } from '../common/NeuInput';

interface AssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: Subject | null;
  assessmentToEdit?: Assessment | null;
  initialCategoryId?: string;
  initialPeriod?: GradingPeriod;
  onSave: (assessmentData: Omit<Assessment, 'id'>, idToUpdate?: string) => void;
}

export const AssessmentModal: React.FC<AssessmentModalProps> = ({
  isOpen,
  onClose,
  subject,
  assessmentToEdit,
  initialCategoryId,
  initialPeriod = 'prelim',
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [period, setPeriod] = useState<GradingPeriod>(initialPeriod);
  const [maxScore, setMaxScore] = useState<number>(50);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');

  // Build options for selectable gradable categories / subcategories
  const categoryOptions: { value: string; label: string; parentId?: string }[] = [];

  if (subject) {
    for (const cat of subject.matrix) {
      if (cat.subCategories && cat.subCategories.length > 0) {
        for (const sub of cat.subCategories) {
          // Skip pure attendance subcategories
          if (!sub.name.toLowerCase().includes('attendance')) {
            categoryOptions.push({
              value: sub.id,
              label: `${cat.name} ▸ ${sub.name} (${sub.weight}% of ${cat.name})`,
              parentId: cat.id,
            });
          }
        }
      } else if (!cat.name.toLowerCase().includes('attendance')) {
        categoryOptions.push({
          value: cat.id,
          label: `${cat.name} (${cat.weight}% of Total)`,
        });
      }
    }
  }

  useEffect(() => {
    if (assessmentToEdit) {
      setTitle(assessmentToEdit.title);
      setCategoryId(assessmentToEdit.categoryId);
      setPeriod(assessmentToEdit.period || 'prelim');
      setMaxScore(assessmentToEdit.maxScore);
      setDate(assessmentToEdit.date);
      setDescription(assessmentToEdit.description || '');
    } else {
      setTitle('');
      setCategoryId(initialCategoryId || categoryOptions[0]?.value || '');
      setPeriod(initialPeriod || 'prelim');
      setMaxScore(50);
      setDate(new Date().toISOString().slice(0, 10));
      setDescription('');
    }
  }, [assessmentToEdit, isOpen, subject, initialCategoryId, initialPeriod]);

  if (!subject) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !categoryId || maxScore <= 0) return;

    const matchedOption = categoryOptions.find((opt) => opt.value === categoryId);

    onSave(
      {
        subjectId: subject.id,
        categoryId,
        parentCategoryId: matchedOption?.parentId,
        period,
        title: title.trim(),
        maxScore: Number(maxScore),
        date,
        description: description.trim(),
      },
      assessmentToEdit?.id
    );
    onClose();
  };

  return (
    <NeuModal
      isOpen={isOpen}
      onClose={onClose}
      title={assessmentToEdit ? 'Edit Assessment' : 'New Assessment Item'}
      subtitle={`Add a graded quiz, activity, project, or exam to ${subject.name}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Grading Period Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Grading Period / Quarter
          </label>
          <div className="grid grid-cols-3 gap-2">
            {GRADING_PERIODS.map((p) => {
              const isSelected = period === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriod(p.id)}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-600 dark:border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
                  }`}
                >
                  <div className="text-xs">{p.shortName}</div>
                  <div className="text-[10px] opacity-75">{p.weight}% Term Wt</div>
                </button>
              );
            })}
          </div>
        </div>

        <NeuInput
          label="Assessment Title"
          placeholder="e.g., Quiz 3: Binary Search Trees or Lab 4"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <NeuSelect
          label="Grading Matrix Category"
          options={categoryOptions}
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <NeuInput
            label="Total Max Score (Points)"
            type="number"
            min="1"
            max="1000"
            value={maxScore}
            onChange={(e) => setMaxScore(Number(e.target.value))}
            required
          />

          <NeuInput
            label="Date Given"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <NeuTextarea
          label="Instructions / Description (Optional)"
          placeholder="Brief description or coverage of the assessment..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />

        <div className="flex items-center justify-end gap-3 pt-3">
          <NeuButton type="button" variant="secondary" onClick={onClose}>
            Cancel
          </NeuButton>
          <NeuButton type="submit" variant="primary" disabled={!title.trim() || !categoryId}>
            {assessmentToEdit ? 'Save Changes' : 'Create Assessment'}
          </NeuButton>
        </div>
      </form>
    </NeuModal>
  );
};
