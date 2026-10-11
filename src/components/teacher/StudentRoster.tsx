import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { User } from '../../types';
import { NeuCard } from '../common/NeuCard';
import { NeuButton } from '../common/NeuButton';
import { NeuBadge } from '../common/NeuBadge';
import { NeuSelect, NeuInput } from '../common/NeuInput';
import { StudentModal } from './StudentModal';
import { BulkStudentUploadModal } from './BulkStudentUploadModal';
import { calculateStudentSubjectPerformance } from '../../utils/gradeCalculator';
import { compareByLastName, formatLastFirst } from '../../utils/nameUtils';
import { isStudentInSection, getStudentSectionIds } from '../../utils/enrollmentUtils';
import { Plus, Search, Edit2, Trash2, Mail, GraduationCap, Award, Upload, ArrowUpDown } from 'lucide-react';

interface StudentRosterProps {
  initialSectionId?: string;
  onShowToast: (title: string, message?: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export const StudentRoster: React.FC<StudentRosterProps> = ({
  initialSectionId,
  onShowToast,
}) => {
  const { currentUser, isDean } = useAuth();
  const { sections, subjects, assessments, scores, attendance, students, addStudent, updateStudent, deleteStudent } = useData();
  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    initialSectionId || 'all'
  );
  const [deanViewAll, setDeanViewAll] = useState(false);

  const accessibleSubjects = isDean && deanViewAll
    ? subjects
    : subjects.filter((s) => s.teacherId === currentUser?.id);

  const myAssignedSections = sections.filter((sec) => sec.adviserId === currentUser?.id || accessibleSubjects.some((s) => s.sectionId === sec.id));

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'last-name-asc' | 'last-name-desc' | 'first-name-asc' | 'student-number'>('last-name-asc');
  const [displayLastFirst, setDisplayLastFirst] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<User | null>(null);

  const filteredStudents = students.filter((s) => {
    // If viewing a specific section selected from dropdown, match that section
    if (selectedSectionId !== 'all') {
      const isSecAllowed = (isDean && deanViewAll) || myAssignedSections.some((sec) => sec.id === selectedSectionId);
      if (!isSecAllowed) return false;

      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.studentNumber && s.studentNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase());
      return isStudentInSection(s, selectedSectionId) && matchesSearch;
    }

    // If viewing 'all': Dean with deanViewAll can see all, otherwise strictly myAssignedSections
    const isSectionAccessible = isDean && deanViewAll
      ? true
      : myAssignedSections.some((sec) => isStudentInSection(s, sec.id));
    if (!isSectionAccessible) return false;

    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.studentNumber && s.studentNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    if (sortBy === 'last-name-asc') {
      return compareByLastName(a.name, b.name, 'asc');
    }
    if (sortBy === 'last-name-desc') {
      return compareByLastName(a.name, b.name, 'desc');
    }
    if (sortBy === 'first-name-asc') {
      return a.name.localeCompare(b.name);
    }
    if (sortBy === 'student-number') {
      return (a.studentNumber || '').localeCompare(b.studentNumber || '');
    }
    return 0;
  });

