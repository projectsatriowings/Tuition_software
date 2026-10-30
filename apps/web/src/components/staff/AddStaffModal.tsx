import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { apiFetch } from '../../services/api';
import { Batch, StaffMember } from '../../types';
import {
  X,
  User,
  Briefcase,
  GraduationCap,
  Key,
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Eye,
  EyeOff,
  AlertTriangle,
  RefreshCw,
  Building,
} from 'lucide-react';

interface AddStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (
    newStaff: StaffMember,
    credentials: {
      fullName: string;
      email: string;
      permanentPassword: string;
      employeeCode?: string;
      instituteCode?: string;
    }
  ) => void;
  batches?: Batch[];
  activeInstituteCode?: string;
}


function formatUserFriendlyError(rawError?: string | null): string {
  if (!rawError || typeof rawError !== 'string') {
    return 'Failed to create staff member. Please check your information and try again.';
  }

  // If already clean, single line without technical keywords
  if (
    !rawError.includes('\n') &&
    !rawError.includes('invocation') &&
    !rawError.includes('Prisma') &&
    !rawError.includes('Unknown argument') &&
    !rawError.includes('C:\\')
  ) {
    return rawError;
  }

  if (rawError.includes('phone') || rawError.includes('already exists')) {
    return 'A staff account with this phone number, email, or employee code already exists.';
  }

  if (rawError.includes('dob') || rawError.includes('Date')) {
    return 'Please check the Date of Birth or Joining Date format.';
  }

  return 'Unable to save staff profile. Please verify the entered details and try again.';
}

