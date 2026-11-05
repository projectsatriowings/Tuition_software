import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/useAuth';
import {
  Building2,
  Users,
  GraduationCap,
  Layers,
  MapPin,
  Clock,
  ShieldCheck,
  Plus,
  Search,
  CheckCircle,
  AlertTriangle,
  X,
  Phone,
  Mail,
  Calendar,
  Compass,
  ArrowRightLeft,
  ChevronRight,
  TrendingUp,
  RefreshCw,
  Eye,
  Sliders,
  DollarSign,
  Info,
} from 'lucide-react';

export interface BranchData {
  id: string;
  instituteId: string;
  name: string;
  code: string;
  isDefault: boolean;
  isActive: boolean;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  phone?: string | null;
  email?: string | null;
  timezone: string;
  latitude?: number | null;
  longitude?: number | null;
  geofenceRadius: number;
  gpsAccuracyThreshold: number;
  workStartTime?: string | null;
  workEndTime?: string | null;
  lateGraceMinutes: number;
  workingDays: string;
  createdAt: string;
  _count?: {
    batches: number;
    staffAssignments: number;
    studentEnrollments: number;
    attendanceSessions: number;
    feeStructures: number;
  };
  metrics?: {
    activeBatches: number;
    activeStaffCount: number;
    activeStudentsCount: number;
    todayCheckIns: number;
    totalCollections: number;
  };
}

