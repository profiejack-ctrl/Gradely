import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { User, Subject } from '../../types';
import { NeuCard } from '../common/NeuCard';
import { NeuButton } from '../common/NeuButton';
import { NeuBadge } from '../common/NeuBadge';
import { NeuInput, NeuSelect } from '../common/NeuInput';
import { FacultyModal } from './FacultyModal';
import { compareByLastName, formatLastFirst } from '../../utils/nameUtils';
import {
  UserPlus,
  Search,
  Edit2,
  Trash2,
  Mail,
  GraduationCap,
  Award,
  BookOpen,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  ArrowUpDown,
  Building,
} from 'lucide-react';

interface FacultyManagerProps {
  onNavigateToSubjects?: (subjectId?: string) => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export const FacultyManager: React.FC<FacultyManagerProps> = ({
  onNavigateToSubjects,
  onShowToast,
}) => {
  const { teachers, subjects, sections, addTeacher, updateTeacher, deleteTeacher, resetUserPassword } = useData();
  const { currentUser, isDean } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [sortBy, setSortBy] = useState<'last-name-asc' | 'last-name-desc' | 'first-name-asc' | 'title'>('last-name-asc');
  const [displayLastFirst, setDisplayLastFirst] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [facultyToEdit, setFacultyToEdit] = useState<User | null>(null);

  // Departments list for filter
  const departments = Array.from(
    new Set(teachers.map((t) => t.department).filter(Boolean) as string[])
  );

  // Filtered list
  const filteredTeachers = teachers.filter((t) => {
    const matchesDept = selectedDept === 'all' || t.department === selectedDept;
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.title && t.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.department && t.department.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesDept && matchesSearch;
  });

  // Sorted list
  const sortedTeachers = [...filteredTeachers].sort((a, b) => {
    if (sortBy === 'last-name-asc') {
      return compareByLastName(a.name, b.name, 'asc');
    }
    if (sortBy === 'last-name-desc') {
      return compareByLastName(a.name, b.name, 'desc');
    }
    if (sortBy === 'first-name-asc') {
      return a.name.localeCompare(b.name);
    }
    if (sortBy === 'title') {
      return (a.title || '').localeCompare(b.title || '');
    }
    return 0;
  });

  // Get subjects taught by a specific teacher
  const getTeacherSubjects = (teacherId: string): Subject[] => {
    return subjects.filter((s) => s.teacherId === teacherId);
  };

  const handleOpenAdd = () => {
    if (!isDean) {
      onShowToast('Authorization Required', 'Only Deans and Department Chairs are authorized to add new faculty.', 'error');
      return;
    }
    setFacultyToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (teacher: User) => {
    if (!isDean) {
      onShowToast('Authorization Required', 'Only Deans and Department Chairs can edit other faculty profiles.', 'error');
      return;
    }
    setFacultyToEdit(teacher);
    setIsModalOpen(true);
  };

  const handleDelete = (teacher: User) => {
    if (!isDean) {
      onShowToast('Authorization Required', 'Only Deans and Department Chairs can remove faculty members.', 'error');
      return;
    }

    if (teacher.id === currentUser?.id) {
      onShowToast('Action Blocked', 'You cannot delete your own active faculty account.', 'error');
      return;
    }

    if (teachers.length <= 1) {
      onShowToast('Action Blocked', 'Cannot remove the last instructor in the institution.', 'warning');
      return;
    }

    const assignedCount = getTeacherSubjects(teacher.id).length;
    const confirmMessage = assignedCount > 0
      ? `"${teacher.name}" is currently assigned to ${assignedCount} subject(s). Are you sure you want to remove this faculty member?`
      : `Are you sure you want to remove "${teacher.name}" from the faculty roster?`;

    if (window.confirm(confirmMessage)) {
      const ok = deleteTeacher(teacher.id);
      if (ok) {
        onShowToast('Faculty Removed', `"${teacher.name}" has been removed.`, 'warning');
      } else {
        onShowToast('Error', 'Failed to delete faculty member.', 'error');
      }
    }
  };

  const handleResetPassword = async (teacher: User) => {
    if (!isDean) {
      onShowToast('Authorization Required', 'Only Deans and Department Chairs can reset faculty passwords.', 'error');
      return;
    }

    if (
      window.confirm(
        `Generate a new temporary password for "${teacher.name}"?\n\nThey will be required to change it upon their next login.`
      )
    ) {
      const res = await resetUserPassword(teacher.id);
      if (res.success) {
        onShowToast(
          'Faculty Password Reset',
          `"${teacher.name}" password reset to "${res.initialPassword}". Required to change on next login.`,
          'success'
        );
      } else {
        onShowToast('Reset Failed', res.error || 'Failed to reset faculty password.', 'error');
      }
    }
  };

  const handleSaveFaculty = (
    data: Omit<User, 'id'>,
    password?: string,
    mustChangePassword?: boolean,
    idToUpdate?: string
  ) => {
    if (!isDean) {
      onShowToast('Authorization Required', 'Only Deans and Department Chairs can modify faculty.', 'error');
      return;
    }

    if (idToUpdate) {
      updateTeacher(idToUpdate, data, password);
      onShowToast('Faculty Updated', `"${data.name}" profile and credentials updated.`, 'success');
    } else {
      void addTeacher(data, password, mustChangePassword).then((created) => {
        if (created) {
          onShowToast('Faculty Account Created', `"${data.name}" added to department roster. Share the temporary password securely.`, 'success');
        } else {
          onShowToast('Faculty Creation Failed', 'The faculty account could not be created. Please check the email and API connection.', 'error');
        }
      });
    }
  };

  const deptOptions = [
    { value: 'all', label: 'All Departments & Colleges' },
    ...departments.map((d) => ({ value: d, label: d })),
  ];

  const sortOptions = [
    { value: 'last-name-asc', label: 'Sort: Last Name (A → Z)' },
    { value: 'last-name-desc', label: 'Sort: Last Name (Z → A)' },
    { value: 'first-name-asc', label: 'Sort: First Name (A → Z)' },
    { value: 'title', label: 'Sort: Academic Rank / Title' },
  ];

  const chairsCount = teachers.filter(
    (t) => t.role === 'dean' || (t.title || '').toLowerCase().includes('chair') || (t.title || '').toLowerCase().includes('dean')
  ).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 dark:text-white tracking-tight">
              {isDean ? 'Faculty Management' : 'Faculty Directory'}
            </h1>
            <NeuBadge variant="info">
              {teachers.length} Instructors
            </NeuBadge>
            {chairsCount > 0 && (
              <NeuBadge variant="warning">
                {chairsCount} Dean/Chair{chairsCount > 1 ? 's' : ''}
              </NeuBadge>
            )}
            {isDean && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                Dean Authorized
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {isDean
              ? 'Provision faculty accounts, manage academic titles, credentials, and subject teaching assignments.'
              : 'Institutional staff directory and course teaching assignments.'}
          </p>
        </div>

        {isDean ? (
          <NeuButton
            variant="primary"
            onClick={handleOpenAdd}
            leftIcon={<UserPlus className="w-4 h-4" />}
            className="shadow-sm"
          >
            Add Faculty Member
          </NeuButton>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
            <span>Dean Auth Required to Add Faculty</span>
          </div>
        )}
      </div>

      {/* Non-Dean Informational Banner */}
      {!isDean && (
        <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 flex items-start sm:items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-[#1E3A8A] dark:text-blue-300 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4 text-[#1E3A8A]" />
          </div>
          <div className="flex-1 text-xs text-slate-700 dark:text-slate-300">
            <strong className="font-bold text-[#1E3A8A] dark:text-blue-300 block mb-0.5">
              Faculty Directory (View-Only Mode)
            </strong>
            You are signed in with instructor privileges. Adding new faculty accounts, modifying credentials, and assigning administrative ranks is restricted to the <strong>College Dean</strong> and <strong>Department Chair</strong>.
          </div>
        </div>
      )}

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <NeuCard className="p-4 flex items-center gap-3.5 border-l-4 border-l-[#1E3A8A]">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-[#1E3A8A] dark:text-blue-400">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">{teachers.length}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Faculty Members</div>
          </div>
        </NeuCard>

        <NeuCard className="p-4 flex items-center gap-3.5 border-l-4 border-l-[#F97316]">
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/60 flex items-center justify-center text-[#F97316] dark:text-orange-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">{subjects.length}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Assigned Subject Courses</div>
          </div>
        </NeuCard>

        <NeuCard className="p-4 flex items-center gap-3.5 border-l-4 border-l-[#FACC15]">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {departments.length || 1}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Academic Departments</div>
          </div>
        </NeuCard>
      </div>

      {/* Toolbar / Filters */}
      <NeuCard className="p-3.5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          <div className="lg:col-span-5">
            <NeuInput
              placeholder="Search faculty by name, email, or rank..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>

          <div className="lg:col-span-3">
            <NeuSelect
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              options={deptOptions}
            />
          </div>

          <div className="lg:col-span-3">
            <NeuSelect
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              options={sortOptions}
            />
          </div>

          <div className="lg:col-span-1 flex justify-end">
            <button
              onClick={() => setDisplayLastFirst((prev) => !prev)}
              title={displayLastFirst ? 'Display: Last, First (Click to switch to First Last)' : 'Display: First Last (Click to switch to Last, First)'}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center justify-center border transition-all ${
                displayLastFirst
                  ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800 text-[#c2410c] dark:text-orange-300'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1 pt-1 border-t border-slate-100 dark:border-slate-800">
          <span>
            Showing <strong className="text-slate-800 dark:text-slate-200">{sortedTeachers.length}</strong> of {teachers.length} faculty members
          </span>
          <span className="text-[11px]">
            Display format: <strong className="text-slate-700 dark:text-slate-300">{displayLastFirst ? 'Last Name, First Name' : 'First Name Last Name'}</strong>
          </span>
        </div>
      </NeuCard>

      {/* Faculty Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedTeachers.map((teacher) => {
          const teacherSubs = getTeacherSubjects(teacher.id);
          const isCurrent = teacher.id === currentUser?.id;
          const isChair = (teacher.title || '').toLowerCase().includes('chair');

          return (
            <NeuCard
              key={teacher.id}
              className={`p-5 flex flex-col justify-between transition-all hover:shadow-md ${
                isCurrent ? 'ring-2 ring-orange-500/40 bg-orange-50/10' : ''
              }`}
            >
              <div>
                {/* Top header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <img
                      src={teacher.avatar}
                      alt={teacher.name}
                      className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold font-heading text-slate-900 dark:text-white text-base">
                          {displayLastFirst ? formatLastFirst(teacher.name) : teacher.name}
                        </h3>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 dark:bg-orange-950 text-[#c2410c] dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                            You
                          </span>
                        )}
                        {isChair && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            Chair
                          </span>
                        )}
                      </div>

                      <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-0.5">
                        {teacher.title || 'Faculty Instructor'}
                      </div>

                      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{teacher.email}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {isDean && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleResetPassword(teacher)}
                        title="Generate a new temporary password"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(teacher)}
                        title="Edit Profile & Credentials"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {!isCurrent && teachers.length > 1 && (
                        <button
                          onClick={() => handleDelete(teacher)}
                          title="Remove Faculty Member"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Department Info */}
                {teacher.department && (
                  <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate font-medium">{teacher.department}</span>
                  </div>
                )}

                {/* Assigned Courses */}
                <div className="mt-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 flex items-center justify-between">
                    <span>Assigned Subjects ({teacherSubs.length})</span>
                    {teacherSubs.length > 0 && onNavigateToSubjects && (
                      <button
                        onClick={() => onNavigateToSubjects()}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline normal-case font-semibold"
                      >
                        Manage
                      </button>
                    )}
                  </div>

                  {teacherSubs.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {teacherSubs.map((sub) => {
                        const sec = sections.find((s) => s.id === sub.sectionId);
                        return (
                          <span
                            key={sub.id}
                            className="px-2 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700 flex items-center gap-1"
                          >
                            <span className="font-bold text-[#1E3A8A] dark:text-blue-300">{sub.code}</span>
                            <span className="text-slate-400">·</span>
                            <span className="truncate max-w-[120px]">{sub.name}</span>
                            {sec && <span className="text-[10px] text-slate-400">({sec.name})</span>}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No subjects currently assigned to this instructor.</p>
                  )}
                </div>
              </div>

              {/* Bottom footer bar */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                {isDean ? (
                  <>
                    <span className="flex items-center gap-1 text-[11px]">
                      <KeyRound className="w-3 h-3 text-[#F97316]" />
                      <span>
                        Initial login:{' '}
                        <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px] text-slate-700 dark:text-slate-300">
                          Password managed securely by the server
                        </code>
                      </span>
                    </span>

                    <NeuButton
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenEdit(teacher)}
                      leftIcon={<Edit2 className="w-3 h-3" />}
                    >
                      Edit Profile
                    </NeuButton>
                  </>
                ) : (
                  <>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Official Faculty Member
                    </span>
                    {isCurrent && (
                      <span className="text-xs font-semibold text-[#1E3A8A] dark:text-blue-300">
                        Your Profile
                      </span>
                    )}
                  </>
                )}
              </div>
            </NeuCard>
          );
        })}
      </div>

      {sortedTeachers.length === 0 && (
        <NeuCard className="p-8 text-center text-slate-500 dark:text-slate-400">
          <GraduationCap className="w-12 h-12 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
          <p className="font-semibold text-slate-700 dark:text-slate-300">No faculty members found</p>
          <p className="text-xs mt-1">Try adjusting your search criteria or add a new faculty member above.</p>
        </NeuCard>
      )}

      {/* Faculty Modal */}
      <FacultyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        facultyToEdit={facultyToEdit}
        defaultDepartment={currentUser?.department || 'College of Information and Computing Sciences'}
        onSave={handleSaveFaculty}
      />
    </div>
  );
};