export const AddStaffModal: React.FC<AddStaffModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  activeInstituteCode,
}) => {
  useBodyScrollLock(isOpen);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Basic Information
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');

  // Step 2: Employment Details
  const [employeeCode, setEmployeeCode] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('');
  const [employmentType, setEmploymentType] = useState('FULL_TIME');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [workLocation, setWorkLocation] = useState('');

  // Step 3: Qualifications & Experience
  const [qualificationDegree, setQualificationDegree] = useState('');
  const [qualificationField, setQualificationField] = useState('');
  const [qualificationInstitution, setQualificationInstitution] = useState('');
  const [experienceYears, setExperienceYears] = useState('');

  // Step 4: Account Provisioning
  const [loginEmail, setLoginEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);

  // Submission state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate employee code on modal open
  const fetchNextCode = async () => {
    try {
      const res = await apiFetch('/staff/next-code');
      const code = res.data?.employeeCode || res.data?.nextCode;
      if (res.success && code) {
        setEmployeeCode(code);
      }
    } catch (e) {
      // Fallback
      if (activeInstituteCode) {
        setEmployeeCode(`${activeInstituteCode}-EMP-001`);
      }
    }
  };

  const generateStrongPassword = () => {
    const chars = 'abcdefghijkmnpqrstuvwxyz';
    const nums = '23456789';
    const rand = (str: string, len: number) =>
      Array.from({ length: len }, () => str[Math.floor(Math.random() * str.length)]).join('');
    return `Pass#${rand(chars, 3)}${rand(nums, 4)}`;
  };

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setError(null);
      setFullName('');
      setPhone('');
      setPersonalEmail('');
      setDob('');
      setGender('');
      setDesignation('');
      setDepartment('');
      setEmploymentType('FULL_TIME');
      setJoiningDate(new Date().toISOString().split('T')[0]);
      setWorkLocation('');
      setQualificationDegree('');
      setQualificationField('');
      setQualificationInstitution('');
      setExperienceYears('');
      setLoginEmail('');
      setPassword(generateStrongPassword());
      fetchNextCode();
    }
  }, [isOpen]);

  // Sync login email from name/institute when step 1 progresses
  const handleProceedFromStep1 = () => {
    if (!fullName.trim()) {
      setError('Staff full name is required');
      return;
    }
    setError(null);
    if (!loginEmail) {
      const cleanName = fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const domain = activeInstituteCode
        ? `${activeInstituteCode.toLowerCase()}.edu`
        : 'tuitionos.internal';
      setLoginEmail(`${cleanName}@${domain}`);
    }
    setStep(2);
  };

  const handleProceedFromStep2 = () => {
    if (!designation.trim()) {
      setError('Designation is required (e.g. Senior Mathematics Faculty)');
      return;
    }
    setError(null);
    setStep(3);
  };

  const handleProceedFromStep3 = () => {
    setError(null);
    setStep(4);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !designation.trim() || !loginEmail.trim() || !password.trim()) {
      setError('Please fill in all mandatory fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        fullName: fullName.trim(),
        email: loginEmail.trim().toLowerCase(),
        phone: phone.trim() || null,
        employeeCode: employeeCode.trim() || null,
        designation: designation.trim(),
        temporaryPassword: password,

        // Personal Details
        personalEmail: personalEmail.trim() || null,
        dob: dob || null,
        gender: gender || null,

        // Employment Details
        department: department.trim() || null,
        employmentType,
        joiningDate: joiningDate || null,
        workLocation: workLocation.trim() || null,
      };

      const res = await apiFetch('/staff', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const staffObj = res.data?.staff;
      const staffId = staffObj?.id || res.data?.staffId;
      if (res.success && (staffObj || staffId)) {
        const createdStaff: StaffMember = staffObj || {
          id: staffId,
          instituteId: res.data?.institute?.id || '',
          userId: res.data?.user?.id || '',
          employeeCode: res.data?.employeeCode || employeeCode,
          designation,
          qualification: qualificationDegree || null,
          createdAt: new Date().toISOString(),
          user: res.data?.user || {
            id: res.data?.user?.id || '',
            fullName,
            email: loginEmail,
            phone: phone || null,
            role: 'STAFF',
            isActive: true,
            mustChangePassword: false,
          },
        };

        // If qualification details provided, save them
        if (qualificationDegree.trim() && qualificationInstitution.trim()) {
          try {
            await apiFetch(`/staff/${createdStaff.id}/qualifications`, {
              method: 'POST',
              body: JSON.stringify({
                degree: qualificationDegree.trim(),
                fieldOfStudy: qualificationField.trim() || null,
                institution: qualificationInstitution.trim(),
              }),
            });
          } catch (e) {
            console.warn('Initial qualification save skipped', e);
          }
        }

        // If experiences provided, save them
        if (experienceYears.trim()) {
          try {
            await apiFetch(`/staff/${createdStaff.id}/experiences`, {
              method: 'POST',
              body: JSON.stringify({
                institution: 'Previous Institute',
                designation: designation.trim(),
                totalYears: parseFloat(experienceYears) || 0,
              }),
            });
          } catch (e) {
            console.warn('Initial experience save skipped', e);
          }
        }

        onSuccess(createdStaff, {
          fullName: createdStaff.user.fullName,
          email: createdStaff.user.email || loginEmail,
          permanentPassword: password,
          employeeCode: createdStaff.employeeCode || employeeCode,
          instituteCode: activeInstituteCode,
        });

        onClose();
      } else {
        setError(formatUserFriendlyError(res.error));
      }
    } catch (err: any) {
      setError(formatUserFriendlyError(err.message));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-[#D7CCC8] animate-in fade-in zoom-in-95 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#EFEBE9]">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FAF8F5] border border-[#D7CCC8] text-[#6D4C41] text-[10px] font-bold uppercase tracking-wider mb-1.5">
              <User className="w-3 h-3 text-[#4E342E]" /> Step {step} of 4
            </div>
            <h2 className="text-xl font-extrabold text-[#2D1E18]">
              Provision New Staff & Faculty
            </h2>
            <p className="text-xs text-[#6D4C41] mt-0.5">
              Step-by-step profile onboarding and portal account provisioning
            </p>
          </div>
          <button onClick={onClose} className="text-[#8D6E63] hover:text-[#2D1E18] p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Step Progress (4 Steps) */}
        <div className="py-4">
          <div className="flex items-center justify-between">
            {[
              { num: 1, label: 'Identity' },
              { num: 2, label: 'Employment' },
              { num: 3, label: 'Qualifications' },
              { num: 4, label: 'Account' },
            ].map((s, idx) => (
              <React.Fragment key={s.num}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step === s.num
                        ? 'bg-[#4E342E] text-white ring-4 ring-[#8D6E63]/20 shadow-md'
                        : step > s.num
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#F7F2EF] text-[#8D6E63] border border-[#D7CCC8]'
                      }`}
                  >
                    {step > s.num ? <Check className="w-4 h-4" /> : s.num}
                  </div>
                  <span
                    className={`text-[10px] font-semibold mt-1.5 hidden sm:block ${step === s.num ? 'text-[#4E342E]' : 'text-[#8D6E63]'
                      }`}
                  >
                    {s.label}
                  </span>
                </div>
                {idx < 3 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 transition-colors ${step > s.num ? 'bg-emerald-600' : 'bg-[#EFEBE9]'
                      }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 mb-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start justify-between gap-2.5 shadow-sm animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-medium leading-relaxed">{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-rose-500 hover:text-rose-700 text-xs p-0.5 rounded transition-colors"
              title="Dismiss error"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Step 1: Basic Identity */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#2D1E18] mb-1">
                Full Name *
              </label>
              <input
                type="text"
                autoFocus
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Dr. Rajesh Sharma / Prof. Anita Verma"
                className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3.5 py-2.5 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#2D1E18] mb-1">
                  Primary Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3.5 py-2.5 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#2D1E18] mb-1">
                  Personal Email (Optional)
                </label>
                <input
                  type="email"
                  value={personalEmail}
                  onChange={(e) => setPersonalEmail(e.target.value)}
                  placeholder="e.g. faculty.personal@gmail.com"
                  className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3.5 py-2.5 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#2D1E18] mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3.5 py-2.5 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#2D1E18] mb-1">
                  Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3.5 py-2.5 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Employment Details */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[#2D1E18]">
                    Employee Code *
                  </label>
                  <button
                    type="button"
                    onClick={fetchNextCode}
                    className="text-[11px] font-semibold text-[#8D6E63] hover:text-[#4E342E] flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Auto
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value)}
                  placeholder="e.g. APEX-EMP-005"
                  className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3.5 py-2.5 text-xs font-mono text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#2D1E18] mb-1">
                  Designation / Role *
                </label>
                <input
                  type="text"
                  required
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Senior Physics Faculty"
                  className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3.5 py-2.5 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#2D1E18] mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Science / Mathematics / Humanities"
                  className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3.5 py-2.5 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#2D1E18] mb-1">
                  Employment Type
                </label>
                <select
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3.5 py-2.5 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                >
                  <option value="FULL_TIME">Full Time</option>
                  <option value="PART_TIME">Part Time</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="VISITING">Visiting Faculty</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#2D1E18] mb-1">
                  Joining Date
                </label>
                <input
                  type="date"
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3.5 py-2.5 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#2D1E18] mb-1">
                  Work Location / Campus
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-[#8D6E63] absolute left-3 top-3" />
                  <input
                    type="text"
                    value={workLocation}
                    onChange={(e) => setWorkLocation(e.target.value)}
                    placeholder="e.g. Main Campus / South Block"
                    className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Qualifications & Initial Experience */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#2D1E18] mb-1">
                Highest Degree / Qualification
              </label>
              <input
                type="text"
                value={qualificationDegree}
                onChange={(e) => setQualificationDegree(e.target.value)}
                placeholder="e.g. M.Sc, M.Phil, Ph.D, B.Ed"
                className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3.5 py-2.5 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#2D1E18] mb-1">
                  Field of Study / Specialization
                </label>
                <input
                  type="text"
                  value={qualificationField}
                  onChange={(e) => setQualificationField(e.target.value)}
                  placeholder="e.g. Theoretical Physics / Pure Mathematics"
                  className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3.5 py-2.5 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#2D1E18] mb-1">
                  College / University
                </label>
                <input
                  type="text"
                  value={qualificationInstitution}
                  onChange={(e) => setQualificationInstitution(e.target.value)}
                  placeholder="e.g. University of Delhi"
                  className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3.5 py-2.5 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2D1E18] mb-1">
                Total Teaching Experience (Years)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
                placeholder="e.g. 5"
                className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3.5 py-2.5 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
              />
              <span className="text-[10px] text-[#8D6E63] mt-1 block">
                Additional qualifications, past jobs, and certificates can be added later in the staff profile.
              </span>
            </div>
          </div>
        )}

        {/* Step 4: Account Provisioning & Permanent Password */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="p-4 bg-[#FAF8F5] border border-[#D7CCC8] rounded-2xl space-y-3">
              <span className="text-xs font-bold text-[#4E342E] uppercase tracking-wider block">
                Profile Summary
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[#8D6E63]">Name:</span>{' '}
                  <span className="font-semibold text-[#2D1E18]">{fullName}</span>
                </div>
                <div>
                  <span className="text-[#8D6E63]">Code:</span>{' '}
                  <span className="font-mono font-bold text-[#2D1E18]">{employeeCode}</span>
                </div>
                <div>
                  <span className="text-[#8D6E63]">Role:</span>{' '}
                  <span className="font-semibold text-[#2D1E18]">{designation}</span>
                </div>
                <div>
                  <span className="text-[#8D6E63]">Department:</span>{' '}
                  <span className="font-semibold text-[#2D1E18]">{department || 'General'}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2D1E18] mb-1">
                Portal Login Email *
              </label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="faculty@institute.edu"
                className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3.5 py-2.5 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
              />
              <span className="text-[10px] text-[#8D6E63] mt-1 block">
                This will be the employee's username for web & mobile app login.
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-[#2D1E18]">
                  Permanent Login Password *
                </label>
                <button
                  type="button"
                  onClick={() => setPassword(generateStrongPassword())}
                  className="text-[11px] font-semibold text-[#8D6E63] hover:text-[#4E342E] flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" /> Auto-generate
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Type or generate permanent password"
                  className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl pl-3.5 pr-10 py-2.5 text-xs font-mono text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-[#8D6E63] hover:text-[#4E342E]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <span className="text-[10px] text-[#8D6E63] mt-1 block">
                Permanent password generated by admin. You will receive credentials to copy after creation.
              </span>
            </div>
          </div>
        )}

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-[#EFEBE9] mt-6">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((prev) => (prev - 1) as any)}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-[#D7CCC8] rounded-xl text-xs font-semibold text-[#6D4C41] hover:bg-[#F7F2EF]"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#D7CCC8] rounded-xl text-xs font-semibold text-[#6D4C41] hover:bg-[#F7F2EF]"
            >
              Cancel
            </button>
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 1) handleProceedFromStep1();
                else if (step === 2) handleProceedFromStep2();
                else if (step === 3) handleProceedFromStep3();
              }}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-semibold rounded-xl shadow-md shadow-[#3E2723]/25 transition-all"
            >
              <span>Continue</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-semibold rounded-xl shadow-md shadow-[#3E2723]/25 transition-all disabled:opacity-50"
            >
              {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
              <span>Create Staff Member</span>
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
