import React from 'react';
import { Home, CalendarCheck, BookOpen, MessageSquare, MoreHorizontal } from 'lucide-react-native';
import { RoleBottomNav, RoleNavItem } from '../../../components/navigation/RoleBottomNav';

export type ParentPrimaryTab = 'home' | 'attendance' | 'learning' | 'messages' | 'more';
export type ParentActiveTab =
  | ParentPrimaryTab
  | 'progress'
  | 'homework'
  | 'results'
  | 'fees'
  | 'timetable'
  | 'reviews'
  | 'profile';

interface ParentBottomNavProps {
  activeTab: ParentActiveTab;
  onSelectTab: (tab: ParentPrimaryTab) => void;
  unreadCount?: number;
  unreadMessagesCount?: number;
}

export const ParentBottomNav: React.FC<ParentBottomNavProps> = ({
  activeTab,
  onSelectTab,
  unreadCount = 0,
  unreadMessagesCount = 0,
}) => {
  const items: RoleNavItem<ParentPrimaryTab>[] = [
    {
      id: 'home',
      label: 'Home',
      icon: (color) => <Home size={20} color={color} strokeWidth={2.2} />,
      matchTabs: ['home'],
    },
    {
      id: 'attendance',
      label: 'Attendance',
      icon: (color) => <CalendarCheck size={20} color={color} strokeWidth={2.2} />,
      matchTabs: ['attendance'],
    },
    {
      id: 'learning',
      label: 'Learning',
      icon: (color) => <BookOpen size={20} color={color} strokeWidth={2.2} />,
      matchTabs: ['learning'],
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: (color) => <MessageSquare size={20} color={color} strokeWidth={2.2} />,
      badgeCount: unreadMessagesCount,
      matchTabs: ['messages'],
    },
    {
      id: 'more',
      label: 'More',
      icon: (color) => <MoreHorizontal size={20} color={color} strokeWidth={2.2} />,
      badgeCount: unreadCount,
      matchTabs: [
        'more',
        'progress',
        'homework',
        'results',
        'fees',
        'timetable',
        'reviews',
        'profile',
      ],
    },
  ];

  return (
    <RoleBottomNav<ParentPrimaryTab>
      items={items}
      activeTab={activeTab}
      onSelectTab={onSelectTab}
      activeColor="#4E342E"
      inactiveColor="#8D6E63"
      activePillBg="#F5ECE8"
    />
  );
};
