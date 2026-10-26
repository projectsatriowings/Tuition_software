import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import {
  GraduationCap,
  Calendar,
  BookOpen,
  Building,
  CheckCircle,
  CreditCard,
  Receipt,
  Printer,
  X,
  FileText,
  Clock,
  AlertCircle,
} from 'lucide-react';

export const ParentPortal: React.FC = () => {
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fee state
  const [selectedStudentForFees, setSelectedStudentForFees] = useState<any>(null);
  const [feeStatement, setFeeStatement] = useState<any>(null);
  const [loadingStatement, setLoadingStatement] = useState<boolean>(false);
  const [activeReceipt, setActiveReceipt] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [showStatementModal, setShowStatementModal] = useState<boolean>(false);

  useEffect(() => {
    apiFetch('/parents/my/children')
      .then((res) => {
        setChildren(res.data?.children || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const openStudentStatement = async (student: any) => {
    setSelectedStudentForFees(student);
    setLoadingStatement(true);
    setShowStatementModal(true);
    try {
      const res = await apiFetch(`/fees/students/${student.id}/statement`);
      if (res.success && res.data) {
        setFeeStatement(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStatement(false);
    }
  };

  const openReceipt = async (paymentId: string) => {
    try {
      const res = await apiFetch(`/fees/payments/${paymentId}/receipt`);
      if (res.success && res.data?.receipt) {
        setActiveReceipt(res.data.receipt);
        setShowReceiptModal(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatCurrency = (val: number | string | undefined) => {
    const num = Number(val || 0);
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-[#2D1E18] tracking-tight flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-[#6D4C41]" /> Parent Portal — My Children
        </h1>
        <p className="text-sm text-[#6D4C41] mt-1">Verified academic, enrollment, attendance, and fee payment records</p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-[#8D6E63] text-sm">Loading children records...</div>
      ) : children.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-[#D7CCC8] text-[#8D6E63] text-sm shadow-sm">
          No student records are currently linked to your verified parent account. Please contact your tuition institute administration.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {children.map((item, idx) => {
            const student = item.student;
            return (
              <div key={student.id || idx} className="p-6 rounded-3xl bg-white border border-[#D7CCC8] shadow-sm hover:shadow-md transition-shadow space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#D7CCC8]/40 text-[#4E342E] border border-[#BCAAA4] uppercase tracking-wider">
                      {item.relationship || 'Child'}
                    </span>
                    <h2 className="text-xl font-bold text-[#2D1E18] mt-2">
                      {student.firstName} {student.lastName}
                    </h2>
                    <div className="text-xs text-[#6D4C41] flex items-center gap-2 mt-1">
                      <span>Admission No: <strong className="font-mono text-[#2D1E18]">{student.admissionNumber}</strong></span>
                      {student.rollNumber && (
                        <span>&bull; Roll No: <strong className="font-mono text-[#2D1E18]">{student.rollNumber}</strong></span>
                      )}
                    </div>
                  </div>

                  <div className="w-12 h-12 rounded-2xl bg-[#4E342E]/10 text-[#4E342E] border border-[#D7CCC8] flex items-center justify-center font-bold text-lg">
                    {student.firstName[0]}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#EFEBE9] grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-2xl bg-[#F7F2EF] border border-[#EFEBE9]">
                    <span className="text-[#8D6E63] block text-[10px] uppercase font-bold tracking-wider">Institute</span>
                    <span className="text-[#2D1E18] font-medium mt-0.5 block">{student.institute?.name || 'Academic Center'}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#F7F2EF] border border-[#EFEBE9]">
                    <span className="text-[#8D6E63] block text-[10px] uppercase font-bold tracking-wider">Batch Section</span>
                    <span className="text-[#2D1E18] font-medium mt-0.5 block">{student.enrollments?.[0]?.batch?.name || 'Class 10'}</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs text-emerald-800 bg-emerald-50 p-3 rounded-2xl border border-emerald-200">
                  <span className="flex items-center gap-1.5 font-medium">
                    <CheckCircle className="w-4 h-4 text-emerald-600" /> Enrollment Active
                  </span>
                  {item.canReceiveSms && (
                    <span className="text-[11px] text-emerald-700 font-medium">SMS Alerts Enabled</span>
                  )}
                </div>

                {/* Fees Quick Button */}
                <div className="pt-1">
                  <button
                    onClick={() => openStudentStatement(student)}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[#4E342E] hover:bg-[#3E2723] text-white border border-[#3E2723] flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <CreditCard className="w-4 h-4" /> View Fee Dues & Receipts
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Statement Modal */}
      {showStatementModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl w-full max-w-2xl p-6 sm:p-8 space-y-5 shadow-2xl relative my-8">
            <div className="flex items-center justify-between border-b border-[#EFEBE9] pb-3">
              <div>
                <h3 className="text-lg font-bold text-[#2D1E18] flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#6D4C41]" /> Fee Statement for {selectedStudentForFees?.firstName} {selectedStudentForFees?.lastName}
                </h3>
                <span className="text-xs text-[#8D6E63]">Admission No: {selectedStudentForFees?.admissionNumber}</span>
              </div>
              <button onClick={() => setShowStatementModal(false)} className="text-[#8D6E63] hover:text-[#2D1E18]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingStatement ? (
              <div className="p-8 text-center text-[#8D6E63] text-xs">Loading fee statement...</div>
            ) : feeStatement ? (
              <div className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-3 text-xs text-center">
                  <div className="p-3 rounded-2xl bg-[#F7F2EF] border border-[#D7CCC8]">
                    <span className="text-[10px] uppercase font-bold text-[#8D6E63] block">Total Payable</span>
                    <span className="text-[#2D1E18] font-bold text-sm block mt-0.5">{formatCurrency(feeStatement.summary?.totalPayable)}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                    <span className="text-[10px] uppercase font-bold text-emerald-800 block">Total Paid</span>
                    <span className="text-emerald-800 font-bold text-sm block mt-0.5">{formatCurrency(feeStatement.summary?.totalPaid)}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
                    <span className="text-[10px] uppercase font-bold text-amber-800 block">Remaining Due</span>
                    <span className="text-amber-800 font-black text-sm block mt-0.5">{formatCurrency(feeStatement.summary?.netOutstanding)}</span>
                  </div>
                </div>

                {/* Term-wise breakdown */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-[#6D4C41] uppercase tracking-wider">Fee Term Ledger</h4>
                  {feeStatement.statementItems?.map((term: any) => (
                    <div key={term.id} className="p-4 rounded-2xl bg-[#F7F2EF] border border-[#D7CCC8] space-y-2 text-xs">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-bold text-[#2D1E18] text-sm">{term.feeStructure?.name}</span>
                          <span className="text-[#6D4C41] text-[11px] block">{term.termLabel} &bull; Due: {new Date(term.dueDate).toLocaleDateString()}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          term.calculatedStatus === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : term.calculatedStatus === 'PARTIALLY_PAID'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}>
                          {term.calculatedStatus}
                        </span>
                      </div>

                      <div className="flex justify-between pt-1 border-t border-[#D7CCC8]/60 text-[11px]">
                        <span className="text-[#6D4C41]">Paid: <strong className="text-emerald-800">{formatCurrency(term.netPaid)}</strong> / {formatCurrency(term.finalAmount)}</span>
                        <span className="text-amber-800 font-semibold">Remaining Due: {formatCurrency(term.remainingBalance)}</span>
                      </div>

                      {term.payments?.length > 0 && (
                        <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                          {term.payments.map((p: any) => (
                            <button
                              key={p.id}
                              onClick={() => openReceipt(p.id)}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-[#4E342E]/10 hover:bg-[#4E342E] text-[#4E342E] hover:text-white border border-[#D7CCC8] flex items-center gap-1 transition-all"
                            >
                              <Receipt className="w-3 h-3" /> {p.receiptNumber} ({formatCurrency(p.amountPaid)})
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-[#8D6E63] text-xs">No fee terms assigned.</div>
            )}
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {showReceiptModal && activeReceipt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl w-full max-w-xl p-6 space-y-4 shadow-2xl relative my-8">
            <div className="flex items-center justify-between border-b border-[#EFEBE9] pb-3">
              <span className="text-xs font-bold text-[#6D4C41] uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-[#6D4C41]" /> Official Fee Receipt
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-4 h-4" /> Print / PDF
                </button>
                <button onClick={() => setShowReceiptModal(false)} className="text-[#8D6E63] hover:text-[#2D1E18] p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#F7F2EF] border border-[#D7CCC8] text-[#2D1E18] space-y-4 text-xs">
              <div className="flex justify-between border-b border-[#D7CCC8] pb-3">
                <div>
                  <h3 className="font-bold text-[#2D1E18] text-base">{activeReceipt.institute?.name}</h3>
                  <p className="text-[#6D4C41] text-[11px]">{activeReceipt.institute?.phone} &bull; {activeReceipt.institute?.email}</p>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-[#4E342E] block">{activeReceipt.receiptNumber}</span>
                  <span className="text-[#8D6E63] text-[11px] block">{new Date(activeReceipt.receiptDate).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-white p-3 rounded-xl border border-[#D7CCC8]">
                <div>
                  <span className="text-[#8D6E63] text-[10px] uppercase block font-semibold">Student</span>
                  <span className="font-bold text-[#2D1E18]">{activeReceipt.student?.fullName}</span>
                </div>
                <div>
                  <span className="text-[#8D6E63] text-[10px] uppercase block font-semibold">Admission No</span>
                  <span className="font-mono text-[#2D1E18]">{activeReceipt.student?.admissionNumber}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#6D4C41]">Fee Description:</span>
                  <span className="font-semibold text-[#2D1E18]">{activeReceipt.feeDetails?.feeName} ({activeReceipt.feeDetails?.termLabel})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6D4C41]">Total Payable:</span>
                  <span className="text-[#2D1E18]">{formatCurrency(activeReceipt.feeDetails?.totalPayable)}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-800 text-sm">
                  <span>Amount Paid:</span>
                  <span>{formatCurrency(activeReceipt.feeDetails?.amountPaid)}</span>
                </div>
                <div className="flex justify-between font-semibold text-amber-800">
                  <span>Remaining Balance:</span>
                  <span>{formatCurrency(activeReceipt.feeDetails?.remainingBalanceAfter)}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#D7CCC8] text-[10px] text-[#8D6E63] text-center">
                {activeReceipt.disclaimer}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
