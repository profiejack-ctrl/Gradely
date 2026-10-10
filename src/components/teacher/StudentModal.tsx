import React, { useState, useEffect } from 'react';
import { User, Section } from '../../types';
import { NeuModal } from '../common/NeuModal';
import { NeuButton } from '../common/NeuButton';
import { NeuInput, NeuSelect } from '../common/NeuInput';

interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  sections: Section[];
  selectedSectionId?: string;
  studentToEdit?: User | null;
  onSave: (studentData: Omit<User, 'id' | 'role'>, idToUpdate?: string) => void;
}

export const StudentModal: React.FC<StudentModalProps> = ({
  isOpen,
  onClose,
  sections,
  selectedSectionId,
  studentToEdit,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [sectionId, setSectionId] = useState(selectedSectionId || sections[0]?.id || '');
  const [avatar, setAvatar] = useState('');

  useEffect(() => {
    if (studentToEdit) {
      setName(studentToEdit.name);
      setEmail(studentToEdit.email);
      setStudentNumber(studentToEdit.studentNumber || '');
      setSectionId(studentToEdit.sectionId || sections[0]?.id || '');
      setAvatar(studentToEdit.avatar || '');
    } else {
      setName('');
      setEmail('');
      setStudentNumber(`2026-0${Math.floor(100 + Math.random() * 900)}`);
      setSectionId(selectedSectionId || sections[0]?.id || '');
      setAvatar('');
    }
  }, [studentToEdit, isOpen, selectedSectionId, sections]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const generatedAvatar =
      avatar.trim() ||
      `https://images.unsplash.com/photo-${1530000000000 + Math.floor(Math.random() * 9999999)}?w=150&auto=format&fit=crop&q=80`;

    onSave(
      {
        name: name.trim(),
        email: email.trim(),
        studentNumber: studentNumber.trim(),
        sectionId,
        avatar: generatedAvatar,
      },
      studentToEdit?.id
    );
    onClose();
  };

  const sectionOptions = sections.map((s) => ({
    value: s.id,
    label: `${s.name} (${s.gradeLevelOrYear})`,
  }));

  return (
    <NeuModal
      isOpen={isOpen}
      onClose={onClose}
      title={studentToEdit ? 'Edit Student Profile' : 'Enroll New Student'}
      subtitle="Add a student to class roster and assign to section"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <NeuInput
          label="Full Name"
          placeholder="e.g. Liam Davis"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <NeuInput
            label="Email Address"
            type="email"
            placeholder="e.g. liam.davis@student.aurasms.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <NeuInput
            label="Student ID Number"
            placeholder="e.g. 2026-0102"
            value={studentNumber}
            onChange={(e) => setStudentNumber(e.target.value)}
            required
          />
        </div>

        <NeuSelect
          label="Enrolled Class / Section"
          options={sectionOptions}
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
          required
        />

        <div className="flex items-center justify-end gap-3 pt-3">
          <NeuButton type="button" variant="secondary" onClick={onClose}>
            Cancel
          </NeuButton>
          <NeuButton type="submit" variant="primary" disabled={!name.trim() || !email.trim()}>
            {studentToEdit ? 'Update Student' : 'Enroll Student'}
          </NeuButton>
        </div>
      </form>
    </NeuModal>
  );
};
