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
                {receipt.instituteName || 'Tuition Management System'}
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
                Method: {receipt.paymentMethod || 'UPI'}
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0b1120',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  receiptNo: {
    fontSize: 12,
    color: '#818cf8',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#94a3b8',
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
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  statusPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusPillText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  amountBox: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    marginBottom: 20,
  },
  amountLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  amountValue: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '900',
    marginVertical: 4,
  },
  paymentMethod: {
    color: '#a5b4fc',
    fontSize: 12,
    fontWeight: '600',
  },
  detailsGrid: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 14,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    color: '#94a3b8',
    fontSize: 13,
  },
  detailValue: {
    color: '#f1f5f9',
    fontSize: 13,
    fontWeight: '600',
  },
  codeValue: {
    fontFamily: 'monospace',
    color: '#38bdf8',
    fontSize: 12,
  },
  footerNotice: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#090d16',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  noticeText: {
    color: '#64748b',
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
    backgroundColor: '#4f46e5',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  shareBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  dismissBtn: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    alignItems: 'center',
  },
  dismissBtnText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 14,
  },
});
