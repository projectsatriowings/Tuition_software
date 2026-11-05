import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import { LogOut, Building, ShieldCheck, User as UserIcon, Building2, ChevronDown } from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { apiFetch, getActiveBranchId, setActiveBranchId } from '../services/api';

export const Navbar: React.FC = () => {
  const { user, activeInstitute, logout } = useAuth();
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(() => getActiveBranchId() || 'all');

  useEffect(() => {
    if (!activeInstitute?.id) return;
    apiFetch('/branches')
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setBranches(res.data);
          // If only 1 branch exists and none selected yet, set to default branch
          if (res.data.length === 1 && (!selectedBranchId || selectedBranchId === 'all')) {
            setSelectedBranchId(res.data[0].id);
            setActiveBranchId(res.data[0].id);
          }
        }
      })
      .catch((err) => {
        console.warn('[Navbar fetch branches error]', err);
      });
  }, [activeInstitute?.id]);

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedBranchId(newId);
    setActiveBranchId(newId === 'all' ? null : newId);
    // Dispatch custom event for components listening to branch context changes
    window.dispatchEvent(new CustomEvent('tuition_branch_changed', { detail: { branchId: newId } }));
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#3E2723] text-white border border-[#3E2723]">Super Admin</span>;
      case 'ACADEMIC_ADMIN':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#4E342E]/10 text-[#4E342E] border border-[#6D4C41]/30">Academic Admin</span>;
      case 'STAFF':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">Staff</span>;
      case 'PARENT':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-50 text-sky-800 border border-sky-300">Parent</span>;
      case 'STUDENT':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#BCAAA4]/40 text-[#4E342E] border border-[#BCAAA4]">Student</span>;
      default:
        return null;
    }
  };

  const defaultBranch = branches.find((b) => b.isDefault) || branches[0];

  return (
    <header className="h-16 border-b border-[#D7CCC8] bg-white sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between text-[#2D1E18] shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#3E2723] to-[#6D4C41] flex items-center justify-center font-black text-lg text-white shadow-md shadow-[#3E2723]/20">
          T
        </div>
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-base tracking-tight text-[#2D1E18]">TuitionOS</span>

          {activeInstitute && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-[#4E342E] bg-[#F7F2EF] px-2.5 py-1 rounded-md border border-[#D7CCC8] font-medium">
              <Building className="w-3.5 h-3.5 text-[#6D4C41]" /> {activeInstitute.name} ({activeInstitute.code})
            </span>
          )}

          {/* Branch Selector: Single branch mode displays clean badge; Multi-branch displays selector */}
          {branches.length > 1 ? (
            <div className="relative inline-flex items-center">
              <Building2 className="w-3.5 h-3.5 text-[#6D4C41] absolute left-2.5 pointer-events-none" />
              <select
                value={selectedBranchId}
                onChange={handleBranchChange}
                className="pl-8 pr-7 py-1 text-xs font-bold text-[#4E342E] bg-[#F7F2EF] hover:bg-[#EFEBE9] border border-[#D7CCC8] rounded-md focus:outline-none focus:ring-1 focus:ring-[#6D4C41] cursor-pointer appearance-none transition"
                title="Filter views by physical branch"
              >
                <option value="all">🏢 All Branches (Consolidated)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    📍 {b.name} ({b.code}){b.isDefault ? ' [HQ]' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#8D6E63] absolute right-2 pointer-events-none" />
            </div>
          ) : defaultBranch ? (
            <span
              className="hidden md:inline-flex items-center gap-1 text-[11px] font-semibold text-[#6D4C41] bg-[#F7F2EF] px-2 py-0.5 rounded border border-[#D7CCC8]/60"
              title="Default physical campus"
            >
              <Building2 className="w-3 h-3 text-[#8D6E63]" /> {defaultBranch.name}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {getRoleBadge(user?.role)}

        <NotificationBell />

        <div className="hidden md:flex items-center gap-2 text-xs text-[#5D4037]">
          <UserIcon className="w-3.5 h-3.5 text-[#8D6E63]" />
          <span className="font-semibold text-[#2D1E18]">{user?.fullName}</span>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#6D4C41] hover:text-[#B91C1C] px-3 py-1.5 rounded-lg hover:bg-[#F7F2EF] border border-[#D7CCC8]/60 transition-colors"
          title="Sign out"
        >
          <LogOut className="w-4 h-4 text-[#B91C1C]" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};
export default Navbar;
