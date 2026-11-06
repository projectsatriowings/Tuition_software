import React from 'react';
import { Home, GraduationCap, ClipboardCheck, BookOpen, MoreHorizontal } from 'lucide-react-native';
import { RoleBottomNav, RoleNavItem } from '../../../components/navigation/RoleBottomNav';

export type StaffPrimaryTab = 'home' | 'students' | 'attendance' | 'materials' | 'more';
export type StaffActiveTab = StaffPrimaryTab | 'homework' | 'exams' | 'messages';

interface StaffBottomNavProps {
  activeTab: StaffActiveTab;
  onSelectTab: (tab: StaffPrimaryTab) => void;
  unreadMoreCount?: number;
}

export const StaffBottomNav: React.FC<StaffBottomNavProps> = ({
  activeTab,
  onSelectTab,
  unreadMoreCount = 0,
}) => {
  const items: RoleNavItem<StaffPrimaryTab>[] = [
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
      id: 'attendance',
      label: 'Attendance',
      icon: (color) => <ClipboardCheck size={20} color={color} strokeWidth={2.2} />,
      matchTabs: ['attendance'],
    },
    {
      id: 'materials',
      label: 'Materials',
      icon: (color) => <BookOpen size={20} color={color} strokeWidth={2.2} />,
      matchTabs: ['materials'],
    },
    {
      id: 'more',
      label: 'More',
      icon: (color) => <MoreHorizontal size={20} color={color} strokeWidth={2.2} />,
      badgeCount: unreadMoreCount,
      matchTabs: ['more', 'homework', 'exams', 'messages'],
    },
  ];

  return (
    <RoleBottomNav<StaffPrimaryTab>
      items={items}
      activeTab={activeTab}
      onSelectTab={onSelectTab}
      activeColor="#4E342E"
      inactiveColor="#8D6E63"
      activePillBg="#F5ECE8"
    />
  );
};
