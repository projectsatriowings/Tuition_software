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
import { ReceiptModal } from '../../components/ReceiptModal';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { NotificationModal } from '../../components/NotificationModal';
import { StudentDetailsModal } from '../../components/StudentDetailsModal';
import { AdmitStudentModal } from '../../components/AdmitStudentModal';
import { StaffAdminModal } from '../../components/StaffAdminModal';
import {
  AdminBottomNav,
  AdminActiveTab,
  AdminPrimaryTab,
} from './components/AdminBottomNav';
import { AdminHomeTab } from './components/AdminHomeTab';
import { AdminStudentsTab } from './components/AdminStudentsTab';
import { AdminStaffTab } from './components/AdminStaffTab';
import { AdminMoreTab } from './components/AdminMoreTab';

export const AdminScreen: React.FC = () => {
  const { user, institute, logout } = useMobileAuth();
  const { showToast } = useMobileToast();

  const [activeTab, setActiveTab] = useState<AdminActiveTab>('home');
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Admin Data
  const [dashboardSummary, setDashboardSummary] = useState<any>(null);
  const [financialSummary, setFinancialSummary] = useState<any>(null);
  const [outstandingReport, setOutstandingReport] = useState<any>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [showStaffModal, setShowStaffModal] = useState(false);

  // Materials & Homework overview
  const [materials, setMaterials] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);

  // Batch Creation State
  const [showNewBatchModal, setShowNewBatchModal] = useState(false);
  const [batchName, setBatchName] = useState('');
  const [batchYear, setBatchYear] = useState('2026-2027');
  const [batchSubmitting, setBatchSubmitting] = useState(false);

  // Student Lifecycle Modals
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

  // Manual Fee Collection Form
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

      // 6. Staff Directory
      const staffRes = await mobileApiFetch('/staff');
      if (staffRes.success && staffRes.data) {
        setStaffList(Array.isArray(staffRes.data) ? staffRes.data : staffRes.data.staff || []);
      }

      // 7. Materials & Exams
      const [matRes, exRes, revRes] = await Promise.all([
        mobileApiFetch('/materials'),
        mobileApiFetch('/exams'),
        mobileApiFetch('/reviews'),
      ]);
      if (matRes.success && matRes.data) {
        setMaterials(Array.isArray(matRes.data) ? matRes.data : matRes.data.materials || []);
      }
      if (exRes.success && exRes.data) {
        setExams(Array.isArray(exRes.data) ? exRes.data : exRes.data.exams || []);
      }
      if (revRes.success && revRes.data) {
        setReviews(Array.isArray(revRes.data) ? revRes.data : revRes.data.reviews || []);
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
    mobileApiFetch('/notifications/unread-count')
      .then((res) => {
        if (res.success && res.data?.unreadCount !== undefined) {
          setUnreadNotifCount(res.data.unreadCount);
        }
      })
      .catch(() => {});
  }, [fetchAdminData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAdminData();
    mobileApiFetch('/notifications/unread-count')
      .then((res) => {
        if (res.success && res.data?.unreadCount !== undefined) {
          setUnreadNotifCount(res.data.unreadCount);
        }
      })
      .catch(() => {});
  };

  // Fee Collection Handler
  const handleRecordPayment = async () => {
    if (!paymentStudentId) {
      showToast('Please select an enrolled student', 'warning');
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

        if (res.data.id) {
          const recRes = await mobileApiFetch(`/fees/payments/${res.data.id}/receipt`);
          if (recRes.success && recRes.data) {
            setSelectedReceipt(recRes.data.receipt || recRes.data);
            setShowReceiptModal(true);
          }
        }
        fetchAdminData();
      } else {
        showToast(res.error || 'Failed to record payment', 'error');
      }
    } catch {
      showToast('Network error while recording payment', 'error');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  // Batch Creation Handler
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

  // Toggle Batch Active Status
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

  // Toggle Staff Active Status
  const handleToggleStaffStatus = async (member: any) => {
    const isActive = member.status === 'ACTIVE' || member.isActive !== false;
    const newStatus = isActive ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await mobileApiFetch(`/staff/${member.id}/status`, {
        method: 'PATCH',
        body: { status: newStatus },
      });
      if (res.success) {
        showToast(`Staff member marked as ${newStatus}`, 'success');
        fetchAdminData();
      } else {
        showToast(res.error || 'Failed to update staff status', 'error');
      }
    } catch {
      showToast('Network error updating staff', 'error');
    }
  };

  // Student Lifecycle Status Confirmations
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
          reason: `Status changed to ${statusConfirm.newStatus} by academic director`,
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
      {/* Top Header */}
      <Header
        title="Institute Director Portal"
        subtitle={institute?.name || 'TuitionOS Academy'}
        onRefresh={onRefresh}
        onOpenNotifications={() => setShowNotificationModal(true)}
        unreadNotificationsCount={unreadNotifCount}
      />

      {/* Sub-view Breadcrumb Header */}
      {activeTab !== 'home' &&
        activeTab !== 'students' &&
        activeTab !== 'staff' &&
        activeTab !== 'academics' &&
        activeTab !== 'more' && (
          <View style={styles.subViewHeader}>
            <TouchableOpacity
              onPress={() => setActiveTab('more')}
              style={styles.backBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.backBtnText}>← Back to More Menu</Text>
            </TouchableOpacity>
            <Text style={styles.subViewTitle}>
              {activeTab === 'attendance'
                ? 'Campus Attendance & Safety Logs'
                : activeTab === 'fees'
                ? 'Fee Collections & Treasury'
                : activeTab === 'homework'
                ? 'Homework & Curriculum Files'
                : activeTab === 'exams'
                ? 'Exams & Result Publishing'
                : activeTab === 'timetable'
                ? 'Class Timetables & Schedules'
                : activeTab === 'reviews'
                ? 'Parent Reviews & Inquiries'
                : 'Institute Context & Policies'}
            </Text>
          </View>
        )}

      {/* Main Tab Content */}
      <View style={styles.content}>
        {/* TAB 1: EXECUTIVE HOME */}
        {activeTab === 'home' && (
          <AdminHomeTab
            user={user}
            institute={institute}
            dashboardSummary={dashboardSummary}
            financialSummary={financialSummary}
            batches={batches}
            students={students}
            staffList={staffList}
            outstandingReport={outstandingReport}
            loading={loading}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenAdmitModal={() => setShowAdmitModal(true)}
            onOpenStaffModal={() => setShowStaffModal(true)}
            onOpenNewBatchModal={() => setShowNewBatchModal(true)}
          />
        )}

        {/* TAB 2: STUDENTS DIRECTORY */}
        {activeTab === 'students' && (
          <AdminStudentsTab
            students={students}
            loading={loading}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onOpenAdmitModal={() => setShowAdmitModal(true)}
            onSelectStudent={(stId) => setSelectedStudentId(stId)}
            onStatusConfirm={handleOpenStatusConfirm}
          />
        )}

        {/* TAB 3: FACULTY & STAFF */}
        {activeTab === 'staff' && (
          <AdminStaffTab
            staffList={staffList}
            loading={loading}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onOpenStaffModal={() => setShowStaffModal(true)}
            onToggleStatus={handleToggleStaffStatus}
          />
        )}

        {/* TAB 4: ACADEMICS & BATCHES */}
        {activeTab === 'academics' && (
          <ScrollView
            style={styles.tabContent}
            contentContainerStyle={styles.tabScrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#4E342E"
              />
            }
          >
            <View style={styles.tabHeaderRow}>
              <View>
                <Text style={styles.tabHeading}>Academic Batches ({batches.length})</Text>
                <Text style={styles.tabSub}>
                  Class sections, curriculum subjects & active enrollments
                </Text>
              </View>
              <TouchableOpacity
                style={styles.actionPillBtn}
                onPress={() => setShowNewBatchModal(true)}
              >
                <Text style={styles.actionPillBtnText}>+ New Batch</Text>
              </TouchableOpacity>
            </View>

            {batches.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>🏫</Text>
                <Text style={styles.emptyTitle}>No Batches Found</Text>
                <Text style={styles.emptySub}>
                  Click '+ New Batch' above to configure your academy's first class section.
                </Text>
              </View>
            ) : (
              batches.map((b) => (
                <View key={b.id} style={styles.itemCard}>
                  <View style={styles.itemCardHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.itemCardTitle}>{b.name}</Text>
                        <View
                          style={[
                            styles.statusBadge,
                            b.isActive !== false ? styles.badgeGreen : styles.badgeGray,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              b.isActive !== false ? styles.badgeGreenText : styles.badgeGrayText,
                            ]}
                          >
                            {b.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.itemCardSub}>
                        Academic Year: {b.academicYear} &bull; {b._count?.enrollments || 0} students enrolled
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.toggleBtn,
                        b.isActive !== false ? styles.toggleBtnDeact : styles.toggleBtnReact,
                      ]}
                      onPress={() => handleToggleBatchStatus(b.id, b.isActive !== false, b.name)}
                    >
                      <Text
                        style={[
                          styles.toggleBtnText,
                          b.isActive !== false ? styles.toggleTextDeact : styles.toggleTextReact,
                        ]}
                      >
                        {b.isActive !== false ? 'Deactivate' : 'Reactivate'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {b.batchSubjects && b.batchSubjects.length > 0 && (
                    <View style={styles.subjectsContainer}>
                      <Text style={styles.subjectsLabel}>Assigned Subjects:</Text>
                      <View style={styles.subjectsPillRow}>
                        {b.batchSubjects.map((bs: any, idx: number) => (
                          <View key={idx} style={styles.subjectPill}>
                            <Text style={styles.subjectPillText}>
                              {bs.subject?.name || bs.name || 'Subject'}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        )}

        {/* TAB 5: MORE MENU */}
        {activeTab === 'more' && (
          <AdminMoreTab
            user={user}
            institute={institute}
            unreadCount={unreadNotifCount}
            financialSummary={financialSummary}
            outstandingReport={outstandingReport}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenNotifications={() => setShowNotificationModal(true)}
            onSignOut={logout}
          />
        )}

        {/* SUB-VIEW: CAMPUS ATTENDANCE */}
        {activeTab === 'attendance' && (
          <ScrollView
            style={styles.tabContent}
            contentContainerStyle={styles.tabScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.tabHeaderRow}>
              <View>
                <Text style={styles.tabHeading}>Campus Attendance Logs</Text>
                <Text style={styles.tabSub}>
                  Voice recognition verification and parent gate notifications
                </Text>
              </View>
            </View>

            <View style={styles.itemCard}>
              <Text style={styles.sectionHeading}>VOICE ROLL CALL & GATE STATUS</Text>
              <Text style={styles.opsDesc}>
                Real-time voice-based attendance verification and automated SMS/in-app gate check-in & check-out notices are actively running across all {batches.length} batches.
              </Text>
              <View style={styles.opsBadgeRow}>
                <View style={[styles.statusBadge, styles.badgeGreen]}>
                  <Text style={[styles.statusBadgeText, styles.badgeGreenText]}>
                    VOICE AI OPERATIONAL
                  </Text>
                </View>
                <View style={[styles.statusBadge, styles.badgeBlue]}>
                  <Text style={[styles.statusBadgeText, styles.badgeBlueText]}>
                    GATE ALERTS ACTIVE
                  </Text>
                </View>
              </View>
            </View>

            <Text style={[styles.sectionHeading, { marginTop: 14 }]}>
              BATCH ATTENDANCE READINESS ({batches.length})
            </Text>

            {batches.map((b) => (
              <View key={b.id} style={styles.itemCard}>
                <View style={styles.itemCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemCardTitle}>{b.name}</Text>
                    <Text style={styles.itemCardSub}>
                      {b._count?.enrollments || 0} active students enrolled
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, styles.badgeGreen]}>
                    <Text style={[styles.statusBadgeText, styles.badgeGreenText]}>
                      READY
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {/* SUB-VIEW: FEES & TREASURY */}
        {activeTab === 'fees' && (
          <ScrollView
            style={styles.tabContent}
            contentContainerStyle={styles.tabScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.tabHeaderRow}>
              <View>
                <Text style={styles.tabHeading}>Fee Collections & Treasury</Text>
                <Text style={styles.tabSub}>
                  Record student payments & manage outstanding dues
                </Text>
              </View>
            </View>

            {/* Treasury Overview Card */}
            <View style={styles.itemCard}>
              <Text style={styles.sectionHeading}>INSTITUTE TREASURY SUMMARY</Text>
              <View style={styles.metricTripletRow}>
                <View style={styles.metricTripletCol}>
                  <Text style={styles.metricTripletLabel}>TOTAL INVOICED</Text>
                  <Text style={styles.metricTripletVal}>
                    {formatRupee(financialSummary?.totalAssigned ?? financialSummary?.totalInvoiced ?? 0)}
                  </Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricTripletCol}>
                  <Text style={styles.metricTripletLabel}>COLLECTIONS</Text>
                  <Text style={[styles.metricTripletVal, { color: '#059669' }]}>
                    {formatRupee(financialSummary?.totalCollected ?? financialSummary?.totalCollections ?? 0)}
                  </Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricTripletCol}>
                  <Text style={styles.metricTripletLabel}>OUTSTANDING</Text>
                  <Text
                    style={[
                      styles.metricTripletVal,
                      { color: (financialSummary?.totalOutstanding || 0) > 0 ? '#DC2626' : '#2D1E18' },
                    ]}
                  >
                    {formatRupee(financialSummary?.totalOutstanding || 0)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Manual Payment Collection Form */}
            <View style={[styles.itemCard, { marginTop: 12 }]}>
              <Text style={styles.sectionHeading}>RECORD STUDENT FEE PAYMENT</Text>
              <Text style={styles.formHelpText}>
                Issue an electronic receipt directly with zero-duplicate protection.
              </Text>

              {/* Student Picker */}
              <Text style={styles.inputFieldLabel}>Select Enrolled Student:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsScrollContent}
              >
                {students.map((st) => {
                  const isSel = paymentStudentId === st.id;
                  const name = st.user?.fullName || `${st.firstName || ''} ${st.lastName || ''}`.trim();
                  return (
                    <TouchableOpacity
                      key={st.id}
                      onPress={() => setPaymentStudentId(st.id)}
                      style={[styles.stChip, isSel && styles.stChipActive]}
                    >
                      <Text style={[styles.stChipText, isSel && styles.stChipTextActive]}>
                        {name} ({st.admissionNumber || '—'})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Amount */}
              <Text style={[styles.inputFieldLabel, { marginTop: 12 }]}>
                Payment Amount (₹ INR):
              </Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                placeholder="e.g. 5000"
                placeholderTextColor="#8D6E63"
                value={paymentAmount}
                onChangeText={setPaymentAmount}
              />

              {/* Payment Mode Selector */}
              <Text style={[styles.inputFieldLabel, { marginTop: 12 }]}>
                Payment Mode:
              </Text>
              <View style={styles.paymentMethodRow}>
                {(['UPI', 'CASH', 'BANK_TRANSFER', 'CHEQUE'] as const).map((method) => {
                  const isSel = paymentMethod === method;
                  return (
                    <TouchableOpacity
                      key={method}
                      onPress={() => setPaymentMethod(method)}
                      style={[styles.methodBtn, isSel && styles.methodBtnActive]}
                    >
                      <Text style={[styles.methodBtnText, isSel && styles.methodBtnTextActive]}>
                        {method}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Transaction Ref */}
              <Text style={[styles.inputFieldLabel, { marginTop: 12 }]}>
                Transaction Reference / UTR (Optional):
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. UPI/2026/0491823"
                placeholderTextColor="#8D6E63"
                value={paymentReference}
                onChangeText={setPaymentReference}
              />

              <TouchableOpacity
                onPress={handleRecordPayment}
                style={[
                  styles.submitPaymentBtn,
                  paymentSubmitting && styles.submitPaymentBtnDisabled,
                ]}
                disabled={paymentSubmitting}
              >
                {paymentSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitPaymentBtnText}>
                    Collect Payment & Generate Receipt
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Outstanding Receivables */}
            <Text style={[styles.sectionHeading, { marginTop: 16 }]}>
              ⚠️ OUTSTANDING DUES BY STUDENT ({outstandingReport?.students?.length || 0})
            </Text>

            {outstandingReport?.students?.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>🎉</Text>
                <Text style={styles.emptyTitle}>All Student Fees Cleared</Text>
                <Text style={styles.emptySub}>
                  No outstanding receivables currently recorded for this institute.
                </Text>
              </View>
            ) : (
              outstandingReport?.students?.map((item: any) => (
                <View key={item.studentId} style={styles.itemCard}>
                  <View style={styles.itemCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemCardTitle}>{item.studentName}</Text>
                      <Text style={styles.itemCardSub}>
                        Adm: {item.admissionNumber || item.rollNumber || '—'} &bull; Batch: {item.batchName}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.itemCardTitle, { color: '#DC2626' }]}>
                        {formatRupee(item.balanceAmount)}
                      </Text>
                      <View style={[styles.statusBadge, styles.badgeDanger]}>
                        <Text style={[styles.statusBadgeText, styles.badgeDangerText]}>
                          DUE
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )}

        {/* SUB-VIEW: HOMEWORK & CURRICULUM */}
        {activeTab === 'homework' && (
          <ScrollView
            style={styles.tabContent}
            contentContainerStyle={styles.tabScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.tabHeaderRow}>
              <View>
                <Text style={styles.tabHeading}>Curriculum & Homework</Text>
                <Text style={styles.tabSub}>
                  {materials.length} learning files published across all batches
                </Text>
              </View>
            </View>

            {materials.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>📚</Text>
                <Text style={styles.emptyTitle}>No Materials Found</Text>
                <Text style={styles.emptySub}>
                  Faculty members have not uploaded batch study materials yet.
                </Text>
              </View>
            ) : (
              materials.map((m) => (
                <View key={m.id} style={styles.itemCard}>
                  <View style={styles.itemCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemCardTitle}>{m.title}</Text>
                      <Text style={styles.itemCardSub}>
                        {m.subject?.name || m.subject || 'Class Subject'} &bull; Type: {m.type}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, styles.badgeBlue]}>
                      <Text style={[styles.statusBadgeText, styles.badgeBlueText]}>
                        PUBLISHED
                      </Text>
                    </View>
                  </View>
                  {m.description ? (
                    <Text style={styles.opsDesc}>{m.description}</Text>
                  ) : null}
                  <Text style={styles.itemDateText}>
                    📅 Uploaded: {new Date(m.createdAt).toLocaleDateString('en-IN')}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        )}

        {/* SUB-VIEW: EXAMS & RESULTS */}
        {activeTab === 'exams' && (
          <ScrollView
            style={styles.tabContent}
            contentContainerStyle={styles.tabScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.tabHeaderRow}>
              <View>
                <Text style={styles.tabHeading}>Examinations ({exams.length})</Text>
                <Text style={styles.tabSub}>
                  Test schedules and published grade results
                </Text>
              </View>
            </View>

            {exams.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>🏆</Text>
                <Text style={styles.emptyTitle}>No Scheduled Exams</Text>
                <Text style={styles.emptySub}>
                  There are no examinations scheduled or published yet.
                </Text>
              </View>
            ) : (
              exams.map((ex) => (
                <View key={ex.id} style={styles.itemCard}>
                  <View style={styles.itemCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemCardTitle}>{ex.title}</Text>
                      <Text style={styles.itemCardSub}>
                        {ex.subject?.name || ex.subject || 'Subject'} &bull; Total: {ex.totalMarks || 100} pts
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        ex.isResultsPublished ? styles.badgeGreen : styles.badgeBlue,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          ex.isResultsPublished ? styles.badgeGreenText : styles.badgeBlueText,
                        ]}
                      >
                        {ex.isResultsPublished ? 'RESULTS PUBLISHED' : 'SCHEDULED'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.itemDateText}>
                    📅 Exam Date: {new Date(ex.examDate).toLocaleDateString('en-IN')}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        )}

        {/* SUB-VIEW: TIMETABLES */}
        {activeTab === 'timetable' && (
          <ScrollView
            style={styles.tabContent}
            contentContainerStyle={styles.tabScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.tabHeaderRow}>
              <View>
                <Text style={styles.tabHeading}>Master Timetable</Text>
                <Text style={styles.tabSub}>
                  Weekly class schedules for all {batches.length} batches
                </Text>
              </View>
            </View>

            {batches.map((b) => (
              <View key={b.id} style={styles.itemCard}>
                <Text style={styles.itemCardTitle}>{b.name}</Text>
                <Text style={styles.itemCardSub}>
                  Academic Year: {b.academicYear}
                </Text>
                {b.batchSubjects && b.batchSubjects.length > 0 ? (
                  <View style={{ marginTop: 8 }}>
                    {b.batchSubjects.map((bs: any, idx: number) => (
                      <View key={idx} style={styles.timetableRow}>
                        <Text style={styles.timetableSubject}>
                          📖 {bs.subject?.name || bs.name}
                        </Text>
                        <Text style={styles.timetableSchedule}>
                          {bs.schedule || 'Scheduled session'}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={[styles.opsDesc, { marginTop: 6 }]}>
                    No subject timetables linked yet.
                  </Text>
                )}
              </View>
            ))}
          </ScrollView>
        )}

        {/* SUB-VIEW: PARENT REVIEWS & INQUIRIES */}
        {activeTab === 'reviews' && (
          <ScrollView
            style={styles.tabContent}
            contentContainerStyle={styles.tabScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.tabHeaderRow}>
              <View>
                <Text style={styles.tabHeading}>Guardian Inquiries & Feedback</Text>
                <Text style={styles.tabSub}>
                  Parent ratings, private questions & official responses
                </Text>
              </View>
            </View>

            {reviews.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>⭐</Text>
                <Text style={styles.emptyTitle}>No Reviews Found</Text>
                <Text style={styles.emptySub}>
                  No parent reviews or private inquiries submitted yet.
                </Text>
              </View>
            ) : (
              reviews.map((rev) => (
                <View key={rev.id} style={styles.itemCard}>
                  <View style={styles.itemCardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.starsText}>
                        {'★'.repeat(rev.rating || 5)}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          rev.status === 'RESOLVED'
                            ? styles.badgeGreen
                            : rev.status === 'REPLIED'
                            ? styles.badgeBlue
                            : styles.badgeOrange,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            rev.status === 'RESOLVED'
                              ? styles.badgeGreenText
                              : rev.status === 'REPLIED'
                              ? styles.badgeBlueText
                              : styles.badgeOrangeText,
                          ]}
                        >
                          {rev.status || 'NEW'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.itemDateText}>
                      📅 {new Date(rev.createdAt).toLocaleDateString('en-IN')}
                    </Text>
                  </View>

                  {rev.subject ? (
                    <Text style={styles.reviewSubjectText}>{rev.subject}</Text>
                  ) : null}

                  <Text style={styles.opsDesc}>
                    {rev.reviewText || rev.comment}
                  </Text>

                  {(rev.replyText || rev.response) && (
                    <View style={styles.replyBox}>
                      <Text style={styles.replyBoxTitle}>Academy Reply:</Text>
                      <Text style={styles.replyBoxText}>
                        {rev.replyText || rev.response}
                      </Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        )}

        {/* SUB-VIEW: SETTINGS & CONTEXT */}
        {activeTab === 'settings' && (
          <ScrollView
            style={styles.tabContent}
            contentContainerStyle={styles.tabScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.tabHeaderRow}>
              <View>
                <Text style={styles.tabHeading}>Institute Context & Policies</Text>
                <Text style={styles.tabSub}>
                  Isolation boundaries & campus configuration
                </Text>
              </View>
            </View>

            <View style={styles.itemCard}>
              <Text style={styles.sectionHeading}>INSTITUTE PROFILE</Text>
              <View style={styles.profileRow}>
                <Text style={styles.profileFieldLabel}>Institute Name:</Text>
                <Text style={styles.profileFieldValue}>
                  {institute?.name || 'TuitionOS Academy'}
                </Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileFieldLabel}>Institute Code:</Text>
                <Text style={styles.profileFieldValue}>
                  {institute?.code || 'INST001'}
                </Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileFieldLabel}>Academic Year:</Text>
                <Text style={styles.profileFieldValue}>2026-2027</Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileFieldLabel}>Security Isolation:</Text>
                <Text style={[styles.profileFieldValue, { color: '#059669' }]}>
                  Institute Scoped ✓
                </Text>
              </View>
            </View>

            <View style={[styles.itemCard, { marginTop: 12 }]}>
              <Text style={styles.sectionHeading}>SECURITY & ROLE BOUNDARIES</Text>
              <Text style={styles.opsDesc}>
                This session is strictly authorized under ACADEMIC_ADMIN authority. All operations are isolated to this institute. Super-Admin lifecycle operations (tenant creation, billing subscription) are strictly partitioned.
              </Text>
            </View>
          </ScrollView>
        )}
      </View>

      {/* New Batch Modal */}
      <Modal visible={showNewBatchModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Academic Batch</Text>
            <Text style={styles.modalSub}>
              Configure a new class section for this institute
            </Text>

            <TextInput
              style={styles.textInput}
              placeholder="Batch Name (e.g. Class 10 - Batch A)"
              placeholderTextColor="#8D6E63"
              value={batchName}
              onChangeText={setBatchName}
            />

            <TextInput
              style={[styles.textInput, { marginTop: 10 }]}
              placeholder="Academic Year (e.g. 2026-2027)"
              placeholderTextColor="#8D6E63"
              value={batchYear}
              onChangeText={setBatchYear}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                onPress={() => setShowNewBatchModal(false)}
                style={styles.modalCancelBtn}
                disabled={batchSubmitting}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateBatch}
                style={[
                  styles.modalSubmitBtn,
                  batchSubmitting && styles.modalSubmitBtnDisabled,
                ]}
                disabled={batchSubmitting}
              >
                {batchSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Create Batch</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Official Receipt Modal */}
      <ReceiptModal
        visible={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        receipt={selectedReceipt}
      />

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

      {/* Staff Admin Modal */}
      <StaffAdminModal
        isOpen={showStaffModal}
        onClose={() => setShowStaffModal(false)}
        batches={batches}
        onStaffCreated={fetchAdminData}
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
        variant={
          statusConfirm.newStatus === 'DISCONTINUED'
            ? 'danger'
            : statusConfirm.newStatus === 'PASSED_OUT'
            ? 'warning'
            : 'primary'
        }
        loading={statusConfirm.loading}
        onConfirm={handleConfirmStatusChange}
        onCancel={() =>
          setStatusConfirm({ isOpen: false, student: null, newStatus: '', loading: false })
        }
      />

      {/* Notification Modal */}
      <NotificationModal
        visible={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        onUnreadCountChange={setUnreadNotifCount}
      />

      {/* Pinned Bottom Navigation */}
      <AdminBottomNav
        activeTab={activeTab}
        onSelectTab={(tab: AdminPrimaryTab) => setActiveTab(tab)}
        unreadCount={unreadNotifCount}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F5',
  },
  content: {
    flex: 1,
  },

  // Sub-view breadcrumb bar
  subViewHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEBE9',
  },
  backBtn: {
    paddingVertical: 2,
    marginBottom: 4,
  },
  backBtnText: {
    fontSize: 12,
    color: '#4E342E',
    fontWeight: '700',
  },
  subViewTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2D1E18',
  },

  // Tab Content
  tabContent: {
    flex: 1,
  },
  tabScrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  tabHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tabHeading: {
    fontSize: 19,
    fontWeight: '800',
    color: '#2D1E18',
  },
  tabSub: {
    fontSize: 11,
    color: '#8D6E63',
    marginTop: 2,
  },
  actionPillBtn: {
    backgroundColor: '#4E342E',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  actionPillBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },

  // Item Card Common
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    marginBottom: 10,
    shadowColor: '#2D1E18',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  itemCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2D1E18',
  },
  itemCardSub: {
    fontSize: 11,
    color: '#8D6E63',
    marginTop: 1,
  },
  itemDateText: {
    fontSize: 10,
    color: '#8D6E63',
    marginTop: 6,
  },

  // Status Badges
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
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

  // Toggle button
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  toggleBtnDeact: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  toggleBtnReact: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  toggleBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
  toggleTextDeact: {
    color: '#DC2626',
  },
  toggleTextReact: {
    color: '#059669',
  },

  // Subjects in Batch
  subjectsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5ECE8',
  },
  subjectsLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8D6E63',
    marginBottom: 4,
  },
  subjectsPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  subjectPill: {
    backgroundColor: '#F5ECE8',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  subjectPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4E342E',
  },

  // Operations Description
  opsDesc: {
    fontSize: 12,
    color: '#6D4C41',
    lineHeight: 16,
    marginTop: 6,
  },
  opsBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8D6E63',
    letterSpacing: 0.8,
    marginBottom: 6,
  },

  // Metric Triplet Row
  metricTripletRow: {
    flexDirection: 'row',
    backgroundColor: '#FAF7F5',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    marginTop: 8,
  },
  metricTripletCol: {
    flex: 1,
    alignItems: 'center',
  },
  metricTripletLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8D6E63',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metricTripletVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2D1E18',
  },
  metricDivider: {
    width: 1,
    backgroundColor: '#EFEBE9',
  },

  // Form Fields
  formHelpText: {
    fontSize: 11,
    color: '#8D6E63',
    marginBottom: 10,
  },
  inputFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4E342E',
    marginBottom: 4,
  },
  chipsScrollContent: {
    gap: 8,
    paddingVertical: 2,
  },
  stChip: {
    backgroundColor: '#FAF7F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#D7CCC8',
  },
  stChipActive: {
    backgroundColor: '#4E342E',
    borderColor: '#4E342E',
  },
  stChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4E342E',
  },
  stChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: '#FAF7F5',
    borderWidth: 1,
    borderColor: '#D7CCC8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#2D1E18',
  },
  paymentMethodRow: {
    flexDirection: 'row',
    gap: 8,
  },
  methodBtn: {
    flex: 1,
    backgroundColor: '#FAF7F5',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D7CCC8',
  },
  methodBtnActive: {
    backgroundColor: '#4E342E',
    borderColor: '#4E342E',
  },
  methodBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4E342E',
  },
  methodBtnTextActive: {
    color: '#FFFFFF',
  },
  submitPaymentBtn: {
    backgroundColor: '#4E342E',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 14,
  },
  submitPaymentBtnDisabled: {
    opacity: 0.6,
  },
  submitPaymentBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  // Timetable row
  timetableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F5ECE8',
  },
  timetableSubject: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2D1E18',
  },
  timetableSchedule: {
    fontSize: 11,
    color: '#8D6E63',
  },

  // Reviews
  starsText: {
    fontSize: 14,
    color: '#F59E0B',
  },
  reviewSubjectText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2D1E18',
    marginTop: 6,
  },
  replyBox: {
    backgroundColor: '#FAF7F5',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4E342E',
  },
  replyBoxTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4E342E',
    marginBottom: 2,
  },
  replyBoxText: {
    fontSize: 11,
    color: '#2D1E18',
  },

  // Settings
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#F5ECE8',
  },
  profileFieldLabel: {
    fontSize: 12,
    color: '#8D6E63',
    fontWeight: '600',
  },
  profileFieldValue: {
    fontSize: 12,
    color: '#2D1E18',
    fontWeight: '700',
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2D1E18',
  },
  modalSub: {
    fontSize: 11,
    color: '#8D6E63',
    marginTop: 2,
    marginBottom: 12,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 14,
  },
  modalCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modalCancelBtnText: {
    fontSize: 12,
    color: '#6D4C41',
    fontWeight: '600',
  },
  modalSubmitBtn: {
    backgroundColor: '#4E342E',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  modalSubmitBtnDisabled: {
    opacity: 0.6,
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Empty Card
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EFEBE9',
    marginTop: 10,
  },
  emptyIcon: {
    fontSize: 36,
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
    lineHeight: 16,
  },
});
