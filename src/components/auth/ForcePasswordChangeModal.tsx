import React, { useState, useEffect } from 'react';
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
  Mail,
  Send,
  Sparkles,
  RefreshCw,
  Info,
} from 'lucide-react';

interface ForcePasswordChangeModalProps {
  onShowToast: (title: string, message?: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export const ForcePasswordChangeModal: React.FC<ForcePasswordChangeModalProps> = ({ onShowToast }) => {
  const { currentUser, updateStudentPassword, sendEmailOtp, completeStudentOnboarding, signOut } = useAuth();
  const { sections, updateStudent } = useData();

  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Email & OTP state (for students)
  const isStudent = currentUser?.role === 'student';
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpSentToEmail, setOtpSentToEmail] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Timer countdown for resending OTP
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  if (!currentUser || !currentUser.mustChangePassword) {
    return null;
  }

  const assignedSection = sections.find((s) => s.id === currentUser.sectionId);

  const isMinLength = newPassword.length >= 8;
  const isMatching = newPassword.length > 0 && newPassword === confirmPassword;
  const isValidEmail = isStudent
    ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    : true;
  const isValidOtp = isStudent ? otp.trim().length === 6 : true;

  const isFormReady = isStudent
    ? isMinLength && isMatching && isValidEmail && isValidOtp && otpSent
    : isMinLength && isMatching;

  // Handle Requesting Email OTP
  const handleSendOtp = async () => {
    setErrorMessage(null);
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMessage('Please enter a valid personal email address first.');
      return;
    }

    setIsSendingOtp(true);
    const res = await sendEmailOtp(email.trim());
    setIsSendingOtp(false);

    if (res.success) {
      setOtpSent(true);
      setOtpSentToEmail(email.trim().toLowerCase());
      setCountdown(60);
      if (res.devOtp) {
        setDevOtpHint(res.devOtp);
      }
      onShowToast(
        'Verification Code Sent',
        `A 6-digit OTP was sent to ${email.trim()}. Valid for 10 minutes.`,
        'info'
      );
    } else {
      setErrorMessage(res.error || 'Failed to send verification email. Please try again.');
      onShowToast('Delivery Failed', res.error || 'Could not send verification email.', 'error');
    }
  };

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isMinLength) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (!isMatching) {
      setErrorMessage('Passwords do not match. Please re-type your confirmation password.');
      return;
    }

    if (isStudent) {
      if (!isValidEmail) {
        setErrorMessage('Please enter a valid personal email address.');
        return;
      }
      if (!otpSent) {
        setErrorMessage('Please click "Send Code" to verify your email first.');
        return;
      }
      if (otp.trim().length !== 6) {
        setErrorMessage('Please enter the 6-digit verification code sent to your email.');
        return;
      }
      if (otpSentToEmail !== email.trim().toLowerCase()) {
        setErrorMessage('Email was modified. Please re-send a verification code to your new email.');
        return;
      }
    }

    setIsSubmitting(true);

    if (isStudent) {
      // Complete student onboarding with verified email and new password
      const res = await completeStudentOnboarding(newPassword, email.trim(), otp.trim());
      setIsSubmitting(false);

      if (res.success) {
        // Sync email to local data store without queuing duplicate cloud upsert
        updateStudent(currentUser.id, { email: email.trim().toLowerCase() }, { skipSync: true });
        onShowToast(
          'Account Activated Successfully!',
          `Welcome, ${currentUser.name}! Your verified email (${email.trim()}) and permanent password are now active.`,
          'success'
        );
      } else {
        setErrorMessage(res.error || 'Failed to complete account activation. Please check your verification code.');
        onShowToast('Activation Failed', res.error || 'Could not activate account.', 'error');
      }
    } else {
      // Non-student (Teacher/Dean) password change
      const res = await updateStudentPassword(newPassword);
      setIsSubmitting(false);

      if (res.success) {
        onShowToast(
          'Password Updated Successfully!',
          `Your personalized password is now active. Welcome to your Faculty Portal!`,
          'success'
        );
      } else {
        setErrorMessage(res.error || 'Failed to update password. Please try again.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 animate-scale-up my-auto">
        {/* Top Header Badge */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center shrink-0 shadow-sm">
            {isStudent ? <Sparkles className="w-6 h-6" /> : <KeyRound className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300">
                First-Time Setup
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
                Mandatory Security
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              {isStudent ? 'Activate Your Student Account' : 'Set Your New Password'}
            </h2>
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {isStudent
            ? 'Welcome to Gradely! You signed in with your temporary default Student ID. Please create your personalized password and link a verified email address to secure your account.'
            : 'Welcome to Gradely! You have signed in with a temporary password. For account protection, please create a new personalized password to continue.'}
        </p>

        {/* Student Identity Card */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
          <div className="flex items-center gap-2.5">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
            />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {currentUser.name}
              </div>
              <div className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                User / Student ID: {currentUser.studentNumber || currentUser.id}
              </div>
            </div>
            {isStudent && (
              <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
                Student
              </span>
            )}
          </div>

          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
              {assignedSection?.name || 'Assigned Section'}
            </span>
            <span className="text-slate-400 truncate max-w-[170px]">
              {isStudent ? 'Demo Email (Unverified)' : currentUser.email}
            </span>
          </div>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2 animate-fade-in">
            <X className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Password & Email Verification Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* STEP 1: NEW PASSWORD */}
          <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                1
              </span>
              <span>Create Permanent Password</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* New Password */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Validation checklist */}
            <div className="flex items-center gap-4 text-[11px] pt-1">
              <div className={`flex items-center gap-1.5 ${isMinLength ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                {isMinLength ? <Check className="w-3.5 h-3.5" /> : <div className="w-3 h-3 rounded-full border border-slate-300 dark:border-slate-600" />}
                <span>8+ chars</span>
              </div>
              <div className={`flex items-center gap-1.5 ${isMatching ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                {isMatching ? <Check className="w-3.5 h-3.5" /> : <div className="w-3 h-3 rounded-full border border-slate-300 dark:border-slate-600" />}
                <span>Passwords match</span>
              </div>
            </div>
          </div>

          {/* STEP 2: VALID EMAIL & OTP (For Students) */}
          {isStudent && (
            <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                    2
                  </span>
                  <span>Link & Verify Valid Email</span>
                </div>
                {otpSent && (
                  <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" /> OTP Code Sent
                  </span>
                )}
              </div>

              {/* Email Address Input & Send Button */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center justify-between">
                  <span>Your Personal / Institutional Email</span>
                  <span className="text-[10px] text-slate-400">OTP will be sent here</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (otpSent && e.target.value.trim().toLowerCase() !== otpSentToEmail) {
                          setOtpSent(false);
                        }
                      }}
                      placeholder="e.g. shawn.personal@gmail.com"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isSendingOtp || countdown > 0 || !email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-700 text-white disabled:text-slate-400 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
                  >
                    {isSendingOtp ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : countdown > 0 ? (
                      <span>Resend ({countdown}s)</span>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>{otpSent ? 'Resend Code' : 'Send Code'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* OTP Code Input */}
              {otpSent && (
                <div className="space-y-1 animate-fade-in pt-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center justify-between">
                    <span>Enter 6-Digit Verification Code</span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400">Expires in 10 minutes</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="• • • • • •"
                      className="w-full tracking-[8px] text-center font-mono text-base font-bold py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                    />
                  </div>
                  {devOtpHint && (
                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Development Test Code: <strong className="font-mono">{devOtpHint}</strong></span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Submit Action */}
          <div className="space-y-2 pt-2">
            <NeuButton
              type="submit"
              variant="primary"
              size="lg"
              disabled={!isFormReady || isSubmitting}
              className="w-full justify-center shadow-lg shadow-indigo-600/20"
              leftIcon={<ShieldCheck className="w-4 h-4 text-white" />}
            >
              {isSubmitting
                ? 'Activating Account...'
                : isStudent
                ? 'Verify OTP & Activate Portal'
                : 'Save Password & Enter Portal'}
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
