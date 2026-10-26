import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Building, ShieldCheck, User as UserIcon } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, activeInstitute, logout } = useAuth();

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

  return (
    <header className="h-16 border-b border-[#D7CCC8] bg-white sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between text-[#2D1E18] shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#3E2723] to-[#6D4C41] flex items-center justify-center font-black text-lg text-white shadow-md shadow-[#3E2723]/20">
          T
        </div>
        <div>
          <span className="font-extrabold text-base tracking-tight text-[#2D1E18]">TuitionOS</span>
          {activeInstitute && (
            <span className="hidden sm:inline-flex items-center gap-1.5 ml-3 text-xs text-[#4E342E] bg-[#F7F2EF] px-2.5 py-1 rounded-md border border-[#D7CCC8] font-medium">
              <Building className="w-3.5 h-3.5 text-[#6D4C41]" /> {activeInstitute.name} ({activeInstitute.code})
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {getRoleBadge(user?.role)}

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
