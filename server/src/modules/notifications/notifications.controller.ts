import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.js';
import { NotificationService } from './notification.service.js';

const prisma = new PrismaClient();

export async function listSmsNotifications(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) return res.status(400).json({ success: false, error: 'Institute context required' });

    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || '20', 10)));
    const status = req.query.status as any;
    const studentId = req.query.studentId as string;

    const skip = (page - 1) * limit;

    const where: any = { instituteId };
    if (status) where.status = status;
    if (studentId) where.studentId = studentId;

    const [total, notifications] = await Promise.all([
      prisma.smsNotification.count({ where }),
      prisma.smsNotification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true, admissionNumber: true },
          },
          parent: {
            include: {
              user: { select: { id: true, fullName: true, phone: true } },
            },
          },
        },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to list SMS notifications' });
  }
}

export async function getSmsNotificationById(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    const { id } = req.params;

    const notif = await prisma.smsNotification.findFirst({
      where: { id, instituteId },
      include: {
        student: true,
        parent: {
          include: {
            user: { select: { fullName: true, phone: true } },
          },
        },
        attendanceEvent: true,
      },
    });

    if (!notif) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    return res.json({ success: true, data: { notification: notif } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to fetch notification' });
  }
}

export async function retrySmsNotification(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) return res.status(400).json({ success: false, error: 'Institute context required' });
    const { id } = req.params;

    const result = await NotificationService.retryNotification(id, instituteId);
    return res.json({ success: true, message: result.message });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
}

/**
 * List in-app notifications for authenticated user
 */
export async function listInAppNotifications(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const unreadOnly = req.query.unreadOnly === 'true';
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '30', 10)));

    const where: any = { userId };
    if (unreadOnly) {
      where.isRead = false;
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.inAppNotification.findMany({
        where,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.inAppNotification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (err: any) {
    console.error('[List InApp Notifications Error]', err);
    return res.status(500).json({ success: false, error: 'Failed to list in-app notifications' });
  }
}

/**
 * Mark a single in-app notification as read
 */
export async function markInAppNotificationRead(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const notif = await prisma.inAppNotification.findFirst({
      where: { id, userId },
    });

    if (!notif) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    const updated = await prisma.inAppNotification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });

    return res.json({
      success: true,
      data: { notification: updated },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to mark notification as read' });
  }
}

/**
 * Mark all in-app notifications as read
 */
export async function markAllInAppNotificationsRead(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    await prisma.inAppNotification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return res.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to mark all notifications as read' });
  }
}

/**
 * Helper to dispatch an in-app notification
 */
export async function createInAppNotification({
  instituteId,
  userId,
  studentId,
  type,
  title,
  message,
  link,
}: {
  instituteId: string;
  userId: string;
  studentId?: string;
  type: string;
  title: string;
  message: string;
  link?: string;
}) {
  try {
    return await prisma.inAppNotification.create({
      data: {
        instituteId,
        userId,
        studentId: studentId || null,
        type,
        title,
        message,
        link: link || null,
      },
    });
  } catch (err) {
    console.error('[Create In-App Notification Error]', err);
    return null;
  }
}

