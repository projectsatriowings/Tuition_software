import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  Upload,
  Calendar,
  Award,
  MessageSquare,
  Plus,
  Search,
  Eye,
  X,
} from 'lucide-react';

export const HomeworkManagement: React.FC = () => {
  const { user } = useAuth();
  const isStaffOrAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ACADEMIC_ADMIN' || user?.role === 'STAFF';
  const isStudent = user?.role === 'STUDENT';

  const [homeworkList, setHomeworkList] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Homework creation modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [batchId, setBatchId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Student submission modal
  const [selectedHwForSubmit, setSelectedHwForSubmit] = useState<any>(null);
  const [studentNotes, setStudentNotes] = useState('');
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);

  // Staff review submissions drawer/modal
  const [selectedHwForReview, setSelectedHwForReview] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [evaluatingSubId, setEvaluatingSubId] = useState<string | null>(null);
  const [gradeInput, setGradeInput] = useState('');
  const [feedbackInput, setFeedbackInput] = useState('');

  useEffect(() => {
    loadHomework();
    if (isStaffOrAdmin) {
      loadBatchesAndSubjects();
    }
  }, []);

  async function loadHomework() {
    try {
      setLoading(true);
      const res = await apiFetch('/homework');
      if (res.success) {
        setHomeworkList(res.data.homework || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadBatchesAndSubjects() {
    try {
      const [bRes, sRes] = await Promise.all([
        apiFetch('/academics/batches'),
        apiFetch('/academics/subjects'),
      ]);
      if (bRes.success) setBatches(bRes.data.batches || []);
      if (sRes.success) setSubjects(sRes.data.subjects || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleCreateHomework(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await apiFetch('/homework', {
        method: 'POST',
        body: JSON.stringify({ batchId, subjectId, title, description, dueDate }),
      });
      if (res.success) {
        setShowCreateModal(false);
        setTitle('');
        setDescription('');
        setDueDate('');
        loadHomework();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create homework');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStudentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedHwForSubmit) return;

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('studentNotes', studentNotes);
      if (submissionFile) formData.append('file', submissionFile);

      const token = localStorage.getItem('tuition_token');
      const instId = localStorage.getItem('tuition_active_institute_id');

      const res = await fetch(`/api/homework/${selectedHwForSubmit.id}/submissions`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(instId ? { 'x-institute-id': instId } : {}),
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');

      alert(data.message || 'Submitted successfully!');
      setSelectedHwForSubmit(null);
      setStudentNotes('');
      setSubmissionFile(null);
      loadHomework();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function openReviewDrawer(hw: any) {
    setSelectedHwForReview(hw);
    try {
      const res = await apiFetch(`/homework/${hw.id}/submissions`);
      if (res.success) {
        setSubmissions(res.data.submissions || []);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleGradeSubmission(submissionId: string) {
    try {
      const res = await apiFetch(`/homework/submissions/${submissionId}/grade`, {
        method: 'PATCH',
        body: JSON.stringify({ grade: gradeInput, feedback: feedbackInput }),
      });
      if (res.success) {
        setEvaluatingSubId(null);
        setGradeInput('');
        setFeedbackInput('');
        openReviewDrawer(selectedHwForReview);
      }
    } catch (err: any) {
      alert(err.message);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2D1E18] flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-[#6D4C41]" />
            <span>Homework & Academic Assignments</span>
          </h1>
          <p className="text-sm text-[#6D4C41] mt-1">
            Track assignment deadlines, verify student submissions, and review grades
          </p>
        </div>

        {isStaffOrAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#4E342E] hover:bg-[#3E2723] text-white rounded-xl font-semibold text-sm shadow-sm transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Assign Homework
          </button>
        )}
      </div>

      {/* Homework Cards */}
      {loading ? (
        <div className="p-12 text-center text-[#8D6E63] text-sm">Loading homework assignments...</div>
      ) : homeworkList.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-[#D7CCC8] text-[#8D6E63] text-sm shadow-sm">
          No homework assignments have been assigned yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {homeworkList.map((hw) => {
            const hasSubmitted = Boolean(hw.mySubmission);
            const isLate = hw.mySubmission?.isLate;

            return (
              <div
                key={hw.id}
                className="p-5 rounded-2xl bg-white border border-[#D7CCC8] shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D7CCC8]/40 text-[#4E342E] border border-[#BCAAA4]">
                      {hw.subject?.name || 'Subject'}
                    </span>
                    {hw.isOverdue ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-600" /> Overdue
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Active
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-[#2D1E18] text-base">{hw.title}</h3>
                    {hw.description && <p className="text-xs text-[#6D4C41] mt-1">{hw.description}</p>}
                  </div>

                  <div className="pt-2 flex items-center gap-2 text-xs text-[#6D4C41]">
                    <Clock className="w-3.5 h-3.5 text-[#8D6E63]" />
                    <span>Due: {hw.dueDate ? new Date(hw.dueDate).toLocaleDateString() : 'No date'}</span>
                  </div>

                  {/* Student Submission Status Card */}
                  {isStudent && (
                    <div className="pt-2">
                      {hasSubmitted ? (
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                          <div className="flex items-center justify-between font-semibold">
                            <span className="flex items-center gap-1.5">
                              <CheckCircle className="w-4 h-4 text-emerald-600" /> Submitted
                            </span>
                            {isLate && <span className="text-[10px] text-amber-800 font-bold">Late</span>}
                          </div>
                          {hw.mySubmission?.grade && (
                            <div className="text-[11px] text-[#2D1E18]">
                              Grade: <strong className="text-amber-800">{hw.mySubmission.grade}</strong>
                              {hw.mySubmission.feedback && (
                                <span className="block text-[#6D4C41] mt-0.5 italic">"{hw.mySubmission.feedback}"</span>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => setSelectedHwForSubmit(hw)}
                          className="w-full py-2 bg-[#4E342E] hover:bg-[#3E2723] text-white rounded-xl text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 transition-all"
                        >
                          <Upload className="w-3.5 h-3.5" /> Submit Homework
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Staff Actions */}
                {isStaffOrAdmin && (
                  <div className="pt-3 border-t border-[#EFEBE9] flex items-center justify-between text-xs">
                    <span className="text-[#8D6E63] text-[11px]">
                      {hw.submissions?.length || 0} Submissions
                    </span>
                    <button
                      onClick={() => openReviewDrawer(hw)}
                      className="px-3 py-1.5 rounded-xl bg-[#4E342E]/10 hover:bg-[#4E342E] text-[#4E342E] hover:text-white border border-[#D7CCC8] font-semibold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" /> View & Grade
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Staff Review Drawer / Modal */}
      {selectedHwForReview && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[85vh] flex flex-col space-y-4 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#EFEBE9] pb-3">
              <div>
                <h2 className="text-xl font-bold text-[#2D1E18]">Submissions: {selectedHwForReview.title}</h2>
                <p className="text-xs text-[#6D4C41]">Review student work and assign grades</p>
              </div>
              <button
                onClick={() => setSelectedHwForReview(null)}
                className="text-[#8D6E63] hover:text-[#2D1E18]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {submissions.length === 0 ? (
                <div className="p-8 text-center text-[#8D6E63] text-xs italic">
                  No students have submitted this assignment yet.
                </div>
              ) : (
                submissions.map((sub) => (
                  <div key={sub.id} className="p-4 rounded-xl bg-[#F7F2EF] border border-[#D7CCC8] space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-bold text-[#2D1E18] text-sm">
                          {sub.student.firstName} {sub.student.lastName}
                        </span>
                        <span className="text-xs text-[#6D4C41] block font-mono">
                          {sub.student.admissionNumber} {sub.isLate && <strong className="text-amber-800 ml-2">&bull; Late</strong>}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#8D6E63]">
                        {new Date(sub.submittedAt).toLocaleString()}
                      </span>
                    </div>

                    {sub.studentNotes && (
                      <p className="text-xs text-[#2D1E18] bg-white p-2.5 rounded-lg border border-[#D7CCC8]">
                        "{sub.studentNotes}"
                      </p>
                    )}

                    {sub.fileUrl && (
                      <a
                        href={`/api/materials/${selectedHwForReview.id}/download`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-[#4E342E] hover:underline font-semibold"
                      >
                        <FileText className="w-3.5 h-3.5" /> View Attached File
                      </a>
                    )}

                    {evaluatingSubId === sub.id ? (
                      <div className="pt-2 space-y-2 border-t border-[#D7CCC8]">
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            type="text"
                            placeholder="Grade (e.g. A+)"
                            value={gradeInput}
                            onChange={(e) => setGradeInput(e.target.value)}
                            className="bg-white border border-[#D7CCC8] rounded-lg px-2.5 py-1.5 text-xs text-[#2D1E18] focus:ring-1 focus:ring-[#8D6E63]"
                          />
                          <input
                            type="text"
                            placeholder="Feedback remarks"
                            value={feedbackInput}
                            onChange={(e) => setFeedbackInput(e.target.value)}
                            className="col-span-2 bg-white border border-[#D7CCC8] rounded-lg px-2.5 py-1.5 text-xs text-[#2D1E18] focus:ring-1 focus:ring-[#8D6E63]"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEvaluatingSubId(null)}
                            className="px-2.5 py-1 text-xs text-[#8D6E63]"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleGradeSubmission(sub.id)}
                            className="px-3 py-1 bg-[#4E342E] hover:bg-[#3E2723] text-white rounded-lg text-xs font-semibold"
                          >
                            Save Grade
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-2 flex items-center justify-between border-t border-[#D7CCC8]/60 text-xs">
                        <span className="text-[#2D1E18]">
                          Grade: <strong className="text-amber-800">{sub.grade || 'Not Graded'}</strong>
                        </span>
                        <button
                          onClick={() => {
                            setEvaluatingSubId(sub.id);
                            setGradeInput(sub.grade || '');
                            setFeedbackInput(sub.feedback || '');
                          }}
                          className="px-2.5 py-1 rounded bg-[#4E342E]/10 hover:bg-[#4E342E] text-[#4E342E] hover:text-white border border-[#D7CCC8] text-xs font-medium transition-colors"
                        >
                          {sub.grade ? 'Edit Grade' : 'Grade'}
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Student Submit Modal */}
      {selectedHwForSubmit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EFEBE9] pb-3">
              <h2 className="text-lg font-bold text-[#2D1E18]">Submit: {selectedHwForSubmit.title}</h2>
              <button onClick={() => setSelectedHwForSubmit(null)} className="text-[#8D6E63] hover:text-[#2D1E18]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleStudentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#4E342E] mb-1">
                  Submission Notes / Explanations
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detail your work, question answers, or summary notes..."
                  value={studentNotes}
                  onChange={(e) => setStudentNotes(e.target.value)}
                  className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-sm text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4E342E] mb-1">
                  Upload Assignment File (Optional)
                </label>
                <input
                  type="file"
                  onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-[#6D4C41] file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#4E342E] file:text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#EFEBE9]">
                <button
                  type="button"
                  onClick={() => setSelectedHwForSubmit(null)}
                  className="px-3 py-2 rounded-xl text-xs text-[#6D4C41] hover:bg-[#F7F2EF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#4E342E] hover:bg-[#3E2723] text-white rounded-xl text-xs font-semibold shadow-sm"
                >
                  {submitting ? 'Submitting...' : 'Confirm Submission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Create Homework Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EFEBE9] pb-3">
              <h2 className="text-xl font-bold text-[#2D1E18] flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#6D4C41]" /> Create Homework Assignment
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-[#8D6E63] hover:text-[#2D1E18]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateHomework} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#4E342E] mb-1">Assignment Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chemical Bonding Practice Set"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-sm text-[#2D1E18] focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#4E342E] mb-1">Batch *</label>
                  <select
                    required
                    value={batchId}
                    onChange={(e) => setBatchId(e.target.value)}
                    className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:ring-2 focus:ring-[#8D6E63]"
                  >
                    <option value="">Select Batch</option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#4E342E] mb-1">Subject *</label>
                  <select
                    required
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:ring-2 focus:ring-[#8D6E63]"
                  >
                    <option value="">Select Subject</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4E342E] mb-1">Due Date *</label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-sm text-[#2D1E18] focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4E342E] mb-1">Instructions / Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-sm text-[#2D1E18] focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#EFEBE9]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-2 text-xs text-[#6D4C41] hover:bg-[#F7F2EF] rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#4E342E] hover:bg-[#3E2723] text-white rounded-xl text-xs font-semibold shadow-sm"
                >
                  {submitting ? 'Publishing...' : 'Assign Homework'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
