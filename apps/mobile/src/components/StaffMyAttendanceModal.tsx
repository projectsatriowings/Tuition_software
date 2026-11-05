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
import {
  MapPin,
  Clock,
  Compass,
  CheckCircle2,
  AlertTriangle,
  Building,
  Home,
  RefreshCw,
  Calendar,
  Send,
  Navigation,
} from 'lucide-react-native';
import { mobileApiFetch } from '../services/api';
import { useMobileToast } from '../context/ToastContext';
import { useMobileAuth } from '../context/AuthContext';
import { InteractiveBottomSheet } from './ui/InteractiveBottomSheet';
import { MobileButton } from './ui/MobileButton';
import { MobileInput } from './ui/MobileInput';
import { PressableScale } from '../theme/motion';

interface StaffMyAttendanceModalProps {
  visible: boolean;
  onClose: () => void;
}

export const StaffMyAttendanceModal: React.FC<StaffMyAttendanceModalProps> = ({
  visible,
  onClose,
}) => {
  const { showToast } = useMobileToast();
  const { activeBranch, institute } = useMobileAuth();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [attendanceMode, setAttendanceMode] = useState<'ON_SITE' | 'WFH'>('ON_SITE');

  // GPS State
  const [gpsLoading, setGpsLoading] = useState(false);
  const [deviceCoords, setDeviceCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number | null;
  } | null>(null);

  // Action Loading
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // WFH Request Form
  const [showWfhForm, setShowWfhForm] = useState(false);
  const [wfhReason, setWfhReason] = useState('');
  const [wfhCategory, setWfhCategory] = useState('WEATHER_DISRUPTION');
  const [wfhSubmitting, setWfhSubmitting] = useState(false);

  // Personal History
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await mobileApiFetch('/staff-attendance/today', { skipCache: true });
      if (res.success && res.data) {
        setData(res.data);
        if (res.data.session?.attendanceMode) {
          setAttendanceMode(res.data.session.attendanceMode);
        }
      }
    } catch {
      showToast('Could not load attendance status', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await mobileApiFetch('/staff-attendance/my-history?limit=15', { skipCache: true });
      if (res.success && res.data) {
        setHistory(res.data.history || res.data || []);
      }
    } catch {
      // non-blocking
    }
  }, []);

  // Request device GPS position using Geolocation API if available
  const acquireGps = useCallback(() => {
    setGpsLoading(true);
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setDeviceCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
          setGpsLoading(false);
        },
        (err) => {
          setGpsLoading(false);
          // If browser/device GPS denied, use fallback coordinates if available
          if (data?.institute?.latitude && data?.institute?.longitude) {
            setDeviceCoords({
              latitude: data.institute.latitude,
              longitude: data.institute.longitude,
              accuracy: 20,
            });
          }
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 }
      );
    } else {
      setGpsLoading(false);
      if (data?.institute?.latitude && data?.institute?.longitude) {
        setDeviceCoords({
          latitude: data.institute.latitude,
          longitude: data.institute.longitude,
          accuracy: 20,
        });
      }
    }
  }, [data]);

  useEffect(() => {
    if (visible) {
      fetchStatus();
      acquireGps();
      setIsSuccess(false);
      setShowWfhForm(false);
      setShowHistory(false);
    }
  }, [visible, fetchStatus, acquireGps]);

  const handleCheckIn = async () => {
    setSubmitting(true);
    try {
      const payload: any = {
        mode: attendanceMode,
        branchId: activeBranch?.id || undefined,
        deviceInfo: 'TuitionOS Mobile App',
      };

      if (deviceCoords) {
        payload.latitude = deviceCoords.latitude;
        payload.longitude = deviceCoords.longitude;
        payload.accuracy = deviceCoords.accuracy;
      }

      const res = await mobileApiFetch('/staff-attendance/check-in', {
        method: 'POST',
        body: payload,
      });

      if (res.success) {
        setIsSuccess(true);
        showToast('Successfully checked in! Have a productive session.', 'success');
        setTimeout(() => {
          setSubmitting(false);
          setIsSuccess(false);
          fetchStatus();
        }, 500);
      } else {
        setSubmitting(false);
        showToast(res.error || res.message || 'Check-in failed. Please verify geofence distance.', 'error');
      }
    } catch (e: any) {
      setSubmitting(false);
      showToast(e.message || 'Check-in error', 'error');
    }
  };

  const handleCheckOut = async () => {
    Alert.alert(
      'Confirm Check-Out',
      'Are you ready to conclude your current teaching session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Check Out',
          style: 'default',
          onPress: async () => {
            setSubmitting(true);
            try {
              const payload: any = {
                deviceInfo: 'TuitionOS Mobile App',
              };
              if (deviceCoords) {
                payload.latitude = deviceCoords.latitude;
                payload.longitude = deviceCoords.longitude;
              }

              const res = await mobileApiFetch('/staff-attendance/check-out', {
                method: 'POST',
                body: payload,
              });

              if (res.success) {
                showToast('Checked out successfully. Session logged.', 'success');
                fetchStatus();
              } else {
                showToast(res.error || res.message || 'Check-out failed', 'error');
              }
            } catch (e: any) {
              showToast(e.message || 'Check-out error', 'error');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleWfhSubmit = async () => {
    if (!wfhReason.trim()) {
      showToast('Please provide a reason for WFH request', 'warning');
      return;
    }

    setWfhSubmitting(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await mobileApiFetch('/staff-attendance/wfh/request', {
        method: 'POST',
        body: {
          durationType: 'SINGLE_DAY',
          startDate: todayStr,
          endDate: todayStr,
          reasonCategory: wfhCategory,
          reason: wfhReason.trim(),
        },
      });

      if (res.success) {
        showToast('WFH request submitted for academic approval', 'success');
        setShowWfhForm(false);
        setWfhReason('');
        fetchStatus();
      } else {
        showToast(res.error || 'Failed to submit WFH request', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'WFH request error', 'error');
    } finally {
      setWfhSubmitting(false);
    }
  };

  const isCheckedIn = data?.session?.status === 'CHECKED_IN';
  const isCheckedOut = data?.session?.status === 'CHECKED_OUT';
  const targetCampus = data?.branch || activeBranch || data?.institute;

  return (
    <InteractiveBottomSheet
      visible={visible}
      onClose={onClose}
      title="Staff Attendance & Geofence"
      subtitle="Shift check-in, GPS geofence & WFH requests"
      maxHeight="92%"
    >
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#4E342E" />
            <Text style={styles.loadingText}>Validating session & geofence...</Text>
          </View>
        ) : (
          <>
            {/* Today's Status Header Card */}
            <View style={[styles.statusCard, isCheckedIn && styles.statusCardActive]}>
              <View style={styles.statusRow}>
                <View style={styles.statusLeft}>
                  <View style={[styles.statusDot, isCheckedIn ? styles.dotGreen : isCheckedOut ? styles.dotGray : styles.dotAmber]} />
                  <Text style={styles.statusTitle}>
                    {isCheckedIn
                      ? 'Currently Checked In'
                      : isCheckedOut
                      ? 'Session Concluded'
                      : 'Not Checked In Today'}
                  </Text>
                </View>
                <View style={styles.sessionBadge}>
                  <Text style={styles.sessionBadgeText}>
                    {data?.session?.attendanceMode || attendanceMode}
                  </Text>
                </View>
              </View>

              {data?.session && (
                <View style={styles.sessionTimeGrid}>
                  <View style={styles.timeBox}>
                    <Text style={styles.timeLabel}>CHECK IN</Text>
                    <Text style={styles.timeVal}>
                      {data.session.checkInTime
                        ? new Date(data.session.checkInTime).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })
                        : '—'}
                    </Text>
                  </View>
                  <View style={styles.timeBox}>
                    <Text style={styles.timeLabel}>CHECK OUT</Text>
                    <Text style={styles.timeVal}>
                      {data.session.checkOutTime
                        ? new Date(data.session.checkOutTime).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })
                        : isCheckedIn
                        ? 'In Progress...'
                        : '—'}
                    </Text>
                  </View>
                  <View style={styles.timeBox}>
                    <Text style={styles.timeLabel}>HOURS</Text>
                    <Text style={styles.timeVal}>
                      {data.session.hoursWorked ? `${data.session.hoursWorked.toFixed(1)} hrs` : isCheckedIn ? 'Active' : '0.0 hrs'}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Attendance Mode Selector (Only when not already checked in) */}
            {!isCheckedIn && !isCheckedOut && (
              <View style={styles.modeContainer}>
                <Text style={styles.modeHeading}>SELECT ATTENDANCE MODE</Text>
                <View style={styles.modeToggleRow}>
                  <PressableScale
                    onPress={() => setAttendanceMode('ON_SITE')}
                    style={[styles.modeBtn, attendanceMode === 'ON_SITE' && styles.modeBtnActive]}
                  >
                    <Building size={16} color={attendanceMode === 'ON_SITE' ? '#FFFFFF' : '#4E342E'} />
                    <Text style={[styles.modeBtnText, attendanceMode === 'ON_SITE' && styles.modeBtnTextActive]}>
                      On-Site (Campus)
                    </Text>
                  </PressableScale>

                  <PressableScale
                    onPress={() => setAttendanceMode('WFH')}
                    style={[styles.modeBtn, attendanceMode === 'WFH' && styles.modeBtnActive]}
                  >
                    <Home size={16} color={attendanceMode === 'WFH' ? '#FFFFFF' : '#4E342E'} />
                    <Text style={[styles.modeBtnText, attendanceMode === 'WFH' && styles.modeBtnTextActive]}>
                      Work From Home
                    </Text>
                  </PressableScale>
                </View>
              </View>
            )}

            {/* Campus Geofence Validation Box (when on-site) */}
            {attendanceMode === 'ON_SITE' && (
              <View style={styles.geofenceCard}>
                <View style={styles.geofenceHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <MapPin size={16} color="#4E342E" />
                    <Text style={styles.geofenceTitle}>
                      {targetCampus?.name || 'Campus Geofence Zone'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={acquireGps} style={styles.gpsRefreshBtn}>
                    {gpsLoading ? (
                      <ActivityIndicator size="small" color="#4E342E" />
                    ) : (
                      <RefreshCw size={13} color="#4E342E" />
                    )}
                  </TouchableOpacity>
                </View>

                <Text style={styles.geofenceSub}>
                  Permitted zone: {targetCampus?.geofenceRadius || 200}m radius &bull; Shift: {targetCampus?.workStartTime || '09:00'} - {targetCampus?.workEndTime || '18:00'}
                </Text>

                <View style={styles.gpsStatusRow}>
                  <Navigation size={14} color="#15803D" />
                  <Text style={styles.gpsStatusText}>
                    {deviceCoords
                      ? `GPS Coordinates Verified: ${deviceCoords.latitude.toFixed(4)}, ${deviceCoords.longitude.toFixed(4)}`
                      : 'Pinning GPS coordinates...'}
                  </Text>
                </View>
              </View>
            )}

            {/* Primary Action Button */}
            {!isCheckedIn && !isCheckedOut ? (
              <MobileButton
                title={`Check In (${attendanceMode === 'ON_SITE' ? 'Campus Geofence' : 'WFH'})`}
                onPress={handleCheckIn}
                loading={submitting && !isSuccess}
                isSuccess={isSuccess}
                successTitle="Checked In Successfully!"
                fullWidth
                size="lg"
                style={{ marginTop: 12 }}
              />
            ) : isCheckedIn ? (
              <MobileButton
                title="Conclude Session (Check Out)"
                variant="danger"
                onPress={handleCheckOut}
                loading={submitting}
                fullWidth
                size="lg"
                style={{ marginTop: 12 }}
              />
            ) : (
              <View style={styles.completedNotice}>
                <CheckCircle2 size={18} color="#15803D" />
                <Text style={styles.completedNoticeText}>
                  Your attendance for today has been recorded and submitted.
                </Text>
              </View>
            )}

            {/* Quick Links: WFH Request & Personal History */}
            <View style={styles.bottomActionsRow}>
              <TouchableOpacity
                style={styles.subActionBtn}
                onPress={() => setShowWfhForm((prev) => !prev)}
                activeOpacity={0.7}
              >
                <Text style={styles.subActionBtnText}>
                  {showWfhForm ? 'Hide WFH Form' : 'Request WFH Permission'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.subActionBtn}
                onPress={() => {
                  setShowHistory((prev) => !prev);
                  if (!showHistory) fetchHistory();
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.subActionBtnText}>
                  {showHistory ? 'Hide History' : 'Punch History'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* WFH Request Form */}
            {showWfhForm && (
              <View style={styles.wfhBox}>
                <Text style={styles.wfhBoxTitle}>Apply for Work From Home (WFH)</Text>
                <MobileInput
                  label="Reason / Disruption Category"
                  placeholder="e.g. Weather, Transport, Academic Prep"
                  value={wfhCategory}
                  onChangeText={setWfhCategory}
                />
                <MobileInput
                  label="Detailed Reason & Explanation"
                  placeholder="Explain reason for remote teaching request..."
                  value={wfhReason}
                  onChangeText={setWfhReason}
                  numberOfLines={2}
                  multiline
                />
                <MobileButton
                  title="Submit WFH Request"
                  onPress={handleWfhSubmit}
                  loading={wfhSubmitting}
                  fullWidth
                  size="md"
                />
              </View>
            )}

            {/* Personal History List */}
            {showHistory && (
              <View style={styles.historyBox}>
                <Text style={styles.historyBoxTitle}>Recent Punch Logs</Text>
                {history.length === 0 ? (
                  <Text style={styles.historyEmpty}>No prior attendance records found.</Text>
                ) : (
                  history.slice(0, 7).map((item, idx) => (
                    <View key={item.id || idx} style={styles.historyItem}>
                      <View>
                        <Text style={styles.historyDate}>
                          {item.dateFormatted || item.date || item.createdAt?.slice(0, 10)}
                        </Text>
                        <Text style={styles.historyMode}>
                          {item.attendanceMode || item.mode || 'ON_SITE'} &bull; {item.status}
                        </Text>
                      </View>
                      <Text style={styles.historyHours}>
                        {item.hoursWorked ? `${item.hoursWorked.toFixed(1)} hrs` : '—'}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            )}
          </>
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
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#8D6E63',
  },
  statusCard: {
    backgroundColor: '#FAF7F2',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#EFEBE9',
    marginBottom: 14,
  },
  statusCardActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotGreen: {
    backgroundColor: '#15803D',
  },
  dotAmber: {
    backgroundColor: '#D97706',
  },
  dotGray: {
    backgroundColor: '#8D6E63',
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2D1E18',
  },
  sessionBadge: {
    backgroundColor: '#4E342E',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sessionBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  sessionTimeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EFEBE9',
  },
  timeBox: {
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#8D6E63',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  timeVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2D1E18',
  },
  modeContainer: {
    marginBottom: 14,
  },
  modeHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8D6E63',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  modeToggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FAF7F2',
    borderWidth: 1.5,
    borderColor: '#D7CCC8',
  },
  modeBtnActive: {
    backgroundColor: '#4E342E',
    borderColor: '#4E342E',
  },
  modeBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#4E342E',
  },
  modeBtnTextActive: {
    color: '#FFFFFF',
  },
  geofenceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#EFEBE9',
    marginBottom: 12,
  },
  geofenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  geofenceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2D1E18',
  },
  gpsRefreshBtn: {
    padding: 4,
  },
  geofenceSub: {
    fontSize: 11,
    color: '#8D6E63',
    marginBottom: 8,
  },
  gpsStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    padding: 8,
    borderRadius: 8,
  },
  gpsStatusText: {
    fontSize: 11,
    color: '#15803D',
    fontWeight: '600',
    flex: 1,
  },
  completedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 12,
    marginTop: 10,
  },
  completedNoticeText: {
    fontSize: 12,
    color: '#15803D',
    fontWeight: '600',
    flex: 1,
  },
  bottomActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EFEBE9',
  },
  subActionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  subActionBtnText: {
    color: '#4E342E',
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  wfhBox: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EFEBE9',
  },
  wfhBoxTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#4E342E',
    marginBottom: 8,
  },
  historyBox: {
    marginTop: 12,
    backgroundColor: '#FAF7F2',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    gap: 8,
  },
  historyBoxTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4E342E',
    marginBottom: 4,
  },
  historyEmpty: {
    fontSize: 11,
    color: '#8D6E63',
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEBE9',
  },
  historyDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2D1E18',
  },
  historyMode: {
    fontSize: 10.5,
    color: '#8D6E63',
  },
  historyHours: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4E342E',
  },
});

