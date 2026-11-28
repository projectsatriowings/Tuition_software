import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, getDefaultRouteForRole } from './context/AuthContext';
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
      return ['super_admin_dashboard', 'staff_attendance', 'attendance', 'staff', 'students', 'academics', 'exams', 'fees', 'payroll', 'branches'].includes(tab);
    case 'ACADEMIC_ADMIN':
      return ['academic_dashboard', 'staff', 'staff_attendance', 'attendance', 'students', 'academics', 'exams', 'progress_reviews', 'messaging', 'fees', 'payroll', 'branches'].includes(tab);
    case 'STAFF':
      return ['my_attendance', 'my_payslips', 'attendance', 'academic_dashboard', 'students', 'materials', 'homework', 'exams', 'progress_reviews', 'messaging'].includes(tab);
    case 'PARENT':
      return tab === 'parent_portal' || tab.startsWith('parent_') || tab === 'progress_reviews';
    case 'STUDENT':
      return ['student_portal', 'materials', 'homework', 'exams', 'progress_reviews', 'messaging'].includes(tab) || tab.startsWith('student_');
    default:
      return false;
  }
};

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const rawPath = location.pathname.replace(/^\//, '').trim();
  const normalizedPath = rawPath === 'learning_materials' ? 'materials' : rawPath;
  const currentTab =
    user && normalizedPath && isTabAllowedForRole(normalizedPath, user.role)
      ? normalizedPath
      : getDefaultTabForRole(user?.role);

  const handleNavigateTab = (tab: string) => {
    const normalized = tab === 'learning_materials' ? 'materials' : tab;
    if (!user || isTabAllowedForRole(normalized, user.role)) {
      navigate(`/${normalized}`);
    } else {
      navigate(getDefaultRouteForRole(user.role), { replace: true });
    }
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    const handleTabChange = (e: any) => {
      const { tab } = e.detail || {};
      if (tab) {
        const normalized = tab === 'learning_materials' ? 'materials' : tab;
        if (!user || isTabAllowedForRole(normalized, user.role)) {
          navigate(`/${normalized}`);
        }
      }
    };

    window.addEventListener('tuitionos:tab-change', handleTabChange);
    return () => {
      window.removeEventListener('tuitionos:tab-change', handleTabChange);
    };
  }, [user, navigate]);

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
    return (
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  const defaultRoute = getDefaultRouteForRole(user.role);
  const parentTab =
    currentTab === 'parent_portal' || currentTab === 'parent_dashboard'
      ? 'dashboard'
      : currentTab.startsWith('parent_')
      ? currentTab.replace('parent_', '')
      : 'dashboard';

  return (
    <div className="h-screen bg-[#F7F2EF] overflow-hidden text-[#2D1E18] flex flex-col font-sans">
      <Navbar onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)} isMobileMenuOpen={mobileMenuOpen} />

      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={handleNavigateTab}
          isOpenOnMobile={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#F7F2EF] w-full min-w-0">
          <div className="max-w-7xl mx-auto w-full min-w-0">
            <Suspense fallback={<PageSkeleton />}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentTab}
                  variants={pageTransitionVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  <Routes>
                    <Route path="/" element={<Navigate to={defaultRoute} replace />} />

                    <Route
                      path="/super_admin_dashboard"
                      element={
                        user.role === 'SUPER_ADMIN' ? (
                          <SuperAdminDashboard />
                        ) : (
                          <Navigate to={defaultRoute} replace />
                        )
                      }
                    />

                    <Route
                      path="/academic_dashboard"
                      element={
                        user.role === 'ACADEMIC_ADMIN' || user.role === 'STAFF' || user.role === 'SUPER_ADMIN' ? (
                          <AcademicAdminDashboard onNavigateTab={handleNavigateTab} />
                        ) : (
                          <Navigate to={defaultRoute} replace />
                        )
                      }
                    />

                    <Route
                      path="/staff"
                      element={
                        user.role === 'ACADEMIC_ADMIN' || user.role === 'SUPER_ADMIN' ? (
                          <StaffManagement />
                        ) : (
                          <Navigate to={defaultRoute} replace />
                        )
                      }
                    />

                    <Route
                      path="/staff_attendance"
                      element={
                        user.role === 'ACADEMIC_ADMIN' || user.role === 'SUPER_ADMIN' ? (
                          <StaffAttendanceAdmin onNavigateTab={handleNavigateTab} />
                        ) : (
                          <Navigate to={defaultRoute} replace />
                        )
                      }
                    />

                    <Route
                      path="/my_attendance"
                      element={
                        user.role === 'STAFF' ? <StaffMyAttendance /> : <Navigate to={defaultRoute} replace />
                      }
                    />

                    <Route
                      path="/my_payslips"
                      element={
                        user.role === 'STAFF' ? <StaffMyPayslips /> : <Navigate to={defaultRoute} replace />
                      }
                    />

                    <Route
                      path="/students"
                      element={
                        user.role === 'ACADEMIC_ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'STAFF' ? (
                          <StudentManagement />
                        ) : (
                          <Navigate to={defaultRoute} replace />
                        )
                      }
                    />

                    <Route
                      path="/academics"
                      element={
                        user.role === 'ACADEMIC_ADMIN' || user.role === 'SUPER_ADMIN' ? (
                          <AcademicsManagement onNavigateTab={handleNavigateTab} />
                        ) : (
                          <Navigate to={defaultRoute} replace />
                        )
                      }
                    />

                    <Route
                      path="/attendance"
                      element={
                        user.role === 'STAFF' || user.role === 'ACADEMIC_ADMIN' || user.role === 'SUPER_ADMIN' ? (
                          <AttendanceManagement />
                        ) : (
                          <Navigate to={defaultRoute} replace />
                        )
                      }
                    />

                    <Route
                      path="/materials"
                      element={
                        user.role === 'STAFF' || user.role === 'STUDENT' ? (
                          <MaterialsManagement />
                        ) : (
                          <Navigate to={defaultRoute} replace />
                        )
                      }
                    />
                    <Route path="/learning_materials" element={<Navigate to="/materials" replace />} />

                    <Route
                      path="/homework"
                      element={
                        user.role === 'STAFF' || user.role === 'STUDENT' ? (
                          <HomeworkManagement />
                        ) : (
                          <Navigate to={defaultRoute} replace />
                        )
                      }
                    />

                    <Route
                      path="/exams"
                      element={
                        user.role === 'ACADEMIC_ADMIN' ||
                        user.role === 'SUPER_ADMIN' ||
                        user.role === 'STAFF' ||
                        user.role === 'STUDENT' ? (
                          <ExaminationsManagement />
                        ) : (
                          <Navigate to={defaultRoute} replace />
                        )
                      }
                    />

                    <Route path="/progress_reviews" element={<ProgressReviewsManagement />} />

                    <Route
                      path="/messaging"
                      element={
                        user.role === 'ACADEMIC_ADMIN' || user.role === 'STAFF' || user.role === 'STUDENT' ? (
                          <MessagingInbox />
                        ) : (
                          <Navigate to={defaultRoute} replace />
                        )
                      }
                    />

                    <Route
                      path="/fees"
                      element={
                        user.role === 'ACADEMIC_ADMIN' || user.role === 'SUPER_ADMIN' ? (
                          <FeesManagement />
                        ) : (
                          <Navigate to={defaultRoute} replace />
                        )
                      }
                    />

                    <Route
                      path="/payroll"
                      element={
                        user.role === 'ACADEMIC_ADMIN' || user.role === 'SUPER_ADMIN' ? (
                          <PayrollManagement />
                        ) : (
                          <Navigate to={defaultRoute} replace />
                        )
                      }
                    />

                    <Route
                      path="/branches"
                      element={
                        user.role === 'ACADEMIC_ADMIN' || user.role === 'SUPER_ADMIN' ? (
                          <BranchManagement />
                        ) : (
                          <Navigate to={defaultRoute} replace />
                        )
                      }
                    />

                    <Route
                      path="/student_portal"
                      element={
                        user.role === 'STUDENT' ? <StudentPortal /> : <Navigate to={defaultRoute} replace />
                      }
                    />

                    <Route
                      path="/parent_portal"
                      element={
                        user.role === 'PARENT' ? (
                          <ParentPortal initialTab={parentTab} />
                        ) : (
                          <Navigate to={defaultRoute} replace />
                        )
                      }
                    />
                    <Route
                      path="/parent_dashboard"
                      element={
                        user.role === 'PARENT' ? (
                          <ParentPortal initialTab="dashboard" />
                        ) : (
                          <Navigate to={defaultRoute} replace />
                        )
                      }
                    />
                    <Route
                      path="/:tab"
                      element={
                        user.role === 'PARENT' && currentTab.startsWith('parent_') ? (
                          <ParentPortal initialTab={parentTab} />
                        ) : (
                          <Navigate to={defaultRoute} replace />
                        )
                      }
                    />

                    <Route path="*" element={<Navigate to={defaultRoute} replace />} />
                  </Routes>
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
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
