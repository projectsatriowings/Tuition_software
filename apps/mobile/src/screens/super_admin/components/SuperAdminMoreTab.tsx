import { themeTokens } from '@tuition/shared';
import { Building2, PlusCircle, Key, ShieldCheck, Server, Bell, ChevronRight, LogOut } from 'lucide-react-native';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SuperAdminActiveTab } from './SuperAdminBottomNav';

interface SuperAdminMoreTabProps {
  user: any;
  institutesCount: number;
  unreadCount?: number;
  onNavigateTab: (tab: SuperAdminActiveTab) => void;
  onOpenCreateModal: () => void;
  onOpenBranches?: () => void;
  onSignOut: () => void;
}

export const SuperAdminMoreTab: React.FC<SuperAdminMoreTabProps> = ({
  user,
  institutesCount,
  unreadCount = 0,
  onNavigateTab,
  onOpenCreateModal,
  onOpenBranches,
  onSignOut,
}) => {
  const adminName = user?.fullName || user?.email?.split('@')[0] || 'Super Admin';
  const initial = adminName[0]?.toUpperCase() || 'S';
  const adminEmail = user?.email || 'superadmin@tuitionos.internal';

  const handleSignOutPress = () => {
    Alert.alert(
      'Sign Out of Super Admin Console',
      'Are you sure you want to exit your multi-tenant platform session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: onSignOut,
        },
      ]
    );
  };

  const menuSections = [
    {
      title: 'TENANT GOVERNANCE',
      items: [
        {
          id: 'institutes',
          title: 'Institute Directory & Tenancy',
          desc: `${institutesCount} multi-tenant educational centers`,
          icon: <Building2 size={20} color="#4E342E" />,
          action: () => onNavigateTab('institutes'),
        },
        {
          id: 'create',
          title: 'Provision New Institute',
          desc: 'Create new tenant and initial director credentials',
          icon: <PlusCircle size={20} color="#2E7D32" />,
          action: onOpenCreateModal,
        },
        {
          id: 'adminAccount',
          title: 'Admin Credential Resets',
          desc: 'Emergency password recovery for Academic Admins',
          icon: <Key size={20} color="#D97706" />,
          action: () => onNavigateTab('adminAccount'),
        },
        ...(onOpenBranches ? [{
          id: 'branches',
          title: 'Physical Campuses & Branches',
          desc: 'Configure physical campuses, shifts & GPS geofencing',
          icon: <Building2 size={20} color="#0D9488" />,
          action: onOpenBranches,
        }] : []),
      ],
    },
    {
      title: 'PLATFORM ARCHITECTURE',
      items: [
        {
          id: 'security',
          title: 'Security & Row Isolation',
          desc: 'Tenant data segregation & RBAC verification',
          icon: <ShieldCheck size={20} color="#1565C0" />,
          action: () => onNavigateTab('security'),
        },
        {
          id: 'engineStatus',
          title: 'Cloud Engine & DB Telemetry',
          desc: 'Neon PostgreSQL 16 & Express REST backend specs',
          icon: <Server size={20} color="#6A1B9A" />,
          action: () => onNavigateTab('engineStatus'),
        },
        {
          id: 'notifications',
          title: 'System Notifications & Alerts',
          desc: 'Platform health alerts and audit warnings',
          icon: <Bell size={20} color="#C2185B" />,
          action: () =>
            Alert.alert(
              'System Notifications',
              'All platform background workers and tenant databases are operating normally with zero security alerts.',
              [{ text: 'OK' }]
            ),
        },
      ],
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Super Admin Profile Header Card */}
      <View style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.profileInfo}>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>PLATFORM SUPER ADMIN</Text>
            </View>
            <Text style={styles.adminName}>{adminName}</Text>
            <Text style={styles.adminEmail}>{adminEmail}</Text>
          </View>
        </View>

        <View style={styles.profileFooter}>
          <View style={styles.footerItem}>
            <Text style={styles.footerLabel}>CLOUD ENGINE</Text>
            <Text style={styles.footerValue}>Neon PostgreSQL</Text>
          </View>
          <View style={styles.footerDivider} />
          <View style={styles.footerItem}>
            <Text style={styles.footerLabel}>GOVERNED TENANTS</Text>
            <Text style={styles.footerValue}>{institutesCount} Active</Text>
          </View>
          <View style={styles.footerDivider} />
          <View style={styles.footerItem}>
            <Text style={styles.footerLabel}>ISOLATION</Text>
            <Text style={[styles.footerValue, { color: '#2E7D32' }]}>Strict</Text>
          </View>
        </View>
      </View>

      {/* 2. Menu Sections */}
      {menuSections.map((section, sIdx) => (
        <View key={sIdx} style={styles.sectionWrap}>
          <Text style={styles.sectionHeading}>{section.title}</Text>
          <View style={styles.menuCard}>
            {section.items.map((item, iIdx) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  iIdx === section.items.length - 1 && styles.noBorder,
                ]}
                onPress={item.action}
                activeOpacity={0.7}
              >
                <View style={styles.menuIconCircle}>
                  {item.icon}
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>{item.title}</Text>
                  <Text style={styles.menuItemDesc}>{item.desc}</Text>
                </View>
                <ChevronRight size={18} color="#BCAAA4" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      {/* 3. Session & Sign Out */}
      <View style={styles.sectionWrap}>
        <Text style={styles.sectionHeading}>SESSION ACTIONS</Text>
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={handleSignOutPress}
          activeOpacity={0.8}
        >
          <LogOut size={16} color="#DC2626" style={{ marginRight: 6 }} />
          <Text style={styles.signOutText}>Sign Out of Super Admin Console</Text>
        </TouchableOpacity>
      </View>

      {/* 4. TuitionOS System Build Info */}
      <View style={styles.versionFooter}>
        <Text style={styles.versionBrand}>TuitionOS Enterprise Multi-Tenant Platform</Text>
        <Text style={styles.versionSub}>
          Release 2.4.0 (Build 2026.11) • Secure TLS 1.3
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F5',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    elevation: 2,
    shadowColor: '#4E342E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#4E342E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F5ECE8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4E342E',
    letterSpacing: 0.5,
  },
  adminName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#3E2723',
  },
  adminEmail: {
    fontSize: 12,
    color: '#8D6E63',
    marginTop: 2,
  },
  profileFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EFEBE9',
  },
  footerItem: {
    alignItems: 'center',
    flex: 1,
  },
  footerLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8D6E63',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  footerValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#3E2723',
  },
  footerDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#EFEBE9',
  },
  sectionWrap: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8D6E63',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#4E342E',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5ECE8',
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FAF7F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#EFEBE9',
  },
  menuIconText: {
    fontSize: 16,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3E2723',
    marginBottom: 2,
  },
  menuItemDesc: {
    fontSize: 11,
    color: '#8D6E63',
  },
  chevron: {
    fontSize: 18,
    color: '#BCAAA4',
    marginLeft: 8,
    fontWeight: '700',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    gap: 8,
  },
  signOutIcon: {
    fontSize: 16,
  },
  signOutText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#C62828',
  },
  versionFooter: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  versionBrand: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8D6E63',
  },
  versionSub: {
    fontSize: 10,
    color: '#A1887F',
    marginTop: 2,
  },
});

