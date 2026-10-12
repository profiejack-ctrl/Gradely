import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Table,
  CalendarCheck,
  Layers,
  MoreHorizontal,
  Sliders,
  Users2,
  UserCog,
  X,
  Plus,
} from 'lucide-react';

interface TeacherBottomNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenSectionModal?: () => void;
  onOpenSubjectModal?: () => void;
}

export const TeacherBottomNav: React.FC<TeacherBottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenSectionModal,
  onOpenSubjectModal,
}) => {
  const { isDean } = useAuth();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const primaryTabs = [
    {
      id: 'dashboard',
      label: 'Hub',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'gradebook',
      label: 'Gradebook',
      icon: <Table className="w-5 h-5" />,
    },
    {
      id: 'attendance',
      label: 'Roll Call',
      icon: <CalendarCheck className="w-5 h-5" />,
    },
    {
      id: 'sections',
      label: 'Classes',
      icon: <Layers className="w-5 h-5" />,
    },
  ];

  const moreTabs = [
    {
      id: 'subjects',
      label: 'Subjects & Matrices',
      description: 'Manage courses, grading weights & passing scores',
      icon: <Sliders className="w-5 h-5 text-orange-500" />,
    },
    {
      id: 'students',
      label: 'Student Directory',
      description: 'View student masterlist, sections & credentials',
      icon: <Users2 className="w-5 h-5 text-emerald-500" />,
    },
    ...(isDean
      ? [
          {
            id: 'faculty',
            label: 'Faculty Management',
            description: 'Manage instructors, deans & course assignments',
            icon: <UserCog className="w-5 h-5 text-indigo-500" />,
          },
        ]
      : []),
  ];

  const isMoreActive = moreTabs.some((t) => t.id === currentTab);

  return (
    <>
      {/* Slide-up "More" Menu Drawer */}
      {isMoreOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={() => setIsMoreOpen(false)}
          />

          {/* Drawer Sheet */}
          <div className="relative z-10 bg-white dark:bg-[#0c1222] border-t border-slate-200 dark:border-slate-800 rounded-t-3xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isDean ? 'Dean Administration' : 'Faculty Portal'} Navigation
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select a section or trigger quick creation actions
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Action Buttons */}
            {(onOpenSectionModal || onOpenSubjectModal) && (
              <div className="grid grid-cols-2 gap-2.5 pb-2">
                {onOpenSectionModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreOpen(false);
                      onOpenSectionModal();
                    }}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Class</span>
                  </button>
                )}
                {onOpenSubjectModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreOpen(false);
                      onOpenSubjectModal();
                    }}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/60 dark:hover:bg-orange-900/60 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300 text-xs font-bold transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Course</span>
                  </button>
                )}
              </div>
            )}

            {/* Navigation Options */}
            <div className="space-y-2">
              {moreTabs.map((tab) => {
                const isActive = currentTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      onSelectTab(tab.id);
                      setIsMoreOpen(false);
                    }}
                    className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl border text-left transition-all ${
                      isActive
                        ? 'bg-orange-50/80 dark:bg-orange-950/50 border-orange-200 dark:border-orange-800 shadow-xs'
                        : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 shadow-2xs shrink-0">
                      {tab.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {tab.label}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {tab.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Persistent Bottom Navigation Bar */}
      <nav
        aria-label="Faculty Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#070b14]/95 backdrop-blur-xl border-t border-slate-200/90 dark:border-slate-800/80 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]"
      >
        <div className="grid grid-cols-5 gap-1 max-w-md mx-auto">
          {primaryTabs.map((tab) => {
            const isActive = currentTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all duration-150 select-none touch-manipulation min-h-[48px] ${
                  isActive
                    ? 'text-[#F97316] dark:text-orange-400 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 active:scale-95'
                }`}
              >
                <span
                  className={`relative p-1 rounded-xl transition-all ${
                    isActive
                      ? 'bg-orange-50 dark:bg-orange-950/60 scale-105'
                      : ''
                  }`}
                >
                  {tab.icon}
                  {isActive && (
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#F97316]" />
                  )}
                </span>
                <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[64px]">
                  {tab.label}
                </span>
              </button>
            );
          })}

          {/* More Action */}
          <button
            type="button"
            onClick={() => setIsMoreOpen(true)}
            className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all duration-150 select-none touch-manipulation min-h-[48px] ${
              isMoreActive
                ? 'text-[#F97316] dark:text-orange-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 active:scale-95'
            }`}
          >
            <span
              className={`relative p-1 rounded-xl transition-all ${
                isMoreActive
                  ? 'bg-orange-50 dark:bg-orange-950/60 scale-105'
                  : ''
              }`}
            >
              <MoreHorizontal className="w-5 h-5" />
              {isMoreActive && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#F97316]" />
              )}
            </span>
            <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[64px]">
              More
            </span>
          </button>
        </div>
      </nav>
    </>
  );
};
