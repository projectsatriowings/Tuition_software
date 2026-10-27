import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  TouchableWithoutFeedback,
  Platform,
  Image,
} from 'react-native';
import { api, getApiBaseUrl } from '../services/api';
import { useMobileToast } from '../context/ToastContext';
import { ConfirmationModal } from './ConfirmationModal';
import { StudentAvatar } from './StudentAvatar';
import { themeTokens } from '@tuition/shared';

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
  const [activeTab, setActiveTab] = useState<'profile' | 'studentAccount' | 'parents' | 'academics'>('profile');
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<any>(null);

  // Reset Password Modal State
  const [resetModal, setResetModal] = useState<{
    isOpen: boolean;
    target: 'STUDENT' | 'PARENT';
    id: string;
    name: string;
    identifier: string;
    newPassword: '';
    loading: boolean;
  }>({
    isOpen: false,
    target: 'STUDENT',
    id: '',
    name: '',
    identifier: '',
    newPassword: '',
    loading: false,
  });

  // Generated Temporary Password Dialog
  const [tempPassResult, setTempPassResult] = useState<{
    name: string;
    identifier: string;
    temporaryPassword: string;
  } | null>(null);

  // Update Identifier Modal State
  const [identifierModal, setIdentifierModal] = useState<{
    isOpen: boolean;
    target: 'STUDENT' | 'PARENT';
    id: string;
    name: string;
    currentPhone: string;
    currentEmail: string;
    phone: string;
    email: string;
    loading: boolean;
  }>({
    isOpen: false,
    target: 'STUDENT',
    id: '',
    name: '',
    currentPhone: '',
    currentEmail: '',
    phone: '',
    email: '',
    loading: false,
  });

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

  const handleResetPassword = async () => {
    setResetModal((prev) => ({ ...prev, loading: true }));
    try {
      let endpoint = '';
      if (resetModal.target === 'STUDENT') {
        endpoint = `/students/${resetModal.id}/reset-password`;
      } else {
        endpoint = `/parents/${resetModal.id}/reset-password`;
      }

      const res = await api.post(endpoint, {
        newPassword: resetModal.newPassword.trim() || undefined,
      });

      if (res.data?.success) {
        const tempPass = res.data.data.temporaryPassword;
        setResetModal((prev) => ({ ...prev, isOpen: false, loading: false }));
        setTempPassResult({
          name: resetModal.name,
          identifier: res.data.data.identifier || resetModal.identifier,
          temporaryPassword: tempPass,
        });
        showToast('Password reset successfully.', 'success');
        fetchDetails();
        onStudentUpdated?.();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to reset password', 'error');
      setResetModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleUpdateIdentifier = async () => {
    setIdentifierModal((prev) => ({ ...prev, loading: true }));
    try {
      let endpoint = '';
      if (identifierModal.target === 'STUDENT') {
        endpoint = `/students/${identifierModal.id}/account-identifier`;
      } else {
        endpoint = `/parents/${identifierModal.id}/account-identifier`;
      }

      const res = await api.patch(endpoint, {
        phone: identifierModal.phone.trim() || undefined,
        email: identifierModal.email.trim() || undefined,
      });

      if (res.data?.success) {
        showToast('Login identifier updated successfully.', 'success');
        setIdentifierModal((prev) => ({ ...prev, isOpen: false, loading: false }));
        fetchDetails();
        onStudentUpdated?.();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update identifier', 'error');
      setIdentifierModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleToggleStudentAccountStatus = async (currentActive: boolean) => {
    if (!studentId) return;
    try {
      const res = await api.patch(`/students/${studentId}/account-status`, {
        isActive: !currentActive,
      });
      if (res.data?.success) {
        showToast(`Student account ${!currentActive ? 'activated' : 'deactivated'} successfully`, 'success');
        fetchDetails();
        onStudentUpdated?.();
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating student account status', 'error');
    }
  };

  const handleToggleParentAccountStatus = async (parentId: string, currentActive: boolean) => {
    try {
      const res = await api.patch(`/parents/${parentId}/account-status`, {
        isActive: !currentActive,
      });
      if (res.data?.success) {
        showToast(`Parent account ${!currentActive ? 'activated' : 'deactivated'} successfully`, 'success');
        fetchDetails();
        onStudentUpdated?.();
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating parent account status', 'error');
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
              style={[styles.tabItem, activeTab === 'studentAccount' && styles.tabItemActive]}
              onPress={() => setActiveTab('studentAccount')}
            >
              <Text style={[styles.tabText, activeTab === 'studentAccount' && styles.tabTextActive]}>
                Student Login
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'parents' && styles.tabItemActive]}
              onPress={() => setActiveTab('parents')}
            >
              <Text style={[styles.tabText, activeTab === 'parents' && styles.tabTextActive]}>
                Guardians ({details?.parentRelations?.length || 0})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'academics' && styles.tabItemActive]}
              onPress={() => setActiveTab('academics')}
            >
              <Text style={[styles.tabText, activeTab === 'academics' && styles.tabTextActive]}>
                Academic
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
                    <View style={styles.rowItem}>
                      <Text style={styles.rowLabel}>Record Created</Text>
                      <Text style={styles.rowValue}>{formatKolkataTime(details.createdAt)}</Text>
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
                </View>
              )}

              {/* Student Login Account Tab */}
              {activeTab === 'studentAccount' && (
                <View style={styles.sectionContainer}>
                  {details.user ? (
                    <View style={styles.infoCard}>
                      <Text style={styles.cardHeader}>Student Portal Credentials</Text>
                      <View style={styles.rowItem}>
                        <Text style={styles.rowLabel}>Login Identifier (Email)</Text>
                        <Text style={styles.rowValueHighlight}>{details.user.email || '—'}</Text>
                      </View>
                      <View style={styles.rowItem}>
                        <Text style={styles.rowLabel}>Login Identifier (Phone)</Text>
                        <Text style={styles.rowValueHighlight}>{details.user.phone || '—'}</Text>
                      </View>
                      <View style={styles.rowItem}>
                        <Text style={styles.rowLabel}>Account Status</Text>
                        <Text style={styles.rowValue}>{details.user.status}</Text>
                      </View>
                      <View style={styles.rowItem}>
                        <Text style={styles.rowLabel}>Student Login Created</Text>
                        <Text style={styles.rowValue}>{formatKolkataTime(details.user.createdAt)}</Text>
                      </View>
                      <View style={styles.rowItem}>
                        <Text style={styles.rowLabel}>Last Login Recorded</Text>
                        <Text style={styles.rowValue}>{formatKolkataTime(details.user.lastLoginAt)}</Text>
                      </View>

                      {/* Staff Account Management Actions */}
                      <View style={styles.actionButtonGroup}>
                        <TouchableOpacity
                          style={styles.actionBtnSecondary}
                          onPress={() =>
                            setIdentifierModal({
                              isOpen: true,
                              target: 'STUDENT',
                              id: details.id,
                              name: `${details.firstName} ${details.lastName}`,
                              currentPhone: details.user.phone || '',
                              currentEmail: details.user.email || '',
                              phone: details.user.phone || '',
                              email: details.user.email || '',
                              loading: false,
                            })
                          }
                        >
                          <Text style={styles.actionBtnSecondaryText}>Update Login ID</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.actionBtnPrimary}
                          onPress={() =>
                            setResetModal({
                              isOpen: true,
                              target: 'STUDENT',
                              id: details.id,
                              name: `${details.firstName} ${details.lastName}`,
                              identifier: details.user.phone || details.user.email,
                              newPassword: '',
                              loading: false,
                            })
                          }
                        >
                          <Text style={styles.actionBtnPrimaryText}>Reset Password</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.actionBtnSecondary,
                            { borderColor: details.user.isActive ? '#FFCDD2' : '#C8E6C9' },
                          ]}
                          onPress={() => handleToggleStudentAccountStatus(details.user.isActive)}
                        >
                          <Text
                            style={[
                              styles.actionBtnSecondaryText,
                              { color: details.user.isActive ? '#C62828' : '#2E7D32' },
                            ]}
                          >
                            {details.user.isActive ? 'Deactivate' : 'Reactivate'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.infoCard}>
                      <Text style={styles.cardHeader}>No Login Account</Text>
                      <Text style={styles.emptyNote}>
                        This student currently has no individual portal login credentials.
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Parents / Guardians Tab */}
              {activeTab === 'parents' && (
                <View style={styles.sectionContainer}>
                  {details.parentRelations && details.parentRelations.length > 0 ? (
                    details.parentRelations.map((rel: any) => {
                      const parentUser = rel.parent?.user;
                      return (
                        <View key={rel.id} style={styles.infoCard}>
                          <View style={styles.guardianHeader}>
                            <Text style={styles.guardianName}>
                              {parentUser?.fullName || 'Parent / Guardian'}
                            </Text>
                            <Text style={styles.guardianRelation}>
                              {rel.relation} {rel.isPrimaryContact ? '• Primary' : ''}
                            </Text>
                          </View>

                          <View style={styles.rowItem}>
                            <Text style={styles.rowLabel}>Phone (Login ID)</Text>
                            <Text style={styles.rowValueHighlight}>{parentUser?.phone || '—'}</Text>
                          </View>
                          <View style={styles.rowItem}>
                            <Text style={styles.rowLabel}>Email</Text>
                            <Text style={styles.rowValue}>{parentUser?.email || '—'}</Text>
                          </View>
                          <View style={styles.rowItem}>
                            <Text style={styles.rowLabel}>SMS Alerts Allowed</Text>
                            <Text style={styles.rowValue}>{rel.canReceiveSms ? 'Yes (Consented)' : 'No'}</Text>
                          </View>
                          <View style={styles.rowItem}>
                            <Text style={styles.rowLabel}>Parent Login Created</Text>
                            <Text style={styles.rowValue}>{formatKolkataTime(parentUser?.createdAt)}</Text>
                          </View>
                          <View style={styles.rowItem}>
                            <Text style={styles.rowLabel}>Last Login Recorded</Text>
                            <Text style={styles.rowValue}>{formatKolkataTime(parentUser?.lastLoginAt)}</Text>
                          </View>
                          {rel.parent?.studentRelations && rel.parent.studentRelations.length > 1 && (
                            <View style={styles.rowItem}>
                              <Text style={styles.rowLabel}>Other Children</Text>
                              <Text style={styles.rowValue}>
                                {rel.parent.studentRelations
                                  .filter((r: any) => r.student?.id !== details.id)
                                  .map((r: any) => `${r.student?.firstName} ${r.student?.lastName}`)
                                  .join(', ')}
                              </Text>
                            </View>
                          )}

                          {/* Guardian Credential Actions */}
                          <View style={styles.actionButtonGroup}>
                            <TouchableOpacity
                              style={styles.actionBtnSecondary}
                              onPress={() =>
                                setIdentifierModal({
                                  isOpen: true,
                                  target: 'PARENT',
                                  id: rel.parent.id,
                                  name: parentUser?.fullName || 'Parent',
                                  currentPhone: parentUser?.phone || '',
                                  currentEmail: parentUser?.email || '',
                                  phone: parentUser?.phone || '',
                                  email: parentUser?.email || '',
                                  loading: false,
                                })
                              }
                            >
                              <Text style={styles.actionBtnSecondaryText}>Update Login ID</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.actionBtnPrimary}
                              onPress={() =>
                                setResetModal({
                                  isOpen: true,
                                  target: 'PARENT',
                                  id: rel.parent.id,
                                  name: parentUser?.fullName || 'Parent',
                                  identifier: parentUser?.phone || parentUser?.email,
                                  newPassword: '',
                                  loading: false,
                                })
                              }
                            >
                              <Text style={styles.actionBtnPrimaryText}>Reset Password</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[
                                styles.actionBtnSecondary,
                                { borderColor: parentUser?.isActive ? '#FFCDD2' : '#C8E6C9' },
                              ]}
                              onPress={() =>
                                handleToggleParentAccountStatus(rel.parent.id, parentUser?.isActive ?? true)
                              }
                            >
                              <Text
                                style={[
                                  styles.actionBtnSecondaryText,
                                  { color: parentUser?.isActive ? '#C62828' : '#2E7D32' },
                                ]}
                              >
                                {parentUser?.isActive ? 'Deactivate' : 'Reactivate'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <View style={styles.infoCard}>
                      <Text style={styles.emptyNote}>No guardians are currently linked to this student.</Text>
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
                </View>
              )}
            </ScrollView>
          )}

          {/* Reset Password Prompt Modal */}
          {resetModal.isOpen && (
            <Modal transparent animationType="fade" visible={resetModal.isOpen}>
              <View style={styles.promptOverlay}>
                <View style={styles.promptCard}>
                  <Text style={styles.promptTitle}>Reset Password</Text>
                  <Text style={styles.promptSub}>
                    Account: {resetModal.name} ({resetModal.identifier})
                  </Text>
                  <Text style={styles.fieldLabel}>New Password (leave blank to auto-generate)</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="Enter or leave blank for random password"
                    secureTextEntry
                    value={resetModal.newPassword}
                    onChangeText={(val) => setResetModal((prev) => ({ ...prev, newPassword: val as any }))}
                  />
                  <Text style={styles.securityHint}>
                    Password must be changed upon first login. Never share plaintext passwords insecurely.
                  </Text>
                  <View style={styles.promptBtnRow}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => setResetModal((prev) => ({ ...prev, isOpen: false }))}
                    >
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionBtnPrimary}
                      onPress={handleResetPassword}
                      disabled={resetModal.loading}
                    >
                      {resetModal.loading ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={styles.actionBtnPrimaryText}>Confirm Reset</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          )}

          {/* Temporary Password Display Dialog */}
          {tempPassResult && (
            <Modal transparent animationType="fade" visible={Boolean(tempPassResult)}>
              <View style={styles.promptOverlay}>
                <View style={styles.promptCard}>
                  <Text style={styles.successIcon}>✓</Text>
                  <Text style={styles.promptTitle}>Password Reset Generated</Text>
                  <Text style={styles.promptSub}>{tempPassResult.name}</Text>
                  <View style={styles.credentialBox}>
                    <Text style={styles.credLabel}>Login Identifier:</Text>
                    <Text style={styles.credValue}>{tempPassResult.identifier}</Text>
                    <Text style={styles.credLabel}>Temporary Password:</Text>
                    <Text style={styles.credPassword}>{tempPassResult.temporaryPassword}</Text>
                  </View>
                  <Text style={styles.securityHint}>
                    Shown only once now for staff handover. The user will be required to change this upon login.
                  </Text>
                  <TouchableOpacity
                    style={[styles.actionBtnPrimary, { width: '100%', marginTop: 12 }]}
                    onPress={() => setTempPassResult(null)}
                  >
                    <Text style={styles.actionBtnPrimaryText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          )}

          {/* Update Identifier Modal */}
          {identifierModal.isOpen && (
            <Modal transparent animationType="fade" visible={identifierModal.isOpen}>
              <View style={styles.promptOverlay}>
                <View style={styles.promptCard}>
                  <Text style={styles.promptTitle}>Update Login Identifier</Text>
                  <Text style={styles.promptSub}>{identifierModal.name}</Text>
                  <Text style={styles.fieldLabel}>Phone Number</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="e.g. 9876543210"
                    keyboardType="phone-pad"
                    value={identifierModal.phone}
                    onChangeText={(val) => setIdentifierModal((prev) => ({ ...prev, phone: val }))}
                  />
                  <Text style={styles.fieldLabel}>Email Address</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="e.g. user@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={identifierModal.email}
                    onChangeText={(val) => setIdentifierModal((prev) => ({ ...prev, email: val }))}
                  />
                  <View style={styles.promptBtnRow}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => setIdentifierModal((prev) => ({ ...prev, isOpen: false }))}
                    >
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionBtnPrimary}
                      onPress={handleUpdateIdentifier}
                      disabled={identifierModal.loading}
                    >
                      {identifierModal.loading ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={styles.actionBtnPrimaryText}>Save Identifier</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
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
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#4E342E',
  },
  tabText: {
    fontSize: 12,
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
  },
  loadingText: {
    fontSize: 13,
    color: '#6D4C41',
    marginTop: 10,
  },
  scrollContent: {
    padding: 16,
  },
  sectionContainer: {
    gap: 12,
  },
  avatarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D7CCC8',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#8D6E63',
  },
  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FAF7F2',
    borderWidth: 2,
    borderColor: '#D7CCC8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4E342E',
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
    fontSize: 12,
    color: '#6D4C41',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D7CCC8',
  },
  cardHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4E342E',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F7F2EF',
    paddingBottom: 6,
  },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  rowLabel: {
    fontSize: 12,
    color: '#6D4C41',
    fontWeight: '500',
  },
  rowValue: {
    fontSize: 12,
    color: '#2D1E18',
    fontWeight: '600',
  },
  rowValueHighlight: {
    fontSize: 12,
    color: '#4E342E',
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
  },
  badge: {
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeActive: {
    backgroundColor: '#D1FAE5',
    color: '#065F46',
  },
  badgeInactive: {
    backgroundColor: '#F3F4F6',
    color: '#374151',
  },
  emptyNote: {
    fontSize: 12,
    color: '#8D6E63',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  actionButtonGroup: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F7F2EF',
    paddingTop: 10,
  },
  actionBtnPrimary: {
    flex: 1,
    backgroundColor: '#4E342E',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionBtnPrimaryText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  actionBtnSecondary: {
    flex: 1,
    backgroundColor: '#FAF7F2',
    borderWidth: 1,
    borderColor: '#D7CCC8',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionBtnSecondaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4E342E',
  },
  guardianHeader: {
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F7F2EF',
    paddingBottom: 6,
  },
  guardianName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2D1E18',
  },
  guardianRelation: {
    fontSize: 11,
    color: '#8D6E63',
    fontWeight: '600',
  },
  promptOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  promptCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#D7CCC8',
  },
  promptTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D1E18',
    marginBottom: 4,
  },
  promptSub: {
    fontSize: 12,
    color: '#6D4C41',
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4E342E',
    marginBottom: 4,
    marginTop: 8,
  },
  inputField: {
    backgroundColor: '#FAF7F2',
    borderWidth: 1,
    borderColor: '#D7CCC8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#2D1E18',
  },
  securityHint: {
    fontSize: 10,
    color: '#8D6E63',
    marginTop: 8,
    lineHeight: 14,
  },
  promptBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#FAF7F2',
    borderWidth: 1,
    borderColor: '#D7CCC8',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6D4C41',
  },
  successIcon: {
    fontSize: 28,
    color: '#059669',
    textAlign: 'center',
    marginBottom: 6,
  },
  credentialBox: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 12,
    padding: 12,
    marginVertical: 10,
  },
  credLabel: {
    fontSize: 11,
    color: '#78350F',
    fontWeight: '600',
  },
  credValue: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: 'bold',
    marginBottom: 6,
  },
  credPassword: {
    fontSize: 16,
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
    color: '#065F46',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
