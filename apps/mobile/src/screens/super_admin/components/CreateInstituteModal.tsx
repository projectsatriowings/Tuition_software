import React, { useState } from 'react';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { mobileApiFetch } from '../../../services/api';

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
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Institute name is required.');
      return;
    }
    if (!adminFullName.trim()) {
      Alert.alert('Validation Error', 'Academic Admin full name is required.');
      return;
    }
    if (!adminEmail.trim()) {
      Alert.alert('Validation Error', 'Academic Admin login email is required.');
      return;
    }
    if (!adminInitialPassword || adminInitialPassword.length < 8) {
      Alert.alert('Validation Error', 'Admin password must be at least 8 characters.');
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
        body: payload,
      });

      if (res.success) {
        Alert.alert(
          'Institute Created Successfully',
          `Tenant '${name}' has been provisioned.\nAdmin Login: ${adminEmail.trim().toLowerCase()}`
        );
        handleClose();
        onSuccess();
      } else {
        Alert.alert('Creation Failed', res.error || 'Failed to create institute');
      }
    } catch (e: any) {
      Alert.alert('Network Error', e.message || 'Could not connect to server.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
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
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
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

            <Text style={styles.fieldLabel}>Contact Phone (Optional)</Text>
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
              style={styles.textInput}
              placeholder="e.g. 124 Main Street, Chennai"
              placeholderTextColor="#8D6E63"
              value={address}
              onChangeText={setAddress}
            />

            {/* Academic Admin Section */}
            <Text style={[styles.sectionHeading, { marginTop: 14 }]}>
              ACADEMIC ADMIN PROVISIONING
            </Text>

            <Text style={styles.fieldLabel}>Admin Full Name *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Dr. Ramesh Kumar"
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
            <TouchableOpacity
              onPress={handleClose}
              style={styles.cancelBtn}
              disabled={submitting}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCreate}
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Provision Institute</Text>
              )}
            </TouchableOpacity>
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
  formScroll: {
    maxHeight: 400,
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8D6E63',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4E342E',
    marginTop: 6,
    marginBottom: 3,
  },
  textInput: {
    backgroundColor: '#FAF7F5',
    borderWidth: 1,
    borderColor: '#D7CCC8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    fontSize: 13,
    color: '#2D1E18',
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F5ECE8',
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  cancelBtnText: {
    fontSize: 12,
    color: '#6D4C41',
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: '#4E342E',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});

