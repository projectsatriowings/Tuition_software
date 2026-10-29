import { PrismaClient, UserRole, AttendanceType } from '@prisma/client';
import { Response } from 'express';

const prisma = new PrismaClient();

// In-memory active SSE subscriber connections: userId -> Set<Response>
const activeSseClients = new Map<string, Set<Response>>();

export class InAppNotificationService {
  /**
   * Register an SSE response stream for a user
   */
  static addSseClient(userId: string, res: Response) {
    if (!activeSseClients.has(userId)) {
      activeSseClients.set(userId, new Set());
    }
    activeSseClients.get(userId)!.add(res);
  }

  /**
   * Remove an SSE response stream for a user
   */
  static removeSseClient(userId: string, res: Response) {
    const clients = activeSseClients.get(userId);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) {
        activeSseClients.delete(userId);
      }
    }
  }

  /**
   * Broadcast an event to connected SSE clients for a specific user
   */
  static broadcastToUser(userId: string, payload: any) {
    const clients = activeSseClients.get(userId);
    if (!clients || clients.size === 0) return;

    const data = `data: ${JSON.stringify(payload)}\n\n`;
    for (const res of clients) {
      try {
        res.write(data);
      } catch (err) {
        // Socket closed or errored
        clients.delete(res);
      }
    }
  }

  /**
   * Format time in Asia/Kolkata timezone (e.g. "04:05 PM")
   */
  static formatKolkataTime(date: Date): string {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
      .format(date)
      .replace(/[\u202F\u00A0\s]+/g, ' ')
      .toUpperCase();
  }

  /**
   * Dispatch push notification to device tokens via Expo Push API
   */
  static async sendPushNotification(token: string, title: string, body: string, dataPayload: any) {
    try {
      if (!token || typeof token !== 'string') {
        return { success: false, error: 'Empty token' };
      }

      // Check for valid Expo push token format
      if (!token.startsWith('ExponentPushToken[') && !token.startsWith('ExpoPushToken[')) {
        // For local development, tests, or mock tokens
        return { success: true, status: 'DELIVERED', mock: true };
      }

      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          to: token,
          sound: 'default',
          title,
          body,
          data: dataPayload,
          priority: 'high',
        }),
      });

      const json: any = await res.json();
      if (res.ok && json.data?.status === 'ok') {
        return { success: true, status: 'DELIVERED' };
      } else {
        return {
          success: false,
          error: json.errors?.[0]?.message || json.data?.message || 'Push gateway rejected payload',
        };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Push dispatch failed' };
    }
  }

  /**
   * Create Attendance In-App and Push Notifications for verified parent(s) and student
   * Formats exact required message strings:
   *   - Check-in: "Your child [Student Name] checked in at [Time]."
   *   - Check-out: "Your child [Student Name] checked out at [Time]."
   */
  static async createAttendanceNotifications(params: {
    attendanceEventId: string;
    studentId: string;
    instituteId: string;
    eventType: 'CHECK_IN' | 'CHECK_OUT';
    eventTime: Date;
    tx?: any;
  }) {
    const db = params.tx || prisma;
    const { attendanceEventId, studentId, instituteId, eventType, eventTime } = params;

    // 1. Fetch Student, active parent relations, and student user account
    const student = await db.student.findUnique({
      where: { id: studentId },
      include: {
        institute: { select: { id: true, name: true } },
        user: { select: { id: true, role: true, isActive: true } },
        parentRelations: {
          include: {
            parent: {
              include: {
                user: { select: { id: true, role: true, isActive: true, fullName: true } },
              },
            },
          },
        },
      },
    });

    if (!student) {
      console.warn(`[InAppNotificationService] Student ${studentId} not found`);
      return [];
    }

    const timeStr = this.formatKolkataTime(eventTime);
    const title = eventType === 'CHECK_IN' ? 'Student Check-in Alert' : 'Student Check-out Alert';
    const studentFullName = `${student.firstName} ${student.lastName}`.trim();

    // Collect eligible recipient accounts with role-specific message formatting
    const recipients: { userId: string; role: UserRole; message: string }[] = [];

    // Linked parents: "Your child [Student Name] checked in at [Time]."
    if (student.parentRelations && student.parentRelations.length > 0) {
      for (const rel of student.parentRelations) {
        if (rel.canReceiveSms !== false && rel.parent?.user?.isActive) {
          recipients.push({
            userId: rel.parent.user.id,
            role: 'PARENT',
            message: eventType === 'CHECK_IN'
              ? `Your child ${studentFullName} checked in at ${timeStr}.`
              : `Your child ${studentFullName} checked out at ${timeStr}.`,
          });
        }
      }
    }

    // Student account (if student has an active login user)
    if (student.user && student.user.isActive) {
      recipients.push({
        userId: student.user.id,
        role: 'STUDENT',
        message: eventType === 'CHECK_IN'
          ? `You checked in at ${timeStr}.`
          : `You checked out at ${timeStr}.`,
      });
    }

    const createdNotifications = [];

    for (const recipient of recipients) {
      const idempotencyKey = `ATT_${attendanceEventId}_USER_${recipient.userId}`;

      // Idempotency: skip if already created for this attendance event & recipient
      const existing = await db.notification.findUnique({
        where: { idempotencyKey },
      });

      if (existing) {
        createdNotifications.push(existing);
        continue;
      }

      // Check device push tokens for push delivery
      const deviceTokens = await prisma.devicePushToken.findMany({
        where: { userId: recipient.userId },
      });

      let pushStatus: 'PENDING' | 'DELIVERED' | 'FAILED' | 'NOT_CONFIGURED' =
        deviceTokens.length > 0 ? 'PENDING' : 'NOT_CONFIGURED';
      let pushError: string | null = null;

      const notif = await db.notification.create({
        data: {
          instituteId,
          userId: recipient.userId,
          role: recipient.role,
          title,
          message: recipient.message,
          type: 'ATTENDANCE',
          studentId,
          attendanceEventId,
          eventType: eventType as AttendanceType,
          eventTime,
          isRead: false,
          pushStatus,
          pushError,
          link: '/attendance',
          idempotencyKey,
        },
      });

      createdNotifications.push(notif);

      // Real-time SSE dispatch to active sessions
      this.broadcastToUser(recipient.userId, {
        type: 'NOTIFICATION_CREATED',
        data: {
          ...notif,
          timeFormatted: timeStr,
        },
      });

      // Also dispatch dedicated ATTENDANCE_RECORDED event for immediate dashboard live update
      this.broadcastToUser(recipient.userId, {
        type: 'ATTENDANCE_RECORDED',
        data: {
          studentId,
          studentName: studentFullName,
          eventType,
          eventTime,
          timeFormatted: timeStr,
          message: recipient.message,
        },
      });

      // Background push delivery if tokens configured
      if (deviceTokens.length > 0) {
        setTimeout(async () => {
          for (const dt of deviceTokens) {
            const pushResult = await this.sendPushNotification(dt.token, title, recipient.message, {
              notificationId: notif.id,
              studentId,
              attendanceEventId,
              eventType,
            });

            await prisma.notification.update({
              where: { id: notif.id },
              data: {
                pushStatus: pushResult.status === 'DELIVERED' ? 'DELIVERED' : 'FAILED',
                pushError: pushResult.error || null,
              },
            }).catch(() => {});
          }
        }, 50);
      }
    }

    return createdNotifications;
  }
}
