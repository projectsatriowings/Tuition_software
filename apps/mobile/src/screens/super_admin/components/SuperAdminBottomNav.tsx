import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale } from '../../../theme/motion';
import { LayoutDashboard, Building2, ShieldCheck, MoreHorizontal } from 'lucide-react-native';

export type SuperAdminPrimaryTab = 'home' | 'institutes' | 'security' | 'more';
export type SuperAdminActiveTab =
  | SuperAdminPrimaryTab
  | 'createInstitute'
  | 'instituteDetails'
  | 'adminAccount'
  | 'engineStatus';

interface SuperAdminBottomNavProps {
  activeTab: SuperAdminActiveTab;
  onSelectTab: (tab: SuperAdminPrimaryTab) => void;
  unreadCount?: number;
}

interface NavItem {
  id: SuperAdminPrimaryTab;
  label: string;
  icon: (color: string) => React.ReactNode;
  matchTabs?: SuperAdminActiveTab[];
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Platform', icon: (color) => <LayoutDashboard size={20} color={color} strokeWidth={2.2} />, matchTabs: ['home'] },
  {
    id: 'institutes',
    label: 'Institutes',
    icon: (color) => <Building2 size={20} color={color} strokeWidth={2.2} />,
    matchTabs: ['institutes', 'createInstitute', 'instituteDetails'],
  },
  { id: 'security', label: 'Security', icon: (color) => <ShieldCheck size={20} color={color} strokeWidth={2.2} />, matchTabs: ['security', 'engineStatus'] },
  {
    id: 'more',
    label: 'More',
    icon: (color) => <MoreHorizontal size={20} color={color} strokeWidth={2.2} />,
    matchTabs: ['more', 'adminAccount'],
  },
];

export const SuperAdminBottomNav: React.FC<SuperAdminBottomNavProps> = ({
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
    paddingHorizontal: 12,
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
    paddingHorizontal: 10,
    borderRadius: 16,
    minWidth: 58,
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
