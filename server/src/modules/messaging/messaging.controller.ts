import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../middleware/auth.js';
import { InAppNotificationService } from '../notifications/inapp-notification.service.js';

const prisma = new PrismaClient();

export const startConversationSchema = z.object({
  recipientUserId: z.string().uuid('Valid recipient user ID required'),
  title: z.string().max(100).optional(),
});

export const sendMessageSchema = z.object({
  body: z.string().min(1, 'Message body cannot be empty').max(2000),
  attachmentUrl: z.string().optional(),
});

/**
 * Start or retrieve existing 1-on-1 conversation with relationship validation
 */
export async function getOrCreateConversation(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) return res.status(400).json({ success: false, error: 'Institute context required' });

    const currentUserId = req.user!.userId;
    const currentUserRole = req.user!.role;

    const parse = startConversationSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: parse.error.errors });
    }

    const { recipientUserId, title } = parse.data;

    if (recipientUserId === currentUserId) {
      return res.status(400).json({ success: false, error: 'Cannot start conversation with yourself' });
    }

    // Verify recipient has active membership in the same institute
    const recipientMembership = await prisma.instituteMembership.findFirst({
      where: { instituteId, userId: recipientUserId, isActive: true },
      include: { user: { select: { id: true, fullName: true, role: true } } },
    });
    if (!recipientMembership) {
      return res.status(404).json({ success: false, error: 'Recipient is not an active member of this institute' });
    }

    const recipientRole = recipientMembership.user.role;

    // Authorization checks:
    // 1. If caller is PARENT, they can only message staff assigned to their child's batch/subject
    if (currentUserRole === 'PARENT') {
      const parentProfile = await prisma.parentProfile.findFirst({
        where: { userId: currentUserId },
        include: {
          studentRelations: {
            include: {
              student: {
                include: {
                  enrollments: { where: { isActive: true }, select: { batchId: true, subjectId: true } },
                },
              },
            },
          },
        },
      });

      if (!parentProfile) {
        return res.status(404).json({ success: false, error: 'Parent profile not found' });
      }

      // Collect batch IDs and subject IDs of all children of this parent
      const childBatchIds = new Set<string>();
      const childSubjectIds = new Set<string>();
      for (const rel of parentProfile.studentRelations) {
        for (const enr of rel.student.enrollments) {
          if (enr.batchId) childBatchIds.add(enr.batchId);
          if (enr.subjectId) childSubjectIds.add(enr.subjectId);
        }
      }

      // Check if recipient is a staff member teaching any of these batches
      const staffProfile = await prisma.staffProfile.findFirst({
        where: { userId: recipientUserId, instituteId },
        include: {
          assignments: true,
          batchSubjects: true,
        },
      });

      const teachesChild =
        recipientRole === 'SUPER_ADMIN' ||
        recipientRole === 'ACADEMIC_ADMIN' ||
        (staffProfile &&
          (staffProfile.assignments.some((a) => childBatchIds.has(a.batchId)) ||
            staffProfile.batchSubjects.some((bs) => childBatchIds.has(bs.batchId))));

      if (!teachesChild) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: You can only message teachers assigned to your child’s classes',
        });
      }
    }

    // 2. If caller is STAFF and recipient is PARENT, verify staff teaches at least one child of that parent
    if (currentUserRole === 'STAFF' && recipientRole === 'PARENT') {
      const staffProfile = await prisma.staffProfile.findFirst({
        where: { userId: currentUserId, instituteId },
        include: { assignments: true, batchSubjects: true },
      });

      const staffBatchIds = new Set<string>();
      if (staffProfile) {
        staffProfile.assignments.forEach((a) => staffBatchIds.add(a.batchId));
        staffProfile.batchSubjects.forEach((bs) => staffBatchIds.add(bs.batchId));
      }

      const parentProfile = await prisma.parentProfile.findFirst({
        where: { userId: recipientUserId },
        include: {
          studentRelations: {
            include: {
              student: {
                include: {
                  enrollments: { where: { isActive: true }, select: { batchId: true } },
                },
              },
            },
          },
        },
      });

      const isAssigned = parentProfile?.studentRelations.some((rel) =>
        rel.student.enrollments.some((e) => staffBatchIds.has(e.batchId))
      );

      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: You can only message parents of students in your assigned batches',
        });
      }
    }

    // Check if 1-on-1 conversation already exists between these 2 users
    const existing = await prisma.conversation.findFirst({
      where: {
        instituteId,
        isGroup: false,
        AND: [
          { members: { some: { userId: currentUserId } } },
          { members: { some: { userId: recipientUserId } } },
        ],
      },
      include: {
        members: { include: { user: { select: { id: true, fullName: true, role: true } } } },
      },
    });

    if (existing) {
      return res.json({
        success: true,
        message: 'Existing conversation retrieved',
        data: { conversation: existing },
      });
    }

    // Create new conversation and add both members
    const conversation = await prisma.conversation.create({
      data: {
        instituteId,
        title: title?.trim() || null,
        isGroup: false,
        members: {
          create: [
            { userId: currentUserId, lastReadAt: new Date() },
            { userId: recipientUserId, lastReadAt: null },
          ],
        },
      },
      include: {
        members: { include: { user: { select: { id: true, fullName: true, role: true } } } },
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Conversation started successfully',
      data: { conversation },
    });
  } catch (err: any) {
    console.error('[Start Conversation Error]', err);
    return res.status(500).json({ success: false, error: 'Failed to initiate conversation' });
  }
}

