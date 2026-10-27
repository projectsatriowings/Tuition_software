import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/Login';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';
import { AcademicAdminDashboard } from './pages/AcademicAdminDashboard';
import { StaffManagement } from './pages/StaffManagement';
import { StudentManagement } from './pages/StudentManagement';
import { AcademicsManagement } from './pages/AcademicsManagement';
import { AttendanceManagement } from './pages/AttendanceManagement';
import { ParentPortal } from './pages/ParentPortal';
import { StudentPortal } from './pages/StudentPortal';
import { MaterialsManagement } from './pages/MaterialsManagement';
import { HomeworkManagement } from './pages/HomeworkManagement';
import { ExaminationsManagement } from './pages/ExaminationsManagement';
import { ProgressReviewsManagement } from './pages/ProgressReviewsManagement';
import { MessagingInbox } from './pages/MessagingInbox';
import { FeesManagement } from './pages/FeesManagement';

import { motion, AnimatePresence } from 'framer-motion';
import { pageTransitionVariants } from './utils/animations';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('academic_dashboard');

  useEffect(() => {
    if (user) {
      if (user.role === 'SUPER_ADMIN') {
        setCurrentTab('super_admin_dashboard');
      } else if (user.role === 'ACADEMIC_ADMIN') {
        setCurrentTab((prev) => (prev === 'materials' || prev === 'homework' ? 'academic_dashboard' : prev));
      } else if (user.role === 'STAFF') {
        setCurrentTab('attendance');
      } else if (user.role === 'PARENT') {
        setCurrentTab('parent_portal');
      } else if (user.role === 'STUDENT') {
        setCurrentTab('student_portal');
      }
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === 'ACADEMIC_ADMIN' && (currentTab === 'materials' || currentTab === 'homework')) {
      setCurrentTab('academic_dashboard');
    }
  }, [user?.role, currentTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F2EF] flex items-center justify-center text-[#3E2723]">
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
    <div className="min-h-screen bg-[#F7F2EF] text-[#2D1E18] flex flex-col font-sans">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentTab={currentTab} onSelectTab={(tab) => setCurrentTab(tab)} />

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

                {currentTab === 'staff' && <StaffManagement />}

                {currentTab === 'students' && <StudentManagement />}

                {currentTab === 'academics' && (
                  <AcademicsManagement onNavigateTab={(tab) => setCurrentTab(tab)} />
                )}

                {currentTab === 'attendance' && <AttendanceManagement />}

                {currentTab === 'parent_portal' && <ParentPortal />}

                {currentTab === 'student_portal' && <StudentPortal />}

                {currentTab === 'materials' && user?.role !== 'ACADEMIC_ADMIN' && <MaterialsManagement />}

                {currentTab === 'homework' && user?.role !== 'ACADEMIC_ADMIN' && <HomeworkManagement />}

                {currentTab === 'exams' && <ExaminationsManagement />}

                {currentTab === 'progress_reviews' && <ProgressReviewsManagement />}

                {currentTab === 'messaging' && <MessagingInbox />}
                {currentTab === 'fees' && <FeesManagement />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
};

import { ToastProvider } from './context/ToastContext';

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}

