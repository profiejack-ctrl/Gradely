import React, { useState, useEffect } from 'react';
import { Subject, Section, MatrixCategory } from '../../types';
import { NeuModal } from '../common/NeuModal';
import { NeuButton } from '../common/NeuButton';
import { NeuInput, NeuSelect } from '../common/NeuInput';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

interface SubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  sections: Section[];
  selectedSectionId?: string;
  subjectToEdit?: Subject | null;
  onSave: (subjectData: Omit<Subject, 'id'>, idToUpdate?: string) => void;
}

const DEFAULT_MATRICES: Record<string, { label: string; matrix: MatrixCategory[] }> = {
  standard: {
    label: 'Standard Higher Ed (Att 10%, Quizzes 20%, Acts 20%, Proj 25%, Exam 25%)',
    matrix: [
      { id: 'cat-att', name: 'Attendance', weight: 10, color: 'blue' },
      { id: 'cat-quiz', name: 'Quizzes', weight: 20, color: 'amber' },
      { id: 'cat-act', name: 'Activities & Labs', weight: 20, color: 'emerald' },
      { id: 'cat-proj', name: 'Projects', weight: 25, color: 'purple' },
      { id: 'cat-exam', name: 'Major Exams', weight: 25, color: 'rose' },
    ],
  },
  deped: {
    label: 'K-12 / DepEd Model (Written Work 30%, Performance Tasks 50%, Exam 20%)',
    matrix: [
      { id: 'cat-ww', name: 'Written Work (Quizzes/Tests)', weight: 30, color: 'amber' },
      { id: 'cat-pt', name: 'Performance Tasks & Projects', weight: 50, color: 'emerald' },
      { id: 'cat-qe', name: 'Quarterly Examination', weight: 20, color: 'rose' },
    ],
  },
  lab: {
    label: 'Laboratory / Hands-On Intensive (Att 10%, Labs 40%, Quizzes 15%, Project 20%, Exam 15%)',
    matrix: [
      { id: 'cat-att', name: 'Attendance & Safety', weight: 10, color: 'blue' },
      { id: 'cat-quiz', name: 'Theory Quizzes', weight: 15, color: 'amber' },
      { id: 'cat-lab', name: 'Practical Lab Experiments', weight: 40, color: 'emerald' },
      { id: 'cat-proj', name: 'Final Machine Problem', weight: 20, color: 'purple' },
      { id: 'cat-exam', name: 'Practical Examination', weight: 15, color: 'rose' },
    ],
  },
};

export const SubjectModal: React.FC<SubjectModalProps> = ({
  isOpen,
  onClose,
  sections,
  selectedSectionId,
  subjectToEdit,
  onSave,
}) => {
  const { currentUser } = useAuth();
  const { teachers } = useData();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [sectionId, setSectionId] = useState(selectedSectionId || sections[0]?.id || '');
  const [teacherId, setTeacherId] = useState<string>(currentUser?.id || 'teacher-1');
  const [schedule, setSchedule] = useState('');
  const [units, setUnits] = useState(3);
  const [passingGrade, setPassingGrade] = useState(75);
  const [matrixPreset, setMatrixPreset] = useState<'standard' | 'deped' | 'lab'>('standard');

  useEffect(() => {
    if (subjectToEdit) {
      setName(subjectToEdit.name);
      setCode(subjectToEdit.code);
      setSectionId(subjectToEdit.sectionId);
      setTeacherId(subjectToEdit.teacherId || currentUser?.id || 'teacher-1');
      setSchedule(subjectToEdit.schedule || '');
      setUnits(subjectToEdit.units || 3);
      setPassingGrade(subjectToEdit.passingGrade || 75);
    } else {
      setName('');
      setCode('');
      setSectionId(selectedSectionId || sections[0]?.id || '');
      setTeacherId(currentUser?.id || teachers[0]?.id || 'teacher-1');
      setSchedule('MWF 10:00 AM - 11:30 AM');
      setUnits(3);
      setPassingGrade(75);
      setMatrixPreset('standard');
    }
  }, [subjectToEdit, isOpen, selectedSectionId, sections, currentUser?.id, teachers]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim() || !sectionId) return;

    const initialMatrix = subjectToEdit
      ? subjectToEdit.matrix
      : DEFAULT_MATRICES[matrixPreset].matrix.map((c) => ({
          ...c,
          id: `cat-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`,
        }));

    onSave(
      {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        sectionId,
        teacherId: teacherId || currentUser?.id || 'teacher-1',
        schedule: schedule.trim(),
        units: Number(units),
        passingGrade: Number(passingGrade),
        matrix: initialMatrix,
      },
      subjectToEdit?.id
    );
    onClose();
  };

  const sectionOptions = sections.map((s) => ({
    value: s.id,
    label: `${s.name} (${s.gradeLevelOrYear})`,
  }));

  const teacherOptions = teachers.map((t) => ({
    value: t.id,
    label: `${t.name} (${t.title || 'Faculty'}${t.id === currentUser?.id ? ' — You' : ''})`,
  }));

  const presetOptions = [
    { value: 'standard', label: 'Standard Higher Ed (Att 10%, Quiz 20%, Acts 20%, Proj 25%, Exam 25%)' },
    { value: 'deped', label: 'K-12 / DepEd (Written Work 30%, Performance Tasks 50%, Exam 20%)' },
    { value: 'lab', label: 'Laboratory Intensive (Att 10%, Labs 40%, Quizzes 15%, Proj 20%, Exam 15%)' },
  ];

  return (
    <NeuModal
      isOpen={isOpen}
      onClose={onClose}
      title={subjectToEdit ? 'Edit Subject' : 'Add Subject with Grading Matrix'}
      subtitle="Bind a subject course to a class/section with customizable grading criteria"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <NeuInput
              label="Subject Course Title"
              placeholder="e.g. Web Systems & Technologies"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <NeuInput
              label="Course Code"
              placeholder="e.g. CS-301"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <NeuSelect
            label="Target Class / Section"
            options={sectionOptions}
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            required
          />

          <NeuSelect
            label="Assigned Instructor / Faculty"
            options={teacherOptions.length > 0 ? teacherOptions : [{ value: currentUser?.id || 'teacher-1', label: currentUser?.name || 'Prof. Alex Mercer' }]}
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <NeuInput
              label="Class Schedule"
              placeholder="e.g. MWF 09:00 AM - 11:00 AM"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
            />
          </div>
          <div>
            <NeuInput
              label="Credit Units"
              type="number"
              min="1"
              max="6"
              value={units}
              onChange={(e) => setUnits(Number(e.target.value))}
            />
          </div>
        </div>

        {!subjectToEdit && (
          <NeuSelect
            label="Initial Grading Matrix Template (Fully Customizable Later)"
            options={presetOptions}
            value={matrixPreset}
            onChange={(e) => setMatrixPreset(e.target.value as 'standard' | 'deped' | 'lab')}
          />
        )}

        <div className="flex items-center justify-end gap-3 pt-3">
          <NeuButton type="button" variant="secondary" onClick={onClose}>
            Cancel
          </NeuButton>
          <NeuButton type="submit" variant="primary" disabled={!name.trim() || !code.trim() || !sectionId}>
            {subjectToEdit ? 'Save Subject' : 'Create Subject'}
          </NeuButton>
        </div>
      </form>
    </NeuModal>
  );
};
