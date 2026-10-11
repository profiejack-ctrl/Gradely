import React, { useState, useEffect } from 'react';
import { User, Section } from '../../types';
import { NeuModal } from '../common/NeuModal';
import { NeuButton } from '../common/NeuButton';
import { NeuInput } from '../common/NeuInput';
import { getStudentSectionIds } from '../../utils/enrollmentUtils';
import { Check } from 'lucide-react';

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
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);
  const [avatar, setAvatar] = useState('');

  useEffect(() => {
    if (studentToEdit) {
      setName(studentToEdit.name);
      setEmail(studentToEdit.email);
      setStudentNumber(studentToEdit.studentNumber || '');
      const enrolled = getStudentSectionIds(studentToEdit);
      setSelectedSectionIds(enrolled.length > 0 ? enrolled : (selectedSectionId ? [selectedSectionId] : [sections[0]?.id].filter(Boolean)));
      setAvatar(studentToEdit.avatar || '');
    } else {
      setName('');
      setEmail('');
      setStudentNumber(`2026-0${Math.floor(100 + Math.random() * 900)}`);
      const defaultSec = selectedSectionId && selectedSectionId !== 'all' ? selectedSectionId : sections[0]?.id;
      setSelectedSectionIds(defaultSec ? [defaultSec] : []);
      setAvatar('');
    }
  }, [studentToEdit, isOpen, selectedSectionId, sections]);

  const toggleSection = (id: string) => {
    setSelectedSectionIds((prev) =>
      prev.includes(id) ? prev.filter((sId) => sId !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const finalSectionIds = selectedSectionIds.length > 0
      ? selectedSectionIds
      : [sections[0]?.id].filter(Boolean);

    const generatedAvatar =
      avatar.trim() ||
      `https://images.unsplash.com/photo-${1530000000000 + Math.floor(Math.random() * 9999999)}?w=150&auto=format&fit=crop&q=80`;

    onSave(
      {
        name: name.trim(),
        email: email.trim(),
        studentNumber: studentNumber.trim(),
        sectionId: finalSectionIds[0],
        sectionIds: finalSectionIds,
        avatar: generatedAvatar,
      },
      studentToEdit?.id
    );
    onClose();
  };

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

        {/* Multi-Class Enrollment Selection */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Enrolled Classes / Cohorts (Multi-Class Enrollment Supported)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            {sections.map((sec) => {
              const isSelected = selectedSectionIds.includes(sec.id);
              return (
                <button
                  type="button"
                  key={sec.id}
                  onClick={() => toggleSection(sec.id)}
                  className={`flex items-center justify-between p-2.5 rounded-lg border text-left text-xs transition-all ${
                    isSelected
                      ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 text-blue-900 dark:text-blue-200 font-semibold'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <div className="truncate mr-2">
                    <span className="block truncate">{sec.name}</span>
                    <span className="text-[10px] text-slate-400 block truncate">{sec.gradeLevelOrYear}</span>
                  </div>
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Select all classes this student belongs to. Students can take courses across multiple sections concurrently.
          </p>
        </div>

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
