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
  Plus,
  CheckCircle,
  AlertCircle,
  X,
  Image as ImageIcon,
  FileCode,
  Eye,
  Layers,
  Sparkles,
} from 'lucide-react';

export const MaterialsManagement: React.FC = () => {
  const { user } = useAuth();
  const isStaffOrAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ACADEMIC_ADMIN' || user?.role === 'STAFF';

  const [materials, setMaterials] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedBatch, setSelectedBatch] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('PDF');
  const [batchId, setBatchId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Text Note Reader Modal
  const [readingMaterial, setReadingMaterial] = useState<any | null>(null);

  useEffect(() => {
    loadMaterials();
    if (isStaffOrAdmin) {
      loadBatches();
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

  async function loadBatches() {
    try {
      const bRes = await apiFetch('/academics/batches');
      if (bRes.success) {
        setBatches(bRes.data.batches || []);
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Derive subjects belonging specifically to the chosen batch
  const selectedBatchObj = batches.find((b) => b.id === batchId);
  const availableSubjects: any[] = selectedBatchObj?.batchSubjects?.map((bs: any) => bs.subject).filter(Boolean) || [];

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!batchId) {
      setMessage({ text: 'Please select a batch for this material', type: 'error' });
      return;
    }

    if (type !== 'TEXT' && type !== 'ANNOUNCEMENT' && !file) {
      setMessage({ text: 'Please attach a file for this material type, or select Text Notes', type: 'error' });
      return;
    }

    try {
      setSubmitting(true);
      setMessage(null);

      const formData = new FormData();
      formData.append('title', title.trim());
      if (description) formData.append('description', description.trim());
      if (content) formData.append('content', content.trim());
      formData.append('type', type);
      formData.append('batchId', batchId);
      if (subjectId) formData.append('subjectId', subjectId);
      formData.append('isPublished', String(isPublished));
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

      setMessage({
        text: isPublished
          ? 'Learning material published successfully to student portal!'
          : 'Learning material saved as draft (visible to faculty only).',
        type: 'success',
      });
      setShowCreateModal(false);
      resetForm();
      loadMaterials();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTogglePublish(mat: any) {
    try {
      const nextStatus = !mat.isPublished;
      const res = await apiFetch(`/materials/${mat.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isPublished: nextStatus }),
      });
      if (res.success) {
        setMessage({
          text: nextStatus
            ? 'Material published to enrolled students!'
            : 'Material moved back to drafts.',
          type: 'success',
        });
        loadMaterials();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update publication status');
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
    setContent('');
    setType('PDF');
    setBatchId('');
    setSubjectId('');
    setIsPublished(true);
    setFile(null);
  }

  const filteredMaterials = materials.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      (m.description && m.description.toLowerCase().includes(search.toLowerCase())) ||
      (m.content && m.content.toLowerCase().includes(search.toLowerCase()));

    const matchesType = selectedType === 'ALL' || m.type === selectedType;
    const matchesBatch = selectedBatch === 'ALL' || m.batchId === selectedBatch;

    let matchesStatus = true;
    if (selectedStatus === 'PUBLISHED') matchesStatus = m.isPublished === true;
    if (selectedStatus === 'DRAFT') matchesStatus = m.isPublished === false;

    return matchesSearch && matchesType && matchesBatch && matchesStatus;
  });

  const getTypeIcon = (mType: string) => {
    switch (mType) {
      case 'PDF':
        return <FileText className="w-5 h-5 text-rose-600" />;
      case 'IMAGE':
        return <ImageIcon className="w-5 h-5 text-indigo-600" />;
      case 'AUDIO':
        return <Headphones className="w-5 h-5 text-sky-600" />;
      case 'VOICE_NOTE':
        return <Mic className="w-5 h-5 text-amber-600" />;
      case 'TEXT':
        return <FileCode className="w-5 h-5 text-emerald-600" />;
      case 'ANNOUNCEMENT':
        return <Bell className="w-5 h-5 text-[#6D4C41]" />;
      default:
        return <BookOpen className="w-5 h-5 text-[#6D4C41]" />;
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
            Access chapter notes, recorded lectures, formula sheets, diagrams, and study materials
          </p>
        </div>

        {isStaffOrAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#4E342E] hover:bg-[#3E2723] text-white rounded-xl font-semibold text-sm shadow-sm transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Upload / Create Material
          </button>
        )}
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between gap-2.5 ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-current hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
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

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
          >
            <option value="ALL">All Material Types</option>
            <option value="PDF">PDF Notes</option>
            <option value="IMAGE">Images & Diagrams</option>
            <option value="AUDIO">Audio Lectures</option>
            <option value="VOICE_NOTE">Voice Notes</option>
            <option value="TEXT">Text Notes & Guides</option>
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

          {isStaffOrAdmin && (
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
            >
              <option value="ALL">All Status</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Drafts Only</option>
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
        <div className="p-12 text-center rounded-2xl bg-white border border-[#D7CCC8] text-[#8D6E63] text-sm shadow-sm space-y-2">
          <BookOpen className="w-8 h-8 text-[#BCAAA4] mx-auto" />
          <p className="font-medium">No learning materials found matching your criteria.</p>
          <p className="text-xs text-[#A1887F]">Materials assigned to your batches and subjects will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMaterials.map((mat) => (
            <div
              key={mat.id}
              className={`p-5 rounded-2xl bg-white border shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 ${
                !mat.isPublished ? 'border-amber-300 bg-amber-50/20' : 'border-[#D7CCC8]'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="p-2.5 rounded-xl bg-[#F7F2EF] border border-[#EFEBE9]">
                    {getTypeIcon(mat.type)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {!mat.isPublished && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 uppercase">
                        Draft
                      </span>
                    )}
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#D7CCC8]/40 text-[#4E342E] border border-[#BCAAA4]">
                      {mat.type}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-[#2D1E18] text-base leading-snug line-clamp-1">{mat.title}</h3>
                  {mat.description && (
                    <p className="text-xs text-[#6D4C41] mt-1 line-clamp-2">{mat.description}</p>
                  )}
                  {mat.content && (
                    <p className="text-xs text-[#8D6E63] mt-1 line-clamp-2 font-mono bg-[#F7F2EF] p-2 rounded-lg border border-[#EFEBE9]">
                      {mat.content}
                    </p>
                  )}
                </div>

                <div className="pt-2 flex flex-wrap gap-2 text-[11px] text-[#6D4C41]">
                  <span className="px-2 py-0.5 rounded bg-[#F7F2EF] border border-[#D7CCC8]">
                    {mat.batch?.name || 'Class Batch'}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#F7F2EF] border border-[#D7CCC8]">
                    {mat.subject?.name ? mat.subject.name : 'Entire Batch (All Subjects)'}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#EFEBE9] flex items-center justify-between text-xs">
                <span className="text-[11px] text-[#8D6E63]">
                  {new Date(mat.createdAt).toLocaleDateString()}
                </span>

                <div className="flex items-center gap-1.5">
                  {mat.content && (
                    <button
                      onClick={() => setReadingMaterial(mat)}
                      className="p-2 rounded-xl bg-[#4E342E]/10 hover:bg-[#4E342E] text-[#4E342E] hover:text-white border border-[#D7CCC8] flex items-center gap-1 transition-colors font-medium text-xs"
                      title="Read Study Notes"
                    >
                      <Eye className="w-3.5 h-3.5" /> Read
                    </button>
                  )}

                  {mat.fileUrl && (
                    <a
                      href={`/api/materials/${mat.id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-[#4E342E]/10 hover:bg-[#4E342E] text-[#4E342E] hover:text-white border border-[#D7CCC8] flex items-center gap-1 transition-colors font-medium text-xs"
                      title="Preview or Download Attachment"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </a>
                  )}

                  {isStaffOrAdmin && (
                    <>
                      <button
                        onClick={() => handleTogglePublish(mat)}
                        className={`p-2 rounded-xl border text-[11px] font-semibold transition-colors ${
                          mat.isPublished
                            ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                        }`}
                        title={mat.isPublished ? 'Unpublish to Draft' : 'Publish to Students'}
                      >
                        {mat.isPublished ? 'Draft' : 'Publish'}
                      </button>

                      <button
                        onClick={() => handleDelete(mat.id)}
                        className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
                        title="Delete Material"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Text Note Full Reader Modal */}
      {readingMaterial && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[85vh] flex flex-col space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EFEBE9] pb-3">
              <div>
                <h2 className="text-xl font-bold text-[#2D1E18]">{readingMaterial.title}</h2>
                <div className="flex items-center gap-2 mt-1 text-xs text-[#6D4C41]">
                  <span>{readingMaterial.batch?.name}</span>
                  <span>&bull;</span>
                  <span>{readingMaterial.subject?.name || 'Batch-wide'}</span>
                  <span>&bull;</span>
                  <span>{new Date(readingMaterial.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <button
                onClick={() => setReadingMaterial(null)}
                className="text-[#8D6E63] hover:text-[#2D1E18]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-sm text-[#2D1E18]">
              {readingMaterial.description && (
                <div className="p-3 bg-[#F7F2EF] rounded-xl border border-[#EFEBE9] text-xs text-[#6D4C41]">
                  <strong className="block text-[#4E342E] mb-0.5">Overview / Instructions:</strong>
                  {readingMaterial.description}
                </div>
              )}

              <div className="prose max-w-none whitespace-pre-wrap font-sans leading-relaxed p-4 bg-[#FAF7F5] rounded-2xl border border-[#D7CCC8]">
                {readingMaterial.content || 'No text content attached.'}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end border-t border-[#EFEBE9]">
              <button
                onClick={() => setReadingMaterial(null)}
                className="px-4 py-2 bg-[#4E342E] hover:bg-[#3E2723] text-white rounded-xl text-xs font-semibold"
              >
                Close Notes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Material Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-[#EFEBE9] pb-3">
              <h2 className="text-xl font-bold text-[#2D1E18] flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#6D4C41]" /> Create / Upload Learning Material
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
                  placeholder="e.g. Chapter 4 - Geometry Formula Sheet & Proofs"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3.5 py-2.5 text-sm text-[#2D1E18] placeholder-[#8D6E63] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#4E342E] mb-1">Batch *</label>
                  <select
                    required
                    value={batchId}
                    onChange={(e) => {
                      setBatchId(e.target.value);
                      setSubjectId(''); // Reset subject when batch changes
                    }}
                    className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2.5 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                  >
                    <option value="">Select Target Batch</option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#4E342E] mb-1">
                    Subject Allocation
                  </label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    disabled={!batchId}
                    className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2.5 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63] disabled:opacity-50"
                  >
                    <option value="">Entire Batch (All Subjects)</option>
                    {availableSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.code ? `(${s.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#4E342E] mb-1">Material Type *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2.5 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                  >
                    <option value="PDF">PDF Notes / Document</option>
                    <option value="IMAGE">Image / Diagram / Chart</option>
                    <option value="AUDIO">Audio Lecture (MP3, WAV)</option>
                    <option value="VOICE_NOTE">Voice Note</option>
                    <option value="TEXT">Text Notes & Study Instructions</option>
                    <option value="ANNOUNCEMENT">Announcement / Syllabus Guide</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#4E342E] mb-1">Publication Status *</label>
                  <select
                    value={isPublished ? 'PUBLISHED' : 'DRAFT'}
                    onChange={(e) => setIsPublished(e.target.value === 'PUBLISHED')}
                    className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2.5 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                  >
                    <option value="PUBLISHED">Publish to Students Immediately</option>
                    <option value="DRAFT">Save as Draft (Faculty Only)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4E342E] mb-1">Description / Summary (Optional)</label>
                <input
                  type="text"
                  placeholder="Brief note or chapter reference..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3.5 py-2 text-sm text-[#2D1E18] placeholder-[#8D6E63] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>

              {type === 'TEXT' && (
                <div>
                  <label className="block text-xs font-semibold text-[#4E342E] mb-1">
                    Study Notes / Study Instructions (Text Content) *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Enter study guide, derivation, equations, or key instructions for students..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3.5 py-2 text-sm text-[#2D1E18] placeholder-[#8D6E63] focus:outline-none focus:ring-2 focus:ring-[#8D6E63] font-mono text-xs"
                  />
                </div>
              )}

              {type !== 'TEXT' && (
                <div>
                  <label className="block text-xs font-semibold text-[#4E342E] mb-1">
                    Attachment File {type === 'ANNOUNCEMENT' ? '(Optional)' : '*'}
                  </label>
                  <input
                    type="file"
                    required={type !== 'ANNOUNCEMENT'}
                    accept={
                      type === 'PDF'
                        ? 'application/pdf'
                        : type === 'IMAGE'
                        ? 'image/*'
                        : type === 'AUDIO' || type === 'VOICE_NOTE'
                        ? 'audio/*'
                        : '*/*'
                    }
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-[#6D4C41] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#4E342E] file:text-white hover:file:bg-[#3E2723]"
                  />
                  <p className="text-[11px] text-[#8D6E63] mt-1">
                    Supports PDFs, PNG, JPG, WebP images, MP3 and WAV audio up to 25MB.
                  </p>
                </div>
              )}

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
                  className="px-5 py-2.5 rounded-xl bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-semibold shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {submitting ? 'Saving Material...' : isPublished ? 'Publish Material' : 'Save Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
