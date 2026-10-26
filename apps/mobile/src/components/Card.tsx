import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { themeTokens } from '@tuition/shared';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  highlighted?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  highlighted = false,
}) => {
  const containerStyle = [
    styles.card,
    highlighted && styles.highlightedCard,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={onPress}
        style={containerStyle}
      >
        {children}
      </TouchableOpacity>
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
});
