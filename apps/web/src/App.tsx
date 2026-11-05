import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/Login';
import { PageSkeleton } from './components/PageSkeleton';
import { ToastProvider } from './context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { pageTransitionVariants } from './utils/animations';

// Route-level code splitting via React.lazy with automatic reload retry on fresh deployment
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err: any) {
      const isChunkError =
        err?.message?.includes('dynamically imported module') ||
        err?.message?.includes('Failed to fetch dynamically imported module') ||
        err?.message?.includes('Loading chunk') ||
        err?.message?.includes('text/html');

      if (isChunkError) {
        const lastReload = Number(sessionStorage.getItem('tuitionos_last_lazy_reload') || '0');
        const now = Date.now();
        if (now - lastReload > 10000) {
          sessionStorage.setItem('tuitionos_last_lazy_reload', String(now));
          window.location.reload();
          return new Promise<{ default: T }>(() => {});
        }
      }
      throw err;
    }
  });
}

const SuperAdminDashboard = lazyWithRetry(() => import('./pages/SuperAdminDashboard').then((m) => ({ default: m.SuperAdminDashboard })));
const AcademicAdminDashboard = lazyWithRetry(() => import('./pages/AcademicAdminDashboard').then((m) => ({ default: m.AcademicAdminDashboard })));
const StaffManagement = lazyWithRetry(() => import('./pages/StaffManagement').then((m) => ({ default: m.StaffManagement })));
const StaffAttendanceAdmin = lazyWithRetry(() => import('./pages/StaffAttendanceAdmin').then((m) => ({ default: m.StaffAttendanceAdmin })));
const StaffMyAttendance = lazyWithRetry(() => import('./pages/StaffMyAttendance').then((m) => ({ default: m.StaffMyAttendance })));
const StudentManagement = lazyWithRetry(() => import('./pages/StudentManagement').then((m) => ({ default: m.StudentManagement })));
const AcademicsManagement = lazyWithRetry(() => import('./pages/AcademicsManagement').then((m) => ({ default: m.AcademicsManagement })));
const AttendanceManagement = lazyWithRetry(() => import('./pages/AttendanceManagement').then((m) => ({ default: m.AttendanceManagement })));
const ParentPortal = lazyWithRetry(() => import('./pages/ParentPortal').then((m) => ({ default: m.ParentPortal })));
const StudentPortal = lazyWithRetry(() => import('./pages/StudentPortal').then((m) => ({ default: m.StudentPortal })));
const MaterialsManagement = lazyWithRetry(() => import('./pages/MaterialsManagement').then((m) => ({ default: m.MaterialsManagement })));
const HomeworkManagement = lazyWithRetry(() => import('./pages/HomeworkManagement').then((m) => ({ default: m.HomeworkManagement })));
const ExaminationsManagement = lazyWithRetry(() => import('./pages/ExaminationsManagement').then((m) => ({ default: m.ExaminationsManagement })));
const QuestionGenerator = lazyWithRetry(() => import('./pages/QuestionGenerator/QuestionGenerator').then((m) => ({ default: m.QuestionGenerator })));
const ProgressReviewsManagement = lazyWithRetry(() => import('./pages/ProgressReviewsManagement').then((m) => ({ default: m.ProgressReviewsManagement })));
const MessagingInbox = lazyWithRetry(() => import('./pages/MessagingInbox').then((m) => ({ default: m.MessagingInbox })));
const FeesManagement = lazyWithRetry(() => import('./pages/FeesManagement').then((m) => ({ default: m.FeesManagement })));
const PayrollManagement = lazyWithRetry(() => import('./pages/PayrollManagement').then((m) => ({ default: m.PayrollManagement })));
const StaffMyPayslips = lazyWithRetry(() => import('./pages/StaffMyPayslips').then((m) => ({ default: m.StaffMyPayslips })));
const BranchManagement = lazyWithRetry(() => import('./pages/BranchManagement').then((m) => ({ default: m.BranchManagement })));

const getDefaultTabForRole = (role?: string): string => {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'super_admin_dashboard';
    case 'ACADEMIC_ADMIN':
      return 'academic_dashboard';
    case 'STAFF':
      return 'my_attendance';
    case 'PARENT':
      return 'parent_dashboard';
    case 'STUDENT':
      return 'student_portal';
    default:
      return 'academic_dashboard';
  }
};

