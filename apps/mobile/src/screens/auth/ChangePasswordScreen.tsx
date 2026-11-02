import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useMobileAuth } from '../../context/AuthContext';
import { themeTokens } from '@tuition/shared';
import {
  FadeInView,
  SlideInView,
  PressableScale,
  useAndroidBackHandler,
} from '../../theme/motion';

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

  // Android hardware back button handler: prompt user before aborting
  const handleBackPress = useCallback(() => {
    Alert.alert(
      'Exit Setup?',
      'Are you sure you want to cancel and sign out? You will need to reset your password on next sign-in.',
      [
        { text: 'Stay', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ]
    );
    return true; // Consume the back event
  }, [logout]);

  useAndroidBackHandler(handleBackPress);

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
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <SlideInView distance={10} duration={240} style={styles.card}>
          <View style={styles.iconCircle}>
            <Text style={styles.lockIcon}>🔒</Text>
          </View>

          <Text style={styles.title}>Update Your Password</Text>
          <Text style={styles.subtitle}>
            Hello {user?.fullName || 'there'}, security policy requires you to set a new password on your first sign in.
          </Text>

          {errorMsg ? (
            <FadeInView duration={160} style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
            </FadeInView>
          ) : null}

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

          <PressableScale
            onPress={handleSubmit}
            disabled={loading}
            activeScale={0.97}
            style={[styles.submitBtn, loading && styles.btnDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Update Password & Continue"
          >
            {loading ? (
              <ActivityIndicator color={themeTokens.colors.textLight} />
            ) : (
              <Text style={styles.submitBtnText}>Update Password & Continue</Text>
            )}
          </PressableScale>

          <PressableScale
            onPress={logout}
            activeScale={0.98}
            style={styles.logoutBtn}
            accessibilityRole="button"
            accessibilityLabel="Cancel & Sign Out"
          >
            <Text style={styles.logoutBtnText}>Cancel & Sign Out</Text>
          </PressableScale>
        </SlideInView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: themeTokens.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
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
    color: themeTokens.colors.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: themeTokens.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  errorBox: {
    backgroundColor: themeTokens.colors.surfaceMuted,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: themeTokens.colors.error,
    marginBottom: 16,
  },
  errorText: {
    color: themeTokens.colors.error,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: themeTokens.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: themeTokens.colors.background,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    borderRadius: 10,
    padding: 12,
    color: themeTokens.colors.textPrimary,
    fontSize: 14,
  },
  submitBtn: {
    backgroundColor: themeTokens.colors.primary,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: themeTokens.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: themeTokens.colors.textLight,
    fontSize: 14,
    fontWeight: 'bold',
  },
  logoutBtn: {
    marginTop: 12,
    padding: 10,
    alignItems: 'center',
  },
  logoutBtnText: {
    color: themeTokens.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});
