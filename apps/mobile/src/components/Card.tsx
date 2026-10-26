import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';

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
        activeOpacity={0.7}
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
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  highlightedCard: {
    borderColor: 'rgba(99, 102, 241, 0.4)',
    backgroundColor: '#111827',
  },
});
