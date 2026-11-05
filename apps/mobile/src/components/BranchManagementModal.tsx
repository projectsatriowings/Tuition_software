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
import { Building2, MapPin, Clock, Users, GraduationCap, Plus, RefreshCw, AlertTriangle, CheckCircle, Navigation } from 'lucide-react-native';
import { mobileApiFetch } from '../services/api';
import { useMobileToast } from '../context/ToastContext';
import { useMobileAuth, MobileBranch } from '../context/AuthContext';
import { InteractiveBottomSheet } from './ui/InteractiveBottomSheet';
import { MobileInput } from './ui/MobileInput';
import { MobileButton } from './ui/MobileButton';
import { PressableScale } from '../theme/motion';

interface BranchManagementModalProps {
  visible: boolean;
  onClose: () => void;
}

export const BranchManagementModal: React.FC<BranchManagementModalProps> = ({
  visible,
  onClose,
}) => {
  const { showToast } = useMobileToast();
  const { loadBranches } = useMobileAuth();

  const [branches, setBranches] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // New Branch Form
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [radius, setRadius] = useState('200');
  const [workStart, setWorkStart] = useState('09:00');
  const [workEnd, setWorkEnd] = useState('18:00');
  const [graceMinutes, setGraceMinutes] = useState('15');
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const fetchBranches = useCallback(async () => {
    try {
      setLoading(true);
      const [listRes, sumRes] = await Promise.all([
        mobileApiFetch('/branches', { skipCache: true }),
        mobileApiFetch('/branches/summary', { skipCache: true }),
      ]);

      if (listRes.success && Array.isArray(listRes.data)) {
        setBranches(listRes.data);
      }
      if (sumRes.success && sumRes.data) {
        setSummary(sumRes.data);
      }
    } catch {
      showToast('Could not load branch information', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (visible) {
      fetchBranches();
      setShowAddForm(false);
      setName('');
      setCode('');
      setAddress('');
      setCity('');
      setLat('');
      setLng('');
      setIsSuccess(false);
    }
  }, [visible, fetchBranches]);

  // Auto-generate code from branch name
  const handleNameChange = (text: string) => {
    setName(text);
    if (!code || code === autoGenerateCode(name)) {
      setCode(autoGenerateCode(text));
    }
  };

  const autoGenerateCode = (raw: string): string => {
    if (!raw.trim()) return '';
    const words = raw.trim().split(/\s+/).filter(Boolean);
    if (words.length >= 3) {
      return words.map((w) => w[0]).join('').slice(0, 4).toUpperCase();
    } else if (words.length === 2) {
      return (words[0].slice(0, 2) + words[1].slice(0, 2)).toUpperCase();
    }
    return (raw.slice(0, 3)).toUpperCase();
  };

  const handleCreateBranch = async () => {
    if (!name.trim()) {
      showToast('Branch name is required', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        name: name.trim(),
        code: (code.trim() || autoGenerateCode(name)).toUpperCase(),
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        geofenceRadius: Number(radius) || 200,
        workStartTime: workStart || '09:00',
        workEndTime: workEnd || '18:00',
        lateGraceMinutes: Number(graceMinutes) || 15,
      };

      if (lat && lng) {
        payload.latitude = parseFloat(lat);
        payload.longitude = parseFloat(lng);
      }

      const res = await mobileApiFetch('/branches', {
        method: 'POST',
        body: payload,
      });

      if (res.success) {
        setIsSuccess(true);
        showToast(`Branch ${name} established successfully!`, 'success');
        await loadBranches();
        setTimeout(() => {
          setSubmitting(false);
          setShowAddForm(false);
          setIsSuccess(false);
          fetchBranches();
        }, 500);
      } else {
        setSubmitting(false);
        showToast(res.error || 'Failed to establish branch', 'error');
      }
    } catch (e: any) {
      setSubmitting(false);
      showToast(e.message || 'Error creating branch', 'error');
    }
  };

  const handleToggleActive = (branch: any) => {
    const isActivating = !branch.isActive;
    Alert.alert(
      isActivating ? 'Reactivate Campus Branch' : 'Deactivate Campus Branch',
      `Are you sure you want to ${isActivating ? 'reactivate' : 'deactivate'} ${branch.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isActivating ? 'Reactivate' : 'Deactivate',
          style: isActivating ? 'default' : 'destructive',
          onPress: async () => {
            try {
              const res = await mobileApiFetch(`/branches/${branch.id}/${isActivating ? 'reactivate' : 'deactivate'}`, {
                method: 'POST',
              });
              if (res.success) {
                showToast(`Branch ${branch.name} updated`, 'success');
                await loadBranches();
                fetchBranches();
              } else {
                showToast(res.error || 'Operation failed', 'error');
              }
            } catch (err: any) {
              showToast(err.message || 'Network error', 'error');
            }
          },
        },
      ]
    );
  };

  return (
    <InteractiveBottomSheet
      visible={visible}
      onClose={onClose}
      title="Campus & Branch Management"
      subtitle="Multi-campus physical branches, geofences & shifts"
      maxHeight="92%"
    >
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Consolidated Metrics Bar */}
        {summary && (
          <View style={styles.metricsRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricVal}>{summary.totalBranches || branches.length}</Text>
              <Text style={styles.metricLbl}>Campuses</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricVal}>{summary.activeStaffCount || 0}</Text>
              <Text style={styles.metricLbl}>Staff</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricVal}>{summary.activeStudentsCount || 0}</Text>
              <Text style={styles.metricLbl}>Students</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricVal}>{summary.activeBatches || 0}</Text>
              <Text style={styles.metricLbl}>Batches</Text>
            </View>
          </View>
        )}

        {/* Action Toggle: List vs Add New */}
        <View style={styles.headerActionRow}>
          <Text style={styles.sectionHeading}>
            {showAddForm ? 'Establish New Physical Campus' : `Active Physical Campuses (${branches.length})`}
          </Text>
          <TouchableOpacity
            style={styles.toggleBtn}
            onPress={() => setShowAddForm((prev) => !prev)}
            activeOpacity={0.8}
          >
            {showAddForm ? (
              <Text style={styles.toggleBtnText}>View All Campuses</Text>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Plus size={14} color="#FFFFFF" strokeWidth={2.8} />
                <Text style={[styles.toggleBtnText, { color: '#FFFFFF' }]}>New Branch</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#4E342E" />
            <Text style={styles.loadingText}>Fetching campus details...</Text>
          </View>
        ) : showAddForm ? (
          /* Add Branch Form */
          <View style={styles.formContainer}>
            <MobileInput
              label="Campus / Branch Name"
              placeholder="e.g. Main Campus, North Annex"
              value={name}
              onChangeText={handleNameChange}
              required
            />

            <MobileInput
              label="Branch Code"
              placeholder="Auto-generated or custom"
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              autoCapitalize="characters"
              hint="Unique 3-4 character code"
            />

            <View style={styles.formRow}>
              <View style={{ flex: 1 }}>
                <MobileInput
                  label="City"
                  placeholder="e.g. Chennai"
                  value={city}
                  onChangeText={setCity}
                />
              </View>
              <View style={{ flex: 1 }}>
                <MobileInput
                  label="Geofence Radius (m)"
                  placeholder="200"
                  value={radius}
                  onChangeText={setRadius}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <MobileInput
              label="Address"
              placeholder="Physical street address"
              value={address}
              onChangeText={setAddress}
            />

            <View style={styles.formRow}>
              <View style={{ flex: 1 }}>
                <MobileInput
                  label="GPS Latitude"
                  placeholder="e.g. 13.0827"
                  value={lat}
                  onChangeText={setLat}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <MobileInput
                  label="GPS Longitude"
                  placeholder="e.g. 80.2707"
                  value={lng}
                  onChangeText={setLng}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={{ flex: 1 }}>
                <MobileInput
                  label="Work Start (HH:MM)"
                  placeholder="09:00"
                  value={workStart}
                  onChangeText={setWorkStart}
                />
              </View>
              <View style={{ flex: 1 }}>
                <MobileInput
                  label="Work End (HH:MM)"
                  placeholder="18:00"
                  value={workEnd}
                  onChangeText={setWorkEnd}
                />
              </View>
            </View>

            <MobileButton
              title="Establish Branch"
              onPress={handleCreateBranch}
              loading={submitting && !isSuccess}
              isSuccess={isSuccess}
              successTitle="Campus Established!"
              fullWidth
              size="lg"
              style={{ marginTop: 8 }}
            />
          </View>
        ) : (
          /* Branches List */
          <View style={styles.branchList}>
            {branches.map((b) => (
              <View key={b.id} style={[styles.branchCard, !b.isActive && styles.branchCardInactive]}>
                <View style={styles.branchHeaderRow}>
                  <View style={styles.branchHeaderLeft}>
                    <View style={styles.branchIconWrap}>
                      <Building2 size={18} color="#4E342E" />
                    </View>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.branchName}>{b.name}</Text>
                        {b.isDefault && (
                          <View style={styles.hqPill}>
                            <Text style={styles.hqPillText}>HQ</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.branchCode}>
                        Code: {b.code} {b.city ? `• ${b.city}` : ''}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleToggleActive(b)}
                    style={[styles.statusToggleBadge, b.isActive ? styles.badgeActive : styles.badgeInactive]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.statusToggleText, b.isActive ? styles.statusActiveText : styles.statusInactiveText]}>
                      {b.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Details info */}
                <View style={styles.branchDetailsGrid}>
                  <View style={styles.detailItem}>
                    <MapPin size={12} color="#8D6E63" />
                    <Text style={styles.detailItemText} numberOfLines={1}>
                      {b.latitude && b.longitude
                        ? `${b.latitude.toFixed(4)}, ${b.longitude.toFixed(4)} (${b.geofenceRadius || 200}m)`
                        : 'No GPS pinned'}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Clock size={12} color="#8D6E63" />
                    <Text style={styles.detailItemText}>
                      Shift: {b.workStartTime || '09:00'} - {b.workEndTime || '18:00'}
                    </Text>
                  </View>
                </View>

                {/* Metrics Footer */}
                <View style={styles.branchMetricsFooter}>
                  <View style={styles.metricPill}>
                    <Users size={11} color="#6D4C41" />
                    <Text style={styles.metricPillText}>
                      {b._count?.staffAssignments ?? b.metrics?.activeStaffCount ?? 0} Staff
                    </Text>
                  </View>
                  <View style={styles.metricPill}>
                    <GraduationCap size={11} color="#6D4C41" />
                    <Text style={styles.metricPillText}>
                      {b._count?.studentEnrollments ?? b.metrics?.activeStudentsCount ?? 0} Students
                    </Text>
                  </View>
                  <View style={styles.metricPill}>
                    <Text style={styles.metricPillText}>
                      {b._count?.batches ?? b.metrics?.activeBatches ?? 0} Batches
                    </Text>
                  </View>
                </View>
              </View>
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
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: '#FAF7F2',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    marginBottom: 16,
    justifyContent: 'space-around',
  },
  metricBox: {
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#4E342E',
  },
  metricLbl: {
    fontSize: 10,
    color: '#8D6E63',
    fontWeight: '600',
    marginTop: 2,
  },
  headerActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4E342E',
  },
  toggleBtn: {
    backgroundColor: '#4E342E',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  toggleBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  loadingBox: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#8D6E63',
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    padding: 14,
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
  },
  branchList: {
    gap: 10,
  },
  branchCard: {
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
  branchCardInactive: {
    opacity: 0.65,
    backgroundColor: '#FAF7F2',
  },
  branchHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  branchHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  branchIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F5ECE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  branchName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#2D1E18',
  },
  branchCode: {
    fontSize: 11,
    color: '#8D6E63',
    marginTop: 1,
  },
  hqPill: {
    backgroundColor: '#4E342E',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  hqPillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  statusToggleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  badgeInactive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  statusToggleText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  statusActiveText: {
    color: '#15803D',
  },
  statusInactiveText: {
    color: '#B91C1C',
  },
  branchDetailsGrid: {
    gap: 4,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#F5ECE8',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailItemText: {
    fontSize: 11,
    color: '#6D4C41',
  },
  branchMetricsFooter: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F5ECE8',
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FAF7F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EFEBE9',
  },
  metricPillText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#6D4C41',
  },
});
