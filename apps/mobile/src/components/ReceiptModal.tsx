import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { themeTokens } from '@tuition/shared';

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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Official Fee Receipt</Text>
              <Text style={styles.receiptNo}>{receipt.receiptNumber}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

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
                  <Text style={styles.detailLabel}>Fee Description</Text>
                  <Text style={styles.detailValue}>{receipt.feeTitle}</Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Payment Date</Text>
                <Text style={styles.detailValue}>{formatDate(receipt.paidAt)}</Text>
              </View>
              {receipt.transactionReference && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Ref / Txn ID</Text>
                  <Text style={[styles.detailValue, styles.codeValue]}>
                    {receipt.transactionReference}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.footerNotice}>
              <Text style={styles.noticeText}>
                Computer-generated electronic receipt issued via TuitionOS. Valid without physical signature.
              </Text>
            </View>
          </ScrollView>

          {/* Action Footer */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
              <Text style={styles.shareBtnText}>Share / Print Receipt</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.dismissBtn}>
              <Text style={styles.dismissBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(45, 30, 24, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: themeTokens.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: themeTokens.colors.borderSubtle,
    backgroundColor: themeTokens.colors.espresso,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: themeTokens.colors.textLight,
  },
  receiptNo: {
    fontSize: 12,
    color: themeTokens.colors.beige,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: themeTokens.colors.cocoa,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: themeTokens.colors.textLight,
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  instituteBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  instituteName: {
    color: themeTokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  statusPill: {
    backgroundColor: themeTokens.colors.successBg,
    borderWidth: 1,
    borderColor: themeTokens.colors.successBorder,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusPillText: {
    color: themeTokens.colors.success,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  amountBox: {
    backgroundColor: themeTokens.colors.surfaceMuted,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    marginBottom: 20,
  },
  amountLabel: {
    color: themeTokens.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  amountValue: {
    color: themeTokens.colors.textPrimary,
    fontSize: 32,
    fontWeight: '900',
    marginVertical: 4,
  },
  paymentMethod: {
    color: themeTokens.colors.taupe,
    fontSize: 12,
    fontWeight: '600',
  },
  detailsGrid: {
    backgroundColor: themeTokens.colors.surfaceMuted,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    padding: 14,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    color: themeTokens.colors.textMuted,
    fontSize: 13,
  },
  detailValue: {
    color: themeTokens.colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  codeValue: {
    fontFamily: 'monospace',
    color: themeTokens.colors.primary,
    fontSize: 12,
  },
  footerNotice: {
    marginTop: 20,
    padding: 12,
    backgroundColor: themeTokens.colors.surfaceMuted,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: themeTokens.colors.borderSubtle,
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
    gap: 10,
    marginTop: 10,
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
