import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { themeTokens } from '@tuition/shared';

export interface MobileInputProps extends TextInputProps {
  label?: string;
  error?: string | null;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  required?: boolean;
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
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = !!secureTextEntry;
  const isActualSecure = isPassword && !showPassword;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {required && <Text style={styles.requiredAsterisk}> *</Text>}
        </View>
      )}

      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputWrapperFocused,
          !!error && styles.inputWrapperError,
          props.editable === false && styles.inputWrapperDisabled,
        ]}
      >
        {leftIcon && <View style={styles.iconContainer}>{leftIcon}</View>}

        <TextInput
          style={[styles.input, props.style]}
          placeholderTextColor={themeTokens.colors.textSubtle}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          secureTextEntry={isActualSecure}
          {...props}
        />

        {isPassword ? (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.passwordToggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        ) : (
          rightIcon && <View style={styles.iconContainer}>{rightIcon}</View>
        )}
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hintText}>{hint}</Text>
      ) : null}
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
    color: themeTokens.colors.textSecondary,
  },
  requiredAsterisk: {
    color: themeTokens.colors.error,
    fontSize: themeTokens.typography.sizes.sm,
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeTokens.colors.surface,
    borderWidth: 1.5,
    borderColor: themeTokens.colors.border,
    borderRadius: themeTokens.radii.md,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  inputWrapperFocused: {
    borderColor: themeTokens.colors.primary,
    backgroundColor: themeTokens.colors.surfaceMuted,
  },
  inputWrapperError: {
    borderColor: themeTokens.colors.error,
  },
  inputWrapperDisabled: {
    backgroundColor: themeTokens.colors.borderSubtle,
    borderColor: themeTokens.colors.border,
    opacity: 0.7,
  },
  input: {
    flex: 1,
    fontSize: themeTokens.typography.sizes.base,
    color: themeTokens.colors.textPrimary,
    paddingVertical: 10,
  },
  iconContainer: {
    marginRight: 8,
  },
  iconButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  passwordToggleText: {
    fontSize: themeTokens.typography.sizes.xs,
    fontWeight: '700',
    color: themeTokens.colors.primary,
  },
  errorText: {
    color: themeTokens.colors.error,
    fontSize: themeTokens.typography.sizes.xs,
    marginTop: 4,
    fontWeight: '500',
  },
  hintText: {
    color: themeTokens.colors.textSubtle,
    fontSize: themeTokens.typography.sizes.xs,
    marginTop: 4,
  },
});

