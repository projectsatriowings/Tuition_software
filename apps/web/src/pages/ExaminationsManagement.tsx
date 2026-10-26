import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Award,
  Calendar,
  CheckCircle,
  AlertCircle,
  FileText,
  Plus,
  Users,
  Eye,
  TrendingUp,
  Percent,
  X,
} from 'lucide-react';

export const ExaminationsManagement: React.FC = () => {
  const { user } = useAuth();
  const isStaffOrAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ACADEMIC_ADMIN' || user?.role === 'STAFF';

  const [exams, setExams] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Exam creation modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [examType, setExamType] = useState('Unit Test');
  const [totalMarks, setTotalMarks] = useState(50);
  const [passingMarks, setPassingMarks] = useState(20);
  const [examDate, setExamDate] = useState('');
  const [batchId, setBatchId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Marks Entry Modal
  const [selectedExamForMarks, setSelectedExamForMarks] = useState<any>(null);
  const [studentsInBatch, setStudentsInBatch] = useState<any[]>([]);
  const [marksState, setMarksState] = useState<Record<string, { marksObtained: number; isAbsent: boolean; remarks: string }>>({});
  const [savingMarks, setSavingMarks] = useState(false);

  // Report Card Modal
  const [reportCardData, setReportCardData] = useState<any>(null);

  useEffect(() => {
    loadExams();
    if (isStaffOrAdmin) {
      loadBatchesAndSubjects();
    }
  }, []);

  async function loadExams() {
    try {
      setLoading(true);
      const res = await apiFetch('/exams');
      if (res.success) setExams(res.data.exams || []);
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

  async function handleCreateExam(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await apiFetch('/exams', {
        method: 'POST',
        body: JSON.stringify({
          batchId,
          subjectId,
          title,
          examType,
          totalMarks: Number(totalMarks),
          passingMarks: Number(passingMarks),
          examDate,
        }),
      });

      if (res.success) {
        setShowCreateModal(false);
        setTitle('');
        setExamDate('');
        loadExams();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create exam');
    } finally {
      setSubmitting(false);
    }
  }

  async function openMarksEntry(exam: any) {
    setSelectedExamForMarks(exam);
    try {
      // Fetch students in this batch
      const res = await apiFetch(`/students?batchId=${exam.batchId}&limit=100`);
      const students = res.data?.students || [];
      setStudentsInBatch(students);

      // Fetch existing marks if entered
      const examDetails = await apiFetch(`/exams/${exam.id}`);
      const existingMarks = examDetails.data?.exam?.marks || [];

      const initialMap: Record<string, any> = {};
      for (const st of students) {
        const found = existingMarks.find((m: any) => m.studentId === st.id);
        initialMap[st.id] = {
          marksObtained: found ? Number(found.marksObtained) : 0,
          isAbsent: found ? found.isAbsent : false,
          remarks: found ? found.remarks || '' : '',
        };
      }
      setMarksState(initialMap);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSaveMarks() {
    if (!selectedExamForMarks) return;

    try {
      setSavingMarks(true);
      const marksPayload = Object.entries(marksState).map(([studentId, data]) => ({
        studentId,
        marksObtained: data.isAbsent ? 0 : Number(data.marksObtained),
        isAbsent: data.isAbsent,
        remarks: data.remarks,
      }));

      const res = await apiFetch(`/exams/${selectedExamForMarks.id}/marks`, {
        method: 'POST',
        body: JSON.stringify({ marks: marksPayload }),
      });

      if (res.success) {
        alert('Marks successfully recorded and validated!');
        setSelectedExamForMarks(null);
        loadExams();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save marks');
    } finally {
      setSavingMarks(false);
    }
  }

  async function togglePublish(examId: string) {
    try {
      const res = await apiFetch(`/exams/${examId}/publish`, { method: 'PATCH' });
      if (res.success) {
        loadExams();
      }
    } catch (err: any) {
      alert(err.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2D1E18] flex items-center gap-2.5">
            <Award className="w-7 h-7 text-[#6D4C41]" />
            <span>Examinations, Marks & Academic Grading</span>
          </h1>
          <p className="text-sm text-[#6D4C41] mt-1">
            Schedule examinations, record validated student marks, and generate report cards
          </p>
        </div>

        {isStaffOrAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#4E342E] hover:bg-[#3E2723] text-white rounded-xl font-semibold text-sm shadow-sm transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Schedule Exam
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-[#8D6E63] text-sm">Loading examinations...</div>
      ) : exams.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-[#D7CCC8] text-[#8D6E63] text-sm shadow-sm">
          No examinations scheduled yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {exams.map((ex) => (
            <div
              key={ex.id}
              className="p-5 rounded-2xl bg-white border border-[#D7CCC8] shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D7CCC8]/40 text-[#4E342E] border border-[#BCAAA4]">
                    {ex.examType}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      ex.isPublished
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {ex.isPublished ? 'Published' : 'Draft'}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-[#2D1E18] text-base">{ex.title}</h3>
                  <div className="text-xs text-[#6D4C41] mt-1 flex items-center gap-2">
                    <span>{ex.subject?.name}</span>
                    <span>&bull;</span>
                    <span>{ex.batch?.name}</span>
                  </div>
                </div>

                <div className="pt-2 grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-[#F7F2EF] border border-[#D7CCC8]">
                    <span className="text-[10px] text-[#8D6E63] block uppercase font-semibold">Max Marks</span>
                    <strong className="text-[#2D1E18] font-mono text-sm">{Number(ex.totalMarks)}</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F7F2EF] border border-[#D7CCC8]">
                    <span className="text-[10px] text-[#8D6E63] block uppercase font-semibold">Passing</span>
                    <strong className="text-emerald-800 font-mono text-sm">{Number(ex.passingMarks)}</strong>
                  </div>
                </div>

                <div className="text-xs text-[#6D4C41] flex items-center gap-1.5 pt-1">
                  <Calendar className="w-3.5 h-3.5 text-[#8D6E63]" />
                  <span>Date: {new Date(ex.examDate).toLocaleDateString()}</span>
                </div>
              </div>

              {isStaffOrAdmin && (
                <div className="pt-3 border-t border-[#EFEBE9] flex items-center justify-between gap-2 text-xs">
                  <button
                    onClick={() => togglePublish(ex.id)}
                    className="text-xs text-[#6D4C41] hover:text-[#2D1E18] font-medium"
                  >
                    {ex.isPublished ? 'Unpublish' : 'Publish'}
                  </button>

                  <button
                    onClick={() => openMarksEntry(ex)}
                    className="px-3 py-1.5 rounded-xl bg-[#4E342E] hover:bg-[#3E2723] text-white font-semibold text-xs shadow-sm"
                  >
                    Enter Marks
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Marks Entry Modal */}
      {selectedExamForMarks && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl p-6 sm:p-8 max-w-3xl w-full max-h-[85vh] flex flex-col space-y-4 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#EFEBE9] pb-3">
              <div>
                <h2 className="text-xl font-bold text-[#2D1E18]">Marks Entry: {selectedExamForMarks.title}</h2>
                <p className="text-xs text-[#6D4C41]">
                  Total Marks: <strong>{Number(selectedExamForMarks.totalMarks)}</strong> | Passing Marks:{' '}
                  <strong>{Number(selectedExamForMarks.passingMarks)}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedExamForMarks(null)}
                className="text-[#8D6E63] hover:text-[#2D1E18]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {studentsInBatch.length === 0 ? (
                <div className="p-8 text-center text-[#8D6E63] text-xs">No students enrolled in this batch.</div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#D7CCC8] text-[#6D4C41] text-[11px] uppercase font-semibold">
                      <th className="pb-2">Student Name</th>
                      <th className="pb-2">Admission No</th>
                      <th className="pb-2 text-center">Absent?</th>
                      <th className="pb-2 w-28">Score</th>
                      <th className="pb-2">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFEBE9]">
                    {studentsInBatch.map((st) => {
                      const cur = marksState[st.id] || { marksObtained: 0, isAbsent: false, remarks: '' };
                      return (
                        <tr key={st.id} className="hover:bg-[#F7F2EF]/60">
                          <td className="py-2.5 font-medium text-[#2D1E18]">
                            {st.firstName} {st.lastName}
                          </td>
                          <td className="py-2.5 text-[#6D4C41] font-mono">{st.admissionNumber}</td>
                          <td className="py-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={cur.isAbsent}
                              onChange={(e) =>
                                setMarksState({
                                  ...marksState,
                                  [st.id]: { ...cur, isAbsent: e.target.checked },
                                })
                              }
                              className="rounded border-[#D7CCC8] text-[#4E342E] focus:ring-[#8D6E63]"
                            />
                          </td>
                          <td className="py-2.5">
                            <input
                              type="number"
                              disabled={cur.isAbsent}
                              min={0}
                              max={Number(selectedExamForMarks.totalMarks)}
                              value={cur.isAbsent ? 0 : cur.marksObtained}
                              onChange={(e) =>
                                setMarksState({
                                  ...marksState,
                                  [st.id]: { ...cur, marksObtained: parseFloat(e.target.value) || 0 },
                                })
                              }
                              className="w-20 bg-[#F7F2EF] border border-[#D7CCC8] rounded-lg px-2 py-1 text-xs text-[#2D1E18] disabled:opacity-30 focus:ring-1 focus:ring-[#8D6E63]"
                            />
                          </td>
                          <td className="py-2.5">
                            <input
                              type="text"
                              placeholder="Optional remarks"
                              value={cur.remarks}
                              onChange={(e) =>
                                setMarksState({
                                  ...marksState,
                                  [st.id]: { ...cur, remarks: e.target.value },
                                })
                              }
                              className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-lg px-2 py-1 text-xs text-[#2D1E18] focus:ring-1 focus:ring-[#8D6E63]"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="pt-3 border-t border-[#EFEBE9] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedExamForMarks(null)}
                className="px-4 py-2 text-xs text-[#6D4C41] hover:bg-[#F7F2EF] rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingMarks}
                onClick={handleSaveMarks}
                className="px-5 py-2 bg-[#4E342E] hover:bg-[#3E2723] text-white rounded-xl text-xs font-semibold shadow-sm disabled:opacity-50"
              >
                {savingMarks ? 'Saving...' : 'Save & Publish Marks'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Exam Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EFEBE9] pb-3">
              <h2 className="text-xl font-bold text-[#2D1E18] flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#6D4C41]" /> Schedule Examination
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-[#8D6E63] hover:text-[#2D1E18]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateExam} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#4E342E] mb-1">Exam Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Midterm Physics Assessment"
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

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#4E342E] mb-1">Type *</label>
                  <select
                    value={examType}
                    onChange={(e) => setExamType(e.target.value)}
                    className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-2.5 py-2 text-xs text-[#2D1E18] focus:ring-2 focus:ring-[#8D6E63]"
                  >
                    <option value="Unit Test">Unit Test</option>
                    <option value="Midterm">Midterm</option>
                    <option value="Final Exam">Final Exam</option>
                    <option value="Quiz">Quiz</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#4E342E] mb-1">Total Marks *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-2.5 py-2 text-xs text-[#2D1E18] focus:ring-2 focus:ring-[#8D6E63]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#4E342E] mb-1">Passing *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={passingMarks}
                    onChange={(e) => setPassingMarks(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-2.5 py-2 text-xs text-[#2D1E18] focus:ring-2 focus:ring-[#8D6E63]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4E342E] mb-1">Exam Date *</label>
                <input
                  type="date"
                  required
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
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
                  {submitting ? 'Scheduling...' : 'Confirm Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
