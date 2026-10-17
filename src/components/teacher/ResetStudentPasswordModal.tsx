import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { User } from '../../types';
import { NeuModal } from '../common/NeuModal';
import { NeuButton } from '../common/NeuButton';
import { NeuSelect } from '../common/NeuInput';
import { isStudentInSection, getStudentSectionIds } from '../../utils/enrollmentUtils';
import {
  RotateCcw,
  Search,
  Check,
  Copy,
  AlertTriangle,
  ShieldAlert,
  Lock,
} from 'lucide-react';

interface ResetStudentPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedStudent?: User | null;
  onShowToast: (title: string, message?: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export const ResetStudentPasswordModal: React.FC<ResetStudentPasswordModalProps> = ({
  isOpen,
  onClose,
  preselectedStudent,
  onShowToast,
}) => {
  const { currentUser, isDean } = useAuth();
  const { students, sections, subjects, resetUserPassword } = useData();

  // Confidentiality scoping:
  // Deans can view and reset passwords across all sections.
  // Regular faculty can strictly only access students enrolled in sections they advise or teach.
  const accessibleSections = useMemo(() => {
    if (isDean) return sections;
    return sections.filter(
      (sec) =>
        sec.adviserId === currentUser?.id ||
        subjects.some((s) => s.sectionId === sec.id && s.teacherId === currentUser?.id)
    );
  }, [isDean, sections, subjects, currentUser?.id]);

  const accessibleStudents = useMemo(() => {
    if (isDean) return students;
    const accessibleSecIdSet = new Set(accessibleSections.map((s) => s.id));
    return students.filter((stud) => {
      const secIds = getStudentSectionIds(stud);
      return (
        secIds.some((id) => accessibleSecIdSet.has(id)) ||
        accessibleSections.some((sec) => isStudentInSection(stud, sec.id))
      );
    });
  }, [isDean, students, accessibleSections]);

  // Check if preselected student is permitted under confidentiality rules
  const isPreselectedPermitted = useMemo(() => {
    if (!preselectedStudent) return true;
    if (isDean) return true;
    return accessibleStudents.some((s) => s.id === preselectedStudent.id);
  }, [preselectedStudent, isDean, accessibleStudents]);

  const [selectedStudent, setSelectedStudent] = useState<User | null>(
    isPreselectedPermitted && preselectedStudent ? preselectedStudent : null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState('all');
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccessData, setResetSuccessData] = useState<{
    student: User;
    initialPassword: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedStudent(preselectedStudent || null);
      setResetSuccessData(null);
      setCopied(false);
      setSearchQuery('');
      setSelectedSectionFilter('all');
    }
  }, [isOpen, preselectedStudent]);

  const targetStudent = selectedStudent || preselectedStudent;
  const initialPasswordForTarget = targetStudent?.studentNumber || targetStudent?.id || 'Student ID';

  // Filter students strictly within accessible students only (confidentiality enforcement)
  const filteredStudents = accessibleStudents.filter((s) => {
    if (selectedSectionFilter !== 'all') {
      if (!isStudentInSection(s, selectedSectionFilter)) return false;
    }
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(query) ||
      (s.studentNumber && s.studentNumber.toLowerCase().includes(query)) ||
      s.email.toLowerCase().includes(query)
    );
  });

  const handlePerformReset = async () => {
    if (!targetStudent) return;

    // Confidentiality guard: non-deans can only reset students in their own classes
    if (!isDean && !accessibleStudents.some((s) => s.id === targetStudent.id)) {
      onShowToast('Access Denied', 'You may only reset passwords for students in your assigned classes.', 'error');
      return;
    }

    setIsResetting(true);
    try {
      const res = await resetUserPassword(targetStudent.id);
      setIsResetting(false);

      if (res.success) {
        setResetSuccessData({
          student: targetStudent,
          initialPassword: res.initialPassword,
        });
        onShowToast(
          'Password Reset Successful',
          `"${targetStudent.name}" password reset to ${res.initialPassword}. Required to change on next login.`,
          'success'
        );
      } else {
        onShowToast('Reset Failed', res.error || 'Could not reset password.', 'error');
      }
    } catch (e: any) {
      setIsResetting(false);
      onShowToast('Error', e?.message || 'Failed to reset password.', 'error');
    }
  };

  const handleCopyPassword = () => {
    if (!resetSuccessData) return;
    navigator.clipboard.writeText(resetSuccessData.initialPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onShowToast('Copied to Clipboard', `Temporary password: ${resetSuccessData.initialPassword}`, 'info');
  };

  const sectionOptions = [
    { value: 'all', label: isDean ? 'All Sections' : 'All My Classes / Sections' },
    ...accessibleSections.map((s) => ({ value: s.id, label: s.name })),
  ];

  return (
    <NeuModal
      isOpen={isOpen}
      onClose={onClose}
      title={resetSuccessData ? 'Password Reset Complete' : 'Reset Student Password'}
      subtitle={
        resetSuccessData
          ? 'Temporary credentials are now active for this student account.'
          : 'Generate a secure temporary password with required update on login.'
      }
      maxWidth="lg"
    >
      {resetSuccessData ? (
        /* Success Screen */
        <div className="space-y-5 py-2 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto shadow-inner">
            <Check className="w-8 h-8 stroke-[2.5]" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Password Successfully Reset!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              The login credentials for <span className="font-semibold text-slate-700 dark:text-slate-300">{resetSuccessData.student.name}</span> have been restored.
            </p>
          </div>

          {/* Credential Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-left space-y-3 max-w-md mx-auto">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Temporary Initial Password:</span>
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase">Requires change on login</span>
            </div>

            <div className="flex items-center justify-between gap-2 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-inner">
              <span className="font-mono text-base font-bold tracking-wider text-slate-900 dark:text-white select-all">
                {resetSuccessData.initialPassword}
              </span>
              <button
                type="button"
                onClick={handleCopyPassword}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
              <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>
                Inform the student to log in using their Student ID as both User ID and Password (<strong>{resetSuccessData.initialPassword}</strong>). They will be required to create a new password and verify a valid personal email via OTP before accessing their portal.
              </span>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-center gap-2 border-t border-slate-100 dark:border-slate-800">
            <NeuButton
              variant="secondary"
              size="md"
              onClick={() => {
                setResetSuccessData(null);
                setSelectedStudent(null);
              }}
            >
              Reset Another Student
            </NeuButton>
            <NeuButton
              variant="primary"
              size="md"
              onClick={onClose}
            >
              Done
            </NeuButton>
          </div>
        </div>
      ) : (
        /* Selection & Confirmation View */
        <div className="space-y-4">
          {preselectedStudent && !isPreselectedPermitted ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-900">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Confidentiality Restriction</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                This student is enrolled in another faculty member's class. For student privacy and institutional confidentiality, credentials may only be reset by their assigned instructor or the College Dean.
              </p>
              <div className="pt-2">
                <NeuButton variant="secondary" size="sm" onClick={onClose}>
                  Close
                </NeuButton>
              </div>
            </div>
          ) : (
            <>
              {!isDean && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 text-xs text-[#1E3A8A] dark:text-blue-300 font-medium">
                  <Lock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>
                    <strong>Confidentiality Enforced:</strong> Showing only students and sections enrolled in your assigned classes.
                  </span>
                </div>
              )}

              {!preselectedStudent && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-1 relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search student by name or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>
                    <div className="w-full sm:w-44">
                      <NeuSelect
                        value={selectedSectionFilter}
                        onChange={(e) => setSelectedSectionFilter(e.target.value)}
                        options={sectionOptions}
                      />
                    </div>
                  </div>

                  {/* Candidate list if no student selected yet */}
                  {!selectedStudent && (
                    <div className="max-h-56 overflow-y-auto space-y-1.5 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-2 bg-slate-50/50 dark:bg-slate-900/50">
                      {filteredStudents.length === 0 ? (
                        <div className="text-center py-6 text-xs text-slate-400">
                          {accessibleStudents.length === 0
                            ? 'No students currently enrolled in your assigned classes or sections.'
                            : `No students found matching "${searchQuery}"`}
                        </div>
                      ) : (
                        filteredStudents.map((stud) => {
                          const secNames = getStudentSectionIds(stud)
                            .map((id) => accessibleSections.find((s) => s.id === id)?.name || sections.find((s) => s.id === id)?.name)
                            .filter(Boolean)
                            .join(', ');

                      return (
                        <div
                          key={stud.id}
                          onClick={() => setSelectedStudent(stud)}
                          className="p-2.5 rounded-xl border border-transparent hover:border-amber-200 dark:hover:border-amber-800 hover:bg-amber-50/40 dark:hover:bg-amber-950/20 cursor-pointer flex items-center justify-between gap-2 transition-all"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={stud.avatar}
                              alt={stud.name}
                              className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {stud.name}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                                <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">{stud.studentNumber || 'No ID'}</span>
                                {secNames && <span>• {secNames}</span>}
                              </div>
                            </div>
                          </div>
                          <NeuButton size="sm" variant="secondary" className="text-xs py-1 px-2.5">
                            Select
                          </NeuButton>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {/* Target Student Details Card */}
          {targetStudent ? (
            <div className="space-y-3.5">
              {!preselectedStudent && (
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Selected Student:</span>
                  <button
                    type="button"
                    onClick={() => setSelectedStudent(null)}
                    className="text-amber-600 dark:text-amber-400 hover:underline font-semibold cursor-pointer"
                  >
                    Change Student
                  </button>
                </div>
              )}

              <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/80 flex items-center gap-3.5">
                <img
                  src={targetStudent.avatar}
                  alt={targetStudent.name}
                  className="w-12 h-12 rounded-xl object-cover ring-2 ring-amber-300 dark:ring-amber-700 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {targetStudent.name}
                  </div>
                  <div className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                    Student ID: {targetStudent.studentNumber || 'Not assigned'}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {targetStudent.email}
                  </div>
                </div>
              </div>

              {/* Reset Information Box */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Password will reset to:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded">
                    {initialPasswordForTarget}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Security Requirement:</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    Forced Change on Login
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-100/50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  When reset, the server generates a one-time temporary password. The student must set a new password before viewing grades or attendance.
                </span>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <NeuButton
                  variant="secondary"
                  size="md"
                  onClick={onClose}
                  disabled={isResetting}
                >
                  Cancel
                </NeuButton>
                <NeuButton
                  variant="primary"
                  size="md"
                  onClick={handlePerformReset}
                  disabled={isResetting}
                  leftIcon={<RotateCcw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {isResetting ? 'Resetting Password...' : 'Reset Password to Initial'}
                </NeuButton>
              </div>
            </div>
          ) : (
              <div className="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                <NeuButton
                  variant="secondary"
                  size="md"
                  onClick={onClose}
                >
                  Cancel
                </NeuButton>
              </div>
            )}
          </>
        )}
      </div>
    )}
  </NeuModal>
);
};
