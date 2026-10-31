import { markNotificationEntityAsRead } from '../../services/notificationService';
import React, { useEffect, useState, useRef } from 'react';
import { AudioWavePlayer } from '../../components/AudioWavePlayer';
import { fixWebmDuration } from '@fix-webm-duration/fix';
import { apiFetch } from '../../services/api';
import {
  MessageSquare,
  Send,
  User,
  GraduationCap,
  Clock,
  Check,
  CheckCheck,
  AlertCircle,
  Search,
  BookOpen,
  Image as ImageIcon,
  Paperclip,
  Mic,
  Square,
  Volume2,
  FileText,
  Download,
  Loader2,
  X,
} from 'lucide-react';

interface ParentCommunicationViewProps {
  student: any;
}

export const ParentCommunicationView: React.FC<ParentCommunicationViewProps> = ({ student }) => {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState<boolean>(true);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);

  const [activeConversation, setActiveConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [newMessage, setNewMessage] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // File & Voice attachments
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingStartTimeRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  // Lightbox for full image view
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch teachers assigned to student's batch
  useEffect(() => {
    async function loadTeachers() {
      if (!student?.id) return;
      try {
        setLoadingTeachers(true);
        const res = await apiFetch(`/parents/students/${student.id}/teachers`);
        if (res.success && res.data?.teachers) {
          setTeachers(res.data.teachers);
          if (res.data.teachers.length > 0 && !selectedTeacher) {
            handleSelectTeacher(res.data.teachers[0]);
          }
        }
      } catch (err: any) {
        console.error('[Load Teachers Error]', err);
        setError('Failed to load teachers for this class.');
      } finally {
        setLoadingTeachers(false);
      }
    }

    loadTeachers();
  }, [student?.id]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clean up audio recording on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const handleSelectTeacher = async (teacher: any) => {
    setSelectedTeacher(teacher);
    setError(null);
    try {
      setLoadingMessages(true);
      // Retrieve or start conversation with teacher associated with student
      const convRes = await apiFetch('/messaging/conversations', {
        method: 'POST',
        body: JSON.stringify({
          recipientUserId: teacher.userId,
          studentId: student?.id,
          title: `Discussion regarding ${student?.firstName} (${teacher.subjects?.join(', ') || 'Class'})`,
        }),
      });

      if (convRes.success && convRes.data?.conversation) {
        const conv = convRes.data.conversation;
        setActiveConversation(conv);
        markNotificationEntityAsRead('MESSAGE', conv.id);

        // Fetch messages for this conversation
        const msgRes = await apiFetch(`/messaging/conversations/${conv.id}/messages`);
        if (msgRes.success && msgRes.data?.messages) {
          setMessages(msgRes.data.messages);
        }
      }
    } catch (err: any) {
      console.error('[Select Teacher Conversation Error]', err);
      setError(err.message || 'Could not initiate communication with teacher.');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !activeConversation?.id || sending) return;

    const textToSend = newMessage.trim();
    setNewMessage('');

    try {
      setSending(true);
      const res = await apiFetch(`/messaging/conversations/${activeConversation.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          body: textToSend,
        }),
      });

      if (res.success && res.data?.message) {
        setMessages((prev) => [...prev, res.data.message]);
      }
    } catch (err: any) {
      console.error('[Send Message Error]', err);
      setError('Failed to deliver message. Please retry.');
      setNewMessage(textToSend);
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!activeConversation?.id) return;

    try {
      setUploadingAttachment(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await apiFetch(
        `/messaging/conversations/${activeConversation.id}/attachments`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!uploadRes.success || !uploadRes.data) {
        throw new Error(uploadRes.error || 'Failed to upload attachment');
      }

      const att = uploadRes.data;

      const msgRes = await apiFetch(
        `/messaging/conversations/${activeConversation.id}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({
            body: newMessage.trim() || (att.attachmentType === 'AUDIO' ? 'Voice Message' : att.fileName),
            attachmentUrl: att.fileUrl,
            attachmentType: att.attachmentType,
            attachmentName: att.fileName,
            attachmentSize: att.fileSize,
          }),
        }
      );

      if (msgRes.success && msgRes.data?.message) {
        setMessages((prev) => [...prev, msgRes.data.message]);
        setNewMessage('');
      }
    } catch (err: any) {
      console.error('[Upload File Error]', err);
      setError(err.message || 'Failed to send attachment.');
    } finally {
      setUploadingAttachment(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      recordingStartTimeRef.current = Date.now();
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        if (audioChunksRef.current.length > 0) {
          const rawBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const durationMs = Math.max(1000, Date.now() - recordingStartTimeRef.current);
          let finalBlob = rawBlob;
          try {
            finalBlob = await fixWebmDuration(rawBlob, durationMs);
          } catch (fixErr) {
            console.warn('[WebM Duration Fix]', fixErr);
          }
          const audioFile = new File([finalBlob], `voice_note_${Date.now()}.webm`, {
            type: 'audio/webm',
          });
          await handleFileUpload(audioFile);
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Microphone permission denied. Please allow microphone access.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      audioChunksRef.current = [];
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const formatMessageTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? ''
      : new Intl.DateTimeFormat('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          day: 'numeric',
          month: 'short',
        }).format(d);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#2D1E18] flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[#6D4C41]" /> Faculty Communication Channel
        </h2>
        <p className="text-xs text-[#6D4C41] mt-0.5">
          Send direct messages and inquiries to teachers assigned to{' '}
          <strong className="text-[#2D1E18]">{student?.firstName}'s</strong> batch
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[640px]">
        {/* Left: Faculty Directory */}
        <div className="bg-white rounded-3xl border border-[#D7CCC8] shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#EFEBE9] bg-[#F7F2EF]/60">
            <h3 className="text-xs font-bold text-[#4E342E] uppercase tracking-wider">
              Assigned Teachers
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#EFEBE9]">
            {loadingTeachers ? (
              <div className="p-8 text-center text-xs text-[#8D6E63] flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#6D4C41]" />
                <span>Loading teachers...</span>
              </div>
            ) : teachers.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#8D6E63]">
                No teachers currently assigned to {student?.firstName}'s batch.
              </div>
            ) : (
              teachers.map((t) => {
                const isSelected = selectedTeacher?.userId === t.userId;
                return (
                  <div
                    key={t.userId}
                    onClick={() => handleSelectTeacher(t)}
                    className={`p-4 transition-colors cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? 'bg-[#F7F2EF] border-l-4 border-[#4E342E]'
                        : 'hover:bg-[#F7F2EF]/60'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-2xl bg-[#4E342E]/10 text-[#4E342E] flex items-center justify-center font-bold text-sm shrink-0">
                      {t.fullName?.[0] || 'T'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-[#2D1E18] truncate">{t.fullName}</h4>
                      <p className="text-[11px] text-[#6D4C41] truncate">{t.designation}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {t.subjects?.map((sub: string, sIdx: number) => (
                          <span
                            key={sIdx}
                            className="text-[9px] font-semibold bg-[#4E342E]/10 text-[#4E342E] px-1.5 py-0.5 rounded"
                          >
                            {sub}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Active Chat Conversation */}
        <div className="md:col-span-2 bg-white rounded-3xl border border-[#D7CCC8] shadow-sm flex flex-col overflow-hidden">
          {selectedTeacher ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-[#EFEBE9] bg-[#F7F2EF]/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#4E342E] text-white flex items-center justify-center font-bold text-sm">
                    {selectedTeacher.fullName?.[0]}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[#2D1E18]">{selectedTeacher.fullName}</h3>
                    <p className="text-[11px] text-[#6D4C41]">
                      {selectedTeacher.designation} &bull; {selectedTeacher.subjects?.join(', ')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Chat Messages Log */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#FAF8F6]">
                {loadingMessages ? (
                  <div className="p-12 text-center text-xs text-[#8D6E63] flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#6D4C41]" />
                    <span>Loading message history...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="p-12 text-center text-xs text-[#8D6E63] space-y-2">
                    <MessageSquare className="w-8 h-8 mx-auto text-[#BCAAA4]" />
                    <p>No messages yet. Send a message to start the conversation with {selectedTeacher.fullName}.</p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.senderId !== selectedTeacher.userId;
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[80%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm space-y-2 ${
                            isMe
                              ? 'bg-[#4E342E] text-white rounded-tr-none'
                              : 'bg-white text-[#2D1E18] border border-[#D7CCC8] rounded-tl-none'
                          }`}
                        >
                          {/* Image Attachment */}
                          {m.attachmentType === 'IMAGE' && m.attachmentUrl && (
                            <img
                              src={m.attachmentUrl}
                              alt="Attachment"
                              onClick={() => setLightboxImg(m.attachmentUrl)}
                              className="max-h-48 rounded-xl object-cover cursor-pointer hover:opacity-90"
                            />
                          )}

                          {/* Audio Voice Note */}
                          {m.attachmentType === 'AUDIO' && m.attachmentUrl && (
                            <div className="w-full max-w-sm">
                              <AudioWavePlayer
                                src={m.attachmentUrl}
                                title="Voice Note"
                                className="!p-2.5 !rounded-xl !bg-white/80"
                              />
                            </div>
                          )}

                          {/* Document Attachment */}
                          {m.attachmentType === 'DOCUMENT' && m.attachmentUrl && (
                            <a
                              href={`${m.attachmentUrl}?download=true`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-2 p-2 bg-black/10 rounded-xl hover:bg-black/15 transition-colors"
                            >
                              <FileText className="w-4 h-4 shrink-0" />
                              <span className="truncate flex-1 text-[11px] font-semibold">{m.attachmentName || 'Document.pdf'}</span>
                              <Download className="w-3.5 h-3.5 shrink-0" />
                            </a>
                          )}

                          {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}

                          <div
                            className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                              isMe ? 'text-[#D7CCC8]' : 'text-[#8D6E63]'
                            }`}
                          >
                            <span>{formatMessageTime(m.createdAt)}</span>
                            {isMe && <CheckCheck className="w-3 h-3 text-[#D7CCC8]" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Uploading progress indicator */}
              {uploadingAttachment && (
                <div className="px-4 py-1.5 bg-amber-50 border-t border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                  <span>Sending attachment...</span>
                </div>
              )}

              {/* Voice Recording Active Bar */}
              {isRecording ? (
                <div className="p-3 border-t border-[#EFEBE9] bg-gradient-to-r from-rose-50 via-white to-rose-50 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                    <span className="text-xs font-bold text-rose-800 font-mono">
                      Recording: {Math.floor(recordingSeconds / 60)}:{String(recordingSeconds % 60).padStart(2, '0')}
                    </span>
                  </div>

                  {/* Animated Wave Bars */}
                  <div className="flex items-center gap-1 h-6 flex-1 max-w-xs justify-center px-4">
                    {[35, 70, 45, 85, 60, 30, 80, 40, 95, 65, 30, 75, 50, 60, 85, 35].map((h, i) => (
                      <span
                        key={i}
                        style={{
                          height: `${h}%`,
                          animationDelay: `${(i % 5) * 0.12}s`,
                        }}
                        className="w-1 bg-rose-500 rounded-full animate-pulse transition-all"
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button type="button" onClick={cancelRecording} className="px-2.5 py-1 text-xs text-[#6D4C41]">
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm"
                    >
                      Send Voice Note
                    </button>
                  </div>
                </div>
              ) : (
                /* Chat Input Form */
                <form onSubmit={handleSendMessage} className="p-3 border-t border-[#EFEBE9] bg-white flex items-center gap-2">
                  <input
                    type="file"
                    ref={imageInputRef}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleFileUpload(e.target.files[0]);
                        e.target.value = '';
                      }
                    }}
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleFileUpload(e.target.files[0]);
                        e.target.value = '';
                      }
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    title="Attach Image"
                    className="p-2 text-[#8D6E63] hover:text-[#4E342E] rounded-xl hover:bg-[#F7F2EF]"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach Document"
                    className="p-2 text-[#8D6E63] hover:text-[#4E342E] rounded-xl hover:bg-[#F7F2EF]"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={startRecording}
                    title="Record Voice Note"
                    className="p-2 text-[#8D6E63] hover:text-rose-600 rounded-xl hover:bg-[#F7F2EF]"
                  >
                    <Mic className="w-4 h-4" />
                  </button>

                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={`Write message to ${selectedTeacher.fullName}...`}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-[#D7CCC8] text-xs focus:outline-none focus:ring-2 focus:ring-[#4E342E]"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="p-2.5 rounded-xl bg-[#4E342E] hover:bg-[#3E2723] disabled:opacity-50 text-white transition-colors shadow-sm flex items-center justify-center shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#8D6E63] text-xs space-y-2">
              <MessageSquare className="w-10 h-10 text-[#D7CCC8]" />
              <p>Select a faculty teacher from the left directory to view conversations.</p>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxImg && (
        <div
          onClick={() => setLightboxImg(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img src={lightboxImg} alt="Preview" className="max-w-full max-h-[90vh] rounded-2xl object-contain shadow-2xl" />
            <button
              onClick={() => setLightboxImg(null)}
              className="absolute -top-3 -right-3 p-1.5 bg-white rounded-full text-black shadow-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
