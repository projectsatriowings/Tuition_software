import { themeTokens } from '@tuition/shared';
import { ChevronLeft, ChevronRight, ShieldCheck, Calendar, CheckCircle2, XCircle, Clock, User } from 'lucide-react-native';
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

interface ParentAttendanceTabProps {
  selectedChild: any;
  children: any[];
  onSelectChild: (child: any) => void;
  childAttendance: any;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onMonthChange: (month: number, year: number) => void;
  currentMonth: number;
  currentYear: number;
}

export const ParentAttendanceTab: React.FC<ParentAttendanceTabProps> = ({
  selectedChild,
  children,
  onSelectChild,
  childAttendance,
  loading,
  refreshing,
  onRefresh,
  onMonthChange,
  currentMonth,
  currentYear,
}) => {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
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

  const attendancePercentage = childAttendance?.attendancePercentage ?? 100;
  const presentDays = childAttendance?.presentDaysCount ?? 0;
  const lateDays = childAttendance?.lateDaysCount ?? 0;
  const absentDays = childAttendance?.absentDaysCount ?? 0;
  const workingDays = childAttendance?.totalWorkingDays ?? 0;

  const calendarDays = childAttendance?.calendarDays || [];

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
      {/* 1. Header with Child Indicator */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.screenHeading}>Campus Attendance</Text>
          <Text style={styles.screenSub}>
            Safety gate scans & monthly attendance records
          </Text>
        </View>
      </View>

      {/* Child Switcher Pills */}
      {children.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.childChipsRow}
        >
          {children.map((child) => {
            const isSel = selectedChild?.id === child.id;
            const name = child.user?.fullName || `${child.firstName || ''} ${child.lastName || ''}`.trim() || 'Student';
            return (
              <TouchableOpacity
                key={child.id}
                onPress={() => onSelectChild(child)}
                style={[styles.childChip, isSel && styles.childChipActive]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <User size={12} color={isSel ? '#FFFFFF' : '#4E342E'} />
                  <Text style={[styles.childChipText, isSel && styles.childChipTextActive]}>
                    {name}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* 2. Month Selector Bar */}
      <View style={styles.monthSelectorBar}>
        <TouchableOpacity onPress={handlePrevMonth} style={styles.monthNavBtn} activeOpacity={0.7}>
          <ChevronLeft size={18} color="#4E342E" />
        </TouchableOpacity>

        <View style={styles.monthTitleBox}>
          <Text style={styles.monthTitleText}>
            {monthNames[currentMonth - 1]} {currentYear}
          </Text>
          <Text style={styles.monthChildSub}>
            Record for {selectedChild?.user?.fullName || 'Student'}
          </Text>
        </View>

        <TouchableOpacity onPress={handleNextMonth} style={styles.monthNavBtn} activeOpacity={0.7}>
          <ChevronRight size={18} color="#4E342E" />
        </TouchableOpacity>
      </View>

      {/* 3. Monthly Metrics Card */}
      <View style={styles.metricsCard}>
        <View style={styles.mainRateRow}>
          <View>
            <Text style={styles.mainRateLabel}>MONTHLY ATTENDANCE RATE</Text>
            <Text
              style={[
                styles.mainRateValue,
                { color: attendancePercentage >= 80 ? '#2E7D32' : '#C2410C' },
              ]}
            >
              {attendancePercentage}%
            </Text>
          </View>
          <View
            style={[
              styles.rateBadge,
              attendancePercentage >= 80 ? styles.rateBadgeGood : styles.rateBadgeWarning,
            ]}
          >
            <Text
              style={[
                styles.rateBadgeText,
                attendancePercentage >= 80 ? styles.rateBadgeGoodText : styles.rateBadgeWarningText,
              ]}
            >
              {attendancePercentage >= 80 ? 'EXCELLENT' : 'ATTENTION'}
            </Text>
          </View>
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricItemLabel}>PRESENT</Text>
            <Text style={[styles.metricItemVal, { color: '#2E7D32' }]}>{presentDays}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricItemLabel}>LATE</Text>
            <Text style={[styles.metricItemVal, { color: '#E65100' }]}>{lateDays}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricItemLabel}>ABSENT</Text>
            <Text style={[styles.metricItemVal, { color: '#C62828' }]}>{absentDays}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricItemLabel}>WORKING</Text>
            <Text style={styles.metricItemVal}>{workingDays}</Text>
          </View>
        </View>
      </View>

      {/* 4. Safety Guarantee Card */}
      <View style={styles.safetyCard}>
        <View style={styles.safetyIconBox}>
          <ShieldCheck size={20} color="#2E7D32" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.safetyTitle}>Live Gate Entry & Exit Protection</Text>
          <Text style={styles.safetyDesc}>
            Automated notifications are pushed directly to your registered parent device as soon as your child's student badge is scanned at the campus gate.
          </Text>
        </View>
      </View>

      {/* 5. Daily Attendance Timeline */}
      <View style={styles.timelineSection}>
        <Text style={styles.timelineSectionTitle}>DAILY GATE LOGS</Text>

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="small" color="#4E342E" />
            <Text style={styles.loadingText}>Fetching attendance records...</Text>
          </View>
        ) : calendarDays.length === 0 ? (
          <View style={styles.emptyCard}>
            <Calendar size={42} color={themeTokens.colors.primary} />
            <Text style={styles.emptyTitle}>No Daily Logs Found</Text>
            <Text style={styles.emptySub}>
              There are no attendance events logged for {monthNames[currentMonth - 1]} {currentYear}.
            </Text>
          </View>
        ) : (
          calendarDays.map((record: any, index: number) => {
            const isPresent = record.status === 'PRESENT';
            const isLate = record.status === 'LATE';
            const isAbsent = record.status === 'ABSENT';
            const isHoliday = record.status === 'HOLIDAY' || record.status === 'NON_WORKING';

            // Format date string
            let dateLabel = record.date;
            try {
              const d = new Date(record.date);
              dateLabel = new Intl.DateTimeFormat('en-IN', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              }).format(d);
            } catch {
              dateLabel = record.date;
            }

            return (
              <View key={`${record.date}-${index}`} style={styles.logCard}>
                <View style={styles.logHeader}>
                  <View style={styles.logDateBox}>
                    <Text style={styles.logDayNum}>{record.day || ''}</Text>
                    <Text style={styles.logDateLabel}>{dateLabel}</Text>
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      isPresent
                        ? styles.pillPresent
                        : isLate
                        ? styles.pillLate
                        : isAbsent
                        ? styles.pillAbsent
                        : styles.pillHoliday,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        isPresent
                          ? styles.textPresent
                          : isLate
                          ? styles.textLate
                          : isAbsent
                          ? styles.textAbsent
                          : styles.textHoliday,
                      ]}
                    >
                      {isPresent
                        ? '✓ PRESENT'
                        : isLate
                        ? '⏱ LATE'
                        : isAbsent
                        ? '✕ ABSENT'
                        : 'HOLIDAY'}
                    </Text>
                  </View>
                </View>

                {/* Gate scan details */}
                {!isHoliday && !isAbsent && (
                  <View style={styles.gateTimesRow}>
                    <View style={styles.timeEntry}>
                      <Text style={styles.timeEntryLabel}>GATE CHECK-IN</Text>
                      <Text style={styles.timeEntryVal}>
                        {record.checkIn ? formatKolkataTime(record.checkIn) : '—'}
                      </Text>
                    </View>
                    <View style={styles.timeDivider} />
                    <View style={styles.timeEntry}>
                      <Text style={styles.timeEntryLabel}>GATE CHECK-OUT</Text>
                      <Text style={styles.timeEntryVal}>
                        {record.checkOut ? formatKolkataTime(record.checkOut) : '—'}
                      </Text>
                    </View>
                  </View>
                )}

                {record.remarks && (
                  <Text style={styles.logRemarks}>Note: {record.remarks}</Text>
                )}
              </View>
            );
          })
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
    paddingBottom: 110,
  },
  headerRow: {
    marginBottom: 12,
  },
  screenHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2D1E18',
  },
  screenSub: {
    fontSize: 12,
    color: '#8D6E63',
    marginTop: 2,
  },
  childChipsRow: {
    gap: 8,
    marginBottom: 12,
  },
  childChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#D7CCC8',
  },
  childChipActive: {
    backgroundColor: '#4E342E',
    borderColor: '#4E342E',
  },
  childChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4E342E',
  },
  childChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Month selector
  monthSelectorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 2,
  },
  monthNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5ECE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNavText: {
    fontSize: 12,
    color: '#4E342E',
    fontWeight: '800',
  },
  monthTitleBox: {
    alignItems: 'center',
  },
  monthTitleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2D1E18',
  },
  monthChildSub: {
    fontSize: 10,
    color: '#8D6E63',
    marginTop: 1,
  },

  // Metrics Card
  metricsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    marginBottom: 12,
    shadowColor: '#2D1E18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  mainRateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F5ECE8',
    paddingBottom: 12,
    marginBottom: 12,
  },
  mainRateLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8D6E63',
    letterSpacing: 0.5,
  },
  mainRateValue: {
    fontSize: 26,
    fontWeight: '900',
    marginTop: 2,
  },
  rateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rateBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  rateBadgeGood: {
    backgroundColor: '#E8F5E9',
  },
  rateBadgeGoodText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2E7D32',
  },
  rateBadgeWarning: {
    backgroundColor: '#FFF3E0',
  },
  rateBadgeWarningText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#E65100',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricItemLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8D6E63',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metricItemVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2D1E18',
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#EFEBE9',
  },

  // Safety Card
  safetyCard: {
    flexDirection: 'row',
    backgroundColor: '#F5ECE8',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D7CCC8',
  },
  safetyIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  safetyIcon: {
    fontSize: 16,
  },
  safetyTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4E342E',
  },
  safetyDesc: {
    fontSize: 10,
    color: '#6D4C41',
    lineHeight: 14,
    marginTop: 2,
  },

  // Timeline
  timelineSection: {
    marginTop: 4,
  },
  timelineSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8D6E63',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  centerLoading: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: '#8D6E63',
    marginTop: 8,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFEBE9',
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2D1E18',
  },
  emptySub: {
    fontSize: 11,
    color: '#8D6E63',
    textAlign: 'center',
    marginTop: 4,
  },

  // Daily log card
  logCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    marginBottom: 8,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logDateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logDayNum: {
    fontSize: 14,
    fontWeight: '900',
    color: '#4E342E',
    width: 24,
  },
  logDateLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2D1E18',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  pillPresent: {
    backgroundColor: '#E8F5E9',
  },
  textPresent: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2E7D32',
  },
  pillLate: {
    backgroundColor: '#FFF3E0',
  },
  textLate: {
    fontSize: 10,
    fontWeight: '800',
    color: '#E65100',
  },
  pillAbsent: {
    backgroundColor: '#FFEBEE',
  },
  textAbsent: {
    fontSize: 10,
    fontWeight: '800',
    color: '#C62828',
  },
  pillHoliday: {
    backgroundColor: '#F5F5F5',
  },
  textHoliday: {
    fontSize: 10,
    fontWeight: '700',
    color: '#757575',
  },
  gateTimesRow: {
    flexDirection: 'row',
    backgroundColor: '#FAF7F5',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  timeEntry: {
    flex: 1,
    alignItems: 'center',
  },
  timeEntryLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#8D6E63',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  timeEntryVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2D1E18',
  },
  timeDivider: {
    width: 1,
    backgroundColor: '#EFEBE9',
  },
  logRemarks: {
    fontSize: 10,
    color: '#8D6E63',
    fontStyle: 'italic',
    marginTop: 6,
  },
});
