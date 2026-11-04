import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Card } from '../../../components/Card';
import { Badge } from '../../../components/Badge';
import { themeTokens } from '@tuition/shared';
import { StaffActiveTab } from './StaffBottomNav';
import {
  FileText,
  Trophy,
  MessageSquare,
  Star,
  Bell,
  LogOut,
  ChevronRight,
} from 'lucide-react-native';

interface StaffMoreTabProps {
  user: any;
  institute: any;
  homeworkCount: number;
  examCount: number;
  conversationCount: number;
  unreadMessagesCount: number;
  unreadNotifCount: number;
  onNavigateTab: (tab: StaffActiveTab) => void;
  onOpenReviewsModal: () => void;
  onOpenNotifications: () => void;
  onLogout: () => void;
}

export const StaffMoreTab: React.FC<StaffMoreTabProps> = ({
  user,
  institute,
  homeworkCount,
  examCount,
  conversationCount,
  unreadMessagesCount,
  unreadNotifCount,
  onNavigateTab,
  onOpenReviewsModal,
  onOpenNotifications,
  onLogout,
}) => {
  const staffInitial = user?.fullName?.[0] || 'F';

  const confirmLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of TuitionOS?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: onLogout },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. STAFF PROFILE CARD */}
      <View style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{staffInitial}</Text>
        </View>
        <View style={styles.profileDetails}>
          <Text style={styles.profileName} numberOfLines={1}>{user?.fullName || 'Faculty Member'}</Text>
          <Text style={styles.profileEmail} numberOfLines={1}>{user?.email || user?.username || 'faculty@tuitionos.com'}</Text>
          <View style={styles.profileTagsRow}>
            <View style={styles.rolePill}>
              <Text style={styles.rolePillText}>FACULTY</Text>
            </View>
            {institute?.code ? (
              <View style={styles.instPill}>
                <Text style={styles.instPillText}>{institute.code}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {/* 2. ACADEMIC & TEACHING MODULES */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionHeader}>Academic Modules</Text>

        {/* Homework */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => onNavigateTab('homework')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconWrap, { backgroundColor: '#FFF3E0' }]}>
            <FileText size={20} color="#EA580C" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Homework & Tasks</Text>
            <Text style={styles.menuSubtitle}>Assign work, view student submissions & grade</Text>
          </View>
          <View style={styles.menuRight}>
            <Badge label={`${homeworkCount}`} variant="indigo" size="sm" />
            <ChevronRight size={18} color="#BCAAA4" />
          </View>
        </TouchableOpacity>

        {/* Exams & Grading */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => onNavigateTab('exams')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconWrap, { backgroundColor: '#FCE4EC' }]}>
            <Trophy size={20} color="#DB2777" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Exams & Grading</Text>
            <Text style={styles.menuSubtitle}>Scheduled tests, pass marks & score entry</Text>
          </View>
          <View style={styles.menuRight}>
            <Badge label={`${examCount}`} variant="warning" size="sm" />
            <ChevronRight size={18} color="#BCAAA4" />
          </View>
        </TouchableOpacity>

        {/* Parent-Teacher Messages */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => onNavigateTab('messages')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconWrap, { backgroundColor: '#E0F2FE' }]}>
            <MessageSquare size={20} color="#0284C7" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Parent Messages</Text>
            <Text style={styles.menuSubtitle}>Direct live communication with student families</Text>
          </View>
          <View style={styles.menuRight}>
            {unreadMessagesCount > 0 ? (
              <Badge label={`${unreadMessagesCount} NEW`} variant="warning" size="sm" />
            ) : (
              <Badge label={`${conversationCount}`} variant="neutral" size="sm" />
            )}
            <ChevronRight size={18} color="#BCAAA4" />
          </View>
        </TouchableOpacity>

        {/* Parent Reviews & Feedback */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={onOpenReviewsModal}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconWrap, { backgroundColor: '#FEF3C7' }]}>
            <Star size={20} color="#D97706" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Parent Reviews & Inquiries</Text>
            <Text style={styles.menuSubtitle}>Formal feedback submissions & faculty responses</Text>
          </View>
          <View style={styles.menuRight}>
            <ChevronRight size={18} color="#BCAAA4" />
          </View>
        </TouchableOpacity>
      </View>

      {/* 3. SYSTEM & ACCOUNT */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionHeader}>System & Preferences</Text>

        {/* Notifications */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={onOpenNotifications}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconWrap, { backgroundColor: '#EDE7F6' }]}>
            <Bell size={20} color="#7C3AED" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Notifications</Text>
            <Text style={styles.menuSubtitle}>Punch logs, task alerts & announcements</Text>
          </View>
          <View style={styles.menuRight}>
            {unreadNotifCount > 0 ? (
              <Badge label={`${unreadNotifCount} unread`} variant="warning" size="sm" />
            ) : null}
            <ChevronRight size={18} color="#BCAAA4" />
          </View>
        </TouchableOpacity>

        {/* Institute Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Institute Context</Text>
          <Text style={styles.infoDetail}>
            {institute?.name || 'TuitionOS Enterprise Institute'}
          </Text>
          <Text style={styles.infoCode}>Code: {institute?.code || 'INST-001'}</Text>
        </View>
      </View>

      {/* 4. LOGOUT BUTTON */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={confirmLogout}
        activeOpacity={0.8}
      >
        <LogOut size={16} color="#DC2626" style={{ marginRight: 6 }} />
        <Text style={styles.logoutBtnText}>Sign Out of TuitionOS</Text>
      </TouchableOpacity>

      <Text style={styles.versionFooter}>TuitionOS Mobile • Faculty Edition v1.0.0</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F2EF',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 90,
  },

  // 1. Profile Card
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#2D1E18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#4E342E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2D1E18',
  },
  profileEmail: {
    fontSize: 12,
    color: '#8D6E63',
    marginTop: 1,
  },
  profileTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  rolePill: {
    backgroundColor: '#4E342E',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rolePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  instPill: {
    backgroundColor: '#F7F2EF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D7CCC8',
  },
  instPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6D4C41',
  },

  // 2. Sections
  menuSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6D4C41',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
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
    fontWeight: '700',
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
    gap: 8,
  },
  menuArrow: {
    fontSize: 18,
    color: '#BCAAA4',
    fontWeight: 'bold',
  },

  // Info Card
  infoCard: {
    backgroundColor: '#FDFBF7',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    marginTop: 4,
  },
  infoTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8D6E63',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoDetail: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2D1E18',
    marginTop: 2,
  },
  infoCode: {
    fontSize: 11,
    color: '#6D4C41',
    marginTop: 2,
  },

  // Logout Button
  logoutBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  logoutIcon: {
    fontSize: 16,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B91C1C',
  },
  versionFooter: {
    textAlign: 'center',
    fontSize: 11,
    color: '#A1887F',
    marginTop: 16,
    marginBottom: 8,
  },
});

