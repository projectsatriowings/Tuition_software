import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { AuthenticatedRequest } from '../../middleware/auth.js';
import { resolveAbsolutePath, getRelativeStorageKey } from '../../utils/storage.js';
import {
  isStaffAssignedToBatch,
  isStaffAssignedToBatchSubject,
  getAuthorizedStaffAssignments,
} from '../students/student-authorization.service.js';

const prisma = new PrismaClient();

export const createMaterialSchema = z.object({
  batchId: z.string().uuid('Valid Batch ID required'),
  subjectId: z.string().uuid('Valid Subject ID required').optional().nullable(),
  title: z.string().min(2, 'Title must be at least 2 characters').max(150),
  description: z.string().optional().nullable(),
  content: z.string().optional().nullable(), // For text notes, study instructions, markdown
  type: z.enum(['PDF', 'IMAGE', 'AUDIO', 'VOICE_NOTE', 'TEXT', 'DOCUMENT', 'HOMEWORK', 'ANNOUNCEMENT']),
  dueDate: z.string().optional().nullable(), // ISO date for homework / assignments
  isPublished: z.union([z.boolean(), z.string().transform((v) => v === 'true' || v === '1')]).optional().default(true),
  maxMarks: z.union([z.number(), z.string().transform((v) => (v ? parseFloat(v) : null))]).optional().nullable(),
});

export const updateMaterialSchema = z.object({
  title: z.string().min(2).max(150).optional(),
  description: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  subjectId: z.string().uuid().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  isPublished: z.union([z.boolean(), z.string().transform((v) => v === 'true' || v === '1')]).optional(),
  maxMarks: z.union([z.number(), z.string().transform((v) => (v ? parseFloat(v) : null))]).optional().nullable(),
});

/**
 * Upload and create new learning material (Staff / Admin)
 */
