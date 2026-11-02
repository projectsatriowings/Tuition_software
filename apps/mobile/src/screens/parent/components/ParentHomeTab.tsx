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
import { ParentActiveTab } from './ParentBottomNav';

interface ParentHomeTabProps {
  user: any;
  institute: any;
  children: any[];
  selectedChild: any;
  onSelectChild: (child: any) => void;
  dashboardSummary: any;
  childAttendance: any;
  childStatement: any;
  homeworkList: any[];
  materials: any[];
  childExams: any[];
  childReportCard: any;
  childProgressReports: any[];
  conversations: any[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onNavigateTab: (tab: ParentActiveTab) => void;
  onOpenReceipt: (paymentId: string) => void;
  onOpenReviewModal: () => void;
}

export const ParentHomeTab: React.FC<ParentHomeTabProps> = ({
  user,
  institute,
  children,
  selectedChild,
  onSelectChild,
  dashboardSummary,
  childAttendance,
  childStatement,
  homeworkList,
  materials,
  childExams,
  childReportCard,
  childProgressReports,
  conversations,
  loading,
  refreshing,
  onRefresh,
  onNavigateTab,
  onOpenReceipt,
  onOpenReviewModal,
}) => {
  // 1. Time-of-day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const parentName = user?.fullName || 'Parent';
  const firstName = parentName.split(' ')[0] || parentName;

  // 2. Today's Date formatted for Asia/Kolkata
  const todayFormatted = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  const formatKolkataTime = (isoString?: string | null) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '—';
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(d);
    } catch {
      return '—';
    }
  };

  const formatRupee = (amt: number) => `₹${(amt || 0).toLocaleString('en-IN')}`;

  // 3. Child-specific data resolution
  const childSummaryFromApi = dashboardSummary?.children?.find(
    (c: any) => c.studentId === selectedChild?.id
  );

  // Today's attendance status
  const todayAttendanceStatus =
    childSummaryFromApi?.todayAttendance?.status ||
    (childAttendance?.today ? childAttendance.today.status : 'NOT_MARKED');
  const checkInTime =
    childSummaryFromApi?.todayAttendance?.checkInTime ||
    childAttendance?.today?.checkInTime;
  const checkOutTime =
    childSummaryFromApi?.todayAttendance?.checkOutTime ||
    childAttendance?.today?.checkOutTime;

  // Monthly Attendance percentage
  const attendancePercentage =
    childAttendance?.attendancePercentage ??
    childSummaryFromApi?.monthlyAttendance?.percentage ??
    100;

  // Homework metrics
  const pendingHomework = homeworkList.filter((hw) => {
    const isCompleted =
      hw.submissionStatus === 'COMPLETED' ||
      hw.submissionStatus === 'GRADED' ||
      hw.submissionStatus === 'SUBMITTED' ||
      hw.mySubmission;
    return !isCompleted;
  });

  // Latest Exam
  const latestExam =
    childExams.find((e: any) => e.isResultsPublished) ||
    childExams[0];
  const latestExamMark = childReportCard?.marks?.find(
    (m: any) => m.examId === latestExam?.id
  );

  // Fees
  const outstandingFees =
    childStatement?.summary?.outstandingBalance ??
    childSummaryFromApi?.fees?.pendingAmount ??
    0;

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color="#4E342E" />
        <Text style={styles.loadingText}>Loading family records...</Text>
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
      {/* 1. Header Greeting & Institute Info */}
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
            <Text style={styles.dateText}>{todayFormatted}</Text>
          </View>
        </View>
      </View>

      {/* 2. Child Selector (Multi-Child Switcher) */}
      {children.length > 0 && (
        <View style={styles.childSelectorSection}>
          <View style={styles.selectorHeaderRow}>
            <Text style={styles.selectorSectionTitle}>STUDENT PROFILE</Text>
            {children.length > 1 && (
              <Text style={styles.switchHintText}>Tap to switch child</Text>
            )}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.childPillsContainer}
          >
            {children.map((child) => {
              const isSelected = selectedChild?.id === child.id;
              const childFullName = child.user?.fullName || `${child.firstName || ''} ${child.lastName || ''}`.trim() || 'Child';
              const initial = childFullName[0] || 'C';
              const batchName = child.batch?.name || child.batchName || 'Batch';

              return (
                <TouchableOpacity
                  key={child.id}
                  onPress={() => onSelectChild(child)}
                  style={[
                    styles.childPill,
                    isSelected && styles.childPillActive,
                  ]}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.childPillAvatar,
                      isSelected && styles.childPillAvatarActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.childPillAvatarText,
                        isSelected && styles.childPillAvatarTextActive,
                      ]}
                    >
                      {initial}
                    </Text>
                  </View>
                  <View style={styles.childPillInfo}>
                    <Text
                      style={[
                        styles.childPillName,
                        isSelected && styles.childPillNameActive,
                      ]}
                      numberOfLines={1}
                    >
                      {childFullName}
                    </Text>
                    <Text
                      style={[
                        styles.childPillSub,
                        isSelected && styles.childPillSubActive,
                      ]}
                      numberOfLines={1}
                    >
                      {batchName} &bull; {child.rollNumber || child.admissionNumber || '—'}
                    </Text>
                  </View>
                  {isSelected && (
                    <View style={styles.selectedCheckBadge}>
                      <Text style={styles.selectedCheckText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {selectedChild ? (
        <>
          {/* 3. Compact 2x3 KPI Overview Grid */}
          <View style={styles.kpiGridCard}>
            <View style={styles.kpiCardHeader}>
              <Text style={styles.kpiCardTitle}>ACADEMIC & ATTENDANCE SUMMARY</Text>
              <Text style={styles.kpiChildTarget}>
                {selectedChild.user?.fullName || 'Selected Student'}
              </Text>
            </View>

            <View style={styles.kpiGrid}>
              {/* Row 1 */}
              <View style={styles.kpiRow}>
                {/* Metric 1: Today Attendance */}
                <TouchableOpacity
                  style={styles.kpiTile}
                  onPress={() => onNavigateTab('attendance')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.kpiTileLabel}>TODAY ATTENDANCE</Text>
                  <View style={styles.kpiTileValueRow}>
                    <View
                      style={[
                        styles.statusDot,
                        todayAttendanceStatus === 'CHECKED_IN'
                          ? styles.dotGreen
                          : todayAttendanceStatus === 'CHECKED_OUT'
                          ? styles.dotBlue
                          : todayAttendanceStatus === 'LATE'
                          ? styles.dotOrange
                          : styles.dotGray,
                      ]}
                    />
                    <Text style={styles.kpiTileValue}>
                      {todayAttendanceStatus === 'CHECKED_IN'
                        ? 'Present'
                        : todayAttendanceStatus === 'CHECKED_OUT'
                        ? 'Departed'
                        : todayAttendanceStatus === 'LATE'
                        ? 'Late'
                        : 'Not Marked'}
                    </Text>
                  </View>
                  <Text style={styles.kpiTileSub}>
                    {checkInTime ? `In: ${formatKolkataTime(checkInTime)}` : 'Campus gate'}
                  </Text>
                </TouchableOpacity>

                {/* Metric 2: Monthly Attendance Rate */}
                <TouchableOpacity
                  style={styles.kpiTile}
                  onPress={() => onNavigateTab('attendance')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.kpiTileLabel}>MONTH ATTENDANCE</Text>
                  <Text style={[styles.kpiTileValue, { color: '#2E7D32' }]}>
                    {attendancePercentage}%
                  </Text>
                  <Text style={styles.kpiTileSub}>Monthly rate</Text>
                </TouchableOpacity>
              </View>

              {/* Row 2 */}
              <View style={styles.kpiRow}>
                {/* Metric 3: Pending Homework */}
                <TouchableOpacity
                  style={styles.kpiTile}
                  onPress={() => onNavigateTab('homework')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.kpiTileLabel}>PENDING HOMEWORK</Text>
                  <Text
                    style={[
                      styles.kpiTileValue,
                      { color: pendingHomework.length > 0 ? '#C2410C' : '#2D1E18' },
                    ]}
                  >
                    {pendingHomework.length}
                  </Text>
                  <Text style={styles.kpiTileSub}>
                    {pendingHomework.length === 0 ? 'All submitted' : 'Tasks to complete'}
                  </Text>
                </TouchableOpacity>

                {/* Metric 4: Academic Progress / Score */}
                <TouchableOpacity
                  style={styles.kpiTile}
                  onPress={() => onNavigateTab('results')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.kpiTileLabel}>EXAM RESULTS</Text>
                  <Text style={styles.kpiTileValue}>
                    {childReportCard?.summary?.cumulativePercentage
                      ? `${childReportCard.summary.cumulativePercentage}%`
                      : childExams.length > 0
                      ? `${childExams.length} Tests`
                      : 'Active'}
                  </Text>
                  <Text style={styles.kpiTileSub}>Cumulative record</Text>
                </TouchableOpacity>
              </View>

              {/* Row 3 */}
              <View style={styles.kpiRow}>
                {/* Metric 5: Fees Outstanding */}
                <TouchableOpacity
                  style={styles.kpiTile}
                  onPress={() => onNavigateTab('fees')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.kpiTileLabel}>FEES OUTSTANDING</Text>
                  <Text
                    style={[
                      styles.kpiTileValue,
                      { color: outstandingFees > 0 ? '#DC2626' : '#059669' },
                    ]}
                  >
                    {formatRupee(outstandingFees)}
                  </Text>
                  <Text style={styles.kpiTileSub}>
                    {outstandingFees > 0 ? 'Due for child' : 'Fully cleared ✓'}
                  </Text>
                </TouchableOpacity>

                {/* Metric 6: Teacher Messages */}
                <TouchableOpacity
                  style={styles.kpiTile}
                  onPress={() => onNavigateTab('messages')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.kpiTileLabel}>TEACHER CHAT</Text>
                  <Text style={styles.kpiTileValue}>
                    {conversations.length}
                  </Text>
                  <Text style={styles.kpiTileSub}>Active threads</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* 4. Prioritized Quick Action Pills */}
          <View style={styles.quickActionsSection}>
            <Text style={styles.sectionHeaderTitle}>QUICK ACTIONS</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickActionPillsRow}
            >
              <TouchableOpacity
                style={styles.quickActionPill}
                onPress={() => onNavigateTab('attendance')}
              >
                <Text style={styles.quickActionIcon}>🛡️</Text>
                <Text style={styles.quickActionText}>Attendance</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionPill}
                onPress={() => onNavigateTab('learning')}
              >
                <Text style={styles.quickActionIcon}>📚</Text>
                <Text style={styles.quickActionText}>Study Files</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionPill}
                onPress={() => onNavigateTab('homework')}
              >
                <Text style={styles.quickActionIcon}>📝</Text>
                <Text style={styles.quickActionText}>Homework</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionPill}
                onPress={() => onNavigateTab('results')}
              >
                <Text style={styles.quickActionIcon}>🏆</Text>
                <Text style={styles.quickActionText}>Exam Marks</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionPill}
                onPress={() => onNavigateTab('fees')}
              >
                <Text style={styles.quickActionIcon}>💳</Text>
                <Text style={styles.quickActionText}>Fee Receipts</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionPill}
                onPress={() => onNavigateTab('messages')}
              >
                <Text style={styles.quickActionIcon}>💬</Text>
                <Text style={styles.quickActionText}>Faculty Chat</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionPill}
                onPress={() => onNavigateTab('progress')}
              >
                <Text style={styles.quickActionIcon}>📊</Text>
                <Text style={styles.quickActionText}>Progress Report</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionPill}
                onPress={onOpenReviewModal}
              >
                <Text style={styles.quickActionIcon}>⭐</Text>
                <Text style={styles.quickActionText}>Write Review</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* 5. Actionable Item 1: Campus Attendance & Gate Log */}
          <View style={styles.actionCard}>
            <View style={styles.actionCardHeader}>
              <View style={styles.actionCardIconBox}>
                <Text style={styles.actionCardIcon}>🛡️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionCardTitle}>Campus Gate & Safety Alert</Text>
                <Text style={styles.actionCardSub}>
                  Live check-in and check-out logs for {selectedChild.user?.fullName}
                </Text>
              </View>
              <View
                style={[
                  styles.badgePill,
                  todayAttendanceStatus === 'CHECKED_IN'
                    ? styles.badgeGreen
                    : todayAttendanceStatus === 'CHECKED_OUT'
                    ? styles.badgeBlue
                    : todayAttendanceStatus === 'LATE'
                    ? styles.badgeOrange
                    : styles.badgeGray,
                ]}
              >
                <Text
                  style={[
                    styles.badgePillText,
                    todayAttendanceStatus === 'CHECKED_IN'
                      ? styles.badgeGreenText
                      : todayAttendanceStatus === 'CHECKED_OUT'
                      ? styles.badgeBlueText
                      : todayAttendanceStatus === 'LATE'
                      ? styles.badgeOrangeText
                      : styles.badgeGrayText,
                  ]}
                >
                  {todayAttendanceStatus === 'CHECKED_IN'
                    ? 'IN CAMPUS'
                    : todayAttendanceStatus === 'CHECKED_OUT'
                    ? 'DEPARTED'
                    : todayAttendanceStatus === 'LATE'
                    ? 'LATE ARRIVAL'
                    : 'NO GATE SCAN'}
                </Text>
              </View>
            </View>

            <View style={styles.gateTimesBox}>
              <View style={styles.gateTimeCol}>
                <Text style={styles.gateTimeLabel}>ENTRY TIME</Text>
                <Text style={styles.gateTimeVal}>
                  {checkInTime ? formatKolkataTime(checkInTime) : 'Not recorded'}
                </Text>
              </View>
              <View style={styles.gateDivider} />
              <View style={styles.gateTimeCol}>
                <Text style={styles.gateTimeLabel}>EXIT TIME</Text>
                <Text style={styles.gateTimeVal}>
                  {checkOutTime ? formatKolkataTime(checkOutTime) : 'Not recorded'}
                </Text>
              </View>
              <View style={styles.gateDivider} />
              <View style={styles.gateTimeCol}>
                <Text style={styles.gateTimeLabel}>MONTH RATE</Text>
                <Text style={[styles.gateTimeVal, { color: '#2E7D32', fontWeight: '800' }]}>
                  {attendancePercentage}%
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.cardActionBtn}
              onPress={() => onNavigateTab('attendance')}
            >
              <Text style={styles.cardActionBtnText}>
                View Complete Attendance Calendar →
              </Text>
            </TouchableOpacity>
          </View>

          {/* 6. Actionable Item 2: Homework Status */}
          <View style={styles.actionCard}>
            <View style={styles.actionCardHeader}>
              <View style={[styles.actionCardIconBox, { backgroundColor: '#FFF7ED' }]}>
                <Text style={styles.actionCardIcon}>📝</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionCardTitle}>Homework & Assignments</Text>
                <Text style={styles.actionCardSub}>
                  {pendingHomework.length > 0
                    ? `${pendingHomework.length} tasks awaiting submission`
                    : 'All homework assignments submitted'}
                </Text>
              </View>
              <View
                style={[
                  styles.badgePill,
                  pendingHomework.length > 0 ? styles.badgeOrange : styles.badgeGreen,
                ]}
              >
                <Text
                  style={[
                    styles.badgePillText,
                    pendingHomework.length > 0
                      ? styles.badgeOrangeText
                      : styles.badgeGreenText,
                  ]}
                >
                  {pendingHomework.length > 0 ? 'PENDING' : 'UP TO DATE'}
                </Text>
              </View>
            </View>

            {pendingHomework.length > 0 ? (
              <View style={styles.hwHighlightBox}>
                <Text style={styles.hwHighlightTitle}>{pendingHomework[0].title}</Text>
                <Text style={styles.hwHighlightDesc} numberOfLines={2}>
                  {pendingHomework[0].description || 'No description provided.'}
                </Text>
                <View style={styles.hwHighlightFooter}>
                  <Text style={styles.hwHighlightDue}>
                    📅 Due: {pendingHomework[0].dueDate ? new Date(pendingHomework[0].dueDate).toLocaleDateString('en-IN') : 'Open'}
                  </Text>
                  <Text style={styles.hwHighlightSubject}>
                    {pendingHomework[0].subject || pendingHomework[0].subject?.name || 'Class Subject'}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.emptyInlineBox}>
                <Text style={styles.emptyInlineText}>
                  🎉 No pending homework for {selectedChild.user?.fullName}. Great work!
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.cardActionBtn}
              onPress={() => onNavigateTab('homework')}
            >
              <Text style={styles.cardActionBtnText}>View All Homework & Submissions →</Text>
            </TouchableOpacity>
          </View>

          {/* 7. Actionable Item 3: Latest Exam & Test Results */}
          <View style={styles.actionCard}>
            <View style={styles.actionCardHeader}>
              <View style={[styles.actionCardIconBox, { backgroundColor: '#F0FDF4' }]}>
                <Text style={styles.actionCardIcon}>🏆</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionCardTitle}>Academic Performance</Text>
                <Text style={styles.actionCardSub}>
                  Verified marks and teacher evaluation
                </Text>
              </View>
            </View>

            {latestExam ? (
              <View style={styles.examScoreBox}>
                <View style={styles.examScoreHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.examTitleText}>{latestExam.title}</Text>
                    <Text style={styles.examSubText}>
                      {latestExam.subject?.name || latestExam.subject || 'Core Subject'} &bull; Max: {latestExam.totalMarks || 100} pts
                    </Text>
                  </View>
                  {latestExamMark ? (
                    <View style={styles.scorePill}>
                      <Text style={styles.scorePillText}>
                        {latestExamMark.marksObtained}/{latestExamMark.maxMarks}
                      </Text>
                      <Text style={styles.scorePercentageText}>
                        ({latestExamMark.percentage}%)
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.badgePill}>
                      <Text style={styles.badgePillText}>SCHEDULED</Text>
                    </View>
                  )}
                </View>

                {latestExamMark?.remarks && (
                  <Text style={styles.examRemarksText}>
                    "{latestExamMark.remarks}"
                  </Text>
                )}
              </View>
            ) : (
              <View style={styles.emptyInlineBox}>
                <Text style={styles.emptyInlineText}>
                  No published exam results recorded yet for this term.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.cardActionBtn}
              onPress={() => onNavigateTab('results')}
            >
              <Text style={styles.cardActionBtnText}>View Full Report Card →</Text>
            </TouchableOpacity>
          </View>

          {/* 8. Actionable Item 4: Fee Statement Callout */}
          <View style={styles.actionCard}>
            <View style={styles.actionCardHeader}>
              <View style={[styles.actionCardIconBox, { backgroundColor: '#FEF2F2' }]}>
                <Text style={styles.actionCardIcon}>💳</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionCardTitle}>Fee Balance & Receipts</Text>
                <Text style={styles.actionCardSub}>
                  Tuition fees for {selectedChild.user?.fullName}
                </Text>
              </View>
              <View
                style={[
                  styles.badgePill,
                  outstandingFees > 0 ? styles.badgeDanger : styles.badgeGreen,
                ]}
              >
                <Text
                  style={[
                    styles.badgePillText,
                    outstandingFees > 0 ? styles.badgeDangerText : styles.badgeGreenText,
                  ]}
                >
                  {outstandingFees > 0 ? 'DUE' : 'CLEARED'}
                </Text>
              </View>
            </View>

            <View style={styles.feeHighlightRow}>
              <View style={styles.feeHighlightCol}>
                <Text style={styles.feeHighlightLabel}>TOTAL BILLED</Text>
                <Text style={styles.feeHighlightVal}>
                  {formatRupee(childStatement?.summary?.totalAssigned || 0)}
                </Text>
              </View>
              <View style={styles.gateDivider} />
              <View style={styles.feeHighlightCol}>
                <Text style={styles.feeHighlightLabel}>TOTAL PAID</Text>
                <Text style={[styles.feeHighlightVal, { color: '#059669' }]}>
                  {formatRupee(childStatement?.summary?.totalPaid || 0)}
                </Text>
              </View>
              <View style={styles.gateDivider} />
              <View style={styles.feeHighlightCol}>
                <Text style={styles.feeHighlightLabel}>BALANCE DUE</Text>
                <Text
                  style={[
                    styles.feeHighlightVal,
                    { color: outstandingFees > 0 ? '#DC2626' : '#2D1E18' },
                  ]}
                >
                  {formatRupee(outstandingFees)}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.cardActionBtn}
              onPress={() => onNavigateTab('fees')}
            >
              <Text style={styles.cardActionBtnText}>View Receipts & Statement →</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.noChildrenCard}>
          <Text style={styles.noChildrenIcon}>👨‍👩‍👧</Text>
          <Text style={styles.noChildrenTitle}>No Linked Children Found</Text>
          <Text style={styles.noChildrenSub}>
            Your parent account is not currently linked to any enrolled student. Please contact the tuition academy administration to verify child enrollment.
          </Text>
        </View>
      )}
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
    paddingBottom: 110, // Prevent overlap with fixed bottom nav
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
  dateText: {
    fontSize: 12,
    color: '#8D6E63',
    fontWeight: '500',
  },

  // 2. Child Selector
  childSelectorSection: {
    marginBottom: 16,
  },
  selectorHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectorSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8D6E63',
    letterSpacing: 0.8,
  },
  switchHintText: {
    fontSize: 11,
    color: '#4E342E',
    fontWeight: '600',
  },
  childPillsContainer: {
    gap: 10,
    paddingVertical: 2,
  },
  childPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: '#EFEBE9',
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  childPillActive: {
    backgroundColor: '#4E342E',
    borderColor: '#4E342E',
  },
  childPillAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F5ECE8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  childPillAvatarActive: {
    backgroundColor: '#FAF7F5',
  },
  childPillAvatarText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#4E342E',
  },
  childPillAvatarTextActive: {
    color: '#4E342E',
  },
  childPillInfo: {
    flex: 1,
  },
  childPillName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2D1E18',
  },
  childPillNameActive: {
    color: '#FFFFFF',
  },
  childPillSub: {
    fontSize: 10,
    color: '#8D6E63',
    marginTop: 1,
  },
  childPillSubActive: {
    color: '#D7CCC8',
  },
  selectedCheckBadge: {
    marginLeft: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCheckText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#4E342E',
  },

  // 3. KPI Grid Card
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
  kpiChildTarget: {
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
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotGreen: {
    backgroundColor: '#10B981',
  },
  dotBlue: {
    backgroundColor: '#3B82F6',
  },
  dotOrange: {
    backgroundColor: '#F59E0B',
  },
  dotGray: {
    backgroundColor: '#9CA3AF',
  },
  kpiTileValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#2D1E18',
  },
  kpiTileSub: {
    fontSize: 10,
    color: '#8D6E63',
    marginTop: 2,
  },

  // 4. Quick Actions
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
  quickActionPillsRow: {
    gap: 8,
    paddingVertical: 2,
  },
  quickActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#D7CCC8',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 2,
  },
  quickActionIcon: {
    fontSize: 14,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4E342E',
  },

  // 5. Actionable Cards
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
  badgeBlue: {
    backgroundColor: '#EFF6FF',
  },
  badgeBlueText: {
    color: '#2563EB',
  },
  badgeOrange: {
    backgroundColor: '#FFFBEB',
  },
  badgeOrangeText: {
    color: '#D97706',
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

  // Gate times box
  gateTimesBox: {
    flexDirection: 'row',
    backgroundColor: '#FAF7F5',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    marginBottom: 12,
  },
  gateTimeCol: {
    flex: 1,
    alignItems: 'center',
  },
  gateTimeLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8D6E63',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  gateTimeVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2D1E18',
  },
  gateDivider: {
    width: 1,
    backgroundColor: '#EFEBE9',
  },

  // Homework highlight box
  hwHighlightBox: {
    backgroundColor: '#FAF7F5',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    marginBottom: 12,
  },
  hwHighlightTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2D1E18',
    marginBottom: 2,
  },
  hwHighlightDesc: {
    fontSize: 11,
    color: '#6D4C41',
    lineHeight: 16,
    marginBottom: 6,
  },
  hwHighlightFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#EFEBE9',
  },
  hwHighlightDue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C2410C',
  },
  hwHighlightSubject: {
    fontSize: 11,
    color: '#8D6E63',
    fontWeight: '600',
  },

  // Exam Score Box
  examScoreBox: {
    backgroundColor: '#FAF7F5',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    marginBottom: 12,
  },
  examScoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  examTitleText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2D1E18',
  },
  examSubText: {
    fontSize: 11,
    color: '#8D6E63',
    marginTop: 2,
  },
  scorePill: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: 'center',
  },
  scorePillText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#2E7D32',
  },
  scorePercentageText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2E7D32',
  },
  examRemarksText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#4E342E',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#EFEBE9',
  },

  // Fee Highlight Row
  feeHighlightRow: {
    flexDirection: 'row',
    backgroundColor: '#FAF7F5',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    marginBottom: 12,
  },
  feeHighlightCol: {
    flex: 1,
    alignItems: 'center',
  },
  feeHighlightLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8D6E63',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  feeHighlightVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2D1E18',
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

  // Empty inline box
  emptyInlineBox: {
    backgroundColor: '#FAF7F5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  emptyInlineText: {
    fontSize: 12,
    color: '#6D4C41',
    textAlign: 'center',
  },

  // No children state
  noChildrenCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EFEBE9',
    marginTop: 20,
  },
  noChildrenIcon: {
    fontSize: 44,
    marginBottom: 12,
  },
  noChildrenTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2D1E18',
    marginBottom: 8,
  },
  noChildrenSub: {
    fontSize: 12,
    color: '#8D6E63',
    textAlign: 'center',
    lineHeight: 18,
  },
});

