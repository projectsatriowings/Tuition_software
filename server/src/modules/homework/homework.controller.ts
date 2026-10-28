import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import fs from 'fs';
import { AuthenticatedRequest } from '../../middleware/auth.js';
import { resolveAbsolutePath, getRelativeStorageKey } from '../../utils/storage.js';
import {
  isStaffAssignedToBatch,
  isStaffAssignedToBatchSubject,
  getAuthorizedStaffAssignments,
} from '../students/student-authorization.service.js';

const prisma = new PrismaClient();

export const createHomeworkSchema = z.object({
  batchId: z.string().uuid('Valid Batch ID required'),
  subjectId: z.string().uuid('Valid Subject ID required').optional().nullable(),
  title: z.string().min(2, 'Title must be at least 2 characters').max(150),
  description: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  dueDate: z.string().min(1, 'Due date is required'), // ISO Date string
  maxMarks: z.union([z.number(), z.string().transform((v) => (v ? parseFloat(v) : null))]).optional().nullable(),
  isPublished: z.union([z.boolean(), z.string().transform((v) => v === 'true' || v === '1')]).optional().default(true),
});

export const submitHomeworkSchema = z.object({
  studentNotes: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  isCompleted: z.union([z.boolean(), z.string().transform((v) => v === 'true' || v === '1')]).optional(),
  status: z.string().optional(),
});

export const gradeSubmissionSchema = z.object({
  grade: z.string().min(1, 'Grade is required').max(20),
  feedback: z.string().optional().nullable(),
});

/**
 * Create a new homework assignment (Staff / Admin)
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

    // Verify staff authorization
    if (req.user?.role === 'STAFF') {
      const isAssigned = await isStaffAssignedToBatch(req, data.batchId, prisma);
      if (!isAssigned) {
        return res.status(403).json({ success: false, error: 'Forbidden: You are not assigned to this batch' });
      }

      if (data.subjectId) {
        const isAssignedSub = await isStaffAssignedToBatchSubject(req, data.batchId, data.subjectId, prisma);
        if (!isAssignedSub) {
          return res.status(403).json({ success: false, error: 'Forbidden: You are not authorized to assign homework for this subject' });
        }
      }
    }

    // Verify batch and subject belong to institute
    const batch = await prisma.batch.findFirst({ where: { id: data.batchId, instituteId } });
    if (!batch) return res.status(404).json({ success: false, error: 'Batch not found in this institute' });

    if (data.subjectId) {
      const subject = await prisma.subject.findFirst({ where: { id: data.subjectId, instituteId } });
      if (!subject) return res.status(404).json({ success: false, error: 'Subject not found in this institute' });
    }

    const file = req.file;
    let fileUrl: string | null = null;
    let fileName: string | null = null;
    let fileSize: number | null = null;
    let mimeType: string | null = null;

    if (file) {
      fileUrl = getRelativeStorageKey(instituteId!, file.filename);
      fileName = file.originalname;
      fileSize = file.size;
      mimeType = file.mimetype;
    }

    const isPublished = data.isPublished !== false;
    const content = data.content?.trim() || null;

    const homework = await prisma.learningMaterial.create({
      data: {
        instituteId,
        batchId: data.batchId,
        subjectId: data.subjectId || null,
        uploaderId: req.user!.userId,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        content,
        type: 'HOMEWORK',
        dueDate,
        isPublished,
        publishedAt: isPublished ? new Date() : null,
        maxMarks: data.maxMarks !== undefined && data.maxMarks !== null ? data.maxMarks : null,
        fileUrl,
        fileName,
        fileSize,
        mimeType,
      },
      include: {
        batch: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true, code: true } },
        uploader: { select: { id: true, fullName: true, role: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        instituteId,
        userId: req.user!.userId,
        action: 'CREATE_HOMEWORK',
        entityType: 'LearningMaterial',
        entityId: homework.id,
        newValues: {
          title: homework.title,
          dueDate: homework.dueDate,
          batchId: homework.batchId,
          subjectId: homework.subjectId,
          isPublished: homework.isPublished,
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: isPublished ? 'Homework assignment created and published successfully' : 'Homework assignment saved as draft',
      data: { homework },
    });
  } catch (err: any) {
    console.error('[Create Homework Error]', err);
    return res.status(500).json({ success: false, error: 'Failed to create homework' });
  }
}

/**
 * List homework assignments with status calculation and completion metrics
 */
