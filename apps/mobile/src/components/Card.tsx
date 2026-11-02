import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { themeTokens } from '@tuition/shared';
import { PressableScale } from '../theme/motion';

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  highlighted?: boolean;
  disabled?: boolean;
  accessibilityRole?: any;
  accessibilityLabel?: string;
  testID?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  highlighted = false,
  disabled = false,
  accessibilityRole = 'button',
  accessibilityLabel,
  testID,
}) => {
  const containerStyle = [
    styles.card,
    highlighted && styles.highlightedCard,
    disabled && styles.disabledCard,
    style,
  ];

  if (onPress) {
    return (
      <PressableScale
        activeScale={0.985}
        activeOpacity={0.92}
        onPress={onPress}
        disabled={disabled}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        style={containerStyle}
      >
        {children}
      </PressableScale>
    );
  }

  return <View style={containerStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: themeTokens.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    padding: 16,
    marginBottom: 12,
    shadowColor: themeTokens.colors.espresso,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  highlightedCard: {
    borderColor: themeTokens.colors.taupe,
    backgroundColor: themeTokens.colors.surfaceMuted,
  },
  disabledCard: {
    opacity: 0.65,
  },
});
