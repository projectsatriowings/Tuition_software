import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/useAuth';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Printer,
  RotateCcw,
  Receipt,
  Users,
  Layers,
  ArrowRight,
  ShieldCheck,
  FileText,
  Calendar,
  X,
  RefreshCw,
  Building2,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  BookOpen,
  GraduationCap,
  Check,
  Info,
} from 'lucide-react';

export const FeesManagement: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ACADEMIC_ADMIN' || user?.role === 'SUPER_ADMIN';

  const [activeTab, setActiveTab] = useState<'dashboard' | 'assignments' | 'structures' | 'payments' | 'adjustments'>('dashboard');

  // Dashboard state
  const [summary, setSummary] = useState<any>(null);
  const [collectionsReport, setCollectionsReport] = useState<any>(null);
  const [outstandingReport, setOutstandingReport] = useState<any>(null);
  const [loadingDashboard, setLoadingDashboard] = useState<boolean>(true);

  // Fee Structures state
  interface FeeComponentItem {
    name: string;
    amount: number;
    category?: string;
  }

  interface InstallmentItem {
    installmentNo: number;
    label: string;
    percentage?: number;
    amount: number;
    dueOffsetDays?: number;
  }

  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [loadingStructures, setLoadingStructures] = useState<boolean>(false);
  const [showCreateStructureModal, setShowCreateStructureModal] = useState<boolean>(false);
  const [editingStructure, setEditingStructure] = useState<any | null>(null);
  const [structureSearch, setStructureSearch] = useState<string>('');
  const [structureFreqFilter, setStructureFreqFilter] = useState<string>('ALL');

  const [structureForm, setStructureForm] = useState({
    batchId: '',
    classGrade: '',
    courseName: '',
    name: '',
    description: '',
    academicYear: '2026-2027',
    frequency: 'MONTHLY',
    amount: 4500,
    dueDay: 10,
    isActive: true,
    components: [
      { name: 'Tuition & Live Classes', amount: 3500, category: 'TUITION' },
      { name: 'Study Material & Notes', amount: 500, category: 'MATERIALS' },
      { name: 'Mock Test Series', amount: 500, category: 'EXAMINATION' },
    ] as FeeComponentItem[],
    installments: [] as InstallmentItem[],
  });

  const [selectedStructureForAssign, setSelectedStructureForAssign] = useState<any | null>(null);

  // Assignments state
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState<boolean>(false);
  const [assignmentSearch, setAssignmentSearch] = useState<string>('');
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState<string>('');
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);
  const [showBatchAssignModal, setShowBatchAssignModal] = useState<boolean>(false);

  // Payments & Receipts state
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState<boolean>(false);
  const [activeReceipt, setActiveReceipt] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState<boolean>(false);
  const [selectedAssignmentForPayment, setSelectedAssignmentForPayment] = useState<any>(null);

  // Refunds state
  const [showRefundModal, setShowRefundModal] = useState<boolean>(false);
  const [selectedPaymentForRefund, setSelectedPaymentForRefund] = useState<any>(null);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundReason, setRefundReason] = useState<string>('');
  const [processingRefund, setProcessingRefund] = useState<boolean>(false);

  // Adjustments state
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [loadingAdjustments, setLoadingAdjustments] = useState<boolean>(false);

  // Common metadata
  const [batches, setBatches] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  // Form states
  const [newAssignment, setNewAssignment] = useState({
    studentId: '',
    feeStructureId: '',
    termLabel: '',
    academicYear: '2026-2027',
    baseAmount: 0,
    discountAmount: 0,
    discountReason: '',
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    installmentNo: null as number | null,
    components: [] as FeeComponentItem[],
  });

  const [newBatchAssignment, setNewBatchAssignment] = useState({
    batchId: '',
    feeStructureId: '',
    termLabel: '',
    academicYear: '2026-2027',
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    defaultDiscount: 0,
  });

  const [newPayment, setNewPayment] = useState({
    amountPaid: 0,
    method: 'CASH',
    transactionReference: '',
    remarks: '',
  });

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    if (!isAdmin) return;
    loadDashboardData();
    loadBatches();
    loadStudents();
    loadFeeStructures();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    if (activeTab === 'structures') loadFeeStructures();
    if (activeTab === 'assignments') loadAssignments();
    if (activeTab === 'payments') loadPayments();
    if (activeTab === 'adjustments') loadAdjustments();
  }, [activeTab, isAdmin]);

  const loadDashboardData = async () => {
    try {
      setLoadingDashboard(true);
      const [sumRes, colRes, outRes] = await Promise.all([
        apiFetch('/fees/reports/summary'),
        apiFetch('/fees/reports/collections'),
        apiFetch('/fees/reports/outstanding'),
      ]);
      if (sumRes.success) setSummary(sumRes.data);
      if (colRes.success) setCollectionsReport(colRes.data);
      if (outRes.success) setOutstandingReport(outRes.data);
    } catch (err: any) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoadingDashboard(false);
    }
  };

  const loadBatches = async () => {
    try {
      const res = await apiFetch('/academics/batches');
      if (res.success && res.data?.batches) setBatches(res.data.batches);
    } catch (e) {
      console.error(e);
    }
  };

  const loadStudents = async () => {
    try {
      const res = await apiFetch('/students');
      if (res.success && res.data?.students) setStudents(res.data.students);
    } catch (e) {
      console.error(e);
    }
  };

  const loadFeeStructures = async () => {
    try {
      setLoadingStructures(true);
      const res = await apiFetch('/fees/structures');
      if (res.success && res.data?.feeStructures) setFeeStructures(res.data.feeStructures);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStructures(false);
    }
  };

  const loadAssignments = async () => {
    try {
      setLoadingAssignments(true);
      let query = '/fees/assignments?limit=100';
      if (assignmentStatusFilter) query += `&status=${assignmentStatusFilter}`;
      const res = await apiFetch(query);
      if (res.success && res.data?.assignments) setAssignments(res.data.assignments);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAssignments(false);
    }
  };

  const loadPayments = async () => {
    try {
      setLoadingPayments(true);
      const res = await apiFetch('/fees/payments?limit=100');
      if (res.success && res.data?.payments) setPayments(res.data.payments);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPayments(false);
    }
  };

  const loadAdjustments = async () => {
    try {
      setLoadingAdjustments(true);
      const res = await apiFetch('/fees/adjustments?limit=100');
      if (res.success && res.data?.adjustments) setAdjustments(res.data.adjustments);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAdjustments(false);
    }
  };

  const openReceipt = async (paymentIdOrReceipt: string) => {
    try {
      const res = await apiFetch(`/fees/payments/${paymentIdOrReceipt}/receipt`);
      if (res.success && res.data?.receipt) {
        setActiveReceipt(res.data.receipt);
        setShowReceiptModal(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openCreateStructureModal = (initialBatchId?: string) => {
    setEditingStructure(null);
    setStructureForm({
      batchId: initialBatchId || '',
      classGrade: '',
      courseName: '',
      name: '',
      description: '',
      academicYear: '2026-2027',
      frequency: 'MONTHLY',
      amount: 4500,
      dueDay: 10,
      isActive: true,
      components: [
        { name: 'Tuition & Live Classes', amount: 3500, category: 'TUITION' },
        { name: 'Study Material & Worksheets', amount: 500, category: 'MATERIALS' },
        { name: 'Monthly Mock Test Series', amount: 500, category: 'EXAMINATION' },
      ],
      installments: [],
    });
    setShowCreateStructureModal(true);
  };

  const openEditStructureModal = (fs: any) => {
    setEditingStructure(fs);
    setStructureForm({
      batchId: fs.batchId || '',
      classGrade: fs.classGrade || '',
      courseName: fs.courseName || '',
      name: fs.name || '',
      description: fs.description || '',
      academicYear: fs.academicYear || '2026-2027',
      frequency: fs.frequency || 'MONTHLY',
      amount: Number(fs.amount) || 0,
      dueDay: fs.dueDay || 10,
      isActive: fs.isActive !== false,
      components: Array.isArray(fs.componentsJson) && fs.componentsJson.length > 0
        ? fs.componentsJson
        : [{ name: 'Tuition Fee', amount: Number(fs.amount) || 0, category: 'TUITION' }],
      installments: Array.isArray(fs.installmentsJson) ? fs.installmentsJson : [],
    });
    setShowCreateStructureModal(true);
  };

  const handleToggleStructureActive = async (fs: any) => {
    try {
      setActionError(null);
      const res = await apiFetch(`/fees/structures/${fs.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !fs.isActive }),
      });
      if (res.success) {
        setActionSuccess(`Fee structure "${fs.name}" ${!fs.isActive ? 'activated' : 'deactivated'} successfully.`);
        loadFeeStructures();
      } else {
        setActionError(res.error || 'Failed to update fee structure status');
      }
    } catch (err: any) {
      setActionError(err.message || 'Error updating status');
    }
  };

  const handleSaveStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    // Calculate total from components if components exist
    let totalAmount = structureForm.amount;
    if (structureForm.components && structureForm.components.length > 0) {
      const componentSum = structureForm.components.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
      if (componentSum > 0) {
        totalAmount = componentSum;
      }
    }

    const payload: any = {
      ...structureForm,
      amount: totalAmount,
      batchId: structureForm.batchId ? structureForm.batchId : null,
      classGrade: structureForm.classGrade.trim() || null,
      courseName: structureForm.courseName.trim() || null,
      components: structureForm.components.filter(c => c.name.trim() && Number(c.amount) > 0),
      installments: structureForm.installments.filter(i => i.label.trim() && Number(i.amount) > 0),
    };

    try {
      const url = editingStructure ? `/fees/structures/${editingStructure.id}` : '/fees/structures';
      const method = editingStructure ? 'PATCH' : 'POST';

      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (res.success) {
        setActionSuccess(editingStructure ? 'Fee structure updated successfully.' : 'Fee structure created successfully.');
        setShowCreateStructureModal(false);
        setEditingStructure(null);
        loadFeeStructures();
        loadDashboardData();
      } else {
        setActionError(res.error || 'Failed to save fee structure');
      }
    } catch (err: any) {
      setActionError(err.message || 'Error saving fee structure');
    }
  };

  const onSelectStructureForAssign = (fsId: string) => {
    const fs = feeStructures.find(f => f.id === fsId);
    setSelectedStructureForAssign(fs || null);

    if (fs) {
      const baseAmt = Number(fs.amount) || 0;
      let defaultTerm = 'Term 1';
      const now = new Date();
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const curMonth = monthNames[now.getMonth()];
      const curYear = now.getFullYear();

      if (fs.frequency === 'MONTHLY') {
        defaultTerm = `${curMonth} ${curYear}`;
      } else if (fs.frequency === 'QUARTERLY') {
        const q = Math.floor(now.getMonth() / 3) + 1;
        defaultTerm = `Q${q} (${curYear})`;
      } else if (fs.frequency === 'TERM_WISE') {
        defaultTerm = 'Term 1';
      } else if (fs.frequency === 'ANNUAL') {
        defaultTerm = `Annual Fee ${fs.academicYear || curYear}`;
      } else if (fs.frequency === 'INSTALLMENT_BASED') {
        defaultTerm = 'Installment 1';
      } else if (fs.frequency === 'ONE_TIME') {
        defaultTerm = 'Admission & Registration Fee';
      }

      // Calculate reasonable due date
      const dueDay = fs.dueDay || 10;
      const targetDate = new Date();
      if (targetDate.getDate() > dueDay) {
        targetDate.setMonth(targetDate.getMonth() + 1);
      }
      targetDate.setDate(dueDay);
      const dueDateStr = targetDate.toISOString().split('T')[0];

      setNewAssignment(prev => ({
        ...prev,
        feeStructureId: fsId,
        termLabel: defaultTerm,
        academicYear: fs.academicYear || '2026-2027',
        baseAmount: baseAmt,
        dueDate: dueDateStr,
        components: Array.isArray(fs.componentsJson) ? fs.componentsJson : [{ name: 'Tuition Fee', amount: baseAmt }],
      }));
    } else {
      setNewAssignment(prev => ({
        ...prev,
        feeStructureId: '',
        baseAmount: 0,
        components: [],
      }));
    }
  };

  const handleAssignIndividual = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    if (newAssignment.discountAmount > 0 && !newAssignment.discountReason.trim()) {
      setActionError('A clear justification / reason is mandatory when granting a concession or discount.');
      return;
    }

    try {
      const res = await apiFetch('/fees/assignments', {
        method: 'POST',
        body: JSON.stringify(newAssignment),
      });
      if (res.success) {
        setActionSuccess('Fee assigned successfully to student.');
        setShowAssignModal(false);
        setSelectedStructureForAssign(null);
        setNewAssignment({
          studentId: '',
          feeStructureId: '',
          termLabel: '',
          academicYear: '2026-2027',
          baseAmount: 0,
          discountAmount: 0,
          discountReason: '',
          dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
          installmentNo: null,
          components: [],
        });
        loadAssignments();
        loadDashboardData();
      } else {
        setActionError(res.error || 'Failed to assign fee');
      }
    } catch (err: any) {
      setActionError(err.message || 'Error assigning fee');
    }
  };

  const handleAssignBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      const res = await apiFetch('/fees/assignments/batch', {
        method: 'POST',
        body: JSON.stringify(newBatchAssignment),
      });
      if (res.success) {
        const { assignedCount, skippedCount } = res.data || {};
        setActionSuccess(`Batch fee assignment complete: ${assignedCount} assigned, ${skippedCount} skipped.`);
        setShowBatchAssignModal(false);
        setNewBatchAssignment({
          batchId: '',
          feeStructureId: '',
          termLabel: '',
          academicYear: '2026-2027',
          dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
          defaultDiscount: 0,
        });
        loadAssignments();
        loadDashboardData();
      } else {
        setActionError(res.error || 'Failed to assign batch fee');
      }
    } catch (err: any) {
      setActionError(err.message || 'Error running batch assignment');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignmentForPayment) return;
    setActionError(null);

    try {
      const res = await apiFetch(`/fees/assignments/${selectedAssignmentForPayment.id}/payments`, {
        method: 'POST',
        body: JSON.stringify(newPayment),
      });

      if (res.success) {
        setActionSuccess('Payment recorded and receipt generated.');
        setShowRecordPaymentModal(false);
        setSelectedAssignmentForPayment(null);
        loadAssignments();
        loadPayments();
        loadDashboardData();

        if (res.data?.payment?.id) {
          openReceipt(res.data.payment.id);
        }
      } else {
        setActionError(res.error || 'Failed to record payment');
      }
    } catch (err: any) {
      setActionError(err.message || 'Error recording payment');
    }
  };

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaymentForRefund) return;
    setProcessingRefund(true);
    setActionError(null);

    try {
      const res = await apiFetch(`/fees/payments/${selectedPaymentForRefund.id}/refunds`, {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(refundAmount),
          reason: refundReason,
        }),
      });

      if (res.success) {
        setActionSuccess(`Refund of ₹${refundAmount} recorded successfully.`);
        setShowRefundModal(false);
        setSelectedPaymentForRefund(null);
        setRefundAmount(0);
        setRefundReason('');
        loadPayments();
        loadAdjustments();
        loadDashboardData();
      } else {
        setActionError(res.error || 'Failed to process refund');
      }
    } catch (err: any) {
      setActionError(err.message || 'Error processing refund');
    } finally {
      setProcessingRefund(false);
    }
  };

  const formatCurrency = (val: number | string | undefined) => {
    const num = Number(val || 0);
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1 w-fit">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Fully Paid
          </span>
        );
      case 'PARTIALLY_PAID':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1 w-fit">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Partially Paid
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-300 flex items-center gap-1 w-fit">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Overdue
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F7F2EF] text-[#6D4C41] border border-[#D7CCC8] flex items-center gap-1 w-fit">
            <Clock className="w-3.5 h-3.5 text-[#8D6E63]" /> Pending
          </span>
        );
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#2D1E18] tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-[#6D4C41]" /> Fees, Payments & Financial Operations
          </h1>
          <p className="text-sm text-[#6D4C41] mt-1">
            Exact-decimal financial tracking, safe receipt generation, refunds, and collections
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setActionError(null);
                openCreateStructureModal();
              }}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-[#4E342E]/10 hover:bg-[#4E342E] text-[#4E342E] hover:text-white border border-[#D7CCC8] flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" /> New Fee Structure
            </button>
            <button
              onClick={() => {
                setActionError(null);
                loadFeeStructures();
                setShowAssignModal(true);
              }}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-[#4E342E] hover:bg-[#3E2723] text-white shadow-sm flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" /> Assign Fee to Student
            </button>
            <button
              onClick={() => {
                setActionError(null);
                loadFeeStructures();
                setShowBatchAssignModal(true);
              }}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-[#6D4C41] hover:bg-[#4E342E] text-white shadow-sm flex items-center gap-1.5 transition-all"
            >
              <Layers className="w-4 h-4" /> Assign to Batch
            </button>
          </div>
        )}
      </div>

      {/* Global Alerts */}
      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-700 hover:text-rose-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-[#D7CCC8] pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'dashboard'
              ? 'bg-[#4E342E] text-white shadow-sm'
              : 'text-[#6D4C41] hover:text-[#2D1E18] hover:bg-[#D7CCC8]/30'
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Financial Dashboard
        </button>
        <button
          onClick={() => setActiveTab('assignments')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'assignments'
              ? 'bg-[#4E342E] text-white shadow-sm'
              : 'text-[#6D4C41] hover:text-[#2D1E18] hover:bg-[#D7CCC8]/30'
          }`}
        >
          <FileText className="w-4 h-4" /> Student Fee Assignments
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'payments'
              ? 'bg-[#4E342E] text-white shadow-sm'
              : 'text-[#6D4C41] hover:text-[#2D1E18] hover:bg-[#D7CCC8]/30'
          }`}
        >
          <Receipt className="w-4 h-4" /> Payments & Receipts
        </button>
        <button
          onClick={() => setActiveTab('structures')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'structures'
              ? 'bg-[#4E342E] text-white shadow-sm'
              : 'text-[#6D4C41] hover:text-[#2D1E18] hover:bg-[#D7CCC8]/30'
          }`}
        >
          <Layers className="w-4 h-4" /> Fee Structures
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('adjustments')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'adjustments'
                ? 'bg-[#4E342E] text-white shadow-sm'
                : 'text-[#6D4C41] hover:text-[#2D1E18] hover:bg-[#D7CCC8]/30'
            }`}
          >
            <RotateCcw className="w-4 h-4" /> Refunds & Adjustments
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SUB-VIEW 1: FINANCIAL DASHBOARD */}
      {/* ========================================================================= */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {loadingDashboard ? (
            <div className="p-12 text-center text-[#8D6E63] text-sm flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[#6D4C41]" /> Loading financial reports...
            </div>
          ) : (
            <>
              {/* Primary KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-3xl bg-white border border-[#D7CCC8] shadow-sm space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#8D6E63]">Total Fees Assigned</div>
                  <div className="text-2xl font-black text-[#2D1E18]">{formatCurrency(summary?.totalAssigned)}</div>
                  <div className="text-[11px] text-[#6D4C41]">All student terms in current scope</div>
                </div>

                <div className="p-5 rounded-3xl bg-white border border-emerald-300 shadow-sm space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">Net Fees Collected</div>
                  <div className="text-2xl font-black text-emerald-800">{formatCurrency(summary?.totalCollected)}</div>
                  <div className="text-[11px] text-emerald-700">Realized collections (minus refunds)</div>
                </div>

                <div className="p-5 rounded-3xl bg-white border border-amber-300 shadow-sm space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-800">Total Outstanding</div>
                  <div className="text-2xl font-black text-amber-800">{formatCurrency(summary?.totalOutstanding)}</div>
                  <div className="text-[11px] text-amber-700">Pending & partial student dues</div>
                </div>

                <div className="p-5 rounded-3xl bg-white border border-rose-300 shadow-sm space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-rose-800">Overdue Dues</div>
                  <div className="text-2xl font-black text-rose-800">{formatCurrency(summary?.totalOverdue)}</div>
                  <div className="text-[11px] text-rose-700">{summary?.counts?.overdue || 0} overdue student accounts</div>
                </div>
              </div>

              {/* Status Breakdown & Payment Methods */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Account Status Counts */}
                <div className="p-6 rounded-3xl bg-white border border-[#D7CCC8] shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-[#2D1E18] uppercase tracking-wider">Fee Account Status Breakdown</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                      <span className="text-xs text-emerald-800 font-semibold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Fully Paid Accounts
                      </span>
                      <span className="text-sm font-black text-emerald-900">{summary?.counts?.fullyPaid || 0}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50 border border-amber-200">
                      <span className="text-xs text-amber-800 font-semibold flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-600" /> Partially Paid Accounts
                      </span>
                      <span className="text-sm font-black text-amber-900">{summary?.counts?.partiallyPaid || 0}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-2xl bg-[#F7F2EF] border border-[#D7CCC8]">
                      <span className="text-xs text-[#6D4C41] font-semibold flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#8D6E63]" /> Pending Accounts
                      </span>
                      <span className="text-sm font-black text-[#2D1E18]">{summary?.counts?.pending || 0}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-2xl bg-rose-50 border border-rose-200">
                      <span className="text-xs text-rose-800 font-semibold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600" /> Overdue Accounts
                      </span>
                      <span className="text-sm font-black text-rose-900">{summary?.counts?.overdue || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Collections by Payment Method */}
                <div className="p-6 rounded-3xl bg-white border border-[#D7CCC8] shadow-sm space-y-4 lg:col-span-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#2D1E18] uppercase tracking-wider">Payment Method Distribution</h3>
                    <span className="text-xs text-[#6D4C41]">Total Transactions: {collectionsReport?.transactionCount || 0}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'ONLINE'].map((method) => {
                      const data = collectionsReport?.methodBreakdown?.[method] || { count: 0, total: 0 };
                      return (
                        <div key={method} className="p-4 rounded-2xl bg-[#F7F2EF] border border-[#D7CCC8] space-y-1">
                          <span className="text-[10px] uppercase font-bold text-[#8D6E63] block tracking-wider">{method.replace('_', ' ')}</span>
                          <span className="text-base font-black text-[#2D1E18] block">{formatCurrency(data.total)}</span>
                          <span className="text-[10px] text-[#6D4C41] block">{data.count} receipts</span>
                        </div>
                      );
                    })}
                  </div>

                  {summary?.totalRefunds > 0 && (
                    <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between">
                      <span>Total Authorized Refunds Processed</span>
                      <span className="font-bold">{formatCurrency(summary.totalRefunds)}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 2: STUDENT FEE ASSIGNMENTS */}
      {/* ========================================================================= */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#8D6E63] absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search by student name or admission no..."
                value={assignmentSearch}
                onChange={(e) => setAssignmentSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-[#D7CCC8] rounded-xl text-xs text-[#2D1E18] placeholder-[#8D6E63] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={assignmentStatusFilter}
                onChange={(e) => setAssignmentStatusFilter(e.target.value)}
                className="bg-white border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
              >
                <option value="">All Statuses</option>
                <option value="PAID">Fully Paid</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="PENDING">Pending</option>
                <option value="OVERDUE">Overdue</option>
              </select>

              <button
                onClick={loadAssignments}
                className="p-2 rounded-xl bg-white border border-[#D7CCC8] text-[#6D4C41] hover:text-[#2D1E18]"
                title="Refresh assignments"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {loadingAssignments ? (
            <div className="p-12 text-center text-[#8D6E63] text-sm">Loading fee assignments...</div>
          ) : assignments.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white border border-[#D7CCC8] text-[#8D6E63] text-sm shadow-sm">
              No student fee assignments found. Create a fee structure and assign to students.
            </div>
          ) : (
            <div className="rounded-3xl bg-white border border-[#D7CCC8] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F2EF] border-b border-[#D7CCC8] text-[#6D4C41] uppercase text-[10px] tracking-wider font-bold">
                    <tr>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Fee Structure & Term</th>
                      <th className="py-3 px-4">Base Fee</th>
                      <th className="py-3 px-4">Discount</th>
                      <th className="py-3 px-4">Payable</th>
                      <th className="py-3 px-4">Paid</th>
                      <th className="py-3 px-4">Balance</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFEBE9]">
                    {assignments
                      .filter((a) => {
                        if (!assignmentSearch) return true;
                        const s = a.student;
                        const fullName = `${s?.firstName} ${s?.lastName}`.toLowerCase();
                        const adm = (s?.admissionNumber || '').toLowerCase();
                        return fullName.includes(assignmentSearch.toLowerCase()) || adm.includes(assignmentSearch.toLowerCase());
                      })
                      .map((a) => {
                        return (
                          <tr key={a.id} className="hover:bg-[#F7F2EF]/50 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-bold text-[#2D1E18]">
                                {a.student?.firstName} {a.student?.lastName}
                              </div>
                              <div className="text-[11px] text-[#6D4C41] font-mono">
                                Adm: {a.student?.admissionNumber}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-[#2D1E18]">{a.feeStructure?.name}</div>
                              <div className="text-[11px] text-[#6D4C41] font-medium">{a.termLabel} ({a.academicYear})</div>
                            </td>
                            <td className="py-3 px-4 text-[#6D4C41]">{formatCurrency(a.baseAmount)}</td>
                            <td className="py-3 px-4 text-emerald-800 font-medium">{formatCurrency(a.discountAmount)}</td>
                            <td className="py-3 px-4 font-bold text-[#2D1E18]">{formatCurrency(a.finalAmount)}</td>
                            <td className="py-3 px-4 text-emerald-800 font-semibold">{formatCurrency(a.netPaid)}</td>
                            <td className="py-3 px-4 font-black text-amber-800">{formatCurrency(a.remainingBalance)}</td>
                            <td className="py-3 px-4 text-[#6D4C41]">
                              {new Date(a.dueDate).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </td>
                            <td className="py-3 px-4">{getStatusBadge(a.calculatedStatus || a.status)}</td>
                            <td className="py-3 px-4 text-right">
                              {a.remainingBalance > 0 ? (
                                <button
                                  onClick={() => {
                                    setSelectedAssignmentForPayment(a);
                                    setNewPayment({
                                      amountPaid: a.remainingBalance,
                                      method: 'CASH',
                                      transactionReference: '',
                                      remarks: `Payment for ${a.termLabel}`,
                                    });
                                    setActionError(null);
                                    setShowRecordPaymentModal(true);
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#4E342E] hover:bg-[#3E2723] text-white shadow-sm transition-all"
                                >
                                  Collect
                                </button>
                              ) : (
                                <span className="text-[11px] font-semibold text-[#8D6E63]">Settled</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 3: PAYMENTS & RECEIPTS */}
      {/* ========================================================================= */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#2D1E18] uppercase tracking-wider">Authoritative Payment History</h3>
            <button
              onClick={loadPayments}
              className="px-3 py-1.5 rounded-xl bg-white border border-[#D7CCC8] text-[#4E342E] hover:bg-[#F7F2EF] text-xs flex items-center gap-1.5 shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          {loadingPayments ? (
            <div className="p-12 text-center text-[#8D6E63] text-sm">Loading payments...</div>
          ) : payments.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white border border-[#D7CCC8] text-[#8D6E63] text-sm shadow-sm">
              No payments recorded yet.
            </div>
          ) : (
            <div className="rounded-3xl bg-white border border-[#D7CCC8] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F2EF] border-b border-[#D7CCC8] text-[#6D4C41] uppercase text-[10px] tracking-wider font-bold">
                    <tr>
                      <th className="py-3 px-4">Receipt No</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Fee Period</th>
                      <th className="py-3 px-4">Amount Paid</th>
                      <th className="py-3 px-4">Method</th>
                      <th className="py-3 px-4">Reference</th>
                      <th className="py-3 px-4">Recorded Date</th>
                      <th className="py-3 px-4">Recorded By</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFEBE9]">
                    {payments.map((p) => {
                      const refundedTotal = (p.adjustments || [])
                        .filter((adj: any) => adj.adjustmentType === 'REFUND')
                        .reduce((acc: number, cur: any) => acc + Number(cur.amount), 0);
                      const netRetained = Number(p.amountPaid) - refundedTotal;

                      return (
                        <tr key={p.id} className="hover:bg-[#F7F2EF]/50 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-[#4E342E]">{p.receiptNumber}</td>
                          <td className="py-3 px-4 font-semibold text-[#2D1E18]">
                            {p.student?.firstName} {p.student?.lastName}
                          </td>
                          <td className="py-3 px-4 text-[#6D4C41]">
                            {p.feeAssignment?.feeStructure?.name} ({p.feeAssignment?.termLabel})
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-emerald-800">{formatCurrency(p.amountPaid)}</span>
                            {refundedTotal > 0 && (
                              <span className="block text-[10px] text-rose-800">
                                Refunded: {formatCurrency(refundedTotal)}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#F7F2EF] text-[#4E342E] border border-[#D7CCC8]">
                              {p.method}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[#6D4C41] text-[11px]">
                            {p.transactionReference || 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-[#6D4C41]">
                            {new Date(p.paidAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-3 px-4 text-[#2D1E18]">{p.recordedBy?.fullName}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openReceipt(p.id)}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#4E342E]/10 hover:bg-[#4E342E] text-[#4E342E] hover:text-white border border-[#D7CCC8] transition-all flex items-center gap-1 shadow-sm"
                              >
                                <Printer className="w-3 h-3" /> Receipt
                              </button>

                              {isAdmin && netRetained > 0 && (
                                <button
                                  onClick={() => {
                                    setSelectedPaymentForRefund(p);
                                    setRefundAmount(netRetained);
                                    setRefundReason('');
                                    setShowRefundModal(true);
                                  }}
                                  className="px-2 py-1 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-600 text-rose-800 hover:text-white border border-rose-200 transition-all shadow-sm"
                                  title="Authorized Refund"
                                >
                                  Refund
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 4: FEE STRUCTURES */}
      {/* ========================================================================= */}
      {activeTab === 'structures' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#2D1E18] uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#6D4C41]" /> Institute Fee Configurations & Templates
              </h3>
              <p className="text-xs text-[#8D6E63] mt-0.5">
                Standard reusable fee plans, itemized breakdowns, installment schedules, and billing cycles.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => openCreateStructureModal()}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-[#4E342E] hover:bg-[#3E2723] text-white shadow-sm flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" /> Add Fee Structure
              </button>
            </div>
          </div>

          {/* Search & Frequency Filter Bar */}
          <div className="p-3 rounded-2xl bg-white border border-[#D7CCC8] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#8D6E63] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search structures by name, class, or course..."
                value={structureSearch}
                onChange={(e) => setStructureSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl text-[#2D1E18] focus:ring-2 focus:ring-[#8D6E63]"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[#6D4C41] font-semibold text-[11px]">Frequency:</span>
              <select
                value={structureFreqFilter}
                onChange={(e) => setStructureFreqFilter(e.target.value)}
                className="bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-2.5 py-1.5 text-[#2D1E18] text-xs focus:ring-2 focus:ring-[#8D6E63]"
              >
                <option value="ALL">All Frequencies</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="TERM_WISE">Term-wise</option>
                <option value="ANNUAL">Annual</option>
                <option value="COURSE_BASED">Course-based</option>
                <option value="INSTALLMENT_BASED">Installment-based</option>
                <option value="ONE_TIME">One-time</option>
              </select>
            </div>
          </div>

          {loadingStructures ? (
            <div className="p-12 text-center text-[#8D6E63] text-sm animate-pulse">Loading fee structures...</div>
          ) : feeStructures.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white border border-[#D7CCC8] text-[#8D6E63] text-sm shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#F7F2EF] mx-auto flex items-center justify-center text-[#6D4C41]">
                <Layers className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-[#2D1E18]">No Fee Structures Configured Yet</h4>
              <p className="text-xs max-w-md mx-auto text-[#6D4C41]">
                Define reusable fee templates with itemized components (tuition, materials, exams) for monthly, term, or installment billing.
              </p>
              <button
                onClick={() => openCreateStructureModal()}
                className="mt-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#4E342E] hover:bg-[#3E2723] text-white shadow-sm inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Create First Fee Structure
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {feeStructures
                .filter((fs) => {
                  if (structureFreqFilter !== 'ALL' && fs.frequency !== structureFreqFilter) return false;
                  if (structureSearch) {
                    const q = structureSearch.toLowerCase();
                    const matchName = fs.name?.toLowerCase().includes(q);
                    const matchGrade = fs.classGrade?.toLowerCase().includes(q);
                    const matchCourse = fs.courseName?.toLowerCase().includes(q);
                    const matchBatch = fs.batch?.name?.toLowerCase().includes(q);
                    return matchName || matchGrade || matchCourse || matchBatch;
                  }
                  return true;
                })
                .map((fs) => {
                  const comps = Array.isArray(fs.componentsJson) ? fs.componentsJson : [];
                  const installments = Array.isArray(fs.installmentsJson) ? fs.installmentsJson : [];

                  return (
                    <div
                      key={fs.id}
                      className={`p-5 rounded-3xl bg-white border shadow-sm space-y-3 transition-all flex flex-col justify-between hover:shadow-md ${
                        fs.isActive ? 'border-[#D7CCC8]' : 'border-gray-200 opacity-70 bg-gray-50/50'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D7CCC8]/40 text-[#4E342E] border border-[#BCAAA4] uppercase">
                                {fs.frequency?.replace('_', ' ')}
                              </span>
                              {fs.classGrade && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                                  {fs.classGrade}
                                </span>
                              )}
                              {fs.courseName && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-800 border border-purple-200">
                                  {fs.courseName}
                                </span>
                              )}
                            </div>
                            <h4 className="text-base font-bold text-[#2D1E18] leading-tight pt-1">{fs.name}</h4>
                            <p className="text-xs text-[#6D4C41]">
                              {fs.batch?.name ? (
                                <span>Batch: <strong>{fs.batch.name}</strong></span>
                              ) : (
                                <span className="text-emerald-800 font-medium">Institute-Wide (All Batches)</span>
                              )}
                              {' • '}{fs.academicYear}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-lg font-black text-emerald-800 block">{formatCurrency(fs.amount)}</span>
                            {fs.dueDay && (
                              <span className="text-[10px] text-[#8D6E63] block">Due Day: {fs.dueDay}th</span>
                            )}
                          </div>
                        </div>

                        {fs.description && (
                          <p className="text-xs text-[#6D4C41] pt-2 border-t border-[#EFEBE9]">{fs.description}</p>
                        )}

                        {/* Component Breakdown Pills */}
                        {comps.length > 0 && (
                          <div className="pt-2 border-t border-[#EFEBE9] space-y-1.5">
                            <span className="text-[10px] font-bold text-[#8D6E63] uppercase tracking-wider block">
                              Fee Components ({comps.length}):
                            </span>
                            <div className="space-y-1">
                              {comps.map((c: any, cIdx: number) => (
                                <div key={cIdx} className="flex items-center justify-between text-xs text-[#4E342E] bg-[#F7F2EF]/60 px-2 py-1 rounded-lg">
                                  <span className="truncate pr-2">{c.name}</span>
                                  <span className="font-semibold shrink-0">{formatCurrency(c.amount)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Installments Schedule Preview */}
                        {installments.length > 0 && (
                          <div className="pt-2 border-t border-[#EFEBE9] space-y-1">
                            <span className="text-[10px] font-bold text-[#8D6E63] uppercase tracking-wider block">
                              Installments Schedule ({installments.length}):
                            </span>
                            <div className="grid grid-cols-2 gap-1 text-[11px]">
                              {installments.map((inst: any, iIdx: number) => (
                                <div key={iIdx} className="p-1.5 rounded-lg bg-amber-50/60 border border-amber-200/70 text-amber-900">
                                  <div className="font-semibold truncate">{inst.label}</div>
                                  <div className="font-bold text-amber-800">{formatCurrency(inst.amount)}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Card Footer Actions */}
                      <div className="pt-3 border-t border-[#EFEBE9] flex items-center justify-between text-xs mt-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-[#8D6E63]">
                            {fs._count?.assignments || 0} active assignments
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleToggleStructureActive(fs)}
                            className={`px-2 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 ${
                              fs.isActive
                                ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                            }`}
                            title={fs.isActive ? 'Deactivate this template' : 'Activate this template'}
                          >
                            {fs.isActive ? <ToggleRight className="w-3.5 h-3.5 text-emerald-700" /> : <ToggleLeft className="w-3.5 h-3.5 text-gray-500" />}
                            {fs.isActive ? 'Active' : 'Inactive'}
                          </button>

                          <button
                            onClick={() => openEditStructureModal(fs)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#4E342E]/10 hover:bg-[#4E342E] text-[#4E342E] hover:text-white border border-[#D7CCC8] transition-all flex items-center gap-1"
                          >
                            <Edit2 className="w-3 h-3" /> Edit
                          </button>

                          <button
                            onClick={() => {
                              onSelectStructureForAssign(fs.id);
                              setShowAssignModal(true);
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#4E342E] hover:bg-[#3E2723] text-white shadow-xs transition-all flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Assign
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 5: REFUNDS & ADJUSTMENTS AUDIT */}
      {/* ========================================================================= */}
      {activeTab === 'adjustments' && isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#2D1E18] uppercase tracking-wider">Financial Adjustments & Audit Trail</h3>
          </div>

          {loadingAdjustments ? (
            <div className="p-12 text-center text-[#8D6E63] text-sm">Loading adjustments...</div>
          ) : adjustments.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white border border-[#D7CCC8] text-[#8D6E63] text-sm shadow-sm">
              No adjustments or refunds recorded.
            </div>
          ) : (
            <div className="rounded-3xl bg-white border border-[#D7CCC8] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F2EF] border-b border-[#D7CCC8] text-[#6D4C41] uppercase text-[10px] tracking-wider font-bold">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Reference / Receipt</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4">Authorized By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFEBE9]">
                    {adjustments.map((adj) => (
                      <tr key={adj.id} className="hover:bg-[#F7F2EF]/50 transition-colors">
                        <td className="py-3 px-4 text-[#6D4C41]">
                          {new Date(adj.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              adj.adjustmentType === 'REFUND'
                                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                : 'bg-[#D7CCC8]/40 text-[#4E342E] border border-[#BCAAA4]'
                            }`}
                          >
                            {adj.adjustmentType}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-[#2D1E18]">
                          {adj.payment?.student
                            ? `${adj.payment.student.firstName} ${adj.payment.student.lastName}`
                            : adj.feeAssignment?.student
                            ? `${adj.feeAssignment.student.firstName} ${adj.feeAssignment.student.lastName}`
                            : 'N/A'}
                        </td>
                        <td className="py-3 px-4 font-mono text-[#4E342E]">
                          {adj.payment?.receiptNumber || adj.feeAssignment?.termLabel || 'N/A'}
                        </td>
                        <td className="py-3 px-4 font-bold text-rose-800">{formatCurrency(adj.amount)}</td>
                        <td className="py-3 px-4 text-[#6D4C41]">{adj.reason}</td>
                        <td className="py-3 px-4 text-[#2D1E18]">{adj.authorizedBy?.fullName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: RECORD PAYMENT */}
      {/* ========================================================================= */}
      {showRecordPaymentModal && selectedAssignmentForPayment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EFEBE9] pb-3">
              <h3 className="text-lg font-bold text-[#2D1E18] flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" /> Record Offline / Manual Fee Payment
              </h3>
              <button
                onClick={() => setShowRecordPaymentModal(false)}
                className="text-[#8D6E63] hover:text-[#2D1E18]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#F7F2EF] border border-[#D7CCC8] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#6D4C41]">Student:</span>
                <span className="font-bold text-[#2D1E18]">
                  {selectedAssignmentForPayment.student?.firstName} {selectedAssignmentForPayment.student?.lastName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6D4C41]">Fee Period:</span>
                <span className="text-[#4E342E] font-semibold">{selectedAssignmentForPayment.termLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6D4C41]">Total Payable:</span>
                <span className="text-[#2D1E18] font-bold">{formatCurrency(selectedAssignmentForPayment.finalAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-[#D7CCC8] pt-2">
                <span className="text-amber-800 font-bold">Outstanding Balance:</span>
                <span className="text-amber-800 font-black text-sm">
                  {formatCurrency(selectedAssignmentForPayment.remainingBalance)}
                </span>
              </div>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#4E342E] font-medium mb-1">
                  Amount Received (₹) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedAssignmentForPayment.remainingBalance}
                  required
                  value={newPayment.amountPaid}
                  onChange={(e) => setNewPayment({ ...newPayment, amountPaid: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-[#2D1E18] font-bold text-base focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                />
                <span className="text-[11px] text-[#6D4C41] mt-0.5 block">
                  Cannot exceed outstanding balance of {formatCurrency(selectedAssignmentForPayment.remainingBalance)}
                </span>
              </div>

              <div>
                <label className="block text-[#4E342E] font-medium mb-1">Payment Method</label>
                <select
                  value={newPayment.method}
                  onChange={(e) => setNewPayment({ ...newPayment, method: e.target.value })}
                  className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI (PhonePe / GPay / Paytm)</option>
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT / IMPS / RTGS)</option>
                  <option value="CHEQUE">Cheque / Demand Draft</option>
                  <option value="ONLINE">Online Portal</option>
                </select>
              </div>

              <div>
                <label className="block text-[#4E342E] font-medium mb-1">
                  Transaction / Cheque Reference (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., UPI Transaction ID or Bank Ref No"
                  value={newPayment.transactionReference}
                  onChange={(e) => setNewPayment({ ...newPayment, transactionReference: e.target.value })}
                  className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>

              <div>
                <label className="block text-[#4E342E] font-medium mb-1">Remarks / Note</label>
                <input
                  type="text"
                  placeholder="Optional notes for receipt"
                  value={newPayment.remarks}
                  onChange={(e) => setNewPayment({ ...newPayment, remarks: e.target.value })}
                  className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#EFEBE9]">
                <button
                  type="button"
                  onClick={() => setShowRecordPaymentModal(false)}
                  className="px-4 py-2 rounded-xl text-[#6D4C41] hover:bg-[#F7F2EF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl font-bold bg-[#4E342E] hover:bg-[#3E2723] text-white shadow-sm flex items-center gap-1.5"
                >
                  Confirm & Generate Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: PRINT-FRIENDLY RECEIPT PREVIEW */}
      {/* ========================================================================= */}
      {showReceiptModal && activeReceipt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl w-full max-w-2xl p-6 sm:p-8 space-y-6 shadow-2xl relative my-8">
            <div className="flex items-center justify-between border-b border-[#EFEBE9] pb-3 no-print">
              <span className="text-xs font-bold text-[#6D4C41] uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-[#6D4C41]" /> Official Fee Receipt
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-4 h-4" /> Print / Save PDF
                </button>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="text-[#8D6E63] hover:text-[#2D1E18] p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Receipt Box */}
            <div id="tuition-receipt" className="p-6 rounded-2xl bg-[#F7F2EF] border border-[#D7CCC8] text-[#2D1E18] space-y-6">
              {/* Receipt Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-[#D7CCC8] pb-4 gap-4">
                <div>
                  <h2 className="text-xl font-black text-[#2D1E18]">{activeReceipt.institute?.name}</h2>
                  <p className="text-xs text-[#6D4C41] mt-0.5">{activeReceipt.institute?.address || 'Tuition Center'}</p>
                  <p className="text-xs text-[#6D4C41]">
                    Phone: {activeReceipt.institute?.phone || 'N/A'} &bull; Email: {activeReceipt.institute?.email || 'N/A'}
                  </p>
                </div>
                <div className="sm:text-right">
                  <span className="text-xs font-mono uppercase tracking-widest text-[#4E342E] font-bold block">
                    {activeReceipt.receiptNumber}
                  </span>
                  <span className="text-xs text-[#8D6E63] mt-1 block">
                    Date: {new Date(activeReceipt.receiptDate).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              {/* Student Details */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-white p-4 rounded-xl border border-[#D7CCC8]">
                <div>
                  <span className="text-[#8D6E63] block text-[10px] uppercase font-bold tracking-wider">Student Name</span>
                  <span className="text-[#2D1E18] font-bold text-sm">{activeReceipt.student?.fullName}</span>
                </div>
                <div>
                  <span className="text-[#8D6E63] block text-[10px] uppercase font-bold tracking-wider">Admission No</span>
                  <span className="text-[#2D1E18] font-mono font-bold text-sm">{activeReceipt.student?.admissionNumber}</span>
                </div>
                <div>
                  <span className="text-[#8D6E63] block text-[10px] uppercase font-bold tracking-wider">Batch / Section</span>
                  <span className="text-[#2D1E18] font-medium">{activeReceipt.student?.batchName}</span>
                </div>
                <div>
                  <span className="text-[#8D6E63] block text-[10px] uppercase font-bold tracking-wider">Academic Year</span>
                  <span className="text-[#2D1E18] font-medium">{activeReceipt.student?.academicYear}</span>
                </div>
              </div>

              {/* Fee Transaction Ledger */}
              <div className="space-y-3">
                <table className="w-full text-xs text-left bg-white rounded-xl overflow-hidden border border-[#D7CCC8]">
                  <thead className="bg-[#F7F2EF] text-[#6D4C41] uppercase text-[10px] font-bold border-b border-[#D7CCC8]">
                    <tr>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-right">Total Payable</th>
                      <th className="py-2.5 px-3 text-right">Prior Paid</th>
                      <th className="py-2.5 px-3 text-right">Current Paid</th>
                      <th className="py-2.5 px-3 text-right">Remaining Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFEBE9]">
                    <tr>
                      <td className="py-3 px-3">
                        <span className="font-bold text-[#2D1E18] block">{activeReceipt.feeDetails?.feeName}</span>
                        <span className="text-[11px] text-[#6D4C41]">{activeReceipt.feeDetails?.termLabel}</span>
                      </td>
                      <td className="py-3 px-3 text-right text-[#2D1E18]">
                        {formatCurrency(activeReceipt.feeDetails?.totalPayable)}
                      </td>
                      <td className="py-3 px-3 text-right text-[#6D4C41]">
                        {formatCurrency(activeReceipt.feeDetails?.priorPaid)}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-emerald-800 text-sm">
                        {formatCurrency(activeReceipt.feeDetails?.amountPaid)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-amber-800">
                        {formatCurrency(activeReceipt.feeDetails?.remainingBalanceAfter)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Payment Details */}
              <div className="pt-3 border-t border-[#D7CCC8] grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[#8D6E63] block text-[10px] uppercase font-bold tracking-wider">Payment Method</span>
                  <span className="text-[#2D1E18] font-semibold">{activeReceipt.payment?.method}</span>
                  {activeReceipt.payment?.transactionReference && (
                    <span className="text-[11px] font-mono text-[#6D4C41] block mt-0.5">
                      Ref: {activeReceipt.payment.transactionReference}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[#8D6E63] block text-[10px] uppercase font-bold tracking-wider">Issued By</span>
                  <span className="text-[#2D1E18] font-semibold">{activeReceipt.payment?.recordedBy}</span>
                  <span className="text-[10px] text-emerald-800 font-medium block mt-0.5">Payment Verified</span>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="text-[10px] text-[#8D6E63] text-center pt-3 border-t border-[#D7CCC8]">
                {activeReceipt.disclaimer}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CREATE / EDIT FEE STRUCTURE */}
      {/* ========================================================================= */}
      {showCreateStructureModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl w-full max-w-2xl p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-[#EFEBE9] pb-3">
              <div>
                <h3 className="text-lg font-bold text-[#2D1E18] flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#6D4C41]" />
                  {editingStructure ? 'Edit Fee Structure' : 'Create New Fee Structure'}
                </h3>
                <p className="text-xs text-[#8D6E63]">
                  Configure reusable tuition plans, itemized components, installment schedules, and billing cycles.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCreateStructureModal(false);
                  setEditingStructure(null);
                }}
                className="text-[#8D6E63] hover:text-[#2D1E18]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStructure} className="space-y-4 text-xs">
              {/* Structure Name & Academic Year */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-[#4E342E] font-medium mb-1">
                    Fee Structure Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Class 10 Board Comprehensive Package"
                    value={structureForm.name}
                    onChange={(e) => setStructureForm({ ...structureForm, name: e.target.value })}
                    className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-[#2D1E18] font-medium focus:ring-2 focus:ring-[#8D6E63]"
                  />
                </div>
                <div>
                  <label className="block text-[#4E342E] font-medium mb-1">Academic Year</label>
                  <input
                    type="text"
                    required
                    placeholder="2026-2027"
                    value={structureForm.academicYear}
                    onChange={(e) => setStructureForm({ ...structureForm, academicYear: e.target.value })}
                    className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-[#2D1E18] focus:ring-2 focus:ring-[#8D6E63]"
                  />
                </div>
              </div>

              {/* Class/Grade, Course, Batch Association */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#4E342E] font-medium mb-1">Class / Grade</label>
                  <input
                    type="text"
                    placeholder="e.g., Class 10, Grade 12"
                    value={structureForm.classGrade}
                    onChange={(e) => setStructureForm({ ...structureForm, classGrade: e.target.value })}
                    className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-[#2D1E18] focus:ring-2 focus:ring-[#8D6E63]"
                  />
                </div>
                <div>
                  <label className="block text-[#4E342E] font-medium mb-1">Course / Stream</label>
                  <input
                    type="text"
                    placeholder="e.g., Science & Math, NEET Target"
                    value={structureForm.courseName}
                    onChange={(e) => setStructureForm({ ...structureForm, courseName: e.target.value })}
                    className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-[#2D1E18] focus:ring-2 focus:ring-[#8D6E63]"
                  />
                </div>
                <div>
                  <label className="block text-[#4E342E] font-medium mb-1">Applicable Batch</label>
                  <select
                    value={structureForm.batchId}
                    onChange={(e) => setStructureForm({ ...structureForm, batchId: e.target.value })}
                    className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-[#2D1E18] focus:ring-2 focus:ring-[#8D6E63]"
                  >
                    <option value="">Institute-Wide (All Batches)</option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.academicYear})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Frequency & Due Day */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#4E342E] font-medium mb-1">
                    Billing Frequency <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={structureForm.frequency}
                    onChange={(e) => setStructureForm({ ...structureForm, frequency: e.target.value })}
                    className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-[#2D1E18] font-semibold focus:ring-2 focus:ring-[#8D6E63]"
                  >
                    <option value="MONTHLY">Monthly (Recurring every month)</option>
                    <option value="QUARTERLY">Quarterly (Every 3 months)</option>
                    <option value="TERM_WISE">Term-wise (Semester / Term intervals)</option>
                    <option value="ANNUAL">Annual (Once per academic year)</option>
                    <option value="COURSE_BASED">Course-based (Full syllabus package)</option>
                    <option value="INSTALLMENT_BASED">Installment-based (Multi-part scheduled)</option>
                    <option value="ONE_TIME">One-time (Admission / Registration)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#4E342E] font-medium mb-1">Default Due Day of Month</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="10"
                    value={structureForm.dueDay}
                    onChange={(e) => setStructureForm({ ...structureForm, dueDay: parseInt(e.target.value) || 10 })}
                    className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-[#2D1E18] focus:ring-2 focus:ring-[#8D6E63]"
                  />
                </div>
              </div>

              {/* Configurable Fee Components Builder */}
              <div className="p-4 rounded-2xl bg-[#F7F2EF]/70 border border-[#D7CCC8] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-[#2D1E18] text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-[#6D4C41]" /> Configurable Fee Components
                    </h4>
                    <p className="text-[11px] text-[#6D4C41]">
                      Breakdown shown on receipts and fee cards (Tuition, Books, Exams, Admission).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStructureForm({
                        ...structureForm,
                        components: [
                          ...structureForm.components,
                          { name: 'Special Coaching', amount: 1000, category: 'OTHER' },
                        ],
                      });
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#4E342E]/10 hover:bg-[#4E342E] text-[#4E342E] hover:text-white border border-[#D7CCC8] transition-all flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Component
                  </button>
                </div>

                {/* Quick Preset Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                  <span className="text-[#8D6E63] font-medium">Quick Presets:</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (!structureForm.components.some(c => c.name.includes('Tuition'))) {
                        setStructureForm({
                          ...structureForm,
                          components: [...structureForm.components, { name: 'Tuition & Lectures', amount: 3000, category: 'TUITION' }],
                        });
                      }
                    }}
                    className="px-2 py-0.5 rounded-full bg-white border border-[#D7CCC8] text-[#4E342E] hover:bg-[#D7CCC8]/40 transition-colors"
                  >
                    + Tuition
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!structureForm.components.some(c => c.name.includes('Material') || c.name.includes('Book'))) {
                        setStructureForm({
                          ...structureForm,
                          components: [...structureForm.components, { name: 'Study Materials & Books', amount: 500, category: 'MATERIALS' }],
                        });
                      }
                    }}
                    className="px-2 py-0.5 rounded-full bg-white border border-[#D7CCC8] text-[#4E342E] hover:bg-[#D7CCC8]/40 transition-colors"
                  >
                    + Study Materials
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!structureForm.components.some(c => c.name.includes('Test') || c.name.includes('Exam'))) {
                        setStructureForm({
                          ...structureForm,
                          components: [...structureForm.components, { name: 'Test Series & Exams', amount: 500, category: 'EXAMINATION' }],
                        });
                      }
                    }}
                    className="px-2 py-0.5 rounded-full bg-white border border-[#D7CCC8] text-[#4E342E] hover:bg-[#D7CCC8]/40 transition-colors"
                  >
                    + Test Series
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!structureForm.components.some(c => c.name.includes('Admission') || c.name.includes('Registration'))) {
                        setStructureForm({
                          ...structureForm,
                          components: [...structureForm.components, { name: 'Registration & Kit', amount: 1000, category: 'ADMISSION' }],
                        });
                      }
                    }}
                    className="px-2 py-0.5 rounded-full bg-white border border-[#D7CCC8] text-[#4E342E] hover:bg-[#D7CCC8]/40 transition-colors"
                  >
                    + Admission / Registration
                  </button>
                </div>

                {/* Components Table */}
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {structureForm.components.map((comp, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-[#D7CCC8]">
                      <input
                        type="text"
                        placeholder="Component Name (e.g., Tuition)"
                        value={comp.name}
                        onChange={(e) => {
                          const updated = [...structureForm.components];
                          updated[idx].name = e.target.value;
                          setStructureForm({ ...structureForm, components: updated });
                        }}
                        className="flex-1 bg-[#F7F2EF] border border-[#D7CCC8] rounded-lg px-2.5 py-1 text-xs text-[#2D1E18]"
                      />
                      <select
                        value={comp.category || 'OTHER'}
                        onChange={(e) => {
                          const updated = [...structureForm.components];
                          updated[idx].category = e.target.value;
                          setStructureForm({ ...structureForm, components: updated });
                        }}
                        className="bg-[#F7F2EF] border border-[#D7CCC8] rounded-lg px-2 py-1 text-[11px] text-[#2D1E18]"
                      >
                        <option value="TUITION">Tuition</option>
                        <option value="MATERIALS">Study Materials</option>
                        <option value="EXAMINATION">Examinations</option>
                        <option value="ADMISSION">Admission</option>
                        <option value="LAB">Lab / Tech</option>
                        <option value="OTHER">Other</option>
                      </select>
                      <div className="relative w-28">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#8D6E63] font-bold">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Amount"
                          value={comp.amount}
                          onChange={(e) => {
                            const updated = [...structureForm.components];
                            updated[idx].amount = parseFloat(e.target.value) || 0;
                            const newTotal = updated.reduce((s, c) => s + (Number(c.amount) || 0), 0);
                            setStructureForm({ ...structureForm, components: updated, amount: newTotal });
                          }}
                          className="w-full pl-6 pr-2 py-1 bg-[#F7F2EF] border border-[#D7CCC8] rounded-lg text-xs font-bold text-[#2D1E18]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = structureForm.components.filter((_, i) => i !== idx);
                          const newTotal = updated.reduce((s, c) => s + (Number(c.amount) || 0), 0);
                          setStructureForm({ ...structureForm, components: updated, amount: newTotal });
                        }}
                        className="p-1 rounded-lg text-rose-600 hover:bg-rose-50"
                        title="Remove component"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Auto Calculated Sum */}
                <div className="pt-2 border-t border-[#D7CCC8] flex items-center justify-between text-xs font-bold text-[#2D1E18]">
                  <span>Total Calculated Fee Amount:</span>
                  <span className="text-base font-black text-emerald-800">
                    {formatCurrency(
                      structureForm.components.reduce((sum, c) => sum + (Number(c.amount) || 0), 0) || structureForm.amount
                    )}
                  </span>
                </div>
              </div>

              {/* Installment Schedules Builder (if Installment-based or Term-wise) */}
              {(structureForm.frequency === 'INSTALLMENT_BASED' || structureForm.frequency === 'TERM_WISE') && (
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-amber-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-amber-800" /> Installment Schedules
                      </h4>
                      <p className="text-[11px] text-amber-800">
                        Define scheduled payments (e.g. 2 terms or 3 milestone installments).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const nextNo = structureForm.installments.length + 1;
                        setStructureForm({
                          ...structureForm,
                          installments: [
                            ...structureForm.installments,
                            {
                              installmentNo: nextNo,
                              label: `Installment ${nextNo}`,
                              amount: Math.round(structureForm.amount / (nextNo || 1)),
                              dueOffsetDays: (nextNo - 1) * 90,
                            },
                          ],
                        });
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-200/60 hover:bg-amber-300 text-amber-900 border border-amber-300 transition-all flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Installment
                    </button>
                  </div>

                  <div className="space-y-2">
                    {structureForm.installments.map((inst, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-amber-200">
                        <span className="font-bold text-amber-900 w-6">#{inst.installmentNo}</span>
                        <input
                          type="text"
                          placeholder="Label (e.g., 1st Term at Admission)"
                          value={inst.label}
                          onChange={(e) => {
                            const updated = [...structureForm.installments];
                            updated[idx].label = e.target.value;
                            setStructureForm({ ...structureForm, installments: updated });
                          }}
                          className="flex-1 bg-[#F7F2EF] border border-[#D7CCC8] rounded-lg px-2.5 py-1 text-xs text-[#2D1E18]"
                        />
                        <div className="relative w-28">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#8D6E63] font-bold">₹</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="Amount"
                            value={inst.amount}
                            onChange={(e) => {
                              const updated = [...structureForm.installments];
                              updated[idx].amount = parseFloat(e.target.value) || 0;
                              setStructureForm({ ...structureForm, installments: updated });
                            }}
                            className="w-full pl-6 pr-2 py-1 bg-[#F7F2EF] border border-[#D7CCC8] rounded-lg text-xs font-bold text-[#2D1E18]"
                          />
                        </div>
                        <input
                          type="number"
                          placeholder="Offset (Days)"
                          title="Days after admission"
                          value={inst.dueOffsetDays || 0}
                          onChange={(e) => {
                            const updated = [...structureForm.installments];
                            updated[idx].dueOffsetDays = parseInt(e.target.value) || 0;
                            setStructureForm({ ...structureForm, installments: updated });
                          }}
                          className="w-20 bg-[#F7F2EF] border border-[#D7CCC8] rounded-lg px-2 py-1 text-xs text-center text-[#2D1E18]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = structureForm.installments.filter((_, i) => i !== idx);
                            setStructureForm({ ...structureForm, installments: updated });
                          }}
                          className="p-1 rounded-lg text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-[#4E342E] font-medium mb-1">Description & Academy Notes</label>
                <textarea
                  rows={2}
                  placeholder="Includes laboratory access, mock exam evaluations, and doubt clearing sessions..."
                  value={structureForm.description}
                  onChange={(e) => setStructureForm({ ...structureForm, description: e.target.value })}
                  className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-[#2D1E18] focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#EFEBE9]">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateStructureModal(false);
                    setEditingStructure(null);
                  }}
                  className="px-4 py-2 rounded-xl text-[#6D4C41] hover:bg-[#F7F2EF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl font-bold bg-[#4E342E] hover:bg-[#3E2723] text-white shadow-sm flex items-center gap-1.5 transition-all"
                >
                  <Check className="w-4 h-4" />
                  {editingStructure ? 'Update Fee Structure' : 'Save Fee Structure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: ASSIGN FEE TO INDIVIDUAL STUDENT */}
      {/* ========================================================================= */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-[#EFEBE9] pb-3">
              <div>
                <h3 className="text-lg font-bold text-[#2D1E18] flex items-center gap-2">
                  <Plus className="w-5 h-5 text-[#6D4C41]" /> Assign Fee to Student
                </h3>
                <p className="text-xs text-[#8D6E63]">
                  Generate tuition fee obligations with live component breakdown, scholarships & concessions.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedStructureForAssign(null);
                }}
                className="text-[#8D6E63] hover:text-[#2D1E18]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignIndividual} className="space-y-4 text-xs">
              {/* Select Student */}
              <div>
                <label className="block text-[#4E342E] font-medium mb-1">
                  Select Student <span className="text-rose-600">*</span>
                </label>
                <select
                  required
                  value={newAssignment.studentId}
                  onChange={(e) => setNewAssignment({ ...newAssignment, studentId: e.target.value })}
                  className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-[#2D1E18] font-medium focus:ring-2 focus:ring-[#8D6E63]"
                >
                  <option value="">Select Student...</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.firstName} {s.lastName} (Adm: {s.admissionNumber})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Fee Structure with Empty State Protection */}
              <div>
                <label className="block text-[#4E342E] font-medium mb-1">
                  Fee Structure Template <span className="text-rose-600">*</span>
                </label>

                {loadingStructures ? (
                  <div className="p-3 bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl text-center text-[#8D6E63] animate-pulse">
                    Loading fee structures...
                  </div>
                ) : feeStructures.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                    <div className="flex items-center gap-2 font-bold text-amber-800">
                      <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                      No Fee Structures Configured Yet
                    </div>
                    <p className="text-[#6D4C41]">
                      There are currently no active fee structure templates in this institute. You need to create at least one fee structure before assigning fees.
                    </p>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowAssignModal(false);
                          openCreateStructureModal();
                        }}
                        className="mt-1 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#4E342E] hover:bg-[#3E2723] text-white shadow-sm inline-flex items-center gap-1.5 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" /> Create Fee Structure Now ↗
                      </button>
                    )}
                  </div>
                ) : (
                  <select
                    required
                    value={newAssignment.feeStructureId}
                    onChange={(e) => onSelectStructureForAssign(e.target.value)}
                    className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-[#2D1E18] font-semibold focus:ring-2 focus:ring-[#8D6E63]"
                  >
                    <option value="">Select Fee Structure...</option>
                    {feeStructures
                      .filter((fs) => fs.isActive)
                      .map((fs) => (
                        <option key={fs.id} value={fs.id}>
                          {fs.name} — ₹{fs.amount} ({fs.frequency?.replace('_', ' ')}) {fs.batch ? '• ' + fs.batch.name : '• Institute-wide'}
                        </option>
                      ))}
                  </select>
                )}
              </div>

              {/* Dynamic Component Breakdown & Installment Selector when Structure is Selected */}
              {selectedStructureForAssign && (
                <div className="space-y-3">
                  {/* Itemized Component Table */}
                  <div className="rounded-2xl bg-[#F7F2EF] border border-[#D7CCC8] p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-[#2D1E18]">
                      <span>Itemized Fee Components</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D7CCC8]/50 text-[#4E342E] font-semibold uppercase">
                        {selectedStructureForAssign.frequency?.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="space-y-1.5 divide-y divide-[#EFEBE9] pt-1">
                      {newAssignment.components.map((comp, idx) => (
                        <div key={idx} className="pt-1.5 flex items-center justify-between text-xs text-[#4E342E]">
                          <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#8D6E63]"></span>
                            {comp.name}
                          </span>
                          <span className="font-semibold">{formatCurrency(comp.amount)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-[#D7CCC8] flex items-center justify-between font-bold text-xs text-[#2D1E18]">
                      <span>Base Template Fee:</span>
                      <span className="text-emerald-800">{formatCurrency(newAssignment.baseAmount)}</span>
                    </div>
                  </div>

                  {/* Installment Selector if Structure has Installments */}
                  {Array.isArray(selectedStructureForAssign.installmentsJson) && selectedStructureForAssign.installmentsJson.length > 0 && (
                    <div>
                      <label className="block text-[#4E342E] font-medium mb-1">Select Scheduled Installment</label>
                      <select
                        value={newAssignment.installmentNo || ''}
                        onChange={(e) => {
                          const val = e.target.value ? parseInt(e.target.value) : null;
                          const inst = selectedStructureForAssign.installmentsJson.find((i: any) => i.installmentNo === val);
                          if (inst) {
                            setNewAssignment({
                              ...newAssignment,
                              installmentNo: val,
                              termLabel: inst.label,
                              baseAmount: Number(inst.amount) || newAssignment.baseAmount,
                            });
                          } else {
                            setNewAssignment({
                              ...newAssignment,
                              installmentNo: null,
                              termLabel: 'Full Course Package',
                              baseAmount: Number(selectedStructureForAssign.amount),
                            });
                          }
                        }}
                        className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-[#2D1E18] focus:ring-2 focus:ring-[#8D6E63]"
                      >
                        <option value="">Full Course Fee (All Installments Combined)</option>
                        {selectedStructureForAssign.installmentsJson.map((inst: any) => (
                          <option key={inst.installmentNo} value={inst.installmentNo}>
                            Installment #{inst.installmentNo}: {inst.label} — ₹{inst.amount}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Term Label & Academic Year */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#4E342E] font-medium mb-1">
                    Term / Invoice Label <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., November 2026 or Term 1"
                    value={newAssignment.termLabel}
                    onChange={(e) => setNewAssignment({ ...newAssignment, termLabel: e.target.value })}
                    className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-[#2D1E18] focus:ring-2 focus:ring-[#8D6E63]"
                  />
                </div>
                <div>
                  <label className="block text-[#4E342E] font-medium mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={newAssignment.dueDate}
                    onChange={(e) => setNewAssignment({ ...newAssignment, dueDate: e.target.value })}
                    className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-[#2D1E18] focus:ring-2 focus:ring-[#8D6E63]"
                  />
                </div>
              </div>

              {/* Student Concession / Scholarship & Mandatory Reason */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#4E342E] font-medium mb-1">
                    Concession / Scholarship (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={newAssignment.baseAmount || 999999}
                    step="0.01"
                    value={newAssignment.discountAmount}
                    onChange={(e) => setNewAssignment({ ...newAssignment, discountAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-[#2D1E18] focus:ring-2 focus:ring-[#8D6E63]"
                  />
                </div>
                <div>
                  <label className="block text-[#4E342E] font-medium mb-1">
                    Discount Reason {newAssignment.discountAmount > 0 ? <span className="text-rose-600 font-bold">* (Required)</span> : '(Optional)'}
                  </label>
                  <input
                    type="text"
                    required={newAssignment.discountAmount > 0}
                    placeholder={newAssignment.discountAmount > 0 ? "e.g., Merit scholarship, Sibling discount" : "Reason if discount applied"}
                    value={newAssignment.discountReason}
                    onChange={(e) => setNewAssignment({ ...newAssignment, discountReason: e.target.value })}
                    className={`w-full bg-[#F7F2EF] border rounded-xl px-3 py-2 text-[#2D1E18] focus:ring-2 focus:ring-[#8D6E63] ${
                      newAssignment.discountAmount > 0 && !newAssignment.discountReason.trim()
                        ? 'border-rose-400 bg-rose-50/30'
                        : 'border-[#D7CCC8]'
                    }`}
                  />
                </div>
              </div>

              {/* Live Net Payable Obligation Summary Card */}
              {newAssignment.feeStructureId && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block">
                      Total Net Payable Obligation
                    </span>
                    <span className="text-[10px] text-emerald-800">
                      Base Fee {formatCurrency(newAssignment.baseAmount)}
                      {newAssignment.discountAmount > 0 && ` − Concession ${formatCurrency(newAssignment.discountAmount)}`}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black text-emerald-950">
                      {formatCurrency(Math.max(0, newAssignment.baseAmount - newAssignment.discountAmount))}
                    </span>
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#EFEBE9]">
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedStructureForAssign(null);
                  }}
                  className="px-4 py-2 rounded-xl text-[#6D4C41] hover:bg-[#F7F2EF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newAssignment.feeStructureId || !newAssignment.studentId}
                  className="px-5 py-2.5 rounded-xl font-bold bg-[#4E342E] hover:bg-[#3E2723] text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Confirm & Assign Fee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: BATCH FEE ASSIGNMENT */}
      {/* ========================================================================= */}
      {showBatchAssignModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EFEBE9] pb-3">
              <h3 className="text-lg font-bold text-[#2D1E18] flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#6D4C41]" /> Assign Fee to Entire Batch
              </h3>
              <button onClick={() => setShowBatchAssignModal(false)} className="text-[#8D6E63] hover:text-[#2D1E18]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-[#F7F2EF] border border-[#D7CCC8] text-xs text-[#4E342E]">
              Safe Transactional Operation: Automatically skips students already assigned for the specified term label.
            </div>

            <form onSubmit={handleAssignBatch} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#4E342E] font-medium mb-1">Target Batch</label>
                <select
                  required
                  value={newBatchAssignment.batchId}
                  onChange={(e) => setNewBatchAssignment({ ...newBatchAssignment, batchId: e.target.value })}
                  className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-[#2D1E18] focus:ring-2 focus:ring-[#8D6E63]"
                >
                  <option value="">Select Batch...</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.academicYear})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#4E342E] font-medium mb-1">
                  Fee Structure <span className="text-rose-600">*</span>
                </label>
                {feeStructures.length === 0 ? (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                    No fee structures available. Please create a fee structure first.
                  </div>
                ) : (
                  <select
                    required
                    value={newBatchAssignment.feeStructureId}
                    onChange={(e) => {
                      const fsId = e.target.value;
                      const fs = feeStructures.find((f) => f.id === fsId);
                      let defaultTerm = newBatchAssignment.termLabel;
                      if (fs && !defaultTerm) {
                        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                        defaultTerm = fs.frequency === 'MONTHLY' ? `${monthNames[new Date().getMonth()]} ${new Date().getFullYear()}` : 'Term 1';
                      }
                      setNewBatchAssignment({
                        ...newBatchAssignment,
                        feeStructureId: fsId,
                        termLabel: defaultTerm,
                      });
                    }}
                    className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-[#2D1E18] font-semibold focus:ring-2 focus:ring-[#8D6E63]"
                  >
                    <option value="">Select Fee Structure...</option>
                    {feeStructures
                      .filter((fs) => fs.isActive)
                      .map((fs) => (
                        <option key={fs.id} value={fs.id}>
                          {fs.name} — ₹{fs.amount} ({fs.frequency?.replace('_', ' ')}) {fs.batch ? '• ' + fs.batch.name : '• Institute-wide'}
                        </option>
                      ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#4E342E] font-medium mb-1">Term Label</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., November 2026"
                    value={newBatchAssignment.termLabel}
                    onChange={(e) => setNewBatchAssignment({ ...newBatchAssignment, termLabel: e.target.value })}
                    className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-[#2D1E18] focus:ring-2 focus:ring-[#8D6E63]"
                  />
                </div>
                <div>
                  <label className="block text-[#4E342E] font-medium mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={newBatchAssignment.dueDate}
                    onChange={(e) => setNewBatchAssignment({ ...newBatchAssignment, dueDate: e.target.value })}
                    className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-[#2D1E18] focus:ring-2 focus:ring-[#8D6E63]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#EFEBE9]">
                <button
                  type="button"
                  onClick={() => setShowBatchAssignModal(false)}
                  className="px-4 py-2 rounded-xl text-[#6D4C41] hover:bg-[#F7F2EF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl font-bold bg-[#6D4C41] hover:bg-[#4E342E] text-white shadow-sm"
                >
                  Execute Batch Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: REFUND PAYMENT CONFIRMATION */}
      {/* ========================================================================= */}
      {showRefundModal && selectedPaymentForRefund && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-rose-200 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EFEBE9] pb-3">
              <h3 className="text-lg font-bold text-[#2D1E18] flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-rose-600" /> Process Authorized Refund
              </h3>
              <button onClick={() => setShowRefundModal(false)} className="text-[#8D6E63] hover:text-[#2D1E18]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
              <div>Receipt: <strong className="font-mono text-rose-900">{selectedPaymentForRefund.receiptNumber}</strong></div>
              <div>Student: <strong>{selectedPaymentForRefund.student?.firstName} {selectedPaymentForRefund.student?.lastName}</strong></div>
              <div>Original Amount Paid: <strong>{formatCurrency(selectedPaymentForRefund.amountPaid)}</strong></div>
            </div>

            <form onSubmit={handleProcessRefund} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#4E342E] font-medium mb-1">
                  Refund Amount (₹) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedPaymentForRefund.amountPaid}
                  required
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-[#2D1E18] font-bold text-base focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>

              <div>
                <label className="block text-[#4E342E] font-medium mb-1">
                  Reason for Refund (Mandatory & Audited) <span className="text-rose-600">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="State the clear administrative or financial reason for this refund..."
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-[#2D1E18] focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#EFEBE9]">
                <button
                  type="button"
                  onClick={() => setShowRefundModal(false)}
                  className="px-4 py-2 rounded-xl text-[#6D4C41] hover:bg-[#F7F2EF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingRefund}
                  className="px-5 py-2.5 rounded-xl font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm flex items-center gap-1.5"
                >
                  {processingRefund ? 'Processing...' : 'Confirm & Process Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