export async function listHomework(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) {
      return res.status(400).json({ success: false, error: 'Institute context required' });
    }

    const batchId = req.query.batchId as string;
    const subjectId = req.query.subjectId as string;
    const status = req.query.status as string; // 'PUBLISHED' | 'DRAFT' | 'ALL'

    const where: any = { instituteId, type: 'HOMEWORK' };
    if (batchId && batchId !== 'ALL') where.batchId = batchId;
    if (subjectId && subjectId !== 'ALL') where.subjectId = subjectId;

    let studentProfileId: string | null = null;

    if (req.user?.role === 'STAFF') {
      const staffAssignments = await getAuthorizedStaffAssignments(req, prisma);
      const allowedBatchIds = staffAssignments.authorizedBatchIds;

      if (allowedBatchIds.length === 0) {
        return res.json({ success: true, data: { homework: [] } });
      }

      if (where.batchId) {
        if (!allowedBatchIds.includes(where.batchId)) {
          return res.status(403).json({ success: false, error: 'Forbidden: You are not assigned to this batch' });
        }
      } else {
        where.batchId = { in: allowedBatchIds };
      }

      if (status === 'DRAFT') {
        where.isPublished = false;
        where.uploaderId = req.user.userId;
      } else if (status === 'PUBLISHED') {
        where.isPublished = true;
      } else {
        where.AND = [
          ...(where.AND || []),
          {
            OR: [
              { isPublished: true },
              { uploaderId: req.user.userId },
            ],
          },
        ];
      }
    } else if (req.user?.role === 'STUDENT') {
      where.isPublished = true;

      const student = await prisma.student.findFirst({
        where: { userId: req.user.userId, instituteId },
        include: { enrollments: { where: { isActive: true } } },
      });
      if (!student) {
        return res.json({ success: true, data: { homework: [] } });
      }
      studentProfileId = student.id;

      const batchIds = Array.from(new Set(student.enrollments.map((e) => e.batchId)));
      const subjectIds = Array.from(new Set(student.enrollments.map((e) => e.subjectId).filter(Boolean) as string[]));

      if (batchIds.length === 0) {
        return res.json({ success: true, data: { homework: [] } });
      }

      where.batchId = { in: batchIds };

      if (subjectIds.length > 0) {
        where.AND = [
          ...(where.AND || []),
          {
            OR: [
              { subjectId: null },
              { subjectId: { in: subjectIds } },
            ],
          },
        ];
      }
    } else if (req.user?.role === 'PARENT') {
      where.isPublished = true;

      const children = await prisma.studentParentRelation.findMany({
        where: { parent: { userId: req.user.userId } },
        include: {
          student: {
            include: { enrollments: { where: { isActive: true } } },
          },
        },
      });

      const batchIds = Array.from(new Set(children.flatMap((c) => c.student.enrollments.map((e) => e.batchId))));
      const subjectIds = Array.from(new Set(children.flatMap((c) => c.student.enrollments.map((e) => e.subjectId).filter(Boolean) as string[])));

      if (batchIds.length === 0) {
        return res.json({ success: true, data: { homework: [] } });
      }

      where.batchId = { in: batchIds };

      if (subjectIds.length > 0) {
        where.AND = [
          ...(where.AND || []),
          {
            OR: [
              { subjectId: null },
              { subjectId: { in: subjectIds } },
            ],
          },
        ];
      }
    } else if (req.user?.role === 'ACADEMIC_ADMIN' || req.user?.role === 'SUPER_ADMIN') {
      if (status === 'PUBLISHED') {
        where.isPublished = true;
      } else if (status === 'DRAFT') {
        where.isPublished = false;
      }
    }

    const homeworkList = await prisma.learningMaterial.findMany({
      where,
      orderBy: { dueDate: 'asc' },
      include: {
        batch: {
          select: {
            id: true,
            name: true,
            _count: { select: { enrollments: { where: { isActive: true } } } },
          },
        },
        subject: { select: { id: true, name: true, code: true } },
        uploader: { select: { id: true, fullName: true, role: true } },
        submissions: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
          },
        },
      },
    });

    const now = new Date();

    const formatted = homeworkList.map((hw) => {
      const isPastDue = hw.dueDate ? new Date(hw.dueDate) < now : false;

      // For student caller: find caller's specific submission
      let mySubmission: any = null;
      let studentStatus = 'NOT_STARTED';

      if (studentProfileId) {
        const found = hw.submissions.find((s) => s.studentId === studentProfileId);
        if (found) {
          mySubmission = found;
          studentStatus = found.status;
        } else if (isPastDue) {
          studentStatus = 'OVERDUE';
        }
      }

      // Summary metrics for staff / admin
      const totalEligible = hw.batch?._count?.enrollments || 0;
      const submittedCount = hw.submissions.filter((s) => s.status === 'SUBMITTED' || s.status === 'LATE').length;
      const completedCount = hw.submissions.filter((s) => s.status === 'COMPLETED' || s.status === 'GRADED').length;
      const notStartedCount = Math.max(0, totalEligible - hw.submissions.length);
      const overdueCount = isPastDue ? notStartedCount : 0;

      return {
        ...hw,
        isOverdue: isPastDue && (!mySubmission || mySubmission.status === 'PENDING'),
        mySubmission,
        studentStatus,
        summary: {
          totalEligible,
          submittedCount,
          completedCount,
          notStartedCount,
          overdueCount,
        },
      };
    });

    return res.json({
      success: true,
      data: { homework: formatted },
    });
  } catch (err: any) {
    console.error('[List Homework Error]', err);
    return res.status(500).json({ success: false, error: 'Failed to list homework' });
  }
}

