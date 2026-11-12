import React from 'react';
import { Home, BookOpen, FileText, Trophy, MoreHorizontal } from 'lucide-react-native';
import { RoleBottomNav, RoleNavItem } from '../../../components/navigation/RoleBottomNav';

export type StudentPrimaryTab = 'home' | 'learning' | 'homework' | 'results' | 'more';
export type StudentActiveTab =
  | StudentPrimaryTab
  | 'attendance'
  | 'progress'
  | 'timetable'
  | 'fees'
  | 'profile';

interface StudentBottomNavProps {
  activeTab: StudentActiveTab;
  onSelectTab: (tab: StudentPrimaryTab) => void;
  unreadCount?: number;
}

export const StudentBottomNav: React.FC<StudentBottomNavProps> = ({
  activeTab,
  onSelectTab,
  unreadCount = 0,
}) => {
  const items: RoleNavItem<StudentPrimaryTab>[] = [
    {
      id: 'home',
      label: 'Home',
      icon: (color) => <Home size={20} color={color} strokeWidth={2.2} />,
      matchTabs: ['home'],
    },
    {
      id: 'learning',
      label: 'Learning',
      icon: (color) => <BookOpen size={20} color={color} strokeWidth={2.2} />,
      matchTabs: ['learning'],
    },
    {
      id: 'homework',
      label: 'Homework',
      icon: (color) => <FileText size={20} color={color} strokeWidth={2.2} />,
      matchTabs: ['homework'],
    },
    {
      id: 'results',
      label: 'Results',
      icon: (color) => <Trophy size={20} color={color} strokeWidth={2.2} />,
      matchTabs: ['results'],
    },
    {
      id: 'more',
      label: 'More',
      icon: (color) => <MoreHorizontal size={20} color={color} strokeWidth={2.2} />,
      badgeCount: unreadCount,
      matchTabs: ['more', 'progress', 'timetable', 'fees', 'profile'],
    },
  ];

  return (
    <RoleBottomNav<StudentPrimaryTab>
      items={items}
      activeTab={activeTab}
      onSelectTab={onSelectTab}
      activeColor="#4E342E"
      inactiveColor="#8D6E63"
      activePillBg="#F5ECE8"
    />
  );
};
