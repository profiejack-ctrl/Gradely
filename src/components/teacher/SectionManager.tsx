import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Section } from '../../types';
import { NeuCard } from '../common/NeuCard';
import { NeuButton } from '../common/NeuButton';
import { NeuBadge } from '../common/NeuBadge';
import { SectionModal } from './SectionModal';
import { BulkStudentUploadModal } from './BulkStudentUploadModal';
import { Plus, Edit2, Trash2, Users, BookOpen, MapPin, Calendar, Upload } from 'lucide-react';

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
  const { sections, subjects, students, addSection, updateSection, deleteSection } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [selectedSectionForBulk, setSelectedSectionForBulk] = useState<string | undefined>(undefined);
  const [sectionToEdit, setSectionToEdit] = useState<Section | null>(null);

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

        <div className="flex items-center gap-2.5">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((sec) => {
          const secSubjects = subjects.filter((s) => s.sectionId === sec.id);
          const secStudents = students.filter((s) => s.sectionId === sec.id);

          return (
            <NeuCard key={sec.id} className="flex flex-col justify-between gap-4 relative group">
              <div>
                {/* Header with quick actions */}
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">{sec.name}</h2>
                      <NeuBadge variant="primary" size="sm">
                        {sec.gradeLevelOrYear}
                      </NeuBadge>
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

                {/* Description & Room */}
                <div className="py-2.5 space-y-1.5">
                  {sec.room && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
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

      <BulkStudentUploadModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        sections={sections}
        selectedSectionId={selectedSectionForBulk}
        onShowToast={onShowToast}
      />

      <SectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        sectionToEdit={sectionToEdit}
        onSave={handleSave}
      />
    </div>
  );
};