  const handleOpenAdd = () => {
    setStudentToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (student: User) => {
    setStudentToEdit(student);
    setIsModalOpen(true);
  };

  const handleDelete = (student: User) => {
    if (window.confirm(`Are you sure you want to remove "${student.name}" from the student roster?`)) {
      deleteStudent(student.id);
      onShowToast('Student Removed', `"${student.name}" has been deleted.`, 'warning');
    }
  };

  const handleSaveStudent = (data: Omit<User, 'id' | 'role'>, idToUpdate?: string) => {
    if (idToUpdate) {
      updateStudent(idToUpdate, data);
      onShowToast('Student Updated', `"${data.name}" profile saved.`, 'success');
    } else {
      addStudent(data);
      onShowToast('Student Enrolled', `"${data.name}" added to roster.`, 'success');
    }
  };

  const visibleSections = isDean && deanViewAll ? sections : myAssignedSections;

  const sectionOptions = [
    { value: 'all', label: 'All Enrolled Classes' },
    ...visibleSections.map((s) => ({ value: s.id, label: `${s.name} (${s.gradeLevelOrYear})` })),
  ];

  const sortOptions = [
    { value: 'last-name-asc', label: 'Sort: Last Name (A → Z)' },
    { value: 'last-name-desc', label: 'Sort: Last Name (Z → A)' },
    { value: 'first-name-asc', label: 'Sort: First Name (A → Z)' },
    { value: 'student-number', label: 'Sort: Student ID Number' },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-slate-900 dark:text-white tracking-tight">Student Directory & Roster</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage student enrollments, profile credentials, and view academic standing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isDean && (
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setDeanViewAll(false)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  !deanViewAll
                    ? 'bg-white dark:bg-slate-700 text-[#1E3A8A] dark:text-blue-300 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                My Classes
              </button>
              <button
                type="button"
                onClick={() => setDeanViewAll(true)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  deanViewAll
                    ? 'bg-white dark:bg-slate-700 text-[#F97316] dark:text-orange-400 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                All College Classes (Dean)
              </button>
            </div>
          )}

          <NeuButton
            variant="secondary"
            size="md"
            onClick={() => setIsBulkModalOpen(true)}
            leftIcon={<Upload className="w-4 h-4 text-[#1E3A8A] dark:text-blue-400" />}
          >
            Bulk Upload Masterlist
          </NeuButton>

          <NeuButton
            variant="primary"
            size="md"
            onClick={handleOpenAdd}
            leftIcon={<Plus className="w-4 h-4 text-white" />}
          >
            Enroll Student
          </NeuButton>
        </div>
      </div>

      {/* Filter, Search, and Sort Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 min-w-[200px]">
          <NeuInput
            placeholder="Search by name, student ID, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>

        <div className="w-full sm:w-56">
          <NeuSelect
            options={sectionOptions}
            value={selectedSectionId}
            onChange={(e) => setSelectedSectionId(e.target.value)}
          />
        </div>

        <div className="w-full sm:w-60">
          <NeuSelect
            options={sortOptions}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          />
        </div>

        <NeuButton
          variant="secondary"
          size="md"
          onClick={() => setDisplayLastFirst(!displayLastFirst)}
          title={displayLastFirst ? 'Display: Last Name, First Name' : 'Display: First Name Last Name'}
          leftIcon={<ArrowUpDown className="w-4 h-4 text-[#F97316]" />}
          className="text-xs font-semibold whitespace-nowrap"
        >
          {displayLastFirst ? 'Last, First' : 'First Last'}
        </NeuButton>
      </div>

      {/* Results Count Banner */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <span>
          Showing <strong className="text-slate-900 dark:text-white">{sortedStudents.length}</strong> students
          {selectedSectionId !== 'all' && ` in ${sections.find((s) => s.id === selectedSectionId)?.name}`}
        </span>
        <span className="font-medium text-[#1E3A8A] dark:text-blue-400">
          {sortBy === 'last-name-asc' && 'Sorted alphabetically by Last Name (A-Z)'}
          {sortBy === 'last-name-desc' && 'Sorted alphabetically by Last Name (Z-A)'}
          {sortBy === 'first-name-asc' && 'Sorted by First Name (A-Z)'}
          {sortBy === 'student-number' && 'Sorted by Student ID'}
        </span>
      </div>

      {/* Student Cards Grid */}
      {sortedStudents.length === 0 ? (
        <div className="p-8 sm:p-12 text-center bg-white dark:bg-[#0d1424] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm max-w-xl mx-auto my-8 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-[#1E3A8A] dark:text-blue-400 flex items-center justify-center mx-auto shadow-inner">
            <GraduationCap className="w-8 h-8 text-[#F97316]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">No Students Found</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              {sections.length === 0
                ? "You do not currently have any classes registered. Create a class first, then enroll students."
                : "No students match your search query or selected class filter. Click 'Enroll Student' or upload a roster."}
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-2">
            <NeuButton
              variant="primary"
              size="sm"
              onClick={handleOpenAdd}
              leftIcon={<Plus className="w-4 h-4 text-white" />}
            >
              Enroll Student
            </NeuButton>
            {isDean && !deanViewAll && (
              <NeuButton
                variant="secondary"
                size="sm"
                onClick={() => setDeanViewAll(true)}
              >
                Switch to Dean All-College View
              </NeuButton>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedStudents.map((student) => {
          const enrolledSecIds = getStudentSectionIds(student);
          const studentSections = sections.filter((s) => enrolledSecIds.includes(s.id));
          const studentSubjects = subjects.filter((s) => enrolledSecIds.includes(s.sectionId));

          // Calculate average grade across subjects
          let totalGrade = 0;
          let evaluatedSubjCount = 0;

          studentSubjects.forEach((subj) => {
            const perf = calculateStudentSubjectPerformance(
              subj,
              student,
              assessments,
              scores,
              attendance
            );
            totalGrade += perf.finalGrade;
            evaluatedSubjCount++;
          });

          const avgGrade = evaluatedSubjCount > 0 ? Math.round((totalGrade / evaluatedSubjCount) * 10) / 10 : 0;

          return (
            <NeuCard key={student.id} className="space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <img
                      src={student.avatar}
                      alt={student.name}
                      className="w-11 h-11 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                    />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {displayLastFirst ? formatLastFirst(student.name) : student.name}
                      </h3>
                      <span className="text-xs font-mono font-bold text-[#F97316] dark:text-orange-400 tabular-nums">
                        {student.studentNumber || 'No ID Assigned'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(student)}
                      className="p-1 rounded-lg text-slate-400 hover:text-[#1E3A8A] dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Edit Student"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(student)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Delete Student"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="py-2.5 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{student.email}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <div className="flex flex-wrap gap-1">
                      {studentSections.length > 0 ? (
                        studentSections.map((sec) => (
                          <span
                            key={sec.id}
                            className="inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60"
                          >
                            {sec.name}
                          </span>
                        ))
                      ) : (
                        <span className="font-medium text-slate-400 text-xs">Unassigned Section</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Academic Standing */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Avg Grade:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold font-mono text-slate-900 dark:text-white tabular-nums">{avgGrade}%</span>
                    <NeuBadge variant={avgGrade >= 75 ? 'success' : 'danger'} size="sm">
                      {avgGrade >= 75 ? 'Passing' : 'Review'}
                    </NeuBadge>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 text-center pt-1 border-t border-slate-100 dark:border-slate-800">
                Enrolled in {studentSubjects.length} courses
              </div>
            </NeuCard>
          );
        })}
      </div>
    )}

      <BulkStudentUploadModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        sections={visibleSections}
        selectedSectionId={selectedSectionId !== 'all' ? selectedSectionId : undefined}
        onShowToast={onShowToast}
      />

      <StudentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        sections={visibleSections}
        selectedSectionId={selectedSectionId !== 'all' ? selectedSectionId : undefined}
        studentToEdit={studentToEdit}
        onSave={handleSaveStudent}
      />
    </div>
  );
};
