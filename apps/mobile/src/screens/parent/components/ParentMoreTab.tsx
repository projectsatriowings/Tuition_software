import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { ParentActiveTab } from './ParentBottomNav';

interface ParentMoreTabProps {
  user: any;
  institute: any;
  selectedChild: any;
  children: any[];
  onSelectChild: (child: any) => void;
  childStatement: any;
  unreadCount: number;
  unreadMessagesCount: number;
  onNavigateTab: (tab: ParentActiveTab) => void;
  onOpenNotifications: () => void;
  onOpenReviewModal: () => void;
  onSignOut: () => void;
}

export const ParentMoreTab: React.FC<ParentMoreTabProps> = ({
  user,
  institute,
  selectedChild,
  children,
  onSelectChild,
  childStatement,
  unreadCount,
  unreadMessagesCount,
  onNavigateTab,
  onOpenNotifications,
  onOpenReviewModal,
  onSignOut,
}) => {
  const parentName = user?.fullName || 'Parent';
  const parentInitial = parentName[0] || 'P';
  const parentPhone = user?.phone || 'On file';
  const parentEmail = user?.email || '—';

  const childName =
    selectedChild?.user?.fullName ||
    `${selectedChild?.firstName || ''} ${selectedChild?.lastName || ''}`.trim() ||
    'Student';
  const childRoll = selectedChild?.rollNumber || selectedChild?.admissionNumber || '—';
  const childBatch = selectedChild?.batch?.name || selectedChild?.batchName || 'Enrolled Batch';
  const childRelationship = selectedChild?.relationship || 'Guardian';

  const outstandingBalance = childStatement?.summary?.outstandingBalance || 0;
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
      {/* 1. Parent Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{parentInitial}</Text>
          </View>
          <View style={styles.profileDetails}>
            <Text style={styles.profileName}>{parentName}</Text>
            <Text style={styles.profileSub}>
              Parent &bull; {children.length} Linked Child{children.length === 1 ? '' : 'ren'}
            </Text>
            <Text style={styles.profileContact}>
              📞 {parentPhone} {parentEmail !== '—' ? `• ${parentEmail}` : ''}
            </Text>
          </View>
        </View>

        {/* Selected Child Pill Row */}
        {selectedChild && (
          <View style={styles.activeChildRow}>
            <View style={styles.activeChildAvatar}>
              <Text style={styles.activeChildAvatarText}>
                {childName[0] || 'C'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.activeChildLabel}>ACTIVE STUDENT</Text>
              <Text style={styles.activeChildName}>{childName}</Text>
              <Text style={styles.activeChildSub}>
                {childBatch} &bull; Roll: {childRoll} &bull; {childRelationship}
              </Text>
            </View>
          </View>
        )}

        {/* Institute Footer */}
        <View style={styles.instituteFooter}>
          <Text style={styles.instituteLabel}>
            🏛️ {institute?.name || 'TuitionOS Academy'}
          </Text>
          <View style={styles.codeBadge}>
            <Text style={styles.codeBadgeText}>
              {institute?.code || 'INST'}
            </Text>
          </View>
        </View>
      </View>

      {/* 2. Academic Records Section */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>ACADEMIC RECORDS</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => onNavigateTab('progress')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBox, { backgroundColor: '#F5ECE8' }]}>
            <Text style={styles.menuIcon}>📊</Text>
          </View>
          <View style={styles.menuTextBox}>
            <Text style={styles.menuItemTitle}>Academic Progress Reports</Text>
            <Text style={styles.menuItemSub}>
              Faculty term evaluations, ratings & remarks
            </Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => onNavigateTab('homework')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBox, { backgroundColor: '#FFF7ED' }]}>
            <Text style={styles.menuIcon}>📝</Text>
          </View>
          <View style={styles.menuTextBox}>
            <Text style={styles.menuItemTitle}>Homework & Submissions</Text>
            <Text style={styles.menuItemSub}>
              Assignments, submissions & teacher feedback
            </Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => onNavigateTab('results')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBox, { backgroundColor: '#F0FDF4' }]}>
            <Text style={styles.menuIcon}>🏆</Text>
          </View>
          <View style={styles.menuTextBox}>
            <Text style={styles.menuItemTitle}>Exams & Published Results</Text>
            <Text style={styles.menuItemSub}>
              Report card, marks obtained & schedules
            </Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => onNavigateTab('timetable')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBox, { backgroundColor: '#EFF6FF' }]}>
            <Text style={styles.menuIcon}>📅</Text>
          </View>
          <View style={styles.menuTextBox}>
            <Text style={styles.menuItemTitle}>Class Timetable & Schedule</Text>
            <Text style={styles.menuItemSub}>
              Weekly subject schedule and teacher rooms
            </Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* 3. Financial Management Section */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>FINANCES & PAYMENTS</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => onNavigateTab('fees')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBox, { backgroundColor: '#FEF2F2' }]}>
            <Text style={styles.menuIcon}>💳</Text>
          </View>
          <View style={styles.menuTextBox}>
            <Text style={styles.menuItemTitle}>Fees & Official Receipts</Text>
            <Text style={styles.menuItemSub}>
              Statements, payment records & download receipts
            </Text>
          </View>
          <View style={styles.trailingContainer}>
            {outstandingBalance > 0 ? (
              <View style={styles.feeDueBadge}>
                <Text style={styles.feeDueText}>{formatRupee(outstandingBalance)}</Text>
              </View>
            ) : (
              <View style={styles.feeClearBadge}>
                <Text style={styles.feeClearText}>Cleared ✓</Text>
              </View>
            )}
            <Text style={styles.menuArrow}>›</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* 4. Communication & Feedback Section */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>COMMUNICATION & INQUIRIES</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => onNavigateTab('messages')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBox, { backgroundColor: '#F5ECE8' }]}>
            <Text style={styles.menuIcon}>💬</Text>
          </View>
          <View style={styles.menuTextBox}>
            <Text style={styles.menuItemTitle}>Faculty & Staff Chat</Text>
            <Text style={styles.menuItemSub}>
              Direct messaging with assigned batch teachers
            </Text>
          </View>
          <View style={styles.trailingContainer}>
            {unreadMessagesCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadMessagesCount}</Text>
              </View>
            )}
            <Text style={styles.menuArrow}>›</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => onNavigateTab('reviews')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBox, { backgroundColor: '#FEF3C7' }]}>
            <Text style={styles.menuIcon}>⭐</Text>
          </View>
          <View style={styles.menuTextBox}>
            <Text style={styles.menuItemTitle}>Reviews & Private Inquiries</Text>
            <Text style={styles.menuItemSub}>
              Private management inquiries, feedback & replies
            </Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* 5. Account & Preferences Section */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>ACCOUNT & SYSTEM</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={onOpenNotifications}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBox, { backgroundColor: '#FDF2F8' }]}>
            <Text style={styles.menuIcon}>🔔</Text>
          </View>
          <View style={styles.menuTextBox}>
            <Text style={styles.menuItemTitle}>Notification Center</Text>
            <Text style={styles.menuItemSub}>
              Gate scans, homework alerts & announcements
            </Text>
          </View>
          <View style={styles.trailingContainer}>
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadCount}</Text>
              </View>
            )}
            <Text style={styles.menuArrow}>›</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => onNavigateTab('profile')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBox, { backgroundColor: '#F3F4F6' }]}>
            <Text style={styles.menuIcon}>👤</Text>
          </View>
          <View style={styles.menuTextBox}>
            <Text style={styles.menuItemTitle}>Family & Account Details</Text>
            <Text style={styles.menuItemSub}>
              Linked children, emergency contact & SMS settings
            </Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, styles.signOutItem]}
          onPress={handleSignOutPress}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBox, { backgroundColor: '#FEE2E2' }]}>
            <Text style={styles.menuIcon}>🚪</Text>
          </View>
          <View style={styles.menuTextBox}>
            <Text style={styles.signOutTitle}>Sign Out</Text>
            <Text style={styles.signOutSub}>
              Sign out of this parent session on TuitionOS
            </Text>
          </View>
          <Text style={[styles.menuArrow, { color: '#DC2626' }]}>›</Text>
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
  profileSub: {
    fontSize: 12,
    color: '#8D6E63',
    marginTop: 2,
    fontWeight: '600',
  },
  profileContact: {
    fontSize: 11,
    color: '#8D6E63',
    marginTop: 2,
  },

  // Active Child in Profile
  activeChildRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF7F5',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    marginBottom: 12,
  },
  activeChildAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F5ECE8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#D7CCC8',
  },
  activeChildAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4E342E',
  },
  activeChildLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#8D6E63',
    letterSpacing: 0.5,
  },
  activeChildName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2D1E18',
  },
  activeChildSub: {
    fontSize: 10,
    color: '#8D6E63',
    marginTop: 1,
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

