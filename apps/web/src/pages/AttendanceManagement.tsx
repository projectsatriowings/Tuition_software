import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { apiFetch } from '../services/api';
import { Batch } from '../types';
import { matchStudentVoice, EnrolledStudentCandidate, AttendanceMethod } from '@tuition/shared';
import { useWebSpeechRecognition } from '../hooks/useWebSpeechRecognition';
import {
  Mic,
  MicOff,
  Volume2,
  Calendar,
  CheckCircle2,
  Clock,
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
  Sparkles,
  HelpCircle,
  UserCheck,
} from 'lucide-react';

export const AttendanceManagement: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
    notificationNote?: string;
  } | null>(null);

  // Active view tab: 'voice' (primary) | 'daily' | 'reports' | 'sms_logs'
  const [viewTab, setViewTab] = useState<'voice' | 'daily' | 'reports' | 'sms_logs'>('voice');

  // Confirmation state for voice attendance
  const [pendingVoiceCandidate, setPendingVoiceCandidate] = useState<EnrolledStudentCandidate | null>(null);
  const [candidateOptions, setCandidateOptions] = useState<EnrolledStudentCandidate[]>([]);
  const [manualVoiceInput, setManualVoiceInput] = useState<string>('');
  const [noMatchPhrase, setNoMatchPhrase] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

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
  const fetchSummary = useCallback(async () => {
    if (!selectedBatchId) {
      setAttendanceData({ records: [], counts: { totalStudents: 0, checkedInCount: 0, checkedOutCount: 0, absentCount: 0, lateCount: 0 } });
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setFetchError(null);
      const query = new URLSearchParams({
        batchId: selectedBatchId,
        date: selectedDate,
      });
      const res = await apiFetch(`/attendance/summary?${query.toString()}`);
      setAttendanceData(res.data);
    } catch (err: any) {
      console.error(err);
      setFetchError(err.message || 'Failed to load batch attendance');
    } finally {
      setLoading(false);
    }
  }, [selectedBatchId, selectedDate]);

  useEffect(() => {
    if (viewTab === 'daily' || viewTab === 'voice') {
      fetchSummary();
    } else if (viewTab === 'sms_logs') {
      apiFetch('/notifications/sms')
        .then((res) => setSmsLogs(res.data?.notifications || []))
        .catch(console.error);
    } else if (viewTab === 'reports') {
      const q = new URLSearchParams({
        startDate: reportStartDate,
        endDate: reportEndDate,
        ...(selectedBatchId ? { batchId: selectedBatchId } : {}),
      });
      apiFetch(`/attendance/reports?${q.toString()}`)
        .then((res) => setReportsData(res.data?.events || []))
        .catch(console.error);
    }
  }, [selectedBatchId, selectedDate, viewTab, reportStartDate, reportEndDate, fetchSummary]);

  // Candidates enrolled in the selected batch
  const enrolledCandidates: EnrolledStudentCandidate[] = useMemo(() => {
    if (!attendanceData?.records) return [];
    return attendanceData.records.map((r: any) => ({
      id: r.student.id,
      firstName: r.student.firstName || r.student.name?.split(' ')[0] || '',
      lastName: r.student.lastName || r.student.name?.split(' ').slice(1).join(' ') || '',
      admissionNumber: r.student.admissionNumber,
      rollNumber: r.student.rollNumber,
      phone: r.student.phone,
      photoUrl: r.student.photoUrl,
      status: r.student.status,
    }));
  }, [attendanceData]);

  // Web Speech Recognition Hook
  const handleSpeechResult = useCallback(
    (spokenText: string, isFinal: boolean) => {
      if (!spokenText.trim() || enrolledCandidates.length === 0) return;

      const matchResult = matchStudentVoice(spokenText, enrolledCandidates);

      if (matchResult.status === 'EXACT_SINGLE' || matchResult.status === 'FUZZY_SINGLE') {
        if (matchResult.bestMatch) {
          setPendingVoiceCandidate(matchResult.bestMatch);
          setCandidateOptions([]);
          setNoMatchPhrase(null);
        }
      } else if (matchResult.status === 'EXACT_MULTIPLE' || matchResult.status === 'FUZZY_MULTIPLE') {
        setPendingVoiceCandidate(null);
        const candidates =
          matchResult.exactMatches.length > 0
            ? matchResult.exactMatches
            : matchResult.fuzzyMatches.map((f) => f.student);
        setCandidateOptions(candidates);
        setNoMatchPhrase(null);
      } else {
        setPendingVoiceCandidate(null);
        setCandidateOptions([]);
        setNoMatchPhrase(spokenText);
      }
    },
    [enrolledCandidates]
  );

  const {
    isSupported: isSpeechSupported,
    isListening,
    transcript,
    interimTranscript,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript,
  } = useWebSpeechRecognition({
    lang: 'en-IN',
    continuous: true,
    interimResults: true,
    onResult: handleSpeechResult,
  });

  // Handle manual transcription query if staff types or pastes voice text
  const handleManualVoiceMatch = (text: string) => {
    setManualVoiceInput(text);
    if (!text.trim() || enrolledCandidates.length === 0) {
      setPendingVoiceCandidate(null);
      setCandidateOptions([]);
      setNoMatchPhrase(null);
      return;
    }
    const res = matchStudentVoice(text, enrolledCandidates);
    if (res.status === 'EXACT_SINGLE' || res.status === 'FUZZY_SINGLE') {
      setPendingVoiceCandidate(res.bestMatch);
      setCandidateOptions([]);
      setNoMatchPhrase(null);
    } else if (res.status === 'EXACT_MULTIPLE' || res.status === 'FUZZY_MULTIPLE') {
      setPendingVoiceCandidate(null);
      const candidates =
        res.exactMatches.length > 0 ? res.exactMatches : res.fuzzyMatches.map((f) => f.student);
      setCandidateOptions(candidates);
      setNoMatchPhrase(null);
    } else {
      setPendingVoiceCandidate(null);
      setCandidateOptions([]);
      setNoMatchPhrase(text);
    }
  };

  // Perform Voice-Confirmed Attendance Check-In
  const handleConfirmVoiceAttendance = async (student: EnrolledStudentCandidate) => {
    setActionLoading(student.id);
    setFeedback(null);
    try {
      const idempotencyKey = `VOICE_${student.id}_${selectedBatchId}_${Date.now()}`;
      const res = await apiFetch('/attendance/check-in', {
        method: 'POST',
        body: JSON.stringify({
          studentId: student.id,
          batchId: selectedBatchId || undefined,
          method: 'VOICE_CONFIRMED',
          idempotencyKey,
        }),
      });

      // Clear voice match state
      setPendingVoiceCandidate(null);
      setCandidateOptions([]);
      resetTranscript();
      setManualVoiceInput('');

      setFeedback({
        type: 'success',
        message: `${student.firstName} ${student.lastName} attendance confirmed (VOICE).`,
        notificationNote: 'Mock notification queued for SMS-eligible guardian (Simulated SMS - Dev Mode)',
      });

      fetchSummary();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to record voice attendance check-in',
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Manual Check-In
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
          method: 'MANUAL',
        }),
      });
      setFeedback({
        type: 'success',
        message: res.message,
        notificationNote: 'Mock notification queued for SMS-eligible guardian',
      });
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
        body: JSON.stringify({ studentId, method: 'MANUAL' }),
      });
      setFeedback({
        type: 'success',
        message: res.message,
        notificationNote: 'Mock notification queued for SMS-eligible guardian',
      });
      fetchSummary();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  // Execute Correction
  const handleSaveCorrection = async () => {
    if (!correctionTarget || !correctionReason) return;
    try {
      await apiFetch(`/attendance/${correctionTarget.eventId}/correction`, {
        method: 'PATCH',
        body: JSON.stringify({
          reason: correctionReason,
          isLate: correctionIsLate,
        }),
      });
      setFeedback({ type: 'success', message: 'Attendance correction saved successfully' });
      setCorrectionTarget(null);
      fetchSummary();
    } catch (err: any) {
      alert(`Failed to save correction: ${err.message}`);
    }
  };

  const records = attendanceData?.records || [];
  const counts = attendanceData?.counts || {
    totalStudents: 0,
    checkedInCount: 0,
    checkedOutCount: 0,
    absentCount: 0,
    lateCount: 0,
  };

  const filteredRecords = records.filter((item: any) => {
    const s = item.student;
    const nameMatch = s.name.toLowerCase().includes(search.toLowerCase());
    const rollMatch = s.rollNumber ? s.rollNumber.toLowerCase().includes(search.toLowerCase()) : false;
    const admMatch = s.admissionNumber ? s.admissionNumber.toLowerCase().includes(search.toLowerCase()) : false;
    return nameMatch || rollMatch || admMatch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EFEBE9]">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2D1E18] tracking-tight">Attendance Management</h1>
          <p className="text-sm text-[#6D4C41] mt-1">
            Voice-based attendance, rapid speech recognition, daily roster, and guardian SMS alerts
          </p>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-white border border-[#D7CCC8] rounded-xl shadow-sm">
          <button
            onClick={() => setViewTab('voice')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              viewTab === 'voice'
                ? 'bg-[#4E342E] text-white shadow-sm'
                : 'text-[#6D4C41] hover:text-[#2D1E18] hover:bg-[#F7F2EF]'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Voice Attendance</span>
          </button>
          <button
            onClick={() => setViewTab('daily')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewTab === 'daily'
                ? 'bg-[#4E342E] text-white shadow-sm font-bold'
                : 'text-[#6D4C41] hover:text-[#2D1E18] hover:bg-[#F7F2EF]'
            }`}
          >
            Daily Sheet
          </button>
          <button
            onClick={() => setViewTab('reports')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewTab === 'reports'
                ? 'bg-[#4E342E] text-white shadow-sm font-bold'
                : 'text-[#6D4C41] hover:text-[#2D1E18] hover:bg-[#F7F2EF]'
            }`}
          >
            Reports
          </button>
          <button
            onClick={() => setViewTab('sms_logs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewTab === 'sms_logs'
                ? 'bg-[#4E342E] text-white shadow-sm font-bold'
                : 'text-[#6D4C41] hover:text-[#2D1E18] hover:bg-[#F7F2EF]'
            }`}
          >
            SMS Alerts
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs flex items-start justify-between border shadow-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : feedback.type === 'warning'
              ? 'bg-amber-50 border-amber-300 text-amber-800'
              : 'bg-rose-50 border-rose-300 text-rose-800'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5" />
            )}
            <div>
              <div className="font-bold">{feedback.message}</div>
              {feedback.notificationNote && (
                <div className="text-[11px] font-medium opacity-90 mt-0.5">
                  Notification: {feedback.notificationNote}
                </div>
              )}
            </div>
          </div>
          <button onClick={() => setFeedback(null)} className="p-1 text-[#6D4C41] hover:text-[#2D1E18]">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Controls Bar: Batch & Date Picker */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-[#D7CCC8] shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#4E342E]">Class Batch:</span>
            <select
              value={selectedBatchId}
              onChange={(e) => {
                setSelectedBatchId(e.target.value);
                setPendingVoiceCandidate(null);
                setCandidateOptions([]);
                resetTranscript();
              }}
              className="bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] font-semibold focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.academicYear})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#4E342E]">Attendance Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
            />
          </div>
        </div>

        {/* Daily Stats Pill */}
        <div className="flex items-center gap-3 text-xs font-semibold">
          <span className="text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
            Present: {counts.checkedInCount}
          </span>
          <span className="text-rose-800 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
            Absent: {counts.absentCount}
          </span>
          <span className="text-[#6D4C41] bg-[#F7F2EF] px-2.5 py-1 rounded-lg border border-[#D7CCC8]">
            Total: {counts.totalStudents}
          </span>
        </div>
      </div>

      {/* VIEW: VOICE-BASED ATTENDANCE (PRIMARY WORKFLOW) */}
      {viewTab === 'voice' && (
        <div className="space-y-6">
          {/* Main Voice Panel */}
          <div className="p-6 rounded-3xl bg-white border border-[#D7CCC8] shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#EFEBE9]">
              <div>
                <h2 className="text-lg font-bold text-[#2D1E18] flex items-center gap-2">
                  <Mic className="w-5 h-5 text-[#4E342E]" /> Voice Attendance Assistant
                </h2>
                <p className="text-xs text-[#6D4C41] mt-0.5">
                  Tap "Start Listening", call out the student's name, review match, and confirm check-in.
                </p>
              </div>

              {/* Speech Controls */}
              <div className="flex items-center gap-3">
                {isListening ? (
                  <button
                    onClick={stopListening}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold shadow-md transition animate-pulse"
                  >
                    <MicOff className="w-4 h-4" /> Stop Listening
                  </button>
                ) : (
                  <button
                    onClick={startListening}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-bold shadow-md transition"
                  >
                    <Mic className="w-4 h-4 text-amber-200" /> Start Listening
                  </button>
                )}

                <button
                  onClick={() => {
                    resetTranscript();
                    setPendingVoiceCandidate(null);
                    setCandidateOptions([]);
                    setManualVoiceInput('');
                  }}
                  title="Clear Speech & Matches"
                  className="p-2.5 text-[#6D4C41] hover:text-[#2D1E18] hover:bg-[#FAF7F2] rounded-xl border border-[#D7CCC8] transition"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Listening Status & Browser Support Banner */}
            {!isSpeechSupported && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-800 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <div>
                  <span className="font-bold">Web Speech API is not supported in this browser.</span> Please use
                  Google Chrome or Microsoft Edge for live microphone capture, or use the manual name search box below.
                </div>
              </div>
            )}

            {speechError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>{speechError}</span>
              </div>
            )}

            {/* Status Indicator */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-semibold">
                <span className="text-[#6D4C41]">Microphone Status:</span>
                {isListening ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                    Listening (Indian English: en-IN)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#FAF7F2] text-[#6D4C41] border border-[#D7CCC8]">
                    Microphone Idle (Press "Start Listening")
                  </span>
                )}
              </div>
              <span className="text-[11px] text-[#8D6E63]">
                {enrolledCandidates.length} students enrolled in batch
              </span>
            </div>

            {/* Live Transcript Box */}
            <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#D7CCC8] space-y-1.5">
              <span className="text-[11px] font-bold text-[#6D4C41] uppercase tracking-wider">
                Recognized Speech:
              </span>
              <div className="min-h-[48px] text-sm text-[#2D1E18] font-medium flex items-center">
                {transcript || interimTranscript ? (
                  <div className="space-x-1.5">
                    <span className="font-bold text-[#2D1E18]">{transcript}</span>
                    <span className="italic text-[#8D6E63]">{interimTranscript}</span>
                  </div>
                ) : (
                  <span className="text-[#A1887F] italic text-xs">
                    {isListening
                      ? 'Listening... say a student name (e.g. "Aarav Sharma" or "Priya present")'
                      : 'No speech captured yet. Click "Start Listening" above or type a name below.'}
                  </span>
                )}
              </div>
            </div>

            {/* Manual Name Search / Voice Typing Fallback */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#4E342E]">
                Manual Speech Fallback / Type Student Name:
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-[#8D6E63] absolute left-3.5 top-2.5" />
                <input
                  type="text"
                  value={manualVoiceInput}
                  onChange={(e) => handleManualVoiceMatch(e.target.value)}
                  placeholder="Type student name to simulate voice recognition..."
                  className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl pl-10 pr-4 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>
            </div>

            {/* 0. No Match Feedback Card */}
            {noMatchPhrase && !pendingVoiceCandidate && candidateOptions.length === 0 && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center justify-between animate-in fade-in">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                  <div>
                    <span className="font-bold">No enrolled student in this batch matched speech '{noMatchPhrase}'.</span>
                    <span className="ml-1 text-[#6D4C41]">Please call out the student's name clearly, or select them from the roster below.</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setNoMatchPhrase(null);
                    resetTranscript();
                    setManualVoiceInput('');
                  }}
                  className="text-xs font-bold text-amber-800 hover:text-amber-950 px-2 py-1 rounded-lg border border-amber-300 bg-white"
                >
                  Clear & Try Again
                </button>
              </div>
            )}

            {/* 1. Exactly One Matched Candidate -> Prompt Confirmation */}
            {pendingVoiceCandidate && (
              <div className="p-5 rounded-2xl bg-[#FAF7F2] border-2 border-[#4E342E] shadow-md animate-in fade-in space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {pendingVoiceCandidate.photoUrl ? (
                      <img
                        src={pendingVoiceCandidate.photoUrl.startsWith('http') ? pendingVoiceCandidate.photoUrl : `/api/students/${pendingVoiceCandidate.id}/photo`}
                        alt={pendingVoiceCandidate.firstName}
                        className="w-12 h-12 rounded-2xl object-cover border border-[#D7CCC8]"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-[#4E342E] text-white flex items-center justify-center font-bold text-lg">
                        {pendingVoiceCandidate.firstName[0]}
                        {pendingVoiceCandidate.lastName[0]}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-extrabold text-[#2D1E18]">
                          {pendingVoiceCandidate.firstName} {pendingVoiceCandidate.lastName}
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Matched Candidate
                        </span>
                      </div>
                      <div className="text-xs text-[#6D4C41] mt-0.5 font-mono">
                        Admission No: {pendingVoiceCandidate.admissionNumber}
                        {pendingVoiceCandidate.phone && ` | Phone: ${pendingVoiceCandidate.phone}`}
                      </div>
                    </div>
                  </div>

                  <span className="text-xs text-[#8D6E63] font-semibold bg-white px-2.5 py-1 rounded-lg border border-[#D7CCC8]">
                    Requires Staff Confirmation
                  </span>
                </div>

                <div className="pt-3 border-t border-[#D7CCC8] flex items-center justify-between gap-3">
                  <button
                    onClick={() => {
                      setPendingVoiceCandidate(null);
                      resetTranscript();
                      setManualVoiceInput('');
                    }}
                    className="px-4 py-2 text-xs font-semibold text-[#6D4C41] hover:text-[#2D1E18]"
                  >
                    Cancel / Skip
                  </button>

                  <button
                    onClick={() => handleConfirmVoiceAttendance(pendingVoiceCandidate)}
                    disabled={actionLoading === pendingVoiceCandidate.id}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md transition disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      {actionLoading === pendingVoiceCandidate.id
                        ? 'Confirming...'
                        : `Confirm Check-In for ${pendingVoiceCandidate.firstName}`}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* 2. Multiple Matched Candidates -> Disambiguation List */}
            {candidateOptions.length > 0 && !pendingVoiceCandidate && (
              <div className="p-5 rounded-2xl bg-amber-50 border border-amber-300 space-y-3 animate-in fade-in">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <HelpCircle className="w-4 h-4 text-amber-700" />
                  <span>
                    Multiple students matched speech '{transcript || manualVoiceInput}'. Please tap the intended student:
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {candidateOptions.map((candidate) => (
                    <button
                      key={candidate.id}
                      onClick={() => {
                        setPendingVoiceCandidate(candidate);
                        setCandidateOptions([]);
                        setNoMatchPhrase(null);
                      }}
                      className="p-3 rounded-xl bg-white border border-amber-200 hover:border-[#4E342E] text-left transition flex items-center justify-between group shadow-sm"
                    >
                      <div className="flex items-center gap-2.5">
                        {candidate.photoUrl ? (
                          <img
                            src={candidate.photoUrl.startsWith('http') ? candidate.photoUrl : `/api/students/${candidate.id}/photo`}
                            alt={candidate.firstName}
                            className="w-9 h-9 rounded-xl object-cover border border-[#D7CCC8]"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-[#4E342E] text-white flex items-center justify-center font-bold text-xs">
                            {candidate.firstName[0]}{candidate.lastName[0]}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-xs text-[#2D1E18]">
                            {candidate.firstName} {candidate.lastName}
                          </div>
                          <div className="text-[11px] font-mono text-[#6D4C41] mt-0.5">
                            {candidate.admissionNumber}
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-[#4E342E] group-hover:underline">
                        Select →
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Roster Snapshot with Manual Attendance Fallback */}
          <div className="p-6 rounded-3xl bg-white border border-[#D7CCC8] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#2D1E18]">Today's Batch Roster & Fallback</h3>
                <p className="text-xs text-[#6D4C41]">
                  Direct check-in/out buttons available if voice recognition is unavailable
                </p>
              </div>

              <button
                onClick={fetchSummary}
                className="inline-flex items-center gap-1.5 text-xs text-[#4E342E] font-semibold hover:underline"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh Roster
              </button>
            </div>

            <div className="border border-[#EFEBE9] rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#FAF7F2] border-b border-[#EFEBE9] text-[#6D4C41]">
                    <th className="py-2.5 px-3 font-bold">Student</th>
                    <th className="py-2.5 px-3 font-bold">Admission No</th>
                    <th className="py-2.5 px-3 font-bold">Status</th>
                    <th className="py-2.5 px-3 font-bold text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFEBE9]">
                  {fetchError ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-rose-700 space-y-2">
                        <div>Failed to load batch roster: {fetchError}</div>
                        <button
                          onClick={fetchSummary}
                          className="px-3 py-1 bg-[#4E342E] text-white rounded-lg text-xs font-semibold"
                        >
                          Retry
                        </button>
                      </td>
                    </tr>
                  ) : loading ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-[#6D4C41]">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-[#4E342E]" />
                          <span>Loading batch students...</span>
                        </div>
                      </td>
                    </tr>
                  ) : batches.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-[#6D4C41]">
                        No academic batches found in your institute. Please create a batch first.
                      </td>
                    </tr>
                  ) : filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-[#6D4C41]">
                        No students are enrolled in this batch yet.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((item: any) => {
                      const student = item.student;
                      return (
                        <tr key={student.id} className="hover:bg-[#FDFBF7]">
                          <td className="py-2.5 px-3 font-bold text-[#2D1E18]">
                            <div className="flex items-center gap-2">
                              {student.photoUrl ? (
                                <img
                                  src={student.photoUrl.startsWith('http') ? student.photoUrl : `/api/students/${student.id}/photo`}
                                  alt={student.name}
                                  className="w-6 h-6 rounded-full object-cover border border-[#D7CCC8]"
                                />
                              ) : null}
                              <span>{student.name}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[#6D4C41]">
                            {student.admissionNumber}
                          </td>
                          <td className="py-2.5 px-3">
                            {item.status === 'CHECKED_IN' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                                Checked In
                              </span>
                            ) : item.status === 'CHECKED_OUT' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EFEBE9] text-[#4E342E] border border-[#D7CCC8]">
                                Checked Out
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                                Absent
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {item.status === 'ABSENT' && (
                              <button
                                onClick={() => handleCheckIn(student.id, false)}
                                disabled={actionLoading === student.id}
                                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[#4E342E] hover:bg-[#3E2723] text-white transition shadow-sm disabled:opacity-50"
                              >
                                Check In
                              </button>
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

      {/* VIEW: DAILY SHEET */}
      {viewTab === 'daily' && (
        <div className="space-y-6">
          {/* Search bar */}
          <div className="w-full sm:w-72 relative">
            <Search className="w-4 h-4 text-[#8D6E63] absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student or admission no..."
              className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl pl-10 pr-4 py-2 text-xs text-[#2D1E18] placeholder-[#A1887F] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
            />
          </div>

          {/* Records Table */}
          <div className="rounded-2xl border border-[#D7CCC8] bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#FAF7F2] border-b border-[#EFEBE9] text-[#6D4C41]">
                    <th className="py-3 px-4 font-bold">Student</th>
                    <th className="py-3 px-4 font-bold">Roll / Adm</th>
                    <th className="py-3 px-4 font-bold">Class Batch</th>
                    <th className="py-3 px-4 font-bold">Check-In</th>
                    <th className="py-3 px-4 font-bold">Check-Out</th>
                    <th className="py-3 px-4 font-bold">Status</th>
                    <th className="py-3 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFEBE9]">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[#6D4C41]">
                        Loading attendance data...
                      </td>
                    </tr>
                  ) : filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[#6D4C41]">
                        No students found for this batch.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((item: any) => {
                      const student = item.student;
                      return (
                        <tr key={student.id} className="hover:bg-[#FDFBF7] transition-colors">
                          <td className="py-3.5 px-4 font-bold text-[#2D1E18] text-sm">
                            {student.name}
                            <div className="text-[11px] font-mono text-[#6D4C41] font-normal">
                              {student.admissionNumber}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[#5D4037]">
                            {student.rollNumber || student.admissionNumber}
                          </td>
                          <td className="py-3.5 px-4 text-[#5D4037]">{student.batchName}</td>
                          <td className="py-3.5 px-4 text-[#5D4037]">
                            {item.checkInTime ? (
                              <div>
                                <span className="font-mono text-emerald-800 font-bold">
                                  {new Date(item.checkInTime).toLocaleTimeString('en-IN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
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
                                {new Date(item.checkOutTime).toLocaleTimeString('en-IN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
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

      {/* VIEW: REPORTS */}
      {viewTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-white border border-[#D7CCC8] shadow-sm">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-[#4E342E]">From:</span>
              <input
                type="date"
                value={reportStartDate}
                onChange={(e) => setReportStartDate(e.target.value)}
                className="bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-1.5 text-xs text-[#2D1E18]"
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-[#4E342E]">To:</span>
              <input
                type="date"
                value={reportEndDate}
                onChange={(e) => setReportEndDate(e.target.value)}
                className="bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-1.5 text-xs text-[#2D1E18]"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-[#D7CCC8] bg-white shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#FAF7F2] border-b border-[#EFEBE9] text-[#6D4C41]">
                  <th className="py-3 px-4 font-bold">Date</th>
                  <th className="py-3 px-4 font-bold">Student Name</th>
                  <th className="py-3 px-4 font-bold">Event Type</th>
                  <th className="py-3 px-4 font-bold">Method</th>
                  <th className="py-3 px-4 font-bold">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFEBE9]">
                {reportsData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#6D4C41]">
                      No events found for selected date range.
                    </td>
                  </tr>
                ) : (
                  reportsData.map((ev: any) => (
                    <tr key={ev.id} className="hover:bg-[#FDFBF7]">
                      <td className="py-3 px-4 font-mono">
                        {new Date(ev.eventDate).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#2D1E18]">
                        {ev.student?.firstName} {ev.student?.lastName}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            ev.eventType === 'CHECK_IN'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-neutral-100 text-neutral-800 border-neutral-300'
                          }`}
                        >
                          {ev.eventType}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-[#4E342E]">
                        {ev.method}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#6D4C41]">
                        {new Date(ev.eventTime).toLocaleTimeString('en-IN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW: SMS ALERTS */}
      {viewTab === 'sms_logs' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#D7CCC8] text-xs text-[#6D4C41] flex items-center justify-between">
            <div>
              <span className="font-bold text-[#4E342E]">Parent Notification Outbox:</span> Shows real-time
              attendance SMS status dispatched to eligible guardians.
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
              Mock Provider Mode (Dev/Simulated)
            </span>
          </div>

          <div className="rounded-2xl border border-[#D7CCC8] bg-white shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#FAF7F2] border-b border-[#EFEBE9] text-[#6D4C41]">
                  <th className="py-3 px-4 font-bold">Recipient Phone</th>
                  <th className="py-3 px-4 font-bold">Message Content</th>
                  <th className="py-3 px-4 font-bold">Template</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                  <th className="py-3 px-4 font-bold">Dispatched At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFEBE9]">
                {smsLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#6D4C41]">
                      No notification events found in outbox.
                    </td>
                  </tr>
                ) : (
                  smsLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-[#FDFBF7]">
                      <td className="py-3 px-4 font-mono text-[#2D1E18]">
                        {log.phoneNumber}
                      </td>
                      <td className="py-3 px-4 max-w-sm truncate text-[#4E342E]">
                        {log.messageBody}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#8D6E63]">
                        {log.templateName}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            log.status === 'SENT' || log.status === 'DELIVERED'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : log.status === 'QUEUED'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-rose-50 text-rose-800 border-rose-300'
                          }`}
                        >
                          {log.status === 'SENT' ? 'Simulated Sent' : log.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#8D6E63]">
                        {new Date(log.createdAt).toLocaleTimeString('en-IN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CORRECTION MODAL */}
      {correctionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl w-full max-w-md p-6 shadow-2xl text-[#2D1E18]">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFEBE9]">
              <h2 className="text-lg font-bold text-[#2D1E18]">Correct Attendance Record</h2>
              <button
                onClick={() => setCorrectionTarget(null)}
                className="text-[#8D6E63] hover:text-[#2D1E18] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mt-4 text-xs">
              <div>
                <span className="font-semibold text-[#6D4C41]">Student:</span>{' '}
                <span className="font-bold text-[#2D1E18]">{correctionTarget.student.name}</span>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#4E342E]">
                  <input
                    type="checkbox"
                    checked={correctionIsLate}
                    onChange={(e) => setCorrectionIsLate(e.target.checked)}
                    className="rounded text-[#4E342E] focus:ring-[#8D6E63]"
                  />
                  <span>Mark as Late Arrival</span>
                </label>
              </div>

              <div>
                <label className="block font-bold text-[#4E342E] mb-1">
                  Reason for Correction *
                </label>
                <textarea
                  required
                  rows={3}
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="e.g. Teacher verified voice error or biometric scan issue..."
                  className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl p-3 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-[#EFEBE9]">
                <button
                  type="button"
                  onClick={() => setCorrectionTarget(null)}
                  className="px-4 py-2 font-semibold text-[#6D4C41] hover:text-[#2D1E18]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCorrection}
                  disabled={!correctionReason.trim()}
                  className="bg-[#4E342E] hover:bg-[#3E2723] text-white font-bold px-4 py-2 rounded-xl shadow-md transition disabled:opacity-50"
                >
                  Save Correction
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
