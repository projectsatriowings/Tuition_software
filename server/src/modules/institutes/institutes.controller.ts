import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../../middleware/auth.js';
import { hashPassword } from '../../utils/security.js';

const prisma = new PrismaClient();

// Validation Schemas
export const createInstituteSchema = z.object({
  code: z.string().min(2, 'Code must be at least 2 characters').max(20).regex(/^[A-Z0-9_-]+$/i, 'Alphanumeric, dash or underscore only').optional(),
  name: z.string().min(2, 'Institute name is required').max(100),
  legalName: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid institute email').optional().or(z.literal('')),
  // Optional initial Academic Admin provisioning
  adminFullName: z.string().optional(),
  adminEmail: z.string().email('Invalid admin email').optional().or(z.literal('')),
  adminPhone: z.string().optional(),
  adminInitialPassword: z.string().min(8, 'Admin password must be at least 8 characters').optional(),
});

export const updateInstituteSchema = z.object({
  name: z.string().min(2).optional(),
  legalName: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  settingsJson: z.record(z.any()).optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING_SETUP']),
  reason: z.string().optional(),
});

/**
 * List institutes (SUPER_ADMIN only)
 */
export async function listInstitutes(req: AuthenticatedRequest, res: Response) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || '20', 10)));
    const search = (req.query.search as string || '').trim();
    const status = req.query.status as any;

    const skip = (page - 1) * limit;

    const where: any = {};
    if (status && ['ACTIVE', 'SUSPENDED', 'PENDING_SETUP'].includes(status)) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, institutes] = await Promise.all([
      prisma.institute.count({ where }),
      prisma.institute.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              students: true,
              staffProfiles: true,
              batches: true,
            },
          },
        },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        institutes,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to list institutes' });
  }
}

/**
 * Create a new Institute (SUPER_ADMIN only)
 * Uses a safe transaction to create Institute + initial Academic Admin if requested
 */
export async function createInstitute(req: AuthenticatedRequest, res: Response) {
  try {
    const parse = createInstituteSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: parse.error.errors[0]?.message || 'Validation error',
      });
    }

    const data = parse.data;
    let instituteCode = data.code?.toUpperCase().trim();

    if (!instituteCode) {
      // Securely generate unique readable institute code: INS-XXXXXX
      for (let attempt = 0; attempt < 10; attempt++) {
        const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
        const candidate = `INS-${suffix}`;
        const existing = await prisma.institute.findUnique({ where: { code: candidate } });
        if (!existing) {
          instituteCode = candidate;
          break;
        }
      }
      if (!instituteCode) {
        instituteCode = `INS-${Date.now().toString(36).toUpperCase()}`;
      }
    } else {
      // Check unique institute code if manually supplied
      const existingInst = await prisma.institute.findUnique({
        where: { code: instituteCode },
      });
      if (existingInst) {
        return res.status(409).json({
          success: false,
          error: `An institute with code '${instituteCode}' already exists`,
        });
      }
    }

    // Execute in transaction
    const result = await prisma.$transaction(async (tx) => {
      const institute = await tx.institute.create({
        data: {
          code: instituteCode,
          name: data.name.trim(),
          legalName: data.legalName?.trim() || null,
          address: data.address?.trim() || null,
          city: data.city?.trim() || null,
          state: data.state?.trim() || null,
          postalCode: data.postalCode?.trim() || null,
          phone: data.phone?.trim() || null,
          email: data.email?.trim() || null,
          status: 'ACTIVE',
        },
      });

      let adminUser = null;
      if (data.adminEmail && data.adminInitialPassword) {
        // Check if admin email already exists
        const existingUser = await tx.user.findUnique({
          where: { email: data.adminEmail.trim().toLowerCase() },
        });

        if (existingUser) {
          throw new Error(`User with email '${data.adminEmail}' already exists`);
        }

        const passwordHash = await hashPassword(data.adminInitialPassword);

        adminUser = await tx.user.create({
          data: {
            email: data.adminEmail.trim().toLowerCase(),
            phone: data.adminPhone?.trim() || null,
            fullName: data.adminFullName?.trim() || `${data.name} Admin`,
            passwordHash,
            role: 'ACADEMIC_ADMIN',
            isActive: true,
            mustChangePassword: true, // Forces password change on initial login
          },
        });

        // Create membership
        await tx.instituteMembership.create({
          data: {
            instituteId: institute.id,
            userId: adminUser.id,
            role: 'ACADEMIC_ADMIN',
            isActive: true,
          },
        });
      }

      // Record Audit Log
      await tx.auditLog.create({
        data: {
          instituteId: institute.id,
          userId: req.user?.userId || null,
          action: 'INSTITUTE_CREATED',
          entityType: 'Institute',
          entityId: institute.id,
          newValues: {
            code: institute.code,
            name: institute.name,
            adminUserId: adminUser?.id || null,
          },
        },
      });

      return { institute, adminUser };
    });

    return res.status(201).json({
      success: true,
      message: 'Institute created successfully',
      data: {
        institute: result.institute,
        initialAdmin: result.adminUser ? {
          id: result.adminUser.id,
          email: result.adminUser.email,
          fullName: result.adminUser.fullName,
          role: result.adminUser.role,
          mustChangePassword: result.adminUser.mustChangePassword,
        } : null,
      },
    });
  } catch (err: any) {
    if (err.message && err.message.includes('already exists')) {
      return res.status(409).json({ success: false, error: err.message });
    }
    console.error('[Create Institute Error]', err);
    return res.status(500).json({ success: false, error: 'Failed to create institute' });
  }
}

