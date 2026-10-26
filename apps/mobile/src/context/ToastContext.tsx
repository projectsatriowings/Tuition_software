import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ToastType, themeTokens } from '@tuition/shared';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentToast, setCurrentToast] = useState<ToastMessage | null>(null);
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentToast(null);
    });
  }, [translateY, opacity]);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration: number = 3500) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      const toast: ToastMessage = {
        id: `${Date.now()}`,
        message,
        type,
        duration,
      };

      setCurrentToast(toast);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      if (duration > 0) {
        timerRef.current = setTimeout(() => {
          hideToast();
        }, duration);
      }
    },
    [hideToast, translateY, opacity]
  );

  const success = useCallback((msg: string, d?: number) => showToast(msg, 'success', d), [showToast]);
  const error = useCallback((msg: string, d?: number) => showToast(msg, 'error', d), [showToast]);
  const warning = useCallback((msg: string, d?: number) => showToast(msg, 'warning', d), [showToast]);
  const info = useCallback((msg: string, d?: number) => showToast(msg, 'info', d), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      {currentToast && (
        <Animated.View
          style={[
            styles.toastWrapper,
            {
              top: Math.max(insets.top + 8, Platform.OS === 'android' ? 36 : 16),
              transform: [{ translateY }],
              opacity,
            },
          ]}
          pointerEvents="box-none"
        >
          <View
            style={[
              styles.toastCard,
              currentToast.type === 'success' && styles.successCard,
              currentToast.type === 'error' && styles.errorCard,
              currentToast.type === 'warning' && styles.warningCard,
              currentToast.type === 'info' && styles.infoCard,
            ]}
          >
            <View style={styles.contentRow}>
              <Text style={styles.badgeIcon}>
                {currentToast.type === 'success' ? '✓' : currentToast.type === 'error' ? '✕' : currentToast.type === 'warning' ? '⚠' : 'ℹ'}
              </Text>
              <Text
                style={[
                  styles.messageText,
                  currentToast.type === 'success' && styles.successText,
                  currentToast.type === 'error' && styles.errorText,
                  currentToast.type === 'warning' && styles.warningText,
                  currentToast.type === 'info' && styles.infoText,
                ]}
                numberOfLines={3}
              >
                {currentToast.message}
              </Text>
              <TouchableOpacity onPress={hideToast} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.dismissBtn}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

export const useMobileToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useMobileToast must be used within a ToastProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  toastWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 99999,
    alignItems: 'center',
  },
  toastCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FAF7F2',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: '#D7CCC8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badgeIcon: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4E342E',
  },
  messageText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#2D1E18',
    lineHeight: 18,
  },
  dismissBtn: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#8D6E63',
    paddingHorizontal: 4,
  },
  successCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  successText: {
    color: '#14532D',
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  errorText: {
    color: '#7F1D1D',
  },
  warningCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
  },
  warningText: {
    color: '#78350F',
  },
  infoCard: {
    backgroundColor: '#FDFBF7',
    borderColor: '#BCAAA4',
  },
  infoText: {
    color: '#3E2723',
  },
});
