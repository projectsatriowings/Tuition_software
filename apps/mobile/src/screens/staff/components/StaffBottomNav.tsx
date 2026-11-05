import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, GraduationCap, ClipboardCheck, BookOpen, MoreHorizontal } from 'lucide-react-native';
import { AnimatedBottomNavItem } from '../../../components/navigation/AnimatedBottomNavItem';

export type StaffPrimaryTab = 'home' | 'students' | 'attendance' | 'materials' | 'more';
export type StaffActiveTab = StaffPrimaryTab | 'homework' | 'exams' | 'messages';

interface StaffBottomNavProps {
  activeTab: StaffActiveTab;
  onSelectTab: (tab: StaffPrimaryTab) => void;
  unreadMoreCount?: number;
}

interface NavItem {
  id: StaffPrimaryTab;
  label: string;
  icon: (color: string) => React.ReactNode;
  matchTabs?: StaffActiveTab[];
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: (color) => <Home size={20} color={color} strokeWidth={2.2} />, matchTabs: ['home'] },
  { id: 'students', label: 'Students', icon: (color) => <GraduationCap size={20} color={color} strokeWidth={2.2} />, matchTabs: ['students'] },
  { id: 'attendance', label: 'Attendance', icon: (color) => <ClipboardCheck size={20} color={color} strokeWidth={2.2} />, matchTabs: ['attendance'] },
  { id: 'materials', label: 'Materials', icon: (color) => <BookOpen size={20} color={color} strokeWidth={2.2} />, matchTabs: ['materials'] },
  { id: 'more', label: 'More', icon: (color) => <MoreHorizontal size={20} color={color} strokeWidth={2.2} />, matchTabs: ['more', 'homework', 'exams', 'messages'] },
];

export const StaffBottomNav: React.FC<StaffBottomNavProps> = ({
  activeTab,
  onSelectTab,
  unreadMoreCount = 0,
}) => {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 6 : 8);

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
              badgeCount={item.id === 'more' ? unreadMoreCount : 0}
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
