import React, { useState, useEffect, useRef } from 'react';
import { User } from '../../types';
import { NeuModal } from '../common/NeuModal';
import { NeuButton } from '../common/NeuButton';
import { NeuInput, NeuSelect } from '../common/NeuInput';
import { Sparkles, KeyRound, Upload, Camera } from 'lucide-react';
import { processAvatarFile } from '../../utils/imageUtils';

interface FacultyModalProps {
  isOpen: boolean;
  onClose: () => void;
  facultyToEdit?: User | null;
  defaultDepartment?: string;
  onSave: (
    facultyData: Omit<User, 'id'>,
    initialPassword?: string,
    mustChangePassword?: boolean,
    idToUpdate?: string
  ) => void;
}

const ACADEMIC_TITLE_PRESETS = [
  { value: 'Instructor I', label: 'Instructor I' },
  { value: 'Instructor II', label: 'Instructor II' },
  { value: 'Assistant Professor', label: 'Assistant Professor' },
  { value: 'Associate Professor', label: 'Associate Professor' },
  { value: 'Full Professor', label: 'Full Professor' },
  { value: 'Department Chair & Professor', label: 'Department Chair & Professor' },
  { value: 'College Dean & Professor', label: 'College Dean & Professor' },
  { value: 'Lecturer / Adjunct Faculty', label: 'Lecturer / Adjunct Faculty' },
];

export const FacultyModal: React.FC<FacultyModalProps> = ({
  isOpen,
  onClose,
  facultyToEdit,
  defaultDepartment = 'College of Information and Computing Sciences',
  onSave,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('Assistant Professor');
  const [role, setRole] = useState<'teacher' | 'dean'>('teacher');
  const [department, setDepartment] = useState(defaultDepartment);
  const [password, setPassword] = useState('');
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [avatar, setAvatar] = useState('');

  useEffect(() => {
    if (facultyToEdit) {
      setName(facultyToEdit.name || '');
      setEmail(facultyToEdit.email || '');
      setTitle(facultyToEdit.title || 'Assistant Professor');
      setRole(facultyToEdit.role === 'dean' ? 'dean' : 'teacher');
      setDepartment(facultyToEdit.department || defaultDepartment);
      setPassword(''); // Blank means do not change existing password
      setMustChangePassword(facultyToEdit.mustChangePassword || false);
      setAvatar(facultyToEdit.avatar || '');
    } else {
      setName('');
      setEmail('');
      setTitle('Assistant Professor');
      setRole('teacher');
      setDepartment(defaultDepartment);
      setPassword('');
      setMustChangePassword(false);
      setAvatar('');
    }
  }, [facultyToEdit, isOpen, defaultDepartment]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    if (!facultyToEdit && password.trim().length < 8) return;

    const generatedAvatar =
      avatar.trim() ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name.trim())}`;

    onSave(
      {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        title: title.trim(),
        department: department.trim(),
        avatar: generatedAvatar,
      },
      password.trim() || undefined,
      mustChangePassword,
      facultyToEdit?.id
    );
    onClose();
  };

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
    setAvatar(`https://api.dicebear.com/7.x/avataaars/svg?seed=${randomSeed}`);
  };

  return (
    <NeuModal
      isOpen={isOpen}
      onClose={onClose}
      title={facultyToEdit ? 'Edit Faculty Member' : 'Add Faculty Member'}
      subtitle="Provision an instructor or faculty account with assigned academic rank and credentials"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <NeuInput
          label="Full Name"
          placeholder="e.g. Dr. Elena Vance"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <NeuInput
            label="Email Address (Login Username)"
            type="email"
            placeholder="e.g. elena.vance@gradely.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <NeuSelect
            label="Academic Rank / Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            options={ACADEMIC_TITLE_PRESETS}
          />
        </div>

        <NeuInput
          label="College / Department"
          placeholder="e.g. College of Information and Computing Sciences"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          required
        />

        <NeuSelect
          label="System Authorization Level"
          value={role}
          onChange={(e) => {
            const nextRole = e.target.value as 'teacher' | 'dean';
            setRole(nextRole);
            if (nextRole === 'dean' && !title.includes('Chair') && !title.includes('Dean')) {
              setTitle('Department Chair & Professor');
            }
          }}
          options={[
            { value: 'teacher', label: 'Instructor / Faculty Member (Standard teaching & grading access)' },
            { value: 'dean', label: 'Dean / Department Chair (Authorized to provision faculty accounts)' },
          ]}
        />

        {/* Credentials Section */}
        <div className="p-3.5 rounded-xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-900/40 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#c2410c] dark:text-orange-300">
            <KeyRound className="w-4 h-4 text-[#F97316]" />
            <span>Account Password & Access</span>
          </div>

          <NeuInput
            label={facultyToEdit ? 'New Password (Leave blank to keep current)' : 'Initial Password'}
            type="text"
            placeholder={facultyToEdit ? 'Enter to change password' : 'Minimum 8 characters'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <label className="flex items-start gap-2.5 cursor-pointer select-none text-xs text-slate-700 dark:text-slate-300 pt-1">
            <input
              type="checkbox"
              checked={mustChangePassword}
              onChange={(e) => setMustChangePassword(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
            />
            <span>Require instructor to change password on first login</span>
          </label>
        </div>

        {/* Avatar Section */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          className="hidden"
        />

        <div className="flex items-center gap-3.5 pt-1">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative group w-14 h-14 rounded-2xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 cursor-pointer shadow-sm hover:border-[#F97316] transition-all"
            title="Click to upload custom photo"
          >
            {avatar ? (
              <img src={avatar} alt="Avatar Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 font-bold">
                {name ? name.charAt(0).toUpperCase() : 'Prof'}
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
                leftIcon={<Upload className="w-3.5 h-3.5" />}
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
              Upload custom photo or generate a random avatar
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
          <NeuButton type="button" variant="secondary" onClick={onClose}>
            Cancel
          </NeuButton>
          <NeuButton type="submit" variant="primary">
            {facultyToEdit ? 'Save Changes' : 'Create Faculty Account'}
          </NeuButton>
        </div>
      </form>
    </NeuModal>
  );
};
