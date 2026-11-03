import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/useAuth';
import {
  Banknote,
  Calendar,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  Download,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CreditCard,
  FileSpreadsheet,
  Settings,
  Layers,
  ChevronRight,
  X,
  Check,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Trash2,
  Edit2,
  Eye,
  ArrowRight,
  FileText,
  Sparkles,
} from 'lucide-react';

export const PayrollManagement: React.FC = () => {
  const { user, activeInstitute } = useAuth();

  // Active Tab: 'overview' | 'salary_setup' | 'structures' | 'settings'
  const [activeTab, setActiveTab] = useState<'overview' | 'salary_setup' | 'structures' | 'settings'>('overview');

  // Month & Year Selector (defaults to current month)
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);

  // Overview / Dashboard State
  const [dashboardLoading, setDashboardLoading] = useState<boolean>(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Calculation & Run Processing State
  const [processingRun, setProcessingRun] = useState<boolean>(false);
  const [approvingRun, setApprovingRun] = useState<boolean>(false);

  // Modals
  const [selectedRecordForDetails, setSelectedRecordForDetails] = useState<any | null>(null);
  const [selectedRecordForPayment, setSelectedRecordForPayment] = useState<any | null>(null);
  const [selectedRecordForAdjustment, setSelectedRecordForAdjustment] = useState<any | null>(null);
  const [selectedPayslipData, setSelectedPayslipData] = useState<any | null>(null);

  // Staff Salary Setup State
  const [staffSalaries, setStaffSalaries] = useState<any[]>([]);
  const [loadingStaffSalaries, setLoadingStaffSalaries] = useState<boolean>(false);
  const [selectedStaffForSalary, setSelectedStaffForSalary] = useState<any | null>(null);
  const [salaryHistory, setSalaryHistory] = useState<any[]>([]);
  const [viewingHistoryStaff, setViewingHistoryStaff] = useState<any | null>(null);

  // Structures State
  const [structures, setStructures] = useState<any[]>([]);
  const [loadingStructures, setLoadingStructures] = useState<boolean>(false);
  const [showStructureModal, setShowStructureModal] = useState<boolean>(false);
  const [editingStructure, setEditingStructure] = useState<any | null>(null);
  const [structName, setStructName] = useState<string>('');
  const [structDesc, setStructDesc] = useState<string>('');
  const [structIsDefault, setStructIsDefault] = useState<boolean>(false);
  const [structComponents, setStructComponents] = useState<Array<{
    name: string;
    type: 'EARNING' | 'DEDUCTION';
    calculationType: 'FLAT' | 'PERCENTAGE_OF_BASIC' | 'PERCENTAGE_OF_GROSS';
    amountOrPercent: number;
    isTaxable?: boolean;
    isStatutory?: boolean;
  }>>([]);
  const [savingStructure, setSavingStructure] = useState<boolean>(false);
  const [deletingStructureId, setDeletingStructureId] = useState<string | null>(null);

  // Settings / Policy State
  const [policy, setPolicy] = useState<any>(null);
  const [loadingPolicy, setLoadingPolicy] = useState<boolean>(false);
  const [savingPolicy, setSavingPolicy] = useState<boolean>(false);

  // Payment Form State
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('BANK_TRANSFER');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [recordingPayment, setRecordingPayment] = useState<boolean>(false);

  // Adjustment Form State
  const [adjType, setAdjType] = useState<'EARNING' | 'DEDUCTION'>('EARNING');
  const [adjTitle, setAdjTitle] = useState<string>('');
  const [adjAmount, setAdjAmount] = useState<string>('');
  const [adjReason, setAdjReason] = useState<string>('');
  const [savingAdjustment, setSavingAdjustment] = useState<boolean>(false);

  // Salary Setup Form State
  const [salaryBaseAmount, setSalaryBaseAmount] = useState<string>('');
  const [salaryStructureId, setSalaryStructureId] = useState<string>('');
  const [salaryEffectiveDate, setSalaryEffectiveDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [salaryNotes, setSalaryNotes] = useState<string>('');
  const [savingSalary, setSavingSalary] = useState<boolean>(false);

  // Currency Formatter
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const getMonthName = (m: number) => {
    const names = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return names[m - 1] || `Month ${m}`;
  };

  // 1. Fetch Dashboard / Monthly Run
  const loadDashboard = async () => {
    try {
      setDashboardLoading(true);
      const res = await apiFetch(`/payroll/dashboard?year=${selectedYear}&month=${selectedMonth}`);
      if (res.success && res.data) {
        setDashboardData(res.data);
      }
    } catch (err: any) {
      console.error('[loadDashboard error]', err);
    } finally {
      setDashboardLoading(false);
    }
  };

  // 2. Fetch Staff Salaries
  const loadStaffSalaries = async () => {
    try {
      setLoadingStaffSalaries(true);
      const res = await apiFetch('/payroll/staff-salaries');
      if (res.success && res.data?.staffSalaries) {
        setStaffSalaries(res.data.staffSalaries);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStaffSalaries(false);
    }
  };

  // 3. Fetch Structures
  const loadStructures = async () => {
    try {
      setLoadingStructures(true);
      const res = await apiFetch('/payroll/structures');
      if (res.success && res.data?.structures) {
        setStructures(res.data.structures);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStructures(false);
    }
  };

  // Populate Structure Modal
  useEffect(() => {
    if (showStructureModal) {
      if (editingStructure) {
        setStructName(editingStructure.name || '');
        setStructDesc(editingStructure.description || '');
        setStructIsDefault(editingStructure.isDefault || false);
        setStructComponents(
          (editingStructure.components || []).map((c: any) => ({
            name: c.name,
            type: c.type,
            calculationType: c.calculationType,
            amountOrPercent: c.amountOrPercent,
            isTaxable: c.isTaxable,
            isStatutory: c.isStatutory,
          }))
        );
      } else {
        setStructName('');
        setStructDesc('');
        setStructIsDefault(false);
        setStructComponents([
          { name: 'Basic Pay', type: 'EARNING', calculationType: 'PERCENTAGE_OF_GROSS', amountOrPercent: 50, isTaxable: true, isStatutory: false },
          { name: 'House Rent Allowance (HRA)', type: 'EARNING', calculationType: 'PERCENTAGE_OF_BASIC', amountOrPercent: 40, isTaxable: true, isStatutory: false },
          { name: 'Special Allowance', type: 'EARNING', calculationType: 'PERCENTAGE_OF_GROSS', amountOrPercent: 30, isTaxable: true, isStatutory: false },
          { name: 'Provident Fund (PF)', type: 'DEDUCTION', calculationType: 'PERCENTAGE_OF_BASIC', amountOrPercent: 12, isTaxable: false, isStatutory: true },
        ]);
      }
    }
  }, [showStructureModal, editingStructure]);

  // Save Salary Structure (Create or Update)
  const handleSaveStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!structName.trim()) {
      alert('Please enter a structure name');
      return;
    }
    if (structComponents.length === 0) {
      alert('Please add at least one salary component');
      return;
    }

    try {
      setSavingStructure(true);
      const payload = {
        name: structName.trim(),
        description: structDesc.trim() || undefined,
        isDefault: structIsDefault,
        components: structComponents.map((c, idx) => ({
          name: c.name.trim(),
          type: c.type,
          calculationType: c.calculationType,
          amountOrPercent: Number(compToAmount(c.amountOrPercent)),
          isTaxable: c.isTaxable ?? true,
          isStatutory: c.isStatutory ?? false,
          displayOrder: idx + 1,
        })),
      };

      const endpoint = editingStructure
        ? `/payroll/structures/${editingStructure.id}`
        : '/payroll/structures';
      const method = editingStructure ? 'PUT' : 'POST';

      const res = await apiFetch(endpoint, {
        method,
        body: JSON.stringify(payload),
      });

      if (res.success) {
        setShowStructureModal(false);
        setActionSuccess(editingStructure ? 'Salary structure updated successfully!' : 'Salary structure created successfully!');
        await loadStructures();
      } else {
        alert(res.error || 'Failed to save salary structure');
      }
    } catch (err: any) {
      alert(err.message || 'Error saving salary structure');
    } finally {
      setSavingStructure(false);
    }
  };

  const compToAmount = (val: any) => {
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
  };

  // Delete Salary Structure
  const handleDeleteStructure = async (structureId: string) => {
    if (!window.confirm('Are you sure you want to delete this salary structure? Existing assignments may need updating.')) return;
    try {
      setDeletingStructureId(structureId);
      const res = await apiFetch(`/payroll/structures/${structureId}`, {
        method: 'DELETE',
      });
      if (res.success) {
        setActionSuccess('Salary structure deleted');
        await loadStructures();
      } else {
        alert(res.error || 'Failed to delete structure');
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting structure');
    } finally {
      setDeletingStructureId(null);
    }
  };

  // 4. Fetch Policy Settings
  const loadPolicy = async () => {
    try {
      setLoadingPolicy(true);
      const res = await apiFetch('/payroll/policy');
      if (res.success && res.data?.policy) {
        setPolicy(res.data.policy);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPolicy(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    if (activeTab === 'salary_setup') loadStaffSalaries();
    if (activeTab === 'structures') loadStructures();
    if (activeTab === 'settings') loadPolicy();
  }, [activeTab]);

  // Generate / Recalculate Payroll
  const handleProcessPayroll = async () => {
    try {
      setProcessingRun(true);
      setActionSuccess(null);
      setActionError(null);

      const res = await apiFetch('/payroll/runs/generate', {
        method: 'POST',
        body: JSON.stringify({ year: selectedYear, month: selectedMonth }),
      });

      if (res.success) {
        setActionSuccess(`Payroll calculated successfully for ${getMonthName(selectedMonth)} ${selectedYear}!`);
        await loadDashboard();
      } else {
        setActionError(res.error || 'Failed to calculate payroll');
      }
    } catch (err: any) {
      setActionError(err.message || 'Error processing payroll');
    } finally {
      setProcessingRun(false);
    }
  };

  // Approve Payroll Run
  const handleApprovePayroll = async () => {
    if (!dashboardData?.metrics?.runId) return;
    if (!window.confirm(`Are you sure you want to approve and finalize payroll for ${getMonthName(selectedMonth)} ${selectedYear}? Once approved, payslips will be generated and figures are locked.`)) {
      return;
    }

    try {
      setApprovingRun(true);
      setActionSuccess(null);
      setActionError(null);

      const res = await apiFetch(`/payroll/runs/${dashboardData.metrics.runId}/approve`, {
        method: 'POST',
      });

      if (res.success) {
        setActionSuccess('Payroll successfully approved! Immutable payslips generated for all staff.');
        await loadDashboard();
      } else {
        setActionError(res.error || 'Failed to approve payroll');
      }
    } catch (err: any) {
      setActionError(err.message || 'Error approving payroll');
    } finally {
      setApprovingRun(false);
    }
  };

  // Save Salary Assignment
  const handleSaveSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffForSalary) return;
    try {
      setSavingSalary(true);
      const res = await apiFetch('/payroll/staff-salaries', {
        method: 'POST',
        body: JSON.stringify({
          staffId: selectedStaffForSalary.staffId,
          baseMonthlySalary: parseFloat(salaryBaseAmount),
          structureId: salaryStructureId || null,
          effectiveFrom: salaryEffectiveDate,
          notes: salaryNotes || null,
        }),
      });

      if (res.success) {
        setSelectedStaffForSalary(null);
        await loadStaffSalaries();
        setActionSuccess('Staff salary configuration updated successfully.');
      } else {
        alert(res.error || 'Failed to assign salary');
      }
    } catch (err: any) {
      alert(err.message || 'Error assigning salary');
    } finally {
      setSavingSalary(false);
    }
  };

  // Record Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecordForPayment) return;
    try {
      setRecordingPayment(true);
      const res = await apiFetch(`/payroll/records/${selectedRecordForPayment.id}/payments`, {
        method: 'POST',
        body: JSON.stringify({
          amount: parseFloat(paymentAmount),
          paymentMethod,
          transactionReference: paymentRef || null,
          notes: paymentNotes || null,
        }),
      });

      if (res.success) {
        setSelectedRecordForPayment(null);
        await loadDashboard();
        setActionSuccess('Salary payment recorded successfully.');
      } else {
        alert(res.error || 'Failed to record payment');
      }
    } catch (err: any) {
      alert(err.message || 'Error recording payment');
    } finally {
      setRecordingPayment(false);
    }
  };

  // Add Adjustment
  const handleAddAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecordForAdjustment) return;
    try {
      setSavingAdjustment(true);
      const res = await apiFetch(`/payroll/records/${selectedRecordForAdjustment.id}/adjustments`, {
        method: 'POST',
        body: JSON.stringify({
          type: adjType,
          title: adjTitle,
          amount: parseFloat(adjAmount),
          reason: adjReason,
        }),
      });

      if (res.success) {
        setSelectedRecordForAdjustment(null);
        await loadDashboard();
        setActionSuccess('Manual payroll adjustment applied and logged.');
      } else {
        alert(res.error || 'Failed to add adjustment');
      }
    } catch (err: any) {
      alert(err.message || 'Error adding adjustment');
    } finally {
      setSavingAdjustment(false);
    }
  };

  // Open Payslip Modal
  const handleOpenPayslip = async (recordId: string) => {
    try {
      const res = await apiFetch(`/payroll/payslips/${recordId}`);
      if (res.success && res.data?.payslip) {
        setSelectedPayslipData(res.data.payslip);
      } else {
        alert('Payslip not available. Ensure the payroll run has been approved first.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to load payslip');
    }
  };

  // Filtered records
  const filteredRecords = (dashboardData?.records || []).filter((r: any) => {
    const q = searchQuery.toLowerCase();
    return (
      r.staffName?.toLowerCase().includes(q) ||
      r.employeeCode?.toLowerCase().includes(q) ||
      r.designation?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#D7CCC8] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#FAF8F5] text-[#4E342E] border border-[#D7CCC8]">
              <Banknote className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-black text-[#2D1E18]">Staff Payroll Management</h1>
              <p className="text-xs text-[#6D4C41] mt-0.5">
                Attendance-integrated monthly salary calculations, statutory deductions, payments, and verified payslips
              </p>
            </div>
          </div>
        </div>

        {/* Month & Year Selectors */}
        <div className="flex items-center gap-2 bg-[#FAF8F5] p-1.5 rounded-xl border border-[#D7CCC8]">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
            className="bg-white border border-[#D7CCC8] rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#2D1E18] focus:outline-none focus:ring-1 focus:ring-[#8D6E63]"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {getMonthName(m)}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="bg-white border border-[#D7CCC8] rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#2D1E18] focus:outline-none focus:ring-1 focus:ring-[#8D6E63]"
          >
            {[2025, 2026, 2027, 2028].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-[#D7CCC8] pb-1 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition ${
            activeTab === 'overview'
              ? 'bg-[#4E342E] text-white shadow-sm font-bold'
              : 'text-[#6D4C41] hover:bg-white hover:text-[#2D1E18]'
          }`}
        >
          <Calendar className="w-4 h-4" /> Monthly Register & Overview
        </button>
        <button
          onClick={() => setActiveTab('salary_setup')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition ${
            activeTab === 'salary_setup'
              ? 'bg-[#4E342E] text-white shadow-sm font-bold'
              : 'text-[#6D4C41] hover:bg-white hover:text-[#2D1E18]'
          }`}
        >
          <Users className="w-4 h-4" /> Staff Salary Setup
        </button>
        <button
          onClick={() => setActiveTab('structures')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition ${
            activeTab === 'structures'
              ? 'bg-[#4E342E] text-white shadow-sm font-bold'
              : 'text-[#6D4C41] hover:bg-white hover:text-[#2D1E18]'
          }`}
        >
          <Layers className="w-4 h-4" /> Salary Structures
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition ${
            activeTab === 'settings'
              ? 'bg-[#4E342E] text-white shadow-sm font-bold'
              : 'text-[#6D4C41] hover:bg-white hover:text-[#2D1E18]'
          }`}
        >
          <Settings className="w-4 h-4" /> Payroll Policy Settings
        </button>
      </div>

      {/* Alerts */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {actionError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-700 hover:text-rose-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW & MONTHLY REGISTER */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-[#D7CCC8] shadow-sm">
              <span className="text-[10px] font-bold text-[#8D6E63] uppercase tracking-wider block">Active Staff</span>
              <span className="text-xl font-black text-[#2D1E18] block mt-1">
                {dashboardData?.metrics?.totalActiveStaff || 0}
              </span>
              <span className="text-[11px] text-[#6D4C41] mt-0.5 block">
                {dashboardData?.metrics?.configuredSalariesCount || 0} configured
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#D7CCC8] shadow-sm">
              <span className="text-[10px] font-bold text-[#8D6E63] uppercase tracking-wider block">Gross CTC</span>
              <span className="text-xl font-black text-[#2D1E18] block mt-1">
                {formatCurrency(dashboardData?.metrics?.totalGross || 0)}
              </span>
              <span className="text-[11px] text-[#6D4C41] mt-0.5 block">Pre-deduction</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#D7CCC8] shadow-sm">
              <span className="text-[10px] font-bold text-[#8D6E63] uppercase tracking-wider block">Net Payable</span>
              <span className="text-xl font-black text-emerald-800 block mt-1">
                {formatCurrency(dashboardData?.metrics?.totalNetPayable || 0)}
              </span>
              <span className="text-[11px] text-emerald-700 mt-0.5 block">Actual disbursements</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#D7CCC8] shadow-sm">
              <span className="text-[10px] font-bold text-[#8D6E63] uppercase tracking-wider block">Amount Paid</span>
              <span className="text-xl font-black text-[#2D1E18] block mt-1">
                {formatCurrency(dashboardData?.metrics?.totalPaid || 0)}
              </span>
              <span className="text-[11px] text-emerald-700 mt-0.5 block">Settled to staff</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#D7CCC8] shadow-sm">
              <span className="text-[10px] font-bold text-[#8D6E63] uppercase tracking-wider block">Pending Balance</span>
              <span className="text-xl font-black text-amber-800 block mt-1">
                {formatCurrency(dashboardData?.metrics?.totalPending || 0)}
              </span>
              <span className="text-[11px] text-amber-700 mt-0.5 block">Awaiting payment</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#D7CCC8] shadow-sm">
              <span className="text-[10px] font-bold text-[#8D6E63] uppercase tracking-wider block">Run Status</span>
              <span
                className={`text-xs font-bold uppercase tracking-wider inline-block px-2.5 py-1 rounded-full mt-2 ${
                  dashboardData?.metrics?.runStatus === 'APPROVED' || dashboardData?.metrics?.runStatus === 'PAID'
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : dashboardData?.metrics?.runStatus === 'CALCULATED'
                    ? 'bg-sky-100 text-sky-900 border border-sky-300'
                    : 'bg-zinc-100 text-zinc-800 border border-zinc-300'
                }`}
              >
                {dashboardData?.metrics?.runStatus || 'NOT GENERATED'}
              </span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#D7CCC8]">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#8D6E63]" />
              <input
                type="text"
                placeholder="Search staff, code, or designation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleProcessPayroll}
                disabled={processingRun}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#4E342E] text-white text-xs font-bold rounded-xl hover:bg-[#3E2723] transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${processingRun ? 'animate-spin' : ''}`} />
                <span>{processingRun ? 'Calculating...' : 'Calculate Monthly Payroll'}</span>
              </button>

              {dashboardData?.metrics?.runStatus === 'CALCULATED' && (
                <button
                  type="button"
                  onClick={handleApprovePayroll}
                  disabled={approvingRun}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-800 text-white text-xs font-bold rounded-xl hover:bg-emerald-900 transition disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{approvingRun ? 'Approving...' : 'Approve & Lock Run'}</span>
                </button>
              )}

              <a
                href={`/api/payroll/reports/register?year=${selectedYear}&month=${selectedMonth}&format=csv`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#FAF8F5] text-[#4E342E] border border-[#D7CCC8] hover:bg-white text-xs font-semibold rounded-xl transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </a>
            </div>
          </div>

          {/* Payroll Register Table */}
          <div className="bg-white rounded-2xl border border-[#D7CCC8] shadow-sm overflow-hidden">
            <div className="overflow-x-auto min-h-[360px]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#D7CCC8] text-[#6D4C41] bg-[#FAF8F5] uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4 font-bold">Staff Member</th>
                    <th className="py-3 px-3 font-bold">Designation</th>
                    <th className="py-3 px-3 font-bold text-center">Attendance</th>
                    <th className="py-3 px-3 font-bold text-right">Gross Pay</th>
                    <th className="py-3 px-3 font-bold text-right">Deductions</th>
                    <th className="py-3 px-3 font-bold text-right">Net Payable</th>
                    <th className="py-3 px-3 font-bold text-center">Payment</th>
                    <th className="py-3 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFEBE9]">
                  {dashboardLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-[#6D4C41]">
                        <div className="inline-block w-5 h-5 border-2 border-[#4E342E] border-t-transparent rounded-full animate-spin mb-2"></div>
                        <div>Loading monthly payroll register...</div>
                      </td>
                    </tr>
                  ) : filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-[#6D4C41]">
                        <div className="max-w-sm mx-auto space-y-2">
                          <Banknote className="w-8 h-8 text-[#8D6E63] mx-auto" />
                          <div className="font-bold text-[#2D1E18]">No Payroll Records For This Month</div>
                          <p className="text-xs">
                            Click <strong>"Calculate Monthly Payroll"</strong> to aggregate attendance and compute salaries for {getMonthName(selectedMonth)} {selectedYear}.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((r: any) => {
                      const isApproved = ['APPROVED', 'PAID', 'PARTIALLY_PAID'].includes(dashboardData?.metrics?.runStatus);
                      return (
                        <tr key={r.id} className="hover:bg-[#FAF8F5] transition">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-[#2D1E18] text-sm">{r.staffName}</div>
                            <div className="font-mono text-[11px] text-[#6D4C41]">{r.employeeCode || 'N/A'}</div>
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="font-medium text-[#2D1E18] block">{r.designation || 'Staff'}</span>
                            <span className="text-[11px] text-[#8D6E63]">{r.department || 'General'}</span>
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <div className="inline-flex items-center gap-1 font-semibold text-[11px]">
                              <span className="text-emerald-800">{r.workedDays}d worked</span>
                              {r.wfhDays > 0 && <span className="text-cyan-800 text-[10px]">({r.wfhDays} WFH)</span>}
                            </div>
                            {r.lateDays > 0 && (
                              <div className="text-[10px] text-amber-800 font-medium">{r.lateDays} late</div>
                            )}
                          </td>
                          <td className="py-3.5 px-3 text-right font-semibold text-[#2D1E18]">
                            {formatCurrency(r.grossPay)}
                          </td>
                          <td className="py-3.5 px-3 text-right font-semibold text-rose-700">
                            {r.totalDeductions > 0 ? `-${formatCurrency(r.totalDeductions)}` : '₹0'}
                          </td>
                          <td className="py-3.5 px-3 text-right font-black text-sm text-emerald-800">
                            {formatCurrency(r.netPayable)}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                r.paymentStatus === 'PAID'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : r.paymentStatus === 'PARTIAL'
                                  ? 'bg-sky-100 text-sky-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {r.paymentStatus}
                            </span>
                            {r.paidAmount > 0 && r.paymentStatus !== 'PAID' && (
                              <div className="text-[10px] text-[#6D4C41] mt-0.5 font-mono">
                                Paid: {formatCurrency(r.paidAmount)}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedRecordForDetails(r)}
                                className="p-1.5 text-[#6D4C41] hover:text-[#2D1E18] hover:bg-white rounded-lg border border-transparent hover:border-[#D7CCC8]"
                                title="View Calculation Breakdown"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {!isApproved && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedRecordForAdjustment(r)}
                                  className="p-1.5 text-[#6D4C41] hover:text-[#2D1E18] hover:bg-white rounded-lg border border-transparent hover:border-[#D7CCC8]"
                                  title="Add Bonus or Deduction Adjustment"
                                >
                                  <Sparkles className="w-4 h-4 text-amber-600" />
                                </button>
                              )}

                              {isApproved && r.paymentStatus !== 'PAID' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedRecordForPayment(r);
                                    setPaymentAmount(String(r.pendingAmount || r.netPayable));
                                  }}
                                  className="p-1.5 text-emerald-800 hover:text-emerald-950 hover:bg-emerald-50 rounded-lg border border-emerald-200"
                                  title="Record Salary Payment"
                                >
                                  <CreditCard className="w-4 h-4" />
                                </button>
                              )}

                              {isApproved && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenPayslip(r.id)}
                                  className="p-1.5 text-[#4E342E] hover:text-black hover:bg-white rounded-lg border border-[#D7CCC8]"
                                  title="Print Payslip"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: STAFF SALARY SETUP */}
      {/* ========================================================================= */}
      {activeTab === 'salary_setup' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-[#D7CCC8] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#2D1E18]">Staff Compensation & CTC Configuration</h3>
              <p className="text-xs text-[#6D4C41] mt-0.5">
                Assign monthly base pay, associate reusable salary structures, and manage revision history.
              </p>
            </div>
            <button
              type="button"
              onClick={loadStaffSalaries}
              className="p-2 text-[#6D4C41] hover:text-[#2D1E18] hover:bg-[#FAF8F5] rounded-xl border border-[#D7CCC8]"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-[#D7CCC8] shadow-sm overflow-hidden">
            <div className="overflow-x-auto min-h-[300px]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#D7CCC8] text-[#6D4C41] bg-[#FAF8F5] uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4 font-bold">Staff Member</th>
                    <th className="py-3 px-3 font-bold">Code</th>
                    <th className="py-3 px-3 font-bold">Designation</th>
                    <th className="py-3 px-3 font-bold">Salary Structure</th>
                    <th className="py-3 px-3 font-bold text-right">Base Monthly Pay</th>
                    <th className="py-3 px-3 font-bold">Effective Since</th>
                    <th className="py-3 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFEBE9]">
                  {loadingStaffSalaries ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[#6D4C41]">Loading staff directory...</td>
                    </tr>
                  ) : staffSalaries.map((s) => (
                    <tr key={s.staffId} className="hover:bg-[#FAF8F5] transition">
                      <td className="py-3.5 px-4 font-bold text-[#2D1E18]">{s.fullName}</td>
                      <td className="py-3.5 px-3 font-mono text-[#4E342E]">{s.employeeCode}</td>
                      <td className="py-3.5 px-3 text-[#6D4C41]">{s.designation}</td>
                      <td className="py-3.5 px-3">
                        <span className="font-semibold text-[#2D1E18] block">
                          {s.assignment?.structureName || 'Direct Base (No Template)'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right font-black text-sm text-emerald-800">
                        {s.assignment ? formatCurrency(s.assignment.baseMonthlySalary) : 'Not Configured'}
                      </td>
                      <td className="py-3.5 px-3 text-[#6D4C41]">
                        {s.assignment?.effectiveFrom
                          ? new Date(s.assignment.effectiveFrom).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStaffForSalary(s);
                              setSalaryBaseAmount(s.assignment?.baseMonthlySalary ? String(s.assignment.baseMonthlySalary) : '');
                              setSalaryStructureId(s.assignment?.structureId || '');
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#FAF8F5] text-[#4E342E] border border-[#D7CCC8] hover:bg-[#4E342E] hover:text-white rounded-xl text-xs font-semibold transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>{s.hasSalarySetup ? 'Update Salary' : 'Configure'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SALARY STRUCTURES & TEMPLATES */}
      {/* ========================================================================= */}
      {activeTab === 'structures' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-[#D7CCC8] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#2D1E18]">Reusable Salary Templates</h3>
              <p className="text-xs text-[#6D4C41] mt-0.5">
                Define pre-set packages for Faculty, Lab Assistants, Support Staff with automatic Basic, HRA, and statutory percentages.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingStructure(null);
                setShowStructureModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#4E342E] text-white text-xs font-bold rounded-xl hover:bg-[#3E2723] transition"
            >
              <Plus className="w-4 h-4" /> Create Structure
            </button>
          </div>

          {loadingStructures ? (
            <div className="py-12 text-center text-xs text-[#6D4C41]">Loading salary structures...</div>
          ) : structures.length === 0 ? (
            <div className="bg-white border border-[#D7CCC8] rounded-2xl p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#FAF8F5] border border-[#D7CCC8] flex items-center justify-center mx-auto text-[#6D4C41]">
                <Layers className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-[#2D1E18]">No Salary Structures Created Yet</h4>
              <p className="text-xs text-[#6D4C41] max-w-md mx-auto">
                Create structured salary packages (e.g. 50% Basic, 40% HRA, 12% PF) to automatically break down employee gross pay on official payslips.
              </p>
              <button
                type="button"
                onClick={() => {
                  setEditingStructure(null);
                  setShowStructureModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#4E342E] text-white text-xs font-bold rounded-xl hover:bg-[#3E2723] transition shadow-sm"
              >
                <Plus className="w-4 h-4" /> Create First Structure
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {structures.map((st) => (
                <div key={st.id} className="bg-white border border-[#D7CCC8] rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex justify-between items-start pb-3 border-b border-[#EFEBE9]">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-[#2D1E18]">{st.name}</h4>
                        {st.isDefault && (
                          <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">Default</span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#6D4C41] mt-0.5">{st.description || 'Standard compensation template'}</p>
                    </div>
                    <span className="text-[10px] font-bold text-[#8D6E63] bg-[#FAF8F5] border border-[#D7CCC8] px-2 py-0.5 rounded-full">
                      {st._count?.assignments || 0} Assigned
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <span className="text-[10px] uppercase font-bold text-[#8D6E63] block">Component Breakdown</span>
                    {(st.components || []).map((c: any) => (
                      <div key={c.id} className="flex justify-between py-1 border-b border-[#FAF8F5]">
                        <span className="text-[#2D1E18]">{c.name}</span>
                        <span className={`font-mono font-bold ${c.type === 'EARNING' ? 'text-emerald-800' : 'text-rose-700'}`}>
                          {c.calculationType === 'PERCENTAGE_OF_BASIC'
                            ? `${c.amountOrPercent}% of Basic`
                            : c.calculationType === 'PERCENTAGE_OF_GROSS'
                            ? `${c.amountOrPercent}% of Gross`
                            : `₹${c.amountOrPercent}`}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#EFEBE9]">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingStructure(st);
                        setShowStructureModal(true);
                      }}
                      className="p-1.5 text-[#6D4C41] hover:text-[#2D1E18] rounded-lg hover:bg-[#FAF8F5]"
                      title="Edit Template"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteStructure(st.id)}
                      disabled={deletingStructureId === st.id}
                      className="p-1.5 text-rose-600 hover:text-rose-800 rounded-lg hover:bg-rose-50 disabled:opacity-50"
                      title="Delete Template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PAYROLL POLICY SETTINGS */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && (
        <div className="bg-white border border-[#D7CCC8] rounded-2xl p-6 shadow-sm space-y-6 max-w-2xl">
          <div>
            <h3 className="text-base font-bold text-[#2D1E18]">Institute Payroll Policies</h3>
            <p className="text-xs text-[#6D4C41] mt-0.5">
              Configure attendance rules, unpaid leave deductions, and late penalty grace periods.
            </p>
          </div>

          {loadingPolicy ? (
            <div className="py-8 text-center text-xs text-[#6D4C41]">Loading policy rules...</div>
          ) : policy ? (
            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-[#2D1E18] block mb-1">Salary Calculation Basis</label>
                <select
                  value={policy.calculationBasis}
                  onChange={(e) => setPolicy({ ...policy, calculationBasis: e.target.value })}
                  className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs font-semibold text-[#2D1E18]"
                >
                  <option value="CALENDAR_DAYS">Actual Calendar Days (28-31 Days in Month)</option>
                  <option value="FIXED_30_DAYS">Fixed 30-Day Commercial Month</option>
                  <option value="WORKING_DAYS_EXCL_SUNDAYS">Working Days (Excluding Sundays)</option>
                </select>
                <p className="text-[11px] text-[#8D6E63] mt-1">
                  Determines the daily pay rate denominator for prorated earnings and absence deductions.
                </p>
              </div>

              <div className="pt-3 border-t border-[#EFEBE9]">
                <label className="font-bold text-[#2D1E18] block mb-1">Unpaid Leave & Absence Treatment</label>
                <label className="flex items-center gap-2 cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={policy.unpaidLeaveDeduction}
                    onChange={(e) => setPolicy({ ...policy, unpaidLeaveDeduction: e.target.checked })}
                    className="w-4 h-4 rounded text-[#4E342E]"
                  />
                  <span className="font-semibold text-[#2D1E18]">Deduct salary for unapproved absences and unpaid leave</span>
                </label>
              </div>

              <div className="pt-3 border-t border-[#EFEBE9]">
                <label className="font-bold text-[#2D1E18] block mb-1">Half-Day Deduction Factor</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={policy.halfDayDeductionFactor}
                  onChange={(e) => setPolicy({ ...policy, halfDayDeductionFactor: parseFloat(e.target.value) || 0.5 })}
                  className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18]"
                />
                <p className="text-[11px] text-[#8D6E63] mt-1">
                  0.5 means half-day absence deducts 50% of single daily rate.
                </p>
              </div>

              <div className="pt-3 border-t border-[#EFEBE9]">
                <label className="font-bold text-[#2D1E18] block mb-1">Late Arrival Deduction Policy</label>
                <select
                  value={policy.lateDeductionPolicy}
                  onChange={(e) => setPolicy({ ...policy, lateDeductionPolicy: e.target.value })}
                  className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs font-semibold text-[#2D1E18]"
                >
                  <option value="NONE">No penalty (Late marked for records only)</option>
                  <option value="AFTER_GRACE_PERIOD">Penalize after monthly grace occurrences</option>
                  <option value="FLAT_PER_OCCURRENCE">Flat deduction per late arrival</option>
                </select>
              </div>

              {policy.lateDeductionPolicy === 'AFTER_GRACE_PERIOD' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-[#FAF8F5] rounded-xl border border-[#D7CCC8]">
                  <div>
                    <label className="font-bold text-[#2D1E18] block mb-1 text-[11px]">Grace Occurrences</label>
                    <input
                      type="number"
                      value={policy.lateGraceOccurrences}
                      onChange={(e) => setPolicy({ ...policy, lateGraceOccurrences: parseInt(e.target.value, 10) || 0 })}
                      className="w-full bg-white border border-[#D7CCC8] rounded-lg px-2.5 py-1.5 text-xs text-[#2D1E18]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#2D1E18] block mb-1 text-[11px]">Penalty Per Day Beyond Grace (₹)</label>
                    <input
                      type="number"
                      value={policy.lateDeductionAmount}
                      onChange={(e) => setPolicy({ ...policy, lateDeductionAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-[#D7CCC8] rounded-lg px-2.5 py-1.5 text-xs text-[#2D1E18]"
                    />
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-[#EFEBE9]">
                <label className="font-bold text-[#2D1E18] block mb-1">Work From Home (WFH) Treatment</label>
                <select
                  value={policy.wfhSalaryTreatment}
                  onChange={(e) => setPolicy({ ...policy, wfhSalaryTreatment: e.target.value })}
                  className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs font-semibold text-[#2D1E18]"
                >
                  <option value="FULL_PAY">Full Pay (Approved WFH treated identically to On-site)</option>
                  <option value="CONDITIONAL">Conditional (Prorated WFH)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-[#EFEBE9] flex justify-end">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setSavingPolicy(true);
                      const res = await apiFetch('/payroll/policy', {
                        method: 'PUT',
                        body: JSON.stringify(policy),
                      });
                      if (res.success) {
                        setActionSuccess('Payroll policy settings saved successfully.');
                      }
                    } catch (err: any) {
                      alert(err.message || 'Failed to save settings');
                    } finally {
                      setSavingPolicy(false);
                    }
                  }}
                  disabled={savingPolicy}
                  className="px-5 py-2.5 bg-[#4E342E] text-white font-bold rounded-xl text-xs hover:bg-[#3E2723] transition disabled:opacity-50"
                >
                  {savingPolicy ? 'Saving...' : 'Save Policy Settings'}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CALCULATION DETAILS & ATTENDANCE BREAKDOWN */}
      {/* ========================================================================= */}
      {selectedRecordForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFEBE9]">
              <div>
                <h3 className="text-base font-bold text-[#2D1E18]">{selectedRecordForDetails.staffName}</h3>
                <p className="text-xs text-[#6D4C41]">
                  Detailed Compensation & Attendance Breakdown &bull; {getMonthName(selectedMonth)} {selectedYear}
                </p>
              </div>
              <button onClick={() => setSelectedRecordForDetails(null)} className="p-1.5 text-[#8D6E63] hover:text-[#2D1E18]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Attendance metrics */}
              <div className="bg-[#FAF8F5] p-3.5 rounded-xl border border-[#D7CCC8] space-y-2">
                <span className="text-[10px] uppercase font-bold text-[#8D6E63] block">Attendance Audit Data</span>
                <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                  <div className="bg-white p-2 rounded-lg border border-[#EFEBE9]">
                    <span className="text-[#6D4C41] block text-[10px]">Calendar Days</span>
                    <span className="font-bold text-[#2D1E18]">{selectedRecordForDetails.calendarDays}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-[#EFEBE9]">
                    <span className="text-[#6D4C41] block text-[10px]">Worked Days</span>
                    <span className="font-bold text-emerald-800">{selectedRecordForDetails.workedDays}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-[#EFEBE9]">
                    <span className="text-[#6D4C41] block text-[10px]">On-site / WFH</span>
                    <span className="font-bold text-[#2D1E18]">
                      {selectedRecordForDetails.onSiteDays} / {selectedRecordForDetails.wfhDays}
                    </span>
                  </div>
                </div>
              </div>

              {/* Warnings */}
              {Array.isArray(selectedRecordForDetails.warnings) && selectedRecordForDetails.warnings.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-amber-900">
                  <div className="font-bold flex items-center gap-1.5 text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                    <span>Calculation Notices:</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] space-y-0.5">
                    {selectedRecordForDetails.warnings.map((w: string, idx: number) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Financial summary */}
              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-[#EFEBE9]">
                  <span className="text-[#6D4C41]">Base Monthly CTC:</span>
                  <span className="font-mono font-bold text-[#2D1E18]">{formatCurrency(selectedRecordForDetails.baseMonthlyRate)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#EFEBE9]">
                  <span className="text-[#6D4C41]">Calculated Gross Earnings:</span>
                  <span className="font-mono font-bold text-[#2D1E18]">{formatCurrency(selectedRecordForDetails.grossPay)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#EFEBE9]">
                  <span className="text-[#6D4C41]">Total Attendance & Component Deductions:</span>
                  <span className="font-mono font-bold text-rose-700">-{formatCurrency(selectedRecordForDetails.totalDeductions)}</span>
                </div>
                <div className="flex justify-between py-2 border-t-2 border-[#4E342E] items-center">
                  <span className="font-bold text-[#2D1E18]">Final Net Payable:</span>
                  <span className="text-base font-black text-emerald-800">{formatCurrency(selectedRecordForDetails.netPayable)}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedRecordForDetails(null)}
                className="px-4 py-2 border border-[#D7CCC8] rounded-xl text-xs font-semibold text-[#6D4C41] hover:bg-[#FAF8F5]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: RECORD SALARY PAYMENT */}
      {/* ========================================================================= */}
      {selectedRecordForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFEBE9]">
              <div>
                <h3 className="text-sm font-bold text-[#2D1E18]">Record Salary Payment</h3>
                <p className="text-xs text-[#6D4C41]">{selectedRecordForPayment.staffName}</p>
              </div>
              <button onClick={() => setSelectedRecordForPayment(null)} className="p-1.5 text-[#8D6E63] hover:text-[#2D1E18]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#2D1E18] block mb-1">Payment Amount (₹)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max={selectedRecordForPayment.pendingAmount}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    required
                    className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#2D1E18]"
                  />
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(String(selectedRecordForPayment.pendingAmount))}
                    className="absolute right-2 top-2 text-[10px] font-bold text-[#4E342E] hover:underline"
                  >
                    Full Balance
                  </button>
                </div>
                <p className="text-[10px] text-[#8D6E63] mt-1">
                  Remaining payable: {formatCurrency(selectedRecordForPayment.pendingAmount)}
                </p>
              </div>

              <div>
                <label className="font-bold text-[#2D1E18] block mb-1">Disbursement Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18]"
                >
                  <option value="BANK_TRANSFER">Direct Bank Transfer (NEFT/IMPS)</option>
                  <option value="UPI">UPI Transfer</option>
                  <option value="CHEQUE">Bank Cheque</option>
                  <option value="CASH">Cash Payment</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[#2D1E18] block mb-1">UTR / Transaction Reference (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. UTR-202611039842"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18]"
                />
              </div>

              <div>
                <label className="font-bold text-[#2D1E18] block mb-1">Internal Notes</label>
                <input
                  type="text"
                  placeholder="Notes for audit record"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18]"
                />
              </div>

              <div className="pt-3 border-t border-[#EFEBE9] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRecordForPayment(null)}
                  className="px-4 py-2 border border-[#D7CCC8] rounded-xl text-xs font-semibold text-[#6D4C41]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingPayment || !paymentAmount}
                  className="px-4 py-2 bg-emerald-800 text-white rounded-xl text-xs font-bold hover:bg-emerald-900 transition disabled:opacity-50"
                >
                  {recordingPayment ? 'Recording...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: MANUAL ADJUSTMENT */}
      {/* ========================================================================= */}
      {selectedRecordForAdjustment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFEBE9]">
              <div>
                <h3 className="text-sm font-bold text-[#2D1E18]">Add Manual Adjustment</h3>
                <p className="text-xs text-[#6D4C41]">{selectedRecordForAdjustment.staffName}</p>
              </div>
              <button onClick={() => setSelectedRecordForAdjustment(null)} className="p-1.5 text-[#8D6E63] hover:text-[#2D1E18]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddAdjustment} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#2D1E18] block mb-1">Adjustment Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjType('EARNING')}
                    className={`p-2 rounded-xl border text-center font-bold ${
                      adjType === 'EARNING'
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-900'
                        : 'bg-[#FAF8F5] border-[#D7CCC8] text-[#6D4C41]'
                    }`}
                  >
                    + Additional Earning (Bonus)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjType('DEDUCTION')}
                    className={`p-2 rounded-xl border text-center font-bold ${
                      adjType === 'DEDUCTION'
                        ? 'bg-rose-50 border-rose-400 text-rose-900'
                        : 'bg-[#FAF8F5] border-[#D7CCC8] text-[#6D4C41]'
                    }`}
                  >
                    - Deduction (Advance/Fine)
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#2D1E18] block mb-1">Title / Component Name</label>
                <input
                  type="text"
                  placeholder="e.g. Diwal Bonus, Festival Advance Recovery"
                  value={adjTitle}
                  onChange={(e) => setAdjTitle(e.target.value)}
                  required
                  className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18]"
                />
              </div>

              <div>
                <label className="font-bold text-[#2D1E18] block mb-1">Amount (₹)</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={adjAmount}
                  onChange={(e) => setAdjAmount(e.target.value)}
                  required
                  className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#2D1E18]"
                />
              </div>

              <div>
                <label className="font-bold text-[#2D1E18] block mb-1">Reason for Audit Log (Mandatory)</label>
                <textarea
                  placeholder="Explain why this manual modification is being applied..."
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  required
                  rows={2}
                  className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18]"
                />
              </div>

              <div className="pt-3 border-t border-[#EFEBE9] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRecordForAdjustment(null)}
                  className="px-4 py-2 border border-[#D7CCC8] rounded-xl text-xs font-semibold text-[#6D4C41]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAdjustment || !adjAmount || !adjTitle || !adjReason}
                  className="px-4 py-2 bg-[#4E342E] text-white rounded-xl text-xs font-bold hover:bg-[#3E2723] transition disabled:opacity-50"
                >
                  {savingAdjustment ? 'Applying...' : 'Apply Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: STAFF SALARY SETUP */}
      {/* ========================================================================= */}
      {selectedStaffForSalary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFEBE9]">
              <div>
                <h3 className="text-sm font-bold text-[#2D1E18]">Configure Staff CTC & Salary</h3>
                <p className="text-xs text-[#6D4C41]">{selectedStaffForSalary.fullName} &bull; {selectedStaffForSalary.employeeCode}</p>
              </div>
              <button onClick={() => setSelectedStaffForSalary(null)} className="p-1.5 text-[#8D6E63] hover:text-[#2D1E18]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSalary} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#2D1E18] block mb-1">Monthly Base CTC (₹)</label>
                <input
                  type="number"
                  step="100"
                  min="1000"
                  placeholder="e.g. 40000"
                  value={salaryBaseAmount}
                  onChange={(e) => setSalaryBaseAmount(e.target.value)}
                  required
                  className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#2D1E18]"
                />
              </div>

              <div>
                <label className="font-bold text-[#2D1E18] block mb-1">Salary Template / Structure</label>
                <select
                  value={salaryStructureId}
                  onChange={(e) => setSalaryStructureId(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18]"
                >
                  <option value="">Direct Base Salary (No Component Splits)</option>
                  {structures.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.components?.length || 0} components)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-[#2D1E18] block mb-1">Effective Date</label>
                <input
                  type="date"
                  value={salaryEffectiveDate}
                  onChange={(e) => setSalaryEffectiveDate(e.target.value)}
                  required
                  className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18]"
                />
                <p className="text-[10px] text-[#8D6E63] mt-1">Previous active salary will be archived automatically.</p>
              </div>

              <div>
                <label className="font-bold text-[#2D1E18] block mb-1">Notes / Increment Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Annual Appraisal / Promotion"
                  value={salaryNotes}
                  onChange={(e) => setSalaryNotes(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18]"
                />
              </div>

              <div className="pt-3 border-t border-[#EFEBE9] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedStaffForSalary(null)}
                  className="px-4 py-2 border border-[#D7CCC8] rounded-xl text-xs font-semibold text-[#6D4C41]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSalary || !salaryBaseAmount}
                  className="px-4 py-2 bg-[#4E342E] text-white rounded-xl text-xs font-bold hover:bg-[#3E2723] transition disabled:opacity-50"
                >
                  {savingSalary ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: PRINTABLE FORMAL PAYSLIP */}
      {/* ========================================================================= */}
      {selectedPayslipData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:p-0 print:bg-white">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl space-y-6 print:border-none print:shadow-none print:max-h-none print:p-0">
            {/* Modal Controls */}
            <div className="flex items-center justify-between pb-3 border-b border-[#EFEBE9] print:hidden">
              <span className="text-xs font-bold text-[#6D4C41]">Verified Institute Payslip</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#4E342E] text-white rounded-xl text-xs font-semibold hover:bg-[#3E2723] transition"
                >
                  <Printer className="w-3.5 h-3.5" /> Print / Save PDF
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPayslipData(null)}
                  className="p-1.5 text-[#8D6E63] hover:text-[#2D1E18] rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Formal Payslip Template */}
            <div className="space-y-6 font-sans">
              <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-[#4E342E] pb-4 gap-2">
                <div>
                  <h2 className="text-xl font-black text-[#2D1E18]">
                    {selectedPayslipData.snapshotJson?.institute?.name || activeInstitute?.name || 'Tuition Institute'}
                  </h2>
                  <p className="text-xs text-[#6D4C41]">{selectedPayslipData.snapshotJson?.institute?.address || 'Tuition Center'}</p>
                </div>
                <div className="sm:text-right">
                  <span className="text-xs font-mono font-bold text-[#4E342E] block">{selectedPayslipData.payslipNumber}</span>
                  <span className="text-[11px] text-[#6D4C41] block">
                    Period: {getMonthName(selectedPayslipData.month)} {selectedPayslipData.year}
                  </span>
                </div>
              </div>

              {/* Staff Details Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#FAF8F5] p-3.5 rounded-xl border border-[#D7CCC8] text-xs">
                <div>
                  <span className="text-[#8D6E63] text-[10px] uppercase font-bold block">Staff Name</span>
                  <span className="font-bold text-[#2D1E18]">{selectedPayslipData.snapshotJson?.staff?.name}</span>
                </div>
                <div>
                  <span className="text-[#8D6E63] text-[10px] uppercase font-bold block">Employee Code</span>
                  <span className="font-mono font-bold text-[#2D1E18]">{selectedPayslipData.snapshotJson?.staff?.employeeCode || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[#8D6E63] text-[10px] uppercase font-bold block">Designation</span>
                  <span className="font-medium text-[#2D1E18]">{selectedPayslipData.snapshotJson?.staff?.designation || 'Faculty'}</span>
                </div>
                <div>
                  <span className="text-[#8D6E63] text-[10px] uppercase font-bold block">Department</span>
                  <span className="font-medium text-[#2D1E18]">{selectedPayslipData.snapshotJson?.staff?.department || 'General'}</span>
                </div>
              </div>

              {/* Attendance Breakdown */}
              <div className="border border-[#EFEBE9] rounded-xl p-3 bg-white text-xs">
                <span className="text-[10px] uppercase font-bold text-[#8D6E63] block mb-1">Attendance Record</span>
                <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
                  <div className="bg-[#FAF8F5] p-1.5 rounded-lg border border-[#EFEBE9]">
                    <span className="text-[#6D4C41] block text-[10px]">Calendar Days</span>
                    <span className="font-bold text-[#2D1E18]">{selectedPayslipData.snapshotJson?.attendance?.calendarDays || 30}</span>
                  </div>
                  <div className="bg-[#FAF8F5] p-1.5 rounded-lg border border-[#EFEBE9]">
                    <span className="text-[#6D4C41] block text-[10px]">Worked Days</span>
                    <span className="font-bold text-emerald-800">{selectedPayslipData.snapshotJson?.attendance?.workedDays || 0}</span>
                  </div>
                  <div className="bg-[#FAF8F5] p-1.5 rounded-lg border border-[#EFEBE9]">
                    <span className="text-[#6D4C41] block text-[10px]">On-site Days</span>
                    <span className="font-bold text-[#2D1E18]">{selectedPayslipData.snapshotJson?.attendance?.onSiteDays || 0}</span>
                  </div>
                  <div className="bg-[#FAF8F5] p-1.5 rounded-lg border border-[#EFEBE9]">
                    <span className="text-[#6D4C41] block text-[10px]">WFH Days</span>
                    <span className="font-bold text-cyan-800">{selectedPayslipData.snapshotJson?.attendance?.wfhDays || 0}</span>
                  </div>
                </div>
              </div>

              {/* Earnings & Deductions Tables */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Earnings */}
                <div className="border border-[#D7CCC8] rounded-xl overflow-hidden">
                  <div className="bg-[#FAF8F5] px-3 py-2 border-b border-[#D7CCC8] font-bold text-[#4E342E] flex justify-between">
                    <span>Earnings</span>
                    <span>Amount (₹)</span>
                  </div>
                  <div className="divide-y divide-[#EFEBE9]">
                    {(selectedPayslipData.snapshotJson?.financials?.calculationBreakdown?.earnings || []).map((e: any, idx: number) => (
                      <div key={idx} className="px-3 py-1.5 flex justify-between">
                        <span className="text-[#2D1E18]">{e.name}</span>
                        <span className="font-mono font-bold text-[#2D1E18]">{formatCurrency(e.amount)}</span>
                      </div>
                    ))}
                    <div className="px-3 py-2 bg-[#FAF8F5] font-bold text-[#2D1E18] flex justify-between border-t border-[#D7CCC8]">
                      <span>Gross Salary</span>
                      <span>{formatCurrency(selectedPayslipData.snapshotJson?.financials?.grossPay)}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div className="border border-[#D7CCC8] rounded-xl overflow-hidden">
                  <div className="bg-[#FAF8F5] px-3 py-2 border-b border-[#D7CCC8] font-bold text-[#4E342E] flex justify-between">
                    <span>Deductions</span>
                    <span>Amount (₹)</span>
                  </div>
                  <div className="divide-y divide-[#EFEBE9]">
                    {(selectedPayslipData.snapshotJson?.financials?.calculationBreakdown?.deductions || []).length === 0 ? (
                      <div className="px-3 py-3 text-center text-[#8D6E63] italic">Zero Deductions</div>
                    ) : (
                      (selectedPayslipData.snapshotJson?.financials?.calculationBreakdown?.deductions || []).map((d: any, idx: number) => (
                        <div key={idx} className="px-3 py-1.5 flex justify-between">
                          <span className="text-[#2D1E18]">{d.name}</span>
                          <span className="font-mono font-bold text-rose-700">-{formatCurrency(d.amount)}</span>
                        </div>
                      ))
                    )}
                    <div className="px-3 py-2 bg-[#FAF8F5] font-bold text-[#2D1E18] flex justify-between border-t border-[#D7CCC8]">
                      <span>Total Deductions</span>
                      <span className="text-rose-700">-{formatCurrency(selectedPayslipData.snapshotJson?.financials?.totalDeductions)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Pay Banner */}
              <div className="p-4 bg-[#FAF8F5] border-2 border-[#4E342E] rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#6D4C41] block">Net Salary Payable</span>
                  <span className="text-2xl font-black text-emerald-800">
                    {formatCurrency(selectedPayslipData.snapshotJson?.financials?.netPayable)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                    <ShieldCheck className="w-3.5 h-3.5" /> Approved
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-[#D7CCC8] flex justify-between items-center text-[10px] text-[#8D6E63]">
                <div>Verified TuitionOS System Generated Payslip</div>
                <div>Page 1 of 1</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: CREATE / EDIT SALARY STRUCTURE */}
      {/* ========================================================================= */}
      {showStructureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-[#D7CCC8] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-4 bg-[#FAF8F5] border-b border-[#D7CCC8] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#4E342E] text-white flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#2D1E18]">
                    {editingStructure ? 'Edit Salary Structure' : 'Create Salary Structure'}
                  </h3>
                  <p className="text-[11px] text-[#6D4C41]">
                    Configure earnings, allowances, and statutory deductions for this template
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStructureModal(false)}
                className="p-1 rounded-lg text-[#8D6E63] hover:text-[#2D1E18] hover:bg-[#EFEBE9]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveStructure} className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#2D1E18] block mb-1">
                    Structure Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Faculty / Standard Staff"
                    value={structName}
                    onChange={(e) => setStructName(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs font-semibold text-[#2D1E18] focus:outline-none focus:border-[#4E342E]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#2D1E18] block mb-1">Description (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 50% Basic, 40% HRA, 12% PF deduction"
                    value={structDesc}
                    onChange={(e) => setStructDesc(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:border-[#4E342E]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-[#2D1E18] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={structIsDefault}
                    onChange={(e) => setStructIsDefault(e.target.checked)}
                    className="rounded border-[#D7CCC8] text-[#4E342E] focus:ring-[#4E342E]"
                  />
                  <span>Set as default template for new staff</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setStructComponents([
                      { name: 'Basic Pay', type: 'EARNING', calculationType: 'PERCENTAGE_OF_GROSS', amountOrPercent: 50, isTaxable: true, isStatutory: false },
                      { name: 'House Rent Allowance (HRA)', type: 'EARNING', calculationType: 'PERCENTAGE_OF_BASIC', amountOrPercent: 40, isTaxable: true, isStatutory: false },
                      { name: 'Special Allowance', type: 'EARNING', calculationType: 'PERCENTAGE_OF_GROSS', amountOrPercent: 30, isTaxable: true, isStatutory: false },
                      { name: 'Provident Fund (PF)', type: 'DEDUCTION', calculationType: 'PERCENTAGE_OF_BASIC', amountOrPercent: 12, isTaxable: false, isStatutory: true },
                    ]);
                  }}
                  className="text-[11px] text-[#6D4C41] hover:text-[#4E342E] font-semibold underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  Load Standard 50-40-12 Template
                </button>
              </div>

              {/* Components List */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#2D1E18] uppercase tracking-wider">
                    Salary Components ({structComponents.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setStructComponents([
                        ...structComponents,
                        {
                          name: '',
                          type: 'EARNING',
                          calculationType: 'PERCENTAGE_OF_GROSS',
                          amountOrPercent: 10,
                          isTaxable: true,
                          isStatutory: false,
                        },
                      ]);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#4E342E] hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Component
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {structComponents.map((comp, idx) => (
                    <div key={idx} className="p-3 bg-[#FAF8F5] border border-[#EFEBE9] rounded-xl flex items-center gap-2">
                      <div className="flex-1">
                        <input
                          type="text"
                          required
                          placeholder="Component Name (e.g. Basic Pay, HRA)"
                          value={comp.name}
                          onChange={(e) => {
                            const updated = [...structComponents];
                            updated[idx].name = e.target.value;
                            setStructComponents(updated);
                          }}
                          className="w-full bg-white border border-[#D7CCC8] rounded-lg px-2.5 py-1.5 text-xs text-[#2D1E18]"
                        />
                      </div>

                      <div className="w-28">
                        <select
                          value={comp.type}
                          onChange={(e) => {
                            const updated = [...structComponents];
                            updated[idx].type = e.target.value as any;
                            setStructComponents(updated);
                          }}
                          className="w-full bg-white border border-[#D7CCC8] rounded-lg px-2 py-1.5 text-xs font-semibold text-[#2D1E18]"
                        >
                          <option value="EARNING">Earning (+)</option>
                          <option value="DEDUCTION">Deduction (-)</option>
                        </select>
                      </div>

                      <div className="w-36">
                        <select
                          value={comp.calculationType}
                          onChange={(e) => {
                            const updated = [...structComponents];
                            updated[idx].calculationType = e.target.value as any;
                            setStructComponents(updated);
                          }}
                          className="w-full bg-white border border-[#D7CCC8] rounded-lg px-2 py-1.5 text-xs text-[#2D1E18]"
                        >
                          <option value="PERCENTAGE_OF_GROSS">% of Gross</option>
                          <option value="PERCENTAGE_OF_BASIC">% of Basic</option>
                          <option value="FLAT">Flat Amount (₹)</option>
                        </select>
                      </div>

                      <div className="w-20">
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={comp.amountOrPercent}
                          onChange={(e) => {
                            const updated = [...structComponents];
                            updated[idx].amountOrPercent = parseFloat(e.target.value) || 0;
                            setStructComponents(updated);
                          }}
                          className="w-full bg-white border border-[#D7CCC8] rounded-lg px-2 py-1.5 text-xs text-center font-mono font-bold text-[#2D1E18]"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setStructComponents(structComponents.filter((_, i) => i !== idx));
                        }}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                        title="Remove Component"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-3 border-t border-[#D7CCC8] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowStructureModal(false)}
                  className="px-4 py-2 border border-[#D7CCC8] text-[#6D4C41] rounded-xl text-xs font-bold hover:bg-[#FAF8F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingStructure}
                  className="px-5 py-2 bg-[#4E342E] text-white rounded-xl text-xs font-bold hover:bg-[#3E2723] transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingStructure ? 'Saving...' : editingStructure ? 'Update Structure' : 'Create Structure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

