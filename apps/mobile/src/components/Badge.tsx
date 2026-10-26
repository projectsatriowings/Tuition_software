import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { themeTokens } from '@tuition/shared';

interface BadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'indigo';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'neutral',
  size = 'md',
}) => {
  const getColors = () => {
    switch (variant) {
      case 'success':
        return {
          bg: themeTokens.colors.successBg,
          text: themeTokens.colors.success,
          border: themeTokens.colors.successBorder,
        };
      case 'warning':
        return {
          bg: themeTokens.colors.warningBg,
          text: themeTokens.colors.warning,
          border: themeTokens.colors.warningBorder,
        };
      case 'danger':
        return {
          bg: themeTokens.colors.errorBg,
          text: themeTokens.colors.error,
          border: themeTokens.colors.errorBorder,
        };
      case 'info':
        return {
          bg: themeTokens.colors.infoBg,
          text: themeTokens.colors.info,
          border: themeTokens.colors.infoBorder,
        };
      case 'indigo':
        return {
          bg: themeTokens.colors.surfaceMuted,
          text: themeTokens.colors.primary,
          border: themeTokens.colors.border,
        };
      default:
        return {
          bg: themeTokens.colors.surfaceMuted,
          text: themeTokens.colors.textSecondary,
          border: themeTokens.colors.border,
        };
    }
  };

  const colors = getColors();
  const isSm = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          paddingVertical: isSm ? 2 : 4,
          paddingHorizontal: isSm ? 6 : 8,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: colors.text,
            fontSize: isSm ? 10 : 11,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
