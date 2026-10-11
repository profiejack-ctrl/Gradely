import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Section } from '../../types';
import { NeuCard } from '../common/NeuCard';
import { NeuButton } from '../common/NeuButton';
import { NeuBadge } from '../common/NeuBadge';
import { SectionModal } from './SectionModal';
import { BulkStudentUploadModal } from './BulkStudentUploadModal';
import { Plus, Edit2, Trash2, Users, BookOpen, MapPin, Calendar, Upload, GraduationCap, ShieldCheck } from 'lucide-react';
import { isStudentInSection } from '../../utils/enrollmentUtils';

interface SectionManagerProps {
  onNavigateToSubjects: (sectionId: string) => void;
  onNavigateToRoster: (sectionId: string) => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export const SectionManager: React.FC<SectionManagerProps> = ({
  onNavigateToSubjects,
  onNavigateToRoster,
  onShowToast,
}) => {
  const { currentUser, isDean } = useAuth();
  const { sections, subjects, students, teachers, addSection, updateSection, deleteSection } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [selectedSectionForBulk, setSelectedSectionForBulk] = useState<string | undefined>(undefined);
  const [sectionToEdit, setSectionToEdit] = useState<Section | null>(null);

  // Instructors default to their own classes; Deans default to all college classes
  const [sectionFilter, setSectionFilter] = useState<'all' | 'my'>(isDean ? 'all' : 'my');

  // Classes where current teacher is adviser OR teaches an assigned subject
  const mySections = sections.filter((sec) =>
    sec.adviserId === currentUser?.id ||
    subjects.some((s) => s.sectionId === sec.id && s.teacherId === currentUser?.id)
  );

  // Non-deans MUST strictly only see their own sections. Deans can toggle.
  const displayedSections = isDean ? (sectionFilter === 'my' ? mySections : sections) : mySections;

  const handleOpenAdd = () => {
    setSectionToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sec: Section) => {
    setSectionToEdit(sec);
    setIsModalOpen(true);
  };

  const handleDelete = (sec: Section) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${sec.name}"? This will remove associated subjects and grades.`
      )
    ) {
      deleteSection(sec.id);
      onShowToast('Section Deleted', `"${sec.name}" has been removed.`, 'warning');
    }
  };

  const handleSave = (sectionData: Omit<Section, 'id'>, idToUpdate?: string) => {
    if (idToUpdate) {
      updateSection(idToUpdate, sectionData);
      onShowToast('Section Updated', `"${sectionData.name}" has been updated.`, 'success');
    } else {
      addSection(sectionData);
      onShowToast('Section Created', `"${sectionData.name}" was successfully added.`, 'success');
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Classes & Sections</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Organize student cohorts, academic year assignments, and section courses.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Filter: All vs My Classes (Only visible for Dean) */}
          {isDean && (
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSectionFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  sectionFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-[#1E3A8A] dark:text-blue-300 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                All Classes ({sections.length})
              </button>
              <button
                type="button"
                onClick={() => setSectionFilter('my')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  sectionFilter === 'my'
                    ? 'bg-white dark:bg-slate-700 text-[#F97316] dark:text-orange-400 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                My Classes ({mySections.length})
              </button>
            </div>
          )}

          <NeuButton
            variant="secondary"
            size="md"
            onClick={() => {
              setSelectedSectionForBulk(undefined);
              setIsBulkModalOpen(true);
            }}
            leftIcon={<Upload className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
          >
            Bulk Upload Masterlist
          </NeuButton>

          <NeuButton
            variant="primary"
            size="md"
            onClick={handleOpenAdd}
            leftIcon={<Plus className="w-4 h-4 text-white" />}
          >
            Create New Class
          </NeuButton>
        </div>
      </div>

      {/* Sections Grid */}
      {displayedSections.length === 0 ? (
        <div className="p-8 sm:p-12 text-center bg-white dark:bg-[#0d1424] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm max-w-xl mx-auto my-8 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-[#1E3A8A] dark:text-blue-400 flex items-center justify-center mx-auto shadow-inner">
            <GraduationCap className="w-8 h-8 text-[#F97316]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {!isDean || sectionFilter === 'my' ? 'No Assigned Teaching Courses' : 'No Classes Created Yet'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              {!isDean
                ? "You do not have any classes or teaching courses created yet. Click 'Create New Class' to initialize your cohort."
                : sectionFilter === 'my'
                ? `You do not have any teaching courses assigned to any class yet. You can switch to "All Classes (${sections.length})" or create a course to attach to a class.`
                : "No student cohort classes exist yet. Click 'Create New Class' to initialize a cohort."}
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-2">
            {isDean && sectionFilter === 'my' && sections.length > 0 && (
              <NeuButton
                variant="secondary"
                size="sm"
                onClick={() => setSectionFilter('all')}
              >
                View All Classes ({sections.length})
              </NeuButton>
            )}
            <NeuButton
              variant="primary"
              size="sm"
              onClick={handleOpenAdd}
              leftIcon={<Plus className="w-4 h-4 text-white" />}
            >
              Create New Class
            </NeuButton>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedSections.map((sec) => {
          const secSubjects = subjects.filter((s) => s.sectionId === sec.id);
          const secStudents = students.filter((s) => isStudentInSection(s, sec.id));
          const adviser = teachers.find((t) => t.id === sec.adviserId);

          return (
            <NeuCard key={sec.id} className="flex flex-col justify-between gap-4 relative group">
              <div>
                {/* Header with quick actions */}
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">{sec.name}</h2>
                      <NeuBadge variant="primary" size="sm">
                        {sec.gradeLevelOrYear}
                      </NeuBadge>
                      {sec.adviserId === currentUser?.id && (
                        <NeuBadge variant="warning" size="sm">
                          Adviser
                        </NeuBadge>
                      )}
                      {secSubjects.some((s) => s.teacherId === currentUser?.id) && (
                        <NeuBadge variant="success" size="sm">
                          My Teaching
                        </NeuBadge>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{sec.academicYear} • {sec.semester}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(sec)}
                      className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Edit Section Details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(sec)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Delete Section"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Description, Room & Adviser */}
                <div className="py-2.5 space-y-1.5">
                  {adviser && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span>Adviser: <strong className="font-semibold text-slate-800 dark:text-slate-200">{adviser.name}</strong></span>
                    </div>
                  )}
                  {sec.room && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span>{sec.room}</span>
                    </div>
                  )}
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {sec.description || 'Standard academic section cohort.'}
                  </p>
                </div>

                {/* Counter Badges */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div
                    onClick={() => onNavigateToRoster(sec.id)}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-300 dark:hover:border-indigo-700 cursor-pointer transition-all flex items-center gap-2"
                    title="View Student Roster"
                  >
                    <Users className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{secStudents.length} Students</div>
                      <div className="text-[10px] text-slate-500">Roster List</div>
                    </div>
                  </div>

                  <div
                    onClick={() => onNavigateToSubjects(sec.id)}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 hover:border-emerald-300 dark:hover:border-emerald-700 cursor-pointer transition-all flex items-center gap-2"
                    title="View Section Subjects"
                  >
                    <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{secSubjects.length} Courses</div>
                      <div className="text-[10px] text-slate-500">Matrix Items</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <NeuButton
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSelectedSectionForBulk(sec.id);
                    setIsBulkModalOpen(true);
                  }}
                  leftIcon={<Upload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                  title="Bulk upload student masterlist to this section"
                >
                  Upload Roster
                </NeuButton>

                <NeuButton
                  variant="secondary"
                  size="sm"
                  onClick={() => onNavigateToSubjects(sec.id)}
                  className="flex-1"
                >
                  Courses & Matrix →
                </NeuButton>
              </div>
            </NeuCard>
          );
        })}
      </div>
    )}

      <BulkStudentUploadModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        sections={displayedSections}
        selectedSectionId={selectedSectionForBulk}
        onShowToast={onShowToast}
      />

      <SectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        sectionToEdit={sectionToEdit}
        onSave={handleSave}
        teachers={teachers}
        currentUserId={currentUser?.id}
        isDean={isDean}
      />
    </div>
  );
};
