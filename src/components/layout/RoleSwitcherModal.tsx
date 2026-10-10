import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { NeuModal } from '../common/NeuModal';
import { NeuBadge } from '../common/NeuBadge';
import { GraduationCap, Users, Sparkles, Check } from 'lucide-react';
import { User } from '../../types';

interface RoleSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoleSwitched: (newRole: User['role']) => void;
}

export const RoleSwitcherModal: React.FC<RoleSwitcherModalProps> = ({
  isOpen,
  onClose,
  onRoleSwitched,
}) => {
  const { currentUser, switchUser } = useAuth();
  const { allUsers, sections } = useData();

  const teachers = allUsers.filter((u) => u.role === 'teacher' || u.role === 'dean');
  const students = allUsers.filter((u) => u.role === 'student');

  const handleSelectUser = (user: User) => {
    switchUser(user);
    onRoleSwitched(user.role);
    onClose();
  };

  const getSectionName = (secId?: string) => {
    if (!secId) return 'Unassigned';
    return sections.find((s) => s.id === secId)?.name || secId;
  };

  return (
    <NeuModal
      isOpen={isOpen}
      onClose={onClose}
      title="Demo Account Switcher"
      subtitle="Seamlessly test the system from both Teacher and Student accounts"
      maxWidth="xl"
    >
      <div className="space-y-5">
        {/* Teachers Section */}
        <div>
          <div className="flex items-center gap-2 mb-2.5 px-0.5">
            <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Teacher Accounts (Full Management Access)
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {teachers.map((teacher) => {
              const isSelected = currentUser?.id === teacher.id;
              return (
                <div
                  key={teacher.id}
                  onClick={() => handleSelectUser(teacher)}
                  className={`p-3.5 rounded-xl cursor-pointer transition-all flex items-center justify-between border ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={teacher.avatar}
                      alt={teacher.name}
                      className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
                        {teacher.name}
                        {isSelected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 inline shrink-0" />}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{teacher.title || teacher.email}</div>
                    </div>
                  </div>
                  <NeuBadge variant="primary" size="sm">
                    Faculty
                  </NeuBadge>
                </div>
              );
            })}
          </div>
        </div>

        {/* Students Section */}
        <div>
          <div className="flex items-center gap-2 mb-2.5 px-0.5">
            <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Student Accounts (Score Sheets & Grade Calculator)
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {students.map((student) => {
              const isSelected = currentUser?.id === student.id;
              return (
                <div
                  key={student.id}
                  onClick={() => handleSelectUser(student)}
                  className={`p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between border ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/40 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={student.avatar}
                      alt={student.name}
                      className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
                        {student.name}
                        {isSelected && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 inline shrink-0" />}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {student.studentNumber} • {getSectionName(student.sectionId)}
                      </div>
                    </div>
                  </div>
                  <NeuBadge variant="success" size="sm">
                    Student
                  </NeuBadge>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hint banner */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400">
          <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span>
            Any grades or attendance recorded by the teacher update live in the selected student's portal in real-time.
          </span>
        </div>
      </div>
    </NeuModal>
  );
};
