import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle, StyleProp } from 'react-native';
import { themeTokens } from '@tuition/shared';

export interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = themeTokens.radii.md,
  style,
}) => {
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.8,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.3,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacityAnim]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height,
          borderRadius,
          opacity: opacityAnim,
        },
        style,
      ]}
    />
  );
};

export const CardSkeleton: React.FC<{ style?: StyleProp<ViewStyle> }> = ({ style }) => {
  return (
    <View style={[styles.cardContainer, style]}>
      <View style={styles.row}>
        <SkeletonLoader width={44} height={44} borderRadius={12} />
        <View style={styles.col}>
          <SkeletonLoader width="65%" height={16} />
          <SkeletonLoader width="40%" height={12} style={{ marginTop: 6 }} />
        </View>
      </View>
      <SkeletonLoader width="100%" height={12} style={{ marginTop: 14 }} />
      <SkeletonLoader width="85%" height={12} style={{ marginTop: 6 }} />
      <View style={[styles.row, { marginTop: 16, justifyContent: 'space-between' }]}>
        <SkeletonLoader width={80} height={26} borderRadius={13} />
        <SkeletonLoader width={90} height={32} borderRadius={8} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: themeTokens.colors.border,
  },
  cardContainer: {
    backgroundColor: themeTokens.colors.surface,
    padding: 16,
    borderRadius: themeTokens.radii.lg,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  col: {
    flex: 1,
    marginLeft: 12,
  },
});

