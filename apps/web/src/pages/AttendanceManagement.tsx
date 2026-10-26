import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import { Batch } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  QrCode,
  Search,
  Users,
  AlertCircle,
  FileText,
  Send,
  X,
  Edit2,
  RefreshCw,
  Check,
  Phone,
} from 'lucide-react';

export const AttendanceManagement: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Active view tab: 'daily' | 'qr_scan' | 'reports' | 'sms_logs'
  const [viewTab, setViewTab] = useState<'daily' | 'qr_scan' | 'reports' | 'sms_logs'>('daily');

  // QR Modal State
  const [qrStudent, setQrStudent] = useState<{ id: string; name: string; admissionNumber: string; qrToken: string } | null>(null);

  // Scanner Simulator / Code input state
  const [scannedCodeInput, setScannedCodeInput] = useState<string>('');
  const [scannedStudentMatch, setScannedStudentMatch] = useState<any>(null);

  // Correction Modal State
  const [correctionTarget, setCorrectionTarget] = useState<any>(null);
  const [correctionReason, setCorrectionReason] = useState<string>('');
  const [correctionIsLate, setCorrectionIsLate] = useState<boolean>(false);

  // SMS Logs State
  const [smsLogs, setSmsLogs] = useState<any[]>([]);

  // Reports State
  const [reportsData, setReportsData] = useState<any[]>([]);
  const [reportStartDate, setReportStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [reportEndDate, setReportEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Load batches on mount
  useEffect(() => {
    apiFetch('/academics/batches')
      .then((res) => {
        const b = res.data?.batches || [];
        setBatches(b);
        if (b.length > 0 && !selectedBatchId) {
          setSelectedBatchId(b[0].id);
        }
      })
      .catch(console.error);
  }, []);

  // Fetch Attendance Summary
  const fetchSummary = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        ...(selectedBatchId ? { batchId: selectedBatchId } : {}),
        date: selectedDate,
      });
      const res = await apiFetch(`/attendance/summary?${query.toString()}`);
      setAttendanceData(res.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewTab === 'daily') {
      fetchSummary();
    } else if (viewTab === 'sms_logs') {
      apiFetch('/notifications/sms').then((res) => setSmsLogs(res.data?.notifications || [])).catch(console.error);
    } else if (viewTab === 'reports') {
      const q = new URLSearchParams({
        startDate: reportStartDate,
        endDate: reportEndDate,
        ...(selectedBatchId ? { batchId: selectedBatchId } : {}),
      });
      apiFetch(`/attendance/reports?${q.toString()}`).then((res) => setReportsData(res.data?.events || [])).catch(console.error);
    }
  }, [selectedBatchId, selectedDate, viewTab, reportStartDate, reportEndDate]);

  // Handle Check-In
  const handleCheckIn = async (studentId: string, isLate = false) => {
    setActionLoading(studentId);
    setFeedback(null);
    try {
      const res = await apiFetch('/attendance/check-in', {
        method: 'POST',
        body: JSON.stringify({
          studentId,
          batchId: selectedBatchId || undefined,
          isLate,
        }),
      });
      setFeedback({ type: 'success', message: res.message });
      fetchSummary();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Check-Out
  const handleCheckOut = async (studentId: string) => {
    setActionLoading(studentId);
    setFeedback(null);
    try {
      const res = await apiFetch('/attendance/check-out', {
        method: 'POST',
        body: JSON.stringify({ studentId }),
      });
      setFeedback({ type: 'success', message: res.message });
      fetchSummary();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  // Open QR Pass for Student
  const handleShowQrPass = async (studentId: string) => {
    try {
      const res = await apiFetch(`/attendance/students/${studentId}/qr`);
      setQrStudent({
        id: res.data.student.id,
        name: res.data.student.fullName,
        admissionNumber: res.data.student.admissionNumber,
        qrToken: res.data.qrToken,
      });
    } catch (err: any) {
      alert(`Error fetching QR pass: ${err.message}`);
    }
  };

  // QR Scan Validation
  const handleValidateScannedCode = async (codeToVerify?: string) => {
    const token = codeToVerify || scannedCodeInput;
    if (!token) return;
    try {
      const res = await apiFetch('/attendance/qr/scan', {
        method: 'POST',
        body: JSON.stringify({ qrToken: token.trim() }),
      });
      setScannedStudentMatch(res.data);
    } catch (err: any) {
      alert(`Invalid QR code: ${err.message}`);
      setScannedStudentMatch(null);
    }
  };

  // Execute Correction
  const handleSaveCorrection = async () => {
    if (!correctionTarget || !correctionReason) return;
    try {
      await apiFetch(`/attendance/${correctionTarget.eventId}/correction`, {
        method: 'PATCH',
        body: JSON.stringify({
          isLate: correctionIsLate,
          reason: correctionReason,
        }),
      });
      setCorrectionTarget(null);
      setCorrectionReason('');
      fetchSummary();
    } catch (err: any) {
      alert(`Error saving correction: ${err.message}`);
    }
  };

  const records = attendanceData?.records || [];
  const filteredRecords = records.filter((r: any) =>
    r.student.name.toLowerCase().includes(search.toLowerCase()) ||
    r.student.admissionNumber.toLowerCase().includes(search.toLowerCase())
  );

  const counts = attendanceData?.counts || {
    totalStudents: 0,
    presentTotal: 0,
    checkedInCount: 0,
    checkedOutCount: 0,
    lateCount: 0,
    absentCount: 0,
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2D1E18]">Attendance Operations & QR Scanner</h1>
          <p className="text-sm text-[#6D4C41] mt-1">Live check-in/out, automated guardian SMS, and attendance history</p>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-white border border-[#D7CCC8] rounded-xl shadow-sm">
          <button
            onClick={() => setViewTab('daily')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewTab === 'daily' ? 'bg-[#6D4C41] text-white shadow-sm font-bold' : 'text-[#6D4C41] hover:text-[#2D1E18] hover:bg-[#F7F2EF]'
            }`}
          >
            Daily Sheet
          </button>
          <button
            onClick={() => setViewTab('qr_scan')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewTab === 'qr_scan' ? 'bg-[#6D4C41] text-white shadow-sm font-bold' : 'text-[#6D4C41] hover:text-[#2D1E18] hover:bg-[#F7F2EF]'
            }`}
          >
            QR Scanner
          </button>
          <button
            onClick={() => setViewTab('reports')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewTab === 'reports' ? 'bg-[#6D4C41] text-white shadow-sm font-bold' : 'text-[#6D4C41] hover:text-[#2D1E18] hover:bg-[#F7F2EF]'
            }`}
          >
            Reports
          </button>
          <button
            onClick={() => setViewTab('sms_logs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewTab === 'sms_logs' ? 'bg-[#6D4C41] text-white shadow-sm font-bold' : 'text-[#6D4C41] hover:text-[#2D1E18] hover:bg-[#F7F2EF]'
            }`}
          >
            SMS Alerts
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
              : 'bg-rose-50 border border-rose-300 text-rose-800'
          }`}
        >
          <span className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            {feedback.message}
          </span>
          <button onClick={() => setFeedback(null)} className="p-1 text-[#6D4C41] hover:text-[#2D1E18]">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* VIEW: DAILY SHEET */}
      {viewTab === 'daily' && (
        <div className="space-y-6">
          {/* Controls Bar: Batch & Date Picker */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-[#D7CCC8] shadow-sm">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#4E342E]">Class Batch:</span>
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                >
                  <option value="">All Batches</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name} ({b.academicYear})</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#4E342E]">Attendance Date:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>
            </div>

            <div className="w-full sm:w-64 relative">
              <Search className="w-4 h-4 text-[#8D6E63] absolute left-3.5 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search student or roll no..."
                className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl pl-10 pr-4 py-2 text-xs text-[#2D1E18] placeholder-[#A1887F] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
              />
            </div>
          </div>

          {/* Daily Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-4 rounded-2xl bg-white border border-[#D7CCC8] shadow-sm">
              <span className="text-[11px] font-bold uppercase text-[#6D4C41]">Total Enrolled</span>
              <div className="text-2xl font-black text-[#2D1E18] mt-1">{counts.totalStudents}</div>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-[#D7CCC8] shadow-sm">
              <span className="text-[11px] font-bold uppercase text-emerald-800">Present (In)</span>
              <div className="text-2xl font-black text-emerald-800 mt-1">{counts.checkedInCount}</div>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-[#D7CCC8] shadow-sm">
              <span className="text-[11px] font-bold uppercase text-[#4E342E]">Checked Out</span>
              <div className="text-2xl font-black text-[#4E342E] mt-1">{counts.checkedOutCount}</div>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-[#D7CCC8] shadow-sm">
              <span className="text-[11px] font-bold uppercase text-amber-800">Late Arrivals</span>
              <div className="text-2xl font-black text-amber-800 mt-1">{counts.lateCount}</div>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-[#D7CCC8] shadow-sm">
              <span className="text-[11px] font-bold uppercase text-rose-800">Absent</span>
              <div className="text-2xl font-black text-rose-800 mt-1">{counts.absentCount}</div>
            </div>
          </div>

          {/* Student Attendance Table */}
          <div className="bg-white border border-[#D7CCC8] rounded-2xl p-6 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#D7CCC8] text-[#6D4C41] bg-[#F7F2EF] uppercase tracking-wider">
                    <th className="py-3 px-4 font-bold">Student</th>
                    <th className="py-3 px-4 font-bold">Roll No</th>
                    <th className="py-3 px-4 font-bold">Batch</th>
                    <th className="py-3 px-4 font-bold">Check-In</th>
                    <th className="py-3 px-4 font-bold">Check-Out</th>
                    <th className="py-3 px-4 font-bold">Status</th>
                    <th className="py-3 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFEBE9]">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[#6D4C41]">Loading attendance data...</td>
                    </tr>
                  ) : filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[#6D4C41]">No students found for this batch.</td>
                    </tr>
                  ) : (
                    filteredRecords.map((item: any) => {
                      const student = item.student;
                      return (
                        <tr key={student.id} className="hover:bg-[#FDFBF7] transition-colors">
                          <td className="py-3.5 px-4 font-bold text-[#2D1E18] text-sm">
                            {student.name}
                            <div className="text-[11px] font-mono text-[#6D4C41] font-normal">{student.admissionNumber}</div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[#5D4037]">
                            {student.rollNumber || '—'}
                          </td>
                          <td className="py-3.5 px-4 text-[#5D4037]">
                            {student.batchName}
                          </td>
                          <td className="py-3.5 px-4 text-[#5D4037]">
                            {item.checkInTime ? (
                              <div>
                                <span className="font-mono text-emerald-800 font-bold">
                                  {new Date(item.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {item.isLate && (
                                  <span className="ml-1 text-[10px] text-amber-800 bg-amber-50 px-1 py-0.5 rounded border border-amber-300 font-semibold">
                                    Late
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[#A1887F] italic">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-[#5D4037]">
                            {item.checkOutTime ? (
                              <span className="font-mono text-[#4E342E] font-bold">
                                {new Date(item.checkOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            ) : (
                              <span className="text-[#A1887F] italic">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {item.status === 'CHECKED_IN' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
                                Checked In
                              </span>
                            ) : item.status === 'CHECKED_OUT' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#EFEBE9] text-[#4E342E] border border-[#D7CCC8]">
                                Checked Out
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                                Absent
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {item.status === 'ABSENT' && (
                                <>
                                  <button
                                    onClick={() => handleCheckIn(student.id, false)}
                                    disabled={actionLoading === student.id}
                                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[#4E342E] hover:bg-[#3E2723] text-white transition shadow-sm disabled:opacity-50"
                                  >
                                    Check In
                                  </button>
                                  <button
                                    onClick={() => handleCheckIn(student.id, true)}
                                    disabled={actionLoading === student.id}
                                    className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 transition disabled:opacity-50"
                                  >
                                    Late
                                  </button>
                                </>
                              )}

                              {item.status === 'CHECKED_IN' && (
                                <button
                                  onClick={() => handleCheckOut(student.id)}
                                  disabled={actionLoading === student.id}
                                  className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[#6D4C41] hover:bg-[#4E342E] text-white transition shadow-sm disabled:opacity-50"
                                >
                                  Check Out
                                </button>
                              )}

                              {item.eventId && (
                                <button
                                  onClick={() => {
                                    setCorrectionTarget(item);
                                    setCorrectionIsLate(item.isLate);
                                    setCorrectionReason('');
                                  }}
                                  title="Correct Attendance Record"
                                  className="p-1 rounded-lg text-[#6D4C41] hover:text-[#2D1E18] hover:bg-[#F7F2EF] transition"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                onClick={() => handleShowQrPass(student.id)}
                                title="View Student QR Attendance Pass"
                                className="p-1 rounded-lg text-[#6D4C41] hover:text-[#4E342E] hover:bg-[#F7F2EF] transition"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                              </button>
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

      {/* VIEW: QR SCANNER */}
      {viewTab === 'qr_scan' && (
        <div className="max-w-xl mx-auto space-y-6">
          <div className="p-8 rounded-3xl bg-white border border-[#D7CCC8] text-center space-y-4 shadow-xl text-[#2D1E18]">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[#F7F2EF] text-[#4E342E] border border-[#D7CCC8] flex items-center justify-center">
              <QrCode className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#2D1E18]">Student QR Attendance Scanner</h2>
              <p className="text-xs text-[#6D4C41] mt-1">
                Scan or paste student QR pass token to record rapid check-in / check-out
              </p>
            </div>

            {/* Token Input or Scanner Simulation */}
            <div className="pt-2 text-left space-y-3">
              <label className="block text-xs font-semibold text-[#4E342E]">
                Paste / Scan QR Pass Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={scannedCodeInput}
                  onChange={(e) => setScannedCodeInput(e.target.value)}
                  placeholder="TUITION_PASS:student-id:institute-id:signature"
                  className="flex-1 bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] font-mono focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                />
                <button
                  type="button"
                  onClick={() => handleValidateScannedCode()}
                  className="bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-md"
                >
                  Verify
                </button>
              </div>
            </div>

            {/* Matched Student Card */}
            {scannedStudentMatch && (
              <div className="p-5 rounded-2xl bg-[#F7F2EF] border border-[#D7CCC8] text-left space-y-3 mt-4 text-[#2D1E18]">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-[#2D1E18] text-base">{scannedStudentMatch.student.name}</h3>
                    <div className="text-xs text-[#6D4C41] font-mono">Admission: {scannedStudentMatch.student.admissionNumber}</div>
                  </div>
                  <span className="text-xs text-[#4E342E] bg-white px-2.5 py-1 rounded-lg border border-[#D7CCC8] font-semibold">
                    {scannedStudentMatch.student.batchName}
                  </span>
                </div>

                <div className="pt-3 border-t border-[#D7CCC8] flex items-center justify-between">
                  <div className="text-xs text-[#5D4037]">
                    Status Today:{' '}
                    <strong className="text-[#2D1E18]">
                      {scannedStudentMatch.todayStatus.isCheckedOut
                        ? 'Checked Out'
                        : scannedStudentMatch.todayStatus.isCheckedIn
                        ? 'Checked In'
                        : 'Not Checked In'}
                    </strong>
                  </div>

                  {scannedStudentMatch.todayStatus.recommendedAction === 'CHECK_IN' && (
                    <button
                      onClick={async () => {
                        await handleCheckIn(scannedStudentMatch.student.id, false);
                        setScannedStudentMatch(null);
                        setScannedCodeInput('');
                      }}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold px-4 py-1.5 rounded-xl transition shadow-md"
                    >
                      Confirm Check-In
                    </button>
                  )}

                  {scannedStudentMatch.todayStatus.recommendedAction === 'CHECK_OUT' && (
                    <button
                      onClick={async () => {
                        await handleCheckOut(scannedStudentMatch.student.id);
                        setScannedStudentMatch(null);
                        setScannedCodeInput('');
                      }}
                      className="bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-semibold px-4 py-1.5 rounded-xl transition shadow-md"
                    >
                      Confirm Check-Out
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW: REPORTS */}
      {viewTab === 'reports' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-4 p-4 rounded-2xl bg-white border border-[#D7CCC8] shadow-sm">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#4E342E] font-semibold">From:</span>
              <input
                type="date"
                value={reportStartDate}
                onChange={(e) => setReportStartDate(e.target.value)}
                className="bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-1.5 text-xs text-[#2D1E18]"
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#4E342E] font-semibold">To:</span>
              <input
                type="date"
                value={reportEndDate}
                onChange={(e) => setReportEndDate(e.target.value)}
                className="bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-1.5 text-xs text-[#2D1E18]"
              />
            </div>
          </div>

          <div className="bg-white border border-[#D7CCC8] rounded-2xl p-6 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#D7CCC8] text-[#6D4C41] bg-[#F7F2EF] uppercase tracking-wider">
                  <th className="py-3 px-4 font-bold">Date & Time</th>
                  <th className="py-3 px-4 font-bold">Student Name</th>
                  <th className="py-3 px-4 font-bold">Event</th>
                  <th className="py-3 px-4 font-bold">Method</th>
                  <th className="py-3 px-4 font-bold">Marked By</th>
                  <th className="py-3 px-4 font-bold">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFEBE9]">
                {reportsData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#6D4C41]">No events found in this date range.</td>
                  </tr>
                ) : (
                  reportsData.map((ev) => (
                    <tr key={ev.id} className="hover:bg-[#FDFBF7] transition-colors">
                      <td className="py-3 px-4 font-mono text-[#5D4037]">
                        {new Date(ev.eventTime).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#2D1E18]">
                        {ev.student.firstName} {ev.student.lastName}
                        <span className="text-[#6D4C41] font-mono ml-1 font-normal">({ev.student.admissionNumber})</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          ev.eventType === 'CHECK_IN' ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-[#EFEBE9] text-[#4E342E] border border-[#D7CCC8]'
                        }`}>
                          {ev.eventType}
                        </span>
                        {ev.isLate && <span className="ml-1 text-[10px] text-amber-800 bg-amber-50 px-1 py-0.5 rounded border border-amber-300">Late</span>}
                      </td>
                      <td className="py-3 px-4 text-[#5D4037] font-mono">{ev.method}</td>
                      <td className="py-3 px-4 text-[#5D4037]">{ev.markedBy?.fullName}</td>
                      <td className="py-3 px-4 text-[#5D4037]">{ev.remarks || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW: SMS ALERTS LOG */}
      {viewTab === 'sms_logs' && (
        <div className="bg-white border border-[#D7CCC8] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#2D1E18] flex items-center gap-2">
              <Send className="w-5 h-5 text-[#4E342E]" /> Guardian SMS Outbox & Delivery Tracking
            </h2>
            <button
              onClick={() => apiFetch('/notifications/sms').then((res) => setSmsLogs(res.data?.notifications || []))}
              className="text-xs text-[#4E342E] hover:text-[#3E2723] flex items-center gap-1 font-semibold"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#D7CCC8] text-[#6D4C41] bg-[#F7F2EF] uppercase tracking-wider">
                  <th className="py-3 px-4 font-bold">Recipient</th>
                  <th className="py-3 px-4 font-bold">Student</th>
                  <th className="py-3 px-4 font-bold">Message Body</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                  <th className="py-3 px-4 font-bold text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFEBE9]">
                {smsLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#6D4C41]">No SMS records found.</td>
                  </tr>
                ) : (
                  smsLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#FDFBF7] transition-colors">
                      <td className="py-3 px-4 font-mono text-[#5D4037]">
                        {log.parent?.user?.fullName} ({log.phoneNumber})
                      </td>
                      <td className="py-3 px-4 font-bold text-[#2D1E18]">
                        {log.student?.firstName} {log.student?.lastName}
                      </td>
                      <td className="py-3 px-4 text-[#5D4037] max-w-sm truncate" title={log.messageBody}>
                        {log.messageBody}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          log.status === 'SENT' || log.status === 'DELIVERED'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                            : log.status === 'QUEUED'
                            ? 'bg-amber-50 text-amber-800 border border-amber-300'
                            : 'bg-rose-50 text-rose-800 border border-rose-300'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[#6D4C41] text-[11px]">
                        {new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Student QR Pass Modal */}
      {qrStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl w-full max-w-sm p-6 text-center space-y-4 shadow-2xl text-[#2D1E18]">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFEBE9]">
              <h3 className="font-bold text-[#2D1E18] text-base">Student QR Attendance Pass</h3>
              <button onClick={() => setQrStudent(null)} className="text-[#8D6E63] hover:text-[#2D1E18]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-[#F7F2EF] border border-[#D7CCC8] rounded-2xl mx-auto w-fit shadow-sm">
              <QRCodeSVG value={qrStudent.qrToken} size={180} level="H" />
            </div>

            <div>
              <h4 className="font-bold text-[#2D1E18] text-lg">{qrStudent.name}</h4>
              <div className="text-xs text-[#6D4C41] font-mono mt-0.5">Admission: {qrStudent.admissionNumber}</div>
            </div>

            <p className="text-[11px] text-[#6D4C41]">
              Present this pass at the institute scanner to record daily attendance check-in and check-out.
            </p>
          </div>
        </div>
      )}

      {/* Correction Modal */}
      {correctionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl text-[#2D1E18]">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFEBE9]">
              <h3 className="font-bold text-[#2D1E18] text-base">Correct Attendance Record</h3>
              <button onClick={() => setCorrectionTarget(null)} className="text-[#8D6E63] hover:text-[#2D1E18]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-[#5D4037]">
              Correcting record for: <strong className="text-[#2D1E18]">{correctionTarget.student.name}</strong>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs text-[#2D1E18] cursor-pointer">
                <input
                  type="checkbox"
                  checked={correctionIsLate}
                  onChange={(e) => setCorrectionIsLate(e.target.checked)}
                  className="rounded border-[#D7CCC8] text-[#4E342E] focus:ring-[#8D6E63]"
                />
                <span>Marked as Late Arrival</span>
              </label>

              <div>
                <label className="block text-xs font-semibold text-[#4E342E] mb-1">
                  Reason for Correction (Audited)*
                </label>
                <textarea
                  rows={2}
                  required
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="e.g. Student transit delay approved by supervisor"
                  className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCorrectionTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-[#6D4C41] hover:text-[#2D1E18]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCorrection}
                className="bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-md"
              >
                Save Correction
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
