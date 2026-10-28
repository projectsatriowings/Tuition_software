import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { mobileApiFetch } from '../services/api';
import { themeTokens } from '@tuition/shared';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
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
  } | null;
}

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  visible,
  onClose,
  onUnreadCountChange,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterUnread, setFilterUnread] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await mobileApiFetch(`/notifications?limit=30${filterUnread ? '&unreadOnly=true' : ''}`);
      if (res.success && res.data) {
        setNotifications(res.data.notifications || []);
        const count = res.data.unreadCount || 0;
        setUnreadCount(count);
        onUnreadCountChange?.(count);
      }
    } catch (err) {
      console.error('[NotificationModal] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchNotifications();
    }
  }, [visible, filterUnread]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await mobileApiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      const newCount = Math.max(0, unreadCount - 1);
      setUnreadCount(newCount);
      onUnreadCountChange?.(newCount);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await mobileApiFetch('/notifications/mark-all-read', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      onUnreadCountChange?.(0);
    } catch (err) {
      console.error(err);
    }
  };

  const formatKolkataTime = (isoString?: string | null) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(d);
    } catch {
      return '';
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>🔔 In-App Notifications</Text>
            {unreadCount > 0 && (
              <View style={styles.unreadPill}>
                <Text style={styles.unreadPillText}>{unreadCount} unread</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Filter & Action Bar */}
        <View style={styles.actionRow}>
          <View style={styles.filterGroup}>
            <TouchableOpacity
              onPress={() => setFilterUnread(false)}
              style={[styles.filterChip, !filterUnread && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, !filterUnread && styles.filterChipTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFilterUnread(true)}
              style={[styles.filterChip, filterUnread && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, filterUnread && styles.filterChipTextActive]}>
                Unread only
              </Text>
            </TouchableOpacity>
          </View>

          {unreadCount > 0 && (
            <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.markAllBtn}>
              <Text style={styles.markAllBtnText}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* List */}
        {loading && !refreshing ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={themeTokens.colors.primary[800]} />
            <Text style={styles.loadingText}>Loading notifications...</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollList}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            {notifications.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>🔔</Text>
                <Text style={styles.emptyTitle}>No notifications</Text>
                <Text style={styles.emptySubtitle}>
                  Attendance check-in, check-out, and academic updates will appear here.
                </Text>
              </View>
            ) : (
              notifications.map((notif) => {
                const isCheckIn =
                  notif.eventType === 'CHECK_IN' ||
                  notif.title?.includes('Check-in') ||
                  notif.title?.includes('Checked In');
                const isCheckOut =
                  notif.eventType === 'CHECK_OUT' ||
                  notif.title?.includes('Check-out') ||
                  notif.title?.includes('Checked Out');

                return (
                  <TouchableOpacity
                    key={notif.id}
                    onPress={() => !notif.isRead && handleMarkAsRead(notif.id)}
                    style={[styles.card, !notif.isRead && styles.unreadCard]}
                    activeOpacity={0.7}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.badgeRow}>
                        <View
                          style={[
                            styles.typeBadge,
                            isCheckIn
                              ? styles.checkInBadge
                              : isCheckOut
                              ? styles.checkOutBadge
                              : styles.generalBadge,
                          ]}
                        >
                          <Text
                            style={[
                              styles.typeBadgeText,
                              isCheckIn
                                ? styles.checkInBadgeText
                                : isCheckOut
                                ? styles.checkOutBadgeText
                                : styles.generalBadgeText,
                            ]}
                          >
                            {isCheckIn ? '✓ CHECK-IN' : isCheckOut ? '⇥ CHECK-OUT' : 'ℹ ALERT'}
                          </Text>
                        </View>
                        {!notif.isRead && <View style={styles.dot} />}
                      </View>

                      <Text style={styles.timeText}>
                        {notif.timeFormatted || formatKolkataTime(notif.eventTime || notif.createdAt)}
                      </Text>
                    </View>

                    <Text style={styles.cardTitle}>{notif.title}</Text>
                    <Text style={styles.cardMessage}>{notif.message}</Text>

                    {notif.student && (
                      <View style={styles.studentInfoRow}>
                        <Text style={styles.studentName}>
                          Student: {notif.student.firstName} {notif.student.lastName} ({notif.student.admissionNumber})
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F2EF',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#D7CCC8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#2D1E18',
  },
  unreadPill: {
    backgroundColor: '#4E342E',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  unreadPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F7F2EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5D4037',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEBE9',
  },
  filterGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F7F2EF',
  },
  filterChipActive: {
    backgroundColor: '#4E342E',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6D4C41',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  markAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  markAllBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4E342E',
  },
  scrollList: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D7CCC8',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  unreadCard: {
    backgroundColor: '#FFFDFB',
    borderColor: '#6D4C41',
    borderWidth: 1.5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  checkInBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  checkInBadgeText: {
    color: '#065F46',
    fontSize: 10,
    fontWeight: '800',
  },
  checkOutBadge: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  checkOutBadgeText: {
    color: '#92400E',
    fontSize: 10,
    fontWeight: '800',
  },
  generalBadge: {
    backgroundColor: '#F7F2EF',
    borderWidth: 1,
    borderColor: '#D7CCC8',
  },
  generalBadgeText: {
    color: '#4E342E',
    fontSize: 10,
    fontWeight: '800',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#B91C1C',
  },
  timeText: {
    fontSize: 11,
    color: '#8D6E63',
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2D1E18',
    marginBottom: 4,
  },
  cardMessage: {
    fontSize: 13,
    color: '#5D4037',
    lineHeight: 18,
  },
  studentInfoRow: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#EFEBE9',
  },
  studentName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6D4C41',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#8D6E63',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D1E18',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#8D6E63',
    textAlign: 'center',
    lineHeight: 18,
  },
});
