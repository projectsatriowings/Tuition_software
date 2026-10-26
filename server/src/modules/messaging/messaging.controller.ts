import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../middleware/auth.js';

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
 * Start or retrieve existing 1-on-1 conversation
 */
export async function getOrCreateConversation(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) return res.status(400).json({ success: false, error: 'Institute context required' });

    const currentUserId = req.user!.userId;
    const parse = startConversationSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ success: false, error: 'Validation failed', details: parse.error.errors });

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
            { userId: currentUserId },
            { userId: recipientUserId },
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
 * List conversations for the logged in user
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
        lastMessage: lastMessage ? {
          body: lastMessage.body,
          senderName: lastMessage.sender.fullName,
          createdAt: lastMessage.createdAt,
        } : null,
        isUnread: Boolean(isUnread),
      };
    });

    return res.json({ success: true, data: { conversations: formatted } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to list conversations' });
  }
}

/**
 * Get messages in a conversation
 */
export async function getConversationMessages(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
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
      include: { conversation: true },
    });

    if (!member || member.conversation.instituteId !== instituteId) {
      return res.status(403).json({ success: false, error: 'Forbidden: You are not a member of this conversation' });
    }

    // Update lastReadAt
    await prisma.conversationMember.update({
      where: { id: member.id },
      data: { lastReadAt: new Date() },
    });

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, fullName: true, role: true } },
      },
    });

    return res.json({
      success: true,
      data: { messages },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
}

/**
 * Send a message in a conversation
 */
export async function sendMessage(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
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
      include: { conversation: true },
    });

    if (!member || member.conversation.instituteId !== instituteId) {
      return res.status(403).json({ success: false, error: 'Forbidden: You cannot post in this conversation' });
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: currentUserId,
        body: parse.data.body.trim(),
        attachmentUrl: parse.data.attachmentUrl?.trim() || null,
      },
      include: {
        sender: { select: { id: true, fullName: true, role: true } },
      },
    });

    // Touch conversation updatedAt
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { message },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to send message' });
  }
}
