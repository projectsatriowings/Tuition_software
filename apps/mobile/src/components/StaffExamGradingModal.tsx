import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { themeTokens } from '@tuition/shared';
import { mobileApiFetch } from '../services/api';
import { MobileButton, MobileInput, ProgressBar } from './ui';
import { Badge } from './Badge';
import { StudentAvatar } from './StudentAvatar';

export interface StaffExamGradingModalProps {
  exam: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

interface StudentGradeEntry {
  studentId: string;
  name: string;
  rollNumber?: string;
  admissionNumber?: string;
  marksObtained: string;
  isAbsent: boolean;
  remarks: string;
}

export const StaffExamGradingModal: React.FC<StaffExamGradingModalProps> = ({
  exam,
  isOpen,
  onClose,
  onUpdated,
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [examDetails, setExamDetails] = useState<any>(exam);
  const [roster, setRoster] = useState<StudentGradeEntry[]>([]);

  const maxMarks = examDetails?.totalMarks || 100;

  const loadEligibleStudents = useCallback(async () => {
    if (!exam?.id) return;
    setLoading(true);
    try {
      const res = await mobileApiFetch(`/exams/${exam.id}/eligible-students`);
      if (res.success && res.data) {
        if (res.data.exam) setExamDetails(res.data.exam);

        const rawStudents = res.data.students || [];
        const entries: StudentGradeEntry[] = rawStudents.map((s: any) => ({
          studentId: s.studentId || s.id,
          name: s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Student',
          rollNumber: s.rollNumber,
          admissionNumber: s.admissionNumber,
          marksObtained: s.currentMarks !== undefined && s.currentMarks !== null ? String(s.currentMarks) : '',
          isAbsent: !!s.isAbsent,
          remarks: s.remarks || '',
        }));
        setRoster(entries);
      } else {
        Alert.alert('Notice', res.error || 'Failed to load eligible students for this exam.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Unable to connect to exam server.');
    } finally {
      setLoading(false);
    }
  }, [exam?.id]);

  useEffect(() => {
    if (isOpen) {
      loadEligibleStudents();
    }
  }, [isOpen, loadEligibleStudents]);

  const handleUpdateMarks = (studentId: string, val: string) => {
    // Only allow numbers and decimal
    const sanitized = val.replace(/[^0-9.]/g, '');
    const num = parseFloat(sanitized);

    if (sanitized !== '' && !isNaN(num) && num > maxMarks) {
      Alert.alert('Invalid Marks', `Marks obtained cannot exceed maximum marks (${maxMarks}).`);
      return;
    }

    setRoster((prev) =>
      prev.map((item) =>
        item.studentId === studentId
          ? {
              ...item,
              marksObtained: sanitized,
              isAbsent: sanitized !== '' ? false : item.isAbsent,
            }
          : item
      )
    );
  };

  const handleToggleAbsent = (studentId: string) => {
    setRoster((prev) =>
      prev.map((item) =>
        item.studentId === studentId
          ? {
              ...item,
              isAbsent: !item.isAbsent,
              marksObtained: !item.isAbsent ? '0' : item.marksObtained,
            }
          : item
      )
    );
  };

  const handleUpdateRemarks = (studentId: string, remarks: string) => {
    setRoster((prev) =>
      prev.map((item) => (item.studentId === studentId ? { ...item, remarks } : item))
    );
  };

  const handleSaveMarks = async (isDraft = true) => {
    if (!exam?.id || roster.length === 0) return;

    // Filter students who have marks entered or are absent
    const entriesToSave = roster
      .filter((r) => r.isAbsent || r.marksObtained.trim() !== '')
      .map((r) => ({
        studentId: r.studentId,
        marksObtained: r.isAbsent ? 0 : parseFloat(r.marksObtained) || 0,
        isAbsent: r.isAbsent,
        remarks: r.remarks ? r.remarks.trim() : null,
      }));

    if (entriesToSave.length === 0) {
      Alert.alert('No Entries', 'Please enter marks or mark attendance for at least one student.');
      return;
    }

    setSaving(true);
    try {
      const res = await mobileApiFetch(`/exams/${exam.id}/marks`, {
        method: 'POST',
        body: JSON.stringify({
          marks: entriesToSave,
          isDraft,
        }),
      });

      if (res.success) {
        Alert.alert(
          'Saved Successfully',
          isDraft ? 'Marks draft has been saved successfully.' : 'Marks submitted successfully.'
        );
        onUpdated?.();
      } else {
        Alert.alert('Save Failed', res.error || 'Failed to record marks.');
      }
    } catch (e: any) {
      Alert.alert('Network Error', e.message || 'Could not save marks.');
    } finally {
      setSaving(false);
    }
  };

  const handlePublishResults = () => {
    const ungradedCount = roster.filter((r) => !r.isAbsent && r.marksObtained.trim() === '').length;

    let warningMsg = 'Publishing results will make grade cards and marks visible to students and parents.';
    if (ungradedCount > 0) {
      warningMsg = `${ungradedCount} student(s) do not have marks entered yet. ${warningMsg}`;
    }

    Alert.alert('Publish Exam Results?', warningMsg, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Publish Now',
        style: 'default',
        onPress: async () => {
          setPublishing(true);
          try {
            // First save any unsaved marks
            await handleSaveMarks(false);

            // Trigger publish results endpoint
            const pubRes = await mobileApiFetch(`/exams/${exam.id}/publish-results`, {
              method: 'PATCH',
            });

            if (pubRes.success) {
              Alert.alert('Results Published', 'Exam results are now officially visible to students and parents.');
              setExamDetails((prev: any) => ({ ...prev, isResultsPublished: true }));
              onUpdated?.();
            } else {
              Alert.alert('Publishing Notice', pubRes.error || 'Could not publish results.');
            }
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to publish results.');
          } finally {
            setPublishing(false);
          }
        },
      },
    ]);
  };

  if (!isOpen) return null;

  const filteredRoster = roster.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.admissionNumber && s.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.rollNumber && s.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const gradedCount = roster.filter((r) => r.isAbsent || r.marksObtained.trim() !== '').length;
  const totalCount = roster.length;
  const isResultsPublished = examDetails?.isResultsPublished;

  return (
    <Modal visible={isOpen} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {examDetails?.title || exam?.title || 'Exam Grading'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {examDetails?.batch?.name || 'Class Batch'} • {examDetails?.subject?.name || 'Curriculum'}
              </Text>
            </View>

            <View style={styles.statusBadgeWrapper}>
              <Badge
                label={isResultsPublished ? 'RESULTS PUBLISHED' : 'GRADING IN PROGRESS'}
                variant={isResultsPublished ? 'success' : 'warning'}
                size="sm"
              />
            </View>
          </View>

          {/* Quick Metrics Bar */}
          <View style={styles.metricsBar}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Max Marks</Text>
              <Text style={styles.metricVal}>{maxMarks}</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Graded</Text>
              <Text style={styles.metricVal}>
                {gradedCount} / {totalCount}
              </Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Passing</Text>
              <Text style={styles.metricVal}>{examDetails?.passingMarks || Math.round(maxMarks * 0.4)}</Text>
            </View>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search student by name or roll number..."
            placeholderTextColor={themeTokens.colors.textSubtle}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={themeTokens.colors.primary} />
            <Text style={styles.loadingText}>Loading enrolled student roster...</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.rosterContainer}>
            {filteredRoster.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📝</Text>
                <Text style={styles.emptyTitle}>No Students Found</Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery ? 'No students match your search filter.' : 'No active student enrollments for this exam batch.'}
                </Text>
              </View>
            ) : (
              filteredRoster.map((student, idx) => {
                const numMarks = parseFloat(student.marksObtained);
                const isPassed = !isNaN(numMarks) && numMarks >= (examDetails?.passingMarks || maxMarks * 0.4);
                const hasGrade = student.isAbsent || student.marksObtained.trim() !== '';

                return (
                  <View key={student.studentId || idx} style={styles.studentCard}>
                    {/* Top Row: Avatar & Student Details */}
                    <View style={styles.cardHeader}>
                      <View style={styles.studentInfoRow}>
                        <StudentAvatar name={student.name} size={42} />
                        <View style={styles.studentDetails}>
                          <Text style={styles.studentName} numberOfLines={1}>
                            {student.name}
                          </Text>
                          <Text style={styles.studentMeta}>
                            Roll: {student.rollNumber || 'N/A'} • Adm: {student.admissionNumber || 'N/A'}
                          </Text>
                        </View>
                      </View>

                      <View>
                        {student.isAbsent ? (
                          <Badge label="ABSENT" variant="danger" size="sm" />
                        ) : hasGrade ? (
                          <Badge
                            label={isPassed ? 'PASSED' : 'FAILED'}
                            variant={isPassed ? 'success' : 'warning'}
                            size="sm"
                          />
                        ) : (
                          <Badge label="UNGRADED" variant="neutral" size="sm" />
                        )}
                      </View>
                    </View>

                    {/* Middle Row: Marks Input & Absent Toggle */}
                    <View style={styles.marksRow}>
                      <View style={styles.marksInputBox}>
                        <Text style={styles.inputLabel}>Marks Obtained (out of {maxMarks})</Text>
                        <TextInput
                          style={[styles.marksInput, student.isAbsent && styles.marksInputDisabled]}
                          placeholder="0"
                          placeholderTextColor={themeTokens.colors.textSubtle}
                          keyboardType="numeric"
                          editable={!student.isAbsent}
                          value={student.marksObtained}
                          onChangeText={(val) => handleUpdateMarks(student.studentId, val)}
                        />
                      </View>

                      <TouchableOpacity
                        onPress={() => handleToggleAbsent(student.studentId)}
                        style={[styles.absentToggle, student.isAbsent && styles.absentToggleActive]}
                      >
                        <Text style={[styles.absentToggleText, student.isAbsent && styles.absentToggleTextActive]}>
                          {student.isAbsent ? '✓ Absent' : 'Mark Absent'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Remarks Input */}
                    <View style={styles.remarksBox}>
                      <TextInput
                        style={styles.remarksInput}
                        placeholder="Optional teacher remarks / comments..."
                        placeholderTextColor={themeTokens.colors.textSubtle}
                        value={student.remarks}
                        onChangeText={(val) => handleUpdateRemarks(student.studentId, val)}
                      />
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}

        {/* Action Footer */}
        {!loading && (
          <View style={styles.footer}>
            <MobileButton
              title="Save Draft"
              onPress={() => handleSaveMarks(true)}
              variant="secondary"
              size="md"
              loading={saving}
              style={styles.actionBtn}
            />

            <MobileButton
              title={isResultsPublished ? 'Update & Publish' : 'Publish Results'}
              onPress={handlePublishResults}
              variant="primary"
              size="md"
              loading={publishing}
              style={styles.actionBtn}
            />
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: themeTokens.colors.background,
  },
  header: {
    backgroundColor: themeTokens.colors.espresso,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: themeTokens.colors.cocoa,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: themeTokens.colors.cocoa,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: themeTokens.colors.textLight,
    fontSize: 16,
    fontWeight: '700',
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: themeTokens.typography.sizes.base,
    fontWeight: themeTokens.typography.weights.bold,
    color: themeTokens.colors.textLight,
  },
  headerSubtitle: {
    fontSize: themeTokens.typography.sizes.xs,
    color: themeTokens.colors.textLightMuted,
    marginTop: 2,
  },
  statusBadgeWrapper: {
    alignItems: 'flex-end',
  },
  metricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeTokens.colors.cocoa,
    borderRadius: themeTokens.radii.md,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    color: themeTokens.colors.textLightMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  metricVal: {
    fontSize: themeTokens.typography.sizes.base,
    fontWeight: '800',
    color: themeTokens.colors.textLight,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: themeTokens.colors.taupe,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: themeTokens.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: themeTokens.colors.border,
  },
  searchInput: {
    backgroundColor: themeTokens.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    borderRadius: themeTokens.radii.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: themeTokens.typography.sizes.sm,
    color: themeTokens.colors.textPrimary,
  },
  rosterContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  studentCard: {
    backgroundColor: themeTokens.colors.surface,
    borderRadius: themeTokens.radii.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    marginBottom: 12,
    shadowColor: '#3E2723',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  studentInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  studentDetails: {
    marginLeft: 12,
    flex: 1,
  },
  studentName: {
    fontSize: themeTokens.typography.sizes.base,
    fontWeight: '700',
    color: themeTokens.colors.textPrimary,
  },
  studentMeta: {
    fontSize: themeTokens.typography.sizes.xs,
    color: themeTokens.colors.textMuted,
    marginTop: 2,
  },
  marksRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginTop: 14,
  },
  marksInputBox: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    color: themeTokens.colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  marksInput: {
    backgroundColor: themeTokens.colors.surfaceMuted,
    borderWidth: 1.5,
    borderColor: themeTokens.colors.border,
    borderRadius: themeTokens.radii.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: '700',
    color: themeTokens.colors.textPrimary,
  },
  marksInputDisabled: {
    backgroundColor: themeTokens.colors.borderSubtle,
    color: themeTokens.colors.textSubtle,
  },
  absentToggle: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: themeTokens.radii.md,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    backgroundColor: themeTokens.colors.surface,
  },
  absentToggleActive: {
    backgroundColor: themeTokens.colors.errorBg,
    borderColor: themeTokens.colors.errorBorder,
  },
  absentToggleText: {
    fontSize: themeTokens.typography.sizes.xs,
    fontWeight: '700',
    color: themeTokens.colors.textMuted,
  },
  absentToggleTextActive: {
    color: themeTokens.colors.error,
  },
  remarksBox: {
    marginTop: 10,
  },
  remarksInput: {
    backgroundColor: themeTokens.colors.background,
    borderWidth: 1,
    borderColor: themeTokens.colors.borderSubtle,
    borderRadius: themeTokens.radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: themeTokens.typography.sizes.xs,
    color: themeTokens.colors.textPrimary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: themeTokens.colors.surface,
    borderTopWidth: 1,
    borderTopColor: themeTokens.colors.border,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 14,
    fontSize: themeTokens.typography.sizes.sm,
    color: themeTokens.colors.textMuted,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyTitle: {
    fontSize: themeTokens.typography.sizes.base,
    fontWeight: '700',
    color: themeTokens.colors.textPrimary,
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: themeTokens.typography.sizes.xs,
    color: themeTokens.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
});

