import { Search, X, Users, Mic, BookOpen, FileText, Trophy, MessageSquare, BarChart2, Calendar, Phone, ArrowRight, Paperclip } from 'lucide-react-native';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMobileAuth } from '../../context/AuthContext';
import { useMobileToast } from '../../context/ToastContext';
import { mobileApiFetch, generateIdempotencyKey } from '../../services/api';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { NotificationModal } from '../../components/NotificationModal';
import { PushNotificationService } from '../../services/pushNotification.service';
import { StudentAvatar } from '../../components/StudentAvatar';
import { PressableScale, AnimatedDialog, FadeInView } from '../../theme/motion';
import { TouchableWithoutFeedback } from 'react-native';
import { StudentDetailsModal } from '../../components/StudentDetailsModal';
import { AdmitStudentModal } from '../../components/AdmitStudentModal';
import { StaffExamGradingModal } from '../../components/StaffExamGradingModal';
import { StaffReviewReplyModal } from '../../components/StaffReviewReplyModal';
import { MaterialAnalyticsModal } from '../../components/MaterialAnalyticsModal';
import { StaffMyAttendanceModal } from '../../components/StaffMyAttendanceModal';
import { StaffMyPayslipsModal } from '../../components/StaffMyPayslipsModal';
import { AIQuestionGeneratorModal } from '../../components/AIQuestionGeneratorModal';
import { MobileButton } from '../../components/ui';
import { themeTokens, matchStudentVoice, EnrolledStudentCandidate } from '@tuition/shared';

// Modular Staff Components
import { StaffBottomNav, StaffActiveTab, StaffPrimaryTab } from './components/StaffBottomNav';
import { StaffHomeTab } from './components/StaffHomeTab';
import { StaffMoreTab } from './components/StaffMoreTab';

