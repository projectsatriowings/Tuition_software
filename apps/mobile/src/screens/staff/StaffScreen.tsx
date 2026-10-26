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
import { mobileApiFetch, generateIdempotencyKey } from '../../services/api';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { themeTokens } from '@tuition/shared';

export const StaffScreen: React.FC = () => {
  const { user } = useMobileAuth();

  const [activeTab, setActiveTab] = useState<'attendance' | 'batches' | 'homework' | 'messages'>('attendance');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Staff Data
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [homeworkList, setHomeworkList] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);

  // Attendance Check-in State
  const [selectedStudentForAtt, setSelectedStudentForAtt] = useState<any>(null);
  const [attStatus, setAttStatus] = useState<'PRESENT' | 'ABSENT' | 'LATE'>('PRESENT');
  const [attType, setAttType] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');
  const [attSubmitting, setAttSubmitting] = useState(false);
  const [qrScanInput, setQrScanInput] = useState('');
  const [showQrScanModal, setShowQrScanModal] = useState(false);

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

  const loadStudentsForBatch = async (batchId: string) => {
    try {
      const res = await mobileApiFetch(`/students?batchId=${batchId}`);
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
    loadStudentsForBatch(b.id);
  };

  const handleRecordAttendance = async () => {
    if (!selectedStudentForAtt) {
      Alert.alert('Notice', 'Please select a student first');
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
          isLate: attStatus === 'LATE',
          method: 'MANUAL',
        },
      });

      if (res.success) {
        Alert.alert(
          'Attendance Recorded',
          `${attType === 'CHECK_IN' ? 'Check-In' : 'Check-Out'} marked as ${attStatus} for ${selectedStudentForAtt.user?.fullName}. SMS outbox notification queued.`
        );
        setSelectedStudentForAtt(null);
      } else {
        Alert.alert('Error', res.error || 'Failed to record attendance');
      }
    } catch {
      Alert.alert('Error', 'Network connection issue');
    } finally {
      setAttSubmitting(false);
    }
  };

  const handleScanQr = async () => {
    if (!qrScanInput.trim()) {
      Alert.alert('Error', 'Please enter or scan student QR token');
      return;
    }

    setAttSubmitting(true);
    try {
      const res = await mobileApiFetch('/attendance/qr/scan', {
        method: 'POST',
        body: {
          qrToken: qrScanInput.trim(),
        },
      });

      if (res.success) {
        Alert.alert('Verified & Checked In', `Student attendance logged via cryptographic QR scan.`);
        setShowQrScanModal(false);
        setQrScanInput('');
      } else {
        Alert.alert('Invalid QR Token', res.error || 'Token expired or invalid signature.');
      }
    } catch {
      Alert.alert('Error', 'Failed to communicate with QR validation service.');
    } finally {
      setAttSubmitting(false);
    }
  };

  const handleCreateHomework = async () => {
    if (!hwTitle.trim() || !selectedBatch) {
      Alert.alert('Error', 'Please fill in homework title');
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
        Alert.alert('Success', 'Homework published to batch students.');
        setShowNewHwModal(false);
        setHwTitle('');
        setHwDesc('');
        fetchStaffData();
      } else {
        Alert.alert('Error', res.error || 'Could not publish homework.');
      }
    } catch {
      Alert.alert('Error', 'Server connection error.');
    } finally {
      setHwSubmitting(false);
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
                    🏫 {b.name} (Grade {b.grade})
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
          {/* TAB 1: ATTENDANCE & QR SCANNER */}
          {activeTab === 'attendance' && (
            <View>
              {/* QR Scanner Launch Card */}
              <Card highlighted>
                <View style={styles.scannerHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.scannerTitle}>📷 Rapid QR Attendance Scanner</Text>
                    <Text style={styles.scannerSub}>
                      Verify cryptographically signed student QR passes at classroom entry
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setShowQrScanModal(true)}
                  style={styles.launchScannerBtn}
                >
                  <Text style={styles.launchScannerBtnText}>Open QR Token Scanner</Text>
                </TouchableOpacity>
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
                        <Text style={styles.studentRoll}>Roll: {st.rollNumber}</Text>
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
                <Text style={styles.sectionTitle}>👨‍🎓 Enrolled Students</Text>
                <Text style={styles.sectionCount}>{students.length} in this batch</Text>
              </View>

              {students.map((s) => (
                <Card key={s.id}>
                  <View style={styles.studentCardRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.studentName}>{s.user?.fullName}</Text>
                      <Text style={styles.studentSub}>
                        Roll: {s.rollNumber} &bull; Email: {s.user?.email || 'N/A'}
                      </Text>
                      {s.user?.phone && (
                        <Text style={styles.phoneText}>📞 {s.user.phone}</Text>
                      )}
                    </View>
                    <Badge label={s.status || 'ACTIVE'} variant="success" size="sm" />
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

      {/* QR Scanner Modal */}
      <Modal visible={showQrScanModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Scan Student Attendance QR</Text>
            <Text style={styles.modalSub}>
              Enter or scan the cryptographic token from the student mobile app
            </Text>

            <TextInput
              style={styles.modalInput}
              multiline
              numberOfLines={3}
              placeholder="Paste cryptographically signed QR token or simulation payload..."
              placeholderTextColor="#64748b"
              value={qrScanInput}
              onChangeText={setQrScanInput}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                onPress={() => setShowQrScanModal(false)}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleScanQr}
                style={styles.modalSubmitBtn}
                disabled={attSubmitting}
              >
                {attSubmitting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Verify & Log</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
});
