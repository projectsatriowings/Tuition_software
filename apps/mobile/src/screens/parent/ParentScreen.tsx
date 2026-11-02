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
import { ReceiptModal } from '../../components/ReceiptModal';
import { PressableScale, AnimatedDialog, FadeInView } from '../../theme/motion';
import { TouchableWithoutFeedback } from 'react-native';
import { NotificationModal } from '../../components/NotificationModal';
import { MaterialViewerModal } from '../../components/MaterialViewerModal';
import { PushNotificationService } from '../../services/pushNotification.service';
import {
  ParentBottomNav,
  ParentActiveTab,
  ParentPrimaryTab,
} from './components/ParentBottomNav';
import { ParentHomeTab } from './components/ParentHomeTab';
import { ParentAttendanceTab } from './components/ParentAttendanceTab';
import { ParentMoreTab } from './components/ParentMoreTab';

export const ParentScreen: React.FC = () => {
  const { user, institute, logout } = useMobileAuth();

  const [activeTab, setActiveTab] = useState<ParentActiveTab>('home');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Core Parent Data
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [dashboardSummary, setDashboardSummary] = useState<any>(null);
  const [childStatement, setChildStatement] = useState<any>(null);
  const [childAttendance, setChildAttendance] = useState<any>(null);
  const [attendanceMonth, setAttendanceMonth] = useState<number>(new Date().getMonth() + 1);
  const [attendanceYear, setAttendanceYear] = useState<number>(new Date().getFullYear());

  // Academics, Homework, Exams & Materials
  const [materials, setMaterials] = useState<any[]>([]);
  const [materialFilterSubject, setMaterialFilterSubject] = useState<string>('ALL');
  const [activeViewingMaterial, setActiveViewingMaterial] = useState<any | null>(null);

  const [homeworkList, setHomeworkList] = useState<any[]>([]);
  const [homeworkFilterStatus, setHomeworkFilterStatus] = useState<string>('ALL');

  const [childExams, setChildExams] = useState<any[]>([]);
  const [childReportCard, setChildReportCard] = useState<any>(null);
  const [examFilter, setExamFilter] = useState<'ALL' | 'RESULTS' | 'UPCOMING'>('ALL');

  const [childProgressReports, setChildProgressReports] = useState<any[]>([]);
  const [childTimetable, setChildTimetable] = useState<any[]>([]);
  const [childTeachers, setChildTeachers] = useState<any[]>([]);

  // Messaging & Conversations
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversation, setActiveConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Reviews & Private Inquiries
  const [reviews, setReviews] = useState<any[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewSubject, setReviewSubject] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Modals & Notifications
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  // Push Notification Navigation Handler
  const handleNavigateToEntity = async (
    entityType: string,
    entityId: string,
    metadata?: any
  ) => {
    const eType = String(entityType || '').toUpperCase();

    // Mark matching notification as read
    mobileApiFetch('/notifications/mark-read-by-entity', {
      method: 'POST',
      body: { entityType: eType, entityId },
    })
      .then((res) => {
        if (res.success && res.data?.unreadCount !== undefined) {
          setUnreadNotifCount(res.data.unreadCount);
        }
      })
      .catch(() => {});

    if (eType === 'ATTENDANCE') {
      setActiveTab('attendance');
    } else if (eType === 'EXAM' || eType === 'TEST_RESULT') {
      setActiveTab('results');
    } else if (eType === 'HOMEWORK') {
      setActiveTab('homework');
    } else if (eType === 'MATERIAL') {
      setActiveTab('learning');
    } else if (eType === 'PROGRESS_REPORT') {
      setActiveTab('progress');
    } else if (eType === 'MESSAGE' || eType === 'NEW_MESSAGE') {
      setActiveTab('messages');
    } else if (eType === 'FEE' || eType === 'FEE_DUE' || eType === 'FEE_PAID') {
      setActiveTab('fees');
      if (metadata?.paymentId && childStatement?.payments) {
        const p = childStatement.payments.find((pay: any) => pay.id === metadata.paymentId);
        if (p) {
          handleOpenReceipt(p.id);
        }
      }
    }
  };

  useEffect(() => {
    const unsub = PushNotificationService.addTapListener((payload) => {
      if (payload.entityType && payload.entityId) {
        handleNavigateToEntity(payload.entityType, payload.entityId, payload.metadata);
      }
    });
    return unsub;
  }, [childStatement]);

  // Load Child Attendance for a given month/year
  const loadChildAttendance = async (childId: string, month: number, year: number) => {
    try {
      const res = await mobileApiFetch(
        `/parents/students/${childId}/attendance?month=${month}&year=${year}`
      );
      if (res.success && res.data) {
        setChildAttendance(res.data);
      }
    } catch (e) {
      console.warn('Error loading child attendance:', e);
    }
  };

  // Load all child-specific details
  const loadChildDetails = async (childStudentId: string) => {
    try {
      const [stmtRes, acadRes, teachRes, exRes, rcRes, matRes] = await Promise.all([
        mobileApiFetch(`/fees/students/${childStudentId}/statement`),
        mobileApiFetch(`/parents/students/${childStudentId}/academics`),
        mobileApiFetch(`/parents/students/${childStudentId}/teachers`),
        mobileApiFetch('/exams?status=PUBLISHED'),
        mobileApiFetch(`/exams/students/${childStudentId}/report-card`),
        mobileApiFetch('/materials'),
      ]);

      if (stmtRes.success && stmtRes.data) {
        setChildStatement(stmtRes.data);
      }
      if (acadRes.success && acadRes.data) {
        if (acadRes.data.homework) {
          setHomeworkList(acadRes.data.homework);
        }
        if (acadRes.data.feedbacks) {
          setChildProgressReports(acadRes.data.feedbacks);
        }
        if (acadRes.data.subjects) {
          setChildTimetable(acadRes.data.subjects);
        }
      }
      if (teachRes.success && teachRes.data?.teachers) {
        setChildTeachers(teachRes.data.teachers);
      }
      if (exRes.success && exRes.data) {
        setChildExams(Array.isArray(exRes.data) ? exRes.data : exRes.data.exams || []);
      }
      if (rcRes.success && rcRes.data) {
        setChildReportCard(rcRes.data);
      }
      if (matRes.success && matRes.data) {
        setMaterials(Array.isArray(matRes.data) ? matRes.data : matRes.data.materials || []);
      }
    } catch (e) {
      console.warn('Error loading child details:', e);
    }
  };

  const fetchParentData = useCallback(async () => {
    try {
      // 1. Fetch Verified Linked Children
      const kidsRes = await mobileApiFetch('/parents/my/children');
      const rawList = Array.isArray(kidsRes.data)
        ? kidsRes.data
        : Array.isArray(kidsRes.data?.children)
        ? kidsRes.data.children.map((c: any) => ({
            ...(c.student || {}),
            relationship: c.relationship,
            isPrimaryContact: c.isPrimaryContact,
            canReceiveSms: c.canReceiveSms,
          }))
        : [];

      if (kidsRes.success && rawList.length > 0) {
        setChildren(rawList);
        const activeKid = selectedChild
          ? rawList.find((k: any) => k.id === selectedChild.id) || rawList[0]
          : rawList[0];
        setSelectedChild(activeKid);
        loadChildDetails(activeKid.id);
        loadChildAttendance(activeKid.id, attendanceMonth, attendanceYear);
      } else if (kidsRes.success) {
        setChildren([]);
      }

      // 2. Fetch Parent Dashboard Summary
      const summaryRes = await mobileApiFetch('/parents/my/dashboard-summary');
      if (summaryRes.success && summaryRes.data) {
        setDashboardSummary(summaryRes.data);
      }

      // 3. Fetch Conversations
      const convRes = await mobileApiFetch('/messaging/conversations');
      if (convRes.success && convRes.data) {
        setConversations(
          Array.isArray(convRes.data) ? convRes.data : convRes.data.conversations || []
        );
      }

      // 4. Fetch Reviews
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
  }, [selectedChild, attendanceMonth, attendanceYear]);

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
  }, []);

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
    loadChildAttendance(child.id, attendanceMonth, attendanceYear);
  };

  const handleMonthChange = (month: number, year: number) => {
    setAttendanceMonth(month);
    setAttendanceYear(year);
    if (selectedChild?.id) {
      loadChildAttendance(selectedChild.id, month, year);
    }
  };

  // Messaging Handlers
  const openConversation = async (conv: any) => {
    setActiveConversation(conv);
    try {
      const msgRes = await mobileApiFetch(
        `/messaging/conversations/${conv.id}/messages`
      );
      if (msgRes.success && msgRes.data) {
        setMessages(
          Array.isArray(msgRes.data) ? msgRes.data : msgRes.data.messages || []
        );
      }
    } catch {
      Alert.alert('Error', 'Unable to load message thread.');
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeConversation || sendingMsg) return;

    setSendingMsg(true);
    try {
      const res = await mobileApiFetch(
        `/messaging/conversations/${activeConversation.id}/messages`,
        {
          method: 'POST',
          body: { body: newMessage.trim() },
        }
      );
      if (res.success) {
        setNewMessage('');
        const msgRes = await mobileApiFetch(
          `/messaging/conversations/${activeConversation.id}/messages`
        );
        if (msgRes.success && msgRes.data) {
          setMessages(
            Array.isArray(msgRes.data) ? msgRes.data : msgRes.data.messages || []
          );
        }
      }
    } catch {
      Alert.alert('Error', 'Could not send message.');
    } finally {
      setSendingMsg(false);
    }
  };

  // Official Receipt Viewer
  const handleOpenReceipt = async (paymentId: string) => {
    try {
      const res = await mobileApiFetch(`/fees/payments/${paymentId}/receipt`);
      if (res.success && res.data) {
        const r = res.data.receipt || res.data;
        setSelectedReceipt({
          receiptNumber: r.receiptNumber || `REC-${paymentId.slice(0, 8)}`,
          transactionReference:
            r.payment?.transactionReference || r.transactionReference,
          studentName:
            r.student?.fullName || selectedChild?.user?.fullName || 'Child',
          studentRoll: r.student?.rollNumber || selectedChild?.rollNumber,
          batchName: r.student?.batchName || selectedChild?.batch?.name,
          instituteName: r.institute?.name || institute?.name || 'TuitionOS Academy',
          feeTitle:
            r.feeDetails?.feeName || res.data.feeStructure?.title || 'Tuition Fee Payment',
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

  // Submit Review / Private Inquiry
  const handleSubmitReview = async () => {
    if (!reviewComment.trim()) {
      Alert.alert('Required', 'Please write your feedback or inquiry message.');
      return;
    }

    setSubmittingReview(true);
    try {
      const res = await mobileApiFetch('/reviews', {
        method: 'POST',
        body: {
          rating: reviewRating,
          subject: reviewSubject.trim() || undefined,
          reviewText: reviewComment.trim(),
          studentId: selectedChild?.id,
        },
      });

      if (res.success) {
        Alert.alert(
          'Feedback Submitted',
          'Thank you. Your message has been sent privately to institute management.'
        );
        setShowReviewModal(false);
        setReviewComment('');
        setReviewSubject('');
        // Refresh reviews
        const revRes = await mobileApiFetch('/reviews');
        if (revRes.success && revRes.data) {
          setReviews(
            Array.isArray(revRes.data) ? revRes.data : revRes.data.reviews || []
          );
        }
      } else {
        Alert.alert('Submission Error', res.error || 'Failed to submit feedback.');
      }
    } catch {
      Alert.alert('Error', 'Connection error while submitting feedback.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const formatRupee = (amt: number) => `₹${(amt || 0).toLocaleString('en-IN')}`;

  // Unique Subjects for Materials Filter
  const materialSubjects = [
    'ALL',
    ...Array.from(new Set(materials.map((m) => m.subject?.name || m.subject).filter(Boolean))),
  ];

  const filteredMaterials = materials.filter((m) => {
    if (materialFilterSubject === 'ALL') return true;
    const sub = m.subject?.name || m.subject;
    return sub === materialFilterSubject;
  });

  // Filtered Homework
  const filteredHomework = homeworkList.filter((hw) => {
    if (homeworkFilterStatus === 'ALL') return true;
    if (homeworkFilterStatus === 'PENDING') {
      return (
        hw.submissionStatus !== 'GRADED' &&
        hw.submissionStatus !== 'COMPLETED' &&
        hw.submissionStatus !== 'SUBMITTED'
      );
    }
    if (homeworkFilterStatus === 'SUBMITTED') {
      return hw.submissionStatus === 'SUBMITTED';
    }
    if (homeworkFilterStatus === 'GRADED') {
      return hw.submissionStatus === 'GRADED' || hw.submissionStatus === 'COMPLETED';
    }
    return true;
  });

  // Filtered Exams
  const filteredExams = childExams.filter((ex) => {
    if (examFilter === 'ALL') return true;
    if (examFilter === 'RESULTS') return ex.isResultsPublished;
    if (examFilter === 'UPCOMING') return !ex.isResultsPublished;
    return true;
  });

  // Count unread messages
  const unreadMessagesCount = dashboardSummary?.unreadCounts?.messages || 0;

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <Header
        title="Parent Portal"
        subtitle={
          selectedChild
            ? `Student: ${selectedChild.user?.fullName || selectedChild.firstName}`
            : 'Family Dashboard'
        }
        onRefresh={onRefresh}
        onOpenNotifications={() => setShowNotificationModal(true)}
        unreadNotificationsCount={unreadNotifCount}
      />

      {/* Sub-view Breadcrumb Bar */}
      {activeTab !== 'home' &&
        activeTab !== 'attendance' &&
        activeTab !== 'learning' &&
        activeTab !== 'messages' &&
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
              {activeTab === 'progress'
                ? 'Academic Progress Reports'
                : activeTab === 'homework'
                ? 'Homework & Submissions'
                : activeTab === 'results'
                ? 'Exams & Published Results'
                : activeTab === 'fees'
                ? 'Fees & Official Receipts'
                : activeTab === 'timetable'
                ? 'Class Timetable & Schedule'
                : activeTab === 'reviews'
                ? 'Reviews & Private Inquiries'
                : 'Family & Profile Details'}
            </Text>
          </View>
        )}

      {/* Primary Tab Views */}
      <View style={styles.content}>
        <FadeInView key={activeTab} duration={160} style={{ flex: 1 }}>
        {/* TAB 1: HOME DASHBOARD */}
        {activeTab === 'home' && (
          <ParentHomeTab
            user={user}
            institute={institute}
            children={children}
            selectedChild={selectedChild}
            onSelectChild={handleSelectChild}
            dashboardSummary={dashboardSummary}
            childAttendance={childAttendance}
            childStatement={childStatement}
            homeworkList={homeworkList}
            materials={materials}
            childExams={childExams}
            childReportCard={childReportCard}
            childProgressReports={childProgressReports}
            conversations={conversations}
            loading={loading}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenReceipt={handleOpenReceipt}
            onOpenReviewModal={() => setShowReviewModal(true)}
          />
        )}

        {/* TAB 2: ATTENDANCE */}
        {activeTab === 'attendance' && (
          <ParentAttendanceTab
            selectedChild={selectedChild}
            children={children}
            onSelectChild={handleSelectChild}
            childAttendance={childAttendance}
            loading={loading}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onMonthChange={handleMonthChange}
            currentMonth={attendanceMonth}
            currentYear={attendanceYear}
          />
        )}

        {/* TAB 3: LEARNING MATERIALS */}
        {activeTab === 'learning' && (
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
                <Text style={styles.tabHeading}>Study Materials</Text>
                <Text style={styles.tabSub}>
                  Files, PDFs & audio notes for {selectedChild?.user?.fullName || 'Child'}
                </Text>
              </View>
            </View>

            {/* Subject Filters */}
            {materialSubjects.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterChipsRow}
              >
                {materialSubjects.map((sub: string) => {
                  const isSel = materialFilterSubject === sub;
                  return (
                    <TouchableOpacity
                      key={sub}
                      onPress={() => setMaterialFilterSubject(sub)}
                      style={[styles.filterChip, isSel && styles.filterChipActive]}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          isSel && styles.filterChipTextActive,
                        ]}
                      >
                        {sub}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {filteredMaterials.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>📚</Text>
                <Text style={styles.emptyTitle}>No Study Materials Available</Text>
                <Text style={styles.emptySub}>
                  There are no study files published for this subject filter.
                </Text>
              </View>
            ) : (
              filteredMaterials.map((mat) => {
                const isPdf = mat.type === 'PDF';
                const isAudio = mat.type === 'AUDIO';
                return (
                  <View key={mat.id} style={styles.itemCard}>
                    <View style={styles.itemCardHeader}>
                      <View style={styles.itemIconBox}>
                        <Text style={styles.itemIcon}>
                          {isPdf ? '📄' : isAudio ? '🎧' : '📁'}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemCardTitle}>{mat.title}</Text>
                        <Text style={styles.itemCardSub}>
                          {mat.subject?.name || mat.subject || 'Class Subject'} &bull;{' '}
                          {mat.type}
                        </Text>
                      </View>
                    </View>

                    {mat.description ? (
                      <Text style={styles.itemCardDesc}>{mat.description}</Text>
                    ) : null}

                    <View style={styles.itemCardFooter}>
                      <Text style={styles.itemCardDate}>
                        📅 {new Date(mat.createdAt).toLocaleDateString('en-IN')}
                      </Text>
                      <TouchableOpacity
                        style={styles.itemActionBtn}
                        onPress={() => setActiveViewingMaterial(mat)}
                      >
                        <Text style={styles.itemActionBtnText}>Preview File ↗</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}

        {/* TAB 4: MESSAGES (Faculty Chat) */}
        {activeTab === 'messages' && (
          <View style={styles.messagesContainer}>
            {activeConversation ? (
              <View style={{ flex: 1 }}>
                <View style={styles.convActiveHeader}>
                  <TouchableOpacity
                    onPress={() => setActiveConversation(null)}
                    style={styles.convBackBtn}
                  >
                    <Text style={styles.convBackBtnText}>← All Conversations</Text>
                  </TouchableOpacity>
                  <Text style={styles.convActiveTitle} numberOfLines={1}>
                    {activeConversation.title || 'Faculty Communication'}
                  </Text>
                </View>

                {/* Messages List */}
                <ScrollView
                  style={styles.messagesList}
                  contentContainerStyle={styles.messagesListContent}
                  showsVerticalScrollIndicator={false}
                >
                  {messages.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Text style={styles.emptyIcon}>💬</Text>
                      <Text style={styles.emptyTitle}>No Messages Yet</Text>
                      <Text style={styles.emptySub}>
                        Send a message below to start chatting with the teacher.
                      </Text>
                    </View>
                  ) : (
                    messages.map((m) => {
                      const isMine = m.senderId === user?.id;
                      return (
                        <View
                          key={m.id}
                          style={[
                            styles.msgBubble,
                            isMine ? styles.msgMine : styles.msgOther,
                          ]}
                        >
                          <Text style={[styles.msgSender, isMine && styles.msgSenderMine]}>
                            {isMine ? 'You' : m.sender?.fullName || 'Teacher'}
                          </Text>

                          {m.attachmentType === 'AUDIO' && (
                            <Text style={styles.msgAttachment}>🎤 Voice note attachment</Text>
                          )}
                          {m.attachmentType === 'IMAGE' && (
                            <Text style={styles.msgAttachment}>📷 Photo attachment</Text>
                          )}
                          {m.attachmentType === 'DOCUMENT' && (
                            <Text style={styles.msgAttachment}>
                              📄 {m.attachmentName || 'Document'}
                            </Text>
                          )}

                          {Boolean(m.body || m.content) && (
                            <Text
                              style={[
                                styles.msgText,
                                isMine && styles.msgTextMine,
                              ]}
                            >
                              {m.body || m.content}
                            </Text>
                          )}

                          <Text
                            style={[
                              styles.msgTime,
                              isMine && styles.msgTimeMine,
                            ]}
                          >
                            {new Date(m.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                        </View>
                      );
                    })
                  )}
                </ScrollView>

                {/* Chat Input Bar */}
                <View style={styles.chatInputBar}>
                  <TextInput
                    style={styles.chatTextInput}
                    placeholder="Type your message to faculty..."
                    placeholderTextColor="#8D6E63"
                    value={newMessage}
                    onChangeText={setNewMessage}
                    multiline
                  />
                  <TouchableOpacity
                    style={[
                      styles.chatSendBtn,
                      (!newMessage.trim() || sendingMsg) && styles.chatSendBtnDisabled,
                    ]}
                    onPress={handleSendMessage}
                    disabled={!newMessage.trim() || sendingMsg}
                  >
                    {sendingMsg ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.chatSendBtnText}>Send</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
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
                    <Text style={styles.tabHeading}>Teacher Communications</Text>
                    <Text style={styles.tabSub}>
                      Direct discussions with assigned batch faculty
                    </Text>
                  </View>
                </View>

                {/* Assigned Faculty Section */}
                {childTeachers.length > 0 && (
                  <View style={styles.teachersSection}>
                    <Text style={styles.sectionHeading}>ASSIGNED TEACHERS</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.teachersRow}
                    >
                      {childTeachers.map((teach: any) => (
                        <View key={teach.userId} style={styles.teacherCard}>
                          <View style={styles.teacherAvatar}>
                            <Text style={styles.teacherAvatarText}>
                              {teach.fullName?.[0] || 'T'}
                            </Text>
                          </View>
                          <Text style={styles.teacherName} numberOfLines={1}>
                            {teach.fullName}
                          </Text>
                          <Text style={styles.teacherSubject} numberOfLines={1}>
                            {teach.subjects?.join(', ') || teach.designation || 'Faculty'}
                          </Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Active Conversations */}
                <Text style={[styles.sectionHeading, { marginTop: 12 }]}>
                  CONVERSATIONS
                </Text>

                {conversations.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyIcon}>💬</Text>
                    <Text style={styles.emptyTitle}>No Conversations Found</Text>
                    <Text style={styles.emptySub}>
                      Your message threads with academy staff will appear here.
                    </Text>
                  </View>
                ) : (
                  conversations.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={styles.itemCard}
                      onPress={() => openConversation(c)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.itemCardHeader}>
                        <View
                          style={[
                            styles.itemIconBox,
                            { backgroundColor: '#F5ECE8' },
                          ]}
                        >
                          <Text style={styles.itemIcon}>💬</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemCardTitle}>
                            {c.title || 'Teacher Communication'}
                          </Text>
                          <Text style={styles.itemCardSub}>
                            Tap to view messages & reply
                          </Text>
                        </View>
                        <Text style={styles.menuArrow}>›</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        )}

        {/* TAB 5: MORE MENU */}
        {activeTab === 'more' && (
          <ParentMoreTab
            user={user}
            institute={institute}
            selectedChild={selectedChild}
            children={children}
            onSelectChild={handleSelectChild}
            childStatement={childStatement}
            unreadCount={unreadNotifCount}
            unreadMessagesCount={unreadMessagesCount}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenNotifications={() => setShowNotificationModal(true)}
            onOpenReviewModal={() => setShowReviewModal(true)}
            onSignOut={logout}
          />
        )}

        {/* SUB-VIEW: ACADEMIC PROGRESS REPORTS */}
        {activeTab === 'progress' && (
          <ScrollView
            style={styles.tabContent}
            contentContainerStyle={styles.tabScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.tabHeaderRow}>
              <View>
                <Text style={styles.tabHeading}>Teacher Progress Reports</Text>
                <Text style={styles.tabSub}>
                  Published evaluations for {selectedChild?.user?.fullName || 'Child'}
                </Text>
              </View>
            </View>

            {childProgressReports.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>📊</Text>
                <Text style={styles.emptyTitle}>No Progress Reports Published</Text>
                <Text style={styles.emptySub}>
                  Teachers have not published term evaluations for this student yet.
                </Text>
              </View>
            ) : (
              childProgressReports.map((pr: any) => (
                <View key={pr.id} style={styles.itemCard}>
                  <View style={styles.itemCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemCardTitle}>{pr.termName}</Text>
                      <Text style={styles.itemCardSub}>
                        Faculty: {pr.teacher || 'Assigned Staff'} &bull;{' '}
                        {pr.periodType || 'TERM'}
                      </Text>
                    </View>
                    <View style={styles.ratingBadge}>
                      <Text style={styles.ratingBadgeText}>
                        {pr.rating || 5}/5 ★
                      </Text>
                    </View>
                  </View>

                  {/* Auto-Calculated Indicators */}
                  {(pr.attendanceRate !== null ||
                    pr.homeworkRate !== null ||
                    pr.examAverage !== null) && (
                    <View style={styles.progressMetricsRow}>
                      <View style={styles.progressMetricCol}>
                        <Text style={styles.progressMetricLabel}>ATTENDANCE</Text>
                        <Text style={styles.progressMetricVal}>
                          {pr.attendanceRate !== null ? `${pr.attendanceRate}%` : 'N/A'}
                        </Text>
                      </View>
                      <View style={styles.metricDivider} />
                      <View style={styles.progressMetricCol}>
                        <Text style={styles.progressMetricLabel}>HOMEWORK</Text>
                        <Text style={styles.progressMetricVal}>
                          {pr.homeworkRate !== null ? `${pr.homeworkRate}%` : 'N/A'}
                        </Text>
                      </View>
                      <View style={styles.metricDivider} />
                      <View style={styles.progressMetricCol}>
                        <Text style={styles.progressMetricLabel}>TEST AVG</Text>
                        <Text style={styles.progressMetricVal}>
                          {pr.examAverage !== null ? `${pr.examAverage}%` : 'N/A'}
                        </Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.remarksBox}>
                    <Text style={styles.remarksText}>"{pr.remarks}"</Text>
                  </View>

                  {pr.strengths ? (
                    <View style={[styles.feedbackBox, styles.strengthsBox]}>
                      <Text style={styles.strengthsText}>
                        STRENGTHS: {pr.strengths}
                      </Text>
                    </View>
                  ) : null}

                  {pr.improvements ? (
                    <View style={[styles.feedbackBox, styles.improvementsBox]}>
                      <Text style={styles.improvementsText}>
                        AREAS TO IMPROVE: {pr.improvements}
                      </Text>
                    </View>
                  ) : null}

                  {pr.recommendations ? (
                    <View style={[styles.feedbackBox, styles.recommendationsBox]}>
                      <Text style={styles.recommendationsText}>
                        RECOMMENDATIONS: {pr.recommendations}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ))
            )}
          </ScrollView>
        )}

        {/* SUB-VIEW: HOMEWORK & SUBMISSIONS */}
        {activeTab === 'homework' && (
          <ScrollView
            style={styles.tabContent}
            contentContainerStyle={styles.tabScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.tabHeaderRow}>
              <View>
                <Text style={styles.tabHeading}>Homework & Tasks</Text>
                <Text style={styles.tabSub}>
                  Assignments and submission statuses for {selectedChild?.user?.fullName || 'Child'}
                </Text>
              </View>
            </View>

            {/* Status Filter Chips */}
            <View style={styles.filterChipsRow}>
              {(['ALL', 'PENDING', 'SUBMITTED', 'GRADED'] as const).map((status) => {
                const isSel = homeworkFilterStatus === status;
                return (
                  <TouchableOpacity
                    key={status}
                    onPress={() => setHomeworkFilterStatus(status)}
                    style={[styles.filterChip, isSel && styles.filterChipActive]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        isSel && styles.filterChipTextActive,
                      ]}
                    >
                      {status}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {filteredHomework.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>📝</Text>
                <Text style={styles.emptyTitle}>No Homework Found</Text>
                <Text style={styles.emptySub}>
                  There are no homework items matching this status filter.
                </Text>
              </View>
            ) : (
              filteredHomework.map((hw: any) => {
                const isGraded = hw.submissionStatus === 'GRADED' || hw.submissionStatus === 'COMPLETED';
                const isSubmitted = hw.submissionStatus === 'SUBMITTED';

                return (
                  <View key={hw.id} style={styles.itemCard}>
                    <View style={styles.itemCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemCardTitle}>{hw.title}</Text>
                        <Text style={styles.itemCardSub}>
                          {hw.subject || 'Class Subject'} &bull; Teacher: {hw.teacher || 'Faculty'}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          isGraded
                            ? styles.badgeGreen
                            : isSubmitted
                            ? styles.badgeBlue
                            : styles.badgeOrange,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            isGraded
                              ? styles.badgeGreenText
                              : isSubmitted
                              ? styles.badgeBlueText
                              : styles.badgeOrangeText,
                          ]}
                        >
                          {hw.submissionStatus || 'PENDING'}
                        </Text>
                      </View>
                    </View>

                    {hw.description ? (
                      <Text style={styles.itemCardDesc}>{hw.description}</Text>
                    ) : null}

                    <View style={styles.itemCardFooter}>
                      <Text style={styles.hwDueText}>
                        📅 Due:{' '}
                        {hw.dueDate
                          ? new Date(hw.dueDate).toLocaleDateString('en-IN')
                          : 'Open'}
                      </Text>
                      {hw.grade && (
                        <View style={styles.gradeBadge}>
                          <Text style={styles.gradeBadgeText}>Grade: {hw.grade}</Text>
                        </View>
                      )}
                    </View>

                    {hw.teacherFeedback && (
                      <View style={styles.feedbackRemarkBox}>
                        <Text style={styles.feedbackRemarkText}>
                          Teacher Feedback: "{hw.teacherFeedback}"
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        )}

        {/* SUB-VIEW: EXAMS & RESULTS */}
        {activeTab === 'results' && (
          <ScrollView
            style={styles.tabContent}
            contentContainerStyle={styles.tabScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.tabHeaderRow}>
              <View>
                <Text style={styles.tabHeading}>Examinations & Marks</Text>
                <Text style={styles.tabSub}>
                  Official report card & exam schedules
                </Text>
              </View>
            </View>

            {/* Cumulative Report Card Summary Card */}
            {childReportCard?.summary && childReportCard.summary.totalExams > 0 && (
              <View style={styles.reportCardSummary}>
                <View style={styles.rcSummaryHeader}>
                  <View>
                    <Text style={styles.rcSummaryLabel}>CUMULATIVE PERFORMANCE</Text>
                    <Text style={styles.rcSummaryVal}>
                      {childReportCard.summary.cumulativePercentage}%
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.rcStatusBadge,
                      childReportCard.summary.status === 'DISTINCTION'
                        ? styles.badgeGreen
                        : styles.badgeBlue,
                    ]}
                  >
                    <Text
                      style={[
                        styles.rcStatusBadgeText,
                        childReportCard.summary.status === 'DISTINCTION'
                          ? styles.badgeGreenText
                          : styles.badgeBlueText,
                      ]}
                    >
                      {childReportCard.summary.status}
                    </Text>
                  </View>
                </View>

                <Text style={styles.rcSummaryStats}>
                  Passed: {childReportCard.summary.totalPassed} of{' '}
                  {childReportCard.summary.totalExams} tests &bull; Score:{' '}
                  {childReportCard.summary.totalMarksObtained} /{' '}
                  {childReportCard.summary.totalMaxMarks} pts
                </Text>
              </View>
            )}

            {/* Exam Filters */}
            <View style={styles.filterChipsRow}>
              {(['ALL', 'RESULTS', 'UPCOMING'] as const).map((filter) => {
                const isSel = examFilter === filter;
                return (
                  <TouchableOpacity
                    key={filter}
                    onPress={() => setExamFilter(filter)}
                    style={[styles.filterChip, isSel && styles.filterChipActive]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        isSel && styles.filterChipTextActive,
                      ]}
                    >
                      {filter}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {filteredExams.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>🏆</Text>
                <Text style={styles.emptyTitle}>No Examination Records</Text>
                <Text style={styles.emptySub}>
                  There are no scheduled or published exams matching this filter.
                </Text>
              </View>
            ) : (
              filteredExams.map((ex: any) => {
                const mark = childReportCard?.marks?.find((m: any) => m.examId === ex.id);
                const isResultsPub = ex.isResultsPublished || !!mark;

                return (
                  <View key={ex.id} style={styles.itemCard}>
                    <View style={styles.itemCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemCardTitle}>{ex.title}</Text>
                        <Text style={styles.itemCardSub}>
                          {ex.subject?.name || ex.subject || 'Core Subject'} &bull; Max:{' '}
                          {ex.totalMarks || 100} pts
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          isResultsPub
                            ? mark?.isPassed
                              ? styles.badgeGreen
                              : styles.badgeDanger
                            : styles.badgeBlue,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            isResultsPub
                              ? mark?.isPassed
                                ? styles.badgeGreenText
                                : styles.badgeDangerText
                              : styles.badgeBlueText,
                          ]}
                        >
                          {isResultsPub
                            ? mark?.isPassed
                              ? 'CLEARED'
                              : mark?.isAbsent
                              ? 'ABSENT'
                              : 'PUBLISHED'
                            : 'SCHEDULED'}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.examDateText}>
                      📅 Date: {new Date(ex.examDate).toLocaleDateString('en-IN')}
                      {ex.startTime ? ` (${ex.startTime}${ex.endTime ? ' - ' + ex.endTime : ''})` : ''}
                    </Text>

                    {mark ? (
                      <View
                        style={[
                          styles.markScoreBox,
                          mark.isPassed ? styles.markScorePass : styles.markScoreFail,
                        ]}
                      >
                        <Text
                          style={[
                            styles.markScoreText,
                            mark.isPassed ? styles.markScoreTextPass : styles.markScoreTextFail,
                          ]}
                        >
                          Score: {mark.marksObtained} / {mark.maxMarks} ({mark.percentage}%) &bull; Grade: {mark.grade}
                        </Text>
                        {mark.remarks ? (
                          <Text style={styles.markRemarksText}>
                            "{mark.remarks}"
                          </Text>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}
          </ScrollView>
        )}

        {/* SUB-VIEW: FEES & RECEIPTS */}
        {activeTab === 'fees' && (
          <ScrollView
            style={styles.tabContent}
            contentContainerStyle={styles.tabScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.tabHeaderRow}>
              <View>
                <Text style={styles.tabHeading}>Fee Statement & Receipts</Text>
                <Text style={styles.tabSub}>
                  Tuition invoices and payment history for {selectedChild?.user?.fullName || 'Child'}
                </Text>
              </View>
            </View>

            {/* Financial Overview Card */}
            <View style={styles.itemCard}>
              <Text style={styles.sectionHeading}>FINANCIAL SUMMARY</Text>
              <View style={styles.feeOverviewGrid}>
                <View style={styles.feeOverviewCol}>
                  <Text style={styles.feeOverviewLabel}>ASSIGNED</Text>
                  <Text style={styles.feeOverviewVal}>
                    {formatRupee(childStatement?.summary?.totalAssigned || 0)}
                  </Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.feeOverviewCol}>
                  <Text style={styles.feeOverviewLabel}>PAID</Text>
                  <Text style={[styles.feeOverviewVal, { color: '#059669' }]}>
                    {formatRupee(childStatement?.summary?.totalPaid || 0)}
                  </Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.feeOverviewCol}>
                  <Text style={styles.feeOverviewLabel}>OUTSTANDING</Text>
                  <Text
                    style={[
                      styles.feeOverviewVal,
                      {
                        color:
                          (childStatement?.summary?.outstandingBalance || 0) > 0
                            ? '#DC2626'
                            : '#2D1E18',
                      },
                    ]}
                  >
                    {formatRupee(childStatement?.summary?.outstandingBalance || 0)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Payment Receipts List */}
            <Text style={[styles.sectionHeading, { marginTop: 14 }]}>
              PAYMENT RECEIPTS
            </Text>

            {childStatement?.payments?.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>🧾</Text>
                <Text style={styles.emptyTitle}>No Payments Recorded</Text>
                <Text style={styles.emptySub}>
                  There are no completed payments found for this student.
                </Text>
              </View>
            ) : (
              childStatement?.payments?.map((pm: any) => (
                <View key={pm.id} style={styles.itemCard}>
                  <View style={styles.itemCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.paymentAmt}>{formatRupee(pm.amount)}</Text>
                      <Text style={styles.itemCardSub}>
                        Method: {pm.paymentMethod || 'UPI'} &bull;{' '}
                        {new Date(pm.paidAt || pm.createdAt).toLocaleDateString('en-IN')}
                      </Text>
                      {pm.receiptNumber && (
                        <Text style={styles.receiptNoText}>
                          Receipt #{pm.receiptNumber}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.itemActionBtn}
                      onPress={() => handleOpenReceipt(pm.id)}
                    >
                      <Text style={styles.itemActionBtnText}>View Receipt 📄</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )}

        {/* SUB-VIEW: CLASS TIMETABLE */}
        {activeTab === 'timetable' && (
          <ScrollView
            style={styles.tabContent}
            contentContainerStyle={styles.tabScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.tabHeaderRow}>
              <View>
                <Text style={styles.tabHeading}>Class Timetable</Text>
                <Text style={styles.tabSub}>
                  Weekly schedule for {selectedChild?.batch?.name || 'Assigned Batch'}
                </Text>
              </View>
            </View>

            {childTimetable.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>📅</Text>
                <Text style={styles.emptyTitle}>No Timetable Available</Text>
                <Text style={styles.emptySub}>
                  Class timetable is not configured yet for this batch.
                </Text>
              </View>
            ) : (
              childTimetable.map((subj: any, index: number) => (
                <View key={`${subj.id || index}`} style={styles.itemCard}>
                  <View style={styles.itemCardHeader}>
                    <View
                      style={[
                        styles.itemIconBox,
                        { backgroundColor: '#EFF6FF' },
                      ]}
                    >
                      <Text style={styles.itemIcon}>📖</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemCardTitle}>{subj.name}</Text>
                      <Text style={styles.itemCardSub}>
                        Code: {subj.code || 'SUBJ'} &bull; Faculty: {subj.teacher}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.timetableScheduleBox}>
                    <Text style={styles.timetableScheduleText}>
                      ⏱ Schedule: {subj.schedule}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )}

        {/* SUB-VIEW: REVIEWS & PRIVATE INQUIRIES */}
        {activeTab === 'reviews' && (
          <ScrollView
            style={styles.tabContent}
            contentContainerStyle={styles.tabScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.tabHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.tabHeading}>Reviews & Private Inquiries</Text>
                <Text style={styles.tabSub}>
                  Confidential questions to institute management & official replies
                </Text>
              </View>
              <TouchableOpacity
                style={styles.writeReviewBtn}
                onPress={() => setShowReviewModal(true)}
              >
                <Text style={styles.writeReviewBtnText}>+ Write</Text>
              </TouchableOpacity>
            </View>

            {reviews.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>⭐</Text>
                <Text style={styles.emptyTitle}>No Reviews Submitted Yet</Text>
                <Text style={styles.emptySub}>
                  You have not submitted any reviews or private inquiries. Tap '+ Write' to contact academy management.
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
                    <Text style={styles.itemCardDate}>
                      📅 {new Date(rev.createdAt).toLocaleDateString('en-IN')}
                    </Text>
                  </View>

                  {rev.subject ? (
                    <Text style={styles.reviewSubjectText}>{rev.subject}</Text>
                  ) : null}

                  <Text style={styles.reviewBodyText}>
                    {rev.reviewText || rev.comment}
                  </Text>

                  {/* Official Reply Box */}
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

        {/* SUB-VIEW: FAMILY & PROFILE DETAILS */}
        {activeTab === 'profile' && (
          <ScrollView
            style={styles.tabContent}
            contentContainerStyle={styles.tabScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.tabHeaderRow}>
              <View>
                <Text style={styles.tabHeading}>Family & Account Details</Text>
                <Text style={styles.tabSub}>
                  Parent profile & verified linked students
                </Text>
              </View>
            </View>

            <View style={styles.itemCard}>
              <Text style={styles.sectionHeading}>PARENT ACCOUNT</Text>
              <View style={styles.profileRow}>
                <Text style={styles.profileFieldLabel}>Full Name:</Text>
                <Text style={styles.profileFieldValue}>{user?.fullName || '—'}</Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileFieldLabel}>Phone Number:</Text>
                <Text style={styles.profileFieldValue}>{user?.phone || 'On file'}</Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileFieldLabel}>Email:</Text>
                <Text style={styles.profileFieldValue}>{user?.email || '—'}</Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileFieldLabel}>Account Role:</Text>
                <Text style={styles.profileFieldValue}>{user?.role || 'PARENT'}</Text>
              </View>
            </View>

            <View style={styles.itemCard}>
              <Text style={styles.sectionHeading}>INSTITUTE CONTEXT</Text>
              <View style={styles.profileRow}>
                <Text style={styles.profileFieldLabel}>Institute Name:</Text>
                <Text style={styles.profileFieldValue}>
                  {institute?.name || 'TuitionOS Academy'}
                </Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileFieldLabel}>Institute Code:</Text>
                <Text style={styles.profileFieldValue}>
                  {institute?.code || 'INST'}
                </Text>
              </View>
            </View>

            <Text style={[styles.sectionHeading, { marginTop: 14 }]}>
              VERIFIED LINKED CHILDREN ({children.length})
            </Text>

            {children.map((child: any) => (
              <View key={child.id} style={styles.itemCard}>
                <View style={styles.itemCardHeader}>
                  <View style={styles.avatarCircleSmall}>
                    <Text style={styles.avatarSmallText}>
                      {child.user?.fullName?.[0] || 'C'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemCardTitle}>
                      {child.user?.fullName || `${child.firstName || ''} ${child.lastName || ''}`.trim()}
                    </Text>
                    <Text style={styles.itemCardSub}>
                      {child.batch?.name || child.batchName || 'Class'} &bull; Roll:{' '}
                      {child.rollNumber || child.admissionNumber}
                    </Text>
                  </View>
                </View>

                <View style={styles.profileRow}>
                  <Text style={styles.profileFieldLabel}>Relationship:</Text>
                  <Text style={styles.profileFieldValue}>
                    {child.relationship || 'Guardian'}
                  </Text>
                </View>
                <View style={styles.profileRow}>
                  <Text style={styles.profileFieldLabel}>Primary Contact:</Text>
                  <Text style={styles.profileFieldValue}>
                    {child.isPrimaryContact ? 'Yes ✓' : 'Secondary'}
                  </Text>
                </View>
                <View style={styles.profileRow}>
                  <Text style={styles.profileFieldLabel}>SMS Alerts Active:</Text>
                  <Text style={styles.profileFieldValue}>
                    {child.canReceiveSms !== false ? 'Enabled ✓' : 'Disabled'}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
        </FadeInView>
      </View>

      {/* Review / Private Inquiry Modal */}
      <Modal
        visible={showReviewModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReviewModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowReviewModal(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <AnimatedDialog style={styles.modalCard}>
            <Text style={styles.modalTitle}>Write Private Inquiry / Review</Text>
            <Text style={styles.modalSub}>
              Directly delivered to TuitionOS academy administration
            </Text>

            {/* Stars Selector */}
            <View style={styles.starsSelectRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setReviewRating(star)}
                  style={styles.starSelectBtn}
                >
                  <Text
                    style={[
                      styles.starSelectText,
                      reviewRating >= star && styles.starSelectActive,
                    ]}
                  >
                    ★
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Subject (e.g. Attendance concern, Fee inquiry, Faculty feedback)"
              placeholderTextColor="#8D6E63"
              value={reviewSubject}
              onChangeText={setReviewSubject}
            />

            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              multiline
              numberOfLines={4}
              placeholder="Write your detailed inquiry or review message here..."
              placeholderTextColor="#8D6E63"
              value={reviewComment}
              onChangeText={setReviewComment}
            />

            <View style={styles.modalBtnRow}>
              <PressableScale
                onPress={() => setShowReviewModal(false)}
                style={styles.modalCancelBtn}
                disabled={submittingReview}
                activeScale={0.96}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </PressableScale>
              <PressableScale
                onPress={handleSubmitReview}
                style={[
                  styles.modalSubmitBtn,
                  submittingReview && styles.modalSubmitBtnDisabled,
                ]}
                disabled={submittingReview}
                activeScale={0.96}
                accessibilityRole="button"
                accessibilityLabel="Submit Message"
              >
                {submittingReview ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Submit Message</Text>
                )}
              </PressableScale>
            </View>
              </AnimatedDialog>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Receipt Modal */}
      <ReceiptModal
        visible={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        receipt={selectedReceipt}
      />

      {/* Notification Modal */}
      <NotificationModal
        visible={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        onUnreadCountChange={setUnreadNotifCount}
        onNavigateToEntity={handleNavigateToEntity}
      />

      {/* Material Viewer Modal */}
      <MaterialViewerModal
        visible={!!activeViewingMaterial}
        material={activeViewingMaterial}
        onClose={() => setActiveViewingMaterial(null)}
      />

      {/* Pinned Bottom Navigation */}
      <ParentBottomNav
        activeTab={activeTab}
        onSelectTab={(tab: ParentPrimaryTab) => setActiveTab(tab)}
        unreadCount={unreadNotifCount}
        unreadMessagesCount={unreadMessagesCount}
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

  // Tab content scrollable
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

  // Filter Chips Row
  filterChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    paddingVertical: 2,
  },
  filterChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#D7CCC8',
  },
  filterChipActive: {
    backgroundColor: '#4E342E',
    borderColor: '#4E342E',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4E342E',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
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
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F5ECE8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  itemIcon: {
    fontSize: 18,
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
  itemCardDesc: {
    fontSize: 11,
    color: '#6D4C41',
    lineHeight: 16,
    marginTop: 8,
  },
  itemCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5ECE8',
  },
  itemCardDate: {
    fontSize: 10,
    color: '#8D6E63',
  },
  itemActionBtn: {
    backgroundColor: '#F5ECE8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#D7CCC8',
  },
  itemActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4E342E',
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

  // Homework details
  hwDueText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C2410C',
  },
  gradeBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  gradeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2E7D32',
  },
  feedbackRemarkBox: {
    backgroundColor: '#FAF7F5',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#EFEBE9',
  },
  feedbackRemarkText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#4E342E',
  },

  // Report Card Summary
  reportCardSummary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    marginBottom: 12,
  },
  rcSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  rcSummaryLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8D6E63',
    letterSpacing: 0.5,
  },
  rcSummaryVal: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2D1E18',
    marginTop: 2,
  },
  rcStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rcStatusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  rcSummaryStats: {
    fontSize: 11,
    color: '#8D6E63',
  },

  // Exam Score Boxes
  examDateText: {
    fontSize: 11,
    color: '#8D6E63',
    marginTop: 6,
  },
  markScoreBox: {
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  markScorePass: {
    backgroundColor: '#E8F5E9',
  },
  markScoreFail: {
    backgroundColor: '#FFEBEE',
  },
  markScoreText: {
    fontSize: 12,
    fontWeight: '800',
  },
  markScoreTextPass: {
    color: '#2E7D32',
  },
  markScoreTextFail: {
    color: '#C62828',
  },
  markRemarksText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#4E342E',
    marginTop: 4,
  },

  // Progress Reports
  ratingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ratingBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
  },
  progressMetricsRow: {
    flexDirection: 'row',
    backgroundColor: '#FAF7F5',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    justifyContent: 'space-around',
  },
  progressMetricCol: {
    alignItems: 'center',
    flex: 1,
  },
  progressMetricLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#8D6E63',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  progressMetricVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2D1E18',
  },
  metricDivider: {
    width: 1,
    backgroundColor: '#EFEBE9',
  },
  remarksBox: {
    backgroundColor: '#FAF7F5',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  remarksText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#4E342E',
    lineHeight: 16,
  },
  feedbackBox: {
    borderRadius: 6,
    padding: 6,
    marginTop: 4,
  },
  strengthsBox: {
    backgroundColor: '#E8F5E9',
  },
  strengthsText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2E7D32',
  },
  improvementsBox: {
    backgroundColor: '#FFF3E0',
  },
  improvementsText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E65100',
  },
  recommendationsBox: {
    backgroundColor: '#E1F5FE',
  },
  recommendationsText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0277BD',
  },

  // Fees Overview
  feeOverviewGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  feeOverviewCol: {
    alignItems: 'center',
    flex: 1,
  },
  feeOverviewLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8D6E63',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  feeOverviewVal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#2D1E18',
  },
  paymentAmt: {
    fontSize: 15,
    fontWeight: '900',
    color: '#2D1E18',
  },
  receiptNoText: {
    fontSize: 10,
    color: '#8D6E63',
    marginTop: 2,
  },

  // Timetable
  timetableScheduleBox: {
    backgroundColor: '#FAF7F5',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  timetableScheduleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4E342E',
  },

  // Reviews & Inquiries
  writeReviewBtn: {
    backgroundColor: '#4E342E',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  writeReviewBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
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
  reviewBodyText: {
    fontSize: 12,
    color: '#6D4C41',
    lineHeight: 16,
    marginTop: 4,
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

  // Profile Details
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8D6E63',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
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
  avatarCircleSmall: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F5ECE8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#D7CCC8',
  },
  avatarSmallText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4E342E',
  },

  // Messaging UI
  messagesContainer: {
    flex: 1,
  },
  convActiveHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEBE9',
  },
  convBackBtn: {
    paddingVertical: 2,
    marginBottom: 4,
  },
  convBackBtnText: {
    fontSize: 12,
    color: '#4E342E',
    fontWeight: '700',
  },
  convActiveTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2D1E18',
  },
  messagesList: {
    flex: 1,
  },
  messagesListContent: {
    padding: 16,
    paddingBottom: 20,
    gap: 8,
  },
  msgBubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 14,
    marginBottom: 6,
  },
  msgMine: {
    alignSelf: 'flex-end',
    backgroundColor: '#4E342E',
    borderBottomRightRadius: 2,
  },
  msgOther: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: '#EFEBE9',
  },
  msgSender: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8D6E63',
    marginBottom: 2,
  },
  msgSenderMine: {
    color: '#D7CCC8',
  },
  msgAttachment: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#D7CCC8',
    marginBottom: 2,
  },
  msgText: {
    fontSize: 13,
    color: '#2D1E18',
    lineHeight: 18,
  },
  msgTextMine: {
    color: '#FFFFFF',
  },
  msgTime: {
    fontSize: 9,
    color: '#8D6E63',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  msgTimeMine: {
    color: '#D7CCC8',
  },
  chatInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#EFEBE9',
    gap: 8,
    marginBottom: 60, // Space above bottom nav
  },
  chatTextInput: {
    flex: 1,
    backgroundColor: '#FAF7F5',
    borderWidth: 1,
    borderColor: '#D7CCC8',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#2D1E18',
    maxHeight: 80,
  },
  chatSendBtn: {
    backgroundColor: '#4E342E',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  chatSendBtnDisabled: {
    opacity: 0.5,
  },
  chatSendBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

  // Teachers Row
  teachersSection: {
    marginBottom: 10,
  },
  teachersRow: {
    gap: 8,
    paddingVertical: 2,
  },
  teacherCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFEBE9',
    width: 110,
  },
  teacherAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5ECE8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  teacherAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4E342E',
  },
  teacherName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2D1E18',
  },
  teacherSubject: {
    fontSize: 9,
    color: '#8D6E63',
    marginTop: 1,
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
  starsSelectRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  starSelectBtn: {
    padding: 4,
  },
  starSelectText: {
    fontSize: 28,
    color: '#D7CCC8',
  },
  starSelectActive: {
    color: '#F59E0B',
  },
  modalInput: {
    backgroundColor: '#FAF7F5',
    borderWidth: 1,
    borderColor: '#D7CCC8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#2D1E18',
    marginBottom: 8,
  },
  modalTextArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
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
  menuArrow: {
    fontSize: 18,
    fontWeight: '600',
    color: '#D7CCC8',
    marginLeft: 6,
  },
});
