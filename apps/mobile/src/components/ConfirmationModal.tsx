import React, { useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native';
import { themeTokens } from '@tuition/shared';
import { PressableScale, AnimatedDialog } from '../theme/motion';
import { AlertTriangle, HelpCircle } from 'lucide-react-native';

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  const lastPressTime = useRef<number>(0);

  if (!isOpen) return null;

  let btnColor = themeTokens.colors.espresso;
  let iconColor = themeTokens.colors.mocha;
  let iconSymbol = '?';

  if (variant === 'danger') {
    btnColor = '#DC2626';
    iconColor = '#DC2626';
    iconSymbol = '⚠';
  } else if (variant === 'warning') {
    btnColor = '#D97706';
    iconColor = '#D97706';
    iconSymbol = '⚠';
  }

  const handleSafeConfirm = () => {
    if (loading) return;
    const now = Date.now();
    if (now - lastPressTime.current < 450) return;
    lastPressTime.current = now;
    onConfirm();
  };

  const handleSafeCancel = () => {
    if (loading) return;
    onCancel();
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={isOpen}
      onRequestClose={handleSafeCancel}
    >
      <TouchableWithoutFeedback onPress={handleSafeCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <AnimatedDialog style={styles.modalCard}>
              <View style={[styles.iconCircle, { borderColor: iconColor }]}>
                {variant === 'danger' || variant === 'warning' ? (
                  <AlertTriangle size={24} color={iconColor} />
                ) : (
                  <HelpCircle size={24} color={iconColor} />
                )}
              </View>

              <Text style={styles.titleText}>{title}</Text>
              <Text style={styles.messageText}>{message}</Text>

              <View style={styles.buttonRow}>
                <PressableScale
                  style={[styles.cancelBtn, loading && styles.btnDisabled]}
                  onPress={handleSafeCancel}
                  disabled={loading}
                  activeScale={0.97}
                  accessibilityRole="button"
                  accessibilityLabel={cancelLabel}
                >
                  <Text style={styles.cancelBtnText}>{cancelLabel}</Text>
                </PressableScale>

                <PressableScale
                  style={[
                    styles.confirmBtn,
                    { backgroundColor: btnColor },
                    loading && styles.btnDisabled,
                  ]}
                  onPress={handleSafeConfirm}
                  disabled={loading}
                  activeScale={0.97}
                  accessibilityRole="button"
                  accessibilityLabel={confirmLabel}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmBtnText}>{confirmLabel}</Text>
                  )}
                </PressableScale>
              </View>
            </AnimatedDialog>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#EFEBE9',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  titleText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2D1E18',
    marginBottom: 8,
    textAlign: 'center',
  },
  messageText: {
    fontSize: 14,
    color: '#5D4037',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F5ECE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#5D4037',
    fontWeight: '700',
    fontSize: 14,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
