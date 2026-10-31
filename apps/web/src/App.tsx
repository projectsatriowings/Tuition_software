import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/Login';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';
import { AcademicAdminDashboard } from './pages/AcademicAdminDashboard';
import { StaffManagement } from './pages/StaffManagement';
import { StaffAttendanceAdmin } from './pages/StaffAttendanceAdmin';
import { StaffMyAttendance } from './pages/StaffMyAttendance';
import { StudentManagement } from './pages/StudentManagement';
import { AcademicsManagement } from './pages/AcademicsManagement';
import { AttendanceManagement } from './pages/AttendanceManagement';
import { ParentPortal } from './pages/ParentPortal';
import { StudentPortal } from './pages/StudentPortal';
import { MaterialsManagement } from './pages/MaterialsManagement';
import { HomeworkManagement } from './pages/HomeworkManagement';
import { ExaminationsManagement } from './pages/ExaminationsManagement';
import { QuestionGenerator } from './pages/QuestionGenerator/QuestionGenerator';
import { ProgressReviewsManagement } from './pages/ProgressReviewsManagement';
import { MessagingInbox } from './pages/MessagingInbox';
import { FeesManagement } from './pages/FeesManagement';

import { motion, AnimatePresence } from 'framer-motion';
import { pageTransitionVariants } from './utils/animations';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>(() => {
    const raw = window.location.pathname.replace(/^\//, '').trim();
    if (raw && raw !== '/') {
      return raw === 'learning_materials' ? 'materials' : raw;
    }
    return 'academic_dashboard';
  });

  useEffect(() => {
    if (user) {
      const raw = window.location.pathname.replace(/^\//, '').trim();
      if (raw && raw !== '/') {
        setCurrentTab(raw === 'learning_materials' ? 'materials' : raw);
      } else {
        if (user.role === 'SUPER_ADMIN') {
          setCurrentTab('super_admin_dashboard');
        } else if (user.role === 'ACADEMIC_ADMIN') {
          setCurrentTab('academic_dashboard');
        } else if (user.role === 'STAFF') {
          setCurrentTab('attendance');
        } else if (user.role === 'PARENT') {
          setCurrentTab('parent_dashboard');
        } else if (user.role === 'STUDENT') {
          setCurrentTab('student_portal');
        }
      }
    }
  }, [user]);

  useEffect(() => {
    const handleTabChange = (e: any) => {
      const { tab } = e.detail || {};
      if (tab) {
        setCurrentTab(tab === 'learning_materials' ? 'materials' : tab);
      }
    };
    const handlePopState = () => {
      const raw = window.location.pathname.replace(/^\//, '').trim();
      if (raw) {
        setCurrentTab(raw === 'learning_materials' ? 'materials' : raw);
      }
    };

    window.addEventListener('tuitionos:tab-change', handleTabChange);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('tuitionos:tab-change', handleTabChange);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    if (user?.role === 'ACADEMIC_ADMIN' && (currentTab === 'materials' || currentTab === 'homework')) {
      setCurrentTab('academic_dashboard');
    }
    if (user?.role === 'STAFF' && (currentTab === 'fees' || currentTab === 'academics' || currentTab === 'staff')) {
      setCurrentTab('attendance');
    }
  }, [user, currentTab]);

  if (loading) {
    return (
      <div className="h-screen bg-[#F7F2EF] overflow-hidden flex items-center justify-center text-[#3E2723]">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full bg-[#4E342E] animate-ping"></div>
          <span className="text-sm font-semibold text-[#6D4C41]">Loading TuitionOS...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="h-screen bg-[#F7F2EF] overflow-hidden text-[#2D1E18] flex flex-col font-sans">
      <Navbar />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar currentTab={currentTab} onSelectTab={(tab) => { setCurrentTab(tab); window.history.pushState({}, '', `/${tab}`); }} />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-[#F7F2EF]">
          <div className="max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTab}
                variants={pageTransitionVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {currentTab === 'super_admin_dashboard' && (
                  <SuperAdminDashboard />
                )}

                {currentTab === 'academic_dashboard' && (
                  <AcademicAdminDashboard onNavigateTab={(tab) => setCurrentTab(tab)} />
                )}

                {currentTab === 'staff' && (user.role === 'ACADEMIC_ADMIN' || user.role === 'SUPER_ADMIN') && <StaffManagement />}

                {currentTab === 'staff_attendance' && (user.role === 'ACADEMIC_ADMIN' || user.role === 'SUPER_ADMIN') && (
                  <StaffAttendanceAdmin onNavigateTab={(tab) => setCurrentTab(tab)} />
                )}

                {currentTab === 'my_attendance' && <StaffMyAttendance />}

                {currentTab === 'students' && <StudentManagement />}

                {currentTab === 'academics' && (user.role === 'ACADEMIC_ADMIN' || user.role === 'SUPER_ADMIN') && (
                  <AcademicsManagement onNavigateTab={(tab) => setCurrentTab(tab)} />
                )}

                {currentTab === 'attendance' && <AttendanceManagement />}

                {(currentTab === 'parent_portal' || currentTab.startsWith('parent_')) && (
                  <ParentPortal
                    initialTab={
                      currentTab === 'parent_portal' || currentTab === 'parent_dashboard'
                        ? 'dashboard'
                        : currentTab.replace('parent_', '')
                    }
                  />
                )}

                {currentTab === 'student_portal' && <StudentPortal />}

                {currentTab === 'materials' && user?.role !== 'ACADEMIC_ADMIN' && <MaterialsManagement />}

                {currentTab === 'homework' && user?.role !== 'ACADEMIC_ADMIN' && <HomeworkManagement />}

                {currentTab === 'exams' && <ExaminationsManagement />}

                {currentTab === 'question_generator' && <QuestionGenerator />}

                {currentTab === 'progress_reviews' && <ProgressReviewsManagement />}

                {currentTab === 'messaging' && <MessagingInbox />}
                {currentTab === 'fees' && (user.role === 'ACADEMIC_ADMIN' || user.role === 'SUPER_ADMIN') && <FeesManagement />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
};

import { ToastProvider } from './context/ToastContext';
import { BrowserRouter } from 'react-router-dom';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
