import React from 'react';
import { Home, GraduationCap, Users, Building2, MoreHorizontal } from 'lucide-react-native';
import { RoleBottomNav, RoleNavItem } from '../../../components/navigation/RoleBottomNav';

export type AdminPrimaryTab = 'home' | 'students' | 'staff' | 'academics' | 'more';
export type AdminActiveTab =
  | AdminPrimaryTab
  | 'attendance'
  | 'homework'
  | 'exams'
  | 'grading'
  | 'fees'
  | 'timetable'
  | 'reviews'
  | 'settings';

interface AdminBottomNavProps {
  activeTab: AdminActiveTab;
  onSelectTab: (tab: AdminPrimaryTab) => void;
  unreadCount?: number;
}

export const AdminBottomNav: React.FC<AdminBottomNavProps> = ({
  activeTab,
  onSelectTab,
  unreadCount = 0,
}) => {
  const items: RoleNavItem<AdminPrimaryTab>[] = [
    {
      id: 'home',
      label: 'Home',
      icon: (color) => <Home size={20} color={color} strokeWidth={2.2} />,
      matchTabs: ['home'],
    },
    {
      id: 'students',
      label: 'Students',
      icon: (color) => <GraduationCap size={20} color={color} strokeWidth={2.2} />,
      matchTabs: ['students'],
    },
    {
      id: 'staff',
      label: 'Faculty',
      icon: (color) => <Users size={20} color={color} strokeWidth={2.2} />,
      matchTabs: ['staff'],
    },
    {
      id: 'academics',
      label: 'Academics',
      icon: (color) => <Building2 size={20} color={color} strokeWidth={2.2} />,
      matchTabs: ['academics'],
    },
    {
      id: 'more',
      label: 'More',
      icon: (color) => <MoreHorizontal size={20} color={color} strokeWidth={2.2} />,
      badgeCount: unreadCount,
      matchTabs: [
        'more',
        'attendance',
        'homework',
        'exams',
        'grading',
        'fees',
        'timetable',
        'reviews',
        'settings',
      ],
    },
  ];

  return (
    <RoleBottomNav<AdminPrimaryTab>
      items={items}
      activeTab={activeTab}
      onSelectTab={onSelectTab}
      activeColor="#4E342E"
      inactiveColor="#8D6E63"
      activePillBg="#F5ECE8"
    />
  );
};
