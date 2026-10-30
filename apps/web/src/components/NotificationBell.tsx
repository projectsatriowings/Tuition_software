import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  LogOut,
  Calendar,
  Clock,
  X,
  Volume2,
} from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  eventType?: 'CHECK_IN' | 'CHECK_OUT' | null;
  eventTime?: string | null;
  timeFormatted?: string;
  isRead: boolean;
  createdAt: string;
  student?: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
    photoUrl?: string | null;
  } | null;
}

export const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [filterUnread, setFilterUnread] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await apiFetch(`/notifications?limit=25${filterUnread ? '&unreadOnly=true' : ''}`);
      if (res.success && res.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.error('[NotificationBell] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user, filterUnread]);

  // Real-time SSE Connection
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('tuition_token') || localStorage.getItem('token');
    if (!token) return;

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/notifications/stream?token=${encodeURIComponent(token)}`);

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'NOTIFICATION_CREATED' && payload.data) {
            const newNotif = payload.data;
            setNotifications((prev) => [newNotif, ...prev]);
            setUnreadCount((c) => c + 1);
          }
        } catch (e) {
          // Ignore parse errors on keepalives
        }
      };

      eventSource.onerror = () => {
        // Fallback: will auto-reconnect or use polling
      };
    } catch (err) {
      console.warn('[NotificationBell] SSE setup warning:', err);
    }

    // Periodic poll fallback every 20 seconds
    const pollInterval = setInterval(() => {
      apiFetch('/notifications/unread-count')
        .then((res) => {
          if (res.success && res.data?.unreadCount !== undefined) {
            setUnreadCount(res.data.unreadCount);
          }
        })
        .catch(() => {});
    }, 20000);

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      clearInterval(pollInterval);
    };
  }, [user]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiFetch('/notifications/mark-all-read', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-[#5D4037] hover:text-[#2D1E18] hover:bg-[#F7F2EF] border border-[#D7CCC8]/60 transition-colors focus:outline-none"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 flex items-center justify-center text-[10px] font-black text-white bg-[#B91C1C] rounded-full shadow-md animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-[#D7CCC8] rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-4 border-b border-[#EFEBE9] bg-[#F7F2EF]/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-[#2D1E18]">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#4E342E]/10 text-[#4E342E] border border-[#D7CCC8]">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs font-semibold text-[#6D4C41] hover:text-[#3E2723] flex items-center gap-1 transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-[#EFEBE9] bg-white text-xs">
            <button
              onClick={() => setFilterUnread(false)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                !filterUnread
                  ? 'bg-[#4E342E] text-white shadow-xs'
                  : 'text-[#6D4C41] hover:bg-[#F7F2EF]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterUnread(true)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                filterUnread
                  ? 'bg-[#4E342E] text-white shadow-xs'
                  : 'text-[#6D4C41] hover:bg-[#F7F2EF]'
              }`}
            >
              Unread only
            </button>
          </div>

          {/* Notification List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-[#EFEBE9]">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#8D6E63]">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#8D6E63] space-y-1">
                <Bell className="w-8 h-8 text-[#D7CCC8] mx-auto mb-2" />
                <p className="font-semibold text-[#5D4037]">No notifications yet</p>
                <p className="text-[11px] text-[#8D6E63]">
                  Student check-in, check-out, and academic updates will appear here in real time.
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isCheckIn = notif.eventType === 'CHECK_IN' || notif.title?.includes('Check-in') || notif.title?.includes('Checked In');
                const isCheckOut = notif.eventType === 'CHECK_OUT' || notif.title?.includes('Check-out') || notif.title?.includes('Checked Out');

                return (
                  <div
                    key={notif.id}
                    onClick={() => {
                      if (!notif.isRead) handleMarkAsRead(notif.id);
                      setIsOpen(false);
                      if (notif.link) {
                        window.location.href = notif.link;
                      }
                    }}
                    className={`p-3.5 hover:bg-[#F7F2EF]/70 transition-colors cursor-pointer flex items-start gap-3 ${
                      !notif.isRead ? 'bg-[#F7F2EF]/40 font-medium' : 'bg-white'
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        isCheckIn
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : isCheckOut
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-[#4E342E]/10 text-[#4E342E] border-[#D7CCC8]'
                      }`}
                    >
                      {isCheckIn ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : isCheckOut ? (
                        <LogOut className="w-4 h-4" />
                      ) : (
                        <Bell className="w-4 h-4" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-[#2D1E18] truncate">
                          {notif.title}
                        </span>
                        {!notif.isRead && (
                          <span className="w-2 h-2 rounded-full bg-[#B91C1C] shrink-0" />
                        )}
                      </div>

                      <p className="text-xs text-[#5D4037] mt-0.5 leading-snug break-words">
                        {notif.message}
                      </p>

                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[#8D6E63]">
                        <span className="flex items-center gap-1 font-semibold text-[#4E342E]">
                          <Clock className="w-3 h-3 text-[#6D4C41]" />
                          {notif.timeFormatted ||
                            new Intl.DateTimeFormat('en-IN', {
                              timeZone: 'Asia/Kolkata',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                            }).format(new Date(notif.eventTime || notif.createdAt))}
                        </span>
                        {notif.student && (
                          <span>&bull; {notif.student.firstName}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-[#F7F2EF]/60 border-t border-[#EFEBE9] text-center text-[10px] text-[#8D6E63] font-medium flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Real-time in-app attendance notifications active
          </div>
        </div>
      )}
    </div>
  );
};
