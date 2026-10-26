import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../middleware/auth.js';

const prisma = new PrismaClient();

export const createReviewSchema = z.object({
  studentId: z.string().uuid('Valid Student ID required'),
  staffId: z.string().uuid().optional(),
  rating: z.number().int().min(1, 'Rating must be 1 to 5').max(5, 'Rating must be 1 to 5'),
  reviewText: z.string().min(5, 'Review must be at least 5 characters').max(1000),
});

export const replyReviewSchema = z.object({
  replyText: z.string().min(2, 'Reply text is required').max(1000),
});

/**
 * Submit a parent review
 */
export async function createReview(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) return res.status(400).json({ success: false, error: 'Institute context required' });

    if (req.user?.role !== 'PARENT') {
      return res.status(403).json({ success: false, error: 'Only registered parents can submit reviews' });
    }

    const parse = createReviewSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: parse.error.errors });
    }

    const data = parse.data;

    // Verify parent profile exists and is linked to this student
    const parentProfile = await prisma.parentProfile.findFirst({
      where: { userId: req.user.userId },
    });
    if (!parentProfile) {
      return res.status(404).json({ success: false, error: 'Parent profile not found' });
    }

    const relation = await prisma.studentParentRelation.findFirst({
      where: {
        studentId: data.studentId,
        parentId: parentProfile.id,
      },
      include: { student: true },
    });

    if (!relation || relation.student.instituteId !== instituteId) {
      return res.status(403).json({ success: false, error: 'Forbidden: You are not linked to this student' });
    }

    const review = await prisma.parentReview.create({
      data: {
        instituteId,
        parentId: parentProfile.id,
        studentId: data.studentId,
        staffId: data.staffId || null,
        rating: data.rating,
        reviewText: data.reviewText.trim(),
        status: 'PUBLISHED',
      },
      include: {
        parent: { include: { user: { select: { fullName: true } } } },
        student: { select: { firstName: true, lastName: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        instituteId,
        userId: req.user.userId,
        action: 'SUBMIT_PARENT_REVIEW',
        entityType: 'ParentReview',
        entityId: review.id,
        newValues: { studentId: data.studentId, rating: data.rating },
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Thank you for your valuable feedback',
      data: { review },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to submit review' });
  }
}

/**
 * List parent reviews (Admin sees institute reviews, Parent sees own)
 */
export async function listReviews(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) return res.status(400).json({ success: false, error: 'Institute context required' });

    const where: any = { instituteId };

    if (req.user?.role === 'PARENT') {
      const parentProfile = await prisma.parentProfile.findFirst({
        where: { userId: req.user.userId },
      });
      if (!parentProfile) return res.json({ success: true, data: { reviews: [] } });
      where.parentId = parentProfile.id;
    }

    const reviews = await prisma.parentReview.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        parent: { include: { user: { select: { fullName: true } } } },
        student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
        staff: { select: { id: true, fullName: true } },
      },
    });

    return res.json({
      success: true,
      data: { reviews },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to list reviews' });
  }
}

/**
 * Staff / Admin reply to a parent review
 */
export async function replyToReview(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    const { id } = req.params;

    const parse = replyReviewSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ success: false, error: 'Validation failed' });

    const review = await prisma.parentReview.findFirst({
      where: { id, instituteId },
    });
    if (!review) return res.status(404).json({ success: false, error: 'Review not found' });

    const updated = await prisma.parentReview.update({
      where: { id },
      data: {
        replyText: parse.data.replyText.trim(),
      },
    });

    return res.json({
      success: true,
      message: 'Reply posted successfully',
      data: { review: updated },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to reply to review' });
  }
}
