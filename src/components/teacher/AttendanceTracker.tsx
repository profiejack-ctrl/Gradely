import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { AttendanceStatus, Subject, GradingPeriod } from '../../types';
import { NeuCard } from '../common/NeuCard';
import { NeuButton } from '../common/NeuButton';
import { NeuBadge } from '../common/NeuBadge';
import { NeuSelect } from '../common/NeuInput';
import { HolidayModal } from './HolidayModal';
import { calculateAttendanceStats } from '../../utils/gradeCalculator';
import {
  Check,
  Clock,
  X,
  ShieldAlert,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CalendarCheck,
  Palmtree,
  AlertTriangle,
  Layers,
  GraduationCap,
} from 'lucide-react';
import { compareByLastName, formatLastFirst } from '../../utils/nameUtils';
import { isStudentInSection } from '../../utils/enrollmentUtils';

interface AttendanceTrackerProps {
  initialSectionId?: string;
  initialSubjectId?: string;
  initialPeriod?: GradingPeriod;
  onShowToast: (title: string, message?: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

type PeriodFilterMode = 'all' | GradingPeriod;

export const AttendanceTracker: React.FC<AttendanceTrackerProps> = ({
  initialSectionId,
  initialSubjectId,
  initialPeriod = 'prelim',
  onShowToast,
}) => {
  const { currentUser, isDean } = useAuth();
  const {
    sections,
    subjects,
    students,
    attendance,
    holidays,
    setAttendance,
    markAllAttendance,
    addHoliday,
    deleteHoliday,
  } = useData();

  const [deanViewAll, setDeanViewAll] = useState(false);

  const accessibleSubjects = isDean && deanViewAll
    ? subjects
    : subjects.filter((s) => s.teacherId === currentUser?.id);

  const accessibleSections = isDean && deanViewAll
    ? sections
    : sections.filter((sec) => sec.adviserId === currentUser?.id || accessibleSubjects.some((s) => s.sectionId === sec.id));

  const [selectedSectionId, setSelectedSectionId] = useState<string>(() => {
    if (initialSectionId && accessibleSections.some((s) => s.id === initialSectionId)) {
      return initialSectionId;
    }
    return accessibleSections[0]?.id || '';
  });

  const sectionSubjects = accessibleSubjects.filter((s) => s.sectionId === selectedSectionId);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(() => {
    if (initialSubjectId && sectionSubjects.some((s) => s.id === initialSubjectId)) {
      return initialSubjectId;
    }
    return sectionSubjects[0]?.id || '';
  });

  useEffect(() => {
    if (accessibleSections.length > 0 && !accessibleSections.some((s) => s.id === selectedSectionId)) {
      const nextSec = accessibleSections[0].id;
      setSelectedSectionId(nextSec);
      const subjs = accessibleSubjects.filter((s) => s.sectionId === nextSec);
      setSelectedSubjectId(subjs[0]?.id || '');
    }
  }, [accessibleSections, selectedSectionId, accessibleSubjects]);

  useEffect(() => {
    if (sectionSubjects.length > 0 && !sectionSubjects.some((s) => s.id === selectedSubjectId)) {
      setSelectedSubjectId(sectionSubjects[0].id);
    }
  }, [sectionSubjects, selectedSubjectId]);

  const [activePeriod, setActivePeriod] = useState<PeriodFilterMode>(initialPeriod);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  // Calendar navigation state
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);

  const activeSubject: Subject | undefined =
    sectionSubjects.find((s) => s.id === selectedSubjectId) || sectionSubjects[0];

  const sectionStudents = students.filter((s) => isStudentInSection(s, selectedSectionId));
  const sortedStudents = [...sectionStudents].sort((a, b) => compareByLastName(a.name, b.name, 'asc'));

  // Status handler
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    if (!activeSubject) return;
    const periodToUse: GradingPeriod =
      activePeriod === 'all' ? 'prelim' : activePeriod;
    setAttendance(activeSubject.id, studentId, selectedDate, status, undefined, periodToUse);
  };

