import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { NeuButton } from '../common/NeuButton';
import {
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  Check,
  X,
  Lock,
  GraduationCap,
} from 'lucide-react';

interface ForcePasswordChangeModalProps {
  onShowToast: (title: string, message?: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export const ForcePasswordChangeModal: React.FC<ForcePasswordChangeModalProps> = ({ onShowToast }) => {
  const { currentUser, updateStudentPassword, signOut } = useAuth();
  const { sections } = useData();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!currentUser || !currentUser.mustChangePassword) {
    return null;
  }

  const assignedSection = sections.find((s) => s.id === currentUser.sectionId);

  const isMinLength = newPassword.length >= 6;
  const isMatching = newPassword.length > 0 && newPassword === confirmPassword;
  const isDifferentFromTemp =
    Boolean(newPassword) &&
    newPassword !== currentUser.studentNumber &&
    newPassword.toLowerCase() !== 'student123' &&
    newPassword.toLowerCase() !== 'teacher123';

  const isValid = isMinLength && isMatching && isDifferentFromTemp;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isMinLength) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (!isMatching) {
      setErrorMessage('Passwords do not match. Please re-type your confirmation password.');
      return;
    }

    if (!isDifferentFromTemp) {
      setErrorMessage(
        currentUser.role === 'student'
          ? 'Your new password cannot be the same as your temporary Student ID or default password.'
          : 'Your new password cannot be the same as the default initial password.'
      );
      return;
    }

    setIsSubmitting(true);
    const res = await updateStudentPassword(newPassword);
    setIsSubmitting(false);

    if (res.success) {
      onShowToast(
        'Password Updated Successfully!',
        `Your custom password is now active. Welcome to your ${currentUser.role === 'student' ? 'Student Portal' : 'Faculty Portal'}!`,
        'success'
      );
    } else {
      setErrorMessage(res.error || 'Failed to update password. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 animate-scale-up">
        {/* Top Header Badge */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center justify-center shrink-0 shadow-sm">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300">
                Mandatory Security Step
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              Set Your New Password
            </h2>
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Welcome to Gradely! You have signed in with your temporary Student ID password. For account protection, please create a new personalized password to continue.
        </p>

        {/* Student Identity Card */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
          <div className="flex items-center gap-2.5">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
            />
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {currentUser.name}
              </div>
              <div className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                ID: {currentUser.studentNumber || 'Not assigned'}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
              {assignedSection?.name || 'Assigned Section'}
            </span>
            <span className="text-slate-400 truncate max-w-[150px]">{currentUser.email}</span>
          </div>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2 animate-fade-in">
            <X className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New Password */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Create New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min. 6 chars)"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Validation Checklist */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5 text-[11px]">
            <div className={`flex items-center gap-2 ${isMinLength ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
              {isMinLength ? <Check className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-600" />}
              <span>At least 6 characters</span>
            </div>
            <div className={`flex items-center gap-2 ${isMatching ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
              {isMatching ? <Check className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-600" />}
              <span>Passwords match</span>
            </div>
            <div className={`flex items-center gap-2 ${isDifferentFromTemp ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
              {isDifferentFromTemp ? <Check className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-600" />}
              <span>Different from temporary Student ID</span>
            </div>
          </div>

          {/* Submit Action */}
          <div className="space-y-2 pt-1">
            <NeuButton
              type="submit"
              variant="primary"
              size="lg"
              disabled={!isValid || isSubmitting}
              className="w-full justify-center shadow-lg shadow-indigo-600/20"
              leftIcon={<ShieldCheck className="w-4 h-4 text-white" />}
            >
              {isSubmitting ? 'Updating Password...' : 'Save Password & Enter Portal'}
            </NeuButton>

            <button
              type="button"
              onClick={() => signOut()}
              className="w-full text-center text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 py-1 font-medium transition-colors"
            >
              Cancel & Sign Out
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
