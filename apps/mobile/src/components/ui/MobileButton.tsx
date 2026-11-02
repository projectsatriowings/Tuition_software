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
  GestureResponderEvent,
} from 'react-native';
import { themeTokens } from '@tuition/shared';
import { useReducedMotion, motionTokens } from '../../theme/motion';

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
  accessibilityLabel?: string;
  testID?: string;
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
  accessibilityLabel,
  testID,
}) => {
  const reducedMotion = useReducedMotion();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const lastPressTime = useRef<number>(0);

  const handlePressIn = () => {
    if (disabled || loading) return;

    if (!reducedMotion) {
      Animated.spring(scaleAnim, {
        toValue: 0.97,
        useNativeDriver: true,
        speed: motionTokens.easing.spring.speed,
        bounciness: motionTokens.easing.spring.bounciness,
      }).start();
    }

    Animated.timing(opacityAnim, {
      toValue: 0.88,
      duration: motionTokens.duration.micro,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled || loading) return;

    if (!reducedMotion) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: motionTokens.easing.spring.speed,
        bounciness: motionTokens.easing.spring.bounciness,
      }).start();
    }

    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: motionTokens.duration.fast,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (disabled || loading) return;

    // Prevent double submission while an existing action is processing
    const now = Date.now();
    if (now - lastPressTime.current < 450) {
      return;
    }
    lastPressTime.current = now;
    onPress();
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
            color: themeTokens.colors.textPrimary,
          },
          spinnerColor: themeTokens.colors.primary,
        };
    }
  };

  const getSizeStyles = (): { btn: ViewStyle; text: TextStyle } => {
    switch (size) {
      case 'sm':
        return {
          btn: {
            paddingVertical: 7,
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
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
        fullWidth && styles.fullWidth,
      ]}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || title}
        testID={testID}
        style={[
          styles.baseButton,
          vStyles.btn,
          sStyles.btn,
          (disabled || loading) && styles.disabledButton,
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
  },
  fullWidth: {
    width: '100%',
  },
  baseText: {
    fontWeight: themeTokens.typography.weights.semibold,
    textAlign: 'center',
  },
  disabledButton: {
    opacity: 0.55,
  },
  disabledText: {
    opacity: 0.8,
  },
  iconTextLeft: {
    marginLeft: 8,
  },
  iconTextRight: {
    marginRight: 8,
  },
});
