import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale } from '../../../theme/motion';
import { Home, BookOpen, FileText, Trophy, MoreHorizontal } from 'lucide-react-native';

export type StudentPrimaryTab = 'home' | 'learning' | 'homework' | 'results' | 'more';
export type StudentActiveTab =
  | StudentPrimaryTab
  | 'progress'
  | 'timetable'
  | 'fees'
  | 'profile';

interface StudentBottomNavProps {
  activeTab: StudentActiveTab;
  onSelectTab: (tab: StudentPrimaryTab) => void;
  unreadCount?: number;
}

interface NavItem {
  id: StudentPrimaryTab;
  label: string;
  icon: (color: string) => React.ReactNode;
  matchTabs?: StudentActiveTab[];
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: (color) => <Home size={20} color={color} strokeWidth={2.2} />, matchTabs: ['home'] },
  { id: 'learning', label: 'Learning', icon: (color) => <BookOpen size={20} color={color} strokeWidth={2.2} />, matchTabs: ['learning'] },
  { id: 'homework', label: 'Homework', icon: (color) => <FileText size={20} color={color} strokeWidth={2.2} />, matchTabs: ['homework'] },
  { id: 'results', label: 'Results', icon: (color) => <Trophy size={20} color={color} strokeWidth={2.2} />, matchTabs: ['results'] },
  {
    id: 'more',
    label: 'More',
    icon: (color) => <MoreHorizontal size={20} color={color} strokeWidth={2.2} />,
    matchTabs: ['more', 'progress', 'timetable', 'fees', 'profile'],
  },
];

export const StudentBottomNav: React.FC<StudentBottomNavProps> = ({
  activeTab,
  onSelectTab,
  unreadCount = 0,
}) => {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 6 : 8);

  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }]}>
      <View style={styles.navRow}>
        {NAV_ITEMS.map((item) => {
          const isActive = (item.matchTabs || [item.id]).includes(activeTab);

          return (
            <PressableScale
              key={item.id}
              onPress={() => onSelectTab(item.id)}
              activeScale={0.93}
              activeOpacity={0.88}
              style={styles.navItem}
              accessibilityRole="button"
              accessibilityLabel={`${item.label} tab`}
            >
              <View style={[styles.pill, isActive && styles.activePill]}>
                <View style={styles.iconWrapper}>
                  item.icon(isActive ? '#4E342E' : '#8D6E63')
                  {item.id === 'more' && unreadCount > 0 && (
                    <View style={styles.badgeDot}>
                      <Text style={styles.badgeDotText}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  style={[styles.navLabel, isActive && styles.activeNavLabel]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </View>
            </PressableScale>
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
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  pill: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
    minWidth: 54,
  },
  activePill: {
    backgroundColor: '#F5ECE8',
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 19,
    opacity: 0.7,
  },
  activeIconText: {
    opacity: 1,
    transform: [{ scale: 1.05 }],
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8D6E63',
    marginTop: 2,
    letterSpacing: 0.1,
  },
  activeNavLabel: {
    color: '#4E342E',
    fontWeight: '800',
  },
  badgeDot: {
    position: 'absolute',
    top: -3,
    right: -8,
    backgroundColor: '#B91C1C',
    borderRadius: 8,
    minWidth: 15,
    height: 15,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDotText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
});