const isTabAllowedForRole = (tab: string, role?: string): boolean => {
  if (!role) return false;
  switch (role) {
    case 'SUPER_ADMIN':
      return ['super_admin_dashboard', 'staff_attendance', 'staff', 'students', 'academics', 'exams', 'fees', 'payroll', 'branches'].includes(tab);
    case 'ACADEMIC_ADMIN':
      return ['academic_dashboard', 'staff', 'staff_attendance', 'students', 'academics', 'exams', 'question_generator', 'progress_reviews', 'messaging', 'fees', 'payroll', 'branches'].includes(tab);
    case 'STAFF':
      return ['my_attendance', 'my_payslips', 'attendance', 'academic_dashboard', 'students', 'materials', 'homework', 'exams', 'progress_reviews', 'messaging'].includes(tab);
    case 'PARENT':
      return tab === 'parent_portal' || tab.startsWith('parent_') || tab === 'progress_reviews';
    case 'STUDENT':
      return ['student_portal', 'materials', 'homework', 'exams', 'progress_reviews'].includes(tab) || tab.startsWith('student_');
    default:
      return false;
  }
};

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
      const targetTab = raw === 'learning_materials' ? 'materials' : raw;
      if (targetTab && isTabAllowedForRole(targetTab, user.role)) {
        setCurrentTab(targetTab);
      } else {
        const defaultTab = getDefaultTabForRole(user.role);
        setCurrentTab(defaultTab);
        window.history.replaceState({}, '', `/${defaultTab}`);
      }
    }
  }, [user]);

  useEffect(() => {
    const handleTabChange = (e: any) => {
      const { tab } = e.detail || {};
      if (tab) {
        const normalized = tab === 'learning_materials' ? 'materials' : tab;
        if (!user || isTabAllowedForRole(normalized, user.role)) {
          setCurrentTab(normalized);
        }
      }
    };
    const handlePopState = () => {
      const raw = window.location.pathname.replace(/^\//, '').trim();
      if (raw) {
        const normalized = raw === 'learning_materials' ? 'materials' : raw;
        if (!user || isTabAllowedForRole(normalized, user.role)) {
          setCurrentTab(normalized);
        } else if (user) {
          const defaultTab = getDefaultTabForRole(user.role);
          setCurrentTab(defaultTab);
          window.history.replaceState({}, '', `/${defaultTab}`);
        }
      }
    };

    window.addEventListener('tuitionos:tab-change', handleTabChange);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('tuitionos:tab-change', handleTabChange);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [user]);

  useEffect(() => {
    if (user && !isTabAllowedForRole(currentTab, user.role)) {
      const defaultTab = getDefaultTabForRole(user.role);
      setCurrentTab(defaultTab);
      window.history.replaceState({}, '', `/${defaultTab}`);
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
            <Suspense fallback={<PageSkeleton />}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentTab}
                  variants={pageTransitionVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  {currentTab === 'super_admin_dashboard' && user.role === 'SUPER_ADMIN' && (
                    <SuperAdminDashboard />
                  )}

                  {currentTab === 'academic_dashboard' && (user.role === 'ACADEMIC_ADMIN' || user.role === 'STAFF' || user.role === 'SUPER_ADMIN') && (
                    <AcademicAdminDashboard onNavigateTab={(tab) => setCurrentTab(tab)} />
                  )}

                  {currentTab === 'staff' && (user.role === 'ACADEMIC_ADMIN' || user.role === 'SUPER_ADMIN') && <StaffManagement />}

                  {currentTab === 'staff_attendance' && (user.role === 'ACADEMIC_ADMIN' || user.role === 'SUPER_ADMIN') && (
                    <StaffAttendanceAdmin onNavigateTab={(tab) => setCurrentTab(tab)} />
                  )}

                  {currentTab === 'my_attendance' && user.role === 'STAFF' && <StaffMyAttendance />}

                  {currentTab === 'students' && (user.role === 'ACADEMIC_ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'STAFF') && <StudentManagement />}

                  {currentTab === 'academics' && (user.role === 'ACADEMIC_ADMIN' || user.role === 'SUPER_ADMIN') && (
                    <AcademicsManagement onNavigateTab={(tab) => setCurrentTab(tab)} />
                  )}

                  {currentTab === 'attendance' && user.role === 'STAFF' && <AttendanceManagement />}

                  {(currentTab === 'parent_portal' || currentTab.startsWith('parent_')) && user.role === 'PARENT' && (
                    <ParentPortal
                      initialTab={
                        currentTab === 'parent_portal' || currentTab === 'parent_dashboard'
                          ? 'dashboard'
                          : currentTab.replace('parent_', '')
                      }
                    />
                  )}

                  {currentTab === 'student_portal' && user.role === 'STUDENT' && <StudentPortal />}

                  {currentTab === 'materials' && (user.role === 'STAFF' || user.role === 'STUDENT') && <MaterialsManagement />}

                  {currentTab === 'homework' && (user.role === 'STAFF' || user.role === 'STUDENT') && <HomeworkManagement />}

                  {currentTab === 'exams' && (user.role === 'ACADEMIC_ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'STAFF' || user.role === 'STUDENT') && <ExaminationsManagement />}

                  {currentTab === 'question_generator' && user.role === 'ACADEMIC_ADMIN' && <QuestionGenerator />}

                  {currentTab === 'progress_reviews' && <ProgressReviewsManagement />}

                  {currentTab === 'messaging' && (user.role === 'ACADEMIC_ADMIN' || user.role === 'STAFF') && <MessagingInbox />}
                  {currentTab === 'fees' && (user.role === 'ACADEMIC_ADMIN' || user.role === 'SUPER_ADMIN') && <FeesManagement />}
                  {currentTab === 'payroll' && (user.role === 'ACADEMIC_ADMIN' || user.role === 'SUPER_ADMIN') && <PayrollManagement />}
                  {currentTab === 'branches' && (user.role === 'ACADEMIC_ADMIN' || user.role === 'SUPER_ADMIN') && <BranchManagement />}
                  {currentTab === 'my_payslips' && user.role === 'STAFF' && <StaffMyPayslips />}
                </motion.div>
              </AnimatePresence>
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
};

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
