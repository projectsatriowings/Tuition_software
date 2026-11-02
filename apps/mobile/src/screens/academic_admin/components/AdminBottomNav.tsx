import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

interface NavItem {
  id: AdminPrimaryTab;
  label: string;
  icon: string;
  matchTabs?: AdminActiveTab[];
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: '🏠', matchTabs: ['home'] },
  { id: 'students', label: 'Students', icon: '👨‍🎓', matchTabs: ['students'] },
  { id: 'staff', label: 'Faculty', icon: '👨‍🏫', matchTabs: ['staff'] },
  { id: 'academics', label: 'Academics', icon: '🏫', matchTabs: ['academics'] },
  {
    id: 'more',
    label: 'More',
    icon: '•••',
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

export const AdminBottomNav: React.FC<AdminBottomNavProps> = ({
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
            <TouchableOpacity
              key={item.id}
              onPress={() => onSelectTab(item.id)}
              style={styles.navItem}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${item.label} tab`}
              accessibilityState={{ selected: isActive }}
            >
              <View style={[styles.pill, isActive && styles.activePill]}>
                <View style={styles.iconWrapper}>
                  <Text style={[styles.iconText, isActive && styles.activeIconText]}>
                    {item.icon}
                  </Text>
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
            </TouchableOpacity>
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
    paddingVertical: 5,
    paddingHorizontal: 8,
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
    marginBottom: 2,
    color: '#8D6E63',
  },
  activeIconText: {
    color: '#4E342E',
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8D6E63',
    letterSpacing: 0.2,
  },
  activeNavLabel: {
    color: '#4E342E',
    fontWeight: '800',
  },
  badgeDot: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#DC2626',
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeDotText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
  },
});

