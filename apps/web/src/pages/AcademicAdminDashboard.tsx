import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap,
  Users,
  Layers,
  BookOpen,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface AcademicAdminDashboardProps {
  onNavigateTab: (tab: string) => void;
}

export const AcademicAdminDashboard: React.FC<AcademicAdminDashboardProps> = ({ onNavigateTab }) => {
  const { activeInstitute, user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch('/institutes/dashboard/summary')
      .then((res) => {
        setData(res.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const metrics = data?.metrics;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-[#2D1E18]">Institute Dashboard</h1>
        <p className="text-sm text-[#6D4C41] mt-1">
          Academic operations, student enrollment, and faculty overview for{' '}
          <strong className="text-[#3E2723]">{data?.institute?.name || activeInstitute?.name}</strong>
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-[#D7CCC8] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6D4C41]">Active Students</span>
            <div className="w-8 h-8 rounded-lg bg-[#F7F2EF] border border-[#D7CCC8] flex items-center justify-center text-[#4E342E]">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#2D1E18] mt-3">
            {loading ? '...' : metrics?.activeStudents ?? 0}
          </div>
          <div className="text-xs text-[#6D4C41] mt-1">Enrolled and attending</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#D7CCC8] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6D4C41]">Total Staff</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-800 mt-3">
            {loading ? '...' : metrics?.totalStaff ?? 0}
          </div>
          <div className="text-xs text-[#6D4C41] mt-1">Teaching & operations</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#D7CCC8] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6D4C41]">Academic Batches</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-800">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-sky-800 mt-3">
            {loading ? '...' : metrics?.totalBatches ?? 0}
          </div>
          <div className="text-xs text-[#6D4C41] mt-1">Active class sections</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#D7CCC8] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6D4C41]">Passed / Alumni</span>
            <div className="w-8 h-8 rounded-lg bg-[#EFEBE9] border border-[#D7CCC8] flex items-center justify-center text-[#4E342E]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#4E342E] mt-3">
            {loading ? '...' : metrics?.passedOutStudents ?? 0}
          </div>
          <div className="text-xs text-[#6D4C41] mt-1">Archived records preserved</div>
        </div>
      </div>

      {/* Quick Action Shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => onNavigateTab('students')}
          className="p-5 rounded-2xl bg-white border border-[#D7CCC8] hover:border-[#8D6E63] text-left transition-all group shadow-sm hover:shadow-md"
        >
          <div className="w-10 h-10 rounded-xl bg-[#F7F2EF] text-[#4E342E] border border-[#D7CCC8] flex items-center justify-center mb-4">
            <GraduationCap className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-[#2D1E18] text-base group-hover:text-[#4E342E] transition">
            Student Admissions
          </h3>
          <p className="text-xs text-[#6D4C41] mt-1 leading-relaxed">
            Admit students, assign roll numbers, and organize class batches.
          </p>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#4E342E] mt-4">
            Manage Students <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
          </span>
        </button>

        {user?.role === 'ACADEMIC_ADMIN' && (
          <button
            onClick={() => onNavigateTab('staff')}
            className="p-5 rounded-2xl bg-white border border-[#D7CCC8] hover:border-[#8D6E63] text-left transition-all group shadow-sm hover:shadow-md"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center mb-4">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-[#2D1E18] text-base group-hover:text-[#4E342E] transition">
              Staff & Faculty
            </h3>
            <p className="text-xs text-[#6D4C41] mt-1 leading-relaxed">
              Provision faculty accounts, assign subjects, and configure permissions.
            </p>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 mt-4">
              Manage Staff <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
            </span>
          </button>
        )}

        {user?.role === 'ACADEMIC_ADMIN' && (
          <button
            onClick={() => onNavigateTab('academics')}
            className="p-5 rounded-2xl bg-white border border-[#D7CCC8] hover:border-[#8D6E63] text-left transition-all group shadow-sm hover:shadow-md"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center mb-4">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-[#2D1E18] text-base group-hover:text-[#4E342E] transition">
              Batches & Curriculum
            </h3>
            <p className="text-xs text-[#6D4C41] mt-1 leading-relaxed">
              Manage academic batches, assign subjects, faculty, and student rosters.
            </p>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 mt-4">
              Manage Batches <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
