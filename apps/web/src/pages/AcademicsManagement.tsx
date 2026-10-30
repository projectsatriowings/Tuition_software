import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { apiFetch } from '../services/api';
import { Batch, Subject } from '../types';
import { useToast } from '../context/ToastContext';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { StudentAvatar } from '../components/StudentAvatar';
import { SchedulePicker } from '../components/SchedulePicker';
import {
  Layers,
  BookOpen,
  Plus,
  X,
  Users,
  Edit2,
  Trash2,
  Power,
  GraduationCap,
  CheckCircle2,
  Search,
  UserCheck,
  ChevronRight,
  Sparkles,
  BookMarked,
  Info,
  Calendar,
  Clock,
  ArrowLeft,
  Check,
  AlertCircle,
  Phone,
  Award,
  RefreshCw,
} from 'lucide-react';

interface StaffOption {
  staffProfileId: string;
  userId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  employeeCode: string | null;
  designation: string;
}

interface StudentOption {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  photoUrl?: string | null;
  status: string;
}

interface AcademicsManagementProps {
  onNavigateTab?: (tab: string) => void;
}

export const AcademicsManagement: React.FC<AcademicsManagementProps> = ({ onNavigateTab }) => {
  const { success, error, info } = useToast();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [availableStaff, setAvailableStaff] = useState<StaffOption[]>([]);
  const [instituteStudents, setInstituteStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state for batches
  const [batchSearch, setBatchSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [yearFilter, setYearFilter] = useState<string>('ALL');

  // Currently viewed/selected batch for full details
  const [selectedBatchDetails, setSelectedBatchDetails] = useState<Batch | null>(null);
  const [batchDetailTab, setBatchDetailTab] = useState<'overview' | 'subjects' | 'students' | 'allocations' | 'staff'>('overview');
  const [batchDetailLoading, setBatchDetailLoading] = useState(false);

  // Modals
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);

  // Batch Subject Modals
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [editingBatchSubject, setEditingBatchSubject] = useState<any | null>(null);

  // Enroll Student Modal
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedStudentToEnroll, setSelectedStudentToEnroll] = useState('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  // Assign Staff Modal
  const [showAssignStaffModal, setShowAssignStaffModal] = useState(false);
  const [selectedStaffToAssign, setSelectedStaffToAssign] = useState('');

  // Student Subject Allocations Modal
  const [allocatingStudent, setAllocatingStudent] = useState<any | null>(null);
  const [selectedAllocationSubjectIds, setSelectedAllocationSubjectIds] = useState<string[]>([]);
  const [allocationLoading, setAllocationLoading] = useState(false);

  // Confirmation Modals
  const [confirmDeactivate, setConfirmDeactivate] = useState<{ isOpen: boolean; batch: Batch | null }>({
    isOpen: false,
    batch: null,
  });
  const [confirmDeleteBatch, setConfirmDeleteBatch] = useState<{ isOpen: boolean; batch: Batch | null }>({
    isOpen: false,
    batch: null,
  });
  const [deleteBatchLoading, setDeleteBatchLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [confirmRemoveSubject, setConfirmRemoveSubject] = useState<{ isOpen: boolean; subjectId: string; subjectName: string }>({
    isOpen: false,
    subjectId: '',
    subjectName: '',
  });

  // Batch Form State
  const [batchForm, setBatchForm] = useState({
    name: '',
    code: '',
    academicYear: '2026-2027',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    description: '',
    schedule: '',
    isActive: true,
    staffProfileIds: [] as string[],
  });

  // Subject Inside Batch Form State
  const [subjectForm, setSubjectForm] = useState({
    name: '',
    code: '',
    description: '',
    staffProfileId: '',
    schedule: '',
    isActive: true,
  });

  // Fetch initial batch list and helper options (supports silent background sync)
  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setIsSyncing(true);
      const [batchesRes, staffRes, studentsRes] = await Promise.all([
        apiFetch('/academics/batches'),
        apiFetch('/academics/staff').catch(() => ({ data: { staff: [] } })),
        apiFetch('/students?status=ACTIVE').catch(() => ({ data: { students: [] } })),
      ]);

      setBatches(batchesRes.data?.batches || []);
      setAvailableStaff(staffRes.data?.staff || []);
      setInstituteStudents(studentsRes.data?.students || []);
    } catch (err: any) {
      if (!silent) error(err.message || 'Failed to load academics data');
    } finally {
      if (!silent) setLoading(false);
      setIsSyncing(false);
    }
  }, [error]);

  useEffect(() => {
    fetchData();

    // Auto-sync whenever user focuses the window (e.g. returning from DB editor/tool)
    const handleFocus = () => fetchData(true);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchData(true);
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    // Periodic sync every 10 seconds to keep UI 100% matched with database
    const interval = setInterval(() => fetchData(true), 10000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(interval);
    };
  }, [fetchData]);

  // Load detailed batch with subjects, roster, allocations and faculty
  const loadBatchDetails = async (batchId: string) => {
    setBatchDetailLoading(true);
    try {
      const res = await apiFetch(`/academics/batches/${batchId}`);
      if (res.success && res.data?.batch) {
        setSelectedBatchDetails(res.data.batch);
      }
    } catch (err: any) {
      error(err.message || 'Failed to load batch details');
    } finally {
      setBatchDetailLoading(false);
    }
  };

  // Open Edit Batch
  const handleOpenEditBatch = (b: Batch) => {
    setEditingBatch(b);
    setBatchForm({
      name: b.name,
      code: b.code || '',
      academicYear: b.academicYear,
      startDate: b.startDate ? new Date(b.startDate).toISOString().split('T')[0] : '',
      endDate: b.endDate ? new Date(b.endDate).toISOString().split('T')[0] : '',
      description: b.description || '',
      schedule: b.schedule || '',
      isActive: b.isActive,
      staffProfileIds: [] as string[],
    });
    setShowBatchModal(true);
  };

  // Save Batch (Create or Edit)
  const handleSaveBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBatch) {
        const res = await apiFetch(`/academics/batches/${editingBatch.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: batchForm.name,
            code: batchForm.code || undefined,
            academicYear: batchForm.academicYear,
            startDate: batchForm.startDate || undefined,
            endDate: batchForm.endDate || null,
            description: batchForm.description || null,
            schedule: batchForm.schedule || null,
            isActive: batchForm.isActive,
          }),
        });
        if (res.success) {
          success(`Batch '${batchForm.name}' updated successfully`);
          setShowBatchModal(false);
          setEditingBatch(null);
          await fetchData();
          if (selectedBatchDetails?.id === editingBatch.id) {
            loadBatchDetails(editingBatch.id);
          }
        }
      } else {
        const res = await apiFetch('/academics/batches', {
          method: 'POST',
          body: JSON.stringify({
            name: batchForm.name,
            code: batchForm.code || undefined,
            academicYear: batchForm.academicYear,
            startDate: batchForm.startDate || undefined,
            endDate: batchForm.endDate || undefined,
            description: batchForm.description || undefined,
            schedule: batchForm.schedule || undefined,
            isActive: batchForm.isActive,
            staffProfileIds: batchForm.staffProfileIds.length > 0 ? batchForm.staffProfileIds : undefined,
          }),
        });
        if (res.success && res.data?.batch) {
          success(`Batch '${batchForm.name}' created successfully`);
          setShowBatchModal(false);
          setBatchForm({
            name: '',
            code: '',
            academicYear: '2026-2027',
            startDate: new Date().toISOString().split('T')[0],
            endDate: '',
            description: '',
            schedule: '',
            isActive: true,
            staffProfileIds: [] as string[],
          });
          await fetchData();
          // Prompt requirement 1.2: "After saving, navigate to the batch details page."
          loadBatchDetails(res.data.batch.id);
        }
      }
    } catch (err: any) {
      error(err.message || 'Failed to save batch');
    }
  };

  // Toggle Batch Active/Inactive Status
  const handleToggleBatchStatus = async (b: Batch) => {
    try {
      const nextStatus = !b.isActive;
      const res = await apiFetch(`/academics/batches/${b.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: nextStatus }),
      });
      if (res.success) {
        success(`Batch '${b.name}' ${nextStatus ? 'activated' : 'deactivated'} successfully`);
        setConfirmDeactivate({ isOpen: false, batch: null });
        fetchData();
        if (selectedBatchDetails?.id === b.id) {
          loadBatchDetails(b.id);
        }
      }
    } catch (err: any) {
      error(err.message || 'Failed to change batch status');
    }
  };

  // Manual Trigger to Synchronize directly with Database
  const handleManualSync = async () => {
    await fetchData();
    info('Synchronized with database');
  };

  // Delete Batch Permanently from Database
  const handleDeleteBatch = async () => {
    if (!confirmDeleteBatch.batch) return;
    setDeleteBatchLoading(true);
    try {
      const res = await apiFetch(`/academics/batches/${confirmDeleteBatch.batch.id}`, {
        method: 'DELETE',
      });
      if (res.success) {
        success(res.message || 'Batch deleted from database');
        setConfirmDeleteBatch({ isOpen: false, batch: null });
        fetchData();
        if (selectedBatchDetails?.id === confirmDeleteBatch.batch.id) {
          setSelectedBatchDetails(null);
        }
      } else {
        error(res.error || 'Failed to delete batch');
      }
    } catch (err: any) {
      error(err.message || 'Failed to delete batch');
    } finally {
      setDeleteBatchLoading(false);
    }
  };

  // Add or Edit Subject inside Batch
  const handleSaveBatchSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchDetails) return;
    try {
      if (editingBatchSubject) {
        const res = await apiFetch(`/academics/batches/${selectedBatchDetails.id}/subjects/${editingBatchSubject.subjectId || editingBatchSubject.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: subjectForm.name,
            code: subjectForm.code && subjectForm.code.trim() ? subjectForm.code.trim() : null,
            description: subjectForm.description || undefined,
            staffProfileId: subjectForm.staffProfileId || null,
            schedule: subjectForm.schedule || undefined,
            isActive: subjectForm.isActive,
          }),
        });
        if (res.success) {
          success(`Subject '${subjectForm.name}' updated inside batch`);
          setShowAddSubjectModal(false);
          setEditingBatchSubject(null);
          loadBatchDetails(selectedBatchDetails.id);
          fetchData();
        }
      } else {
        const res = await apiFetch(`/academics/batches/${selectedBatchDetails.id}/subjects`, {
          method: 'POST',
          body: JSON.stringify({
            name: subjectForm.name,
            code: subjectForm.code && subjectForm.code.trim() ? subjectForm.code.trim() : null,
            description: subjectForm.description || undefined,
            staffProfileId: subjectForm.staffProfileId || undefined,
            schedule: subjectForm.schedule || undefined,
            isActive: subjectForm.isActive,
          }),
        });
        if (res.success) {
          success(`Subject '${subjectForm.name}' added to batch successfully`);
          setShowAddSubjectModal(false);
          setSubjectForm({
            name: '',
            code: '',
            description: '',
            staffProfileId: '',
            schedule: '',
            isActive: true,
          });
          loadBatchDetails(selectedBatchDetails.id);
          fetchData();
        }
      }
    } catch (err: any) {
      error(err.message || 'Failed to save subject inside batch');
    }
  };

  // Remove Subject from Batch
  const handleRemoveSubject = async () => {
    if (!selectedBatchDetails || !confirmRemoveSubject.subjectId) return;
    try {
      const res = await apiFetch(`/academics/batches/${selectedBatchDetails.id}/subjects/${confirmRemoveSubject.subjectId}`, {
        method: 'DELETE',
      });
      if (res.success) {
        success(`Subject '${confirmRemoveSubject.subjectName}' removed from batch`);
        setConfirmRemoveSubject({ isOpen: false, subjectId: '', subjectName: '' });
        loadBatchDetails(selectedBatchDetails.id);
        fetchData();
      }
    } catch (err: any) {
      error(err.message || 'Failed to remove subject from batch');
    }
  };

  // Enroll Student in Batch
  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchDetails || !selectedStudentToEnroll) return;
    try {
      const res = await apiFetch(`/academics/batches/${selectedBatchDetails.id}/enroll`, {
        method: 'POST',
        body: JSON.stringify({ studentId: selectedStudentToEnroll }),
      });
      if (res.success) {
        success(res.message || 'Student enrolled in batch');
        setShowEnrollModal(false);
        setSelectedStudentToEnroll('');
        setStudentSearchQuery('');
        loadBatchDetails(selectedBatchDetails.id);
        fetchData();
      }
    } catch (err: any) {
      error(err.message || 'Failed to enroll student');
    }
  };

  // Unenroll Student from Batch
  const handleUnenrollStudent = async (studentId: string, studentName: string) => {
    if (!selectedBatchDetails) return;
    try {
      const res = await apiFetch(`/academics/batches/${selectedBatchDetails.id}/enroll/${studentId}`, {
        method: 'DELETE',
      });
      if (res.success) {
        success(`${studentName} removed from batch roster`);
        loadBatchDetails(selectedBatchDetails.id);
        fetchData();
      }
    } catch (err: any) {
      error(err.message || 'Failed to unenroll student');
    }
  };

  // Open Student Subject Allocations Modal
  const handleOpenAllocationModal = (student: any) => {
    setAllocatingStudent(student);
    const existingAllocated = student.allocatedSubjects?.map((s: any) => s.id) || [];
    setSelectedAllocationSubjectIds(existingAllocated);
  };

  // Save Student Subject Allocations
  const handleSaveStudentAllocations = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchDetails || !allocatingStudent) return;
    try {
      setAllocationLoading(true);
      const res = await apiFetch(`/academics/batches/${selectedBatchDetails.id}/students/${allocatingStudent.id}/subjects`, {
        method: 'POST',
        body: JSON.stringify({ subjectIds: selectedAllocationSubjectIds }),
      });
      if (res.success) {
        success(`Subject allocations updated for ${allocatingStudent.firstName} ${allocatingStudent.lastName}`);
        setAllocatingStudent(null);
        loadBatchDetails(selectedBatchDetails.id);
      }
    } catch (err: any) {
      error(err.message || 'Failed to save subject allocations');
    } finally {
      setAllocationLoading(false);
    }
  };

  // Assign Staff to Batch
  const handleAssignStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchDetails || !selectedStaffToAssign) return;
    try {
      const res = await apiFetch(`/academics/batches/${selectedBatchDetails.id}/staff`, {
        method: 'POST',
        body: JSON.stringify({ staffProfileId: selectedStaffToAssign }),
      });
      if (res.success) {
        success('Staff assigned to batch faculty');
        setShowAssignStaffModal(false);
        setSelectedStaffToAssign('');
        loadBatchDetails(selectedBatchDetails.id);
        fetchData();
      }
    } catch (err: any) {
      error(err.message || 'Failed to assign staff to batch');
    }
  };

  // Remove Staff from Batch
  const handleRemoveStaff = async (staffProfileId: string, staffName: string) => {
    if (!selectedBatchDetails) return;
    try {
      const res = await apiFetch(`/academics/batches/${selectedBatchDetails.id}/staff/${staffProfileId}`, {
        method: 'DELETE',
      });
      if (res.success) {
        success(`${staffName} removed from batch faculty`);
        loadBatchDetails(selectedBatchDetails.id);
        fetchData();
      }
    } catch (err: any) {
      error(err.message || 'Failed to remove staff');
    }
  };

  // Filtered Batches List
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      const matchesSearch =
        b.name.toLowerCase().includes(batchSearch.toLowerCase()) ||
        (b.code && b.code.toLowerCase().includes(batchSearch.toLowerCase())) ||
        b.academicYear.toLowerCase().includes(batchSearch.toLowerCase());
      const matchesStatus =
        statusFilter === 'ALL' ? true : statusFilter === 'ACTIVE' ? b.isActive : !b.isActive;
      const matchesYear = yearFilter === 'ALL' ? true : b.academicYear === yearFilter;
      return matchesSearch && matchesStatus && matchesYear;
    });
  }, [batches, batchSearch, statusFilter, yearFilter]);

  // Unique Academic Years for filtering
  const academicYears = useMemo(() => {
    const set = new Set(batches.map((b) => b.academicYear));
    return Array.from(set);
  }, [batches]);

  // Eligible students for enrollment
  const enrolledStudentIds = useMemo(() => {
    return new Set(selectedBatchDetails?.enrolledStudents?.map((s) => s.id) || []);
  }, [selectedBatchDetails]);

  const availableStudentsForEnroll = useMemo(() => {
    return instituteStudents.filter(
      (s) =>
        !enrolledStudentIds.has(s.id) &&
        (s.firstName.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
          s.lastName.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
          s.admissionNumber.toLowerCase().includes(studentSearchQuery.toLowerCase()))
    );
  }, [instituteStudents, enrolledStudentIds, studentSearchQuery]);

  // -------------------------------------------------------------
  // RENDER: BATCH DETAILS VIEW
  // -------------------------------------------------------------
  if (selectedBatchDetails) {
    const subjectsInBatch = selectedBatchDetails.batchSubjects || [];
    const enrolledStudents = selectedBatchDetails.enrolledStudents || [];
    const facultyAssigned = selectedBatchDetails.staffAssignments || [];

    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Detail Top Header */}
        <div className="bg-white rounded-3xl p-6 border border-[#E8DFD8] shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#F5F0EB]">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedBatchDetails(null)}
                className="p-2 rounded-xl bg-[#F7F2EF] hover:bg-[#EFEBE9] text-[#4E342E] transition"
                title="Back to Batches"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl font-black text-[#2D1E18] tracking-tight">
                    {selectedBatchDetails.name}
                  </h1>
                  {selectedBatchDetails.code && (
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-[#EFEBE9] text-[#4E342E] border border-[#D7CCC8]">
                      {selectedBatchDetails.code}
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      selectedBatchDetails.isActive
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-stone-100 text-stone-600 border-stone-200'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${selectedBatchDetails.isActive ? 'bg-emerald-500' : 'bg-stone-400'}`} />
                    {selectedBatchDetails.isActive ? 'Active Batch' : 'Inactive'}
                  </span>
                </div>
                <p className="text-xs text-[#8D6E63] mt-1 flex items-center gap-2">
                  <span>Academic Year: <strong className="text-[#4E342E]">{selectedBatchDetails.academicYear}</strong></span>
                  {selectedBatchDetails.schedule && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#8D6E63]" /> {selectedBatchDetails.schedule}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  if (onNavigateTab) {
                    onNavigateTab('attendance');
                  } else {
                    info('Navigate to Attendance Management to record attendance for this batch');
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#D7CCC8] hover:bg-[#F7F2EF] text-xs font-bold text-[#4E342E] shadow-sm transition"
              >
                <Calendar className="w-3.5 h-3.5 text-[#6D4C41]" />
                <span>View Attendance</span>
              </button>
              <button
                onClick={() => handleOpenEditBatch(selectedBatchDetails)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#D7CCC8] hover:bg-[#F7F2EF] text-xs font-bold text-[#4E342E] shadow-sm transition"
              >
                <Edit2 className="w-3.5 h-3.5 text-[#6D4C41]" />
                <span>Edit Batch</span>
              </button>
              <button
                onClick={() => {
                  setEditingBatchSubject(null);
                  setSubjectForm({
                    name: '',
                    code: '',
                    description: '',
                    staffProfileId: '',
                    schedule: '',
                    isActive: true,
                  });
                  setShowAddSubjectModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4E342E] hover:bg-[#3E2723] text-xs font-bold text-white shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Subject</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs inside Batch */}
          <div className="flex items-center gap-2 pt-4 overflow-x-auto">
            <button
              onClick={() => setBatchDetailTab('overview')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                batchDetailTab === 'overview'
                  ? 'bg-[#4E342E] text-white shadow-sm'
                  : 'text-[#6D4C41] hover:bg-[#F7F2EF]'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>
            <button
              onClick={() => setBatchDetailTab('subjects')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                batchDetailTab === 'subjects'
                  ? 'bg-[#4E342E] text-white shadow-sm'
                  : 'text-[#6D4C41] hover:bg-[#F7F2EF]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Subjects ({subjectsInBatch.length})</span>
            </button>
            <button
              onClick={() => setBatchDetailTab('students')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                batchDetailTab === 'students'
                  ? 'bg-[#4E342E] text-white shadow-sm'
                  : 'text-[#6D4C41] hover:bg-[#F7F2EF]'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Enrolled Students ({enrolledStudents.length})</span>
            </button>
            <button
              onClick={() => setBatchDetailTab('allocations')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                batchDetailTab === 'allocations'
                  ? 'bg-[#4E342E] text-white shadow-sm'
                  : 'text-[#6D4C41] hover:bg-[#F7F2EF]'
              }`}
            >
              <BookMarked className="w-3.5 h-3.5" />
              <span>Subject Allocations</span>
            </button>
            <button
              onClick={() => setBatchDetailTab('staff')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                batchDetailTab === 'staff'
                  ? 'bg-[#4E342E] text-white shadow-sm'
                  : 'text-[#6D4C41] hover:bg-[#F7F2EF]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Assigned Faculty ({facultyAssigned.length})</span>
            </button>
          </div>
        </div>

        {/* TAB 1: OVERVIEW */}
        {batchDetailTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2 bg-white rounded-3xl p-6 border border-[#E8DFD8] shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-[#2D1E18] uppercase tracking-wider border-b border-[#F5F0EB] pb-2 flex items-center gap-2">
                <Info className="w-4 h-4 text-[#6D4C41]" />
                <span>Batch Information</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-[#EFEBE9]">
                  <span className="text-[#8D6E63] block mb-0.5 font-medium">Batch Name</span>
                  <span className="text-sm font-bold text-[#2D1E18]">{selectedBatchDetails.name}</span>
                </div>
                <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-[#EFEBE9]">
                  <span className="text-[#8D6E63] block mb-0.5 font-medium">Batch Code</span>
                  <span className="font-mono text-sm font-bold text-[#4E342E]">{selectedBatchDetails.code || 'None'}</span>
                </div>
                <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-[#EFEBE9]">
                  <span className="text-[#8D6E63] block mb-0.5 font-medium">Academic Year</span>
                  <span className="text-sm font-bold text-[#2D1E18]">{selectedBatchDetails.academicYear}</span>
                </div>
                <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-[#EFEBE9]">
                  <span className="text-[#8D6E63] block mb-0.5 font-medium">Schedule & Timings</span>
                  <span className="text-sm font-semibold text-[#2D1E18]">{selectedBatchDetails.schedule || 'Not scheduled'}</span>
                </div>
                <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-[#EFEBE9]">
                  <span className="text-[#8D6E63] block mb-0.5 font-medium">Start Date</span>
                  <span className="text-sm font-semibold text-[#2D1E18]">
                    {selectedBatchDetails.startDate ? new Date(selectedBatchDetails.startDate).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-[#EFEBE9]">
                  <span className="text-[#8D6E63] block mb-0.5 font-medium">End Date</span>
                  <span className="text-sm font-semibold text-[#2D1E18]">
                    {selectedBatchDetails.endDate ? new Date(selectedBatchDetails.endDate).toLocaleDateString() : 'Ongoing'}
                  </span>
                </div>
              </div>
              {selectedBatchDetails.description && (
                <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#EFEBE9] text-xs">
                  <span className="text-[#8D6E63] block mb-1 font-medium">Description</span>
                  <p className="text-[#2D1E18] leading-relaxed">{selectedBatchDetails.description}</p>
                </div>
              )}
            </div>

            {/* Quick Metrics */}
            <div className="space-y-4">
              <div className="bg-white rounded-3xl p-5 border border-[#E8DFD8] shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-[#8D6E63]">Curriculum Subjects</span>
                  <div className="text-2xl font-black text-[#2D1E18] mt-1">{subjectsInBatch.length}</div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#F7F2EF] text-[#4E342E] flex items-center justify-center">
                  <BookOpen className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white rounded-3xl p-5 border border-[#E8DFD8] shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-[#8D6E63]">Enrolled Students</span>
                  <div className="text-2xl font-black text-[#2D1E18] mt-1">{enrolledStudents.length}</div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#F7F2EF] text-[#4E342E] flex items-center justify-center">
                  <GraduationCap className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white rounded-3xl p-5 border border-[#E8DFD8] shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-[#8D6E63]">Assigned Faculty</span>
                  <div className="text-2xl font-black text-[#2D1E18] mt-1">{facultyAssigned.length}</div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#F7F2EF] text-[#4E342E] flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SUBJECTS IN THIS BATCH */}
        {batchDetailTab === 'subjects' && (
          <div className="bg-white rounded-3xl p-6 border border-[#E8DFD8] shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F5F0EB]">
              <div>
                <h3 className="text-base font-bold text-[#2D1E18]">Curriculum Subjects</h3>
                <p className="text-xs text-[#8D6E63]">
                  Subjects configured directly inside this batch with designated faculty and schedule.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingBatchSubject(null);
                  setSubjectForm({
                    name: '',
                    code: '',
                    description: '',
                    staffProfileId: '',
                    schedule: '',
                    isActive: true,
                  });
                  setShowAddSubjectModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#4E342E] hover:bg-[#3E2723] text-xs font-bold text-white shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Subject</span>
              </button>
            </div>

            {subjectsInBatch.length === 0 ? (
              <div className="p-10 text-center bg-[#FAF8F5] border border-dashed border-[#D7CCC8] rounded-2xl">
                <BookOpen className="w-10 h-10 text-[#A1887F] mx-auto mb-2" />
                <h4 className="text-sm font-bold text-[#4E342E]">No subjects assigned yet</h4>
                <p className="text-xs text-[#8D6E63] max-w-sm mx-auto mt-1 mb-4">
                  Add subjects like Mathematics, Physics, or English directly into this batch.
                </p>
                <button
                  onClick={() => setShowAddSubjectModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4E342E] text-white text-xs font-bold"
                >
                  <Plus className="w-4 h-4" /> Add First Subject
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subjectsInBatch.map((bs: any) => (
                  <div
                    key={bs.id || bs.subjectId}
                    className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#EFEBE9] hover:border-[#D7CCC8] transition space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-[#2D1E18]">{bs.subject.name}</h4>
                          {bs.subject.code && (
                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-white text-[#4E342E] border border-[#D7CCC8]">
                              {bs.subject.code}
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              bs.isActive !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-200 text-stone-600'
                            }`}
                          >
                            {bs.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        {bs.schedule && (
                          <span className="text-[11px] text-[#8D6E63] flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3 text-[#A1887F]" /> {bs.schedule}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingBatchSubject(bs);
                            setSubjectForm({
                              name: bs.subject.name,
                              code: bs.subject.code || '',
                              description: bs.description || bs.subject.description || '',
                              staffProfileId: bs.staffProfileId || '',
                              schedule: bs.schedule || '',
                              isActive: bs.isActive !== false,
                            });
                            setShowAddSubjectModal(true);
                          }}
                          className="p-1.5 text-[#6D4C41] hover:text-[#2D1E18] hover:bg-white rounded-lg transition"
                          title="Edit Subject"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            setConfirmRemoveSubject({
                              isOpen: true,
                              subjectId: bs.subjectId || bs.subject.id,
                              subjectName: bs.subject.name,
                            })
                          }
                          className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition"
                          title="Remove Subject"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-[#EFEBE9]">
                      <span className="text-[#8D6E63]">Faculty:</span>
                      <span className="font-semibold text-[#4E342E] flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#8D6E63]" />
                        {bs.staffProfile?.user?.fullName || 'Batch Faculty'}
                      </span>
                    </div>

                    {bs.description && (
                      <p className="text-[11px] text-[#8D6E63] line-clamp-2">{bs.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ENROLLED STUDENTS */}
        {batchDetailTab === 'students' && (
          <div className="bg-white rounded-3xl p-6 border border-[#E8DFD8] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F5F0EB]">
              <div>
                <h3 className="text-base font-bold text-[#2D1E18]">Enrolled Student Roster</h3>
                <p className="text-xs text-[#8D6E63]">Students actively admitted and enrolled in this batch.</p>
              </div>
              <button
                onClick={() => {
                  setSelectedStudentToEnroll('');
                  setStudentSearchQuery('');
                  setShowEnrollModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#4E342E] hover:bg-[#3E2723] text-xs font-bold text-white shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>Enroll Student</span>
              </button>
            </div>

            {enrolledStudents.length === 0 ? (
              <div className="p-10 text-center bg-[#FAF8F5] border border-dashed border-[#D7CCC8] rounded-2xl">
                <GraduationCap className="w-10 h-10 text-[#A1887F] mx-auto mb-2" />
                <h4 className="text-sm font-bold text-[#4E342E]">No students enrolled in this batch</h4>
                <p className="text-xs text-[#8D6E63] max-w-sm mx-auto mt-1 mb-4">
                  Enroll students to build the class roster and allocate them to batch subjects.
                </p>
                <button
                  onClick={() => setShowEnrollModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4E342E] text-white text-xs font-bold"
                >
                  <Plus className="w-4 h-4" /> Enroll Student
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#EFEBE9] text-[#8D6E63] font-semibold">
                      <th className="py-2.5 px-3">Student</th>
                      <th className="py-2.5 px-3">Admission No</th>
                      <th className="py-2.5 px-3">Contact</th>
                      <th className="py-2.5 px-3">Allocated Subjects</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F5F0EB]">
                    {enrolledStudents.map((st: any) => (
                      <tr key={st.id} className="hover:bg-[#FAF8F5] transition">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <StudentAvatar
                              studentId={st.id}
                              photoUrl={st.photoUrl}
                              name={`${st.firstName} ${st.lastName}`}
                              size="sm"
                            />
                            <div>
                              <span className="font-bold text-[#2D1E18] block">
                                {st.firstName} {st.lastName}
                              </span>
                              <span className="text-[10px] text-[#8D6E63]">
                                Enrolled: {st.enrolledAt ? new Date(st.enrolledAt).toLocaleDateString() : 'Active'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-[#4E342E]">{st.admissionNumber}</td>
                        <td className="py-3 px-3 text-[#6D4C41]">{st.phone || '—'}</td>
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {st.allocatedSubjects && st.allocatedSubjects.length > 0 ? (
                              st.allocatedSubjects.map((sub: any) => (
                                <span
                                  key={sub.id}
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#FAF0E6] text-[#4E342E] border border-[#E0D5C9]"
                                >
                                  {sub.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-[#8D6E63] italic">None (attend all batch)</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenAllocationModal(st)}
                              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#EFEBE9] hover:bg-[#D7CCC8] text-[#4E342E] transition"
                            >
                              Allocate Subjects
                            </button>
                            <button
                              onClick={() => handleUnenrollStudent(st.id, `${st.firstName} ${st.lastName}`)}
                              className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition"
                              title="Unenroll student"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: STUDENT SUBJECT ALLOCATIONS MATRIX */}
        {batchDetailTab === 'allocations' && (
          <div className="bg-white rounded-3xl p-6 border border-[#E8DFD8] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F5F0EB]">
              <div>
                <h3 className="text-base font-bold text-[#2D1E18]">Student Subject Allocations</h3>
                <p className="text-xs text-[#8D6E63]">
                  Configure which curriculum subjects each enrolled student attends in this batch.
                </p>
              </div>
            </div>

            {enrolledStudents.length === 0 ? (
              <p className="text-xs text-[#8D6E63]">No students enrolled in this batch yet.</p>
            ) : subjectsInBatch.length === 0 ? (
              <p className="text-xs text-[#8D6E63]">Please add curriculum subjects to this batch first.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#EFEBE9] text-[#8D6E63] font-semibold">
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3">Admission No</th>
                      <th className="py-2.5 px-3">Allocated Subjects</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F5F0EB]">
                    {enrolledStudents.map((st: any) => (
                      <tr key={st.id} className="hover:bg-[#FAF8F5] transition">
                        <td className="py-3 px-3 font-bold text-[#2D1E18]">
                          {st.firstName} {st.lastName}
                        </td>
                        <td className="py-3 px-3 font-mono font-semibold text-[#4E342E]">{st.admissionNumber}</td>
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1.5">
                            {st.allocatedSubjects && st.allocatedSubjects.length > 0 ? (
                              st.allocatedSubjects.map((s: any) => (
                                <span
                                  key={s.id}
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200"
                                >
                                  ✓ {s.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                No subjects allocated
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleOpenAllocationModal(st)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-[#4E342E] hover:underline"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Manage</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: FACULTY ASSIGNED */}
        {batchDetailTab === 'staff' && (
          <div className="bg-white rounded-3xl p-6 border border-[#E8DFD8] shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F5F0EB]">
              <div>
                <h3 className="text-base font-bold text-[#2D1E18]">Assigned Faculty & Staff</h3>
                <p className="text-xs text-[#8D6E63]">
                  Teachers and staff members authorized to teach and view students in this batch.
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedStaffToAssign('');
                  setShowAssignStaffModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#4E342E] hover:bg-[#3E2723] text-xs font-bold text-white shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>Assign Faculty</span>
              </button>
            </div>

            {facultyAssigned.length === 0 ? (
              <div className="p-8 text-center bg-[#FAF8F5] border border-dashed border-[#D7CCC8] rounded-2xl">
                <Users className="w-8 h-8 text-[#A1887F] mx-auto mb-2" />
                <p className="text-xs text-[#8D6E63]">No staff members assigned to this batch yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {facultyAssigned.map((fa: any) => (
                  <div
                    key={fa.id || fa.staffProfileId}
                    className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-[#EFEBE9] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#EFEBE9] text-[#4E342E] font-bold text-xs flex items-center justify-center">
                        {fa.staffProfile?.user?.fullName?.[0] || 'T'}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[#2D1E18] block">
                          {fa.staffProfile?.user?.fullName}
                        </span>
                        <span className="text-[10px] text-[#8D6E63]">
                          {fa.staffProfile?.user?.email || fa.staffProfile?.user?.phone || 'Authorized Staff'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveStaff(fa.staffProfileId, fa.staffProfile?.user?.fullName)}
                      className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition"
                      title="Remove Staff"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ------------------ MODALS FOR BATCH DETAIL VIEW ------------------ */}

        {/* Add/Edit Subject inside Batch Modal */}
        {showAddSubjectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto border border-[#D7CCC8] shadow-2xl p-6 space-y-4 animate-scaleUp">
              <div className="flex items-center justify-between border-b border-[#F5F0EB] pb-3">
                <h3 className="text-base font-black text-[#2D1E18]">
                  {editingBatchSubject ? 'Edit Subject in Batch' : `Add Subject to ${selectedBatchDetails.name}`}
                </h3>
                <button
                  onClick={() => setShowAddSubjectModal(false)}
                  className="p-1.5 rounded-xl hover:bg-[#F7F2EF] text-[#6D4C41]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveBatchSubject} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-[#4E342E] mb-1">Subject Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mathematics, Physics, Chemistry"
                    value={subjectForm.name}
                    onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                    className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#8D6E63] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#4E342E] mb-1">Subject Code <span className="font-normal text-[#8D6E63]">(Optional)</span></label>
                  <input
                    type="text"
                    placeholder="e.g. MATH101, PHY-01"
                    value={subjectForm.code}
                    onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                    className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-[#8D6E63] focus:outline-none"
                  />
                </div>

                <SchedulePicker
                  value={subjectForm.schedule}
                  onChange={(val) => setSubjectForm({ ...subjectForm, schedule: val })}
                  label="Schedule & Timing"
                  helperText="Select days and class timings for this subject."
                />

                <div>
                  <label className="block font-bold text-[#4E342E] mb-1">Description (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="Brief description or syllabus overview"
                    value={subjectForm.description}
                    onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                    className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#8D6E63] focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="subjectStatusCheckbox"
                    checked={subjectForm.isActive}
                    onChange={(e) => setSubjectForm({ ...subjectForm, isActive: e.target.checked })}
                    className="rounded text-[#4E342E] focus:ring-[#8D6E63]"
                  />
                  <label htmlFor="subjectStatusCheckbox" className="font-semibold text-[#4E342E] text-xs">
                    Subject is Active in this batch
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F5F0EB]">
                  <button
                    type="button"
                    onClick={() => setShowAddSubjectModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-[#6D4C41] hover:bg-[#F7F2EF] transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#4E342E] hover:bg-[#3E2723] shadow-md transition"
                  >
                    {editingBatchSubject ? 'Save Changes' : 'Add Subject to Batch'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Allocate Student Subjects Modal */}
        {allocatingStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full border border-[#D7CCC8] shadow-2xl p-6 space-y-4 animate-scaleUp">
              <div className="flex items-center justify-between border-b border-[#F5F0EB] pb-3">
                <div>
                  <h3 className="text-base font-black text-[#2D1E18]">Allocate Subjects</h3>
                  <p className="text-xs text-[#8D6E63]">
                    {allocatingStudent.firstName} {allocatingStudent.lastName} ({allocatingStudent.admissionNumber})
                  </p>
                </div>
                <button
                  onClick={() => setAllocatingStudent(null)}
                  className="p-1.5 rounded-xl hover:bg-[#F7F2EF] text-[#6D4C41]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveStudentAllocations} className="space-y-4 text-xs">
                <p className="text-xs text-[#4E342E] font-medium">
                  Select the subjects this student attends in <strong>{selectedBatchDetails.name}</strong>:
                </p>

                {subjectsInBatch.length === 0 ? (
                  <p className="text-xs text-[#8D6E63] italic">No subjects configured in this batch.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {subjectsInBatch.map((bs: any) => {
                      const sid = bs.subjectId || bs.subject.id;
                      const isSelected = selectedAllocationSubjectIds.includes(sid);
                      return (
                        <label
                          key={sid}
                          className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-50/60 border-emerald-300'
                              : 'bg-[#FAF8F5] border-[#EFEBE9] hover:border-[#D7CCC8]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAllocationSubjectIds([...selectedAllocationSubjectIds, sid]);
                                } else {
                                  setSelectedAllocationSubjectIds(
                                    selectedAllocationSubjectIds.filter((id) => id !== sid)
                                  );
                                }
                              }}
                              className="rounded text-emerald-700 focus:ring-emerald-500"
                            />
                            <div>
                              <span className="font-bold text-[#2D1E18] block">{bs.subject.name}</span>
                              {bs.subject.code && (
                                <span className="text-[10px] text-[#8D6E63] font-mono">{bs.subject.code}</span>
                              )}
                            </div>
                          </div>
                          {bs.staffProfile?.user?.fullName && (
                            <span className="text-[10px] text-[#6D4C41]">
                              Teacher: {bs.staffProfile.user.fullName}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F5F0EB]">
                  <button
                    type="button"
                    onClick={() => setAllocatingStudent(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-[#6D4C41] hover:bg-[#F7F2EF] transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={allocationLoading}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#4E342E] hover:bg-[#3E2723] shadow-md transition disabled:opacity-50"
                  >
                    {allocationLoading ? 'Saving...' : 'Save Subject Allocations'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Enroll Student Modal */}
        {showEnrollModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl max-w-md w-full border border-[#D7CCC8] shadow-2xl p-6 space-y-4 animate-scaleUp">
              <div className="flex items-center justify-between border-b border-[#F5F0EB] pb-3">
                <h3 className="text-base font-black text-[#2D1E18]">
                  Enroll Student into {selectedBatchDetails.name}
                </h3>
                <button
                  onClick={() => setShowEnrollModal(false)}
                  className="p-1.5 rounded-xl hover:bg-[#F7F2EF] text-[#6D4C41]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleEnrollStudent} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-[#4E342E] mb-1">Search Student</label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#8D6E63] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search by student name or admission number..."
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl pl-8 pr-3 py-2 text-xs focus:ring-2 focus:ring-[#8D6E63] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#4E342E] mb-1">Select Student *</label>
                  <select
                    required
                    value={selectedStudentToEnroll}
                    onChange={(e) => setSelectedStudentToEnroll(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#8D6E63] focus:outline-none"
                  >
                    <option value="">-- Choose Student --</option>
                    {availableStudentsForEnroll.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.firstName} {st.lastName} ({st.admissionNumber})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F5F0EB]">
                  <button
                    type="button"
                    onClick={() => setShowEnrollModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-[#6D4C41] hover:bg-[#F7F2EF] transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedStudentToEnroll}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#4E342E] hover:bg-[#3E2723] shadow-md transition disabled:opacity-50"
                  >
                    Enroll Student
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Assign Staff Modal */}
        {showAssignStaffModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl max-w-md w-full border border-[#D7CCC8] shadow-2xl p-6 space-y-4 animate-scaleUp">
              <div className="flex items-center justify-between border-b border-[#F5F0EB] pb-3">
                <h3 className="text-base font-black text-[#2D1E18]">
                  Assign Faculty to {selectedBatchDetails.name}
                </h3>
                <button
                  onClick={() => setShowAssignStaffModal(false)}
                  className="p-1.5 rounded-xl hover:bg-[#F7F2EF] text-[#6D4C41]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAssignStaff} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-[#4E342E] mb-1">Select Staff Member *</label>
                  <select
                    required
                    value={selectedStaffToAssign}
                    onChange={(e) => setSelectedStaffToAssign(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#8D6E63] focus:outline-none"
                  >
                    <option value="">-- Choose Faculty / Teacher --</option>
                    {availableStaff.map((st) => (
                      <option key={st.staffProfileId} value={st.staffProfileId}>
                        {st.fullName} ({st.designation || 'Staff'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F5F0EB]">
                  <button
                    type="button"
                    onClick={() => setShowAssignStaffModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-[#6D4C41] hover:bg-[#F7F2EF] transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedStaffToAssign}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#4E342E] hover:bg-[#3E2723] shadow-md transition disabled:opacity-50"
                  >
                    Assign Staff
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Confirmation Modal for Removing Subject */}
        <ConfirmationModal
          isOpen={confirmRemoveSubject.isOpen}
          title="Remove Subject from Batch"
          message={`Are you sure you want to remove '${confirmRemoveSubject.subjectName}' from this batch? Student allocations to this subject will be removed.`}
          confirmLabel="Remove Subject"
          variant="danger"
          onConfirm={handleRemoveSubject}
          onCancel={() => setConfirmRemoveSubject({ isOpen: false, subjectId: '', subjectName: '' })}
        />
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: BATCHES LIST VIEW (MAIN VIEW)
  // -------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EFEBE9]">
        <div>
          <h1 className="text-2xl font-black text-[#2D1E18] tracking-tight">Academic Batches & Curriculum</h1>
          <p className="text-xs text-[#6D4C41] mt-1">
            Batch-centric academic management: configure classes, add subjects directly inside batches, assign faculty, and allocate students.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh / Sync with Database Action */}
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#FAF8F5] hover:bg-[#EFEBE9] text-[#4E342E] border border-[#D7CCC8] px-3.5 py-2.5 rounded-xl transition shadow-sm disabled:opacity-60"
            title="Synchronize batch list directly from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#8D6E63]' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync DB'}</span>
          </button>

          {/* Create Batch Action */}
          <button
            onClick={() => {
              setEditingBatch(null);
              setBatchForm({
                name: '',
                code: '',
                academicYear: '2026-2027',
                startDate: new Date().toISOString().split('T')[0],
                endDate: '',
                description: '',
                schedule: '',
                isActive: true,
                staffProfileIds: [] as string[],
              });
              setShowBatchModal(true);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#4E342E] hover:bg-[#3E2723] text-white px-4 py-2.5 rounded-xl shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Batch</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-[#E8DFD8] shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#8D6E63] absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search batches by name, code (e.g. B-10A), or year..."
            value={batchSearch}
            onChange={(e) => setBatchSearch(e.target.value)}
            className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl pl-9 pr-3 py-2 text-xs text-[#2D1E18] focus:ring-2 focus:ring-[#8D6E63] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs font-semibold text-[#4E342E] focus:outline-none"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>

          {/* Academic Year Filter */}
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs font-semibold text-[#4E342E] focus:outline-none"
          >
            <option value="ALL">All Academic Years</option>
            {academicYears.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Batches Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-[#8D6E63]">
          <div className="w-5 h-5 rounded-full bg-[#4E342E] animate-ping mx-auto mb-3" />
          Loading batches and curriculum...
        </div>
      ) : filteredBatches.length === 0 ? (
        <div className="p-12 text-center bg-white border border-dashed border-[#D7CCC8] rounded-3xl space-y-3">
          <Layers className="w-12 h-12 text-[#A1887F] mx-auto mb-2" />
          <h3 className="text-base font-bold text-[#4E342E]">No Academic Batches Found</h3>
          <p className="text-xs text-[#8D6E63] max-w-sm mx-auto">
            Get started by creating your first batch, adding subjects directly inside it, and assigning students.
          </p>
          <button
            onClick={() => setShowBatchModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-bold transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> Create First Batch
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBatches.map((b) => {
            const subjectCount = b._count?.batchSubjects ?? (b.batchSubjects?.length || 0);
            const studentCount = b._count?.enrollments ?? (b.enrollments?.length || 0);
            const facultyCount = b._count?.staffAssignments ?? (b.staffAssignments?.length || 0);

            return (
              <div
                key={b.id}
                className="bg-white rounded-3xl border border-[#E8DFD8] hover:border-[#BCAAA4] p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-black text-[#2D1E18] tracking-tight group-hover:text-[#4E342E] transition">
                          {b.name}
                        </h3>
                        {b.code && (
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#FAF8F5] text-[#4E342E] border border-[#E0D5C9]">
                            {b.code}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[#8D6E63] font-medium block mt-0.5">
                        Year: <strong className="text-[#4E342E]">{b.academicYear}</strong>
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border shrink-0 ${
                        b.isActive
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-stone-100 text-stone-600 border-stone-200'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${b.isActive ? 'bg-emerald-500' : 'bg-stone-400'}`} />
                      {b.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Schedule if present */}
                  {b.schedule && (
                    <div className="flex items-center gap-1.5 text-xs text-[#6D4C41] bg-[#FAF8F5] p-2 rounded-xl border border-[#EFEBE9]">
                      <Clock className="w-3.5 h-3.5 text-[#8D6E63]" />
                      <span className="truncate">{b.schedule}</span>
                    </div>
                  )}

                  {/* Subjects Pills */}
                  {b.batchSubjects && b.batchSubjects.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-[#8D6E63] uppercase tracking-wider block">
                        Subjects in Batch:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {b.batchSubjects.slice(0, 4).map((bs: any) => (
                          <span
                            key={bs.id || bs.subjectId}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#F7F2EF] text-[#4E342E] border border-[#E8DFD8]"
                          >
                            {bs.subject?.name}
                          </span>
                        ))}
                        {b.batchSubjects.length > 4 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 text-[#8D6E63]">
                            +{b.batchSubjects.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Metrics Row */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-[#F5F0EB]">
                    <div className="p-2 rounded-xl bg-[#FAF8F5]">
                      <span className="text-[10px] text-[#8D6E63] block">Subjects</span>
                      <span className="font-bold text-[#2D1E18]">{subjectCount}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-[#FAF8F5]">
                      <span className="text-[10px] text-[#8D6E63] block">Students</span>
                      <span className="font-bold text-[#2D1E18]">{studentCount}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-[#FAF8F5]">
                      <span className="text-[10px] text-[#8D6E63] block">Faculty</span>
                      <span className="font-bold text-[#2D1E18]">{facultyCount}</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#F5F0EB]">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditBatch(b)}
                      className="p-1.5 text-[#6D4C41] hover:text-[#2D1E18] hover:bg-[#FAF8F5] rounded-xl transition"
                      title="Edit Batch"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirmDeactivate({ isOpen: true, batch: b })}
                      className="p-1.5 text-[#6D4C41] hover:text-[#2D1E18] hover:bg-[#FAF8F5] rounded-xl transition"
                      title={b.isActive ? 'Deactivate Batch' : 'Activate Batch'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteBatch({ isOpen: true, batch: b })}
                      className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-xl transition"
                      title="Delete Batch from Database"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => loadBatchDetails(b.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-bold transition shadow-sm"
                  >
                    <span>Open Batch</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ------------------ MODALS FOR BATCH LIST VIEW ------------------ */}

      {/* Create / Edit Batch Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto border border-[#D7CCC8] shadow-2xl p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#F5F0EB] pb-3">
              <h3 className="text-base font-black text-[#2D1E18]">
                {editingBatch ? 'Edit Academic Batch' : 'Create New Academic Batch'}
              </h3>
              <button
                onClick={() => {
                  setShowBatchModal(false);
                  setEditingBatch(null);
                }}
                className="p-1.5 rounded-xl hover:bg-[#F7F2EF] text-[#6D4C41]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBatch} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#4E342E] mb-1">Batch Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Class 10 - Batch A"
                    value={batchForm.name}
                    onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })}
                    className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#8D6E63] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#4E342E] mb-1">Batch Code (Unique)</label>
                  <input
                    type="text"
                    placeholder="e.g. B-10A"
                    value={batchForm.code}
                    onChange={(e) => setBatchForm({ ...batchForm, code: e.target.value })}
                    className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-[#8D6E63] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#4E342E] mb-1">Academic Year *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026-2027"
                  value={batchForm.academicYear}
                  onChange={(e) => setBatchForm({ ...batchForm, academicYear: e.target.value })}
                  className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#8D6E63] focus:outline-none"
                />
              </div>

              <SchedulePicker
                value={batchForm.schedule}
                onChange={(val) => setBatchForm({ ...batchForm, schedule: val })}
                label="Schedule & Timings"
                helperText="Select default days and class timings for this batch."
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#4E342E] mb-1">Start Date</label>
                  <input
                    type="date"
                    value={batchForm.startDate}
                    onChange={(e) => setBatchForm({ ...batchForm, startDate: e.target.value })}
                    className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#8D6E63] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#4E342E] mb-1">End Date (Optional)</label>
                  <input
                    type="date"
                    value={batchForm.endDate}
                    onChange={(e) => setBatchForm({ ...batchForm, endDate: e.target.value })}
                    className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#8D6E63] focus:outline-none"
                  />
                </div>
              </div>

              {!editingBatch && availableStaff.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-bold text-[#4E342E]">
                      Assign Faculty / Teachers <span className="font-normal text-[#8D6E63]">(Optional)</span>
                    </label>
                    <span className="text-[11px] text-[#8D6E63]">
                      {batchForm.staffProfileIds.length} teacher(s) selected
                    </span>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl">
                    {availableStaff.map((st) => {
                      const isChecked = batchForm.staffProfileIds.includes(st.staffProfileId);
                      return (
                        <label
                          key={st.staffProfileId}
                          className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition text-xs ${
                            isChecked
                              ? 'bg-white border border-[#4E342E] shadow-sm font-semibold text-[#2D1E18]'
                              : 'hover:bg-white text-[#6D4C41]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setBatchForm({
                                  ...batchForm,
                                  staffProfileIds: [...batchForm.staffProfileIds, st.staffProfileId],
                                });
                              } else {
                                setBatchForm({
                                  ...batchForm,
                                  staffProfileIds: batchForm.staffProfileIds.filter(
                                    (id) => id !== st.staffProfileId
                                  ),
                                });
                              }
                            }}
                            className="rounded border-[#D7CCC8] text-[#4E342E] focus:ring-[#8D6E63]"
                          />
                          <div className="flex-1 flex items-center justify-between">
                            <span>{st.fullName}</span>
                            <span className="text-[10px] text-[#8D6E63] font-normal">
                              {st.designation || 'Faculty'}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  <span className="text-[10px] text-[#8D6E63] mt-1 block">
                    Selected teachers will be authorized for this batch. You can also assign or remove faculty anytime in the batch details.
                  </span>
                </div>
              )}

              <div>
                <label className="block font-bold text-[#4E342E] mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Notes about curriculum, target examinations, or batch requirements"
                  value={batchForm.description}
                  onChange={(e) => setBatchForm({ ...batchForm, description: e.target.value })}
                  className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#8D6E63] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="batchStatusCheckbox"
                  checked={batchForm.isActive}
                  onChange={(e) => setBatchForm({ ...batchForm, isActive: e.target.checked })}
                  className="rounded text-[#4E342E] focus:ring-[#8D6E63]"
                />
                <label htmlFor="batchStatusCheckbox" className="font-semibold text-[#4E342E] text-xs">
                  Active Batch (students can attend and check in)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F5F0EB]">
                <button
                  type="button"
                  onClick={() => {
                    setShowBatchModal(false);
                    setEditingBatch(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#6D4C41] hover:bg-[#F7F2EF] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#4E342E] hover:bg-[#3E2723] shadow-md transition"
                >
                  {editingBatch ? 'Save Changes' : 'Create Batch & Open'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Batch Status Toggle */}
      <ConfirmationModal
        isOpen={confirmDeactivate.isOpen}
        title={confirmDeactivate.batch?.isActive ? 'Deactivate Batch' : 'Activate Batch'}
        message={`Are you sure you want to ${
          confirmDeactivate.batch?.isActive ? 'deactivate' : 'activate'
        } batch '${confirmDeactivate.batch?.name}'?`}
        confirmLabel={confirmDeactivate.batch?.isActive ? 'Deactivate' : 'Activate'}
        variant={confirmDeactivate.batch?.isActive ? 'danger' : 'primary'}
        onConfirm={() => confirmDeactivate.batch && handleToggleBatchStatus(confirmDeactivate.batch)}
        onCancel={() => setConfirmDeactivate({ isOpen: false, batch: null })}
      />

      {/* Confirmation Modal for Permanent Batch Deletion from Database */}
      <ConfirmationModal
        isOpen={confirmDeleteBatch.isOpen}
        title="Delete Batch Permanently"
        message={`Are you sure you want to permanently delete batch '${confirmDeleteBatch.batch?.name}' from the database? This will remove the batch and its curriculum associations. This action cannot be undone.`}
        confirmLabel={deleteBatchLoading ? 'Deleting...' : 'Delete Permanently'}
        variant="danger"
        loading={deleteBatchLoading}
        onConfirm={handleDeleteBatch}
        onCancel={() => setConfirmDeleteBatch({ isOpen: false, batch: null })}
      />
    </div>
  );
};
export default AcademicsManagement;
