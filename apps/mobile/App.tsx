import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, SafeAreaView, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useMobileAuth } from './src/context/AuthContext';
import { ToastProvider } from './src/context/ToastContext';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { ChangePasswordScreen } from './src/screens/auth/ChangePasswordScreen';
import { StudentScreen } from './src/screens/student/StudentScreen';
import { ParentScreen } from './src/screens/parent/ParentScreen';
import { StaffScreen } from './src/screens/staff/StaffScreen';
import { AdminScreen } from './src/screens/academic_admin/AdminScreen';
import { SuperAdminScreen } from './src/screens/super_admin/SuperAdminScreen';
import { themeTokens } from '@tuition/shared';

const RootNavigator: React.FC = () => {
  const { user, isAuthenticated, isLoading, needsPasswordChange } = useMobileAuth();

  if (isLoading) {
    return (
      <View style={styles.splashContainer}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoIcon}>T</Text>
        </View>
        <Text style={styles.splashTitle}>TuitionOS Enterprise</Text>
        <Text style={styles.splashSub}>Multi-Institute Tuition Management</Text>
        <ActivityIndicator size="large" color={themeTokens.colors.beige} style={{ marginTop: 24 }} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  if (needsPasswordChange) {
    return <ChangePasswordScreen />;
  }

  // Role-based routing
  switch (user?.role) {
    case 'STUDENT':
      return <StudentScreen />;
    case 'PARENT':
      return <ParentScreen />;
    case 'STAFF':
      return <StaffScreen />;
    case 'ACADEMIC_ADMIN':
      return <AdminScreen />;
    case 'SUPER_ADMIN':
      return <SuperAdminScreen />;
    default:
      return (
        <View style={styles.center}>
          <Text style={styles.unknownRoleText}>Unrecognized Role: {user?.role}</Text>
        </View>
      );
  }
};

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={themeTokens.colors.espresso} />
        <AuthProvider>
          <ToastProvider>
            <RootNavigator />
          </ToastProvider>
        </AuthProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: themeTokens.colors.background,
  },
  splashContainer: {
    flex: 1,
    backgroundColor: themeTokens.colors.espresso,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: themeTokens.colors.cocoa,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: themeTokens.colors.taupe,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  logoIcon: {
    fontSize: 36,
    fontWeight: '900',
    color: themeTokens.colors.textLight,
  },
  splashTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: themeTokens.colors.textLight,
    marginTop: 18,
    letterSpacing: -0.5,
  },
  splashSub: {
    fontSize: 14,
    color: themeTokens.colors.textLightMuted,
    marginTop: 6,
    fontWeight: '500',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: themeTokens.colors.background,
  },
  unknownRoleText: {
    color: themeTokens.colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
});
