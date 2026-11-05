import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react-native';
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ToastType } from '@tuition/shared';
import { useReducedMotion, motionTokens, PressableScale } from '../theme/motion';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  count: number;
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
  const reducedMotion = useReducedMotion();

  const translateY = useRef(new Animated.Value(-24)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(1)).current;
  const badgeScale = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastToastRef = useRef<{ message: string; type: ToastType; time: number; count: number } | null>(null);

  const hideToast = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (reducedMotion) {
      Animated.timing(opacity, {
        toValue: 0,
        duration: motionTokens.duration.fast,
        useNativeDriver: true,
      }).start(() => {
        setCurrentToast(null);
        lastToastRef.current = null;
      });
      return;
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -20,
        duration: 150,
        easing: motionTokens.easing.inOut,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 150,
        easing: motionTokens.easing.inOut,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentToast(null);
      lastToastRef.current = null;
    });
  }, [reducedMotion, translateY, opacity]);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration: number = 2800) => {
      const now = Date.now();

      // Duplicate detection within 3500ms: merge into one toast with incrementing count pill
      if (
        lastToastRef.current &&
        lastToastRef.current.message === message &&
        lastToastRef.current.type === type &&
        now - lastToastRef.current.time < 3500
      ) {
        const nextCount = (lastToastRef.current.count || 1) + 1;
        lastToastRef.current = { message, type, time: now, count: nextCount };

        setCurrentToast((prev) => (prev ? { ...prev, count: nextCount } : null));

        if (!reducedMotion) {
          // Playful spring pulse on merge count
          badgeScale.setValue(0.6);
          cardScale.setValue(1.03);
          Animated.parallel([
            Animated.spring(badgeScale, {
              toValue: 1,
              friction: 4,
              tension: 60,
              useNativeDriver: true,
            }),
            Animated.spring(cardScale, {
              toValue: 1,
              friction: 6,
              tension: 50,
              useNativeDriver: true,
            }),
          ]).start();
        }

        if (timerRef.current) clearTimeout(timerRef.current);
        if (duration > 0) {
          timerRef.current = setTimeout(() => {
            hideToast();
          }, duration);
        }
        return;
      }

      lastToastRef.current = { message, type, time: now, count: 1 };

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      const toast: ToastMessage = {
        id: `${now}`,
        message,
        type,
        duration,
        count: 1,
      };

      setCurrentToast(toast);
      badgeScale.setValue(1);
      cardScale.setValue(1);

      if (reducedMotion) {
        translateY.setValue(0);
        opacity.setValue(0);
        Animated.timing(opacity, {
          toValue: 1,
          duration: motionTokens.duration.fast,
          useNativeDriver: true,
        }).start();
      } else {
        translateY.setValue(-24);
        opacity.setValue(0);
        Animated.parallel([
          Animated.spring(translateY, {
            toValue: 0,
            friction: 7,
            tension: 50,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 180,
            easing: motionTokens.easing.standard,
            useNativeDriver: true,
          }),
        ]).start();
      }

      if (duration > 0) {
        timerRef.current = setTimeout(() => {
          hideToast();
        }, duration);
      }
    },
    [hideToast, reducedMotion, translateY, opacity, badgeScale, cardScale]
  );

  const success = useCallback((msg: string, d?: number) => showToast(msg, 'success', d), [showToast]);
  const error = useCallback((msg: string, d?: number) => showToast(msg, 'error', d), [showToast]);
  const warning = useCallback((msg: string, d?: number) => showToast(msg, 'warning', d), [showToast]);
  const info = useCallback((msg: string, d?: number) => showToast(msg, 'info', d), [showToast]);

  const renderIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} color="#15803D" />;
      case 'error':
        return <AlertCircle size={18} color="#B91C1C" />;
      case 'warning':
        return <AlertTriangle size={18} color="#B45309" />;
      default:
        return <Info size={18} color="#4E342E" />;
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      {currentToast && (
        <Animated.View
          style={[
            styles.toastWrapper,
            {
              top: Math.max(insets.top + 8, Platform.OS === 'android' ? 36 : 16),
              transform: [{ translateY }, { scale: cardScale }],
              opacity,
            },
          ]}
          pointerEvents="box-none"
        >
          <TouchableWithoutFeedback onPress={hideToast} accessibilityRole="alert">
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
                <View style={styles.iconContainer}>{renderIcon(currentToast.type)}</View>

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

                {currentToast.count > 1 && (
                  <Animated.View
                    style={[
                      styles.mergeBadge,
                      currentToast.type === 'success' && styles.mergeBadgeSuccess,
                      currentToast.type === 'error' && styles.mergeBadgeError,
                      currentToast.type === 'warning' && styles.mergeBadgeWarning,
                      { transform: [{ scale: badgeScale }] },
                    ]}
                  >
                    <Text
                      style={[
                        styles.mergeBadgeText,
                        currentToast.type === 'success' && styles.mergeBadgeTextSuccess,
                        currentToast.type === 'error' && styles.mergeBadgeTextError,
                        currentToast.type === 'warning' && styles.mergeBadgeTextWarning,
                      ]}
                    >
                      ×{currentToast.count}
                    </Text>
                  </Animated.View>
                )}

                <PressableScale
                  onPress={hideToast}
                  activeScale={0.88}
                  style={styles.dismissBtnWrapper}
                  accessibilityRole="button"
                  accessibilityLabel="Dismiss notification"
                >
                  <X
                    size={16}
                    color={
                      currentToast.type === 'success'
                        ? '#15803D'
                        : currentToast.type === 'error'
                        ? '#B91C1C'
                        : currentToast.type === 'warning'
                        ? '#B45309'
                        : '#5D4037'
                    }
                  />
                </PressableScale>
              </View>
            </View>
          </TouchableWithoutFeedback>
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
    maxWidth: 440,
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
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#2D1E18',
    lineHeight: 18,
  },
  mergeBadge: {
    backgroundColor: '#4E342E',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mergeBadgeSuccess: {
    backgroundColor: '#DCFCE7',
  },
  mergeBadgeError: {
    backgroundColor: '#FEE2E2',
  },
  mergeBadgeWarning: {
    backgroundColor: '#FEF3C7',
  },
  mergeBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  mergeBadgeTextSuccess: {
    color: '#15803D',
  },
  mergeBadgeTextError: {
    color: '#B91C1C',
  },
  mergeBadgeTextWarning: {
    color: '#B45309',
  },
  dismissBtnWrapper: {
    padding: 4,
    borderRadius: 8,
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
