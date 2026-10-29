import React, { useRef } from 'react';
import {
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Pressable,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { themeTokens } from '@tuition/shared';

export interface MobileButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  fullWidth?: boolean;
}

export const MobileButton: React.FC<MobileButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  fullWidth = false,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled || loading) return;
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  };

  const getVariantStyles = (): { btn: ViewStyle; text: TextStyle; spinnerColor: string } => {
    switch (variant) {
      case 'primary':
        return {
          btn: {
            backgroundColor: themeTokens.colors.primary,
            borderColor: themeTokens.colors.primary,
          },
          text: {
            color: themeTokens.colors.textLight,
          },
          spinnerColor: themeTokens.colors.textLight,
        };
      case 'secondary':
        return {
          btn: {
            backgroundColor: themeTokens.colors.background,
            borderColor: themeTokens.colors.border,
          },
          text: {
            color: themeTokens.colors.textPrimary,
          },
          spinnerColor: themeTokens.colors.primary,
        };
      case 'outline':
        return {
          btn: {
            backgroundColor: 'transparent',
            borderColor: themeTokens.colors.primary,
          },
          text: {
            color: themeTokens.colors.primary,
          },
          spinnerColor: themeTokens.colors.primary,
        };
      case 'danger':
        return {
          btn: {
            backgroundColor: themeTokens.colors.error,
            borderColor: themeTokens.colors.error,
          },
          text: {
            color: themeTokens.colors.textLight,
          },
          spinnerColor: themeTokens.colors.textLight,
        };
      case 'success':
        return {
          btn: {
            backgroundColor: themeTokens.colors.success,
            borderColor: themeTokens.colors.success,
          },
          text: {
            color: themeTokens.colors.textLight,
          },
          spinnerColor: themeTokens.colors.textLight,
        };
      case 'ghost':
        return {
          btn: {
            backgroundColor: 'transparent',
            borderColor: 'transparent',
          },
          text: {
            color: themeTokens.colors.primary,
          },
          spinnerColor: themeTokens.colors.primary,
        };
      default:
        return {
          btn: {
            backgroundColor: themeTokens.colors.primary,
            borderColor: themeTokens.colors.primary,
          },
          text: {
            color: themeTokens.colors.textLight,
          },
          spinnerColor: themeTokens.colors.textLight,
        };
    }
  };

  const getSizeStyles = (): { btn: ViewStyle; text: TextStyle } => {
    switch (size) {
      case 'sm':
        return {
          btn: {
            paddingVertical: 8,
            paddingHorizontal: 12,
            minHeight: 36,
            borderRadius: themeTokens.radii.md,
          },
          text: {
            fontSize: themeTokens.typography.sizes.sm,
          },
        };
      case 'lg':
        return {
          btn: {
            paddingVertical: 14,
            paddingHorizontal: 20,
            minHeight: 52,
            borderRadius: themeTokens.radii.lg,
          },
          text: {
            fontSize: themeTokens.typography.sizes.lg,
          },
        };
      case 'md':
      default:
        return {
          btn: {
            paddingVertical: 11,
            paddingHorizontal: 16,
            minHeight: 44,
            borderRadius: themeTokens.radii.md,
          },
          text: {
            fontSize: themeTokens.typography.sizes.base,
          },
        };
    }
  };

  const vStyles = getVariantStyles();
  const sStyles = getSizeStyles();

  return (
    <Animated.View
      style={[
        { transform: [{ scale: scaleAnim }] },
        fullWidth && styles.fullWidth,
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[
          styles.baseButton,
          vStyles.btn,
          sStyles.btn,
          disabled && styles.disabledButton,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={vStyles.spinnerColor} />
        ) : (
          <>
            {icon && iconPosition === 'left' && <>{icon}</>}
            <Text
              style={[
                styles.baseText,
                vStyles.text,
                sStyles.text,
                disabled && styles.disabledText,
                icon && iconPosition === 'left' ? styles.iconTextLeft : undefined,
                icon && iconPosition === 'right' ? styles.iconTextRight : undefined,
                textStyle,
              ]}
            >
              {title}
            </Text>
            {icon && iconPosition === 'right' && <>{icon}</>}
          </>
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  baseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#3E2723',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  baseText: {
    fontWeight: themeTokens.typography.weights.semibold,
    textAlign: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  disabledButton: {
    opacity: 0.5,
    backgroundColor: themeTokens.colors.borderSubtle,
    borderColor: themeTokens.colors.border,
  },
  disabledText: {
    color: themeTokens.colors.textSubtle,
  },
  iconTextLeft: {
    marginLeft: 6,
  },
  iconTextRight: {
    marginRight: 6,
  },
});

