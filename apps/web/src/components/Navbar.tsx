import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Building, User as UserIcon, Menu, X } from 'lucide-react';
import { NotificationBell } from './NotificationBell';

interface NavbarProps {
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileMenu, isMobileMenuOpen }) => {
  const { user, activeInstitute, logout } = useAuth();

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-[#3E2723] text-white border border-[#3E2723]">Super Admin</span>;
      case 'ACADEMIC_ADMIN':
        return <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-[#4E342E]/10 text-[#4E342E] border border-[#6D4C41]/30">Academic Admin</span>;
      case 'STAFF':
        return <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">Staff</span>;
      case 'PARENT':
        return <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-sky-50 text-sky-800 border border-sky-300">Parent</span>;
      case 'STUDENT':
        return <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-[#BCAAA4]/40 text-[#4E342E] border border-[#BCAAA4]">Student</span>;
      default:
        return null;
    }
  };

  return (
    <header className="h-16 border-b border-[#D7CCC8] bg-white sticky top-0 z-40 px-3 sm:px-6 flex items-center justify-between text-[#2D1E18] shadow-sm">
      <div className="flex items-center gap-2 sm:gap-3">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-xl text-[#4E342E] hover:bg-[#F7F2EF] active:bg-[#D7CCC8]/40 border border-[#D7CCC8]/70 transition-colors focus:outline-none focus:ring-2 focus:ring-[#6D4C41]"
            aria-label={isMobileMenuOpen ? 'Close navigation drawer' : 'Open navigation drawer'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5 text-[#3E2723]" />
            ) : (
              <Menu className="w-5 h-5 text-[#3E2723]" />
            )}
          </button>
        )}

        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#3E2723] to-[#6D4C41] flex items-center justify-center font-black text-lg text-white shadow-md shadow-[#3E2723]/20 shrink-0">
          T
        </div>
        <div className="min-w-0">
          <div className="flex items-center">
            <span className="font-extrabold text-base tracking-tight text-[#2D1E18]">TuitionOS</span>
            {activeInstitute && (
              <span className="hidden sm:inline-flex items-center gap-1.5 ml-2.5 text-xs text-[#4E342E] bg-[#F7F2EF] px-2.5 py-0.5 rounded-md border border-[#D7CCC8] font-medium truncate max-w-[200px] md:max-w-[300px]">
                <Building className="w-3.5 h-3.5 text-[#6D4C41] shrink-0" />
                <span className="truncate">{activeInstitute.name}</span>
                <span className="text-[#8D6E63] font-mono shrink-0">({activeInstitute.code})</span>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {getRoleBadge(user?.role)}

        <NotificationBell />

        <div className="hidden md:flex items-center gap-2 text-xs text-[#5D4037]">
          <UserIcon className="w-3.5 h-3.5 text-[#8D6E63]" />
          <span className="font-semibold text-[#2D1E18]">{user?.fullName}</span>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#6D4C41] hover:text-[#B91C1C] px-2.5 sm:px-3 py-1.5 rounded-lg hover:bg-[#F7F2EF] border border-[#D7CCC8]/60 transition-colors"
          title="Sign out"
        >
          <LogOut className="w-4 h-4 text-[#B91C1C]" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};