/**
 * Submit homework assignment or mark completed (Student only)
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

    // Verify active enrollment in batch
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
      fileUrl = getRelativeStorageKey(instituteId!, file.filename);
      fileName = file.originalname;
      fileSize = file.size;
      mimeType = file.mimetype;
    }

    // Accept either studentNotes or content from web/mobile
    const notes = req.body.studentNotes || req.body.content || null;
    const isCompletedFlag = req.body.isCompleted === true || req.body.isCompleted === 'true' || req.body.status === 'COMPLETED';

    // Determine target status
    let submissionStatus: 'COMPLETED' | 'LATE' | 'SUBMITTED' = 'SUBMITTED';
    if (isCompletedFlag && !fileUrl && !notes) {
      submissionStatus = 'COMPLETED';
    } else if (isLate) {
      submissionStatus = 'LATE';
    } else {
      submissionStatus = 'SUBMITTED';
    }

    const submission = await prisma.homeworkSubmission.upsert({
      where: {
        materialId_studentId: {
          materialId,
          studentId: student.id,
        },
      },
      update: {
        status: submissionStatus,
        submittedAt: now,
        isLate,
        studentNotes: notes,
        ...(fileUrl ? { fileUrl, fileName, fileSize, mimeType } : {}),
      },
      create: {
        materialId,
        studentId: student.id,
        status: submissionStatus,
        submittedAt: now,
        isLate,
        studentNotes: notes,
        fileUrl,
        fileName,
        fileSize,
        mimeType,
      },
      include: {
        material: { select: { id: true, title: true, dueDate: true } },
        student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
      },
    });

    return res.status(201).json({
      success: true,
      message: submissionStatus === 'COMPLETED'
        ? 'Assignment marked as completed'
        : isLate
        ? 'Assignment submitted (marked Late)'
        : 'Assignment submitted successfully',
      data: { submission },
    });
  } catch (err: any) {
    console.error('[Submit Homework Error]', err);
    return res.status(500).json({ success: false, error: 'Failed to submit assignment' });
  }
}

/**
 * List all submissions & full eligible student roster for a homework (Staff / Admin)
 */
