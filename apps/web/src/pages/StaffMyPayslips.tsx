import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/useAuth';
import {
  Receipt,
  Calendar,
  CreditCard,
  Download,
  Printer,
  X,
  CheckCircle2,
  Clock,
  Sparkles,
  Building2,
  User,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

export const StaffMyPayslips: React.FC = () => {
  const { user, activeInstitute } = useAuth();
  const [payslips, setPayslips] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedPayslip, setSelectedPayslip] = useState<any | null>(null);

  const fetchPayslips = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/payroll/my-payslips');
      if (res.success && res.data?.payslips) {
        setPayslips(res.data.payslips);
      }
    } catch (err) {
      console.error('[StaffMyPayslips] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayslips();
  }, []);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#D7CCC8] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#FAF8F5] text-[#4E342E] border border-[#D7CCC8]">
              <Receipt className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-black text-[#2D1E18]">My Salary Payslips</h1>
              <p className="text-xs text-[#6D4C41] mt-0.5">
                View, download, and print your verified monthly compensation statements
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#6D4C41]">Institute:</span>
          <span className="font-bold text-[#2D1E18] bg-[#FAF8F5] px-2.5 py-1 rounded-lg border border-[#D7CCC8]">
            {activeInstitute?.name || 'Tuition Institute'}
          </span>
        </div>
      </div>

      {/* Payslips Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-[#6D4C41] bg-white rounded-2xl border border-[#D7CCC8]">
          <div className="inline-block w-5 h-5 border-2 border-[#4E342E] border-t-transparent rounded-full animate-spin mb-2"></div>
          <div>Loading your salary statements...</div>
        </div>
      ) : payslips.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-[#D7CCC8] space-y-2">
          <div className="w-12 h-12 rounded-full bg-[#FAF8F5] text-[#8D6E63] mx-auto flex items-center justify-center border border-[#D7CCC8]">
            <Receipt className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-[#2D1E18]">No Payslips Issued Yet</h3>
          <p className="text-xs text-[#6D4C41] max-w-sm mx-auto">
            Your monthly salary payslips will appear here once approved by the institute academic admin.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {payslips.map((ps) => {
            const isPaid = ps.record?.paymentStatus === 'PAID';
            return (
              <div
                key={ps.id}
                className="bg-white border border-[#D7CCC8] rounded-2xl p-5 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#EFEBE9]">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#8D6E63]" />
                      <span className="font-bold text-sm text-[#2D1E18]">
                        {getMonthName(ps.month)} {ps.year}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isPaid
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {ps.record?.paymentStatus || 'APPROVED'}
                    </span>
                  </div>

                  <div className="pt-3 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#6D4C41]">Payslip Ref:</span>
                      <span className="font-mono font-bold text-[#2D1E18] text-[11px]">{ps.payslipNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6D4C41]">Gross Salary:</span>
                      <span className="font-semibold text-[#2D1E18]">{formatCurrency(ps.record?.grossPay)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6D4C41]">Deductions:</span>
                      <span className="font-semibold text-rose-700">-{formatCurrency(ps.record?.totalDeductions)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-[#EFEBE9] items-center">
                      <span className="font-bold text-[#4E342E]">Net Payable:</span>
                      <span className="text-base font-black text-emerald-800">
                        {formatCurrency(ps.record?.netPayable)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedPayslip(ps)}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#FAF8F5] text-[#4E342E] border border-[#D7CCC8] hover:bg-[#4E342E] hover:text-white rounded-xl text-xs font-semibold transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>View & Print Payslip</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-auto" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Printable Payslip Modal */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:p-0 print:bg-white">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl space-y-6 print:border-none print:shadow-none print:max-h-none print:p-0">
            {/* Modal Actions Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#EFEBE9] print:hidden">
              <span className="text-xs font-bold text-[#6D4C41]">Official Payslip Statement</span>
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
                  onClick={() => setSelectedPayslip(null)}
                  className="p-1.5 text-[#8D6E63] hover:text-[#2D1E18] rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Formal Payslip Template */}
            <div className="space-y-6 font-sans">
              {/* Institute Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-[#4E342E] pb-4 gap-2">
                <div>
                  <h2 className="text-xl font-black text-[#2D1E18] tracking-tight">
                    {selectedPayslip.snapshotJson?.institute?.name || activeInstitute?.name || 'Tuition Institute'}
                  </h2>
                  <p className="text-xs text-[#6D4C41]">
                    {selectedPayslip.snapshotJson?.institute?.address || 'TuitionOS Academic Center'}
                  </p>
                  <p className="text-[11px] text-[#8D6E63]">
                    Phone: {selectedPayslip.snapshotJson?.institute?.phone || 'N/A'} &bull; Email:{' '}
                    {selectedPayslip.snapshotJson?.institute?.email || 'N/A'}
                  </p>
                </div>
                <div className="sm:text-right">
                  <span className="text-xs font-mono font-bold text-[#4E342E] block">
                    {selectedPayslip.payslipNumber}
                  </span>
                  <span className="text-[11px] text-[#6D4C41] block mt-0.5">
                    Pay Period: {getMonthName(selectedPayslip.month)} {selectedPayslip.year}
                  </span>
                  <span className="text-[10px] text-[#8D6E63] block">
                    Issued: {new Date(selectedPayslip.issueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>

              {/* Employee Summary Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#FAF8F5] p-3.5 rounded-xl border border-[#D7CCC8] text-xs">
                <div>
                  <span className="text-[#8D6E63] text-[10px] uppercase font-bold block">Staff Name</span>
                  <span className="font-bold text-[#2D1E18]">
                    {selectedPayslip.snapshotJson?.staff?.name || user?.fullName}
                  </span>
                </div>
                <div>
                  <span className="text-[#8D6E63] text-[10px] uppercase font-bold block">Employee Code</span>
                  <span className="font-mono font-bold text-[#2D1E18]">
                    {selectedPayslip.snapshotJson?.staff?.employeeCode || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[#8D6E63] text-[10px] uppercase font-bold block">Designation</span>
                  <span className="font-medium text-[#2D1E18]">
                    {selectedPayslip.snapshotJson?.staff?.designation || 'Faculty'}
                  </span>
                </div>
                <div>
                  <span className="text-[#8D6E63] text-[10px] uppercase font-bold block">Department</span>
                  <span className="font-medium text-[#2D1E18]">
                    {selectedPayslip.snapshotJson?.staff?.department || 'General'}
                  </span>
                </div>
              </div>

              {/* Attendance Details */}
              <div className="border border-[#EFEBE9] rounded-xl p-3 bg-white text-xs">
                <span className="text-[10px] uppercase font-bold text-[#8D6E63] tracking-wider block mb-1.5">
                  Verified Attendance Record
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-[11px]">
                  <div className="bg-[#FAF8F5] p-1.5 rounded-lg border border-[#EFEBE9]">
                    <span className="text-[#6D4C41] block text-[10px]">Calendar Days</span>
                    <span className="font-bold text-[#2D1E18]">
                      {selectedPayslip.snapshotJson?.attendance?.calendarDays || 30}
                    </span>
                  </div>
                  <div className="bg-[#FAF8F5] p-1.5 rounded-lg border border-[#EFEBE9]">
                    <span className="text-[#6D4C41] block text-[10px]">Worked Days</span>
                    <span className="font-bold text-emerald-800">
                      {selectedPayslip.snapshotJson?.attendance?.workedDays || 0}
                    </span>
                  </div>
                  <div className="bg-[#FAF8F5] p-1.5 rounded-lg border border-[#EFEBE9]">
                    <span className="text-[#6D4C41] block text-[10px]">On-site Days</span>
                    <span className="font-bold text-[#2D1E18]">
                      {selectedPayslip.snapshotJson?.attendance?.onSiteDays || 0}
                    </span>
                  </div>
                  <div className="bg-[#FAF8F5] p-1.5 rounded-lg border border-[#EFEBE9]">
                    <span className="text-[#6D4C41] block text-[10px]">WFH Days</span>
                    <span className="font-bold text-cyan-800">
                      {selectedPayslip.snapshotJson?.attendance?.wfhDays || 0}
                    </span>
                  </div>
                  <div className="bg-[#FAF8F5] p-1.5 rounded-lg border border-[#EFEBE9]">
                    <span className="text-[#6D4C41] block text-[10px]">Paid Leave</span>
                    <span className="font-bold text-[#2D1E18]">
                      {selectedPayslip.snapshotJson?.attendance?.paidLeaveDays || 0}
                    </span>
                  </div>
                  <div className="bg-[#FAF8F5] p-1.5 rounded-lg border border-[#EFEBE9]">
                    <span className="text-[#6D4C41] block text-[10px]">Late Days</span>
                    <span className="font-bold text-amber-800">
                      {selectedPayslip.snapshotJson?.attendance?.lateDays || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Earnings & Deductions Table */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Earnings */}
                <div className="border border-[#D7CCC8] rounded-xl overflow-hidden text-xs">
                  <div className="bg-[#FAF8F5] px-3 py-2 border-b border-[#D7CCC8] font-bold text-[#4E342E] flex justify-between">
                    <span>Earnings</span>
                    <span>Amount (₹)</span>
                  </div>
                  <div className="divide-y divide-[#EFEBE9]">
                    {(selectedPayslip.snapshotJson?.financials?.calculationBreakdown?.earnings || []).map((e: any, idx: number) => (
                      <div key={idx} className="px-3 py-2 flex justify-between">
                        <span className="text-[#2D1E18]">{e.name}</span>
                        <span className="font-mono font-bold text-[#2D1E18]">{formatCurrency(e.amount)}</span>
                      </div>
                    ))}
                    <div className="px-3 py-2 bg-[#FAF8F5] font-bold text-[#2D1E18] flex justify-between border-t border-[#D7CCC8]">
                      <span>Total Gross Salary</span>
                      <span>{formatCurrency(selectedPayslip.snapshotJson?.financials?.grossPay)}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div className="border border-[#D7CCC8] rounded-xl overflow-hidden text-xs">
                  <div className="bg-[#FAF8F5] px-3 py-2 border-b border-[#D7CCC8] font-bold text-[#4E342E] flex justify-between">
                    <span>Deductions</span>
                    <span>Amount (₹)</span>
                  </div>
                  <div className="divide-y divide-[#EFEBE9]">
                    {(selectedPayslip.snapshotJson?.financials?.calculationBreakdown?.deductions || []).length === 0 ? (
                      <div className="px-3 py-4 text-center text-[#8D6E63] italic">Zero Deductions Applied</div>
                    ) : (
                      (selectedPayslip.snapshotJson?.financials?.calculationBreakdown?.deductions || []).map((d: any, idx: number) => (
                        <div key={idx} className="px-3 py-2 flex justify-between">
                          <span className="text-[#2D1E18]">{d.name}</span>
                          <span className="font-mono font-bold text-rose-700">-{formatCurrency(d.amount)}</span>
                        </div>
                      ))
                    )}
                    <div className="px-3 py-2 bg-[#FAF8F5] font-bold text-[#2D1E18] flex justify-between border-t border-[#D7CCC8]">
                      <span>Total Deductions</span>
                      <span className="text-rose-700">-{formatCurrency(selectedPayslip.snapshotJson?.financials?.totalDeductions)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Payable Banner */}
              <div className="p-4 bg-[#FAF8F5] border-2 border-[#4E342E] rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] uppercase font-bold text-[#6D4C41] block">Net Salary Payable</span>
                  <span className="text-xl sm:text-2xl font-black text-emerald-800">
                    {formatCurrency(selectedPayslip.snapshotJson?.financials?.netPayable)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                    <ShieldCheck className="w-3.5 h-3.5" /> Approved & Verified
                  </span>
                </div>
              </div>

              {/* Footer Stamp */}
              <div className="pt-4 border-t border-[#D7CCC8] flex justify-between items-center text-[10px] text-[#8D6E63]">
                <div>This is a computer-generated document under TuitionOS payroll architecture.</div>
                <div>Page 1 of 1</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