export const BranchManagement: React.FC = () => {
  const { activeInstitute, user } = useAuth();
  const [branches, setBranches] = useState<BranchData[]>([]);
  const [consolidated, setConsolidated] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<BranchData | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'staff' | 'students' | 'batches' | 'geofence'>('overview');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchData | null>(null);
  const [showAssignStaffModal, setShowAssignStaffModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [deactivationTarget, setDeactivationTarget] = useState<BranchData | null>(null);
  const [deactivationSafety, setDeactivationSafety] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Detail drawer data
  const [branchDetailData, setBranchDetailData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Form states
  const [branchForm, setBranchForm] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: '',
    latitude: '' as string | number,
    longitude: '' as string | number,
    geofenceRadius: 200,
    gpsAccuracyThreshold: 50,
    workStartTime: '08:30',
    workEndTime: '18:30',
    lateGraceMinutes: 15,
    workingDays: 'MON,TUE,WED,THU,FRI,SAT',
    timezone: 'Asia/Kolkata',
  });

  // Assign staff form
  const [assignForm, setAssignForm] = useState({
    staffProfileId: '',
    assignmentType: 'ADDITIONAL',
    role: 'TEACHER',
    effectiveFrom: new Date().toISOString().slice(0, 10),
    effectiveTo: '',
  });
  const [availableStaffList, setAvailableStaffList] = useState<any[]>([]);

  // Transfer student form
  const [transferForm, setTransferForm] = useState({
    studentId: '',
    toBranchId: '',
    effectiveDate: new Date().toISOString().slice(0, 10),
    reason: '',
    transferFeesPolicy: 'RETAIN_ORIGINAL_FEES',
  });
  const [availableStudentsList, setAvailableStudentsList] = useState<any[]>([]);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const [branchRes, summaryRes] = await Promise.all([
        apiFetch('/branches'),
        apiFetch('/branches/consolidated-summary'),
      ]);

      if (branchRes.success) {
        setBranches(branchRes.data);
      }
      if (summaryRes.success) {
        setConsolidated(summaryRes.data);
      }
    } catch (err: any) {
      console.error('[fetchBranches error]', err);
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to load branches' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, [activeInstitute?.id]);

  const openBranchDetails = async (branch: BranchData) => {
    setSelectedBranch(branch);
    setDetailTab('overview');
    setDetailLoading(true);
    try {
      const res = await apiFetch(`/branches/${branch.id}`);
      if (res.success) {
        setBranchDetailData(res.data);
      }
    } catch (err: any) {
      console.error('[fetchBranchDetail error]', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingBranch(null);
    setBranchForm({
      name: '',
      code: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      phone: '',
      email: '',
      latitude: '',
      longitude: '',
      geofenceRadius: 200,
      gpsAccuracyThreshold: 50,
      workStartTime: '08:30',
      workEndTime: '18:30',
      lateGraceMinutes: 15,
      workingDays: 'MON,TUE,WED,THU,FRI,SAT',
      timezone: 'Asia/Kolkata',
    });
    setShowCreateModal(true);
  };

  const handleOpenEditModal = (branch: BranchData) => {
    setEditingBranch(branch);
    setBranchForm({
      name: branch.name,
      code: branch.code,
      address: branch.address || '',
      city: branch.city || '',
      state: branch.state || '',
      pincode: branch.pincode || '',
      phone: branch.phone || '',
      email: branch.email || '',
      latitude: branch.latitude ?? '',
      longitude: branch.longitude ?? '',
      geofenceRadius: branch.geofenceRadius || 200,
      gpsAccuracyThreshold: branch.gpsAccuracyThreshold || 50,
      workStartTime: branch.workStartTime || '08:30',
      workEndTime: branch.workEndTime || '18:30',
      lateGraceMinutes: branch.lateGraceMinutes ?? 15,
      workingDays: branch.workingDays || 'MON,TUE,WED,THU,FRI,SAT',
      timezone: branch.timezone || 'Asia/Kolkata',
    });
    setShowCreateModal(true);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBranchForm((prev) => ({
          ...prev,
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
        }));
      },
      (err) => {
        alert('Could not retrieve GPS coordinates: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload: any = {
        name: branchForm.name.trim(),
        code: branchForm.code.trim().toUpperCase(),
        address: branchForm.address.trim() || undefined,
        city: branchForm.city.trim() || undefined,
        state: branchForm.state.trim() || undefined,
        pincode: branchForm.pincode.trim() || undefined,
        phone: branchForm.phone.trim() || undefined,
        email: branchForm.email.trim() || undefined,
        latitude: branchForm.latitude !== '' ? Number(branchForm.latitude) : undefined,
        longitude: branchForm.longitude !== '' ? Number(branchForm.longitude) : undefined,
        geofenceRadius: Number(branchForm.geofenceRadius),
        gpsAccuracyThreshold: Number(branchForm.gpsAccuracyThreshold),
        workStartTime: branchForm.workStartTime,
        workEndTime: branchForm.workEndTime,
        lateGraceMinutes: Number(branchForm.lateGraceMinutes),
        workingDays: branchForm.workingDays,
        timezone: branchForm.timezone,
      };

      if (editingBranch) {
        await apiFetch(`/branches/${editingBranch.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        setFeedbackMsg({ type: 'success', text: `Branch "${branchForm.name}" updated successfully.` });
      } else {
        await apiFetch('/branches', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setFeedbackMsg({ type: 'success', text: `New branch "${branchForm.name}" created successfully.` });
      }

      setShowCreateModal(false);
      await fetchBranches();
      if (selectedBranch && editingBranch && selectedBranch.id === editingBranch.id) {
        await openBranchDetails({ ...selectedBranch, ...payload });
      }
    } catch (err: any) {
      console.error('[saveBranch error]', err);
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to save branch' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckDeactivation = async (branch: BranchData) => {
    setDeactivationTarget(branch);
    setActionLoading(true);
    try {
      const res = await apiFetch(`/branches/${branch.id}/deactivation-safety`);
      if (res.success) {
        setDeactivationSafety(res.data);
      }
    } catch (err: any) {
      console.error('[checkDeactivation error]', err);
      setFeedbackMsg({ type: 'error', text: err.message || 'Safety check failed' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDeactivation = async (force = false) => {
    if (!deactivationTarget) return;
    setActionLoading(true);
    try {
      await apiFetch(`/branches/${deactivationTarget.id}/deactivate`, {
        method: 'POST',
        body: JSON.stringify({ force }),
      });
      setFeedbackMsg({ type: 'success', text: `Branch "${deactivationTarget.name}" deactivated.` });
      setDeactivationTarget(null);
      setDeactivationSafety(null);
      await fetchBranches();
      if (selectedBranch?.id === deactivationTarget.id) {
        setSelectedBranch(null);
      }
    } catch (err: any) {
      console.error('[deactivateBranch error]', err);
      setFeedbackMsg({ type: 'error', text: err.message || 'Deactivation failed' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivateBranch = async (branchId: string) => {
    setActionLoading(true);
    try {
      await apiFetch(`/branches/${branchId}/reactivate`, { method: 'POST' });
      setFeedbackMsg({ type: 'success', text: 'Branch reactivated successfully.' });
      await fetchBranches();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Reactivation failed' });
    } finally {
      setActionLoading(false);
    }
  };

  // Open Assign Staff modal
  const handleOpenAssignStaff = async () => {
    if (!selectedBranch) return;
    setShowAssignStaffModal(true);
    try {
      const res = await apiFetch('/staff');
      if (res.success) {
        setAvailableStaffList(res.data?.staff || res.data || []);
      }
    } catch (err) {
      console.error('[loadStaff error]', err);
    }
  };

  const handleSaveStaffAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch || !assignForm.staffProfileId) return;
    setActionLoading(true);
    try {
      await apiFetch(`/branches/${selectedBranch.id}/staff`, {
        method: 'POST',
        body: JSON.stringify(assignForm),
      });
      setFeedbackMsg({ type: 'success', text: 'Staff member assigned to branch successfully.' });
      setShowAssignStaffModal(false);
      await openBranchDetails(selectedBranch);
      await fetchBranches();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to assign staff' });
    } finally {
      setActionLoading(false);
    }
  };

  // Open Transfer Student modal
  const handleOpenTransferModal = async (preselectedStudentId?: string) => {
    setShowTransferModal(true);
    setTransferForm((prev) => ({
      ...prev,
      studentId: preselectedStudentId || '',
      toBranchId: '',
    }));
    try {
      const res = await apiFetch('/students');
      if (res.success) {
        setAvailableStudentsList(res.data?.students || res.data || []);
      }
    } catch (err) {
      console.error('[loadStudents error]', err);
    }
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferForm.studentId || !transferForm.toBranchId) {
      alert('Please select student and destination branch.');
      return;
    }
    setActionLoading(true);
    try {
      await apiFetch('/branches/transfer-student', {
        method: 'POST',
        body: JSON.stringify(transferForm),
      });
      setFeedbackMsg({ type: 'success', text: 'Student transferred successfully. Historical academic & financial records preserved.' });
      setShowTransferModal(false);
      if (selectedBranch) {
        await openBranchDetails(selectedBranch);
      }
      await fetchBranches();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Transfer failed' });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredBranches = branches.filter((b) => {
    const q = search.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      b.code.toLowerCase().includes(q) ||
      (b.city && b.city.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Toast feedback */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between shadow-sm border ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            )}
            <span className="text-sm font-medium">{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-xs font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-[#D7CCC8] shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-[#4E342E]/10 text-[#4E342E]">
              <Building2 className="w-6 h-6 text-[#4E342E]" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-[#2D1E18]">Multi-Branch Institute Hub</h1>
              <p className="text-xs text-[#6D4C41]">
                Consolidated and individual branch operations for {activeInstitute?.name || 'Tuition Institute'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchBranches}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#D7CCC8] text-xs font-semibold text-[#4E342E] hover:bg-[#F7F2EF] transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => handleOpenTransferModal()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#6D4C41] text-[#4E342E] text-xs font-bold hover:bg-[#F7F2EF] transition shadow-sm"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-[#6D4C41]" />
            Transfer Student
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4E342E] text-white text-xs font-bold hover:bg-[#3E2723] transition shadow-md shadow-[#4E342E]/20"
          >
            <Plus className="w-4 h-4" />
            Add New Branch
          </button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#D7CCC8] shadow-sm">
          <div className="flex items-center justify-between text-[#6D4C41] text-xs font-semibold mb-1">
            <span>Total Branches</span>
            <Building2 className="w-4 h-4 text-[#8D6E63]" />
          </div>
          <div className="text-2xl font-black text-[#2D1E18]">{consolidated?.overview?.totalBranches || branches.length}</div>
          <p className="text-[11px] text-[#8D6E63] mt-1">{consolidated?.overview?.activeBranches || branches.filter(b => b.isActive).length} active branches</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#D7CCC8] shadow-sm">
          <div className="flex items-center justify-between text-[#6D4C41] text-xs font-semibold mb-1">
            <span>Enrolled Students</span>
            <GraduationCap className="w-4 h-4 text-[#8D6E63]" />
          </div>
          <div className="text-2xl font-black text-[#2D1E18]">{consolidated?.overview?.totalStudentsCount || 0}</div>
          <p className="text-[11px] text-[#8D6E63] mt-1">Across all branches</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#D7CCC8] shadow-sm">
          <div className="flex items-center justify-between text-[#6D4C41] text-xs font-semibold mb-1">
            <span>Staff Deployments</span>
            <Users className="w-4 h-4 text-[#8D6E63]" />
          </div>
          <div className="text-2xl font-black text-[#2D1E18]">{consolidated?.overview?.totalStaffAssignments || 0}</div>
          <p className="text-[11px] text-[#8D6E63] mt-1">Primary & multi-branch</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#D7CCC8] shadow-sm">
          <div className="flex items-center justify-between text-[#6D4C41] text-xs font-semibold mb-1">
            <span>Today's Check-ins</span>
            <Compass className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{consolidated?.overview?.todayCheckIns || 0}</div>
          <p className="text-[11px] text-emerald-600 mt-1">Live verified attendance</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#D7CCC8] shadow-sm col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-[#6D4C41] text-xs font-semibold mb-1">
            <span>Total Collections</span>
            <DollarSign className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-black text-[#2D1E18]">
            ₹{(consolidated?.overview?.totalCollections || 0).toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-[#8D6E63] mt-1">Consolidated fee revenue</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#8D6E63] absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search branches by name, code, or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-[#D7CCC8] text-xs focus:outline-none focus:ring-2 focus:ring-[#6D4C41]"
          />
        </div>
        <div className="text-xs text-[#6D4C41] font-semibold">
          Showing {filteredBranches.length} of {branches.length} branches
        </div>
      </div>

      {/* Branch Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredBranches.map((branch) => {
          const isHQ = branch.isDefault;
          const isActive = branch.isActive;

          return (
            <div
              key={branch.id}
              className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-sm hover:shadow-md ${
                isActive ? 'border-[#D7CCC8]' : 'border-rose-200 bg-rose-50/20 opacity-85'
              }`}
            >
              {/* Card Header */}
              <div className="p-5 border-b border-[#D7CCC8]/60 bg-gradient-to-b from-white to-[#F7F2EF]/40">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-[#2D1E18]">{branch.name}</h3>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#4E342E]/10 text-[#4E342E]">
                        Code: {branch.code}
                      </span>
                      {isHQ && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          Main Branch (HQ)
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          isActive
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Address snippet */}
                <div className="flex items-center gap-1.5 text-xs text-[#6D4C41] mt-3">
                  <MapPin className="w-3.5 h-3.5 text-[#8D6E63] shrink-0" />
                  <span className="truncate">
                    {[branch.address, branch.city, branch.state, branch.pincode].filter(Boolean).join(', ') || 'No address configured'}
                  </span>
                </div>
              </div>

              {/* Card Body Metrics */}
              <div className="p-5 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 bg-[#F7F2EF] p-3 rounded-xl border border-[#D7CCC8]/60">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#8D6E63] block">Students</span>
                    <span className="text-sm font-extrabold text-[#2D1E18]">
                      {branch.metrics?.activeStudentsCount ?? branch._count?.studentEnrollments ?? 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#8D6E63] block">Batches</span>
                    <span className="text-sm font-extrabold text-[#2D1E18]">
                      {branch.metrics?.activeBatches ?? branch._count?.batches ?? 0}
                    </span>
                  </div>
                  <div className="mt-1">
                    <span className="text-[10px] uppercase font-bold text-[#8D6E63] block">Staff</span>
                    <span className="text-sm font-extrabold text-[#2D1E18]">
                      {branch.metrics?.activeStaffCount ?? branch._count?.staffAssignments ?? 0}
                    </span>
                  </div>
                  <div className="mt-1">
                    <span className="text-[10px] uppercase font-bold text-[#8D6E63] block">Today's Check-ins</span>
                    <span className="text-sm font-extrabold text-emerald-700">
                      {branch.metrics?.todayCheckIns ?? branch._count?.attendanceSessions ?? 0}
                    </span>
                  </div>
                </div>

                {/* Operations & Geofence info */}
                <div className="space-y-1.5 text-[11px] text-[#5D4037]">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-[#6D4C41]">
                      <Clock className="w-3 h-3 text-[#8D6E63]" /> Timings:
                    </span>
                    <span className="font-semibold">{branch.workStartTime || '08:30'} - {branch.workEndTime || '18:30'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-[#6D4C41]">
                      <Compass className="w-3 h-3 text-[#8D6E63]" /> Geofence:
                    </span>
                    <span className="font-semibold">
                      {branch.latitude != null && branch.longitude != null ? `${branch.geofenceRadius}m radius` : 'Default HQ geofence'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-[#6D4C41]">
                      <DollarSign className="w-3 h-3 text-emerald-700" /> Revenue:
                    </span>
                    <span className="font-semibold text-emerald-800">
                      ₹{(branch.metrics?.totalCollections ?? 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="px-5 py-3 bg-white border-t border-[#D7CCC8]/60 flex items-center justify-between gap-2">
                <button
                  onClick={() => openBranchDetails(branch)}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-[#F7F2EF] hover:bg-[#D7CCC8]/40 text-[#4E342E] text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" /> View Details
                </button>
                <button
                  onClick={() => handleOpenEditModal(branch)}
                  className="py-1.5 px-3 rounded-lg border border-[#D7CCC8] hover:bg-[#F7F2EF] text-[#4E342E] text-xs font-semibold transition"
                >
                  Edit
                </button>
                {isActive ? (
                  !isHQ && (
                    <button
                      onClick={() => handleCheckDeactivation(branch)}
                      className="py-1.5 px-2.5 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition"
                      title="Deactivate branch safely"
                    >
                      Close
                    </button>
                  )
                ) : (
                  <button
                    onClick={() => handleReactivateBranch(branch.id)}
                    className="py-1.5 px-2.5 rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold transition"
                  >
                    Reactivate
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Branch Detail Modal / Drawer */}
      {selectedBranch && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl border border-[#D7CCC8] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#3E2723] text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-amber-300" />
                  <h2 className="text-lg font-bold">{selectedBranch.name}</h2>
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-white/20 text-white">
                    {selectedBranch.code}
                  </span>
                  {selectedBranch.isDefault && (
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-400 text-[#3E2723]">
                      Headquarters
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#D7CCC8] mt-0.5">
                  {selectedBranch.city ? `${selectedBranch.city}, ` : ''}{selectedBranch.state || 'Physical Branch'}
                </p>
              </div>
              <button
                onClick={() => setSelectedBranch(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-navigation tabs */}
            <div className="flex border-b border-[#D7CCC8] bg-[#F7F2EF] px-6 gap-2">
              {[
                { id: 'overview', label: 'Overview & Metrics' },
                { id: 'staff', label: `Staff (${branchDetailData?.staffAssignments?.length ?? selectedBranch.metrics?.activeStaffCount ?? 0})` },
                { id: 'students', label: `Students (${branchDetailData?.studentEnrollments?.length ?? selectedBranch.metrics?.activeStudentsCount ?? 0})` },
                { id: 'batches', label: `Batches (${branchDetailData?.batches?.length ?? selectedBranch.metrics?.activeBatches ?? 0})` },
                { id: 'geofence', label: 'Geofence & Hours' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setDetailTab(tab.id as any)}
                  className={`py-3 px-3.5 text-xs font-bold border-b-2 transition -mb-px ${
                    detailTab === tab.id
                      ? 'border-[#4E342E] text-[#4E342E]'
                      : 'border-transparent text-[#8D6E63] hover:text-[#4E342E]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {detailLoading ? (
                <div className="py-16 text-center text-xs text-[#8D6E63]">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#4E342E]" />
                  Loading branch operational details...
                </div>
              ) : (
                <>
                  {detailTab === 'overview' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-[#F7F2EF] p-4 rounded-xl border border-[#D7CCC8]/60">
                          <span className="text-[10px] font-bold uppercase text-[#8D6E63] block">Active Students</span>
                          <span className="text-xl font-black text-[#2D1E18]">
                            {branchDetailData?.metrics?.activeStudentsCount || 0}
                          </span>
                        </div>
                        <div className="bg-[#F7F2EF] p-4 rounded-xl border border-[#D7CCC8]/60">
                          <span className="text-[10px] font-bold uppercase text-[#8D6E63] block">Active Batches</span>
                          <span className="text-xl font-black text-[#2D1E18]">
                            {branchDetailData?.metrics?.activeBatches || 0}
                          </span>
                        </div>
                        <div className="bg-[#F7F2EF] p-4 rounded-xl border border-[#D7CCC8]/60">
                          <span className="text-[10px] font-bold uppercase text-[#8D6E63] block">Assigned Staff</span>
                          <span className="text-xl font-black text-[#2D1E18]">
                            {branchDetailData?.metrics?.activeStaffCount || 0}
                          </span>
                        </div>
                        <div className="bg-[#F7F2EF] p-4 rounded-xl border border-[#D7CCC8]/60">
                          <span className="text-[10px] font-bold uppercase text-[#8D6E63] block">Total Collections</span>
                          <span className="text-xl font-black text-emerald-800">
                            ₹{(branchDetailData?.metrics?.totalCollections || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-[#D7CCC8] space-y-2 text-xs">
                        <h4 className="font-bold text-[#2D1E18] text-sm">Branch Contact & Location</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[#5D4037] pt-2">
                          <div>
                            <span className="font-semibold text-[#8D6E63] block">Address</span>
                            <span>{selectedBranch.address || 'Not specified'}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-[#8D6E63] block">City & State</span>
                            <span>{[selectedBranch.city, selectedBranch.state, selectedBranch.pincode].filter(Boolean).join(', ') || 'Not specified'}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-[#8D6E63] block">Phone</span>
                            <span>{selectedBranch.phone || 'Not provided'}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-[#8D6E63] block">Email</span>
                            <span>{selectedBranch.email || 'Not provided'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {detailTab === 'staff' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-[#2D1E18]">Staff Assigned to this Branch</h4>
                        <button
                          onClick={handleOpenAssignStaff}
                          className="flex items-center gap-1 px-3 py-1.5 bg-[#4E342E] text-white rounded-lg text-xs font-semibold hover:bg-[#3E2723]"
                        >
                          <Plus className="w-3.5 h-3.5" /> Assign Staff
                        </button>
                      </div>

                      <div className="border border-[#D7CCC8] rounded-xl overflow-hidden">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-[#F7F2EF] border-b border-[#D7CCC8] text-[#6D4C41] font-bold">
                            <tr>
                              <th className="p-3">Staff Member</th>
                              <th className="p-3">Assignment Type</th>
                              <th className="p-3">Branch Role</th>
                              <th className="p-3">Effective Range</th>
                              <th className="p-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#D7CCC8]/60">
                            {branchDetailData?.staffAssignments?.length > 0 ? (
                              branchDetailData.staffAssignments.map((a: any) => (
                                <tr key={a.id} className="hover:bg-[#F7F2EF]/40">
                                  <td className="p-3 font-semibold text-[#2D1E18]">
                                    <div>{a.staffProfile?.user?.fullName || 'Staff'}</div>
                                    <div className="text-[10px] text-[#8D6E63]">{a.staffProfile?.employeeCode || a.staffProfile?.designation}</div>
                                  </td>
                                  <td className="p-3">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        a.isPrimary
                                          ? 'bg-amber-100 text-amber-800'
                                          : 'bg-[#4E342E]/10 text-[#4E342E]'
                                      }`}
                                    >
                                      {a.isPrimary ? 'PRIMARY' : a.assignmentType}
                                    </span>
                                  </td>
                                  <td className="p-3 text-[#5D4037]">{a.role}</td>
                                  <td className="p-3 text-[#8D6E63]">
                                    {a.effectiveFrom ? new Date(a.effectiveFrom).toLocaleDateString() : '—'}
                                    {a.effectiveTo ? ` to ${new Date(a.effectiveTo).toLocaleDateString()}` : ' (Ongoing)'}
                                  </td>
                                  <td className="p-3">
                                    <span className="text-emerald-700 font-bold">Active</span>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={5} className="p-6 text-center text-[#8D6E63]">
                                  No staff currently assigned to this branch.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {detailTab === 'students' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-[#2D1E18]">Students Enrolled at this Branch</h4>
                        <button
                          onClick={() => handleOpenTransferModal()}
                          className="flex items-center gap-1 px-3 py-1.5 bg-[#4E342E] text-white rounded-lg text-xs font-semibold hover:bg-[#3E2723]"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" /> Transfer Student
                        </button>
                      </div>

                      <div className="border border-[#D7CCC8] rounded-xl overflow-hidden">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-[#F7F2EF] border-b border-[#D7CCC8] text-[#6D4C41] font-bold">
                            <tr>
                              <th className="p-3">Student Name</th>
                              <th className="p-3">Admission / Roll No</th>
                              <th className="p-3">Primary Branch</th>
                              <th className="p-3">Enrollment Date</th>
                              <th className="p-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#D7CCC8]/60">
                            {branchDetailData?.studentEnrollments?.length > 0 ? (
                              branchDetailData.studentEnrollments.map((enr: any) => (
                                <tr key={enr.id} className="hover:bg-[#F7F2EF]/40">
                                  <td className="p-3 font-semibold text-[#2D1E18]">
                                    {enr.student?.user?.fullName || enr.student?.firstName || 'Student'}
                                  </td>
                                  <td className="p-3 text-[#5D4037]">
                                    {enr.student?.admissionNumber || enr.student?.rollNumber || '—'}
                                  </td>
                                  <td className="p-3">
                                    {enr.isPrimary ? (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                        Primary
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                        Cross-Enrolled
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-3 text-[#8D6E63]">
                                    {enr.enrolledAt ? new Date(enr.enrolledAt).toLocaleDateString() : '—'}
                                  </td>
                                  <td className="p-3 text-right">
                                    <button
                                      onClick={() => handleOpenTransferModal(enr.studentId)}
                                      className="text-xs font-bold text-[#6D4C41] hover:underline"
                                    >
                                      Transfer
                                    </button>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={5} className="p-6 text-center text-[#8D6E63]">
                                  No students enrolled in this branch yet.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {detailTab === 'batches' && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-[#2D1E18]">Academic Batches at this Branch</h4>
                      <div className="border border-[#D7CCC8] rounded-xl overflow-hidden">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-[#F7F2EF] border-b border-[#D7CCC8] text-[#6D4C41] font-bold">
                            <tr>
                              <th className="p-3">Batch Name</th>
                              <th className="p-3">Code</th>
                              <th className="p-3">Academic Year</th>
                              <th className="p-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#D7CCC8]/60">
                            {branchDetailData?.batches?.length > 0 ? (
                              branchDetailData.batches.map((b: any) => (
                                <tr key={b.id} className="hover:bg-[#F7F2EF]/40">
                                  <td className="p-3 font-semibold text-[#2D1E18]">{b.name}</td>
                                  <td className="p-3 text-[#5D4037]">{b.code || '—'}</td>
                                  <td className="p-3 text-[#8D6E63]">{b.academicYear}</td>
                                  <td className="p-3">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        b.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                                      }`}
                                    >
                                      {b.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={4} className="p-6 text-center text-[#8D6E63]">
                                  No batches assigned to this branch yet.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {detailTab === 'geofence' && (
                    <div className="space-y-4 text-xs">
                      <div className="bg-[#F7F2EF] p-4 rounded-xl border border-[#D7CCC8] space-y-2">
                        <h4 className="font-bold text-[#2D1E18] text-sm flex items-center gap-2">
                          <Compass className="w-4 h-4 text-[#6D4C41]" /> Attendance GPS & Geofence Verification
                        </h4>
                        <p className="text-[#6D4C41]">
                          Staff members checking in to this branch are validated against these coordinates.
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                          <div>
                            <span className="font-semibold text-[#8D6E63] block">Latitude</span>
                            <span className="font-bold text-[#2D1E18]">{selectedBranch.latitude ?? 'Not set'}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-[#8D6E63] block">Longitude</span>
                            <span className="font-bold text-[#2D1E18]">{selectedBranch.longitude ?? 'Not set'}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-[#8D6E63] block">Permitted Radius</span>
                            <span className="font-bold text-[#2D1E18]">{selectedBranch.geofenceRadius} metres</span>
                          </div>
                          <div>
                            <span className="font-semibold text-[#8D6E63] block">Accuracy Threshold</span>
                            <span className="font-bold text-[#2D1E18]">{selectedBranch.gpsAccuracyThreshold} metres</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-[#D7CCC8] space-y-2">
                        <h4 className="font-bold text-[#2D1E18] text-sm flex items-center gap-2">
                          <Clock className="w-4 h-4 text-[#6D4C41]" /> Shift Timings & Working Days
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                          <div>
                            <span className="font-semibold text-[#8D6E63] block">Work Start Time</span>
                            <span className="font-bold text-[#2D1E18]">{selectedBranch.workStartTime || '08:30'}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-[#8D6E63] block">Work End Time</span>
                            <span className="font-bold text-[#2D1E18]">{selectedBranch.workEndTime || '18:30'}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-[#8D6E63] block">Late Grace Window</span>
                            <span className="font-bold text-[#2D1E18]">{selectedBranch.lateGraceMinutes} minutes</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-[#F7F2EF] border-t border-[#D7CCC8] flex justify-end gap-2">
              <button
                onClick={() => setSelectedBranch(null)}
                className="px-4 py-2 bg-white border border-[#D7CCC8] rounded-xl text-xs font-semibold text-[#4E342E] hover:bg-[#D7CCC8]/30"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Branch Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl border border-[#D7CCC8] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 bg-[#4E342E] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-base">
                  {editingBranch ? `Edit Branch: ${editingBranch.name}` : 'Add New Physical Branch'}
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBranch} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-[#2D1E18] block mb-1">Branch Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. South Campus or Anna Nagar Branch"
                    value={branchForm.name}
                    onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D4C41]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#2D1E18] block mb-1">Branch Code (Unique) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SOU, ANN01, BLR2"
                    value={branchForm.code}
                    onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D4C41] uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-[#2D1E18] block mb-1">Phone</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={branchForm.phone}
                    onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D4C41]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#2D1E18] block mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="branch@academy.com"
                    value={branchForm.email}
                    onChange={(e) => setBranchForm({ ...branchForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D4C41]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#2D1E18] block mb-1">Street Address</label>
                <input
                  type="text"
                  placeholder="Plot 12, Main Road"
                  value={branchForm.address}
                  onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D4C41]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-[#2D1E18] block mb-1">City</label>
                  <input
                    type="text"
                    placeholder="Chennai"
                    value={branchForm.city}
                    onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#2D1E18] block mb-1">State</label>
                  <input
                    type="text"
                    placeholder="Tamil Nadu"
                    value={branchForm.state}
                    onChange={(e) => setBranchForm({ ...branchForm, state: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#2D1E18] block mb-1">Pincode</label>
                  <input
                    type="text"
                    placeholder="600001"
                    value={branchForm.pincode}
                    onChange={(e) => setBranchForm({ ...branchForm, pincode: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl"
                  />
                </div>
              </div>

              {/* Geofence Settings */}
              <div className="bg-[#F7F2EF] p-4 rounded-xl border border-[#D7CCC8] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#2D1E18] flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-[#6D4C41]" /> Geofence & Location Coordinates
                  </span>
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    className="px-2.5 py-1 bg-white border border-[#D7CCC8] rounded-lg text-[11px] font-semibold text-[#4E342E] hover:bg-[#D7CCC8]/40"
                  >
                    Use My Current Location
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-[#6D4C41] block mb-1">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="13.0827"
                      value={branchForm.latitude}
                      onChange={(e) => setBranchForm({ ...branchForm, latitude: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-[#D7CCC8] rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#6D4C41] block mb-1">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="80.2707"
                      value={branchForm.longitude}
                      onChange={(e) => setBranchForm({ ...branchForm, longitude: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-[#D7CCC8] rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-[#6D4C41] block mb-1">
                      Geofence Radius ({branchForm.geofenceRadius}m)
                    </label>
                    <input
                      type="range"
                      min={25}
                      max={1000}
                      step={25}
                      value={branchForm.geofenceRadius}
                      onChange={(e) => setBranchForm({ ...branchForm, geofenceRadius: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#6D4C41] block mb-1">
                      GPS Accuracy Threshold ({branchForm.gpsAccuracyThreshold}m)
                    </label>
                    <input
                      type="range"
                      min={10}
                      max={200}
                      step={10}
                      value={branchForm.gpsAccuracyThreshold}
                      onChange={(e) => setBranchForm({ ...branchForm, gpsAccuracyThreshold: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Working Hours */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-[#2D1E18] block mb-1">Work Start Time</label>
                  <input
                    type="time"
                    value={branchForm.workStartTime}
                    onChange={(e) => setBranchForm({ ...branchForm, workStartTime: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#2D1E18] block mb-1">Work End Time</label>
                  <input
                    type="time"
                    value={branchForm.workEndTime}
                    onChange={(e) => setBranchForm({ ...branchForm, workEndTime: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#2D1E18] block mb-1">Grace Period (min)</label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={branchForm.lateGraceMinutes}
                    onChange={(e) => setBranchForm({ ...branchForm, lateGraceMinutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#D7CCC8]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-[#D7CCC8] rounded-xl font-semibold text-[#4E342E] hover:bg-[#F7F2EF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-[#4E342E] text-white rounded-xl font-bold hover:bg-[#3E2723] transition flex items-center gap-1.5"
                >
                  {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                  {editingBranch ? 'Save Changes' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Staff to Branch Modal */}
      {showAssignStaffModal && selectedBranch && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-[#D7CCC8] overflow-hidden animate-in fade-in">
            <div className="px-6 py-4 bg-[#4E342E] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Assign Staff to {selectedBranch.name}</h3>
              <button onClick={() => setShowAssignStaffModal(false)} className="text-white hover:opacity-80">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStaffAssignment} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold text-[#2D1E18] block mb-1">Select Staff Member *</label>
                <select
                  required
                  value={assignForm.staffProfileId}
                  onChange={(e) => setAssignForm({ ...assignForm, staffProfileId: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl"
                >
                  <option value="">-- Choose employee --</option>
                  {availableStaffList.map((st: any) => (
                    <option key={st.id} value={st.id}>
                      {st.user?.fullName} ({st.employeeCode || st.designation || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#2D1E18] block mb-1">Assignment Type</label>
                  <select
                    value={assignForm.assignmentType}
                    onChange={(e) => setAssignForm({ ...assignForm, assignmentType: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl"
                  >
                    <option value="PRIMARY">Primary Branch</option>
                    <option value="ADDITIONAL">Additional Branch</option>
                    <option value="TEMPORARY">Temporary Deployment</option>
                    <option value="SUBSTITUTE">Substitute Teacher</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[#2D1E18] block mb-1">Branch Role</label>
                  <select
                    value={assignForm.role}
                    onChange={(e) => setAssignForm({ ...assignForm, role: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl"
                  >
                    <option value="TEACHER">Teacher / Faculty</option>
                    <option value="BRANCH_ADMIN">Branch Administrator</option>
                    <option value="COORDINATOR">Academic Coordinator</option>
                    <option value="SUPPORT_STAFF">Support Staff</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#2D1E18] block mb-1">Effective From *</label>
                  <input
                    type="date"
                    required
                    value={assignForm.effectiveFrom}
                    onChange={(e) => setAssignForm({ ...assignForm, effectiveFrom: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#2D1E18] block mb-1">Effective To (Optional)</label>
                  <input
                    type="date"
                    value={assignForm.effectiveTo}
                    onChange={(e) => setAssignForm({ ...assignForm, effectiveTo: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] flex gap-2">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  TuitionOS automatically cross-checks teaching batch schedules across all branches to avoid timetable collisions.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignStaffModal(false)}
                  className="px-4 py-2 border border-[#D7CCC8] rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-[#4E342E] text-white rounded-xl font-bold hover:bg-[#3E2723]"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Student Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-[#D7CCC8] overflow-hidden animate-in fade-in">
            <div className="px-6 py-4 bg-[#4E342E] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-sm">Cross-Branch Student Transfer</h3>
              </div>
              <button onClick={() => setShowTransferModal(false)} className="text-white hover:opacity-80">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteTransfer} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold text-[#2D1E18] block mb-1">Select Student to Transfer *</label>
                <select
                  required
                  value={transferForm.studentId}
                  onChange={(e) => setTransferForm({ ...transferForm, studentId: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl"
                >
                  <option value="">-- Choose student --</option>
                  {availableStudentsList.map((st: any) => (
                    <option key={st.id} value={st.id}>
                      {st.user?.fullName || `${st.firstName || ''} ${st.lastName || ''}`.trim()} ({st.admissionNumber || 'No ID'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-[#2D1E18] block mb-1">Destination Branch *</label>
                <select
                  required
                  value={transferForm.toBranchId}
                  onChange={(e) => setTransferForm({ ...transferForm, toBranchId: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl"
                >
                  <option value="">-- Choose target branch --</option>
                  {branches.filter((b) => b.isActive).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code}) {b.isDefault ? '— Main Branch' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#2D1E18] block mb-1">Effective Date *</label>
                  <input
                    type="date"
                    required
                    value={transferForm.effectiveDate}
                    onChange={(e) => setTransferForm({ ...transferForm, effectiveDate: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#2D1E18] block mb-1">Fee Handling Policy</label>
                  <select
                    value={transferForm.transferFeesPolicy}
                    onChange={(e) => setTransferForm({ ...transferForm, transferFeesPolicy: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl"
                  >
                    <option value="RETAIN_ORIGINAL_FEES">Retain existing fee structures</option>
                    <option value="SWITCH_TO_TARGET_BRANCH_FEES">Switch to target branch fee structures</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#2D1E18] block mb-1">Reason for Transfer *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Relocated residence closer to south branch campus"
                  value={transferForm.reason}
                  onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl"
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-[11px] space-y-1">
                <span className="font-bold block">Historical Integrity Guarantee:</span>
                <p>
                  All past attendance events, payment receipts, invoices, and exam marks recorded at the source branch remain permanently preserved for regulatory and audit compliance.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 border border-[#D7CCC8] rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-[#4E342E] text-white rounded-xl font-bold hover:bg-[#3E2723]"
                >
                  Confirm Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Safe Deactivation Confirmation Modal */}
      {deactivationTarget && deactivationSafety && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-rose-200 overflow-hidden animate-in fade-in">
            <div className="px-6 py-4 bg-rose-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-sm">Close Branch: {deactivationTarget.name}</h3>
              </div>
              <button
                onClick={() => {
                  setDeactivationTarget(null);
                  setDeactivationSafety(null);
                }}
                className="text-white hover:opacity-80"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-[#2D1E18]">
              {deactivationSafety.safeToDeactivate ? (
                <div className="space-y-3">
                  <p className="text-emerald-800 bg-emerald-50 p-3 rounded-xl border border-emerald-200 font-medium">
                    This branch has zero active student enrollments, batches, or staff assignments. It is completely safe to close.
                  </p>
                  <p className="text-[#6D4C41]">
                    Historical records (past attendance, receipts) will remain preserved in read-only mode for audit compliance.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 font-semibold">
                    Branch deactivation blocked by active dependencies:
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-rose-800">
                    {deactivationSafety.reasons?.map((r: string, idx: number) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-[#8D6E63]">
                    Please use the "Transfer Student" and Staff assignment management tools to reassign active operations before closing this branch.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-[#D7CCC8]">
                <button
                  type="button"
                  onClick={() => {
                    setDeactivationTarget(null);
                    setDeactivationSafety(null);
                  }}
                  className="px-4 py-2 border border-[#D7CCC8] rounded-xl font-semibold"
                >
                  Cancel
                </button>
                {deactivationSafety.safeToDeactivate && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleConfirmDeactivation(false)}
                    className="px-4 py-2 bg-rose-700 text-white rounded-xl font-bold hover:bg-rose-800"
                  >
                    Confirm Deactivation
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default BranchManagement;

