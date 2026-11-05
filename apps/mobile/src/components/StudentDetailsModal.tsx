import { themeTokens } from '@tuition/shared';
import { X, AlertCircle, RefreshCw } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { api } from '../services/api';
import { useMobileToast } from '../context/ToastContext';
import { useMobileAuth } from '../context/AuthContext';
import { StudentAvatar } from './StudentAvatar';

interface StudentDetailsModalProps {
  visible: boolean;
  studentId: string | null;
  onClose: () => void;
  onStudentUpdated?: () => void;
}

export const StudentDetailsModal: React.FC<StudentDetailsModalProps> = ({
  visible,
  studentId,
  onClose,
  onStudentUpdated,
}) => {
  const { showToast } = useMobileToast();
  const { user } = useMobileAuth();
  const isAdmin = user?.role === 'ACADEMIC_ADMIN' || user?.role === 'SUPER_ADMIN';
  const [activeTab, setActiveTab] = useState<'profile' | 'academics'>('profile');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [details, setDetails] = useState<any>(null);

  const fetchDetails = async () => {
    if (!studentId) return;
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await api.get(`/students/${studentId}`);
      if (res.data?.success && res.data?.data) {
        // Backend returns { success: true, data: { student: formattedStudent } }
        const raw = res.data.data;
        const studentRecord = raw?.student || raw;
        setDetails(studentRecord);
      } else {
        const err = res.data?.error || 'Student record could not be loaded';
        setErrorMessage(err);
        showToast(err, 'error');
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to load student details';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && studentId) {
      setActiveTab('profile');
      fetchDetails();
    } else {
      setDetails(null);
      setErrorMessage(null);
    }
  }, [visible, studentId]);

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

  if (!visible) return null;

  const studentName = details
    ? (details.user?.fullName || `${details.firstName || ''} ${details.lastName || ''}`.trim() || 'Student')
    : 'Student Profile';

  const admissionNumber = details?.admissionNumber || details?.rollNumber || 'Not available';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.sheetTitle} numberOfLines={1}>
                {loading && !details ? 'Loading Profile...' : studentName}
              </Text>
              <Text style={styles.sheetSub}>
                Admission No: {admissionNumber}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close profile modal">
              <X size={18} color={themeTokens.colors.textLight} />
            </TouchableOpacity>
          </View>

          {/* Navigation Tabs */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'profile' && styles.tabItemActive]}
              onPress={() => setActiveTab('profile')}
            >
              <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>
                Profile
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'academics' && styles.tabItemActive]}
              onPress={() => setActiveTab('academics')}
            >
              <Text style={[styles.tabText, activeTab === 'academics' && styles.tabTextActive]}>
                Academic & Attendance
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="large" color="#4E342E" />
              <Text style={styles.loadingText}>Loading complete student record...</Text>
            </View>
          ) : errorMessage || !details ? (
            <View style={styles.loaderBox}>
              <AlertCircle size={36} color="#DC2626" />
              <Text style={styles.errorTitle}>Unable to load student profile</Text>
              <Text style={styles.errorSub}>{errorMessage || 'Record not found in this institute.'}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={fetchDetails}>
                <RefreshCw size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView style={styles.scrollContent} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <View style={styles.sectionContainer}>
                  {/* Photo & Identity Hero Card */}
                  <View style={styles.avatarCard}>
                    <StudentAvatar
                      studentId={details.id}
                      photoUrl={details.photoUrl}
                      name={studentName}
                      size={64}
                      style={styles.avatarImage}
                    />
                    <View style={styles.avatarMeta}>
                      <Text style={styles.avatarName} numberOfLines={1}>
                        {studentName}
                      </Text>
                      <Text style={styles.avatarSub}>Adm: {admissionNumber}</Text>
                      {details.status && (
                        <View
                          style={[
                            styles.badge,
                            details.status === 'ACTIVE'
                              ? styles.badgeActive
                              : details.status === 'PASSED_OUT'
                              ? styles.badgeBlue
                              : styles.badgeInactive,
                            { alignSelf: 'flex-start', marginTop: 4 },
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgeText,
                              details.status === 'ACTIVE'
                                ? styles.badgeTextActive
                                : details.status === 'PASSED_OUT'
                                ? styles.badgeTextBlue
                                : styles.badgeTextInactive,
                            ]}
                          >
                            {details.status.replace('_', ' ')}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* 1. Enrollment & Identity */}
                  <View style={styles.infoCard}>
                    <Text style={styles.cardHeader}>Enrollment & Identity</Text>
                    <View style={styles.rowItem}>
                      <Text style={styles.rowLabel}>Admission Number</Text>
                      <Text style={styles.rowValueHighlight}>{details.admissionNumber || 'Not available'}</Text>
                    </View>
                    {details.rollNumber && (
                      <View style={styles.rowItem}>
                        <Text style={styles.rowLabel}>Roll Number</Text>
                        <Text style={styles.rowValueHighlight}>{details.rollNumber}</Text>
                      </View>
                    )}
                    <View style={styles.rowItem}>
                      <Text style={styles.rowLabel}>Joined Date (Admission)</Text>
                      <Text style={styles.rowValue}>
                        {formatKolkataTime(details.admissionDate || details.createdAt)}
                      </Text>
                    </View>
                    <View style={[styles.rowItem, styles.rowHighlight]}>
                      <Text style={[styles.rowLabel, { fontWeight: '700', color: '#4E342E' }]}>
                        Student Created Date & Time
                      </Text>
                      <Text style={styles.rowValueHighlight}>
                        {formatKolkataTime(details.createdAt)}
                      </Text>
                    </View>
                    <View style={styles.rowItem}>
                      <Text style={styles.rowLabel}>Created By (Staff)</Text>
                      <Text style={styles.rowValue}>
                        {details.createdByUser
                          ? `${details.createdByUser.fullName} (${(details.createdByUser.role || 'Staff').replace('_', ' ')})`
                          : 'Academic Admin / System'}
                      </Text>
                    </View>
                    <View style={styles.rowItem}>
                      <Text style={styles.rowLabel}>Status</Text>
                      <Text
                        style={[
                          styles.badge,
                          details.status === 'ACTIVE'
                            ? styles.badgeActive
                            : details.status === 'PASSED_OUT'
                            ? styles.badgeBlue
                            : styles.badgeInactive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            details.status === 'ACTIVE'
                              ? styles.badgeTextActive
                              : details.status === 'PASSED_OUT'
                              ? styles.badgeTextBlue
                              : styles.badgeTextInactive,
                          ]}
                        >
                          {details.status ? details.status.replace('_', ' ') : 'ACTIVE'}
                        </Text>
                      </Text>
                    </View>
                    <View style={styles.rowItem}>
                      <Text style={styles.rowLabel}>Current Batch</Text>
                      <Text style={styles.rowValue}>
                        {details.enrollments?.[0]?.batch?.name || details.batch?.name || 'Unassigned'}
                      </Text>
                    </View>

                    {/* Active Enrolled Batches / Subjects */}
                    {details.enrollments && details.enrollments.length > 0 && (
                      <View style={styles.enrollmentBlock}>
                        <Text style={[styles.rowLabel, { fontWeight: '700', marginBottom: 6, color: '#4E342E' }]}>
                          Allocated Curriculum & Subjects
                        </Text>
                        {details.enrollments.map((enr: any, idx: number) => (
                          <View key={enr.id || idx} style={styles.enrollmentItemRow}>
                            <Text style={styles.enrollmentBatchText}>
                              {enr.batch?.name || 'Assigned Section'}
                            </Text>
                            <Text style={styles.enrollmentSubText}>
                              {enr.subject?.name || 'Core Curriculum'}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* 2. Personal Details */}
                  <View style={styles.infoCard}>
                    <Text style={styles.cardHeader}>Personal Details</Text>
                    <View style={styles.rowItem}>
                      <Text style={styles.rowLabel}>Student Phone</Text>
                      <Text style={styles.rowValue}>
                        {details.phone || details.user?.phone || 'Not provided'}
                      </Text>
                    </View>
                    <View style={styles.rowItem}>
                      <Text style={styles.rowLabel}>Student Email</Text>
                      <Text style={styles.rowValue}>
                        {details.user?.email || 'Not provided'}
                      </Text>
                    </View>
                    <View style={styles.rowItem}>
                      <Text style={styles.rowLabel}>Gender</Text>
                      <Text style={styles.rowValue}>
                        {details.gender ? details.gender.charAt(0).toUpperCase() + details.gender.slice(1).toLowerCase() : 'Not provided'}
                      </Text>
                    </View>
                    <View style={styles.rowItem}>
                      <Text style={styles.rowLabel}>Date of Birth</Text>
                      <Text style={styles.rowValue}>
                        {details.dob
                          ? new Date(details.dob).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Not provided'}
                      </Text>
                    </View>
                    <View style={styles.rowItem}>
                      <Text style={styles.rowLabel}>Blood Group</Text>
                      <Text style={styles.rowValue}>
                        {details.bloodGroup || 'Not provided'}
                      </Text>
                    </View>
                    <View style={styles.rowItem}>
                      <Text style={styles.rowLabel}>Institute</Text>
                      <Text style={styles.rowValue}>
                        {details.institute?.name
                          ? `${details.institute.name} (${details.institute.code})`
                          : 'TuitionOS Academy'}
                      </Text>
                    </View>
                  </View>

                  {/* 3. Guardian & Primary Contacts */}
                  <View style={styles.infoCard}>
                    <Text style={styles.cardHeader}>Guardian & Primary Contacts</Text>
                    {details.parentRelations && details.parentRelations.length > 0 ? (
                      details.parentRelations.map((rel: any) => {
                        const parentUser = rel.parent?.user;
                        return (
                          <View key={rel.id} style={styles.guardianItem}>
                            <View style={styles.guardianHeader}>
                              <Text style={styles.guardianName}>
                                {parentUser?.fullName || 'Parent / Guardian'}
                              </Text>
                              <Text style={styles.guardianRelation}>
                                {rel.relation || 'Guardian'}
                              </Text>
                            </View>
                            <View style={styles.guardianDetailRow}>
                              <Text style={styles.rowLabel}>Phone</Text>
                              <Text style={styles.rowValueHighlight}>
                                {parentUser?.phone || 'Not provided'}
                              </Text>
                            </View>
                            {parentUser?.email ? (
                              <View style={styles.guardianDetailRow}>
                                <Text style={styles.rowLabel}>Email</Text>
                                <Text style={styles.rowValue}>{parentUser.email}</Text>
                              </View>
                            ) : null}
                          </View>
                        );
                      })
                    ) : (
                      <Text style={styles.emptyNote}>
                        No guardian account linked to this student record.
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {/* Academics Tab */}
              {activeTab === 'academics' && (
                <View style={styles.sectionContainer}>
                  {/* Attendance Log */}
                  <View style={styles.infoCard}>
                    <Text style={styles.cardHeader}>Recent Attendance Events</Text>
                    {details.attendanceEvents && details.attendanceEvents.length > 0 ? (
                      details.attendanceEvents.map((evt: any) => {
                        const rawTime = evt.eventTime || evt.timestamp || evt.createdAt;
                        return (
                          <View key={evt.id} style={styles.rowItem}>
                            <View>
                              <Text style={styles.rowLabel}>
                                {rawTime
                                  ? new Date(rawTime).toLocaleDateString('en-IN', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                    })
                                  : 'Recent'}
                              </Text>
                              {rawTime && (
                                <Text style={{ fontSize: 10, color: '#8D6E63' }}>
                                  {new Date(rawTime).toLocaleTimeString('en-IN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </Text>
                              )}
                            </View>
                            <Text style={styles.rowValueHighlight}>
                              {evt.eventType} {evt.isLate ? '(Late)' : ''}
                            </Text>
                          </View>
                        );
                      })
                    ) : (
                      <Text style={styles.emptyNote}>No attendance records recorded yet.</Text>
                    )}
                  </View>

                  {/* Fee Assignments */}
                  {isAdmin && (
                    <View style={styles.infoCard}>
                      <Text style={styles.cardHeader}>Fee Assignments</Text>
                      {details.feeAssignments && details.feeAssignments.length > 0 ? (
                        details.feeAssignments.map((f: any) => (
                          <View key={f.id} style={styles.rowItem}>
                            <Text style={styles.rowLabel}>{f.feeStructure?.name || 'Tuition Fee'}</Text>
                            <Text style={styles.rowValueHighlight}>
                              ₹{f.finalAmount} ({f.status})
                            </Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.emptyNote}>No fee structures assigned.</Text>
                      )}
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FAF7F2',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    minHeight: '65%',
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEBE9',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D1E18',
  },
  sheetSub: {
    fontSize: 12,
    color: '#6D4C41',
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
    backgroundColor: '#4E342E',
    borderRadius: 14,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEBE9',
  },
  tabItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#4E342E',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8D6E63',
  },
  tabTextActive: {
    color: '#4E342E',
    fontWeight: 'bold',
  },
  loaderBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#8D6E63',
    fontWeight: '500',
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2D1E18',
    marginTop: 12,
  },
  errorSub: {
    fontSize: 12,
    color: '#8D6E63',
    marginTop: 4,
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4E342E',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 14,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionContainer: {
    gap: 14,
  },
  avatarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    gap: 14,
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 20,
  },
  avatarMeta: {
    flex: 1,
  },
  avatarName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#2D1E18',
  },
  avatarSub: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#6D4C41',
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFEBE9',
  },
  cardHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4E342E',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEBE9',
    paddingBottom: 8,
    marginBottom: 8,
  },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
  },
  rowHighlight: {
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    paddingHorizontal: 8,
    marginVertical: 3,
  },
  rowLabel: {
    fontSize: 12,
    color: '#8D6E63',
  },
  rowValue: {
    fontSize: 12,
    color: '#2D1E18',
    fontWeight: '500',
  },
  rowValueHighlight: {
    fontSize: 12,
    color: '#4E342E',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  enrollmentBlock: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5ECE8',
  },
  enrollmentItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  enrollmentBatchText: {
    fontSize: 12,
    color: '#4E342E',
    fontWeight: '600',
  },
  enrollmentSubText: {
    fontSize: 12,
    color: '#8D6E63',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  badgeActive: {
    backgroundColor: '#E8F5E9',
  },
  badgeTextActive: {
    color: '#2E7D32',
  },
  badgeBlue: {
    backgroundColor: '#EFF6FF',
  },
  badgeTextBlue: {
    color: '#2563EB',
  },
  badgeInactive: {
    backgroundColor: '#FFEBEE',
  },
  badgeTextInactive: {
    color: '#C62828',
  },
  guardianItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#EFEBE9',
    paddingBottom: 8,
    marginBottom: 8,
  },
  guardianHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  guardianName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2D1E18',
  },
  guardianRelation: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6D4C41',
    backgroundColor: '#EFEBE9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  guardianDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 4,
  },
  emptyNote: {
    fontSize: 12,
    color: '#8D6E63',
    fontStyle: 'italic',
    paddingVertical: 6,
  },
});
