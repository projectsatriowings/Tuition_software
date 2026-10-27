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
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { StudentAvatar } from '../../components/StudentAvatar';
import { StudentDetailsModal } from '../../components/StudentDetailsModal';
import { AdmitStudentModal } from '../../components/AdmitStudentModal';
import { themeTokens, matchStudentVoice, EnrolledStudentCandidate } from '@tuition/shared';

export const StaffScreen: React.FC = () => {
  const { user } = useMobileAuth();
  const { showToast } = useMobileToast();

  const [activeTab, setActiveTab] = useState<'attendance' | 'batches' | 'homework' | 'messages'>('attendance');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Staff Data
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [homeworkList, setHomeworkList] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);

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

  const fetchStaffData = useCallback(async () => {
    try {
      // 1. Fetch Batches
      const batchRes = await mobileApiFetch('/academics/batches');
      if (batchRes.success && batchRes.data) {
        const batchList = Array.isArray(batchRes.data) ? batchRes.data : batchRes.data.batches || [];
        setBatches(batchList);
        if (batchList.length > 0 && !selectedBatch) {
          setSelectedBatch(batchList[0]);
          loadStudentsForBatch(batchList[0].id);
        } else if (selectedBatch) {
          loadStudentsForBatch(selectedBatch.id);
        }
      }

      // 2. Fetch Homework
      const hwRes = await mobileApiFetch('/homework');
      if (hwRes.success && hwRes.data) {
        setHomeworkList(Array.isArray(hwRes.data) ? hwRes.data : hwRes.data.homework || []);
      }

      // 3. Fetch Conversations
      const convRes = await mobileApiFetch('/messaging/conversations');
      if (convRes.success && convRes.data) {
        setConversations(Array.isArray(convRes.data) ? convRes.data : convRes.data.conversations || []);
      }
    } catch (e) {
      console.warn('Error loading staff mobile data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedBatch]);

  const loadStudentsForBatch = async (batchId: string, subjectId?: string) => {
    try {
      const q = new URLSearchParams({ batchId, ...(subjectId ? { subjectId } : {}) });
      const res = await mobileApiFetch(`/students?${q.toString()}`);
      if (res.success && res.data) {
        setStudents(Array.isArray(res.data) ? res.data : res.data.students || []);
      }
    } catch (e) {
      console.warn('Error loading students for batch:', e);
    }
  };

  useEffect(() => {
    fetchStaffData();
  }, [fetchStaffData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStaffData();
  };

  const handleSelectBatch = (b: any) => {
    setSelectedBatch(b);
    setSelectedSubject(null);
    loadStudentsForBatch(b.id);
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
      const idempotencyKey = generateIdempotencyKey('VOICE');
      const res = await mobileApiFetch('/attendance/check-in', {
        method: 'POST',
        idempotencyKey,
        body: {
          studentId: student.id,
          batchId: selectedBatch?.id,
          subjectId: selectedSubject?.id || undefined,
          method: 'VOICE_CONFIRMED',
        },
      });

      if (res.success) {
        showToast(
          `Voice Check-In confirmed for ${student.user?.fullName || student.firstName}. Notification queued.`,
          'success'
        );
        setPendingVoiceCandidate(null);
        setVoiceDisambiguation([]);
        setVoiceQuery('');
        setIsVoiceListening(false);
      } else {
        showToast(res.error || 'Failed to record attendance', 'error');
      }
    } catch {
      showToast('Network connection issue', 'error');
    } finally {
      setVoiceSubmitting(false);
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
          dueDate: hwDueDate ? new Date(hwDueDate).toISOString() : new Date(Date.now() + 86400000 * 3).toISOString(),
        },
      });

      if (res.success) {
        showToast('Homework published to batch students.', 'success');
        setShowNewHwModal(false);
        setHwTitle('');
        setHwDesc('');
        fetchStaffData();
      } else {
        showToast(res.error || 'Could not publish homework.', 'error');
      }
    } catch {
      showToast('Server connection error.', 'error');
    } finally {
      setHwSubmitting(false);
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
          reason: `Status changed to ${statusConfirm.newStatus} by faculty staff`,
        },
      });
      if (res.success) {
        showToast(
          `${statusConfirm.student.firstName || statusConfirm.student.user?.fullName || 'Student'} marked as ${statusConfirm.newStatus.replace('_', ' ')}.`,
          'success'
        );
        setStatusConfirm({ isOpen: false, student: null, newStatus: '', loading: false });
        fetchStaffData();
      } else {
        showToast(res.error || 'Failed to update student status', 'error');
        setStatusConfirm((prev) => ({ ...prev, loading: false }));
      }
    } catch (e: any) {
      showToast(e.message || 'Network error', 'error');
      setStatusConfirm((prev) => ({ ...prev, loading: false }));
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Faculty & Staff Portal"
        subtitle={user?.fullName || 'Faculty'}
        onRefresh={onRefresh}
      />

      {/* Batch Selector Bar */}
      {batches.length > 0 && (
        <View style={styles.batchBar}>
          <Text style={styles.batchLabel}>ASSIGNED BATCH:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.batchChips}>
            {batches.map((b) => {
              const isSelected = selectedBatch?.id === b.id;
              return (
                <TouchableOpacity
                  key={b.id}
                  onPress={() => handleSelectBatch(b)}
                  style={[styles.batchChip, isSelected && styles.batchChipActive]}
                >
                  <Text style={[styles.batchChipText, isSelected && styles.batchChipTextActive]}>
                    🏫 {b.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {selectedBatch?.batchSubjects && selectedBatch.batchSubjects.length > 0 && (
        <View style={[styles.batchBar, { paddingTop: 0 }]}>
          <Text style={styles.batchLabel}>ASSIGNED SUBJECT:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.batchChips}>
            <TouchableOpacity
              onPress={() => {
                setSelectedSubject(null);
                loadStudentsForBatch(selectedBatch.id);
              }}
              style={[styles.batchChip, !selectedSubject && styles.batchChipActive]}
            >
              <Text style={[styles.batchChipText, !selectedSubject && styles.batchChipTextActive]}>
                All Subjects
              </Text>
            </TouchableOpacity>
            {selectedBatch.batchSubjects.map((bs: any) => {
              const isSelected = selectedSubject?.id === bs.subject.id;
              return (
                <TouchableOpacity
                  key={bs.subject.id}
                  onPress={() => {
                    setSelectedSubject(bs.subject);
                    loadStudentsForBatch(selectedBatch.id, bs.subject.id);
                  }}
                  style={[styles.batchChip, isSelected && styles.batchChipActive]}
                >
                  <Text style={[styles.batchChipText, isSelected && styles.batchChipTextActive]}>
                    📖 {bs.subject.name}
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
          onPress={() => setActiveTab('attendance')}
          style={[styles.tabItem, activeTab === 'attendance' && styles.activeTabItem]}
        >
          <Text style={[styles.tabText, activeTab === 'attendance' && styles.activeTabText]}>
            Attendance
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('batches')}
          style={[styles.tabItem, activeTab === 'batches' && styles.activeTabItem]}
        >
          <Text style={[styles.tabText, activeTab === 'batches' && styles.activeTabText]}>
            Students ({students.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('homework')}
          style={[styles.tabItem, activeTab === 'homework' && styles.activeTabItem]}
        >
          <Text style={[styles.tabText, activeTab === 'homework' && styles.activeTabText]}>
            Homework
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('messages')}
          style={[styles.tabItem, activeTab === 'messages' && styles.activeTabItem]}
        >
          <Text style={[styles.tabText, activeTab === 'messages' && styles.activeTabText]}>
            Parent Chat
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading faculty dashboard...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
        >
          {/* TAB 1: VOICE-BASED ATTENDANCE & MANUAL FALLBACK */}
          {activeTab === 'attendance' && (
            <View>
              {/* Voice-Based Attendance Assistant Card */}
              <Card highlighted>
                <View style={styles.voiceHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.scannerTitle}>🎙️ Voice-Based Attendance</Text>
                    <Text style={styles.scannerSub}>
                      Call out student name or dictate via keyboard microphone
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setIsVoiceListening(!isVoiceListening)}
                    style={[
                      styles.voiceListenToggleBtn,
                      isVoiceListening && styles.voiceListenToggleBtnActive,
                    ]}
                  >
                    <Text style={styles.voiceListenToggleBtnText}>
                      {isVoiceListening ? '⏹ Stop Listening' : '🎙️ Start Listening'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Expo Go vs Dev Build info note */}
                <View style={styles.devBuildNoteBox}>
                  <Text style={styles.devBuildNoteText}>
                    💡 Continuous background microphone listening requires an Android Development Client (npx expo run:android). On Expo Go, speak using keyboard voice dictation or type student name below.
                  </Text>
                </View>

                {/* Spoken Text / Voice Search Input */}
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.voiceInputLabel}>Recognized Speech / Student Name:</Text>
                  <TextInput
                    style={styles.voiceTextInput}
                    placeholder="e.g. 'Aarav Sharma' or 'Kabir present'..."
                    placeholderTextColor="#A1887F"
                    value={voiceQuery}
                    onChangeText={handleVoiceQueryChange}
                    returnKeyType="search"
                  />
                </View>

                {/* Exactly 1 Candidate Matched -> Confirmation Prompt */}
                {pendingVoiceCandidate && (
                  <View style={styles.voiceCandidateConfirmCard}>
                    <View style={styles.voiceCandidateHeader}>
                      <View style={styles.voiceInitialCircle}>
                        <Text style={styles.voiceInitialText}>
                          {(pendingVoiceCandidate.firstName || pendingVoiceCandidate.user?.fullName || '?')[0]}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.voiceCandidateName}>
                          {pendingVoiceCandidate.user?.fullName ||
                            `${pendingVoiceCandidate.firstName} ${pendingVoiceCandidate.lastName}`}
                        </Text>
                        <Text style={styles.voiceCandidateRoll}>
                          Adm: {pendingVoiceCandidate.admissionNumber} • Batch: {selectedBatch?.name}
                        </Text>
                      </View>
                      <Badge label="MATCHED" variant="success" size="sm" />
                    </View>

                    <View style={styles.voiceConfirmActionRow}>
                      <TouchableOpacity
                        onPress={() => {
                          setPendingVoiceCandidate(null);
                          setVoiceQuery('');
                        }}
                        style={styles.voiceCancelBtn}
                      >
                        <Text style={styles.voiceCancelBtnText}>Skip</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleConfirmVoiceAttendance(pendingVoiceCandidate)}
                        disabled={voiceSubmitting}
                        style={styles.voiceConfirmBtn}
                      >
                        {voiceSubmitting ? (
                          <ActivityIndicator color="#ffffff" size="small" />
                        ) : (
                          <Text style={styles.voiceConfirmBtnText}>
                            Confirm Check-In ➔
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Multiple Candidates -> Disambiguation Chips */}
                {voiceDisambiguation.length > 0 && !pendingVoiceCandidate && (
                  <View style={styles.voiceDisambiguationBox}>
                    <Text style={styles.voiceDisambiguationTitle}>
                      Multiple students match '{voiceQuery}'. Tap intended student:
                    </Text>
                    <View style={styles.voiceDisambiguationList}>
                      {voiceDisambiguation.map((candidate) => (
                        <TouchableOpacity
                          key={candidate.id}
                          onPress={() => setPendingVoiceCandidate(candidate)}
                          style={styles.voiceDisambigChip}
                        >
                          <Text style={styles.voiceDisambigChipText}>
                            {candidate.user?.fullName || `${candidate.firstName} ${candidate.lastName}`} ({candidate.admissionNumber})
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </Card>

              {/* Manual Batch Attendance Marker */}
              <View style={[styles.sectionHeader, { marginTop: 12 }]}>
                <Text style={styles.sectionTitle}>
                  ✏️ Mark Attendance — {selectedBatch?.name || 'Batch'}
                </Text>
                <Text style={styles.sectionCount}>{students.length} students</Text>
              </View>

              {/* Status Controls */}
              <Card>
                <Text style={styles.controlHeading}>SELECT ACTION & STATUS:</Text>
                <View style={styles.controlsRow}>
                  <View style={styles.pillGroup}>
                    <TouchableOpacity
                      onPress={() => setAttType('CHECK_IN')}
                      style={[styles.pillBtn, attType === 'CHECK_IN' && styles.pillBtnActive]}
                    >
                      <Text style={[styles.pillBtnText, attType === 'CHECK_IN' && styles.pillBtnTextActive]}>
                        Check-In
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setAttType('CHECK_OUT')}
                      style={[styles.pillBtn, attType === 'CHECK_OUT' && styles.pillBtnActive]}
                    >
                      <Text style={[styles.pillBtnText, attType === 'CHECK_OUT' && styles.pillBtnTextActive]}>
                        Check-Out
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.pillGroup}>
                    <TouchableOpacity
                      onPress={() => setAttStatus('PRESENT')}
                      style={[styles.statusPill, attStatus === 'PRESENT' && styles.presentPill]}
                    >
                      <Text style={[styles.statusPillText, attStatus === 'PRESENT' && styles.statusTextActive]}>
                        Present
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setAttStatus('ABSENT')}
                      style={[styles.statusPill, attStatus === 'ABSENT' && styles.absentPill]}
                    >
                      <Text style={[styles.statusPillText, attStatus === 'ABSENT' && styles.statusTextActive]}>
                        Absent
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setAttStatus('LATE')}
                      style={[styles.statusPill, attStatus === 'LATE' && styles.latePill]}
                    >
                      <Text style={[styles.statusPillText, attStatus === 'LATE' && styles.statusTextActive]}>
                        Late
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {selectedStudentForAtt && (
                  <View style={styles.confirmBox}>
                    <Text style={styles.confirmTarget}>
                      Selected: <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>{selectedStudentForAtt.user?.fullName}</Text>
                    </Text>
                    <TouchableOpacity
                      onPress={handleRecordAttendance}
                      style={styles.submitAttBtn}
                      disabled={attSubmitting}
                    >
                      {attSubmitting ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <Text style={styles.submitAttBtnText}>Confirm & Log Attendance</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </Card>

              {/* Student List for Attendance Selection */}
              {students.map((st) => {
                const isSelected = selectedStudentForAtt?.id === st.id;
                return (
                  <Card
                    key={st.id}
                    onPress={() => setSelectedStudentForAtt(st)}
                    highlighted={isSelected}
                  >
                    <View style={styles.studentAttRow}>
                      <View style={styles.studentInitialCircle}>
                        <Text style={styles.studentInitial}>{st.user?.fullName?.[0] || 'S'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.studentName}>{st.user?.fullName}</Text>
                        <Text style={styles.studentRoll}>Adm: {st.admissionNumber || '—'}</Text>
                      </View>
                      <Badge
                        label={isSelected ? 'SELECTED' : 'TAP TO SELECT'}
                        variant={isSelected ? 'indigo' : 'neutral'}
                        size="sm"
                      />
                    </View>
                  </Card>
                );
              })}
            </View>
          )}

          {/* TAB 2: STUDENTS DIRECTORY */}
          {activeTab === 'batches' && (
            <View>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>👨‍🎓 Enrolled Students</Text>
                  <Text style={styles.sectionCount}>{students.length} in this batch</Text>
                </View>
                <TouchableOpacity
                  style={styles.admitStudentBtn}
                  onPress={() => setShowAdmitModal(true)}
                >
                  <Text style={styles.admitStudentBtnText}>+ Admit Student</Text>
                </TouchableOpacity>
              </View>

              {students.map((s) => (
                <Card key={s.id} onPress={() => setSelectedStudentId(s.id)}>
                  <View style={styles.studentCardRow}>
                    <StudentAvatar studentId={s.id} photoUrl={s.photoUrl} name={s.user?.fullName || `${s.firstName} ${s.lastName}`} size={38} style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.studentName}>{s.user?.fullName || `${s.firstName} ${s.lastName}`}</Text>
                      <Text style={styles.studentSub}>
                        Adm: {s.admissionNumber || '—'}
                      </Text>
                      {s.phone && (
                        <Text style={styles.phoneText}>📞 {s.phone}</Text>
                      )}
                    </View>
                    <Badge
                      label={s.status || 'ACTIVE'}
                      variant={s.status === 'ACTIVE' ? 'success' : s.status === 'PASSED_OUT' ? 'indigo' : 'neutral'}
                      size="sm"
                    />
                  </View>

                  {/* Lifecycle Action Buttons */}
                  <View style={styles.actionRowContainer}>
                    <TouchableOpacity
                      style={styles.cardDetailsHint}
                      onPress={() => setSelectedStudentId(s.id)}
                    >
                      <Text style={styles.cardDetailsHintText}>Tap for Full Details ➔</Text>
                    </TouchableOpacity>

                    <View style={styles.actionBtnGroup}>
                      {s.status === 'ACTIVE' ? (
                        <>
                          <TouchableOpacity
                            style={styles.actionBtnPass}
                            onPress={() => handleOpenStatusConfirm(s, 'PASSED_OUT')}
                          >
                            <Text style={styles.actionBtnPassText}>Mark Passed</Text>
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
              ))}
            </View>
          )}

          {/* TAB 3: HOMEWORK MANAGEMENT */}
          {activeTab === 'homework' && (
            <View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>📝 Homework Assignments</Text>
                <TouchableOpacity
                  onPress={() => setShowNewHwModal(true)}
                  style={styles.addHwBtn}
                >
                  <Text style={styles.addHwBtnText}>+ Assign Homework</Text>
                </TouchableOpacity>
              </View>

              {homeworkList.map((hw) => (
                <Card key={hw.id}>
                  <View style={styles.hwStaffRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.hwTitle}>{hw.title}</Text>
                      <Text style={styles.hwBatchName}>
                        Batch: {hw.batch?.name || 'Class'} &bull; Subject: {hw.subject?.name || 'General'}
                      </Text>
                    </View>
                    <Badge
                      label={`${hw.submissions?.length || 0} Submissions`}
                      variant="indigo"
                      size="sm"
                    />
                  </View>
                  <Text style={styles.hwDesc}>{hw.description}</Text>
                </Card>
              ))}
            </View>
          )}

          {/* TAB 4: PARENT CHAT */}
          {activeTab === 'messages' && (
            <View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>💬 Parent Conversations</Text>
              </View>

              {conversations.length === 0 ? (
                <Card><Text style={styles.emptyText}>No parent conversation threads.</Text></Card>
              ) : (
                conversations.map((c) => (
                  <Card key={c.id}>
                    <Text style={styles.convTitle}>{c.title || 'Parent Message'}</Text>
                    <Text style={styles.convSub}>Authorized parent-staff communication thread</Text>
                  </Card>
                ))
              )}
            </View>
          )}
        </ScrollView>
      )}


      {/* New Homework Modal */}
      <Modal visible={showNewHwModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Publish Homework</Text>
            <Text style={styles.modalSub}>Batch: {selectedBatch?.name || 'Selected'}</Text>

            <TextInput
              style={styles.singleLineInput}
              placeholder="Homework Title (e.g. Chapter 4 Practice Problems)"
              placeholderTextColor="#64748b"
              value={hwTitle}
              onChangeText={setHwTitle}
            />

            <TextInput
              style={[styles.modalInput, { marginTop: 10 }]}
              multiline
              numberOfLines={4}
              placeholder="Description & instructions for students..."
              placeholderTextColor="#64748b"
              value={hwDesc}
              onChangeText={setHwDesc}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeTokens.colors.background,
  },
  batchBar: {
    backgroundColor: themeTokens.colors.surfaceMuted,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: themeTokens.colors.border,
  },
  batchLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: themeTokens.colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  batchChips: {
    gap: 8,
  },
  batchChip: {
    backgroundColor: themeTokens.colors.surface,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
  },
  batchChipActive: {
    backgroundColor: themeTokens.colors.espresso,
    borderColor: themeTokens.colors.espresso,
  },
  batchChipText: {
    color: themeTokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  batchChipTextActive: {
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
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  scannerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: themeTokens.colors.textPrimary,
  },
  scannerSub: {
    fontSize: 12,
    color: themeTokens.colors.textMuted,
    marginTop: 2,
  },
  launchScannerBtn: {
    backgroundColor: themeTokens.colors.espresso,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  launchScannerBtnText: {
    color: themeTokens.colors.textLight,
    fontWeight: 'bold',
    fontSize: 14,
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
  controlHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: themeTokens.colors.textMuted,
    marginBottom: 8,
  },
  controlsRow: {
    gap: 10,
  },
  pillGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  pillBtn: {
    backgroundColor: themeTokens.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  pillBtnActive: {
    backgroundColor: themeTokens.colors.espresso,
    borderColor: themeTokens.colors.espresso,
  },
  pillBtnText: {
    color: themeTokens.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  pillBtnTextActive: {
    color: themeTokens.colors.textLight,
    fontWeight: 'bold',
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: themeTokens.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
  },
  presentPill: {
    backgroundColor: themeTokens.colors.successBg,
    borderColor: themeTokens.colors.successBorder,
  },
  absentPill: {
    backgroundColor: themeTokens.colors.errorBg,
    borderColor: themeTokens.colors.errorBorder,
  },
  latePill: {
    backgroundColor: themeTokens.colors.warningBg,
    borderColor: themeTokens.colors.warningBorder,
  },
  statusPillText: {
    color: themeTokens.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  statusTextActive: {
    fontWeight: 'bold',
  },
  confirmBox: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: themeTokens.colors.borderSubtle,
  },
  confirmTarget: {
    color: themeTokens.colors.textSecondary,
    fontSize: 12,
    marginBottom: 8,
  },
  submitAttBtn: {
    backgroundColor: themeTokens.colors.espresso,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitAttBtnText: {
    color: themeTokens.colors.textLight,
    fontWeight: 'bold',
    fontSize: 13,
  },
  studentAttRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  studentInitialCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: themeTokens.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentInitial: {
    color: themeTokens.colors.primary,
    fontWeight: 'bold',
  },
  studentName: {
    color: themeTokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  studentRoll: {
    color: themeTokens.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  studentCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  studentSub: {
    color: themeTokens.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  phoneText: {
    color: themeTokens.colors.textSubtle,
    fontSize: 11,
    marginTop: 4,
  },
  addHwBtn: {
    backgroundColor: themeTokens.colors.espresso,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addHwBtnText: {
    color: themeTokens.colors.textLight,
    fontSize: 11,
    fontWeight: 'bold',
  },
  hwStaffRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  hwTitle: {
    color: themeTokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  hwBatchName: {
    color: themeTokens.colors.primary,
    fontSize: 11,
    marginTop: 2,
  },
  hwDesc: {
    color: themeTokens.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
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
  emptyText: {
    color: themeTokens.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 10,
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
  singleLineInput: {
    backgroundColor: themeTokens.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: themeTokens.colors.textPrimary,
    fontSize: 13,
  },
  modalInput: {
    backgroundColor: themeTokens.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    borderRadius: 8,
    padding: 12,
    color: themeTokens.colors.textPrimary,
    textAlignVertical: 'top',
    height: 90,
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
  voiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  voiceListenToggleBtn: {
    backgroundColor: themeTokens.colors.espresso,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  voiceListenToggleBtnActive: {
    backgroundColor: '#991B1B',
  },
  voiceListenToggleBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  devBuildNoteBox: {
    backgroundColor: '#FAF7F2',
    borderWidth: 1,
    borderColor: '#D7CCC8',
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  devBuildNoteText: {
    fontSize: 10,
    color: '#6D4C41',
    lineHeight: 14,
  },
  voiceInputLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#4E342E',
    marginBottom: 4,
  },
  voiceTextInput: {
    backgroundColor: '#FDFBF7',
    borderWidth: 1,
    borderColor: '#D7CCC8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: '#2D1E18',
  },
  voiceCandidateConfirmCard: {
    backgroundColor: '#FAF7F2',
    borderWidth: 2,
    borderColor: '#4E342E',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  voiceCandidateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  voiceInitialCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#4E342E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceInitialText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  voiceCandidateName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2D1E18',
  },
  voiceCandidateRoll: {
    fontSize: 10,
    color: '#6D4C41',
    marginTop: 1,
  },
  voiceConfirmActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#D7CCC8',
  },
  voiceCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  voiceCancelBtnText: {
    color: '#6D4C41',
    fontSize: 11,
    fontWeight: '600',
  },
  voiceConfirmBtn: {
    backgroundColor: '#047857',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  voiceConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  voiceDisambiguationBox: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  voiceDisambiguationTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#78350F',
    marginBottom: 6,
  },
  voiceDisambiguationList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  voiceDisambigChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  voiceDisambigChipText: {
    fontSize: 11,
    color: '#78350F',
    fontWeight: '600',
  },
});
