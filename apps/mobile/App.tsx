import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
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

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Unhandled Root Error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Application Startup Error</Text>
          <Text style={styles.errorMessage}>
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={this.handleReset}>
            <Text style={styles.retryButtonText}>Reload Screen</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const RootNavigator: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useMobileAuth();

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

  // All roles proceed directly to their authorized dashboards without a forced password-update block
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
      <RootErrorBoundary>
        <SafeAreaView style={styles.safeArea}>
          <StatusBar barStyle="light-content" backgroundColor={themeTokens.colors.espresso} />
          <AuthProvider>
            <ToastProvider>
              <RootNavigator />
            </ToastProvider>
          </AuthProvider>
        </SafeAreaView>
      </RootErrorBoundary>
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
  errorContainer: {
    flex: 1,
    backgroundColor: '#3E2723',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 14,
    color: '#D7CCC8',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#6D4C41',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
