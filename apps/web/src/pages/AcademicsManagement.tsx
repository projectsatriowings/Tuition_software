import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '../services/api';
import { Batch, Subject } from '../types';
import { useToast } from '../context/ToastContext';
import { ConfirmationModal } from '../components/ConfirmationModal';
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
  status: string;
}

export const AcademicsManagement: React.FC = () => {
  const { success, error, info } = useToast();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [availableStaff, setAvailableStaff] = useState<StaffOption[]>([]);
  const [instituteStudents, setInstituteStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Active view tab: 'batches' | 'subjects'
  const [mainTab, setMainTab] = useState<'batches' | 'subjects'>('batches');

  // Modals
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);

  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  // Manage Batch Detail Drawer / Modal
  const [selectedBatchDetails, setSelectedBatchDetails] = useState<Batch | null>(null);
  const [batchDetailTab, setBatchDetailTab] = useState<'roster' | 'subjects' | 'staff'>('roster');
  const [batchDetailLoading, setBatchDetailLoading] = useState(false);

  // Confirmation Modals
  const [confirmDeactivate, setConfirmDeactivate] = useState<{ isOpen: boolean; batch: Batch | null }>({
    isOpen: false,
    batch: null,
  });
  const [confirmDeleteSubject, setConfirmDeleteSubject] = useState<{ isOpen: boolean; subject: Subject | null }>({
    isOpen: false,
    subject: null,
  });

  // Action modals inside Batch Details
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedStudentToEnroll, setSelectedStudentToEnroll] = useState('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  const [showAssignSubjectModal, setShowAssignSubjectModal] = useState(false);
  const [selectedSubjectToAssign, setSelectedSubjectToAssign] = useState('');

  const [showAssignStaffModal, setShowAssignStaffModal] = useState(false);
  const [selectedStaffToAssign, setSelectedStaffToAssign] = useState('');

  // Form states
  const [batchForm, setBatchForm] = useState({
    name: '',
    academicYear: '2026-2027',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
  });

  const [subjectForm, setSubjectForm] = useState({
    name: '',
    code: '',
    description: '',
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [batchesRes, subjectsRes, staffRes, studentsRes] = await Promise.all([
        apiFetch('/academics/batches'),
        apiFetch('/academics/subjects'),
        apiFetch('/academics/staff').catch(() => ({ data: { staff: [] } })),
        apiFetch('/students?status=ACTIVE').catch(() => ({ data: { students: [] } })),
      ]);

      setBatches(batchesRes.data?.batches || []);
      setSubjects(subjectsRes.data?.subjects || []);
      setAvailableStaff(staffRes.data?.staff || []);
      setInstituteStudents(studentsRes.data?.students || []);
    } catch (err: any) {
      error(err.message || 'Failed to load academics data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load detailed batch roster & curriculum
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
      academicYear: b.academicYear,
      startDate: b.startDate ? new Date(b.startDate).toISOString().split('T')[0] : '',
      endDate: b.endDate ? new Date(b.endDate).toISOString().split('T')[0] : '',
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
          body: JSON.stringify(batchForm),
        });
        if (res.success) {
          success(`Batch '${batchForm.name}' updated successfully`);
          setShowBatchModal(false);
          setEditingBatch(null);
          fetchData();
          if (selectedBatchDetails?.id === editingBatch.id) {
            loadBatchDetails(editingBatch.id);
          }
        }
      } else {
        const res = await apiFetch('/academics/batches', {
          method: 'POST',
          body: JSON.stringify(batchForm),
        });
        if (res.success) {
          success(`Batch '${batchForm.name}' created successfully`);
          setShowBatchModal(false);
          setBatchForm({
            name: '',
            academicYear: '2026-2027',
            startDate: new Date().toISOString().split('T')[0],
            endDate: '',
          });
          fetchData();
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

  // Save Subject (Create or Edit)
  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSubject) {
        const res = await apiFetch(`/academics/subjects/${editingSubject.id}`, {
          method: 'PUT',
          body: JSON.stringify(subjectForm),
        });
        if (res.success) {
          success(`Subject '${subjectForm.name}' updated successfully`);
          setShowSubjectModal(false);
          setEditingSubject(null);
          fetchData();
        }
      } else {
        const res = await apiFetch('/academics/subjects', {
          method: 'POST',
          body: JSON.stringify(subjectForm),
        });
        if (res.success) {
          success(`Subject '${subjectForm.name}' added to catalog`);
          setShowSubjectModal(false);
          setSubjectForm({ name: '', code: '', description: '' });
          fetchData();
        }
      }
    } catch (err: any) {
      error(err.message || 'Failed to save subject');
    }
  };

  // Delete Subject
  const handleDeleteSubject = async () => {
    if (!confirmDeleteSubject.subject) return;
    try {
      const res = await apiFetch(`/academics/subjects/${confirmDeleteSubject.subject.id}`, {
        method: 'DELETE',
      });
      if (res.success) {
        success(`Subject '${confirmDeleteSubject.subject.name}' deleted successfully`);
        setConfirmDeleteSubject({ isOpen: false, subject: null });
        fetchData();
      }
    } catch (err: any) {
      error(err.message || 'Failed to delete subject');
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

  // Assign Subject to Batch
  const handleAssignSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchDetails || !selectedSubjectToAssign) return;
    try {
      const res = await apiFetch(`/academics/batches/${selectedBatchDetails.id}/subjects`, {
        method: 'POST',
        body: JSON.stringify({ subjectId: selectedSubjectToAssign }),
      });
      if (res.success) {
        success('Subject assigned to batch curriculum');
        setShowAssignSubjectModal(false);
        setSelectedSubjectToAssign('');
        loadBatchDetails(selectedBatchDetails.id);
        fetchData();
      }
    } catch (err: any) {
      error(err.message || 'Failed to assign subject');
    }
  };

  // Remove Subject from Batch
  const handleRemoveSubject = async (subjectId: string, subjectName: string) => {
    if (!selectedBatchDetails) return;
    try {
      const res = await apiFetch(`/academics/batches/${selectedBatchDetails.id}/subjects/${subjectId}`, {
        method: 'DELETE',
      });
      if (res.success) {
        success(`Subject '${subjectName}' removed from batch`);
        loadBatchDetails(selectedBatchDetails.id);
        fetchData();
      }
    } catch (err: any) {
      error(err.message || 'Failed to remove subject from batch');
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

  // Students eligible for enrollment in selected batch
  const enrolledStudentIds = new Set(selectedBatchDetails?.enrollments?.map((e) => e.student.id) || []);
  const availableStudentsForEnroll = instituteStudents.filter(
    (s) =>
      !enrolledStudentIds.has(s.id) &&
      (s.firstName.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
        s.lastName.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
        s.admissionNumber.toLowerCase().includes(studentSearchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EFEBE9]">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2D1E18] tracking-tight">Academic Batches & Curriculum</h1>
          <p className="text-sm text-[#6D4C41] mt-1">
            Configure classes, manage curriculum subjects, assign faculty, and enroll students
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setEditingSubject(null);
              setSubjectForm({ name: '', code: '', description: '' });
              setShowSubjectModal(true);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white hover:bg-[#F7F2EF] text-[#4E342E] border border-[#D7CCC8] px-3.5 py-2 rounded-xl shadow-sm transition"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#6D4C41]" />
            <span>Add Subject</span>
          </button>

          <button
            onClick={() => {
              setEditingBatch(null);
              setBatchForm({
                name: '',
                academicYear: '2026-2027',
                startDate: new Date().toISOString().split('T')[0],
                endDate: '',
              });
              setShowBatchModal(true);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#4E342E] hover:bg-[#3E2723] text-white px-4 py-2 rounded-xl shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Batch</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#EFEBE9] pb-1">
        <button
          onClick={() => setMainTab('batches')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition ${
            mainTab === 'batches'
              ? 'bg-[#4E342E] text-white shadow-sm'
              : 'text-[#6D4C41] hover:text-[#2D1E18] hover:bg-[#F7F2EF]'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Academic Batches ({batches.length})</span>
        </button>
        <button
          onClick={() => setMainTab('subjects')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition ${
            mainTab === 'subjects'
              ? 'bg-[#4E342E] text-white shadow-sm'
              : 'text-[#6D4C41] hover:text-[#2D1E18] hover:bg-[#F7F2EF]'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Subjects Catalog ({subjects.length})</span>
        </button>
      </div>

      {/* TAB 1: BATCHES */}
      {mainTab === 'batches' && (
        <div className="space-y-4">
          {loading ? (
            <div className="py-16 text-center text-sm text-[#6D4C41]">Loading academic batches...</div>
          ) : batches.length === 0 ? (
            /* Helpful Empty State */
            <div className="p-12 text-center rounded-3xl bg-white border border-[#D7CCC8] shadow-sm max-w-xl mx-auto space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[#FAF7F2] border border-[#D7CCC8] flex items-center justify-center text-[#4E342E]">
                <Layers className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#2D1E18]">No Academic Batches Found</h3>
                <p className="text-xs text-[#6D4C41] mt-1.5 leading-relaxed">
                  Batches organize your students into academic sections (e.g. "Class 10 - Batch A 2026-27"). Once created,
                  you can assign subjects, designate faculty, and track voice attendance.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingBatch(null);
                  setBatchForm({
                    name: '',
                    academicYear: '2026-2027',
                    startDate: new Date().toISOString().split('T')[0],
                    endDate: '',
                  });
                  setShowBatchModal(true);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#4E342E] hover:bg-[#3E2723] text-white px-4 py-2 rounded-xl shadow-md transition"
              >
                <Plus className="w-4 h-4" /> Create First Batch
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {batches.map((b) => (
                <div
                  key={b.id}
                  className={`rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md flex flex-col justify-between ${
                    b.isActive ? 'border-[#D7CCC8]' : 'border-neutral-300 opacity-75 bg-[#FAF7F2]'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-bold text-[#2D1E18] tracking-tight">{b.name}</h3>
                        <span className="inline-block mt-0.5 text-xs font-mono font-medium text-[#6D4C41]">
                          Year: {b.academicYear}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          b.isActive
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-neutral-100 text-neutral-600 border-neutral-300'
                        }`}
                      >
                        {b.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>

                    {/* Stats bar */}
                    <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-[#FAF7F2] rounded-xl border border-[#EFEBE9] text-center">
                      <div>
                        <span className="block text-[10px] font-semibold text-[#8D6E63] uppercase">Students</span>
                        <span className="text-sm font-bold text-[#2D1E18]">{b._count?.enrollments || 0}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-semibold text-[#8D6E63] uppercase">Subjects</span>
                        <span className="text-sm font-bold text-[#2D1E18]">{b.batchSubjects?.length || b._count?.batchSubjects || 0}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-semibold text-[#8D6E63] uppercase">Faculty</span>
                        <span className="text-sm font-bold text-[#2D1E18]">{b.staffAssignments?.length || b._count?.staffAssignments || 0}</span>
                      </div>
                    </div>

                    {/* Subjects tags */}
                    {b.batchSubjects && b.batchSubjects.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-[#6D4C41] uppercase tracking-wider">Curriculum:</span>
                        <div className="flex flex-wrap gap-1">
                          {b.batchSubjects.map((bs) => (
                            <span
                              key={bs.id}
                              className="text-[11px] bg-white border border-[#D7CCC8] text-[#4E342E] px-2 py-0.5 rounded-lg font-medium"
                            >
                              {bs.subject.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Faculty chips */}
                    {b.staffAssignments && b.staffAssignments.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-[#6D4C41] uppercase tracking-wider">Assigned Faculty:</span>
                        <div className="flex flex-wrap gap-1">
                          {b.staffAssignments.map((sa) => (
                            <span
                              key={sa.id}
                              className="text-[11px] bg-[#EFEBE9] text-[#4E342E] px-2 py-0.5 rounded-lg font-semibold"
                            >
                              {sa.staffProfile.user.fullName}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-4 mt-4 border-t border-[#EFEBE9] flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setSelectedBatchDetails(b);
                        loadBatchDetails(b.id);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4E342E] hover:text-[#2D1E18] bg-[#F7F2EF] hover:bg-[#EFEBE9] px-3 py-1.5 rounded-xl border border-[#D7CCC8] transition"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Manage Roster & Curriculum</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditBatch(b)}
                        title="Edit Batch Information"
                        className="p-1.5 text-[#6D4C41] hover:text-[#2D1E18] hover:bg-[#FAF7F2] rounded-lg transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setConfirmDeactivate({ isOpen: true, batch: b })}
                        title={b.isActive ? 'Deactivate Batch' : 'Reactivate Batch'}
                        className={`p-1.5 rounded-lg transition ${
                          b.isActive
                            ? 'text-[#8D6E63] hover:text-rose-700 hover:bg-rose-50'
                            : 'text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SUBJECTS CATALOG */}
      {mainTab === 'subjects' && (
        <div className="space-y-4">
          {loading ? (
            <div className="py-16 text-center text-sm text-[#6D4C41]">Loading subjects catalog...</div>
          ) : subjects.length === 0 ? (
            /* Helpful Empty State */
            <div className="p-12 text-center rounded-3xl bg-white border border-[#D7CCC8] shadow-sm max-w-xl mx-auto space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[#FAF7F2] border border-[#D7CCC8] flex items-center justify-center text-[#6D4C41]">
                <BookOpen className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#2D1E18]">No Subjects in Catalog</h3>
                <p className="text-xs text-[#6D4C41] mt-1.5 leading-relaxed">
                  Add the subjects taught at your institute (e.g. "Physics", "Mathematics", "English"). You can then assign
                  them to multiple academic batches to form their curriculum.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingSubject(null);
                  setSubjectForm({ name: '', code: '', description: '' });
                  setShowSubjectModal(true);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#4E342E] hover:bg-[#3E2723] text-white px-4 py-2 rounded-xl shadow-md transition"
              >
                <Plus className="w-4 h-4" /> Add First Subject
              </button>
            </div>
          ) : (
            <div className="bg-white border border-[#D7CCC8] rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#FAF7F2] border-b border-[#EFEBE9] text-[#6D4C41]">
                    <th className="py-3 px-4 font-bold">Subject Name</th>
                    <th className="py-3 px-4 font-bold">Code</th>
                    <th className="py-3 px-4 font-bold">Description</th>
                    <th className="py-3 px-4 font-bold text-center">Linked Batches</th>
                    <th className="py-3 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFEBE9]">
                  {subjects.map((s) => (
                    <tr key={s.id} className="hover:bg-[#FDFBF7] transition-colors">
                      <td className="py-3.5 px-4 font-bold text-[#2D1E18]">
                        <div className="flex items-center gap-2">
                          <BookMarked className="w-4 h-4 text-[#8D6E63]" />
                          <span>{s.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-[#4E342E]">
                        {s.code || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-[#6D4C41] max-w-xs truncate">
                        {s.description || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold text-[#2D1E18]">
                        {s._count?.batchSubjects ?? 0}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditingSubject(s);
                              setSubjectForm({
                                name: s.name,
                                code: s.code || '',
                                description: s.description || '',
                              });
                              setShowSubjectModal(true);
                            }}
                            className="p-1.5 text-[#6D4C41] hover:text-[#2D1E18] hover:bg-[#FAF7F2] rounded-lg transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteSubject({ isOpen: true, subject: s })}
                            className="p-1.5 text-[#8D6E63] hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
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

      {/* DRAWER / MODAL: MANAGE BATCH DETAILS (Roster, Curriculum, Staff) */}
      {selectedBatchDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl w-full max-w-4xl p-6 shadow-2xl text-[#2D1E18] max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#EFEBE9]">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-[#2D1E18]">{selectedBatchDetails.name}</h2>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      selectedBatchDetails.isActive
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-neutral-100 text-neutral-600 border-neutral-300'
                    }`}
                  >
                    {selectedBatchDetails.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
                <p className="text-xs text-[#6D4C41] mt-0.5">
                  Academic Year: {selectedBatchDetails.academicYear} | Manage enrolled student roster, curriculum, and faculty
                </p>
              </div>
              <button
                onClick={() => setSelectedBatchDetails(null)}
                className="text-[#8D6E63] hover:text-[#2D1E18] p-1.5 rounded-xl hover:bg-[#FAF7F2] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Inner Tabs */}
            <div className="flex items-center gap-2 pt-4 border-b border-[#EFEBE9]">
              <button
                onClick={() => setBatchDetailTab('roster')}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition ${
                  batchDetailTab === 'roster'
                    ? 'bg-[#4E342E] text-white shadow-sm'
                    : 'text-[#6D4C41] hover:text-[#2D1E18] hover:bg-[#FAF7F2]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Enrolled Students ({selectedBatchDetails.enrollments?.length || 0})</span>
              </button>
              <button
                onClick={() => setBatchDetailTab('subjects')}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition ${
                  batchDetailTab === 'subjects'
                    ? 'bg-[#4E342E] text-white shadow-sm'
                    : 'text-[#6D4C41] hover:text-[#2D1E18] hover:bg-[#FAF7F2]'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Curriculum ({selectedBatchDetails.batchSubjects?.length || 0})</span>
              </button>
              <button
                onClick={() => setBatchDetailTab('staff')}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition ${
                  batchDetailTab === 'staff'
                    ? 'bg-[#4E342E] text-white shadow-sm'
                    : 'text-[#6D4C41] hover:text-[#2D1E18] hover:bg-[#FAF7F2]'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Faculty ({selectedBatchDetails.staffAssignments?.length || 0})</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto py-4">
              {batchDetailLoading ? (
                <div className="py-12 text-center text-xs text-[#6D4C41]">Refreshing batch details...</div>
              ) : batchDetailTab === 'roster' ? (
                /* TAB 1: ROSTER */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#4E342E]">Active Student Roster</span>
                    <button
                      onClick={() => {
                        setStudentSearchQuery('');
                        setSelectedStudentToEnroll('');
                        setShowEnrollModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#4E342E] hover:bg-[#3E2723] text-white px-3 py-1.5 rounded-xl shadow-sm transition"
                    >
                      <Plus className="w-3.5 h-3.5" /> Enroll Student
                    </button>
                  </div>

                  {!selectedBatchDetails.enrollments || selectedBatchDetails.enrollments.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl bg-[#FAF7F2] border border-[#EFEBE9] text-xs text-[#6D4C41]">
                      No students are currently enrolled in this batch. Click "Enroll Student" above to add students from this institute.
                    </div>
                  ) : (
                    <div className="border border-[#EFEBE9] rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-[#FAF7F2] border-b border-[#EFEBE9] text-[#6D4C41]">
                            <th className="py-2.5 px-3 font-bold">Admission No</th>
                            <th className="py-2.5 px-3 font-bold">Student Name</th>
                            <th className="py-2.5 px-3 font-bold">Contact Phone</th>
                            <th className="py-2.5 px-3 font-bold">Status</th>
                            <th className="py-2.5 px-3 font-bold text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EFEBE9]">
                          {selectedBatchDetails.enrollments.map((enr) => (
                            <tr key={enr.id} className="hover:bg-[#FDFBF7]">
                              <td className="py-2.5 px-3 font-mono font-semibold text-[#4E342E]">
                                {enr.student.admissionNumber}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-[#2D1E18]">
                                {enr.student.firstName} {enr.student.lastName}
                              </td>
                              <td className="py-2.5 px-3 text-[#6D4C41]">
                                {enr.student.phone || '—'}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
                                  {enr.student.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  onClick={() =>
                                    handleUnenrollStudent(
                                      enr.student.id,
                                      `${enr.student.firstName} ${enr.student.lastName}`
                                    )
                                  }
                                  className="text-xs text-rose-700 hover:text-rose-900 font-semibold px-2 py-1 rounded hover:bg-rose-50 transition"
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : batchDetailTab === 'subjects' ? (
                /* TAB 2: CURRICULUM SUBJECTS */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#4E342E]">Assigned Batch Subjects</span>
                    <button
                      onClick={() => {
                        setSelectedSubjectToAssign('');
                        setShowAssignSubjectModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#4E342E] hover:bg-[#3E2723] text-white px-3 py-1.5 rounded-xl shadow-sm transition"
                    >
                      <Plus className="w-3.5 h-3.5" /> Assign Subject
                    </button>
                  </div>

                  {!selectedBatchDetails.batchSubjects || selectedBatchDetails.batchSubjects.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl bg-[#FAF7F2] border border-[#EFEBE9] text-xs text-[#6D4C41]">
                      No subjects are assigned to this batch curriculum yet. Click "Assign Subject" to associate subjects from your catalog.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedBatchDetails.batchSubjects.map((bs) => (
                        <div
                          key={bs.id}
                          className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#D7CCC8] flex items-center justify-between"
                        >
                          <div>
                            <div className="font-bold text-sm text-[#2D1E18]">{bs.subject.name}</div>
                            {bs.subject.code && (
                              <div className="text-xs font-mono font-semibold text-[#8D6E63] mt-0.5">
                                Code: {bs.subject.code}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemoveSubject(bs.subject.id, bs.subject.name)}
                            className="text-xs text-rose-700 hover:text-rose-900 font-semibold px-2.5 py-1 rounded-lg hover:bg-rose-50 transition"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* TAB 3: STAFF FACULTY */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#4E342E]">Assigned Instructors & Faculty</span>
                    <button
                      onClick={() => {
                        setSelectedStaffToAssign('');
                        setShowAssignStaffModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#4E342E] hover:bg-[#3E2723] text-white px-3 py-1.5 rounded-xl shadow-sm transition"
                    >
                      <Plus className="w-3.5 h-3.5" /> Assign Staff
                    </button>
                  </div>

                  {!selectedBatchDetails.staffAssignments || selectedBatchDetails.staffAssignments.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl bg-[#FAF7F2] border border-[#EFEBE9] text-xs text-[#6D4C41]">
                      No staff members are assigned to this batch. Click "Assign Staff" to delegate faculty members.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedBatchDetails.staffAssignments.map((sa) => (
                        <div
                          key={sa.id}
                          className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#D7CCC8] flex items-center justify-between"
                        >
                          <div>
                            <div className="font-bold text-sm text-[#2D1E18]">
                              {sa.staffProfile.user.fullName}
                            </div>
                            <div className="text-xs text-[#6D4C41] mt-0.5">
                              {sa.staffProfile.user.email || sa.staffProfile.user.phone || 'Authorized Staff'}
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              handleRemoveStaff(sa.staffProfile.id, sa.staffProfile.user.fullName)
                            }
                            className="text-xs text-rose-700 hover:text-rose-900 font-semibold px-2.5 py-1 rounded-lg hover:bg-rose-50 transition"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-[#EFEBE9] flex justify-end">
              <button
                onClick={() => setSelectedBatchDetails(null)}
                className="px-5 py-2 text-xs font-bold text-white bg-[#4E342E] hover:bg-[#3E2723] rounded-xl shadow-md transition"
              >
                Close Batch View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE / EDIT BATCH */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl w-full max-w-md p-6 shadow-2xl text-[#2D1E18]">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFEBE9]">
              <h2 className="text-lg font-bold text-[#2D1E18]">
                {editingBatch ? 'Edit Academic Batch' : 'Create New Academic Batch'}
              </h2>
              <button
                onClick={() => setShowBatchModal(false)}
                className="text-[#8D6E63] hover:text-[#2D1E18] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBatch} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-bold text-[#4E342E] mb-1">Batch Name *</label>
                <input
                  type="text"
                  required
                  value={batchForm.name}
                  onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })}
                  placeholder="e.g. Class 10 - Batch A"
                  className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4E342E] mb-1">Academic Year *</label>
                <input
                  type="text"
                  required
                  value={batchForm.academicYear}
                  onChange={(e) => setBatchForm({ ...batchForm, academicYear: e.target.value })}
                  placeholder="e.g. 2026-2027"
                  className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#4E342E] mb-1">Start Date</label>
                  <input
                    type="date"
                    value={batchForm.startDate}
                    onChange={(e) => setBatchForm({ ...batchForm, startDate: e.target.value })}
                    className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#4E342E] mb-1">End Date (Optional)</label>
                  <input
                    type="date"
                    value={batchForm.endDate}
                    onChange={(e) => setBatchForm({ ...batchForm, endDate: e.target.value })}
                    className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-[#EFEBE9]">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#6D4C41] hover:text-[#2D1E18]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-bold px-5 py-2 rounded-xl shadow-md transition"
                >
                  {editingBatch ? 'Update Batch' : 'Save Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE / EDIT SUBJECT */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl w-full max-w-md p-6 shadow-2xl text-[#2D1E18]">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFEBE9]">
              <h2 className="text-lg font-bold text-[#2D1E18]">
                {editingSubject ? 'Edit Subject' : 'Add Subject to Catalog'}
              </h2>
              <button
                onClick={() => setShowSubjectModal(false)}
                className="text-[#8D6E63] hover:text-[#2D1E18] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubject} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-bold text-[#4E342E] mb-1">Subject Name *</label>
                <input
                  type="text"
                  required
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  placeholder="e.g. Advanced Mathematics"
                  className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4E342E] mb-1">Subject Code</label>
                <input
                  type="text"
                  value={subjectForm.code}
                  onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. MATH-10"
                  className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] uppercase focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4E342E] mb-1">Description</label>
                <textarea
                  rows={2}
                  value={subjectForm.description}
                  onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                  placeholder="e.g. Algebra, Trigonometry, and Coordinate Geometry"
                  className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-[#EFEBE9]">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#6D4C41] hover:text-[#2D1E18]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-bold px-5 py-2 rounded-xl shadow-md transition"
                >
                  {editingSubject ? 'Update Subject' : 'Save Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ENROLL STUDENT */}
      {showEnrollModal && selectedBatchDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl w-full max-w-md p-6 shadow-2xl text-[#2D1E18]">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFEBE9]">
              <div>
                <h3 className="text-base font-bold text-[#2D1E18]">Enroll Student in Batch</h3>
                <p className="text-xs text-[#6D4C41]">{selectedBatchDetails.name}</p>
              </div>
              <button
                onClick={() => setShowEnrollModal(false)}
                className="text-[#8D6E63] hover:text-[#2D1E18] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEnrollStudent} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-bold text-[#4E342E] mb-1">
                  Search & Select Active Student *
                </label>
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-[#8D6E63] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    placeholder="Filter by name or admission no..."
                    className="w-full bg-[#FAF7F2] border border-[#D7CCC8] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                  />
                </div>

                <select
                  required
                  value={selectedStudentToEnroll}
                  onChange={(e) => setSelectedStudentToEnroll(e.target.value)}
                  size={5}
                  className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl p-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                >
                  {availableStudentsForEnroll.length === 0 ? (
                    <option disabled value="">
                      No eligible students found
                    </option>
                  ) : (
                    availableStudentsForEnroll.map((s) => (
                      <option key={s.id} value={s.id} className="p-1.5 rounded hover:bg-[#EFEBE9]">
                        {s.firstName} {s.lastName} ({s.admissionNumber})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-[#EFEBE9]">
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#6D4C41] hover:text-[#2D1E18]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedStudentToEnroll}
                  className="bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md transition disabled:opacity-50"
                >
                  Confirm Enrollment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ASSIGN SUBJECT TO BATCH */}
      {showAssignSubjectModal && selectedBatchDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl w-full max-w-md p-6 shadow-2xl text-[#2D1E18]">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFEBE9]">
              <div>
                <h3 className="text-base font-bold text-[#2D1E18]">Assign Subject to Curriculum</h3>
                <p className="text-xs text-[#6D4C41]">{selectedBatchDetails.name}</p>
              </div>
              <button
                onClick={() => setShowAssignSubjectModal(false)}
                className="text-[#8D6E63] hover:text-[#2D1E18] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignSubject} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-bold text-[#4E342E] mb-1">Select Subject *</label>
                <select
                  required
                  value={selectedSubjectToAssign}
                  onChange={(e) => setSelectedSubjectToAssign(e.target.value)}
                  className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                >
                  <option value="">-- Choose Subject from Catalog --</option>
                  {subjects
                    .filter((s) => !selectedBatchDetails.batchSubjects?.some((bs) => bs.subject.id === s.id))
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.code ? `(${s.code})` : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-[#EFEBE9]">
                <button
                  type="button"
                  onClick={() => setShowAssignSubjectModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#6D4C41] hover:text-[#2D1E18]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedSubjectToAssign}
                  className="bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md transition disabled:opacity-50"
                >
                  Assign Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ASSIGN STAFF TO BATCH */}
      {showAssignStaffModal && selectedBatchDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl w-full max-w-md p-6 shadow-2xl text-[#2D1E18]">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFEBE9]">
              <div>
                <h3 className="text-base font-bold text-[#2D1E18]">Assign Faculty to Batch</h3>
                <p className="text-xs text-[#6D4C41]">{selectedBatchDetails.name}</p>
              </div>
              <button
                onClick={() => setShowAssignStaffModal(false)}
                className="text-[#8D6E63] hover:text-[#2D1E18] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignStaff} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-bold text-[#4E342E] mb-1">Select Staff Member *</label>
                <select
                  required
                  value={selectedStaffToAssign}
                  onChange={(e) => setSelectedStaffToAssign(e.target.value)}
                  className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                >
                  <option value="">-- Choose Faculty Member --</option>
                  {availableStaff
                    .filter(
                      (st) =>
                        !selectedBatchDetails.staffAssignments?.some(
                          (sa) => sa.staffProfile.id === st.staffProfileId
                        )
                    )
                    .map((st) => (
                      <option key={st.staffProfileId} value={st.staffProfileId}>
                        {st.fullName} ({st.designation || 'Staff'})
                      </option>
                    ))}
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-[#EFEBE9]">
                <button
                  type="button"
                  onClick={() => setShowAssignStaffModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#6D4C41] hover:text-[#2D1E18]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedStaffToAssign}
                  className="bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md transition disabled:opacity-50"
                >
                  Assign Faculty
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION: DEACTIVATE / REACTIVATE BATCH */}
      <ConfirmationModal
        isOpen={confirmDeactivate.isOpen}
        title={confirmDeactivate.batch?.isActive ? 'Deactivate Academic Batch' : 'Reactivate Academic Batch'}
        message={`Are you sure you want to ${
          confirmDeactivate.batch?.isActive ? 'deactivate' : 'reactivate'
        } the batch '${confirmDeactivate.batch?.name}'? ${
          confirmDeactivate.batch?.isActive
            ? 'Deactivated batches will no longer appear for active daily attendance marking.'
            : 'Reactivated batches will resume being available for academic operations.'
        }`}
        confirmLabel={confirmDeactivate.batch?.isActive ? 'Deactivate Batch' : 'Reactivate Batch'}
        variant={confirmDeactivate.batch?.isActive ? 'danger' : 'primary'}
        onConfirm={() => confirmDeactivate.batch && handleToggleBatchStatus(confirmDeactivate.batch)}
        onCancel={() => setConfirmDeactivate({ isOpen: false, batch: null })}
      />

      {/* CONFIRMATION: DELETE SUBJECT */}
      <ConfirmationModal
        isOpen={confirmDeleteSubject.isOpen}
        title="Delete Subject from Catalog"
        message={`Are you sure you want to delete the subject '${confirmDeleteSubject.subject?.name}'? This action cannot be undone if the subject is not assigned to any batches.`}
        confirmLabel="Delete Subject"
        variant="danger"
        onConfirm={handleDeleteSubject}
        onCancel={() => setConfirmDeleteSubject({ isOpen: false, subject: null })}
      />
    </div>
  );
};