  const handleNoteChange = (studentId: string, currentStatus: AttendanceStatus, note: string) => {
    if (!activeSubject) return;
    const periodToUse: GradingPeriod =
      activePeriod === 'all' ? 'prelim' : activePeriod;
    setAttendance(activeSubject.id, studentId, selectedDate, currentStatus, note, periodToUse);
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    if (!activeSubject) return;
    const periodToUse: GradingPeriod =
      activePeriod === 'all' ? 'prelim' : activePeriod;
    markAllAttendance(
      activeSubject.id,
      sectionStudents.map((s) => s.id),
      selectedDate,
      status,
      periodToUse
    );
    onShowToast('Attendance Recorded', `All students marked as ${status} for ${selectedDate} (${periodToUse.toUpperCase()}).`, 'success');
  };

  const sectionOptions = accessibleSections.map((s) => ({
    value: s.id,
    label: `${s.name} (${s.gradeLevelOrYear})`,
  }));

  const subjectOptions = sectionSubjects.map((s) => ({
    value: s.id,
    label: `${s.code} - ${s.name}`,
  }));

  if (accessibleSubjects.length === 0) {
    return (
      <div className="p-8 sm:p-12 text-center bg-white dark:bg-[#0d1424] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm max-w-xl mx-auto my-8 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-[#1E3A8A] dark:text-blue-400 flex items-center justify-center mx-auto shadow-inner">
          <GraduationCap className="w-8 h-8 text-[#F97316]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">No Courses Assigned Yet</h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
            You do not currently have any active course loads assigned to your faculty account.
            Once the College Dean provisions courses or subjects to you, your attendance roll call and student rosters will appear here.
          </p>
        </div>
        {isDean && (
          <div className="pt-2">
            <NeuButton
              variant="primary"
              size="sm"
              onClick={() => setDeanViewAll(true)}
            >
              Switch to Dean All-College View
            </NeuButton>
          </div>
        )}
      </div>
    );
  }

