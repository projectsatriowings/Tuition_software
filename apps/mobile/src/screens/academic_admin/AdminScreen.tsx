import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { useMobileAuth } from '../../context/AuthContext';
import { useMobileToast } from '../../context/ToastContext';
import { mobileApiFetch, generateIdempotencyKey } from '../../services/api';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { ReceiptModal } from '../../components/ReceiptModal';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { StudentDetailsModal } from '../../components/StudentDetailsModal';
import { AdmitStudentModal } from '../../components/AdmitStudentModal';
import { themeTokens } from '@tuition/shared';

export const AdminScreen: React.FC = () => {
  const { user, institute } = useMobileAuth();
  const { showToast } = useMobileToast();

  const [activeTab, setActiveTab] = useState<'kpi' | 'batches' | 'finance' | 'students' | 'manualPayment'>('kpi');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Admin Data
  const [dashboardSummary, setDashboardSummary] = useState<any>(null);
  const [financialSummary, setFinancialSummary] = useState<any>(null);
  const [outstandingReport, setOutstandingReport] = useState<any>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  // Batch Creation State
  const [showNewBatchModal, setShowNewBatchModal] = useState(false);
  const [batchName, setBatchName] = useState('');
  const [batchYear, setBatchYear] = useState('2026-2027');
  const [batchSubmitting, setBatchSubmitting] = useState(false);

  // Modals
  const [showAdmitModal, setShowAdmitModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [statusConfirm, setStatusConfirm] = useState<{
    isOpen: boolean;
    student: any;
    newStatus: string;
    loading: boolean;
  }>({
    isOpen: false,
    student: null,
    newStatus: '',
    loading: false,
  });

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
      showToast('Please select a student from the list', 'warning');
      return;
    }
    const amt = parseFloat(paymentAmount.trim());
    if (isNaN(amt) || amt <= 0) {
      showToast('Please enter a valid positive payment amount', 'warning');
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
        showToast(`₹${amt} collected via ${paymentMethod}. Electronic receipt generated.`, 'success');
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
        showToast(res.error || 'Failed to record payment', 'error');
      }
    } catch {
      showToast('Network or server connection issue.', 'error');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleCreateBatch = async () => {
    if (!batchName.trim()) {
      showToast('Please enter batch name', 'warning');
      return;
    }
    setBatchSubmitting(true);
    try {
      const res = await mobileApiFetch('/academics/batches', {
        method: 'POST',
        body: {
          name: batchName.trim(),
          academicYear: batchYear.trim(),
        },
      });
      if (res.success) {
        showToast(`Batch '${batchName}' created successfully`, 'success');
        setShowNewBatchModal(false);
        setBatchName('');
        fetchAdminData();
      } else {
        showToast(res.error || 'Failed to create batch', 'error');
      }
    } catch {
      showToast('Network error creating batch', 'error');
    } finally {
      setBatchSubmitting(false);
    }
  };

  const handleToggleBatchStatus = async (batchId: string, currentStatus: boolean, bName: string) => {
    try {
      const res = await mobileApiFetch(`/academics/batches/${batchId}/status`, {
        method: 'PATCH',
        body: { isActive: !currentStatus },
      });
      if (res.success) {
        showToast(`Batch '${bName}' ${!currentStatus ? 'activated' : 'deactivated'}`, 'success');
        fetchAdminData();
      } else {
        showToast(res.error || 'Failed to update batch status', 'error');
      }
    } catch {
      showToast('Network error updating batch', 'error');
    }
  };

  const handleOpenStatusConfirm = (student: any, newStatus: string) => {
    setStatusConfirm({
      isOpen: true,
      student,
      newStatus,
      loading: false,
    });
  };

  const handleConfirmStatusChange = async () => {
    if (!statusConfirm.student || !statusConfirm.newStatus) return;
    setStatusConfirm((prev) => ({ ...prev, loading: true }));
    try {
      const res = await mobileApiFetch(`/students/${statusConfirm.student.id}/status`, {
        method: 'PATCH',
        body: {
          status: statusConfirm.newStatus,
          reason: `Status changed to ${statusConfirm.newStatus} by staff/admin`,
        },
      });
      if (res.success) {
        showToast(
          `${statusConfirm.student.firstName || statusConfirm.student.user?.fullName || 'Student'} marked as ${statusConfirm.newStatus.replace('_', ' ')}.`,
          'success'
        );
        setStatusConfirm({ isOpen: false, student: null, newStatus: '', loading: false });
        fetchAdminData();
      } else {
        showToast(res.error || 'Failed to update student status', 'error');
        setStatusConfirm((prev) => ({ ...prev, loading: false }));
      }
    } catch (e: any) {
      showToast(e.message || 'Network error', 'error');
      setStatusConfirm((prev) => ({ ...prev, loading: false }));
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
          onPress={() => setActiveTab('batches')}
          style={[styles.tabItem, activeTab === 'batches' && styles.activeTabItem]}
        >
          <Text style={[styles.tabText, activeTab === 'batches' && styles.activeTabText]}>
            Batches ({batches.length})
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
                <Text style={styles.cardSectionTitle}>📡 Campus Attendance & Notification Summary</Text>
                <Text style={styles.opsNote}>
                  Live voice-based attendance confirmation and SMS guardian notifications are operational for all registered batches.
                </Text>
                <View style={styles.opsRow}>
                  <Badge label="VOICE ATTENDANCE READY" variant="info" size="sm" />
                  <Badge label="SMS OUTBOX QUEUED" variant="success" size="sm" />
                </View>
              </Card>
            </View>
          )}

          {/* TAB 2: BATCHES & CURRICULUM */}
          {activeTab === 'batches' && (
            <View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🏫 Academic Batches ({batches.length})</Text>
                <TouchableOpacity
                  onPress={() => setShowNewBatchModal(true)}
                  style={styles.admitStudentBtn}
                >
                  <Text style={styles.admitStudentBtnText}>+ New Batch</Text>
                </TouchableOpacity>
              </View>

              {batches.length === 0 ? (
                <Card>
                  <Text style={styles.emptyText}>
                    No academic batches found. Click "+ New Batch" to set up your first class section.
                  </Text>
                </Card>
              ) : (
                batches.map((b) => (
                  <Card key={b.id}>
                    <View style={styles.stuDirRow}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={styles.stuDirName}>{b.name}</Text>
                          <Badge
                            label={b.isActive ? 'ACTIVE' : 'INACTIVE'}
                            variant={b.isActive ? 'success' : 'neutral'}
                            size="sm"
                          />
                        </View>
                        <Text style={styles.stuDirMeta}>
                          Academic Year: {b.academicYear} • Enrolled: {b._count?.enrollments || 0} students
                        </Text>
                        {b.batchSubjects && b.batchSubjects.length > 0 && (
                          <Text style={styles.stuDirEmail}>
                            Subjects: {b.batchSubjects.map((bs: any) => bs.subject?.name || bs.name).join(', ')}
                          </Text>
                        )}
                      </View>

                      <TouchableOpacity
                        style={b.isActive ? styles.actionBtnDisc : styles.actionBtnActive}
                        onPress={() => handleToggleBatchStatus(b.id, b.isActive, b.name)}
                      >
                        <Text style={b.isActive ? styles.actionBtnDiscText : styles.actionBtnActiveText}>
                          {b.isActive ? 'Deactivate' : 'Reactivate'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </Card>
                ))
              )}
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
                <View>
                  <Text style={styles.sectionTitle}>👨‍🎓 Student Directory</Text>
                  <Text style={styles.sectionCount}>{students.length} enrolled</Text>
                </View>
                <TouchableOpacity
                  style={styles.admitStudentBtn}
                  onPress={() => setShowAdmitModal(true)}
                >
                  <Text style={styles.admitStudentBtnText}>+ Admit Student</Text>
                </TouchableOpacity>
              </View>

              {students.map((st) => (
                <Card key={st.id} onPress={() => setSelectedStudentId(st.id)}>
                  <View style={styles.stuDirRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.stuDirName}>{st.user?.fullName || `${st.firstName} ${st.lastName}`}</Text>
                      <Text style={styles.stuDirMeta}>
                        Adm: {st.admissionNumber || '—'} {st.rollNumber ? `• Roll: ${st.rollNumber}` : ''}
                      </Text>
                      <Text style={styles.stuDirEmail}>
                        {st.enrollments?.[0]?.batch?.name ? `Class: ${st.enrollments[0].batch.name}` : (st.batch?.name ? `Class: ${st.batch.name}` : 'Unassigned')}
                      </Text>
                    </View>
                    <Badge
                      label={st.status || 'ACTIVE'}
                      variant={st.status === 'ACTIVE' ? 'success' : st.status === 'PASSED_OUT' ? 'indigo' : 'neutral'}
                      size="sm"
                    />
                  </View>

                  {/* Lifecycle Action Buttons */}
                  <View style={styles.actionRowContainer}>
                    <TouchableOpacity
                      style={styles.cardDetailsHint}
                      onPress={() => setSelectedStudentId(st.id)}
                    >
                      <Text style={styles.cardDetailsHintText}>Tap for Full Details ➔</Text>
                    </TouchableOpacity>

                    <View style={styles.actionBtnGroup}>
                      {st.status === 'ACTIVE' ? (
                        <>
                          <TouchableOpacity
                            style={styles.actionBtnPass}
                            onPress={() => handleOpenStatusConfirm(st, 'PASSED_OUT')}
                          >
                            <Text style={styles.actionBtnPassText}>Mark Passed</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.actionBtnDisc}
                            onPress={() => handleOpenStatusConfirm(st, 'DISCONTINUED')}
                          >
                            <Text style={styles.actionBtnDiscText}>Discontinue</Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <TouchableOpacity
                          style={styles.actionBtnActive}
                          onPress={() => handleOpenStatusConfirm(st, 'ACTIVE')}
                        >
                          <Text style={styles.actionBtnActiveText}>Reactivate</Text>
                        </TouchableOpacity>
                      )}
                    </View>
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

      {/* New Batch Modal */}
      <Modal visible={showNewBatchModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Academic Batch</Text>
            <Text style={styles.modalSub}>Configure a new class section for this institute</Text>

            <TextInput
              style={styles.textInput}
              placeholder="Batch Name (e.g. Class 10 - Batch A)"
              placeholderTextColor="#A1887F"
              value={batchName}
              onChangeText={setBatchName}
            />

            <TextInput
              style={[styles.textInput, { marginTop: 10 }]}
              placeholder="Academic Year (e.g. 2026-2027)"
              placeholderTextColor="#A1887F"
              value={batchYear}
              onChangeText={setBatchYear}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                onPress={() => setShowNewBatchModal(false)}
                style={{
                  flex: 1,
                  backgroundColor: themeTokens.colors.surfaceMuted,
                  borderWidth: 1,
                  borderColor: themeTokens.colors.border,
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: themeTokens.colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateBatch}
                style={{
                  flex: 1,
                  backgroundColor: themeTokens.colors.espresso,
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
                disabled={batchSubmitting}
              >
                {batchSubmitting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>Create Batch</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Admit Student Modal */}
      <AdmitStudentModal
        visible={showAdmitModal}
        onClose={() => setShowAdmitModal(false)}
        onSuccess={() => fetchAdminData()}
      />

      {/* Student Details Modal */}
      <StudentDetailsModal
        visible={Boolean(selectedStudentId)}
        studentId={selectedStudentId}
        onClose={() => setSelectedStudentId(null)}
        onStudentUpdated={fetchAdminData}
      />

      {/* Confirmation Modal for Lifecycle Status Actions */}
      <ConfirmationModal
        isOpen={statusConfirm.isOpen}
        title={
          statusConfirm.newStatus === 'PASSED_OUT'
            ? 'Mark Student as Passed Out'
            : statusConfirm.newStatus === 'DISCONTINUED'
            ? 'Discontinue Student'
            : 'Reactivate Student'
        }
        message={
          statusConfirm.newStatus === 'PASSED_OUT'
            ? `Are you sure you want to mark ${statusConfirm.student?.user?.fullName || statusConfirm.student?.firstName || 'this student'} as Passed Out? Active batch enrollments will be archived.`
            : statusConfirm.newStatus === 'DISCONTINUED'
            ? `Are you sure you want to discontinue ${statusConfirm.student?.user?.fullName || statusConfirm.student?.firstName || 'this student'}?`
            : `Are you sure you want to reactivate ${statusConfirm.student?.user?.fullName || statusConfirm.student?.firstName || 'this student'}?`
        }
        confirmLabel={
          statusConfirm.newStatus === 'PASSED_OUT'
            ? 'Confirm Passed Out'
            : statusConfirm.newStatus === 'DISCONTINUED'
            ? 'Confirm Discontinue'
            : 'Reactivate'
        }
        variant={statusConfirm.newStatus === 'DISCONTINUED' ? 'danger' : statusConfirm.newStatus === 'PASSED_OUT' ? 'warning' : 'primary'}
        loading={statusConfirm.loading}
        onConfirm={handleConfirmStatusChange}
        onCancel={() => setStatusConfirm({ isOpen: false, student: null, newStatus: '', loading: false })}
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
  admitStudentBtn: {
    backgroundColor: themeTokens.colors.espresso,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  admitStudentBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionRowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F7F2EF',
  },
  cardDetailsHint: {
    paddingVertical: 4,
  },
  cardDetailsHintText: {
    fontSize: 11,
    color: '#8D6E63',
    fontWeight: '600',
  },
  actionBtnGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtnPass: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#D8B4FE',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  actionBtnPassText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#6B21A8',
  },
  actionBtnDisc: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  actionBtnDiscText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#475569',
  },
  actionBtnActive: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  actionBtnActiveText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#166534',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(45, 30, 24, 0.65)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: themeTokens.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    padding: 20,
  },
  modalTitle: {
    color: themeTokens.colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSub: {
    color: themeTokens.colors.textMuted,
    fontSize: 13,
    marginBottom: 12,
  },
});
