import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { NeuButton } from './NeuButton';
import { NeuBadge } from './NeuBadge';
import {
  User as UserIcon,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Shield,
  Building,
  GraduationCap,
  Check,
  X,
  RefreshCw,
  Upload,
  Camera,
  Link2,
} from 'lucide-react';
import { processAndUploadAvatar } from '../../utils/imageUtils';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const { currentUser, isTeacher, updateProfile } = useAuth();
  const { sections } = useData();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('');
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');

  // Password change state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Avatar upload and custom photo state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [showCustomUrlInput, setShowCustomUrlInput] = useState(false);
  const [customUrl, setCustomUrl] = useState('');

  // Sync form with current user on open
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
      setAvatar(currentUser.avatar || '');
      setTitle(currentUser.title || '');
      setDepartment(currentUser.department || '');
      setShowPasswordSection(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrentPassword(false);
      setShowPassword(false);
      setShowConfirmPassword(false);
      setErrorMessage(null);
      setShowCustomUrlInput(false);
      setCustomUrl('');
      setIsDragging(false);
      setIsProcessingImage(false);
    }
  }, [currentUser, isOpen]);

  // Lock body scroll and handle Escape key while open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !currentUser || typeof document === 'undefined') return null;

  const assignedSection = sections.find((s) => s.id === currentUser.sectionId);

  const handleGenerateDicebearAvatar = () => {
    const randomSeed = Math.random().toString(36).substring(2, 9);
    const style = isTeacher ? 'bottts' : 'lorelei';
    const newAvatarUrl = `https://api.dicebear.com/7.x/${style}/svg?seed=${randomSeed}`;
    setAvatar(newAvatarUrl);
  };

  const processImageFile = async (file: File) => {
    setIsProcessingImage(true);
    setErrorMessage(null);
    try {
      const result = await processAndUploadAvatar(file, currentUser.id, { maxWidth: 256, maxHeight: 256, quality: 0.85 });
      setAvatar(result.url);
      if (result.isCloudStorage) {
        onShowToast('Cloud Upload Complete', 'Saved to Supabase S3 Storage. Click Save Changes to apply.', 'success');
      } else {
        onShowToast('Photo Ready', 'Custom picture selected. Click Save Changes to apply.', 'info');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to process selected image.');
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processImageFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processImageFile(file);
    }
  };

  const handleApplyCustomUrl = () => {
    if (!customUrl.trim()) return;
    setAvatar(customUrl.trim());
    setShowCustomUrlInput(false);
    setCustomUrl('');
    onShowToast('Avatar URL Set', 'Image URL applied. Click Save Changes to apply.', 'info');
  };

  const isPasswordValid =
    !showPasswordSection ||
    (!newPassword && !confirmPassword && !currentPassword) ||
    (currentPassword.trim().length > 0 &&
      newPassword.length >= 6 &&
      newPassword === confirmPassword &&
      newPassword !== currentPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Full name is required.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('A valid email address is required.');
      return;
    }

    if (showPasswordSection && (newPassword || currentPassword || confirmPassword)) {
      if (!currentPassword.trim()) {
        setErrorMessage('Current password is required to change your password.');
        return;
      }
      if (newPassword.length < 6) {
        setErrorMessage('New password must be at least 6 characters long.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMessage('New password and confirm password do not match.');
        return;
      }
      if (newPassword === currentPassword) {
        setErrorMessage('New password cannot be identical to your current password.');
        return;
      }
    }

    setIsSubmitting(true);
    const res = await updateProfile(
      {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        avatar: avatar.trim() || currentUser.avatar,
        title: isTeacher ? title.trim() : undefined,
        department: isTeacher ? department.trim() : undefined,
      },
      showPasswordSection && newPassword ? newPassword : undefined,
      showPasswordSection && currentPassword ? currentPassword : undefined
    );
    setIsSubmitting(false);

    if (res.success) {
      onShowToast(
        'Profile Updated',
        'Your profile information and preferences have been successfully updated.',
        'success'
      );
      onClose();
    } else {
      setErrorMessage(res.error || 'Failed to update profile. Please try again.');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/70 backdrop-blur-md animate-fade-in">
      {/* Backdrop overlay dismiss click */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Viewport alignment wrapper */}
      <div className="flex min-h-screen items-center justify-center p-3 sm:p-6 text-left">
        <div
          role="dialog"
          aria-modal="true"
          className="relative w-full max-w-lg bg-white dark:bg-[#0d1424] border border-slate-200/90 dark:border-slate-800/90 rounded-3xl shadow-2xl dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_20px_40px_-15px_rgba(0,0,0,0.5)] my-auto z-10 flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)] overflow-hidden animate-scale-up"
        >
          {/* Fixed Header */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white/95 dark:bg-[#0d1424]/95 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#1E3A8A] dark:text-blue-400 border border-blue-200/80 dark:border-blue-800/80 flex items-center justify-center shrink-0 shadow-2xs">
                <UserIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold font-heading text-slate-900 dark:text-white">
                    Account Profile
                  </h2>
                  <NeuBadge variant={isTeacher ? 'primary' : 'success'} size="sm">
                    {isTeacher ? 'Faculty' : 'Student'}
                  </NeuBadge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Manage personal information and security
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form wrapper */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            {/* Scrollable Content Body */}
            <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5 min-h-0">
              {/* Error Banner */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2.5 animate-fade-in">
                  <X className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Avatar Section */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Profile Photo / Avatar
                  </label>
                  <span className="text-[11px] text-slate-400">
                    PNG, JPG, WebP up to 10MB
                  </span>
                </div>

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                />

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {/* Avatar Preview Box with Hover & Drag-and-Drop */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`relative group shrink-0 cursor-pointer rounded-2xl overflow-hidden shadow-md transition-all ${
                      isDragging
                        ? 'ring-4 ring-[#F97316] ring-offset-2 scale-105 shadow-orange-500/20'
                        : 'ring-2 ring-[#1E3A8A]/30 dark:ring-blue-500/30 hover:ring-[#F97316]/70 hover:shadow-lg'
                    }`}
                    title="Click or drag an image here to upload custom photo"
                  >
                    <img
                      src={avatar || currentUser.avatar}
                      alt={name}
                      className="w-20 h-20 object-cover rounded-2xl transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'User')}`;
                      }}
                    />

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity duration-200">
                      <Camera className="w-5 h-5 mb-0.5" />
                      <span className="text-[10px] font-semibold tracking-wide uppercase">Change</span>
                    </div>

                    {/* Processing Spinner Overlay */}
                    {isProcessingImage && (
                      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-1">
                        <RefreshCw className="w-5 h-5 animate-spin text-[#F97316]" />
                        <span className="text-[9px] font-medium">Resizing...</span>
                      </div>
                    )}
                  </div>

                  {/* Actions & Presets */}
                  <div className="flex-1 space-y-2.5 w-full">
                    {/* Action buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <NeuButton
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessingImage}
                        leftIcon={<Upload className="w-3.5 h-3.5" />}
                        className="text-xs"
                      >
                        Upload Photo
                      </NeuButton>

                      <NeuButton
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleGenerateDicebearAvatar}
                        leftIcon={<Sparkles className="w-3.5 h-3.5 text-[#F97316]" />}
                        className="text-xs"
                      >
                        Random Avatar
                      </NeuButton>

                      <NeuButton
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowCustomUrlInput(!showCustomUrlInput)}
                        leftIcon={<Link2 className="w-3.5 h-3.5 text-slate-500" />}
                        className="text-xs"
                      >
                        URL
                      </NeuButton>
                    </div>

                    {/* Custom URL Input Field (Collapsible) */}
                    {showCustomUrlInput && (
                      <div className="flex items-center gap-2 pt-1 animate-fade-in">
                        <input
                          type="url"
                          placeholder="Paste image URL (https://...)"
                          value={customUrl}
                          onChange={(e) => setCustomUrl(e.target.value)}
                          className="flex-1 text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                        />
                        <NeuButton
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={handleApplyCustomUrl}
                          disabled={!customUrl.trim()}
                          className="text-xs"
                        >
                          Apply
                        </NeuButton>
                      </div>
                    )}

                    {/* Preset Avatars Row */}
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="text-[11px] text-slate-400 shrink-0">Presets:</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {AVATAR_PRESETS.map((presetUrl, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setAvatar(presetUrl)}
                            className={`w-7 h-7 rounded-lg overflow-hidden border-2 transition-all ${
                              avatar === presetUrl
                                ? 'border-[#F97316] scale-110 shadow-sm'
                                : 'border-transparent opacity-70 hover:opacity-100 hover:scale-105'
                            }`}
                          >
                            <img src={presetUrl} alt="preset" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Read-only Student Badges */}
              {!isTeacher && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#1E3A8A] dark:text-blue-400">
                      Student ID Number
                    </div>
                    <div className="text-sm font-mono font-bold text-slate-900 dark:text-white mt-0.5 tabular-nums">
                      {currentUser.studentNumber || 'Not assigned'}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Enrolled Class Section
                    </div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5 flex items-center gap-1.5 truncate">
                      <GraduationCap className="w-4 h-4 text-[#1E3A8A] dark:text-blue-400 shrink-0" />
                      <span className="truncate">{assignedSection?.name || 'Unassigned'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Primary Form Fields */}
              <div className="space-y-4">
                {/* Name Field */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter full name"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-700 bg-slate-50/50 dark:bg-[#090e1a] text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-[#1E3A8A]/20 dark:focus:ring-blue-500/25 focus:border-[#1E3A8A] focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Email Field */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-700 bg-slate-50/50 dark:bg-[#090e1a] text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-[#1E3A8A]/20 dark:focus:ring-blue-500/25 focus:border-[#1E3A8A] focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Teacher Specific: Academic Title & Department */}
                {isTeacher && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Academic Title
                      </label>
                      <div className="relative">
                        <Shield className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="e.g. Assoc. Professor"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-700 bg-slate-50/50 dark:bg-[#090e1a] text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-[#1E3A8A]/20 dark:focus:ring-blue-500/25 focus:border-[#1E3A8A] focus:outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Department / College
                      </label>
                      <div className="relative">
                        <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          placeholder="e.g. Computer Science"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-700 bg-slate-50/50 dark:bg-[#090e1a] text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-[#1E3A8A]/20 dark:focus:ring-blue-500/25 focus:border-[#1E3A8A] focus:outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Password Change Toggle & Fields */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Security & Password
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Update your login password
                    </span>
                  </div>

                  <NeuButton
                    type="button"
                    variant={showPasswordSection ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => {
                      setShowPasswordSection(!showPasswordSection);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setShowCurrentPassword(false);
                      setShowPassword(false);
                      setShowConfirmPassword(false);
                      setErrorMessage(null);
                    }}
                    className="text-xs"
                  >
                    {showPasswordSection ? 'Cancel Password Change' : 'Change Password'}
                  </NeuButton>
                </div>

                {showPasswordSection && (
                  <div className="p-4 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 space-y-3.5 animate-fade-in">
                    {/* Current Password Field */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Current Password <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[10px] text-slate-400">
                          Verify identity
                        </span>
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter your existing password"
                          className="w-full pl-10 pr-10 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#090e1a] text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-[#1E3A8A]/20 dark:focus:ring-blue-500/25 focus:border-[#1E3A8A] focus:outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-2 text-slate-400 hover:text-slate-600"
                        >
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* New Password Field */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        New Password <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password (min. 6 chars)"
                          className="w-full pl-10 pr-10 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#090e1a] text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-[#1E3A8A]/20 dark:focus:ring-blue-500/25 focus:border-[#1E3A8A] focus:outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-2 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm New Password Field */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Confirm New Password <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter your new password"
                          className="w-full pl-10 pr-10 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#090e1a] text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-[#1E3A8A]/20 dark:focus:ring-blue-500/25 focus:border-[#1E3A8A] focus:outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-2 text-slate-400 hover:text-slate-600"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Validation Checklist */}
                    {(currentPassword || newPassword || confirmPassword) && (
                      <div className="p-2.5 rounded-xl bg-white/70 dark:bg-[#090e1a]/70 border border-slate-200/50 dark:border-slate-700/50 space-y-1 text-[11px]">
                        <div className={`flex items-center gap-1.5 ${currentPassword.trim().length > 0 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400'}`}>
                          {currentPassword.trim().length > 0 ? <Check className="w-3.5 h-3.5" /> : <div className="w-3 h-3 rounded-full border border-slate-300" />}
                          <span>Current password entered</span>
                        </div>
                        <div className={`flex items-center gap-1.5 ${newPassword.length >= 6 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400'}`}>
                          {newPassword.length >= 6 ? <Check className="w-3.5 h-3.5" /> : <div className="w-3 h-3 rounded-full border border-slate-300" />}
                          <span>New password has at least 6 characters</span>
                        </div>
                        <div className={`flex items-center gap-1.5 ${newPassword === confirmPassword && confirmPassword ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400'}`}>
                          {newPassword === confirmPassword && confirmPassword ? <Check className="w-3.5 h-3.5" /> : <div className="w-3 h-3 rounded-full border border-slate-300" />}
                          <span>New password and confirm password match</span>
                        </div>
                        {newPassword && currentPassword && newPassword === currentPassword && (
                          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium pt-0.5">
                            <span>New password cannot be identical to current password</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="flex items-center justify-end gap-3 px-5 sm:px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/90 dark:bg-[#0a101f]/90 backdrop-blur-md">
              <NeuButton
                type="button"
                variant="secondary"
                size="md"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </NeuButton>

              <NeuButton
                type="submit"
                variant="primary"
                size="md"
                disabled={isSubmitting || !isPasswordValid}
                leftIcon={<Check className="w-4 h-4 text-white" />}
              >
                {isSubmitting ? 'Saving Changes...' : 'Save Profile'}
              </NeuButton>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
};
