import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  AccessibilityInfo,
  Platform,
  BackHandler,
  Pressable,
  ViewStyle,
  StyleProp,
  GestureResponderEvent,
} from 'react-native';

/**
 * TuitionOS Mobile Motion Tokens
 * Restrained, responsive, enterprise-appropriate timings and easings.
 * Guaranteed 60fps execution via native driver.
 */
export const motionTokens = {
  duration: {
    instant: 0,
    micro: 120, // press interactions, micro-touches
    fast: 160,  // quick badge / opacity transitions
    normal: 220, // cards, list items, subtle slide-ins
    modal: 260,  // dialog / sheet entrance
  },
  easing: {
    // Cubic bezier ease-out (fluid deceleration without jarring snap)
    standard: Easing.bezier(0.2, 0.0, 0.0, 1.0),
    // Symmetric ease-in-out for reversals
    inOut: Easing.bezier(0.4, 0.0, 0.2, 1.0),
    // Restrained spring config (prevents cartoonish bounce)
    spring: {
      speed: 45,
      bounciness: 3,
    },
  },
  distance: {
    subtleSlide: 8,  // standard translateY: 8px to 0px
    sheetSlide: 36,  // bottom sheet entrance: 36px to 0px
  },
  scale: {
    pressed: 0.97,   // subtle press depression (no drastic shrinking)
  },
} as const;

/**
 * Hook to detect and observe system-level Reduced Motion accessibility preference.
 * When enabled on Android / iOS, spatial movement is suppressed.
 */
export function useReducedMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Check initial state
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (isMounted) setReduceMotion(enabled);
      })
      .catch(() => {});

    // Listen to live system accessibility changes
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled: boolean) => {
        if (isMounted) setReduceMotion(enabled);
      }
    );

    return () => {
      isMounted = false;
      subscription?.remove();
    };
  }, []);

  return reduceMotion;
}

/**
 * Hook to safely handle Android hardware back button events.
 * Returns true if back press was consumed, false to allow default system navigation.
 */
export function useAndroidBackHandler(
  handler: () => boolean,
  isEnabled: boolean = true
): void {
  useEffect(() => {
    if (!isEnabled || Platform.OS !== 'android') return;

    const sub = BackHandler.addEventListener('hardwareBackPress', handler);
    return () => sub.remove();
  }, [handler, isEnabled]);
}

/**
 * Helper: Subtle Fade In
 */
export function fadeIn(
  animValue: Animated.Value,
  options?: {
    duration?: number;
    delay?: number;
    useNativeDriver?: boolean;
    reducedMotion?: boolean;
  }
): Animated.CompositeAnimation {
  const {
    duration = motionTokens.duration.normal,
    delay = 0,
    useNativeDriver = true,
    reducedMotion = false,
  } = options || {};

  return Animated.timing(animValue, {
    toValue: 1,
    duration: reducedMotion ? motionTokens.duration.instant : duration,
    delay: reducedMotion ? 0 : delay,
    easing: motionTokens.easing.standard,
    useNativeDriver,
  });
}

/**
 * Helper: Subtle Fade Out
 */
export function fadeOut(
  animValue: Animated.Value,
  options?: {
    duration?: number;
    useNativeDriver?: boolean;
    reducedMotion?: boolean;
  }
): Animated.CompositeAnimation {
  const {
    duration = motionTokens.duration.fast,
    useNativeDriver = true,
    reducedMotion = false,
  } = options || {};

  return Animated.timing(animValue, {
    toValue: 0,
    duration: reducedMotion ? motionTokens.duration.instant : duration,
    easing: motionTokens.easing.inOut,
    useNativeDriver,
  });
}

/**
 * Helper: Short Slide In + Fade In
 * Animates translateY (e.g. 8px -> 0px) and opacity (0 -> 1)
 */
export function slideInUp(
  translateAnim: Animated.Value,
  opacityAnim: Animated.Value,
  options?: {
    distance?: number;
    duration?: number;
    delay?: number;
    useNativeDriver?: boolean;
    reducedMotion?: boolean;
  }
): Animated.CompositeAnimation {
  const {
    distance = motionTokens.distance.subtleSlide,
    duration = motionTokens.duration.normal,
    delay = 0,
    useNativeDriver = true,
    reducedMotion = false,
  } = options || {};

  if (reducedMotion) {
    translateAnim.setValue(0);
    return Animated.timing(opacityAnim, {
      toValue: 1,
      duration: motionTokens.duration.fast,
      useNativeDriver,
    });
  }

  translateAnim.setValue(distance);
  opacityAnim.setValue(0);

  return Animated.parallel([
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration,
      delay,
      easing: motionTokens.easing.standard,
      useNativeDriver,
    }),
    Animated.timing(translateAnim, {
      toValue: 0,
      duration,
      delay,
      easing: motionTokens.easing.standard,
      useNativeDriver,
    }),
  ]);
}

/**
 * Helper: Press Feedback (Scale spring)
 */
export function pressScale(
  scaleAnim: Animated.Value,
  pressed: boolean,
  options?: {
    toValue?: number;
    useNativeDriver?: boolean;
    reducedMotion?: boolean;
  }
): Animated.CompositeAnimation {
  const {
    toValue = motionTokens.scale.pressed,
    useNativeDriver = true,
    reducedMotion = false,
  } = options || {};

  if (reducedMotion) {
    return Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 0,
      useNativeDriver,
    });
  }

  return Animated.spring(scaleAnim, {
    toValue: pressed ? toValue : 1,
    speed: motionTokens.easing.spring.speed,
    bounciness: motionTokens.easing.spring.bounciness,
    useNativeDriver,
  });
}

/**
 * Helper: Modal/Sheet Entrance
 */
