import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import { StaffMember, Batch } from '../types';
import { Users, Plus, Search, CheckCircle, AlertTriangle, X, Shield, Phone, Mail } from 'lucide-react';

export const StaffManagement: React.FC = () => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [createdCredential, setCreatedCredential] = useState<{ email: string; tempPass: string } | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    employeeCode: '',
    designation: '',
    qualification: '',
    initialPassword: '',
    selectedBatchIds: [] as string[],
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [staffRes, batchesRes] = await Promise.all([
        apiFetch(`/staff?search=${encodeURIComponent(search)}`),
        apiFetch('/academics/batches'),
      ]);
      setStaff(staffRes.data?.staff || []);
      setBatches(batchesRes.data?.batches || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setAddLoading(true);

    try {
      const res = await apiFetch('/staff', {
        method: 'POST',
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone || undefined,
          employeeCode: formData.employeeCode || undefined,
          designation: formData.designation,
          qualification: formData.qualification || undefined,
          initialPassword: formData.initialPassword || undefined,
          batchIds: formData.selectedBatchIds,
        }),
      });

      if (res.success) {
        setCreatedCredential({
          email: res.data.user.email,
          tempPass: res.data.temporaryPassword,
        });
        setFormData({
          fullName: '',
          email: '',
          phone: '',
          employeeCode: '',
          designation: '',
          qualification: '',
          initialPassword: '',
          selectedBatchIds: [],
        });
        fetchData();
      }
    } catch (err: any) {
      setAddError(err.message || 'Failed to create staff');
    } finally {
      setAddLoading(false);
    }
  };

  const handleToggleStatus = async (item: StaffMember) => {
    const nextStatus = !item.user.isActive;
    const confirmMsg = item.user.isActive
      ? `Deactivate account for "${item.user.fullName}"? They will lose access.`
      : `Reactivate account for "${item.user.fullName}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await apiFetch(`/staff/${item.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: nextStatus }),
      });
      fetchData();
    } catch (err: any) {
      alert(`Error updating staff status: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2D1E18]">Staff & Faculty Management</h1>
          <p className="text-sm text-[#6D4C41] mt-1">Manage teaching instructors and administrative staff</p>
        </div>
        <button
          onClick={() => {
            setCreatedCredential(null);
            setShowAddModal(true);
          }}
          className="inline-flex items-center gap-2 bg-[#4E342E] hover:bg-[#3E2723] text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-md shadow-[#3E2723]/25 transition-all self-start"
        >
          <Plus className="w-4 h-4" /> Add New Staff Member
        </button>
      </div>

      {/* Directory Table */}
      <div className="bg-white border border-[#D7CCC8] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="w-full sm:w-80 relative">
            <Search className="w-4 h-4 text-[#8D6E63] absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, code..."
              className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl pl-10 pr-4 py-2 text-xs text-[#2D1E18] placeholder-[#A1887F] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#D7CCC8] text-[#6D4C41] bg-[#F7F2EF] uppercase tracking-wider">
                <th className="py-3 px-4 font-bold">Faculty / Staff</th>
                <th className="py-3 px-4 font-bold">Employee Code</th>
                <th className="py-3 px-4 font-bold">Designation</th>
                <th className="py-3 px-4 font-bold">Batches Assigned</th>
                <th className="py-3 px-4 font-bold">Status</th>
                <th className="py-3 px-4 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFEBE9]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#6D4C41]">Loading staff directory...</td>
                </tr>
              ) : staff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#6D4C41]">No staff members found.</td>
                </tr>
              ) : (
                staff.map((item) => (
                  <tr key={item.id} className="hover:bg-[#FDFBF7] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#2D1E18] text-sm">{item.user.fullName}</div>
                      <div className="text-[11px] text-[#6D4C41] flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-[#8D6E63]" /> {item.user.email}</span>
                        {item.user.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-[#8D6E63]" /> {item.user.phone}</span>}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#4E342E]">
                      {item.employeeCode ? (
                        <span className="bg-[#F7F2EF] border border-[#D7CCC8] px-2 py-0.5 rounded text-xs">
                          {item.employeeCode}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-[#2D1E18] font-medium">
                      {item.designation}
                    </td>
                    <td className="py-3.5 px-4 text-[#5D4037]">
                      {item.assignments && item.assignments.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {item.assignments.map((a) => (
                            <span key={a.id} className="px-2 py-0.5 rounded-md bg-[#F7F2EF] text-[10px] text-[#4E342E] border border-[#D7CCC8] font-medium">
                              {a.batch.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[#A1887F] italic">None</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {item.user.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
                          <CheckCircle className="w-3 h-3 text-emerald-600" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-300">
                          <AlertTriangle className="w-3 h-3 text-rose-600" /> Deactivated
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(item)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
                          item.user.isActive
                            ? 'border-rose-300 text-rose-800 hover:bg-rose-50'
                            : 'border-emerald-300 text-emerald-800 hover:bg-emerald-50'
                        }`}
                      >
                        {item.user.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto shadow-2xl text-[#2D1E18]">
            <div className="flex items-center justify-between pb-4 border-b border-[#EFEBE9]">
              <h2 className="text-lg font-bold text-[#2D1E18] flex items-center gap-2">
                <Users className="w-5 h-5 text-[#4E342E]" /> Provision Staff Account
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-[#8D6E63] hover:text-[#2D1E18] p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {createdCredential ? (
              <div className="my-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-[#2D1E18] space-y-3">
                <div className="flex items-center gap-2 font-bold text-emerald-800 text-sm">
                  <CheckCircle className="w-5 h-5 text-emerald-600" /> Account Provisioned Successfully
                </div>
                <p className="text-xs text-[#5D4037]">
                  Please hand over the initial credentials to the faculty member. They will be prompted to change their password on initial login.
                </p>
                <div className="p-3 rounded-xl bg-white border border-emerald-200 font-mono text-xs space-y-1 text-[#2D1E18]">
                  <div><strong>Email:</strong> {createdCredential.email}</div>
                  <div><strong>Temporary Password:</strong> {createdCredential.tempPass}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-full bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-semibold py-2 rounded-xl transition"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                {addError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs">
                    {addError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#4E342E] mb-1">Full Name*</label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="e.g. Dr. Rajesh Sharma"
                      className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#4E342E] mb-1">Email*</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="rajesh@academy.edu"
                      className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#4E342E] mb-1">Designation*</label>
                    <input
                      type="text"
                      required
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      placeholder="e.g. Senior Math Faculty"
                      className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#4E342E] mb-1">Employee Code</label>
                    <input
                      type="text"
                      value={formData.employeeCode}
                      onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                      placeholder="e.g. EMP-101"
                      className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#4E342E] mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="e.g. 9876543210"
                      className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#4E342E] mb-1">Qualification</label>
                    <input
                      type="text"
                      value={formData.qualification}
                      onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                      placeholder="e.g. M.Sc. Physics, B.Ed"
                      className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                    />
                  </div>
                </div>

                {batches.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-[#4E342E] mb-1">Assign to Batches</label>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 bg-[#F7F2EF] rounded-xl border border-[#D7CCC8]">
                      {batches.map((b) => (
                        <label key={b.id} className="flex items-center gap-2 text-xs text-[#2D1E18] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.selectedBatchIds.includes(b.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({ ...formData, selectedBatchIds: [...formData.selectedBatchIds, b.id] });
                              } else {
                                setFormData({ ...formData, selectedBatchIds: formData.selectedBatchIds.filter((id) => id !== b.id) });
                              }
                            }}
                            className="rounded border-[#D7CCC8] text-[#4E342E] focus:ring-[#8D6E63]"
                          />
                          <span>{b.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-[#6D4C41] hover:text-[#2D1E18]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addLoading}
                    className="bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-md shadow-[#3E2723]/30 transition disabled:opacity-50"
                  >
                    {addLoading ? 'Creating...' : 'Provision Account'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
