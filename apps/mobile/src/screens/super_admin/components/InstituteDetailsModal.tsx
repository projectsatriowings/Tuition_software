import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { mobileApiFetch } from '../../../services/api';
import { PressableScale, AnimatedDialog } from '../../../theme/motion';
import { TouchableWithoutFeedback } from 'react-native';

interface InstituteDetailsModalProps {
  visible: boolean;
  institute: any | null;
  onClose: () => void;
  onRefresh: () => void;
}

export const InstituteDetailsModal: React.FC<InstituteDetailsModalProps> = ({
  visible,
  institute,
  onClose,
  onRefresh,
}) => {
  const [instDetails, setInstDetails] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // Edit Institute State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Reset Admin Password State
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  // Status Action Loading
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (visible && institute?.id) {
      loadDetails(institute.id);
    } else {
      setInstDetails(null);
      setIsEditing(false);
      setNewAdminPassword('');
    }
  }, [visible, institute]);

  const loadDetails = async (id: string) => {
    setLoading(true);
    try {
      const res = await mobileApiFetch(`/institutes/${id}`);
      if (res.success && res.data) {
        const d = res.data.institute || res.data;
        setInstDetails(d);
        setEditName(d.name || '');
        setEditEmail(d.email || '');
        setEditPhone(d.phone || '');
        setEditAddress(d.address || '');
      } else {
        setInstDetails(institute);
      }
    } catch {
      setInstDetails(institute);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!instDetails?.id) return;
    const currentStatus = instDetails.status || 'ACTIVE';
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const actionLabel = newStatus === 'ACTIVE' ? 'Activate' : 'Suspend';

    Alert.alert(
      `${actionLabel} Institute`,
      `Are you sure you want to ${actionLabel.toLowerCase()} '${instDetails.name}'? ${
        newStatus === 'SUSPENDED'
          ? 'All faculty, students, and parent sessions under this institute will be temporarily blocked from signing in.'
          : 'Tenant access will be fully restored.'
      }`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionLabel,
          style: newStatus === 'SUSPENDED' ? 'destructive' : 'default',
          onPress: async () => {
            setUpdatingStatus(true);
            try {
              const res = await mobileApiFetch(`/institutes/${instDetails.id}/status`, {
                method: 'PATCH',
                body: { status: newStatus },
              });
              if (res.success) {
                Alert.alert('Status Updated', `Institute is now ${newStatus}.`);
                loadDetails(instDetails.id);
                onRefresh();
              } else {
                Alert.alert('Error', res.error || 'Failed to update status');
              }
            } catch (e: any) {
              Alert.alert('Network Error', e.message || 'Connection failed');
            } finally {
              setUpdatingStatus(false);
            }
          },
        },
      ]
    );
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      Alert.alert('Required', 'Institute name cannot be empty.');
      return;
    }

    setSavingEdit(true);
    try {
      const res = await mobileApiFetch(`/institutes/${instDetails.id}`, {
        method: 'PATCH',
        body: {
          name: editName.trim(),
          email: editEmail.trim() || undefined,
          phone: editPhone.trim() || undefined,
          address: editAddress.trim() || undefined,
        },
      });

      if (res.success) {
        Alert.alert('Saved', 'Institute details have been updated.');
        setIsEditing(false);
        loadDetails(instDetails.id);
        onRefresh();
      } else {
        Alert.alert('Error', res.error || 'Failed to update institute');
      }
    } catch (e: any) {
      Alert.alert('Network Error', e.message || 'Connection failed');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newAdminPassword || newAdminPassword.length < 8) {
      Alert.alert('Validation Error', 'Password must be at least 8 characters long.');
      return;
    }

    setResettingPassword(true);
    try {
      const res = await mobileApiFetch(
        `/institutes/${instDetails.id}/admin-account/reset-password`,
        {
          method: 'POST',
          body: { newPassword: newAdminPassword.trim() },
        }
      );

      if (res.success) {
        Alert.alert(
          'Password Reset Complete',
          'Academic Administrator login credentials have been reset successfully.'
        );
        setNewAdminPassword('');
      } else {
        Alert.alert('Reset Failed', res.error || 'Failed to reset password');
      }
    } catch (e: any) {
      Alert.alert('Network Error', e.message || 'Connection failed');
    } finally {
      setResettingPassword(false);
    }
  };

  if (!instDetails && !loading) return null;

  const status = instDetails?.status || 'ACTIVE';
  const counts = instDetails?._count || {};

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {instDetails?.name || 'Institute Details'}
              </Text>
              <Text style={styles.modalSub}>
                Code: {instDetails?.code || 'INST'} &bull; Tenant ID: {instDetails?.id?.slice(0, 8)}...
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color="#4E342E" />
              <Text style={styles.loadingText}>Loading institute record...</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.detailsScroll}
              showsVerticalScrollIndicator={false}
            >
              {/* Status and Metric Cards */}
              <View style={styles.metricsRow}>
                <View style={styles.metricCol}>
                  <Text style={styles.metricLabel}>STUDENTS</Text>
                  <Text style={styles.metricVal}>{counts.students || 0}</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricCol}>
                  <Text style={styles.metricLabel}>FACULTY</Text>
                  <Text style={styles.metricVal}>{counts.staffProfiles || 0}</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricCol}>
                  <Text style={styles.metricLabel}>BATCHES</Text>
                  <Text style={styles.metricVal}>{counts.batches || 0}</Text>
                </View>
              </View>

              {/* Status & Lifecycle Action */}
              <View style={styles.statusBox}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.boxLabel}>TENANT STATUS</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      status === 'ACTIVE'
                        ? styles.badgeGreen
                        : status === 'SUSPENDED'
                        ? styles.badgeDanger
                        : styles.badgeOrange,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        status === 'ACTIVE'
                          ? styles.badgeGreenText
                          : status === 'SUSPENDED'
                          ? styles.badgeDangerText
                          : styles.badgeOrangeText,
                      ]}
                    >
                      {status}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.statusToggleBtn,
                    status === 'ACTIVE' ? styles.btnSuspend : styles.btnActivate,
                  ]}
                  onPress={handleToggleStatus}
                  disabled={updatingStatus}
                >
                  {updatingStatus ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.statusToggleBtnText}>
                      {status === 'ACTIVE' ? 'Suspend Tenant' : 'Activate Tenant'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Edit Details Section */}
              <View style={styles.infoCard}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeading}>INSTITUTE PROFILE</Text>
                  <TouchableOpacity
                    onPress={() => setIsEditing(!isEditing)}
                    style={styles.editToggleBtn}
                  >
                    <Text style={styles.editToggleBtnText}>
                      {isEditing ? 'Cancel Edit' : '✎ Edit Info'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {isEditing ? (
                  <View style={styles.editForm}>
                    <Text style={styles.fieldLabel}>Institute Name *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editName}
                      onChangeText={setEditName}
                    />

                    <Text style={styles.fieldLabel}>Official Email</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editEmail}
                      onChangeText={setEditEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />

                    <Text style={styles.fieldLabel}>Contact Phone</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editPhone}
                      onChangeText={setEditPhone}
                      keyboardType="phone-pad"
                    />

                    <Text style={styles.fieldLabel}>Campus Address</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editAddress}
                      onChangeText={setEditAddress}
                    />

                    <TouchableOpacity
                      style={styles.saveBtn}
                      onPress={handleSaveEdit}
                      disabled={savingEdit}
                    >
                      {savingEdit ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.saveBtnText}>Save Changes</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Email:</Text>
                      <Text style={styles.detailVal}>
                        {instDetails?.email || '—'}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Phone:</Text>
                      <Text style={styles.detailVal}>
                        {instDetails?.phone || '—'}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Address:</Text>
                      <Text style={styles.detailVal}>
                        {instDetails?.address || '—'}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Created Date:</Text>
                      <Text style={styles.detailVal}>
                        {instDetails?.createdAt
                          ? new Date(instDetails.createdAt).toLocaleDateString('en-IN')
                          : '—'}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Reset Academic Admin Password Section */}
              <View style={styles.infoCard}>
                <Text style={styles.sectionHeading}>
                  RESET ACADEMIC ADMIN PASSWORD
                </Text>
                <Text style={styles.helperText}>
                  Set a new permanent login password for this institute's administrator.
                </Text>

                <TextInput
                  style={styles.textInput}
                  placeholder="New password (min 8 chars)"
                  placeholderTextColor="#8D6E63"
                  value={newAdminPassword}
                  onChangeText={setNewAdminPassword}
                  secureTextEntry={false}
                />

                <TouchableOpacity
                  style={[
                    styles.resetBtn,
                    (!newAdminPassword.trim() || resettingPassword) &&
                      styles.resetBtnDisabled,
                  ]}
                  onPress={handleResetPassword}
                  disabled={!newAdminPassword.trim() || resettingPassword}
                >
                  {resettingPassword ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.resetBtnText}>Reset Admin Password</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          <TouchableOpacity style={styles.closeModalBtn} onPress={onClose}>
            <Text style={styles.closeModalBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F5ECE8',
    paddingBottom: 10,
    marginBottom: 10,
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
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F5ECE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    color: '#4E342E',
    fontWeight: '700',
  },
  centerLoading: {
    padding: 30,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: '#8D6E63',
    marginTop: 8,
  },
  detailsScroll: {
    maxHeight: 450,
  },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: '#FAF7F5',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    marginBottom: 10,
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8D6E63',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metricVal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#2D1E18',
  },
  metricDivider: {
    width: 1,
    backgroundColor: '#EFEBE9',
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    marginBottom: 10,
  },
  boxLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8D6E63',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
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
  badgeDanger: {
    backgroundColor: '#FEF2F2',
  },
  badgeDangerText: {
    color: '#DC2626',
  },
  badgeOrange: {
    backgroundColor: '#FFFBEB',
  },
  badgeOrangeText: {
    color: '#D97706',
  },
  statusToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  btnSuspend: {
    backgroundColor: '#DC2626',
  },
  btnActivate: {
    backgroundColor: '#059669',
  },
  statusToggleBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: '#FAF7F5',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    marginBottom: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8D6E63',
    letterSpacing: 0.8,
  },
  editToggleBtn: {
    paddingVertical: 2,
  },
  editToggleBtnText: {
    fontSize: 11,
    color: '#4E342E',
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEBE9',
  },
  detailLabel: {
    fontSize: 11,
    color: '#8D6E63',
  },
  detailVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2D1E18',
  },
  editForm: {
    marginTop: 4,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4E342E',
    marginTop: 6,
    marginBottom: 2,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D7CCC8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: '#2D1E18',
  },
  saveBtn: {
    backgroundColor: '#4E342E',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  helperText: {
    fontSize: 10,
    color: '#8D6E63',
    marginVertical: 4,
  },
  resetBtn: {
    backgroundColor: '#4E342E',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  resetBtnDisabled: {
    opacity: 0.6,
  },
  resetBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  closeModalBtn: {
    backgroundColor: '#F5ECE8',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#D7CCC8',
  },
  closeModalBtnText: {
    color: '#4E342E',
    fontSize: 12,
    fontWeight: '700',
  },
});