  if (!activeSubject) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">No Subjects Available</h2>
        <p className="text-xs text-slate-500">Please add or assign a subject course to this section first.</p>
        {isDean && !deanViewAll && (
          <div className="pt-2">
            <NeuButton
              variant="secondary"
              size="sm"
              onClick={() => setDeanViewAll(true)}
            >
              Show All College Courses (Dean)
            </NeuButton>
          </div>
        )}
      </div>
    );
  }

  // Count attendance stats for current date
  let datePresent = 0;
  let dateLate = 0;
  let dateAbsent = 0;
  let dateExcused = 0;

  sectionStudents.forEach((student) => {
    const rec = attendance.find(
      (a) => a.subjectId === activeSubject.id && a.studentId === student.id && a.date === selectedDate
    );
    if (rec?.status === 'present') datePresent++;
    else if (rec?.status === 'late') dateLate++;
    else if (rec?.status === 'absent') dateAbsent++;
    else if (rec?.status === 'excused') dateExcused++;
  });

  // Filter subject attendance by period for calendar indicators
  const subjectAttendance = attendance.filter((a) => a.subjectId === activeSubject.id);

  // Group attendance records by date to show stats on calendar
  const dateAttendanceMap: Record<string, { total: number; present: number; late: number; absent: number; period?: GradingPeriod }> = {};
  subjectAttendance.forEach((rec) => {
    if (!dateAttendanceMap[rec.date]) {
      dateAttendanceMap[rec.date] = { total: 0, present: 0, late: 0, absent: 0, period: rec.period };
    }
    dateAttendanceMap[rec.date].total++;
    if (rec.status === 'present') dateAttendanceMap[rec.date].present++;
    if (rec.status === 'late') dateAttendanceMap[rec.date].late++;
    if (rec.status === 'absent') dateAttendanceMap[rec.date].absent++;
  });

  // Map holidays by date
  const holidayMap: Record<string, typeof holidays[0]> = {};
  holidays.forEach((h) => {
    holidayMap[h.date] = h;
  });

  // Calendar calculations
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth(); // 0-indexed
  const monthName = calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon ...
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    setCalendarMonth(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCalendarMonth(new Date(year, month + 1, 1));
  };

  const jumpToToday = () => {
    const today = new Date();
    setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today.toISOString().slice(0, 10));
  };

  // Period Counts
  const prelimSessions = new Set(
    subjectAttendance.filter((a) => (a.period || 'prelim') === 'prelim').map((a) => a.date)
  ).size;

  const midtermSessions = new Set(
    subjectAttendance.filter((a) => a.period === 'midterm').map((a) => a.date)
  ).size;

  const finalsSessions = new Set(
    subjectAttendance.filter((a) => a.period === 'finals').map((a) => a.date)
  ).size;

  const todayStr = new Date().toISOString().slice(0, 10);
  const selectedHoliday = holidayMap[selectedDate];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Class Attendance Roll Call
            </h1>
            <NeuBadge variant="primary" size="sm">
              {activeSubject.code}
            </NeuBadge>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
              Interactive Smart Calendar
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Track daily student attendance separated by <strong>Prelim</strong>, <strong>Midterm</strong>, and <strong>Finals</strong> with calendar holiday highlights.
          </p>
        </div>

        {/* Section and Subject Selectors */}
        <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto">
          {isDean && (
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold self-end xl:self-auto mb-1 xl:mb-0">
              <button
                type="button"
                onClick={() => setDeanViewAll(false)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  !deanViewAll
                    ? 'bg-white dark:bg-slate-700 text-[#1E3A8A] dark:text-blue-300 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                My Courses
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
                All Courses (Dean)
              </button>
            </div>
          )}

          <div className="w-full sm:w-44 md:w-48">
            <NeuSelect
              label="Class / Section"
              options={sectionOptions}
              value={selectedSectionId}
              onChange={(e) => {
                setSelectedSectionId(e.target.value);
                const subjs = accessibleSubjects.filter((s) => s.sectionId === e.target.value);
                if (subjs[0]) setSelectedSubjectId(subjs[0].id);
              }}
            />
          </div>

          <div className="w-full sm:w-52 md:w-60">
            <NeuSelect
              label="Course Subject"
              options={subjectOptions}
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 3-Quarter Period Tabs */}
      <div className="bg-white dark:bg-[#0d1424] border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-2 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Prelim Tab */}
          <button
            onClick={() => setActivePeriod('prelim')}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 ${
              activePeriod === 'prelim'
                ? 'bg-[#1E3A8A] text-white shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'
            }`}
          >
            <span>1️⃣ Prelim</span>
            <span
              className={`text-[9.5px] sm:text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                activePeriod === 'prelim'
                  ? 'bg-white/20 text-white'
                  : 'bg-blue-100 dark:bg-blue-950 text-[#1E3A8A] dark:text-blue-300'
              }`}
            >
              {prelimSessions}
            </span>
          </button>

          {/* Midterm Tab */}
          <button
            onClick={() => setActivePeriod('midterm')}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 ${
              activePeriod === 'midterm'
                ? 'bg-[#1E3A8A] text-white shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'
            }`}
          >
            <span>2️⃣ Midterm</span>
            <span
              className={`text-[9.5px] sm:text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                activePeriod === 'midterm'
                  ? 'bg-white/20 text-white'
                  : 'bg-blue-100 dark:bg-blue-950 text-[#1E3A8A] dark:text-blue-300'
              }`}
            >
              {midtermSessions}
            </span>
          </button>

          {/* Finals Tab */}
          <button
            onClick={() => setActivePeriod('finals')}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 ${
              activePeriod === 'finals'
                ? 'bg-[#1E3A8A] text-white shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'
            }`}
          >
            <span>3️⃣ Finals</span>
            <span
              className={`text-[9.5px] sm:text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                activePeriod === 'finals'
                  ? 'bg-white/20 text-white'
                  : 'bg-blue-100 dark:bg-blue-950 text-[#1E3A8A] dark:text-blue-300'
              }`}
            >
              {finalsSessions}
            </span>
          </button>

          {/* All Sessions Tab */}
          <button
            onClick={() => setActivePeriod('all')}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 ${
              activePeriod === 'all'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Periods ({prelimSessions + midtermSessions + finalsSessions})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <NeuButton
            variant="secondary"
            size="sm"
            onClick={() => setIsHolidayModalOpen(true)}
            leftIcon={<Palmtree className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
          >
            Holidays & Breaks ({holidays.length})
          </NeuButton>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CUSTOM VISUAL INTERACTIVE CALENDAR                                       */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        {/* Calendar Header Navigation */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white capitalize">
                {monthName}
              </h3>
              <p className="text-xs text-slate-500">
                Click any day to take roll-call or view session records
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Legend */}
            <div className="hidden md:flex items-center gap-3 text-[11px] text-slate-500 mr-2">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                Attendance Recorded
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                Holiday / Event
              </span>
            </div>

            <NeuButton variant="secondary" size="sm" onClick={jumpToToday}>
              Today
            </NeuButton>

            <button
              onClick={prevMonth}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={nextMonth}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 7-Column Days Grid */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {/* Day Headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div
              key={d}
              className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 py-1"
            >
              {d}
            </div>
          ))}

          {/* Blank cells for offset */}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div
              key={`blank-${i}`}
              className="min-h-[75px] sm:min-h-[85px] rounded-xl bg-slate-50/40 dark:bg-slate-850/20 border border-transparent"
            />
          ))}

          {/* Days of Month */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(
              dayNum
            ).padStart(2, '0')}`;

            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const dayAtt = dateAttendanceMap[dateStr];
            const holiday = holidayMap[dateStr];

            const hasAttendance = Boolean(dayAtt && dayAtt.total > 0);
            const attendancePct =
              hasAttendance && dayAtt
                ? Math.round(((dayAtt.present + dayAtt.late * 0.5) / dayAtt.total) * 100)
                : 0;

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => setSelectedDate(dateStr)}
                className={`min-h-[75px] sm:min-h-[85px] p-2 rounded-xl text-left border transition-all flex flex-col justify-between group relative overflow-hidden ${
                  isSelected
                    ? 'ring-2 ring-indigo-600 dark:ring-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 border-indigo-400'
                    : hasAttendance
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 hover:border-emerald-400'
                    : holiday
                    ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60 hover:border-rose-400'
                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700'
                }`}
              >
                {/* Date Top Row */}
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-xs font-bold ${
                      isToday
                        ? 'w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-extrabold'
                        : isSelected
                        ? 'text-indigo-600 dark:text-indigo-400 font-extrabold'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {dayNum}
                  </span>

                  {dayAtt?.period && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1 rounded bg-slate-200/60 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300">
                      {dayAtt.period.slice(0, 3)}
                    </span>
                  )}
                </div>

                {/* Badges / Highlights */}
                <div className="space-y-1 mt-1 w-full">
                  {/* Holiday / Suspension Badge */}
                  {holiday && (
                    <div
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 truncate"
                      title={holiday.title}
                    >
                      🏖️ {holiday.title}
                    </div>
                  )}

                  {/* Attendance Log Badge */}
                  {hasAttendance && dayAtt && (
                    <div
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between"
                      title={`${dayAtt.present} Present, ${dayAtt.late} Late, ${dayAtt.absent} Absent`}
                    >
                      <span className="flex items-center gap-0.5 truncate">
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>{attendancePct}%</span>
                      </span>
                      <span className="text-[9px] opacity-80">({dayAtt.total})</span>
                    </div>
                  )}

                  {!hasAttendance && !holiday && (
                    <div className="text-[9px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      + Roll Call
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SESSION ROLL CALL SHEET */}
      <div className="bg-white dark:bg-[#0d1424] border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
              <CalendarCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Session: {selectedDate}</span>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase">
              {activePeriod === 'all' ? 'Prelim Period' : `${activePeriod} Period`}
            </span>
            {selectedHoliday && (
              <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs font-bold">
                🏖️ {selectedHoliday.title} ({selectedHoliday.type})
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 pt-1">
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              {datePresent} Present
            </span>
            <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-xs font-bold text-amber-700 dark:text-amber-300">
              {dateLate} Late
            </span>
            <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-700 dark:text-rose-300">
              {dateAbsent} Absent
            </span>
            <span className="px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-xs font-bold text-sky-700 dark:text-sky-300">
              {dateExcused} Excused
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <NeuButton
            variant="secondary"
            size="sm"
            onClick={() => handleMarkAll('present')}
            leftIcon={<Check className="w-3.5 h-3.5 text-emerald-600" />}
          >
            Mark All Present
          </NeuButton>

          <NeuButton
            variant="secondary"
            size="sm"
            onClick={() => handleMarkAll('absent')}
            leftIcon={<X className="w-3.5 h-3.5 text-rose-600" />}
          >
            Mark All Absent
          </NeuButton>
        </div>
      </div>

      {/* Roll Call Students List */}
      <div className="grid grid-cols-1 gap-3">
        {sortedStudents.map((student) => {
          const rec = attendance.find(
            (a) =>
              a.subjectId === activeSubject.id &&
              a.studentId === student.id &&
              a.date === selectedDate
          );

          const hasRecord = Boolean(rec);
          const currentStatus: AttendanceStatus | undefined = rec?.status;
          const periodToQuery = activePeriod === 'all' ? undefined : activePeriod;
          const stats = calculateAttendanceStats(attendance, student.id, activeSubject.id, periodToQuery);

          return (
            <NeuCard
              key={student.id}
              className={`p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3.5 transition-all ${
                !hasRecord ? 'border-dashed border-slate-300 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/30' : ''
              }`}
            >
              {/* Student Profile Info */}
              <div className="flex items-center gap-3 min-w-0 md:w-1/3">
                <img
                  src={student.avatar}
                  alt={student.name}
                  className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {formatLastFirst(student.name)}
                    </h3>
                    {!hasRecord && (
                      <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded-md border border-amber-200/80 dark:border-amber-800/80">
                        Pending Roll
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>{student.studentNumber || 'No ID'}</span>
                    <span>•</span>
                    <span
                      className={`font-mono font-bold ${
                        stats.rate >= 90
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : stats.rate >= 75
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {stats.rate}% {activePeriod === 'all' ? 'Overall' : activePeriod.toUpperCase()} Rate
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Segmented Buttons */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                <button
                  type="button"
                  onClick={() => handleStatusChange(student.id, 'present')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                    hasRecord && currentStatus === 'present'
                      ? 'bg-emerald-600 text-white shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-white/60 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <Check className={`w-3.5 h-3.5 ${hasRecord && currentStatus === 'present' ? 'text-white' : 'text-emerald-600'}`} />
                  <span>Present</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleStatusChange(student.id, 'late')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                    hasRecord && currentStatus === 'late'
                      ? 'bg-amber-500 text-white shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-white/60 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <Clock className={`w-3.5 h-3.5 ${hasRecord && currentStatus === 'late' ? 'text-white' : 'text-amber-600'}`} />
                  <span>Late</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleStatusChange(student.id, 'absent')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                    hasRecord && currentStatus === 'absent'
                      ? 'bg-rose-600 text-white shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-white/60 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <X className={`w-3.5 h-3.5 ${hasRecord && currentStatus === 'absent' ? 'text-white' : 'text-rose-600'}`} />
                  <span>Absent</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleStatusChange(student.id, 'excused')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                    hasRecord && currentStatus === 'excused'
                      ? 'bg-sky-600 text-white shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-sky-700 dark:hover:text-sky-300 hover:bg-white/60 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <ShieldAlert className={`w-3.5 h-3.5 ${hasRecord && currentStatus === 'excused' ? 'text-white' : 'text-sky-600'}`} />
                  <span>Excused</span>
                </button>
              </div>

              {/* Note input */}
              <div className="md:w-1/4">
                <input
                  type="text"
                  placeholder="Optional remark / reason..."
                  value={rec?.note || ''}
                  onChange={(e) => handleNoteChange(student.id, currentStatus || 'present', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
              </div>
            </NeuCard>
          );
        })}
      </div>

      {/* Holiday Modal */}
      <HolidayModal
        isOpen={isHolidayModalOpen}
        onClose={() => setIsHolidayModalOpen(false)}
        holidays={holidays}
        onAddHoliday={(hol) => {
          addHoliday(hol);
          onShowToast('Holiday Added', `"${hol.title}" added to academic calendar.`, 'success');
        }}
        onDeleteHoliday={(id) => {
          deleteHoliday(id);
          onShowToast('Holiday Removed', 'Calendar event deleted.', 'warning');
        }}
        initialDate={selectedDate}
      />
    </div>
  );
};
