import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { AdminActiveTab } from './AdminBottomNav';
import { PressableScale } from '../../../theme/motion';

interface AdminHomeTabProps {
  user: any;
  institute: any;
  dashboardSummary: any;
  financialSummary: any;
  batches: any[];
  students: any[];
  staffList: any[];
  outstandingReport: any;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onNavigateTab: (tab: AdminActiveTab) => void;
  onOpenAdmitModal: () => void;
  onOpenStaffModal: () => void;
  onOpenNewBatchModal: () => void;
}

export const AdminHomeTab: React.FC<AdminHomeTabProps> = ({
  user,
  institute,
  dashboardSummary,
  financialSummary,
  batches,
  students,
  staffList,
  outstandingReport,
  loading,
  refreshing,
  onRefresh,
  onNavigateTab,
  onOpenAdmitModal,
  onOpenStaffModal,
  onOpenNewBatchModal,
}) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const adminName = user?.fullName || 'Director';
  const firstName = adminName.split(' ')[0] || adminName;

  const todayFormatted = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  const formatRupee = (amt: number) => `₹${(amt || 0).toLocaleString('en-IN')}`;

  const totalStudents = dashboardSummary?.studentsCount ?? students.length ?? 0;
  const activeStudents = students.filter((s) => s.status === 'ACTIVE' || !s.status).length;
  const totalStaff = dashboardSummary?.staffCount ?? staffList.length ?? 0;
  const totalBatches = dashboardSummary?.batchesCount ?? batches.length ?? 0;
  const activeBatches = batches.filter((b) => b.isActive !== false).length;

  const totalCollected =
    financialSummary?.totalCollected ??
    financialSummary?.totalCollections ??
    0;
  const totalOutstanding =
    financialSummary?.totalOutstanding ??
    outstandingReport?.summary?.totalOutstanding ??
    0;

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color="#4E342E" />
        <Text style={styles.loadingText}>Loading academy operations...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#4E342E"
          colors={['#4E342E']}
        />
      }
    >
      {/* 1. Executive Greeting & Institute Context */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.greetingText}>
            {getGreeting()}, {firstName} 👋
          </Text>
          <View style={styles.contextPillRow}>
            <View style={styles.instituteBadge}>
              <Text style={styles.instituteBadgeText}>
                🏛️ {institute?.name || 'TuitionOS Academy'}
              </Text>
            </View>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>ACADEMIC DIRECTOR</Text>
            </View>
            <Text style={styles.dateText}>{todayFormatted}</Text>
          </View>
        </View>
      </View>

      {/* 2. Compact 2x3 KPI Matrix Grid */}
      <View style={styles.kpiGridCard}>
        <View style={styles.kpiCardHeader}>
          <Text style={styles.kpiCardTitle}>INSTITUTE EXECUTIVE METRICS</Text>
          <Text style={styles.kpiInstituteTarget}>
            {institute?.code || 'INST001'} &bull; AY 2026-27
          </Text>
        </View>

        <View style={styles.kpiGrid}>
          {/* Row 1 */}
          <View style={styles.kpiRow}>
            <TouchableOpacity
              style={styles.kpiTile}
              onPress={() => onNavigateTab('students')}
              activeOpacity={0.7}
            >
              <Text style={styles.kpiTileLabel}>TOTAL STUDENTS</Text>
              <Text style={styles.kpiTileValue}>{totalStudents}</Text>
              <Text style={styles.kpiTileSub}>{activeStudents} active enrolled</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.kpiTile}
              onPress={() => onNavigateTab('staff')}
              activeOpacity={0.7}
            >
              <Text style={styles.kpiTileLabel}>FACULTY & STAFF</Text>
              <Text style={styles.kpiTileValue}>{totalStaff}</Text>
              <Text style={styles.kpiTileSub}>Registered teachers</Text>
            </TouchableOpacity>
          </View>

          {/* Row 2 */}
          <View style={styles.kpiRow}>
            <TouchableOpacity
              style={styles.kpiTile}
              onPress={() => onNavigateTab('academics')}
              activeOpacity={0.7}
            >
              <Text style={styles.kpiTileLabel}>ACTIVE BATCHES</Text>
              <Text style={styles.kpiTileValue}>{totalBatches}</Text>
              <Text style={styles.kpiTileSub}>{activeBatches} running sections</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.kpiTile}
              onPress={() => onNavigateTab('fees')}
              activeOpacity={0.7}
            >
              <Text style={styles.kpiTileLabel}>REVENUE COLLECTED</Text>
              <Text style={[styles.kpiTileValue, { color: '#059669' }]}>
                {formatRupee(totalCollected)}
              </Text>
              <Text style={styles.kpiTileSub}>Verified receipts</Text>
            </TouchableOpacity>
          </View>

          {/* Row 3 */}
          <View style={styles.kpiRow}>
            <TouchableOpacity
              style={styles.kpiTile}
              onPress={() => onNavigateTab('fees')}
              activeOpacity={0.7}
            >
              <Text style={styles.kpiTileLabel}>OUTSTANDING DUES</Text>
              <Text
                style={[
                  styles.kpiTileValue,
                  { color: totalOutstanding > 0 ? '#DC2626' : '#2D1E18' },
                ]}
              >
                {formatRupee(totalOutstanding)}
              </Text>
              <Text style={styles.kpiTileSub}>
                {totalOutstanding > 0 ? 'Pending recovery' : 'All cleared ✓'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.kpiTile}
              onPress={() => onNavigateTab('attendance')}
              activeOpacity={0.7}
            >
              <Text style={styles.kpiTileLabel}>CAMPUS ATTENDANCE</Text>
              <View style={styles.kpiTileValueRow}>
                <View style={styles.dotGreen} />
                <Text style={styles.kpiTileValue}>Active</Text>
              </View>
              <Text style={styles.kpiTileSub}>Voice & gate logs</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 3. Quick Action Shortcuts (Compact 2x2 Grid) */}
      <View style={styles.quickActionsSection}>
        <View style={styles.quickActionsHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>QUICK ACTIONS</Text>
          <PressableScale
            onPress={() => onNavigateTab('more')}
            activeScale={0.95}
            accessibilityRole="button"
            accessibilityLabel="More administrative actions"
          >
            <Text style={styles.moreActionsLink}>All Actions →</Text>
          </PressableScale>
        </View>

        <View style={styles.quickActionGrid}>
          <View style={styles.quickActionRow}>
            <PressableScale
              style={styles.quickActionCard}
              onPress={onOpenAdmitModal}
              activeScale={0.96}
              accessibilityRole="button"
              accessibilityLabel="Add Student"
            >
              <View style={[styles.quickActionIconBox, { backgroundColor: '#F0FDF4' }]}>
                <Text style={styles.quickActionIcon}>👨‍🎓</Text>
              </View>
              <View style={styles.quickActionTextBox}>
                <Text style={styles.quickActionTitle}>Add Student</Text>
                <Text style={styles.quickActionSub}>Admit & enroll</Text>
              </View>
            </PressableScale>

            <PressableScale
              style={styles.quickActionCard}
              onPress={onOpenStaffModal}
              activeScale={0.96}
              accessibilityRole="button"
              accessibilityLabel="Manage Staff"
            >
              <View style={[styles.quickActionIconBox, { backgroundColor: '#EFF6FF' }]}>
                <Text style={styles.quickActionIcon}>👨‍🏫</Text>
              </View>
              <View style={styles.quickActionTextBox}>
                <Text style={styles.quickActionTitle}>Manage Staff</Text>
                <Text style={styles.quickActionSub}>+ Add faculty</Text>
              </View>
            </PressableScale>
          </View>

          <View style={styles.quickActionRow}>
            <PressableScale
              style={styles.quickActionCard}
              onPress={onOpenNewBatchModal}
              activeScale={0.96}
              accessibilityRole="button"
              accessibilityLabel="Manage Batches"
            >
              <View style={[styles.quickActionIconBox, { backgroundColor: '#FEF3C7' }]}>
                <Text style={styles.quickActionIcon}>🏫</Text>
              </View>
              <View style={styles.quickActionTextBox}>
                <Text style={styles.quickActionTitle}>Manage Batches</Text>
                <Text style={styles.quickActionSub}>+ Configure class</Text>
              </View>
            </PressableScale>

            <PressableScale
              style={styles.quickActionCard}
              onPress={() => onNavigateTab('fees')}
              activeScale={0.96}
              accessibilityRole="button"
              accessibilityLabel="Fee Collections"
            >
              <View style={[styles.quickActionIconBox, { backgroundColor: '#FDF2F8' }]}>
                <Text style={styles.quickActionIcon}>💳</Text>
              </View>
              <View style={styles.quickActionTextBox}>
                <Text style={styles.quickActionTitle}>Fee Collections</Text>
                <Text style={styles.quickActionSub}>Collect & receipt</Text>
              </View>
            </PressableScale>
          </View>
        </View>
      </View>

      {/* 4. Action Card: Financial Health & Fee Collection */}
      <View style={styles.actionCard}>
        <View style={styles.actionCardHeader}>
          <View style={[styles.actionCardIconBox, { backgroundColor: '#FEF2F2' }]}>
            <Text style={styles.actionCardIcon}>💳</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionCardTitle}>Institute Treasury & Fee Dues</Text>
            <Text style={styles.actionCardSub}>
              Collections, outstanding receivables & electronic receipts
            </Text>
          </View>
          <View
            style={[
              styles.badgePill,
              totalOutstanding > 0 ? styles.badgeDanger : styles.badgeGreen,
            ]}
          >
            <Text
              style={[
                styles.badgePillText,
                totalOutstanding > 0 ? styles.badgeDangerText : styles.badgeGreenText,
              ]}
            >
              {totalOutstanding > 0 ? 'DUES PENDING' : 'HEALTHY'}
            </Text>
          </View>
        </View>

        <View style={styles.metricTripletRow}>
          <View style={styles.metricTripletCol}>
            <Text style={styles.metricTripletLabel}>COLLECTED</Text>
            <Text style={[styles.metricTripletVal, { color: '#059669' }]}>
              {formatRupee(totalCollected)}
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricTripletCol}>
            <Text style={styles.metricTripletLabel}>OUTSTANDING</Text>
            <Text
              style={[
                styles.metricTripletVal,
                { color: totalOutstanding > 0 ? '#DC2626' : '#2D1E18' },
              ]}
            >
              {formatRupee(totalOutstanding)}
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricTripletCol}>
            <Text style={styles.metricTripletLabel}>STUDENTS DUE</Text>
            <Text style={styles.metricTripletVal}>
              {outstandingReport?.students?.length || 0}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.cardActionBtn}
          onPress={() => onNavigateTab('fees')}
        >
          <Text style={styles.cardActionBtnText}>
            Open Treasury & Record Fee Payment →
          </Text>
        </TouchableOpacity>
      </View>

      {/* 5. Action Card: Batches & Curriculum */}
      <View style={styles.actionCard}>
        <View style={styles.actionCardHeader}>
          <View style={[styles.actionCardIconBox, { backgroundColor: '#EFF6FF' }]}>
            <Text style={styles.actionCardIcon}>🏫</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionCardTitle}>Academic Batches & Sections</Text>
            <Text style={styles.actionCardSub}>
              {activeBatches} active class sections currently in session
            </Text>
          </View>
          <TouchableOpacity
            style={styles.smallPillBtn}
            onPress={onOpenNewBatchModal}
          >
            <Text style={styles.smallPillBtnText}>+ New Batch</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.batchesListPreview}>
          {batches.slice(0, 3).map((b) => (
            <View key={b.id} style={styles.batchItemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.batchItemName}>{b.name}</Text>
                <Text style={styles.batchItemSub}>
                  AY {b.academicYear} &bull; {b._count?.enrollments || 0} students enrolled
                </Text>
              </View>
              <View
                style={[
                  styles.badgePill,
                  b.isActive !== false ? styles.badgeGreen : styles.badgeGray,
                ]}
              >
                <Text
                  style={[
                    styles.badgePillText,
                    b.isActive !== false ? styles.badgeGreenText : styles.badgeGrayText,
                  ]}
                >
                  {b.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.cardActionBtn}
          onPress={() => onNavigateTab('academics')}
        >
          <Text style={styles.cardActionBtnText}>Manage All Batches & Subjects →</Text>
        </TouchableOpacity>
      </View>

      {/* 6. Action Card: Student Enrollment Directory */}
      <View style={styles.actionCard}>
        <View style={styles.actionCardHeader}>
          <View style={[styles.actionCardIconBox, { backgroundColor: '#F0FDF4' }]}>
            <Text style={styles.actionCardIcon}>👨‍🎓</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionCardTitle}>Student Enrollment</Text>
            <Text style={styles.actionCardSub}>
              {totalStudents} registered students across all batches
            </Text>
          </View>
          <TouchableOpacity
            style={styles.smallPillBtn}
            onPress={onOpenAdmitModal}
          >
            <Text style={styles.smallPillBtnText}>+ Admit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.metricTripletRow}>
          <View style={styles.metricTripletCol}>
            <Text style={styles.metricTripletLabel}>ACTIVE</Text>
            <Text style={[styles.metricTripletVal, { color: '#059669' }]}>
              {activeStudents}
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricTripletCol}>
            <Text style={styles.metricTripletLabel}>PASSED OUT</Text>
            <Text style={styles.metricTripletVal}>
              {students.filter((s) => s.status === 'PASSED_OUT').length}
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricTripletCol}>
            <Text style={styles.metricTripletLabel}>DISCONTINUED</Text>
            <Text style={[styles.metricTripletVal, { color: '#6B7280' }]}>
              {students.filter((s) => s.status === 'DISCONTINUED').length}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.cardActionBtn}
          onPress={() => onNavigateTab('students')}
        >
          <Text style={styles.cardActionBtnText}>Open Student Directory →</Text>
        </TouchableOpacity>
      </View>

      {/* 7. Action Card: Campus Attendance & Safety Log */}
      <View style={styles.actionCard}>
        <View style={styles.actionCardHeader}>
          <View style={[styles.actionCardIconBox, { backgroundColor: '#FFF7ED' }]}>
            <Text style={styles.actionCardIcon}>📡</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionCardTitle}>Campus Attendance & Safety</Text>
            <Text style={styles.actionCardSub}>
              Voice attendance confirmation & automated parent gate alerts
            </Text>
          </View>
          <View style={[styles.badgePill, styles.badgeGreen]}>
            <Text style={[styles.badgePillText, styles.badgeGreenText]}>
              OPERATIONAL
            </Text>
          </View>
        </View>

        <View style={styles.attendanceNoteBox}>
          <Text style={styles.attendanceNoteText}>
            Voice-based roll call verification and automated gate entry/exit SMS and in-app notifications are running actively for all batches.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.cardActionBtn}
          onPress={() => onNavigateTab('attendance')}
        >
          <Text style={styles.cardActionBtnText}>View Attendance Logs & Reports →</Text>
        </TouchableOpacity>
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
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#8D6E63',
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
  },

  // 1. Header & Context
  headerRow: {
    marginBottom: 14,
  },
  headerLeft: {
    flex: 1,
  },
  greetingText: {
    fontSize: 21,
    fontWeight: '800',
    color: '#2D1E18',
    letterSpacing: -0.3,
  },
  contextPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  instituteBadge: {
    backgroundColor: '#EFEBE9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#D7CCC8',
  },
  instituteBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4E342E',
  },
  roleBadge: {
    backgroundColor: '#4E342E',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 12,
    color: '#8D6E63',
    fontWeight: '500',
  },

  // 2. KPI Grid Card
  kpiGridCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    marginBottom: 16,
    shadowColor: '#2D1E18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  kpiCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F5ECE8',
    paddingBottom: 8,
    marginBottom: 10,
  },
  kpiCardTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8D6E63',
    letterSpacing: 0.8,
  },
  kpiInstituteTarget: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4E342E',
  },
  kpiGrid: {
    gap: 10,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
  },
  kpiTile: {
    flex: 1,
    backgroundColor: '#FAF7F5',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EFEBE9',
  },
  kpiTileLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8D6E63',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  kpiTileValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dotGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  kpiTileValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#2D1E18',
  },
  kpiTileSub: {
    fontSize: 10,
    color: '#8D6E63',
    marginTop: 2,
  },

  // 3. Quick Actions
  quickActionsSection: {
    marginBottom: 16,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8D6E63',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  quickActionsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  moreActionsLink: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6D4C41',
  },
  quickActionGrid: {
    gap: 8,
  },
  quickActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickActionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 2,
  },
  quickActionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionIcon: {
    fontSize: 15,
  },
  quickActionTextBox: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2D1E18',
  },
  quickActionSub: {
    fontSize: 10,
    color: '#8D6E63',
    marginTop: 1,
  },

  // 4. Actionable Cards
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    marginBottom: 14,
    shadowColor: '#2D1E18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  actionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  actionCardIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F5ECE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCardIcon: {
    fontSize: 18,
  },
  actionCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2D1E18',
  },
  actionCardSub: {
    fontSize: 11,
    color: '#8D6E63',
    marginTop: 1,
  },
  smallPillBtn: {
    backgroundColor: '#4E342E',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  smallPillBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  badgePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4B5563',
  },
  badgeGreen: {
    backgroundColor: '#ECFDF5',
  },
  badgeGreenText: {
    color: '#059669',
  },
  badgeDanger: {
    backgroundColor: '#FEF2F2',
  },
  badgeDangerText: {
    color: '#DC2626',
  },
  badgeGray: {
    backgroundColor: '#F3F4F6',
  },
  badgeGrayText: {
    color: '#6B7280',
  },

  // Metric Triplet Row
  metricTripletRow: {
    flexDirection: 'row',
    backgroundColor: '#FAF7F5',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    marginBottom: 12,
  },
  metricTripletCol: {
    flex: 1,
    alignItems: 'center',
  },
  metricTripletLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8D6E63',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metricTripletVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2D1E18',
  },
  metricDivider: {
    width: 1,
    backgroundColor: '#EFEBE9',
  },

  // Batches Preview
  batchesListPreview: {
    gap: 8,
    marginBottom: 12,
  },
  batchItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAF7F5',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EFEBE9',
  },
  batchItemName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2D1E18',
  },
  batchItemSub: {
    fontSize: 11,
    color: '#8D6E63',
    marginTop: 1,
  },

  // Common Card Action Button
  cardActionBtn: {
    backgroundColor: '#F5ECE8',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D7CCC8',
  },
  cardActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4E342E',
  },

  // Attendance Note Box
  attendanceNoteBox: {
    backgroundColor: '#FAF7F5',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    marginBottom: 12,
  },
  attendanceNoteText: {
    fontSize: 11,
    color: '#6D4C41',
    lineHeight: 16,
  },
});

