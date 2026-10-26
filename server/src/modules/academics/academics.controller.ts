import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../middleware/auth.js';

const prisma = new PrismaClient();

export const createBatchSchema = z.object({
  name: z.string().min(2, 'Batch name is required'),
  academicYear: z.string().min(4, 'Academic year is required'), // e.g., "2026-2027"
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const createSubjectSchema = z.object({
  name: z.string().min(2, 'Subject name is required'),
  code: z.string().optional(),
  description: z.string().optional(),
});

// List Batches
export async function listBatches(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) return res.status(400).json({ success: false, error: 'Institute context required' });

    const batches = await prisma.batch.findMany({
      where: { instituteId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            enrollments: true,
            staffAssignments: true,
          },
        },
      },
    });

    return res.json({ success: true, data: { batches } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to list batches' });
  }
}

// Create Batch
export async function createBatch(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) return res.status(400).json({ success: false, error: 'Institute context required' });

    const parse = createBatchSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ success: false, error: parse.error.errors[0]?.message });

    const { name, academicYear, startDate, endDate } = parse.data;

    const existing = await prisma.batch.findUnique({
      where: {
        instituteId_name_academicYear: {
          instituteId,
          name: name.trim(),
          academicYear: academicYear.trim(),
        },
      },
    });

    if (existing) {
      return res.status(409).json({ success: false, error: `Batch '${name}' (${academicYear}) already exists in this institute` });
    }

    const batch = await prisma.batch.create({
      data: {
        instituteId,
        name: name.trim(),
        academicYear: academicYear.trim(),
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        isActive: true,
      },
    });

    return res.status(201).json({ success: true, message: 'Batch created successfully', data: { batch } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to create batch' });
  }
}

// List Subjects
export async function listSubjects(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) return res.status(400).json({ success: false, error: 'Institute context required' });

    const subjects = await prisma.subject.findMany({
      where: { instituteId },
      orderBy: { name: 'asc' },
    });

    return res.json({ success: true, data: { subjects } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to list subjects' });
  }
}

// Create Subject
export async function createSubject(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) return res.status(400).json({ success: false, error: 'Institute context required' });

    const parse = createSubjectSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ success: false, error: parse.error.errors[0]?.message });

    const { name, code, description } = parse.data;

    const existing = await prisma.subject.findUnique({
      where: {
        instituteId_name: {
          instituteId,
          name: name.trim(),
        },
      },
    });

    if (existing) {
      return res.status(409).json({ success: false, error: `Subject '${name}' already exists in this institute` });
    }

    const subject = await prisma.subject.create({
      data: {
        instituteId,
        name: name.trim(),
        code: code?.trim().toUpperCase() || null,
        description: description?.trim() || null,
      },
    });

    return res.status(201).json({ success: true, message: 'Subject created successfully', data: { subject } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to create subject' });
  }
}