export const StaffScreen: React.FC = () => {
  const { user, institute, logout } = useMobileAuth();
  const { showToast } = useMobileToast();
  const insets = useSafeAreaInsets();

  // Active navigation tab (Home is default mobile-first entry)
  const [activeTab, setActiveTab] = useState<StaffActiveTab>('home');
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Staff Core Data
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [totalStudentsCount, setTotalStudentsCount] = useState(0);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [examsList, setExamsList] = useState<any[]>([]);
  const [gradingExam, setGradingExam] = useState<any | null>(null);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [showStaffAttendanceModal, setShowStaffAttendanceModal] = useState(false);
  const [showStaffPayslipsModal, setShowStaffPayslipsModal] = useState(false);
  const [showQuestionGenModal, setShowQuestionGenModal] = useState(false);
  const [analyticsMaterial, setAnalyticsMaterial] = useState<any | null>(null);
  const [homeworkList, setHomeworkList] = useState<any[]>([]);
  const [materialsList, setMaterialsList] = useState<any[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<any | null>(null);

  // Homework Review & Grading State
  const [reviewHw, setReviewHw] = useState<any | null>(null);
  const [reviewData, setReviewData] = useState<any | null>(null);
  const [loadingReview, setLoadingReview] = useState(false);
  const [gradingSubId, setGradingSubId] = useState<string | null>(null);
  const [gradeText, setGradeText] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [gradingSubmitting, setGradingSubmitting] = useState(false);

  // New Material Creation State
  const [showNewMaterialModal, setShowNewMaterialModal] = useState(false);
  const [matTitle, setMatTitle] = useState('');
  const [matType, setMatType] = useState('PDF');
  const [matDesc, setMatDesc] = useState('');
  const [matContent, setMatContent] = useState('');
  const [matSubmitting, setMatSubmitting] = useState(false);

  // Conversations & Parent Chat
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversation, setActiveConversation] = useState<any>(null);
  const [activeMessages, setActiveMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newStaffMessage, setNewStaffMessage] = useState('');
  const [sendingStaffMessage, setSendingStaffMessage] = useState(false);

  // Modals & Student Management
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

  // Voice Attendance State
  const [voiceQuery, setVoiceQuery] = useState('');
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [pendingVoiceCandidate, setPendingVoiceCandidate] = useState<any>(null);
  const [voiceDisambiguation, setVoiceDisambiguation] = useState<any[]>([]);
  const [voiceSubmitting, setVoiceSubmitting] = useState(false);

  // Attendance Manual Check-in State
  const [selectedStudentForAtt, setSelectedStudentForAtt] = useState<any>(null);
  const [attStatus, setAttStatus] = useState<'PRESENT' | 'ABSENT' | 'LATE'>('PRESENT');
  const [attType, setAttType] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');
  const [attSubmitting, setAttSubmitting] = useState(false);

  // Homework Creation State
  const [showNewHwModal, setShowNewHwModal] = useState(false);
  const [hwTitle, setHwTitle] = useState('');
  const [hwDesc, setHwDesc] = useState('');
  const [hwDueDate, setHwDueDate] = useState('');
  const [hwSubmitting, setHwSubmitting] = useState(false);

  const loadStudentsForBatch = async (batchId: string, subjectId?: string) => {
    try {
      const q = new URLSearchParams({ batchId, ...(subjectId ? { subjectId } : {}) });
      const res = await mobileApiFetch(`/students?${q.toString()}`);
      if (res.success && res.data) {
        const list = Array.isArray(res.data) ? res.data : res.data.students || [];
        setStudents(list);
      }
    } catch (e) {
      console.warn('Error loading students for batch:', e);
    }
  };

  const fetchStaffData = useCallback(async () => {
    try {
      // 1. Fetch Batches
      const batchRes = await mobileApiFetch('/academics/batches');
      let currentBatchId: string | null = null;
      if (batchRes.success && batchRes.data) {
        const batchList = Array.isArray(batchRes.data) ? batchRes.data : batchRes.data.batches || [];
        setBatches(batchList);
        if (batchList.length > 0 && !selectedBatch) {
          setSelectedBatch(batchList[0]);
          currentBatchId = batchList[0].id;
          loadStudentsForBatch(batchList[0].id);
        } else if (selectedBatch) {
          currentBatchId = selectedBatch.id;
          loadStudentsForBatch(selectedBatch.id);
        }
      }

      // 2. Fetch All Students count across batches
      const allStudentsRes = await mobileApiFetch('/students');
      if (allStudentsRes.success && allStudentsRes.data) {
        const allList = Array.isArray(allStudentsRes.data) ? allStudentsRes.data : allStudentsRes.data.students || [];
        setTotalStudentsCount(allList.length);
      }

      // 3. Fetch Homework
      const hwRes = await mobileApiFetch('/homework');
      if (hwRes.success && hwRes.data) {
        setHomeworkList(Array.isArray(hwRes.data) ? hwRes.data : hwRes.data.homework || []);
      }

      // 4. Fetch Conversations
      const convRes = await mobileApiFetch('/messaging/conversations');
      if (convRes.success && convRes.data) {
        setConversations(Array.isArray(convRes.data) ? convRes.data : convRes.data.conversations || []);
      }

      // 5. Fetch Exams for Staff
      const examRes = await mobileApiFetch('/exams');
      if (examRes.success && examRes.data) {
        setExamsList(Array.isArray(examRes.data) ? examRes.data : examRes.data.exams || []);
      }

      // 6. Fetch Learning Materials
      const matRes = await mobileApiFetch('/materials');
      if (matRes.success && matRes.data) {
        setMaterialsList(Array.isArray(matRes.data) ? matRes.data : matRes.data.materials || []);
      }

      // 7. Fetch Today's Attendance Summary
      if (currentBatchId) {
        const attRes = await mobileApiFetch(`/attendance/summary?batchId=${currentBatchId}`);
        if (attRes.success && attRes.data) {
          setAttendanceSummary(attRes.data);
        }
      }

      // 8. Fetch Unread Notifications Count
      mobileApiFetch('/notifications/unread-count')
        .then((res) => {
          if (res.success && res.data?.unreadCount !== undefined) {
            setUnreadNotifCount(res.data.unreadCount);
          }
        })
        .catch(() => {});
    } catch (e) {
      console.warn('Error loading staff mobile data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedBatch]);

  useEffect(() => {
    fetchStaffData();
  }, [fetchStaffData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStaffData();
  };

  // Push Notification Tap Deep-Link Handler
  const handleNavigateToEntity = async (entityType: string, entityId: string, metadata?: any) => {
    const eType = String(entityType || '').toUpperCase();

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

    if (eType === 'HOMEWORK') {
      setActiveTab('homework');
    } else if (eType === 'EXAM') {
      setActiveTab('exams');
      const exam = examsList.find((e: any) => e.id === entityId);
      if (exam) {
        setGradingExam(exam);
      }
    } else if (eType === 'MATERIAL') {
      setActiveTab('materials');
    } else if (eType === 'MESSAGE') {
      setActiveTab('messages');
    } else if (eType === 'PROGRESS_REPORT') {
      setShowReviewsModal(true);
    } else if (eType === 'ATTENDANCE') {
      setActiveTab('attendance');
    }
  };

  useEffect(() => {
    const unsub = PushNotificationService.addTapListener((payload) => {
      if (payload.entityType && payload.entityId) {
        handleNavigateToEntity(payload.entityType, payload.entityId, payload.metadata);
      }
    });
    return unsub;
  }, [examsList]);

  const handleSelectBatch = (b: any) => {
    setSelectedBatch(b);
    setSelectedSubject(null);
    loadStudentsForBatch(b.id);

    // Fetch attendance summary for newly selected batch
    mobileApiFetch(`/attendance/summary?batchId=${b.id}`)
      .then((res) => {
        if (res.success && res.data) {
          setAttendanceSummary(res.data);
        }
      })
      .catch(() => {});
  };

  const handleRecordAttendance = async () => {
    if (!selectedStudentForAtt) {
      showToast('Please select a student first', 'warning');
      return;
    }

    setAttSubmitting(true);
    try {
      const idempotencyKey = generateIdempotencyKey('ATT');
      const endpoint = attType === 'CHECK_IN' ? '/attendance/check-in' : '/attendance/check-out';
      const res = await mobileApiFetch(endpoint, {
        method: 'POST',
        idempotencyKey,
        body: {
          studentId: selectedStudentForAtt.id,
          batchId: selectedBatch?.id,
          subjectId: selectedSubject?.id || undefined,
          isLate: attStatus === 'LATE',
          method: 'MANUAL',
        },
      });

      if (res.success) {
        showToast(
          `${attType === 'CHECK_IN' ? 'Check-In' : 'Check-Out'} marked as ${attStatus} for ${selectedStudentForAtt.user?.fullName || selectedStudentForAtt.firstName}.`,
          'success'
        );
        setSelectedStudentForAtt(null);
        if (selectedBatch) {
          loadStudentsForBatch(selectedBatch.id, selectedSubject?.id);
        }
      } else {
        showToast(res.error || 'Failed to record attendance', 'error');
      }
    } catch {
      showToast('Network connection issue', 'error');
    } finally {
      setAttSubmitting(false);
    }
  };

  const handleVoiceQueryChange = (text: string) => {
    setVoiceQuery(text);
    if (!text.trim() || students.length === 0) {
      setPendingVoiceCandidate(null);
      setVoiceDisambiguation([]);
      return;
    }
    const candidates: EnrolledStudentCandidate[] = students.map((s) => ({
      id: s.id,
      firstName: s.firstName || s.user?.fullName?.split(' ')[0] || '',
      lastName: s.lastName || s.user?.fullName?.split(' ').slice(1).join(' ') || '',
      admissionNumber: s.admissionNumber,
      rollNumber: s.rollNumber,
      phone: s.phone || s.user?.phone,
      status: s.status,
    }));

    const result = matchStudentVoice(text, candidates);
    if (result.status === 'EXACT_SINGLE' || result.status === 'FUZZY_SINGLE') {
      const matched = students.find((s) => s.id === result.bestMatch?.id);
      setPendingVoiceCandidate(matched || null);
      setVoiceDisambiguation([]);
    } else if (result.status === 'EXACT_MULTIPLE' || result.status === 'FUZZY_MULTIPLE') {
      setPendingVoiceCandidate(null);
      const matchIds = new Set(
        result.exactMatches.length > 0
          ? result.exactMatches.map((m) => m.id)
          : result.fuzzyMatches.map((m) => m.student.id)
      );
      setVoiceDisambiguation(students.filter((s) => matchIds.has(s.id)));
    } else {
      setPendingVoiceCandidate(null);
      setVoiceDisambiguation([]);
    }
  };

  const handleConfirmVoiceAttendance = async (student: any) => {
    setVoiceSubmitting(true);
    try {
      const isAlreadyCheckedIn = student.todayStatus === 'CHECKED_IN' || student.alreadyCheckedIn;
      const endpoint = isAlreadyCheckedIn ? '/attendance/check-out' : '/attendance/check-in';
      const actionLabel = isAlreadyCheckedIn ? 'Check-Out' : 'Check-In';
      const idempotencyKey = generateIdempotencyKey(isAlreadyCheckedIn ? 'V_OUT' : 'VOICE');

      const res = await mobileApiFetch(endpoint, {
        method: 'POST',
        idempotencyKey,
        body: {
          studentId: student.id,
          batchId: selectedBatch?.id,
          subjectId: selectedSubject?.id || undefined,
          isLate: false,
          method: 'VOICE_ASSISTED',
        },
      });

      if (res.success) {
        showToast(`Voice ${actionLabel} recorded for ${student.user?.fullName || student.firstName}!`, 'success');
        setVoiceQuery('');
        setPendingVoiceCandidate(null);
        setVoiceDisambiguation([]);
        if (selectedBatch) {
          loadStudentsForBatch(selectedBatch.id, selectedSubject?.id);
        }
      } else {
        showToast(res.error || `Could not record voice ${actionLabel}`, 'error');
      }
    } catch {
      showToast('Connection failed during voice attendance', 'error');
    } finally {
      setVoiceSubmitting(false);
    }
  };

  const openHomeworkReview = async (hw: any) => {
    setReviewHw(hw);
    setLoadingReview(true);
    setGradingSubId(null);
    setGradeText('');
    setFeedbackText('');
    try {
      const res = await mobileApiFetch(`/homework/${hw.id}/roster`);
      if (res.success && res.data) {
        setReviewData(res.data);
      } else {
        showToast(res.error || 'Failed to load submissions', 'error');
      }
    } catch {
      showToast('Network error loading submissions', 'error');
    } finally {
      setLoadingReview(false);
    }
  };

  const handleGradeSubmission = async (submissionId: string) => {
    if (!gradeText.trim()) {
      showToast('Please enter a grade or marks', 'warning');
      return;
    }

    setGradingSubmitting(true);
    try {
      const res = await mobileApiFetch(`/homework/submissions/${submissionId}/grade`, {
        method: 'PATCH',
        body: {
          grade: gradeText.trim(),
          feedback: feedbackText.trim() || undefined,
        },
      });

      if (res.success) {
        showToast('Submission graded and saved!', 'success');
        setGradingSubId(null);
        setGradeText('');
        setFeedbackText('');
        if (reviewHw) openHomeworkReview(reviewHw);
      } else {
        showToast(res.error || 'Could not save grade', 'error');
      }
    } catch {
      showToast('Network error while saving grade', 'error');
    } finally {
      setGradingSubmitting(false);
    }
  };

  const handleCreateMaterial = async () => {
    if (!matTitle.trim() || !selectedBatch) {
      showToast('Please enter material title and select batch', 'warning');
      return;
    }

    setMatSubmitting(true);
    try {
      const res = await mobileApiFetch('/materials', {
        method: 'POST',
        body: {
          title: matTitle.trim(),
          description: matDesc.trim() || undefined,
          content: matContent.trim() || undefined,
          type: matType,
          batchId: selectedBatch.id,
          subjectId: selectedSubject?.id || null,
          isPublished: true,
        },
      });

      if (res.success) {
        showToast('Material published to batch students', 'success');
        setShowNewMaterialModal(false);
        setMatTitle('');
        setMatDesc('');
        setMatContent('');
        fetchStaffData();
      } else {
        showToast(res.error || 'Could not publish material', 'error');
      }
    } catch {
      showToast('Server connection error', 'error');
    } finally {
      setMatSubmitting(false);
    }
  };

  const handleCreateHomework = async () => {
    if (!hwTitle.trim() || !selectedBatch) {
      showToast('Please fill in homework title', 'warning');
      return;
    }

    setHwSubmitting(true);
    try {
      const res = await mobileApiFetch('/homework', {
        method: 'POST',
        body: {
          title: hwTitle.trim(),
          description: hwDesc.trim(),
          batchId: selectedBatch.id,
          subjectId: selectedSubject?.id || null,
          dueDate: hwDueDate ? new Date(hwDueDate).toISOString() : new Date(Date.now() + 86400000 * 3).toISOString(),
          isPublished: true,
        },
      });

      if (res.success) {
        showToast('Homework assigned to batch!', 'success');
        setShowNewHwModal(false);
        setHwTitle('');
        setHwDesc('');
        setHwDueDate('');
        fetchStaffData();
      } else {
        showToast(res.error || 'Failed to assign homework', 'error');
      }
    } catch {
      showToast('Network issue creating homework', 'error');
    } finally {
      setHwSubmitting(false);
    }
  };

  const openStaffConversation = async (conv: any) => {
    setActiveConversation(conv);
    setLoadingMessages(true);
    try {
      const res = await mobileApiFetch(`/messaging/conversations/${conv.id}/messages`);
      if (res.success && res.data) {
        setActiveMessages(Array.isArray(res.data) ? res.data : res.data.messages || []);
      }
    } catch {
      showToast('Could not load message history', 'error');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendStaffMessage = async () => {
    if (!newStaffMessage.trim() || !activeConversation) return;

    setSendingStaffMessage(true);
    const textToSend = newStaffMessage.trim();
    setNewStaffMessage('');

    try {
      const res = await mobileApiFetch(`/messaging/conversations/${activeConversation.id}/messages`, {
        method: 'POST',
        body: {
          body: textToSend,
        },
      });

      if (res.success && res.data?.message) {
        setActiveMessages((prev) => [...prev, res.data.message]);
      } else {
        showToast(res.error || 'Could not send message', 'error');
        setNewStaffMessage(textToSend);
      }
    } catch {
      showToast('Message delivery failed', 'error');
      setNewStaffMessage(textToSend);
    } finally {
      setSendingStaffMessage(false);
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
    if (!statusConfirm.student) return;
    setStatusConfirm((prev) => ({ ...prev, loading: true }));
    try {
      const res = await mobileApiFetch(`/students/${statusConfirm.student.id}/status`, {
        method: 'PATCH',
        body: { status: statusConfirm.newStatus },
      });

      if (res.success) {
        showToast(
          `Student marked as ${statusConfirm.newStatus.replace('_', ' ')} successfully.`,
          'success'
        );
        setStatusConfirm({ isOpen: false, student: null, newStatus: '', loading: false });
        fetchStaffData();
      } else {
        showToast(res.error || 'Failed to update student status', 'error');
        setStatusConfirm((prev) => ({ ...prev, loading: false }));
      }
    } catch {
      showToast('Network error while updating status', 'error');
      setStatusConfirm((prev) => ({ ...prev, loading: false }));
    }
  };

  // Filter students by search query
  const filteredStudents = students.filter((s) => {
    if (!studentSearchQuery.trim()) return true;
    const q = studentSearchQuery.toLowerCase();
    const name = (s.user?.fullName || `${s.firstName} ${s.lastName}`).toLowerCase();
    const adm = (s.admissionNumber || '').toLowerCase();
    const roll = (s.rollNumber || '').toLowerCase();
    return name.includes(q) || adm.includes(q) || roll.includes(q);
  });

  // Calculate total unread count for the More badge
  const unreadMessagesCount = conversations.reduce(
    (acc, c) => acc + (c.unreadCount ? Number(c.unreadCount) : 0),
    0
  );

  // Dynamic Header Title & Subtitle based on active tab
  const getHeaderInfo = () => {
    switch (activeTab) {
      case 'home':
        return { title: 'Faculty Dashboard', subtitle: 'Overview & Quick Actions' };
      case 'students':
        return {
          title: 'Enrolled Students',
          subtitle: `${students.length} students in ${selectedBatch?.name || 'batch'}`,
        };
      case 'attendance':
        return { title: 'Class Attendance', subtitle: "Voice & manual student check-in" };
      case 'materials':
        return { title: 'Learning Materials', subtitle: 'Study notes, files & analytics' };
      case 'more':
        return { title: 'Staff Workspace', subtitle: 'Secondary modules & settings' };
      case 'homework':
        return { title: 'Homework & Tasks', subtitle: 'Student assignments & grading' };
      case 'exams':
        return { title: 'Exams & Grading', subtitle: 'Marks entry & result rosters' };
      case 'messages':
        return { title: 'Parent Messages', subtitle: 'Direct teacher-parent discussions' };
      default:
        return { title: 'TuitionOS Staff', subtitle: 'Faculty Portal' };
    }
  };

  const headerInfo = getHeaderInfo();
  const isSecondarySubView = activeTab === 'homework' || activeTab === 'exams' || activeTab === 'messages';

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <Header
        title={headerInfo.title}
        subtitle={headerInfo.subtitle}
        onRefresh={onRefresh}
        onOpenNotifications={() => setShowNotificationModal(true)}
        unreadNotificationsCount={unreadNotifCount}
      />

      {/* Subview Back Breadcrumb (For Secondary Views accessed via More or Quick Actions) */}
      {isSecondarySubView && (
        <View style={styles.subviewBreadcrumbBar}>
          <TouchableOpacity
            style={styles.subviewBackBtn}
            onPress={() => setActiveTab('more')}
            activeOpacity={0.7}
          >
            <Text style={styles.subviewBackBtnText}>← Back to More Menu</Text>
          </TouchableOpacity>
          <Badge
            label={activeTab.toUpperCase()}
            variant="neutral"
            size="sm"
          />
        </View>
      )}

      {/* MAIN CONTENT AREA */}
      <View style={styles.mainContent}>
        <FadeInView key={activeTab} duration={160} style={{ flex: 1 }}>
        {/* TAB 1: HOME DASHBOARD (Clean mobile-first entry) */}
        {activeTab === 'home' && (
          <StaffHomeTab
            user={user}
            institute={institute}
            batches={batches}
            selectedBatch={selectedBatch}
            onSelectBatch={handleSelectBatch}
            students={students}
            totalStudentsCount={totalStudentsCount}
            homeworkList={homeworkList}
            examsList={examsList}
            materialsList={materialsList}
            conversations={conversations}
            attendanceSummary={attendanceSummary}
            loading={loading}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenNewHomework={() => setShowNewHwModal(true)}
            onOpenNewMaterial={() => setShowNewMaterialModal(true)}
            onOpenReviewHw={openHomeworkReview}
            onOpenGradingExam={(exam) => setGradingExam(exam)}
            onOpenConversation={openStaffConversation}
            onOpenAttendanceModal={() => setShowStaffAttendanceModal(true)}
          />
        )}

        {/* TAB 2: STUDENTS DIRECTORY & MANAGEMENT */}
        {activeTab === 'students' && (
          <ScrollView
            style={styles.tabContent}
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4E342E" />}
            showsVerticalScrollIndicator={false}
          >
            {/* Batch Selector Bar */}
            {batches.length > 0 && (
              <View style={styles.filterChipSection}>
                <Text style={styles.filterChipLabel}>Select Class Batch:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {batches.map((b) => {
                    const isSelected = selectedBatch?.id === b.id;
                    return (
                      <TouchableOpacity
                        key={b.id}
                        onPress={() => handleSelectBatch(b)}
                        style={[styles.batchChip, isSelected && styles.batchChipActive]}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.batchChipText, isSelected && styles.batchChipTextActive]}>
                          {b.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Search Input Bar */}
            <View style={styles.searchBarWrapper}>
              <Search size={14} color="#8D6E63" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by student name or roll..."
                placeholderTextColor="#A1887F"
                value={studentSearchQuery}
                onChangeText={setStudentSearchQuery}
              />
              {studentSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setStudentSearchQuery('')} style={{ padding: 4 }}>
                  <X size={14} color="#8D6E63" />
                </TouchableOpacity>
              )}
            </View>

            {/* Section Header & Admit Button */}
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Enrolled Students ({filteredStudents.length})</Text>
                <Text style={styles.sectionSubTitle}>
                  {selectedBatch ? selectedBatch.name : 'All Batches'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.primaryActionBtn}
                onPress={() => setShowAdmitModal(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryActionBtnText}>+ Admit Student</Text>
              </TouchableOpacity>
            </View>

            {filteredStudents.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Users size={42} color={themeTokens.colors.primary} />
                <Text style={styles.emptyTitle}>No Students Found</Text>
                <Text style={styles.emptyDesc}>
                  {studentSearchQuery ? 'No students matched your search criteria.' : 'No students enrolled in this batch yet.'}
                </Text>
              </Card>
            ) : (
              filteredStudents.map((s) => (
                <Card key={s.id} onPress={() => setSelectedStudentId(s.id)} style={{ marginBottom: 10 }}>
                  <View style={styles.studentCardRow}>
                    <StudentAvatar
                      studentId={s.id}
                      photoUrl={s.photoUrl}
                      name={s.user?.fullName || `${s.firstName} ${s.lastName}`}
                      size={40}
                      style={{ marginRight: 10 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.studentName}>{s.user?.fullName || `${s.firstName} ${s.lastName}`}</Text>
                      <Text style={styles.studentSub}>
                        Adm: {s.admissionNumber || '—'} {s.rollNumber ? `• Roll: ${s.rollNumber}` : ''}
                      </Text>
                      {s.phone && <Text style={styles.phoneText}>{s.phone}</Text>}
                    </View>
                    <Badge
                      label={s.status || 'ACTIVE'}
                      variant={s.status === 'ACTIVE' ? 'success' : s.status === 'PASSED_OUT' ? 'indigo' : 'neutral'}
                      size="sm"
                    />
                  </View>

                  {/* Lifecycle Action Buttons */}
                  <View style={styles.studentActionRow}>
                    <View style={{ flex: 1 }} />
                    <View style={styles.actionBtnGroup}>
                      {s.status === 'ACTIVE' ? (
                        <>
                          <TouchableOpacity
                            style={styles.actionBtnPass}
                            onPress={() => handleOpenStatusConfirm(s, 'PASSED_OUT')}
                          >
                            <Text style={styles.actionBtnPassText}>Pass Out</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.actionBtnDisc}
                            onPress={() => handleOpenStatusConfirm(s, 'DISCONTINUED')}
                          >
                            <Text style={styles.actionBtnDiscText}>Discontinue</Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <TouchableOpacity
                          style={styles.actionBtnActive}
                          onPress={() => handleOpenStatusConfirm(s, 'ACTIVE')}
                        >
                          <Text style={styles.actionBtnActiveText}>Reactivate</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </Card>
              ))
            )}
          </ScrollView>
        )}

        {/* TAB 3: ATTENDANCE (Voice-Assisted & Manual Check-in) */}
        {activeTab === 'attendance' && (
          <ScrollView
            style={styles.tabContent}
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4E342E" />}
            showsVerticalScrollIndicator={false}
          >
            {/* Batch Selector Bar */}
            {batches.length > 0 && (
              <View style={styles.filterChipSection}>
                <Text style={styles.filterChipLabel}>Select Class Batch:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {batches.map((b) => {
                    const isSelected = selectedBatch?.id === b.id;
                    return (
                      <TouchableOpacity
                        key={b.id}
                        onPress={() => handleSelectBatch(b)}
                        style={[styles.batchChip, isSelected && styles.batchChipActive]}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.batchChipText, isSelected && styles.batchChipTextActive]}>
                          {b.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Read-Only Today's Date Banner */}
            <View style={styles.todayDateBanner}>
              <Text style={styles.todayDateBannerTitle}>Today's Attendance Session</Text>
              <Text style={styles.todayDateBannerText}>
                {new Date().toLocaleDateString('en-IN', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })} (Asia/Kolkata)
              </Text>
            </View>

            {/* Voice-Assisted Input */}
            <Card style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={styles.voiceSectionTitle}>Voice-Assisted Attendance</Text>
                {isVoiceListening && (
                  <View style={styles.liveListeningTag}>
                    <Text style={styles.liveListeningText}>● LISTENING</Text>
                  </View>
                )}
              </View>

              <View style={styles.voiceInputWrap}>
                <TextInput
                  style={styles.voiceTextInput}
                  placeholder="Say or type student name, e.g. 'Aarav Kumar'..."
                  placeholderTextColor="#A1887F"
                  value={voiceQuery}
                  onChangeText={handleVoiceQueryChange}
                />
                {voiceQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setVoiceQuery('');
                      setPendingVoiceCandidate(null);
                      setVoiceDisambiguation([]);
                    }}
                    style={{ padding: 4 }}
                  >
                    <X size={13} color="#8D6E63" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Exact Voice Match Candidate Preview */}
              {pendingVoiceCandidate && (
                <View style={styles.voiceCandidateBox}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.voiceCandidateName}>
                      Matched: {pendingVoiceCandidate.user?.fullName || pendingVoiceCandidate.firstName}
                    </Text>
                    <Text style={styles.voiceCandidateMeta}>
                      Adm: {pendingVoiceCandidate.admissionNumber || '—'} {pendingVoiceCandidate.rollNumber ? `• Roll: ${pendingVoiceCandidate.rollNumber}` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.voiceConfirmBtn}
                    onPress={() => handleConfirmVoiceAttendance(pendingVoiceCandidate)}
                    disabled={voiceSubmitting}
                  >
                    {voiceSubmitting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.voiceConfirmBtnText}>
                        {pendingVoiceCandidate.todayStatus === 'CHECKED_IN' ? 'Check-Out' : 'Check-In'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Multiple Disambiguation Candidates */}
              {voiceDisambiguation.length > 0 && (
                <View style={styles.disambiguationBox}>
                  <Text style={styles.disambiguationTitle}>Multiple students matched. Select one:</Text>
                  {voiceDisambiguation.map((cand) => (
                    <TouchableOpacity
                      key={cand.id}
                      style={styles.disambiguationItem}
                      onPress={() => handleConfirmVoiceAttendance(cand)}
                      disabled={voiceSubmitting}
                    >
                      <Text style={styles.disambiguationItemText}>
                        {cand.user?.fullName || cand.firstName} (Adm: {cand.admissionNumber || '—'})
                      </Text>
                      <Text style={styles.disambiguationActionText}>Mark</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Card>

            {/* Manual Attendance Check-in Controls */}
            <Card style={{ marginBottom: 14 }}>
              <Text style={styles.voiceSectionTitle}>Manual Check-in / Check-out</Text>

              {/* Student selected indicator */}
              <View style={styles.selectedStudentIndicator}>
                <Text style={styles.selectedStudentIndicatorLabel}>Target Student:</Text>
                <Text style={styles.selectedStudentIndicatorValue} numberOfLines={1}>
                  {selectedStudentForAtt
                    ? selectedStudentForAtt.user?.fullName || selectedStudentForAtt.firstName
                    : 'Tap any student below to select'}
                </Text>
              </View>

              {/* Type Toggle: Check-In vs Check-Out */}
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggleBtn, attType === 'CHECK_IN' && styles.toggleBtnActive]}
                  onPress={() => setAttType('CHECK_IN')}
                >
                  <Text style={[styles.toggleBtnText, attType === 'CHECK_IN' && styles.toggleBtnTextActive]}>
                    Check-In
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, attType === 'CHECK_OUT' && styles.toggleBtnActive]}
                  onPress={() => setAttType('CHECK_OUT')}
                >
                  <Text style={[styles.toggleBtnText, attType === 'CHECK_OUT' && styles.toggleBtnTextActive]}>
                    Check-Out
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Status Toggle: Present vs Late vs Absent */}
              <View style={styles.toggleRow}>
                {(['PRESENT', 'LATE', 'ABSENT'] as const).map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[styles.toggleBtn, attStatus === st && styles.toggleBtnActive]}
                    onPress={() => setAttStatus(st)}
                  >
                    <Text style={[styles.toggleBtnText, attStatus === st && styles.toggleBtnTextActive]}>
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Submit Attendance Button */}
              <TouchableOpacity
                style={[styles.recordAttBtn, (!selectedStudentForAtt || attSubmitting) && styles.recordAttBtnDisabled]}
                onPress={handleRecordAttendance}
                disabled={!selectedStudentForAtt || attSubmitting}
                activeOpacity={0.8}
              >
                {attSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.recordAttBtnText}>Record Attendance</Text>
                )}
              </TouchableOpacity>
            </Card>

            {/* Student Roster for Selection */}
            <Text style={styles.sectionTitle}>Batch Roster (Tap to select)</Text>
            {students.map((st) => {
              const isSelected = selectedStudentForAtt?.id === st.id;
              return (
                <Card
                  key={st.id}
                  onPress={() => setSelectedStudentForAtt(st)}
                  highlighted={isSelected}
                  style={{ marginBottom: 8 }}
                >
                  <View style={styles.studentAttRow}>
                    <View style={styles.studentInitialCircle}>
                      <Text style={styles.studentInitial}>{st.user?.fullName?.[0] || 'S'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.studentName}>{st.user?.fullName || `${st.firstName} ${st.lastName}`}</Text>
                      <Text style={styles.studentRoll}>Adm: {st.admissionNumber || '—'}</Text>
                    </View>
                    <Badge
                      label={isSelected ? 'SELECTED' : 'SELECT'}
                      variant={isSelected ? 'indigo' : 'neutral'}
                      size="sm"
                    />
                  </View>
                </Card>
              );
            })}
          </ScrollView>
        )}

        {/* TAB 4: LEARNING MATERIALS & ANALYTICS */}
        {activeTab === 'materials' && (
          <ScrollView
            style={styles.tabContent}
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4E342E" />}
            showsVerticalScrollIndicator={false}
          >
            {/* Header & Create Button */}
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Learning Materials ({materialsList.length})</Text>
                <Text style={styles.sectionSubTitle}>Notes, questions & documents</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowNewMaterialModal(true)}
                style={styles.primaryActionBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryActionBtnText}>+ New Material</Text>
              </TouchableOpacity>
            </View>

            {materialsList.length === 0 ? (
              <Card style={styles.emptyCard}>
                <BookOpen size={42} color={themeTokens.colors.primary} />
                <Text style={styles.emptyTitle}>No Materials Uploaded</Text>
                <Text style={styles.emptyDesc}>Share study materials, notes and exercises with your batch students.</Text>
                <TouchableOpacity
                  style={styles.emptyActionBtn}
                  onPress={() => setShowNewMaterialModal(true)}
                >
                  <Text style={styles.emptyActionBtnText}>+ Create First Material</Text>
                </TouchableOpacity>
              </Card>
            ) : (
              materialsList.map((mat) => (
                <Card key={mat.id} style={{ marginBottom: 10 }}>
                  <View style={styles.taskCardHeader}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.taskTitle}>{mat.title}</Text>
                      <Text style={styles.taskSub}>
                        Batch: {mat.batch?.name || 'Class'} • Subject: {mat.subject?.name || 'General'}
                      </Text>
                    </View>
                    <Badge label={mat.type} variant="info" size="sm" />
                  </View>

                  {mat.description ? (
                    <Text style={styles.taskSnippet}>{mat.description}</Text>
                  ) : null}

                  {mat.content ? (
                    <View style={styles.materialContentPreview}>
                      <Text style={styles.materialContentText} numberOfLines={3}>
                        {mat.content}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.materialActionRow}>
                    <TouchableOpacity
                      onPress={() => setAnalyticsMaterial(mat)}
                      style={styles.analyticsBtn}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.analyticsBtnText}>View Analytics</Text>
                    </TouchableOpacity>

                    <Badge
                      label={mat.isPublished ? 'PUBLISHED' : 'DRAFT'}
                      variant={mat.isPublished ? 'success' : 'warning'}
                      size="sm"
                    />
                  </View>
                </Card>
              ))
            )}
          </ScrollView>
        )}

        {/* TAB 5: MORE MENU HUB */}
        {activeTab === 'more' && (
          <StaffMoreTab
            user={user}
            institute={institute}
            homeworkCount={homeworkList.length}
            examCount={examsList.length}
            conversationCount={conversations.length}
            unreadMessagesCount={unreadMessagesCount}
            unreadNotifCount={unreadNotifCount}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenReviewsModal={() => setShowReviewsModal(true)}
            onOpenNotifications={() => setShowNotificationModal(true)}
            onOpenAttendanceModal={() => setShowStaffAttendanceModal(true)}
            onOpenPayslipsModal={() => setShowStaffPayslipsModal(true)}
            onOpenQuestionGenModal={() => setShowQuestionGenModal(true)}
            onLogout={logout}
          />
        )}

        {/* SECONDARY SUBVIEW: HOMEWORK MANAGEMENT */}
        {activeTab === 'homework' && (
          <ScrollView
            style={styles.tabContent}
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4E342E" />}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Homework Assignments ({homeworkList.length})</Text>
                <Text style={styles.sectionSubTitle}>Tasks assigned to your classes</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowNewHwModal(true)}
                style={styles.primaryActionBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryActionBtnText}>+ Assign Homework</Text>
              </TouchableOpacity>
            </View>

            {homeworkList.length === 0 ? (
              <Card style={styles.emptyCard}>
                <FileText size={42} color={themeTokens.colors.primary} />
                <Text style={styles.emptyTitle}>No Homework Tasks</Text>
                <Text style={styles.emptyDesc}>Create assignments to track student submissions.</Text>
                <TouchableOpacity
                  style={styles.emptyActionBtn}
                  onPress={() => setShowNewHwModal(true)}
                >
                  <Text style={styles.emptyActionBtnText}>+ Assign Homework</Text>
                </TouchableOpacity>
              </Card>
            ) : (
              homeworkList.map((hw) => (
                <Card key={hw.id} onPress={() => openHomeworkReview(hw)} style={{ marginBottom: 10 }}>
                  <View style={styles.taskCardHeader}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.taskTitle}>{hw.title}</Text>
                      <Text style={styles.taskSub}>
                        Batch: {hw.batch?.name || 'Class'} • Subject: {hw.subject?.name || 'General'}
                      </Text>
                    </View>
                    <Badge
                      label={`${hw.submissions?.length || 0} Submissions`}
                      variant="indigo"
                      size="sm"
                    />
                  </View>
                  {hw.description ? (
                    <Text style={styles.taskSnippet}>{hw.description}</Text>
                  ) : null}
                  <View style={styles.homeworkFooterRow}>
                    <Text style={styles.homeworkDueDateText}>
                      Due: {hw.dueDate ? new Date(hw.dueDate).toLocaleDateString('en-IN') : 'Open'}
                    </Text>
                    <Text style={styles.homeworkReviewLinkText}>
                      Review Submissions & Grade
                    </Text>
                  </View>
                </Card>
              ))
            )}
          </ScrollView>
        )}

        {/* SECONDARY SUBVIEW: EXAMS & MARKS ENTRY */}
        {activeTab === 'exams' && (
          <ScrollView
            style={styles.tabContent}
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4E342E" />}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Examinations & Marks ({examsList.length})</Text>
                <Text style={styles.sectionSubTitle}>Scheduled tests and grading rosters</Text>
              </View>
            </View>

            {examsList.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Trophy size={42} color={themeTokens.colors.primary} />
                <Text style={styles.emptyTitle}>No Scheduled Exams</Text>
                <Text style={styles.emptyDesc}>Exams created for your assigned batches will appear here.</Text>
              </Card>
            ) : (
              examsList.map((exam) => (
                <Card key={exam.id} style={{ marginBottom: 12 }}>
                  <View style={styles.taskCardHeader}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.taskTitle}>{exam.title}</Text>
                      <Text style={styles.taskSub}>
                        {exam.batch?.name || 'Class Batch'} • {exam.subject?.name || 'All Subjects'}
                      </Text>
                    </View>
                    <Badge
                      label={
                        exam.isResultsPublished
                          ? 'RESULTS PUBLISHED'
                          : exam.isSchedulePublished
                          ? 'SCHEDULE PUBLISHED'
                          : 'DRAFT'
                      }
                      variant={exam.isResultsPublished ? 'success' : exam.isSchedulePublished ? 'info' : 'warning'}
                    />
                  </View>

                  {exam.description ? (
                    <Text style={[styles.taskSnippet, { marginTop: 6 }]}>{exam.description}</Text>
                  ) : null}

                  <View style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: themeTokens.colors.textMuted }}>
                      Max: {exam.totalMarks || 100} • Pass: {exam.passingMarks || 40}
                    </Text>
                    <Text style={{ fontSize: 11, color: themeTokens.colors.textSubtle }}>
                      {exam.examDate ? new Date(exam.examDate).toLocaleDateString('en-IN') : 'Date TBD'}
                    </Text>
                  </View>

                  <MobileButton
                    title={exam.isResultsPublished ? 'View Grade Roster →' : 'Enter Marks & Grade →'}
                    onPress={() => setGradingExam(exam)}
                    variant="primary"
                    size="sm"
                    fullWidth
                    style={{ marginTop: 12 }}
                  />
                </Card>
              ))
            )}
          </ScrollView>
        )}

        {/* SECONDARY SUBVIEW: PARENT CONVERSATIONS & CHAT */}
        {activeTab === 'messages' && (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            {activeConversation ? (
              <View style={[styles.tabContent, { paddingHorizontal: 16, paddingTop: 10 }]}>
                <TouchableOpacity
                  onPress={() => setActiveConversation(null)}
                  style={styles.chatBackBtn}
                >
                  <Text style={styles.chatBackBtnText}>← All Conversations</Text>
                </TouchableOpacity>

                <Card style={{ marginBottom: 10 }}>
                  <Text style={styles.chatHeaderTitle}>
                    {activeConversation.parent?.fullName || activeConversation.title || 'Parent Message'}
                  </Text>
                  {activeConversation.student && (
                    <Text style={styles.chatHeaderSub}>
                      Student: {activeConversation.student.fullName} ({activeConversation.student.admissionNumber})
                    </Text>
                  )}
                </Card>

                {/* Message History */}
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{ paddingBottom: 16, gap: 10 }}
                  showsVerticalScrollIndicator={false}
                >
                  {loadingMessages ? (
                    <Card><Text style={styles.emptyText}>Loading message history...</Text></Card>
                  ) : activeMessages.length === 0 ? (
                    <Card><Text style={styles.emptyText}>No messages in this thread yet.</Text></Card>
                  ) : (
                    activeMessages.map((m) => {
                      const isMine = m.senderId === user?.id || m.isMine;
                      return (
                        <View
                          key={m.id}
                          style={[
                            styles.messageBubble,
                            isMine ? styles.messageBubbleMine : styles.messageBubbleTheirs,
                          ]}
                        >
                          <Text
                            style={[
                              styles.messageSenderText,
                              isMine ? { color: '#D7CCC8' } : { color: '#6D4C41' },
                            ]}
                          >
                            {isMine ? 'You' : m.sender?.fullName || 'Parent'}
                          </Text>
                          {m.attachmentType === 'AUDIO' && (
                            <Text style={styles.attachmentNotice}>Voice note attachment</Text>
                          )}
                          {m.attachmentType === 'IMAGE' && (
                            <Text style={styles.attachmentNotice}>Photo attachment</Text>
                          )}
                          {m.attachmentType === 'DOCUMENT' && (
                            <Text style={styles.attachmentNotice}>{m.attachmentName || 'Document.pdf'}</Text>
                          )}
                          {Boolean(m.body || m.content) && (
                            <Text
                              style={[
                                styles.messageBodyText,
                                isMine ? { color: '#FFFFFF' } : { color: '#2D1E18' },
                              ]}
                            >
                              {m.body || m.content}
                            </Text>
                          )}
                          <Text
                            style={[
                              styles.messageTimeText,
                              isMine ? { color: '#D7CCC8' } : { color: '#8D6E63' },
                            ]}
                          >
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                      );
                    })
                  )}
                </ScrollView>

                {/* Reply Input Bar */}
                <View style={[styles.chatInputBar, { marginBottom: 70 + insets.bottom }]}>
                  <TextInput
                    style={styles.chatTextInput}
                    placeholder="Write reply to parent..."
                    placeholderTextColor="#94a3b8"
                    value={newStaffMessage}
                    onChangeText={setNewStaffMessage}
                  />
                  <TouchableOpacity
                    onPress={handleSendStaffMessage}
                    disabled={!newStaffMessage.trim() || sendingStaffMessage}
                    style={[
                      styles.chatSendBtn,
                      (!newStaffMessage.trim() || sendingStaffMessage) && { opacity: 0.5 },
                    ]}
                  >
                    <Text style={styles.chatSendBtnText}>Send</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <ScrollView
                style={styles.tabContent}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4E342E" />}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionTitle}>Parent Conversations ({conversations.length})</Text>
                    <Text style={styles.sectionSubTitle}>Direct inquiries from student families</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowReviewsModal(true)}
                    style={[styles.primaryActionBtn, { backgroundColor: '#F59E0B' }]}
                  >
                    <Text style={styles.primaryActionBtnText}>⭐ Reviews</Text>
                  </TouchableOpacity>
                </View>

                {conversations.length === 0 ? (
                  <Card style={styles.emptyCard}>
                    <MessageSquare size={42} color={themeTokens.colors.primary} />
                    <Text style={styles.emptyTitle}>No Conversations</Text>
                    <Text style={styles.emptyDesc}>Parent messages will appear here.</Text>
                  </Card>
                ) : (
                  conversations.map((c) => (
                    <Card key={c.id} onPress={() => openStaffConversation(c)} style={{ marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={styles.taskTitle}>{c.parent?.fullName || c.title || 'Parent Message'}</Text>
                          {c.student && (
                            <Text style={styles.taskSub}>
                              Student: {c.student.fullName} ({c.student.admissionNumber})
                            </Text>
                          )}
                          {c.lastMessage && (
                            <Text style={styles.messageSnippet} numberOfLines={1}>
                              {c.lastMessage.body || (c.lastMessage.attachmentType ? `[${c.lastMessage.attachmentType}]` : 'Sent a message')}
                            </Text>
                          )}
                        </View>
                        {c.unreadCount > 0 ? (
                          <Badge label={`${c.unreadCount} NEW`} variant="warning" size="sm" />
                        ) : (
                          <Badge label="OPEN" variant="info" size="sm" />
                        )}
                      </View>
                    </Card>
                  ))
                )}
              </ScrollView>
            )}
          </KeyboardAvoidingView>
        )}
        </FadeInView>
      </View>

      {/* FIXED BOTTOM NAVIGATION BAR */}
      <StaffBottomNav
        activeTab={activeTab}
        onSelectTab={(tab: StaffPrimaryTab) => setActiveTab(tab)}
        unreadMoreCount={unreadMessagesCount + unreadNotifCount}
      />

      {/* ============================================================== */}
      {/* ALL MODALS PRESERVED AND ACCESSIBLE */}
      {/* ============================================================== */}

      {/* Homework Review & Grading Modal */}
      <Modal visible={Boolean(reviewHw)} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: '85%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{reviewHw?.title}</Text>
                <Text style={styles.modalSub}>Batch: {reviewHw?.batch?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setReviewHw(null)}>
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            {loadingReview ? (
              <ActivityIndicator color={themeTokens.colors.primary} style={{ marginVertical: 20 }} />
            ) : reviewData ? (
              <ScrollView style={{ flexGrow: 0 }}>
                {reviewData.summary && (
                  <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
                    <View style={{ flex: 1, backgroundColor: '#f1f5f9', padding: 8, borderRadius: 8, alignItems: 'center' }}>
                      <Text style={{ fontSize: 10, color: '#64748b' }}>ELIGIBLE</Text>
                      <Text style={{ fontSize: 14, fontWeight: 'bold' }}>{reviewData.summary.totalEligible}</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: '#dcfce7', padding: 8, borderRadius: 8, alignItems: 'center' }}>
                      <Text style={{ fontSize: 10, color: '#166534' }}>DONE</Text>
                      <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#166534' }}>
                        {reviewData.summary.submittedCount + reviewData.summary.completedCount}
                      </Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: '#fee2e2', padding: 8, borderRadius: 8, alignItems: 'center' }}>
                      <Text style={{ fontSize: 10, color: '#991b1b' }}>OVERDUE</Text>
                      <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#991b1b' }}>{reviewData.summary.overdueCount}</Text>
                    </View>
                  </View>
                )}

                <Text style={{ fontSize: 12, fontWeight: 'bold', color: themeTokens.colors.textPrimary, marginBottom: 8 }}>
                  Student Completion Roster
                </Text>

                {reviewData.roster?.map((r: any) => (
                  <View key={r.student.id} style={{ padding: 10, backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View>
                        <Text style={{ fontWeight: 'bold', fontSize: 13, color: '#1e293b' }}>
                          {r.student.fullName} ({r.student.admissionNumber})
                        </Text>
                        <Text style={{ fontSize: 11, color: '#64748b' }}>Status: {r.status}</Text>
                      </View>
                      <Badge
                        label={r.status}
                        variant={r.status === 'COMPLETED' ? 'success' : r.status === 'SUBMITTED' ? 'indigo' : 'warning'}
                      />
                    </View>

                    {r.submission && (
                      <View style={{ marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#e2e8f0' }}>
                        <Text style={{ fontSize: 11, color: '#475569' }}>Submitted on: {new Date(r.submission.submittedAt).toLocaleDateString('en-IN')}</Text>
                        {r.submission.content && (
                          <Text style={{ fontSize: 12, color: '#1e293b', fontStyle: 'italic', marginVertical: 4 }}>
                            "{r.submission.content}"
                          </Text>
                        )}
                        {r.submission.attachmentUrl && (
                          <Text style={{ fontSize: 11, color: '#2563eb', marginBottom: 4 }}>
                            Attachment uploaded
                          </Text>
                        )}
                        {r.submission.grade && (
                          <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#166534' }}>
                            Grade: {r.submission.grade} {r.submission.feedback ? `(${r.submission.feedback})` : ''}
                          </Text>
                        )}

                        <TouchableOpacity
                          onPress={() => {
                            setGradingSubId(gradingSubId === r.submission.id ? null : r.submission.id);
                            setGradeText(r.submission.grade || '');
                            setFeedbackText(r.submission.feedback || '');
                          }}
                          style={{ marginTop: 6 }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: 'bold', color: themeTokens.colors.primary }}>
                            {gradingSubId === r.submission.id ? 'Cancel Grading' : 'Grade Submission →'}
                          </Text>
                        </TouchableOpacity>

                        {gradingSubId === r.submission.id && (
                          <View style={{ marginTop: 8, padding: 8, backgroundColor: '#f1f5f9', borderRadius: 8 }}>
                            <TextInput
                              style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6, padding: 8, fontSize: 12, marginBottom: 6 }}
                              placeholder="Grade (e.g. A, 9/10, Excellent)"
                              value={gradeText}
                              onChangeText={setGradeText}
                            />
                            <TextInput
                              style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6, padding: 8, fontSize: 12, marginBottom: 8 }}
                              placeholder="Feedback / Remarks (optional)"
                              value={feedbackText}
                              onChangeText={setFeedbackText}
                            />
                            <MobileButton
                              title="Save Grade & Feedback"
                              onPress={() => handleGradeSubmission(r.submission.id)}
                              loading={gradingSubmitting}
                              variant="primary"
                              size="sm"
                              fullWidth
                            />
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* New Material Creation Modal */}
      <Modal visible={showNewMaterialModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Publish Learning Material</Text>
            <Text style={styles.modalSub}>Batch: {selectedBatch?.name || 'Class'}</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Material Title *"
              value={matTitle}
              onChangeText={setMatTitle}
            />

            <View style={{ flexDirection: 'row', gap: 6, marginVertical: 8 }}>
              {['PDF', 'DOCUMENT', 'AUDIO', 'ANNOUNCEMENT'].map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setMatType(t)}
                  style={{
                    flex: 1,
                    paddingVertical: 6,
                    alignItems: 'center',
                    backgroundColor: matType === t ? themeTokens.colors.primary : '#f1f5f9',
                    borderRadius: 6,
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: 'bold', color: matType === t ? '#fff' : '#64748b' }}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Brief Description (optional)"
              value={matDesc}
              onChangeText={setMatDesc}
            />

            <TextInput
              style={[styles.modalInput, { height: 80 }]}
              placeholder="Material Content / Notes / Link..."
              value={matContent}
              onChangeText={setMatContent}
              multiline
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                onPress={() => setShowNewMaterialModal(false)}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateMaterial}
                style={styles.modalSubmitBtn}
                disabled={matSubmitting}
              >
                {matSubmitting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Publish</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Homework Creation Modal */}
      <Modal visible={showNewHwModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Assign New Homework</Text>
            <Text style={styles.modalSub}>Batch: {selectedBatch?.name || 'Class'}</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Homework Title *"
              value={hwTitle}
              onChangeText={setHwTitle}
            />

            <TextInput
              style={[styles.modalInput, { height: 70 }]}
              placeholder="Instructions / Description *"
              value={hwDesc}
              onChangeText={setHwDesc}
              multiline
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Due Date (YYYY-MM-DD, optional)"
              value={hwDueDate}
              onChangeText={setHwDueDate}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                onPress={() => setShowNewHwModal(false)}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateHomework}
                style={styles.modalSubmitBtn}
                disabled={hwSubmitting}
              >
                {hwSubmitting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Publish</Text>
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
        onSuccess={() => fetchStaffData()}
      />

      {/* Student Details Modal */}
      <StudentDetailsModal
        visible={Boolean(selectedStudentId)}
        studentId={selectedStudentId}
        onClose={() => setSelectedStudentId(null)}
        onStudentUpdated={fetchStaffData}
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

      {/* Staff Exam Grading Modal */}
      {gradingExam && (
        <StaffExamGradingModal
          isOpen={!!gradingExam}
          exam={gradingExam}
          onClose={() => setGradingExam(null)}
          onUpdated={fetchStaffData}
        />
      )}

      {/* Staff Review Reply Modal */}
      <StaffReviewReplyModal
        isOpen={showReviewsModal}
        onClose={() => setShowReviewsModal(false)}
      />

      {/* Material Analytics Modal */}
      <MaterialAnalyticsModal
        isOpen={!!analyticsMaterial}
        material={analyticsMaterial}
        onClose={() => setAnalyticsMaterial(null)}
      />

      {/* In-App Notifications Modal */}
      <NotificationModal
        visible={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        onUnreadCountChange={setUnreadNotifCount}
        onNavigateToEntity={handleNavigateToEntity}
      />

      {/* Faculty Geofence Attendance & WFH Modal */}
      <StaffMyAttendanceModal
        visible={showStaffAttendanceModal}
        onClose={() => setShowStaffAttendanceModal(false)}
      />

      {/* Faculty Salary Slips Modal */}
      <StaffMyPayslipsModal
        visible={showStaffPayslipsModal}
        onClose={() => setShowStaffPayslipsModal(false)}
      />

      {/* AI Question Generator Modal for Faculty */}
      <AIQuestionGeneratorModal
        visible={showQuestionGenModal}
        onClose={() => setShowQuestionGenModal(false)}
        instituteName={institute?.name}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F2EF',
  },
  mainContent: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 90, // Crucial: prevents content from being hidden behind bottom nav
  },

  // Subview Breadcrumb Bar (Back to More)
  subviewBreadcrumbBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FDFBF7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEBE9',
  },
  subviewBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subviewBackBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4E342E',
  },

  // Batch Filter Chips Section
  filterChipSection: {
    marginBottom: 12,
  },
  filterChipLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8D6E63',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  batchChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#D7CCC8',
  },
  batchChipActive: {
    backgroundColor: '#4E342E',
    borderColor: '#4E342E',
  },
  batchChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4E342E',
  },
  batchChipTextActive: {
    color: '#FFFFFF',
  },

  // Search Bar
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    marginBottom: 14,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 13,
    color: '#2D1E18',
  },

  // Section Headers
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2D1E18',
  },
  sectionSubTitle: {
    fontSize: 11,
    color: '#8D6E63',
    marginTop: 1,
  },
  primaryActionBtn: {
    backgroundColor: '#4E342E',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // Student Card
  studentCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  studentName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2D1E18',
  },
  studentSub: {
    fontSize: 11,
    color: '#8D6E63',
    marginTop: 2,
  },
  phoneText: {
    fontSize: 11,
    color: '#6D4C41',
    marginTop: 2,
  },
  studentActionRow: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F7F2EF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardDetailsHint: {
    paddingVertical: 2,
  },
  cardDetailsHintText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4E342E',
  },
  actionBtnGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtnPass: {
    backgroundColor: '#EDE7F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionBtnPassText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5E35B1',
  },
  actionBtnDisc: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionBtnDiscText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#991B1B',
  },
  actionBtnActive: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionBtnActiveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#166534',
  },

  // Attendance Screen Styles
  todayDateBanner: {
    backgroundColor: '#FDFBF7',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D7CCC8',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  todayDateBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4E342E',
  },
  todayDateBannerText: {
    fontSize: 11,
    color: '#6D4C41',
    fontWeight: '600',
  },
  voiceSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2D1E18',
    marginBottom: 8,
  },
  liveListeningTag: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  liveListeningText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#166534',
  },
  voiceInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDFBF7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D7CCC8',
    paddingHorizontal: 12,
  },
  voiceTextInput: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 12,
    color: '#2D1E18',
  },
  voiceCandidateBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  voiceCandidateName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#166534',
  },
  voiceCandidateMeta: {
    fontSize: 11,
    color: '#15803D',
    marginTop: 2,
  },
  voiceConfirmBtn: {
    backgroundColor: '#166534',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  voiceConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  disambiguationBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  disambiguationTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
    marginBottom: 6,
  },
  disambiguationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#FEF3C7',
  },
  disambiguationItemText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
  },
  disambiguationActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },

  // Manual Check-in Styles
  selectedStudentIndicator: {
    backgroundColor: '#FDFBF7',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    marginBottom: 10,
  },
  selectedStudentIndicatorLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8D6E63',
    textTransform: 'uppercase',
  },
  selectedStudentIndicatorValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2D1E18',
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  toggleBtn: {
    flex: 1,
    backgroundColor: '#FDFBF7',
    borderWidth: 1,
    borderColor: '#D7CCC8',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: '#4E342E',
    borderColor: '#4E342E',
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6D4C41',
  },
  toggleBtnTextActive: {
    color: '#FFFFFF',
  },
  recordAttBtn: {
    backgroundColor: '#4E342E',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 4,
  },
  recordAttBtnDisabled: {
    opacity: 0.4,
  },
  recordAttBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // Attendance Roster
  studentAttRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  studentInitialCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F5ECE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentInitial: {
    fontSize: 15,
    fontWeight: '800',
    color: '#4E342E',
  },
  studentRoll: {
    fontSize: 11,
    color: '#8D6E63',
    marginTop: 2,
  },

  // Materials & Tasks Cards
  taskCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  taskTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2D1E18',
  },
  taskSub: {
    fontSize: 11,
    color: '#8D6E63',
    marginTop: 2,
  },
  taskSnippet: {
    fontSize: 11,
    color: '#6D4C41',
    marginTop: 4,
    lineHeight: 16,
  },
  materialContentPreview: {
    marginTop: 6,
    padding: 8,
    backgroundColor: '#FDFBF7',
    borderRadius: 8,
  },
  materialContentText: {
    fontSize: 11,
    color: '#4E342E',
  },
  materialActionRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  analyticsBtn: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  analyticsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369A1',
  },
  homeworkFooterRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  homeworkDueDateText: {
    fontSize: 11,
    color: '#8D6E63',
  },
  homeworkReviewLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4E342E',
  },

  // Chat Screen Styles
  chatBackBtn: {
    paddingVertical: 8,
    marginBottom: 4,
  },
  chatBackBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4E342E',
  },
  chatHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2D1E18',
  },
  chatHeaderSub: {
    fontSize: 11,
    color: '#8D6E63',
    marginTop: 2,
  },
  messageBubble: {
    maxWidth: '85%',
    borderRadius: 14,
    padding: 10,
  },
  messageBubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: '#3E2723',
  },
  messageBubbleTheirs: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEBE9',
  },
  messageSenderText: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  messageBodyText: {
    fontSize: 13,
    lineHeight: 18,
  },
  messageTimeText: {
    fontSize: 9,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  attachmentNotice: {
    fontSize: 11,
    color: '#D7CCC8',
    fontStyle: 'italic',
    marginBottom: 2,
  },
  chatInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
  },
  chatTextInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D7CCC8',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#2D1E18',
  },
  chatSendBtn: {
    backgroundColor: '#4E342E',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  chatSendBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  messageSnippet: {
    fontSize: 11,
    color: '#6D4C41',
    fontStyle: 'italic',
    marginTop: 2,
  },

  // Empty Card
  emptyCard: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2D1E18',
  },
  emptyDesc: {
    fontSize: 11,
    color: '#8D6E63',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 10,
  },
  emptyActionBtn: {
    backgroundColor: '#4E342E',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 12,
    color: '#8D6E63',
    textAlign: 'center',
  },

  // Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
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
  modalInput: {
    backgroundColor: '#FDFBF7',
    borderWidth: 1,
    borderColor: '#D7CCC8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#2D1E18',
    marginBottom: 8,
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
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
