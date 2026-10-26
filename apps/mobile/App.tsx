import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, SafeAreaView, StatusBar } from 'react-native';
import { AuthProvider, useMobileAuth } from './src/context/AuthContext';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { ChangePasswordScreen } from './src/screens/auth/ChangePasswordScreen';
import { StudentScreen } from './src/screens/student/StudentScreen';
import { ParentScreen } from './src/screens/parent/ParentScreen';
import { StaffScreen } from './src/screens/staff/StaffScreen';
import { AdminScreen } from './src/screens/academic_admin/AdminScreen';
import { SuperAdminScreen } from './src/screens/super_admin/SuperAdminScreen';

const RootNavigator: React.FC = () => {
  const { user, isAuthenticated, isLoading, needsPasswordChange } = useMobileAuth();

  if (isLoading) {
    return (
      <View style={styles.splashContainer}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoIcon}>⚡</Text>
        </View>
        <Text style={styles.splashTitle}>TuitionOS</Text>
        <Text style={styles.splashSub}>Enterprise Tuition Management</Text>
        <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 24 }} />
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#030712" />
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#030712',
  },
  splashContainer: {
    flex: 1,
    backgroundColor: '#030712',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  logoIcon: {
    fontSize: 36,
  },
  splashTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: 16,
    letterSpacing: -0.5,
  },
  splashSub: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unknownRoleText: {
    color: '#f87171',
    fontSize: 16,
  },
});
