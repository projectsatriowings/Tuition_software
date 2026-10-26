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
import { useMobileAuth } from '../../context/AuthContext';
import { AppConfig } from '../../config/index';

interface LoginScreenProps {
  onSuccess?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = () => {
  const { login, customHost, setCustomHost } = useMobileAuth();

  const [instituteCode, setInstituteCode] = useState('INST001');
  const [username, setUsername] = useState('director@apex.edu');
  const [password, setPassword] = useState('ApexSecureAdmin2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showHostConfig, setShowHostConfig] = useState(false);
  const [tempHost, setTempHost] = useState(customHost || AppConfig.defaultApiBaseUrl);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Please enter both username and password');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const res = await login(
      username.trim(),
      password.trim(),
      instituteCode.trim() ? instituteCode.trim() : undefined
    );

    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || 'Authentication failed. Please check credentials.');
    }
  };

  const setDemoRole = (role: 'ACADEMIC_ADMIN' | 'STAFF' | 'STUDENT' | 'PARENT' | 'SUPER_ADMIN') => {
    setErrorMsg(null);
    switch (role) {
      case 'SUPER_ADMIN':
        setInstituteCode('');
        setUsername('superadmin@tuitionos.internal');
        setPassword('AdminSecurePassword#2026');
        break;
      case 'ACADEMIC_ADMIN':
        setInstituteCode('INST001');
        setUsername('director@apex.edu');
        setPassword('ApexSecureAdmin2026!');
        break;
      case 'STAFF':
        setInstituteCode('INST001');
        setUsername('sharma.physics@apex.edu');
        setPassword('SharmaPhysics@2026');
        break;
      case 'STUDENT':
        setInstituteCode('INST001');
        setUsername('aarav.patel@apex.edu');
        setPassword('AaravPatel@2026');
        break;
      case 'PARENT':
        setInstituteCode('INST001');
        setUsername('rajesh.patel@parent.apex.edu');
        setPassword('RajeshPatel@2026');
        break;
    }
  };

  const handleSaveHost = () => {
    if (tempHost.trim()) {
      setCustomHost(tempHost.trim());
      setShowHostConfig(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Brand Header */}
        <View style={styles.brandHeader}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoIcon}>⚡</Text>
          </View>
          <Text style={styles.brandTitle}>TuitionOS Mobile</Text>
          <Text style={styles.brandTagline}>Enterprise Android Student & Institute Portal</Text>
        </View>

        {/* Quick Demo Role Switcher */}
        <View style={styles.demoSection}>
          <Text style={styles.demoTitle}>QUICK SELECT DEMO ROLE:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.demoChips}>
            <TouchableOpacity onPress={() => setDemoRole('STUDENT')} style={styles.demoChip}>
              <Text style={styles.demoChipText}>🎓 Student</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setDemoRole('PARENT')} style={styles.demoChip}>
              <Text style={styles.demoChipText}>👨‍👧 Parent</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setDemoRole('STAFF')} style={styles.demoChip}>
              <Text style={styles.demoChipText}>👨‍🏫 Staff</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setDemoRole('ACADEMIC_ADMIN')} style={styles.demoChip}>
              <Text style={styles.demoChipText}>🏛️ Admin</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setDemoRole('SUPER_ADMIN')} style={styles.demoChip}>
              <Text style={styles.demoChipText}>👑 Super</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Form Container */}
        <View style={styles.card}>
          <Text style={styles.formTitle}>Sign in to your account</Text>

          {errorMsg && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠ {errorMsg}</Text>
            </View>
          )}

          {/* Institute Code */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Institute Code (Optional for Super Admin)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. INST001"
              placeholderTextColor="#64748b"
              value={instituteCode}
              onChangeText={setInstituteCode}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>

          {/* Username / Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Username or Email</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. director@apex.edu"
              placeholderTextColor="#64748b"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>Password</Text>
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.toggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="••••••••••••"
              placeholderTextColor="#64748b"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.loginBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* API Server Config Toggle */}
          <TouchableOpacity
            onPress={() => setShowHostConfig(!showHostConfig)}
            style={styles.serverToggle}
          >
            <Text style={styles.serverToggleText}>
              🌐 API Server: {customHost || AppConfig.defaultApiBaseUrl}
            </Text>
          </TouchableOpacity>

          {showHostConfig && (
            <View style={styles.hostConfigBox}>
              <Text style={styles.hostConfigLabel}>Backend API Base URL:</Text>
              <TextInput
                style={[styles.input, styles.hostInput]}
                value={tempHost}
                onChangeText={setTempHost}
                placeholder="http://10.0.2.2:5000/api"
                placeholderTextColor="#64748b"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.hostBtnRow}>
                <TouchableOpacity
                  onPress={() => {
                    setTempHost('http://10.0.2.2:5000/api');
                  }}
                  style={styles.presetBtn}
                >
                  <Text style={styles.presetBtnText}>Emulator (10.0.2.2)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setTempHost('http://localhost:5000/api');
                  }}
                  style={styles.presetBtn}
                >
                  <Text style={styles.presetBtnText}>Localhost</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSaveHost} style={styles.saveHostBtn}>
                  <Text style={styles.saveHostBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <Text style={styles.footerNote}>
          TuitionOS v1.0 Mobile &bull; Phase 7 Production Release
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 50,
    paddingBottom: 40,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  logoIcon: {
    fontSize: 30,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },
  demoSection: {
    marginBottom: 16,
  },
  demoTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  demoChips: {
    gap: 8,
    paddingBottom: 4,
  },
  demoChip: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  demoChipText: {
    color: '#d1d5db',
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 16,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#f87171',
    fontSize: 12,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 6,
  },
  toggleText: {
    fontSize: 12,
    color: '#818cf8',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#090d16',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 14,
  },
  loginBtn: {
    backgroundColor: '#4f46e5',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  loginBtnDisabled: {
    opacity: 0.7,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  serverToggle: {
    marginTop: 18,
    alignItems: 'center',
  },
  serverToggleText: {
    color: '#64748b',
    fontSize: 11,
    textDecorationLine: 'underline',
  },
  hostConfigBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#090d16',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  hostConfigLabel: {
    color: '#94a3b8',
    fontSize: 11,
    marginBottom: 6,
  },
  hostInput: {
    paddingVertical: 8,
    fontSize: 12,
    marginBottom: 8,
  },
  hostBtnRow: {
    flexDirection: 'row',
    gap: 6,
  },
  presetBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  presetBtnText: {
    color: '#94a3b8',
    fontSize: 10,
  },
  saveHostBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  saveHostBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  footerNote: {
    color: '#475569',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 24,
  },
});
