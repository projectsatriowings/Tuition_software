import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  Animated,
} from 'react-native';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react-native';
import { themeTokens } from '@tuition/shared';
import { useReducedMotion, motionTokens } from '../../theme/motion';

export interface MobileInputProps extends TextInputProps {
  label?: string;
  error?: string | null;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  required?: boolean;
  isValid?: boolean;
  showCharCount?: boolean;
}

export const MobileInput: React.FC<MobileInputProps> = ({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  containerStyle,
  required,
  secureTextEntry,
  isValid,
  showCharCount,
  value,
  maxLength,
  ...props
}) => {
  const reducedMotion = useReducedMotion();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Focus glow & border animation driver
  const focusAnim = useRef(new Animated.Value(0)).current;
  // Validation checkmark pop driver
  const checkAnim = useRef(new Animated.Value(isValid ? 1 : 0)).current;
  // Eye icon fade driver
  const eyeFadeAnim = useRef(new Animated.Value(1)).current;

  const isPassword = !!secureTextEntry;
  const isActualSecure = isPassword && !showPassword;

  // Handle focus animation
  useEffect(() => {
    if (reducedMotion) {
      focusAnim.setValue(isFocused ? 1 : 0);
      return;
    }
    Animated.timing(focusAnim, {
      toValue: isFocused ? 1 : 0,
      duration: motionTokens.duration.fast,
      useNativeDriver: false,
    }).start();
  }, [isFocused, reducedMotion, focusAnim]);

  // Handle live validation checkmark pop
  useEffect(() => {
    if (isValid) {
      if (reducedMotion) {
        checkAnim.setValue(1);
      } else {
        checkAnim.setValue(0.3);
        Animated.spring(checkAnim, {
          toValue: 1,
          friction: 4,
          tension: 70,
          useNativeDriver: true,
        }).start();
      }
    } else {
      checkAnim.setValue(0);
    }
  }, [isValid, reducedMotion, checkAnim]);

  // Handle password toggle
  const togglePasswordVisibility = () => {
    if (!reducedMotion) {
      Animated.sequence([
        Animated.timing(eyeFadeAnim, {
          toValue: 0.3,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.timing(eyeFadeAnim, {
          toValue: 1,
          duration: 90,
          useNativeDriver: true,
        }),
      ]).start();
    }
    setShowPassword((prev) => !prev);
  };

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [error ? '#DC2626' : '#D7CCC8', error ? '#DC2626' : '#4E342E'],
  });

  const backgroundColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#FAF7F2', '#FFFFFF'],
  });

  const charCount = typeof value === 'string' ? value.length : 0;
  const isNearLimit = maxLength ? charCount >= maxLength * 0.9 : false;
  const isAtLimit = maxLength ? charCount >= maxLength : false;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {required && <Text style={styles.requiredAsterisk}> *</Text>}
        </View>
      )}

      <Animated.View
        style={[
          styles.inputWrapper,
          {
            borderColor,
            backgroundColor,
          },
          isFocused && styles.inputWrapperFocusedGlow,
          !!error && styles.inputWrapperError,
          props.editable === false && styles.inputWrapperDisabled,
        ]}
      >
        {leftIcon && <View style={styles.iconContainer}>{leftIcon}</View>}

        <TextInput
          style={[styles.input, props.style]}
          placeholderTextColor="#8D6E63"
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          secureTextEntry={isActualSecure}
          value={value}
          maxLength={maxLength}
          {...props}
        />

        {/* Live Validation Checkmark */}
        {isValid && !isPassword && !rightIcon && (
          <Animated.View
            style={[
              styles.checkWrap,
              {
                transform: [{ scale: checkAnim }],
                opacity: checkAnim,
              },
            ]}
          >
            <CheckCircle2 size={18} color="#15803D" />
          </Animated.View>
        )}

        {/* Password Reveal Toggle */}
        {isPassword ? (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={togglePasswordVisibility}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            <Animated.View style={{ opacity: eyeFadeAnim }}>
              {showPassword ? (
                <EyeOff size={18} color="#4E342E" />
              ) : (
                <Eye size={18} color="#8D6E63" />
              )}
            </Animated.View>
          </TouchableOpacity>
        ) : (
          rightIcon && <View style={styles.iconContainer}>{rightIcon}</View>
        )}
      </Animated.View>

      {/* Helper / Error & Char Counter Row */}
      <View style={styles.bottomRow}>
        <View style={styles.messageWrap}>
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : hint ? (
            <Text style={styles.hintText}>{hint}</Text>
          ) : null}
        </View>

        {(showCharCount || maxLength) && maxLength && (
          <Text
            style={[
              styles.charCounter,
              isNearLimit && styles.charCounterNearLimit,
              isAtLimit && styles.charCounterLimit,
            ]}
          >
            {charCount}/{maxLength}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: themeTokens.typography.sizes.sm,
    fontWeight: themeTokens.typography.weights.semibold,
    color: '#4E342E',
  },
  requiredAsterisk: {
    color: '#DC2626',
    fontSize: themeTokens.typography.sizes.sm,
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  inputWrapperFocusedGlow: {
    shadowColor: '#4E342E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 3,
  },
  inputWrapperError: {
    borderColor: '#DC2626',
  },
  inputWrapperDisabled: {
    backgroundColor: '#EFEBE9',
    borderColor: '#D7CCC8',
    opacity: 0.7,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#2D1E18',
    paddingVertical: 10,
  },
  iconContainer: {
    marginRight: 8,
  },
  iconButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkWrap: {
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 2,
  },
  messageWrap: {
    flex: 1,
    paddingRight: 8,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '500',
  },
  hintText: {
    color: '#8D6E63',
    fontSize: 12,
  },
  charCounter: {
    fontSize: 11,
    color: '#8D6E63',
    fontWeight: '600',
  },
  charCounterNearLimit: {
    color: '#D97706',
  },
  charCounterLimit: {
    color: '#DC2626',
    fontWeight: '700',
  },
});
