import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { StudentBottomNav } from './components/layout/StudentBottomNav';
import { Toast, ToastMessage } from './components/common/Toast';

// Teacher Views
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { SectionManager } from './components/teacher/SectionManager';
import { SubjectManager } from './components/teacher/SubjectManager';
import { Gradebook } from './components/teacher/Gradebook';
import { AttendanceTracker } from './components/teacher/AttendanceTracker';
import { StudentRoster } from './components/teacher/StudentRoster';
import { FacultyManager } from './components/teacher/FacultyManager';
import { SectionModal } from './components/teacher/SectionModal';
import { SubjectModal } from './components/teacher/SubjectModal';

// Student Views
import { StudentDashboard } from './components/student/StudentDashboard';
import { StudentSubjectView } from './components/student/StudentSubjectView';
import { MatrixBreakdownView } from './components/student/MatrixBreakdownView';
import { GradeSimulator } from './components/student/GradeSimulator';
import { AuthPage } from './components/auth/AuthPage';
import { ForcePasswordChangeModal } from './components/auth/ForcePasswordChangeModal';
import { GradingPeriod } from './types';

const MainLayout: React.FC = () => {
  const { currentUser, isTeacher, isDean, isLoading } = useAuth();
  const { sections, addSection, addSubject } = useData();

  // Navigation State
  const [currentTab, setCurrentTab] = useState<string>(
    isTeacher ? 'dashboard' : 'student-dashboard'
  );

  React.useEffect(() => {
    if (currentUser) {
      setCurrentTab(isTeacher ? 'dashboard' : 'student-dashboard');
    }
  }, [currentUser?.id, currentUser?.role, isTeacher]);

  // Protect faculty administration tab: only Deans can view it
  React.useEffect(() => {
    if (!isDean && currentTab === 'faculty') {
      setCurrentTab('dashboard');
    }
  }, [isDean, currentTab]);

  // Deep link arguments
  const [navSectionId, setNavSectionId] = useState<string | undefined>(undefined);
  const [navSubjectId, setNavSubjectId] = useState<string | undefined>(undefined);
  const [navPeriod, setNavPeriod] = useState<GradingPeriod>('prelim');

  // Modals
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (
    title: string,
    message?: string,
    type: 'success' | 'warning' | 'error' | 'info' = 'info'
  ) => {
    const id = `toast-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
    const newToast: ToastMessage = { id, title, message, type };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
          <div className="text-xs font-semibold">Loading Gradely...</div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <AuthPage onShowToast={showToast} />
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              toast={toast}
              onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
            />
          ))}
        </div>
      </>
    );
  }

  // Navigation helpers
  const handleTeacherNavigate = (tab: string, sectionId?: string, subjectId?: string) => {
    if (sectionId) setNavSectionId(sectionId);
    if (subjectId) setNavSubjectId(subjectId);
    setCurrentTab(tab);
  };

  const handleStudentSelectSubject = (subjectId: string) => {
    setNavSubjectId(subjectId);
    setCurrentTab('student-subjects');
  };

  const handleOpenSimulator = (subjectId: string) => {
    setNavSubjectId(subjectId);
    setCurrentTab('student-simulator');
  };

  return (
    <div className="min-h-screen flex flex-col bg-transparent text-slate-900 dark:text-slate-100 selection:bg-[#F97316]/20 transition-colors duration-200">
      {/* Top Header */}
      <Navbar onShowToast={showToast} />

      {/* Main App Container */}
      <div className="max-w-7xl w-full mx-auto px-3.5 py-3.5 sm:p-6 md:p-8 flex-1 flex flex-col lg:flex-row gap-4 sm:gap-6">
        {/* Navigation Sidebar */}
        <Sidebar currentTab={currentTab} onSelectTab={(tab) => setCurrentTab(tab)} />

        {/* Dynamic View Area */}
        <main className={`flex-1 min-w-0 ${!isTeacher ? 'pb-24 lg:pb-0' : ''}`}>
          {/* Teacher Views */}
          {isTeacher && currentTab === 'dashboard' && (
            <TeacherDashboard
              onNavigate={handleTeacherNavigate}
              onOpenSectionModal={() => setIsSectionModalOpen(true)}
              onOpenSubjectModal={() => setIsSubjectModalOpen(true)}
            />
          )}

          {isTeacher && currentTab === 'sections' && (
            <SectionManager
              onNavigateToSubjects={(secId) => {
                setNavSectionId(secId);
                setCurrentTab('subjects');
              }}
              onNavigateToRoster={(secId) => {
                setNavSectionId(secId);
                setCurrentTab('students');
              }}
              onShowToast={showToast}
            />
          )}

          {isTeacher && currentTab === 'subjects' && (
            <SubjectManager
              initialSectionId={navSectionId}
              onNavigateToGradebook={(secId, subjId) => {
                setNavSectionId(secId);
                setNavSubjectId(subjId);
                setCurrentTab('gradebook');
              }}
              onNavigateToAttendance={(secId, subjId) => {
                setNavSectionId(secId);
                setNavSubjectId(subjId);
                setCurrentTab('attendance');
              }}
              onShowToast={showToast}
            />
          )}

          {isTeacher && currentTab === 'gradebook' && (
            <Gradebook
              initialSectionId={navSectionId}
              initialSubjectId={navSubjectId}
              onNavigateToAttendance={(secId, subjId, period) => {
                setNavSectionId(secId);
                setNavSubjectId(subjId);
                if (period) setNavPeriod(period);
                setCurrentTab('attendance');
              }}
              onShowToast={showToast}
            />
          )}

          {isTeacher && currentTab === 'attendance' && (
            <AttendanceTracker
              initialSectionId={navSectionId}
              initialSubjectId={navSubjectId}
              initialPeriod={navPeriod}
              onShowToast={showToast}
            />
          )}

          {isTeacher && currentTab === 'students' && (
            <StudentRoster
              initialSectionId={navSectionId}
              onShowToast={showToast}
            />
          )}

          {isDean && currentTab === 'faculty' && (
            <FacultyManager
              onNavigateToSubjects={() => setCurrentTab('subjects')}
              onShowToast={showToast}
            />
          )}

          {/* Student Views */}
          {!isTeacher && currentTab === 'student-dashboard' && (
            <StudentDashboard
              onSelectSubject={handleStudentSelectSubject}
              onNavigate={(tab) => setCurrentTab(tab)}
            />
          )}

          {!isTeacher && currentTab === 'student-subjects' && (
            <StudentSubjectView
              selectedSubjectId={navSubjectId}
              onBack={() => setCurrentTab('student-dashboard')}
              onOpenSimulator={handleOpenSimulator}
            />
          )}

          {!isTeacher && currentTab === 'student-matrix' && (
            <MatrixBreakdownView />
          )}

          {!isTeacher && currentTab === 'student-simulator' && (
            <GradeSimulator
              initialSubjectId={navSubjectId}
              onBack={() => setCurrentTab('student-dashboard')}
            />
          )}
        </main>
      </div>

      {/* Teacher Quick Creation Modals */}
      <SectionModal
        isOpen={isSectionModalOpen}
        onClose={() => setIsSectionModalOpen(false)}
        onSave={(data) => {
          addSection(data);
          showToast('Section Created', `"${data.name}" added successfully.`, 'success');
        }}
      />

      <SubjectModal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        sections={sections}
        selectedSectionId={navSectionId}
        onSave={(data) => {
          addSubject(data);
          showToast('Subject Created', `"${data.name}" added successfully.`, 'success');
        }}
      />

      {/* Mandatory First-Time Student Password Change Modal */}
      <ForcePasswordChangeModal onShowToast={showToast} />

      {/* Mobile Bottom Navigation for Students */}
      {!isTeacher && (
        <StudentBottomNav
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
        />
      )}

      {/* Toast Notification Container */}
      <div className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-50 flex flex-col gap-2 pointer-events-none max-w-[calc(100vw-2rem)]">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            toast={toast}
            onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
          />
        ))}
      </div>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <MainLayout />
      </DataProvider>
    </AuthProvider>
  );
}

export default App;
