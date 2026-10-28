import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import { StaffMember, Batch } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Plus,
  Search,
  CheckCircle,
  AlertTriangle,
  X,
  Phone,
  Mail,
  Key,
  Eye,
  EyeOff,
  Copy,
  Check,
  Sparkles,
  Lock,
  RefreshCw,
  Building2,
  BookOpen,
  GraduationCap,
  CheckSquare,
  Square,
} from 'lucide-react';

export const StaffManagement: React.FC = () => {
  const { activeInstitute } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Created credential state
  const [createdCredential, setCreatedCredential] = useState<{
    fullName: string;
    email: string;
    permanentPassword: string;
    employeeCode?: string;
    instituteCode?: string;
  } | null>(null);
  const [showCreatedPassword, setShowCreatedPassword] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    employeeCode: '',
    designation: '',
    qualification: '',
    password: '',
    selectedBatchIds: [] as string[],
  });
  const [showFormPassword, setShowFormPassword] = useState(true);

  // Clipboard toast
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // View / Reset Credentials Modal State
  const [viewingStaffCreds, setViewingStaffCreds] = useState<StaffMember | null>(null);
  const [showExistingPassword, setShowExistingPassword] = useState(false);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [showResetInputPassword, setShowResetInputPassword] = useState(true);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  // Batch & Subject Assignment Modal State
  const [viewingStaffAssignments, setViewingStaffAssignments] = useState<StaffMember | null>(null);
  const [assignmentBatchIds, setAssignmentBatchIds] = useState<string[]>([]);
  const [assignmentSubjectMap, setAssignmentSubjectMap] = useState<Record<string, string[]>>({});
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [assignmentSuccess, setAssignmentSuccess] = useState<string | null>(null);

  const handleOpenAssignmentModal = (item: StaffMember) => {
    setViewingStaffAssignments(item);
    setAssignmentError(null);
    setAssignmentSuccess(null);

    const assignedBatchIds = item.assignments?.map((a) => a.batch.id) || [];
    setAssignmentBatchIds(assignedBatchIds);

    const subMap: Record<string, string[]> = {};
    if (item.batchSubjects && item.batchSubjects.length > 0) {
      for (const bs of item.batchSubjects) {
        if (!subMap[bs.batchId]) {
          subMap[bs.batchId] = [];
        }
        if (!subMap[bs.batchId].includes(bs.subjectId)) {
          subMap[bs.batchId].push(bs.subjectId);
        }
      }
    }
    setAssignmentSubjectMap(subMap);
  };

  const handleToggleBatch = (batchId: string) => {
    const isSelected = assignmentBatchIds.includes(batchId);
    if (isSelected) {
      setAssignmentBatchIds((prev) => prev.filter((id) => id !== batchId));
      setAssignmentSubjectMap((prev) => {
        const next = { ...prev };
        delete next[batchId];
        return next;
      });
    } else {
      setAssignmentBatchIds((prev) => [...prev, batchId]);
      const batch = batches.find((b) => b.id === batchId);
      const subjectIds = batch?.batchSubjects?.map((bs) => bs.subjectId) || [];
      if (subjectIds.length > 0) {
        setAssignmentSubjectMap((prev) => ({
          ...prev,
          [batchId]: subjectIds,
        }));
      }
    }
  };

  const handleToggleSubject = (batchId: string, subjectId: string) => {
    setAssignmentSubjectMap((prev) => {
      const current = prev[batchId] || [];
      const updated = current.includes(subjectId)
        ? current.filter((id) => id !== subjectId)
        : [...current, subjectId];
      return {
        ...prev,
        [batchId]: updated,
      };
    });
  };

  const handleSelectAllSubjectsForBatch = (batchId: string) => {
    const batch = batches.find((b) => b.id === batchId);
    const subjectIds = batch?.batchSubjects?.map((bs) => bs.subjectId) || [];
    setAssignmentSubjectMap((prev) => ({
      ...prev,
      [batchId]: subjectIds,
    }));
  };

  const handleClearSubjectsForBatch = (batchId: string) => {
    setAssignmentSubjectMap((prev) => ({
      ...prev,
      [batchId]: [],
    }));
  };

  const handleSaveAssignments = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingStaffAssignments) return;

    setAssignmentLoading(true);
    setAssignmentError(null);
    setAssignmentSuccess(null);

    try {
      const assignments = assignmentBatchIds.map((batchId) => ({
        batchId,
        subjectIds: assignmentSubjectMap[batchId] || [],
      }));

      const res = await apiFetch(`/staff/${viewingStaffAssignments.id}/assignments`, {
        method: 'POST',
        body: JSON.stringify({
          batchIds: assignmentBatchIds,
          assignments,
        }),
      });

      if (res.success) {
        setAssignmentSuccess('Batch and subject assignments saved successfully!');
        await fetchData();
        setTimeout(() => {
          setViewingStaffAssignments(null);
        }, 1200);
      }
    } catch (err: any) {
      setAssignmentError(err.message || 'Failed to update assignments');
    } finally {
      setAssignmentLoading(false);
    }
  };

  const generateStrongPassword = () => {
    const chars = 'abcdefghijkmnpqrstuvwxyz';
    const nums = '23456789';
    const rand = (str: string, len: number) =>
      Array.from({ length: len }, () => str[Math.floor(Math.random() * str.length)]).join('');
    return `Pass#${rand(chars, 3)}${rand(nums, 4)}`;
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const copyFormattedCredentials = (
    fullName: string,
    email: string,
    pass: string,
    instCode?: string,
    empCode?: string,
    key = 'all'
  ) => {
    const code = instCode || activeInstitute?.code || 'INST';
    const empLine = empCode ? `Employee Code: ${empCode}\n` : '';
    const text = `TuitionOS Staff Login & Password
--------------------------------------
Staff Member: ${fullName}
${empLine}Role: Staff / Faculty
Institute Code: ${code}
Login Email: ${email}
Permanent Password: ${pass}
Login Portal: ${window.location.origin}
--------------------------------------
Please keep this login and password safe. This is your permanent account password.`;

    copyToClipboard(text, key);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [staffRes, batchesRes] = await Promise.allSettled([
        apiFetch(`/staff?search=${encodeURIComponent(search)}`),
        apiFetch('/academics/batches'),
      ]);
      if (staffRes.status === 'fulfilled') {
        setStaff(staffRes.value.data?.staff || []);
      }
      if (batchesRes.status === 'fulfilled') {
        setBatches(batchesRes.value.data?.batches || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search]);

  const fetchNextEmployeeCode = async (): Promise<string> => {
    try {
      const res = await apiFetch('/staff/next-code');
      if (res.data?.employeeCode) {
        return res.data.employeeCode;
      }
    } catch (err) {
      console.error('Failed to fetch next employee code:', err);
    }
    const prefix = activeInstitute?.code ? activeInstitute.code.replace(/[^A-Z0-9]/g, '').slice(0, 6) : 'INST';
    return `${prefix}-EMP-001`;
  };

  const handleOpenAddModal = async () => {
    setCreatedCredential(null);
    setAddError(null);
    
    // Auto-generate employee code with academy name
    const autoCode = await fetchNextEmployeeCode();

    setFormData({
      fullName: '',
      email: '',
      phone: '',
      employeeCode: autoCode,
      designation: '',
      qualification: '',
      password: '',
      selectedBatchIds: [],
    });
    setShowFormPassword(true);
    setShowCreatedPassword(true);
    setShowAddModal(true);
  };

  const handleRegenerateEmployeeCode = async () => {
    const code = await fetchNextEmployeeCode();
    setFormData((prev) => ({ ...prev, employeeCode: code }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setAddLoading(true);

    try {
      const res = await apiFetch('/staff', {
        method: 'POST',
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone || undefined,
          employeeCode: formData.employeeCode || undefined,
          designation: formData.designation,
          qualification: formData.qualification || undefined,
          password: formData.password,
          batchIds: formData.selectedBatchIds,
        }),
      });

      if (res.success) {
        setCreatedCredential({
          fullName: res.data.user.fullName,
          email: res.data.user.email,
          employeeCode: res.data.employeeCode || formData.employeeCode,
          permanentPassword: res.data.permanentPassword || formData.password,
          instituteCode: res.data.institute?.code || activeInstitute?.code,
        });
        fetchData();
      }
    } catch (err: any) {
      setAddError(err.message || 'Failed to create staff account');
    } finally {
      setAddLoading(false);
    }
  };

  const handleToggleStatus = async (item: StaffMember) => {
    const nextStatus = !item.user.isActive;
    const confirmMsg = item.user.isActive
      ? `Deactivate account for "${item.user.fullName}"? They will lose access.`
      : `Reactivate account for "${item.user.fullName}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await apiFetch(`/staff/${item.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: nextStatus }),
      });
      fetchData();
    } catch (err: any) {
      alert(`Error updating staff status: ${err.message}`);
    }
  };

  const handleOpenCredentialsModal = (item: StaffMember) => {
    setViewingStaffCreds(item);
    setShowExistingPassword(true); // Show current permanent password by default
    setResetPasswordInput(''); // Keep blank by default so it never displays any unexpected password
    setShowResetInputPassword(true);
    setResetError(null);
    setResetSuccess(null);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingStaffCreds) return;

    if (!resetPasswordInput.trim()) {
      setResetError('Please enter a password or click Auto-generate');
      return;
    }

    setResetLoading(true);
    setResetError(null);
    setResetSuccess(null);

    try {
      const res = await apiFetch(`/staff/${viewingStaffCreds.id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({
          password: resetPasswordInput.trim(),
        }),
      });

      if (res.success) {
        setResetSuccess(`Permanent password updated successfully to: "${res.data.permanentPassword}"`);
        const updatedStaff = {
          ...viewingStaffCreds,
          permissionsJson: {
            ...(viewingStaffCreds.permissionsJson || {}),
            permanentPassword: res.data.permanentPassword,
          },
        };
        setViewingStaffCreds(updatedStaff);
        setShowExistingPassword(true);
        setResetPasswordInput(''); // Clear input field after successful update

        // Update in list
        setStaff((prev) => prev.map((s) => (s.id === updatedStaff.id ? updatedStaff : s)));
      }
    } catch (err: any) {
      setResetError(err.message || 'Failed to update permanent password');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2D1E18]">Staff & Faculty Management</h1>
          <p className="text-sm text-[#6D4C41] mt-1">
            Manage teaching faculty, staff profiles, and login passwords
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-2 bg-[#4E342E] hover:bg-[#3E2723] text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-md shadow-[#3E2723]/25 transition-all self-start"
        >
          <Plus className="w-4 h-4" /> Add New Staff Member
        </button>
      </div>

      {/* Directory Table */}
      <div className="bg-white border border-[#D7CCC8] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="w-full sm:w-80 relative">
            <Search className="w-4 h-4 text-[#8D6E63] absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, code..."
              className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl pl-10 pr-4 py-2 text-xs text-[#2D1E18] placeholder-[#A1887F] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
            />
          </div>
          <div className="text-xs text-[#6D4C41] font-medium hidden sm:block">
            Institute Code:{' '}
            <span className="font-mono font-bold text-[#4E342E] bg-[#F7F2EF] px-2 py-0.5 rounded border border-[#D7CCC8]">
              {activeInstitute?.code || 'INST-001'}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#D7CCC8] text-[#6D4C41] bg-[#F7F2EF] uppercase tracking-wider">
                <th className="py-3 px-4 font-bold">Faculty / Staff</th>
                <th className="py-3 px-4 font-bold">Employee Code</th>
                <th className="py-3 px-4 font-bold">Designation</th>
                <th className="py-3 px-4 font-bold">Batches Assigned</th>
                <th className="py-3 px-4 font-bold">Status</th>
                <th className="py-3 px-4 font-bold text-right">Login & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFEBE9]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#6D4C41]">
                    Loading staff directory...
                  </td>
                </tr>
              ) : staff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#6D4C41]">
                    No staff members found.
                  </td>
                </tr>
              ) : (
                staff.map((item) => (
                  <tr key={item.id} className="hover:bg-[#FDFBF7] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#2D1E18] text-sm">{item.user.fullName}</div>
                      <div className="text-[11px] text-[#6D4C41] flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-[#8D6E63]" /> {item.user.email}
                        </span>
                        {item.user.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-[#8D6E63]" /> {item.user.phone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#4E342E]">
                      {item.employeeCode ? (
                        <span className="bg-[#F7F2EF] border border-[#D7CCC8] px-2 py-0.5 rounded text-xs">
                          {item.employeeCode}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-[#2D1E18] font-medium">{item.designation}</td>
                    <td className="py-3.5 px-4 text-[#5D4037]">
                      {item.assignments && item.assignments.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 max-w-xs">
                          {item.assignments.map((a) => {
                            const assignedSubjectsForBatch = item.batchSubjects?.filter(
                              (bs) => bs.batchId === a.batch.id
                            ) || [];

                            return (
                              <span
                                key={a.id}
                                className="inline-flex flex-col px-2 py-1 rounded-lg bg-[#F7F2EF] text-[11px] text-[#4E342E] border border-[#D7CCC8]"
                              >
                                <span className="font-bold">{a.batch.name}</span>
                                {assignedSubjectsForBatch.length > 0 ? (
                                  <span className="text-[10px] text-[#8D6E63] font-medium">
                                    {assignedSubjectsForBatch.map((bs) => bs.subject.name).join(', ')}
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-[#A1887F] italic">All / General</span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-[#A1887F] italic">None</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {item.user.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
                          <CheckCircle className="w-3 h-3 text-emerald-600" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-300">
                          <AlertTriangle className="w-3 h-3 text-rose-600" /> Deactivated
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleOpenAssignmentModal(item)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-[#D7CCC8] bg-white text-[#4E342E] hover:bg-[#F7F2EF] hover:border-[#8D6E63] transition shadow-sm"
                          title="Assign batches and subjects taught by this staff member"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-[#8D6E63]" />
                          <span>Assign Batches</span>
                        </button>
                        <button
                          onClick={() => handleOpenCredentialsModal(item)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-[#D7CCC8] bg-white text-[#4E342E] hover:bg-[#F7F2EF] hover:border-[#8D6E63] transition shadow-sm"
                          title="View or change staff login and password"
                        >
                          <Key className="w-3.5 h-3.5 text-[#8D6E63]" />
                          <span>Login & Password</span>
                        </button>
                        <button
                          onClick={() => handleToggleStatus(item)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
                            item.user.isActive
                              ? 'border-rose-300 text-rose-800 hover:bg-rose-50'
                              : 'border-emerald-300 text-emerald-800 hover:bg-emerald-50'
                          }`}
                        >
                          {item.user.isActive ? 'Deactivate' : 'Activate'}
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

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto shadow-2xl text-[#2D1E18]">
            <div className="flex items-center justify-between pb-4 border-b border-[#EFEBE9]">
              <h2 className="text-lg font-bold text-[#2D1E18] flex items-center gap-2">
                <Users className="w-5 h-5 text-[#4E342E]" /> Provision Staff Account
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#8D6E63] hover:text-[#2D1E18] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createdCredential ? (
              <div className="my-5 p-5 rounded-2xl bg-emerald-50 border border-emerald-300 text-[#2D1E18] space-y-4">
                <div className="flex items-center gap-2 font-bold text-emerald-800 text-sm">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" /> Permanent Staff Login Created
                </div>
                <p className="text-xs text-[#5D4037] leading-relaxed">
                  The permanent login and password have been created. You can hand over these login details
                  directly to the staff member. No temporary password change is required.
                </p>

                <div className="p-4 rounded-xl bg-white border border-emerald-200 text-xs space-y-2.5">
                  <div className="flex justify-between items-center py-1 border-b border-emerald-100">
                    <span className="text-[#6D4C41]">Staff Name:</span>
                    <span className="font-bold text-[#2D1E18]">{createdCredential.fullName}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-emerald-100">
                    <span className="text-[#6D4C41]">Role:</span>
                    <span className="font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px]">
                      Staff / Faculty
                    </span>
                  </div>
                  {createdCredential.employeeCode && (
                    <div className="flex justify-between items-center py-1 border-b border-emerald-100">
                      <span className="text-[#6D4C41]">Employee Code:</span>
                      <span className="font-mono font-bold text-[#4E342E] bg-white border border-[#D7CCC8] px-2 py-0.5 rounded text-xs">
                        {createdCredential.employeeCode}
                      </span>
                    </div>
                  )}
                  {createdCredential.instituteCode && (
                    <div className="flex justify-between items-center py-1 border-b border-emerald-100">
                      <span className="text-[#6D4C41]">Institute Code:</span>
                      <span className="font-mono font-bold text-[#4E342E]">
                        {createdCredential.instituteCode}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-1 border-b border-emerald-100">
                    <span className="text-[#6D4C41]">Login Email:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-semibold text-[#2D1E18] select-all">
                        {createdCredential.email}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(createdCredential.email, 'created_email')}
                        className="text-[#8D6E63] hover:text-[#2D1E18] p-0.5"
                        title="Copy email"
                      >
                        {copiedKey === 'created_email' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-[#6D4C41]">Permanent Password:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#2D1E18] bg-emerald-50/70 border border-emerald-200 px-2.5 py-0.5 rounded text-xs select-all">
                        {showCreatedPassword ? createdCredential.permanentPassword : '••••••••••••'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowCreatedPassword(!showCreatedPassword)}
                        className="text-[#8D6E63] hover:text-[#2D1E18]"
                        title={showCreatedPassword ? 'Hide password' : 'Show password'}
                      >
                        {showCreatedPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(createdCredential.permanentPassword, 'created_pass')}
                        className="text-[#8D6E63] hover:text-emerald-700"
                        title="Copy password"
                      >
                        {copiedKey === 'created_pass' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      copyFormattedCredentials(
                        createdCredential.fullName,
                        createdCredential.email,
                        createdCredential.permanentPassword,
                        createdCredential.instituteCode,
                        createdCredential.employeeCode,
                        'created_all'
                      )
                    }
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold py-2.5 px-4 rounded-xl shadow-md transition"
                  >
                    {copiedKey === 'created_all' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedKey === 'created_all' ? 'Copied Login & Password!' : 'Copy Login & Password Details'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-semibold py-2.5 px-5 rounded-xl transition"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                {addError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs">
                    {addError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#4E342E] mb-1">Full Name*</label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="e.g. Dr. Rajesh Sharma"
                      className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#4E342E] mb-1">Email*</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="rajesh@academy.edu"
                      className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#4E342E] mb-1">Designation*</label>
                    <input
                      type="text"
                      required
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      placeholder="e.g. Senior Math Faculty"
                      className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-[#4E342E]">Employee Code*</label>
                      <button
                        type="button"
                        onClick={handleRegenerateEmployeeCode}
                        className="text-[10px] text-[#4E342E] hover:text-[#2D1E18] font-bold flex items-center gap-1 bg-white border border-[#D7CCC8] px-1.5 py-0.5 rounded hover:bg-[#EFEBE9] transition"
                        title="Auto-generate next employee code with academy name"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-[#8D6E63]" /> Auto-generate
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={formData.employeeCode}
                      onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value.toUpperCase() })}
                      placeholder="e.g. APEX-EMP-001"
                      className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs font-mono font-medium text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                    />
                    <p className="text-[10px] text-[#8D6E63] mt-1">
                      Auto-generated with academy name. You can customize if needed.
                    </p>
                  </div>
                </div>

                {/* Permanent Login Password Field */}
                <div className="p-3.5 rounded-2xl bg-[#F7F2EF] border border-[#D7CCC8] space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-[#4E342E] flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-[#8D6E63]" /> Permanent Login Password*
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, password: generateStrongPassword() })}
                      className="text-[11px] text-[#4E342E] hover:text-[#2D1E18] font-bold flex items-center gap-1 bg-white border border-[#D7CCC8] px-2 py-0.5 rounded-md hover:bg-[#EFEBE9] transition"
                    >
                      <Sparkles className="w-3 h-3 text-[#8D6E63]" /> Auto-generate
                    </button>
                  </div>
                  <div className="relative">
                    <Key className="w-4 h-4 text-[#8D6E63] absolute left-3 top-2.5" />
                    <input
                      type={showFormPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Type permanent password (or click Auto-generate)"
                      className="w-full bg-white border border-[#D7CCC8] rounded-xl pl-9 pr-10 py-2 text-xs font-mono text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFormPassword(!showFormPassword)}
                      className="absolute right-3 top-2.5 text-[#8D6E63] hover:text-[#2D1E18]"
                      title={showFormPassword ? 'Hide password' : 'Show password'}
                    >
                      {showFormPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-[#6D4C41] leading-relaxed">
                    This is the staff member&apos;s permanent password. You will be able to review and copy
                    this password to give to the staff member.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#4E342E] mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="e.g. 9876543210"
                      className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#4E342E] mb-1">Qualification</label>
                    <input
                      type="text"
                      value={formData.qualification}
                      onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                      placeholder="e.g. M.Sc. Physics, B.Ed"
                      className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                    />
                  </div>
                </div>

                {batches.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-[#4E342E] mb-1">Assign to Batches</label>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 bg-[#F7F2EF] rounded-xl border border-[#D7CCC8]">
                      {batches.map((b) => (
                        <label key={b.id} className="flex items-center gap-2 text-xs text-[#2D1E18] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.selectedBatchIds.includes(b.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  selectedBatchIds: [...formData.selectedBatchIds, b.id],
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  selectedBatchIds: formData.selectedBatchIds.filter((id) => id !== b.id),
                                });
                              }
                            }}
                            className="rounded border-[#D7CCC8] text-[#4E342E] focus:ring-[#8D6E63]"
                          />
                          <span>{b.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-[#6D4C41] hover:text-[#2D1E18]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addLoading}
                    className="bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-md shadow-[#3E2723]/30 transition disabled:opacity-50"
                  >
                    {addLoading ? 'Creating...' : 'Create Staff & Permanent Login'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* View & Reset Staff Credentials Modal */}
      {viewingStaffCreds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto shadow-2xl text-[#2D1E18]">
            <div className="flex items-center justify-between pb-4 border-b border-[#EFEBE9]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#F7F2EF] border border-[#D7CCC8] flex items-center justify-center text-[#4E342E]">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#2D1E18]">Staff Login & Password</h2>
                  <p className="text-xs text-[#6D4C41]">Manage password for {viewingStaffCreds.user.fullName}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingStaffCreds(null)}
                className="text-[#8D6E63] hover:text-[#2D1E18] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {resetSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{resetSuccess}</span>
                </div>
              )}

              {resetError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs">
                  {resetError}
                </div>
              )}

              {/* Profile Details Card */}
              <div className="p-3.5 rounded-2xl bg-[#F7F2EF] border border-[#D7CCC8] space-y-2 text-xs">
                <div className="flex justify-between items-center py-0.5 border-b border-[#EFEBE9]">
                  <span className="text-[#6D4C41]">Institute Code:</span>
                  <span className="font-mono font-bold text-[#4E342E]">
                    {activeInstitute?.code || 'INST'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-[#EFEBE9]">
                  <span className="text-[#6D4C41]">Designation:</span>
                  <span className="font-semibold text-[#2D1E18]">{viewingStaffCreds.designation}</span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-[#EFEBE9]">
                  <span className="text-[#6D4C41]">Login Email:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-[#2D1E18] select-all">
                      {viewingStaffCreds.user.email}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(viewingStaffCreds.user.email || '', 'view_email')
                      }
                      className="text-[#8D6E63] hover:text-[#2D1E18]"
                      title="Copy email"
                    >
                      {copiedKey === 'view_email' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Permanent Password on Record */}
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-[#6D4C41]">Permanent Password:</span>
                  {viewingStaffCreds.permissionsJson?.permanentPassword ? (
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#2D1E18] bg-white border border-[#D7CCC8] px-2 py-0.5 rounded text-xs select-all">
                        {showExistingPassword
                          ? viewingStaffCreds.permissionsJson.permanentPassword
                          : '••••••••••••'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowExistingPassword(!showExistingPassword)}
                        className="text-[#8D6E63] hover:text-[#2D1E18]"
                        title={showExistingPassword ? 'Hide password' : 'Show password'}
                      >
                        {showExistingPassword ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(
                            viewingStaffCreds.permissionsJson?.permanentPassword,
                            'view_pass'
                          )
                        }
                        className="text-[#8D6E63] hover:text-emerald-700"
                        title="Copy password"
                      >
                        {copiedKey === 'view_pass' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <span className="text-[#8D6E63] italic text-[11px]">
                      Encrypted (Set new password below)
                    </span>
                  )}
                </div>
              </div>

              {/* Copy Full Credentials Button if Password is Available */}
              {viewingStaffCreds.permissionsJson?.permanentPassword && (
                <button
                  type="button"
                  onClick={() =>
                    copyFormattedCredentials(
                      viewingStaffCreds.user.fullName,
                      viewingStaffCreds.user.email || '',
                      viewingStaffCreds.permissionsJson?.permanentPassword || '',
                      activeInstitute?.code,
                      viewingStaffCreds.employeeCode || undefined,
                      'view_all'
                    )
                  }
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-semibold py-2.5 px-4 rounded-xl shadow transition"
                >
                  {copiedKey === 'view_all' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedKey === 'view_all' ? 'Copied Login & Password!' : 'Copy Login & Password to Give to Staff'}
                </button>
              )}

              {/* Set / Reset Permanent Password Section */}
              <form onSubmit={handleResetPassword} className="p-4 rounded-2xl border border-[#D7CCC8] space-y-3 bg-white">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#4E342E] flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-[#8D6E63]" /> Set / Change Permanent Password
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setResetPasswordInput(generateStrongPassword());
                      setShowResetInputPassword(true);
                    }}
                    className="text-[11px] text-[#4E342E] hover:text-[#2D1E18] font-bold flex items-center gap-1 bg-[#F7F2EF] border border-[#D7CCC8] px-2 py-0.5 rounded-md hover:bg-[#EFEBE9] transition"
                  >
                    <Sparkles className="w-3 h-3 text-[#8D6E63]" /> Auto-generate
                  </button>
                </div>

                <div className="relative">
                  <Key className="w-4 h-4 text-[#8D6E63] absolute left-3 top-2.5" />
                  <input
                    type={showResetInputPassword ? 'text' : 'password'}
                    value={resetPasswordInput}
                    onChange={(e) => setResetPasswordInput(e.target.value)}
                    placeholder="Type new password (or click Auto-generate)..."
                    className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl pl-9 pr-10 py-2 text-xs font-mono text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetInputPassword(!showResetInputPassword)}
                    className="absolute right-3 top-2.5 text-[#8D6E63] hover:text-[#2D1E18]"
                    title={showResetInputPassword ? 'Hide password' : 'Show password'}
                  >
                    {showResetInputPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <p className="text-[11px] text-[#6D4C41]">
                  Updating this will immediately replace the faculty login password. They can use this new permanent
                  password right away.
                </p>

                <div className="pt-1 flex justify-end">
                  <button
                    type="submit"
                    disabled={resetLoading || !resetPasswordInput.trim()}
                    className="inline-flex items-center gap-1.5 bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-semibold px-4 py-2 rounded-xl shadow transition disabled:opacity-50"
                  >
                    {resetLoading ? 'Saving...' : 'Save Permanent Password'}
                  </button>
                </div>
              </form>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setViewingStaffCreds(null)}
                  className="px-4 py-2 text-xs font-semibold text-[#6D4C41] hover:text-[#2D1E18]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Batches & Subjects Modal */}
      {viewingStaffAssignments && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto shadow-2xl text-[#2D1E18]">
            <div className="flex items-center justify-between pb-4 border-b border-[#EFEBE9]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#F7F2EF] border border-[#D7CCC8] flex items-center justify-center text-[#4E342E]">
                  <BookOpen className="w-5 h-5 text-[#4E342E]" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#2D1E18]">
                    Assign Batches & Subjects
                  </h2>
                  <p className="text-xs text-[#6D4C41]">
                    {viewingStaffAssignments.user.fullName} • {viewingStaffAssignments.designation}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingStaffAssignments(null)}
                className="text-[#8D6E63] hover:text-[#2D1E18] p-1.5 rounded-lg hover:bg-[#F7F2EF] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {assignmentError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{assignmentError}</span>
                </div>
              )}

              {assignmentSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{assignmentSuccess}</span>
                </div>
              )}

              <div className="p-3 rounded-xl bg-[#F7F2EF] border border-[#D7CCC8] text-xs text-[#5D4037] leading-relaxed">
                <span className="font-bold text-[#4E342E]">Staff Permission Scoping:</span> Select the batches and specific subjects this staff member teaches. They will only see attendance, students, homework, and materials for their assigned subjects in these batches.
              </div>

              <form onSubmit={handleSaveAssignments} className="space-y-4">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-[#4E342E] uppercase tracking-wider block">
                    Institute Batches & Curriculum
                  </label>

                  {batches.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#8D6E63] border border-dashed border-[#D7CCC8] rounded-2xl bg-[#FDFBF7]">
                      No active batches found in this institute. Please create a batch in Academics first.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      {batches.map((b) => {
                        const isBatchSelected = assignmentBatchIds.includes(b.id);
                        const batchSubjects = b.batchSubjects || [];
                        const selectedSubjectsForBatch = assignmentSubjectMap[b.id] || [];

                        return (
                          <div
                            key={b.id}
                            className={`p-3.5 rounded-2xl border transition-all ${
                              isBatchSelected
                                ? 'bg-[#FDFBF7] border-[#8D6E63] shadow-sm'
                                : 'bg-white border-[#EFEBE9] hover:border-[#D7CCC8]'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={isBatchSelected}
                                  onChange={() => handleToggleBatch(b.id)}
                                  className="w-4 h-4 rounded text-[#4E342E] border-[#D7CCC8] focus:ring-[#8D6E63] cursor-pointer"
                                />
                                <div>
                                  <div className="font-bold text-xs text-[#2D1E18]">
                                    {b.name}
                                  </div>
                                  <div className="text-[11px] text-[#8D6E63]">
                                    Year: {b.academicYear} {b.code ? `• Code: ${b.code}` : ''}
                                  </div>
                                </div>
                              </label>

                              {isBatchSelected && batchSubjects.length > 0 && (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleSelectAllSubjectsForBatch(b.id)}
                                    className="text-[10px] font-semibold text-[#4E342E] hover:underline"
                                  >
                                    All Subjects
                                  </button>
                                  <span className="text-[#D7CCC8]">|</span>
                                  <button
                                    type="button"
                                    onClick={() => handleClearSubjectsForBatch(b.id)}
                                    className="text-[10px] font-semibold text-[#8D6E63] hover:underline"
                                  >
                                    Clear
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Subjects list for this batch */}
                            {isBatchSelected && (
                              <div className="mt-3 pt-3 border-t border-[#EFEBE9] pl-6 space-y-2">
                                <div className="text-[11px] font-bold text-[#6D4C41]">
                                  Subjects taught by this staff member:
                                </div>

                                {batchSubjects.length === 0 ? (
                                  <div className="text-[11px] text-[#A1887F] italic">
                                    No distinct subjects added to this batch. Staff will have general batch access.
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {batchSubjects.map((bs) => {
                                      const isSubjectSelected = selectedSubjectsForBatch.includes(bs.subjectId);
                                      return (
                                        <label
                                          key={bs.id}
                                          className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer transition ${
                                            isSubjectSelected
                                              ? 'bg-white border-[#8D6E63] text-[#2D1E18] font-semibold shadow-xs'
                                              : 'bg-[#F7F2EF]/60 border-transparent text-[#6D4C41]'
                                          }`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isSubjectSelected}
                                            onChange={() => handleToggleSubject(b.id, bs.subjectId)}
                                            className="w-3.5 h-3.5 rounded text-[#4E342E] border-[#D7CCC8] focus:ring-[#8D6E63] cursor-pointer"
                                          />
                                          <span className="truncate">
                                            {bs.subject.name}
                                            {bs.subject.code ? ` (${bs.subject.code})` : ''}
                                          </span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EFEBE9]">
                  <button
                    type="button"
                    onClick={() => setViewingStaffAssignments(null)}
                    disabled={assignmentLoading}
                    className="px-4 py-2 text-xs font-semibold text-[#6D4C41] hover:text-[#2D1E18] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={assignmentLoading}
                    className="inline-flex items-center gap-2 bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-md transition disabled:opacity-50"
                  >
                    {assignmentLoading ? 'Saving Assignments...' : 'Save Assignments'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
