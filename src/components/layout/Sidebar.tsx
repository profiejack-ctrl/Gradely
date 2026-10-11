import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Layers,
  Sliders,
  Table,
  CalendarCheck,
  Users2,
  GraduationCap,
  BookOpenCheck,
  Calculator,
  PieChart,
  UserCog,
} from 'lucide-react';

export type TeacherTab = 'dashboard' | 'sections' | 'subjects' | 'gradebook' | 'attendance' | 'students' | 'faculty';
export type StudentTab = 'student-dashboard' | 'student-subjects' | 'student-matrix' | 'student-simulator';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const { isTeacher, isDean } = useAuth();

  const teacherItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'sections', label: 'Classes & Sections', icon: <Layers className="w-4 h-4" /> },
    { id: 'subjects', label: 'Subjects & Matrix', icon: <Sliders className="w-4 h-4" /> },
    { id: 'gradebook', label: 'Gradebook Sheet', icon: <Table className="w-4 h-4" /> },
    { id: 'attendance', label: 'Attendance Roll', icon: <CalendarCheck className="w-4 h-4" /> },
    { id: 'students', label: 'Student Directory', icon: <Users2 className="w-4 h-4" /> },
    ...(isDean ? [{ id: 'faculty', label: 'Faculty Management', icon: <UserCog className="w-4 h-4" /> }] : []),
  ];

  const studentItems = [
    { id: 'student-dashboard', label: 'My Academic Hub', icon: <GraduationCap className="w-4 h-4" /> },
    { id: 'student-subjects', label: 'Records & Scores', icon: <BookOpenCheck className="w-4 h-4" /> },
    { id: 'student-matrix', label: 'Grading Matrices', icon: <PieChart className="w-4 h-4" /> },
    { id: 'student-simulator', label: 'Grade Simulator', icon: <Calculator className="w-4 h-4" /> },
  ];

  const items = isTeacher ? teacherItems : studentItems;

  return (
    <aside className={`w-full lg:w-60 shrink-0 flex flex-col gap-1.5 ${!isTeacher ? 'hidden lg:flex' : ''}`}>
      <div className="bg-white/90 dark:bg-[#0d1424]/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-2.5 flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible shadow-xs dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
        <div className="hidden lg:flex items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          <span>{isTeacher ? (isDean ? 'Dean Administration' : 'Instructor Portal') : 'Student Portal'}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-glow" title="System Online" />
        </div>

        {items.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 whitespace-nowrap outline-none select-none text-left shrink-0 active:scale-[0.98] ${
                isActive
                  ? 'bg-orange-50/90 dark:bg-orange-950/50 text-[#c2410c] dark:text-orange-300 font-bold border border-orange-200/90 dark:border-orange-800/70 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-[#1E3A8A] dark:hover:text-blue-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
              }`}
            >
              <span className={isActive ? 'text-[#F97316] dark:text-orange-400' : 'text-slate-400 dark:text-slate-500'}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
};
