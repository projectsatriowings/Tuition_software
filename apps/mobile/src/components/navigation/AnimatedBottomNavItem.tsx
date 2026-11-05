import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { PressableScale, useReducedMotion } from '../../theme/motion';

export interface AnimatedBottomNavItemProps {
  id: string;
  label: string;
  isActive: boolean;
  icon: (color: string) => React.ReactNode;
  badgeCount?: number;
  onPress: () => void;
  activeColor?: string;
  inactiveColor?: string;
  activePillBg?: string;
}

export const AnimatedBottomNavItem: React.FC<AnimatedBottomNavItemProps> = ({
  id,
  label,
  isActive,
  icon,
  badgeCount = 0,
  onPress,
  activeColor = '#4E342E',
  inactiveColor = '#8D6E63',
  activePillBg = '#F5ECE8',
}) => {
  const reducedMotion = useReducedMotion();

  // Animation drivers
  const pillScale = useRef(new Animated.Value(isActive ? 1 : 0.94)).current;
  const pillOpacity = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const iconTranslateY = useRef(new Animated.Value(0)).current;
  const iconScaleY = useRef(new Animated.Value(1)).current;
  const badgeScale = useRef(new Animated.Value(badgeCount > 0 ? 1 : 0)).current;

  // Track previous states to avoid re-triggering animations on same props
  const prevActiveRef = useRef(isActive);
  const prevBadgeRef = useRef(badgeCount);

  // Active state change effect (Jelly Icon + Pill scale/fade)
  useEffect(() => {
    if (prevActiveRef.current !== isActive) {
      prevActiveRef.current = isActive;

      if (reducedMotion) {
        pillScale.setValue(isActive ? 1 : 0.94);
        pillOpacity.setValue(isActive ? 1 : 0);
        return;
      }

      if (isActive) {
        // Pill entrance animation
        Animated.parallel([
          Animated.spring(pillScale, {
            toValue: 1,
            friction: 7,
            tension: 70,
            useNativeDriver: true,
          }),
          Animated.timing(pillOpacity, {
            toValue: 1,
            duration: 160,
            useNativeDriver: true,
          }),
          // Jelly icon squash and spring bounce
          Animated.sequence([
            Animated.parallel([
              Animated.timing(iconTranslateY, {
                toValue: -3,
                duration: 70,
                useNativeDriver: true,
              }),
              Animated.timing(iconScaleY, {
                toValue: 0.85,
                duration: 70,
                useNativeDriver: true,
              }),
            ]),
            Animated.parallel([
              Animated.spring(iconTranslateY, {
                toValue: 0,
                friction: 4,
                tension: 70,
                useNativeDriver: true,
              }),
              Animated.spring(iconScaleY, {
                toValue: 1,
                friction: 3.5,
                tension: 80,
                useNativeDriver: true,
              }),
            ]),
          ]),
        ]).start();
      } else {
        // Pill exit
        Animated.parallel([
          Animated.timing(pillScale, {
            toValue: 0.94,
            duration: 120,
            useNativeDriver: true,
          }),
          Animated.timing(pillOpacity, {
            toValue: 0,
            duration: 120,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  }, [isActive, reducedMotion, pillScale, pillOpacity, iconTranslateY, iconScaleY]);

  // Badge Pop animation when count changes or appears
  useEffect(() => {
    if (badgeCount > 0) {
      if (prevBadgeRef.current !== badgeCount) {
        prevBadgeRef.current = badgeCount;
        if (reducedMotion) {
          badgeScale.setValue(1);
        } else {
          badgeScale.setValue(0.4);
          Animated.spring(badgeScale, {
            toValue: 1,
            friction: 3.8,
            tension: 80,
            useNativeDriver: true,
          }).start();
        }
      }
    } else {
      prevBadgeRef.current = 0;
      badgeScale.setValue(0);
    }
  }, [badgeCount, reducedMotion, badgeScale]);

  const handlePress = () => {
    if (!isActive && !reducedMotion) {
      // Immediate tactile jelly squash on tap
      iconScaleY.setValue(0.85);
      Animated.spring(iconScaleY, {
        toValue: 1,
        friction: 3.5,
        tension: 80,
        useNativeDriver: true,
      }).start();
    }
    onPress();
  };

  return (
    <PressableScale
      onPress={handlePress}
      activeScale={0.93}
      activeOpacity={0.88}
      style={styles.navItem}
      accessibilityRole="button"
      accessibilityLabel={`${label} tab`}
      accessibilityState={{ selected: isActive }}
    >
      <View style={styles.pillContainer}>
        {/* Animated Active Pill Indicator */}
        <Animated.View
          style={[
            styles.activePillBackground,
            { backgroundColor: activePillBg },
            {
              opacity: pillOpacity,
              transform: [{ scale: pillScale }],
            },
          ]}
        />

        <View style={styles.contentWrap}>
          {/* Animated Jelly Icon */}
          <Animated.View
            style={[
              styles.iconWrapper,
              {
                transform: [
                  { translateY: iconTranslateY },
                  { scaleY: iconScaleY },
                ],
              },
            ]}
          >
            {icon(isActive ? activeColor : inactiveColor)}

            {/* Badge Pop */}
            {badgeCount > 0 && (
              <Animated.View
                style={[
                  styles.badgeDot,
                  {
                    transform: [{ scale: badgeScale }],
                  },
                ]}
              >
                <Text style={styles.badgeDotText}>
                  {badgeCount > 9 ? '9+' : badgeCount}
                </Text>
              </Animated.View>
            )}
          </Animated.View>

          {/* Label */}
          <Text
            style={[
              styles.navLabel,
              { color: isActive ? activeColor : inactiveColor },
              isActive && styles.activeNavLabel,
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </View>
      </View>
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  pillContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
    minWidth: 54,
    position: 'relative',
  },
  activePillBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
  contentWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.1,
  },
  activeNavLabel: {
    fontWeight: '800',
  },
  badgeDot: {
    position: 'absolute',
    top: -3,
    right: -8,
    backgroundColor: '#B91C1C',
    borderRadius: 8,
    minWidth: 15,
    height: 15,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDotText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
});

