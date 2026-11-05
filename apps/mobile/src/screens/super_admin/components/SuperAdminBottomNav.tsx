import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutDashboard, Building2, ShieldCheck, MoreHorizontal } from 'lucide-react-native';
import { AnimatedBottomNavItem } from '../../../components/navigation/AnimatedBottomNavItem';

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
            <AnimatedBottomNavItem
              key={item.id}
              id={item.id}
              label={item.label}
              isActive={isActive}
              icon={item.icon}
              badgeCount={item.id === 'more' ? unreadCount : 0}
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