/**
 * Get Institute details by ID
 */
export async function getInstituteById(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    // Academic admins can only view their own institute
    if (req.user?.role !== 'SUPER_ADMIN' && req.instituteId !== id) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You do not have permission to view another institute',
      });
    }

    const institute = await prisma.institute.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            students: true,
            staffProfiles: true,
            batches: true,
            subjects: true,
          },
        },
        memberships: {
          where: { role: 'ACADEMIC_ADMIN', isActive: true },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                lastLoginAt: true,
              },
            },
          },
        },
      },
    });

    if (!institute) {
      return res.status(404).json({ success: false, error: 'Institute not found' });
    }

    return res.json({
      success: true,
      data: { institute },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to fetch institute details' });
  }
}

/**
 * Update Institute details
 */
export async function updateInstitute(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    // Academic admin can only update their own institute
    if (req.user?.role !== 'SUPER_ADMIN' && req.instituteId !== id) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You cannot modify another institute',
      });
    }

    const parse = updateInstituteSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: parse.error.errors[0]?.message || 'Invalid input data',
      });
    }

    const existing = await prisma.institute.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Institute not found' });
    }

    const updated = await prisma.institute.update({
      where: { id },
      data: parse.data,
    });

    // Record Audit Log
    await prisma.auditLog.create({
      data: {
        instituteId: id,
        userId: req.user?.userId || null,
        action: 'INSTITUTE_UPDATED',
        entityType: 'Institute',
        entityId: id,
        oldValues: existing as any,
        newValues: updated as any,
      },
    });

    return res.json({
      success: true,
      message: 'Institute updated successfully',
      data: { institute: updated },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to update institute' });
  }
}

/**
 * Update Institute Status (Activate or Suspend - SUPER_ADMIN only)
 */
export async function updateInstituteStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    const parse = updateStatusSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: parse.error.errors[0]?.message || 'Invalid status',
      });
    }

    const { status, reason } = parse.data;

    const existing = await prisma.institute.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Institute not found' });
    }

    const updated = await prisma.institute.update({
      where: { id },
      data: { status },
    });

    // Record Audit Log
    await prisma.auditLog.create({
      data: {
        instituteId: id,
        userId: req.user?.userId || null,
        action: status === 'ACTIVE' ? 'INSTITUTE_ACTIVATED' : 'INSTITUTE_SUSPENDED',
        entityType: 'Institute',
        entityId: id,
        oldValues: { status: existing.status },
        newValues: { status, reason },
      },
    });

    return res.json({
      success: true,
      message: `Institute status updated to ${status}`,
      data: { institute: updated },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to update institute status' });
  }
}

/**
 * Dashboard Summary Metrics
 * Super Admin gets platform counts; Academic Admin gets institute-scoped counts.
 */
export async function getDashboardSummary(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role === 'SUPER_ADMIN') {
      const [totalInstitutes, activeInstitutes, suspendedInstitutes, totalUsers, totalStudents] = await Promise.all([
        prisma.institute.count(),
        prisma.institute.count({ where: { status: 'ACTIVE' } }),
        prisma.institute.count({ where: { status: 'SUSPENDED' } }),
        prisma.user.count(),
        prisma.student.count(),
      ]);

      return res.json({
        success: true,
        data: {
          role: 'SUPER_ADMIN',
          totalInstitutes,
          activeInstitutes,
          suspendedInstitutes,
          totalUsers,
          totalStudents,
        },
      });
    }

    // Academic Admin or Staff: Institute-scoped metrics
    const instituteId = req.instituteId;
    if (!instituteId) {
      return res.status(400).json({ success: false, error: 'Institute context required' });
    }

    const [
      activeStudents,
      passedOutStudents,
      discontinuedStudents,
      totalStaff,
      totalBatches,
      totalSubjects,
      institute,
    ] = await Promise.all([
      prisma.student.count({ where: { instituteId, status: 'ACTIVE' } }),
      prisma.student.count({ where: { instituteId, status: 'PASSED_OUT' } }),
      prisma.student.count({ where: { instituteId, status: 'DISCONTINUED' } }),
      prisma.staffProfile.count({ where: { instituteId } }),
      prisma.batch.count({ where: { instituteId } }),
      prisma.subject.count({ where: { instituteId } }),
      prisma.institute.findUnique({
        where: { id: instituteId },
        select: { id: true, name: true, code: true, status: true },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        role: req.user?.role,
        institute,
        metrics: {
          totalStudents: activeStudents + passedOutStudents + discontinuedStudents,
          activeStudents,
          passedOutStudents,
          discontinuedStudents,
          totalStaff,
          totalBatches,
          totalSubjects,
        },
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to fetch dashboard summary' });
  }
}
