import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import { Batch, Subject } from '../types';
import { Layers, BookOpen, Plus, X, Users } from 'lucide-react';

export const AcademicsManagement: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);

  const [batchForm, setBatchForm] = useState({
    name: '',
    academicYear: '2026-2027',
    startDate: '',
    endDate: '',
  });

  const [subjectForm, setSubjectForm] = useState({
    name: '',
    code: '',
    description: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [batchesRes, subjectsRes] = await Promise.all([
        apiFetch('/academics/batches'),
        apiFetch('/academics/subjects'),
      ]);
      setBatches(batchesRes.data?.batches || []);
      setSubjects(subjectsRes.data?.subjects || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/academics/batches', {
        method: 'POST',
        body: JSON.stringify(batchForm),
      });
      if (res.success) {
        setShowBatchModal(false);
        setBatchForm({ name: '', academicYear: '2026-2027', startDate: '', endDate: '' });
        fetchData();
      }
    } catch (err: any) {
      alert(`Error creating batch: ${err.message}`);
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/academics/subjects', {
        method: 'POST',
        body: JSON.stringify(subjectForm),
      });
      if (res.success) {
        setShowSubjectModal(false);
        setSubjectForm({ name: '', code: '', description: '' });
        fetchData();
      }
    } catch (err: any) {
      alert(`Error creating subject: ${err.message}`);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-[#2D1E18]">Academics & Batch Setup</h1>
        <p className="text-sm text-[#6D4C41] mt-1">Configure class batches, academic sections, and subjects taught</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Batches Section */}
        <div className="bg-white border border-[#D7CCC8] rounded-2xl p-6 shadow-sm text-[#2D1E18]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[#2D1E18] flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#4E342E]" /> Academic Batches ({batches.length})
            </h2>
            <button
              onClick={() => setShowBatchModal(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#4E342E] hover:bg-[#3E2723] text-white px-3 py-1.5 rounded-xl shadow-md transition"
            >
              <Plus className="w-3.5 h-3.5" /> Add Batch
            </button>
          </div>

          <div className="space-y-2">
            {loading ? (
              <div className="py-6 text-center text-xs text-[#6D4C41]">Loading batches...</div>
            ) : batches.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#6D4C41]">No batches created yet.</div>
            ) : (
              batches.map((b) => (
                <div key={b.id} className="p-3.5 rounded-xl bg-[#F7F2EF] border border-[#D7CCC8] flex items-center justify-between">
                  <div>
                    <div className="font-bold text-[#2D1E18] text-sm">{b.name}</div>
                    <div className="text-xs text-[#6D4C41] mt-0.5">Academic Year: {b.academicYear}</div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#4E342E] bg-white px-2.5 py-1 rounded-lg border border-[#D7CCC8] font-semibold">
                    <Users className="w-3.5 h-3.5 text-[#6D4C41]" />
                    <span>{b._count?.enrollments || 0} Students</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Subjects Section */}
        <div className="bg-white border border-[#D7CCC8] rounded-2xl p-6 shadow-sm text-[#2D1E18]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[#2D1E18] flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#6D4C41]" /> Subjects Curriculum ({subjects.length})
            </h2>
            <button
              onClick={() => setShowSubjectModal(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#6D4C41] hover:bg-[#4E342E] text-white px-3 py-1.5 rounded-xl shadow-md transition"
            >
              <Plus className="w-3.5 h-3.5" /> Add Subject
            </button>
          </div>

          <div className="space-y-2">
            {loading ? (
              <div className="py-6 text-center text-xs text-[#6D4C41]">Loading subjects...</div>
            ) : subjects.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#6D4C41]">No subjects created yet.</div>
            ) : (
              subjects.map((s) => (
                <div key={s.id} className="p-3.5 rounded-xl bg-[#F7F2EF] border border-[#D7CCC8] flex items-center justify-between">
                  <div>
                    <div className="font-bold text-[#2D1E18] text-sm">{s.name}</div>
                    {s.description && <div className="text-xs text-[#6D4C41] mt-0.5">{s.description}</div>}
                  </div>
                  {s.code && (
                    <span className="font-mono text-xs font-semibold text-[#4E342E] bg-white px-2.5 py-1 rounded-lg border border-[#D7CCC8]">
                      {s.code}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Create Batch Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl w-full max-w-md p-6 shadow-2xl text-[#2D1E18]">
            <div className="flex items-center justify-between pb-4 border-b border-[#EFEBE9]">
              <h2 className="text-lg font-bold text-[#2D1E18]">Create New Batch</h2>
              <button onClick={() => setShowBatchModal(false)} className="text-[#8D6E63] hover:text-[#2D1E18] p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-3 mt-4">
              <div>
                <label className="block text-xs font-semibold text-[#4E342E] mb-1">Batch Name*</label>
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
                <label className="block text-xs font-semibold text-[#4E342E] mb-1">Academic Year*</label>
                <input
                  type="text"
                  required
                  value={batchForm.academicYear}
                  onChange={(e) => setBatchForm({ ...batchForm, academicYear: e.target.value })}
                  placeholder="e.g. 2026-2027"
                  className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowBatchModal(false)} className="px-4 py-2 text-xs font-semibold text-[#6D4C41] hover:text-[#2D1E18]">
                  Cancel
                </button>
                <button type="submit" className="bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-md transition">
                  Save Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Subject Modal */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl w-full max-w-md p-6 shadow-2xl text-[#2D1E18]">
            <div className="flex items-center justify-between pb-4 border-b border-[#EFEBE9]">
              <h2 className="text-lg font-bold text-[#2D1E18]">Create New Subject</h2>
              <button onClick={() => setShowSubjectModal(false)} className="text-[#8D6E63] hover:text-[#2D1E18] p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubject} className="space-y-3 mt-4">
              <div>
                <label className="block text-xs font-semibold text-[#4E342E] mb-1">Subject Name*</label>
                <input
                  type="text"
                  required
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  placeholder="e.g. Advanced Physics"
                  className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4E342E] mb-1">Subject Code</label>
                <input
                  type="text"
                  value={subjectForm.code}
                  onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. PHY-10"
                  className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] uppercase focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4E342E] mb-1">Description</label>
                <textarea
                  rows={2}
                  value={subjectForm.description}
                  onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                  placeholder="e.g. Mechanics, Optics, and Thermodynamics"
                  className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowSubjectModal(false)} className="px-4 py-2 text-xs font-semibold text-[#6D4C41] hover:text-[#2D1E18]">
                  Cancel
                </button>
                <button type="submit" className="bg-[#6D4C41] hover:bg-[#4E342E] text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-md transition">
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
