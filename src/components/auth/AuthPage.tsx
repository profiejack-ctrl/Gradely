import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Lock,
  User as UserIcon,
  ArrowRight,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Cloud,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { NeuButton } from '../common/NeuButton';

import logoImg from '../../logo.jpg';

interface AuthPageProps {
  onShowToast: (title: string, message?: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onShowToast }) => {
  const { signIn, theme, toggleTheme } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!loginEmail.trim()) {
      setErrorMessage('Please enter your Student ID, Email, or Username.');
      return;
    }

    setIsSubmitting(true);
    const res = await signIn(loginEmail, loginPassword);
    setIsSubmitting(false);

    if (res.success) {
      onShowToast('Welcome to Gradely', 'Signed in successfully.', 'success');
    } else {
      setErrorMessage(res.error || 'Failed to sign in. Please verify your credentials.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#070b14] tech-grid-bg text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Top Header */}
      <header className="p-4 sm:p-6 flex items-center justify-between max-w-6xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white dark:bg-[#0d1424] p-1.5 border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-center shrink-0">
            <img src={logoImg} alt="Gradely Logo" className="w-full h-full object-contain rounded-xl" />
          </div>
          <div>
            <span className="text-xl font-bold font-heading tracking-tight text-[#1E3A8A] dark:text-blue-400">
              Gradely
            </span>
            <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Student Management System
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white/80 dark:bg-[#0d1424]/80 backdrop-blur-md text-xs font-semibold text-slate-600 dark:text-slate-400 shadow-2xs">
            <Cloud className="w-3.5 h-3.5 text-[#22C55E]" />
            <span>Cloud Database Active</span>
          </div>

          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white/80 dark:bg-[#0d1424]/80 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors shadow-2xs"
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="max-w-md w-full space-y-5">
          {/* Card Container */}
          <div className="bg-white/95 dark:bg-[#0d1424] rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-slate-800/90 shadow-xl dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_20px_40px_-15px_rgba(0,0,0,0.5)] space-y-6">
            {/* Header Badge */}
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-white dark:bg-[#0a0f1d] p-2 border border-slate-200/90 dark:border-slate-800 shadow-md mx-auto flex items-center justify-center">
                <img src={logoImg} alt="Gradely Logo" className="w-full h-full object-contain rounded-xl" />
              </div>
              <div>
                <h1 className="text-2xl font-bold font-heading text-[#1E3A8A] dark:text-white tracking-tight">
                  Welcome to Gradely
                </h1>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 italic">
                  Organize Learning. Empower Progress.
                </p>
              </div>
            </div>

            {/* Error banner */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-medium animate-fade-in flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* LOGIN FORM */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Student ID, Email, or Username</span>
                  <span className="text-[10px] font-normal text-indigo-600 dark:text-indigo-400">Institutional ID</span>
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="e.g. 22120613 or alex.mercer@aurasms.edu"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <span className="text-[10px] text-slate-400">
                    1st Login: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono">Student ID</code>
                  </span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Institutional Credentials Guidance */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Institutional Dean Access:</span>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-750 text-[11px] space-y-0.5">
                  <div className="font-semibold text-indigo-600 dark:text-indigo-400">
                    Dean Rommel Constantino
                  </div>
                  <div className="text-slate-600 dark:text-slate-300">
                    Email / Name: <code className="font-mono font-bold text-slate-900 dark:text-white">rommel.constantino@aurasms.edu</code> or <code className="font-mono font-bold text-slate-900 dark:text-white">Rommel Constantino</code>
                  </div>
                  <div className="text-slate-600 dark:text-slate-300">
                    Default Password: <code className="font-mono font-bold text-slate-900 dark:text-white">admin</code> or <code className="font-mono font-bold text-slate-900 dark:text-white">teacher123</code>
                  </div>
                </div>
              </div>

              <NeuButton
                type="submit"
                variant="primary"
                size="lg"
                disabled={isSubmitting}
                className="w-full justify-center mt-2 shadow-md shadow-indigo-600/20"
              >
                {isSubmitting ? 'Authenticating...' : 'Sign In to Portal'}
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </NeuButton>
            </form>
          </div>

          {/* Institutional Provisioning Notice */}
          <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/70 dark:border-slate-800 text-center space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <GraduationCap className="w-4 h-4 text-slate-500" />
              <span>Official Institutional Management System</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Faculty and Student accounts are provisioned by the Department Head and Academic Administration.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
