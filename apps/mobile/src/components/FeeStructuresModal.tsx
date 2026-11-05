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
import { CreditCard, Tag, Layers, Calendar, ChevronRight, CheckCircle, Plus } from 'lucide-react-native';
import { mobileApiFetch } from '../services/api';
import { useMobileToast } from '../context/ToastContext';
import { InteractiveBottomSheet } from './ui/InteractiveBottomSheet';
import { PressableScale } from '../theme/motion';

interface FeeStructuresModalProps {
  visible: boolean;
  onClose: () => void;
}

export const FeeStructuresModal: React.FC<FeeStructuresModalProps> = ({
  visible,
  onClose,
}) => {
  const { showToast } = useMobileToast();

  const [loading, setLoading] = useState(true);
  const [structures, setStructures] = useState<any[]>([]);
  const [selectedStructure, setSelectedStructure] = useState<any | null>(null);

  const fetchStructures = useCallback(async () => {
    try {
      setLoading(true);
      const res = await mobileApiFetch('/fees/structures', { skipCache: true });
      if (res.success && res.data) {
        setStructures(Array.isArray(res.data) ? res.data : res.data.structures || []);
      }
    } catch {
      showToast('Could not load fee structures', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (visible) {
      fetchStructures();
      setSelectedStructure(null);
    }
  }, [visible, fetchStructures]);

  const formatRupee = (amt: number) => `₹${(amt || 0).toLocaleString('en-IN')}`;

  return (
    <InteractiveBottomSheet
      visible={visible}
      onClose={onClose}
      title="Academic Fee Structures"
      subtitle="Class-wise curriculum fee packages & installment schedules"
      maxHeight="90%"
    >
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#4E342E" />
            <Text style={styles.loadingText}>Retrieving curriculum fee models...</Text>
          </View>
        ) : selectedStructure ? (
          /* Structure Detail View */
          <View style={styles.detailWrap}>
            <TouchableOpacity
              onPress={() => setSelectedStructure(null)}
              style={styles.backBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.backBtnText}>← Back to All Structures</Text>
            </TouchableOpacity>

            <View style={styles.detailCard}>
              <View style={styles.detailHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailTitle}>{selectedStructure.title}</Text>
                  <Text style={styles.detailClass}>
                    Target Grade / Class: {selectedStructure.targetClass || selectedStructure.academicYear || 'All Standard'}
                  </Text>
                </View>
                <View style={styles.freqBadge}>
                  <Text style={styles.freqBadgeText}>
                    {selectedStructure.frequency || 'ANNUAL'}
                  </Text>
                </View>
              </View>

              {/* Total Fee Callout */}
              <View style={styles.totalBox}>
                <Text style={styles.totalLabel}>TOTAL ANNUAL CURRICULUM FEE</Text>
                <Text style={styles.totalVal}>{formatRupee(selectedStructure.totalAmount)}</Text>
              </View>

              {/* Components Breakdown */}
              <View style={styles.sectionWrap}>
                <Text style={styles.sectionTitle}>TUITION & COMPONENT BREAKDOWN</Text>
                {selectedStructure.components && selectedStructure.components.length > 0 ? (
                  selectedStructure.components.map((comp: any, idx: number) => (
                    <View key={comp.id || idx} style={styles.compRow}>
                      <Text style={styles.compName}>{comp.name || comp.type || 'Tuition Fee'}</Text>
                      <Text style={styles.compAmount}>{formatRupee(comp.amount)}</Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.compRow}>
                    <Text style={styles.compName}>Comprehensive Academic Fee</Text>
                    <Text style={styles.compAmount}>{formatRupee(selectedStructure.totalAmount)}</Text>
                  </View>
                )}
              </View>

              {/* Installment Schedule */}
              {selectedStructure.installments && selectedStructure.installments.length > 0 && (
                <View style={styles.sectionWrap}>
                  <Text style={styles.sectionTitle}>INSTALLMENT PAYMENT PLAN</Text>
                  {selectedStructure.installments.map((inst: any, idx: number) => (
                    <View key={inst.id || idx} style={styles.instRow}>
                      <View>
                        <Text style={styles.instTitle}>Installment #{inst.installmentNumber || idx + 1}</Text>
                        <Text style={styles.instDate}>
                          Due by {inst.dueDate ? new Date(inst.dueDate).toLocaleDateString('en-IN') : 'Term Start'}
                        </Text>
                      </View>
                      <Text style={styles.instAmount}>{formatRupee(inst.amount)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        ) : (
          /* List of All Fee Structures */
          <View style={styles.listWrap}>
            {structures.map((s) => (
              <PressableScale
                key={s.id}
                onPress={() => setSelectedStructure(s)}
                style={styles.structCard}
              >
                <View style={styles.structLeft}>
                  <View style={styles.structIconWrap}>
                    <CreditCard size={18} color="#4E342E" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.structTitle}>{s.title}</Text>
                    <View style={styles.structSubRow}>
                      {s.targetClass && (
                        <View style={styles.classPill}>
                          <Text style={styles.classPillText}>Class {s.targetClass}</Text>
                        </View>
                      )}
                      <Text style={styles.structFreq}>
                        {s.frequency || 'ANNUAL'} &bull; {s.installments?.length || 1} Installment(s)
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.structRight}>
                  <Text style={styles.structAmount}>{formatRupee(s.totalAmount)}</Text>
                  <ChevronRight size={14} color="#8D6E63" style={{ marginTop: 2 }} />
                </View>
              </PressableScale>
            ))}
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
  listWrap: {
    gap: 10,
  },
  structCard: {
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
  structLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  structIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F5ECE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  structTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#2D1E18',
  },
  structSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  classPill: {
    backgroundColor: '#FAF7F2',
    borderWidth: 1,
    borderColor: '#D7CCC8',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  classPillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#4E342E',
  },
  structFreq: {
    fontSize: 10.5,
    color: '#8D6E63',
  },
  structRight: {
    alignItems: 'flex-end',
  },
  structAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4E342E',
  },
  detailWrap: {
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
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#EFEBE9',
    padding: 16,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEBE9',
  },
  detailTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2D1E18',
  },
  detailClass: {
    fontSize: 11,
    color: '#8D6E63',
    marginTop: 2,
  },
  freqBadge: {
    backgroundColor: '#4E342E',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  freqBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
  },
  totalBox: {
    backgroundColor: '#FAF7F2',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginVertical: 14,
    borderWidth: 1,
    borderColor: '#EFEBE9',
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8D6E63',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  totalVal: {
    fontSize: 26,
    fontWeight: '800',
    color: '#4E342E',
  },
  sectionWrap: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EFEBE9',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8D6E63',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  compRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  compName: {
    fontSize: 12.5,
    color: '#5D4037',
  },
  compAmount: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#2D1E18',
  },
  instRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  instTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2D1E18',
  },
  instDate: {
    fontSize: 10.5,
    color: '#8D6E63',
  },
  instAmount: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#4E342E',
  },
});