export async function createMaterial(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) {
      return res.status(400).json({ success: false, error: 'Institute context required' });
    }

    const parse = createMaterialSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parse.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      });
    }

    const data = parse.data;

    // Verify staff authorization
    if (req.user?.role === 'STAFF') {
      const isAssigned = await isStaffAssignedToBatch(req, data.batchId, prisma);
      if (!isAssigned) {
        return res.status(403).json({ success: false, error: 'Forbidden: You are not assigned to this batch' });
      }

      if (data.subjectId) {
        const isAssignedSub = await isStaffAssignedToBatchSubject(req, data.batchId, data.subjectId, prisma);
        if (!isAssignedSub) {
          return res.status(403).json({ success: false, error: 'Forbidden: You are not authorized to upload materials for this subject' });
        }
      }
    }

    // Verify batch belongs to institute
    const batch = await prisma.batch.findFirst({
      where: { id: data.batchId, instituteId },
    });
    if (!batch) {
      return res.status(404).json({ success: false, error: 'Batch not found in this institute' });
    }

    // Verify subject belongs to institute if provided
    if (data.subjectId) {
      const subject = await prisma.subject.findFirst({
        where: { id: data.subjectId, instituteId },
      });
      if (!subject) {
        return res.status(404).json({ success: false, error: 'Subject not found in this institute' });
      }
    }

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

    const isPublished = data.isPublished !== false;
    const content = data.content?.trim() || null;

    const material = await prisma.learningMaterial.create({
      data: {
        instituteId,
        batchId: data.batchId,
        subjectId: data.subjectId || null,
        uploaderId: req.user!.userId,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        content,
        type: data.type,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
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

    // Record audit log
    await prisma.auditLog.create({
      data: {
        instituteId,
        userId: req.user!.userId,
        action: 'CREATE_LEARNING_MATERIAL',
        entityType: 'LearningMaterial',
        entityId: material.id,
        newValues: {
          title: material.title,
          type: material.type,
          batchId: material.batchId,
          subjectId: material.subjectId,
          isPublished: material.isPublished,
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: isPublished ? 'Learning material published successfully' : 'Learning material saved as draft',
      data: { material },
    });
  } catch (err: any) {
    console.error('[Create Material Error]', err);
    return res.status(500).json({ success: false, error: 'Failed to create learning material' });
  }
}

/**
 * List learning materials with scope enforcement
 */
export async function listMaterials(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) {
      return res.status(400).json({ success: false, error: 'Institute context required' });
    }

    const batchId = req.query.batchId as string;
    const subjectId = req.query.subjectId as string;
    const type = req.query.type as any;
    const search = (req.query.search as string || '').trim();
    const status = req.query.status as string; // 'PUBLISHED' | 'DRAFT' | 'ALL'

    const where: any = { instituteId };

    if (type && type !== 'ALL') {
      where.type = type;
    } else {
      where.type = { not: 'HOMEWORK' };
    }
    if (subjectId && subjectId !== 'ALL') {
      where.subjectId = subjectId;
    }
    if (batchId && batchId !== 'ALL') {
      where.batchId = batchId;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Role-based scope isolation
    if (req.user?.role === 'STAFF') {
      const staffAssignments = await getAuthorizedStaffAssignments(req, prisma);
      const allowedBatchIds = staffAssignments.authorizedBatchIds;

      if (allowedBatchIds.length === 0) {
        return res.json({ success: true, data: { materials: [] } });
      }

      if (where.batchId) {
        if (!allowedBatchIds.includes(where.batchId)) {
          return res.status(403).json({ success: false, error: 'Forbidden: You are not assigned to this batch' });
        }
      } else {
        where.batchId = { in: allowedBatchIds };
      }

      // Staff sees published materials for assigned batches, plus their own drafts
      if (status === 'DRAFT') {
        where.isPublished = false;
        where.uploaderId = req.user.userId;
      } else if (status === 'PUBLISHED') {
        where.isPublished = true;
      } else {
        // By default, staff sees published materials in their batches OR drafts they created
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
      // Students ONLY see published materials
      where.isPublished = true;

      // Find student's enrolled batches and allocated subjects
      const enrollments = await prisma.studentEnrollment.findMany({
        where: {
          student: { userId: req.user.userId },
          isActive: true,
        },
        select: { batchId: true, subjectId: true },
      });

      const allowedBatchIds = Array.from(new Set(enrollments.map((e) => e.batchId)));
      const allowedSubjectIds = Array.from(new Set(enrollments.map((e) => e.subjectId).filter(Boolean) as string[]));

      if (allowedBatchIds.length === 0) {
        return res.json({ success: true, data: { materials: [] } });
      }

      where.batchId = { in: allowedBatchIds };

      // Material must be batch-wide (subjectId: null) OR belong to an allocated subject for this student
      if (allowedSubjectIds.length > 0) {
        where.AND = [
          ...(where.AND || []),
          {
            OR: [
              { subjectId: null },
              { subjectId: { in: allowedSubjectIds } },
            ],
          },
        ];
      }
    } else if (req.user?.role === 'PARENT') {
      // Parents ONLY see published materials for their children
      where.isPublished = true;

      const enrollments = await prisma.studentEnrollment.findMany({
        where: {
          student: {
            parentRelations: {
              some: { parent: { userId: req.user.userId } },
            },
          },
          isActive: true,
        },
        select: { batchId: true, subjectId: true },
      });

      const allowedBatchIds = Array.from(new Set(enrollments.map((e) => e.batchId)));
      const allowedSubjectIds = Array.from(new Set(enrollments.map((e) => e.subjectId).filter(Boolean) as string[]));

      if (allowedBatchIds.length === 0) {
        return res.json({ success: true, data: { materials: [] } });
      }

      where.batchId = { in: allowedBatchIds };

      if (allowedSubjectIds.length > 0) {
        where.AND = [
          ...(where.AND || []),
          {
            OR: [
              { subjectId: null },
              { subjectId: { in: allowedSubjectIds } },
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

    const materials = await prisma.learningMaterial.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        batch: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true, code: true } },
        uploader: { select: { id: true, fullName: true, role: true } },
        _count: { select: { submissions: true } },
      },
    });

    return res.json({
      success: true,
      data: { materials },
    });
  } catch (err: any) {
    console.error('[List Materials Error]', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch learning materials' });
  }
}

/**
 * Get learning material details by ID
 */
export async function getMaterialById(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    const { id } = req.params;

    const material = await prisma.learningMaterial.findFirst({
      where: { id, instituteId },
      include: {
        batch: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true, code: true } },
        uploader: { select: { id: true, fullName: true, role: true } },
        submissions: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
          },
        },
      },
    });

    if (!material) {
      return res.status(404).json({ success: false, error: 'Material not found in this institute' });
    }

    // Role-based visibility check
    if (req.user?.role === 'STUDENT') {
      if (!material.isPublished) {
        return res.status(403).json({ success: false, error: 'This material is currently in draft' });
      }
      const enrollment = await prisma.studentEnrollment.findFirst({
        where: {
          batchId: material.batchId,
          student: { userId: req.user.userId },
          isActive: true,
        },
      });
      if (!enrollment) {
        return res.status(403).json({ success: false, error: 'Forbidden: You are not enrolled in this batch' });
      }
    } else if (req.user?.role === 'PARENT') {
      if (!material.isPublished) {
        return res.status(403).json({ success: false, error: 'This material is currently in draft' });
      }
      const enrollment = await prisma.studentEnrollment.findFirst({
        where: {
          batchId: material.batchId,
          student: {
            parentRelations: {
              some: { parent: { userId: req.user.userId } },
            },
          },
          isActive: true,
        },
      });
      if (!enrollment) {
        return res.status(403).json({ success: false, error: 'Forbidden: You do not have an enrolled child in this batch' });
      }
    } else if (req.user?.role === 'STAFF') {
      const isAssigned = await isStaffAssignedToBatch(req, material.batchId, prisma);
      if (!isAssigned && material.uploaderId !== req.user.userId) {
        return res.status(403).json({ success: false, error: 'Forbidden: You are not assigned to this batch' });
      }
    }

    return res.json({
      success: true,
      data: { material },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to fetch material' });
  }
}

/**
 * Update learning material
 */
export async function updateMaterial(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    const { id } = req.params;

    const parse = updateMaterialSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: parse.error.errors });
    }

    const existing = await prisma.learningMaterial.findFirst({
      where: { id, instituteId },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Material not found' });
    }

    // Staff can only update their own material or assigned batch
    if (req.user?.role === 'STAFF') {
      const isAssigned = await isStaffAssignedToBatch(req, existing.batchId, prisma);
      if (!isAssigned && existing.uploaderId !== req.user.userId) {
        return res.status(403).json({ success: false, error: 'Forbidden: You cannot edit this material' });
      }
    }

    const data = parse.data;
    const isPublishingNow = !existing.isPublished && data.isPublished === true;

    const updated = await prisma.learningMaterial.update({
      where: { id },
      data: {
        ...(data.title ? { title: data.title.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
        ...(data.content !== undefined ? { content: data.content?.trim() || null } : {}),
        ...(data.subjectId !== undefined ? { subjectId: data.subjectId || null } : {}),
        ...(data.dueDate ? { dueDate: new Date(data.dueDate) } : {}),
        ...(data.isPublished !== undefined ? { isPublished: data.isPublished } : {}),
        ...(isPublishingNow ? { publishedAt: new Date() } : {}),
        ...(data.maxMarks !== undefined ? { maxMarks: data.maxMarks } : {}),
      },
      include: {
        batch: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true, code: true } },
        uploader: { select: { id: true, fullName: true, role: true } },
      },
    });

    return res.json({
      success: true,
      message: 'Material updated successfully',
      data: { material: updated },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to update material' });
  }
}

/**
 * Delete learning material
 */
export async function deleteMaterial(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    const { id } = req.params;

    const existing = await prisma.learningMaterial.findFirst({
      where: { id, instituteId },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Material not found' });
    }

    // Role check: Only uploader or Admin can delete
    if (req.user?.role === 'STAFF' && existing.uploaderId !== req.user.userId) {
      return res.status(403).json({ success: false, error: 'Forbidden: You can only delete materials you uploaded' });
    }

    // Clean up local file if stored
    if (existing.fileUrl) {
      const absPath = resolveAbsolutePath(existing.fileUrl);
      if (absPath && fs.existsSync(absPath)) {
        try {
          fs.unlinkSync(absPath);
        } catch (e) {
          console.warn('[Storage Cleanup Warning]', e);
        }
      }
    }

    await prisma.learningMaterial.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: 'Material deleted successfully',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to delete material' });
  }
}

/**
 * Authorized download or streaming of learning material file
 */
export async function downloadMaterial(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    const { id } = req.params;

    const material = await prisma.learningMaterial.findUnique({
      where: { id },
    });

    if (!material || !material.fileUrl) {
      return res.status(404).json({ success: false, error: 'File attachment not found' });
    }

    const effectiveInstituteId = instituteId || req.user?.instituteId;
    if (effectiveInstituteId && material.instituteId !== effectiveInstituteId && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, error: 'Forbidden: Material does not belong to your institute' });
    }

    // Scope check: Student must be in enrolled batch and material must be published
    if (req.user?.role === 'STUDENT') {
      if (!material.isPublished) {
        return res.status(403).json({ success: false, error: 'Forbidden: Material is not published' });
      }
      const enrollment = await prisma.studentEnrollment.findFirst({
        where: {
          batchId: material.batchId,
          student: { userId: req.user.userId },
          isActive: true,
        },
      });
      if (!enrollment) {
        return res.status(403).json({ success: false, error: 'Forbidden: You are not enrolled in this batch' });
      }
    } else if (req.user?.role === 'PARENT') {
      if (!material.isPublished) {
        return res.status(403).json({ success: false, error: 'Forbidden: Material is not published' });
      }
      const enrollment = await prisma.studentEnrollment.findFirst({
        where: {
          batchId: material.batchId,
          student: {
            parentRelations: {
              some: { parent: { userId: req.user.userId } },
            },
          },
          isActive: true,
        },
      });
      if (!enrollment) {
        return res.status(403).json({ success: false, error: 'Forbidden: You do not have an enrolled child in this batch' });
      }
    } else if (req.user?.role === 'STAFF') {
      const isAssigned = await isStaffAssignedToBatch(req, material.batchId, prisma);
      if (!isAssigned && material.uploaderId !== req.user.userId) {
        return res.status(403).json({ success: false, error: 'Forbidden: You are not assigned to this batch' });
      }
    }

    const absPath = resolveAbsolutePath(material.fileUrl);
    if (!absPath || !fs.existsSync(absPath)) {
      return res.status(404).json({ success: false, error: 'Attachment file not found on server' });
    }

    const isDownload = req.query.download === 'true' || req.query.attachment === 'true';
    const dispositionType = isDownload ? 'attachment' : 'inline';
    const filename = material.fileName || 'material';

    res.setHeader('Content-Type', material.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `${dispositionType}; filename="${encodeURIComponent(filename)}"`);

    const stream = fs.createReadStream(absPath);
    return stream.pipe(res);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to stream file' });
  }
}
