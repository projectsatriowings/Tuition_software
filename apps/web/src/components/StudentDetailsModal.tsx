import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { useToast } from '../context/ToastContext';
import { ConfirmationModal } from './ConfirmationModal';
import {
  X,
  User,
  GraduationCap,
  Calendar,
  Phone,
  Mail,
  Shield,
  KeyRound,
  Edit2,
  Users,
  CheckCircle,
  Clock,
  Building,
  Award,
  BookOpen,
  Copy,
  Check,
} from 'lucide-react';

interface StudentDetailsModalProps {
  studentId: string | null;
  onClose: () => void;
  onStudentUpdated?: () => void;
}

export const StudentDetailsModal: React.FC<StudentDetailsModalProps> = ({
  studentId,
  onClose,
  onStudentUpdated,
}) => {
  const { success, error } = useToast();

  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'guardians' | 'academics'>('profile');

  // Password Reset Modal State
  const [resetTarget, setResetTarget] = useState<{
    type: 'student' | 'parent';
    id: string;
    name: string;
  } | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [temporaryPasswordResult, setTemporaryPasswordResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Identifier Update Modal State
  const [identifierTarget, setIdentifierTarget] = useState<{
    type: 'student' | 'parent';
    id: string;
    currentEmail?: string;
    currentPhone?: string;
    name: string;
  } | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [identifierLoading, setIdentifierLoading] = useState(false);

  // Status Change Confirmation
  const [statusConfirm, setStatusConfirm] = useState<{
    targetStatus: 'ACTIVE' | 'PASSED_OUT' | 'DISCONTINUED';
    title: string;
    message: string;
  } | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const fetchDetails = async () => {
    if (!studentId) return;
    try {
      setLoading(true);
      const res = await apiFetch(`/students/${studentId}`);
      if (res.success && res.data?.student) {
        setStudent(res.data.student);
      } else {
        error(res.error || 'Failed to load student details');
        onClose();
      }
    } catch (err: any) {
      error(err.message || 'Error loading student details');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (studentId) {
      fetchDetails();
    }
  }, [studentId]);

  const formatKolkataDateTime = (dateString?: string | null) => {
    if (!dateString) return 'Not available';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Not available';
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  };

  const formatKolkataDate = (dateString?: string | null) => {
    if (!dateString) return 'Not available';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Not available';
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d);
  };

  // Handle Password Reset Submission
  const handleResetPassword = async () => {
    if (!resetTarget) return;
    setResetLoading(true);
    try {
      const endpoint =
        resetTarget.type === 'student'
          ? `/students/${student.id}/reset-password`
          : `/parents/${resetTarget.id}/reset-password`;

      const res = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          password: newPasswordInput.trim() || undefined,
        }),
      });

      if (res.success && res.data?.temporaryPassword) {
        setTemporaryPasswordResult(res.data.temporaryPassword);
        success(`${resetTarget.name}'s password reset successfully!`);
        fetchDetails();
      } else {
        error(res.error || 'Failed to reset password');
      }
    } catch (err: any) {
      error(err.message || 'Error resetting password');
    } finally {
      setResetLoading(false);
    }
  };

  // Handle Login Identifier Update
  const handleUpdateIdentifier = async () => {
    if (!identifierTarget) return;
    setIdentifierLoading(true);
    try {
      const endpoint =
        identifierTarget.type === 'student'
          ? `/students/${student.id}/account-identifier`
          : `/parents/${identifierTarget.id}/account-identifier`;

      const res = await apiFetch(endpoint, {
        method: 'PATCH',
        body: JSON.stringify({
          email: editEmail.trim() || undefined,
          phone: editPhone.trim() || undefined,
        }),
      });

      if (res.success) {
        success('Login credentials updated successfully');
        setIdentifierTarget(null);
        fetchDetails();
        if (onStudentUpdated) onStudentUpdated();
      } else {
        error(res.error || 'Failed to update credentials');
      }
    } catch (err: any) {
      error(err.message || 'Error updating credentials');
    } finally {
      setIdentifierLoading(false);
    }
  };

  // Handle Status Update (e.g. Mark as Passed)
  const handleConfirmStatusChange = async () => {
    if (!statusConfirm || !student) return;
    setStatusLoading(true);
    try {
      const res = await apiFetch(`/students/${student.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: statusConfirm.targetStatus,
          reason: `Status changed to ${statusConfirm.targetStatus} via Student Details portal`,
        }),
      });

      if (res.success) {
        success(`Student status updated to ${statusConfirm.targetStatus}`);
        setStatusConfirm(null);
        fetchDetails();
        if (onStudentUpdated) onStudentUpdated();
      } else {
        error(res.error || 'Failed to update student status');
      }
    } catch (err: any) {
      error(err.message || 'Error updating status');
    } finally {
      setStatusLoading(false);
    }
  };

  if (!studentId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white border border-[#D7CCC8] rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl text-[#2D1E18] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#EFEBE9] bg-[#FDFBF7] flex items-center justify-between">
          <div className="flex items-center gap-3">
            {student?.photoUrl ? (
              <img
                src={student.photoUrl.startsWith('http') ? student.photoUrl : `/api/students/${student.id}/photo`}
                alt={student.firstName}
                className="w-12 h-12 rounded-2xl object-cover border border-[#D7CCC8] shadow-sm"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-[#EFEBE9] text-[#4E342E] flex items-center justify-center font-bold text-lg border border-[#D7CCC8]">
                {student ? `${student.firstName[0]}${student.lastName[0]}` : 'ST'}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#2D1E18]">
                  {student ? `${student.firstName} ${student.lastName}` : 'Student Profile'}
                </h2>
                {student && (
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                      student.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : student.status === 'PASSED_OUT'
                        ? 'bg-purple-50 text-purple-800 border-purple-300'
                        : 'bg-stone-100 text-stone-700 border-stone-300'
                    }`}
                  >
                    {student.status.replace('_', ' ')}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8D6E63] font-mono mt-0.5">
                Admission No: <span className="font-semibold text-[#4E342E]">{student?.admissionNumber || '—'}</span>
                {student?.rollNumber && <span className="ml-3 font-normal">Roll: {student.rollNumber}</span>}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8D6E63] hover:text-[#2D1E18] p-1.5 rounded-xl hover:bg-[#EFEBE9] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#EFEBE9] bg-[#FAF8F5] px-5 gap-4 overflow-x-auto text-xs">
          {[
            { id: 'profile', label: 'Student Profile', icon: <User className="w-3.5 h-3.5" /> },
            { id: 'account', label: 'Login Account', icon: <Shield className="w-3.5 h-3.5" /> },
            { id: 'guardians', label: 'Linked Guardians', icon: <Users className="w-3.5 h-3.5" /> },
            { id: 'academics', label: 'Academic & Fees', icon: <Award className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-3 px-1 border-b-2 font-semibold transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[#4E342E] text-[#4E342E] font-bold'
                  : 'border-transparent text-[#8D6E63] hover:text-[#4E342E]'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-[#8D6E63]">
              <div className="w-6 h-6 border-2 border-[#4E342E] border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-semibold">Loading student record...</span>
            </div>
          ) : !student ? (
            <div className="text-center py-12 text-[#8D6E63] text-xs">Student record not found.</div>
          ) : (
            <>
              {/* TAB 1: PROFILE DETAILS */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  {/* Status Lifecycle Banner / Quick Actions */}
                  <div className="p-4 rounded-2xl bg-[#F7F2EF] border border-[#D7CCC8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-[#4E342E]">Lifecycle Status: {student.status}</span>
                      <p className="text-[11px] text-[#6D4C41] mt-0.5">
                        Manage graduation, active batches, or discontinuation.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {student.status === 'ACTIVE' ? (
                        <>
                          <button
                            onClick={() =>
                              setStatusConfirm({
                                targetStatus: 'PASSED_OUT',
                                title: 'Mark Student as Passed Out?',
                                message: `Are you sure you want to mark ${student.firstName} ${student.lastName} as Passed Out? This will update their academic record and archive active class batch enrollments.`,
                              })
                            }
                            className="bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-sm transition"
                          >
                            🎓 Mark as Passed Out
                          </button>
                          <button
                            onClick={() =>
                              setStatusConfirm({
                                targetStatus: 'DISCONTINUED',
                                title: 'Discontinue Student Admission?',
                                message: `Are you sure you want to mark ${student.firstName} ${student.lastName} as Discontinued?`,
                              })
                            }
                            className="bg-[#D7CCC8] hover:bg-[#BCAAA4] text-[#3E2723] text-xs font-semibold px-3 py-1.5 rounded-xl transition"
                          >
                            Discontinue
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() =>
                            setStatusConfirm({
                              targetStatus: 'ACTIVE',
                              title: 'Reactivate Student?',
                              message: `Reactivate student admission for ${student.firstName} ${student.lastName}?`,
                            })
                          }
                          className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-sm transition"
                        >
                          ✓ Reactivate Student
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Personal & Academic Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-[#FDFBF7] p-4 rounded-2xl border border-[#D7CCC8]/70 space-y-3">
                      <h4 className="text-xs font-bold text-[#4E342E] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#EFEBE9] pb-2">
                        <User className="w-3.5 h-3.5 text-[#6D4C41]" /> Personal Information
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-[#8D6E63]">Full Name:</span>
                          <span className="font-semibold text-[#2D1E18]">{student.firstName} {student.lastName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#8D6E63]">Phone:</span>
                          <span className="font-mono text-[#2D1E18]">{student.phone || 'Not provided'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#8D6E63]">Date of Birth:</span>
                          <span className="text-[#2D1E18]">{formatKolkataDate(student.dob)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#8D6E63]">Gender:</span>
                          <span className="text-[#2D1E18] capitalize">{student.gender?.toLowerCase() || 'Unspecified'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#8D6E63]">Blood Group:</span>
                          <span className="font-mono text-[#2D1E18]">{student.bloodGroup || '—'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#FDFBF7] p-4 rounded-2xl border border-[#D7CCC8]/70 space-y-3">
                      <h4 className="text-xs font-bold text-[#4E342E] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#EFEBE9] pb-2">
                        <Calendar className="w-3.5 h-3.5 text-[#6D4C41]" /> Admission & Timestamps
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-[#8D6E63]">Admission Number:</span>
                          <span className="font-mono font-bold text-[#4E342E]">{student.admissionNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#8D6E63]">Joined Date:</span>
                          <span className="font-semibold text-[#2D1E18]">{formatKolkataDate(student.admissionDate)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#8D6E63]">Record Created:</span>
                          <span className="text-[#2D1E18]">{formatKolkataDateTime(student.createdAt)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#8D6E63]">Admitted By:</span>
                          <span className="font-semibold text-[#2D1E18]">
                            {student.createdByUser ? `${student.createdByUser.fullName} (${student.createdByUser.role})` : 'Academic Admin / System'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#8D6E63]">Student Account Created:</span>
                          <span className="text-[#2D1E18]">{formatKolkataDateTime(student.user?.createdAt)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#8D6E63]">Parent Account Created:</span>
                          <span className="text-[#2D1E18]">
                            {formatKolkataDateTime(student.parentRelations?.[0]?.parent?.user?.createdAt)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#8D6E63]">Institute:</span>
                          <span className="text-[#2D1E18]">{student.institute?.name} ({student.institute?.code})</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#8D6E63]">Current Batch:</span>
                          <span className="font-semibold text-[#4E342E]">
                            {student.enrollments?.[0]?.batch?.name || 'Unassigned'}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-[#EFEBE9] flex items-center justify-between">
                          <span className="text-[#8D6E63]">Photograph:</span>
                          <label className="cursor-pointer text-xs font-bold text-[#4E342E] hover:underline flex items-center gap-1">
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const formData = new FormData();
                                formData.append('photo', file);
                                try {
                                  const res = await apiFetch(`/students/${student.id}/photo`, {
                                    method: 'POST',
                                    body: formData,
                                  });
                                  if (res.success) {
                                    success('Student photograph updated');
                                    fetchDetails();
                                    if (onStudentUpdated) onStudentUpdated();
                                  } else {
                                    error(res.error || 'Failed to upload photo');
                                  }
                                } catch (err: any) {
                                  error(err.message);
                                }
                              }}
                            />
                            📷 {student.photoUrl ? 'Replace Photo' : 'Upload Photo'}
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {student.notes && (
                    <div className="p-3.5 rounded-2xl bg-[#FDFBF7] border border-[#D7CCC8]/70">
                      <span className="text-[11px] font-bold text-[#8D6E63] uppercase tracking-wider block mb-1">
                        Remarks & Medical Notes
                      </span>
                      <p className="text-xs text-[#4E342E]">{student.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: STUDENT LOGIN ACCOUNT */}
              {activeTab === 'account' && (
                <div className="space-y-6">
                  {student.user ? (
                    <div className="bg-[#FDFBF7] border border-[#D7CCC8] rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between border-b border-[#EFEBE9] pb-3">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-emerald-700" />
                          <h4 className="text-xs font-bold text-[#2D1E18] uppercase tracking-wider">
                            Student Login Account
                          </h4>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Account Active
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-[#8D6E63] block">Login Phone:</span>
                          <span className="font-mono font-bold text-[#2D1E18]">{student.user.phone || 'None registered'}</span>
                        </div>
                        <div>
                          <span className="text-[#8D6E63] block">Login Email:</span>
                          <span className="font-mono text-[#2D1E18]">{student.user.email || 'None registered'}</span>
                        </div>
                        <div>
                          <span className="text-[#8D6E63] block">Student Login Created:</span>
                          <span className="font-semibold text-[#2D1E18]">{formatKolkataDateTime(student.user.createdAt)}</span>
                        </div>
                        <div>
                          <span className="text-[#8D6E63] block">Last Login:</span>
                          <span className="font-semibold text-[#2D1E18]">{formatKolkataDateTime(student.user.lastLoginAt)}</span>
                        </div>
                        <div>
                          <span className="text-[#8D6E63] block">Force Password Change:</span>
                          <span className={`font-semibold ${student.user.mustChangePassword ? 'text-amber-800' : 'text-emerald-700'}`}>
                            {student.user.mustChangePassword ? 'Yes (Pending first login)' : 'No'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#8D6E63] block">Joined Date:</span>
                          <span className="font-semibold text-[#2D1E18]">{formatKolkataDate(student.admissionDate)}</span>
                        </div>
                      </div>

                      {/* Authorized Actions */}
                      <div className="pt-3 border-t border-[#EFEBE9] flex flex-wrap gap-3">
                        <button
                          onClick={() => {
                            setResetTarget({
                              type: 'student',
                              id: student.id,
                              name: `${student.firstName} ${student.lastName}`,
                            });
                            setNewPasswordInput('');
                            setTemporaryPasswordResult(null);
                          }}
                          className="bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-semibold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
                        >
                          <KeyRound className="w-3.5 h-3.5" /> Reset Student Password
                        </button>
                        <button
                          onClick={() => {
                            setIdentifierTarget({
                              type: 'student',
                              id: student.id,
                              currentEmail: student.user.email || '',
                              currentPhone: student.user.phone || student.phone || '',
                              name: `${student.firstName} ${student.lastName}`,
                            });
                            setEditEmail(student.user.email || '');
                            setEditPhone(student.user.phone || student.phone || '');
                          }}
                          className="bg-[#F7F2EF] hover:bg-[#EFEBE9] text-[#4E342E] border border-[#D7CCC8] text-xs font-semibold px-4 py-2 rounded-xl transition flex items-center gap-1.5"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Update Login Identifier
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#FDFBF7] border border-dashed border-[#D7CCC8] rounded-2xl p-6 text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-[#EFEBE9] text-[#6D4C41] flex items-center justify-center mx-auto">
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#2D1E18]">No Student Login Account</h4>
                        <p className="text-xs text-[#8D6E63] max-w-sm mx-auto mt-1">
                          This student currently does not have login credentials assigned. Authorized staff can generate a login account now.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setResetTarget({
                            type: 'student',
                            id: student.id,
                            name: `${student.firstName} ${student.lastName}`,
                          });
                          setNewPasswordInput('');
                          setTemporaryPasswordResult(null);
                        }}
                        className="bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-semibold px-4 py-2 rounded-xl transition inline-flex items-center gap-1.5 shadow-sm"
                      >
                        <KeyRound className="w-3.5 h-3.5" /> Create Student Login & Credentials
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: LINKED GUARDIANS */}
              {activeTab === 'guardians' && (
                <div className="space-y-4">
                  {student.parentRelations && student.parentRelations.length > 0 ? (
                    student.parentRelations.map((rel: any) => {
                      const parentUser = rel.parent?.user;
                      return (
                        <div
                          key={rel.id}
                          className="bg-[#FDFBF7] border border-[#D7CCC8] rounded-2xl p-5 space-y-4"
                        >
                          <div className="flex items-center justify-between border-b border-[#EFEBE9] pb-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-[#2D1E18]">
                                {parentUser?.fullName || 'Parent / Guardian'}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#EFEBE9] text-[#4E342E] border border-[#D7CCC8]">
                                {rel.relation}
                              </span>
                              {rel.isPrimaryContact && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200">
                                  Primary Contact
                                </span>
                              )}
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                parentUser?.isActive
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-stone-100 text-stone-700 border-stone-200'
                              }`}
                            >
                              {parentUser?.isActive ? 'Active Account' : 'Inactive'}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                            <div>
                              <span className="text-[#8D6E63] block">Phone / Login ID:</span>
                              <span className="font-mono font-bold text-[#2D1E18]">{parentUser?.phone || 'None registered'}</span>
                            </div>
                            <div>
                              <span className="text-[#8D6E63] block">Email:</span>
                              <span className="font-mono text-[#2D1E18]">{parentUser?.email || 'None registered'}</span>
                            </div>
                            <div>
                              <span className="text-[#8D6E63] block">Parent Login Created:</span>
                              <span className="font-semibold text-[#2D1E18]">
                                {formatKolkataDateTime(parentUser?.createdAt)}
                              </span>
                            </div>
                            <div>
                              <span className="text-[#8D6E63] block">Last Login:</span>
                              <span className="font-semibold text-[#2D1E18]">
                                {formatKolkataDateTime(parentUser?.lastLoginAt)}
                              </span>
                            </div>
                            <div>
                              <span className="text-[#8D6E63] block">SMS Notifications:</span>
                              <span className={`font-semibold ${rel.canReceiveSms ? 'text-emerald-700' : 'text-stone-500'}`}>
                                {rel.canReceiveSms ? 'Eligible (Consent On)' : 'Disabled'}
                              </span>
                            </div>
                          </div>

                          {/* Authorized Guardian Actions */}
                          <div className="pt-3 border-t border-[#EFEBE9] flex flex-wrap gap-3">
                            <button
                              onClick={() => {
                                setResetTarget({
                                  type: 'parent',
                                  id: rel.parent.id,
                                  name: parentUser?.fullName || 'Parent',
                                });
                                setNewPasswordInput('');
                                setTemporaryPasswordResult(null);
                              }}
                              className="bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-semibold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
                            >
                              <KeyRound className="w-3.5 h-3.5" /> Reset Parent Password
                            </button>
                            <button
                              onClick={() => {
                                setIdentifierTarget({
                                  type: 'parent',
                                  id: rel.parent.id,
                                  currentEmail: parentUser?.email || '',
                                  currentPhone: parentUser?.phone || '',
                                  name: parentUser?.fullName || 'Parent',
                                });
                                setEditEmail(parentUser?.email || '');
                                setEditPhone(parentUser?.phone || '');
                              }}
                              className="bg-[#F7F2EF] hover:bg-[#EFEBE9] text-[#4E342E] border border-[#D7CCC8] text-xs font-semibold px-4 py-2 rounded-xl transition flex items-center gap-1.5"
                            >
                              <Edit2 className="w-3.5 h-3.5" /> Update Contact / Login ID
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center bg-[#FDFBF7] border border-dashed border-[#D7CCC8] rounded-2xl text-xs text-[#8D6E63]">
                      No guardians linked to this student record.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: ACADEMIC & ATTENDANCE SUMMARY */}
              {activeTab === 'academics' && (
                <div className="space-y-4">
                  <div className="bg-[#FDFBF7] border border-[#D7CCC8] rounded-2xl p-5 space-y-3">
                    <h4 className="text-xs font-bold text-[#4E342E] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#EFEBE9] pb-2">
                      <BookOpen className="w-3.5 h-3.5 text-[#6D4C41]" /> Current Batch Enrollment
                    </h4>
                    {student.enrollments && student.enrollments.length > 0 ? (
                      student.enrollments.map((enr: any) => (
                        <div key={enr.id} className="flex items-center justify-between text-xs py-1">
                          <span className="font-semibold text-[#2D1E18]">
                            {enr.batch?.name} ({enr.batch?.academicYear})
                          </span>
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                            {enr.isActive ? 'ACTIVE ENROLLMENT' : 'ARCHIVED'}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[#8D6E63]">Not currently assigned to an active class batch.</p>
                    )}
                  </div>

                  <div className="bg-[#FDFBF7] border border-[#D7CCC8] rounded-2xl p-5 space-y-3">
                    <h4 className="text-xs font-bold text-[#4E342E] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#EFEBE9] pb-2">
                      <Clock className="w-3.5 h-3.5 text-[#6D4C41]" /> Recent Attendance Events (Last 10)
                    </h4>
                    {student.attendanceEvents && student.attendanceEvents.length > 0 ? (
                      <div className="divide-y divide-[#EFEBE9] text-xs">
                        {student.attendanceEvents.map((att: any) => (
                          <div key={att.id} className="py-2 flex items-center justify-between">
                            <span className="text-[#4E342E]">{formatKolkataDateTime(att.eventTime)}</span>
                            <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-[10px]">
                              {att.eventType} {att.isLate && '(LATE)'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#8D6E63]">No attendance records logged yet.</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#EFEBE9] bg-[#FDFBF7] flex justify-end">
          <button
            onClick={onClose}
            className="bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-md"
          >
            Close Details
          </button>
        </div>
      </div>

      {/* Password Reset Modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-[9995] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFEBE9]">
              <h3 className="text-base font-bold text-[#2D1E18]">
                Reset Password: {resetTarget.name}
              </h3>
              <button
                onClick={() => setResetTarget(null)}
                className="text-[#8D6E63] hover:text-[#2D1E18] p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {temporaryPasswordResult ? (
              <div className="space-y-4 text-center py-2">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto text-xl">
                  ✓
                </div>
                <h4 className="text-sm font-bold text-[#2D1E18]">New Temporary Password Generated</h4>
                <p className="text-xs text-[#8D6E63]">
                  Provide this password to the {resetTarget.type}. They will be required to choose a new password upon login.
                </p>
                <div className="bg-[#FDFBF7] border-2 border-dashed border-[#8D6E63]/40 rounded-2xl p-3.5 flex items-center justify-between">
                  <span className="font-mono text-base font-bold text-[#4E342E] select-all">
                    {temporaryPasswordResult}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(temporaryPasswordResult);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="p-1.5 rounded-lg bg-[#EFEBE9] hover:bg-[#D7CCC8] text-[#4E342E] transition flex items-center gap-1 text-xs"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-700" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <button
                  onClick={() => setResetTarget(null)}
                  className="w-full bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-bold py-2.5 rounded-xl transition"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-[#6D4C41]">
                  You can specify a new password below (min 8 characters), or leave it blank to automatically generate a secure temporary password.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-[#4E342E] mb-1">
                    Custom Password (Optional)
                  </label>
                  <input
                    type="text"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Leave blank to auto-generate"
                    className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setResetTarget(null)}
                    className="px-4 py-2 text-xs font-semibold text-[#6D4C41]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetPassword}
                    disabled={resetLoading}
                    className="bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-semibold px-5 py-2 rounded-xl transition disabled:opacity-50"
                  >
                    {resetLoading ? 'Resetting...' : 'Confirm Password Reset'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Update Login Identifier Modal */}
      {identifierTarget && (
        <div className="fixed inset-0 z-[9995] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFEBE9]">
              <h3 className="text-base font-bold text-[#2D1E18]">
                Update Login Credentials: {identifierTarget.name}
              </h3>
              <button
                onClick={() => setIdentifierTarget(null)}
                className="text-[#8D6E63] hover:text-[#2D1E18] p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#4E342E] mb-1">Phone Number (Login ID)</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#4E342E] mb-1">Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="e.g. guardian@example.com"
                  className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIdentifierTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-[#6D4C41]"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateIdentifier}
                disabled={identifierLoading}
                className="bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-semibold px-5 py-2 rounded-xl transition disabled:opacity-50"
              >
                {identifierLoading ? 'Saving...' : 'Save Credentials'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for destructive actions */}
      <ConfirmationModal
        isOpen={!!statusConfirm}
        title={statusConfirm?.title || 'Confirm Action'}
        message={statusConfirm?.message || ''}
        variant={statusConfirm?.targetStatus === 'PASSED_OUT' ? 'warning' : 'danger'}
        loading={statusLoading}
        onConfirm={handleConfirmStatusChange}
        onCancel={() => setStatusConfirm(null)}
      />
    </div>
  );
};
