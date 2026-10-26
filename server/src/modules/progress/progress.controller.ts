import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../middleware/auth.js';

const prisma = new PrismaClient();

export const createFeedbackSchema = z.object({
  studentId: z.string().uuid(),
  batchId: z.string().uuid(),
  termName: z.string().min(2).max(50), // e.g. "Term 1", "Quarter 2"
  remarks: z.string().min(3).max(1000),
  rating: z.number().int().min(1).max(5).optional(),
  strengths: z.string().optional(),
  improvements: z.string().optional(),
  recommendations: z.string().optional(),
  isPublished: z.boolean().default(true),
});

export const updateFeedbackSchema = z.object({
  termName: z.string().min(2).max(50).optional(),
  remarks: z.string().min(3).max(1000).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  strengths: z.string().optional(),
  improvements: z.string().optional(),
  recommendations: z.string().optional(),
  isPublished: z.boolean().optional(),
});

/**
 * Record student progress feedback
 */
export async function createFeedback(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) return res.status(400).json({ success: false, error: 'Institute context required' });

    const parse = createFeedbackSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: parse.error.errors });
    }

    const data = parse.data;

    const student = await prisma.student.findFirst({
      where: { id: data.studentId, instituteId },
    });
    if (!student) return res.status(404).json({ success: false, error: 'Student not found in this institute' });

    const feedback = await prisma.progressFeedback.create({
      data: {
        instituteId,
        studentId: data.studentId,
        batchId: data.batchId,
        staffId: req.user!.userId,
        termName: data.termName.trim(),
        remarks: data.remarks.trim(),
        rating: data.rating || null,
        strengths: data.strengths?.trim() || null,
        improvements: data.improvements?.trim() || null,
        recommendations: data.recommendations?.trim() || null,
        isPublished: data.isPublished,
      },
      include: {
        staff: { select: { id: true, fullName: true, role: true } },
        student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        instituteId,
        userId: req.user!.userId,
        action: 'CREATE_PROGRESS_FEEDBACK',
        entityType: 'ProgressFeedback',
        entityId: feedback.id,
        newValues: { studentId: data.studentId, termName: data.termName },
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Student progress feedback recorded',
      data: { feedback },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to record feedback' });
  }
}

/**
 * List progress feedback for a student
 */
export async function getStudentFeedback(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    const { studentId } = req.params;

    // Authorization check
    if (req.user?.role === 'STUDENT') {
      const student = await prisma.student.findFirst({ where: { userId: req.user.userId } });
      if (!student || student.id !== studentId) {
        return res.status(403).json({ success: false, error: 'Forbidden: You can only view your own progress' });
      }
    } else if (req.user?.role === 'PARENT') {
      const relation = await prisma.studentParentRelation.findFirst({
        where: { studentId, parent: { userId: req.user.userId } },
      });
      if (!relation) {
        return res.status(403).json({ success: false, error: 'Forbidden: You are not authorized for this student' });
      }
    }

    const where: any = { studentId, instituteId };
    if (req.user?.role === 'STUDENT' || req.user?.role === 'PARENT') {
      where.isPublished = true;
    }

    const feedbacks = await prisma.progressFeedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        staff: { select: { id: true, fullName: true } },
        batch: { select: { id: true, name: true } },
      },
    });

    return res.json({
      success: true,
      data: { feedbacks },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to fetch student feedback' });
  }
}

/**
 * Update feedback
 */
export async function updateFeedback(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    const { id } = req.params;

    const parse = updateFeedbackSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ success: false, error: 'Validation failed' });

    const existing = await prisma.progressFeedback.findFirst({ where: { id, instituteId } });
    if (!existing) return res.status(404).json({ success: false, error: 'Feedback not found' });

    const updated = await prisma.progressFeedback.update({
      where: { id },
      data: {
        ...(parse.data.termName ? { termName: parse.data.termName.trim() } : {}),
        ...(parse.data.remarks ? { remarks: parse.data.remarks.trim() } : {}),
        ...(parse.data.rating !== undefined ? { rating: parse.data.rating } : {}),
        ...(parse.data.strengths !== undefined ? { strengths: parse.data.strengths } : {}),
        ...(parse.data.improvements !== undefined ? { improvements: parse.data.improvements } : {}),
        ...(parse.data.recommendations !== undefined ? { recommendations: parse.data.recommendations } : {}),
        ...(parse.data.isPublished !== undefined ? { isPublished: parse.data.isPublished } : {}),
      },
    });

    return res.json({ success: true, message: 'Feedback updated', data: { feedback: updated } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to update feedback' });
  }
}
