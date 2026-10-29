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
  Linking,
} from 'react-native';
import { useMobileAuth } from '../../context/AuthContext';
import { mobileApiFetch, buildApiUrl, getApiBaseUrl, buildAuthenticatedDownloadUrl } from '../../services/api';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { ReceiptModal } from '../../components/ReceiptModal';
import { NotificationModal } from '../../components/NotificationModal';
import { MaterialViewerModal } from '../../components/MaterialViewerModal';
import { QuizTakerModal } from '../../components/QuizTakerModal';
import { PushNotificationService } from '../../services/pushNotification.service';
import { themeTokens } from '@tuition/shared';

export const StudentScreen: React.FC = () => {
  const { user } = useMobileAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'academics' | 'attendance'>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [homeworkList, setHomeworkList] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [progressFeedbacks, setProgressFeedbacks] = useState<any[]>([]);
  const [attendanceEvents, setAttendanceEvents] = useState<any[]>([]);
  const [feeStatement, setFeeStatement] = useState<any>(null);

  // Receipt Modal
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Homework Submission Modal
  const [submittingHw, setSubmittingHw] = useState<any>(null);
  const [submissionContent, setSubmissionContent] = useState('');
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [previewMaterial, setPreviewMaterial] = useState<any | null>(null);
  const [activeTakingQuiz, setActiveTakingQuiz] = useState<any | null>(null);

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

  const fetchStudentData = useCallback(async () => {
    try {
      // 1. Fetch Student Profile
      const profRes = await mobileApiFetch('/students/my/profile');
      let currentStudent = profRes.data;
      if (profRes.success && currentStudent) {
        setStudentProfile(currentStudent);

        // Fetch Fee Statement
        if (currentStudent.id) {
          const feeRes = await mobileApiFetch(`/fees/students/${currentStudent.id}/statement`);
          if (feeRes.success) {
            setFeeStatement(feeRes.data);
          }
        }
      }

      // 2. Fetch Learning Materials
      const matRes = await mobileApiFetch('/materials');
      if (matRes.success && matRes.data) {
        setMaterials(Array.isArray(matRes.data) ? matRes.data : matRes.data.materials || []);
      }

      // 3. Fetch Homework
      const hwRes = await mobileApiFetch('/homework');
      if (hwRes.success && hwRes.data) {
        setHomeworkList(Array.isArray(hwRes.data) ? hwRes.data : hwRes.data.homework || []);
      }

      // 4. Fetch Quizzes
      const quizRes = await mobileApiFetch('/quizzes');
      if (quizRes.success && quizRes.data) {
        setQuizzes(Array.isArray(quizRes.data) ? quizRes.data : quizRes.data.quizzes || []);
      }

      // 5. Fetch Exams
      const examRes = await mobileApiFetch('/exams');
      if (examRes.success && examRes.data) {
        setExams(Array.isArray(examRes.data) ? examRes.data : examRes.data.exams || []);
      }

      // 6. Fetch Progress Reports
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
    PushNotificationService.registerPushToken().catch(() => {});
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

  const handleDownloadMaterial = (mat: any) => {
    setPreviewMaterial(mat);
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
    PushNotificationService.registerPushToken().catch(() => {});
    mobileApiFetch('/notifications/unread-count')
      .then((res) => {
        if (res.success && res.data?.unreadCount !== undefined) {
          setUnreadNotifCount(res.data.unreadCount);
        }
      })
      .catch(() => {});
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
      Alert.alert('Error', 'Please enter your submission text or link.');
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
    PushNotificationService.registerPushToken().catch(() => {});
    mobileApiFetch('/notifications/unread-count')
      .then((res) => {
        if (res.success && res.data?.unreadCount !== undefined) {
          setUnreadNotifCount(res.data.unreadCount);
        }
      })
      .catch(() => {});
      } else {
        Alert.alert('Submission Error', res.error || 'Could not submit homework.');
      }
    } catch {
      Alert.alert('Error', 'Failed to connect to server.');
    } finally {
      setSubmissionLoading(false);
    }
  };

  const formatRupee = (amt: number) => {
    return `₹${(amt || 0).toLocaleString('en-IN')}`;
  };

  return (
    <View style={styles.container}>
      <Header
        title="Student Portal"
        subtitle={studentProfile?.batch?.name ? `Class: ${studentProfile.batch.name}` : 'Welcome back'}
        onRefresh={onRefresh}
        onOpenNotifications={() => setShowNotificationModal(true)}
        unreadNotificationsCount={unreadNotifCount}
      />

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          onPress={() => setActiveTab('overview')}
          style={[styles.tabItem, activeTab === 'overview' && styles.activeTabItem]}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Overview & Pass
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
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading your student dashboard...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
        >
          {/* TAB 1: OVERVIEW & PASS */}
          {activeTab === 'overview' && (
            <View>
              {/* Profile Card */}
              <Card highlighted>
                <View style={styles.profileRow}>
                  <View style={styles.avatarLarge}>
                    <Text style={styles.avatarLargeText}>
                      {user?.fullName?.[0] || 'S'}
                    </Text>
                  </View>
                  <View style={styles.profileDetails}>
                    <Text style={styles.studentName}>{user?.fullName || 'Student'}</Text>
                    <Text style={styles.studentRoll}>
                      Admission: {studentProfile?.admissionNumber || '—'} &bull; Batch: {studentProfile?.batch?.name || 'Assigned'}
                    </Text>
                    {studentProfile?.createdAt && (
                      <Text style={[styles.studentRoll, { marginTop: 2, fontSize: 11 }]}>
                        Created: {formatKolkataTime(studentProfile.createdAt)}
                      </Text>
                    )}
                    <View style={styles.badgeRow}>
                      <Badge label="ACTIVE ENROLLED" variant="success" size="sm" />
                      {studentProfile?.batch?.grade && (
                        <Badge label={`Grade ${studentProfile.batch.grade}`} variant="indigo" size="sm" />
                      )}
                    </View>
                  </View>
                </View>
              </Card>

              {/* Key Highlights */}
              <View style={styles.statsRow}>
                <View style={[styles.statBox, { backgroundColor: '#1e1b4b' }]}>
                  <Text style={styles.statLabel}>OUTSTANDING FEES</Text>
                  <Text style={[styles.statValue, { color: '#f87171' }]}>
                    {formatRupee(feeStatement?.summary?.outstandingBalance || 0)}
                  </Text>
                  <Text style={styles.statNote}>Total Due</Text>
                </View>

                <View style={[styles.statBox, { backgroundColor: '#064e3b' }]}>
                  <Text style={styles.statLabel}>FEES PAID</Text>
                  <Text style={[styles.statValue, { color: '#34d399' }]}>
                    {formatRupee(feeStatement?.summary?.totalPaid || 0)}
                  </Text>
                  <Text style={styles.statNote}>Cleared to Date</Text>
                </View>
              </View>
            </View>
          )}

          {/* TAB 2: ACADEMICS (Materials, Homework, Exams) */}
          {activeTab === 'academics' && (
            <View>
              {/* Materials Section */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>📚 Learning Materials & Notes</Text>
                <Text style={styles.sectionCount}>{materials.length} available</Text>
              </View>

              {materials.length === 0 ? (
                <Card>
                  <Text style={styles.emptyText}>No materials assigned to your batch yet.</Text>
                </Card>
              ) : (
                materials.map((mat) => (
                  <Card key={mat.id} onPress={() => handleDownloadMaterial(mat)}>
                    <View style={styles.matRow}>
                      <View style={styles.matIconCircle}>
                        <Text style={styles.matIcon}>{mat.type === 'PDF' ? '📄' : '🎧'}</Text>
                      </View>
                      <View style={styles.matInfo}>
                        <Text style={styles.matTitle}>{mat.title}</Text>
                        <Text style={styles.matSubject}>
                          {mat.subject?.name || 'General'} &bull; {mat.type}
                        </Text>
                        {mat.description ? (
                          <Text style={styles.matDesc} numberOfLines={2}>
                            {mat.description}
                          </Text>
                        ) : null}
                      </View>
                      <TouchableOpacity
                        onPress={() => handleDownloadMaterial(mat)}
                        style={styles.downloadBtn}
                      >
                        <Text style={styles.downloadBtnText}>View</Text>
                      </TouchableOpacity>
                    </View>
                  </Card>
                ))
              )}

              {/* Homework Section */}
              <View style={[styles.sectionHeader, { marginTop: 16 }]}>
                <Text style={styles.sectionTitle}>📝 Homework & Assignments</Text>
                <Text style={styles.sectionCount}>{homeworkList.length} total</Text>
              </View>

              {homeworkList.length === 0 ? (
                <Card>
                  <Text style={styles.emptyText}>No active homework assignments.</Text>
                </Card>
              ) : (
                homeworkList.map((hw) => (
                  <Card key={hw.id}>
                    <View style={styles.hwHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.hwTitle}>{hw.title}</Text>
                        <Text style={styles.hwSubject}>{hw.subject?.name || 'Subject'}</Text>
                      </View>
                      <Badge
                        label={
                          hw.mySubmission
                            ? hw.mySubmission.status
                            : hw.isOverdue
                            ? 'OVERDUE'
                            : 'NOT STARTED'
                        }
                        variant={
                          hw.mySubmission?.status === 'COMPLETED' || hw.mySubmission?.status === 'GRADED'
                            ? 'success'
                            : hw.mySubmission?.status === 'SUBMITTED'
                            ? 'info'
                            : hw.isOverdue
                            ? 'danger'
                            : 'warning'
                        }
                      />
                    </View>
                    <Text style={styles.hwDescription}>{hw.description}</Text>

                    {hw.mySubmission && (
                      <View style={{ marginTop: 8, padding: 8, backgroundColor: themeTokens.colors.surfaceMuted, borderRadius: 8 }}>
                        <Text style={{ fontSize: 11, color: themeTokens.colors.textSecondary }}>
                          Submitted: {new Date(hw.mySubmission.submittedAt).toLocaleDateString('en-IN')}
                        </Text>
                        {hw.mySubmission.grade && (
                          <Text style={{ fontSize: 11, fontWeight: 'bold', color: themeTokens.colors.primary, marginTop: 2 }}>
                            Grade: {hw.mySubmission.grade} {hw.mySubmission.feedback ? `(${hw.mySubmission.feedback})` : ''}
                          </Text>
                        )}
                      </View>
                    )}

                    <View style={styles.hwFooter}>
                      <Text style={styles.hwDueDate}>
                        📅 Due: {hw.dueDate ? new Date(hw.dueDate).toLocaleDateString('en-IN') : 'Open'}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {!hw.mySubmission && (
                          <TouchableOpacity
                            onPress={() => handleMarkCompleted(hw)}
                            style={[styles.submitHwBtn, { backgroundColor: themeTokens.colors.success }]}
                          >
                            <Text style={styles.submitHwBtnText}>✓ Complete</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          onPress={() => setSubmittingHw(hw)}
                          style={styles.submitHwBtn}
                        >
                          <Text style={styles.submitHwBtnText}>
                            {hw.mySubmission ? 'Update Work' : 'Submit Work'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Card>
                ))
              )}

              {/* Quizzes & Assessments Section (Phase 6 & 9) */}
              <View style={[styles.sectionHeader, { marginTop: 16 }]}>
                <Text style={styles.sectionTitle}>🎯 Quizzes & Assessments</Text>
                <Text style={styles.sectionCount}>{quizzes.length} available</Text>
              </View>

              {quizzes.length === 0 ? (
                <Card>
                  <Text style={styles.emptyText}>No quizzes available at the moment.</Text>
                </Card>
              ) : (
                quizzes.map((quiz) => (
                  <Card key={quiz.id}>
                    <View style={styles.hwHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.hwTitle}>{quiz.title}</Text>
                        <Text style={styles.hwSubject}>
                          {quiz.subject?.name || 'Curriculum'} • {quiz.durationMinutes ? `${quiz.durationMinutes} mins` : 'Untimed'}
                        </Text>
                      </View>
                      <Badge
                        label={quiz.myAttempt ? `${quiz.myAttempt.score}/${quiz.myAttempt.totalMarks}` : 'AVAILABLE'}
                        variant={quiz.myAttempt ? 'success' : 'info'}
                      />
                    </View>
                    {quiz.instructions ? (
                      <Text style={[styles.hwDescription, { marginTop: 6 }]} numberOfLines={2}>
                        {quiz.instructions}
                      </Text>
                    ) : null}
                    <View style={[styles.hwFooter, { marginTop: 8 }]}>
                      <Text style={styles.hwDueDate}>
                        Questions: {quiz._count?.questions || 0}
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          if (quiz.myAttempt) {
                            Alert.alert(
                              quiz.title,
                              `Your Score: ${quiz.myAttempt.score}/${quiz.myAttempt.totalMarks} (${quiz.myAttempt.percentage}%)\n\nSubmitted at: ${formatKolkataTime(quiz.myAttempt.submittedAt)}`
                            );
                          } else {
                            setActiveTakingQuiz(quiz);
                          }
                        }}
                        style={[styles.submitHwBtn, { backgroundColor: quiz.myAttempt ? themeTokens.colors.success : themeTokens.colors.primary }]}
                      >
                        <Text style={styles.submitHwBtnText}>
                          {quiz.myAttempt ? 'View Score' : 'Take Quiz'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </Card>
                ))
              )}

              {/* Exams Section */}
              <View style={[styles.sectionHeader, { marginTop: 16 }]}>
                <Text style={styles.sectionTitle}>🏆 Examinations & Results</Text>
                <Text style={styles.sectionCount}>{exams.length} exams</Text>
              </View>

              {exams.length === 0 ? (
                <Card>
                  <Text style={styles.emptyText}>No published examinations yet.</Text>
                </Card>
              ) : (
                exams.map((exam) => {
                  const mark = exam.studentMark;
                  const isResultsPub = exam.isResultsPublished;

                  return (
                    <Card key={exam.id}>
                      <View style={styles.examRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.examTitle}>{exam.title || exam.name}</Text>
                          <Text style={styles.examSubject}>
                            {exam.subject?.name || 'General'} &bull; Max Marks: {exam.totalMarks || 100}
                          </Text>
                        </View>
                        <Badge
                          label={isResultsPub ? (mark?.status || 'RESULTS') : 'SCHEDULED'}
                          variant={isResultsPub ? (mark?.isPassed ? 'success' : 'danger') : 'info'}
                          size="sm"
                        />
                      </View>

                      <View style={styles.examDateRow}>
                        <Text style={styles.examDateText}>
                          Date: {exam.examDate ? new Date(exam.examDate).toLocaleDateString('en-IN') : 'Scheduled'}
                          {exam.startTime ? ` (${exam.startTime}${exam.endTime ? ' - ' + exam.endTime : ''})` : ''}
                        </Text>
                      </View>

                      {isResultsPub && mark ? (
                        <View style={{ marginTop: 8, padding: 8, backgroundColor: mark.isPassed ? '#E8F5E9' : '#FFEBEE', borderRadius: 8 }}>
                          <Text style={{ fontSize: 13, fontWeight: 'bold', color: mark.isPassed ? '#2E7D32' : '#C62828' }}>
                            Score: {mark.marksObtained} / {exam.totalMarks} ({mark.percentage}%) &bull; {mark.status}
                          </Text>
                          {mark.remarks ? (
                            <Text style={{ fontSize: 11, fontStyle: 'italic', color: '#4E342E', marginTop: 2 }}>
                              "{mark.remarks}"
                            </Text>
                          ) : null}
                        </View>
                      ) : (
                        <View style={{ marginTop: 6 }}>
                          <Text style={{ fontSize: 11, color: '#8D6E63', fontStyle: 'italic' }}>
                            Official results pending evaluation.
                          </Text>
                        </View>
                      )}
                    </Card>
                  );
                })
              )}

              {/* Progress Reports Section */}
              <View style={[styles.sectionHeader, { marginTop: 16 }]}>
                <Text style={styles.sectionTitle}>✨ Faculty Progress Reports</Text>
                <Text style={styles.sectionCount}>{progressFeedbacks.length} reports</Text>
              </View>

              {progressFeedbacks.length === 0 ? (
                <Card>
                  <Text style={styles.emptyText}>No academic progress reports published yet.</Text>
                </Card>
              ) : (
                progressFeedbacks.map((fb) => (
                  <Card key={fb.id}>
                    <View style={styles.examRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.examTitle}>{fb.termName}</Text>
                        <Text style={styles.examSubject}>
                          Evaluated by {fb.staff?.fullName || 'Faculty'} &bull; {fb.periodType || 'TERM'}
                        </Text>
                      </View>
                      <Badge label={`${fb.rating || 5}/5 ★`} variant="info" size="sm" />
                    </View>

                    {(fb.attendanceRate !== null || fb.homeworkRate !== null || fb.examAverage !== null) && (
                      <View style={{ flexDirection: 'row', backgroundColor: '#F7F2EF', padding: 8, borderRadius: 8, marginTop: 8, justifyContent: 'space-around' }}>
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#8D6E63' }}>ATTENDANCE</Text>
                          <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#2D1E18' }}>{fb.attendanceRate !== null ? `${Number(fb.attendanceRate)}%` : 'N/A'}</Text>
                        </View>
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#8D6E63' }}>HOMEWORK</Text>
                          <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#2D1E18' }}>{fb.homeworkRate !== null ? `${Number(fb.homeworkRate)}%` : 'N/A'}</Text>
                        </View>
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#8D6E63' }}>TEST AVG</Text>
                          <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#2D1E18' }}>{fb.examAverage !== null ? `${Number(fb.examAverage)}%` : 'N/A'}</Text>
                        </View>
                      </View>
                    )}

                    <Text style={{ fontSize: 12, fontStyle: 'italic', color: '#2D1E18', marginTop: 8, backgroundColor: '#F7F2EF', padding: 8, borderRadius: 8 }}>
                      "{fb.remarks}"
                    </Text>

                    {fb.strengths ? (
                      <View style={{ marginTop: 6, padding: 6, backgroundColor: '#E8F5E9', borderRadius: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#2E7D32' }}>STRENGTHS: {fb.strengths}</Text>
                      </View>
                    ) : null}
                    {fb.improvements ? (
                      <View style={{ marginTop: 4, padding: 6, backgroundColor: '#FFF3E0', borderRadius: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#E65100' }}>GROWTH AREAS: {fb.improvements}</Text>
                      </View>
                    ) : null}
                    {fb.recommendations ? (
                      <View style={{ marginTop: 4, padding: 6, backgroundColor: '#E1F5FE', borderRadius: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#0277BD' }}>ACTIONS: {fb.recommendations}</Text>
                      </View>
                    ) : null}
                  </Card>
                ))
              )}
            </View>
          )}
        </ScrollView>
      )}

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
              placeholderTextColor="#64748b"
              value={submissionContent}
              onChangeText={setSubmissionContent}
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                onPress={() => setSubmittingHw(null)}
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
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Submit</Text>
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

      <NotificationModal
        visible={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        onUnreadCountChange={setUnreadNotifCount}
      />
      <MaterialViewerModal
        visible={!!previewMaterial}
        material={previewMaterial}
        onClose={() => setPreviewMaterial(null)}
      />
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
    fontSize: 13,
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
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarLarge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: themeTokens.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLargeText: {
    fontSize: 22,
    fontWeight: '900',
    color: themeTokens.colors.espresso,
  },
  profileDetails: {
    flex: 1,
  },
  studentName: {
    fontSize: 18,
    fontWeight: '800',
    color: themeTokens.colors.textPrimary,
  },
  studentRoll: {
    fontSize: 12,
    color: themeTokens.colors.textMuted,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  statBox: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    backgroundColor: themeTokens.colors.surface,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: themeTokens.colors.textMuted,
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: themeTokens.colors.textPrimary,
    marginVertical: 4,
  },
  statNote: {
    fontSize: 11,
    color: themeTokens.colors.taupe,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
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
  matRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  matIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: themeTokens.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matIcon: {
    fontSize: 20,
  },
  matInfo: {
    flex: 1,
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
  matDesc: {
    color: themeTokens.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  downloadBtn: {
    backgroundColor: themeTokens.colors.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
  },
  downloadBtnText: {
    color: themeTokens.colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  hwHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  hwTitle: {
    color: themeTokens.colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  hwSubject: {
    color: themeTokens.colors.primary,
    fontSize: 11,
    marginTop: 2,
  },
  hwDescription: {
    color: themeTokens.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  hwFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: themeTokens.colors.borderSubtle,
    paddingTop: 10,
  },
  hwDueDate: {
    color: themeTokens.colors.textSubtle,
    fontSize: 11,
  },
  submitHwBtn: {
    backgroundColor: themeTokens.colors.espresso,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  submitHwBtnText: {
    color: themeTokens.colors.textLight,
    fontSize: 12,
    fontWeight: '700',
  },
  examRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  examTitle: {
    color: themeTokens.colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  examSubject: {
    color: themeTokens.colors.primary,
    fontSize: 12,
    marginTop: 2,
  },
  examDateRow: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: themeTokens.colors.borderSubtle,
    paddingTop: 8,
  },
  examDateText: {
    color: themeTokens.colors.textSubtle,
    fontSize: 11,
  },
  feeCardTitle: {
    color: themeTokens.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  feeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  feeGridItem: {
    alignItems: 'center',
  },
  feeGridLabel: {
    color: themeTokens.colors.textMuted,
    fontSize: 11,
    marginBottom: 4,
  },
  feeGridVal: {
    color: themeTokens.colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
  },
  feeItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  feeItemTitle: {
    color: themeTokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  feeItemFreq: {
    color: themeTokens.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  feeItemBalanceRow: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: themeTokens.colors.borderSubtle,
    paddingTop: 8,
  },
  feeItemBalanceText: {
    color: themeTokens.colors.textSecondary,
    fontSize: 12,
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
  paymentMeta: {
    color: themeTokens.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  receiptNumberText: {
    color: themeTokens.colors.primary,
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  viewReceiptBtn: {
    backgroundColor: themeTokens.colors.espresso,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewReceiptBtnText: {
    color: themeTokens.colors.textLight,
    fontSize: 12,
    fontWeight: 'bold',
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
