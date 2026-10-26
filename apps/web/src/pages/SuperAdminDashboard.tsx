import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import { Institute } from '../types';
import {
  Building2,
  Plus,
  Search,
  CheckCircle,
  AlertTriangle,
  Users,
  GraduationCap,
  Layers,
  Phone,
  Mail,
  MapPin,
  X,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';

export const SuperAdminDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Success Created Institute Modal State
  const [createdInstitute, setCreatedInstitute] = useState<{ name: string; code: string; adminEmail?: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Form State - all fields initially empty
  const [newInst, setNewInst] = useState({
    name: '',
    legalName: '',
    city: '',
    state: '',
    phone: '',
    email: '',
    adminFullName: '',
    adminEmail: '',
    adminPhone: '',
    adminInitialPassword: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [metricsRes, institutesRes] = await Promise.all([
        apiFetch('/institutes/dashboard/summary'),
        apiFetch(`/institutes?search=${encodeURIComponent(search)}&status=${statusFilter}`),
      ]);
      setMetrics(metricsRes.data);
      setInstitutes(institutesRes.data?.institutes || []);
    } catch (err) {
      console.error('Failed to load institutes', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, statusFilter]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateLoading(true);

    try {
      const res = await apiFetch('/institutes', {
        method: 'POST',
        body: JSON.stringify(newInst),
      });

      if (res.success && res.data?.institute) {
        setShowCreateModal(false);
        setCreatedInstitute({
          name: res.data.institute.name,
          code: res.data.institute.code,
          adminEmail: res.data.initialAdmin?.email || newInst.adminEmail,
        });
        setNewInst({
          name: '',
          legalName: '',
          city: '',
          state: '',
          phone: '',
          email: '',
          adminFullName: '',
          adminEmail: '',
          adminPhone: '',
          adminInitialPassword: '',
        });
        fetchData();
      } else {
        setCreateError(res.error || 'Failed to create institute');
      }
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create institute');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleToggleStatus = async (inst: Institute) => {
    const nextStatus = inst.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const confirmMsg = inst.status === 'ACTIVE'
      ? `Are you sure you want to suspend "${inst.name}"? Members will be temporarily locked out.`
      : `Reactivate "${inst.name}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await apiFetch(`/institutes/${inst.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus, reason: 'Super Admin manual action' }),
      });
      fetchData();
    } catch (err: any) {
      alert(`Error updating status: ${err.message}`);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2D1E18]">Platform Administration</h1>
          <p className="text-sm text-[#6D4C41] mt-1">Global multi-tenant institute directory and health</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 bg-[#4E342E] hover:bg-[#3E2723] text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-md shadow-[#3E2723]/25 transition-all self-start"
        >
          <Plus className="w-4 h-4" /> Add New Institute
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-[#D7CCC8] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6D4C41]">Total Institutes</span>
            <div className="w-8 h-8 rounded-lg bg-[#F7F2EF] border border-[#D7CCC8] flex items-center justify-center text-[#4E342E]">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#2D1E18] mt-3">
            {metrics ? metrics.totalInstitutes : '...'}
          </div>
          <div className="text-xs text-[#6D4C41] mt-1">Registered tenant accounts</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#D7CCC8] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6D4C41]">Active Institutes</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-800 mt-3">
            {metrics ? metrics.activeInstitutes : '...'}
          </div>
          <div className="text-xs text-[#6D4C41] mt-1">Operational and compliant</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#D7CCC8] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6D4C41]">Suspended</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-800 mt-3">
            {metrics ? metrics.suspendedInstitutes : '...'}
          </div>
          <div className="text-xs text-[#6D4C41] mt-1">Temporarily locked</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#D7CCC8] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6D4C41]">Total Students</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-800">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-sky-800 mt-3">
            {metrics ? metrics.totalStudents : '...'}
          </div>
          <div className="text-xs text-[#6D4C41] mt-1">Across all institutes</div>
        </div>
      </div>

      {/* Institutes Directory Table */}
      <div className="bg-white border border-[#D7CCC8] rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="w-full sm:w-72 relative">
            <Search className="w-4 h-4 text-[#8D6E63] absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by code, name, city..."
              className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl pl-10 pr-4 py-2 text-xs text-[#2D1E18] placeholder-[#A1887F] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-[#6D4C41] font-semibold">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#D7CCC8] text-[#6D4C41] bg-[#F7F2EF] uppercase tracking-wider">
                <th className="py-3 px-4 font-bold">Institute</th>
                <th className="py-3 px-4 font-bold">Code</th>
                <th className="py-3 px-4 font-bold">Location</th>
                <th className="py-3 px-4 font-bold">Metrics</th>
                <th className="py-3 px-4 font-bold">Status</th>
                <th className="py-3 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFEBE9]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#6D4C41]">Loading institutes...</td>
                </tr>
              ) : institutes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#6D4C41]">No institutes found.</td>
                </tr>
              ) : (
                institutes.map((inst) => (
                  <tr key={inst.id} className="hover:bg-[#FDFBF7] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#2D1E18] text-sm">{inst.name}</div>
                      {inst.email && <div className="text-[11px] text-[#6D4C41]">{inst.email}</div>}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#4E342E]">
                      <span className="bg-[#F7F2EF] border border-[#D7CCC8] px-2 py-0.5 rounded text-xs">
                        {inst.code}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#5D4037]">
                      {inst.city ? `${inst.city}, ${inst.state || ''}` : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-[#5D4037]">
                      <div className="flex items-center gap-3 text-[11px]">
                        <span><strong>{inst._count?.students || 0}</strong> Students</span>
                        <span>&bull;</span>
                        <span><strong>{inst._count?.staffProfiles || 0}</strong> Staff</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {inst.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
                          <CheckCircle className="w-3 h-3 text-emerald-600" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-300">
                          <AlertTriangle className="w-3 h-3 text-rose-600" /> Suspended
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(inst)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
                          inst.status === 'ACTIVE'
                            ? 'border-rose-300 text-rose-800 hover:bg-rose-50'
                            : 'border-emerald-300 text-emerald-800 hover:bg-emerald-50'
                        }`}
                      >
                        {inst.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Institute Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto shadow-2xl text-[#2D1E18]">
            <div className="flex items-center justify-between pb-4 border-b border-[#EFEBE9]">
              <h2 className="text-lg font-bold text-[#2D1E18] flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#4E342E]" /> Onboard New Institute
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[#8D6E63] hover:text-[#2D1E18] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 mt-4">
              <div className="text-xs font-bold uppercase tracking-wider text-[#4E342E]">
                Institute Information
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4E342E] mb-1">Institute Name*</label>
                <input
                  type="text"
                  required
                  value={newInst.name}
                  onChange={(e) => setNewInst({ ...newInst, name: e.target.value })}
                  placeholder="Enter institute name"
                  className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#4E342E] mb-1">City</label>
                  <input
                    type="text"
                    value={newInst.city}
                    onChange={(e) => setNewInst({ ...newInst, city: e.target.value })}
                    placeholder="Enter city"
                    className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#4E342E] mb-1">State</label>
                  <input
                    type="text"
                    value={newInst.state}
                    onChange={(e) => setNewInst({ ...newInst, state: e.target.value })}
                    placeholder="Enter state"
                    className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#F7F2EF] border border-[#D7CCC8] text-[#4E342E] text-[11px] flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#8D6E63] shrink-0" />
                <span>Unique Institute Code will be automatically generated and assigned by the system upon creation.</span>
              </div>

              <div className="pt-2 text-xs font-bold uppercase tracking-wider text-[#4E342E]">
                Initial Academic Admin Account
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#4E342E] mb-1">Admin Full Name</label>
                  <input
                    type="text"
                    value={newInst.adminFullName}
                    onChange={(e) => setNewInst({ ...newInst, adminFullName: e.target.value })}
                    placeholder="Enter admin full name"
                    className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#4E342E] mb-1">Admin Email</label>
                  <input
                    type="email"
                    value={newInst.adminEmail}
                    onChange={(e) => setNewInst({ ...newInst, adminEmail: e.target.value })}
                    placeholder="Enter admin email"
                    className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4E342E] mb-1">Admin Initial Password</label>
                <input
                  type="password"
                  value={newInst.adminInitialPassword}
                  onChange={(e) => setNewInst({ ...newInst, adminInitialPassword: e.target.value })}
                  placeholder="Create a secure initial password"
                  className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                />
                <span className="text-[11px] text-[#6D4C41]">Account will be forced to change password on first login.</span>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#6D4C41] hover:text-[#2D1E18]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-md shadow-[#3E2723]/30 transition disabled:opacity-50"
                >
                  {createLoading ? 'Onboarding...' : 'Create Institute'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal Showing Generated Institute Code */}
      {createdInstitute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl w-full max-w-md p-6 shadow-2xl text-[#2D1E18]">
            <div className="flex items-center justify-between pb-4 border-b border-[#EFEBE9]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#2D1E18]">Institute Onboarded Successfully</h3>
                  <p className="text-xs text-[#6D4C41]">System assigned institutional identifier</p>
                </div>
              </div>
              <button
                onClick={() => setCreatedInstitute(null)}
                className="text-[#8D6E63] hover:text-[#2D1E18] p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-xs">
              <div>
                <span className="text-[#6D4C41] block mb-1">Institute Name</span>
                <div className="font-bold text-[#2D1E18] text-sm">{createdInstitute.name}</div>
              </div>

              <div className="p-4 rounded-2xl bg-[#F7F2EF] border border-[#D7CCC8]">
                <span className="text-[11px] uppercase tracking-wider text-[#4E342E] font-bold block mb-1.5">
                  Generated Institute Code
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xl font-black text-[#2D1E18] tracking-wider">
                    {createdInstitute.code}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(createdInstitute.code);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2500);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#4E342E] hover:bg-[#3E2723] text-white font-medium text-xs transition-colors shadow-sm"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy Code
                      </>
                    )}
                  </button>
                </div>
              </div>

              {createdInstitute.adminEmail && (
                <div>
                  <span className="text-[#6D4C41] block mb-0.5">Assigned Academic Admin</span>
                  <div className="text-[#2D1E18] font-mono text-xs">{createdInstitute.adminEmail}</div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setCreatedInstitute(null)}
                className="w-full bg-[#F7F2EF] hover:bg-[#EFEBE9] text-[#4E342E] border border-[#D7CCC8] text-xs font-semibold py-2.5 rounded-xl transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
