import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { AuthenticatedRequest } from '../../middleware/auth.js';
import { resolveAbsolutePath, getRelativeStorageKey } from '../../utils/storage.js';

const prisma = new PrismaClient();

export const createMaterialSchema = z.object({
  batchId: z.string().uuid('Valid Batch ID required'),
  subjectId: z.string().uuid('Valid Subject ID required'),
  title: z.string().min(2, 'Title must be at least 2 characters').max(150),
  description: z.string().optional(),
  type: z.enum(['PDF', 'AUDIO', 'VOICE_NOTE', 'HOMEWORK', 'ANNOUNCEMENT']),
  dueDate: z.string().optional(), // ISO date for homework
});

export const updateMaterialSchema = z.object({
  title: z.string().min(2).max(150).optional(),
  description: z.string().optional(),
  dueDate: z.string().optional(),
});

/**
 * Upload and create new learning material
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

    // Verify batch belongs to institute
    const batch = await prisma.batch.findFirst({
      where: { id: data.batchId, instituteId },
    });
    if (!batch) {
      return res.status(404).json({ success: false, error: 'Batch not found in this institute' });
    }

    // Verify subject belongs to institute
    const subject = await prisma.subject.findFirst({
      where: { id: data.subjectId, instituteId },
    });
    if (!subject) {
      return res.status(404).json({ success: false, error: 'Subject not found in this institute' });
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

    const material = await prisma.learningMaterial.create({
      data: {
        instituteId,
        batchId: data.batchId,
        subjectId: data.subjectId,
        uploaderId: req.user!.userId,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        type: data.type,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
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
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Learning material created successfully',
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

    const where: any = { instituteId };

    if (type) {
      where.type = type;
    }
    if (subjectId) {
      where.subjectId = subjectId;
    }
    if (batchId) {
      where.batchId = batchId;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Role-based scope isolation
    if (req.user?.role === 'STUDENT') {
      // Find student's enrolled batches
      const enrollments = await prisma.studentEnrollment.findMany({
        where: {
          student: { userId: req.user.userId },
          isActive: true,
        },
        select: { batchId: true },
      });
      const allowedBatchIds = enrollments.map((e) => e.batchId);
      where.batchId = { in: allowedBatchIds };
    } else if (req.user?.role === 'PARENT') {
      // Find parent's linked children enrolled batches
      const enrollments = await prisma.studentEnrollment.findMany({
        where: {
          student: {
            parentRelations: {
              some: { parent: { userId: req.user.userId } },
            },
          },
          isActive: true,
        },
        select: { batchId: true },
      });
      const allowedBatchIds = enrollments.map((e) => e.batchId);
      where.batchId = { in: allowedBatchIds };
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

    const updated = await prisma.learningMaterial.update({
      where: { id },
      data: {
        ...(parse.data.title ? { title: parse.data.title.trim() } : {}),
        ...(parse.data.description !== undefined ? { description: parse.data.description.trim() } : {}),
        ...(parse.data.dueDate ? { dueDate: new Date(parse.data.dueDate) } : {}),
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

    const material = await prisma.learningMaterial.findFirst({
      where: { id, instituteId },
    });

    if (!material || !material.fileUrl) {
      return res.status(404).json({ success: false, error: 'File attachment not found' });
    }

    // Scope check: Student must be in enrolled batch
    if (req.user?.role === 'STUDENT') {
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
    }

    const absPath = resolveAbsolutePath(material.fileUrl);
    if (!absPath || !fs.existsSync(absPath)) {
      return res.status(404).json({ success: false, error: 'Attachment file not found on server' });
    }

    res.setHeader('Content-Type', material.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${material.fileName || 'material'}"`);

    const stream = fs.createReadStream(absPath);
    return stream.pipe(res);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to stream file' });
  }
}
