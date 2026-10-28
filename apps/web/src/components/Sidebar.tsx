import React from 'react';
import { useAuth } from '../context/AuthContext';
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
  MessageSquare,
  CreditCard,
  Bell,
  User,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const { user } = useAuth();
  const role = user?.role;

  const navItemClass = (tab: string) => `
    flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer w-full text-left
    ${currentTab === tab
      ? 'bg-[#6D4C41] text-white shadow-md shadow-[#3E2723]/40 font-bold'
      : 'text-[#D7CCC8] hover:text-white hover:bg-[#4E342E]/75'
    }
  `;

  return (
    <aside className="w-64 border-r border-[#4E342E] bg-[#3E2723] p-4 flex flex-col justify-between shrink-0 overflow-y-auto select-none">
      <div className="space-y-1">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#BCAAA4] px-3 py-2">
          Navigation Menu
        </div>

        {/* Super Admin Nav Items */}
        {role === 'SUPER_ADMIN' && (
          <button
            onClick={() => onSelectTab('super_admin_dashboard')}
            className={navItemClass('super_admin_dashboard')}
          >
            <LayoutDashboard className="w-4 h-4" /> Platform Overview
          </button>
        )}

        {/* Academic Admin & Staff Nav Items */}
        {(role === 'ACADEMIC_ADMIN' || role === 'STAFF') && (
          <>
            <button
              onClick={() => onSelectTab('academic_dashboard')}
              className={navItemClass('academic_dashboard')}
            >
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </button>

            {role === 'ACADEMIC_ADMIN' && (
              <button
                onClick={() => onSelectTab('staff')}
                className={navItemClass('staff')}
              >
                <Users className="w-4 h-4" /> Staff Management
              </button>
            )}

            <button
              onClick={() => onSelectTab('students')}
              className={navItemClass('students')}
            >
              <GraduationCap className="w-4 h-4" /> Student Admissions
            </button>

            {role === 'ACADEMIC_ADMIN' && (
              <button
                onClick={() => onSelectTab('academics')}
                className={navItemClass('academics')}
              >
                <Layers className="w-4 h-4" /> Batches & Subjects
              </button>
            )}

            <button
              onClick={() => onSelectTab('attendance')}
              className={navItemClass('attendance')}
            >
              <Calendar className="w-4 h-4" /> Attendance
            </button>

            {role === 'STAFF' && (
              <>
                <button
                  onClick={() => onSelectTab('materials')}
                  className={navItemClass('materials')}
                >
                  <BookOpen className="w-4 h-4" /> Learning Materials
                </button>

                <button
                  onClick={() => onSelectTab('homework')}
                  className={navItemClass('homework')}
                >
                  <FileText className="w-4 h-4" /> Homework & Tasks
                </button>
              </>
            )}

            <button
              onClick={() => onSelectTab('exams')}
              className={navItemClass('exams')}
            >
              <Award className="w-4 h-4" /> Exams & Grading
            </button>

            <button
              onClick={() => onSelectTab('progress_reviews')}
              className={navItemClass('progress_reviews')}
            >
              <Sparkles className="w-4 h-4" /> Progress & Reviews
            </button>

            <button
              onClick={() => onSelectTab('messaging')}
              className={navItemClass('messaging')}
            >
              <MessageSquare className="w-4 h-4" /> Parent Messages
            </button>

            {role === 'ACADEMIC_ADMIN' && (
              <button
                onClick={() => onSelectTab('fees')}
                className={navItemClass('fees')}
              >
                <CreditCard className="w-4 h-4" /> Fees & Finances
              </button>
            )}
          </>
        )}

        {/* Parent Portal Nav Items */}
        {role === 'PARENT' && (
          <>
            <button
              onClick={() => onSelectTab('parent_dashboard')}
              className={navItemClass('parent_dashboard')}
            >
              <LayoutDashboard className="w-4 h-4" /> Parent Dashboard
            </button>

            <button
              onClick={() => onSelectTab('parent_attendance')}
              className={navItemClass('parent_attendance')}
            >
              <Calendar className="w-4 h-4" /> Attendance Report
            </button>

            <button
              onClick={() => onSelectTab('parent_communication')}
              className={navItemClass('parent_communication')}
            >
              <MessageSquare className="w-4 h-4" /> Message Teachers
            </button>

            <button
              onClick={() => onSelectTab('parent_fees')}
              className={navItemClass('parent_fees')}
            >
              <CreditCard className="w-4 h-4" /> Fee Payments
            </button>

            <button
              onClick={() => onSelectTab('parent_academics')}
              className={navItemClass('parent_academics')}
            >
              <BookOpen className="w-4 h-4" /> Academic Reports
            </button>

            <button
              onClick={() => onSelectTab('parent_results')}
              className={navItemClass('parent_results')}
            >
              <Award className="w-4 h-4" /> Test Results
            </button>

            <button
              onClick={() => onSelectTab('parent_notifications')}
              className={navItemClass('parent_notifications')}
            >
              <Bell className="w-4 h-4" /> Notifications
            </button>

            <button
              onClick={() => onSelectTab('parent_profile')}
              className={navItemClass('parent_profile')}
            >
              <User className="w-4 h-4" /> Student Profile
            </button>
          </>
        )}

        {/* Student Portal Nav Items */}
        {role === 'STUDENT' && (
          <>
            <button
              onClick={() => onSelectTab('student_portal')}
              className={navItemClass('student_portal')}
            >
              <GraduationCap className="w-4 h-4" /> My Profile & QR Pass
            </button>

            <button
              onClick={() => onSelectTab('materials')}
              className={navItemClass('materials')}
            >
              <BookOpen className="w-4 h-4" /> Learning Materials
            </button>

            <button
              onClick={() => onSelectTab('homework')}
              className={navItemClass('homework')}
            >
              <FileText className="w-4 h-4" /> Homework Assignments
            </button>

            <button
              onClick={() => onSelectTab('progress_reviews')}
              className={navItemClass('progress_reviews')}
            >
              <Sparkles className="w-4 h-4" /> Academic Progress
            </button>

            <button
              onClick={() => onSelectTab('student_portal')}
              className={navItemClass('student_fees')}
            >
              <CreditCard className="w-4 h-4" /> My Fees & Receipts
            </button>
          </>
        )}
      </div>

      <div className="pt-4 border-t border-[#4E342E] text-[11px] text-[#BCAAA4] text-center">
        TuitionOS Enterprise &bull; v1.0
      </div>
    </aside>
  );
};
