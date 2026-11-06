import React from 'react';
import { LayoutDashboard, Building2, ShieldCheck, MoreHorizontal } from 'lucide-react-native';
import { RoleBottomNav, RoleNavItem } from '../../../components/navigation/RoleBottomNav';

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

export const SuperAdminBottomNav: React.FC<SuperAdminBottomNavProps> = ({
  activeTab,
  onSelectTab,
  unreadCount = 0,
}) => {
  const items: RoleNavItem<SuperAdminPrimaryTab>[] = [
    {
      id: 'home',
      label: 'Platform',
      icon: (color) => <LayoutDashboard size={20} color={color} strokeWidth={2.2} />,
      matchTabs: ['home'],
    },
    {
      id: 'institutes',
      label: 'Institutes',
      icon: (color) => <Building2 size={20} color={color} strokeWidth={2.2} />,
      matchTabs: ['institutes', 'createInstitute', 'instituteDetails'],
    },
    {
      id: 'security',
      label: 'Security',
      icon: (color) => <ShieldCheck size={20} color={color} strokeWidth={2.2} />,
      matchTabs: ['security', 'engineStatus'],
    },
    {
      id: 'more',
      label: 'More',
      icon: (color) => <MoreHorizontal size={20} color={color} strokeWidth={2.2} />,
      badgeCount: unreadCount,
      matchTabs: ['more', 'adminAccount'],
    },
  ];

  return (
    <RoleBottomNav<SuperAdminPrimaryTab>
      items={items}
      activeTab={activeTab}
      onSelectTab={onSelectTab}
      activeColor="#4E342E"
      inactiveColor="#8D6E63"
      activePillBg="#F5ECE8"
    />
  );
};
