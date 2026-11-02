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
import { PressableScale } from '../theme/motion';

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
            <View style={styles.modalCard}>
              <View style={[styles.iconCircle, { borderColor: iconColor }]}>
                <Text style={[styles.iconText, { color: iconColor }]}>{iconSymbol}</Text>
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
            </View>
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
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#D7CCC8',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  titleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: themeTokens.colors.espresso,
    textAlign: 'center',
    marginBottom: 8,
  },
  messageText: {
    fontSize: 14,
    color: themeTokens.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D7CCC8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF7F5',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: themeTokens.colors.espresso,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
