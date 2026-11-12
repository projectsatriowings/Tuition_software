import { themeTokens } from '@tuition/shared';
import {
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarCheck,
} from 'lucide-react-native';
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
import { PressableScale } from '../../../theme/motion';

interface StudentAttendanceTabProps {
  studentProfile: any;
  studentAttendance: any;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onMonthChange: (month: number, year: number) => void;
  currentMonth: number;
  currentYear: number;
}

export const StudentAttendanceTab: React.FC<StudentAttendanceTabProps> = ({
  studentProfile,
  studentAttendance,
  loading,
  refreshing,
  onRefresh,
  onMonthChange,
  currentMonth,
  currentYear,
}) => {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      onMonthChange(12, currentYear - 1);
    } else {
      onMonthChange(currentMonth - 1, currentYear);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      onMonthChange(1, currentYear + 1);
    } else {
      onMonthChange(currentMonth + 1, currentYear);
    }
  };

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

  const metrics = studentAttendance?.metrics || studentProfile?.attendanceSummary;
  const attendancePercentage = metrics?.attendancePercentage ?? 100;
  const presentDays = metrics?.presentDays ?? 0;
  const lateDays = metrics?.lateDays ?? 0;
  const absentDays = metrics?.absentDays ?? 0;
  const workingDays = metrics?.totalWorkingDays ?? 0;

  const calendarDays = studentAttendance?.calendarDays || [];

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
      {/* 1. Header Card with Attendance Overview */}
      <View style={styles.headerCard}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.studentName}>
              {studentProfile?.firstName} {studentProfile?.lastName}
            </Text>
            <Text style={styles.studentMeta}>
              {studentProfile?.enrollments?.[0]?.batch?.name || studentProfile?.batch?.name || 'Class Batch'} &bull; Adm: {studentProfile?.admissionNumber || '—'}
            </Text>
          </View>
          <View
            style={[
              styles.percentageBadge,
              attendancePercentage >= 85
                ? styles.badgeGood
                : attendancePercentage >= 75
                ? styles.badgeWarning
                : styles.badgeDanger,
            ]}
          >
            <Text style={styles.percentageText}>{attendancePercentage}%</Text>
            <Text style={styles.percentageSub}>Rate</Text>
          </View>
        </View>

        {/* Month Selector Controls */}
        <View style={styles.monthSelectorRow}>
          <TouchableOpacity
            style={styles.monthNavBtn}
            onPress={handlePrevMonth}
            accessibilityLabel="Previous month"
          >
            <ChevronLeft size={20} color="#4E342E" />
          </TouchableOpacity>
          <View style={styles.monthDisplay}>
            <Calendar size={15} color="#4E342E" style={{ marginRight: 6 }} />
            <Text style={styles.monthText}>
              {monthNames[currentMonth - 1]} {currentYear}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.monthNavBtn}
            onPress={handleNextMonth}
            accessibilityLabel="Next month"
          >
            <ChevronRight size={20} color="#4E342E" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Key Metrics Grid */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <CheckCircle2 size={16} color="#2E7D32" />
          <Text style={[styles.metricValue, { color: '#2E7D32' }]}>{presentDays}</Text>
          <Text style={styles.metricLabel}>Present Days</Text>
        </View>

        <View style={styles.metricCard}>
          <Clock size={16} color="#E65100" />
          <Text style={[styles.metricValue, { color: '#E65100' }]}>{lateDays}</Text>
          <Text style={styles.metricLabel}>Late Arrivals</Text>
        </View>

        <View style={styles.metricCard}>
          <XCircle size={16} color="#C62828" />
          <Text style={[styles.metricValue, { color: '#C62828' }]}>{absentDays}</Text>
          <Text style={styles.metricLabel}>Absent Days</Text>
        </View>

        <View style={styles.metricCard}>
          <CalendarCheck size={16} color="#4E342E" />
          <Text style={[styles.metricValue, { color: '#4E342E' }]}>{workingDays}</Text>
          <Text style={styles.metricLabel}>Working Days</Text>
        </View>
      </View>

      {/* 3. Daily Attendance Timeline */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeading}>Daily Attendance Record</Text>
        <Text style={styles.sectionCount}>
          {calendarDays.filter((d: any) => d.status !== 'HOLIDAY_OR_NO_SESSION').length} recorded
        </Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="small" color="#4E342E" />
          <Text style={styles.loadingText}>Updating attendance logs...</Text>
        </View>
      ) : calendarDays.length === 0 ? (
        <View style={styles.emptyCard}>
          <Calendar size={36} color="#BCAAA4" />
          <Text style={styles.emptyTitle}>No Attendance Records</Text>
          <Text style={styles.emptySubtitle}>
            Attendance records for {monthNames[currentMonth - 1]} {currentYear} will appear once sessions are conducted.
          </Text>
        </View>
      ) : (
        <View style={styles.timelineList}>
          {calendarDays.map((item: any, idx: number) => {
            if (item.status === 'HOLIDAY_OR_NO_SESSION') return null;

            const isPresent = item.status === 'PRESENT';
            const isLate = item.status === 'LATE' || item.isLate;
            const isAbsent = item.status === 'ABSENT';

            const formattedDate = new Intl.DateTimeFormat('en-IN', {
              timeZone: 'Asia/Kolkata',
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            }).format(new Date(item.date));

            return (
              <View key={`${item.date}-${idx}`} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View
                    style={[
                      styles.statusDot,
                      isPresent && { backgroundColor: '#2E7D32' },
                      isLate && { backgroundColor: '#E65100' },
                      isAbsent && { backgroundColor: '#C62828' },
                    ]}
                  />
                  <View>
                    <Text style={styles.timelineDate}>{formattedDate}</Text>
                    <Text style={styles.timelineTimes}>
                      {isPresent || isLate
                        ? `In: ${formatKolkataTime(item.checkIn)}${item.checkOut ? ` • Out: ${formatKolkataTime(item.checkOut)}` : ''}`
                        : 'No session attendance recorded'}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.statusPill,
                    isPresent && styles.pillPresent,
                    isLate && styles.pillLate,
                    isAbsent && styles.pillAbsent,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      isPresent && { color: '#2E7D32' },
                      isLate && { color: '#E65100' },
                      isAbsent && { color: '#C62828' },
                    ]}
                  >
                    {isLate ? 'LATE' : isPresent ? 'PRESENT' : 'ABSENT'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* 4. Safety & Verification Footnote */}
      <View style={styles.footerInfoBox}>
        <ShieldCheck size={16} color="#6D4C41" style={{ marginRight: 6 }} />
        <Text style={styles.footerInfoText}>
          Attendance is digitally verified with instant parent notification upon check-in and check-out.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F2',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    shadowColor: '#4E342E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerLeft: {
    flex: 1,
  },
  studentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D1E18',
  },
  studentMeta: {
    fontSize: 12,
    color: '#6D4C41',
    marginTop: 2,
  },
  percentageBadge: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    minWidth: 64,
  },
  badgeGood: {
    backgroundColor: '#E8F5E9',
  },
  badgeWarning: {
    backgroundColor: '#FFF3E0',
  },
  badgeDanger: {
    backgroundColor: '#FFEBEE',
  },
  percentageText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2D1E18',
  },
  percentageSub: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6D4C41',
  },
  monthSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F7F4EE',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  monthNavBtn: {
    padding: 6,
    borderRadius: 8,
  },
  monthDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4E342E',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFEBE9',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 10,
    color: '#8D6E63',
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4E342E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: 11,
    color: '#8D6E63',
    fontWeight: '600',
  },
  timelineList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    overflow: 'hidden',
    marginBottom: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F7F4EE',
  },
  timelineLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  timelineDate: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2D1E18',
  },
  timelineTimes: {
    fontSize: 11,
    color: '#8D6E63',
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pillPresent: {
    backgroundColor: '#E8F5E9',
  },
  pillLate: {
    backgroundColor: '#FFF3E0',
  },
  pillAbsent: {
    backgroundColor: '#FFEBEE',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFEBE9',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#4E342E',
    marginTop: 10,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#8D6E63',
    textAlign: 'center',
    lineHeight: 18,
  },
  centerBox: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: '#6D4C41',
    marginTop: 8,
  },
  footerInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFEBE9',
    borderRadius: 12,
    padding: 12,
  },
  footerInfoText: {
    fontSize: 11,
    color: '#5D4037',
    flex: 1,
    lineHeight: 16,
  },
});

