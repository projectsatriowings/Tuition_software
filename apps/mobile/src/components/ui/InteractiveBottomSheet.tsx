import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  StyleProp,
  ViewStyle,
  BackHandler,
} from 'react-native';
import { X } from 'lucide-react-native';
import { themeTokens } from '@tuition/shared';
import { useReducedMotion, motionTokens, PressableScale } from '../../theme/motion';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface InteractiveBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  maxHeight?: number | string;
  enableDragToClose?: boolean;
  showCloseButton?: boolean;
  headerRight?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}

export const InteractiveBottomSheet: React.FC<InteractiveBottomSheetProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  maxHeight = '88%',
  enableDragToClose = true,
  showCloseButton = true,
  headerRight,
  contentStyle,
}) => {
  const reducedMotion = useReducedMotion();
  const [isRendered, setIsRendered] = useState(visible);

  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Handle hardware back on Android
  useEffect(() => {
    if (!visible) return;
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleDismiss();
      return true;
    });
    return () => backHandler.remove();
  }, [visible]);

  // Entrance & exit transitions
  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      if (reducedMotion) {
        translateY.setValue(0);
        backdropOpacity.setValue(1);
      } else {
        translateY.setValue(SCREEN_HEIGHT * 0.45);
        backdropOpacity.setValue(0);
        Animated.parallel([
          Animated.spring(translateY, {
            toValue: 0,
            friction: 8,
            tension: 55,
            useNativeDriver: true,
          }),
          Animated.timing(backdropOpacity, {
            toValue: 1,
            duration: motionTokens.duration.modal,
            useNativeDriver: true,
          }),
        ]).start();
      }
    } else if (isRendered) {
      handleDismiss();
    }
  }, [visible, reducedMotion]);

  const handleDismiss = () => {
    if (reducedMotion) {
      backdropOpacity.setValue(0);
      translateY.setValue(SCREEN_HEIGHT);
      setIsRendered(false);
      onClose();
      return;
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT * 0.6,
        duration: 180,
        easing: motionTokens.easing.inOut,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        easing: motionTokens.easing.inOut,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsRendered(false);
      onClose();
    });
  };

  // Pan Responder for drag-to-close & rubber banding
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => enableDragToClose,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return enableDragToClose && Math.abs(gestureState.dy) > 4;
      },
      onPanResponderMove: (_, gestureState) => {
        if (!enableDragToClose) return;

        if (gestureState.dy > 0) {
          // Drag down: direct translation
          translateY.setValue(gestureState.dy);
        } else {
          // Pull up past top: rubber band resistance
          const damped = gestureState.dy * 0.18;
          translateY.setValue(damped);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (!enableDragToClose) return;

        // Dismiss threshold: 75px or downward velocity > 0.4
        if (gestureState.dy > 75 || gestureState.vy > 0.45) {
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT * 0.6,
            duration: 160,
            easing: motionTokens.easing.inOut,
            useNativeDriver: true,
          }).start(() => {
            handleDismiss();
          });
        } else {
          // Spring back into place
          Animated.spring(translateY, {
            toValue: 0,
            friction: 7,
            tension: 70,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (!isRendered) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleDismiss}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Backdrop */}
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: backdropOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.45],
              }),
            },
          ]}
        >
          <TouchableWithoutFeedback onPress={handleDismiss}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
        </Animated.View>

        {/* Sliding Sheet */}
        <Animated.View
          style={[
            styles.sheetContainer,
            {
              maxHeight: maxHeight as any,
              transform: [{ translateY }],
            },
          ]}
        >
          {/* Top Drag Handle Header */}
          <View style={styles.handleArea} {...panResponder.panHandlers}>
            <View style={styles.handleBar} />
          </View>

          {/* Header Row if title or controls present */}
          {(title || headerRight || showCloseButton) && (
            <View style={styles.headerRow}>
              <View style={styles.titleWrap}>
                {title && <Text style={styles.sheetTitle}>{title}</Text>}
                {subtitle && <Text style={styles.sheetSubtitle}>{subtitle}</Text>}
              </View>

              <View style={styles.controlsWrap}>
                {headerRight}
                {showCloseButton && (
                  <PressableScale
                    onPress={handleDismiss}
                    activeScale={0.88}
                    style={styles.closeBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Close sheet"
                  >
                    <X size={18} color="#5D4037" />
                  </PressableScale>
                )}
              </View>
            </View>
          )}

          {/* Sheet Content Body */}
          <View style={[styles.contentBody, contentStyle]}>{children}</View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#2D1E18',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 16,
    width: '100%',
    overflow: 'hidden',
  },
  handleArea: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleBar: {
    width: 42,
    height: 4,
    borderRadius: 3,
    backgroundColor: '#D7CCC8',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEBE9',
  },
  titleWrap: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2D1E18',
  },
  sheetSubtitle: {
    fontSize: 12,
    color: '#8D6E63',
    marginTop: 2,
    fontWeight: '500',
  },
  controlsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5ECE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentBody: {
    flexShrink: 1,
  },
});
