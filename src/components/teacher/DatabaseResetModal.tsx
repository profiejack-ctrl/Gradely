import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { NeuModal } from '../common/NeuModal';
import { NeuButton } from '../common/NeuButton';
import { NeuInput } from '../common/NeuInput';
import { exportSystemDataToJSON } from '../../utils/exportUtils';
import {
  Sparkles,
  Calendar,
  Download,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  RefreshCw,
  GraduationCap,
} from 'lucide-react';

interface DatabaseResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

type ResetTab = 'official' | 'rollover';

export const DatabaseResetModal: React.FC<DatabaseResetModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const {
    sections,
    students,
    subjects,
    scores,
    attendance,
    getRawData,
    startFreshOfficial,
    rolloverAcademicYear,
  } = useData();
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<ResetTab>('official');
  const [isProcessing, setIsProcessing] = useState(false);

  // Tab 1: Official Start Settings
  const [syncOfficialToCloud, setSyncOfficialToCloud] = useState(true);
  const [confirmText, setConfirmText] = useState('');

  // Tab 2: Rollover Settings
  const [newYear, setNewYear] = useState('2026-2027');
  const [newSemester, setNewSemester] = useState<'1st Semester' | '2nd Semester' | 'Summer Term'>('2nd Semester');
  const [clearScores, setClearScores] = useState(true);
  const [clearAttendance, setClearAttendance] = useState(true);
  const [clearAssessments, setClearAssessments] = useState(false);
  const [syncRolloverToCloud, setSyncRolloverToCloud] = useState(true);

  const handleExportBackupFirst = () => {
    const data = getRawData();
    exportSystemDataToJSON(data);
    onShowToast('Backup Saved', 'System snapshot downloaded to your computer.', 'success');
  };

  // 1. Execute Official Clean Slate
  const handleStartOfficial = async () => {
    if (confirmText.trim().toUpperCase() !== 'START') {
      onShowToast('Confirmation Required', 'Please type START to proceed with official launch.', 'warning');
      return;
    }

    setIsProcessing(true);
    try {
      await startFreshOfficial({ wipeCloud: syncOfficialToCloud });
      onShowToast('System Ready for Production', 'All demo data cleared. Faculty login & templates retained.', 'success');
      setConfirmText('');
      onClose();
    } catch (err) {
      onShowToast('Reset Error', 'Failed to complete official reset.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Execute Rollover
  const handleRollover = async () => {
    setIsProcessing(true);
    try {
      await rolloverAcademicYear(newYear, newSemester, {
        clearScores,
        clearAttendance,
        clearAssessments,
        syncToCloud: syncRolloverToCloud,
      });
      onShowToast(
        'Term Rolled Over',
        `Academic period set to ${newYear} (${newSemester}). Ready for new term records.`,
        'success'
      );
      onClose();
    } catch (err) {
      onShowToast('Rollover Error', 'Failed to roll over academic year.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <NeuModal
      isOpen={isOpen}
      onClose={onClose}
      title="Academic Year & Database Management"
      subtitle="Configure term rollover or start fresh with a clean slate for official institutional use"
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Quick Safety Backup Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                Recommended: Download Safety Backup
              </div>
              <div className="text-[11px] text-indigo-700 dark:text-indigo-300">
                Exports all current records ({students.length} students, {scores.length} scores, {attendance.length} attendance logs) to JSON.
              </div>
            </div>
          </div>
          <NeuButton
            size="sm"
            variant="secondary"
            onClick={handleExportBackupFirst}
            leftIcon={<Download className="w-3.5 h-3.5 text-indigo-600" />}
          >
            Export JSON
          </NeuButton>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setActiveTab('official')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'official'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Clean Slate / Launch</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rollover')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'rollover'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>New Academic Term</span>
          </button>
        </div>

        {/* Tab 1: Official Start (Clean Slate) */}
        {activeTab === 'official' && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-2">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Start Fresh for Official School Deployment</span>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                This prepares the database for real school operations by purging all dummy mock data.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Clears {students.length} dummy students & scores</span>
                </div>
                <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Clears {sections.length} demo sections & {subjects.length} subjects</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Keeps Faculty Profile ({currentUser?.name})</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Keeps Matrix Templates & Academic Holidays</span>
                </div>
              </div>
            </div>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 cursor-pointer">
              <input
                type="checkbox"
                checked={syncOfficialToCloud}
                onChange={(e) => setSyncOfficialToCloud(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500"
              />
              <div className="text-xs">
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  Also clear Supabase Cloud PostgreSQL database
                </div>
                <div className="text-slate-500 text-[11px]">
                  Removes demo rows from cloud tables so your live Vercel deployment starts completely clean.
                </div>
              </div>
            </label>

            <div className="space-y-2 pt-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Type <span className="font-bold text-rose-600">START</span> to confirm:
              </label>
              <NeuInput
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type START in uppercase"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <NeuButton variant="secondary" onClick={onClose} disabled={isProcessing}>
                Cancel
              </NeuButton>
              <NeuButton
                variant="danger"
                onClick={handleStartOfficial}
                disabled={confirmText.trim().toUpperCase() !== 'START' || isProcessing}
                leftIcon={<Sparkles className="w-4 h-4" />}
              >
                {isProcessing ? 'Purging Demo Data...' : 'Wipe Demo Data & Go Live'}
              </NeuButton>
            </div>
          </div>
        )}

        {/* Tab 2: Term / Year Rollover */}
        {activeTab === 'rollover' && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/60 text-xs text-indigo-900 dark:text-indigo-300 space-y-1">
              <div className="font-bold flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                <span>Academic Term Rollover</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Advance your classes into a new semester or school year while preserving your student directory and subject configurations.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  New Academic Year
                </label>
                <NeuInput
                  value={newYear}
                  onChange={(e) => setNewYear(e.target.value)}
                  placeholder="e.g. 2026-2027"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  New Semester
                </label>
                <select
                  value={newSemester}
                  onChange={(e) => setNewSemester(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="1st Semester">1st Semester</option>
                  <option value="2nd Semester">2nd Semester</option>
                  <option value="Summer Term">Summer Term</option>
                </select>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Select Rollover Actions:
              </div>

              <label className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={clearScores}
                  onChange={(e) => setClearScores(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded-md border-slate-300"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300">
                  Clear score submissions & grades for new term
                </span>
              </label>

              <label className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={clearAttendance}
                  onChange={(e) => setClearAttendance(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded-md border-slate-300"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300">
                  Reset attendance logs for new term (start fresh attendance roll)
                </span>
              </label>

              <label className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={clearAssessments}
                  onChange={(e) => setClearAssessments(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded-md border-slate-300"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300">
                  Clear existing assessments (uncheck to reuse existing quiz/exam structure)
                </span>
              </label>

              <label className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncRolloverToCloud}
                  onChange={(e) => setSyncRolloverToCloud(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded-md border-slate-300"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300">
                  Synchronize rolled-over state to Supabase Cloud
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <NeuButton variant="secondary" onClick={onClose} disabled={isProcessing}>
                Cancel
              </NeuButton>
              <NeuButton
                variant="primary"
                onClick={handleRollover}
                disabled={isProcessing || !newYear.trim()}
                leftIcon={<RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />}
              >
                {isProcessing ? 'Rolling Over...' : `Advance to ${newSemester}`}
              </NeuButton>
            </div>
          </div>
        )}

      </div>
    </NeuModal>
  );
};
