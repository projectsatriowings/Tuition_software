import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import { Student, Batch, StudentStatus } from '../types';
import {
  GraduationCap,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Clock,
  Archive,
  UserCheck,
  X,
  Phone,
  Mail,
} from 'lucide-react';

export const StudentManagement: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [batchFilter, setBatchFilter] = useState<string>('');
  const [showAdmitModal, setShowAdmitModal] = useState(false);
  const [admitLoading, setAdmitLoading] = useState(false);
  const [admitError, setAdmitError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    admissionNumber: '',
    rollNumber: '',
    firstName: '',
    lastName: '',
    dob: '',
    gender: 'MALE' as 'MALE' | 'FEMALE' | 'OTHER',
    bloodGroup: '',
    batchId: '',
    notes: '',
  });

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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, statusFilter, batchFilter]);

  const handleAdmitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdmitError(null);
    setAdmitLoading(true);

    try {
      const res = await apiFetch('/students', {
        method: 'POST',
        body: JSON.stringify({
          admissionNumber: formData.admissionNumber.trim().toUpperCase(),
          rollNumber: formData.rollNumber.trim() || undefined,
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          dob: formData.dob || undefined,
          gender: formData.gender,
          bloodGroup: formData.bloodGroup.trim() || undefined,
          batchId: formData.batchId || undefined,
          notes: formData.notes.trim() || undefined,
        }),
      });

      if (res.success) {
        setShowAdmitModal(false);
        setFormData({
          admissionNumber: '',
          rollNumber: '',
          firstName: '',
          lastName: '',
          dob: '',
          gender: 'MALE',
          bloodGroup: '',
          batchId: '',
          notes: '',
        });
        fetchData();
      }
    } catch (err: any) {
      setAdmitError(err.message || 'Failed to admit student');
    } finally {
      setAdmitLoading(false);
    }
  };

  const handleStatusChange = async (student: Student, newStatus: StudentStatus) => {
    const confirmMsg = `Change academic status for "${student.firstName} ${student.lastName}" to ${newStatus}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await apiFetch(`/students/${student.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus, reason: 'Administrative update' }),
      });
      fetchData();
    } catch (err: any) {
      alert(`Error updating student status: ${err.message}`);
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
                  <tr key={student.id} className="hover:bg-[#FDFBF7] transition-colors">
                    <td className="py-3.5 px-4 font-bold text-[#2D1E18] text-sm">
                      {student.firstName} {student.lastName}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#4E342E]">
                      <span className="bg-[#F7F2EF] border border-[#D7CCC8] px-2 py-0.5 rounded text-xs">
                        {student.admissionNumber}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#5D4037]">
                      {student.rollNumber || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-[#5D4037]">
                      {student.enrollments?.[0]?.batch?.name || (
                        <span className="text-[#A1887F] italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-[#5D4037]">
                      {student.parentRelations && student.parentRelations.length > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#F7F2EF] text-[#4E342E] text-[11px] border border-[#D7CCC8]">
                          <UserCheck className="w-3 h-3 text-sky-700" />
                          {student.parentRelations[0].parent.user.fullName} ({student.parentRelations[0].relation})
                        </span>
                      ) : (
                        <span className="text-amber-800 text-[11px] italic bg-amber-50 px-2 py-0.5 rounded border border-amber-200">No guardian linked</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(student.status)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {student.status === 'ACTIVE' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleStatusChange(student, 'PASSED_OUT')}
                            className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-purple-300 text-purple-800 hover:bg-purple-50 transition"
                          >
                            Mark Passed
                          </button>
                          <button
                            onClick={() => handleStatusChange(student, 'DISCONTINUED')}
                            className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-[#D7CCC8] text-[#6D4C41] hover:bg-[#F7F2EF] transition"
                          >
                            Discontinue
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStatusChange(student, 'ACTIVE')}
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
          <div className="bg-white border border-[#D7CCC8] rounded-3xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto shadow-2xl text-[#2D1E18]">
            <div className="flex items-center justify-between pb-4 border-b border-[#EFEBE9]">
              <h2 className="text-lg font-bold text-[#2D1E18] flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-[#4E342E]" /> Admit New Student
              </h2>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#4E342E] mb-1">Admission Number (Unique)*</label>
                  <input
                    type="text"
                    required
                    value={formData.admissionNumber}
                    onChange={(e) => setFormData({ ...formData, admissionNumber: e.target.value.toUpperCase() })}
                    placeholder="e.g. ADM-2026-001"
                    className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] uppercase focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#4E342E] mb-1">Class Roll Number</label>
                  <input
                    type="text"
                    value={formData.rollNumber}
                    onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                    placeholder="e.g. 101"
                    className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                  />
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
                <label className="block text-xs font-semibold text-[#4E342E] mb-1">Notes / Medical Information</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional notes or remarks"
                  className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
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
                  {admitLoading ? 'Admitting...' : 'Complete Admission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
