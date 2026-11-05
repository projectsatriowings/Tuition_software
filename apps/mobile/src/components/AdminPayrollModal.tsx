import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import {
  X,
  Banknote,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Users,
  TrendingUp,
  FileText,
  Settings,
} from 'lucide-react-native';
import { api } from '../services/api';
import { themeTokens } from '@tuition/shared';
import { PressableScale } from '../theme/motion';

interface AdminPayrollModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AdminPayrollModal: React.FC<AdminPayrollModalProps> = ({
  visible,
  onClose,
}) => {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [activeTab, setActiveTab] = useState<'register' | 'policy'>('register');
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState(false);
  const [processingRun, setProcessingRun] = useState(false);
  const [approvingRun, setApprovingRun] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [staffSalaries, setStaffSalaries] = useState<any[]>([]);
  const [policyData, setPolicyData] = useState<any>(null);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const formatCurrency = (amount: number) => {
    return '₹' + (amount || 0).toLocaleString('en-IN');
  };

  const loadPayrollData = useCallback(async () => {
    if (!visible) return;
    setLoading(true);
    try {
      const [dashRes, staffRes, policyRes] = await Promise.all([
        api.get(`/payroll/dashboard?year=${selectedYear}&month=${selectedMonth}`),
        api.get('/payroll/staff-salaries'),
        api.get('/payroll/policy'),
      ]);

      if (dashRes?.success && dashRes.data) {
        setDashboardData(dashRes.data);
      }
      if (staffRes?.success && staffRes.data?.staffSalaries) {
        setStaffSalaries(staffRes.data.staffSalaries);
      }
      if (policyRes?.success && policyRes.data?.policy) {
        setPolicyData(policyRes.data.policy);
      }
    } catch (err: any) {
      console.error('[AdminPayrollModal] Load error:', err);
    } finally {
      setLoading(false);
    }
  }, [visible, selectedYear, selectedMonth]);

  useEffect(() => {
    if (visible) {
      loadPayrollData();
    }
  }, [visible, loadPayrollData]);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const handleCalculatePayroll = async () => {
    Alert.alert(
      'Calculate Monthly Payroll',
      `Aggregate biometric & geofence attendance logs and compute gross/net salaries for ${monthNames[selectedMonth - 1]} ${selectedYear}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Calculate Now',
          onPress: async () => {
            setProcessingRun(true);
            try {
              const res = await api.post('/payroll/runs/generate', {
                year: selectedYear,
                month: selectedMonth,
              });
              if (res?.success) {
                Alert.alert('Success', `Payroll for ${monthNames[selectedMonth - 1]} ${selectedYear} calculated successfully.`);
                loadPayrollData();
              } else {
                Alert.alert('Calculation Note', res?.error || 'Payroll calculation completed.');
                loadPayrollData();
              }
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to calculate payroll');
            } finally {
              setProcessingRun(false);
            }
          },
        },
      ]
    );
  };

  const handleApprovePayroll = async () => {
    Alert.alert(
      'Approve & Lock Payroll',
      `Approve the monthly payroll run for ${monthNames[selectedMonth - 1]} ${selectedYear}? Once locked, salary slips will become available to faculty.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve & Lock',
          style: 'default',
          onPress: async () => {
            setApprovingRun(true);
            try {
              const runId = dashboardData?.metrics?.runId || dashboardData?.run?.id;
              const res = await api.post('/payroll/runs/approve', {
                runId,
                year: selectedYear,
                month: selectedMonth,
              });
              if (res?.success) {
                Alert.alert('Approved', 'Monthly payroll run has been approved and locked.');
                loadPayrollData();
              } else {
                Alert.alert('Notice', res?.error || 'Payroll run status updated.');
                loadPayrollData();
              }
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to approve payroll');
            } finally {
              setApprovingRun(false);
            }
          },
        },
      ]
    );
  };

  const metrics = dashboardData?.metrics || {};
  const runStatus = metrics?.runStatus || 'NOT GENERATED';
  const totalExpenditure = metrics?.totalExpenditure || metrics?.totalGross || 0;
  const totalPaid = metrics?.totalPaid || 0;
  const totalPending = metrics?.totalPending || (totalExpenditure - totalPaid);
  const staffCount = metrics?.staffCount || staffSalaries.length || 0;

  const records = dashboardData?.records || staffSalaries || [];
  const filteredRecords = records.filter((r: any) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const name = (r.staffName || r.name || r.user?.name || '').toLowerCase();
    const code = (r.employeeCode || r.code || '').toLowerCase();
    const role = (r.designation || r.role || '').toLowerCase();
    return name.includes(q) || code.includes(q) || role.includes(q);
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconBox}>
                <Banknote size={20} color="#FAF7F5" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Staff Payroll Engine</Text>
                <Text style={styles.headerSubtitle}>
                  Compensation, attendance settlement & salary slips
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={20} color="#FAF7F5" />
            </TouchableOpacity>
          </View>

          {/* Month / Year Navigator */}
          <View style={styles.periodBar}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.periodNavBtn}>
              <ChevronLeft size={18} color="#4E342E" />
            </TouchableOpacity>
            <View style={styles.periodCenter}>
              <Calendar size={15} color="#4E342E" style={{ marginRight: 6 }} />
              <Text style={styles.periodText}>
                {monthNames[selectedMonth - 1]} {selectedYear}
              </Text>
            </View>
            <TouchableOpacity onPress={handleNextMonth} style={styles.periodNavBtn}>
              <ChevronRight size={18} color="#4E342E" />
            </TouchableOpacity>
          </View>

          {/* Tab Selector */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'register' && styles.tabBtnActive]}
              onPress={() => setActiveTab('register')}
            >
              <Text style={[styles.tabBtnText, activeTab === 'register' && styles.tabBtnTextActive]}>
                Salary Register ({records.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'policy' && styles.tabBtnActive]}
              onPress={() => setActiveTab('policy')}
            >
              <Text style={[styles.tabBtnText, activeTab === 'policy' && styles.tabBtnTextActive]}>
                Payroll Policy & Rules
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4E342E" />
              <Text style={styles.loadingText}>Loading payroll records...</Text>
            </View>
          ) : (
            <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
              {activeTab === 'register' ? (
                <>
                  {/* KPI Summary Cards */}
                  <View style={styles.kpiRow}>
                    <View style={styles.kpiCard}>
                      <Text style={styles.kpiLabel}>TOTAL PAYROLL</Text>
                      <Text style={styles.kpiVal}>{formatCurrency(totalExpenditure)}</Text>
                      <Text style={styles.kpiSub}>{staffCount} staff members</Text>
                    </View>
                    <View style={styles.kpiCard}>
                      <Text style={styles.kpiLabel}>RUN STATUS</Text>
                      <View style={[
                        styles.statusPill,
                        runStatus === 'APPROVED' || runStatus === 'PAID'
                          ? styles.statusPillSuccess
                          : runStatus === 'CALCULATED'
                          ? styles.statusPillWarning
                          : styles.statusPillNeutral
                      ]}>
                        <Text style={[
                          styles.statusPillText,
                          runStatus === 'APPROVED' || runStatus === 'PAID'
                            ? styles.statusTextSuccess
                            : runStatus === 'CALCULATED'
                            ? styles.statusTextWarning
                            : styles.statusTextNeutral
                        ]}>
                          {runStatus}
                        </Text>
                      </View>
                      <Text style={styles.kpiSub}>Pending: {formatCurrency(totalPending)}</Text>
                    </View>
                  </View>

                  {/* Action Bar */}
                  <View style={styles.actionsBar}>
                    <PressableScale
                      style={[styles.actionBtn, styles.actionBtnPrimary]}
                      onPress={handleCalculatePayroll}
                      disabled={processingRun}
                    >
                      {processingRun ? (
                        <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
                      ) : (
                        <RefreshCw size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                      )}
                      <Text style={styles.actionBtnPrimaryText}>
                        {processingRun ? 'Calculating...' : 'Calculate Monthly Run'}
                      </Text>
                    </PressableScale>

                    {(runStatus === 'CALCULATED' || runStatus === 'DRAFT') && (
                      <PressableScale
                        style={[styles.actionBtn, styles.actionBtnSuccess]}
                        onPress={handleApprovePayroll}
                        disabled={approvingRun}
                      >
                        {approvingRun ? (
                          <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
                        ) : (
                          <ShieldCheck size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                        )}
                        <Text style={styles.actionBtnSuccessText}>
                          {approvingRun ? 'Approving...' : 'Approve & Lock'}
                        </Text>
                      </PressableScale>
                    )}
                  </View>

                  {/* Search Staff */}
                  <View style={styles.searchBox}>
                    <Search size={16} color="#8D6E63" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search staff by name or code..."
                      placeholderTextColor="#A1887F"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                  </View>

                  {/* Staff Salary Register */}
                  <Text style={styles.sectionHeading}>STAFF SALARY LEDGER</Text>
                  {filteredRecords.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Banknote size={36} color="#BCAAA4" />
                      <Text style={styles.emptyTitle}>No Payroll Data for this Month</Text>
                      <Text style={styles.emptySub}>
                        Tap "Calculate Monthly Run" above to aggregate attendance and generate compensation breakdown.
                      </Text>
                    </View>
                  ) : (
                    filteredRecords.map((item: any, idx: number) => {
                      const name = item.staffName || item.name || item.user?.name || `Staff Member #${idx + 1}`;
                      const code = item.employeeCode || item.code || 'FAC-100' + (idx + 1);
                      const designation = item.designation || item.role || 'Faculty';
                      const presentDays = item.presentDays ?? item.attendanceDays ?? item.daysWorked ?? 26;
                      const workingDays = item.workingDays ?? 26;
                      const basic = item.basicSalary ?? item.basicPay ?? 0;
                      const allowances = item.allowancesTotal ?? item.allowances ?? 0;
                      const deductions = item.deductionsTotal ?? item.deductions ?? 0;
                      const netPay = item.netSalary ?? item.netPay ?? (basic + allowances - deductions);
                      const status = item.paymentStatus || (runStatus === 'APPROVED' ? 'APPROVED' : 'PENDING');

                      return (
                        <View key={item.id || idx} style={styles.staffCard}>
                          <View style={styles.staffHeader}>
                            <View style={styles.staffAvatar}>
                              <Text style={styles.avatarLetter}>
                                {(name[0] || 'S').toUpperCase()}
                              </Text>
                            </View>
                            <View style={styles.staffInfo}>
                              <Text style={styles.staffName}>{name}</Text>
                              <Text style={styles.staffRole}>
                                {code} &bull; {designation}
                              </Text>
                            </View>
                            <View style={[
                              styles.payStatusBadge,
                              status === 'PAID'
                                ? styles.statusPillSuccess
                                : status === 'APPROVED'
                                ? styles.statusPillWarning
                                : styles.statusPillNeutral
                            ]}>
                              <Text style={[
                                styles.payStatusText,
                                status === 'PAID'
                                  ? styles.statusTextSuccess
                                  : status === 'APPROVED'
                                  ? styles.statusTextWarning
                                  : styles.statusTextNeutral
                              ]}>
                                {status}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.daysRow}>
                            <Clock size={13} color="#6D4C41" style={{ marginRight: 4 }} />
                            <Text style={styles.daysText}>
                              Attendance: <Text style={{ fontWeight: '700' }}>{presentDays}/{workingDays} days</Text> present
                            </Text>
                          </View>

                          <View style={styles.salaryGrid}>
                            <View style={styles.salaryItem}>
                              <Text style={styles.salaryItemLabel}>Basic</Text>
                              <Text style={styles.salaryItemVal}>{formatCurrency(basic)}</Text>
                            </View>
                            <View style={styles.salaryItem}>
                              <Text style={styles.salaryItemLabel}>Allowances</Text>
                              <Text style={[styles.salaryItemVal, { color: '#15803D' }]}>
                                +{formatCurrency(allowances)}
                              </Text>
                            </View>
                            <View style={styles.salaryItem}>
                              <Text style={styles.salaryItemLabel}>Deductions</Text>
                              <Text style={[styles.salaryItemVal, { color: '#B91C1C' }]}>
                                -{formatCurrency(deductions)}
                              </Text>
                            </View>
                            <View style={styles.salaryItem}>
                              <Text style={styles.salaryItemLabel}>Net Payable</Text>
                              <Text style={[styles.salaryItemVal, styles.netVal]}>
                                {formatCurrency(netPay)}
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })
                  )}
                </>
              ) : (
                /* Policy Tab */
                <View style={styles.policyCard}>
                  <View style={styles.policyHeader}>
                    <Settings size={20} color="#4E342E" style={{ marginRight: 8 }} />
                    <Text style={styles.policyTitle}>Institute Payroll Policies</Text>
                  </View>
                  <Text style={styles.policyDesc}>
                    Configured attendance thresholds and automatic payroll computation rules for all teaching and administrative staff.
                  </Text>

                  <View style={styles.policyRuleBox}>
                    <Text style={styles.policyRuleName}>Working Hours Per Shift</Text>
                    <Text style={styles.policyRuleVal}>
                      {policyData?.standardHoursPerDay || 8} Hours / Day
                    </Text>
                  </View>

                  <View style={styles.policyRuleBox}>
                    <Text style={styles.policyRuleName}>Late Punch-In Grace Period</Text>
                    <Text style={styles.policyRuleVal}>
                      {policyData?.graceMinutes || 15} Minutes
                    </Text>
                  </View>

                  <View style={styles.policyRuleBox}>
                    <Text style={styles.policyRuleName}>Half-Day Minimum Hours</Text>
                    <Text style={styles.policyRuleVal}>
                      {policyData?.halfDayHours || 4} Hours
                    </Text>
                  </View>

                  <View style={styles.policyRuleBox}>
                    <Text style={styles.policyRuleName}>Unpaid Leave Salary Deduction</Text>
                    <Text style={styles.policyRuleVal}>
                      1 / {policyData?.daysInMonth || 30} per day absent
                    </Text>
                  </View>

                  <View style={styles.policyRuleBox}>
                    <Text style={styles.policyRuleName}>Geofence Distance Tolerance</Text>
                    <Text style={styles.policyRuleVal}>
                      150 Meters from branch center
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FAF7F5',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '92%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#3E2723',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#4E342E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FAF7F5',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#D7CCC8',
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#4E342E',
  },
  periodBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5ECE8',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEBE9',
  },
  periodCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  periodText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#3E2723',
  },
  periodNavBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#EFEBE9',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#EFEBE9',
    padding: 4,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8D6E63',
  },
  tabBtnTextActive: {
    color: '#3E2723',
    fontWeight: '800',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#6D4C41',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFEBE9',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8D6E63',
    letterSpacing: 0.5,
  },
  kpiVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2D1E18',
    marginTop: 4,
  },
  kpiSub: {
    fontSize: 11,
    color: '#6D4C41',
    marginTop: 2,
  },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  statusPillSuccess: {
    backgroundColor: '#DCFCE7',
  },
  statusPillWarning: {
    backgroundColor: '#FEF3C7',
  },
  statusPillNeutral: {
    backgroundColor: '#F3F4F6',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  statusTextSuccess: {
    color: '#166534',
  },
  statusTextWarning: {
    color: '#B45309',
  },
  statusTextNeutral: {
    color: '#4B5563',
  },
  actionsBar: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionBtnPrimary: {
    backgroundColor: '#4E342E',
  },
  actionBtnPrimaryText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  actionBtnSuccess: {
    backgroundColor: '#15803D',
  },
  actionBtnSuccessText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#2D1E18',
    padding: 0,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8D6E63',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EFEBE9',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4E342E',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 11,
    color: '#8D6E63',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  staffCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    marginBottom: 10,
  },
  staffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  staffAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F5ECE8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarLetter: {
    fontSize: 15,
    fontWeight: '900',
    color: '#4E342E',
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2D1E18',
  },
  staffRole: {
    fontSize: 10,
    color: '#8D6E63',
    marginTop: 1,
  },
  payStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  payStatusText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  daysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5ECE8',
  },
  daysText: {
    fontSize: 11,
    color: '#6D4C41',
  },
  salaryGrid: {
    flexDirection: 'row',
    backgroundColor: '#FAF7F5',
    borderRadius: 10,
    padding: 8,
    marginTop: 8,
  },
  salaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  salaryItemLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8D6E63',
    textTransform: 'uppercase',
  },
  salaryItemVal: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2D1E18',
    marginTop: 2,
  },
  netVal: {
    color: '#15803D',
    fontWeight: '900',
  },
  policyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFEBE9',
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  policyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#3E2723',
  },
  policyDesc: {
    fontSize: 11,
    color: '#6D4C41',
    lineHeight: 16,
    marginBottom: 16,
  },
  policyRuleBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5ECE8',
  },
  policyRuleName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4E342E',
  },
  policyRuleVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803D',
  },
});
