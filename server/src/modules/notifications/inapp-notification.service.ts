import { UserRole, AttendanceType  } from '@prisma/client';
import { prisma } from '../../prisma.js';
import { Response } from 'express';

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
    }).format(date);
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
    const title = eventType === 'CHECK_IN' ? 'Student Checked In' : 'Student Checked Out';
    const message = `${student.firstName} ${eventType === 'CHECK_IN' ? 'checked in' : 'checked out'} at ${timeStr}.`;

    // Collect eligible recipient accounts
    const recipients: { userId: string; role: UserRole }[] = [];

    // Linked parents
    if (student.parentRelations && student.parentRelations.length > 0) {
      for (const rel of student.parentRelations) {
        if (rel.canReceiveSms !== false && rel.parent?.user?.isActive) {
          recipients.push({
            userId: rel.parent.user.id,
            role: 'PARENT',
          });
        }
      }
    }

    // Student account (if student has an active login user)
    if (student.user && student.user.isActive) {
      recipients.push({
        userId: student.user.id,
        role: 'STUDENT',
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
          message: recipient.role === 'PARENT' ? `Your child (${student.firstName}) ${eventType === 'CHECK_IN' ? 'checked in' : 'checked out'} at ${timeStr}.` : message,
          type: 'ATTENDANCE',
          studentId,
          attendanceEventId,
          eventType: eventType as AttendanceType,
          eventTime,
          isRead: false,
          link: '/attendance',
          pushStatus,
          pushError,
          idempotencyKey,
        },
      });

      createdNotifications.push(notif);

      // Real-time SSE dispatch to active sessions
      this.broadcastToUser(recipient.userId, {
        type: 'NOTIFICATION_CREATED',
        data: notif,
      });

      // Background push delivery if tokens configured
      if (deviceTokens.length > 0) {
        setTimeout(async () => {
          for (const dt of deviceTokens) {
            const pushResult = await this.sendPushNotification(dt.token, title, message, {
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

  /**
   * Send in-app notification when an examination schedule is published or rescheduled.
   * Targets all enrolled students in the batch/subject and their linked parents.
   */
  static async notifyExamScheduled(examId: string, isReschedule = false) {
    const exam = await prisma.examination.findUnique({
      where: { id: examId },
      include: {
        batch: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true, code: true } },
      },
    });
    if (!exam) return [];

    const examDateStr = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(exam.examDate));

    const timeStr = exam.startTime ? ` (${exam.startTime}${exam.endTime ? ' - ' + exam.endTime : ''})` : '';
    const title = isReschedule ? `Exam Rescheduled: ${exam.title}` : `New Exam Scheduled: ${exam.title}`;
    const message = `${exam.title} for ${exam.subject.name} in batch ${exam.batch.name} is scheduled on ${examDateStr}${timeStr}. Max Marks: ${Number(exam.totalMarks)}.`;

    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        batchId: exam.batchId,
        isActive: true,
        ...(exam.subjectId ? { OR: [{ subjectId: null }, { subjectId: exam.subjectId }] } : {}),
      },
      include: {
        student: {
          include: {
            user: { select: { id: true, fullName: true } },
            parentRelations: {
              include: {
                parent: {
                  include: {
                    user: { select: { id: true, fullName: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    const notifications = [];
    const notifPrefix = isReschedule ? `EXAM_RESCHED_${exam.id}_${Date.now()}` : `EXAM_SCHED_${exam.id}`;

    for (const e of enrollments) {
      const student = e.student;
      if (student.userId) {
        const idempotencyKey = `${notifPrefix}_STU_${student.userId}`;
        const existing = await prisma.notification.findUnique({ where: { idempotencyKey } });
        if (!existing) {
          const notif = await prisma.notification.create({
            data: {
              instituteId: exam.instituteId,
              userId: student.userId,
              role: 'STUDENT',
              title,
              message,
              type: 'ACADEMIC',
              studentId: student.id,
              link: '/exams',
              idempotencyKey,
            },
          });
          notifications.push(notif);
          this.broadcastToUser(student.userId, { type: 'NOTIFICATION_CREATED', data: notif });
        }
      }

      for (const pr of student.parentRelations) {
        const parentUser = pr.parent?.user;
        if (parentUser?.id) {
          const idempotencyKey = `${notifPrefix}_PAR_${parentUser.id}_STU_${student.id}`;
          const existing = await prisma.notification.findUnique({ where: { idempotencyKey } });
          if (!existing) {
            const notif = await prisma.notification.create({
              data: {
                instituteId: exam.instituteId,
                userId: parentUser.id,
                role: 'PARENT',
                title,
                message: `${student.firstName}'s ${exam.title} (${exam.subject.name}) is scheduled on ${examDateStr}${timeStr}.`,
                type: 'ACADEMIC',
                studentId: student.id,
                link: '/exams',
                idempotencyKey,
              },
            });
            notifications.push(notif);
            this.broadcastToUser(parentUser.id, { type: 'NOTIFICATION_CREATED', data: notif });
          }
        }
      }
    }
    return notifications;
  }

  /**
   * Send in-app notification when results are officially published for an examination.
   */
  static async notifyExamResultsPublished(examId: string) {
    const exam = await prisma.examination.findUnique({
      where: { id: examId },
      include: {
        batch: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        marks: {
          include: {
            student: {
              include: {
                user: { select: { id: true } },
                parentRelations: {
                  include: {
                    parent: {
                      include: {
                        user: { select: { id: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!exam) return [];

    const notifications = [];
    const maxMarks = Number(exam.totalMarks);

    for (const mark of exam.marks) {
      const student = mark.student;
      const scoreText = mark.isAbsent
        ? 'Absent'
        : `${Number(mark.marksObtained)} / ${maxMarks} (${Math.round((Number(mark.marksObtained) / maxMarks) * 100)}%)`;
      const title = `Exam Results Published: ${exam.title}`;
      const studentMsg = `Results for ${exam.title} (${exam.subject.name}) have been published. Your score: ${scoreText}.`;
      const parentMsg = `Results for ${student.firstName}'s ${exam.title} (${exam.subject.name}) have been published. Score: ${scoreText}.`;

      if (student.userId) {
        const idempotencyKey = `EXAM_RES_${exam.id}_STU_${student.userId}`;
        const existing = await prisma.notification.findUnique({ where: { idempotencyKey } });
        if (!existing) {
          const notif = await prisma.notification.create({
            data: {
              instituteId: exam.instituteId,
              userId: student.userId,
              role: 'STUDENT',
              title,
              message: studentMsg,
              type: 'ACADEMIC',
              studentId: student.id,
              link: '/exams',
              idempotencyKey,
            },
          });
          notifications.push(notif);
          this.broadcastToUser(student.userId, { type: 'NOTIFICATION_CREATED', data: notif });
        }
      }

      for (const pr of student.parentRelations) {
        const parentUser = pr.parent?.user;
        if (parentUser?.id) {
          const idempotencyKey = `EXAM_RES_${exam.id}_PAR_${parentUser.id}_STU_${student.id}`;
          const existing = await prisma.notification.findUnique({ where: { idempotencyKey } });
          if (!existing) {
            const notif = await prisma.notification.create({
              data: {
                instituteId: exam.instituteId,
                userId: parentUser.id,
                role: 'PARENT',
                title,
                message: parentMsg,
                type: 'ACADEMIC',
                studentId: student.id,
                link: '/exams',
                idempotencyKey,
              },
            });
            notifications.push(notif);
            this.broadcastToUser(parentUser.id, { type: 'NOTIFICATION_CREATED', data: notif });
          }
        }
      }
    }
    return notifications;
  }

  /**
   * Send in-app notification when an academic progress report is published.
   */
  static async notifyProgressReportPublished(feedbackId: string, isUpdate = false) {
    const feedback = await prisma.progressFeedback.findUnique({
      where: { id: feedbackId },
      include: {
        batch: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        staff: { select: { id: true, fullName: true } },
        student: {
          include: {
            user: { select: { id: true } },
            parentRelations: {
              include: {
                parent: {
                  include: {
                    user: { select: { id: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!feedback) return [];

    const notifications = [];
    const student = feedback.student;
    const subjectName = feedback.subject?.name ? ` - ${feedback.subject.name}` : '';
    const title = isUpdate
      ? `Progress Report Updated: ${feedback.termName}`
      : `New Progress Report: ${feedback.termName}`;

    const studentMsg = `Your academic progress report for ${feedback.termName}${subjectName} is now available. Evaluated by ${feedback.staff.fullName}.`;
    const parentMsg = `Academic progress report for ${student.firstName} (${feedback.termName}${subjectName}) has been published by ${feedback.staff.fullName}.`;
    const notifPrefix = isUpdate ? `PROG_REP_${feedback.id}_${Date.now()}` : `PROG_REP_${feedback.id}`;

    // 1. Notify Student
    if (student.userId) {
      const idempotencyKey = `${notifPrefix}_STU_${student.userId}`;
      const existing = await prisma.notification.findUnique({ where: { idempotencyKey } });
      if (!existing) {
        const notif = await prisma.notification.create({
          data: {
            instituteId: feedback.instituteId,
            userId: student.userId,
            role: 'STUDENT',
            title,
            message: studentMsg,
            type: 'ACADEMIC',
            studentId: student.id,
            link: '/progress_reviews',
            idempotencyKey,
          },
        });
        notifications.push(notif);
        this.broadcastToUser(student.userId, { type: 'NOTIFICATION_CREATED', data: notif });
      }
    }

    // 2. Notify linked Parents
    for (const pr of student.parentRelations) {
      const parentUser = pr.parent?.user;
      if (parentUser?.id) {
        const idempotencyKey = `${notifPrefix}_PAR_${parentUser.id}_STU_${student.id}`;
        const existing = await prisma.notification.findUnique({ where: { idempotencyKey } });
        if (!existing) {
          const notif = await prisma.notification.create({
            data: {
              instituteId: feedback.instituteId,
              userId: parentUser.id,
              role: 'PARENT',
              title,
              message: parentMsg,
              type: 'ACADEMIC',
              studentId: student.id,
              link: '/parent_academics',
              idempotencyKey,
            },
          });
          notifications.push(notif);
          this.broadcastToUser(parentUser.id, { type: 'NOTIFICATION_CREATED', data: notif });
        }
      }
    }

    return notifications;
  }

  /**
   * Send notification to parent when staff replies to their feedback
   */
  static async notifyParentFeedbackReplied(reviewId: string) {
    const review = await prisma.parentReview.findUnique({
      where: { id: reviewId },
      include: {
        parent: { include: { user: { select: { id: true, fullName: true } } } },
        student: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!review || !review.parent?.user?.id) return null;

    const parentUserId = review.parent.user.id;
    const title = `Reply to Your Feedback: ${review.subject || 'Faculty Response'}`;
    const preview = (review.replyText || '').slice(0, 100);
    const message = `Faculty / Administration replied: "${preview}${review.replyText && review.replyText.length > 100 ? '...' : ''}"`;
    const idempotencyKey = `FEEDBACK_REPLY_${review.id}_${Date.now()}`;

    const notif = await prisma.notification.create({
      data: {
        instituteId: review.instituteId,
        userId: parentUserId,
        role: 'PARENT',
        title,
        message,
        type: 'GENERAL',
        studentId: review.studentId || null,
        link: '/progress_reviews',
        idempotencyKey,
      },
    });

    this.broadcastToUser(parentUserId, { type: 'NOTIFICATION_CREATED', data: notif });
    return notif;
  }

  /**
   * Dispatch in-app notification and SSE alert for new chat message
   */
  static async notifyNewChatMessage(params: {
    conversationId: string;
    messageId: string;
    senderId: string;
    senderName: string;
    recipientUserId: string;
    recipientRole: UserRole;
    instituteId: string;
    studentId?: string | null;
    body: string;
    attachmentType?: string | null;
  }) {
    try {
      const {
        conversationId,
        messageId,
        senderId,
        senderName,
        recipientUserId,
        recipientRole,
        instituteId,
        studentId,
        body,
        attachmentType,
      } = params;

      if (!recipientUserId || recipientUserId === senderId) return null;

      let preview = body ? (body.length > 80 ? body.slice(0, 80) + '...' : body) : '';
      if (!preview) {
        if (attachmentType === 'AUDIO') preview = '🎤 Sent a voice message';
        else if (attachmentType === 'IMAGE') preview = '📷 Sent an image attachment';
        else if (attachmentType === 'DOCUMENT') preview = '📄 Sent a document attachment';
        else preview = 'Sent an attachment';
      }

      const title = `Message from ${senderName}`;
      const idempotencyKey = `CHAT_MSG_${messageId}_RECIPIENT_${recipientUserId}`;

      const notif = await prisma.notification.upsert({
        where: { idempotencyKey },
        create: {
          instituteId,
          userId: recipientUserId,
          role: recipientRole,
          title,
          message: preview,
          type: 'MESSAGE',
          studentId: studentId || null,
          link: `/messaging?conversationId=${conversationId}`,
          idempotencyKey,
        },
        update: {},
      });

      this.broadcastToUser(recipientUserId, {
        type: 'NEW_CHAT_MESSAGE',
        conversationId,
        notification: notif,
        messageId,
      });

      return notif;
    } catch (err) {
      console.warn('[notifyNewChatMessage Warning]', err);
      return null;
    }
  }

}
