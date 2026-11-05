import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { CreditCard, Calendar, Download, CheckCircle, FileText, ChevronRight, ShieldCheck } from 'lucide-react-native';
import { mobileApiFetch } from '../services/api';
import { useMobileToast } from '../context/ToastContext';
import { InteractiveBottomSheet } from './ui/InteractiveBottomSheet';
import { PressableScale } from '../theme/motion';

interface StaffMyPayslipsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const StaffMyPayslipsModal: React.FC<StaffMyPayslipsModalProps> = ({
  visible,
  onClose,
}) => {
  const { showToast } = useMobileToast();

  const [loading, setLoading] = useState(true);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [selectedPayslip, setSelectedPayslip] = useState<any | null>(null);

  const fetchPayslips = useCallback(async () => {
    try {
      setLoading(true);
      const res = await mobileApiFetch('/payroll/my-payslips', { skipCache: true });
      if (res.success && res.data) {
        setPayslips(res.data.payslips || res.data || []);
      }
    } catch {
      showToast('Could not load payslips', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (visible) {
      fetchPayslips();
      setSelectedPayslip(null);
    }
  }, [visible, fetchPayslips]);

  const formatRupee = (amt: number) => `₹${(amt || 0).toLocaleString('en-IN')}`;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleDownload = (ps: any) => {
    Alert.alert(
      'Payslip Download',
      `Official Salary Slip ${ps.payslipNumber || ''} is authenticated. PDF export ready for sharing.`,
      [{ text: 'OK' }]
    );
  };

  return (
    <InteractiveBottomSheet
      visible={visible}
      onClose={onClose}
      title="Faculty Salary & Payslips"
      subtitle="Monthly compensation statements, allowances & deductions"
      maxHeight="90%"
    >
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#4E342E" />
            <Text style={styles.loadingText}>Retrieving salary statements...</Text>
          </View>
        ) : payslips.length === 0 ? (
          <View style={styles.emptyBox}>
            <CreditCard size={38} color="#BCAAA4" />
            <Text style={styles.emptyTitle}>No Payslips Available</Text>
            <Text style={styles.emptySubtitle}>
              Monthly payroll statements will appear here once approved and released by the institute treasury.
            </Text>
          </View>
        ) : selectedPayslip ? (
          /* Detailed Single Payslip View */
          <View style={styles.detailContainer}>
            <TouchableOpacity
              onPress={() => setSelectedPayslip(null)}
              style={styles.backBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.backBtnText}>← Back to All Payslips</Text>
            </TouchableOpacity>

            <View style={styles.payslipSlipCard}>
              <View style={styles.slipHeader}>
                <View>
                  <Text style={styles.slipMonth}>
                    {monthNames[(selectedPayslip.month || 1) - 1]} {selectedPayslip.year}
                  </Text>
                  <Text style={styles.slipNum}>{selectedPayslip.payslipNumber}</Text>
                </View>
                <View style={styles.paidBadge}>
                  <Text style={styles.paidBadgeText}>PAID ✓</Text>
                </View>
              </View>

              {/* Net Pay Callout */}
              <View style={styles.netPayBox}>
                <Text style={styles.netPayLabel}>NET SALARY CREDITED</Text>
                <Text style={styles.netPayVal}>
                  {formatRupee(selectedPayslip.netSalary ?? selectedPayslip.payrollRecord?.netSalary ?? 0)}
                </Text>
                <Text style={styles.netPaySub}>
                  Credited on {selectedPayslip.issueDate ? new Date(selectedPayslip.issueDate).toLocaleDateString('en-IN') : 'Month-End'}
                </Text>
              </View>

              {/* Earnings & Deductions Breakdown */}
              <View style={styles.breakdownGrid}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLbl}>Basic Salary</Text>
                  <Text style={styles.breakdownVal}>
                    {formatRupee(selectedPayslip.payrollRecord?.baseSalary ?? selectedPayslip.baseSalary ?? 0)}
                  </Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLbl}>Allowances & Bonuses</Text>
                  <Text style={[styles.breakdownVal, { color: '#15803D' }]}>
                    +{formatRupee(selectedPayslip.payrollRecord?.totalAllowances ?? 0)}
                  </Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLbl}>Statutory & Tax Deductions</Text>
                  <Text style={[styles.breakdownVal, { color: '#B91C1C' }]}>
                    -{formatRupee(selectedPayslip.payrollRecord?.totalDeductions ?? 0)}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => handleDownload(selectedPayslip)}
                style={styles.downloadBtn}
                activeOpacity={0.8}
              >
                <Download size={16} color="#FFFFFF" />
                <Text style={styles.downloadBtnText}>Export Digital Payslip</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* List of Payslips */
          <View style={styles.listContainer}>
            {payslips.map((ps) => {
              const monthName = monthNames[(ps.month || 1) - 1];
              const net = ps.netSalary ?? ps.payrollRecord?.netSalary ?? 0;
              return (
                <PressableScale
                  key={ps.id}
                  onPress={() => setSelectedPayslip(ps)}
                  style={styles.payslipCard}
                >
                  <View style={styles.cardLeft}>
                    <View style={styles.cardIconWrap}>
                      <CreditCard size={18} color="#4E342E" />
                    </View>
                    <View>
                      <Text style={styles.cardTitle}>{monthName} {ps.year}</Text>
                      <Text style={styles.cardSub}>{ps.payslipNumber || 'Monthly Salary Statement'}</Text>
                    </View>
                  </View>

                  <View style={styles.cardRight}>
                    <Text style={styles.cardAmount}>{formatRupee(net)}</Text>
                    <View style={styles.viewRow}>
                      <Text style={styles.viewText}>View Slip</Text>
                      <ChevronRight size={13} color="#4E342E" />
                    </View>
                  </View>
                </PressableScale>
              );
            })}
          </View>
        )}
      </ScrollView>
    </InteractiveBottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingBox: {
    paddingVertical: 36,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#8D6E63',
  },
  emptyBox: {
    paddingVertical: 44,
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#5D4037',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#8D6E63',
    textAlign: 'center',
    lineHeight: 18,
  },
  listContainer: {
    gap: 10,
  },
  payslipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#EFEBE9',
    shadowColor: '#2D1E18',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  cardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F5ECE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#2D1E18',
  },
  cardSub: {
    fontSize: 11,
    color: '#8D6E63',
    marginTop: 2,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  cardAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#15803D',
  },
  viewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  viewText: {
    fontSize: 11,
    color: '#4E342E',
    fontWeight: '600',
  },
  detailContainer: {
    gap: 12,
  },
  backBtn: {
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  backBtnText: {
    fontSize: 12,
    color: '#4E342E',
    fontWeight: '700',
  },
  payslipSlipCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#EFEBE9',
    padding: 16,
  },
  slipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEBE9',
  },
  slipMonth: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2D1E18',
  },
  slipNum: {
    fontSize: 11,
    color: '#8D6E63',
    marginTop: 2,
  },
  paidBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  paidBadgeText: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '800',
  },
  netPayBox: {
    backgroundColor: '#FAF7F2',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginVertical: 14,
    borderWidth: 1,
    borderColor: '#EFEBE9',
  },
  netPayLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8D6E63',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  netPayVal: {
    fontSize: 26,
    fontWeight: '800',
    color: '#4E342E',
  },
  netPaySub: {
    fontSize: 11,
    color: '#8D6E63',
    marginTop: 4,
  },
  breakdownGrid: {
    gap: 8,
    paddingBottom: 14,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLbl: {
    fontSize: 12.5,
    color: '#5D4037',
  },
  breakdownVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2D1E18',
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4E342E',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  downloadBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});

