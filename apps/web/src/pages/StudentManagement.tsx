import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import { Student, Batch, StudentStatus } from '../types';
import { useToast } from '../context/ToastContext';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { StudentDetailsModal } from '../components/StudentDetailsModal';
import {
  GraduationCap,
  Plus,
  Search,
  CheckCircle,
  UserCheck,
  X,
  Phone,
  Mail,
  Eye,
  EyeOff,
  User,
  Shield,
  Key,
} from 'lucide-react';

export const StudentManagement: React.FC = () => {
  const { showToast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [batchFilter, setBatchFilter] = useState<string>('');
  const [showAdmitModal, setShowAdmitModal] = useState(false);
  const [admitLoading, setAdmitLoading] = useState(false);
  const [admitError, setAdmitError] = useState<string | null>(null);
  const [showParentPassword, setShowParentPassword] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  
  // Status Confirmation Modal State
  const [statusConfirm, setStatusConfirm] = useState<{
    isOpen: boolean;
    student: Student | null;
    newStatus: StudentStatus | null;
    loading: boolean;
  }>({
    isOpen: false,
    student: null,
    newStatus: null,
    loading: false,
  });

  const [prefixInfo, setPrefixInfo] = useState<{
    prefix: string;
    currentYear: number;
    previewFormat: string;
  } | null>(null);

  const [admittedSuccess, setAdmittedSuccess] = useState<{
    admissionNumber: string;
    name: string;
    parentCredentials?: {
      fullName: string;
      identifier: string;
      temporaryPassword?: string;
    };
  } | null>(null);

  // Form State
  const initialFormData = {
    firstName: '',
    lastName: '',
    studentPhone: '',
    dob: '',
    gender: 'MALE' as 'MALE' | 'FEMALE' | 'OTHER',
    bloodGroup: '',
    batchId: '',
    notes: '',
    // Parent/Guardian fields
    parentFullName: '',
    parentRelationship: 'FATHER' as 'FATHER' | 'MOTHER' | 'GUARDIAN',
    parentPhone: '',
    parentEmail: '',
    parentInitialPassword: '',
    parentCanReceiveSms: true,
  };

  const [formData, setFormData] = useState(initialFormData);

  const fetchData = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        search,
        ...(statusFilter && statusFilter !== 'ALL' ? { status: statusFilter } : {}),
        ...(batchFilter ? { batchId: batchFilter } : {}),
      });

      const [studentsRes, batchesRes] = await Promise.all([
        apiFetch(`/students?${query.toString()}`),
        apiFetch('/academics/batches'),
      ]);

      setStudents(studentsRes.data?.students || []);
      setBatches(batchesRes.data?.batches || []);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to fetch student data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, statusFilter, batchFilter]);

  useEffect(() => {
    if (showAdmitModal) {
      apiFetch('/students/admission-prefix')
        .then((res) => {
          if (res.success && res.data) {
            setPrefixInfo(res.data);
          }
        })
        .catch(() => {});
    }
  }, [showAdmitModal]);

  const handleAdmitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdmitError(null);

    // Validation
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setAdmitError('First name and last name are required.');
      return;
    }
    if (!formData.parentFullName.trim()) {
      setAdmitError('Parent/Guardian full name is required.');
      return;
    }
    if (!formData.parentPhone.trim()) {
      setAdmitError('Parent/Guardian phone number is required.');
      return;
    }

    setAdmitLoading(true);

    try {
      const res = await apiFetch('/students', {
        method: 'POST',
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          studentPhone: formData.studentPhone.trim() || undefined,
          dob: formData.dob || undefined,
          gender: formData.gender,
          bloodGroup: formData.bloodGroup.trim() || undefined,
          batchId: formData.batchId || undefined,
          notes: formData.notes.trim() || undefined,
          // Parent details
          parentFullName: formData.parentFullName.trim(),
          parentRelationship: formData.parentRelationship,
          parentPhone: formData.parentPhone.trim(),
          parentEmail: formData.parentEmail.trim() || undefined,
          parentInitialPassword: formData.parentInitialPassword.trim() || undefined,
          parentCanReceiveSms: formData.parentCanReceiveSms,
        }),
      });

      if (res.success) {
        setShowAdmitModal(false);
        const newStudent = res.data?.student;
        const generatedNum = res.data?.admissionNumber || newStudent?.admissionNumber || 'Assigned';
        const parentInfo = res.data?.parentAccount;

        setAdmittedSuccess({
          admissionNumber: generatedNum,
          name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
          parentCredentials: parentInfo ? {
            fullName: formData.parentFullName.trim(),
            identifier: parentInfo.phone || parentInfo.email,
            temporaryPassword: parentInfo.temporaryPassword,
          } : undefined,
        });

        showToast(`Student admitted successfully with admission number ${generatedNum}.`, 'success');

        setFormData(initialFormData);
        fetchData();
      }
    } catch (err: any) {
      setAdmitError(err.message || 'Failed to admit student');
      showToast(err.message || 'Could not complete student admission.', 'error');
    } finally {
      setAdmitLoading(false);
    }
  };

  const openStatusConfirm = (student: Student, newStatus: StudentStatus) => {
    setStatusConfirm({
      isOpen: true,
      student,
      newStatus,
      loading: false,
    });
  };

  const handleConfirmStatusChange = async () => {
    if (!statusConfirm.student || !statusConfirm.newStatus) return;

    setStatusConfirm((prev) => ({ ...prev, loading: true }));
    try {
      await apiFetch(`/students/${statusConfirm.student.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: statusConfirm.newStatus,
          reason: `Status changed to ${statusConfirm.newStatus} by staff`,
        }),
      });

      showToast(
        `${statusConfirm.student.firstName} ${statusConfirm.student.lastName} is now marked as ${statusConfirm.newStatus.replace('_', ' ')}.`,
        'success'
      );

      setStatusConfirm({ isOpen: false, student: null, newStatus: null, loading: false });
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Error updating student academic status.', 'error');
      setStatusConfirm((prev) => ({ ...prev, loading: false }));
    }
  };

  const getStatusBadge = (status: StudentStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Active</span>;
      case 'PASSED_OUT':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">Passed Out</span>;
      case 'DISCONTINUED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-500/20 text-slate-300 border border-slate-500/30">Discontinued</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2D1E18]">Student Admissions & Management</h1>
          <p className="text-sm text-[#6D4C41] mt-1">Enrollment, student lifecycle, and academic batch tracking</p>
        </div>
        <button
          onClick={() => setShowAdmitModal(true)}
          className="inline-flex items-center gap-2 bg-[#4E342E] hover:bg-[#3E2723] text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-md shadow-[#3E2723]/25 transition-all self-start"
        >
          <Plus className="w-4 h-4" /> Admit New Student
        </button>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white border border-[#D7CCC8] rounded-2xl p-6 shadow-sm space-y-4">
        {/* Status Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-[#EFEBE9] pb-4">
          {[
            { id: 'ACTIVE', label: 'Active Students' },
            { id: 'ALL', label: 'All Records' },
            { id: 'PASSED_OUT', label: 'Passed Out' },
            { id: 'DISCONTINUED', label: 'Discontinued' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                statusFilter === tab.id
                  ? 'bg-[#6D4C41] text-white shadow-md font-bold'
                  : 'text-[#6D4C41] hover:text-[#2D1E18] hover:bg-[#F7F2EF]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Batch dropdown */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full sm:w-80 relative">
            <Search className="w-4 h-4 text-[#8D6E63] absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, roll no, admission no..."
              className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl pl-10 pr-4 py-2 text-xs text-[#2D1E18] placeholder-[#A1887F] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-[#6D4C41] font-semibold">Batch:</span>
            <select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
            >
              <option value="">All Batches</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>{b.name} ({b.academicYear})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Students Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#D7CCC8] text-[#6D4C41] bg-[#F7F2EF] uppercase tracking-wider">
                <th className="py-3 px-4 font-bold">Student Name</th>
                <th className="py-3 px-4 font-bold">Admission No</th>
                <th className="py-3 px-4 font-bold">Roll No</th>
                <th className="py-3 px-4 font-bold">Batch</th>
                <th className="py-3 px-4 font-bold">Linked Guardians</th>
                <th className="py-3 px-4 font-bold">Status</th>
                <th className="py-3 px-4 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFEBE9]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#6D4C41]">Loading student directory...</td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#6D4C41]">No student records match the filters.</td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr
                    key={student.id}
                    className="hover:bg-[#FDFBF7] transition-colors cursor-pointer group"
                  >
                    <td
                      className="py-3.5 px-4 font-bold text-[#2D1E18] text-sm group-hover:text-[#4E342E]"
                      onClick={() => setSelectedStudentId(student.id)}
                    >
                      <div className="flex items-center gap-2">
                        <span>{student.firstName} {student.lastName}</span>
                        <span className="text-[10px] bg-[#EFEBE9] text-[#6D4C41] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition">View Details</span>
                      </div>
                    </td>
                    <td
                      className="py-3.5 px-4 font-mono font-semibold text-[#4E342E]"
                      onClick={() => setSelectedStudentId(student.id)}
                    >
                      <span className="bg-[#F7F2EF] border border-[#D7CCC8] px-2 py-0.5 rounded text-xs">
                        {student.admissionNumber}
                      </span>
                    </td>
                    <td
                      className="py-3.5 px-4 font-mono text-[#5D4037]"
                      onClick={() => setSelectedStudentId(student.id)}
                    >
                      {student.rollNumber || '—'}
                    </td>
                    <td
                      className="py-3.5 px-4 text-[#5D4037]"
                      onClick={() => setSelectedStudentId(student.id)}
                    >
                      {student.enrollments?.[0]?.batch?.name || (
                        <span className="text-[#A1887F] italic">Unassigned</span>
                      )}
                    </td>
                    <td
                      className="py-3.5 px-4 text-[#5D4037]"
                      onClick={() => setSelectedStudentId(student.id)}
                    >
                      {student.parentRelations && student.parentRelations.length > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#F7F2EF] text-[#4E342E] text-[11px] border border-[#D7CCC8]">
                          <UserCheck className="w-3 h-3 text-sky-700" />
                          {student.parentRelations[0].parent.user.fullName} ({student.parentRelations[0].relation})
                        </span>
                      ) : (
                        <span className="text-amber-800 text-[11px] italic bg-amber-50 px-2 py-0.5 rounded border border-amber-200">No guardian linked</span>
                      )}
                    </td>
                    <td
                      className="py-3.5 px-4"
                      onClick={() => setSelectedStudentId(student.id)}
                    >
                      {getStatusBadge(student.status)}
                    </td>
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      {student.status === 'ACTIVE' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openStatusConfirm(student, 'PASSED_OUT')}
                            className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-purple-300 text-purple-800 hover:bg-purple-50 transition"
                          >
                            Mark Passed
                          </button>
                          <button
                            type="button"
                            onClick={() => openStatusConfirm(student, 'DISCONTINUED')}
                            className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-[#D7CCC8] text-[#6D4C41] hover:bg-[#F7F2EF] transition"
                          >
                            Discontinue
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openStatusConfirm(student, 'ACTIVE')}
                          className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-emerald-300 text-emerald-800 hover:bg-emerald-50 transition"
                        >
                          Reactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admit Student Modal */}
      {showAdmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl w-full max-w-xl p-6 max-h-[92vh] overflow-y-auto shadow-2xl text-[#2D1E18]">
            <div className="flex items-center justify-between pb-4 border-b border-[#EFEBE9]">
              <div>
                <h2 className="text-lg font-bold text-[#2D1E18] flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-[#4E342E]" /> New Student Admission
                </h2>
                <p className="text-xs text-[#6D4C41]">Admit student and create/link guardian credentials atomically</p>
              </div>
              <button onClick={() => setShowAdmitModal(false)} className="text-[#8D6E63] hover:text-[#2D1E18] p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {admitError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs">
                {admitError}
              </div>
            )}

            <form onSubmit={handleAdmitSubmit} className="space-y-4 mt-4">
              {/* Student Details Section */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-[#4E342E] flex items-center gap-1.5 border-b border-[#EFEBE9] pb-1">
                  <User className="w-3.5 h-3.5 text-[#8D6E63]" /> Student Profile
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#4E342E] mb-1">
                      Admission Number
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        readOnly
                        disabled
                        value={prefixInfo ? `${prefixInfo.prefix}-${prefixInfo.currentYear}-###` : 'Auto-generated on save'}
                        className="w-full bg-[#EFEBE9]/60 border border-[#D7CCC8] text-[#8D6E63] font-mono font-semibold text-xs rounded-xl px-3 py-2 cursor-not-allowed select-none"
                      />
                      <span className="absolute right-2.5 top-2 text-[10px] bg-[#D7CCC8]/60 text-[#4E342E] font-bold px-1.5 py-0.5 rounded">
                        AUTO
                      </span>
                    </div>
                    <p className="text-[10px] text-[#8D6E63] mt-0.5 italic">
                      Sequential number auto-assigned by institute format
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#4E342E] mb-1">
                      Student Phone Number (Optional)
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-[#8D6E63] absolute left-3 top-3" />
                      <input
                        type="tel"
                        value={formData.studentPhone}
                        onChange={(e) => setFormData({ ...formData, studentPhone: e.target.value })}
                        placeholder="e.g. +91 9876543210"
                        className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl pl-8 pr-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#4E342E] mb-1">First Name*</label>
                    <input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="e.g. Aarav"
                      className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#4E342E] mb-1">Last Name*</label>
                    <input
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="e.g. Sharma"
                      className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#4E342E] mb-1">Gender</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                      className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#4E342E] mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.dob}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                      className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#4E342E] mb-1">Blood Group</label>
                    <input
                      type="text"
                      value={formData.bloodGroup}
                      onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value.toUpperCase() })}
                      placeholder="e.g. O+"
                      className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] uppercase focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#4E342E] mb-1">Batch Enrollment</label>
                    <select
                      value={formData.batchId}
                      onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
                      className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                    >
                      <option value="">Select Class Batch</option>
                      {batches.map((b) => (
                        <option key={b.id} value={b.id}>{b.name} ({b.academicYear})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#4E342E] mb-1">Notes / Medical Info</label>
                    <input
                      type="text"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Optional remarks"
                      className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                    />
                  </div>
                </div>
              </div>

              {/* Parent / Guardian Credentials Section */}
              <div className="pt-2 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-[#4E342E] flex items-center justify-between border-b border-[#EFEBE9] pb-1">
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-[#8D6E63]" />
                    <span>Parent / Guardian Account</span>
                  </div>
                  <span className="text-[10px] text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Creates or links login account
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#4E342E] mb-1">
                      Parent / Guardian Full Name*
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.parentFullName}
                      onChange={(e) => setFormData({ ...formData, parentFullName: e.target.value })}
                      placeholder="e.g. Ramesh Sharma"
                      className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#4E342E] mb-1">
                      Relationship to Student*
                    </label>
                    <select
                      value={formData.parentRelationship}
                      onChange={(e) => setFormData({ ...formData, parentRelationship: e.target.value as any })}
                      className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                    >
                      <option value="FATHER">Father</option>
                      <option value="MOTHER">Mother</option>
                      <option value="GUARDIAN">Legal Guardian</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#4E342E] mb-1">
                      Parent Phone Number* (Login Identifier)
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-[#8D6E63] absolute left-3 top-3" />
                      <input
                        type="tel"
                        required
                        value={formData.parentPhone}
                        onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                        placeholder="e.g. 9876543210"
                        className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl pl-8 pr-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                      />
                    </div>
                    <p className="text-[10px] text-[#8D6E63] mt-0.5 italic">
                      If parent already exists for a sibling, they are linked automatically.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#4E342E] mb-1">
                      Parent Email (Optional)
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-[#8D6E63] absolute left-3 top-3" />
                      <input
                        type="email"
                        value={formData.parentEmail}
                        onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                        placeholder="e.g. parent@example.com"
                        className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl pl-8 pr-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#4E342E] mb-1">
                      Initial Parent Password
                    </label>
                    <div className="relative">
                      <Key className="w-3.5 h-3.5 text-[#8D6E63] absolute left-3 top-3" />
                      <input
                        type={showParentPassword ? 'text' : 'password'}
                        value={formData.parentInitialPassword}
                        onChange={(e) => setFormData({ ...formData, parentInitialPassword: e.target.value })}
                        placeholder="Leave blank to auto-generate"
                        className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl pl-8 pr-9 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowParentPassword(!showParentPassword)}
                        className="absolute right-2.5 top-2.5 text-[#8D6E63] hover:text-[#4E342E]"
                      >
                        {showParentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-[#8D6E63] mt-0.5">
                      Must be changed on parent's initial login
                    </p>
                  </div>
                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.parentCanReceiveSms}
                        onChange={(e) => setFormData({ ...formData, parentCanReceiveSms: e.target.checked })}
                        className="rounded border-[#D7CCC8] text-[#4E342E] focus:ring-[#8D6E63]"
                      />
                      <span className="text-xs text-[#4E342E] font-medium">
                        Consent to SMS / WhatsApp alerts
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-[#EFEBE9]">
                <button
                  type="button"
                  onClick={() => setShowAdmitModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#6D4C41] hover:text-[#2D1E18]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={admitLoading}
                  className="bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-md shadow-[#3E2723]/30 transition disabled:opacity-50"
                >
                  {admitLoading ? 'Admitting & Enrolling...' : 'Complete Admission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admission Success Confirmation Modal */}
      {admittedSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl w-full max-w-md p-6 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto text-2xl shadow-inner">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#2D1E18]">Student Admitted Successfully!</h3>
              <p className="text-xs text-[#8D6E63] mt-1">{admittedSuccess.name}</p>
            </div>
            <div className="bg-[#FDFBF7] border-2 border-dashed border-[#8D6E63]/40 rounded-2xl p-4">
              <span className="text-[11px] font-semibold tracking-wider text-[#8D6E63] uppercase block mb-1">
                Generated Admission Number
              </span>
              <span className="text-2xl font-mono font-black text-[#4E342E] tracking-wider select-all">
                {admittedSuccess.admissionNumber}
              </span>
              <p className="text-[11px] text-emerald-700 font-medium mt-1">
                Permanently assigned and recorded for this student
              </p>
            </div>

            {/* Parent Account Details if Created */}
            {admittedSuccess.parentCredentials && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 uppercase tracking-wider">
                  <Shield className="w-4 h-4 text-amber-700" /> Parent Portal Credentials
                </div>
                <div className="text-xs space-y-1">
                  <div>
                    <span className="text-[#6D4C41] font-semibold">Guardian:</span>{' '}
                    <span className="text-[#2D1E18] font-bold">{admittedSuccess.parentCredentials.fullName}</span>
                  </div>
                  <div>
                    <span className="text-[#6D4C41] font-semibold">Login ID (Phone):</span>{' '}
                    <span className="font-mono font-bold text-[#2D1E18]">{admittedSuccess.parentCredentials.identifier}</span>
                  </div>
                  {admittedSuccess.parentCredentials.temporaryPassword ? (
                    <div>
                      <span className="text-[#6D4C41] font-semibold">Initial Password:</span>{' '}
                      <span className="font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded select-all">
                        {admittedSuccess.parentCredentials.temporaryPassword}
                      </span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-[#6D4C41] italic">
                      Linked to existing parent account or custom password assigned.
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-amber-800 font-medium pt-1 border-t border-amber-200">
                  Password must be changed upon initial login. Never store or share passwords insecurely.
                </p>
              </div>
            )}

            <button
              onClick={() => setAdmittedSuccess(null)}
              className="w-full bg-[#4E342E] hover:bg-[#3E2723] text-[#FDFBF7] text-xs font-bold py-2.5 rounded-xl transition shadow-md"
            >
              Done & Close
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Lifecycle Status Change */}
      <ConfirmationModal
        isOpen={statusConfirm.isOpen}
        title={
          statusConfirm.newStatus === 'PASSED_OUT'
            ? 'Mark Student as Passed Out'
            : statusConfirm.newStatus === 'DISCONTINUED'
            ? 'Discontinue Student'
            : 'Reactivate Student'
        }
        message={
          statusConfirm.newStatus === 'PASSED_OUT'
            ? `Are you sure you want to mark ${statusConfirm.student?.firstName} ${statusConfirm.student?.lastName} as Passed Out? Active batch enrollments will be archived and the student will complete their tenure.`
            : statusConfirm.newStatus === 'DISCONTINUED'
            ? `Are you sure you want to discontinue ${statusConfirm.student?.firstName} ${statusConfirm.student?.lastName}? Active enrollments will be suspended.`
            : `Are you sure you want to reactivate ${statusConfirm.student?.firstName} ${statusConfirm.student?.lastName}?`
        }
        confirmLabel={
          statusConfirm.newStatus === 'PASSED_OUT'
            ? 'Confirm Passed Out'
            : statusConfirm.newStatus === 'DISCONTINUED'
            ? 'Confirm Discontinue'
            : 'Reactivate'
        }
        variant={statusConfirm.newStatus === 'DISCONTINUED' ? 'danger' : statusConfirm.newStatus === 'PASSED_OUT' ? 'warning' : 'primary'}
        loading={statusConfirm.loading}
        onConfirm={handleConfirmStatusChange}
        onCancel={() => setStatusConfirm({ isOpen: false, student: null, newStatus: null, loading: false })}
      />

      {/* Comprehensive Student Details Modal */}
      {selectedStudentId && (
        <StudentDetailsModal
          studentId={selectedStudentId}
          onClose={() => setSelectedStudentId(null)}
          onStudentUpdated={fetchData}
        />
      )}
    </div>
  );
};

