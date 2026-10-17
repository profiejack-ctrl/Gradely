import React, { useState, useEffect } from 'react';
import { Subject, Section, MatrixCategory } from '../../types';
import { NeuModal } from '../common/NeuModal';
import { NeuButton } from '../common/NeuButton';
import { NeuInput, NeuSelect } from '../common/NeuInput';
import { useAuth } from '../../context/AuthContext';
import { useData, isDeprecatedTemplate } from '../../context/DataContext';

interface SubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  sections: Section[];
  selectedSectionId?: string;
  subjectToEdit?: Subject | null;
  onSave: (subjectData: Omit<Subject, 'id'>, idToUpdate?: string) => void;
}

export const SubjectModal: React.FC<SubjectModalProps> = ({
  isOpen,
  onClose,
  sections,
  selectedSectionId,
  subjectToEdit,
  onSave,
}) => {
  const { currentUser, isDean } = useAuth();
  const { teachers, matrixTemplates } = useData();
  const validTemplates = matrixTemplates.filter((t) => !isDeprecatedTemplate(t.name, t.id));
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [sectionId, setSectionId] = useState(selectedSectionId || sections[0]?.id || '');
  const [teacherId, setTeacherId] = useState<string>(currentUser?.id || 'teacher-1');
  const [schedule, setSchedule] = useState('');
  const [units, setUnits] = useState(3);
  const [passingGrade, setPassingGrade] = useState(75);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('custom-blank');

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
      setSelectedTemplateId(validTemplates.length > 0 ? validTemplates[0].id : 'custom-blank');
    }
  }, [subjectToEdit, isOpen, selectedSectionId, sections, currentUser?.id, teachers, matrixTemplates]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim() || !sectionId) return;

    let initialMatrix: MatrixCategory[] = [];
    let initialPassingGrade = Number(passingGrade);

    if (subjectToEdit) {
      initialMatrix = subjectToEdit.matrix;
    } else {
      const chosenTemplate = matrixTemplates.find((t) => t.id === selectedTemplateId);
      if (chosenTemplate) {
        initialMatrix = chosenTemplate.matrix.map((c) => ({
          ...c,
          id: `cat-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`,
        }));
        initialPassingGrade = chosenTemplate.passingGrade || initialPassingGrade;
      } else {
        // Custom Blank Matrix - Ready for instructor to build criteria from scratch
        initialMatrix = [
          {
            id: `cat-${Date.now().toString(36)}-1`,
            name: 'Class Standing',
            weight: 50,
            color: 'emerald',
            subCategories: [
              { id: `sub-${Date.now().toString(36)}-1`, name: 'Quizzes / Outputs', weight: 100 },
            ],
          },
          {
            id: `cat-${Date.now().toString(36)}-2`,
            name: 'Periodic Examinations',
            weight: 50,
            color: 'rose',
          },
        ];
      }
    }

    const effectiveTeacherId = isDean ? (teacherId || currentUser?.id || 'teacher-1') : (currentUser?.id || 'teacher-1');

    onSave(
      {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        sectionId,
        teacherId: effectiveTeacherId,
        schedule: schedule.trim(),
        units: Number(units),
        passingGrade: initialPassingGrade,
        matrix: initialMatrix,
        useTransmutation: subjectToEdit ? (subjectToEdit.useTransmutation !== false) : true,
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

  const templateOptions = [
    ...validTemplates.map((t) => ({
      value: t.id,
      label: `${t.name} (Passing: ${t.passingGrade}%)`,
    })),
    {
      value: 'custom-blank',
      label: 'Build Custom Grading Matrix from Scratch (50% Class Standing, 50% Exam)',
    },
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

        <div className={`grid grid-cols-1 ${isDean ? 'sm:grid-cols-2' : ''} gap-3`}>
          <NeuSelect
            label="Target Class / Section"
            options={sectionOptions}
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            required
          />

          {isDean && (
            <NeuSelect
              label="Assigned Instructor / Faculty"
              options={teacherOptions.length > 0 ? teacherOptions : [{ value: currentUser?.id || 'teacher-1', label: currentUser?.name || 'Faculty Member' }]}
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              required
            />
          )}
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
            label="Grading Matrix Template"
            options={templateOptions}
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
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
