import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { AdminActiveTab } from './AdminBottomNav';
import {
  CreditCard,
  Radio,
  FileText,
  Trophy,
  Calendar,
  Star,
  Bell,
  Settings,
  LogOut,
  ChevronRight,
  Building2,
  Layers,
} from 'lucide-react-native';

interface AdminMoreTabProps {
  user: any;
  institute: any;
  unreadCount: number;
  financialSummary: any;
  outstandingReport: any;
  onNavigateTab: (tab: AdminActiveTab) => void;
  onOpenNotifications: () => void;
  onOpenBranches?: () => void;
  onOpenFeeStructures?: () => void;
  onSignOut: () => void;
}

export const AdminMoreTab: React.FC<AdminMoreTabProps> = ({
  user,
  institute,
  unreadCount,
  financialSummary,
  outstandingReport,
  onNavigateTab,
  onOpenNotifications,
  onOpenBranches,
  onOpenFeeStructures,
  onSignOut,
}) => {
  const adminName = user?.fullName || 'Academic Director';
  const initial = adminName[0] || 'A';
  const adminPhone = user?.phone || 'On file';
  const adminEmail = user?.email || '—';

  const totalOutstanding =
    financialSummary?.totalOutstanding ??
    outstandingReport?.summary?.totalOutstanding ??
    0;

  const formatRupee = (amt: number) => `₹${(amt || 0).toLocaleString('en-IN')}`;

  const handleSignOutPress = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of TuitionOS Director session?',
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Director & Institute Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.profileDetails}>
            <Text style={styles.profileName}>{adminName}</Text>
            <View style={styles.roleRow}>
              <View style={styles.rolePill}>
                <Text style={styles.rolePillText}>ACADEMIC ADMINISTRATOR</Text>
              </View>
            </View>
            <Text style={styles.profileContact}>
              {adminPhone} {adminEmail !== '—' ? `• ${adminEmail}` : ''}
            </Text>
          </View>
        </View>

        {/* Institute Context Footer */}
        <View style={styles.instituteFooter}>
          <Text style={styles.instituteLabel}>
            {institute?.name || 'TuitionOS Academy'}
          </Text>
          <View style={styles.codeBadge}>
            <Text style={styles.codeBadgeText}>
              {institute?.code || 'INST001'}
            </Text>
          </View>
        </View>
      </View>

      {/* 2. Campus & Branch Governance Section */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>CAMPUS & GOVERNANCE</Text>

        {onOpenBranches && (
          <TouchableOpacity
            style={styles.menuItem}
            onPress={onOpenBranches}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBox, { backgroundColor: '#F5ECE8' }]}>
              <Building2 size={20} color="#4E342E" />
            </View>
            <View style={styles.menuTextBox}>
              <Text style={styles.menuItemTitle}>Physical Campuses & Branches</Text>
              <Text style={styles.menuItemSub}>
                Manage physical locations, geofences, shifts & student transfers
              </Text>
            </View>
            <ChevronRight size={18} color="#BCAAA4" />
          </TouchableOpacity>
        )}
      </View>

      {/* 3. Financial Management Section */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>FINANCE & TREASURY</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => onNavigateTab('fees')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBox, { backgroundColor: '#FEF2F2' }]}>
            <CreditCard size={20} color="#DC2626" />
          </View>
          <View style={styles.menuTextBox}>
            <Text style={styles.menuItemTitle}>Fee Collections & Treasury</Text>
            <Text style={styles.menuItemSub}>
              Collect payments, issue receipts & monitor dues
            </Text>
          </View>
          <View style={styles.trailingContainer}>
            {totalOutstanding > 0 ? (
              <View style={styles.feeDueBadge}>
                <Text style={styles.feeDueText}>{formatRupee(totalOutstanding)}</Text>
              </View>
            ) : (
              <View style={styles.feeClearBadge}>
                <Text style={styles.feeClearText}>Clear ✓</Text>
              </View>
            )}
            <ChevronRight size={18} color="#BCAAA4" />
          </View>
        </TouchableOpacity>

        {onOpenFeeStructures && (
          <TouchableOpacity
            style={styles.menuItem}
            onPress={onOpenFeeStructures}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBox, { backgroundColor: '#EFF6FF' }]}>
              <Layers size={20} color="#2563EB" />
            </View>
            <View style={styles.menuTextBox}>
              <Text style={styles.menuItemTitle}>Fee Structures (Class 1-12)</Text>
              <Text style={styles.menuItemSub}>
                Curriculum fee models, components & installment schedules
              </Text>
            </View>
            <ChevronRight size={18} color="#BCAAA4" />
          </TouchableOpacity>
        )}
      </View>

      {/* 4. Academic Operations Section */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>ACADEMIC OPERATIONS</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => onNavigateTab('attendance')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBox, { backgroundColor: '#FFF7ED' }]}>
            <Radio size={20} color="#EA580C" />
          </View>
          <View style={styles.menuTextBox}>
            <Text style={styles.menuItemTitle}>Campus Attendance & Safety</Text>
            <Text style={styles.menuItemSub}>
              Voice roll calls, gate entry scans & daily logs
            </Text>
          </View>
          <ChevronRight size={18} color="#BCAAA4" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => onNavigateTab('homework')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBox, { backgroundColor: '#F0FDF4' }]}>
            <FileText size={20} color="#16A34A" />
          </View>
          <View style={styles.menuTextBox}>
            <Text style={styles.menuItemTitle}>Homework & Study Files</Text>
            <Text style={styles.menuItemSub}>
              Batch curriculum materials, homework & reviews
            </Text>
          </View>
          <ChevronRight size={18} color="#BCAAA4" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => onNavigateTab('exams')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBox, { backgroundColor: '#EFF6FF' }]}>
            <Trophy size={20} color="#2563EB" />
          </View>
          <View style={styles.menuTextBox}>
            <Text style={styles.menuItemTitle}>Exams & Result Publishing</Text>
            <Text style={styles.menuItemSub}>
              Test schedules, score verification & report cards
            </Text>
          </View>
          <ChevronRight size={18} color="#BCAAA4" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => onNavigateTab('timetable')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBox, { backgroundColor: '#F5ECE8' }]}>
            <Calendar size={20} color="#4E342E" />
          </View>
          <View style={styles.menuTextBox}>
            <Text style={styles.menuItemTitle}>Class Timetables & Schedules</Text>
            <Text style={styles.menuItemSub}>
              Weekly subject sessions, timings & faculty assignments
            </Text>
          </View>
          <ChevronRight size={18} color="#BCAAA4" />
        </TouchableOpacity>
      </View>

      {/* 5. Guardian Inquiries & Feedback Section */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>GUARDIAN ENGAGEMENT</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => onNavigateTab('reviews')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBox, { backgroundColor: '#FEF3C7' }]}>
            <Star size={20} color="#D97706" />
          </View>
          <View style={styles.menuTextBox}>
            <Text style={styles.menuItemTitle}>Reviews & Private Inquiries</Text>
            <Text style={styles.menuItemSub}>
              Guardian ratings, inquiries & management replies
            </Text>
          </View>
          <ChevronRight size={18} color="#BCAAA4" />
        </TouchableOpacity>
      </View>

      {/* 6. System, Settings & Logout Section */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>SYSTEM & SETTINGS</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={onOpenNotifications}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBox, { backgroundColor: '#FDF2F8' }]}>
            <Bell size={20} color="#DB2777" />
          </View>
          <View style={styles.menuTextBox}>
            <Text style={styles.menuItemTitle}>Notification Center</Text>
            <Text style={styles.menuItemSub}>
              Operational alerts, fee payments & approvals
            </Text>
          </View>
          <View style={styles.trailingContainer}>
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadCount}</Text>
              </View>
            )}
            <ChevronRight size={18} color="#BCAAA4" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, styles.logoutItem]}
          onPress={handleSignOutPress}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBox, { backgroundColor: '#FEE2E2' }]}>
            <LogOut size={20} color="#DC2626" />
          </View>
          <View style={styles.menuTextBox}>
            <Text style={[styles.menuItemTitle, { color: '#DC2626' }]}>
              Sign Out Session
            </Text>
            <Text style={styles.menuItemSub}>
              Securely close current academic director session
            </Text>
          </View>
          <ChevronRight size={18} color="#DC2626" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F2EF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90,
    gap: 16,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D7CCC8',
    shadowColor: '#2D1E18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingBottom: 14,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#4E342E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#2D1E18',
  },
  roleRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  rolePill: {
    backgroundColor: '#F5ECE8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rolePillText: {
    color: '#4E342E',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  profileContact: {
    fontSize: 12,
    color: '#8D6E63',
    marginTop: 4,
  },
  instituteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EFEBE9',
  },
  instituteLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4E342E',
  },
  codeBadge: {
    backgroundColor: '#F7F2EF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D7CCC8',
  },
  codeBadgeText: {
    color: '#6D4C41',
    fontSize: 11,
    fontWeight: '700',
  },
  menuSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#8D6E63',
    letterSpacing: 0.8,
    marginLeft: 4,
    marginBottom: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#FAF7F2',
    gap: 12,
  },
  logoutItem: {
    backgroundColor: '#FFF5F5',
  },
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextBox: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#2D1E18',
  },
  menuItemSub: {
    fontSize: 11,
    color: '#8D6E63',
    marginTop: 2,
    lineHeight: 15,
  },
  trailingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  feeDueBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  feeDueText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '800',
  },
  feeClearBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  feeClearText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '800',
  },
  notifBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
});
