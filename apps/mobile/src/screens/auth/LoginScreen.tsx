import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useMobileAuth, MobileInstitute } from '../../context/AuthContext';
import { AppConfig } from '../../config/index';
import { themeTokens } from '@tuition/shared';

interface LoginScreenProps {
  onSuccess?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = () => {
  const {
    login,
    customHost,
    setCustomHost,
    pendingAuthSession,
    selectInstituteAndCompleteLogin,
    cancelPendingAuth,
  } = useMobileAuth();

  // Strict requirement: Start with empty fields, no hardcoded or prefilled credentials
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Advanced server connectivity configuration
  const [showHostConfig, setShowHostConfig] = useState(false);
  const [tempHost, setTempHost] = useState(customHost || AppConfig.defaultApiBaseUrl);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Please enter your email/phone and password.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    // Standard login does not require institute code; backend resolves active institute automatically
    const res = await login(username.trim(), password);

    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || 'Invalid credentials or inactive account.');
    }
  };

  const handleSaveHost = () => {
    if (tempHost.trim()) {
      setCustomHost(tempHost.trim());
      setShowHostConfig(false);
      setErrorMsg(null);
    }
  };

  // If user belongs to multiple active institutes, render multi-institute selection screen
  if (pendingAuthSession) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.brandHeader}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoText}>T</Text>
            </View>
            <Text style={styles.brandTitle}>Select Institute</Text>
            <Text style={styles.brandTagline}>Your account is enrolled in multiple active institutes</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionHeading}>Choose Institute Context</Text>
            <Text style={styles.sectionSub}>Tap the institute you wish to access for this session:</Text>

            {pendingAuthSession.memberships.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={styles.instituteCard}
                activeOpacity={0.8}
                onPress={() => selectInstituteAndCompleteLogin(m.institute)}
              >
                <View style={styles.instituteIconContainer}>
                  <Text style={styles.instituteIconText}>🏛️</Text>
                </View>
                <View style={styles.instituteInfo}>
                  <Text style={styles.instituteName}>{m.institute.name}</Text>
                  <View style={styles.instituteBadgeRow}>
                    <View style={styles.codeBadge}>
                      <Text style={styles.codeBadgeText}>{m.institute.code}</Text>
                    </View>
                    <Text style={styles.instituteRole}>{m.role}</Text>
                  </View>
                </View>
                <Text style={styles.chevronText}>›</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.secondaryButton} onPress={cancelPendingAuth}>
              <Text style={styles.secondaryButtonText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Brand Header */}
        <View style={styles.brandHeader}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>T</Text>
          </View>
          <Text style={styles.brandTitle}>TuitionOS Enterprise</Text>
          <Text style={styles.brandTagline}>Multi-Institute Tuition Management System</Text>
        </View>

        {/* Login Card */}
        <View style={styles.card}>
          <Text style={styles.formTitle}>Sign In</Text>
          <Text style={styles.formSubtitle}>Access your portal using your registered credentials</Text>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Email / Phone / Identifier Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email or Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. name@apexacademy.com"
              placeholderTextColor={themeTokens.colors.textSubtle}
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                if (errorMsg) setErrorMsg(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!loading}
            />
          </View>

          {/* Password Input with Visibility Toggle */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your account password"
                placeholderTextColor={themeTokens.colors.textSubtle}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errorMsg) setErrorMsg(null);
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.toggleBtn}
                accessibilityLabel="Toggle password visibility"
              >
                <Text style={styles.toggleBtnText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign In Action Button */}
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={themeTokens.colors.textLight} size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Security & Access Notice */}
          <View style={styles.securityNotice}>
            <Text style={styles.securityNoticeText}>
              🛡️ Protected by Enterprise Role-Based Tenant Isolation
            </Text>
          </View>

          {/* Host & Server Settings (Collapsible) */}
          <View style={styles.serverSettingsSection}>
            <TouchableOpacity
              onPress={() => setShowHostConfig(!showHostConfig)}
              style={styles.serverSettingsToggle}
            >
              <Text style={styles.serverSettingsToggleText}>
                ⚙️ {showHostConfig ? 'Hide Server URL' : 'Server Connection Config'}
              </Text>
            </TouchableOpacity>

            {showHostConfig ? (
              <View style={styles.hostConfigCard}>
                <Text style={styles.hostConfigLabel}>Active API Base Endpoint:</Text>
                <TextInput
                  style={styles.hostInput}
                  value={tempHost}
                  onChangeText={setTempHost}
                  placeholder="https://your-domain.com/api"
                  placeholderTextColor={themeTokens.colors.textSubtle}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity style={styles.hostSaveButton} onPress={handleSaveHost}>
                  <Text style={styles.hostSaveButtonText}>Save API Server URL</Text>
                </TouchableOpacity>
                <Text style={styles.hostHelpText}>
                  For physical phone testing on local network, use: http://192.168.1.5:5000/api
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footerText}>
          TuitionOS Enterprise • Web & Mobile Parity Edition
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeTokens.colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 40 : 28,
    paddingBottom: 40,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: themeTokens.colors.espresso,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: themeTokens.colors.taupe,
    shadowColor: themeTokens.colors.espresso,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '900',
    color: themeTokens.colors.textLight,
  },
  brandTitleText: {
    margin: 0,
    padding: 0,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: themeTokens.colors.espresso,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  brandTagline: {
    fontSize: 13,
    color: themeTokens.colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    backgroundColor: themeTokens.colors.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    shadowColor: themeTokens.colors.espresso,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: themeTokens.colors.textPrimary,
  },
  formSubtitle: {
    fontSize: 13,
    color: themeTokens.colors.textMuted,
    marginTop: 4,
    marginBottom: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeTokens.colors.errorBg,
    borderColor: themeTokens.colors.errorBorder,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    color: themeTokens.colors.error,
    fontSize: 13,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
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
    fontSize: 15,
    color: themeTokens.colors.textPrimary,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeTokens.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    borderRadius: 10,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: themeTokens.colors.textPrimary,
  },
  toggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: themeTokens.colors.primary,
  },
  primaryButton: {
    backgroundColor: themeTokens.colors.espresso,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: themeTokens.colors.espresso,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: themeTokens.colors.textLight,
    fontSize: 16,
    fontWeight: '700',
  },
  securityNotice: {
    marginTop: 18,
    alignItems: 'center',
  },
  securityNoticeText: {
    fontSize: 11,
    color: themeTokens.colors.taupe,
    fontWeight: '500',
  },
  serverSettingsSection: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: themeTokens.colors.borderSubtle,
    paddingTop: 16,
  },
  serverSettingsToggle: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  serverSettingsToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: themeTokens.colors.primary,
  },
  hostConfigCard: {
    marginTop: 10,
    padding: 12,
    backgroundColor: themeTokens.colors.surfaceMuted,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
  },
  hostConfigLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: themeTokens.colors.textSecondary,
    marginBottom: 6,
  },
  hostInput: {
    backgroundColor: themeTokens.colors.surface,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: themeTokens.colors.textPrimary,
    marginBottom: 8,
  },
  hostSaveButton: {
    backgroundColor: themeTokens.colors.cocoa,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  hostSaveButtonText: {
    color: themeTokens.colors.textLight,
    fontSize: 13,
    fontWeight: '600',
  },
  hostHelpText: {
    fontSize: 11,
    color: themeTokens.colors.textMuted,
    marginTop: 6,
    lineHeight: 15,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: themeTokens.colors.textPrimary,
  },
  sectionSub: {
    fontSize: 13,
    color: themeTokens.colors.textMuted,
    marginTop: 4,
    marginBottom: 16,
  },
  instituteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: themeTokens.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    marginBottom: 12,
  },
  instituteIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: themeTokens.colors.beige,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  instituteIconText: {
    fontSize: 20,
  },
  instituteInfo: {
    flex: 1,
  },
  instituteName: {
    fontSize: 15,
    fontWeight: '700',
    color: themeTokens.colors.textPrimary,
  },
  instituteBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  codeBadge: {
    backgroundColor: themeTokens.colors.espresso,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8,
  },
  codeBadgeText: {
    color: themeTokens.colors.textLight,
    fontSize: 10,
    fontWeight: '700',
  },
  instituteRole: {
    fontSize: 11,
    color: themeTokens.colors.textMuted,
    fontWeight: '500',
  },
  chevronText: {
    fontSize: 22,
    color: themeTokens.colors.taupe,
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    borderRadius: 10,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: themeTokens.colors.textSecondary,
  },
  footerText: {
    textAlign: 'center',
    fontSize: 11,
    color: themeTokens.colors.taupe,
    marginTop: 24,
  },
});
