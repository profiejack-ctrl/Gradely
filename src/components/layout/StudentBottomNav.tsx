import React from 'react';
import {
  GraduationCap,
  BookOpenCheck,
  PieChart,
  Calculator,
} from 'lucide-react';

interface StudentBottomNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const StudentBottomNav: React.FC<StudentBottomNavProps> = ({
  currentTab,
  onSelectTab,
}) => {
  const tabs = [
    {
      id: 'student-dashboard',
      label: 'Hub',
      icon: <GraduationCap className="w-5 h-5" />,
    },
    {
      id: 'student-subjects',
      label: 'Scores',
      icon: <BookOpenCheck className="w-5 h-5" />,
    },
    {
      id: 'student-matrix',
      label: 'Matrices',
      icon: <PieChart className="w-5 h-5" />,
    },
    {
      id: 'student-simulator',
      label: 'Simulator',
      icon: <Calculator className="w-5 h-5" />,
    },
  ];

  return (
    <nav
      aria-label="Student Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-[#070b14]/90 backdrop-blur-xl border-t border-slate-200/90 dark:border-slate-800/80 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]"
    >
      <div className="grid grid-cols-4 gap-1 max-w-md mx-auto">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-150 select-none touch-manipulation min-h-[48px] ${
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
              <span className="text-[10.5px] mt-0.5 tracking-tight truncate max-w-[70px]">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
