import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  MessageSquare,
  Send,
  User,
  Plus,
  Clock,
  ShieldCheck,
  Check,
  Search,
  X,
} from 'lucide-react';

export const MessagingInbox: React.FC = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageBody, setMessageBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Start new conversation modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState('');
  const [convoTitle, setConvoTitle] = useState('');

  useEffect(() => {
    loadConversations();
    loadPotentialRecipients();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  async function loadConversations() {
    try {
      setLoading(true);
      const res = await apiFetch('/messaging/conversations');
      if (res.success) {
        setConversations(res.data.conversations || []);
        if (res.data.conversations?.length > 0 && !selectedConversation) {
          setSelectedConversation(res.data.conversations[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(convId: string) {
    try {
      const res = await apiFetch(`/messaging/conversations/${convId}/messages`);
      if (res.success) {
        setMessages(res.data.messages || []);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function loadPotentialRecipients() {
    try {
      if (user?.role === 'PARENT') {
        // Parents can message staff members
        const res = await apiFetch('/staff');
        if (res.success) {
          const list = (res.data.staff || []).map((s: any) => ({
            id: s.user.id,
            name: `${s.user.fullName} (${s.designation || 'Faculty'})`,
          }));
          setAvailableUsers(list);
        }
      } else if (user?.role === 'STAFF' || user?.role === 'ACADEMIC_ADMIN') {
        // Staff can message parents
        const res = await apiFetch('/parents');
        if (res.success) {
          const list = (res.data.parents || []).map((p: any) => ({
            id: p.user.id,
            name: `${p.user.fullName} (Parent of ${p.studentRelations?.[0]?.student?.firstName || 'Student'})`,
          }));
          setAvailableUsers(list);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedConversation || !messageBody.trim()) return;

    try {
      setSending(true);
      const res = await apiFetch(`/messaging/conversations/${selectedConversation.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: messageBody.trim() }),
      });

      if (res.success && res.data?.message) {
        setMessages((prev) => [...prev, res.data.message]);
        setMessageBody('');
        loadConversations();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  }

  async function handleStartConversation(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRecipientId) return;

    try {
      const res = await apiFetch('/messaging/conversations', {
        method: 'POST',
        body: JSON.stringify({ recipientUserId: selectedRecipientId, title: convoTitle }),
      });

      if (res.success) {
        setShowNewModal(false);
        setSelectedRecipientId('');
        setConvoTitle('');
        await loadConversations();
        setSelectedConversation(res.data.conversation);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to start conversation');
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2D1E18] flex items-center gap-2.5">
            <MessageSquare className="w-7 h-7 text-[#6D4C41]" />
            <span>Direct Messaging & Parent-Teacher Communication</span>
          </h1>
          <p className="text-sm text-[#6D4C41] mt-1">
            Private, authenticated communication channels for academic inquiries and updates
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#4E342E] hover:bg-[#3E2723] text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" /> New Conversation
        </button>
      </div>

      {/* Main Messaging Interface */}
      <div className="bg-white border border-[#D7CCC8] rounded-3xl shadow-sm h-[650px] flex overflow-hidden">
        {/* Left: Conversations List */}
        <div className="w-80 border-r border-[#D7CCC8] flex flex-col bg-[#F7F2EF]/60">
          <div className="p-4 border-b border-[#D7CCC8]">
            <div className="text-xs font-bold uppercase tracking-wider text-[#6D4C41]">
              Active Conversations
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#EFEBE9]">
            {loading ? (
              <div className="p-6 text-center text-xs text-[#8D6E63]">Loading chats...</div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#8D6E63] italic">No conversations yet.</div>
            ) : (
              conversations.map((conv) => {
                const isSelected = selectedConversation?.id === conv.id;
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`w-full p-4 text-left transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'bg-[#4E342E]/10 border-l-4 border-[#4E342E]'
                        : 'hover:bg-white'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#4E342E]/15 text-[#4E342E] border border-[#D7CCC8] flex items-center justify-center font-bold text-sm shrink-0">
                      {conv.otherUser?.fullName?.[0] || 'U'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#2D1E18] text-xs truncate">
                          {conv.otherUser?.fullName || 'Academic Staff'}
                        </span>
                        {conv.isUnread && (
                          <span className="w-2 h-2 rounded-full bg-[#6D4C41] animate-pulse"></span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#6D4C41] block mt-0.5 font-medium">
                        {conv.otherUser?.role}
                      </span>
                      {conv.lastMessage && (
                        <p className="text-[11px] text-[#8D6E63] truncate mt-1">
                          {conv.lastMessage.body}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Messages Thread */}
        <div className="flex-1 flex flex-col bg-[#F7F2EF]/20">
          {selectedConversation ? (
            <>
              {/* Thread Header */}
              <div className="p-4 border-b border-[#D7CCC8] flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#4E342E]/15 text-[#4E342E] border border-[#D7CCC8] flex items-center justify-center font-bold text-sm">
                    {selectedConversation.otherUser?.fullName?.[0] || 'U'}
                  </div>
                  <div>
                    <h3 className="font-bold text-[#2D1E18] text-sm">
                      {selectedConversation.otherUser?.fullName || 'Conversation'}
                    </h3>
                    <span className="text-[11px] text-[#6D4C41]">
                      {selectedConversation.title || 'Direct 1-on-1 Academic Message'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Encrypted Channel</span>
                </div>
              </div>

              {/* Messages Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-[#8D6E63] italic">
                    Start this conversation by sending a message below.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderId === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-md p-3.5 rounded-2xl text-xs space-y-1 ${
                            isMe
                              ? 'bg-[#4E342E] text-white rounded-br-none shadow-sm'
                              : 'bg-white text-[#2D1E18] rounded-bl-none border border-[#D7CCC8] shadow-sm'
                          }`}
                        >
                          <span className="text-[10px] opacity-80 block font-semibold">
                            {msg.sender.fullName}
                          </span>
                          <p className="text-sm leading-relaxed">{msg.body}</p>
                        </div>
                        <span className="text-[10px] text-[#8D6E63] mt-1 px-1 font-mono">
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Message Input Box */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-[#D7CCC8] bg-white flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Type your message here..."
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  className="flex-1 bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-4 py-2.5 text-sm text-[#2D1E18] placeholder-[#8D6E63] focus:outline-none focus:ring-2 focus:ring-[#8D6E63]"
                />
                <button
                  type="submit"
                  disabled={sending || !messageBody.trim()}
                  className="p-2.5 bg-[#4E342E] hover:bg-[#3E2723] text-white rounded-xl shadow-sm disabled:opacity-50 transition-all"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-[#8D6E63] text-sm">
              Select or start a conversation to view messages.
            </div>
          )}
        </div>
      </div>

      {/* New Conversation Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EFEBE9] pb-3">
              <h2 className="text-lg font-bold text-[#2D1E18] flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#6D4C41]" /> Start Direct Message
              </h2>
              <button onClick={() => setShowNewModal(false)} className="text-[#8D6E63] hover:text-[#2D1E18]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleStartConversation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#4E342E] mb-1">
                  Select Recipient *
                </label>
                <select
                  required
                  value={selectedRecipientId}
                  onChange={(e) => setSelectedRecipientId(e.target.value)}
                  className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:ring-2 focus:ring-[#8D6E63]"
                >
                  <option value="">Select participant</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4E342E] mb-1">
                  Conversation Topic (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Science Batch Schedule Inquiry"
                  value={convoTitle}
                  onChange={(e) => setConvoTitle(e.target.value)}
                  className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-sm text-[#2D1E18] focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#EFEBE9]">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-3 py-2 text-xs text-[#6D4C41] hover:bg-[#F7F2EF] rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedRecipientId}
                  className="px-4 py-2 bg-[#4E342E] hover:bg-[#3E2723] text-white rounded-xl text-xs font-semibold shadow-sm"
                >
                  Start Conversation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
