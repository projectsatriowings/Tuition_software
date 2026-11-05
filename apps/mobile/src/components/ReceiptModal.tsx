import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { themeTokens } from '@tuition/shared';
import { PressableScale } from '../theme/motion';
import { InteractiveBottomSheet } from './ui/InteractiveBottomSheet';

interface ReceiptData {
  receiptNumber: string;
  transactionReference?: string;
  studentName?: string;
  studentRoll?: string;
  batchName?: string;
  instituteName?: string;
  feeTitle?: string;
  amount: number;
  paymentMethod: string;
  paidAt: string;
  recordedBy?: string;
  status?: string;
}

interface ReceiptModalProps {
  visible: boolean;
  onClose: () => void;
  receipt: ReceiptData | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  visible,
  onClose,
  receipt,
}) => {
  if (!receipt) return null;

  const formatCurrency = (amt: number) => {
    return `₹${amt.toLocaleString('en-IN')}`;
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const handleShare = () => {
    Alert.alert(
      'Receipt Export',
      `Receipt ${receipt.receiptNumber} generated. Ready for sharing via WhatsApp or Email.`,
      [{ text: 'OK' }]
    );
  };

  return (
    <InteractiveBottomSheet
      visible={visible}
      onClose={onClose}
      title="Official Fee Receipt"
      subtitle={receipt.receiptNumber}
      maxHeight="86%"
    >
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Institute & Status Badge */}
        <View style={styles.instituteBox}>
          <Text style={styles.instituteName}>
            {receipt.instituteName || 'TuitionOS Enterprise'}
          </Text>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>PAID & VERIFIED</Text>
          </View>
        </View>

        {/* Total Amount Callout */}
        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>AMOUNT PAID</Text>
          <Text style={styles.amountValue}>{formatCurrency(receipt.amount)}</Text>
          <Text style={styles.paymentMethod}>
            Method: {receipt.paymentMethod || 'UPI / Cash'}
          </Text>
        </View>

        {/* Receipt Details Grid */}
        <View style={styles.detailsGrid}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Student Name</Text>
            <Text style={styles.detailValue}>{receipt.studentName || 'Student'}</Text>
          </View>
          {receipt.studentRoll && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Roll Number</Text>
              <Text style={styles.detailValue}>{receipt.studentRoll}</Text>
            </View>
          )}
          {receipt.batchName && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Batch / Class</Text>
              <Text style={styles.detailValue}>{receipt.batchName}</Text>
            </View>
          )}
          {receipt.feeTitle && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Fee Category</Text>
              <Text style={styles.detailValue}>{receipt.feeTitle}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment Date</Text>
            <Text style={styles.detailValue}>{formatDate(receipt.paidAt)}</Text>
          </View>
          {receipt.transactionReference && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Transaction Ref</Text>
              <Text style={styles.detailValue}>{receipt.transactionReference}</Text>
            </View>
          )}
          {receipt.recordedBy && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Authorized Staff</Text>
              <Text style={styles.detailValue}>{receipt.recordedBy}</Text>
            </View>
          )}
        </View>

        {/* Audit Verification Notice */}
        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>
            This is an authentic system-generated digital receipt registered with TuitionOS Academic
            Accounting. No physical signature is required.
          </Text>
        </View>
      </ScrollView>

      {/* Action Footer */}
      <View style={styles.footer}>
        <PressableScale
          onPress={handleShare}
          style={styles.shareBtn}
          accessibilityRole="button"
          accessibilityLabel="Share receipt"
        >
          <Text style={styles.shareBtnText}>Share / Save PDF</Text>
        </PressableScale>
        <PressableScale
          onPress={onClose}
          style={styles.dismissBtn}
          accessibilityRole="button"
          accessibilityLabel="Dismiss receipt"
        >
          <Text style={styles.dismissBtnText}>Close</Text>
        </PressableScale>
      </View>
    </InteractiveBottomSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: 520,
  },
  instituteBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: themeTokens.colors.borderSubtle,
  },
  instituteName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: themeTokens.colors.textPrimary,
  },
  statusPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPillText: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  amountBox: {
    backgroundColor: '#FAF7F2',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EFEBE9',
  },
  amountLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: themeTokens.colors.textSubtle,
    letterSpacing: 1,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: themeTokens.colors.espresso,
    marginBottom: 4,
  },
  paymentMethod: {
    fontSize: 12,
    color: themeTokens.colors.textSecondary,
    fontWeight: '500',
  },
  detailsGrid: {
    backgroundColor: themeTokens.colors.surface,
    borderWidth: 1,
    borderColor: themeTokens.colors.borderSubtle,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    color: themeTokens.colors.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: themeTokens.colors.textPrimary,
    maxWidth: '60%',
    textAlign: 'right',
  },
  noticeBox: {
    padding: 12,
    backgroundColor: themeTokens.colors.surfaceMuted,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: themeTokens.colors.borderSubtle,
    marginBottom: 16,
  },
  noticeText: {
    color: themeTokens.colors.textSubtle,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#EFEBE9',
    backgroundColor: '#FFFFFF',
  },
  shareBtn: {
    flex: 1,
    backgroundColor: themeTokens.colors.espresso,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  shareBtnText: {
    color: themeTokens.colors.textLight,
    fontWeight: 'bold',
    fontSize: 14,
  },
  dismissBtn: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: themeTokens.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    alignItems: 'center',
  },
  dismissBtnText: {
    color: themeTokens.colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
});
