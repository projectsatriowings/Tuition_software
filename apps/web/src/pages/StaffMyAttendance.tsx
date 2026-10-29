import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Compass,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Calendar,
  ShieldCheck,
  Navigation,
  Check,
  ChevronRight,
  Info,
  HelpCircle,
} from 'lucide-react';

// Client-side Haversine for instant UI visual feedback (server always recalculates authoritatively)
function calculateClientDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export const StaffMyAttendance: React.FC = () => {
  const { user } = useAuth();

  // Status & Data State
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Live Clock
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // GPS Device State
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [deviceCoords, setDeviceCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number | null;
  } | null>(null);

  // Action Loading & Messages
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
  } | null>(null);

  // Personal History
  const [history, setHistory] = useState<any[]>([]);
  const [historyMetrics, setHistoryMetrics] = useState<any>(null);

  // Keep clock updated
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Today's Attendance Status
  const fetchTodayStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/staff-attendance/today');
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      console.error('[StaffMyAttendance] Fetch today error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch 7-Day History
  const fetchHistory = useCallback(async () => {
    try {
      const res = await apiFetch('/staff-attendance/my-history?limit=7');
      if (res.success && res.data) {
        setHistory(res.data.sessions || []);
        setHistoryMetrics(res.data.metrics || null);
      }
    } catch (err) {
      console.error('[StaffMyAttendance] Fetch history error:', err);
    }
  }, []);

  useEffect(() => {
    fetchTodayStatus();
    fetchHistory();
  }, [fetchTodayStatus, fetchHistory]);

  // Request & Verify Device GPS Location
  const verifyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your device or browser.');
      return;
    }

    setGpsLoading(true);
    setGpsError(null);
    setFeedback(null);

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
        let msg = 'Failed to obtain GPS location.';
        if (err.code === 1) msg = 'Location permission denied. Please allow location access in your browser settings.';
        else if (err.code === 2) msg = 'Position unavailable. Please turn on device GPS/Location services.';
        else if (err.code === 3) msg = 'GPS request timed out. Please retry outdoors.';
        setGpsError(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 5000,
      }
    );
  }, []);

  // Automatically trigger location verification on mount
  useEffect(() => {
    verifyLocation();
  }, [verifyLocation]);

  // Calculated distance & eligibility
  const institute = data?.institute;
  const session = data?.session;
  const status = data?.status || 'NOT_CHECKED_IN';

  const clientDistance = useMemo(() => {
    if (
      !deviceCoords ||
      !institute ||
      institute.latitude == null ||
      institute.longitude == null
    ) {
      return null;
    }
    return calculateClientDistance(
      institute.latitude,
      institute.longitude,
      deviceCoords.latitude,
      deviceCoords.longitude
    );
  }, [deviceCoords, institute]);

  const isWithinRadius = clientDistance != null && institute ? clientDistance <= institute.geofenceRadius : false;
  const isAccuracyGood = deviceCoords?.accuracy != null && institute ? deviceCoords.accuracy <= institute.gpsAccuracyThreshold : false;

  const canCheckIn =
    status === 'NOT_CHECKED_IN' &&
    deviceCoords != null &&
    isWithinRadius &&
    isAccuracyGood &&
    !actionSubmitting;

  const canCheckOut =
    status === 'CHECKED_IN' || status === 'LATE' || status === 'MANUALLY_CORRECTED';

  // Elapsed Session Time (Live duration)
  const elapsedTimer = useMemo(() => {
    if (!session?.checkInTime || session?.checkOutTime) return null;
    const checkInMs = new Date(session.checkInTime).getTime();
    const nowMs = currentTime.getTime();
    const diffSeconds = Math.max(0, Math.floor((nowMs - checkInMs) / 1000));

    const hours = Math.floor(diffSeconds / 3600);
    const minutes = Math.floor((diffSeconds % 3600) / 60);
    const seconds = diffSeconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, [session, currentTime]);

  // Handle Check-In
  const handleCheckIn = async () => {
    if (!deviceCoords) {
      verifyLocation();
      return;
    }

    try {
      setActionSubmitting(true);
      setFeedback(null);

      const res = await apiFetch('/staff-attendance/check-in', {
        method: 'POST',
        body: JSON.stringify({
          latitude: deviceCoords.latitude,
          longitude: deviceCoords.longitude,
          accuracy: deviceCoords.accuracy,
          deviceInfo: navigator.userAgent,
          idempotencyKey: `checkin_${data?.staff?.id}_${data?.todayDateStr}`,
        }),
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          message: res.message || 'Checked in successfully!',
        });
        await fetchTodayStatus();
        await fetchHistory();
      } else {
        setFeedback({
          type: 'error',
          message: res.message || 'Check-in failed.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Network error during check-in.',
      });
    } finally {
      setActionSubmitting(false);
    }
  };

  // Handle Check-Out
  const handleCheckOut = async () => {
    try {
      setActionSubmitting(true);
      setFeedback(null);

      const payload: any = {
        deviceInfo: navigator.userAgent,
        idempotencyKey: `checkout_${data?.staff?.id}_${data?.todayDateStr}`,
      };

      if (deviceCoords) {
        payload.latitude = deviceCoords.latitude;
        payload.longitude = deviceCoords.longitude;
        payload.accuracy = deviceCoords.accuracy;
      }

      const res = await apiFetch('/staff-attendance/check-out', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          message: res.message || 'Checked out successfully!',
        });
        await fetchTodayStatus();
        await fetchHistory();
      } else {
        setFeedback({
          type: 'error',
          message: res.message || 'Check-out failed.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Network error during check-out.',
      });
    } finally {
      setActionSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-[#6D4C41]">
        <div className="flex items-center gap-2 font-semibold">
          <RefreshCw className="w-5 h-5 animate-spin text-[#4E342E]" />
          <span>Verifying attendance profile & geofence...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-[#D7CCC8] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#4E342E] text-white flex items-center justify-center font-bold text-lg shadow-sm">
              {data?.staff?.name?.charAt(0) || 'S'}
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#2D1E18]">{data?.staff?.name || 'Staff Member'}</h1>
              <div className="flex items-center gap-2 text-xs text-[#8D6E63] font-medium">
                <span className="font-mono bg-[#FAF8F5] px-1.5 py-0.5 rounded border border-[#D7CCC8]">
                  {data?.staff?.employeeCode || 'STAFF'}
                </span>
                <span>•</span>
                <span>{data?.staff?.designation || 'Faculty'}</span>
                <span>•</span>
                <span>{institute?.name || 'Tuition Institute'}</span>
              </div>
            </div>
          </div>

          {/* Live Digital Clock */}
          <div className="text-left sm:text-right bg-[#FAF8F5] px-3.5 py-2 rounded-xl border border-[#D7CCC8]">
            <div className="text-[11px] font-semibold text-[#8D6E63] uppercase">
              {currentTime.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
            </div>
            <div className="text-base font-mono font-bold text-[#2D1E18]">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center gap-2.5 animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : feedback.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Main Action & GPS Verification Hub */}
      <div className="bg-white rounded-2xl p-6 border border-[#D7CCC8] shadow-sm space-y-6">
        {/* Status Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#D7CCC8]">
          <span className="text-xs font-bold text-[#8D6E63] uppercase tracking-wider">Today's Attendance Status</span>
          <div>
            {status === 'CHECKED_IN' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Active Work Session
              </span>
            )}
            {status === 'CHECKED_OUT' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                <Check className="w-3.5 h-3.5 text-blue-600" />
                Completed For Today
              </span>
            )}
            {status === 'LATE' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Checked In (Late Arrival)
              </span>
            )}
            {status === 'NOT_CHECKED_IN' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-600 border border-stone-300">
                Not Checked In
              </span>
            )}
          </div>
        </div>

        {/* Live Active Session Timer (if checked in) */}
        {elapsedTimer && (
          <div className="bg-gradient-to-r from-[#4E342E] to-[#3E2723] text-white p-5 rounded-2xl shadow-sm text-center space-y-1">
            <div className="text-xs font-semibold text-[#D7CCC8] uppercase tracking-wider flex items-center justify-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Live Work Duration
            </div>
            <div className="text-3xl font-mono font-bold tracking-widest">{elapsedTimer}</div>
            <div className="text-[11px] text-[#BCAAA4]">
              Checked in at{' '}
              {session?.checkInTime
                ? new Date(session.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : ''}
            </div>
          </div>
        )}

        {/* Geofence & Location Telemetry Card */}
        <div className="bg-[#FAF8F5] rounded-xl p-4 border border-[#D7CCC8] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#8D6E63]" />
              <span className="text-xs font-bold text-[#2D1E18]">Institute Geofence Range (200m)</span>
            </div>

            <button
              onClick={verifyLocation}
              disabled={gpsLoading}
              className="text-xs font-semibold text-[#4E342E] hover:text-[#2D1E18] flex items-center gap-1 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-spin' : ''}`} />
              <span>{gpsLoading ? 'Acquiring GPS...' : 'Refresh GPS'}</span>
            </button>
          </div>

          {gpsError ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{gpsError}</p>
                <p className="text-[11px] mt-0.5">Please ensure GPS is enabled and permissions are granted.</p>
              </div>
            </div>
          ) : deviceCoords ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#6D4C41]">Geodesic Distance to Institute:</span>
                <span
                  className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                    isWithinRadius ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {clientDistance != null ? `${clientDistance} metres` : 'Calculating...'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-[#6D4C41]">Device GPS Accuracy:</span>
                <span
                  className={`font-mono font-semibold text-xs ${
                    isAccuracyGood ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {deviceCoords.accuracy != null ? `±${Math.round(deviceCoords.accuracy)}m` : 'N/A'}
                  {isAccuracyGood ? ' (Good)' : ' (Low — step outside)'}
                </span>
              </div>

              <div className="pt-2 border-t border-[#D7CCC8]/60 flex items-center gap-2 text-[11px]">
                {isWithinRadius ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Within permitted 200m radius. Ready to record attendance.
                  </span>
                ) : (
                  <span className="text-red-700 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Outside 200m geofence. Move within institute boundaries to check in.
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="py-3 text-center text-xs text-[#8D6E63]">
              Acquiring fresh device satellite coordinates...
            </div>
          )}
        </div>

        {/* Primary Action Buttons */}
        <div>
          {status === 'NOT_CHECKED_IN' && (
            <button
              onClick={handleCheckIn}
              disabled={!canCheckIn}
              className={`w-full py-3.5 px-4 rounded-xl text-sm font-bold text-white shadow-md transition-all flex items-center justify-center gap-2 ${
                canCheckIn
                  ? 'bg-[#4E342E] hover:bg-[#3E2723] hover:shadow-lg active:scale-[0.99]'
                  : 'bg-stone-400 cursor-not-allowed opacity-70'
              }`}
            >
              {actionSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying & Recording Check-In...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isWithinRadius
                      ? 'Confirm & Check In to Institute'
                      : 'Check In (Requires 200m Geofence)'}
                  </span>
                </>
              )}
            </button>
          )}

          {canCheckOut && (
            <button
              onClick={handleCheckOut}
              disabled={actionSubmitting}
              className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-[#B91C1C] hover:bg-[#991B1B] shadow-md hover:shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {actionSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Recording Check-Out...</span>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4" />
                  <span>Check Out & Complete Work Session</span>
                </>
              )}
            </button>
          )}

          {status === 'CHECKED_OUT' && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-center text-xs text-blue-900 space-y-1">
              <div className="font-bold flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                Work Session Finalized
              </div>
              <p className="text-[#6D4C41]">
                Total recorded duration:{' '}
                <b>
                  {session?.workDurationMinutes != null
                    ? `${Math.floor(session.workDurationMinutes / 60)}h ${session.workDurationMinutes % 60}m`
                    : 'N/A'}
                </b>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Recent 7-Day History Table */}
      <div className="bg-white rounded-2xl p-6 border border-[#D7CCC8] shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#D7CCC8]">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#8D6E63]" />
            <h3 className="text-xs font-bold text-[#2D1E18] uppercase tracking-wider">Recent 7-Day History</h3>
          </div>
          {historyMetrics && (
            <span className="text-xs text-[#8D6E63]">
              Total: <b>{historyMetrics.totalWorkHours} hrs</b>
            </span>
          )}
        </div>

        {history.length === 0 ? (
          <p className="text-xs text-center text-[#8D6E63] py-4">No past attendance records found.</p>
        ) : (
          <div className="divide-y divide-[#D7CCC8]/60">
            {history.map((s) => (
              <div key={s.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-[#2D1E18]">
                    {new Date(s.attendanceDate).toLocaleDateString(undefined, {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </div>
                  <div className="text-[11px] text-[#8D6E63]">
                    {s.checkInTime ? new Date(s.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    {' → '}
                    {s.checkOutTime ? new Date(s.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono font-bold text-[#2D1E18]">
                    {s.workDurationMinutes > 0
                      ? `${Math.floor(s.workDurationMinutes / 60)}h ${s.workDurationMinutes % 60}m`
                      : '—'}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-[#8D6E63]">{s.status}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Exception Process Notice */}
      <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#D7CCC8] text-xs text-[#6D4C41] flex items-start gap-2.5">
        <Info className="w-4 h-4 text-[#8D6E63] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-[#2D1E18]">Experiencing location issues?</span> Standard browser GPS
          requires clear satellite visibility. If your device has genuine hardware malfunction, report to Academic Admin
          for an audited manual attendance correction.
        </div>
      </div>
    </div>
  );
};
