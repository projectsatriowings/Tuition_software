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
  Modal,
} from 'react-native';
import { useMobileAuth } from '../../context/AuthContext';
import { mobileApiFetch } from '../../services/api';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { ReceiptModal } from '../../components/ReceiptModal';
import { NotificationModal } from '../../components/NotificationModal';
import { PushNotificationService } from '../../services/pushNotification.service';
import { themeTokens } from '@tuition/shared';

export const ParentScreen: React.FC = () => {
  const { user } = useMobileAuth();

  const [activeTab, setActiveTab] = useState<'children' | 'academics' | 'fees' | 'messages' | 'reviews'>('children');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Parent Data
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [childStatement, setChildStatement] = useState<any>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [homeworkList, setHomeworkList] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversation, setActiveConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [reviews, setReviews] = useState<any[]>([]);
  const [childExams, setChildExams] = useState<any[]>([]);
  const [childReportCard, setChildReportCard] = useState<any>(null);
  const [childProgressReports, setChildProgressReports] = useState<any[]>([]);

  // Receipt Modal
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // New Review Modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const formatKolkataTime = (isoString?: string | null) => {
    if (!isoString) return 'Not available';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return 'Not available';
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(date);
    } catch {
      return 'Not available';
    }
  };

  const fetchParentData = useCallback(async () => {
    try {
      // 1. Fetch Verified Linked Children
      const kidsRes = await mobileApiFetch('/parents/my/children');
      const rawList = Array.isArray(kidsRes.data)
        ? kidsRes.data
        : (Array.isArray(kidsRes.data?.children)
            ? kidsRes.data.children.map((c: any) => ({
                ...(c.student || {}),
                relationship: c.relationship,
                isPrimaryContact: c.isPrimaryContact,
                canReceiveSms: c.canReceiveSms,
              }))
            : []);
      if (kidsRes.success && rawList.length > 0) {
        setChildren(rawList);
        if (!selectedChild) {
          const firstKid = rawList[0];
          setSelectedChild(firstKid);
          loadChildDetails(firstKid.id);
        } else {
          loadChildDetails(selectedChild.id);
        }
      } else if (kidsRes.success) {
        setChildren([]);
      }

      // 2. Fetch Conversations
      const convRes = await mobileApiFetch('/messaging/conversations');
      if (convRes.success && convRes.data) {
        setConversations(Array.isArray(convRes.data) ? convRes.data : convRes.data.conversations || []);
      }

      // 3. Fetch Reviews
      const revRes = await mobileApiFetch('/reviews');
      if (revRes.success && revRes.data) {
        setReviews(Array.isArray(revRes.data) ? revRes.data : revRes.data.reviews || []);
      }
    } catch (e) {
      console.warn('Error fetching parent mobile data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedChild]);

  const loadChildDetails = async (childStudentId: string) => {
    try {
      // Fetch Child Fee Statement
      const stmtRes = await mobileApiFetch(`/fees/students/${childStudentId}/statement`);
      if (stmtRes.success) {
        setChildStatement(stmtRes.data);
      }

      // Fetch Materials & Homework
      const matRes = await mobileApiFetch('/materials');
      if (matRes.success && matRes.data) {
        setMaterials(Array.isArray(matRes.data) ? matRes.data : matRes.data.materials || []);
      }

      const hwRes = await mobileApiFetch('/homework');
      if (hwRes.success && hwRes.data) {
        setHomeworkList(Array.isArray(hwRes.data) ? hwRes.data : hwRes.data.homework || []);
      }

      const [exRes, rcRes, acadRes] = await Promise.all([
        mobileApiFetch('/exams?status=PUBLISHED'),
        mobileApiFetch(`/exams/students/${childStudentId}/report-card`),
        mobileApiFetch(`/parents/students/${childStudentId}/academics`),
      ]);
      if (exRes.success && exRes.data) {
        setChildExams(Array.isArray(exRes.data) ? exRes.data : exRes.data.exams || []);
      }
      if (rcRes.success && rcRes.data) {
        setChildReportCard(rcRes.data);
      }
      if (acadRes.success && acadRes.data?.feedbacks) {
        setChildProgressReports(acadRes.data.feedbacks);
      }
    } catch (e) {
      console.warn('Error loading child details:', e);
    }
  };

  useEffect(() => {
    fetchParentData();
    PushNotificationService.registerPushToken().catch(() => {});
    mobileApiFetch('/notifications/unread-count')
      .then((res) => {
        if (res.success && res.data?.unreadCount !== undefined) {
          setUnreadNotifCount(res.data.unreadCount);
        }
      })
      .catch(() => {});
  }, [fetchParentData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchParentData();
    PushNotificationService.registerPushToken().catch(() => {});
    mobileApiFetch('/notifications/unread-count')
      .then((res) => {
        if (res.success && res.data?.unreadCount !== undefined) {
          setUnreadNotifCount(res.data.unreadCount);
        }
      })
      .catch(() => {});
  };

  const handleSelectChild = (child: any) => {
    setSelectedChild(child);
    loadChildDetails(child.id);
  };

  const openConversation = async (conv: any) => {
    setActiveConversation(conv);
    try {
      const msgRes = await mobileApiFetch(`/messaging/conversations/${conv.id}/messages`);
      if (msgRes.success && msgRes.data) {
        setMessages(Array.isArray(msgRes.data) ? msgRes.data : msgRes.data.messages || []);
      }
    } catch {
      Alert.alert('Error', 'Unable to load message thread.');
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeConversation) return;

    try {
      const res = await mobileApiFetch(`/messaging/conversations/${activeConversation.id}/messages`, {
        method: 'POST',
        body: { body: newMessage.trim() },
      });
      if (res.success) {
        setNewMessage('');
        const msgRes = await mobileApiFetch(`/messaging/conversations/${activeConversation.id}/messages`);
        if (msgRes.success && msgRes.data) {
          setMessages(Array.isArray(msgRes.data) ? msgRes.data : msgRes.data.messages || []);
        }
      }
    } catch {
      Alert.alert('Error', 'Could not send message.');
    }
  };

  const handleOpenReceipt = async (paymentId: string) => {
    try {
      const res = await mobileApiFetch(`/fees/payments/${paymentId}/receipt`);
      if (res.success && res.data) {
        const r = res.data.receipt || res.data;
        setSelectedReceipt({
          receiptNumber: r.receiptNumber || `REC-${paymentId.slice(0, 8)}`,
          transactionReference: r.payment?.transactionReference || r.transactionReference,
          studentName: r.student?.fullName || selectedChild?.user?.fullName || 'Child',
          studentRoll: r.student?.rollNumber || selectedChild?.rollNumber,
          batchName: r.student?.batchName || selectedChild?.batch?.name,
          instituteName: r.institute?.name || 'Apex Academy of Science',
          feeTitle: r.feeDetails?.feeName || res.data.feeStructure?.title || 'Fee Payment',
          amount: r.feeDetails?.amountPaid || r.amount || 0,
          paymentMethod: r.payment?.method || r.paymentMethod || 'UPI',
          paidAt: r.receiptDate || r.paidAt || r.createdAt,
        });
        setShowReceiptModal(true);
      }
    } catch {
      Alert.alert('Error', 'Unable to load receipt.');
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewComment.trim()) {
      Alert.alert('Error', 'Please write your feedback message.');
      return;
    }

    try {
      const res = await mobileApiFetch('/reviews', {
        method: 'POST',
        body: {
          rating: reviewRating,
          reviewText: reviewComment.trim(),
          studentId: selectedChild?.id,
        },
      });

      if (res.success) {
        Alert.alert('Review Submitted', 'Thank you! Your feedback has been sent to institute management.');
        setShowReviewModal(false);
        setReviewComment('');
        fetchParentData();
    PushNotificationService.registerPushToken().catch(() => {});
    mobileApiFetch('/notifications/unread-count')
      .then((res) => {
        if (res.success && res.data?.unreadCount !== undefined) {
          setUnreadNotifCount(res.data.unreadCount);
        }
      })
      .catch(() => {});
      } else {
        Alert.alert('Submission Error', res.error || 'Failed to submit review.');
      }
    } catch {
      Alert.alert('Error', 'Server connection error.');
    }
  };

  const formatRupee = (amt: number) => `₹${(amt || 0).toLocaleString('en-IN')}`;

  return (
    <View style={styles.container}>
      <Header
        title="Parent Portal"
        subtitle={selectedChild ? `Student: ${selectedChild.user?.fullName}` : 'Family Dashboard'}
        onRefresh={onRefresh}
        onOpenNotifications={() => setShowNotificationModal(true)}
        unreadNotificationsCount={unreadNotifCount}
      />

      {/* Linked Children Quick Bar */}
      {children.length > 0 && (
        <View style={styles.childrenBar}>
          <Text style={styles.childrenLabel}>LINKED CHILDREN:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.childrenChips}>
            {children.map((kid) => {
              const isSelected = selectedChild?.id === kid.id;
              return (
                <TouchableOpacity
                  key={kid.id}
                  onPress={() => handleSelectChild(kid)}
                  style={[styles.childChip, isSelected && styles.childChipActive]}
                >
                  <Text style={[styles.childChipText, isSelected && styles.childChipTextActive]}>
                    👦 {kid.user?.fullName} ({kid.rollNumber})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          onPress={() => setActiveTab('children')}
          style={[styles.tabItem, activeTab === 'children' && styles.activeTabItem]}
        >
          <Text style={[styles.tabText, activeTab === 'children' && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('academics')}
          style={[styles.tabItem, activeTab === 'academics' && styles.activeTabItem]}
        >
          <Text style={[styles.tabText, activeTab === 'academics' && styles.activeTabText]}>
            Academics
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('fees')}
          style={[styles.tabItem, activeTab === 'fees' && styles.activeTabItem]}
        >
          <Text style={[styles.tabText, activeTab === 'fees' && styles.activeTabText]}>
            Fees (₹)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('messages')}
          style={[styles.tabItem, activeTab === 'messages' && styles.activeTabItem]}
        >
          <Text style={[styles.tabText, activeTab === 'messages' && styles.activeTabText]}>
            Messages
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('reviews')}
          style={[styles.tabItem, activeTab === 'reviews' && styles.activeTabItem]}
        >
          <Text style={[styles.tabText, activeTab === 'reviews' && styles.activeTabText]}>
            Reviews
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading parent records...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
        >
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'children' && (
            <View>
              {selectedChild ? (
                <>
                  <Card highlighted>
                    <View style={styles.childHeader}>
                      <View style={styles.childAvatar}>
                        <Text style={styles.childAvatarText}>
                          {selectedChild.user?.fullName?.[0] || 'C'}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.childName}>{selectedChild.user?.fullName}</Text>
                        <Text style={styles.childRoll}>
                          Admission: {selectedChild.admissionNumber} &bull; Batch: {selectedChild.batch?.name || 'Class 12'}
                        </Text>
                        {selectedChild.createdAt && (
                          <Text style={[styles.childRoll, { marginTop: 2, fontSize: 11 }]}>
                            Created: {formatKolkataTime(selectedChild.createdAt)}
                          </Text>
                        )}
                        <View style={styles.childBadgeRow}>
                          <Badge label="VERIFIED LINKAGE" variant="success" size="sm" />
                          <Badge label="IN PERSON PASS" variant="info" size="sm" />
                        </View>
                      </View>
                    </View>
                  </Card>

                  {/* Financial Quick Callout */}
                  <View style={styles.statsRow}>
                    <View style={[styles.statBox, { backgroundColor: '#1e1b4b' }]}>
                      <Text style={styles.statLabel}>FEES OUTSTANDING</Text>
                      <Text style={[styles.statValue, { color: '#f87171' }]}>
                        {formatRupee(childStatement?.summary?.outstandingBalance || 0)}
                      </Text>
                      <Text style={styles.statNote}>Due for {selectedChild.user?.fullName}</Text>
                    </View>
                    <View style={[styles.statBox, { backgroundColor: '#064e3b' }]}>
                      <Text style={styles.statLabel}>TOTAL PAID</Text>
                      <Text style={[styles.statValue, { color: '#34d399' }]}>
                        {formatRupee(childStatement?.summary?.totalPaid || 0)}
                      </Text>
                      <Text style={styles.statNote}>Verified Receipts</Text>
                    </View>
                  </View>

                  {/* Campus Safety & Attendance Status */}
                  <Card style={{ marginTop: 12 }}>
                    <Text style={styles.cardHeaderTitle}>🛡️ Campus Attendance & Safety</Text>
                    <Text style={styles.safetyText}>
                      Attendance check-in and check-out notifications are dispatched via in-app notifications directly to your verified parent account upon entry and departure.
                    </Text>
                    <View style={styles.safetyBadgeRow}>
                      <Badge label="IN-APP ALERTS ACTIVE" variant="indigo" size="sm" />
                      <Badge label="GATE LOG VALIDATED" variant="success" size="sm" />
                    </View>
                  </Card>
                </>
              ) : (
                <Card>
                  <Text style={styles.emptyText}>No verified linked children found for this account.</Text>
                </Card>
              )}
            </View>
          )}

          {/* TAB 2: ACADEMICS */}
          {activeTab === 'academics' && (
            <View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>📚 Study Materials Assigned</Text>
                <Text style={styles.sectionCount}>{materials.length} files</Text>
              </View>

              {materials.length === 0 ? (
                <Card><Text style={styles.emptyText}>No materials found.</Text></Card>
              ) : (
                materials.map((m) => (
                  <Card key={m.id}>
                    <View style={styles.matItemRow}>
                      <Text style={styles.matIcon}>{m.type === 'PDF' ? '📄' : '🎧'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.matTitle}>{m.title}</Text>
                        <Text style={styles.matSubject}>{m.subject?.name || 'Class Subject'} &bull; {m.type}</Text>
                      </View>
                      <Badge label="ACCESSIBLE" variant="info" size="sm" />
                    </View>
                  </Card>
                ))
              )}

              <View style={[styles.sectionHeader, { marginTop: 16 }]}>
                <Text style={styles.sectionTitle}>📝 Assigned Homework</Text>
                <Text style={styles.sectionCount}>{homeworkList.length} items</Text>
              </View>

              {homeworkList.length === 0 ? (
                <Card><Text style={styles.emptyText}>No current homework assignments.</Text></Card>
              ) : (
                homeworkList.map((hw) => (
                  <Card key={hw.id}>
                    <Text style={styles.hwTitle}>{hw.title}</Text>
                    <Text style={styles.hwDesc}>{hw.description}</Text>
                    <Text style={styles.hwDue}>
                      Due: {hw.dueDate ? new Date(hw.dueDate).toLocaleDateString('en-IN') : 'Open'}
                    </Text>
                  </Card>
                ))
              )}

              {/* SECTION: EXAMINATIONS & TEST RESULTS */}
              <View style={[styles.sectionHeader, { marginTop: 18 }]}>
                <Text style={styles.sectionTitle}>🏆 Examinations & Test Results</Text>
                <Text style={styles.sectionCount}>{childExams.length} tests</Text>
              </View>

              {/* Cumulative Progress Summary Card */}
              {childReportCard?.summary && childReportCard.summary.totalExams > 0 ? (
                <Card>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#6D4C41', textTransform: 'uppercase' }}>
                        Cumulative Score
                      </Text>
                      <Text style={{ fontSize: 20, fontWeight: '900', color: '#2D1E18', marginTop: 2 }}>
                        {childReportCard.summary.cumulativePercentage}%
                      </Text>
                    </View>
                    <Badge
                      label={childReportCard.summary.status}
                      variant={childReportCard.summary.status === 'DISTINCTION' ? 'success' : 'info'}
                      size="sm"
                    />
                  </View>
                  <Text style={{ fontSize: 11, color: '#8D6E63', marginTop: 4 }}>
                    Tests Cleared: {childReportCard.summary.totalPassed} of {childReportCard.summary.totalExams} &bull; Total Points: {childReportCard.summary.totalMarksObtained}/{childReportCard.summary.totalMaxMarks}
                  </Text>
                </Card>
              ) : null}

              {childExams.length === 0 ? (
                <Card><Text style={styles.emptyText}>No scheduled exams or published test results yet.</Text></Card>
              ) : (
                childExams.map((ex: any) => {
                  const mark = childReportCard?.marks?.find((m: any) => m.examId === ex.id);
                  const isResultsPub = ex.isResultsPublished || !!mark;

                  return (
                    <Card key={ex.id}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#2D1E18' }}>{ex.title}</Text>
                          <Text style={{ fontSize: 11, color: '#6D4C41', marginTop: 2 }}>
                            {ex.subject?.name} &bull; Max: {ex.totalMarks} pts
                          </Text>
                        </View>
                        <Badge
                          label={isResultsPub ? (mark?.isPassed ? 'CLEARED' : mark?.isAbsent ? 'ABSENT' : 'RESULT') : 'SCHEDULED'}
                          variant={isResultsPub ? (mark?.isPassed ? 'success' : 'danger') : 'info'}
                          size="sm"
                        />
                      </View>

                      <View style={{ marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#EFEBE9' }}>
                        <Text style={{ fontSize: 11, color: '#8D6E63' }}>
                          Date: {new Date(ex.examDate).toLocaleDateString('en-IN')}
                          {ex.startTime ? ` (${ex.startTime}${ex.endTime ? ' - ' + ex.endTime : ''})` : ''}
                        </Text>
                      </View>

                      {mark ? (
                        <View style={{ marginTop: 6, padding: 8, backgroundColor: mark.isPassed ? '#E8F5E9' : '#FFEBEE', borderRadius: 8 }}>
                          <Text style={{ fontSize: 12, fontWeight: 'bold', color: mark.isPassed ? '#2E7D32' : '#C62828' }}>
                            Score: {mark.marksObtained} / {mark.maxMarks} ({mark.percentage}%) &bull; Grade: {mark.grade}
                          </Text>
                          {mark.remarks ? (
                            <Text style={{ fontSize: 11, color: '#4E342E', fontStyle: 'italic', marginTop: 2 }}>
                              "{mark.remarks}"
                            </Text>
                          ) : null}
                        </View>
                      ) : null}
                    </Card>
                  );
                })
              )}

              {/* SECTION: ACADEMIC PROGRESS REPORTS */}
              <View style={[styles.sectionHeader, { marginTop: 18 }]}>
                <Text style={styles.sectionTitle}>✨ Academic Progress Reports</Text>
                <Text style={styles.sectionCount}>{childProgressReports.length} reports</Text>
              </View>

              {childProgressReports.length === 0 ? (
                <Card><Text style={styles.emptyText}>No teacher progress reports published for this term yet.</Text></Card>
              ) : (
                childProgressReports.map((pr: any) => (
                  <Card key={pr.id}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#2D1E18' }}>{pr.termName}</Text>
                        <Text style={{ fontSize: 11, color: '#6D4C41', marginTop: 2 }}>
                          Faculty: {pr.teacher || 'Assigned Staff'} &bull; {pr.periodType || 'TERM'}
                        </Text>
                      </View>
                      <Badge label={`${pr.rating || 5}/5 ★`} variant="info" size="sm" />
                    </View>

                    {/* Auto-Calculated Indicators */}
                    {(pr.attendanceRate !== null || pr.homeworkRate !== null || pr.examAverage !== null) ? (
                      <View style={{ flexDirection: 'row', backgroundColor: '#F7F2EF', padding: 8, borderRadius: 8, marginTop: 8, justifyContent: 'space-around' }}>
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#8D6E63' }}>ATTENDANCE</Text>
                          <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#2D1E18' }}>{pr.attendanceRate !== null ? `${pr.attendanceRate}%` : 'N/A'}</Text>
                        </View>
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#8D6E63' }}>HOMEWORK</Text>
                          <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#2D1E18' }}>{pr.homeworkRate !== null ? `${pr.homeworkRate}%` : 'N/A'}</Text>
                        </View>
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#8D6E63' }}>TEST AVG</Text>
                          <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#2D1E18' }}>{pr.examAverage !== null ? `${pr.examAverage}%` : 'N/A'}</Text>
                        </View>
                      </View>
                    ) : null}

                    <Text style={{ fontSize: 12, fontStyle: 'italic', color: '#2D1E18', marginTop: 8, backgroundColor: '#F7F2EF', padding: 8, borderRadius: 8 }}>
                      "{pr.remarks}"
                    </Text>

                    {pr.strengths ? (
                      <View style={{ marginTop: 6, padding: 6, backgroundColor: '#E8F5E9', borderRadius: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#2E7D32' }}>STRENGTHS: {pr.strengths}</Text>
                      </View>
                    ) : null}
                    {pr.improvements ? (
                      <View style={{ marginTop: 4, padding: 6, backgroundColor: '#FFF3E0', borderRadius: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#E65100' }}>AREAS TO IMPROVE: {pr.improvements}</Text>
                      </View>
                    ) : null}
                    {pr.recommendations ? (
                      <View style={{ marginTop: 4, padding: 6, backgroundColor: '#E1F5FE', borderRadius: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#0277BD' }}>ACTIONS: {pr.recommendations}</Text>
                      </View>
                    ) : null}
                  </Card>
                ))
              )}
            </View>
          )}

          {/* TAB 3: FEES (Statement & Receipts) */}
          {activeTab === 'fees' && (
            <View>
              <Card highlighted>
                <Text style={styles.feeHeading}>CHILD FINANCIAL STATEMENT</Text>
                <View style={styles.feeTotals}>
                  <View style={styles.feeCol}>
                    <Text style={styles.feeColLabel}>Assigned</Text>
                    <Text style={styles.feeColVal}>{formatRupee(childStatement?.summary?.totalAssigned || 0)}</Text>
                  </View>
                  <View style={styles.feeCol}>
                    <Text style={styles.feeColLabel}>Paid</Text>
                    <Text style={[styles.feeColVal, { color: '#34d399' }]}>
                      {formatRupee(childStatement?.summary?.totalPaid || 0)}
                    </Text>
                  </View>
                  <View style={styles.feeCol}>
                    <Text style={styles.feeColLabel}>Balance</Text>
                    <Text style={[styles.feeColVal, { color: '#f87171' }]}>
                      {formatRupee(childStatement?.summary?.outstandingBalance || 0)}
                    </Text>
                  </View>
                </View>
              </Card>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🧾 Payment Receipts</Text>
              </View>

              {childStatement?.payments?.length === 0 ? (
                <Card><Text style={styles.emptyText}>No payments recorded yet.</Text></Card>
              ) : (
                childStatement?.payments?.map((pm: any) => (
                  <Card key={pm.id} onPress={() => handleOpenReceipt(pm.id)}>
                    <View style={styles.paymentRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.paymentAmt}>{formatRupee(pm.amount)}</Text>
                        <Text style={styles.paymentMethod}>
                          {pm.paymentMethod} &bull; {new Date(pm.paidAt || pm.createdAt).toLocaleDateString('en-IN')}
                        </Text>
                        {pm.receiptNumber && (
                          <Text style={styles.receiptNo}>Receipt #{pm.receiptNumber}</Text>
                        )}
                      </View>
                      <TouchableOpacity
                        onPress={() => handleOpenReceipt(pm.id)}
                        style={styles.openReceiptBtn}
                      >
                        <Text style={styles.openReceiptBtnText}>View Receipt 📄</Text>
                      </TouchableOpacity>
                    </View>
                  </Card>
                ))
              )}
            </View>
          )}

          {/* TAB 4: MESSAGES (Staff-Parent Messaging) */}
          {activeTab === 'messages' && (
            <View>
              {activeConversation ? (
                <View>
                  <TouchableOpacity
                    onPress={() => setActiveConversation(null)}
                    style={styles.backToConvsBtn}
                  >
                    <Text style={styles.backToConvsText}>← Back to all conversations</Text>
                  </TouchableOpacity>

                  <Card>
                    <Text style={styles.convHeaderTitle}>
                      {activeConversation.title || 'Faculty Conversation'}
                    </Text>
                  </Card>

                  {/* Message Thread */}
                  <View style={styles.messagesContainer}>
                    {messages.length === 0 ? (
                      <Card><Text style={styles.emptyText}>No messages in this conversation.</Text></Card>
                    ) : (
                      messages.map((m) => {
                        const isMine = m.senderId === user?.id;
                        return (
                          <View
                            key={m.id}
                            style={[
                              styles.messageBubble,
                              isMine ? styles.msgMine : styles.msgOther,
                            ]}
                          >
                            <Text style={styles.msgSender}>
                              {isMine ? 'You' : m.sender?.fullName || 'Teacher'}
                            </Text>
                            {m.attachmentType === 'AUDIO' && (
                              <Text style={[styles.msgBody, { fontStyle: 'italic' }]}>🎤 Voice message</Text>
                            )}
                            {m.attachmentType === 'IMAGE' && (
                              <Text style={[styles.msgBody, { fontStyle: 'italic' }]}>📷 Photo attachment</Text>
                            )}
                            {m.attachmentType === 'DOCUMENT' && (
                              <Text style={[styles.msgBody, { fontStyle: 'italic' }]}>📄 {m.attachmentName || 'Document'}</Text>
                            )}
                            {Boolean(m.body || m.content) && (
                              <Text style={styles.msgBody}>{m.body || m.content}</Text>
                            )}
                            <Text style={styles.msgTime}>
                              {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                          </View>
                        );
                      })
                    )}
                  </View>

                  {/* Send Input */}
                  <View style={styles.sendBar}>
                    <TextInput
                      style={styles.msgInput}
                      placeholder="Type a message to teacher..."
                      placeholderTextColor="#64748b"
                      value={newMessage}
                      onChangeText={setNewMessage}
                    />
                    <TouchableOpacity onPress={handleSendMessage} style={styles.sendBtn}>
                      <Text style={styles.sendBtnText}>Send</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>💬 Teacher Conversations</Text>
                  </View>

                  {conversations.length === 0 ? (
                    <Card><Text style={styles.emptyText}>No messages from staff yet.</Text></Card>
                  ) : (
                    conversations.map((c) => (
                      <Card key={c.id} onPress={() => openConversation(c)}>
                        <View style={styles.convItem}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.convTitle}>{c.title || 'Teacher Communication'}</Text>
                            <Text style={styles.convSub}>Tap to view and reply</Text>
                          </View>
                          <Badge label="OPEN" variant="info" size="sm" />
                        </View>
                      </Card>
                    ))
                  )}
                </View>
              )}
            </View>
          )}

          {/* TAB 5: REVIEWS */}
          {activeTab === 'reviews' && (
            <View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>⭐ Institute Reviews & Feedback</Text>
                <TouchableOpacity
                  onPress={() => setShowReviewModal(true)}
                  style={styles.addReviewBtn}
                >
                  <Text style={styles.addReviewBtnText}>+ Write Review</Text>
                </TouchableOpacity>
              </View>

              {reviews.length === 0 ? (
                <Card><Text style={styles.emptyText}>No parent reviews submitted yet.</Text></Card>
              ) : (
                reviews.map((rev) => (
                  <Card key={rev.id}>
                    <View style={styles.revHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.revRating}>{'★'.repeat(rev.rating || 5)}</Text>
                        <Badge label={rev.status || 'NEW'} variant={rev.status === 'RESOLVED' ? 'info' : rev.status === 'REPLIED' ? 'success' : 'warning'} size="sm" />
                      </View>
                      <Text style={styles.revDate}>
                        {new Date(rev.createdAt).toLocaleDateString('en-IN')}
                      </Text>
                    </View>
                    {rev.subject ? (
                      <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#2D1E18', marginTop: 4 }}>
                        {rev.subject}
                      </Text>
                    ) : null}
                    <Text style={styles.revComment}>{rev.reviewText || rev.comment}</Text>
                    {(rev.replyText || rev.response) ? (
                      <View style={styles.revResponseBox}>
                        <Text style={styles.revResponseTitle}>Institute Reply:</Text>
                        <Text style={styles.revResponseText}>{rev.replyText || rev.response}</Text>
                      </View>
                    ) : null}
                  </Card>
                ))
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* Review Modal */}
      <Modal visible={showReviewModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Submit Institute Feedback</Text>
            <Text style={styles.modalSub}>Share your review with management</Text>

            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setReviewRating(star)}>
                  <Text style={[styles.starBtn, reviewRating >= star && styles.starActive]}>
                    ★
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.modalInput}
              multiline
              numberOfLines={4}
              placeholder="Write your feedback regarding classes, staff, or facilities..."
              placeholderTextColor="#64748b"
              value={reviewComment}
              onChangeText={setReviewComment}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                onPress={() => setShowReviewModal(false)}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmitReview}
                style={styles.modalSubmitBtn}
              >
                <Text style={styles.modalSubmitBtnText}>Submit Review</Text>
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

      <NotificationModal
        visible={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        onUnreadCountChange={setUnreadNotifCount}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeTokens.colors.background,
  },
  childrenBar: {
    backgroundColor: themeTokens.colors.surfaceMuted,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: themeTokens.colors.border,
  },
  childrenLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: themeTokens.colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  childrenChips: {
    gap: 8,
  },
  childChip: {
    backgroundColor: themeTokens.colors.surface,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
  },
  childChipActive: {
    backgroundColor: themeTokens.colors.espresso,
    borderColor: themeTokens.colors.espresso,
  },
  childChipText: {
    color: themeTokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  childChipTextActive: {
    color: themeTokens.colors.textLight,
    fontWeight: '700',
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
    fontSize: 11,
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
  childHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  childAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: themeTokens.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
  },
  childAvatarText: {
    color: themeTokens.colors.espresso,
    fontSize: 20,
    fontWeight: 'bold',
  },
  childName: {
    color: themeTokens.colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  childRoll: {
    color: themeTokens.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  childBadgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  statBox: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    backgroundColor: themeTokens.colors.surface,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: themeTokens.colors.textMuted,
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: themeTokens.colors.textPrimary,
    marginVertical: 4,
  },
  statNote: {
    fontSize: 11,
    color: themeTokens.colors.taupe,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: themeTokens.colors.textPrimary,
    marginBottom: 6,
  },
  safetyText: {
    fontSize: 12,
    color: themeTokens.colors.textMuted,
    lineHeight: 18,
    marginBottom: 10,
  },
  safetyBadgeRow: {
    flexDirection: 'row',
    gap: 6,
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
  matItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  matIcon: {
    fontSize: 20,
  },
  matTitle: {
    color: themeTokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  matSubject: {
    color: themeTokens.colors.primary,
    fontSize: 11,
    marginTop: 2,
  },
  hwTitle: {
    color: themeTokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  hwDesc: {
    color: themeTokens.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  hwDue: {
    color: themeTokens.colors.textSubtle,
    fontSize: 11,
    marginTop: 8,
  },
  feeHeading: {
    color: themeTokens.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  feeTotals: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  feeCol: {
    alignItems: 'center',
  },
  feeColLabel: {
    color: themeTokens.colors.textMuted,
    fontSize: 11,
  },
  feeColVal: {
    color: themeTokens.colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentAmt: {
    color: themeTokens.colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  paymentMethod: {
    color: themeTokens.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  receiptNo: {
    color: themeTokens.colors.primary,
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  openReceiptBtn: {
    backgroundColor: themeTokens.colors.espresso,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  openReceiptBtnText: {
    color: themeTokens.colors.textLight,
    fontSize: 12,
    fontWeight: 'bold',
  },
  backToConvsBtn: {
    marginBottom: 12,
  },
  backToConvsText: {
    color: themeTokens.colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  convHeaderTitle: {
    color: themeTokens.colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  messagesContainer: {
    gap: 8,
    marginVertical: 12,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 12,
  },
  msgMine: {
    backgroundColor: themeTokens.colors.espresso,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 2,
  },
  msgOther: {
    backgroundColor: themeTokens.colors.surfaceMuted,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
  },
  msgSender: {
    color: themeTokens.colors.textSecondary,
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  msgBody: {
    color: themeTokens.colors.textLight,
    fontSize: 13,
    lineHeight: 18,
  },
  msgTime: {
    color: themeTokens.colors.textLightMuted,
    fontSize: 9,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  sendBar: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  msgInput: {
    flex: 1,
    backgroundColor: themeTokens.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: themeTokens.colors.textPrimary,
    fontSize: 13,
  },
  sendBtn: {
    backgroundColor: themeTokens.colors.espresso,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
  },
  sendBtnText: {
    color: themeTokens.colors.textLight,
    fontWeight: 'bold',
    fontSize: 13,
  },
  convItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  convTitle: {
    color: themeTokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  convSub: {
    color: themeTokens.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  addReviewBtn: {
    backgroundColor: themeTokens.colors.espresso,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  addReviewBtnText: {
    color: themeTokens.colors.textLight,
    fontSize: 11,
    fontWeight: 'bold',
  },
  revHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  revRating: {
    color: '#fbbf24',
    fontSize: 14,
    letterSpacing: 2,
  },
  revDate: {
    color: themeTokens.colors.textSubtle,
    fontSize: 11,
  },
  revComment: {
    color: themeTokens.colors.textPrimary,
    fontSize: 13,
    lineHeight: 18,
  },
  revResponseBox: {
    marginTop: 8,
    padding: 8,
    backgroundColor: themeTokens.colors.surfaceMuted,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: themeTokens.colors.primary,
  },
  revResponseTitle: {
    color: themeTokens.colors.primary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  revResponseText: {
    color: themeTokens.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
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
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  starBtn: {
    fontSize: 28,
    color: themeTokens.colors.border,
  },
  starActive: {
    color: '#fbbf24',
  },
  modalInput: {
    backgroundColor: themeTokens.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    borderRadius: 8,
    padding: 12,
    color: themeTokens.colors.textPrimary,
    textAlignVertical: 'top',
    height: 100,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: themeTokens.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    color: themeTokens.colors.textSecondary,
    fontWeight: '600',
  },
  modalSubmitBtn: {
    flex: 1,
    backgroundColor: themeTokens.colors.espresso,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalSubmitBtnText: {
    color: themeTokens.colors.textLight,
    fontWeight: 'bold',
  },
});
