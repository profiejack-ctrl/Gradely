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

const YEAR_LEVEL_OPTIONS = [
  { value: '1st Year College', label: '1st Year College' },
  { value: '2nd Year College', label: '2nd Year College' },
  { value: '3rd Year College', label: '3rd Year College' },
  { value: '4th Year College', label: '4th Year College' },
  { value: '5th Year College', label: '5th Year College' },
  { value: 'Graduate Studies', label: 'Graduate Studies (Master\'s / PhD)' },
  { value: 'Grade 11 (Senior High)', label: 'Grade 11 (Senior High)' },
  { value: 'Grade 12 (Senior High)', label: 'Grade 12 (Senior High)' },
  { value: 'Grade 7 (Junior High)', label: 'Grade 7 (Junior High)' },
  { value: 'Grade 8 (Junior High)', label: 'Grade 8 (Junior High)' },
  { value: 'Grade 9 (Junior High)', label: 'Grade 9 (Junior High)' },
  { value: 'Grade 10 (Junior High)', label: 'Grade 10 (Junior High)' },
  { value: '__custom__', label: 'Custom / Other...' },
];

const SEMESTER_TERM_OPTIONS = [
  { value: '1st Semester', label: '1st Semester' },
  { value: '2nd Semester', label: '2nd Semester' },
  { value: 'Summer / Midyear Term', label: 'Summer / Midyear Term' },
  { value: '1st Trimester', label: '1st Trimester' },
  { value: '2nd Trimester', label: '2nd Trimester' },
  { value: '3rd Trimester', label: '3rd Trimester' },
  { value: '1st Quarter', label: '1st Quarter' },
  { value: '2nd Quarter', label: '2nd Quarter' },
  { value: '3rd Quarter', label: '3rd Quarter' },
  { value: '4th Quarter', label: '4th Quarter' },
  { value: 'Full Academic Year', label: 'Full Academic Year' },
  { value: '__custom__', label: 'Custom / Other...' },
];

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
  const [gradeLevelOrYear, setGradeLevelOrYear] = useState('1st Year College');
  const [showCustomYear, setShowCustomYear] = useState(false);
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [semester, setSemester] = useState('1st Semester');
  const [showCustomSemester, setShowCustomSemester] = useState(false);
  const [room, setRoom] = useState('');
  const [description, setDescription] = useState('');
  const [adviserId, setAdviserId] = useState<string>(currentUserId || '');

  useEffect(() => {
    if (sectionToEdit) {
      setName(sectionToEdit.name);
      setGradeLevelOrYear(sectionToEdit.gradeLevelOrYear || '1st Year College');
      setAcademicYear(sectionToEdit.academicYear || '2025-2026');
      setSemester(sectionToEdit.semester || '1st Semester');
      setRoom(sectionToEdit.room || '');
      setDescription(sectionToEdit.description || '');
      setAdviserId(sectionToEdit.adviserId || currentUserId || '');
      setShowCustomYear(false);
      setShowCustomSemester(false);
    } else {
      setName('');
      setGradeLevelOrYear('1st Year College');
      setAcademicYear('2025-2026');
      setSemester('1st Semester');
      setRoom('');
      setDescription('');
      setAdviserId(currentUserId || '');
      setShowCustomYear(false);
      setShowCustomSemester(false);
    }
  }, [sectionToEdit, isOpen, currentUserId]);

  // Ensure any existing custom value from database is available in the dropdown
  const yearOptions = YEAR_LEVEL_OPTIONS.some((o) => o.value === gradeLevelOrYear)
    ? YEAR_LEVEL_OPTIONS
    : gradeLevelOrYear
    ? [{ value: gradeLevelOrYear, label: gradeLevelOrYear }, ...YEAR_LEVEL_OPTIONS]
    : YEAR_LEVEL_OPTIONS;

  const semesterOptions = SEMESTER_TERM_OPTIONS.some((o) => o.value === semester)
    ? SEMESTER_TERM_OPTIONS
    : semester
    ? [{ value: semester, label: semester }, ...SEMESTER_TERM_OPTIONS]
    : SEMESTER_TERM_OPTIONS;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // For non-deans, always enforce currentUserId as adviser
    const effectiveAdviserId = isDean ? (adviserId.trim() || undefined) : (currentUserId || undefined);

    onSave(
      {
        name: name.trim(),
        gradeLevelOrYear: gradeLevelOrYear.trim() || '1st Year College',
        academicYear: academicYear.trim(),
        semester: semester.trim() || '1st Semester',
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
          <NeuSelect
            label="Year / Grade Level"
            options={yearOptions}
            value={showCustomYear ? '__custom__' : gradeLevelOrYear}
            onChange={(e) => {
              if (e.target.value === '__custom__') {
                setShowCustomYear(true);
                setGradeLevelOrYear('');
              } else {
                setShowCustomYear(false);
                setGradeLevelOrYear(e.target.value);
              }
            }}
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

        {showCustomYear && (
          <NeuInput
            label="Custom Year / Grade Level"
            placeholder="Type custom year or grade level..."
            value={gradeLevelOrYear}
            onChange={(e) => setGradeLevelOrYear(e.target.value)}
            required
            autoFocus
          />
        )}

        <div className="grid grid-cols-2 gap-3">
          <NeuSelect
            label="Semester / Term"
            options={semesterOptions}
            value={showCustomSemester ? '__custom__' : semester}
            onChange={(e) => {
              if (e.target.value === '__custom__') {
                setShowCustomSemester(true);
                setSemester('');
              } else {
                setShowCustomSemester(false);
                setSemester(e.target.value);
              }
            }}
          />

          <NeuInput
            label="Room / Location (Optional)"
            placeholder="e.g. Lab 402 or MV208"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          />
        </div>

        {showCustomSemester && (
          <NeuInput
            label="Custom Semester / Term"
            placeholder="Type custom semester or term..."
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            required
            autoFocus
          />
        )}

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
