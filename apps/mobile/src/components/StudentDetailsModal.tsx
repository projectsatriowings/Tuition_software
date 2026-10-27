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
  const [details, setDetails] = useState<any>(null);

  const fetchDetails = async () => {
    if (!studentId) return;
    try {
      setLoading(true);
      const res = await api.get(`/students/${studentId}`);
      if (res.data?.success && res.data?.data) {
        setDetails(res.data.data);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load student details', 'error');
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

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.sheetTitle}>
                {details ? `${details.firstName} ${details.lastName}` : 'Student Profile'}
              </Text>
              <Text style={styles.sheetSub}>
                Admission No: {details?.admissionNumber || '—'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
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
              <Text style={styles.loadingText}>Loading student profile...</Text>
            </View>
          ) : !details ? (
            <View style={styles.loaderBox}>
              <Text style={styles.loadingText}>Unable to load student record.</Text>
            </View>
          ) : (
            <ScrollView style={styles.scrollContent} contentContainerStyle={{ paddingBottom: 30 }}>
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <View style={styles.sectionContainer}>
                  {/* Photo & Identity Hero */}
                  <View style={styles.avatarCard}>
                    <StudentAvatar
                      studentId={details.id}
                      photoUrl={details.photoUrl}
                      name={`${details.firstName} ${details.lastName}`}
                      size={64}
                      style={styles.avatarImage}
                    />
                    <View style={styles.avatarMeta}>
                      <Text style={styles.avatarName}>
                        {details.firstName} {details.lastName}
                      </Text>
                      <Text style={styles.avatarSub}>{details.admissionNumber}</Text>
                    </View>
                  </View>

                  <View style={styles.infoCard}>
                    <Text style={styles.cardHeader}>Enrollment & Identity</Text>
                    <View style={styles.rowItem}>
                      <Text style={styles.rowLabel}>Admission Number</Text>
                      <Text style={styles.rowValueHighlight}>{details.admissionNumber}</Text>
                    </View>
                    <View style={styles.rowItem}>
                      <Text style={styles.rowLabel}>Joined Date (Admission)</Text>
                      <Text style={styles.rowValue}>{formatKolkataTime(details.admissionDate || details.createdAt)}</Text>
                    </View>
                    <View style={[styles.rowItem, { backgroundColor: '#FFF8E1', borderRadius: 8, paddingHorizontal: 6, marginVertical: 2 }]}>
                      <Text style={[styles.rowLabel, { fontWeight: 'bold', color: '#4E342E' }]}>Student Created Date & Time</Text>
                      <Text style={styles.rowValueHighlight}>{formatKolkataTime(details.createdAt)}</Text>
                    </View>
                    <View style={styles.rowItem}>
                      <Text style={styles.rowLabel}>Created By (Staff)</Text>
                      <Text style={styles.rowValue}>
                        {details.createdByUser ? details.createdByUser.fullName : 'Academic Admin / System'}
                      </Text>
                    </View>
                    <View style={styles.rowItem}>
                      <Text style={styles.rowLabel}>Status</Text>
                      <Text style={[styles.badge, details.status === 'ACTIVE' ? styles.badgeActive : styles.badgeInactive]}>
                        {details.status}
                      </Text>
                    </View>
                    <View style={styles.rowItem}>
                      <Text style={styles.rowLabel}>Current Batch</Text>
                      <Text style={styles.rowValue}>
                        {details.enrollments?.[0]?.batch?.name || 'Unassigned'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.infoCard}>
                    <Text style={styles.cardHeader}>Personal Details</Text>
                    <View style={styles.rowItem}>
                      <Text style={styles.rowLabel}>Student Phone</Text>
                      <Text style={styles.rowValue}>{details.phone || 'Not provided'}</Text>
                    </View>
                    <View style={styles.rowItem}>
                      <Text style={styles.rowLabel}>Gender</Text>
                      <Text style={styles.rowValue}>{details.gender}</Text>
                    </View>
                    <View style={styles.rowItem}>
                      <Text style={styles.rowLabel}>Date of Birth</Text>
                      <Text style={styles.rowValue}>
                        {details.dob ? new Date(details.dob).toLocaleDateString('en-IN') : 'Not provided'}
                      </Text>
                    </View>
                    <View style={styles.rowItem}>
                      <Text style={styles.rowLabel}>Blood Group</Text>
                      <Text style={styles.rowValue}>{details.bloodGroup || '—'}</Text>
                    </View>
                    <View style={styles.rowItem}>
                      <Text style={styles.rowLabel}>Institute</Text>
                      <Text style={styles.rowValue}>{details.institute?.name}</Text>
                    </View>
                  </View>

                  {/* Guardian & Primary Contacts (Read-only Contact Info) */}
                  {details.parentRelations && details.parentRelations.length > 0 && (
                    <View style={styles.infoCard}>
                      <Text style={styles.cardHeader}>Guardian & Primary Contacts</Text>
                      {details.parentRelations.map((rel: any) => {
                        const parentUser = rel.parent?.user;
                        return (
                          <View
                            key={rel.id}
                            style={[
                              styles.rowItem,
                              {
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                borderBottomWidth: 1,
                                borderBottomColor: '#EFEBE9',
                                paddingBottom: 8,
                                marginBottom: 6,
                              },
                            ]}
                          >
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
                              <Text style={styles.guardianName}>{parentUser?.fullName || 'Parent / Guardian'}</Text>
                              <Text style={styles.guardianRelation}>{rel.relation || 'Guardian'}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 4 }}>
                              <Text style={styles.rowLabel}>Phone</Text>
                              <Text style={styles.rowValueHighlight}>{parentUser?.phone || 'Not provided'}</Text>
                            </View>
                            {parentUser?.email ? (
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 2 }}>
                                <Text style={styles.rowLabel}>Email</Text>
                                <Text style={styles.rowValue}>{parentUser.email}</Text>
                              </View>
                            ) : null}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              {/* Academics Tab */}
              {activeTab === 'academics' && (
                <View style={styles.sectionContainer}>
                  <View style={styles.infoCard}>
                    <Text style={styles.cardHeader}>Recent Attendance Events</Text>
                    {details.attendanceEvents && details.attendanceEvents.length > 0 ? (
                      details.attendanceEvents.map((evt: any) => (
                        <View key={evt.id} style={styles.rowItem}>
                          <Text style={styles.rowLabel}>
                            {new Date(evt.timestamp).toLocaleDateString('en-IN')}
                          </Text>
                          <Text style={styles.rowValueHighlight}>
                            {evt.eventType} {evt.isLate ? '(Late)' : ''}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.emptyNote}>No attendance records recorded yet.</Text>
                    )}
                  </View>

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
  },
  closeBtnText: {
    fontSize: 18,
    color: '#8D6E63',
    fontWeight: 'bold',
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
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionContainer: {
    gap: 16,
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
    borderRadius: 18,
  },
  avatarMeta: {
    flex: 1,
  },
  avatarName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D1E18',
  },
  avatarSub: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: '#6D4C41',
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFEBE9',
  },
  cardHeader: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#4E342E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  badge: {
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  badgeActive: {
    backgroundColor: '#E8F5E9',
    color: '#2E7D32',
  },
  badgeInactive: {
    backgroundColor: '#FFEBEE',
    color: '#C62828',
  },
  guardianName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2D1E18',
  },
  guardianRelation: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6D4C41',
    backgroundColor: '#EFEBE9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  emptyNote: {
    fontSize: 12,
    color: '#8D6E63',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
});
