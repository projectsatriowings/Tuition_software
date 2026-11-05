import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, CalendarCheck, BookOpen, MessageSquare, MoreHorizontal } from 'lucide-react-native';
import { AnimatedBottomNavItem } from '../../../components/navigation/AnimatedBottomNavItem';

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

interface NavItem {
  id: ParentPrimaryTab;
  label: string;
  icon: (color: string) => React.ReactNode;
  matchTabs?: ParentActiveTab[];
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: (color) => <Home size={20} color={color} strokeWidth={2.2} />, matchTabs: ['home'] },
  { id: 'attendance', label: 'Attendance', icon: (color) => <CalendarCheck size={20} color={color} strokeWidth={2.2} />, matchTabs: ['attendance'] },
  { id: 'learning', label: 'Learning', icon: (color) => <BookOpen size={20} color={color} strokeWidth={2.2} />, matchTabs: ['learning'] },
  { id: 'messages', label: 'Messages', icon: (color) => <MessageSquare size={20} color={color} strokeWidth={2.2} />, matchTabs: ['messages'] },
  {
    id: 'more',
    label: 'More',
    icon: (color) => <MoreHorizontal size={20} color={color} strokeWidth={2.2} />,
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

export const ParentBottomNav: React.FC<ParentBottomNavProps> = ({
  activeTab,
  onSelectTab,
  unreadCount = 0,
  unreadMessagesCount = 0,
}) => {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 6 : 8);

  const getBadgeCount = (id: ParentPrimaryTab) => {
    if (id === 'more') return unreadCount;
    if (id === 'messages') return unreadMessagesCount;
    return 0;
  };

  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }]}>
      <View style={styles.navRow}>
        {NAV_ITEMS.map((item) => {
          const isActive = (item.matchTabs || [item.id]).includes(activeTab);

          return (
            <AnimatedBottomNavItem
              key={item.id}
              id={item.id}
              label={item.label}
              isActive={isActive}
              icon={item.icon}
              badgeCount={getBadgeCount(item.id)}
              onPress={() => onSelectTab(item.id)}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EFEBE9',
    shadowColor: '#2D1E18',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 10,
    zIndex: 99,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingTop: 6,
  },
});
