import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { themeTokens } from '@tuition/shared';
import { MobileButton } from './MobileButton';

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionTitle?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '📭',
  title,
  description,
  actionTitle,
  onAction,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconCircle}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {actionTitle && onAction && (
        <View style={styles.actionContainer}>
          <MobileButton
            title={actionTitle}
            onPress={onAction}
            size="sm"
            variant="outline"
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
    backgroundColor: themeTokens.colors.surface,
    borderRadius: themeTokens.radii.lg,
    borderWidth: 1,
    borderColor: themeTokens.colors.borderSubtle,
    marginVertical: 12,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: themeTokens.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  icon: {
    fontSize: 28,
  },
  title: {
    fontSize: themeTokens.typography.sizes.base,
    fontWeight: themeTokens.typography.weights.bold,
    color: themeTokens.colors.textPrimary,
    textAlign: 'center',
  },
  description: {
    fontSize: themeTokens.typography.sizes.sm,
    color: themeTokens.colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  actionContainer: {
    marginTop: 16,
  },
});

