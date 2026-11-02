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
import { StudentActiveTab } from './StudentBottomNav';

interface StudentHomeTabProps {
  user: any;
  studentProfile: any;
  materials: any[];
  homeworkList: any[];
  quizzes: any[];
  exams: any[];
  progressFeedbacks: any[];
  feeStatement: any;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onNavigateTab: (tab: StudentActiveTab) => void;
  onOpenHomeworkSubmission: (hw: any) => void;
  onPreviewMaterial: (mat: any) => void;
  onStartQuiz: (quiz: any) => void;
  onOpenReceipt: (paymentId: string) => void;
}

export const StudentHomeTab: React.FC<StudentHomeTabProps> = ({
  user,
  studentProfile,
  materials,
  homeworkList,
  quizzes,
  exams,
  progressFeedbacks,
  feeStatement,
  loading,
  refreshing,
  onRefresh,
  onNavigateTab,
  onOpenHomeworkSubmission,
  onPreviewMaterial,
  onStartQuiz,
  onOpenReceipt,
}) => {
  // 1. Time-of-day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const displayName =
    studentProfile?.user?.fullName || user?.fullName || 'Student';
  const firstName = displayName.split(' ')[0] || displayName;

  // 2. Today's Date formatted for Asia/Kolkata
  const todayFormatted = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  // 3. Derived KPI Metrics from real data
  const pendingHomeworkCount = homeworkList.filter((hw) => {
    const isCompleted =
      hw.studentStatus === 'COMPLETED' ||
      hw.studentStatus === 'GRADED' ||
      !!hw.mySubmission;
    return !isCompleted;
  }).length;

  const completedHomeworkCount = homeworkList.filter((hw) => {
    return (
      hw.studentStatus === 'COMPLETED' ||
      hw.studentStatus === 'GRADED' ||
      !!hw.mySubmission
    );
  }).length;

  const availableQuizzesCount = quizzes.filter((q) => !q.myAttempt).length;

  const publishedExamsCount = exams.filter((e) => e.isResultsPublished).length;

  // Attendance rate from most recent progress report or attendance events
  const latestFeedback = progressFeedbacks[0];
  const attendanceRate =
    latestFeedback?.attendanceRate !== null &&
    latestFeedback?.attendanceRate !== undefined
      ? `${Number(latestFeedback.attendanceRate)}%`
      : studentProfile?.attendanceEvents?.length > 0
      ? 'Active'
      : 'Enrolled';

  const outstandingBalance = feeStatement?.summary?.outstandingBalance || 0;

  // 4. Pending / Actionable items
  const nextPendingHw = homeworkList.find((hw) => {
    const isDone =
      hw.studentStatus === 'COMPLETED' ||
      hw.studentStatus === 'GRADED' ||
      !!hw.mySubmission;
    return !isDone;
  });

  const nextAvailableQuiz = quizzes.find((q) => !q.myAttempt);

  const latestPublishedExam = exams.find((e) => e.isResultsPublished && e.studentMark);

  const upcomingExam = exams.find(
    (e) => !e.isResultsPublished && e.examDate && new Date(e.examDate) >= new Date()
  );

  const recentMaterials = materials.slice(0, 3);

  const formatRupee = (amt: number) => `₹${(amt || 0).toLocaleString('en-IN')}`;

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color="#4E342E" />
        <Text style={styles.loadingText}>Loading your student dashboard...</Text>
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
      {/* 1. Header & Context */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.greetingText}>
            {getGreeting()}, {firstName} 👋
          </Text>
          <View style={styles.contextPillRow}>
            {studentProfile?.batch?.name && (
              <View style={styles.contextBadge}>
                <Text style={styles.contextBadgeText}>
                  {studentProfile.batch.name}
                </Text>
              </View>
            )}
            {studentProfile?.batch?.grade && (
              <View style={styles.gradeBadge}>
                <Text style={styles.gradeBadgeText}>
                  Grade {studentProfile.batch.grade}
                </Text>
              </View>
            )}
            <Text style={styles.dateText}>{todayFormatted}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => onNavigateTab('profile')}
          style={styles.avatarButton}
          activeOpacity={0.8}
        >
          <Text style={styles.avatarText}>{firstName[0] || 'S'}</Text>
        </TouchableOpacity>
      </View>

      {/* 2. Compact 2x3 Metric Overview Card */}
      <View style={styles.kpiCard}>
        <View style={styles.kpiCardHeader}>
          <Text style={styles.kpiCardTitle}>ACADEMIC SUMMARY</Text>
          <Text style={styles.kpiCardSub}>Live performance data</Text>
        </View>

        <View style={styles.kpiGrid}>
          {/* Attendance */}
          <TouchableOpacity
            style={styles.kpiCell}
            activeOpacity={0.8}
            onPress={() => onNavigateTab('progress')}
          >
            <View style={styles.kpiTopRow}>
              <Text style={styles.kpiEmoji}>📋</Text>
              <Text style={styles.kpiLabel}>Attendance</Text>
            </View>
            <Text style={styles.kpiValue}>{attendanceRate}</Text>
            <Text style={styles.kpiFootnote}>Evaluated Rate</Text>
          </TouchableOpacity>

          {/* Pending HW */}
          <TouchableOpacity
            style={styles.kpiCell}
            activeOpacity={0.8}
            onPress={() => onNavigateTab('homework')}
          >
            <View style={styles.kpiTopRow}>
              <Text style={styles.kpiEmoji}>📝</Text>
              <Text style={styles.kpiLabel}>Pending HW</Text>
            </View>
            <Text
              style={[
                styles.kpiValue,
                pendingHomeworkCount > 0 && { color: '#C62828' },
              ]}
            >
              {pendingHomeworkCount}
            </Text>
            <Text style={styles.kpiFootnote}>
              {completedHomeworkCount} completed
            </Text>
          </TouchableOpacity>

          {/* Quizzes Available */}
          <TouchableOpacity
            style={styles.kpiCell}
            activeOpacity={0.8}
            onPress={() => onNavigateTab('homework')}
          >
            <View style={styles.kpiTopRow}>
              <Text style={styles.kpiEmoji}>🎯</Text>
              <Text style={styles.kpiLabel}>Quizzes</Text>
            </View>
            <Text style={styles.kpiValue}>{availableQuizzesCount}</Text>
            <Text style={styles.kpiFootnote}>Ready to attempt</Text>
          </TouchableOpacity>

          {/* Results Published */}
          <TouchableOpacity
            style={styles.kpiCell}
            activeOpacity={0.8}
            onPress={() => onNavigateTab('results')}
          >
            <View style={styles.kpiTopRow}>
              <Text style={styles.kpiEmoji}>🏆</Text>
              <Text style={styles.kpiLabel}>Exam Results</Text>
            </View>
            <Text style={styles.kpiValue}>{publishedExamsCount}</Text>
            <Text style={styles.kpiFootnote}>{exams.length} scheduled</Text>
          </TouchableOpacity>

          {/* Materials Available */}
          <TouchableOpacity
            style={styles.kpiCell}
            activeOpacity={0.8}
            onPress={() => onNavigateTab('learning')}
          >
            <View style={styles.kpiTopRow}>
              <Text style={styles.kpiEmoji}>📚</Text>
              <Text style={styles.kpiLabel}>Study Files</Text>
            </View>
            <Text style={styles.kpiValue}>{materials.length}</Text>
            <Text style={styles.kpiFootnote}>Notes & audio</Text>
          </TouchableOpacity>

          {/* Fees Status */}
          <TouchableOpacity
            style={styles.kpiCell}
            activeOpacity={0.8}
            onPress={() => onNavigateTab('fees')}
          >
            <View style={styles.kpiTopRow}>
              <Text style={styles.kpiEmoji}>💳</Text>
              <Text style={styles.kpiLabel}>Fee Dues</Text>
            </View>
            <Text
              style={[
                styles.kpiValue,
                outstandingBalance > 0
                  ? { color: '#C62828', fontSize: 16 }
                  : { color: '#2E7D32', fontSize: 16 },
              ]}
              numberOfLines={1}
            >
              {outstandingBalance > 0 ? formatRupee(outstandingBalance) : 'Cleared'}
            </Text>
            <Text style={styles.kpiFootnote}>Statement</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. Prioritized Quick Action Pills */}
      <View style={styles.quickActionSection}>
        <Text style={styles.sectionHeading}>QUICK ACTIONS</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickActionScroll}
        >
          <TouchableOpacity
            style={styles.quickActionPill}
            onPress={() => onNavigateTab('learning')}
            activeOpacity={0.8}
          >
            <Text style={styles.quickActionEmoji}>📚</Text>
            <Text style={styles.quickActionText}>Open Learning</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionPill}
            onPress={() => onNavigateTab('homework')}
            activeOpacity={0.8}
          >
            <Text style={styles.quickActionEmoji}>📝</Text>
            <Text style={styles.quickActionText}>Submit Homework</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionPill}
            onPress={() => {
              if (nextAvailableQuiz) {
                onStartQuiz(nextAvailableQuiz);
              } else {
                onNavigateTab('homework');
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.quickActionEmoji}>🎯</Text>
            <Text style={styles.quickActionText}>Take Quiz</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionPill}
            onPress={() => onNavigateTab('results')}
            activeOpacity={0.8}
          >
            <Text style={styles.quickActionEmoji}>🏆</Text>
            <Text style={styles.quickActionText}>View Results</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionPill}
            onPress={() => onNavigateTab('progress')}
            activeOpacity={0.8}
          >
            <Text style={styles.quickActionEmoji}>📊</Text>
            <Text style={styles.quickActionText}>Progress Report</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionPill}
            onPress={() => onNavigateTab('timetable')}
            activeOpacity={0.8}
          >
            <Text style={styles.quickActionEmoji}>📅</Text>
            <Text style={styles.quickActionText}>Timetable</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* 4. Actionable Pending Homework Alert Card */}
      {nextPendingHw && (
        <View style={styles.actionCard}>
          <View style={styles.actionCardHeader}>
            <View style={styles.actionIconBadgeWarning}>
              <Text style={styles.actionIconText}>📝</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionCardTag}>ACTION REQUIRED</Text>
              <Text style={styles.actionCardTitle} numberOfLines={1}>
                {nextPendingHw.title}
              </Text>
              <Text style={styles.actionCardSub}>
                {nextPendingHw.subject?.name || 'General'} &bull; Due:{' '}
                {nextPendingHw.dueDate
                  ? new Date(nextPendingHw.dueDate).toLocaleDateString('en-IN')
                  : 'Open'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.actionPrimaryButton}
              onPress={() => onOpenHomeworkSubmission(nextPendingHw)}
              activeOpacity={0.85}
            >
              <Text style={styles.actionPrimaryButtonText}>Submit Work</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 5. Available Quiz Prompt */}
      {nextAvailableQuiz && (
        <View style={styles.actionCard}>
          <View style={styles.actionCardHeader}>
            <View style={styles.actionIconBadgeIndigo}>
              <Text style={styles.actionIconText}>🎯</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionCardTag}>NEW ASSESSMENT</Text>
              <Text style={styles.actionCardTitle} numberOfLines={1}>
                {nextAvailableQuiz.title}
              </Text>
              <Text style={styles.actionCardSub}>
                {nextAvailableQuiz.subject?.name || 'Curriculum'} &bull;{' '}
                {nextAvailableQuiz._count?.questions || 0} questions &bull;{' '}
                {nextAvailableQuiz.durationMinutes
                  ? `${nextAvailableQuiz.durationMinutes} mins`
                  : 'Untimed'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.actionPrimaryButton, { backgroundColor: '#4E342E' }]}
              onPress={() => onStartQuiz(nextAvailableQuiz)}
              activeOpacity={0.85}
            >
              <Text style={styles.actionPrimaryButtonText}>Start Quiz</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 6. Recent Exam Result or Scheduled Exam */}
      {latestPublishedExam ? (
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>LATEST RESULT</Text>
            <TouchableOpacity onPress={() => onNavigateTab('results')}>
              <Text style={styles.sectionLink}>View All &rarr;</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.cardItem}>
            <View style={styles.cardItemTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardItemTitle}>
                  {latestPublishedExam.title || latestPublishedExam.name}
                </Text>
                <Text style={styles.cardItemSub}>
                  {latestPublishedExam.subject?.name || 'Subject'} &bull; Max:{' '}
                  {latestPublishedExam.totalMarks || 100}
                </Text>
              </View>
              <View
                style={[
                  styles.scorePill,
                  latestPublishedExam.studentMark?.isPassed
                    ? styles.scorePillPass
                    : styles.scorePillFail,
                ]}
              >
                <Text
                  style={[
                    styles.scorePillText,
                    latestPublishedExam.studentMark?.isPassed
                      ? styles.scorePillTextPass
                      : styles.scorePillTextFail,
                  ]}
                >
                  {latestPublishedExam.studentMark?.marksObtained} /{' '}
                  {latestPublishedExam.totalMarks} (
                  {latestPublishedExam.studentMark?.percentage}%)
                </Text>
              </View>
            </View>
            {latestPublishedExam.studentMark?.remarks ? (
              <Text style={styles.remarksSnippet}>
                "{latestPublishedExam.studentMark.remarks}"
              </Text>
            ) : null}
          </View>
        </View>
      ) : upcomingExam ? (
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>UPCOMING EXAM</Text>
            <TouchableOpacity onPress={() => onNavigateTab('results')}>
              <Text style={styles.sectionLink}>View All &rarr;</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.cardItem}>
            <View style={styles.cardItemTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardItemTitle}>
                  {upcomingExam.title || upcomingExam.name}
                </Text>
                <Text style={styles.cardItemSub}>
                  {upcomingExam.subject?.name || 'Subject'} &bull; Max:{' '}
                  {upcomingExam.totalMarks || 100}
                </Text>
              </View>
              <View style={styles.upcomingBadge}>
                <Text style={styles.upcomingBadgeText}>Scheduled</Text>
              </View>
            </View>
            <Text style={styles.examDateNotice}>
              📅 Date:{' '}
              {new Date(upcomingExam.examDate).toLocaleDateString('en-IN')}{' '}
              {upcomingExam.startTime ? `(${upcomingExam.startTime})` : ''}
            </Text>
          </View>
        </View>
      ) : null}

      {/* 7. Recent Learning Materials */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>RECENT STUDY MATERIALS</Text>
          <TouchableOpacity onPress={() => onNavigateTab('learning')}>
            <Text style={styles.sectionLink}>View All &rarr;</Text>
          </TouchableOpacity>
        </View>

        {recentMaterials.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardEmoji}>📚</Text>
            <Text style={styles.emptyCardTitle}>No materials assigned yet</Text>
            <Text style={styles.emptyCardSub}>
              Faculty study notes and lecture files will appear here.
            </Text>
          </View>
        ) : (
          recentMaterials.map((mat) => (
            <TouchableOpacity
              key={mat.id}
              style={styles.materialCard}
              onPress={() => onPreviewMaterial(mat)}
              activeOpacity={0.8}
            >
              <View style={styles.materialIconCircle}>
                <Text style={styles.materialIconEmoji}>
                  {mat.type === 'PDF' ? '📄' : mat.type === 'AUDIO' ? '🎧' : '📁'}
                </Text>
              </View>
              <View style={styles.materialInfo}>
                <Text style={styles.materialTitle} numberOfLines={1}>
                  {mat.title}
                </Text>
                <Text style={styles.materialMeta}>
                  {mat.subject?.name || 'General'} &bull; {mat.type || 'DOCUMENT'}
                </Text>
              </View>
              <View style={styles.viewBadge}>
                <Text style={styles.viewBadgeText}>View</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
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
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#FAF7F5',
  },
  loadingText: {
    color: '#8D6E63',
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  greetingText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#2D1E18',
    letterSpacing: -0.3,
  },
  contextPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 5,
  },
  contextBadge: {
    backgroundColor: '#EFEBE9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  contextBadgeText: {
    fontSize: 11,
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
    fontSize: 11,
    fontWeight: '800',
    color: '#283593',
  },
  dateText: {
    fontSize: 11,
    color: '#8D6E63',
    fontWeight: '600',
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
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
    fontSize: 18,
    fontWeight: '900',
    color: '#FAF7F5',
  },
  kpiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    shadowColor: '#2D1E18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
    marginBottom: 16,
  },
  kpiCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5ECE8',
  },
  kpiCardTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#8D6E63',
    letterSpacing: 0.6,
  },
  kpiCardSub: {
    fontSize: 11,
    color: '#BCAAA4',
    fontWeight: '600',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  kpiCell: {
    width: '31.5%',
    backgroundColor: '#FAF7F5',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F0EAE6',
  },
  kpiTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  kpiEmoji: {
    fontSize: 13,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6D4C41',
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2D1E18',
    marginTop: 4,
  },
  kpiFootnote: {
    fontSize: 9,
    color: '#8D6E63',
    marginTop: 2,
    fontWeight: '500',
  },
  quickActionSection: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '900',
    color: '#8D6E63',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  quickActionScroll: {
    gap: 8,
  },
  quickActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    shadowColor: '#2D1E18',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  quickActionEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4E342E',
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    marginBottom: 14,
    shadowColor: '#2D1E18',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  actionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionIconBadgeWarning: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconBadgeIndigo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EDE7F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconText: {
    fontSize: 18,
  },
  actionCardTag: {
    fontSize: 9,
    fontWeight: '900',
    color: '#C62828',
    letterSpacing: 0.5,
  },
  actionCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2D1E18',
    marginTop: 1,
  },
  actionCardSub: {
    fontSize: 10,
    color: '#8D6E63',
    marginTop: 2,
  },
  actionPrimaryButton: {
    backgroundColor: '#4E342E',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  actionPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  sectionBlock: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionLink: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6D4C41',
  },
  cardItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    shadowColor: '#2D1E18',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardItemTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2D1E18',
  },
  cardItemSub: {
    fontSize: 11,
    color: '#8D6E63',
    marginTop: 2,
  },
  scorePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scorePillPass: {
    backgroundColor: '#E8F5E9',
  },
  scorePillFail: {
    backgroundColor: '#FFEBEE',
  },
  scorePillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  scorePillTextPass: {
    color: '#2E7D32',
  },
  scorePillTextFail: {
    color: '#C62828',
  },
  remarksSnippet: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#5D4037',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#FAF7F5',
    borderRadius: 8,
  },
  upcomingBadge: {
    backgroundColor: '#EDE7F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  upcomingBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#512DA8',
  },
  examDateNotice: {
    fontSize: 11,
    color: '#6D4C41',
    fontWeight: '600',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5ECE8',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EFEBE9',
  },
  emptyCardEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  emptyCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4E342E',
  },
  emptyCardSub: {
    fontSize: 11,
    color: '#8D6E63',
    marginTop: 2,
    textAlign: 'center',
  },
  materialCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    marginBottom: 8,
    gap: 10,
  },
  materialIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F5ECE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  materialIconEmoji: {
    fontSize: 18,
  },
  materialInfo: {
    flex: 1,
  },
  materialTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2D1E18',
  },
  materialMeta: {
    fontSize: 11,
    color: '#8D6E63',
    marginTop: 1,
  },
  viewBadge: {
    backgroundColor: '#F5ECE8',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  viewBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4E342E',
  },
});

