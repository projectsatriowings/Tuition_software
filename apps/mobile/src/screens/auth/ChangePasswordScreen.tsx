import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useMobileAuth } from '../../context/AuthContext';
import { themeTokens } from '@tuition/shared';

export const ChangePasswordScreen: React.FC = () => {
  const { user, changePassword, logout } = useMobileAuth();

  // Defense-in-depth: Student and Parent credentials are staff-managed permanent credentials.
  // They should never render this screen.
  if (user?.role === 'STUDENT' || user?.role === 'PARENT') {
    return null;
  }

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMsg('All fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirm password do not match');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const res = await changePassword(currentPassword, newPassword);
    setLoading(false);

    if (res.success) {
      Alert.alert(
        'Success',
        'Password updated successfully. You will now be redirected to your dashboard.',
        [{ text: 'OK' }]
      );
    } else {
      setErrorMsg(res.error || 'Failed to update password');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Text style={styles.lockIcon}>🔒</Text>
        </View>

        <Text style={styles.title}>Update Your Password</Text>
        <Text style={styles.subtitle}>
          Hello {user?.fullName || 'there'}, security policy requires you to set a new password on your first sign in.
        </Text>

        {errorMsg && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Current Temporary Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            placeholder="Enter temporary password"
            placeholderTextColor={themeTokens.colors.textSubtle}
            value={currentPassword}
            onChangeText={setCurrentPassword}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>New Secure Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            placeholder="At least 8 characters"
            placeholderTextColor={themeTokens.colors.textSubtle}
            value={newPassword}
            onChangeText={setNewPassword}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Confirm New Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            placeholder="Repeat new password"
            placeholderTextColor={themeTokens.colors.textSubtle}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={themeTokens.colors.textLight} />
          ) : (
            <Text style={styles.submitBtnText}>Update Password & Continue</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutBtnText}>Cancel & Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeTokens.colors.background,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: themeTokens.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    padding: 24,
    shadowColor: themeTokens.colors.espresso,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: themeTokens.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  lockIcon: {
    fontSize: 26,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: themeTokens.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: themeTokens.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  errorBox: {
    backgroundColor: themeTokens.colors.errorBg,
    borderWidth: 1,
    borderColor: themeTokens.colors.errorBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: themeTokens.colors.error,
    fontSize: 13,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: themeTokens.colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: themeTokens.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: themeTokens.colors.textPrimary,
    fontSize: 14,
  },
  submitBtn: {
    backgroundColor: themeTokens.colors.espresso,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: themeTokens.colors.espresso,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: themeTokens.colors.textLight,
    fontWeight: '700',
    fontSize: 15,
  },
  logoutBtn: {
    marginTop: 16,
    alignItems: 'center',
  },
  logoutBtnText: {
    color: themeTokens.colors.taupe,
    fontSize: 13,
    fontWeight: '600',
  },
});
