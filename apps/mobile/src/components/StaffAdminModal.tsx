import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { themeTokens } from '@tuition/shared';
import { mobileApiFetch } from '../services/api';
import { MobileButton, MobileInput } from './ui';
import { Badge } from './Badge';

export interface StaffAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  batches: any[];
  onStaffCreated?: () => void;
}

export const StaffAdminModal: React.FC<StaffAdminModalProps> = ({
  isOpen,
  onClose,
  batches,
  onStaffCreated,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [password, setPassword] = useState('Password#123');
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [loadingCode, setLoadingCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdResult, setCreatedResult] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFullName('');
      setEmail('');
      setPhone('');
      setSelectedBatchIds([]);
      setCreatedResult(null);

      // Fetch auto-generated staff code
      setLoadingCode(true);
      mobileApiFetch('/staff/next-code')
        .then((res) => {
          if (res.success && res.data?.nextCode) {
            setEmployeeCode(res.data.nextCode);
          } else {
            setEmployeeCode(`STF-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
          }
        })
        .catch(() => {
          setEmployeeCode(`STF-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
        })
        .finally(() => setLoadingCode(false));
    }
  }, [isOpen]);

  const toggleBatch = (batchId: string) => {
    setSelectedBatchIds((prev) =>
      prev.includes(batchId) ? prev.filter((id) => id !== batchId) : [...prev, batchId]
    );
  };

  const handleCreateStaff = async () => {
    if (!fullName.trim()) {
      Alert.alert('Required', 'Please enter faculty full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Required', 'Please enter a valid official email address.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await mobileApiFetch('/staff', {
        method: 'POST',
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          employeeCode: employeeCode.trim() || undefined,
          temporaryPassword: password,
          batchIds: selectedBatchIds,
        }),
      });

      if (res.success && res.data) {
        setCreatedResult({
          fullName,
          email,
          employeeCode,
          password,
        });
        onStaffCreated?.();
      } else {
        Alert.alert('Creation Failed', res.error || 'Failed to create faculty member.');
      }
    } catch (e: any) {
      Alert.alert('Network Error', e.message || 'Unable to connect to server.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Add Faculty Member</Text>
            <Text style={styles.headerSubtitle}>Assign credentials, employee code & batches</Text>
          </View>
        </View>

        {createdResult ? (
          /* CREDENTIALS SUCCESS CARD */
          <ScrollView contentContainerStyle={styles.successContainer}>
            <View style={styles.successCard}>
              <View style={styles.checkCircle}>
                <Text style={styles.checkIcon}>✓</Text>
              </View>
              <Text style={styles.successTitle}>Faculty Registered!</Text>
              <Text style={styles.successSub}>
                Staff profile and initial login credentials have been configured.
              </Text>

              <View style={styles.credBox}>
                <View style={styles.credRow}>
                  <Text style={styles.credLabel}>Full Name</Text>
                  <Text style={styles.credValue}>{createdResult.fullName}</Text>
                </View>
                <View style={styles.credRow}>
                  <Text style={styles.credLabel}>Login Email</Text>
                  <Text style={styles.credValue}>{createdResult.email}</Text>
                </View>
                <View style={styles.credRow}>
                  <Text style={styles.credLabel}>Staff ID Code</Text>
                  <Text style={styles.credValue}>{createdResult.employeeCode}</Text>
                </View>
                <View style={styles.credRow}>
                  <Text style={styles.credLabel}>Initial Password</Text>
                  <Text style={[styles.credValue, { fontFamily: 'monospace', fontWeight: 'bold' }]}>
                    {createdResult.password}
                  </Text>
                </View>
              </View>

              <Text style={styles.securityNote}>
                🔒 The faculty member can log in on web or mobile with this email and initial password, and will be prompted to change their password on first sign-in.
              </Text>
            </View>

            <MobileButton
              title="Close & Return to Staff Directory"
              onPress={onClose}
              variant="primary"
              size="lg"
              fullWidth
              style={{ marginTop: 24 }}
            />
          </ScrollView>
        ) : (
          /* CREATION FORM */
          <ScrollView contentContainerStyle={styles.formContainer}>
            <MobileInput
              label="Full Name"
              placeholder="e.g. Dr. Rajesh Sharma"
              value={fullName}
              onChangeText={setFullName}
              required
            />

            <MobileInput
              label="Official Email"
              placeholder="rajesh.sharma@institution.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              required
            />

            <MobileInput
              label="Phone Number"
              placeholder="+91 98765 43210"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            <View style={styles.codeRow}>
              <View style={{ flex: 1 }}>
                <MobileInput
                  label="Employee Code"
                  placeholder="STF-2026-001"
                  value={employeeCode}
                  onChangeText={setEmployeeCode}
                  required
                />
              </View>
              {loadingCode && (
                <View style={styles.codeSpinner}>
                  <ActivityIndicator size="small" color={themeTokens.colors.primary} />
                </View>
              )}
            </View>

            <MobileInput
              label="Initial Password"
              placeholder="Password#123"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              hint="Must be at least 8 characters with a capital letter and number."
            />

            {/* Batch Assignments */}
            <View style={styles.batchSection}>
              <Text style={styles.sectionLabel}>Assign Academic Batches</Text>
              <Text style={styles.sectionHint}>Select batches this faculty member will teach and manage.</Text>

              <View style={styles.batchChipsContainer}>
                {batches.length === 0 ? (
                  <Text style={styles.noBatchesText}>No batches created yet.</Text>
                ) : (
                  batches.map((b) => {
                    const isSelected = selectedBatchIds.includes(b.id);
                    return (
                      <TouchableOpacity
                        key={b.id}
                        onPress={() => toggleBatch(b.id)}
                        style={[styles.batchChip, isSelected && styles.batchChipSelected]}
                      >
                        <Text style={[styles.batchChipText, isSelected && styles.batchChipTextSelected]}>
                          {isSelected ? '✓ ' : '+ '}
                          {b.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            </View>

            <MobileButton
              title="Register Faculty Member"
              onPress={handleCreateStaff}
              variant="primary"
              size="lg"
              loading={submitting}
              fullWidth
              style={{ marginTop: 24, marginBottom: 40 }}
            />
          </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: themeTokens.colors.cocoa,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: themeTokens.colors.cocoa,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  closeBtnText: {
    color: themeTokens.colors.textLight,
    fontSize: 16,
    fontWeight: '700',
  },
  headerCenter: {
    flex: 1,
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
  formContainer: {
    padding: 20,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeSpinner: {
    marginLeft: 10,
    marginTop: 10,
  },
  batchSection: {
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: themeTokens.typography.sizes.sm,
    fontWeight: '700',
    color: themeTokens.colors.textSecondary,
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: themeTokens.typography.sizes.xs,
    color: themeTokens.colors.textMuted,
    marginBottom: 10,
  },
  batchChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  batchChip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: themeTokens.radii.full,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    backgroundColor: themeTokens.colors.surface,
  },
  batchChipSelected: {
    backgroundColor: themeTokens.colors.espresso,
    borderColor: themeTokens.colors.espresso,
  },
  batchChipText: {
    fontSize: themeTokens.typography.sizes.xs,
    fontWeight: '600',
    color: themeTokens.colors.textSecondary,
  },
  batchChipTextSelected: {
    color: themeTokens.colors.textLight,
  },
  noBatchesText: {
    fontSize: themeTokens.typography.sizes.xs,
    color: themeTokens.colors.textSubtle,
    fontStyle: 'italic',
  },
  successContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successCard: {
    width: '100%',
    backgroundColor: themeTokens.colors.surface,
    borderRadius: themeTokens.radii.xl,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    shadowColor: '#3E2723',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  checkCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: themeTokens.colors.successBg,
    borderWidth: 2,
    borderColor: themeTokens.colors.successBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  checkIcon: {
    fontSize: 30,
    fontWeight: '900',
    color: themeTokens.colors.success,
  },
  successTitle: {
    fontSize: themeTokens.typography.sizes.xl,
    fontWeight: '900',
    color: themeTokens.colors.textPrimary,
  },
  successSub: {
    fontSize: themeTokens.typography.sizes.xs,
    color: themeTokens.colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
  },
  credBox: {
    width: '100%',
    backgroundColor: themeTokens.colors.background,
    borderRadius: themeTokens.radii.lg,
    padding: 16,
    marginTop: 20,
    gap: 10,
  },
  credRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  credLabel: {
    fontSize: themeTokens.typography.sizes.xs,
    color: themeTokens.colors.textMuted,
    fontWeight: '600',
  },
  credValue: {
    fontSize: themeTokens.typography.sizes.sm,
    fontWeight: '700',
    color: themeTokens.colors.textPrimary,
  },
  securityNote: {
    fontSize: 11,
    color: themeTokens.colors.textSubtle,
    marginTop: 16,
    lineHeight: 16,
    textAlign: 'center',
  },
});

