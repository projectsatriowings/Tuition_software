import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { UserRole } from '../types';
import {
  ShieldCheck,
  Building2,
  User,
  Users,
  Lock,
  ArrowRight,
  AlertCircle,
  HelpCircle,
  X,
  ChevronRight,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react';

interface DemoAccount {
  role: UserRole;
  label: string;
  roleBadgeColor: string;
  identifier: string;
  password: string;
  subtext: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: 'SUPER_ADMIN',
    label: 'Super Admin',
    roleBadgeColor: 'text-[#3E2723]',
    identifier: 'superadmin@platform.local',
    password: 'AdminSecurePassword#2026',
    subtext: 'superadmin@platform.local',
  },
  {
    role: 'ACADEMIC_ADMIN',
    label: 'Academic Admin',
    roleBadgeColor: 'text-[#4E342E]',
    identifier: 'admin@apexacademy.com',
    password: 'Password#123',
    subtext: 'admin@apexacademy.com',
  },
  {
    role: 'STAFF',
    label: 'Staff / Faculty',
    roleBadgeColor: 'text-emerald-700',
    identifier: 'teacher@apexacademy.com',
    password: 'Password#123',
    subtext: 'teacher@apexacademy.com',
  },
  {
    role: 'PARENT',
    label: 'Parent Portal',
    roleBadgeColor: 'text-sky-700',
    identifier: '9826444306',
    password: 'Password#123',
    subtext: 'Phone: 9826444306',
  },
  {
    role: 'STUDENT',
    label: 'Student Portal',
    roleBadgeColor: 'text-[#6D4C41]',
    identifier: 'student@apexacademy.com',
    password: 'Password#123',
    subtext: 'student@apexacademy.com',
  },
];

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>('ACADEMIC_ADMIN');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Help Modal State
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Multi-Institute Selection State
  const [pendingAuth, setPendingAuth] = useState<{
    token: string;
    user: any;
    memberships: Array<{ id: string; role: string; institute: { id: string; name: string; code: string } }>;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
          role: selectedRole,
        }),
      });

      if (res.success && res.data?.accessToken) {
        // If user belongs to multiple active institutes, let them select the target institute
        if (res.data.memberships && res.data.memberships.length > 1) {
          setPendingAuth({
            token: res.data.accessToken,
            user: res.data.user,
            memberships: res.data.memberships,
          });
        } else {
          login(res.data.accessToken, res.data.user, res.data.institute);
        }
      } else {
        setError(res.error || 'Authentication failed');
      }
    } catch (err: any) {
      setError(err.message || 'Login request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemo = (demo: DemoAccount) => {
    setSelectedRole(demo.role);
    setIdentifier(demo.identifier);
    setPassword(demo.password);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A0F0D] via-[#271815] to-[#3E2723] text-white flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-[#6D4C41] to-[#8D6E63] flex items-center justify-center font-black text-2xl text-white shadow-xl shadow-[#1A0F0D]/60 mb-4 border border-[#A1887F]/30">
            T
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#F7F2EF]">TuitionOS Enterprise</h1>
          <p className="text-sm text-[#D7CCC8] mt-2">Multi-Institute Tuition Management System</p>
        </div>

        {/* Multi-Institute Selection Step (if user has multiple institutes) */}
        {pendingAuth ? (
          <div className="bg-white border border-[#D7CCC8] rounded-3xl p-8 shadow-2xl text-[#2D1E18]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#F7F2EF] border border-[#D7CCC8] flex items-center justify-center text-[#4E342E]">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#2D1E18]">Select Your Institute</h2>
                <p className="text-xs text-[#6D4C41]">Your account is registered across multiple institutes</p>
              </div>
            </div>

            <p className="text-xs text-[#5D4037] mb-4">
              Choose the institute context you wish to access for this session:
            </p>

            <div className="space-y-2.5">
              {pendingAuth.memberships.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    login(pendingAuth.token, pendingAuth.user, m.institute);
                    setPendingAuth(null);
                  }}
                  className="w-full p-3.5 rounded-2xl bg-[#F7F2EF] hover:bg-[#EFEBE9] border border-[#D7CCC8] text-left transition-all flex items-center justify-between group"
                >
                  <div>
                    <div className="font-bold text-[#2D1E18] text-sm group-hover:text-[#4E342E] transition-colors">
                      {m.institute.name}
                    </div>
                    <div className="text-xs text-[#6D4C41] font-mono mt-0.5">
                      Code: {m.institute.code} &bull; Role: {m.role}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#8D6E63] group-hover:text-[#4E342E] group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setPendingAuth(null)}
              className="w-full mt-5 py-2 text-xs font-semibold text-[#6D4C41] hover:text-[#2D1E18] transition-colors text-center"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <>
            {/* Role Selector Tabs */}
            <div className="bg-[#2D1E18]/90 border border-[#4E342E] rounded-2xl p-1.5 mb-6 grid grid-cols-3 sm:grid-cols-5 gap-1 text-center shadow-lg">
              {(
                [
                  { role: 'ACADEMIC_ADMIN', label: 'Admin' },
                  { role: 'STAFF', label: 'Staff' },
                  { role: 'PARENT', label: 'Parent' },
                  { role: 'STUDENT', label: 'Student' },
                  { role: 'SUPER_ADMIN', label: 'Super' },
                ] as const
              ).map((item) => (
                <button
                  key={item.role}
                  type="button"
                  onClick={() => {
                    setSelectedRole(item.role);
                    setError(null);
                  }}
                  className={`py-2 px-1 text-xs font-semibold rounded-xl transition-all ${
                    selectedRole === item.role
                      ? 'bg-[#6D4C41] text-white shadow-md font-bold'
                      : 'text-[#D7CCC8] hover:text-white hover:bg-[#4E342E]/60'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Login Card */}
            <div className="bg-white border border-[#D7CCC8] rounded-3xl p-8 shadow-2xl text-[#2D1E18]">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-[#2D1E18] flex items-center gap-2">
                  {selectedRole === 'SUPER_ADMIN' ? (
                    <>
                      <ShieldCheck className="w-5 h-5 text-[#3E2723]" /> Super Admin Portal
                    </>
                  ) : selectedRole === 'ACADEMIC_ADMIN' ? (
                    <>
                      <Building2 className="w-5 h-5 text-[#4E342E]" /> Academic Admin Login
                    </>
                  ) : selectedRole === 'STAFF' ? (
                    <>
                      <Users className="w-5 h-5 text-emerald-700" /> Staff & Faculty Login
                    </>
                  ) : (
                    <>
                      <User className="w-5 h-5 text-sky-700" /> {selectedRole === 'PARENT' ? 'Parent' : 'Student'} Portal
                    </>
                  )}
                </h2>
                <p className="text-xs text-[#6D4C41] mt-1">Enter your registered credentials to access your portal</p>
              </div>

              {error && (
                <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex flex-col gap-2">
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{error}</span>
                  </div>
                  {error.includes('registered as') && (
                    <div className="pl-6 pt-1">
                      {error.includes('registered as PARENT') && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRole('PARENT');
                            setError(null);
                          }}
                          className="px-2.5 py-1 bg-sky-700 hover:bg-sky-800 text-white rounded-lg font-medium text-[11px] transition shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          Switch to Parent Tab & Sign In <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                      {error.includes('registered as STAFF') && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRole('STAFF');
                            setError(null);
                          }}
                          className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-medium text-[11px] transition shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          Switch to Staff Tab & Sign In <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                      {error.includes('registered as ACADEMIC_ADMIN') && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRole('ACADEMIC_ADMIN');
                            setError(null);
                          }}
                          className="px-2.5 py-1 bg-[#4E342E] hover:bg-[#3E2723] text-white rounded-lg font-medium text-[11px] transition shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          Switch to Admin Tab & Sign In <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                      {error.includes('registered as STUDENT') && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRole('STUDENT');
                            setError(null);
                          }}
                          className="px-2.5 py-1 bg-[#6D4C41] hover:bg-[#5D4037] text-white rounded-lg font-medium text-[11px] transition shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          Switch to Student Tab & Sign In <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#4E342E] mb-1.5">
                    {selectedRole === 'PARENT' ? 'Mobile Phone Number / Email' : 'Email Address / Username'}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#8D6E63] absolute left-3.5 top-3" />
                    <input
                      type="text"
                      name="tuition_user_identifier"
                      id="tuition_user_identifier"
                      required
                      autoComplete="off"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder={selectedRole === 'PARENT' ? 'Enter mobile number or email' : 'Enter email address or username'}
                      className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#2D1E18] placeholder-[#A1887F] focus:outline-none focus:ring-2 focus:ring-[#8D6E63] focus:border-[#8D6E63]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#4E342E] mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#8D6E63] absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="tuition_user_secret"
                      id="tuition_user_secret"
                      required
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl pl-10 pr-10 py-2.5 text-sm text-[#2D1E18] placeholder-[#A1887F] focus:outline-none focus:ring-2 focus:ring-[#8D6E63] focus:border-[#8D6E63]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 p-1 text-[#8D6E63] hover:text-[#4E342E] transition-colors rounded-lg focus:outline-none cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Need Credentials Link */}
                <div className="flex items-center justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setShowHelpModal(true)}
                    className="text-xs text-[#6D4C41] hover:text-[#3E2723] transition-colors flex items-center gap-1 font-semibold"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-[#8D6E63]" /> Need login or password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 bg-[#4E342E] hover:bg-[#3E2723] text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-[#3E2723]/30 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  {loading ? (
                    <span className="animate-pulse">Authenticating...</span>
                  ) : (
                    <>
                      Sign In <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Quick Demo Credentials Autofill Section */}
              <div className="mt-6 pt-5 border-t border-[#EFEBE9]">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] font-bold text-[#6D4C41] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#8D6E63]" /> Quick Demo Fill (Click to autofill)
                  </span>
                  <span className="text-[10px] bg-[#F7F2EF] text-[#4E342E] px-2 py-0.5 rounded-full border border-[#D7CCC8] font-semibold">
                    Demo Mode
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {DEMO_ACCOUNTS.slice(0, 4).map((demo) => (
                    <button
                      key={demo.role}
                      type="button"
                      onClick={() => handleSelectDemo(demo)}
                      className="p-2.5 rounded-xl bg-[#F7F2EF] hover:bg-[#EFEBE9] border border-[#D7CCC8] hover:border-[#BCAAA4] text-left text-[#2D1E18] transition-all group"
                    >
                      <div className={`font-bold text-[11px] ${demo.roleBadgeColor}`}>{demo.label}</div>
                      <div className="text-[10px] text-[#6D4C41] truncate mt-0.5">{demo.subtext}</div>
                    </button>
                  ))}

                  {/* Student Portal Demo Card */}
                  {DEMO_ACCOUNTS.find((d) => d.role === 'STUDENT') && (
                    <button
                      type="button"
                      onClick={() => handleSelectDemo(DEMO_ACCOUNTS.find((d) => d.role === 'STUDENT')!)}
                      className="col-span-2 p-2.5 rounded-xl bg-[#F7F2EF] hover:bg-[#EFEBE9] border border-[#D7CCC8] hover:border-[#BCAAA4] text-left text-[#2D1E18] transition-all flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-[#6D4C41] text-[11px]">Student Portal</div>
                        <div className="text-[10px] text-[#6D4C41] mt-0.5">student@apexacademy.com</div>
                      </div>
                      <span className="text-[10px] font-mono bg-[#EFEBE9] text-[#4E342E] px-2 py-0.5 rounded border border-[#D7CCC8] font-semibold">
                        Demo Account
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Footer info */}
            <div className="text-center mt-6 text-xs text-[#BCAAA4]">
              Enforced Server-Side RBAC &bull; Isolated Tenant Encryption
            </div>
          </>
        )}
      </div>

      {/* Credential Guidance Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl w-full max-w-lg p-6 shadow-2xl text-[#2D1E18]">
            <div className="flex items-center justify-between pb-4 border-b border-[#EFEBE9]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#F7F2EF] border border-[#D7CCC8] flex items-center justify-center text-[#4E342E]">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#2D1E18]">Need Login or Password?</h3>
                  <p className="text-xs text-[#6D4C41]">Official access guidance for your account role</p>
                </div>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-[#8D6E63] hover:text-[#2D1E18] p-1 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-[#F7F2EF] border border-[#D7CCC8]">
                <div className="font-bold text-[#4E342E] flex items-center gap-1.5 mb-1">
                  <Building2 className="w-4 h-4" /> Academic Admin
                </div>
                <p className="text-[#5D4037] leading-relaxed">
                  Contact the institute's authorized administrator or the person who created the account.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-[#F7F2EF] border border-[#D7CCC8]">
                <div className="font-bold text-emerald-800 flex items-center gap-1.5 mb-1">
                  <Users className="w-4 h-4" /> Staff / Faculty
                </div>
                <p className="text-[#5D4037] leading-relaxed">
                  Contact your institute's Academic Admin to provision or reset your faculty account login password.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-[#F7F2EF] border border-[#D7CCC8]">
                <div className="font-bold text-sky-800 flex items-center gap-1.5 mb-1">
                  <User className="w-4 h-4" /> Parent
                </div>
                <p className="text-[#5D4037] leading-relaxed">
                  Ask the tuition institute to register or verify your parent account with your registered mobile phone number.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-[#F7F2EF] border border-[#D7CCC8]">
                <div className="font-bold text-[#6D4C41] flex items-center gap-1.5 mb-1">
                  <User className="w-4 h-4" /> Student
                </div>
                <p className="text-[#5D4037] leading-relaxed">
                  Ask the tuition institute administration to provide or activate your student login password.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-[#F7F2EF] border border-[#D7CCC8]">
                <div className="font-bold text-[#3E2723] flex items-center gap-1.5 mb-1">
                  <ShieldCheck className="w-4 h-4" /> Super Admin
                </div>
                <p className="text-[#5D4037] leading-relaxed">
                  Use the authorized Super Admin account provisioning or secure system recovery process.
                </p>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-[#EFEBE9] border border-[#D7CCC8] text-[11px] text-[#5D4037] leading-relaxed">
              <span className="font-bold text-[#2D1E18]">Security Notice:</span> TuitionOS enforces strict institutional data isolation. Account login details can only be granted by verified institute administrators.
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-md shadow-[#3E2723]/30"
              >
                Close Guidance
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