export async function getSubmissions(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    const { id: materialId } = req.params;

    const material = await prisma.learningMaterial.findFirst({
      where: { id: materialId, instituteId, type: 'HOMEWORK' },
      include: {
        batch: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true, code: true } },
      },
    });
    if (!material) {
      return res.status(404).json({ success: false, error: 'Homework not found' });
    }

    // Authorization: Staff must be assigned to this batch
    if (req.user?.role === 'STAFF') {
      const isAssigned = await isStaffAssignedToBatch(req, material.batchId, prisma);
      if (!isAssigned && material.uploaderId !== req.user.userId) {
        return res.status(403).json({ success: false, error: 'Forbidden: You are not assigned to this batch' });
      }
    }

    // 1. Get all active enrolled students in this batch
    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        batchId: material.batchId,
        isActive: true,
        ...(material.subjectId ? { OR: [{ subjectId: null }, { subjectId: material.subjectId }] } : {}),
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
            photoUrl: true,
            phone: true,
          },
        },
      },
    });

    // Deduplicate students
    const studentMap = new Map<string, any>();
    for (const e of enrollments) {
      if (!studentMap.has(e.student.id)) {
        studentMap.set(e.student.id, e.student);
      }
    }
    const eligibleStudents = Array.from(studentMap.values());

    // 2. Get existing submissions for this homework
    const submissions = await prisma.homeworkSubmission.findMany({
      where: { materialId },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
            photoUrl: true,
          },
        },
        gradedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });

    const submissionByStudentId = new Map<string, any>();
    for (const sub of submissions) {
      submissionByStudentId.set(sub.studentId, sub);
    }

    const now = new Date();
    const isPastDue = material.dueDate ? new Date(material.dueDate) < now : false;

    // 3. Construct unified student completion roster
    const roster = eligibleStudents.map((st) => {
      const sub = submissionByStudentId.get(st.id);
      let status: 'NOT_STARTED' | 'SUBMITTED' | 'COMPLETED' | 'LATE' | 'GRADED' = 'NOT_STARTED';

      if (sub) {
        status = sub.status;
      } else if (isPastDue) {
        status = 'NOT_STARTED'; // With isOverdue: true
      }

      return {
        student: st,
        status,
        isOverdue: !sub && isPastDue,
        submission: sub || null,
      };
    });

    // 4. Calculate summary metrics
    const totalEligible = eligibleStudents.length;
    const completedCount = roster.filter((r) => r.status === 'COMPLETED' || r.status === 'GRADED').length;
    const submittedCount = roster.filter((r) => r.status === 'SUBMITTED' || r.status === 'LATE').length;
    const gradedCount = roster.filter((r) => r.status === 'GRADED').length;
    const notStartedCount = roster.filter((r) => r.status === 'NOT_STARTED' && !r.isOverdue).length;
    const overdueCount = roster.filter((r) => r.isOverdue).length;

    return res.json({
      success: true,
      data: {
        homework: material,
        summary: {
          totalEligible,
          completedCount,
          submittedCount,
          gradedCount,
          notStartedCount,
          overdueCount,
        },
        roster,
        submissions,
      },
    });
  } catch (err: any) {
    console.error('[Get Submissions Error]', err);
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

    // Role check: Staff must be assigned to batch
    if (req.user?.role === 'STAFF') {
      const isAssigned = await isStaffAssignedToBatch(req, submission.material.batchId, prisma);
      if (!isAssigned && submission.material.uploaderId !== req.user.userId) {
        return res.status(403).json({ success: false, error: 'Forbidden: You are not assigned to this batch' });
      }
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
    console.error('[Grade Submission Error]', err);
    return res.status(500).json({ success: false, error: 'Failed to grade submission' });
  }
}

/**
 * Secure download of a student's submitted assignment file
 */
export async function downloadSubmission(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    const { submissionId } = req.params;

    const submission = await prisma.homeworkSubmission.findUnique({
      where: { id: submissionId },
      include: {
        material: true,
        student: true,
      },
    });

    if (!submission || submission.material.instituteId !== instituteId) {
      return res.status(404).json({ success: false, error: 'Submission not found' });
    }

    if (!submission.fileUrl) {
      return res.status(404).json({ success: false, error: 'No file was uploaded with this submission' });
    }

    // Authorization check
    if (req.user?.role === 'STUDENT') {
      if (submission.student.userId !== req.user.userId) {
        return res.status(403).json({ success: false, error: 'Forbidden: You cannot view another student\'s submission' });
      }
    } else if (req.user?.role === 'PARENT') {
      const isLinked = await prisma.studentParentRelation.findFirst({
        where: {
          studentId: submission.studentId,
          parent: { userId: req.user.userId },
        },
      });
      if (!isLinked) {
        return res.status(403).json({ success: false, error: 'Forbidden: You can only view your own child\'s submissions' });
      }
    } else if (req.user?.role === 'STAFF') {
      const isAssigned = await isStaffAssignedToBatch(req, submission.material.batchId, prisma);
      if (!isAssigned && submission.material.uploaderId !== req.user.userId) {
        return res.status(403).json({ success: false, error: 'Forbidden: You are not assigned to this batch' });
      }
    }

    const absPath = resolveAbsolutePath(submission.fileUrl);
    if (!absPath || !fs.existsSync(absPath)) {
      return res.status(404).json({ success: false, error: 'Submission file not found on disk' });
    }

    res.setHeader('Content-Type', submission.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${submission.fileName || 'submission'}"`);

    const stream = fs.createReadStream(absPath);
    return stream.pipe(res);
  } catch (err: any) {
    console.error('[Download Submission Error]', err);
    return res.status(500).json({ success: false, error: 'Failed to stream submission file' });
  }
}
