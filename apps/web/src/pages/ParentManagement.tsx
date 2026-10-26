import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import { Parent, Student } from '../types';
import { UserCheck, Plus, Search, Link as LinkIcon, Trash2, X, Phone, Mail, CheckCircle } from 'lucide-react';

export const ParentManagement: React.FC = () => {
  const [parents, setParents] = useState<Parent[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal States
  const [showAddParentModal, setShowAddParentModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedParent, setSelectedParent] = useState<Parent | null>(null);

  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [parentForm, setParentForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    occupation: '',
    address: '',
    altPhone: '',
  });

  const [linkForm, setLinkForm] = useState({
    studentId: '',
    relation: 'MOTHER' as 'FATHER' | 'MOTHER' | 'GUARDIAN',
    isPrimaryContact: true,
    canReceiveSms: true,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [parentsRes, studentsRes] = await Promise.all([
        apiFetch(`/parents?search=${encodeURIComponent(search)}`),
        apiFetch('/students?status=ACTIVE'),
      ]);
      setParents(parentsRes.data?.parents || []);
      setStudents(studentsRes.data?.students || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search]);

  const handleCreateParent = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setAddLoading(true);

    try {
      const res = await apiFetch('/parents', {
        method: 'POST',
        body: JSON.stringify(parentForm),
      });

      if (res.success) {
        setShowAddParentModal(false);
        setParentForm({
          fullName: '',
          phone: '',
          email: '',
          occupation: '',
          address: '',
          altPhone: '',
        });
        fetchData();
      }
    } catch (err: any) {
      setAddError(err.message || 'Failed to create parent');
    } finally {
      setAddLoading(false);
    }
  };

  const handleLinkGuardian = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParent || !linkForm.studentId) return;

    try {
      await apiFetch(`/parents/students/${linkForm.studentId}/guardians`, {
        method: 'POST',
        body: JSON.stringify({
          parentId: selectedParent.id,
          relation: linkForm.relation,
          isPrimaryContact: linkForm.isPrimaryContact,
          canReceiveSms: linkForm.canReceiveSms,
        }),
      });

      setShowLinkModal(false);
      setSelectedParent(null);
      fetchData();
    } catch (err: any) {
      alert(`Error linking guardian: ${err.message}`);
    }
  };

  const handleRevokeLink = async (studentId: string, parentId: string) => {
    if (!window.confirm('Are you sure you want to revoke this student-parent link?')) return;

    try {
      await apiFetch(`/parents/students/${studentId}/guardians/${parentId}`, {
        method: 'DELETE',
      });
      fetchData();
    } catch (err: any) {
      alert(`Error revoking link: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2D1E18]">Parent & Guardian Management</h1>
          <p className="text-sm text-[#6D4C41] mt-1">Multi-child relationships, verified contacts, and SMS channels</p>
        </div>
        <button
          onClick={() => setShowAddParentModal(true)}
          className="inline-flex items-center gap-2 bg-[#4E342E] hover:bg-[#3E2723] text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-md shadow-[#3E2723]/25 transition-all self-start"
        >
          <Plus className="w-4 h-4" /> Add Parent / Guardian
        </button>
      </div>

      <div className="bg-white border border-[#D7CCC8] rounded-2xl p-6 shadow-sm">
        <div className="w-full sm:w-80 relative mb-6">
          <Search className="w-4 h-4 text-[#8D6E63] absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by parent name, phone, email..."
            className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl pl-10 pr-4 py-2 text-xs text-[#2D1E18] placeholder-[#A1887F] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#D7CCC8] text-[#6D4C41] bg-[#F7F2EF] uppercase tracking-wider">
                <th className="py-3 px-4 font-bold">Guardian Name</th>
                <th className="py-3 px-4 font-bold">Phone / SMS Contact</th>
                <th className="py-3 px-4 font-bold">Occupation / Address</th>
                <th className="py-3 px-4 font-bold">Linked Children</th>
                <th className="py-3 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFEBE9]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#6D4C41]">Loading parents directory...</td>
                </tr>
              ) : parents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#6D4C41]">No parent accounts found.</td>
                </tr>
              ) : (
                parents.map((parent) => (
                  <tr key={parent.id} className="hover:bg-[#FDFBF7] transition-colors">
                    <td className="py-3.5 px-4 font-bold text-[#2D1E18] text-sm">
                      {parent.user.fullName}
                      {parent.user.email && (
                        <div className="text-[11px] text-[#6D4C41] flex items-center gap-1 font-normal">
                          <Mail className="w-3 h-3 text-[#8D6E63]" /> {parent.user.email}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-[#5D4037] font-mono">
                      <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                        <Phone className="w-3 h-3 text-emerald-600" /> {parent.user.phone}
                      </div>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">SMS Verified</span>
                    </td>
                    <td className="py-3.5 px-4 text-[#5D4037]">
                      <div className="font-medium text-[#2D1E18]">{parent.occupation || '—'}</div>
                      <div className="text-[11px] text-[#6D4C41]">{parent.address || ''}</div>
                    </td>
                    <td className="py-3.5 px-4 text-[#5D4037]">
                      {parent.studentRelations && parent.studentRelations.length > 0 ? (
                        <div className="space-y-1">
                          {parent.studentRelations.map((rel) => (
                            <div key={rel.id} className="flex items-center justify-between gap-2 bg-[#F7F2EF] px-2.5 py-1.5 rounded-lg border border-[#D7CCC8] text-[11px]">
                              <span>
                                <strong className="text-[#2D1E18]">{rel.student.firstName} {rel.student.lastName}</strong>
                                <span className="text-[#6D4C41] ml-1 font-mono">({rel.student.admissionNumber})</span>
                                <span className="ml-1 text-[10px] text-[#4E342E] bg-[#EFEBE9] px-1.5 py-0.5 rounded border border-[#D7CCC8] font-semibold">{rel.relation}</span>
                              </span>
                              <button
                                onClick={() => handleRevokeLink(rel.student.id, parent.id)}
                                title="Revoke link"
                                className="text-rose-600 hover:text-rose-800 p-0.5"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-amber-800 text-[11px] italic bg-amber-50 px-2 py-0.5 rounded border border-amber-200">No children linked yet</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedParent(parent);
                          setShowLinkModal(true);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-[#D7CCC8] text-[#4E342E] bg-[#F7F2EF] hover:bg-[#EFEBE9] transition"
                      >
                        <LinkIcon className="w-3 h-3" /> Link Child
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Parent Modal */}
      {showAddParentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl w-full max-w-md p-6 shadow-2xl text-[#2D1E18]">
            <div className="flex items-center justify-between pb-4 border-b border-[#EFEBE9]">
              <h2 className="text-lg font-bold text-[#2D1E18] flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#4E342E]" /> Provision Parent Account
              </h2>
              <button onClick={() => setShowAddParentModal(false)} className="text-[#8D6E63] hover:text-[#2D1E18] p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {addError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs">
                {addError}
              </div>
            )}

            <form onSubmit={handleCreateParent} className="space-y-3 mt-4">
              <div>
                <label className="block text-xs font-semibold text-[#4E342E] mb-1">Full Name*</label>
                <input
                  type="text"
                  required
                  value={parentForm.fullName}
                  onChange={(e) => setParentForm({ ...parentForm, fullName: e.target.value })}
                  placeholder="e.g. Smt. Sunita Sharma"
                  className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4E342E] mb-1">Phone Number (SMS Enabled)*</label>
                <input
                  type="text"
                  required
                  value={parentForm.phone}
                  onChange={(e) => setParentForm({ ...parentForm, phone: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4E342E] mb-1">Email</label>
                <input
                  type="email"
                  value={parentForm.email}
                  onChange={(e) => setParentForm({ ...parentForm, email: e.target.value })}
                  placeholder="sunita@example.com"
                  className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#4E342E] mb-1">Occupation</label>
                  <input
                    type="text"
                    value={parentForm.occupation}
                    onChange={(e) => setParentForm({ ...parentForm, occupation: e.target.value })}
                    placeholder="e.g. Engineer"
                    className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#4E342E] mb-1">Alt Phone</label>
                  <input
                    type="text"
                    value={parentForm.altPhone}
                    onChange={(e) => setParentForm({ ...parentForm, altPhone: e.target.value })}
                    placeholder="e.g. 9811223344"
                    className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddParentModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#6D4C41] hover:text-[#2D1E18]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-md shadow-[#3E2723]/30 transition disabled:opacity-50"
                >
                  {addLoading ? 'Creating...' : 'Create Parent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link Child Modal */}
      {showLinkModal && selectedParent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl w-full max-w-md p-6 shadow-2xl text-[#2D1E18]">
            <div className="flex items-center justify-between pb-4 border-b border-[#EFEBE9]">
              <h2 className="text-lg font-bold text-[#2D1E18] flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-[#4E342E]" /> Link Student to Guardian
              </h2>
              <button onClick={() => setShowLinkModal(false)} className="text-[#8D6E63] hover:text-[#2D1E18] p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-3 p-3 bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl text-xs text-[#5D4037]">
              Linking child to: <strong className="text-[#2D1E18]">{selectedParent.user.fullName}</strong> ({selectedParent.user.phone})
            </div>

            <form onSubmit={handleLinkGuardian} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#4E342E] mb-1">Select Student*</label>
                <select
                  required
                  value={linkForm.studentId}
                  onChange={(e) => setLinkForm({ ...linkForm, studentId: e.target.value })}
                  className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                >
                  <option value="">Select Enrolled Student</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.firstName} {s.lastName} ({s.admissionNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4E342E] mb-1">Relationship Type*</label>
                <select
                  value={linkForm.relation}
                  onChange={(e) => setLinkForm({ ...linkForm, relation: e.target.value as any })}
                  className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                >
                  <option value="MOTHER">Mother</option>
                  <option value="FATHER">Father</option>
                  <option value="GUARDIAN">Guardian</option>
                </select>
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 text-xs text-[#2D1E18] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={linkForm.isPrimaryContact}
                    onChange={(e) => setLinkForm({ ...linkForm, isPrimaryContact: e.target.checked })}
                    className="rounded border-[#D7CCC8] text-[#4E342E] focus:ring-[#8D6E63]"
                  />
                  <span>Mark as Primary Emergency Contact</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-[#2D1E18] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={linkForm.canReceiveSms}
                    onChange={(e) => setLinkForm({ ...linkForm, canReceiveSms: e.target.checked })}
                    className="rounded border-[#D7CCC8] text-[#4E342E] focus:ring-[#8D6E63]"
                  />
                  <span>Send Check-in / Check-out SMS Notifications</span>
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#6D4C41] hover:text-[#2D1E18]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-md shadow-[#3E2723]/30 transition"
                >
                  Confirm Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
