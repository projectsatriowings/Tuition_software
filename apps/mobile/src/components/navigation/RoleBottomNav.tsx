import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedBottomNavItem } from './AnimatedBottomNavItem';
import { useReducedMotion } from '../../theme/motion';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const INDICATOR_WIDTH = 38;

export interface RoleNavItem<T extends string = string> {
  id: T;
  label: string;
  icon: (color: string) => React.ReactNode;
  matchTabs?: string[];
  badgeCount?: number;
}

export interface RoleBottomNavProps<T extends string = string> {
  items: RoleNavItem<T>[];
  activeTab: string;
  onSelectTab: (tab: T) => void;
  activeColor?: string;
  inactiveColor?: string;
  activePillBg?: string;
}

export const RoleBottomNav = <T extends string>({
  items,
  activeTab,
  onSelectTab,
  activeColor = '#4E342E',
  inactiveColor = '#8D6E63',
  activePillBg = '#F5ECE8',
}: RoleBottomNavProps<T>) => {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [navWidth, setNavWidth] = useState(SCREEN_WIDTH);

  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 6 : 8);
  const tabWidth = navWidth / Math.max(items.length, 1);

  // Find active index
  const activeIndex = Math.max(
    0,
    items.findIndex((item) => (item.matchTabs || [item.id]).includes(activeTab))
  );

  const targetX = activeIndex * tabWidth + (tabWidth - INDICATOR_WIDTH) / 2;
  const slidingIndicatorX = useRef(new Animated.Value(targetX)).current;
  const indicatorOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reducedMotion) {
      slidingIndicatorX.setValue(targetX);
    } else {
      Animated.spring(slidingIndicatorX, {
        toValue: targetX,
        friction: 8,
        tension: 65,
        useNativeDriver: true,
      }).start();
    }
  }, [activeIndex, targetX, reducedMotion, slidingIndicatorX]);

  return (
    <View
      style={[styles.container, { paddingBottom: bottomPadding }]}
      onLayout={(e) => {
        const measured = e.nativeEvent.layout.width;
        if (measured > 0 && Math.abs(measured - navWidth) > 2) {
          setNavWidth(measured);
        }
      }}
    >
      {/* Smooth Sliding Active Tab Indicator Bar */}
      <Animated.View
        style={[
          styles.slidingIndicator,
          {
            width: INDICATOR_WIDTH,
            backgroundColor: activeColor,
            transform: [{ translateX: slidingIndicatorX }],
            opacity: indicatorOpacity,
          },
        ]}
      />

      {/* Navigation Items Row */}
      <View style={styles.navRow}>
        {items.map((item) => {
          const isActive = (item.matchTabs || [item.id]).includes(activeTab);

          return (
            <AnimatedBottomNavItem
              key={item.id}
              id={item.id}
              label={item.label}
              isActive={isActive}
              icon={item.icon}
              badgeCount={item.badgeCount || 0}
              onPress={() => onSelectTab(item.id)}
              activeColor={activeColor}
              inactiveColor={inactiveColor}
              activePillBg={activePillBg}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EFEBE9',
    shadowColor: '#2D1E18',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 10,
    zIndex: 99,
  },
  slidingIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 3,
    borderRadius: 2,
    shadowColor: '#4E342E',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
    zIndex: 100,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
    paddingTop: 6,
  },
});

