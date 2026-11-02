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
import { Card } from '../../../components/Card';
import { Badge } from '../../../components/Badge';
import { themeTokens } from '@tuition/shared';
import { StaffActiveTab } from './StaffBottomNav';

interface StaffHomeTabProps {
  user: any;
  institute: any;
  batches: any[];
  selectedBatch: any;
  onSelectBatch: (b: any) => void;
  students: any[];
  totalStudentsCount: number;
  homeworkList: any[];
  examsList: any[];
  materialsList: any[];
  conversations: any[];
  attendanceSummary: any;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onNavigateTab: (tab: StaffActiveTab) => void;
  onOpenNewHomework: () => void;
  onOpenNewMaterial: () => void;
  onOpenReviewHw: (hw: any) => void;
  onOpenGradingExam: (exam: any) => void;
  onOpenConversation: (conv: any) => void;
}

export const StaffHomeTab: React.FC<StaffHomeTabProps> = ({
  user,
  institute,
  batches,
  selectedBatch,
  onSelectBatch,
  students,
  totalStudentsCount,
  homeworkList,
  examsList,
  materialsList,
  conversations,
  attendanceSummary,
  loading,
  refreshing,
  onRefresh,
  onNavigateTab,
  onOpenNewHomework,
  onOpenNewMaterial,
  onOpenReviewHw,
  onOpenGradingExam,
  onOpenConversation,
}) => {
  // Compute greeting based on local time
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const staffName = user?.fullName || 'Faculty Member';

  // Format today's date in Asia/Kolkata
  const todayFormatted = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Calculate unread parent messages
  const unreadMessagesCount = conversations.reduce(
    (acc, c) => acc + (c.unreadCount ? Number(c.unreadCount) : 0),
    0
  );

  // Compute attendance stats from summary or student today status
  const checkedInStudents = students.filter(
    (s) => s.todayStatus === 'CHECKED_IN' || s.alreadyCheckedIn || s.status === 'PRESENT'
  ).length;

  const attendanceRate = attendanceSummary?.rate
    ? Math.round(Number(attendanceSummary.rate))
    : students.length > 0 && checkedInStudents > 0
    ? Math.round((checkedInStudents / students.length) * 100)
    : null;

  if (loading && !refreshing) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color="#4E342E" />
        <Text style={styles.loadingText}>Loading faculty dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#4E342E"
          colors={['#4E342E']}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* 1. COMPACT GREETING & CONTEXT HEADER */}
      <View style={styles.greetingCard}>
        <View style={styles.greetingHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greetingSub}>{greeting},</Text>
            <Text style={styles.greetingName} numberOfLines={1}>{staffName}</Text>
          </View>
          <View style={styles.dateBadge}>
            <Text style={styles.dateBadgeText}>📅 {todayFormatted}</Text>
          </View>
        </View>

        <View style={styles.instituteContextRow}>
          <Text style={styles.instituteLabel}>
            🏫 {institute?.name || institute?.code || 'TuitionOS'}
          </Text>
          <View style={styles.roleTag}>
            <Text style={styles.roleTagText}>FACULTY</Text>
          </View>
        </View>
      </View>

      {/* 2. COMPACT SUMMARY KPI CARD (Clean, cohesive summary - not oversized boxes) */}
      <View style={styles.kpiCard}>
        <View style={styles.kpiHeaderRow}>
          <Text style={styles.kpiSectionTitle}>Overview Summary</Text>
          <Text style={styles.kpiSyncText}>Live Data</Text>
        </View>

        <View style={styles.kpiGrid}>
          {/* Item 1: Students */}
          <TouchableOpacity
            style={styles.kpiItem}
            onPress={() => onNavigateTab('students')}
            activeOpacity={0.7}
          >
            <Text style={styles.kpiIcon}>👨‍🎓</Text>
            <Text style={styles.kpiValue}>{totalStudentsCount || students.length}</Text>
            <Text style={styles.kpiLabel}>Students</Text>
          </TouchableOpacity>

          <View style={styles.kpiDivider} />

          {/* Item 2: Batches */}
          <TouchableOpacity
            style={styles.kpiItem}
            onPress={() => onNavigateTab('students')}
            activeOpacity={0.7}
          >
            <Text style={styles.kpiIcon}>🏷️</Text>
            <Text style={styles.kpiValue}>{batches.length}</Text>
            <Text style={styles.kpiLabel}>Batches</Text>
          </TouchableOpacity>

          <View style={styles.kpiDivider} />

          {/* Item 3: Attendance Today */}
          <TouchableOpacity
            style={styles.kpiItem}
            onPress={() => onNavigateTab('attendance')}
            activeOpacity={0.7}
          >
            <Text style={styles.kpiIcon}>📋</Text>
            <Text style={styles.kpiValue}>
              {attendanceRate !== null ? `${attendanceRate}%` : `${checkedInStudents}`}
            </Text>
            <Text style={styles.kpiLabel}>Today's Att.</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.kpiHorizontalDivider} />

        <View style={styles.kpiGrid}>
          {/* Item 4: Active Homework */}
          <TouchableOpacity
            style={styles.kpiItem}
            onPress={() => onNavigateTab('homework')}
            activeOpacity={0.7}
          >
            <Text style={styles.kpiIcon}>📝</Text>
            <Text style={styles.kpiValue}>{homeworkList.length}</Text>
            <Text style={styles.kpiLabel}>Homework</Text>
          </TouchableOpacity>

          <View style={styles.kpiDivider} />

          {/* Item 5: Scheduled Exams */}
          <TouchableOpacity
            style={styles.kpiItem}
            onPress={() => onNavigateTab('exams')}
            activeOpacity={0.7}
          >
            <Text style={styles.kpiIcon}>🏆</Text>
            <Text style={styles.kpiValue}>{examsList.length}</Text>
            <Text style={styles.kpiLabel}>Exams</Text>
          </TouchableOpacity>

          <View style={styles.kpiDivider} />

          {/* Item 6: Unread Messages */}
          <TouchableOpacity
            style={styles.kpiItem}
            onPress={() => onNavigateTab('messages')}
            activeOpacity={0.7}
          >
            <Text style={styles.kpiIcon}>💬</Text>
            <Text
              style={[
                styles.kpiValue,
                unreadMessagesCount > 0 && { color: '#B45309' },
              ]}
            >
              {unreadMessagesCount}
            </Text>
            <Text style={styles.kpiLabel}>Messages</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. PRIORITIZED QUICK ACTIONS */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionHeading}>Quick Actions</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickActionsScroll}
        >
          <TouchableOpacity
            style={styles.quickActionPill}
            onPress={() => onNavigateTab('attendance')}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionIconWrap, { backgroundColor: '#EDE7F6' }]}>
              <Text style={styles.quickActionIcon}>📋</Text>
            </View>
            <Text style={styles.quickActionText}>Take Attendance</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionPill}
            onPress={() => onNavigateTab('students')}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionIconWrap, { backgroundColor: '#E0F2FE' }]}>
              <Text style={styles.quickActionIcon}>👨‍🎓</Text>
            </View>
            <Text style={styles.quickActionText}>Find Student</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionPill}
            onPress={onOpenNewMaterial}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionIconWrap, { backgroundColor: '#E8F5E9' }]}>
              <Text style={styles.quickActionIcon}>📚</Text>
            </View>
            <Text style={styles.quickActionText}>Share Material</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionPill}
            onPress={onOpenNewHomework}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionIconWrap, { backgroundColor: '#FFF3E0' }]}>
              <Text style={styles.quickActionIcon}>📝</Text>
            </View>
            <Text style={styles.quickActionText}>Assign HW</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionPill}
            onPress={() => onNavigateTab('exams')}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionIconWrap, { backgroundColor: '#FCE4EC' }]}>
              <Text style={styles.quickActionIcon}>🏆</Text>
            </View>
            <Text style={styles.quickActionText}>Grade Exams</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionPill}
            onPress={() => onNavigateTab('messages')}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionIconWrap, { backgroundColor: '#F1F5F9' }]}>
              <Text style={styles.quickActionIcon}>💬</Text>
            </View>
            <Text style={styles.quickActionText}>Parent Chat</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* 4. ACTIVE BATCH SELECTOR (Compact Focus) */}
      {batches.length > 0 && (
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>Current Batch Focus</Text>
            <Text style={styles.sectionMeta}>{students.length} Students</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.batchChipsScroll}
          >
            {batches.map((b) => {
              const isSelected = selectedBatch?.id === b.id;
              return (
                <TouchableOpacity
                  key={b.id}
                  onPress={() => onSelectBatch(b)}
                  style={[styles.batchChip, isSelected && styles.batchChipActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.batchChipText, isSelected && styles.batchChipTextActive]}>
                    {b.name}
                  </Text>
                  {b.code ? (
                    <Text style={[styles.batchChipSub, isSelected && styles.batchChipSubActive]}>
                      {b.code}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* 5. TODAY'S ATTENDANCE STATUS CARD */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Today's Attendance</Text>
          <TouchableOpacity onPress={() => onNavigateTab('attendance')}>
            <Text style={styles.sectionActionLink}>Open Register →</Text>
          </TouchableOpacity>
        </View>

        <Card style={styles.attendanceStatusCard}>
          <View style={styles.attendanceStatusRow}>
            <View style={styles.attendanceStatusIconWrap}>
              <Text style={{ fontSize: 22 }}>
                {checkedInStudents > 0 ? '✅' : '⏰'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.attendanceStatusTitle}>
                {checkedInStudents > 0
                  ? `${checkedInStudents} of ${students.length} Students Present`
                  : 'Attendance Pending for Today'}
              </Text>
              <Text style={styles.attendanceStatusDesc}>
                {checkedInStudents > 0
                  ? `Recorded for ${selectedBatch?.name || 'current batch'}.`
                  : `Please check in students for ${selectedBatch?.name || 'this batch'}.`}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.attendanceActionBtn}
            onPress={() => onNavigateTab('attendance')}
            activeOpacity={0.8}
          >
            <Text style={styles.attendanceActionBtnText}>
              {checkedInStudents > 0 ? 'Update Attendance' : 'Mark Attendance Now'}
            </Text>
          </TouchableOpacity>
        </Card>
      </View>

      {/* 6. RECENT HOMEWORK ASSIGNMENTS */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Recent Homework</Text>
          <TouchableOpacity onPress={() => onNavigateTab('homework')}>
            <Text style={styles.sectionActionLink}>View All ({homeworkList.length}) →</Text>
          </TouchableOpacity>
        </View>

        {homeworkList.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyTitle}>No Active Homework</Text>
            <Text style={styles.emptyDesc}>Assign homework to track student submissions.</Text>
            <TouchableOpacity style={styles.emptyActionBtn} onPress={onOpenNewHomework}>
              <Text style={styles.emptyActionBtnText}>+ Assign Homework</Text>
            </TouchableOpacity>
          </Card>
        ) : (
          homeworkList.slice(0, 2).map((hw) => (
            <Card key={hw.id} style={{ marginBottom: 10 }}>
              <View style={styles.taskCardHeader}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.taskTitle} numberOfLines={1}>{hw.title}</Text>
                  <Text style={styles.taskSub}>
                    Batch: {hw.batch?.name || 'Class'} • Due: {hw.dueDate ? new Date(hw.dueDate).toLocaleDateString('en-IN') : 'Open'}
                  </Text>
                </View>
                <Badge
                  label={`${hw.submissions?.length || 0} Submissions`}
                  variant="indigo"
                  size="sm"
                />
              </View>

              {hw.description ? (
                <Text style={styles.taskSnippet} numberOfLines={2}>{hw.description}</Text>
              ) : null}

              <TouchableOpacity
                style={styles.taskReviewLink}
                onPress={() => onOpenReviewHw(hw)}
                activeOpacity={0.7}
              >
                <Text style={styles.taskReviewLinkText}>Review Submissions & Grade ➔</Text>
              </TouchableOpacity>
            </Card>
          ))
        )}
      </View>

      {/* 7. UPCOMING EXAMS & GRADING */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Exams & Grading</Text>
          <TouchableOpacity onPress={() => onNavigateTab('exams')}>
            <Text style={styles.sectionActionLink}>View All ({examsList.length}) →</Text>
          </TouchableOpacity>
        </View>

        {examsList.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🏆</Text>
            <Text style={styles.emptyTitle}>No Scheduled Exams</Text>
            <Text style={styles.emptyDesc}>Exams for your assigned batches will appear here.</Text>
          </Card>
        ) : (
          examsList.slice(0, 2).map((exam) => (
            <Card key={exam.id} style={{ marginBottom: 10 }}>
              <View style={styles.taskCardHeader}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.taskTitle} numberOfLines={1}>{exam.title}</Text>
                  <Text style={styles.taskSub}>
                    {exam.batch?.name || 'Batch'} • {exam.examDate ? new Date(exam.examDate).toLocaleDateString('en-IN') : 'Date TBD'}
                  </Text>
                </View>
                <Badge
                  label={exam.isResultsPublished ? 'RESULTS OUT' : 'SCHEDULED'}
                  variant={exam.isResultsPublished ? 'success' : 'warning'}
                  size="sm"
                />
              </View>

              <View style={styles.examMetaRow}>
                <Text style={styles.examMetaText}>
                  Max Marks: {exam.totalMarks || 100} • Pass: {exam.passingMarks || 40}
                </Text>
                <TouchableOpacity
                  onPress={() => onOpenGradingExam(exam)}
                  style={styles.examGradeBtn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.examGradeBtnText}>
                    {exam.isResultsPublished ? 'View Roster' : 'Enter Marks'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}
      </View>

      {/* 8. RECENT PARENT MESSAGES */}
      <View style={[styles.sectionContainer, { marginBottom: 20 }]}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Parent Messages</Text>
          <TouchableOpacity onPress={() => onNavigateTab('messages')}>
            <Text style={styles.sectionActionLink}>View All ({conversations.length}) →</Text>
          </TouchableOpacity>
        </View>

        {conversations.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>No Active Conversations</Text>
            <Text style={styles.emptyDesc}>Direct messages from parents will appear here.</Text>
          </Card>
        ) : (
          conversations.slice(0, 2).map((c) => (
            <Card key={c.id} onPress={() => onOpenConversation(c)} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.taskTitle} numberOfLines={1}>
                    {c.parent?.fullName || c.title || 'Parent Message'}
                  </Text>
                  {c.student ? (
                    <Text style={styles.taskSub}>Student: {c.student.fullName}</Text>
                  ) : null}
                  {c.lastMessage ? (
                    <Text style={styles.messageSnippet} numberOfLines={1}>
                      {c.lastMessage.body || (c.lastMessage.attachmentType ? `[${c.lastMessage.attachmentType}]` : 'Sent a message')}
                    </Text>
                  ) : null}
                </View>
                {c.unreadCount > 0 ? (
                  <Badge label={`${c.unreadCount} NEW`} variant="warning" size="sm" />
                ) : (
                  <Badge label="OPEN" variant="neutral" size="sm" />
                )}
              </View>
            </Card>
          ))
        )}
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 90, // Prevents bottom nav from overlapping
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#F7F2EF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#6D4C41',
    fontWeight: '600',
  },

  // 1. Greeting Card
  greetingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    marginBottom: 12,
    shadowColor: '#2D1E18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  greetingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  greetingSub: {
    fontSize: 12,
    color: '#8D6E63',
    fontWeight: '600',
  },
  greetingName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2D1E18',
  },
  dateBadge: {
    backgroundColor: '#FDFBF7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D7CCC8',
  },
  dateBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4E342E',
  },
  instituteContextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F7F2EF',
  },
  instituteLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6D4C41',
  },
  roleTag: {
    backgroundColor: '#4E342E',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // 2. Compact KPI Card
  kpiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    marginBottom: 14,
    shadowColor: '#2D1E18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  kpiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F7F2EF',
  },
  kpiSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4E342E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kpiSyncText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#15803D',
  },
  kpiGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kpiItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  kpiIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2D1E18',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8D6E63',
    marginTop: 2,
  },
  kpiDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#EFEBE9',
  },
  kpiHorizontalDivider: {
    height: 1,
    backgroundColor: '#EFEBE9',
    marginVertical: 8,
  },

  // 3. Quick Actions
  sectionContainer: {
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2D1E18',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionMeta: {
    fontSize: 11,
    color: '#8D6E63',
    fontWeight: '600',
  },
  sectionActionLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6D4C41',
  },
  quickActionsScroll: {
    gap: 8,
    paddingRight: 8,
  },
  quickActionPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 84,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  quickActionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionIcon: {
    fontSize: 16,
  },
  quickActionText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4E342E',
    textAlign: 'center',
  },

  // 4. Batch Selector
  batchChipsScroll: {
    gap: 8,
  },
  batchChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#D7CCC8',
  },
  batchChipActive: {
    backgroundColor: '#4E342E',
    borderColor: '#4E342E',
  },
  batchChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4E342E',
  },
  batchChipTextActive: {
    color: '#FFFFFF',
  },
  batchChipSub: {
    fontSize: 10,
    color: '#8D6E63',
    marginTop: 1,
  },
  batchChipSubActive: {
    color: '#D7CCC8',
  },

  // 5. Attendance Status Card
  attendanceStatusCard: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
  },
  attendanceStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  attendanceStatusIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F7F2EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendanceStatusTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2D1E18',
  },
  attendanceStatusDesc: {
    fontSize: 11,
    color: '#6D4C41',
    marginTop: 2,
  },
  attendanceActionBtn: {
    backgroundColor: '#4E342E',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendanceActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Task Cards
  taskCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  taskTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2D1E18',
  },
  taskSub: {
    fontSize: 11,
    color: '#8D6E63',
    marginTop: 2,
  },
  taskSnippet: {
    fontSize: 11,
    color: '#6D4C41',
    marginTop: 4,
    lineHeight: 16,
  },
  taskReviewLink: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F7F2EF',
  },
  taskReviewLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4E342E',
  },

  // Exam Meta
  examMetaRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F7F2EF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  examMetaText: {
    fontSize: 11,
    color: '#6D4C41',
  },
  examGradeBtn: {
    backgroundColor: '#4E342E',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  examGradeBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },

  // Message Snippet
  messageSnippet: {
    fontSize: 11,
    color: '#6D4C41',
    fontStyle: 'italic',
    marginTop: 2,
  },

  // Empty Card
  emptyCard: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2D1E18',
  },
  emptyDesc: {
    fontSize: 11,
    color: '#8D6E63',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 10,
  },
  emptyActionBtn: {
    backgroundColor: '#4E342E',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});