/**
 * List conversations for the logged in user with genuine unread status
 */
export async function listUserConversations(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) return res.status(400).json({ success: false, error: 'Institute context required' });

    const currentUserId = req.user!.userId;

    const conversations = await prisma.conversation.findMany({
      where: {
        instituteId,
        members: { some: { userId: currentUserId } },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, fullName: true, role: true } },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: { sender: { select: { id: true, fullName: true } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const formatted = conversations.map((conv) => {
      const otherMembers = conv.members.filter((m) => m.userId !== currentUserId);
      const myMembership = conv.members.find((m) => m.userId === currentUserId);
      const lastMessage = conv.messages[0] || null;
      const isUnread =
        lastMessage &&
        lastMessage.senderId !== currentUserId &&
        (!myMembership?.lastReadAt || new Date(myMembership.lastReadAt) < new Date(lastMessage.createdAt));

      return {
        id: conv.id,
        title: conv.title,
        isGroup: conv.isGroup,
        updatedAt: conv.updatedAt,
        otherUser: otherMembers[0]?.user || null,
        lastMessage: lastMessage
          ? {
              body: lastMessage.body,
              senderName: lastMessage.sender.fullName,
              createdAt: lastMessage.createdAt,
            }
          : null,
        isUnread: Boolean(isUnread),
      };
    });

    return res.json({ success: true, data: { conversations: formatted } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to list conversations' });
  }
}

/**
 * Get messages in a conversation and mark as read
 */
export async function getConversationMessages(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) return res.status(400).json({ success: false, error: 'Institute context required' });

    const { id: conversationId } = req.params;
    const currentUserId = req.user!.userId;

    // Verify user is a member of this conversation
    const member = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: currentUserId,
        },
      },
      include: { conversation: { include: { members: true } } },
    });

    if (!member || member.conversation.instituteId !== instituteId) {
      return res.status(403).json({ success: false, error: 'Forbidden: You are not a member of this conversation' });
    }

    // Atomically mark conversation as read for the requesting user
    const now = new Date();
    await prisma.conversationMember.update({
      where: { id: member.id },
      data: { lastReadAt: now },
    });

    // Find the other member's lastReadAt to calculate delivery / read status
    const otherMember = member.conversation.members.find((m) => m.userId !== currentUserId);
    const otherLastRead = otherMember?.lastReadAt ? new Date(otherMember.lastReadAt).getTime() : 0;

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, fullName: true, role: true } },
      },
    });

    const formattedMessages = messages.map((m) => {
      const msgTime = new Date(m.createdAt).getTime();
      const isReadByRecipient = m.senderId === currentUserId ? otherLastRead >= msgTime : true;

      return {
        ...m,
        isReadByRecipient,
      };
    });

    return res.json({
      success: true,
      data: { messages: formattedMessages },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
}

/**
 * Send a message in a conversation with real-time SSE broadcast
 */
export async function sendMessage(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) return res.status(400).json({ success: false, error: 'Institute context required' });

    const { id: conversationId } = req.params;
    const currentUserId = req.user!.userId;

    const parse = sendMessageSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ success: false, error: 'Validation failed' });

    // Verify membership
    const member = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: currentUserId,
        },
      },
      include: {
        conversation: {
          include: {
            members: {
              include: { user: { select: { id: true, fullName: true, role: true } } },
            },
          },
        },
      },
    });

    if (!member || member.conversation.instituteId !== instituteId) {
      return res.status(403).json({ success: false, error: 'Forbidden: You cannot post in this conversation' });
    }

    const serverNow = new Date();

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: currentUserId,
        body: parse.data.body.trim(),
        attachmentUrl: parse.data.attachmentUrl?.trim() || null,
        createdAt: serverNow,
      },
      include: {
        sender: { select: { id: true, fullName: true, role: true } },
      },
    });

    // Touch conversation updatedAt and update sender's lastReadAt
    await Promise.all([
      prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: serverNow },
      }),
      prisma.conversationMember.update({
        where: { id: member.id },
        data: { lastReadAt: serverNow },
      }),
    ]);

    // Deliver notification and real-time SSE to other conversation members
    const otherMembers = member.conversation.members.filter((m) => m.userId !== currentUserId);

    for (const recipient of otherMembers) {
      const recipientRole = recipient.user.role;
      const snippet = message.body.length > 80 ? message.body.substring(0, 77) + '...' : message.body;

      try {
        const notif = await prisma.notification.create({
          data: {
            instituteId,
            userId: recipient.userId,
            role: recipientRole,
            title: `New Message from ${message.sender.fullName}`,
            message: snippet,
            type: 'GENERAL',
            link: recipientRole === 'PARENT' ? '/communication' : '/messaging',
            isRead: false,
          },
        });

        // Broadcast notification badge event
        InAppNotificationService.broadcastToUser(recipient.userId, {
          type: 'NOTIFICATION_CREATED',
          data: notif,
        });

        // Broadcast direct chat message event to update active chat window immediately
        InAppNotificationService.broadcastToUser(recipient.userId, {
          type: 'MESSAGE_CREATED',
          data: {
            conversationId,
            message: {
              ...message,
              isReadByRecipient: false,
            },
          },
        });
      } catch (err: any) {
        console.warn('[Messaging Notification Warning]:', err.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        message: {
          ...message,
          isReadByRecipient: false,
        },
      },
    });
  } catch (err: any) {
    console.error('[Send Message Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to send message' });
  }
}
