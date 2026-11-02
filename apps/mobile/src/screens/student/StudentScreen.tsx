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
import { NotificationModal } from '../../components/NotificationModal';
import { MaterialViewerModal } from '../../components/MaterialViewerModal';
import { QuizTakerModal } from '../../components/QuizTakerModal';
import { PushNotificationService } from '../../services/pushNotification.service';
import {
  StudentBottomNav,
  StudentActiveTab,
  StudentPrimaryTab,
} from './components/StudentBottomNav';
import { StudentHomeTab } from './components/StudentHomeTab';
import { StudentMoreTab } from './components/StudentMoreTab';

export const StudentScreen: React.FC = () => {
  const { user, institute, logout } = useMobileAuth();

  const [activeTab, setActiveTab] = useState<StudentActiveTab>('home');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Core Student Data
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [homeworkList, setHomeworkList] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [progressFeedbacks, setProgressFeedbacks] = useState<any[]>([]);
  const [feeStatement, setFeeStatement] = useState<any>(null);

  // Filters & Sub-tab selectors
  const [materialFilterSubject, setMaterialFilterSubject] = useState<string>('ALL');
  const [homeworkSubTab, setHomeworkSubTab] = useState<'assignments' | 'quizzes'>('assignments');
  const [homeworkFilterStatus, setHomeworkFilterStatus] = useState<string>('ALL');
  const [examFilter, setExamFilter] = useState<'ALL' | 'RESULTS' | 'UPCOMING'>('ALL');

  // Modals
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [submittingHw, setSubmittingHw] = useState<any>(null);
  const [submissionContent, setSubmissionContent] = useState('');
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [previewMaterial, setPreviewMaterial] = useState<any | null>(null);
  const [activeTakingQuiz, setActiveTakingQuiz] = useState<any | null>(null);

  // Deep Link & Push Notification Navigation Handler
  const handleNavigateToEntity = async (entityType: string, entityId: string, metadata?: any) => {
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

    if (eType === 'HOMEWORK') {
      setActiveTab('homework');
      setHomeworkSubTab('assignments');
      const hw = homeworkList.find((h: any) => h.id === entityId);
      if (hw) {
        setSubmittingHw(hw);
      } else {
        const singleHwRes = await mobileApiFetch(`/homework/${entityId}`);
        if (singleHwRes.success && singleHwRes.data) {
          setSubmittingHw(singleHwRes.data);
        } else {
          Alert.alert('Content Unavailable', 'This homework assignment is no longer accessible or has been deleted.');
        }
      }
    } else if (eType === 'MATERIAL') {
      setActiveTab('learning');
      const mat = materials.find((m: any) => m.id === entityId);
      if (mat) {
        setPreviewMaterial(mat);
      } else {
        const singleMatRes = await mobileApiFetch(`/materials/${entityId}`);
        if (singleMatRes.success && singleMatRes.data) {
          setPreviewMaterial(singleMatRes.data);
        } else {
          Alert.alert('Content Unavailable', 'This learning material is no longer accessible or has been deleted.');
        }
      }
    } else if (eType === 'QUIZ') {
      setActiveTab('homework');
      setHomeworkSubTab('quizzes');
      const quiz = quizzes.find((q: any) => q.id === entityId);
      if (quiz) {
        setActiveTakingQuiz(quiz);
      } else {
        const singleQuizRes = await mobileApiFetch(`/quizzes/${entityId}`);
        if (singleQuizRes.success && singleQuizRes.data) {
          setActiveTakingQuiz(singleQuizRes.data);
        } else {
          Alert.alert('Content Unavailable', 'This quiz is no longer accessible or has been deleted.');
        }
      }
    } else if (eType === 'EXAM') {
      setActiveTab('results');
    } else if (eType === 'PROGRESS_REPORT') {
      setActiveTab('progress');
    } else if (eType === 'FEE') {
      setActiveTab('fees');
      if (metadata?.paymentId && feeStatement?.recentPayments) {
        const p = feeStatement.recentPayments.find((pay: any) => pay.id === metadata.paymentId);
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
  }, [homeworkList, materials, quizzes, feeStatement]);

  const fetchStudentData = useCallback(async () => {
    try {
      // 1. Student Profile
      const profRes = await mobileApiFetch('/students/my/profile');
      let currentStudent = profRes.data;
      if (profRes.success && currentStudent) {
        setStudentProfile(currentStudent);

        // 2. Fees Statement
        if (currentStudent.id) {
          const feeRes = await mobileApiFetch(`/fees/students/${currentStudent.id}/statement`);
          if (feeRes.success) {
            setFeeStatement(feeRes.data);
          }
        }
      }

      // 3. Learning Materials
      const matRes = await mobileApiFetch('/materials');
      if (matRes.success && matRes.data) {
        setMaterials(Array.isArray(matRes.data) ? matRes.data : matRes.data.materials || []);
      }

      // 4. Homework
      const hwRes = await mobileApiFetch('/homework');
      if (hwRes.success && hwRes.data) {
        setHomeworkList(Array.isArray(hwRes.data) ? hwRes.data : hwRes.data.homework || []);
      }

      // 5. Quizzes
      const quizRes = await mobileApiFetch('/quizzes');
      if (quizRes.success && quizRes.data) {
        setQuizzes(Array.isArray(quizRes.data) ? quizRes.data : quizRes.data.quizzes || []);
      }

      // 6. Exams
      const examRes = await mobileApiFetch('/exams');
      if (examRes.success && examRes.data) {
        setExams(Array.isArray(examRes.data) ? examRes.data : examRes.data.exams || []);
      }

      // 7. Academic Progress Reports
      const progRes = await mobileApiFetch('/progress');
      if (progRes.success && progRes.data) {
        setProgressFeedbacks(Array.isArray(progRes.data) ? progRes.data : progRes.data.feedbacks || []);
      }
    } catch (e) {
      console.warn('Error loading student mobile data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStudentData();
    PushNotificationService.registerPushToken().catch(() => {});
    mobileApiFetch('/notifications/unread-count')
      .then((res) => {
        if (res.success && res.data?.unreadCount !== undefined) {
          setUnreadNotifCount(res.data.unreadCount);
        }
      })
      .catch(() => {});
  }, [fetchStudentData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStudentData();
    mobileApiFetch('/notifications/unread-count')
      .then((res) => {
        if (res.success && res.data?.unreadCount !== undefined) {
          setUnreadNotifCount(res.data.unreadCount);
        }
      })
      .catch(() => {});
  };

  const handleOpenReceipt = async (paymentId: string) => {
    try {
      const res = await mobileApiFetch(`/fees/payments/${paymentId}/receipt`);
      if (res.success && res.data) {
        const r = res.data.receipt || res.data;
        setSelectedReceipt({
          receiptNumber: r.receiptNumber || `REC-${paymentId.slice(0, 8)}`,
          transactionReference: r.payment?.transactionReference || r.transactionReference,
          studentName: r.student?.fullName || studentProfile?.user?.fullName || user?.fullName,
          studentRoll: r.student?.rollNumber || studentProfile?.rollNumber,
          batchName: r.student?.batchName || studentProfile?.batch?.name,
          instituteName: r.institute?.name || (user?.instituteId ? 'Apex Academy of Science' : 'TuitionOS Institute'),
          feeTitle: r.feeDetails?.feeName || res.data.feeStructure?.title || 'Tuition Fee Payment',
          amount: r.feeDetails?.amountPaid || r.amount || 0,
          paymentMethod: r.payment?.method || r.paymentMethod || 'UPI',
          paidAt: r.receiptDate || r.paidAt || r.createdAt,
        });
        setShowReceiptModal(true);
      } else {
        Alert.alert('Notice', res.error || 'Receipt details not available.');
      }
    } catch {
      Alert.alert('Error', 'Unable to fetch receipt.');
    }
  };

  const handleMarkCompleted = (hw: any) => {
    Alert.alert(
      'Mark as Completed',
      `Confirm that you have completed "${hw.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Complete',
          onPress: async () => {
            try {
              const res = await mobileApiFetch(`/homework/${hw.id}/submissions`, {
                method: 'POST',
                body: { isCompleted: true, status: 'COMPLETED' },
              });
              if (res.success) {
                Alert.alert('Success', 'Assignment marked as completed!');
                fetchStudentData();
              } else {
                Alert.alert('Error', res.error || 'Could not complete assignment.');
              }
            } catch {
              Alert.alert('Error', 'Connection failure');
            }
          },
        },
      ]
    );
  };

  const handleSubmitHomework = async () => {
    if (!submissionContent.trim() || !submittingHw) {
      Alert.alert('Error', 'Please enter your submission text or document link.');
      return;
    }

    setSubmissionLoading(true);
    try {
      const res = await mobileApiFetch(`/homework/${submittingHw.id}/submissions`, {
        method: 'POST',
        body: {
          studentNotes: submissionContent.trim(),
        },
      });

      if (res.success) {
        Alert.alert('Submitted!', 'Your homework has been submitted to your faculty.');
        setSubmittingHw(null);
        setSubmissionContent('');
        fetchStudentData();
      } else {
        Alert.alert('Submission Error', res.error || 'Could not submit homework.');
      }
    } catch {
      Alert.alert('Error', 'Failed to connect to server.');
    } finally {
      setSubmissionLoading(false);
    }
  };

  const formatRupee = (amt: number) => `₹${(amt || 0).toLocaleString('en-IN')}`;

  // Unique list of subjects for filtering materials
  const materialSubjects = Array.from(
    new Set(materials.map((m) => m.subject?.name).filter(Boolean))
  ) as string[];

  const filteredMaterials =
    materialFilterSubject === 'ALL'
      ? materials
      : materials.filter((m) => m.subject?.name === materialFilterSubject);

  // Homework status helper & filtered list
  const getHomeworkStatusInfo = (hw: any) => {
    if (hw.studentStatus === 'GRADED') {
      return {
        label: `GRADED${hw.grade ? `: ${hw.grade}` : ''}`,
        bg: '#E8F5E9',
        color: '#2E7D32',
      };
    }
    if (hw.studentStatus === 'COMPLETED') {
      return { label: 'COMPLETED', bg: '#E8F5E9', color: '#2E7D32' };
    }
    if (hw.studentStatus === 'AWAITING_REVIEW' || hw.studentStatus === 'SUBMITTED') {
      return { label: 'AWAITING REVIEW', bg: '#E3F2FD', color: '#1565C0' };
    }
    if (hw.mySubmission) {
      return {
        label: hw.mySubmission.status || 'SUBMITTED',
        bg: '#E3F2FD',
        color: '#1565C0',
      };
    }
    if (hw.isOverdue) {
      return { label: 'OVERDUE', bg: '#FFEBEE', color: '#C62828' };
    }
    return { label: 'NOT STARTED', bg: '#FFF3E0', color: '#E65100' };
  };

  const filteredHomeworkList = homeworkList.filter((hw) => {
    if (homeworkFilterStatus === 'ALL') return true;
    const isDone =
      hw.studentStatus === 'COMPLETED' ||
      hw.studentStatus === 'GRADED' ||
      !!hw.mySubmission;
    if (homeworkFilterStatus === 'PENDING') return !isDone;
    if (homeworkFilterStatus === 'SUBMITTED') return !!hw.mySubmission;
    if (homeworkFilterStatus === 'GRADED') return hw.studentStatus === 'GRADED';
    return true;
  });

  const filteredExams = exams.filter((exam) => {
    if (examFilter === 'ALL') return true;
    if (examFilter === 'RESULTS') return exam.isResultsPublished;
    if (examFilter === 'UPCOMING') return !exam.isResultsPublished;
    return true;
  });

  // Is this a secondary screen that should show the breadcrumb back button?
  const isSecondaryScreen = ['progress', 'timetable', 'fees', 'profile'].includes(activeTab);

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <Header
        title={
          activeTab === 'home'
            ? 'TuitionOS Student'
            : activeTab === 'learning'
            ? 'Learning Materials'
            : activeTab === 'homework'
            ? 'Homework & Quizzes'
            : activeTab === 'results'
            ? 'Exam Results'
            : activeTab === 'progress'
            ? 'Progress Reports'
            : activeTab === 'timetable'
            ? 'Class Timetable'
            : activeTab === 'fees'
            ? 'Fee Statement'
            : activeTab === 'profile'
            ? 'Student Profile'
            : 'Student Portal'
        }
        subtitle={
          studentProfile?.batch?.name
            ? `Batch: ${studentProfile.batch.name}`
            : user?.fullName || 'Academic Portal'
        }
        onRefresh={onRefresh}
        onOpenNotifications={() => setShowNotificationModal(true)}
        unreadNotificationsCount={unreadNotifCount}
      />

      {/* Secondary Sub-View Navigation Breadcrumb */}
      {isSecondaryScreen && (
        <View style={styles.breadcrumbBar}>
          <TouchableOpacity
            style={styles.breadcrumbButton}
            onPress={() => setActiveTab('more')}
            activeOpacity={0.7}
          >
            <Text style={styles.breadcrumbText}>&larr; Back to More Menu</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main Content Area */}
      <View style={styles.body}>
        {/* TAB 1: HOME */}
        {activeTab === 'home' && (
          <StudentHomeTab
            user={user}
            studentProfile={studentProfile}
            materials={materials}
            homeworkList={homeworkList}
            quizzes={quizzes}
            exams={exams}
            progressFeedbacks={progressFeedbacks}
            feeStatement={feeStatement}
            loading={loading}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenHomeworkSubmission={(hw) => setSubmittingHw(hw)}
            onPreviewMaterial={(mat) => setPreviewMaterial(mat)}
            onStartQuiz={(quiz) => setActiveTakingQuiz(quiz)}
            onOpenReceipt={(paymentId) => handleOpenReceipt(paymentId)}
          />
        )}

        {/* TAB 2: LEARNING MATERIALS */}
        {activeTab === 'learning' && (
          <ScrollView
            style={styles.tabContent}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#4E342E"
              />
            }
          >
            {/* Subject Filters */}
            {materialSubjects.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    materialFilterSubject === 'ALL' && styles.filterChipActive,
                  ]}
                  onPress={() => setMaterialFilterSubject('ALL')}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      materialFilterSubject === 'ALL' && styles.filterChipTextActive,
                    ]}
                  >
                    All Subjects ({materials.length})
                  </Text>
                </TouchableOpacity>

                {materialSubjects.map((subj) => {
                  const count = materials.filter((m) => m.subject?.name === subj).length;
                  return (
                    <TouchableOpacity
                      key={subj}
                      style={[
                        styles.filterChip,
                        materialFilterSubject === subj && styles.filterChipActive,
                      ]}
                      onPress={() => setMaterialFilterSubject(subj)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          materialFilterSubject === subj && styles.filterChipTextActive,
                        ]}
                      >
                        {subj} ({count})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {filteredMaterials.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyEmoji}>📚</Text>
                <Text style={styles.emptyTitle}>No Study Materials Available</Text>
                <Text style={styles.emptySubtitle}>
                  Notes, presentations and reference files uploaded by your faculty will appear here.
                </Text>
              </View>
            ) : (
              filteredMaterials.map((mat) => (
                <View key={mat.id} style={styles.itemCard}>
                  <View style={styles.itemTopRow}>
                    <View style={styles.itemIconBox}>
                      <Text style={styles.itemIconText}>
                        {mat.type === 'PDF' ? '📄' : mat.type === 'AUDIO' ? '🎧' : '📁'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{mat.title}</Text>
                      <Text style={styles.itemMeta}>
                        {mat.subject?.name || 'Curriculum'} &bull; {mat.type || 'DOCUMENT'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.actionPillButton}
                      onPress={() => setPreviewMaterial(mat)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.actionPillButtonText}>View File</Text>
                    </TouchableOpacity>
                  </View>
                  {mat.description ? (
                    <Text style={styles.itemDescription} numberOfLines={3}>
                      {mat.description}
                    </Text>
                  ) : null}
                </View>
              ))
            )}
          </ScrollView>
        )}

        {/* TAB 3: HOMEWORK & QUIZZES */}
        {activeTab === 'homework' && (
          <View style={{ flex: 1 }}>
            {/* Sub-tab pills */}
            <View style={styles.subTabBar}>
              <TouchableOpacity
                style={[
                  styles.subTabButton,
                  homeworkSubTab === 'assignments' && styles.subTabButtonActive,
                ]}
                onPress={() => setHomeworkSubTab('assignments')}
              >
                <Text
                  style={[
                    styles.subTabText,
                    homeworkSubTab === 'assignments' && styles.subTabTextActive,
                  ]}
                >
                  📝 Assignments ({homeworkList.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.subTabButton,
                  homeworkSubTab === 'quizzes' && styles.subTabButtonActive,
                ]}
                onPress={() => setHomeworkSubTab('quizzes')}
              >
                <Text
                  style={[
                    styles.subTabText,
                    homeworkSubTab === 'quizzes' && styles.subTabTextActive,
                  ]}
                >
                  🎯 Quizzes ({quizzes.length})
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.tabContent}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#4E342E"
                />
              }
            >
              {homeworkSubTab === 'assignments' ? (
                <>
                  {/* Status Filter Chips */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipRow}
                  >
                    {['ALL', 'PENDING', 'SUBMITTED', 'GRADED'].map((st) => (
                      <TouchableOpacity
                        key={st}
                        style={[
                          styles.filterChip,
                          homeworkFilterStatus === st && styles.filterChipActive,
                        ]}
                        onPress={() => setHomeworkFilterStatus(st)}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            homeworkFilterStatus === st && styles.filterChipTextActive,
                          ]}
                        >
                          {st === 'ALL'
                            ? `All (${homeworkList.length})`
                            : st === 'PENDING'
                            ? 'Pending'
                            : st === 'SUBMITTED'
                            ? 'Submitted'
                            : 'Graded'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {filteredHomeworkList.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Text style={styles.emptyEmoji}>📝</Text>
                      <Text style={styles.emptyTitle}>No Homework Found</Text>
                      <Text style={styles.emptySubtitle}>
                        You have no homework matching the selected filter.
                      </Text>
                    </View>
                  ) : (
                    filteredHomeworkList.map((hw) => {
                      const statusInfo = getHomeworkStatusInfo(hw);
                      const isCompleted =
                        hw.studentStatus === 'COMPLETED' ||
                        hw.studentStatus === 'GRADED' ||
                        !!hw.mySubmission;

                      return (
                        <View key={hw.id} style={styles.itemCard}>
                          <View style={styles.hwTopRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.itemTitle}>{hw.title}</Text>
                              <Text style={styles.itemMeta}>
                                {hw.subject?.name || 'Subject'}
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.statusBadge,
                                { backgroundColor: statusInfo.bg },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusBadgeText,
                                  { color: statusInfo.color },
                                ]}
                              >
                                {statusInfo.label}
                              </Text>
                            </View>
                          </View>

                          <Text style={styles.itemDescription}>
                            {hw.description}
                          </Text>

                          {/* Submission Feedback Info if available */}
                          {hw.mySubmission && (
                            <View style={styles.submissionDetailsBox}>
                              <Text style={styles.submissionDateText}>
                                Submitted on:{' '}
                                {new Date(
                                  hw.mySubmission.submittedAt
                                ).toLocaleDateString('en-IN')}
                              </Text>
                              {hw.mySubmission.grade && (
                                <Text style={styles.gradeResultText}>
                                  Grade: {hw.mySubmission.grade}{' '}
                                  {hw.mySubmission.feedback
                                    ? `• "${hw.mySubmission.feedback}"`
                                    : ''}
                                </Text>
                              )}
                            </View>
                          )}

                          <View style={styles.hwCardFooter}>
                            <Text style={styles.dueDateText}>
                              📅 Due:{' '}
                              {hw.dueDate
                                ? new Date(hw.dueDate).toLocaleDateString('en-IN')
                                : 'Open'}
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                              {!isCompleted && (
                                <TouchableOpacity
                                  style={styles.completeBtn}
                                  onPress={() => handleMarkCompleted(hw)}
                                  activeOpacity={0.8}
                                >
                                  <Text style={styles.completeBtnText}>
                                    ✓ Complete
                                  </Text>
                                </TouchableOpacity>
                              )}
                              <TouchableOpacity
                                style={styles.submitBtn}
                                onPress={() => setSubmittingHw(hw)}
                                activeOpacity={0.8}
                              >
                                <Text style={styles.submitBtnText}>
                                  {hw.mySubmission ? 'Update Work' : 'Submit Work'}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      );
                    })
                  )}
                </>
              ) : (
                /* Quizzes Sub-tab */
                <>
                  {quizzes.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Text style={styles.emptyEmoji}>🎯</Text>
                      <Text style={styles.emptyTitle}>No Quizzes Scheduled</Text>
                      <Text style={styles.emptySubtitle}>
                        Interactive tests and assessments assigned by your teacher will appear here.
                      </Text>
                    </View>
                  ) : (
                    quizzes.map((quiz) => (
                      <View key={quiz.id} style={styles.itemCard}>
                        <View style={styles.hwTopRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.itemTitle}>{quiz.title}</Text>
                            <Text style={styles.itemMeta}>
                              {quiz.subject?.name || 'Curriculum'} &bull;{' '}
                              {quiz.durationMinutes
                                ? `${quiz.durationMinutes} mins`
                                : 'Untimed'}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.statusBadge,
                              quiz.myAttempt
                                ? { backgroundColor: '#E8F5E9' }
                                : { backgroundColor: '#EDE7F6' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusBadgeText,
                                quiz.myAttempt
                                  ? { color: '#2E7D32' }
                                  : { color: '#512DA8' },
                              ]}
                            >
                              {quiz.myAttempt
                                ? `${quiz.myAttempt.score}/${quiz.myAttempt.totalMarks} (${quiz.myAttempt.percentage}%)`
                                : 'AVAILABLE'}
                            </Text>
                          </View>
                        </View>

                        {quiz.instructions ? (
                          <Text style={styles.itemDescription} numberOfLines={2}>
                            {quiz.instructions}
                          </Text>
                        ) : null}

                        <View style={styles.hwCardFooter}>
                          <Text style={styles.dueDateText}>
                            Questions: {quiz._count?.questions || 0}
                          </Text>
                          <TouchableOpacity
                            style={[
                              styles.submitBtn,
                              quiz.myAttempt && { backgroundColor: '#2E7D32' },
                            ]}
                            onPress={() => {
                              if (quiz.myAttempt) {
                                Alert.alert(
                                  quiz.title,
                                  `Your Score: ${quiz.myAttempt.score}/${quiz.myAttempt.totalMarks} (${quiz.myAttempt.percentage}%)\n\nSubmitted at: ${new Date(quiz.myAttempt.submittedAt).toLocaleDateString('en-IN')}`
                                );
                              } else {
                                setActiveTakingQuiz(quiz);
                              }
                            }}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.submitBtnText}>
                              {quiz.myAttempt ? 'View Score' : 'Start Quiz'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}
                </>
              )}
            </ScrollView>
          </View>
        )}

        {/* TAB 4: EXAM RESULTS */}
        {activeTab === 'results' && (
          <ScrollView
            style={styles.tabContent}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#4E342E"
              />
            }
          >
            {/* Filter chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {[
                { id: 'ALL', label: `All Exams (${exams.length})` },
                { id: 'RESULTS', label: 'Published Results' },
                { id: 'UPCOMING', label: 'Scheduled' },
              ].map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={[
                    styles.filterChip,
                    examFilter === f.id && styles.filterChipActive,
                  ]}
                  onPress={() => setExamFilter(f.id as any)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      examFilter === f.id && styles.filterChipTextActive,
                    ]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {filteredExams.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyEmoji}>🏆</Text>
                <Text style={styles.emptyTitle}>No Examinations Found</Text>
                <Text style={styles.emptySubtitle}>
                  Exam schedules and evaluated results will be listed here.
                </Text>
              </View>
            ) : (
              filteredExams.map((exam) => {
                const mark = exam.studentMark;
                const isResultsPub = exam.isResultsPublished;

                return (
                  <View key={exam.id} style={styles.itemCard}>
                    <View style={styles.hwTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemTitle}>
                          {exam.title || exam.name}
                        </Text>
                        <Text style={styles.itemMeta}>
                          {exam.subject?.name || 'General'} &bull; Max Marks:{' '}
                          {exam.totalMarks || 100}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          isResultsPub
                            ? mark?.isPassed
                              ? { backgroundColor: '#E8F5E9' }
                              : { backgroundColor: '#FFEBEE' }
                            : { backgroundColor: '#EDE7F6' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            isResultsPub
                              ? mark?.isPassed
                                ? { color: '#2E7D32' }
                                : { color: '#C62828' }
                              : { color: '#512DA8' },
                          ]}
                        >
                          {isResultsPub
                            ? mark?.status || 'EVALUATED'
                            : 'SCHEDULED'}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.examDateLine}>
                      📅 Exam Date:{' '}
                      {exam.examDate
                        ? new Date(exam.examDate).toLocaleDateString('en-IN')
                        : 'Scheduled'}{' '}
                      {exam.startTime ? `(${exam.startTime})` : ''}
                    </Text>

                    {isResultsPub && mark ? (
                      <View
                        style={[
                          styles.markResultBox,
                          mark.isPassed
                            ? styles.markResultBoxPass
                            : styles.markResultBoxFail,
                        ]}
                      >
                        <Text
                          style={[
                            styles.markScoreText,
                            mark.isPassed
                              ? styles.markScoreTextPass
                              : styles.markScoreTextFail,
                          ]}
                        >
                          Score: {mark.marksObtained} / {exam.totalMarks} (
                          {mark.percentage}%) &bull;{' '}
                          {mark.isPassed ? 'PASSED' : 'RETEST'}
                        </Text>
                        {mark.remarks ? (
                          <Text style={styles.markRemarksText}>
                            "{mark.remarks}"
                          </Text>
                        ) : null}
                      </View>
                    ) : (
                      <View style={styles.pendingEvalBox}>
                        <Text style={styles.pendingEvalText}>
                          ⏳ Official results pending evaluation by faculty.
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        )}

        {/* TAB 5: MORE MENU */}
        {activeTab === 'more' && (
          <StudentMoreTab
            user={user}
            institute={institute}
            studentProfile={studentProfile}
            progressFeedbacks={progressFeedbacks}
            feeStatement={feeStatement}
            unreadCount={unreadNotifCount}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenNotifications={() => setShowNotificationModal(true)}
            onSignOut={logout}
          />
        )}

        {/* SUB-VIEW: ACADEMIC PROGRESS REPORTS (REPORTS ONLY) */}
        {activeTab === 'progress' && (
          <ScrollView
            style={styles.tabContent}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#4E342E"
              />
            }
          >
            <View style={styles.moduleNoticeHeader}>
              <Text style={styles.moduleNoticeTitle}>
                Academic Performance Reports
              </Text>
              <Text style={styles.moduleNoticeSubtitle}>
                Published term evaluations from your faculty.
              </Text>
            </View>

            {progressFeedbacks.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyEmoji}>📊</Text>
                <Text style={styles.emptyTitle}>No Progress Reports Yet</Text>
                <Text style={styles.emptySubtitle}>
                  Formal progress evaluations and remarks from your teachers will appear here.
                </Text>
              </View>
            ) : (
              progressFeedbacks.map((fb) => (
                <View key={fb.id} style={styles.itemCard}>
                  <View style={styles.hwTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{fb.termName}</Text>
                      <Text style={styles.itemMeta}>
                        Evaluated by {fb.staff?.fullName || 'Faculty'} &bull;{' '}
                        {fb.periodType || 'TERM'}
                      </Text>
                    </View>
                    <View style={styles.ratingBadge}>
                      <Text style={styles.ratingBadgeText}>
                        {fb.rating || 5}/5 ★
                      </Text>
                    </View>
                  </View>

                  {/* Metrics Row */}
                  {(fb.attendanceRate !== null ||
                    fb.homeworkRate !== null ||
                    fb.examAverage !== null) && (
                    <View style={styles.progressMetricsGrid}>
                      <View style={styles.progressMetricCell}>
                        <Text style={styles.progressMetricLabel}>
                          ATTENDANCE
                        </Text>
                        <Text style={styles.progressMetricValue}>
                          {fb.attendanceRate !== null
                            ? `${Number(fb.attendanceRate)}%`
                            : 'N/A'}
                        </Text>
                      </View>
                      <View style={styles.progressMetricCell}>
                        <Text style={styles.progressMetricLabel}>HOMEWORK</Text>
                        <Text style={styles.progressMetricValue}>
                          {fb.homeworkRate !== null
                            ? `${Number(fb.homeworkRate)}%`
                            : 'N/A'}
                        </Text>
                      </View>
                      <View style={styles.progressMetricCell}>
                        <Text style={styles.progressMetricLabel}>TEST AVG</Text>
                        <Text style={styles.progressMetricValue}>
                          {fb.examAverage !== null
                            ? `${Number(fb.examAverage)}%`
                            : 'N/A'}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Teacher Remarks */}
                  {fb.remarks ? (
                    <View style={styles.remarksCard}>
                      <Text style={styles.remarksQuote}>"{fb.remarks}"</Text>
                    </View>
                  ) : null}

                  {/* Actionable Feedback Highlights */}
                  {fb.strengths ? (
                    <View style={styles.strengthBox}>
                      <Text style={styles.strengthText}>
                        💪 STRENGTHS: {fb.strengths}
                      </Text>
                    </View>
                  ) : null}
                  {fb.improvements ? (
                    <View style={styles.growthBox}>
                      <Text style={styles.growthText}>
                        📈 GROWTH AREAS: {fb.improvements}
                      </Text>
                    </View>
                  ) : null}
                  {fb.recommendations ? (
                    <View style={styles.actionBox}>
                      <Text style={styles.actionText}>
                        🎯 ACTIONS: {fb.recommendations}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ))
            )}
          </ScrollView>
        )}

        {/* SUB-VIEW: TIMETABLE & BATCH SCHEDULE */}
        {activeTab === 'timetable' && (
          <ScrollView
            style={styles.tabContent}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.moduleNoticeHeader}>
              <Text style={styles.moduleNoticeTitle}>Enrolled Batch Schedule</Text>
              <Text style={styles.moduleNoticeSubtitle}>
                {studentProfile?.batch?.name || 'Academic Class'} &bull; Grade{' '}
                {studentProfile?.batch?.grade || '—'}
              </Text>
            </View>

            {studentProfile?.enrollments && studentProfile.enrollments.length > 0 ? (
              studentProfile.enrollments.map((enr: any) => (
                <View key={enr.id} style={styles.itemCard}>
                  <Text style={styles.itemTitle}>{enr.batch?.name}</Text>
                  <Text style={styles.itemMeta}>
                    Classroom: {enr.batch?.roomNumber || 'Assigned Hall'}
                  </Text>

                  {enr.batch?.schedule ? (
                    <View style={styles.scheduleBadge}>
                      <Text style={styles.scheduleBadgeText}>
                        ⏰ Schedule: {enr.batch.schedule}
                      </Text>
                    </View>
                  ) : null}

                  <Text style={[styles.sectionHeading, { marginTop: 12 }]}>
                    CURRICULUM & FACULTY
                  </Text>
                  {enr.batch?.batchSubjects && enr.batch.batchSubjects.length > 0 ? (
                    enr.batch.batchSubjects.map((bs: any) => (
                      <View key={bs.id} style={styles.subjectTeacherRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.subjectTeacherName}>
                            📖 {bs.subject?.name || 'Subject'}
                          </Text>
                          <Text style={styles.subjectTeacherFaculty}>
                            Faculty: {bs.staffProfile?.user?.fullName || 'Assigned Teacher'}
                          </Text>
                        </View>
                        {bs.weeklyHours ? (
                          <View style={styles.hoursBadge}>
                            <Text style={styles.hoursBadgeText}>
                              {bs.weeklyHours}h/wk
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptySubtitle}>
                      No subjects allocated to this batch yet.
                    </Text>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyEmoji}>📅</Text>
                <Text style={styles.emptyTitle}>No Class Schedule Available</Text>
                <Text style={styles.emptySubtitle}>
                  You are currently not enrolled in an active batch.
                </Text>
              </View>
            )}
          </ScrollView>
        )}

        {/* SUB-VIEW: FEES & RECEIPTS */}
        {activeTab === 'fees' && (
          <ScrollView
            style={styles.tabContent}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Balance Overview Card */}
            <View style={styles.feeSummaryCard}>
              <Text style={styles.feeSummaryLabel}>FEE BALANCE STATUS</Text>
              <Text style={styles.feeSummaryAmount}>
                {formatRupee(feeStatement?.summary?.outstandingBalance || 0)}
              </Text>
              <Text style={styles.feeSummarySub}>
                Total Cleared: {formatRupee(feeStatement?.summary?.totalPaid || 0)} &bull; Total Fees:{' '}
                {formatRupee(feeStatement?.summary?.totalFees || 0)}
              </Text>
            </View>

            {/* Payment History & Receipts */}
            <Text style={styles.sectionHeading}>OFFICIAL RECEIPTS</Text>
            {feeStatement?.recentPayments && feeStatement.recentPayments.length > 0 ? (
              feeStatement.recentPayments.map((pay: any) => (
                <View key={pay.id} style={styles.itemCard}>
                  <View style={styles.hwTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{formatRupee(pay.amount)}</Text>
                      <Text style={styles.itemMeta}>
                        Paid via {pay.paymentMethod || 'UPI'} &bull;{' '}
                        {new Date(pay.paidAt).toLocaleDateString('en-IN')}
                      </Text>
                      {pay.receiptNumber && (
                        <Text style={styles.receiptNumText}>
                          Receipt: {pay.receiptNumber}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.actionPillButton}
                      onPress={() => handleOpenReceipt(pay.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.actionPillButtonText}>View Receipt</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyEmoji}>💳</Text>
                <Text style={styles.emptyTitle}>No Payment Receipts</Text>
                <Text style={styles.emptySubtitle}>
                  Payment transactions and receipts issued by the administration will appear here.
                </Text>
              </View>
            )}
          </ScrollView>
        )}

        {/* SUB-VIEW: STUDENT PROFILE DETAILS */}
        {activeTab === 'profile' && (
          <ScrollView
            style={styles.tabContent}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.itemCard}>
              <Text style={styles.sectionHeading}>STUDENT INFORMATION</Text>
              <View style={styles.profileRow}>
                <Text style={styles.profileFieldLabel}>Full Name:</Text>
                <Text style={styles.profileFieldValue}>
                  {studentProfile?.user?.fullName || user?.fullName}
                </Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileFieldLabel}>Admission No:</Text>
                <Text style={styles.profileFieldValue}>
                  {studentProfile?.admissionNumber || studentProfile?.rollNumber || '—'}
                </Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileFieldLabel}>Enrolled Batch:</Text>
                <Text style={styles.profileFieldValue}>
                  {studentProfile?.batch?.name || 'Assigned'} (Grade{' '}
                  {studentProfile?.batch?.grade || '—'})
                </Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileFieldLabel}>Contact Phone:</Text>
                <Text style={styles.profileFieldValue}>
                  {studentProfile?.user?.phone || user?.phone || 'On file'}
                </Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileFieldLabel}>Email:</Text>
                <Text style={styles.profileFieldValue}>
                  {studentProfile?.user?.email || user?.email || '—'}
                </Text>
              </View>
            </View>

            <View style={styles.itemCard}>
              <Text style={styles.sectionHeading}>INSTITUTE CONTEXT</Text>
              <View style={styles.profileRow}>
                <Text style={styles.profileFieldLabel}>Institute Name:</Text>
                <Text style={styles.profileFieldValue}>
                  {studentProfile?.institute?.name || institute?.name || 'TuitionOS Institute'}
                </Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileFieldLabel}>Institute Code:</Text>
                <Text style={styles.profileFieldValue}>
                  {studentProfile?.institute?.code || institute?.code || 'INST'}
                </Text>
              </View>
              {studentProfile?.institute?.address && (
                <View style={styles.profileRow}>
                  <Text style={styles.profileFieldLabel}>Campus:</Text>
                  <Text style={styles.profileFieldValue}>
                    {studentProfile.institute.address}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </View>

      {/* Homework Submission Modal */}
      <Modal visible={!!submittingHw} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Submit Assignment</Text>
            <Text style={styles.modalSub}>{submittingHw?.title}</Text>
            <TextInput
              style={styles.modalInput}
              multiline
              numberOfLines={4}
              placeholder="Paste answers, cloud document link, or write your response..."
              placeholderTextColor="#8D6E63"
              value={submissionContent}
              onChangeText={setSubmissionContent}
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                onPress={() => {
                  setSubmittingHw(null);
                  setSubmissionContent('');
                }}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmitHomework}
                style={styles.modalSubmitBtn}
                disabled={submissionLoading}
              >
                {submissionLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Submit Work</Text>
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

      {/* Notifications Modal */}
      <NotificationModal
        visible={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        onUnreadCountChange={setUnreadNotifCount}
        onNavigateToEntity={handleNavigateToEntity}
      />

      {/* Material File Viewer Modal */}
      <MaterialViewerModal
        visible={!!previewMaterial}
        material={previewMaterial}
        onClose={() => setPreviewMaterial(null)}
      />

      {/* Quiz Taker Modal */}
      {activeTakingQuiz && (
        <QuizTakerModal
          isOpen={!!activeTakingQuiz}
          quiz={activeTakingQuiz}
          onClose={() => setActiveTakingQuiz(null)}
          onSubmitted={() => {
            fetchStudentData();
          }}
        />
      )}

      {/* Pinned Bottom Navigation Bar */}
      <StudentBottomNav
        activeTab={activeTab}
        onSelectTab={(tab: StudentPrimaryTab) => setActiveTab(tab)}
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
  body: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  breadcrumbBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEBE9',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  breadcrumbButton: {
    alignSelf: 'flex-start',
  },
  breadcrumbText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4E342E',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EFEBE9',
  },
  filterChipActive: {
    backgroundColor: '#4E342E',
    borderColor: '#4E342E',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6D4C41',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  subTabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEBE9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  subTabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#FAF7F5',
  },
  subTabButtonActive: {
    backgroundColor: '#4E342E',
  },
  subTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6D4C41',
  },
  subTabTextActive: {
    color: '#FFFFFF',
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    marginBottom: 12,
    shadowColor: '#2D1E18',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F5ECE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIconText: {
    fontSize: 20,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2D1E18',
  },
  itemMeta: {
    fontSize: 11,
    color: '#8D6E63',
    marginTop: 2,
  },
  itemDescription: {
    fontSize: 12,
    color: '#5D4037',
    marginTop: 8,
    lineHeight: 17,
  },
  actionPillButton: {
    backgroundColor: '#F5ECE8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionPillButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4E342E',
  },
  hwTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  submissionDetailsBox: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#FAF7F5',
    borderRadius: 8,
  },
  submissionDateText: {
    fontSize: 11,
    color: '#8D6E63',
  },
  gradeResultText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2E7D32',
    marginTop: 2,
  },
  hwCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F5ECE8',
  },
  dueDateText: {
    fontSize: 11,
    color: '#8D6E63',
    fontWeight: '600',
  },
  completeBtn: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  completeBtnText: {
    color: '#2E7D32',
    fontSize: 11,
    fontWeight: '800',
  },
  submitBtn: {
    backgroundColor: '#4E342E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  examDateLine: {
    fontSize: 11,
    color: '#8D6E63',
    marginTop: 6,
  },
  markResultBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
  },
  markResultBoxPass: {
    backgroundColor: '#E8F5E9',
  },
  markResultBoxFail: {
    backgroundColor: '#FFEBEE',
  },
  markScoreText: {
    fontSize: 13,
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
  pendingEvalBox: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#FAF7F5',
    borderRadius: 8,
  },
  pendingEvalText: {
    fontSize: 11,
    color: '#8D6E63',
    fontStyle: 'italic',
  },
  moduleNoticeHeader: {
    marginBottom: 14,
  },
  moduleNoticeTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#2D1E18',
  },
  moduleNoticeSubtitle: {
    fontSize: 12,
    color: '#8D6E63',
    marginTop: 2,
  },
  ratingBadge: {
    backgroundColor: '#EDE7F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#512DA8',
  },
  progressMetricsGrid: {
    flexDirection: 'row',
    backgroundColor: '#FAF7F5',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    justifyContent: 'space-around',
  },
  progressMetricCell: {
    alignItems: 'center',
  },
  progressMetricLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8D6E63',
  },
  progressMetricValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#2D1E18',
    marginTop: 2,
  },
  remarksCard: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#FAF7F5',
    borderRadius: 8,
  },
  remarksQuote: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#3E2723',
    lineHeight: 18,
  },
  strengthBox: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#E8F5E9',
    borderRadius: 6,
  },
  strengthText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2E7D32',
  },
  growthBox: {
    marginTop: 4,
    padding: 8,
    backgroundColor: '#FFF3E0',
    borderRadius: 6,
  },
  growthText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#E65100',
  },
  actionBox: {
    marginTop: 4,
    padding: 8,
    backgroundColor: '#E1F5FE',
    borderRadius: 6,
  },
  actionText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0277BD',
  },
  scheduleBadge: {
    backgroundColor: '#EFEBE9',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  scheduleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4E342E',
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '900',
    color: '#8D6E63',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  subjectTeacherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5ECE8',
  },
  subjectTeacherName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2D1E18',
  },
  subjectTeacherFaculty: {
    fontSize: 11,
    color: '#8D6E63',
    marginTop: 1,
  },
  hoursBadge: {
    backgroundColor: '#FAF7F5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EFEBE9',
  },
  hoursBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4E342E',
  },
  feeSummaryCard: {
    backgroundColor: '#4E342E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  feeSummaryLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D7CCC8',
    letterSpacing: 0.6,
  },
  feeSummaryAmount: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    marginVertical: 4,
  },
  feeSummarySub: {
    fontSize: 11,
    color: '#BCAAA4',
    fontWeight: '600',
  },
  receiptNumText: {
    fontSize: 11,
    color: '#6D4C41',
    fontWeight: '600',
    marginTop: 2,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
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
    fontWeight: '800',
    color: '#2D1E18',
  },
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
  emptyEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4E342E',
  },
  emptySubtitle: {
    fontSize: 11,
    color: '#8D6E63',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(45, 30, 24, 0.65)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    padding: 20,
  },
  modalTitle: {
    color: '#2D1E18',
    fontSize: 17,
    fontWeight: '900',
  },
  modalSub: {
    color: '#8D6E63',
    fontSize: 12,
    marginBottom: 12,
  },
  modalInput: {
    backgroundColor: '#FAF7F5',
    borderWidth: 1,
    borderColor: '#EFEBE9',
    borderRadius: 10,
    padding: 12,
    color: '#2D1E18',
    textAlignVertical: 'top',
    height: 110,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#FAF7F5',
    borderWidth: 1,
    borderColor: '#EFEBE9',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    color: '#5D4037',
    fontWeight: '700',
  },
  modalSubmitBtn: {
    flex: 1,
    backgroundColor: '#4E342E',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
