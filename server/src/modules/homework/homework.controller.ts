import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../middleware/auth.js';
import { getRelativeStorageKey } from '../../utils/storage.js';

const prisma = new PrismaClient();

export const createHomeworkSchema = z.object({
  batchId: z.string().uuid(),
  subjectId: z.string().uuid(),
  title: z.string().min(2).max(150),
  description: z.string().optional(),
  dueDate: z.string().min(1, 'Due date is required'), // ISO Date string
});

export const submitHomeworkSchema = z.object({
  studentNotes: z.string().optional(),
});

export const gradeSubmissionSchema = z.object({
  grade: z.string().min(1).max(20),
  feedback: z.string().optional(),
});

/**
 * Create a new homework assignment
 */
export async function createHomework(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) {
      return res.status(400).json({ success: false, error: 'Institute context required' });
    }

    const parse = createHomeworkSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: parse.error.errors });
    }

    const data = parse.data;
    const dueDate = new Date(data.dueDate);

    // Verify batch and subject belong to institute
    const batch = await prisma.batch.findFirst({ where: { id: data.batchId, instituteId } });
    if (!batch) return res.status(404).json({ success: false, error: 'Batch not found' });

    const subject = await prisma.subject.findFirst({ where: { id: data.subjectId, instituteId } });
    if (!subject) return res.status(404).json({ success: false, error: 'Subject not found' });

    const file = req.file;
    let fileUrl: string | null = null;
    let fileName: string | null = null;
    let fileSize: number | null = null;
    let mimeType: string | null = null;

    if (file) {
      fileUrl = getRelativeStorageKey(instituteId, file.filename);
      fileName = file.originalname;
      fileSize = file.size;
      mimeType = file.mimetype;
    }

    const homework = await prisma.learningMaterial.create({
      data: {
        instituteId,
        batchId: data.batchId,
        subjectId: data.subjectId,
        uploaderId: req.user!.userId,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        type: 'HOMEWORK',
        dueDate,
        fileUrl,
        fileName,
        fileSize,
        mimeType,
      },
      include: {
        batch: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true, code: true } },
        uploader: { select: { id: true, fullName: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        instituteId,
        userId: req.user!.userId,
        action: 'CREATE_HOMEWORK',
        entityType: 'LearningMaterial',
        entityId: homework.id,
        newValues: { title: homework.title, dueDate: homework.dueDate },
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Homework assignment created successfully',
      data: { homework },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to create homework' });
  }
}

/**
 * List homework assignments with status calculation
 */
export async function listHomework(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) {
      return res.status(400).json({ success: false, error: 'Institute context required' });
    }

    const batchId = req.query.batchId as string;
    const subjectId = req.query.subjectId as string;

    const where: any = { instituteId, type: 'HOMEWORK' };
    if (batchId) where.batchId = batchId;
    if (subjectId) where.subjectId = subjectId;

    let studentProfileId: string | null = null;

    if (req.user?.role === 'STUDENT') {
      const student = await prisma.student.findFirst({
        where: { userId: req.user.userId },
        include: { enrollments: { where: { isActive: true } } },
      });
      if (!student) {
        return res.json({ success: true, data: { homework: [] } });
      }
      studentProfileId = student.id;
      const batchIds = student.enrollments.map((e) => e.batchId);
      where.batchId = { in: batchIds };
    } else if (req.user?.role === 'PARENT') {
      const children = await prisma.studentParentRelation.findMany({
        where: { parent: { userId: req.user.userId } },
        include: {
          student: {
            include: { enrollments: { where: { isActive: true } } },
          },
        },
      });
      const batchIds = children.flatMap((c) => c.student.enrollments.map((e) => e.batchId));
      where.batchId = { in: batchIds };
    }

    const homeworkList = await prisma.learningMaterial.findMany({
      where,
      orderBy: { dueDate: 'asc' },
      include: {
        batch: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true, code: true } },
        uploader: { select: { id: true, fullName: true } },
        submissions: studentProfileId
          ? {
              where: { studentId: studentProfileId },
              select: {
                id: true,
                status: true,
                submittedAt: true,
                isLate: true,
                grade: true,
                feedback: true,
              },
            }
          : { select: { id: true, status: true, isLate: true } },
      },
    });

    const now = new Date();
    const formatted = homeworkList.map((hw) => {
      const isOverdue = hw.dueDate ? new Date(hw.dueDate) < now : false;
      const mySubmission = studentProfileId ? hw.submissions[0] || null : null;
      return {
        ...hw,
        isOverdue,
        mySubmission,
      };
    });

    return res.json({
      success: true,
      data: { homework: formatted },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to list homework' });
  }
}

