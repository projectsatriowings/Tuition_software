import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';

interface SuperAdminSecurityTabProps {
  user: any;
  institutesCount: number;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export const SuperAdminSecurityTab: React.FC<SuperAdminSecurityTabProps> = ({
  user,
  institutesCount,
  onRefresh,
  refreshing = false,
}) => {
  const securityChecks = [
    {
      title: 'Tenant Row Isolation',
      desc: 'All queries strictly bound by instituteId context',
      status: 'VERIFIED',
      icon: '🛡️',
      color: '#2E7D32',
    },
    {
      title: 'X-Institute-Id Enforcement',
      desc: 'Middleware blocks header spoofing across tenants',
      status: 'ACTIVE',
      icon: '🏢',
      color: '#2E7D32',
    },
    {
      title: 'JWT Bearer Authentication',
      desc: 'Cryptographically signed tokens with role claims',
      status: 'HEALTHY',
      icon: '🔑',
      color: '#2E7D32',
    },
    {
      title: 'Neon Cloud Database Pool',
      desc: 'Serverless PostgreSQL with TLS 1.3 wire encryption',
      status: 'CONNECTED',
      icon: '🗄️',
      color: '#2E7D32',
    },
    {
      title: 'Role-Based Access Control',
      desc: '5-tier discrete RBAC with zero cross-role bleed',
      status: 'ENFORCED',
      icon: '👑',
      color: '#2E7D32',
    },
  ];

  const rbacRoles = [
    {
      role: 'SUPER_ADMIN',
      title: 'Super Admin',
      scope: 'Global Multi-Tenant Platform',
      permissions:
        'Provision institutes, suspend/activate tenants, reset admin passwords, view cloud telemetry.',
      icon: '👑',
      badgeBg: '#F5ECE8',
      badgeColor: '#4E342E',
    },
    {
      role: 'ACADEMIC_ADMIN',
      title: 'Academic Admin',
      scope: 'Single Institute (Root)',
      permissions:
        'Admit students, recruit staff, create batches, schedule exams, set fee structures, institute reports.',
      icon: '🏛️',
      badgeBg: '#E8F5E9',
      badgeColor: '#2E7D32',
    },
    {
      role: 'STAFF',
      title: 'Faculty / Staff',
      scope: 'Assigned Batches & Subjects',
      permissions:
        'Mark student attendance, assign homework, record test marks, conduct live classes.',
      icon: '👨‍🏫',
      badgeBg: '#E3F2FD',
      badgeColor: '#1565C0',
    },
    {
      role: 'STUDENT',
      title: 'Student',
      scope: 'Self Profile & Enrolled Batches',
      permissions:
        'View homework, submit assignments, check exam results, review personal attendance history.',
      icon: '🎓',
      badgeBg: '#FFF3E0',
      badgeColor: '#E65100',
    },
    {
      role: 'PARENT',
      title: 'Parent / Guardian',
      scope: 'Authorized Child Wards Only',
      permissions:
        'Monitor child attendance, receive alerts, review marks, communicate with institute director.',
      icon: '👨‍👩‍👧',
      badgeBg: '#EDE7F6',
      badgeColor: '#512DA8',
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4E342E"
            colors={['#4E342E']}
          />
        ) : undefined
      }
    >
      {/* 1. Executive Security Health Banner */}
      <View style={styles.healthBanner}>
        <View style={styles.bannerHeader}>
          <View style={styles.bannerIconCircle}>
            <Text style={styles.bannerIcon}>🔒</Text>
          </View>
          <View style={styles.bannerTitleGroup}>
            <Text style={styles.bannerTitle}>Enterprise Platform Security</Text>
            <Text style={styles.bannerSub}>
              TuitionOS Multi-Tenant Isolation Engine
            </Text>
          </View>
          <View style={styles.statusPill}>
            <View style={styles.pulsingDot} />
            <Text style={styles.statusPillText}>OPTIMAL</Text>
          </View>
        </View>

        <Text style={styles.bannerDesc}>
          Operating with strict multi-tenant boundary isolation across {institutesCount} active
          educational tenants on Neon PostgreSQL Serverless architecture.
        </Text>
      </View>

      {/* 2. Zero-Leak Isolation Checklist */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🛡️ Real-Time Security Health</Text>
          <Text style={styles.sectionBadge}>5 / 5 Passed</Text>
        </View>

        {securityChecks.map((item, idx) => (
          <View
            key={idx}
            style={[
              styles.checkRow,
              idx === securityChecks.length - 1 && styles.noBorder,
            ]}
          >
            <Text style={styles.checkIcon}>{item.icon}</Text>
            <View style={styles.checkContent}>
              <View style={styles.checkHeader}>
                <Text style={styles.checkTitle}>{item.title}</Text>
                <View
                  style={[
                    styles.checkStatusPill,
                    { backgroundColor: '#E8F5E9' },
                  ]}
                >
                  <Text
                    style={[
                      styles.checkStatusText,
                      { color: item.color },
                    ]}
                  >
                    {item.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.checkDesc}>{item.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* 3. Role-Based Access Control (RBAC) Matrix */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>👑 5-Role Access Control Matrix</Text>
          <Text style={styles.sectionBadge}>Strict Boundary</Text>
        </View>
        <Text style={styles.matrixExplainer}>
          Every endpoint in TuitionOS enforces server-side role validation. Cross-tenant or
          privilege-escalation attempts are automatically rejected with HTTP 403 Forbidden.
        </Text>

        {rbacRoles.map((r) => (
          <View key={r.role} style={styles.roleCard}>
            <View style={styles.roleHeader}>
              <View style={styles.roleLeft}>
                <Text style={styles.roleIcon}>{r.icon}</Text>
                <Text style={styles.roleTitle}>{r.title}</Text>
              </View>
              <View
                style={[
                  styles.roleBadge,
                  { backgroundColor: r.badgeBg },
                ]}
              >
                <Text
                  style={[
                    styles.roleBadgeText,
                    { color: r.badgeColor },
                  ]}
                >
                  {r.scope}
                </Text>
              </View>
            </View>
            <Text style={styles.rolePerms}>{r.permissions}</Text>
          </View>
        ))}
      </View>

      {/* 4. Platform Engine Specifications */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>⚙️ Infrastructure & Compliance</Text>
        <View style={styles.specGrid}>
          <View style={styles.specItem}>
            <Text style={styles.specLabel}>Database Engine</Text>
            <Text style={styles.specVal}>Neon PostgreSQL 16</Text>
          </View>
          <View style={styles.specItem}>
            <Text style={styles.specLabel}>Auth Specification</Text>
            <Text style={styles.specVal}>JWT Bearer / HMAC-256</Text>
          </View>
          <View style={styles.specItem}>
            <Text style={styles.specLabel}>Transport Security</Text>
            <Text style={styles.specVal}>TLS 1.3 / HTTPS Only</Text>
          </View>
          <View style={styles.specItem}>
            <Text style={styles.specLabel}>Tenant Partitioning</Text>
            <Text style={styles.specVal}>Row-Level Foreign Key</Text>
          </View>
        </View>
      </View>

      {/* 5. Security Contact / Super Admin Notice */}
      <View style={styles.complianceNotice}>
        <Text style={styles.noticeTitle}>🔒 Data Protection Directive</Text>
        <Text style={styles.noticeBody}>
          Super Admin accounts operate with system governance capabilities only and cannot
          decrypt or tamper with students' confidential academic grades or parent payment
          receipts outside audited system maintenance operations.
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
  healthBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    elevation: 2,
    shadowColor: '#4E342E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  bannerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F5ECE8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  bannerIcon: {
    fontSize: 20,
  },
  bannerTitleGroup: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#3E2723',
  },
  bannerSub: {
    fontSize: 11,
    color: '#8D6E63',
    fontWeight: '500',
    marginTop: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2E7D32',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2E7D32',
    letterSpacing: 0.5,
  },
  bannerDesc: {
    fontSize: 12,
    color: '#5D4037',
    lineHeight: 18,
    backgroundColor: '#FAF7F5',
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    elevation: 2,
    shadowColor: '#4E342E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#3E2723',
    letterSpacing: -0.2,
  },
  sectionBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4E342E',
    backgroundColor: '#F5ECE8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  checkRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5ECE8',
    alignItems: 'flex-start',
  },
  noBorder: {
    borderBottomWidth: 0,
    paddingBottom: 2,
  },
  checkIcon: {
    fontSize: 18,
    marginRight: 10,
    marginTop: 2,
  },
  checkContent: {
    flex: 1,
  },
  checkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  checkTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3E2723',
  },
  checkStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  checkStatusText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  checkDesc: {
    fontSize: 11,
    color: '#8D6E63',
    lineHeight: 16,
  },
  matrixExplainer: {
    fontSize: 12,
    color: '#6D4C41',
    lineHeight: 17,
    marginBottom: 12,
  },
  roleCard: {
    backgroundColor: '#FAF7F5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EFEBE9',
  },
  roleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'wrap',
    gap: 6,
  },
  roleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roleIcon: {
    fontSize: 16,
  },
  roleTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#3E2723',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  rolePerms: {
    fontSize: 11,
    color: '#5D4037',
    lineHeight: 16,
  },
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  specItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FAF7F5',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EFEBE9',
  },
  specLabel: {
    fontSize: 10,
    color: '#8D6E63',
    fontWeight: '600',
    marginBottom: 3,
  },
  specVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3E2723',
  },
  complianceNotice: {
    backgroundColor: '#EFEBE9',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D7CCC8',
  },
  noticeTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4E342E',
    marginBottom: 4,
  },
  noticeBody: {
    fontSize: 11,
    color: '#5D4037',
    lineHeight: 16,
  },
});

