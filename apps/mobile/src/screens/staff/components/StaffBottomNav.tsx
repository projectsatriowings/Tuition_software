import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { themeTokens } from '@tuition/shared';
import { PressableScale } from '../../../theme/motion';

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
  icon: string;
  matchTabs?: StaffActiveTab[];
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: '🏠', matchTabs: ['home'] },
  { id: 'students', label: 'Students', icon: '👨‍🎓', matchTabs: ['students'] },
  { id: 'attendance', label: 'Attendance', icon: '📋', matchTabs: ['attendance'] },
  { id: 'materials', label: 'Materials', icon: '📚', matchTabs: ['materials'] },
  { id: 'more', label: 'More', icon: '•••', matchTabs: ['more', 'homework', 'exams', 'messages'] },
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
                  <Text style={[styles.iconText, isActive && styles.activeIconText]}>
                    {item.icon}
                  </Text>
                  {item.id === 'more' && unreadMoreCount > 0 && (
                    <View style={styles.badgeDot}>
                      <Text style={styles.badgeDotText}>
                        {unreadMoreCount > 9 ? '9+' : unreadMoreCount}
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
    height: 58,
    paddingHorizontal: 4,
  },
  navItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  pill: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    minWidth: 54,
  },
  activePill: {
    backgroundColor: '#F5ECE8',
  },
  iconWrapper: {
    position: 'relative',
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 16,
    opacity: 0.7,
  },
  activeIconText: {
    fontSize: 18,
    opacity: 1,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8D6E63',
    marginTop: 2,
  },
  activeNavLabel: {
    color: '#4E342E',
    fontWeight: '800',
  },
  badgeDot: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#B45309',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeDotText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
});
