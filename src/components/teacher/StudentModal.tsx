import React, { useState, useEffect, useRef } from 'react';
import { User, Section } from '../../types';
import { NeuModal } from '../common/NeuModal';
import { NeuButton } from '../common/NeuButton';
import { NeuInput } from '../common/NeuInput';
import { getStudentSectionIds } from '../../utils/enrollmentUtils';
import { Check, Upload, Camera, Sparkles } from 'lucide-react';
import { processAvatarFile } from '../../utils/imageUtils';

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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingImage(true);
    setImageError(null);
    try {
      const dataUrl = await processAvatarFile(file);
      setAvatar(dataUrl);
    } catch (err: any) {
      setImageError(err?.message || 'Failed to process image');
    } finally {
      setIsProcessingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleGenerateAvatar = () => {
    const randomSeed = Math.random().toString(36).substring(7);
    setAvatar(`https://api.dicebear.com/7.x/lorelei/svg?seed=${randomSeed}`);
  };

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
            placeholder="e.g. liam.davis@student.gradely.edu"
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

        {/* Avatar Section */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          className="hidden"
        />

        <div className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative group w-12 h-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 cursor-pointer shadow-sm hover:border-[#F97316] transition-all"
            title="Click to upload custom photo"
          >
            {avatar ? (
              <img src={avatar} alt="Avatar Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 font-bold">
                {name ? name.charAt(0).toUpperCase() : 'Stu'}
              </div>
            )}
            <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
              <Camera className="w-4 h-4" />
            </div>
            {isProcessingImage && (
              <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center text-white text-[10px]">
                ...
              </div>
            )}
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <NeuButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                leftIcon={<Upload className="w-3 h-3" />}
                className="text-xs py-1 px-2.5"
              >
                Upload Photo
              </NeuButton>
              <button
                type="button"
                onClick={handleGenerateAvatar}
                className="text-xs font-semibold text-[#1E3A8A] dark:text-blue-300 hover:text-[#F97316] flex items-center gap-1.5 transition-colors ml-1"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#F97316]" />
                <span>Random</span>
              </button>
            </div>
            {imageError && (
              <p className="text-[11px] text-rose-500 font-medium">{imageError}</p>
            )}
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Custom picture or generated avatar
            </p>
          </div>
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
