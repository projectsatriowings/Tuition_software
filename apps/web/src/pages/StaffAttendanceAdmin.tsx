import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { GeofenceMapPicker } from '../components/GeofenceMapPicker';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  Edit3,
  Users,
  Compass,
  AlertCircle,
  Download,
  Info,
  X,
  Check,
} from 'lucide-react';

interface StaffAttendanceAdminProps {
  onNavigateTab?: (tab: string) => void;
}

export const StaffAttendanceAdmin: React.FC<StaffAttendanceAdminProps> = () => {
  const { user } = useAuth();

  // Navigation tab: 'register' | 'settings' | 'monthly'
  const [activeTab, setActiveTab] = useState<'register' | 'settings' | 'monthly'>('register');

  // Summary Metrics
  const [summary, setSummary] = useState<{
    dateStr: string;
    totalActiveStaff: number;
    presentToday: number;
    lateArrivals: number;
    checkedOutCount: number;
    missingCheckouts: number;
    notCheckedIn: number;
    onLeave: number;
  } | null>(null);

  // Daily Register State
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [register, setRegister] = useState<any[]>([]);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerSearch, setRegisterSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Institute Geofence Settings State
  const [config, setConfig] = useState<any>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [configSuccess, setConfigSuccess] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  const [formLat, setFormLat] = useState<number | null>(null);
  const [formLng, setFormLng] = useState<number | null>(null);
  const [formRadius, setFormRadius] = useState<number>(200);
  const [formAddress, setFormAddress] = useState<string>('');
  const [formStartTime, setFormStartTime] = useState<string>('09:00');
  const [formEndTime, setFormEndTime] = useState<string>('18:00');
  const [formGraceMinutes, setFormGraceMinutes] = useState<number>(15);
  const [formAccuracyThreshold, setFormAccuracyThreshold] = useState<number>(50);
  const [formRequireCheckoutGeofence, setFormRequireCheckoutGeofence] = useState<boolean>(true);
  const [formTimezone, setFormTimezone] = useState<string>('Asia/Kolkata');

  // Correction Modal State
  const [correctionTarget, setCorrectionTarget] = useState<any | null>(null);
  const [correctionStatus, setCorrectionStatus] = useState<string>('CHECKED_IN');
  const [correctionCheckInTime, setCorrectionCheckInTime] = useState<string>('');
  const [correctionCheckOutTime, setCorrectionCheckOutTime] = useState<string>('');
  const [correctionReason, setCorrectionReason] = useState<string>('');
  const [correctionSubmitting, setCorrectionSubmitting] = useState(false);
  const [correctionError, setCorrectionError] = useState<string | null>(null);

  // Session Details Modal
  const [viewSessionId, setViewSessionId] = useState<string | null>(null);
  const [sessionDetails, setSessionDetails] = useState<any | null>(null);
  const [sessionDetailsLoading, setSessionDetailsLoading] = useState(false);

  // Monthly Report State
  const [reportYear, setReportYear] = useState<number>(() => new Date().getFullYear());
  const [reportMonth, setReportMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);

  // ==========================================
  // DATA LOADERS
  // ==========================================

  // Load Dashboard Summary
  const loadSummary = useCallback(async () => {
    try {
      const res = await apiFetch('/staff-attendance/admin/dashboard');
      if (res.success && res.data) {
        setSummary(res.data);
      }
    } catch (err) {
      console.error('[StaffAttendanceAdmin] Error loading summary:', err);
    }
  }, []);

  // Load Daily Register
  const loadRegister = useCallback(async () => {
    try {
      setRegisterLoading(true);
      const params = new URLSearchParams();
      if (selectedDate) params.append('date', selectedDate);
      if (registerSearch) params.append('search', registerSearch);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);

      const res = await apiFetch(`/staff-attendance/admin/daily-register?${params.toString()}`);
      if (res.success && res.data) {
        setRegister(res.data.register || []);
      }
    } catch (err) {
      console.error('[StaffAttendanceAdmin] Error loading register:', err);
    } finally {
      setRegisterLoading(false);
    }
  }, [selectedDate, registerSearch, statusFilter]);

  // Load Geofence Config
  const loadConfig = useCallback(async () => {
    try {
      setConfigLoading(true);
      const res = await apiFetch('/staff-attendance/config');
      if (res.success && res.data) {
        const c = res.data;
        setConfig(c);
        setFormLat(c.latitude ?? 13.0827);
        setFormLng(c.longitude ?? 80.2707);
        setFormRadius(c.geofenceRadius ?? 200);
        setFormAddress(c.address || '');
        setFormStartTime(c.workStartTime || '09:00');
        setFormEndTime(c.workEndTime || '18:00');
        setFormGraceMinutes(c.lateGraceMinutes ?? 15);
        setFormAccuracyThreshold(c.gpsAccuracyThreshold ?? 50);
        setFormRequireCheckoutGeofence(c.requireCheckoutGeofence ?? true);
        setFormTimezone(c.timezone || 'Asia/Kolkata');
      }
    } catch (err) {
      console.error('[StaffAttendanceAdmin] Error loading config:', err);
    } finally {
      setConfigLoading(false);
    }
  }, []);

  // Load Monthly Report
  const loadMonthlyReport = useCallback(async () => {
    try {
      setMonthlyLoading(true);
      const res = await apiFetch(`/staff-attendance/admin/monthly-report?year=${reportYear}&month=${reportMonth}`);
      if (res.success && res.data) {
        setMonthlyData(res.data.report || []);
      }
    } catch (err) {
      console.error('[StaffAttendanceAdmin] Error loading monthly report:', err);
    } finally {
      setMonthlyLoading(false);
    }
  }, [reportYear, reportMonth]);

  useEffect(() => {
    loadSummary();
    loadRegister();
  }, [loadSummary, loadRegister]);

  useEffect(() => {
    if (activeTab === 'settings') {
      loadConfig();
    } else if (activeTab === 'monthly') {
      loadMonthlyReport();
    }
  }, [activeTab, loadConfig, loadMonthlyReport]);

  // ==========================================
  // ACTIONS
  // ==========================================

  // Save Config
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setConfigSaving(true);
      setConfigError(null);
      setConfigSuccess(null);

      if (formLat === null || formLng === null) {
        setConfigError('Please select valid coordinates on the map.');
        return;
      }

      const res = await apiFetch('/staff-attendance/config', {
        method: 'PUT',
        body: JSON.stringify({
          latitude: formLat,
          longitude: formLng,
          geofenceRadius: Number(formRadius),
          address: formAddress,
          workStartTime: formStartTime,
          workEndTime: formEndTime,
          lateGraceMinutes: Number(formGraceMinutes),
          gpsAccuracyThreshold: Number(formAccuracyThreshold),
          requireCheckoutGeofence: formRequireCheckoutGeofence,
          timezone: formTimezone,
        }),
      });

      if (res.success) {
        setConfigSuccess('Institute location and geofence parameters updated successfully! Changes audited.');
        setConfig(res.data);
      } else {
        setConfigError(res.message || 'Failed to update configuration.');
      }
    } catch (err: any) {
      setConfigError(err.message || 'Failed to save configuration.');
    } finally {
      setConfigSaving(false);
    }
  };

  // Open Correction Modal
  const handleOpenCorrection = (row: any) => {
    setCorrectionTarget(row);
    setCorrectionStatus(row.status === 'NOT_CHECKED_IN' ? 'CHECKED_IN' : row.status);
    setCorrectionCheckInTime(row.checkInTime ? row.checkInTime.slice(11, 16) : '09:00');
    setCorrectionCheckOutTime(row.checkOutTime ? row.checkOutTime.slice(11, 16) : '18:00');
    setCorrectionReason('');
    setCorrectionError(null);
  };

  // Submit Correction
  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionTarget) return;

    if (!correctionReason.trim() || correctionReason.trim().length < 3) {
      setCorrectionError('A mandatory explanation (reason) of at least 3 characters is required.');
      return;
    }

    try {
      setCorrectionSubmitting(true);
      setCorrectionError(null);

      const targetDate = selectedDate;
      const inDateTime = correctionCheckInTime ? `${targetDate}T${correctionCheckInTime}:00.000Z` : null;
      const outDateTime = correctionCheckOutTime ? `${targetDate}T${correctionCheckOutTime}:00.000Z` : null;

      const payload: any = {
        staffId: correctionTarget.staffId,
        date: targetDate,
        status: correctionStatus,
        reason: correctionReason.trim(),
        checkInTime: inDateTime,
        checkOutTime: outDateTime,
      };

      if (correctionTarget.sessionId) {
        payload.sessionId = correctionTarget.sessionId;
      }

      const res = await apiFetch('/staff-attendance/admin/correct', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.success) {
        setCorrectionTarget(null);
        loadRegister();
        loadSummary();
      } else {
        setCorrectionError(res.message || 'Failed to submit correction.');
      }
    } catch (err: any) {
      setCorrectionError(err.message || 'Failed to submit correction.');
    } finally {
      setCorrectionSubmitting(false);
    }
  };

  // Open Session Audit Modal
  const handleViewSession = async (sessionId: string) => {
    try {
      setViewSessionId(sessionId);
      setSessionDetailsLoading(true);
      const res = await apiFetch(`/staff-attendance/admin/session/${sessionId}`);
      if (res.success && res.data) {
        setSessionDetails(res.data);
      }
    } catch (err) {
      console.error('[StaffAttendanceAdmin] Error loading session:', err);
    } finally {
      setSessionDetailsLoading(false);
    }
  };

  // Download CSV
  const handleDownloadCsv = async () => {
    try {
      setDownloadingCsv(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:5000/api/staff-attendance/admin/monthly-report?year=${reportYear}&month=${reportMonth}&format=csv`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Institute-Id': localStorage.getItem('activeInstituteId') || '',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to download CSV');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Staff_Attendance_${reportYear}_${reportMonth}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Could not download CSV: ${err.message}`);
    } finally {
      setDownloadingCsv(false);
    }
  };

  // Render Status Badge
  const renderStatusBadge = (status: string, isLate?: boolean) => {
    switch (status) {
      case 'CHECKED_IN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Checked In
          </span>
        );
      case 'CHECKED_OUT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-600" />
            Checked Out
          </span>
        );
      case 'LATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            Late Arrival
          </span>
        );
      case 'MANUALLY_CORRECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <ShieldCheck className="w-3 h-3 text-purple-600" />
            Corrected
          </span>
        );
      case 'ON_LEAVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            Approved Leave
          </span>
        );
      case 'NOT_CHECKED_IN':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-600 border border-stone-200">
            Not Checked In
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Navigation Bar */}
      <div className="bg-white rounded-2xl p-6 border border-[#D7CCC8] shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#4E342E] flex items-center justify-center text-white shadow-sm">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#2D1E18]">Staff Attendance & 200m Geofencing</h1>
                <p className="text-xs text-[#6D4C41]">
                  GPS-verified check-ins, automated geodesic range verification, live register & audited adjustments.
                </p>
              </div>
            </div>
          </div>

          {/* Tab Navigation Pill Selector */}
          <div className="flex items-center gap-1 p-1 bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl self-start md:self-auto">
            <button
              onClick={() => setActiveTab('register')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'register'
                  ? 'bg-[#4E342E] text-white shadow-sm'
                  : 'text-[#6D4C41] hover:text-[#2D1E18]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Daily Register
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'settings'
                  ? 'bg-[#4E342E] text-white shadow-sm'
                  : 'text-[#6D4C41] hover:text-[#2D1E18]'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              Geofence & Hours
            </button>
            <button
              onClick={() => setActiveTab('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'monthly'
                  ? 'bg-[#4E342E] text-white shadow-sm'
                  : 'text-[#6D4C41] hover:text-[#2D1E18]'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Monthly Reports
            </button>
          </div>
        </div>

        {/* Real-time Metric Cards Row */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
            <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#D7CCC8]">
              <div className="text-[11px] font-semibold text-[#8D6E63] uppercase">Active Staff</div>
              <div className="text-xl font-bold text-[#2D1E18] mt-1">{summary.totalActiveStaff}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="text-[11px] font-semibold text-emerald-800 uppercase">Present Today</div>
              <div className="text-xl font-bold text-emerald-900 mt-1">{summary.presentToday}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
              <div className="text-[11px] font-semibold text-amber-800 uppercase">Late Arrivals</div>
              <div className="text-xl font-bold text-amber-900 mt-1">{summary.lateArrivals}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200">
              <div className="text-[11px] font-semibold text-blue-800 uppercase">Checked Out</div>
              <div className="text-xl font-bold text-blue-900 mt-1">{summary.checkedOutCount}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200">
              <div className="text-[11px] font-semibold text-red-800 uppercase">Missing Out</div>
              <div className="text-xl font-bold text-red-900 mt-1">{summary.missingCheckouts}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-stone-100 border border-stone-300">
              <div className="text-[11px] font-semibold text-stone-600 uppercase">Not Checked In</div>
              <div className="text-xl font-bold text-stone-800 mt-1">{summary.notCheckedIn}</div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* TAB 1: DAILY REGISTER & LIVE MONITOR       */}
      {/* ========================================== */}
      {activeTab === 'register' && (
        <div className="space-y-4">
          {/* Controls Bar: Date, Search & Filter */}
          <div className="bg-white p-4 rounded-xl border border-[#D7CCC8] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D7CCC8] bg-[#FAF8F5] text-xs font-semibold text-[#2D1E18]">
                <Calendar className="w-4 h-4 text-[#8D6E63]" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
                />
              </div>

              <button
                onClick={() => {
                  loadRegister();
                  loadSummary();
                }}
                className="p-2 rounded-lg border border-[#D7CCC8] text-[#6D4C41] hover:text-[#2D1E18] hover:bg-[#FAF8F5] transition-colors"
                title="Refresh Register"
              >
                <RefreshCw className={`w-4 h-4 ${registerLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 md:w-64">
                <Search className="w-3.5 h-3.5 text-[#8D6E63] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={registerSearch}
                  onChange={(e) => setRegisterSearch(e.target.value)}
                  placeholder="Search name, code, role..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#D7CCC8] bg-white text-[#2D1E18] focus:outline-none focus:ring-1 focus:ring-[#6D4C41]"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-[#D7CCC8] bg-white text-[#2D1E18] focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="CHECKED_IN">Checked In</option>
                <option value="CHECKED_OUT">Checked Out</option>
                <option value="LATE">Late Arrival</option>
                <option value="NOT_CHECKED_IN">Not Checked In</option>
                <option value="MANUALLY_CORRECTED">Manually Corrected</option>
                <option value="ON_LEAVE">On Leave</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-xl border border-[#D7CCC8] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#2D1E18]">
                <thead className="bg-[#FAF8F5] text-[11px] font-bold text-[#8D6E63] uppercase border-b border-[#D7CCC8]">
                  <tr>
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-3">Designation / Dept</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Check-In Details</th>
                    <th className="py-3 px-3">Check-Out Details</th>
                    <th className="py-3 px-3">Duration</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D7CCC8]/60">
                  {registerLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#8D6E63]">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-[#4E342E]" />
                          <span>Loading attendance register...</span>
                        </div>
                      </td>
                    </tr>
                  ) : register.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#8D6E63]">
                        <p className="text-sm font-semibold">No staff records found for this date.</p>
                        <p className="text-xs mt-1">Try selecting another date or clearing search filters.</p>
                      </td>
                    </tr>
                  ) : (
                    register.map((row) => (
                      <tr key={row.staffId} className="hover:bg-[#FAF8F5]/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#2D1E18]">{row.fullName}</div>
                          <div className="text-[11px] text-[#8D6E63] font-mono">{row.employeeCode || 'N/A'}</div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="text-xs font-medium text-[#2D1E18]">{row.designation || 'Staff'}</div>
                          <div className="text-[11px] text-[#8D6E63]">{row.department || 'General'}</div>
                        </td>

                        <td className="py-3 px-3">
                          {renderStatusBadge(row.status, row.isLate)}
                          {row.isManuallyCorrected && (
                            <span className="block text-[10px] text-purple-700 mt-0.5" title={row.correctionReason}>
                              * Adjusted by Admin
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          {row.checkInTime ? (
                            <div>
                              <div className="font-semibold text-[#2D1E18]">
                                {new Date(row.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                              {row.checkInDistance != null && (
                                <div className="text-[11px] text-emerald-700 font-mono">
                                  {Math.round(row.checkInDistance)}m away {row.checkInAccuracy ? `(±${Math.round(row.checkInAccuracy)}m)` : ''}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[#BCAAA4]">—</span>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          {row.checkOutTime ? (
                            <div>
                              <div className="font-semibold text-[#2D1E18]">
                                {new Date(row.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                              {row.checkOutDistance != null && (
                                <div className="text-[11px] text-blue-700 font-mono">
                                  {Math.round(row.checkOutDistance)}m away
                                </div>
                              )}
                            </div>
                          ) : row.status === 'CHECKED_IN' ? (
                            <span className="text-amber-700 text-[11px] font-semibold bg-amber-50 px-2 py-0.5 rounded">
                              Active Session
                            </span>
                          ) : (
                            <span className="text-[#BCAAA4]">—</span>
                          )}
                        </td>

                        <td className="py-3 px-3 font-mono font-medium text-[#2D1E18]">
                          {row.workDurationMinutes > 0 ? (
                            `${Math.floor(row.workDurationMinutes / 60)}h ${row.workDurationMinutes % 60}m`
                          ) : (
                            <span className="text-[#BCAAA4]">—</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {row.sessionId && (
                              <button
                                onClick={() => handleViewSession(row.sessionId)}
                                className="px-2.5 py-1 text-xs text-[#6D4C41] hover:text-[#2D1E18] hover:bg-[#EFEBE9] rounded-lg transition-colors"
                                title="View GPS event history and audit log"
                              >
                                Audit
                              </button>
                            )}

                            <button
                              onClick={() => handleOpenCorrection(row)}
                              className="px-2.5 py-1 text-xs font-semibold text-[#4E342E] bg-[#FAF8F5] border border-[#D7CCC8] hover:bg-[#EFEBE9] rounded-lg transition-colors flex items-center gap-1"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Correct</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 2: LOCATION & GEOFENCE CONFIGURATION   */}
      {/* ========================================== */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveConfig} className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-[#D7CCC8] shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#D7CCC8] gap-2">
              <div>
                <h2 className="text-base font-bold text-[#2D1E18] flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#8D6E63]" />
                  Institute Geofence & Working Hours Setup
                </h2>
                <p className="text-xs text-[#6D4C41]">
                  Configure approved GPS coordinates, geofence radius (default 200m), work schedule, and GPS threshold.
                </p>
              </div>

              <button
                type="submit"
                disabled={configSaving}
                className="px-4 py-2 text-xs font-bold bg-[#4E342E] text-white rounded-xl hover:bg-[#3E2723] disabled:opacity-50 transition-colors shadow-sm flex items-center gap-2 self-start sm:self-auto"
              >
                {configSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>{configSaving ? 'Saving Changes...' : 'Save Configuration'}</span>
              </button>
            </div>

            {configSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{configSuccess}</span>
              </div>
            )}

            {configError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{configError}</span>
              </div>
            )}

            {/* Quick GPS Setup Callout */}
            <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#D7CCC8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#4E342E] text-amber-300 flex items-center justify-center shrink-0 font-bold text-sm shadow-xs">
                  📍
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#2D1E18]">
                    Easy Geofence Positioning & Locking
                  </h4>
                  <p className="text-[11px] text-[#6D4C41] mt-0.5">
                    Click <strong className="text-[#4E342E]">"Use My Current Location"</strong> or search your address/landmark. If on a laptop without satellite GPS, switch the map to <strong className="text-[#4E342E]">"🛰️ Satellite"</strong> to see actual building roofs and drag the pin directly onto your academy, then click <strong className="text-[#4E342E]">"Save Configuration"</strong>.
                  </p>
                </div>
              </div>
              <div className="text-[11px] font-semibold text-[#8D6E63] shrink-0 bg-white px-2.5 py-1 rounded-lg border border-[#D7CCC8] self-start sm:self-auto">
                Geofence: {formRadius}m radius
              </div>
            </div>

            {/* Interactive Map Section */}
            <div>
              <label className="block text-xs font-bold text-[#2D1E18] mb-1.5">
                Institute Building Location & 200-Metre Geofence
              </label>
              <GeofenceMapPicker
                latitude={formLat}
                longitude={formLng}
                radius={formRadius}
                onLocationChange={(lat, lng) => {
                  setFormLat(lat);
                  setFormLng(lng);
                }}
                instituteName={config?.name || 'Tuition Institute'}
              />
            </div>

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-[#D7CCC8]">
              <div>
                <label className="block text-xs font-semibold text-[#6D4C41] mb-1">
                  Latitude Coordinate *
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={formLat !== null ? formLat : ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) setFormLat(val);
                  }}
                  placeholder="e.g. 10.960200"
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-[#D7CCC8] bg-[#FAF8F5] text-[#2D1E18] focus:bg-white focus:outline-none"
                />
                <span className="text-[11px] text-[#8D6E63]">Directly editable or pasted from Google Maps.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6D4C41] mb-1">
                  Longitude Coordinate *
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={formLng !== null ? formLng : ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) setFormLng(val);
                  }}
                  placeholder="e.g. 79.384400"
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-[#D7CCC8] bg-[#FAF8F5] text-[#2D1E18] focus:bg-white focus:outline-none"
                />
                <span className="text-[11px] text-[#8D6E63]">Directly editable or pasted from Google Maps.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6D4C41] mb-1">
                  Permitted Geofence Radius (Metres) *
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={20}
                    max={1000}
                    step={10}
                    value={formRadius}
                    onChange={(e) => setFormRadius(Number(e.target.value))}
                    className="flex-1 accent-[#4E342E]"
                  />
                  <span className="w-16 px-2 py-1 text-xs font-mono font-bold text-center bg-[#FAF8F5] border border-[#D7CCC8] rounded-lg">
                    {formRadius}m
                  </span>
                </div>
                <span className="text-[11px] text-[#8D6E63]">Standard default is 200 metres.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6D4C41] mb-1">
                  Min GPS Accuracy Threshold (Metres) *
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={10}
                    max={150}
                    step={5}
                    value={formAccuracyThreshold}
                    onChange={(e) => setFormAccuracyThreshold(Number(e.target.value))}
                    className="flex-1 accent-[#4E342E]"
                  />
                  <span className="w-16 px-2 py-1 text-xs font-mono font-bold text-center bg-[#FAF8F5] border border-[#D7CCC8] rounded-lg">
                    ±{formAccuracyThreshold}m
                  </span>
                </div>
                <span className="text-[11px] text-[#8D6E63]">Readings with accuracy worse than ±{formAccuracyThreshold}m are rejected.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6D4C41] mb-1">
                  Late Arrival Grace Period (Minutes) *
                </label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={formGraceMinutes}
                  onChange={(e) => setFormGraceMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#D7CCC8] bg-[#FAF8F5] text-[#2D1E18] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#6D4C41]"
                />
                <span className="text-[11px] text-[#8D6E63]">Check-ins after Work Start + Grace are flagged LATE.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6D4C41] mb-1">
                  Expected Work Start Time (24h) *
                </label>
                <input
                  type="time"
                  value={formStartTime}
                  onChange={(e) => setFormStartTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#D7CCC8] bg-[#FAF8F5] text-[#2D1E18] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#6D4C41]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6D4C41] mb-1">
                  Expected Work End Time (24h) *
                </label>
                <input
                  type="time"
                  value={formEndTime}
                  onChange={(e) => setFormEndTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#D7CCC8] bg-[#FAF8F5] text-[#2D1E18] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#6D4C41]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6D4C41] mb-1">
                  Institute Timezone *
                </label>
                <select
                  value={formTimezone}
                  onChange={(e) => setFormTimezone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#D7CCC8] bg-[#FAF8F5] text-[#2D1E18] focus:bg-white focus:outline-none"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                  <option value="UTC">UTC</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST +4:00)</option>
                  <option value="Asia/Singapore">Asia/Singapore (SGT +8:00)</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#6D4C41] mb-1">
                  Institute Postal Address
                </label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="e.g. 12, Main Road, T. Nagar, Chennai, Tamil Nadu - 600017"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#D7CCC8] bg-[#FAF8F5] text-[#2D1E18] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#6D4C41]"
                />
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="reqCheckout"
                  checked={formRequireCheckoutGeofence}
                  onChange={(e) => setFormRequireCheckoutGeofence(e.target.checked)}
                  className="w-4 h-4 rounded text-[#4E342E] accent-[#4E342E]"
                />
                <label htmlFor="reqCheckout" className="text-xs font-semibold text-[#2D1E18] cursor-pointer">
                  Require GPS geofence verification on Check-Out as well
                </label>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ========================================== */}
      {/* TAB 3: MONTHLY REPORTS & CSV EXPORT        */}
      {/* ========================================== */}
      {activeTab === 'monthly' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-[#D7CCC8] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-[#6D4C41]">Month:</label>
                <select
                  value={reportMonth}
                  onChange={(e) => setReportMonth(Number(e.target.value))}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-[#D7CCC8] bg-[#FAF8F5] text-[#2D1E18] focus:outline-none"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {new Date(2026, m - 1).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-[#6D4C41]">Year:</label>
                <select
                  value={reportYear}
                  onChange={(e) => setReportYear(Number(e.target.value))}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-[#D7CCC8] bg-[#FAF8F5] text-[#2D1E18] focus:outline-none"
                >
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleDownloadCsv}
              disabled={downloadingCsv}
              className="px-4 py-2 text-xs font-bold bg-[#4E342E] text-white rounded-xl hover:bg-[#3E2723] disabled:opacity-50 transition-colors shadow-sm flex items-center gap-2 self-start md:self-auto"
            >
              <Download className={`w-3.5 h-3.5 ${downloadingCsv ? 'animate-bounce' : ''}`} />
              <span>{downloadingCsv ? 'Preparing CSV...' : 'Download CSV Report'}</span>
            </button>
          </div>

          {/* Monthly Report Table */}
          <div className="bg-white rounded-xl border border-[#D7CCC8] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#2D1E18]">
                <thead className="bg-[#FAF8F5] text-[11px] font-bold text-[#8D6E63] uppercase border-b border-[#D7CCC8]">
                  <tr>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-3">Department</th>
                    <th className="py-3 px-3 text-center">Days Present</th>
                    <th className="py-3 px-3 text-center">Late Count</th>
                    <th className="py-3 px-3 text-center">Missing Check-outs</th>
                    <th className="py-3 px-3 text-center">Approved Leaves</th>
                    <th className="py-3 px-3 text-right">Total Hours</th>
                    <th className="py-3 px-4 text-right">Attendance Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D7CCC8]/60">
                  {monthlyLoading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-[#8D6E63]">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-[#4E342E]" />
                          <span>Generating monthly report...</span>
                        </div>
                      </td>
                    </tr>
                  ) : monthlyData.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-[#8D6E63]">
                        No staff records found for this period.
                      </td>
                    </tr>
                  ) : (
                    monthlyData.map((row) => (
                      <tr key={row.staffId} className="hover:bg-[#FAF8F5]/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#8D6E63]">{row.employeeCode}</td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#2D1E18]">{row.fullName}</div>
                          <div className="text-[11px] text-[#8D6E63]">{row.designation}</div>
                        </td>
                        <td className="py-3 px-3 text-[#6D4C41]">{row.department}</td>
                        <td className="py-3 px-3 text-center font-bold text-emerald-700">{row.daysPresent}</td>
                        <td className="py-3 px-3 text-center font-bold text-amber-700">{row.daysLate}</td>
                        <td className="py-3 px-3 text-center font-bold text-red-700">{row.missingCheckouts}</td>
                        <td className="py-3 px-3 text-center text-indigo-700">{row.onLeaveDays}</td>
                        <td className="py-3 px-3 text-right font-mono font-semibold">{row.totalHours} hrs</td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                              row.attendancePercentage >= 90
                                ? 'bg-emerald-100 text-emerald-800'
                                : row.attendancePercentage >= 75
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {row.attendancePercentage}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 1: MANUAL CORRECTION WITH AUDITING   */}
      {/* ========================================== */}
      {correctionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-[#D7CCC8] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D7CCC8]">
              <div>
                <h3 className="text-base font-bold text-[#2D1E18] flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#8D6E63]" />
                  Authorized Manual Attendance Correction
                </h3>
                <p className="text-xs text-[#6D4C41]">
                  Adjust record for {correctionTarget.fullName} ({correctionTarget.employeeCode})
                </p>
              </div>
              <button
                onClick={() => setCorrectionTarget(null)}
                className="text-[#8D6E63] hover:text-[#2D1E18] p-1 rounded-lg hover:bg-[#FAF8F5]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {correctionError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{correctionError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitCorrection} className="space-y-4">
              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#D7CCC8] text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#8D6E63]">Attendance Date:</span>
                  <span className="font-semibold text-[#2D1E18]">{selectedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8D6E63]">Current Status:</span>
                  <span className="font-semibold">{correctionTarget.status}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6D4C41] mb-1">
                  Adjusted Status *
                </label>
                <select
                  value={correctionStatus}
                  onChange={(e) => setCorrectionStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#D7CCC8] bg-[#FAF8F5] text-[#2D1E18] focus:bg-white focus:outline-none"
                >
                  <option value="CHECKED_IN">Checked In</option>
                  <option value="CHECKED_OUT">Checked Out</option>
                  <option value="LATE">Late Arrival</option>
                  <option value="MANUALLY_CORRECTED">Manually Corrected (General)</option>
                  <option value="ON_LEAVE">Approved Leave</option>
                  <option value="NOT_CHECKED_IN">Not Checked In / Absent</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#6D4C41] mb-1">
                    Corrected Check-In Time
                  </label>
                  <input
                    type="time"
                    value={correctionCheckInTime}
                    onChange={(e) => setCorrectionCheckInTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#D7CCC8] bg-[#FAF8F5] text-[#2D1E18] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#6D4C41] mb-1">
                    Corrected Check-Out Time
                  </label>
                  <input
                    type="time"
                    value={correctionCheckOutTime}
                    onChange={(e) => setCorrectionCheckOutTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#D7CCC8] bg-[#FAF8F5] text-[#2D1E18] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6D4C41] mb-1">
                  Mandatory Correction Reason (Audited) *
                </label>
                <textarea
                  rows={3}
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="e.g., Staff experienced GPS hardware glitch on mobile device; verified present in classroom by Academic Coordinator."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#D7CCC8] bg-white text-[#2D1E18] focus:outline-none focus:ring-1 focus:ring-[#6D4C41]"
                  required
                />
                <span className="text-[11px] text-[#8D6E63]">
                  This explanation will be permanently recorded in the system audit trail alongside your administrator account.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#D7CCC8]">
                <button
                  type="button"
                  onClick={() => setCorrectionTarget(null)}
                  className="px-4 py-2 text-xs font-semibold text-[#6D4C41] hover:text-[#2D1E18] rounded-xl hover:bg-[#FAF8F5] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={correctionSubmitting}
                  className="px-4 py-2 text-xs font-bold bg-[#4E342E] text-white rounded-xl hover:bg-[#3E2723] disabled:opacity-50 transition-colors shadow-sm flex items-center gap-1.5"
                >
                  {correctionSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  <span>{correctionSubmitting ? 'Logging Correction...' : 'Confirm & Audit Correction'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 2: RAW SESSION DETAILS & AUDIT LOG   */}
      {/* ========================================== */}
      {viewSessionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 border border-[#D7CCC8] shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#D7CCC8]">
              <div>
                <h3 className="text-base font-bold text-[#2D1E18] flex items-center gap-2">
                  <Compass className="w-5 h-5 text-[#8D6E63]" />
                  Attendance Session Audit Trail
                </h3>
                <p className="text-xs text-[#6D4C41]">
                  Geodesic readings, server timestamps, and validation outcomes.
                </p>
              </div>
              <button
                onClick={() => {
                  setViewSessionId(null);
                  setSessionDetails(null);
                }}
                className="text-[#8D6E63] hover:text-[#2D1E18] p-1 rounded-lg hover:bg-[#FAF8F5]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {sessionDetailsLoading ? (
              <div className="py-12 text-center text-[#8D6E63]">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#4E342E]" />
                <span className="text-xs font-semibold">Loading session audit details...</span>
              </div>
            ) : sessionDetails ? (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#D7CCC8] grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[#8D6E63]">Staff:</span>{' '}
                    <span className="font-semibold text-[#2D1E18]">{sessionDetails.staff?.user?.fullName}</span>
                  </div>
                  <div>
                    <span className="text-[#8D6E63]">Code:</span>{' '}
                    <span className="font-mono font-semibold">{sessionDetails.staff?.employeeCode}</span>
                  </div>
                  <div>
                    <span className="text-[#8D6E63]">Status:</span>{' '}
                    <span className="font-semibold">{sessionDetails.status}</span>
                  </div>
                  <div>
                    <span className="text-[#8D6E63]">Duration:</span>{' '}
                    <span className="font-mono font-semibold">{sessionDetails.workDurationMinutes} mins</span>
                  </div>
                </div>

                {sessionDetails.isManuallyCorrected && (
                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-purple-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-purple-700" />
                      Administrative Correction Notice
                    </div>
                    <div>
                      <span className="font-semibold">Reason:</span> {sessionDetails.correctionReason}
                    </div>
                    <div>
                      <span className="font-semibold">Adjusted By:</span> {sessionDetails.correctedBy?.fullName || 'Admin'}{' '}
                      at {sessionDetails.correctedAt ? new Date(sessionDetails.correctedAt).toLocaleString() : ''}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-bold text-[#2D1E18] mb-2 uppercase text-[11px] text-[#8D6E63]">
                    Recorded GPS Events
                  </h4>
                  <div className="space-y-2">
                    {sessionDetails.events?.map((ev: any) => (
                      <div key={ev.id} className="p-3 rounded-lg border border-[#D7CCC8] bg-white space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#4E342E]">{ev.eventType}</span>
                          <span className="text-[11px] text-[#8D6E63] font-mono">
                            {new Date(ev.serverTimestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#6D4C41] flex flex-wrap gap-x-4">
                          <span>
                            Distance:{' '}
                            <b>{ev.distanceFromCenter != null ? `${Math.round(ev.distanceFromCenter)}m` : 'N/A'}</b>
                          </span>
                          <span>
                            Accuracy: <b>{ev.accuracy != null ? `±${Math.round(ev.accuracy)}m` : 'N/A'}</b>
                          </span>
                          <span>
                            Outcome: <b>{ev.validationOutcome}</b>
                          </span>
                        </div>
                        {ev.remarks && <div className="text-[11px] text-stone-600 italic">{ev.remarks}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

