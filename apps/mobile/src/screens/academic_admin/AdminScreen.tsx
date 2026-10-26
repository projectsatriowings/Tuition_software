import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { useMobileAuth } from '../../context/AuthContext';
import { mobileApiFetch, generateIdempotencyKey } from '../../services/api';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { ReceiptModal } from '../../components/ReceiptModal';
import { themeTokens } from '@tuition/shared';

export const AdminScreen: React.FC = () => {
  const { user, institute } = useMobileAuth();

  const [activeTab, setActiveTab] = useState<'kpi' | 'finance' | 'students' | 'manualPayment'>('kpi');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Admin Data
  const [dashboardSummary, setDashboardSummary] = useState<any>(null);
  const [financialSummary, setFinancialSummary] = useState<any>(null);
  const [outstandingReport, setOutstandingReport] = useState<any>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  // Manual Payment Entry Form
  const [paymentStudentId, setPaymentStudentId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE'>('UPI');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  // Receipt Modal
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const fetchAdminData = useCallback(async () => {
    try {
      // 1. Dashboard Summary
      const dashRes = await mobileApiFetch('/institutes/dashboard/summary');
      if (dashRes.success) {
        setDashboardSummary(dashRes.data);
      }

      // 2. Financial Summary
      const finRes = await mobileApiFetch('/fees/reports/summary');
      if (finRes.success) {
        setFinancialSummary(finRes.data);
      }

      // 3. Outstanding Report
      const outRes = await mobileApiFetch('/fees/reports/outstanding');
      if (outRes.success) {
        setOutstandingReport(outRes.data);
      }

      // 4. Batches
      const batchRes = await mobileApiFetch('/academics/batches');
      if (batchRes.success && batchRes.data) {
        setBatches(Array.isArray(batchRes.data) ? batchRes.data : batchRes.data.batches || []);
      }

      // 5. Students
      const stuRes = await mobileApiFetch('/students');
      if (stuRes.success && stuRes.data) {
        setStudents(Array.isArray(stuRes.data) ? stuRes.data : stuRes.data.students || []);
      }
    } catch (e) {
      console.warn('Error loading admin mobile data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAdminData();
  };

  const handleRecordPayment = async () => {
    if (!paymentStudentId) {
      Alert.alert('Validation Error', 'Please select a student from the list');
      return;
    }
    const amt = parseFloat(paymentAmount.trim());
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid positive payment amount');
      return;
    }

    setPaymentSubmitting(true);
    try {
      const idempotencyKey = generateIdempotencyKey('PAY');
      const res = await mobileApiFetch('/fees/payments', {
        method: 'POST',
        idempotencyKey,
        body: {
          studentId: paymentStudentId.trim(),
          amount: amt,
          paymentMethod,
          transactionReference: paymentReference.trim() || undefined,
          paidAt: new Date().toISOString(),
        },
      });

      if (res.success && res.data) {
        Alert.alert('Payment Recorded!', `₹${amt} collected via ${paymentMethod}. Electronic receipt generated.`);
        setPaymentAmount('');
        setPaymentReference('');

        // Show receipt
        if (res.data.id) {
          const recRes = await mobileApiFetch(`/fees/payments/${res.data.id}/receipt`);
          if (recRes.success && recRes.data) {
            setSelectedReceipt(recRes.data);
            setShowReceiptModal(true);
          }
        }
        fetchAdminData();
      } else {
        Alert.alert('Payment Error', res.error || 'Failed to record payment');
      }
    } catch {
      Alert.alert('Error', 'Network or server issue.');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const formatRupee = (amt: number) => `₹${(amt || 0).toLocaleString('en-IN')}`;

  return (
    <View style={styles.container}>
      <Header
        title="Institute Director Portal"
        subtitle={institute?.name || 'Academic Administration'}
        onRefresh={onRefresh}
      />

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          onPress={() => setActiveTab('kpi')}
          style={[styles.tabItem, activeTab === 'kpi' && styles.activeTabItem]}
        >
          <Text style={[styles.tabText, activeTab === 'kpi' && styles.activeTabText]}>
            KPIs
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('finance')}
          style={[styles.tabItem, activeTab === 'finance' && styles.activeTabItem]}
        >
          <Text style={[styles.tabText, activeTab === 'finance' && styles.activeTabText]}>
            Finance (₹)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('manualPayment')}
          style={[styles.tabItem, activeTab === 'manualPayment' && styles.activeTabItem]}
        >
          <Text style={[styles.tabText, activeTab === 'manualPayment' && styles.activeTabText]}>
            Collect Fee
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('students')}
          style={[styles.tabItem, activeTab === 'students' && styles.activeTabItem]}
        >
          <Text style={[styles.tabText, activeTab === 'students' && styles.activeTabText]}>
            Directory ({students.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={themeTokens.colors.primary} />
          <Text style={styles.loadingText}>Compiling institute analytics...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeTokens.colors.primary} />}
        >
          {/* TAB 1: EXECUTIVE KPIs */}
          {activeTab === 'kpi' && (
            <View>
              {/* Institute Profile Badge */}
              <Card highlighted>
                <View style={styles.instituteRow}>
                  <View style={styles.instituteIconCircle}>
                    <Text style={styles.instituteIcon}>🏛️</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.instName}>{institute?.name || 'Apex Academy of Science'}</Text>
                    <Text style={styles.instMeta}>Code: {institute?.code || 'INST001'} • Academic Year 2026</Text>
                  </View>
                  <Badge label="ACTIVE INSTITUTE" variant="success" size="sm" />
                </View>
              </Card>

              {/* KPI Matrix */}
              <View style={styles.matrixGrid}>
                <View style={styles.kpiBox}>
                  <Text style={styles.kpiLabel}>TOTAL STUDENTS</Text>
                  <Text style={styles.kpiValue}>
                    {dashboardSummary?.studentsCount || students.length || 0}
                  </Text>
                  <Text style={styles.kpiSub}>Active Enrollment</Text>
                </View>

                <View style={styles.kpiBox}>
                  <Text style={styles.kpiLabel}>ACTIVE BATCHES</Text>
                  <Text style={styles.kpiValue}>
                    {dashboardSummary?.batchesCount || batches.length || 0}
                  </Text>
                  <Text style={styles.kpiSub}>Classes Running</Text>
                </View>

                <View style={styles.kpiBox}>
                  <Text style={styles.kpiLabel}>COLLECTED REVENUE</Text>
                  <Text style={[styles.kpiValue, { color: themeTokens.colors.success }]}>
                    {formatRupee(financialSummary?.totalCollected ?? financialSummary?.totalCollections ?? 0)}
                  </Text>
                  <Text style={styles.kpiSub}>Cleared to Date</Text>
                </View>

                <View style={styles.kpiBox}>
                  <Text style={styles.kpiLabel}>OUTSTANDING DUES</Text>
                  <Text style={[styles.kpiValue, { color: themeTokens.colors.error }]}>
                    {formatRupee(financialSummary?.totalOutstanding || 0)}
                  </Text>
                  <Text style={styles.kpiSub}>Pending Recovery</Text>
                </View>
              </View>

              {/* Attendance & Campus Operations Overview */}
              <Card style={{ marginTop: 14 }}>
                <Text style={styles.cardSectionTitle}>📡 Campus Gate & Attendance Summary</Text>
                <Text style={styles.opsNote}>
                  Live QR attendance scanning and SMS gate notifications are operational for all registered batches.
                </Text>
                <View style={styles.opsRow}>
                  <Badge label="QR SCANNER OPERATIONAL" variant="info" size="sm" />
                  <Badge label="SMS OUTBOX QUEUED" variant="success" size="sm" />
                </View>
              </Card>
            </View>
          )}

          {/* TAB 2: FINANCIAL SUMMARY & REPORTS */}
          {activeTab === 'finance' && (
            <View>
              <Card highlighted>
                <Text style={styles.feeTitle}>INSTITUTE TREASURY SUMMARY</Text>
                <View style={styles.finGrid}>
                  <View style={styles.finCol}>
                    <Text style={styles.finLabel}>Total Invoiced</Text>
                    <Text style={styles.finVal}>
                      {formatRupee(financialSummary?.totalAssigned ?? financialSummary?.totalInvoiced ?? 0)}
                    </Text>
                  </View>
                  <View style={styles.finCol}>
                    <Text style={styles.finLabel}>Collections</Text>
                    <Text style={[styles.finVal, { color: themeTokens.colors.success }]}>
                      {formatRupee(financialSummary?.totalCollected ?? financialSummary?.totalCollections ?? 0)}
                    </Text>
                  </View>
                  <View style={styles.finCol}>
                    <Text style={styles.finLabel}>Outstanding</Text>
                    <Text style={[styles.finVal, { color: themeTokens.colors.error }]}>
                      {formatRupee(financialSummary?.totalOutstanding || 0)}
                    </Text>
                  </View>
                </View>
              </Card>

              {/* Outstanding Receivables List */}
              <View style={[styles.sectionHeader, { marginTop: 14 }]}>
                <Text style={styles.sectionTitle}>⚠️ Outstanding Fees by Student</Text>
                <Text style={styles.sectionCount}>
                  {outstandingReport?.students?.length || 0} students
                </Text>
              </View>

              {outstandingReport?.students?.length === 0 ? (
                <Card><Text style={styles.emptyText}>All student fees are fully paid up! No outstanding dues.</Text></Card>
              ) : (
                outstandingReport?.students?.map((item: any) => (
                  <Card key={item.studentId}>
                    <View style={styles.outRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.outName}>{item.studentName || 'Student'}</Text>
                        <Text style={styles.outRoll}>Roll: {item.rollNumber} • Batch: {item.batchName}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.outAmt}>{formatRupee(item.balanceAmount)}</Text>
                        <Badge label="DUE" variant="danger" size="sm" />
                      </View>
                    </View>
                  </Card>
                ))
              )}
            </View>
          )}

          {/* TAB 3: COLLECT FEE (Manual Payment Entry) */}
          {activeTab === 'manualPayment' && (
            <View>
              <Card highlighted>
                <Text style={styles.formTitle}>Record Student Fee Payment</Text>
                <Text style={styles.formSubtitle}>
                  Issue an official receipt directly to student & parent with zero-duplicate idempotency protection.
                </Text>

                {/* Student Select */}
                <Text style={styles.inputLabel}>Select Enrolled Student:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.studentChipsScroll}>
                  {students.map((st) => {
                    const isSelected = paymentStudentId === st.id;
                    return (
                      <TouchableOpacity
                        key={st.id}
                        onPress={() => setPaymentStudentId(st.id)}
                        style={[styles.stChip, isSelected && styles.stChipActive]}
                      >
                        <Text style={[styles.stChipText, isSelected && styles.stChipTextActive]}>
                          {st.user?.fullName} ({st.rollNumber})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Amount */}
                <Text style={[styles.inputLabel, { marginTop: 14 }]}>Payment Amount (₹ INR):</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  placeholder="e.g. 5000"
                  placeholderTextColor={themeTokens.colors.textSubtle}
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                />

                {/* Payment Method Selector */}
                <Text style={[styles.inputLabel, { marginTop: 14 }]}>Payment Mode:</Text>
                <View style={styles.methodRow}>
                  {(['UPI', 'CASH', 'BANK_TRANSFER', 'CHEQUE'] as const).map((method) => {
                    const isSelected = paymentMethod === method;
                    return (
                      <TouchableOpacity
                        key={method}
                        onPress={() => setPaymentMethod(method)}
                        style={[styles.methodBtn, isSelected && styles.methodBtnActive]}
                      >
                        <Text style={[styles.methodBtnText, isSelected && styles.methodBtnTextActive]}>
                          {method}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Transaction Ref */}
                <Text style={[styles.inputLabel, { marginTop: 14 }]}>
                  Transaction Reference / UTR (Optional):
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. UPI/2026/0491823"
                  placeholderTextColor={themeTokens.colors.textSubtle}
                  value={paymentReference}
                  onChangeText={setPaymentReference}
                />

                <TouchableOpacity
                  onPress={handleRecordPayment}
                  style={styles.recordBtn}
                  disabled={paymentSubmitting}
                >
                  {paymentSubmitting ? (
                    <ActivityIndicator color={themeTokens.colors.textLight} size="small" />
                  ) : (
                    <Text style={styles.recordBtnText}>Collect Payment & Generate Receipt</Text>
                  )}
                </TouchableOpacity>
              </Card>
            </View>
          )}

          {/* TAB 4: STUDENTS & BATCHES DIRECTORY */}
          {activeTab === 'students' && (
            <View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>👨‍🎓 Student Directory</Text>
                <Text style={styles.sectionCount}>{students.length} enrolled</Text>
              </View>

              {students.map((st) => (
                <Card key={st.id}>
                  <View style={styles.stuDirRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.stuDirName}>{st.user?.fullName}</Text>
                      <Text style={styles.stuDirMeta}>
                        Roll: {st.rollNumber} • Batch: {st.batch?.name || 'Class 12'}
                      </Text>
                      <Text style={styles.stuDirEmail}>📧 {st.user?.email || 'N/A'}</Text>
                    </View>
                    <Badge label={st.status || 'ACTIVE'} variant="success" size="sm" />
                  </View>
                </Card>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Official Receipt Modal */}
      <ReceiptModal
        visible={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        receipt={selectedReceipt}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeTokens.colors.background,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: themeTokens.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: themeTokens.colors.border,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabItem: {
    borderBottomColor: themeTokens.colors.espresso,
  },
  tabText: {
    color: themeTokens.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  activeTabText: {
    color: themeTokens.colors.espresso,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    color: themeTokens.colors.textMuted,
    marginTop: 12,
    fontSize: 13,
  },
  instituteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  instituteIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: themeTokens.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instituteIcon: {
    fontSize: 22,
  },
  instName: {
    color: themeTokens.colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  instMeta: {
    color: themeTokens.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  matrixGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  kpiBox: {
    width: '48%',
    borderRadius: 14,
    padding: 14,
    backgroundColor: themeTokens.colors.surface,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    shadowColor: themeTokens.colors.espresso,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: themeTokens.colors.textMuted,
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '900',
    color: themeTokens.colors.textPrimary,
    marginVertical: 4,
  },
  kpiSub: {
    fontSize: 11,
    color: themeTokens.colors.taupe,
  },
  cardSectionTitle: {
    color: themeTokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  opsNote: {
    color: themeTokens.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  opsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  feeTitle: {
    color: themeTokens.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  finGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  finCol: {
    alignItems: 'center',
  },
  finLabel: {
    color: themeTokens.colors.textMuted,
    fontSize: 11,
  },
  finVal: {
    color: themeTokens.colors.textPrimary,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: themeTokens.colors.textPrimary,
  },
  sectionCount: {
    fontSize: 12,
    color: themeTokens.colors.primary,
    fontWeight: '600',
  },
  emptyText: {
    color: themeTokens.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 10,
  },
  outRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  outName: {
    color: themeTokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  outRoll: {
    color: themeTokens.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  outAmt: {
    color: themeTokens.colors.error,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  formTitle: {
    color: themeTokens.colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  formSubtitle: {
    color: themeTokens.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
    marginBottom: 14,
  },
  inputLabel: {
    color: themeTokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  studentChipsScroll: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  stChip: {
    backgroundColor: themeTokens.colors.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
  },
  stChipActive: {
    backgroundColor: themeTokens.colors.espresso,
    borderColor: themeTokens.colors.espresso,
  },
  stChipText: {
    color: themeTokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  stChipTextActive: {
    color: themeTokens.colors.textLight,
    fontWeight: 'bold',
  },
  textInput: {
    backgroundColor: themeTokens.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: themeTokens.colors.textPrimary,
    fontSize: 14,
  },
  methodRow: {
    flexDirection: 'row',
    gap: 6,
  },
  methodBtn: {
    flex: 1,
    backgroundColor: themeTokens.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  methodBtnActive: {
    backgroundColor: themeTokens.colors.espresso,
    borderColor: themeTokens.colors.espresso,
  },
  methodBtnText: {
    color: themeTokens.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  methodBtnTextActive: {
    color: themeTokens.colors.textLight,
    fontWeight: 'bold',
  },
  recordBtn: {
    backgroundColor: themeTokens.colors.espresso,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 18,
    shadowColor: themeTokens.colors.espresso,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  recordBtnText: {
    color: themeTokens.colors.textLight,
    fontWeight: 'bold',
    fontSize: 14,
  },
  stuDirRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stuDirName: {
    color: themeTokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  stuDirMeta: {
    color: themeTokens.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  stuDirEmail: {
    color: themeTokens.colors.textSubtle,
    fontSize: 11,
    marginTop: 4,
  },
});
