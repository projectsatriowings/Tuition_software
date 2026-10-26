import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import { QRCodeSVG } from 'qrcode.react';
import { 
  GraduationCap, 
  Calendar, 
  Clock, 
  QrCode, 
  CheckCircle, 
  Building, 
  ShieldCheck, 
  Users, 
  Sparkles,
  CreditCard,
  Receipt,
  Printer,
  X,
} from 'lucide-react';

export const StudentPortal: React.FC = () => {
  const [student, setStudent] = useState<any>(null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [feeStatement, setFeeStatement] = useState<any>(null);
  const [activeReceipt, setActiveReceipt] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStudentData() {
      try {
        setLoading(true);
        const res = await apiFetch('/students/my/profile');
        if (res.success && res.data?.student) {
          const s = res.data.student;
          setStudent(s);

          // Fetch QR Pass
          try {
            const qrRes = await apiFetch(`/attendance/students/${s.id}/qr`);
            if (qrRes.success && qrRes.data?.qrData) {
              setQrCodeData(qrRes.data.qrData);
            }
          } catch (qrErr) {
            console.error('Failed to load QR pass', qrErr);
          }

          // Fetch Student Fee Statement
          try {
            const feeRes = await apiFetch(`/fees/students/${s.id}/statement`);
            if (feeRes.success && feeRes.data) {
              setFeeStatement(feeRes.data);
            }
          } catch (feeErr) {
            console.error('Failed to load fee statement', feeErr);
          }
        } else {
          setError(res.error || 'Student record not found');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    }

    loadStudentData();
  }, []);

  if (loading) {
    return (
      <div className="p-12 text-center text-[#8D6E63] text-sm flex items-center justify-center gap-3">
        <div className="w-4 h-4 rounded-full bg-[#6D4C41] animate-ping"></div>
        <span>Loading Student Portal...</span>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="p-8 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm text-center">
        {error || 'No active student profile linked to this account. Please contact institute administration.'}
      </div>
    );
  }

  const enrollment = student.enrollments?.[0];
  const attendanceEvents = student.attendanceEvents || [];

  return (
    <div className="space-y-6">
      {/* Student Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#3E2723] via-[#4E342E] to-[#6D4C41] border border-[#6D4C41] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 text-white">
        <div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" /> Enrolled Student
            </span>
            <span className="text-xs font-mono text-[#D7CCC8]">
              Admission: <strong className="text-white">{student.admissionNumber}</strong>
            </span>
            {student.rollNumber && (
              <span className="text-xs font-mono text-[#D7CCC8]">
                Roll No: <strong className="text-white">{student.rollNumber}</strong>
              </span>
            )}
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-2">
            {student.firstName} {student.lastName}
          </h1>
          <p className="text-sm text-[#D7CCC8] mt-1 flex items-center gap-2">
            <Building className="w-4 h-4 text-[#BCAAA4]" />
            <span>{student.institute?.name} ({student.institute?.code})</span>
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <span className="text-xs text-[#D7CCC8] block">Class / Batch</span>
            <span className="text-base font-bold text-white block mt-0.5">
              {enrollment?.batch?.name || 'Assigned Batch'}
            </span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-[#6D4C41] border border-[#BCAAA4] text-white flex items-center justify-center font-bold text-xl shadow-md">
            {student.firstName[0]}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Digital QR Attendance Pass */}
        <div className="p-6 rounded-3xl bg-white border border-[#D7CCC8] shadow-sm flex flex-col items-center text-center space-y-4">
          <div className="flex items-center gap-2 text-[#4E342E] font-bold text-sm tracking-wide uppercase">
            <QrCode className="w-4 h-4 text-[#6D4C41]" />
            <span>Personal QR Pass</span>
          </div>

          <div className="p-4 bg-[#F7F2EF] border border-[#D7CCC8] rounded-2xl shadow-inner flex items-center justify-center">
            {qrCodeData ? (
              <QRCodeSVG value={qrCodeData} size={180} level="H" />
            ) : (
              <div className="w-44 h-44 flex items-center justify-center text-[#8D6E63] text-xs">
                Generating QR Pass...
              </div>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-xs font-mono text-[#4E342E] font-semibold">
              Token ID: {student.id.slice(0, 8)}...{student.id.slice(-4)}
            </p>
            <p className="text-[11px] text-[#6D4C41]">
              Scan at the institute terminal kiosk to record check-in and check-out.
            </p>
          </div>

          <div className="pt-2 w-full border-t border-[#EFEBE9] flex items-center justify-center gap-2 text-xs text-emerald-800 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Cryptographically Verified Pass</span>
          </div>
        </div>

        {/* Academic & Attendance & Fees Overview */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-3xl bg-white border border-[#D7CCC8] shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-[#2D1E18] font-bold text-base">
              <GraduationCap className="w-5 h-5 text-[#6D4C41]" />
              <span>Academic & Enrollment Overview</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-[#F7F2EF] border border-[#EFEBE9] space-y-1">
                <span className="text-[11px] text-[#8D6E63] uppercase font-semibold">Institute Information</span>
                <p className="text-sm font-semibold text-[#2D1E18]">{student.institute?.name}</p>
                <p className="text-xs text-[#6D4C41]">{student.institute?.address || 'Main Campus'}</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#F7F2EF] border border-[#EFEBE9] space-y-1">
                <span className="text-[11px] text-[#8D6E63] uppercase font-semibold">Batch & Subject</span>
                <p className="text-sm font-semibold text-[#2D1E18]">{enrollment?.batch?.name || 'Class 10'}</p>
                <p className="text-xs text-[#6D4C41]">{enrollment?.subject?.name || 'Standard Curriculum'}</p>
              </div>
            </div>

            {/* Linked Guardians */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 text-[#2D1E18] font-semibold text-sm">
                <Users className="w-4 h-4 text-[#6D4C41]" />
                <span>Linked Guardians</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {student.parentRelations?.map((rel: any, idx: number) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-[#F7F2EF] border border-[#D7CCC8] flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-[#2D1E18] block">{rel.parent?.user?.fullName || 'Parent'}</span>
                      <span className="text-[#6D4C41] text-[11px] block mt-0.5">
                        {rel.relationship} {rel.isPrimaryContact && '• Primary'}
                      </span>
                    </div>
                    {rel.canReceiveSms && (
                      <span className="px-2 py-0.5 rounded-md bg-[#D7CCC8]/40 text-[#4E342E] border border-[#BCAAA4] text-[10px] font-semibold">
                        SMS Alerts
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Attendance History */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 text-[#2D1E18] font-semibold text-sm">
                <Clock className="w-4 h-4 text-[#6D4C41]" />
                <span>Recent Attendance Activity</span>
              </div>

              {attendanceEvents.length === 0 ? (
                <p className="text-xs text-[#8D6E63] italic p-3 bg-[#F7F2EF] rounded-xl border border-[#EFEBE9]">
                  No attendance scans recorded for this term yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {attendanceEvents.slice(0, 5).map((evt: any, i: number) => (
                    <div key={evt.id || i} className="p-3 rounded-xl bg-[#F7F2EF] border border-[#D7CCC8] flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2 h-2 rounded-full ${evt.eventType === 'CHECK_IN' ? 'bg-emerald-600' : 'bg-amber-600'}`}></span>
                        <span className="font-semibold text-[#2D1E18]">
                          {evt.eventType === 'CHECK_IN' ? 'Check-In' : 'Check-Out'} (Session #{evt.sessionNumber})
                        </span>
                        {evt.isLate && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 border border-amber-300">Late</span>
                        )}
                      </div>
                      <span className="text-[#6D4C41] font-mono text-[11px]">
                        {new Date(evt.eventTime).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Fees & Balance Statement */}
            <div className="space-y-3 pt-4 border-t border-[#EFEBE9]">
              <div className="flex items-center justify-between text-[#2D1E18] font-semibold text-sm">
                <span className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#6D4C41]" />
                  <span>My Tuition Fees & Receipts</span>
                </span>
                {feeStatement?.summary && (
                  <span className="text-xs text-[#6D4C41]">
                    Outstanding Due: <strong className="text-amber-800 font-black">₹{feeStatement.summary.netOutstanding}</strong>
                  </span>
                )}
              </div>

              {feeStatement?.summary && (
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-3 rounded-2xl bg-[#F7F2EF] border border-[#D7CCC8]">
                    <span className="text-[10px] uppercase font-bold text-[#8D6E63] block">Total Payable</span>
                    <span className="font-bold text-[#2D1E18] text-sm">₹{feeStatement.summary.totalPayable}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                    <span className="text-[10px] uppercase font-bold text-emerald-800 block">Total Paid</span>
                    <span className="font-bold text-emerald-800 text-sm">₹{feeStatement.summary.totalPaid}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
                    <span className="text-[10px] uppercase font-bold text-amber-800 block">Balance Due</span>
                    <span className="font-bold text-amber-800 text-sm">₹{feeStatement.summary.netOutstanding}</span>
                  </div>
                </div>
              )}

              {feeStatement?.statementItems?.length > 0 ? (
                <div className="space-y-2">
                  {feeStatement.statementItems.map((item: any) => (
                    <div key={item.id} className="p-3.5 rounded-2xl bg-[#F7F2EF] border border-[#D7CCC8] space-y-2 text-xs">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-bold text-[#2D1E18]">{item.feeStructure?.name}</span>
                          <span className="text-[11px] text-[#6D4C41] block">{item.termLabel} &bull; Due: {new Date(item.dueDate).toLocaleDateString()}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.calculatedStatus === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : item.calculatedStatus === 'PARTIALLY_PAID'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}>
                          {item.calculatedStatus}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-[#D7CCC8]/60 text-[11px]">
                        <span className="text-[#6D4C41]">Paid: <strong className="text-emerald-800">₹{item.netPaid}</strong> / ₹{item.finalAmount}</span>
                        <span className="text-amber-800 font-semibold">Remaining: ₹{item.remainingBalance}</span>
                      </div>

                      {item.payments?.length > 0 && (
                        <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                          {item.payments.map((p: any) => (
                            <button
                              key={p.id}
                              onClick={async () => {
                                try {
                                  const rRes = await apiFetch(`/fees/payments/${p.id}/receipt`);
                                  if (rRes.success && rRes.data?.receipt) {
                                    setActiveReceipt(rRes.data.receipt);
                                    setShowReceiptModal(true);
                                  }
                                } catch (e) {
                                  console.error(e);
                                }
                              }}
                              className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-[#4E342E]/10 hover:bg-[#4E342E] text-[#4E342E] hover:text-white border border-[#D7CCC8] flex items-center gap-1 transition-all"
                            >
                              <Receipt className="w-3 h-3" /> {p.receiptNumber} (₹{p.amountPaid})
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#8D6E63] italic p-3 bg-[#F7F2EF] rounded-xl border border-[#EFEBE9]">
                  No fee terms assigned to your account.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceiptModal && activeReceipt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl w-full max-w-xl p-6 space-y-4 shadow-2xl relative my-8">
            <div className="flex items-center justify-between border-b border-[#EFEBE9] pb-3">
              <span className="text-xs font-bold text-[#6D4C41] uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-[#6D4C41]" /> Fee Receipt
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-4 h-4" /> Print
                </button>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="text-[#8D6E63] hover:text-[#2D1E18] p-1"
                >
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
                  <span className="text-[#2D1E18]">₹{activeReceipt.feeDetails?.totalPayable}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-800 text-sm">
                  <span>Amount Paid:</span>
                  <span>₹{activeReceipt.feeDetails?.amountPaid}</span>
                </div>
                <div className="flex justify-between font-semibold text-amber-800">
                  <span>Remaining Balance:</span>
                  <span>₹{activeReceipt.feeDetails?.remainingBalanceAfter}</span>
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
