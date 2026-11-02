import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { mobileApiFetch } from '../../../services/api';
import { PressableScale } from '../../../theme/motion';

interface CreateInstituteModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateInstituteModal: React.FC<CreateInstituteModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Initial Admin Credentials
  const [adminFullName, setAdminFullName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminInitialPassword, setAdminInitialPassword] = useState('Password#123');

  const [submitting, setSubmitting] = useState(false);
  const lastPressTime = useRef<number>(0);

  const resetForm = () => {
    setName('');
    setCode('');
    setEmail('');
    setPhone('');
    setAddress('');
    setAdminFullName('');
    setAdminEmail('');
    setAdminPhone('');
    setAdminInitialPassword('Password#123');
    setSubmitting(false);
  };

  const handleClose = () => {
    if (submitting) return;
    resetForm();
    onClose();
  };

  const handleCreate = async () => {
    if (submitting) return;

    // Double submission prevention
    const now = Date.now();
    if (now - lastPressTime.current < 450) return;
    lastPressTime.current = now;

    // Client Validation
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter the institute name.');
      return;
    }
    if (!adminFullName.trim()) {
      Alert.alert('Required Field', 'Please enter the initial Administrator full name.');
      return;
    }
    if (!adminEmail.trim()) {
      Alert.alert('Required Field', 'Please enter a valid administrator email address.');
      return;
    }
    if (!adminInitialPassword || adminInitialPassword.length < 8) {
      Alert.alert(
        'Password Security',
        'Initial administrator password must be at least 8 characters long.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        name: name.trim(),
        adminFullName: adminFullName.trim(),
        adminEmail: adminEmail.trim().toLowerCase(),
        adminInitialPassword: adminInitialPassword.trim(),
      };

      if (code.trim()) payload.code = code.trim().toUpperCase();
      if (email.trim()) payload.email = email.trim();
      if (phone.trim()) payload.phone = phone.trim();
      if (address.trim()) payload.address = address.trim();
      if (adminPhone.trim()) payload.adminPhone = adminPhone.trim();

      const res = await mobileApiFetch('/institutes', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.success && res.data) {
        Alert.alert(
          'Institute Provisioned',
          `Successfully registered "${res.data.name}" with tenant code: ${res.data.code}.\n\nAcademic Admin login: ${payload.adminEmail}`,
          [
            {
              text: 'OK',
              onPress: () => {
                resetForm();
                onSuccess();
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Provisioning Failed',
          res.error || 'Server rejected institute provisioning request.'
        );
      }
    } catch (e: any) {
      Alert.alert(
        'Network Error',
        e.message || 'Unable to connect to TuitionOS Cloud server.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Provision New Institute</Text>
              <Text style={styles.modalSub}>
                Configure multi-tenant isolated institute & administrator
              </Text>
            </View>
            <PressableScale
              onPress={handleClose}
              disabled={submitting}
              activeScale={0.92}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </PressableScale>
          </View>

          <ScrollView
            style={styles.formScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Institute Info Section */}
            <Text style={styles.sectionHeading}>INSTITUTE DETAILS</Text>

            <Text style={styles.fieldLabel}>Institute Name *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Apex Science Academy"
              placeholderTextColor="#8D6E63"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.fieldLabel}>Institute Code (Optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. APEX (auto-generated if empty)"
              placeholderTextColor="#8D6E63"
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
            />

            <Text style={styles.fieldLabel}>Official Email (Optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. contact@apexacademy.edu"
              placeholderTextColor="#8D6E63"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.fieldLabel}>Official Contact Phone (Optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. +91 98765 43210"
              placeholderTextColor="#8D6E63"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <Text style={styles.fieldLabel}>Campus Address (Optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="e.g. 12, Anna Salai, Chennai, TN"
              placeholderTextColor="#8D6E63"
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={2}
            />

            {/* Admin Info Section */}
            <Text style={[styles.sectionHeading, { marginTop: 18 }]}>
              ACADEMIC ADMIN (DIRECTOR) ACCOUNT
            </Text>

            <Text style={styles.fieldLabel}>Admin Full Name *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Dr. K. Ramanathan"
              placeholderTextColor="#8D6E63"
              value={adminFullName}
              onChangeText={setAdminFullName}
            />

            <Text style={styles.fieldLabel}>Admin Login Email *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. director@apexacademy.edu"
              placeholderTextColor="#8D6E63"
              value={adminEmail}
              onChangeText={setAdminEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.fieldLabel}>Admin Mobile Phone (Optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. +91 98765 00000"
              placeholderTextColor="#8D6E63"
              value={adminPhone}
              onChangeText={setAdminPhone}
              keyboardType="phone-pad"
            />

            <Text style={styles.fieldLabel}>Initial Password (Min 8 chars) *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Password#123"
              placeholderTextColor="#8D6E63"
              value={adminInitialPassword}
              onChangeText={setAdminInitialPassword}
            />
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.modalBtnRow}>
            <PressableScale
              onPress={handleClose}
              style={[styles.cancelBtn, submitting && styles.btnDisabled]}
              disabled={submitting}
              activeScale={0.97}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </PressableScale>

            <PressableScale
              onPress={handleCreate}
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              disabled={submitting}
              activeScale={0.97}
              accessibilityRole="button"
              accessibilityLabel="Provision Institute"
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Provision Institute</Text>
              )}
            </PressableScale>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    maxHeight: '90%',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEBE9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#3E2723',
  },
  modalSub: {
    fontSize: 11,
    color: '#8D6E63',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 16,
    color: '#8D6E63',
    fontWeight: 'bold',
  },
  formScroll: {
    paddingVertical: 12,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4E342E',
    letterSpacing: 0.5,
    marginBottom: 10,
    backgroundColor: '#F5ECE8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5D4037',
    marginBottom: 4,
    marginTop: 8,
  },
  textInput: {
    backgroundColor: '#FAF7F5',
    borderWidth: 1,
    borderColor: '#EFEBE9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    color: '#3E2723',
  },
  textArea: {
    minHeight: 50,
    textAlignVertical: 'top',
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EFEBE9',
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  cancelBtnText: {
    fontSize: 12,
    color: '#6D4C41',
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: '#4E342E',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
