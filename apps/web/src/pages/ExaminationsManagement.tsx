import React, { useEffect, useState } from 'react';
import { apiFetch, getMaterialDownloadUrl } from '../services/api';
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
  Search,
  Clock,
  Send,
  Upload,
  Download,
  Trash2,
  Filter,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { MaterialViewerModal } from '../components/MaterialViewerModal';

export const ExaminationsManagement: React.FC = () => {
  const { user } = useAuth();
  const isStaffOrAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ACADEMIC_ADMIN' || user?.role === 'STAFF';
  const isStudent = user?.role === 'STUDENT';
  const isParent = user?.role === 'PARENT';

  const [exams, setExams] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedBatch, setSelectedBatch] = useState<string>('ALL');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Exam creation / edit modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [examType, setExamType] = useState('Unit Test');
  const [totalMarks, setTotalMarks] = useState<number>(50);
  const [passingMarks, setPassingMarks] = useState<number>(20);
  const [examDate, setExamDate] = useState('');
  const [startTime, setStartTime] = useState('10:00 AM');
  const [endTime, setEndTime] = useState('12:00 PM');
  const [instructions, setInstructions] = useState('');
  const [batchId, setBatchId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [examFile, setExamFile] = useState<File | null>(null);
  const [isSchedulePublished, setIsSchedulePublished] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Marks Entry Modal
  const [selectedExamForMarks, setSelectedExamForMarks] = useState<any>(null);
  const [marksRoster, setMarksRoster] = useState<any[]>([]);
  const [marksSummary, setMarksSummary] = useState<any>(null);
  const [loadingMarksRoster, setLoadingMarksRoster] = useState(false);
  const [marksState, setMarksState] = useState<Record<string, { marksObtained: number | string; isAbsent: boolean; remarks: string }>>({});
  const [marksFilter, setMarksFilter] = useState<'ALL' | 'PENDING' | 'ENTERED' | 'ABSENT'>('ALL');
  const [marksSearch, setMarksSearch] = useState('');
  const [savingMarks, setSavingMarks] = useState(false);
  const [publishingResults, setPublishingResults] = useState(false);

  // Analytics & Report Card Modal
  const [selectedAnalyticsExam, setSelectedAnalyticsExam] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [reportCardData, setReportCardData] = useState<any>(null);
  const [previewMaterial, setPreviewMaterial] = useState<any | null>(null);

  useEffect(() => {
    loadExams();
    if (isStaffOrAdmin) {
      loadBatchesAndSubjects();
    }
  }, [selectedBatch, selectedSubject, selectedStatus]);

  async function loadExams() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedBatch !== 'ALL') params.set('batchId', selectedBatch);
      if (selectedSubject !== 'ALL') params.set('subjectId', selectedSubject);
      if (selectedStatus !== 'ALL') params.set('status', selectedStatus);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await apiFetch(`/exams?${params.toString()}`);
      if (res.success) setExams(res.data.exams || []);
    } catch (err) {
      console.error('[Load Exams Error]', err);
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
    if (Number(passingMarks) > Number(totalMarks)) {
      alert('Passing marks cannot exceed maximum marks.');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('batchId', batchId);
      formData.append('subjectId', subjectId);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('examType', examType);
      formData.append('totalMarks', String(totalMarks));
      formData.append('passingMarks', String(passingMarks));
      formData.append('examDate', examDate);
      formData.append('startTime', startTime);
      formData.append('endTime', endTime);
      formData.append('instructions', instructions);
      formData.append('isPublished', String(isSchedulePublished));

      if (examFile) {
        formData.append('file', examFile);
      }

      const res = await apiFetch('/exams', {
        method: 'POST',
        body: formData,
      });

      if (res.success) {
        setShowCreateModal(false);
        resetForm();
        loadExams();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to schedule exam');
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setTitle('');
    setDescription('');
    setExamDate('');
    setStartTime('10:00 AM');
    setEndTime('12:00 PM');
    setInstructions('');
    setTotalMarks(50);
    setPassingMarks(20);
    setExamFile(null);
    setIsSchedulePublished(false);
  }

  async function openMarksEntry(exam: any) {
    setSelectedExamForMarks(exam);
    setMarksSearch('');
    setMarksFilter('ALL');
    try {
      setLoadingMarksRoster(true);
      const res = await apiFetch(`/exams/${exam.id}/eligible-students`);
      if (res.success && res.data) {
        setMarksRoster(res.data.roster || []);
        setMarksSummary(res.data.summary || null);

        // Prepopulate marks state map
        const initialMap: Record<string, any> = {};
        for (const item of res.data.roster || []) {
          initialMap[item.student.id] = {
            marksObtained: item.marksObtained !== null ? item.marksObtained : '',
            isAbsent: item.isAbsent || false,
            remarks: item.remarks || '',
          };
        }
        setMarksState(initialMap);
      }
    } catch (err) {
      console.error('[Open Marks Entry Error]', err);
    } finally {
      setLoadingMarksRoster(false);
    }
  }

  async function handleSaveMarks(asDraft = true) {
    if (!selectedExamForMarks) return;

    try {
      setSavingMarks(true);
      const maxMarks = Number(selectedExamForMarks.totalMarks);

      // Validate entries
      const marksPayload = Object.entries(marksState)
        .filter(([_, data]) => data.isAbsent || data.marksObtained !== '')
        .map(([studentId, data]) => {
          const score = data.isAbsent ? 0 : Number(data.marksObtained);
          if (!data.isAbsent && score > maxMarks) {
            throw new Error(`Marks cannot exceed ${maxMarks}`);
          }
          return {
            studentId,
            marksObtained: score,
            isAbsent: data.isAbsent,
            remarks: data.remarks || '',
          };
        });

      if (marksPayload.length === 0) {
        alert('Please enter marks or select Absent for at least one student.');
        return;
      }

      const res = await apiFetch(`/exams/${selectedExamForMarks.id}/marks`, {
        method: 'POST',
        body: JSON.stringify({ marks: marksPayload, isDraft: asDraft }),
      });

      if (res.success) {
        alert(res.message || 'Marks saved successfully');
        openMarksEntry(selectedExamForMarks);
        loadExams();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save marks');
    } finally {
      setSavingMarks(false);
    }
  }

  async function handlePublishResults(exam: any) {
    const confirmed = window.confirm(
      `Confirm publishing official examination results for "${exam.title}"?\n\nThis will make scores visible to students and linked parents, and dispatch in-app notifications.`
    );
    if (!confirmed) return;

    try {
      setPublishingResults(true);
      const res = await apiFetch(`/exams/${exam.id}/publish-results`, {
        method: 'PATCH',
      });
      if (res.success) {
        alert(res.message || 'Results published successfully!');
        if (selectedExamForMarks?.id === exam.id) {
          setSelectedExamForMarks(null);
        }
        loadExams();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to publish results');
    } finally {
      setPublishingResults(false);
    }
  }

  async function handlePublishSchedule(exam: any) {
    try {
      const res = await apiFetch(`/exams/${exam.id}/publish-schedule`, {
        method: 'PATCH',
      });
      if (res.success) {
        alert('Exam schedule published. Notifications sent to students & parents.');
        loadExams();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to publish schedule');
    }
  }

  async function handleDeleteExam(examId: string) {
    if (!window.confirm('Are you sure you want to delete this scheduled examination?')) return;
    try {
      const res = await apiFetch(`/exams/${examId}`, { method: 'DELETE' });
      if (res.success) {
        loadExams();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete exam');
    }
  }

  async function openClassAnalytics(exam: any) {
    try {
      setSelectedAnalyticsExam(exam);
      const res = await apiFetch(`/exams/${exam.id}`);
      if (res.success && res.data) {
        setAnalyticsData(res.data.analytics);
      }
    } catch (err) {
      console.error(err);
    }
  }

  const formatExamDate = (dString: string) => {
    try {
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(new Date(dString));
    } catch {
      return dString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2D1E18] flex items-center gap-2.5">
            <Award className="w-7 h-7 text-[#6D4C41]" />
            <span>Examinations, Marks & Academic Grading</span>
          </h1>
          <p className="text-sm text-[#6D4C41] mt-1">
            {isStudent
              ? 'View your upcoming examination schedule, timetable instructions, and official published test scores'
              : 'Schedule exams, manage validated marks entry as drafts, and publish verified report cards'}
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

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white border border-[#D7CCC8] shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="flex items-center bg-[#F7F2EF] p-1 rounded-xl border border-[#D7CCC8]">
            {(['ALL', 'DRAFT', 'PUBLISHED', 'RESULTS_PUBLISHED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                  selectedStatus === st
                    ? 'bg-[#4E342E] text-white shadow-xs'
                    : 'text-[#6D4C41] hover:text-[#2D1E18]'
                }`}
              >
                {st === 'ALL'
                  ? 'All Status'
                  : st === 'DRAFT'
                  ? 'Drafts'
                  : st === 'PUBLISHED'
                  ? 'Scheduled'
                  : 'Results Published'}
              </button>
            ))}
          </div>

          {/* Batch Filter */}
          {isStaffOrAdmin && batches.length > 0 && (
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#F7F2EF] border border-[#D7CCC8] text-[#2D1E18] font-semibold"
            >
              <option value="ALL">All Batches</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          {/* Subject Filter */}
          {isStaffOrAdmin && subjects.length > 0 && (
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#F7F2EF] border border-[#D7CCC8] text-[#2D1E18] font-semibold"
            >
              <option value="ALL">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8D6E63]" />
          <input
            type="text"
            placeholder="Search exams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadExams()}
            className="w-full md:w-60 pl-8 pr-3 py-2 rounded-xl bg-[#F7F2EF] border border-[#D7CCC8] text-[#2D1E18] placeholder-[#8D6E63]"
          />
        </div>
      </div>

      {/* Exam Cards Grid */}
      {loading ? (
        <div className="p-16 text-center text-[#8D6E63] text-sm flex items-center justify-center gap-3">
          <div className="w-4 h-4 rounded-full bg-[#6D4C41] animate-ping"></div>
          <span>Loading examinations...</span>
        </div>
      ) : exams.length === 0 ? (
        <div className="p-16 text-center rounded-2xl bg-white border border-[#D7CCC8] text-[#8D6E63] text-sm shadow-sm space-y-2">
          <Award className="w-10 h-10 mx-auto text-[#BCAAA4]" />
          <h3 className="font-bold text-[#2D1E18]">No Examinations Found</h3>
          <p className="text-xs text-[#8D6E63]">
            {isStudent
              ? 'No upcoming scheduled examinations or published test reports for your active batches.'
              : 'Try adjusting your batch or status filters, or schedule a new exam.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {exams.map((ex) => {
            const isResultsPub = ex.isResultsPublished;
            const isSchedPub = ex.isPublished;
            const studentMark = ex.studentMark;

            return (
              <div
                key={ex.id}
                className="p-5 rounded-2xl bg-white border border-[#D7CCC8] shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Status Badges */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D7CCC8]/40 text-[#4E342E] border border-[#BCAAA4]">
                      {ex.examType}
                    </span>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isResultsPub
                          ? 'bg-purple-100 text-purple-900 border border-purple-300'
                          : isSchedPub
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}
                    >
                      {isResultsPub ? 'Results Published' : isSchedPub ? 'Scheduled' : 'Draft'}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-[#2D1E18] text-base leading-snug">{ex.title}</h3>
                    <div className="text-xs text-[#6D4C41] mt-1 flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-[#2D1E18]">{ex.subject?.name}</span>
                      <span>&bull;</span>
                      <span>{ex.batch?.name}</span>
                    </div>
                  </div>

                  {ex.description && (
                    <p className="text-xs text-[#6D4C41] line-clamp-2 italic">{ex.description}</p>
                  )}

                  {/* Marks & Date Info Grid */}
                  <div className="pt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-[#F7F2EF] border border-[#D7CCC8]">
                      <span className="text-[10px] text-[#8D6E63] block uppercase font-semibold">Max Marks</span>
                      <strong className="text-[#2D1E18] font-mono text-sm">{ex.totalMarks}</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#F7F2EF] border border-[#D7CCC8]">
                      <span className="text-[10px] text-[#8D6E63] block uppercase font-semibold">Pass Marks</span>
                      <strong className="text-emerald-800 font-mono text-sm">{ex.passingMarks}</strong>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1 text-xs text-[#6D4C41]">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-[#8D6E63]" />
                      <span>{formatExamDate(ex.examDate)}</span>
                    </div>

                    {(ex.startTime || ex.endTime) && (
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#8D6E63]">
                        <Clock className="w-3 h-3 text-[#8D6E63]" />
                        <span>{ex.startTime || 'Start'} &ndash; {ex.endTime || 'End'}</span>
                      </div>
                    )}
                  </div>

                  {/* Attachment Preview Link if available */}
                  {ex.fileUrl && (
                    <button
                      onClick={() => setPreviewMaterial({
                        id: ex.id,
                        title: `${ex.title} - Attachment`,
                        fileUrl: ex.fileUrl,
                        fileName: ex.fileName,
                        type: 'DOCUMENT',
                        subject: ex.subject,
                        batch: ex.batch,
                      })}
                      className="inline-flex items-center gap-1.5 text-xs text-[#4E342E] hover:underline font-semibold"
                    >
                      <Eye className="w-3.5 h-3.5" /> View Question Paper / Syllabus
                    </button>
                  )}

                  {/* Student View Score Result Card */}
                  {isStudent && (
                    <div className="pt-2 border-t border-[#D7CCC8]/60">
                      {isResultsPub && studentMark ? (
                        <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                          studentMark.isPassed
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                            : 'bg-rose-50 border-rose-200 text-rose-950'
                        }`}>
                          <div className="flex items-center justify-between font-bold">
                            <span>Your Score: {studentMark.marksObtained} / {ex.totalMarks}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white border">
                              {studentMark.status} ({studentMark.percentage}%)
                            </span>
                          </div>
                          {studentMark.remarks && (
                            <p className="text-[11px] text-[#4E342E] italic">"{studentMark.remarks}"</p>
                          )}
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span>Results not yet published by academic staff.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Staff / Admin Actions */}
                {isStaffOrAdmin && (
                  <div className="pt-3 border-t border-[#EFEBE9] flex flex-col gap-2 text-xs">
                    <div className="flex items-center justify-between gap-1.5">
                      <button
                        onClick={() => openMarksEntry(ex)}
                        className="px-3 py-1.5 rounded-xl bg-[#4E342E] hover:bg-[#3E2723] text-white font-semibold text-xs shadow-xs"
                      >
                        Enter Marks
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openClassAnalytics(ex)}
                          className="p-1.5 rounded-lg border border-[#D7CCC8] hover:bg-[#F7F2EF] text-[#6D4C41]"
                          title="View Class Analytics"
                        >
                          <TrendingUp className="w-3.5 h-3.5" />
                        </button>

                        {!isResultsPub && (
                          <button
                            onClick={() => handlePublishSchedule(ex)}
                            className="px-2.5 py-1.5 rounded-lg border border-[#D7CCC8] hover:bg-[#F7F2EF] text-[#4E342E] font-semibold text-[11px]"
                            title="Publish exam schedule notifications"
                          >
                            {isSchedPub ? 'Resend Sched' : 'Publish Sched'}
                          </button>
                        )}

                        <button
                          onClick={() => handlePublishResults(ex)}
                          disabled={publishingResults}
                          className="px-2.5 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-semibold text-[11px] shadow-xs"
                          title="Publish official marks to students and parents"
                        >
                          {isResultsPub ? 'Republish Results' : 'Publish Results'}
                        </button>

                        <button
                          onClick={() => handleDeleteExam(ex.id)}
                          className="p-1.5 rounded-lg text-rose-700 hover:bg-rose-50"
                          title="Delete Exam"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Exam Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] flex flex-col space-y-4 shadow-2xl overflow-hidden my-6">
            <div className="flex items-center justify-between border-b border-[#EFEBE9] pb-3">
              <div>
                <h2 className="text-xl font-bold text-[#2D1E18]">Schedule New Examination</h2>
                <p className="text-xs text-[#6D4C41]">Configure test dates, timings, passing criteria, and attachments</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-[#8D6E63] hover:text-[#2D1E18]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#4E342E] font-semibold mb-1">Batch *</label>
                  <select
                    required
                    value={batchId}
                    onChange={(e) => setBatchId(e.target.value)}
                    className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18]"
                  >
                    <option value="">Select Enrolled Batch</option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#4E342E] font-semibold mb-1">Subject *</label>
                  <select
                    required
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18]"
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
                <label className="block text-[#4E342E] font-semibold mb-1">Examination Title *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Unit Test 2 - Chemical Kinetics"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#4E342E] font-semibold mb-1">Exam Type</label>
                  <select
                    value={examType}
                    onChange={(e) => setExamType(e.target.value)}
                    className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18]"
                  >
                    <option value="Unit Test">Unit Test</option>
                    <option value="Monthly Assessment">Monthly Assessment</option>
                    <option value="Term Exam">Term Exam</option>
                    <option value="Model Exam">Model Exam</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#4E342E] font-semibold mb-1">Max Marks *</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(Number(e.target.value))}
                    className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18]"
                  />
                </div>

                <div>
                  <label className="block text-[#4E342E] font-semibold mb-1">Passing Marks *</label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={passingMarks}
                    onChange={(e) => setPassingMarks(Number(e.target.value))}
                    className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#4E342E] font-semibold mb-1">Exam Date *</label>
                  <input
                    required
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18]"
                  />
                </div>

                <div>
                  <label className="block text-[#4E342E] font-semibold mb-1">Start Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 10:00 AM"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18]"
                  />
                </div>

                <div>
                  <label className="block text-[#4E342E] font-semibold mb-1">End Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 12:00 PM"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#4E342E] font-semibold mb-1">Instructions / Syllabus</label>
                <textarea
                  rows={2}
                  placeholder="Specific rules, calculator allowed, syllabus topics..."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18]"
                />
              </div>

              <div>
                <label className="block text-[#4E342E] font-semibold mb-1">Attachment (Optional Question Paper / Syllabus PDF)</label>
                <input
                  type="file"
                  onChange={(e) => setExamFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-[#6D4C41] file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#4E342E] file:text-white hover:file:bg-[#3E2723]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="schedNotif"
                  checked={isSchedulePublished}
                  onChange={(e) => setIsSchedulePublished(e.target.checked)}
                  className="accent-[#4E342E] w-4 h-4 rounded"
                />
                <label htmlFor="schedNotif" className="text-xs font-semibold text-[#2D1E18] cursor-pointer">
                  Publish Schedule immediately (notify enrolled students and parents)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EFEBE9]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-[#D7CCC8] text-[#6D4C41] rounded-xl hover:bg-[#F7F2EF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#4E342E] hover:bg-[#3E2723] text-white rounded-xl font-semibold shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Schedule Exam'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Marks Entry Modal */}
      {selectedExamForMarks && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl p-5 sm:p-7 max-w-4xl w-full max-h-[90vh] flex flex-col space-y-4 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#EFEBE9] pb-3">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-[#2D1E18] flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#6D4C41]" />
                  <span>Marks Entry: {selectedExamForMarks.title}</span>
                </h2>
                <div className="text-xs text-[#6D4C41] flex items-center gap-2 mt-0.5">
                  <span>Max Marks: <strong>{Number(selectedExamForMarks.totalMarks)}</strong></span>
                  <span>&bull;</span>
                  <span>Pass Marks: <strong>{Number(selectedExamForMarks.passingMarks)}</strong></span>
                  <span>&bull;</span>
                  <span>Status: <strong>{selectedExamForMarks.isResultsPublished ? 'Results Published' : 'Draft / Unpublished'}</strong></span>
                </div>
              </div>
              <button
                onClick={() => setSelectedExamForMarks(null)}
                className="text-[#8D6E63] hover:text-[#2D1E18] p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary Bar */}
            {marksSummary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded-xl bg-[#F7F2EF] border border-[#D7CCC8]">
                  <span className="text-[10px] text-[#8D6E63] uppercase font-bold block">Enrolled Students</span>
                  <strong className="text-sm font-bold text-[#2D1E18]">{marksSummary.totalEligible}</strong>
                </div>
                <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] text-emerald-800 uppercase font-bold block">Marks Entered</span>
                  <strong className="text-sm font-bold text-emerald-800">{marksSummary.enteredCount}</strong>
                </div>
                <div className="p-2 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="text-[10px] text-amber-800 uppercase font-bold block">Marks Pending</span>
                  <strong className="text-sm font-bold text-amber-800">{marksSummary.pendingCount}</strong>
                </div>
                <div className="p-2 rounded-xl bg-rose-50 border border-rose-200">
                  <span className="text-[10px] text-rose-800 uppercase font-bold block">Marked Absent</span>
                  <strong className="text-sm font-bold text-rose-800">{marksSummary.absentCount}</strong>
                </div>
              </div>
            )}

            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1 text-xs">
              <div className="flex items-center gap-1">
                {(['ALL', 'PENDING', 'ENTERED', 'ABSENT'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setMarksFilter(tab)}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                      marksFilter === tab
                        ? 'bg-[#4E342E] text-white shadow-xs'
                        : 'bg-[#F7F2EF] text-[#6D4C41] border border-[#D7CCC8]'
                    }`}
                  >
                    {tab === 'ALL'
                      ? 'All'
                      : tab === 'PENDING'
                      ? 'Pending'
                      : tab === 'ENTERED'
                      ? 'Entered'
                      : 'Absent'}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Search student or admission no..."
                value={marksSearch}
                onChange={(e) => setMarksSearch(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[#F7F2EF] border border-[#D7CCC8] text-[#2D1E18]"
              />
            </div>

            {/* Student Marks Table */}
            <div className="flex-1 overflow-y-auto border border-[#D7CCC8] rounded-2xl">
              {loadingMarksRoster ? (
                <div className="p-12 text-center text-[#8D6E63] text-xs">Loading roster...</div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F2EF] border-b border-[#D7CCC8] text-[#6D4C41] uppercase tracking-wider text-[10px] sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Student</th>
                      <th className="py-2.5 px-3">Admission No</th>
                      <th className="py-2.5 px-3 w-32">Marks Obtained (Max: {Number(selectedExamForMarks.totalMarks)})</th>
                      <th className="py-2.5 px-3 text-center">Absent</th>
                      <th className="py-2.5 px-3">Remarks / Feedback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFEBE9]">
                    {(() => {
                      let filtered = marksRoster;
                      if (marksFilter === 'PENDING') {
                        filtered = filtered.filter((r) => {
                          const state = marksState[r.student.id];
                          return !state?.isAbsent && (state?.marksObtained === '' || state?.marksObtained === undefined);
                        });
                      } else if (marksFilter === 'ENTERED') {
                        filtered = filtered.filter((r) => {
                          const state = marksState[r.student.id];
                          return !state?.isAbsent && state?.marksObtained !== '' && state?.marksObtained !== undefined;
                        });
                      } else if (marksFilter === 'ABSENT') {
                        filtered = filtered.filter((r) => marksState[r.student.id]?.isAbsent);
                      }

                      if (marksSearch.trim()) {
                        const q = marksSearch.toLowerCase();
                        filtered = filtered.filter(
                          (r) =>
                            r.student.firstName.toLowerCase().includes(q) ||
                            r.student.lastName.toLowerCase().includes(q) ||
                            r.student.admissionNumber.toLowerCase().includes(q)
                        );
                      }

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-xs text-[#8D6E63]">
                              No students match the current filter.
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map((r) => {
                        const st = r.student;
                        const state = marksState[st.id] || { marksObtained: '', isAbsent: false, remarks: '' };
                        const maxMarks = Number(selectedExamForMarks.totalMarks);

                        return (
                          <tr key={st.id} className="hover:bg-[#F7F2EF]/50">
                            <td className="py-2.5 px-3 font-semibold text-[#2D1E18]">
                              {st.firstName} {st.lastName}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[#6D4C41]">
                              {st.admissionNumber}
                            </td>
                            <td className="py-2.5 px-3">
                              <input
                                type="number"
                                min="0"
                                max={maxMarks}
                                disabled={state.isAbsent}
                                value={state.isAbsent ? '' : state.marksObtained}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setMarksState((prev) => ({
                                    ...prev,
                                    [st.id]: {
                                      ...prev[st.id],
                                      marksObtained: val,
                                    },
                                  }));
                                }}
                                placeholder={state.isAbsent ? 'Absent' : `0 - ${maxMarks}`}
                                className="w-24 bg-white border border-[#D7CCC8] rounded-lg px-2 py-1 text-xs text-[#2D1E18] disabled:bg-gray-100 disabled:text-gray-400 font-mono"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={state.isAbsent}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setMarksState((prev) => ({
                                    ...prev,
                                    [st.id]: {
                                      ...prev[st.id],
                                      isAbsent: checked,
                                      marksObtained: checked ? 0 : '',
                                    },
                                  }));
                                }}
                                className="accent-[#4E342E] w-4 h-4 cursor-pointer"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <input
                                type="text"
                                placeholder="Optional feedback..."
                                value={state.remarks || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setMarksState((prev) => ({
                                    ...prev,
                                    [st.id]: {
                                      ...prev[st.id],
                                      remarks: val,
                                    },
                                  }));
                                }}
                                className="w-full bg-white border border-[#D7CCC8] rounded-lg px-2.5 py-1 text-xs text-[#2D1E18]"
                              />
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-[#EFEBE9]">
              <span className="text-[11px] text-[#8D6E63]">
                Saving marks as draft keeps them confidential until you click Publish Results.
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedExamForMarks(null)}
                  className="px-4 py-2 border border-[#D7CCC8] text-[#6D4C41] rounded-xl text-xs hover:bg-[#F7F2EF]"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveMarks(true)}
                  disabled={savingMarks}
                  className="px-4 py-2 bg-[#4E342E] hover:bg-[#3E2723] text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {savingMarks ? 'Saving Draft...' : 'Save Draft Marks'}
                </button>

                <button
                  type="button"
                  onClick={() => handlePublishResults(selectedExamForMarks)}
                  disabled={publishingResults}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {publishingResults ? 'Publishing...' : 'Publish Official Results'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Modal */}
      {selectedAnalyticsExam && analyticsData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EFEBE9] pb-3">
              <h2 className="text-lg font-bold text-[#2D1E18]">Class Performance Analytics</h2>
              <button onClick={() => setSelectedAnalyticsExam(null)} className="text-[#8D6E63] hover:text-[#2D1E18]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#F7F2EF] border border-[#D7CCC8]">
                <span className="text-[10px] text-[#8D6E63] uppercase font-bold block">Class Average</span>
                <strong className="text-base font-bold text-[#2D1E18]">{analyticsData.averageScore} / {selectedAnalyticsExam.totalMarks}</strong>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] text-emerald-800 uppercase font-bold block">Pass Rate</span>
                <strong className="text-base font-bold text-emerald-800">{analyticsData.passPercentage}%</strong>
              </div>
              <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
                <span className="text-[10px] text-purple-800 uppercase font-bold block">Highest Score</span>
                <strong className="text-base font-bold text-purple-800">{analyticsData.highestScore}</strong>
              </div>
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                <span className="text-[10px] text-rose-800 uppercase font-bold block">Absent Count</span>
                <strong className="text-base font-bold text-rose-800">{analyticsData.absentCount}</strong>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedAnalyticsExam(null)}
                className="px-4 py-2 bg-[#4E342E] text-white rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Material / Attachment Viewer Modal */}
      {previewMaterial && (
        <MaterialViewerModal
          material={previewMaterial}
          onClose={() => setPreviewMaterial(null)}
        />
      )}
    </div>
  );
};
