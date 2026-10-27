import React, { useEffect, useState, useMemo } from 'react';
import { apiFetch } from '../services/api';
import { Student, Batch, StudentStatus } from '../types';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { StudentAvatar } from '../components/StudentAvatar';
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
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Users,
} from 'lucide-react';

export const StudentManagement: React.FC = () => {
  const { showToast } = useToast();
  const { activeInstitute } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [batchFilter, setBatchFilter] = useState<string>('');
  const [subjectFilter, setSubjectFilter] = useState<string>('');
  const [showAdmitModal, setShowAdmitModal] = useState(false);
  const [admitLoading, setAdmitLoading] = useState(false);
  const [admitError, setAdmitError] = useState<string | null>(null);
  const [showParentPassword, setShowParentPassword] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // View & Reset Student & Parent Credentials Modal State
  const [viewingStudentCreds, setViewingStudentCreds] = useState<any | null>(null);
  const [credsActiveTab, setCredsActiveTab] = useState<'student' | 'parent'>('student');
  const [showStudentExistingPassword, setShowStudentExistingPassword] = useState(false);
  const [showParentExistingPassword, setShowParentExistingPassword] = useState(false);
  const [resetStudentPasswordInput, setResetStudentPasswordInput] = useState('');
  const [resetParentPasswordInput, setResetParentPasswordInput] = useState('');
  const [showResetStudentInputPassword, setShowResetStudentInputPassword] = useState(true);
  const [showResetParentInputPassword, setShowResetParentInputPassword] = useState(true);
  const [credsResetLoading, setCredsResetLoading] = useState(false);
  const [credsResetError, setCredsResetError] = useState<string | null>(null);
  const [credsResetSuccess, setCredsResetSuccess] = useState<string | null>(null);
  const [copiedCredsKey, setCopiedCredsKey] = useState<string | null>(null);
  
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
    instituteCode: string;
    studentCredentials?: {
      fullName: string;
      admissionNumber: string;
      identifier: string;
      email?: string | null;
      phone?: string | null;
      temporaryPassword?: string;
    };
    parentCredentials?: {
      fullName: string;
      studentName: string;
      identifier: string;
      phone?: string | null;
      email?: string | null;
      isExistingAccount?: boolean;
      temporaryPassword?: string;
    };
  } | null>(null);

  const [showStudentPassword, setShowStudentPassword] = useState(false);
  const [showStudentCreatedPassword, setShowStudentCreatedPassword] = useState(false);
  const [showParentCreatedPassword, setShowParentCreatedPassword] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const copyFormattedCredentials = (
    role: string,
    fullName: string,
    identifier: string,
    pass?: string,
    instCode?: string,
    key = 'all'
  ) => {
    const code = instCode || activeInstitute?.code || 'INST';
    const text = `TuitionOS ${role} Login & Password
--------------------------------------
Account Name: ${fullName}
Role: ${role}
Institute Code: ${code}
Login Identifier: ${identifier}
${pass ? `Initial Password: ${pass}\n` : 'Account: Linked to existing verified parent account\n'}Login Portal: ${window.location.origin}
--------------------------------------
Important: Please keep these credentials confidential. Password must be changed upon first login.`;

    copyToClipboard(text, key);
  };

  const generateStrongPassword = (prefix = 'Pass') => {
    const chars = 'abcdefghijkmnpqrstuvwxyz';
    const nums = '23456789';
    const rand = (str: string, len: number) =>
      Array.from({ length: len }, () => str[Math.floor(Math.random() * str.length)]).join('');
    return `${prefix}#${rand(chars, 3)}${rand(nums, 4)}`;
  };

  const copyCredsToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCredsKey(key);
    setTimeout(() => {
      setCopiedCredsKey(null);
    }, 2000);
  };

  const copyFormattedStudentCredentials = (
    fullName: string,
    admNum: string,
    pass: string,
    instCode?: string,
    key = 'student_all'
  ) => {
    const code = instCode || activeInstitute?.code || 'INST';
    const text = `TuitionOS Student Login & Password
--------------------------------------
Student: ${fullName}
Role: Student
Institute Code: ${code}
Admission No / Login ID: ${admNum}
Password: ${pass}
Login Portal: ${window.location.origin}
--------------------------------------
Please keep this login and password safe. Use your Admission Number and Institute Code to log in.`;

    copyCredsToClipboard(text, key);
  };

  const copyFormattedParentCredentials = (
    parentName: string,
    studentName: string,
    phoneOrEmail: string,
    pass: string,
    instCode?: string,
    key = 'parent_all'
  ) => {
    const code = instCode || activeInstitute?.code || 'INST';
    const text = `TuitionOS Parent Login & Password
--------------------------------------
Parent / Guardian: ${parentName}
Student: ${studentName}
Role: Parent
Institute Code: ${code}
Login Phone / Email: ${phoneOrEmail}
Password: ${pass}
Login Portal: ${window.location.origin}
--------------------------------------
Please keep this login and password safe. Use your registered mobile number and Institute Code to log in.`;

    copyCredsToClipboard(text, key);
  };

  const handleOpenLoginCredentialsModal = (student: any) => {
    setViewingStudentCreds(student);
    setCredsActiveTab('student');
    setShowStudentExistingPassword(false);
    setShowParentExistingPassword(false);
    setResetStudentPasswordInput('');
    setResetParentPasswordInput('');
    setCredsResetError(null);
    setCredsResetSuccess(null);
  };

  const handleResetStudentPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingStudentCreds) return;
    try {
      setCredsResetLoading(true);
      setCredsResetError(null);
      setCredsResetSuccess(null);

      const res = await apiFetch(`/students/${viewingStudentCreds.id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({
          password: resetStudentPasswordInput || undefined,
        }),
      });

      const newPass = res.data?.permanentPassword || res.data?.temporaryPassword || resetStudentPasswordInput;

      setViewingStudentCreds((prev: any) => {
        if (!prev) return null;
        return {
          ...prev,
          credentialsOnRecord: {
            ...(prev.credentialsOnRecord || {}),
            studentPassword: newPass,
          },
        };
      });

      setResetStudentPasswordInput('');
      setShowStudentExistingPassword(true);
      setCredsResetSuccess('Student password updated successfully! The new password is now active.');
      showToast('Student password updated successfully', 'success');
      fetchData();
    } catch (err: any) {
      setCredsResetError(err.message || 'Failed to reset student password');
    } finally {
      setCredsResetLoading(false);
    }
  };

  const handleResetParentPassword = async (e: React.FormEvent, parentId: string) => {
    e.preventDefault();
    if (!viewingStudentCreds) return;
    try {
      setCredsResetLoading(true);
      setCredsResetError(null);
      setCredsResetSuccess(null);

      const res = await apiFetch(`/parents/${parentId}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({
          password: resetParentPasswordInput || undefined,
        }),
      });

      const newPass = res.data?.permanentPassword || res.data?.temporaryPassword || resetParentPasswordInput;

      setViewingStudentCreds((prev: any) => {
        if (!prev) return null;
        return {
          ...prev,
          credentialsOnRecord: {
            ...(prev.credentialsOnRecord || {}),
            parentPassword: newPass,
          },
        };
      });

      setResetParentPasswordInput('');
      setShowParentExistingPassword(true);
      setCredsResetSuccess('Parent password updated successfully! The new password is now active.');
      showToast('Parent password updated successfully', 'success');
      fetchData();
    } catch (err: any) {
      setCredsResetError(err.message || 'Failed to reset parent password');
    } finally {
      setCredsResetLoading(false);
    }
  };

  // Form State
  const initialFormData = {
    firstName: '',
    lastName: '',
    studentPhone: '',
    studentEmail: '',
    studentInitialPassword: '',
    dob: '',
    gender: 'MALE' as 'MALE' | 'FEMALE' | 'OTHER',
    bloodGroup: '',
    batchId: '',
    subjectIds: [] as string[],
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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setAdmitError('Photo file size must not exceed 5MB.');
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
      setAdmitError(null);
    }
  };

  const availableSubjectsForFilter = useMemo(() => {
    if (batchFilter) {
      const b = batches.find((x) => x.id === batchFilter);
      return b?.batchSubjects || [];
    }
    const map = new Map<string, any>();
    for (const b of batches) {
      for (const bs of b.batchSubjects || []) {
        if (!map.has(bs.subject.id)) {
          map.set(bs.subject.id, bs.subject);
        }
      }
    }
    return Array.from(map.values()).map((s) => ({ subject: s }));
  }, [batches, batchFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        search,
        ...(statusFilter && statusFilter !== 'ALL' ? { status: statusFilter } : {}),
        ...(batchFilter ? { batchId: batchFilter } : {}),
        ...(subjectFilter ? { subjectId: subjectFilter } : {}),
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
  }, [search, statusFilter, batchFilter, subjectFilter]);

  useEffect(() => {
    if (showAdmitModal) {
      apiFetch(`/students/admission-prefix${formData.batchId ? `?batchId=${formData.batchId}` : ''}`)
        .then((res) => {
          if (res.success && res.data) {
            setPrefixInfo(res.data);
          }
        })
        .catch(() => {});
    }
  }, [showAdmitModal, formData.batchId]);

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
      let uploadedPhotoKey: string | undefined = undefined;

      if (photoFile) {
        const photoFormData = new FormData();
        photoFormData.append('photo', photoFile);
        const upRes = await apiFetch('/students/upload-photo', {
          method: 'POST',
          body: photoFormData,
        });
        if (upRes.success && upRes.data?.photoStorageKey) {
          uploadedPhotoKey = upRes.data.photoStorageKey;
        }
      }

      const res = await apiFetch('/students', {
        method: 'POST',
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          studentPhone: formData.studentPhone.trim() || undefined,
          studentEmail: formData.studentEmail.trim() || undefined,
          studentInitialPassword: formData.studentInitialPassword.trim() || undefined,
          dob: formData.dob || undefined,
          gender: formData.gender,
          bloodGroup: formData.bloodGroup.trim() || undefined,
          batchId: formData.batchId || undefined,
          subjectIds: formData.subjectIds.length > 0 ? formData.subjectIds : undefined,
          photoUrl: uploadedPhotoKey,
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
        const studentCreds = res.data?.studentCredentials;
        const parentCreds = res.data?.parentCredentials;

        setAdmittedSuccess({
          admissionNumber: generatedNum,
          name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
          instituteCode: activeInstitute?.code || 'INST',
          studentCredentials: studentCreds ? {
            fullName: studentCreds.fullName || `${formData.firstName.trim()} ${formData.lastName.trim()}`,
            admissionNumber: studentCreds.admissionNumber || generatedNum,
            identifier: studentCreds.identifier || generatedNum,
            email: studentCreds.email,
            phone: studentCreds.phone,
            temporaryPassword: studentCreds.temporaryPassword,
          } : undefined,
          parentCredentials: parentCreds ? {
            fullName: parentCreds.fullName,
            studentName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
            identifier: parentCreds.identifier,
            phone: parentCreds.phone,
            email: parentCreds.email,
            isExistingAccount: parentCreds.isExistingAccount,
            temporaryPassword: parentCreds.temporaryPassword,
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

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#6D4C41] font-semibold">Batch:</span>
              <select
                value={batchFilter}
                onChange={(e) => {
                  setBatchFilter(e.target.value);
                  setSubjectFilter('');
                }}
                className="bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
              >
                <option value="">All Authorized Batches</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name} ({b.academicYear})</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#6D4C41] font-semibold">Subject:</span>
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
              >
                <option value="">All Subjects</option>
                {availableSubjectsForFilter.map((bs: any) => (
                  <option key={bs.subject.id} value={bs.subject.id}>
                    {bs.subject.name} {bs.subject.code ? `(${bs.subject.code})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Students Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#D7CCC8] text-[#6D4C41] bg-[#F7F2EF] uppercase tracking-wider">
                <th className="py-3 px-4 font-bold">Student Name</th>
                <th className="py-3 px-4 font-bold">Admission No</th>
                <th className="py-3 px-4 font-bold">Allocated Subjects</th>
                <th className="py-3 px-4 font-bold">Batch</th>
                <th className="py-3 px-4 font-bold">Linked Guardians</th>
                <th className="py-3 px-4 font-bold">Status</th>
                <th className="py-3 px-4 font-bold text-right">Login & Actions</th>
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
                      <div className="flex items-center gap-2.5">
                        <StudentAvatar
                          studentId={student.id}
                          photoUrl={student.photoUrl}
                          name={`${student.firstName} ${student.lastName}`}
                          size="sm"
                        />
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
                      className="py-3.5 px-4 text-[#5D4037]"
                      onClick={() => setSelectedStudentId(student.id)}
                    >
                      {student.enrollments?.filter((e: any) => e.subject).map((e: any) => e.subject.name).join(', ') || (
                        <span className="text-[#A1887F] italic">General Curriculum</span>
                      )}
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
                      <div className="inline-flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenLoginCredentialsModal(student)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-[#D7CCC8] bg-white text-[#4E342E] hover:bg-[#F7F2EF] hover:border-[#8D6E63] transition shadow-sm"
                          title="View or change student and parent login and password"
                        >
                          <Key className="w-3.5 h-3.5 text-[#8D6E63]" />
                          <span>Login & Password</span>
                        </button>
                        {student.status === 'ACTIVE' ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openStatusConfirm(student, 'PASSED_OUT')}
                              className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-purple-300 text-purple-800 hover:bg-purple-50 transition"
                            >
                              Mark Passed
                            </button>
                            <button
                              type="button"
                              onClick={() => openStatusConfirm(student, 'DISCONTINUED')}
                              className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-[#D7CCC8] text-[#6D4C41] hover:bg-[#F7F2EF] transition"
                            >
                              Discontinue
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openStatusConfirm(student, 'ACTIVE')}
                            className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-emerald-300 text-emerald-800 hover:bg-emerald-50 transition"
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
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
              {/* Student Photo Upload Section */}
              <div className="p-3.5 rounded-2xl bg-[#FDFBF7] border border-[#D7CCC8] flex items-center gap-4">
                <div className="relative shrink-0">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-[#8D6E63] shadow-sm"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-[#EFEBE9] text-[#8D6E63] border border-[#D7CCC8] flex flex-col items-center justify-center text-[10px] font-semibold text-center p-1">
                      <User className="w-6 h-6 mb-0.5 text-[#A1887F]" />
                      No Photo
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-1.5">
                  <span className="text-xs font-bold text-[#4E342E] block">Student Photograph (Optional)</span>
                  <p className="text-[11px] text-[#8D6E63]">
                    Upload JPG/PNG portrait or capture via camera (Max 5MB)
                  </p>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-semibold shadow-sm transition inline-flex items-center gap-1.5">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        capture="environment"
                        className="hidden"
                        onChange={handlePhotoSelect}
                      />
                      📷 {photoPreview ? 'Change Photo' : 'Select / Capture Photo'}
                    </label>
                    {photoPreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoFile(null);
                          setPhotoPreview(null);
                        }}
                        className="text-xs text-rose-700 hover:underline font-semibold"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

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
                        value={prefixInfo ? `${prefixInfo.previewFormat} (7-char scheme)` : 'Auto-generated on save'}
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#4E342E] mb-1">
                      Student Email (Optional)
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-[#8D6E63] absolute left-3 top-3" />
                      <input
                        type="email"
                        value={formData.studentEmail}
                        onChange={(e) => setFormData({ ...formData, studentEmail: e.target.value })}
                        placeholder="e.g. student@example.com"
                        className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl pl-8 pr-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#4E342E] mb-1">
                      Initial Student Password (Optional)
                    </label>
                    <div className="relative">
                      <Key className="w-3.5 h-3.5 text-[#8D6E63] absolute left-3 top-3" />
                      <input
                        type={showStudentPassword ? 'text' : 'password'}
                        value={formData.studentInitialPassword}
                        onChange={(e) => setFormData({ ...formData, studentInitialPassword: e.target.value })}
                        placeholder="Leave blank to auto-generate"
                        className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl pl-8 pr-9 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowStudentPassword(!showStudentPassword)}
                        className="absolute right-2.5 top-2.5 text-[#8D6E63] hover:text-[#4E342E]"
                      >
                        {showStudentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-[#8D6E63] mt-0.5">
                      Must be changed on student's initial login
                    </p>
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
                      onChange={(e) => setFormData({ ...formData, batchId: e.target.value, subjectIds: [] })}
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

                {/* Batch Subject Selection (if batch selected and subjects exist) */}
                {(() => {
                  const selectedBatch = batches.find((b) => b.id === formData.batchId);
                  const subjects = selectedBatch?.batchSubjects || [];
                  if (!formData.batchId || subjects.length === 0) return null;
                  return (
                    <div className="bg-[#EFEBE9]/40 border border-[#D7CCC8] rounded-xl p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold text-[#4E342E]">
                          Select Subjects to Allocate
                        </label>
                        <span className="text-[10px] text-[#8D6E63]">
                          {formData.subjectIds.length} of {subjects.length} selected
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {subjects.map((bs: any) => {
                          const isSelected = formData.subjectIds.includes(bs.subject.id);
                          return (
                            <button
                              key={bs.subject.id}
                              type="button"
                              onClick={() => {
                                const next = isSelected
                                  ? formData.subjectIds.filter((id) => id !== bs.subject.id)
                                  : [...formData.subjectIds, bs.subject.id];
                                setFormData({ ...formData, subjectIds: next });
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                                isSelected
                                  ? 'bg-[#4E342E] text-white shadow-xs'
                                  : 'bg-white border border-[#D7CCC8] text-[#5D4037] hover:bg-[#F7F2EF]'
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5" />}
                              <span>{bs.subject.name} {bs.subject.code ? `(${bs.subject.code})` : ''}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
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

      {/* Admission Success & Credentials Modal */}
      {admittedSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl w-full max-w-xl p-5 sm:p-6 shadow-2xl text-[#2D1E18] space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFEBE9]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-inner">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#2D1E18]">
                    Student Admitted & Credentials Created
                  </h3>
                  <p className="text-xs text-[#8D6E63]">{admittedSuccess.name}</p>
                </div>
              </div>
              <button
                onClick={() => setAdmittedSuccess(null)}
                className="text-[#8D6E63] hover:text-[#2D1E18] p-1.5 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Admission Number Highlight */}
            <div className="bg-[#FDFBF7] border-2 border-dashed border-[#8D6E63]/40 rounded-2xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold tracking-wider text-[#8D6E63] uppercase block">
                  Official Admission Number
                </span>
                <span className="text-xl font-mono font-black text-[#4E342E] tracking-wider select-all">
                  {admittedSuccess.admissionNumber}
                </span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(admittedSuccess.admissionNumber, 'admn_no')}
                className="px-2.5 py-1.5 rounded-xl bg-[#EFEBE9] hover:bg-[#D7CCC8] text-[#4E342E] transition flex items-center gap-1.5 text-xs font-semibold"
              >
                {copiedKey === 'admn_no' ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'admn_no' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* SECTION 1: Student Login Credentials */}
            {admittedSuccess.studentCredentials && (
              <div className="p-4 rounded-2xl bg-[#F7F2EF] border border-[#D7CCC8] space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#EFEBE9]">
                  <div className="flex items-center gap-1.5 font-bold text-[#4E342E] uppercase tracking-wider text-[11px]">
                    <Key className="w-3.5 h-3.5" /> Student Login Credentials
                  </div>
                  <span className="text-[10px] font-semibold bg-white border border-[#D7CCC8] text-[#4E342E] px-2 py-0.5 rounded-md">
                    Role: Student
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-[#6D4C41]">Student Name:</span>
                    <span className="font-semibold text-[#2D1E18]">{admittedSuccess.studentCredentials.fullName}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-[#6D4C41]">Institute Code:</span>
                    <span className="font-mono font-bold text-[#4E342E]">{admittedSuccess.instituteCode}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-[#6D4C41]">Login Username / ID:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-[#2D1E18] bg-white border border-[#D7CCC8] px-2 py-0.5 rounded select-all">
                        {admittedSuccess.studentCredentials.identifier}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(admittedSuccess.studentCredentials!.identifier, 'st_id')}
                        className="text-[#8D6E63] hover:text-[#2D1E18]"
                        title="Copy Login Identifier"
                      >
                        {copiedKey === 'st_id' ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {admittedSuccess.studentCredentials.temporaryPassword && (
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-[#6D4C41]">Initial Password:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded select-all">
                          {showStudentCreatedPassword
                            ? admittedSuccess.studentCredentials.temporaryPassword
                            : '••••••••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowStudentCreatedPassword(!showStudentCreatedPassword)}
                          className="text-[#8D6E63] hover:text-[#2D1E18]"
                        >
                          {showStudentCreatedPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(admittedSuccess.studentCredentials!.temporaryPassword!, 'st_pass')}
                          className="text-[#8D6E63] hover:text-[#2D1E18]"
                          title="Copy Password"
                        >
                          {copiedKey === 'st_pass' ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-[#EFEBE9] flex items-center justify-between">
                  <span className="text-[10px] text-[#8D6E63] italic">
                    Student must change temporary password upon initial login.
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      copyFormattedCredentials(
                        'Student',
                        admittedSuccess.studentCredentials!.fullName,
                        admittedSuccess.studentCredentials!.identifier,
                        admittedSuccess.studentCredentials!.temporaryPassword,
                        admittedSuccess.instituteCode,
                        'copy_student_full'
                      )
                    }
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#4E342E] hover:text-[#2D1E18] bg-white border border-[#D7CCC8] px-2.5 py-1 rounded-lg"
                  >
                    {copiedKey === 'copy_student_full' ? <Check className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'copy_student_full' ? 'Copied Student Login' : 'Copy Student Details'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* SECTION 2: Parent Login Credentials */}
            {admittedSuccess.parentCredentials && (
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-amber-200/60">
                  <div className="flex items-center gap-1.5 font-bold text-amber-950 uppercase tracking-wider text-[11px]">
                    <Shield className="w-3.5 h-3.5 text-amber-800" /> Parent Portal Credentials
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                    admittedSuccess.parentCredentials.isExistingAccount
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-white text-amber-900 border-amber-300'
                  }`}>
                    {admittedSuccess.parentCredentials.isExistingAccount ? 'Existing Account Linked' : 'New Account'}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-amber-900/80">Guardian Name:</span>
                    <span className="font-semibold text-[#2D1E18]">{admittedSuccess.parentCredentials.fullName}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-amber-900/80">Linked Student:</span>
                    <span className="font-semibold text-[#2D1E18]">{admittedSuccess.parentCredentials.studentName}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-amber-900/80">Login ID (Phone / Email):</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-[#2D1E18] bg-white border border-amber-200 px-2 py-0.5 rounded select-all">
                        {admittedSuccess.parentCredentials.identifier}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(admittedSuccess.parentCredentials!.identifier, 'pr_id')}
                        className="text-amber-800 hover:text-amber-950"
                        title="Copy Parent Login ID"
                      >
                        {copiedKey === 'pr_id' ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {admittedSuccess.parentCredentials.isExistingAccount ? (
                    <div className="p-2 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-800 text-[11px] flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span>
                        Guardian already has an active account for a sibling. Existing login and password remain unchanged.
                      </span>
                    </div>
                  ) : admittedSuccess.parentCredentials.temporaryPassword ? (
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-amber-900/80">Initial Password:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded select-all">
                          {showParentCreatedPassword
                            ? admittedSuccess.parentCredentials.temporaryPassword
                            : '••••••••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowParentCreatedPassword(!showParentCreatedPassword)}
                          className="text-amber-800 hover:text-amber-950"
                        >
                          {showParentCreatedPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(admittedSuccess.parentCredentials!.temporaryPassword!, 'pr_pass')}
                          className="text-amber-800 hover:text-amber-950"
                          title="Copy Password"
                        >
                          {copiedKey === 'pr_pass' ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between">
                  <span className="text-[10px] text-amber-900/70 italic">
                    {admittedSuccess.parentCredentials.isExistingAccount
                      ? 'Parent can log in immediately with their existing credentials.'
                      : 'Parent must change temporary password upon first login.'}
                  </span>
                  {!admittedSuccess.parentCredentials.isExistingAccount && (
                    <button
                      type="button"
                      onClick={() =>
                        copyFormattedCredentials(
                          'Parent',
                          admittedSuccess.parentCredentials!.fullName,
                          admittedSuccess.parentCredentials!.identifier,
                          admittedSuccess.parentCredentials!.temporaryPassword,
                          admittedSuccess.instituteCode,
                          'copy_parent_full'
                        )
                      }
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900 hover:text-amber-950 bg-white border border-amber-300 px-2.5 py-1 rounded-lg"
                    >
                      {copiedKey === 'copy_parent_full' ? <Check className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'copy_parent_full' ? 'Copied Parent Login' : 'Copy Parent Details'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Modal Bottom Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => {
                  const inst = admittedSuccess.instituteCode;
                  const st = admittedSuccess.studentCredentials;
                  const pr = admittedSuccess.parentCredentials;
                  const text = `TuitionOS Admission Credentials (${admittedSuccess.name})
Institute Code: ${inst}
Portal: ${window.location.origin}
======================================
1. STUDENT LOGIN
Name: ${st?.fullName || admittedSuccess.name}
Admission No: ${admittedSuccess.admissionNumber}
Login ID: ${st?.identifier || admittedSuccess.admissionNumber}
${st?.temporaryPassword ? `Temporary Password: ${st.temporaryPassword}\n` : ''}
2. PARENT LOGIN
Guardian: ${pr?.fullName || 'Registered Guardian'}
Login ID: ${pr?.identifier || 'Registered Phone'}
${pr?.isExistingAccount ? 'Account: Existing verified parent account\n' : pr?.temporaryPassword ? `Temporary Password: ${pr.temporaryPassword}\n` : ''}======================================
Please keep credentials safe. Passwords must be changed upon first login.`;
                  copyToClipboard(text, 'copy_all');
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-[#F7F2EF] hover:bg-[#EFEBE9] border border-[#D7CCC8] text-[#4E342E] text-xs font-semibold py-2.5 px-4 rounded-xl transition shadow-sm"
              >
                {copiedKey === 'copy_all' ? <Check className="w-4 h-4 text-emerald-700" /> : <Copy className="w-4 h-4" />}
                <span>{copiedKey === 'copy_all' ? 'Copied Full Credentials Package!' : 'Copy All Login Credentials'}</span>
              </button>
              <button
                type="button"
                onClick={() => setAdmittedSuccess(null)}
                className="bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-bold py-2.5 px-6 rounded-xl transition shadow-md"
              >
                Done & Close
              </button>
            </div>
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

      {/* Student & Parent Login & Password Modal */}
      {viewingStudentCreds && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto shadow-2xl text-[#2D1E18]">
            <div className="flex items-center justify-between pb-4 border-b border-[#EFEBE9]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#F7F2EF] border border-[#D7CCC8] flex items-center justify-center text-[#4E342E]">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#2D1E18]">Student & Parent Login & Password</h2>
                  <p className="text-xs text-[#6D4C41]">
                    Manage login credentials for {viewingStudentCreds.firstName} {viewingStudentCreds.lastName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingStudentCreds(null)}
                className="text-[#8D6E63] hover:text-[#2D1E18] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Credential Role Tabs */}
            <div className="flex border-b border-[#EFEBE9] mt-3">
              <button
                type="button"
                onClick={() => {
                  setCredsActiveTab('student');
                  setCredsResetError(null);
                  setCredsResetSuccess(null);
                }}
                className={`pb-2.5 px-4 text-xs font-bold transition-all relative flex items-center gap-1.5 ${
                  credsActiveTab === 'student'
                    ? 'text-[#4E342E] border-b-2 border-[#4E342E]'
                    : 'text-[#8D6E63] hover:text-[#4E342E]'
                }`}
              >
                <span>🎓 Student Account</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCredsActiveTab('parent');
                  setCredsResetError(null);
                  setCredsResetSuccess(null);
                }}
                className={`pb-2.5 px-4 text-xs font-bold transition-all relative flex items-center gap-1.5 ${
                  credsActiveTab === 'parent'
                    ? 'text-[#4E342E] border-b-2 border-[#4E342E]'
                    : 'text-[#8D6E63] hover:text-[#4E342E]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Parent / Guardian Account</span>
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {credsResetSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{credsResetSuccess}</span>
                </div>
              )}

              {credsResetError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs">
                  {credsResetError}
                </div>
              )}

              {credsActiveTab === 'student' ? (
                <>
                  {/* Student Profile & Credential Card */}
                  <div className="p-3.5 rounded-2xl bg-[#F7F2EF] border border-[#D7CCC8] space-y-2 text-xs">
                    <div className="flex justify-between items-center py-0.5 border-b border-[#EFEBE9]">
                      <span className="text-[#6D4C41]">Institute Code:</span>
                      <span className="font-mono font-bold text-[#4E342E]">
                        {activeInstitute?.code || 'INST'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-[#EFEBE9]">
                      <span className="text-[#6D4C41]">Student Name:</span>
                      <span className="font-semibold text-[#2D1E18]">
                        {viewingStudentCreds.firstName} {viewingStudentCreds.lastName}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-[#EFEBE9]">
                      <span className="text-[#6D4C41]">Admission No / Login ID:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-[#2D1E18] select-all">
                          {viewingStudentCreds.admissionNumber}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            copyCredsToClipboard(viewingStudentCreds.admissionNumber, 'view_adm')
                          }
                          className="text-[#8D6E63] hover:text-[#2D1E18]"
                          title="Copy admission number"
                        >
                          {copiedCredsKey === 'view_adm' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                    {viewingStudentCreds.user?.email && (
                      <div className="flex justify-between items-center py-0.5 border-b border-[#EFEBE9]">
                        <span className="text-[#6D4C41]">Login Email:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-[#2D1E18] select-all">
                            {viewingStudentCreds.user.email}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              copyCredsToClipboard(viewingStudentCreds.user.email, 'view_stud_email')
                            }
                            className="text-[#8D6E63] hover:text-[#2D1E18]"
                            title="Copy email"
                          >
                            {copiedCredsKey === 'view_stud_email' ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-[#6D4C41]">Permanent Password:</span>
                      {viewingStudentCreds.credentialsOnRecord?.studentPassword ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#2D1E18] bg-white border border-[#D7CCC8] px-2 py-0.5 rounded text-xs select-all">
                            {showStudentExistingPassword
                              ? viewingStudentCreds.credentialsOnRecord.studentPassword
                              : '••••••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowStudentExistingPassword(!showStudentExistingPassword)}
                            className="text-[#8D6E63] hover:text-[#2D1E18]"
                            title={showStudentExistingPassword ? 'Hide password' : 'Show password'}
                          >
                            {showStudentExistingPassword ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              copyCredsToClipboard(
                                viewingStudentCreds.credentialsOnRecord.studentPassword,
                                'view_stud_pass'
                              )
                            }
                            className="text-[#8D6E63] hover:text-emerald-700"
                            title="Copy password"
                          >
                            {copiedCredsKey === 'view_stud_pass' ? (
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

                  {/* Copy Full Student Credentials */}
                  {viewingStudentCreds.credentialsOnRecord?.studentPassword && (
                    <button
                      type="button"
                      onClick={() =>
                        copyFormattedStudentCredentials(
                          `${viewingStudentCreds.firstName} ${viewingStudentCreds.lastName}`,
                          viewingStudentCreds.admissionNumber,
                          viewingStudentCreds.credentialsOnRecord.studentPassword,
                          activeInstitute?.code,
                          'stud_full_copy'
                        )
                      }
                      className="w-full inline-flex items-center justify-center gap-2 bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-semibold py-2.5 px-4 rounded-xl shadow transition"
                    >
                      {copiedCredsKey === 'stud_full_copy' ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      {copiedCredsKey === 'stud_full_copy'
                        ? 'Copied Student Login & Password!'
                        : 'Copy Student Login & Password to Give to Student'}
                    </button>
                  )}

                  {/* Set / Change Permanent Password for Student */}
                  <form
                    onSubmit={handleResetStudentPassword}
                    className="p-4 rounded-2xl border border-[#D7CCC8] space-y-3 bg-white"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-[#4E342E] flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 text-[#8D6E63]" /> Set / Change Permanent Password
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setResetStudentPasswordInput(generateStrongPassword('Stud'));
                          setShowResetStudentInputPassword(true);
                        }}
                        className="text-[11px] text-[#4E342E] hover:text-[#2D1E18] font-bold flex items-center gap-1 bg-[#F7F2EF] border border-[#D7CCC8] px-2 py-0.5 rounded-md hover:bg-[#EFEBE9] transition"
                      >
                        <Sparkles className="w-3 h-3 text-[#8D6E63]" /> Auto-generate
                      </button>
                    </div>

                    <div className="relative">
                      <Key className="w-4 h-4 text-[#8D6E63] absolute left-3 top-2.5" />
                      <input
                        type={showResetStudentInputPassword ? 'text' : 'password'}
                        value={resetStudentPasswordInput}
                        onChange={(e) => setResetStudentPasswordInput(e.target.value)}
                        placeholder="Type new password (or click Auto-generate)..."
                        className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl pl-9 pr-10 py-2 text-xs font-mono text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetStudentInputPassword(!showResetStudentInputPassword)}
                        className="absolute right-3 top-2.5 text-[#8D6E63] hover:text-[#2D1E18]"
                        title={showResetStudentInputPassword ? 'Hide password' : 'Show password'}
                      >
                        {showResetStudentInputPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <p className="text-[11px] text-[#6D4C41]">
                      Updating this will immediately replace the student login password. They can use this new
                      permanent password right away.
                    </p>

                    <div className="pt-1 flex justify-end">
                      <button
                        type="submit"
                        disabled={credsResetLoading || !resetStudentPasswordInput.trim()}
                        className="inline-flex items-center gap-1.5 bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-semibold px-4 py-2 rounded-xl shadow transition disabled:opacity-50"
                      >
                        {credsResetLoading ? 'Saving...' : 'Save Permanent Password'}
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <>
                  {/* Parent Profile & Credential Card */}
                  {viewingStudentCreds.parentRelations && viewingStudentCreds.parentRelations.length > 0 ? (
                    (() => {
                      const rel = viewingStudentCreds.parentRelations[0];
                      const parentUser = rel?.parent?.user;
                      const parentId = rel?.parent?.id;
                      const loginIdentifier = parentUser?.phone || parentUser?.email || '';

                      return (
                        <>
                          <div className="p-3.5 rounded-2xl bg-[#F7F2EF] border border-[#D7CCC8] space-y-2 text-xs">
                            <div className="flex justify-between items-center py-0.5 border-b border-[#EFEBE9]">
                              <span className="text-[#6D4C41]">Institute Code:</span>
                              <span className="font-mono font-bold text-[#4E342E]">
                                {activeInstitute?.code || 'INST'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-0.5 border-b border-[#EFEBE9]">
                              <span className="text-[#6D4C41]">Guardian Name:</span>
                              <span className="font-semibold text-[#2D1E18]">
                                {parentUser?.fullName} ({rel.relation})
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-0.5 border-b border-[#EFEBE9]">
                              <span className="text-[#6D4C41]">Parent Login Phone / ID:</span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-[#2D1E18] select-all">
                                  {loginIdentifier}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => copyCredsToClipboard(loginIdentifier, 'view_parent_id')}
                                  className="text-[#8D6E63] hover:text-[#2D1E18]"
                                  title="Copy phone/login"
                                >
                                  {copiedCredsKey === 'view_parent_id' ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>
                            {parentUser?.email && (
                              <div className="flex justify-between items-center py-0.5 border-b border-[#EFEBE9]">
                                <span className="text-[#6D4C41]">Parent Email:</span>
                                <span className="font-mono text-[#2D1E18]">{parentUser.email}</span>
                              </div>
                            )}
                            <div className="flex justify-between items-center py-0.5">
                              <span className="text-[#6D4C41]">Permanent Password:</span>
                              {viewingStudentCreds.credentialsOnRecord?.parentPassword ? (
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-[#2D1E18] bg-white border border-[#D7CCC8] px-2 py-0.5 rounded text-xs select-all">
                                    {showParentExistingPassword
                                      ? viewingStudentCreds.credentialsOnRecord.parentPassword
                                      : '••••••••••••'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setShowParentExistingPassword(!showParentExistingPassword)}
                                    className="text-[#8D6E63] hover:text-[#2D1E18]"
                                    title={showParentExistingPassword ? 'Hide password' : 'Show password'}
                                  >
                                    {showParentExistingPassword ? (
                                      <EyeOff className="w-3.5 h-3.5" />
                                    ) : (
                                      <Eye className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      copyCredsToClipboard(
                                        viewingStudentCreds.credentialsOnRecord.parentPassword,
                                        'view_parent_pass'
                                      )
                                    }
                                    className="text-[#8D6E63] hover:text-emerald-700"
                                    title="Copy password"
                                  >
                                    {copiedCredsKey === 'view_parent_pass' ? (
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

                          {/* Copy Full Parent Credentials */}
                          {viewingStudentCreds.credentialsOnRecord?.parentPassword && (
                            <button
                              type="button"
                              onClick={() =>
                                copyFormattedParentCredentials(
                                  parentUser?.fullName || 'Parent',
                                  `${viewingStudentCreds.firstName} ${viewingStudentCreds.lastName}`,
                                  loginIdentifier,
                                  viewingStudentCreds.credentialsOnRecord.parentPassword,
                                  activeInstitute?.code,
                                  'parent_full_copy'
                                )
                              }
                              className="w-full inline-flex items-center justify-center gap-2 bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-semibold py-2.5 px-4 rounded-xl shadow transition"
                            >
                              {copiedCredsKey === 'parent_full_copy' ? (
                                <Check className="w-4 h-4" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                              {copiedCredsKey === 'parent_full_copy'
                                ? 'Copied Parent Login & Password!'
                                : 'Copy Parent Login & Password to Give to Parent'}
                            </button>
                          )}

                          {/* Set / Change Permanent Password for Parent */}
                          <form
                            onSubmit={(e) => handleResetParentPassword(e, parentId)}
                            className="p-4 rounded-2xl border border-[#D7CCC8] space-y-3 bg-white"
                          >
                            <div className="flex items-center justify-between">
                              <h3 className="text-xs font-bold text-[#4E342E] flex items-center gap-1.5">
                                <RefreshCw className="w-3.5 h-3.5 text-[#8D6E63]" /> Set / Change Permanent Password
                              </h3>
                              <button
                                type="button"
                                onClick={() => {
                                  setResetParentPasswordInput(generateStrongPassword('Parent'));
                                  setShowResetParentInputPassword(true);
                                }}
                                className="text-[11px] text-[#4E342E] hover:text-[#2D1E18] font-bold flex items-center gap-1 bg-[#F7F2EF] border border-[#D7CCC8] px-2 py-0.5 rounded-md hover:bg-[#EFEBE9] transition"
                              >
                                <Sparkles className="w-3 h-3 text-[#8D6E63]" /> Auto-generate
                              </button>
                            </div>

                            <div className="relative">
                              <Key className="w-4 h-4 text-[#8D6E63] absolute left-3 top-2.5" />
                              <input
                                type={showResetParentInputPassword ? 'text' : 'password'}
                                value={resetParentPasswordInput}
                                onChange={(e) => setResetParentPasswordInput(e.target.value)}
                                placeholder="Type new password (or click Auto-generate)..."
                                className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl pl-9 pr-10 py-2 text-xs font-mono text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                              />
                              <button
                                type="button"
                                onClick={() => setShowResetParentInputPassword(!showResetParentInputPassword)}
                                className="absolute right-3 top-2.5 text-[#8D6E63] hover:text-[#2D1E18]"
                                title={showResetParentInputPassword ? 'Hide password' : 'Show password'}
                              >
                                {showResetParentInputPassword ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>
                            </div>

                            <p className="text-[11px] text-[#6D4C41]">
                              Updating this will immediately replace the parent login password. They can use this new
                              permanent password right away.
                            </p>

                            <div className="pt-1 flex justify-end">
                              <button
                                type="submit"
                                disabled={credsResetLoading || !resetParentPasswordInput.trim()}
                                className="inline-flex items-center gap-1.5 bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-semibold px-4 py-2 rounded-xl shadow transition disabled:opacity-50"
                              >
                                {credsResetLoading ? 'Saving...' : 'Save Permanent Password'}
                              </button>
                            </div>
                          </form>
                        </>
                      );
                    })()
                  ) : (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                      No parent or guardian is currently linked to this student record. You can link a guardian during
                      admission or edit the student profile.
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setViewingStudentCreds(null)}
                  className="px-4 py-2 text-xs font-semibold text-[#6D4C41] hover:text-[#2D1E18]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

