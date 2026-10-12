import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import {
  Sun,
  Moon,
  Download,
  Upload,
  Sparkles,
  Settings,
  LogOut,
  ChevronDown,
  User,
} from 'lucide-react';
import { exportSystemDataToJSON } from '../../utils/exportUtils';
import { NeuButton } from '../common/NeuButton';
import { NeuBadge } from '../common/NeuBadge';
import { SyncStatusPill } from '../common/SyncStatusPill';
import { DatabaseResetModal } from '../teacher/DatabaseResetModal';
import { ProfileModal } from '../common/ProfileModal';

import logoImg from '../../logo.jpg';

interface NavbarProps {
  onOpenRoleSwitcher?: () => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onShowToast }) => {
  const { currentUser, theme, toggleTheme, isTeacher, isDean, signOut } = useAuth();
  const { getRawData, importData } = useData();
  const [showDataMenu, setShowDataMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const handleExportBackup = () => {
    const data = getRawData();
    exportSystemDataToJSON(data);
    onShowToast('Backup Exported', 'Full system state saved to JSON.', 'success');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = importData(content);
        if (ok) {
          onShowToast('Data Restored', 'System data restored successfully.', 'success');
        } else {
          onShowToast('Import Failed', 'Invalid JSON backup file structure.', 'error');
        }
      }
    };
    reader.readAsText(file);
    setShowDataMenu(false);
  };

  const handleSignOut = async () => {
    setShowUserMenu(false);
    await signOut();
    onShowToast('Signed Out', 'You have been safely signed out.', 'info');
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-[#070b14]/85 backdrop-blur-xl border-b border-slate-200/90 dark:border-slate-800/80 py-2.5 px-4 sm:px-6 md:px-8 transition-colors duration-200 shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Gradely Brand Logo & Tagline */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#0d1424] p-1 border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-center shrink-0">
            <img
              src={logoImg}
              alt="Gradely Logo"
              className="w-full h-full object-contain rounded-lg"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-xl font-bold font-heading tracking-tight text-[#1E3A8A] dark:text-blue-400">
                Gradely
              </span>
              <NeuBadge variant={isDean ? 'primary' : isTeacher ? 'info' : 'success'} size="sm">
                {isDean ? 'Dean' : isTeacher ? 'Faculty' : 'Student'}
              </NeuBadge>
            </div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hidden sm:block">
              Organize Learning. Empower Progress.
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Cloud Sync Status Indicator - ONLY FOR FACULTY */}
          {isTeacher && <SyncStatusPill />}

          {/* Theme Toggle */}
          <NeuButton
            variant="secondary"
            size="icon"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </NeuButton>

          {/* Current User Profile Pill & Dropdown */}
          <div className="relative">
            <div
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1 pr-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-750 transition-all"
              title="Click to view profile or sign out"
            >
              <img
                src={currentUser?.avatar}
                alt={currentUser?.name}
                className="w-7 h-7 rounded-lg object-cover ring-1 ring-slate-300 dark:ring-slate-600"
              />
              <div className="hidden md:block text-left">
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[110px]">
                  {currentUser?.name}
                </div>
                <div className="text-[10px] text-slate-500 capitalize">
                  {currentUser?.role}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </div>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#0d1424] rounded-2xl p-3 z-30 border border-slate-200 dark:border-slate-800 shadow-xl text-xs space-y-2 animate-fade-in">
                  <div className="flex items-center gap-3 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                    <img
                      src={currentUser?.avatar}
                      alt={currentUser?.name}
                      className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white truncate">
                        {currentUser?.name}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {currentUser?.email}
                      </div>
                      <div className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 capitalize">
                        {currentUser?.role === 'teacher' || currentUser?.role === 'dean'
                          ? (currentUser?.title || (currentUser?.role === 'dean' ? 'College Dean' : 'Faculty Member'))
                          : `Student #${currentUser?.studentNumber || '2026'}`}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        setIsProfileModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium text-left"
                    >
                      <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>Edit Profile & Security</span>
                    </button>

                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors font-medium text-left"
                    >
                      <LogOut className="w-4 h-4 text-rose-600" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Data Backup & Database Management Dropdown - ONLY FOR FACULTY */}
          {isTeacher && (
            <div className="relative">
              <NeuButton
                variant="secondary"
                size="icon"
                onClick={() => setShowDataMenu(!showDataMenu)}
                title="System Backup & Database Management"
              >
                <Settings className="w-4 h-4 text-slate-500 hover:text-indigo-600" />
              </NeuButton>

              {showDataMenu && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setShowDataMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-[#0d1424] rounded-2xl p-2 z-30 border border-slate-200 dark:border-slate-800 shadow-xl text-xs space-y-1 animate-fade-in">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Database Management
                    </div>

                    <button
                      onClick={() => {
                        setShowDataMenu(false);
                        setIsResetModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-indigo-700 dark:text-indigo-300 bg-indigo-50/60 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors font-bold text-left"
                    >
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span>Term Rollover & Reset</span>
                    </button>

                    <button
                      onClick={handleExportBackup}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium text-left"
                    >
                      <Download className="w-4 h-4 text-slate-500" />
                      <span>Export JSON Backup</span>
                    </button>

                    <label className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium cursor-pointer text-left">
                      <Upload className="w-4 h-4 text-slate-500" />
                      <span>Import JSON Backup</span>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportBackup}
                        className="hidden"
                      />
                    </label>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Database & Academic Year Reset Modal */}
      {isTeacher && (
        <DatabaseResetModal
          isOpen={isResetModalOpen}
          onClose={() => setIsResetModalOpen(false)}
          onShowToast={onShowToast}
        />
      )}

      {/* Profile & Password Update Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onShowToast={onShowToast}
      />
    </header>
  );
};
