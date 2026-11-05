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
} from 'lucide-react-native';

interface AdminMoreTabProps {
  user: any;
  institute: any;
  unreadCount: number;
  financialSummary: any;
  outstandingReport: any;
  onNavigateTab: (tab: AdminActiveTab) => void;
  onOpenNotifications: () => void;
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

      {/* 2. Financial Management Section */}
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
      </View>

      {/* 3. Academic Operations Section */}
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

      {/* 4. Guardian Inquiries & Feedback Section */}
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

      {/* 5. System, Settings & Logout Section */}
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
          style={styles.menuItem}
          onPress={() => onNavigateTab('settings')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBox, { backgroundColor: '#F3F4F6' }]}>
            <Settings size={20} color="#4B5563" />
          </View>
          <View style={styles.menuTextBox}>
            <Text style={styles.menuItemTitle}>Institute Context & Policies</Text>
            <Text style={styles.menuItemSub}>
              Campus details, isolation & academic year
            </Text>
          </View>
          <ChevronRight size={18} color="#BCAAA4" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, styles.signOutItem]}
          onPress={handleSignOutPress}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBox, { backgroundColor: '#FEE2E2' }]}>
            <LogOut size={20} color="#DC2626" />
          </View>
          <View style={styles.menuTextBox}>
            <Text style={styles.signOutTitle}>Sign Out</Text>
            <Text style={styles.signOutSub}>
              End active director session on TuitionOS
            </Text>
          </View>
          <ChevronRight size={14} color="#DC2626" />
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

  // 1. Profile Card
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    marginBottom: 18,
    shadowColor: '#2D1E18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4E342E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
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
    marginTop: 3,
  },
  rolePill: {
    backgroundColor: '#F5ECE8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D7CCC8',
  },
  rolePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4E342E',
  },
  profileContact: {
    fontSize: 11,
    color: '#8D6E63',
    marginTop: 4,
  },

  // Institute Footer
  instituteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F5ECE8',
  },
  instituteLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4E342E',
  },
  codeBadge: {
    backgroundColor: '#F5ECE8',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#D7CCC8',
  },
  codeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4E342E',
  },

  // Menu Section
  menuSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8D6E63',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 2,
  },
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuIcon: {
    fontSize: 18,
  },
  menuTextBox: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2D1E18',
  },
  menuItemSub: {
    fontSize: 11,
    color: '#8D6E63',
    marginTop: 2,
  },
  menuArrow: {
    fontSize: 20,
    fontWeight: '600',
    color: '#D7CCC8',
    marginLeft: 6,
  },
  trailingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  feeDueBadge: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  feeDueText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
  },
  feeClearBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  feeClearText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  notifBadge: {
    backgroundColor: '#DC2626',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  signOutItem: {
    borderColor: '#FEE2E2',
    marginTop: 4,
  },
  signOutTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#DC2626',
  },
  signOutSub: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 2,
  },
});

