import React, { useEffect, useState, useRef } from 'react';
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

  const handleSelectTeacher = async (teacher: any) => {
    setSelectedTeacher(teacher);
    setError(null);
    try {
      setLoadingMessages(true);
      // Retrieve or start conversation with teacher
      const convRes = await apiFetch('/messaging/conversations', {
        method: 'POST',
        body: JSON.stringify({
          recipientUserId: teacher.userId,
          title: `Discussion regarding ${student?.firstName} (${teacher.subjects?.join(', ') || 'Class'})`,
        }),
      });

      if (convRes.success && convRes.data?.conversation) {
        const conv = convRes.data.conversation;
        setActiveConversation(conv);

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation?.id || sending) return;

    try {
      setSending(true);
      const res = await apiFetch(`/messaging/conversations/${activeConversation.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          body: newMessage.trim(),
        }),
      });

      if (res.success && res.data?.message) {
        setMessages((prev) => [...prev, res.data.message]);
        setNewMessage('');
      }
    } catch (err: any) {
      console.error('[Send Message Error]', err);
      setError('Failed to deliver message. Please retry.');
    } finally {
      setSending(false);
    }
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
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px]">
        {/* Left: Class Faculty Directory */}
        <div className="bg-white rounded-3xl border border-[#D7CCC8] shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#EFEBE9]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#6D4C41]">
              Assigned Faculty Teachers ({teachers.length})
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#EFEBE9]">
            {loadingTeachers ? (
              <div className="p-8 text-center text-xs text-[#8D6E63]">Loading faculty list...</div>
            ) : teachers.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#8D6E63]">
                No teachers are currently assigned to this student's class batch.
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
                  <div className="p-12 text-center text-xs text-[#8D6E63]">
                    Loading message history...
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
                          className={`max-w-[80%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                            isMe
                              ? 'bg-[#4E342E] text-white rounded-tr-none'
                              : 'bg-white text-[#2D1E18] border border-[#D7CCC8] rounded-tl-none'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{m.body}</p>
                          <div
                            className={`mt-1.5 flex items-center justify-end gap-1 text-[10px] ${
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

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-[#EFEBE9] bg-white flex items-center gap-2">
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
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#8D6E63] text-xs space-y-2">
              <MessageSquare className="w-10 h-10 text-[#D7CCC8]" />
              <p>Select a faculty teacher from the left directory to view conversations.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