export function modalSheetEntrance(
  translateAnim: Animated.Value,
  opacityAnim: Animated.Value,
  options?: {
    distance?: number;
    duration?: number;
    useNativeDriver?: boolean;
    reducedMotion?: boolean;
  }
): Animated.CompositeAnimation {
  const {
    distance = motionTokens.distance.sheetSlide,
    duration = motionTokens.duration.modal,
    useNativeDriver = true,
    reducedMotion = false,
  } = options || {};

  if (reducedMotion) {
    translateAnim.setValue(0);
    return Animated.timing(opacityAnim, {
      toValue: 1,
      duration: motionTokens.duration.fast,
      useNativeDriver,
    });
  }

  translateAnim.setValue(distance);
  opacityAnim.setValue(0);

  return Animated.parallel([
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration,
      easing: motionTokens.easing.standard,
      useNativeDriver,
    }),
    Animated.timing(translateAnim, {
      toValue: 0,
      duration,
      easing: motionTokens.easing.standard,
      useNativeDriver,
    }),
  ]);
}

/**
 * Helper: Modal/Sheet Exit
 */
export function modalSheetExit(
  translateAnim: Animated.Value,
  opacityAnim: Animated.Value,
  options?: {
    distance?: number;
    duration?: number;
    useNativeDriver?: boolean;
    reducedMotion?: boolean;
  }
): Animated.CompositeAnimation {
  const {
    distance = motionTokens.distance.sheetSlide,
    duration = motionTokens.duration.fast,
    useNativeDriver = true,
    reducedMotion = false,
  } = options || {};

  if (reducedMotion) {
    return Animated.timing(opacityAnim, {
      toValue: 0,
      duration: motionTokens.duration.fast,
      useNativeDriver,
    });
  }

  return Animated.parallel([
    Animated.timing(opacityAnim, {
      toValue: 0,
      duration,
      easing: motionTokens.easing.inOut,
      useNativeDriver,
    }),
    Animated.timing(translateAnim, {
      toValue: distance,
      duration,
      easing: motionTokens.easing.inOut,
      useNativeDriver,
    }),
  ]);
}

// ============================================================================
// DECLARATIVE COMPONENTS
// ============================================================================

export interface FadeInViewProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * FadeInView: Graceful opacity entrance on mount.
 * Bypasses animation when Reduced Motion is enabled.
 */
export const FadeInView: React.FC<FadeInViewProps> = ({
  children,
  delay = 0,
  duration = motionTokens.duration.normal,
  style,
}) => {
  const reducedMotion = useReducedMotion();
  const opacityAnim = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reducedMotion) {
      opacityAnim.setValue(1);
      return;
    }
    const anim = fadeIn(opacityAnim, { duration, delay, reducedMotion });
    anim.start();
    return () => anim.stop();
  }, [reducedMotion, delay, duration, opacityAnim]);

  return (
    <Animated.View style={[{ opacity: opacityAnim }, style]}>
      {children}
    </Animated.View>
  );
};

export interface SlideInViewProps {
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * SlideInView: Subtle vertical entrance (8px -> 0px) combined with fade.
 * Never causes layout shifts or delays scrolling.
 * Falls back to instant opacity when Reduced Motion is enabled.
 */
export const SlideInView: React.FC<SlideInViewProps> = ({
  children,
  delay = 0,
  distance = motionTokens.distance.subtleSlide,
  duration = motionTokens.duration.normal,
  style,
}) => {
  const reducedMotion = useReducedMotion();
  const opacityAnim = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const translateAnim = useRef(
    new Animated.Value(reducedMotion ? 0 : distance)
  ).current;

  useEffect(() => {
    if (reducedMotion) {
      opacityAnim.setValue(1);
      translateAnim.setValue(0);
      return;
    }
    const anim = slideInUp(translateAnim, opacityAnim, {
      distance,
      duration,
      delay,
      reducedMotion,
    });
    anim.start();
    return () => anim.stop();
  }, [reducedMotion, delay, distance, duration, opacityAnim, translateAnim]);

  return (
    <Animated.View
      style={[
        {
          opacity: opacityAnim,
          transform: [{ translateY: translateAnim }],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};

export interface PressableScaleProps {
  children: React.ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  activeScale?: number;
  activeOpacity?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityRole?: any;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

/**
 * PressableScale: Enterprise-grade touchable with subtle native-driven scale feedback (0.97).
 * Reverts to simple opacity feedback when Reduced Motion is enabled.
 * Does not block taps or interfere with parent ScrollView gesture responder.
 */
export const PressableScale: React.FC<PressableScaleProps> = ({
  children,
  onPress,
  onLongPress,
  disabled = false,
  activeScale = motionTokens.scale.pressed,
  activeOpacity = 0.88,
  style,
  accessibilityRole = 'button',
  accessibilityLabel,
  accessibilityHint,
  testID,
}) => {
  const reducedMotion = useReducedMotion();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;

    if (!reducedMotion) {
      Animated.spring(scaleAnim, {
        toValue: activeScale,
        speed: motionTokens.easing.spring.speed,
        bounciness: motionTokens.easing.spring.bounciness,
        useNativeDriver: true,
      }).start();
    }

    Animated.timing(opacityAnim, {
      toValue: activeOpacity,
      duration: motionTokens.duration.micro,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;

    if (!reducedMotion) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        speed: motionTokens.easing.spring.speed,
        bounciness: motionTokens.easing.spring.bounciness,
        useNativeDriver: true,
      }).start();
    }

    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: motionTokens.duration.fast,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      testID={testID}
      style={({ pressed }) => [
        // Ensure child layout is preserved
        { opacity: disabled ? 0.6 : 1 },
      ]}
    >
      <Animated.View
        style={[
          style,
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
};
