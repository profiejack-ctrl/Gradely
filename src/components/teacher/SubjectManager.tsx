import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Subject, MatrixCategory } from '../../types';
import { NeuCard } from '../common/NeuCard';
import { NeuButton } from '../common/NeuButton';
import { NeuBadge } from '../common/NeuBadge';
import { NeuSelect } from '../common/NeuInput';
import { MatrixConfigModal } from './MatrixConfigModal';
import { GlobalMatrixTemplateModal } from './GlobalMatrixTemplateModal';
import { SubjectModal } from './SubjectModal';
import {
  Sliders,
  Table,
  CalendarCheck,
  Plus,
  Edit2,
  Trash2,
  Clock,
  Layers,
  Sparkles,
  Globe,
  GraduationCap,
} from 'lucide-react';

interface SubjectManagerProps {
  initialSectionId?: string;
  onNavigateToGradebook: (sectionId: string, subjectId: string) => void;
  onNavigateToAttendance: (sectionId: string, subjectId: string) => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export const SubjectManager: React.FC<SubjectManagerProps> = ({
  initialSectionId,
  onNavigateToGradebook,
  onNavigateToAttendance,
  onShowToast,
}) => {
  const { sections, subjects, teachers, addSubject, updateSubject, deleteSubject, updateSubjectMatrix } = useData();
  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    initialSectionId || 'all'
  );

  const [isMatrixModalOpen, setIsMatrixModalOpen] = useState(false);
  const [selectedSubjectForMatrix, setSelectedSubjectForMatrix] = useState<Subject | null>(null);
  const [isGlobalTemplateModalOpen, setIsGlobalTemplateModalOpen] = useState(false);

  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [subjectToEdit, setSubjectToEdit] = useState<Subject | null>(null);

  const filteredSubjects =
    selectedSectionId === 'all'
      ? subjects
      : subjects.filter((s) => s.sectionId === selectedSectionId);

  const handleOpenMatrixModal = (subject: Subject) => {
    setSelectedSubjectForMatrix(subject);
    setIsMatrixModalOpen(true);
  };

  const handleSaveMatrix = (subjectId: string, matrix: MatrixCategory[], passingGrade: number) => {
    updateSubjectMatrix(subjectId, matrix, passingGrade);
    onShowToast('Grading Matrix Saved', 'Custom weights and criteria successfully updated.', 'success');
  };

  const handleOpenAdd = () => {
    setSubjectToEdit(null);
    setIsSubjectModalOpen(true);
  };

  const handleOpenEdit = (subj: Subject) => {
    setSubjectToEdit(subj);
    setIsSubjectModalOpen(true);
  };

  const handleDelete = (subj: Subject) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${subj.name}" (${subj.code})? All associated assessments and grades will be removed.`
      )
    ) {
      deleteSubject(subj.id);
      onShowToast('Subject Deleted', `"${subj.name}" has been deleted.`, 'warning');
    }
  };

  const handleSaveSubject = (subjectData: Omit<Subject, 'id'>, idToUpdate?: string) => {
    if (idToUpdate) {
      updateSubject(idToUpdate, subjectData);
      onShowToast('Subject Updated', `"${subjectData.name}" has been updated.`, 'success');
    } else {
      addSubject(subjectData);
      onShowToast('Subject Created', `"${subjectData.name}" has been added.`, 'success');
    }
  };

  const sectionFilterOptions = [
    { value: 'all', label: 'All Classes / Sections' },
    ...sections.map((s) => ({ value: s.id, label: `${s.name} (${s.gradeLevelOrYear})` })),
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Subjects & Grading Matrix
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Configure course subjects, passing thresholds, and customize grading percentage matrices.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <div className="w-48 sm:w-56">
            <NeuSelect
              options={sectionFilterOptions}
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
            />
          </div>

          <NeuButton
            variant="secondary"
            size="md"
            onClick={() => setIsGlobalTemplateModalOpen(true)}
            leftIcon={<Globe className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
          >
            Global Templates
          </NeuButton>

          <NeuButton
            variant="primary"
            size="md"
            onClick={handleOpenAdd}
            leftIcon={<Plus className="w-4 h-4 text-white" />}
          >
            Add Subject
          </NeuButton>
        </div>
      </div>

      {/* Subjects Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredSubjects.map((subj) => {
          const section = sections.find((s) => s.id === subj.sectionId);
          const instructor = teachers.find((t) => t.id === subj.teacherId);
          const totalWeight = subj.matrix.reduce((sum, c) => sum + c.weight, 0);

          return (
            <NeuCard key={subj.id} className="space-y-4 flex flex-col justify-between">
              <div>
                {/* Header info */}
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                        {subj.code}
                      </span>
                      <NeuBadge variant="neutral" size="sm">
                        {subj.units || 3} Units
                      </NeuBadge>
                      <NeuBadge variant="warning" size="sm">
                        Pass: {subj.passingGrade}%
                      </NeuBadge>
                    </div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">{subj.name}</h2>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{section?.name || 'Unassigned'}</span>
                      <span>•</span>
                      <Clock className="w-3.5 h-3.5" />
                      <span>{subj.schedule || 'MWF'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                      <GraduationCap className="w-3.5 h-3.5 text-[#F97316]" />
                      <span>Instructor: <strong className="text-slate-700 dark:text-slate-300">{instructor?.name || 'Prof. Alex Mercer'}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(subj)}
                      className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Edit Subject Course"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(subj)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Delete Subject"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Grading Matrix Breakdown */}
                <div className="py-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      Grading Criteria ({totalWeight}%)
                    </span>
                    <button
                      onClick={() => handleOpenMatrixModal(subj)}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <Sliders className="w-3 h-3" />
                      Edit Matrix
                    </button>
                  </div>

                  {/* Matrix Chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {subj.matrix.map((cat) => (
                      <div
                        key={cat.id}
                        className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 text-xs font-medium text-slate-800 dark:text-slate-200"
                      >
                        <span>{cat.name}</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">{cat.weight}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <NeuButton
                  variant="secondary"
                  size="sm"
                  onClick={() => handleOpenMatrixModal(subj)}
                  leftIcon={<Sliders className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                >
                  Configure Matrix
                </NeuButton>

                <div className="flex items-center gap-2">
                  <NeuButton
                    variant="secondary"
                    size="sm"
                    onClick={() => onNavigateToAttendance(subj.sectionId, subj.id)}
                    leftIcon={<CalendarCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                  >
                    Attendance
                  </NeuButton>

                  <NeuButton
                    variant="primary"
                    size="sm"
                    onClick={() => onNavigateToGradebook(subj.sectionId, subj.id)}
                    leftIcon={<Table className="w-3.5 h-3.5 text-white" />}
                  >
                    Gradebook
                  </NeuButton>
                </div>
              </div>
            </NeuCard>
          );
        })}
      </div>

      <MatrixConfigModal
        isOpen={isMatrixModalOpen}
        onClose={() => setIsMatrixModalOpen(false)}
        subject={selectedSubjectForMatrix}
        onSave={handleSaveMatrix}
      />

      <GlobalMatrixTemplateModal
        isOpen={isGlobalTemplateModalOpen}
        onClose={() => setIsGlobalTemplateModalOpen(false)}
        onShowToast={onShowToast}
      />

      <SubjectModal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        sections={sections}
        selectedSectionId={selectedSectionId !== 'all' ? selectedSectionId : undefined}
        subjectToEdit={subjectToEdit}
        onSave={handleSaveSubject}
      />
    </div>
  );
};
