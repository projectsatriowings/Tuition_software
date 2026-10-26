import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen,
  FileText,
  Headphones,
  Mic,
  Bell,
  Upload,
  Download,
  Trash2,
  Search,
  Filter,
  Plus,
  Calendar,
  CheckCircle,
  AlertCircle,
  X,
} from 'lucide-react';

export const MaterialsManagement: React.FC = () => {
  const { user } = useAuth();
  const isStaffOrAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ACADEMIC_ADMIN' || user?.role === 'STAFF';

  const [materials, setMaterials] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedBatch, setSelectedBatch] = useState<string>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('PDF');
  const [batchId, setBatchId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadMaterials();
    if (isStaffOrAdmin) {
      loadBatchesAndSubjects();
    }
  }, []);

  async function loadMaterials() {
    try {
      setLoading(true);
      const res = await apiFetch('/materials');
      if (res.success) {
        setMaterials(res.data.materials || []);
      }
    } catch (err: any) {
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!batchId || !subjectId) {
      setMessage({ text: 'Please select both batch and subject', type: 'error' });
      return;
    }

    try {
      setSubmitting(true);
      setMessage(null);

      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('type', type);
      formData.append('batchId', batchId);
      formData.append('subjectId', subjectId);
      if (dueDate) formData.append('dueDate', dueDate);
      if (file) formData.append('file', file);

      const token = localStorage.getItem('tuition_token');
      const instId = localStorage.getItem('tuition_active_institute_id');

      const res = await fetch('/api/materials', {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(instId ? { 'x-institute-id': instId } : {}),
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setMessage({ text: 'Learning material published successfully!', type: 'success' });
      setShowCreateModal(false);
      resetForm();
      loadMaterials();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to remove this learning material?')) return;
    try {
      await apiFetch(`/materials/${id}`, { method: 'DELETE' });
      loadMaterials();
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    }
  }

  function resetForm() {
    setTitle('');
    setDescription('');
    setType('PDF');
    setBatchId('');
    setSubjectId('');
    setDueDate('');
    setFile(null);
  }

  const filteredMaterials = materials.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      (m.description && m.description.toLowerCase().includes(search.toLowerCase()));
    const matchesType = selectedType === 'ALL' || m.type === selectedType;
    const matchesBatch = selectedBatch === 'ALL' || m.batchId === selectedBatch;
    return matchesSearch && matchesType && matchesBatch;
  });

  const getTypeIcon = (mType: string) => {
    switch (mType) {
      case 'PDF':
        return <FileText className="w-5 h-5 text-rose-600" />;
      case 'AUDIO':
        return <Headphones className="w-5 h-5 text-sky-600" />;
      case 'VOICE_NOTE':
        return <Mic className="w-5 h-5 text-amber-600" />;
      case 'ANNOUNCEMENT':
        return <Bell className="w-5 h-5 text-[#6D4C41]" />;
      default:
        return <BookOpen className="w-5 h-5 text-emerald-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2D1E18] flex items-center gap-2.5">
            <BookOpen className="w-7 h-7 text-[#6D4C41]" />
            <span>Learning Materials & Educational Resources</span>
          </h1>
          <p className="text-sm text-[#6D4C41] mt-1">
            Access chapter notes, recorded audio lectures, formula sheets, and study materials
          </p>
        </div>

        {isStaffOrAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#4E342E] hover:bg-[#3E2723] text-white rounded-xl font-semibold text-sm shadow-sm transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Upload Material
          </button>
        )}
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2.5 ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border border-[#D7CCC8] shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#8D6E63] absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search notes, topics, formulas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl pl-10 pr-4 py-2 text-sm text-[#2D1E18] placeholder-[#8D6E63] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
          >
            <option value="ALL">All Types</option>
            <option value="PDF">PDF Notes</option>
            <option value="AUDIO">Audio Lectures</option>
            <option value="VOICE_NOTE">Voice Notes</option>
            <option value="ANNOUNCEMENT">Announcements</option>
          </select>

          {isStaffOrAdmin && batches.length > 0 && (
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
            >
              <option value="ALL">All Batches</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Materials Grid */}
      {loading ? (
        <div className="p-12 text-center text-[#8D6E63] text-sm flex items-center justify-center gap-3">
          <div className="w-4 h-4 rounded-full bg-[#6D4C41] animate-ping"></div>
          <span>Loading curriculum materials...</span>
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-[#D7CCC8] text-[#8D6E63] text-sm shadow-sm">
          No learning materials found matching your criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMaterials.map((mat) => (
            <div
              key={mat.id}
              className="p-5 rounded-2xl bg-white border border-[#D7CCC8] shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="p-2.5 rounded-xl bg-[#F7F2EF] border border-[#EFEBE9]">
                    {getTypeIcon(mat.type)}
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#D7CCC8]/40 text-[#4E342E] border border-[#BCAAA4]">
                    {mat.type}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-[#2D1E18] text-base leading-snug line-clamp-1">{mat.title}</h3>
                  {mat.description && (
                    <p className="text-xs text-[#6D4C41] mt-1 line-clamp-2">{mat.description}</p>
                  )}
                </div>

                <div className="pt-2 flex flex-wrap gap-2 text-[11px] text-[#6D4C41]">
                  <span className="px-2 py-0.5 rounded bg-[#F7F2EF] border border-[#D7CCC8]">
                    {mat.batch?.name || 'Class Batch'}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#F7F2EF] border border-[#D7CCC8]">
                    {mat.subject?.name || 'Subject'}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#EFEBE9] flex items-center justify-between text-xs">
                <span className="text-[11px] text-[#8D6E63]">
                  {new Date(mat.createdAt).toLocaleDateString()}
                </span>

                <div className="flex items-center gap-2">
                  {mat.fileUrl && (
                    <a
                      href={`/api/materials/${mat.id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-[#4E342E]/10 hover:bg-[#4E342E] text-[#4E342E] hover:text-white border border-[#D7CCC8] flex items-center gap-1.5 transition-colors font-medium text-xs"
                    >
                      <Download className="w-3.5 h-3.5" /> Preview / Download
                    </a>
                  )}

                  {isStaffOrAdmin && (
                    <button
                      onClick={() => handleDelete(mat.id)}
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
                      title="Delete Material"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Material Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EFEBE9] pb-3">
              <h2 className="text-xl font-bold text-[#2D1E18] flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#6D4C41]" /> Upload Learning Material
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[#8D6E63] hover:text-[#2D1E18]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#4E342E] mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chapter 4 - Geometry Formula Sheet"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3.5 py-2.5 text-sm text-[#2D1E18] placeholder-[#8D6E63] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#4E342E] mb-1">Batch *</label>
                  <select
                    required
                    value={batchId}
                    onChange={(e) => setBatchId(e.target.value)}
                    className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2.5 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
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
                    className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2.5 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
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
                <label className="block text-xs font-semibold text-[#4E342E] mb-1">Material Type *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2.5 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                >
                  <option value="PDF">PDF Document / Notes</option>
                  <option value="AUDIO">Audio Lecture (MP3, WAV)</option>
                  <option value="VOICE_NOTE">Voice Note</option>
                  <option value="ANNOUNCEMENT">Announcement / Syllabus Guide</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4E342E] mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Key concepts or instructions for students..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3.5 py-2 text-sm text-[#2D1E18] placeholder-[#8D6E63] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4E342E] mb-1">
                  File Attachment (PDF, Audio, or Images up to 25MB)
                </label>
                <input
                  type="file"
                  accept="application/pdf,audio/*,image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-[#6D4C41] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#4E342E] file:text-white hover:file:bg-[#3E2723]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#EFEBE9]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#D7CCC8] text-xs font-semibold text-[#6D4C41] hover:bg-[#F7F2EF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-semibold shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Uploading...' : 'Publish Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
