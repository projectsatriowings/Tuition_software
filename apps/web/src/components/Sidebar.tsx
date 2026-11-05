import React, { useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  Layers,
  FileText,
  Award,
  Sparkles,
  FileQuestion,
  MessageSquare,
  CreditCard,
  Bell,
  User,
  Compass,
  Banknote,
  Building2,
  X,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isOpenOnMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpenOnMobile = false,
  onCloseMobile,
}) => {
  const { user } = useAuth();
  const role = user?.role;

  // Lock background scroll on mobile when drawer is open
  useBodyScrollLock(isOpenOnMobile);

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpenOnMobile) {
        onCloseMobile?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpenOnMobile, onCloseMobile]);

  const handleItemClick = (tab: string) => {
    onSelectTab(tab);
    onCloseMobile?.();
  };

  const navItemClass = (tab: string) => `
    flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer w-full text-left
    ${currentTab === tab
      ? 'bg-[#6D4C41] text-white shadow-md shadow-[#3E2723]/40 font-bold'
      : 'text-[#D7CCC8] hover:text-white hover:bg-[#4E342E]/75'
    }
  `;

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpenOnMobile && (
        <div
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-xs transition-opacity duration-200 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar / Mobile Drawer */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-72 max-w-[85vw] lg:w-64
          border-r border-[#4E342E] bg-[#3E2723] h-full p-4
          flex flex-col justify-between shrink-0 overflow-y-auto select-none
          transition-transform duration-200 ease-in-out
          ${isOpenOnMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
        `}
        aria-label="Navigation Sidebar"
      >
        <div className="space-y-1">
          {/* Mobile Header with Close Button */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#4E342E] lg:hidden">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#6D4C41] to-[#8D6E63] flex items-center justify-center font-black text-sm text-white shadow-sm">
                T
              </div>
              <span className="font-extrabold text-sm tracking-tight text-white">TuitionOS</span>
            </div>
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-[#D7CCC8] hover:text-white hover:bg-[#4E342E]/75 transition-colors focus:outline-none"
              aria-label="Close navigation drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="text-[11px] font-bold uppercase tracking-wider text-[#BCAAA4] px-3 py-2">
            Navigation Menu
          </div>

          {/* Super Admin Nav Items */}
          {role === 'SUPER_ADMIN' && (
            <>
              <button
                onClick={() => handleItemClick('super_admin_dashboard')}
                className={navItemClass('super_admin_dashboard')}
              >
                <LayoutDashboard className="w-4 h-4" /> Platform Overview
              </button>
              <button
                onClick={() => handleItemClick('staff_attendance')}
                className={navItemClass('staff_attendance')}
              >
                <Calendar className="w-4 h-4" /> Staff Attendance
              </button>
              <button
                onClick={() => handleItemClick('payroll')}
                className={navItemClass('payroll')}
              >
                <Banknote className="w-4 h-4" /> Staff Payroll
              </button>
              <button
                onClick={() => handleItemClick('branches')}
                className={navItemClass('branches')}
              >
                <Building2 className="w-4 h-4" /> Multi-Branch Hub
              </button>
            </>
          )}

          {/* Academic Admin Nav Items (Admin does NOT mark student attendance) */}
          {role === 'ACADEMIC_ADMIN' && (
            <>
              <button
                onClick={() => handleItemClick('academic_dashboard')}
                className={navItemClass('academic_dashboard')}
              >
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </button>

              <button
                onClick={() => handleItemClick('staff')}
                className={navItemClass('staff')}
              >
                <Users className="w-4 h-4" /> Staff Management
              </button>

              <button
                onClick={() => handleItemClick('staff_attendance')}
                className={navItemClass('staff_attendance')}
              >
                <Calendar className="w-4 h-4" /> Staff Attendance
              </button>

              <button
                onClick={() => handleItemClick('students')}
                className={navItemClass('students')}
              >
                <GraduationCap className="w-4 h-4" /> Student Admissions
              </button>

              <button
                onClick={() => handleItemClick('academics')}
                className={navItemClass('academics')}
              >
                <Layers className="w-4 h-4" /> Batches & Subjects
              </button>

              <button
                onClick={() => handleItemClick('exams')}
                className={navItemClass('exams')}
              >
                <Award className="w-4 h-4" /> Exams & Grading
              </button>

              <button
                onClick={() => handleItemClick('question_generator')}
                className={navItemClass('question_generator')}
              >
                <FileQuestion className="w-4 h-4 text-amber-300" /> AI Question Generator
              </button>

              <button
                onClick={() => handleItemClick('progress_reviews')}
                className={navItemClass('progress_reviews')}
              >
                <Sparkles className="w-4 h-4" /> Progress & Reviews
              </button>

              <button
                onClick={() => handleItemClick('messaging')}
                className={navItemClass('messaging')}
              >
                <MessageSquare className="w-4 h-4" /> Parent Messages
              </button>

              <button
                onClick={() => handleItemClick('fees')}
                className={navItemClass('fees')}
              >
                <CreditCard className="w-4 h-4" /> Fees & Finances
              </button>

              <button
                onClick={() => handleItemClick('payroll')}
                className={navItemClass('payroll')}
              >
                <Banknote className="w-4 h-4" /> Staff Payroll
              </button>

              <button
                onClick={() => handleItemClick('branches')}
                className={navItemClass('branches')}
              >
                <Building2 className="w-4 h-4" /> Multi-Branch Hub
              </button>
            </>
          )}

          {/* Teaching Staff Nav Items (Own GPS Attendance + Student Class Attendance) */}
          {role === 'STAFF' && (
            <>
              <button
                onClick={() => handleItemClick('my_attendance')}
                className={navItemClass('my_attendance')}
              >
                <Compass className="w-4 h-4" /> My Attendance (GPS)
              </button>

              <button
                onClick={() => handleItemClick('attendance')}
                className={navItemClass('attendance')}
              >
                <Calendar className="w-4 h-4" /> Student Attendance
              </button>

              <button
                onClick={() => handleItemClick('academic_dashboard')}
                className={navItemClass('academic_dashboard')}
              >
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </button>

              <button
                onClick={() => handleItemClick('students')}
                className={navItemClass('students')}
              >
                <GraduationCap className="w-4 h-4" /> Student Admissions
              </button>

              <button
                onClick={() => handleItemClick('materials')}
                className={navItemClass('materials')}
              >
                <BookOpen className="w-4 h-4" /> Learning Materials
              </button>

              <button
                onClick={() => handleItemClick('homework')}
                className={navItemClass('homework')}
              >
                <FileText className="w-4 h-4" /> Homework & Tasks
              </button>

              <button
                onClick={() => handleItemClick('exams')}
                className={navItemClass('exams')}
              >
                <Award className="w-4 h-4" /> Exams & Grading
              </button>

              <button
                onClick={() => handleItemClick('progress_reviews')}
                className={navItemClass('progress_reviews')}
              >
                <Sparkles className="w-4 h-4" /> Progress & Reviews
              </button>

              <button
                onClick={() => handleItemClick('messaging')}
                className={navItemClass('messaging')}
              >
                <MessageSquare className="w-4 h-4" /> Parent Messages
              </button>
            </>
          )}

          {/* Parent Portal Nav Items */}
          {role === 'PARENT' && (
            <>
              <button
                onClick={() => handleItemClick('parent_dashboard')}
                className={navItemClass('parent_dashboard')}
              >
                <LayoutDashboard className="w-4 h-4" /> Parent Dashboard
              </button>

              <button
                onClick={() => handleItemClick('parent_attendance')}
                className={navItemClass('parent_attendance')}
              >
                <Calendar className="w-4 h-4" /> Attendance Report
              </button>

              <button
                onClick={() => handleItemClick('parent_communication')}
                className={navItemClass('parent_communication')}
              >
                <MessageSquare className="w-4 h-4" /> Message Teachers
              </button>

              <button
                onClick={() => handleItemClick('parent_fees')}
                className={navItemClass('parent_fees')}
              >
                <CreditCard className="w-4 h-4" /> Fee Payments
              </button>

              <button
                onClick={() => handleItemClick('parent_academics')}
                className={navItemClass('parent_academics')}
              >
                <BookOpen className="w-4 h-4" /> Academic Reports
              </button>

              <button
                onClick={() => handleItemClick('parent_results')}
                className={navItemClass('parent_results')}
              >
                <Award className="w-4 h-4" /> Test Results
              </button>

              <button
                onClick={() => handleItemClick('parent_notifications')}
                className={navItemClass('parent_notifications')}
              >
                <Bell className="w-4 h-4" /> Notifications
              </button>

              <button
                onClick={() => handleItemClick('parent_profile')}
                className={navItemClass('parent_profile')}
              >
                <User className="w-4 h-4" /> Student Profile
              </button>

              <button
                onClick={() => handleItemClick('progress_reviews')}
                className={navItemClass('progress_reviews')}
              >
                <Sparkles className="w-4 h-4" /> Feedback & Reviews
              </button>
            </>
          )}

          {/* Student Portal Nav Items */}
          {role === 'STUDENT' && (
            <>
              <button
                onClick={() => handleItemClick('student_portal')}
                className={navItemClass('student_portal')}
              >
                <GraduationCap className="w-4 h-4" /> My Profile
              </button>

              <button
                onClick={() => handleItemClick('materials')}
                className={navItemClass('materials')}
              >
                <BookOpen className="w-4 h-4" /> Learning Materials
              </button>

              <button
                onClick={() => handleItemClick('homework')}
                className={navItemClass('homework')}
              >
                <FileText className="w-4 h-4" /> Homework Assignments
              </button>

              <button
                onClick={() => handleItemClick('exams')}
                className={navItemClass('exams')}
              >
                <Award className="w-4 h-4" /> Exams & Test Results
              </button>

              <button
                onClick={() => handleItemClick('progress_reviews')}
                className={navItemClass('progress_reviews')}
              >
                <Sparkles className="w-4 h-4" /> Academic Progress
              </button>
            </>
          )}
        </div>

        <div className="pt-4 border-t border-[#4E342E] text-[11px] text-[#BCAAA4] text-center">
          TuitionOS Enterprise &bull; v1.0
        </div>
      </aside>
    </>
  );
};