/**
 * Submit homework assignment (Student)
 */
export async function submitHomework(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    const { id: materialId } = req.params;

    if (!req.user || req.user.role !== 'STUDENT') {
      return res.status(403).json({ success: false, error: 'Only enrolled students can submit assignments' });
    }

    const student = await prisma.student.findFirst({
      where: { userId: req.user.userId, instituteId },
    });
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student profile not found' });
    }

    const material = await prisma.learningMaterial.findFirst({
      where: { id: materialId, instituteId, type: 'HOMEWORK' },
    });
    if (!material) {
      return res.status(404).json({ success: false, error: 'Homework assignment not found' });
    }

    // Check enrollment in batch
    const enrollment = await prisma.studentEnrollment.findFirst({
      where: { studentId: student.id, batchId: material.batchId, isActive: true },
    });
    if (!enrollment) {
      return res.status(403).json({ success: false, error: 'You are not enrolled in the batch for this assignment' });
    }

    const now = new Date();
    const isLate = material.dueDate ? now > new Date(material.dueDate) : false;

    const file = req.file;
    let fileUrl: string | null = null;
    let fileName: string | null = null;
    let fileSize: number | null = null;
    let mimeType: string | null = null;

    if (file) {
      fileUrl = getRelativeStorageKey(instituteId || 'default', file.filename);
      fileName = file.originalname;
      fileSize = file.size;
      mimeType = file.mimetype;
    }

    const submission = await prisma.homeworkSubmission.upsert({
      where: {
        materialId_studentId: {
          materialId,
          studentId: student.id,
        },
      },
      update: {
        status: isLate ? 'LATE' : 'SUBMITTED',
        submittedAt: now,
        isLate,
        studentNotes: req.body.studentNotes || null,
        ...(fileUrl ? { fileUrl, fileName, fileSize, mimeType } : {}),
      },
      create: {
        materialId,
        studentId: student.id,
        status: isLate ? 'LATE' : 'SUBMITTED',
        submittedAt: now,
        isLate,
        studentNotes: req.body.studentNotes || null,
        fileUrl,
        fileName,
        fileSize,
        mimeType,
      },
    });

    return res.status(201).json({
      success: true,
      message: isLate ? 'Assignment submitted (marked Late)' : 'Assignment submitted successfully',
      data: { submission },
    });
  } catch (err: any) {
    console.error('[Submit Homework Error]', err);
    return res.status(500).json({ success: false, error: 'Failed to submit assignment' });
  }
}

/**
 * List all submissions for a homework assignment (Staff / Admin)
 */
export async function getSubmissions(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    const { id: materialId } = req.params;

    const material = await prisma.learningMaterial.findFirst({
      where: { id: materialId, instituteId, type: 'HOMEWORK' },
    });
    if (!material) {
      return res.status(404).json({ success: false, error: 'Homework not found' });
    }

    const submissions = await prisma.homeworkSubmission.findMany({
      where: { materialId },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
        },
        gradedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });

    return res.json({
      success: true,
      data: { submissions },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to fetch submissions' });
  }
}

/**
 * Grade student submission (Staff / Admin)
 */
export async function gradeSubmission(req: AuthenticatedRequest, res: Response) {
  try {
    const { submissionId } = req.params;
    const parse = gradeSubmissionSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: parse.error.errors });
    }

    const submission = await prisma.homeworkSubmission.findUnique({
      where: { id: submissionId },
      include: { material: true },
    });

    if (!submission || submission.material.instituteId !== req.instituteId) {
      return res.status(404).json({ success: false, error: 'Submission not found' });
    }

    const updated = await prisma.homeworkSubmission.update({
      where: { id: submissionId },
      data: {
        grade: parse.data.grade.trim(),
        feedback: parse.data.feedback?.trim() || null,
        status: 'GRADED',
        gradedById: req.user!.userId,
        gradedAt: new Date(),
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        gradedBy: { select: { id: true, fullName: true } },
      },
    });

    return res.json({
      success: true,
      message: 'Submission graded successfully',
      data: { submission: updated },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to grade submission' });
  }
}
