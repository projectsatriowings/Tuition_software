import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { StudentActiveTab } from './StudentBottomNav';

interface StudentMoreTabProps {
  user: any;
  institute?: any;
  studentProfile: any;
  progressFeedbacks: any[];
  feeStatement: any;
  unreadCount: number;
  onNavigateTab: (tab: StudentActiveTab) => void;
  onOpenNotifications: () => void;
  onSignOut: () => void;
}

export const StudentMoreTab: React.FC<StudentMoreTabProps> = ({
  user,
  institute,
  studentProfile,
  progressFeedbacks,
  feeStatement,
  unreadCount,
  onNavigateTab,
  onOpenNotifications,
  onSignOut,
}) => {
  const displayName =
    studentProfile?.user?.fullName || user?.fullName || 'Student';
  const admissionNumber =
    studentProfile?.admissionNumber || studentProfile?.rollNumber || '—';
  const batchName = studentProfile?.batch?.name || 'Enrolled Batch';
  const grade = studentProfile?.batch?.grade;
  const instituteName =
    studentProfile?.institute?.name || institute?.name || 'TuitionOS';
  const instituteCode =
    studentProfile?.institute?.code || institute?.code || 'INST';

  const outstandingBalance = feeStatement?.summary?.outstandingBalance || 0;
  const formatRupee = (amt: number) => `₹${(amt || 0).toLocaleString('en-IN')}`;

  const handleSignOutPress = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of TuitionOS?',
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
      {/* 1. Student Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.profileTopRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{displayName[0] || 'S'}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.profileRoll}>
              Admission: {admissionNumber}
            </Text>
            <View style={styles.badgeRow}>
              <View style={styles.batchBadge}>
                <Text style={styles.batchBadgeText}>{batchName}</Text>
              </View>
              {grade && (
                <View style={styles.gradeBadge}>
                  <Text style={styles.gradeBadgeText}>Grade {grade}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.instituteFooter}>
          <Text style={styles.instituteLabel}>🏛️ {instituteName}</Text>
          <View style={styles.codeBadge}>
            <Text style={styles.codeBadgeText}>{instituteCode}</Text>
          </View>
        </View>
      </View>

      {/* 2. Academic Features Section */}
      <Text style={styles.sectionTitle}>ACADEMIC RECORDS</Text>
      <View style={styles.menuCard}>
        {/* Progress Reports */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => onNavigateTab('progress')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBox, { backgroundColor: '#EDE7F6' }]}>
            <Text style={styles.menuIcon}>📊</Text>
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Academic Progress Reports</Text>
            <Text style={styles.menuSubtitle}>
              Term reports, faculty ratings & growth areas
            </Text>
          </View>
          <View style={styles.menuRight}>
            {progressFeedbacks.length > 0 && (
              <View style={styles.counterBadge}>
                <Text style={styles.counterBadgeText}>
                  {progressFeedbacks.length}
                </Text>
              </View>
            )}
            <Text style={styles.chevron}>&rsaquo;</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        {/* Timetable / Schedule */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => onNavigateTab('timetable')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBox, { backgroundColor: '#E3F2FD' }]}>
            <Text style={styles.menuIcon}>📅</Text>
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Class Timetable</Text>
            <Text style={styles.menuSubtitle}>
              Class timings, batch subjects & faculty schedule
            </Text>
          </View>
          <View style={styles.menuRight}>
            <Text style={styles.chevron}>&rsaquo;</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        {/* Fees & Receipts */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => onNavigateTab('fees')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBox, { backgroundColor: '#E8F5E9' }]}>
            <Text style={styles.menuIcon}>💳</Text>
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Fees & Official Receipts</Text>
            <Text style={styles.menuSubtitle}>
              {outstandingBalance > 0
                ? `Due: ${formatRupee(outstandingBalance)}`
                : 'Statement & payment history'}
            </Text>
          </View>
          <View style={styles.menuRight}>
            {outstandingBalance > 0 ? (
              <View style={[styles.counterBadge, { backgroundColor: '#FFEBEE' }]}>
                <Text style={[styles.counterBadgeText, { color: '#C62828' }]}>
                  DUE
                </Text>
              </View>
            ) : null}
            <Text style={styles.chevron}>&rsaquo;</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* 3. Account & System Section */}
      <Text style={styles.sectionTitle}>SYSTEM & ACCOUNT</Text>
      <View style={styles.menuCard}>
        {/* Notifications */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={onOpenNotifications}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBox, { backgroundColor: '#FFF3E0' }]}>
            <Text style={styles.menuIcon}>🔔</Text>
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Notifications</Text>
            <Text style={styles.menuSubtitle}>
              Real-time homework, quiz & result updates
            </Text>
          </View>
          <View style={styles.menuRight}>
            {unreadCount > 0 && (
              <View style={[styles.counterBadge, { backgroundColor: '#B91C1C' }]}>
                <Text style={[styles.counterBadgeText, { color: '#FFFFFF' }]}>
                  {unreadCount}
                </Text>
              </View>
            )}
            <Text style={styles.chevron}>&rsaquo;</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        {/* Student Profile Details */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => onNavigateTab('profile')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBox, { backgroundColor: '#F5ECE8' }]}>
            <Text style={styles.menuIcon}>👤</Text>
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Student Profile</Text>
            <Text style={styles.menuSubtitle}>
              Admission details, enrolled subjects & parent contact
            </Text>
          </View>
          <View style={styles.menuRight}>
            <Text style={styles.chevron}>&rsaquo;</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        {/* Sign Out */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={handleSignOutPress}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBox, { backgroundColor: '#FFEBEE' }]}>
            <Text style={styles.menuIcon}>🚪</Text>
          </View>
          <View style={styles.menuContent}>
            <Text style={[styles.menuTitle, { color: '#C62828' }]}>Sign Out</Text>
            <Text style={styles.menuSubtitle}>
              Safely end your student session
            </Text>
          </View>
          <View style={styles.menuRight}>
            <Text style={[styles.chevron, { color: '#C62828' }]}>&rsaquo;</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.appFooter}>
        <Text style={styles.appFooterText}>
          TuitionOS Mobile &bull; Enterprise Student Portal
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
    paddingBottom: 100,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    marginBottom: 20,
    shadowColor: '#2D1E18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#4E342E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2D1E18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FAF7F5',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '900',
    color: '#2D1E18',
  },
  profileRoll: {
    fontSize: 12,
    color: '#8D6E63',
    marginTop: 2,
    fontWeight: '500',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  batchBadge: {
    backgroundColor: '#EFEBE9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  batchBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4E342E',
  },
  gradeBadge: {
    backgroundColor: '#E8EAF6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gradeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#283593',
  },
  instituteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F5ECE8',
  },
  instituteLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6D4C41',
  },
  codeBadge: {
    backgroundColor: '#F5ECE8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  codeBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#4E342E',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#8D6E63',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#2D1E18',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {
    fontSize: 18,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2D1E18',
  },
  menuSubtitle: {
    fontSize: 11,
    color: '#8D6E63',
    marginTop: 2,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  counterBadge: {
    backgroundColor: '#EFEBE9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  counterBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4E342E',
  },
  chevron: {
    fontSize: 20,
    color: '#BCAAA4',
    fontWeight: '300',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F5ECE8',
    marginLeft: 64,
  },
  appFooter: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  appFooterText: {
    fontSize: 11,
    color: '#BCAAA4',
    fontWeight: '600',
  },
});
