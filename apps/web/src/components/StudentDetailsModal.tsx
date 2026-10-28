import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { StudentAvatar } from './StudentAvatar';
import { useToast } from '../context/ToastContext';
import { ConfirmationModal } from './ConfirmationModal';
import {
  X,
  User,
  GraduationCap,
  Calendar,
  Users,
  Clock,
  Building,
  Award,
  BookOpen,
  AlertCircle,
  RefreshCw,
  Camera,
  Pencil,
} from 'lucide-react';

interface StudentDetailsModalProps {
  studentId: string | null;
  onClose: () => void;
  onStudentUpdated?: () => void;
  onEditStudent?: (student: any) => void;
}

export const StudentDetailsModal: React.FC<StudentDetailsModalProps> = ({
  studentId,
  onClose,
  onStudentUpdated,
  onEditStudent,
}) => {
  const { success, error } = useToast();

  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'academics'>('profile');

  // Status Change Confirmation
  const [statusConfirm, setStatusConfirm] = useState<{
    targetStatus: 'ACTIVE' | 'PASSED_OUT' | 'DISCONTINUED';
    title: string;
    message: string;
  } | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handlePhotoChange = async (file: File) => {
    if (!student?.id) return;
    if (file.size > 5 * 1024 * 1024) {
      error('Photograph file size must not exceed 5MB.');
      return;
    }
    try {
      setUploadingPhoto(true);
      const fd = new FormData();
      fd.append('photo', file);
      const res = await apiFetch(`/students/${student.id}/photo`, {
        method: 'POST',
        body: fd,
      });
      if (res.success) {
        success('Student photograph updated successfully');
        const updatedPhotoUrl = `${res.data?.photoUrl || `/api/students/${student.id}/photo`}?t=${Date.now()}`;
        setStudent((prev: any) => ({
          ...prev,
          photoUrl: updatedPhotoUrl,
        }));
        onStudentUpdated?.();
      } else {
        error(res.error || 'Failed to update student photo');
      }
    } catch (err: any) {
      error(err.message || 'Error updating student photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const fetchDetails = async () => {
    if (!studentId) return;
    try {
      setLoading(true);
      setErrorMessage(null);
      console.log('[StudentDetailsModal] Fetching details for student ID:', studentId);
      const res = await apiFetch(`/students/${studentId}`);
      if (res.success && res.data?.student) {
        setStudent(res.data.student);
        setErrorMessage(null);
      } else {
        const msg = res.error || 'Failed to load student details';
        console.error('[StudentDetailsModal] Server error loading student details:', msg);
        setErrorMessage(msg);
        error(msg);
      }
    } catch (err: any) {
      const msg = err.message || 'Error loading student details';
      console.error('[StudentDetailsModal] Network or auth error loading student details:', err);
      setErrorMessage(msg);
      error(msg);
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

  // Handle Status Update (e.g. Mark as Passed / Discontinue / Reactivate)
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
          <div className="flex items-center gap-3.5">
            <div className="relative group">
              <StudentAvatar
                studentId={student?.id}
                photoUrl={student?.photoUrl}
                name={student ? `${student.firstName} ${student.lastName}` : 'Student'}
                size="lg"
                className="w-14 h-14 rounded-2xl border border-[#D7CCC8] shadow-sm"
              />
              <label
                className={`absolute inset-0 bg-black/50 text-white rounded-2xl flex flex-col items-center justify-center cursor-pointer text-[10px] font-semibold transition-opacity ${
                  uploadingPhoto ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
                title="Change student photograph"
              >
                <Camera className="w-4 h-4 mb-0.5 text-white" />
                <span>{uploadingPhoto ? 'Saving...' : 'Change'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={uploadingPhoto}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handlePhotoChange(f);
                  }}
                />
              </label>
            </div>
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
              <div className="flex items-center gap-3 mt-0.5">
                <p className="text-xs text-[#8D6E63] font-mono">
                  Admission No: <span className="font-semibold text-[#4E342E]">{student?.admissionNumber || '—'}</span>
                </p>
                <label className="text-[11px] text-[#4E342E] hover:underline cursor-pointer font-semibold inline-flex items-center gap-1">
                  <Camera className="w-3 h-3 text-[#6D4C41]" />
                  <span>{uploadingPhoto ? 'Uploading...' : 'Update Photo'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={uploadingPhoto}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handlePhotoChange(f);
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onEditStudent && student && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditStudent(student);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-semibold shadow-sm transition"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-[#8D6E63] hover:text-[#2D1E18] p-1.5 rounded-xl hover:bg-[#EFEBE9] transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs - Pure Student Profile & Academics */}
        <div className="flex border-b border-[#EFEBE9] bg-[#FAF8F5] px-5 gap-4 overflow-x-auto text-xs">
          {[
            { id: 'profile', label: 'Student Profile', icon: <User className="w-3.5 h-3.5" /> },
            { id: 'academics', label: 'Academic & Attendance', icon: <Award className="w-3.5 h-3.5" /> },
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
          ) : errorMessage ? (
            <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-4 my-8">
              <div className="w-12 h-12 mx-auto rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-rose-900">Failed to Load Student Profile</h3>
                <p className="text-xs text-rose-700 mt-1 max-w-md mx-auto">{errorMessage}</p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={fetchDetails}
                  className="inline-flex items-center gap-1.5 bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry Loading
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-white hover:bg-rose-100/50 text-[#4E342E] border border-[#D7CCC8] text-xs font-semibold px-4 py-2 rounded-xl transition"
                >
                  Close
                </button>
              </div>
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

                  {/* Personal & Admission Grid */}
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
                        {student.address && (
                          <div className="flex justify-between pt-1 border-t border-[#EFEBE9]">
                            <span className="text-[#8D6E63]">Address:</span>
                            <span className="text-[#2D1E18] text-right max-w-xs">{student.address}</span>
                          </div>
                        )}
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
                        <div className="flex justify-between items-center py-0.5 bg-amber-50/60 -mx-1 px-1 rounded-lg border border-amber-200/50">
                          <span className="text-[#4E342E] font-bold">Student Created Date & Time:</span>
                          <span className="font-mono font-bold text-[#2D1E18]">{formatKolkataDateTime(student.createdAt)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#8D6E63]">Admitted By:</span>
                          <span className="font-semibold text-[#2D1E18]">
                            {student.createdByUser ? `${student.createdByUser.fullName} (${student.createdByUser.role})` : 'Academic Admin / System'}
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
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handlePhotoChange(file);
                              }}
                            />
                            📷 {student.photoUrl ? (uploadingPhoto ? 'Uploading...' : 'Replace Photo') : (uploadingPhoto ? 'Uploading...' : 'Upload Photo')}
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Guardian & Emergency Contact Details (Purely Informational, No Login/Passwords) */}
                  {student.parentRelations && student.parentRelations.length > 0 && (
                    <div className="bg-[#FDFBF7] p-4 rounded-2xl border border-[#D7CCC8]/70 space-y-3">
                      <h4 className="text-xs font-bold text-[#4E342E] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#EFEBE9] pb-2">
                        <Users className="w-3.5 h-3.5 text-[#6D4C41]" /> Guardian & Primary Contact Details
                      </h4>
                      <div className="space-y-3">
                        {student.parentRelations.map((rel: any) => {
                          const parentUser = rel.parent?.user;
                          return (
                            <div
                              key={rel.id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2 border-b border-[#EFEBE9] last:border-0 pb-2.5 last:pb-0"
                            >
                              <div>
                                <span className="font-bold text-[#2D1E18] text-sm">
                                  {parentUser?.fullName || 'Parent / Guardian'}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#EFEBE9] text-[#4E342E] border border-[#D7CCC8] ml-2">
                                  {rel.relation || 'Guardian'}
                                </span>
                                {rel.isPrimaryContact && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200 ml-1.5">
                                    Primary Contact
                                  </span>
                                )}
                              </div>
                              <div className="text-left sm:text-right">
                                <span className="font-mono font-bold text-[#2D1E18]">
                                  {parentUser?.phone || student.parentRelations?.[0]?.parent?.phone || 'No phone'}
                                </span>
                                {parentUser?.email && (
                                  <span className="text-[#8D6E63] text-[11px] block">{parentUser.email}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

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

              {/* TAB 2: ACADEMIC & ATTENDANCE SUMMARY */}
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
