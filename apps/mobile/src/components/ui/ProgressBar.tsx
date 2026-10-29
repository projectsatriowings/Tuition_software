import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { themeTokens } from '@tuition/shared';

export interface ProgressBarProps {
  progress: number; // 0 to 1 or 0 to 100
  color?: string;
  height?: number;
  showLabel?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color = themeTokens.colors.primary,
  height = 8,
  showLabel = false,
  style,
}) => {
  // Normalize progress to percentage 0-100
  const normalizedProgress = Math.min(100, Math.max(0, progress <= 1 ? progress * 100 : progress));

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.track, { height, borderRadius: height / 2 }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${normalizedProgress}%`,
              backgroundColor: color,
              borderRadius: height / 2,
            },
          ]}
        />
      </View>
      {showLabel && (
        <Text style={styles.label}>{Math.round(normalizedProgress)}%</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  track: {
    flex: 1,
    backgroundColor: themeTokens.colors.borderSubtle,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
  label: {
    fontSize: themeTokens.typography.sizes.xs,
    fontWeight: '700',
    color: themeTokens.colors.textMuted,
    minWidth: 32,
    textAlign: 'right',
  },
});

