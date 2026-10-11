import React, { useState, useEffect } from 'react';
import { Section, User } from '../../types';
import { NeuModal } from '../common/NeuModal';
import { NeuButton } from '../common/NeuButton';
import { NeuInput, NeuSelect, NeuTextarea } from '../common/NeuInput';

interface SectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionToEdit?: Section | null;
  onSave: (sectionData: Omit<Section, 'id'>, idToUpdate?: string) => void;
  teachers?: User[];
  currentUserId?: string;
  isDean?: boolean;
}

export const SectionModal: React.FC<SectionModalProps> = ({
  isOpen,
  onClose,
  sectionToEdit,
  onSave,
  teachers = [],
  currentUserId,
  isDean = false,
}) => {
  const [name, setName] = useState('');
  const [gradeLevelOrYear, setGradeLevelOrYear] = useState('');
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [semester, setSemester] = useState('1st Semester');
  const [room, setRoom] = useState('');
  const [description, setDescription] = useState('');
  const [adviserId, setAdviserId] = useState<string>(currentUserId || '');

  useEffect(() => {
    if (sectionToEdit) {
      setName(sectionToEdit.name);
      setGradeLevelOrYear(sectionToEdit.gradeLevelOrYear);
      setAcademicYear(sectionToEdit.academicYear);
      setSemester(sectionToEdit.semester);
      setRoom(sectionToEdit.room || '');
      setDescription(sectionToEdit.description || '');
      setAdviserId(sectionToEdit.adviserId || currentUserId || '');
    } else {
      setName('');
      setGradeLevelOrYear('3rd Year College');
      setAcademicYear('2025-2026');
      setSemester('1st Semester');
      setRoom('');
      setDescription('');
      setAdviserId(currentUserId || '');
    }
  }, [sectionToEdit, isOpen, currentUserId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // For non-deans, always enforce currentUserId as adviser
    const effectiveAdviserId = isDean ? (adviserId.trim() || undefined) : (currentUserId || undefined);

    onSave(
      {
        name: name.trim(),
        gradeLevelOrYear: gradeLevelOrYear.trim(),
        academicYear: academicYear.trim(),
        semester: semester.trim(),
        room: room.trim(),
        description: description.trim(),
        adviserId: effectiveAdviserId,
      },
      sectionToEdit?.id
    );
    onClose();
  };

  return (
    <NeuModal
      isOpen={isOpen}
      onClose={onClose}
      title={sectionToEdit ? 'Edit Class / Section' : 'Create New Class / Section'}
      subtitle="Define a classroom section or cohort of students"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <NeuInput
          label="Section / Class Name"
          placeholder="e.g. BSCS 3-A or Grade 10 - Diamond"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <NeuInput
            label="Year / Grade Level"
            placeholder="e.g. 3rd Year College or Grade 10"
            value={gradeLevelOrYear}
            onChange={(e) => setGradeLevelOrYear(e.target.value)}
            required
          />

          <NeuInput
            label="Academic Year"
            placeholder="e.g. 2025-2026"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NeuInput
            label="Semester / Term"
            placeholder="e.g. 1st Semester"
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
          />

          <NeuInput
            label="Room / Location (Optional)"
            placeholder="e.g. Lab 402"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          />
        </div>

        {isDean && teachers.length > 0 && (
          <NeuSelect
            label="Class Adviser / Assigned Faculty"
            options={[
              { value: '', label: 'Unassigned / Open' },
              ...teachers.map((t) => ({
                value: t.id,
                label: `${t.name} ${t.department ? `(${t.department})` : ''}`,
              })),
            ]}
            value={adviserId}
            onChange={(e) => setAdviserId(e.target.value)}
          />
        )}

        <NeuTextarea
          label="Description (Optional)"
          placeholder="Brief details regarding this class/section..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />

        <div className="flex items-center justify-end gap-3 pt-3">
          <NeuButton type="button" variant="secondary" onClick={onClose}>
            Cancel
          </NeuButton>
          <NeuButton type="submit" variant="primary" disabled={!name.trim()}>
            {sectionToEdit ? 'Update Section' : 'Create Section'}
          </NeuButton>
        </div>
      </form>
    </NeuModal>
  );
};
