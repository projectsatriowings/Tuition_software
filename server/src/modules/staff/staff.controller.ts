import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../middleware/auth.js';
import { hashPassword, generateSecureRandomToken } from '../../utils/security.js';
import { generateNextEmployeeCode } from './staff-code.service.js';

const prisma = new PrismaClient();

export const createStaffSchema = z.object({
  fullName: z.string().min(2, 'Staff full name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  employeeCode: z.string().optional(),
  designation: z.string().min(2, 'Designation is required'), // e.g., "Senior Mathematics Faculty"
  qualification: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  initialPassword: z.string().min(6, 'Password must be at least 6 characters').optional(),
  permissionsJson: z.record(z.any()).optional(),
  batchIds: z.array(z.string().uuid()).optional(),
});

export const updateStaffSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().optional(),
  employeeCode: z.string().optional(),
  designation: z.string().min(2).optional(),
  qualification: z.string().optional(),
  permissionsJson: z.record(z.any()).optional(),
});

export const updateStaffStatusSchema = z.object({
  isActive: z.boolean(),
  reason: z.string().optional(),
});

export const resetStaffPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
});

/**
 * List staff in the active institute
 */
export async function listStaff(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) {
      return res.status(400).json({ success: false, error: 'Institute context required' });
    }

    const search = (req.query.search as string || '').trim();
    const isActiveFilter = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;

    const where: any = {
      instituteId,
    };

    if (isActiveFilter !== undefined) {
      where.user = { isActive: isActiveFilter };
    }

    if (search) {
      where.OR = [
        { employeeCode: { contains: search, mode: 'insensitive' } },
        { designation: { contains: search, mode: 'insensitive' } },
        { user: { fullName: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const staffList = await prisma.staffProfile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
        assignments: {
          include: {
            batch: {
              select: {
                id: true,
                name: true,
                academicYear: true,
              },
            },
          },
        },
        batchSubjects: {
          include: {
            batch: { select: { id: true, name: true, code: true } },
            subject: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    return res.json({
      success: true,
      data: { staff: staffList },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to list staff profiles' });
  }
}

/**
 * Get next auto-generated employee code with academy name
 */
export async function getNextEmployeeCodeHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) {
      return res.status(400).json({ success: false, error: 'Institute context required' });
    }

    const employeeCode = await generateNextEmployeeCode(prisma, instituteId);
    return res.json({
      success: true,
      data: { employeeCode },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to generate next employee code' });
  }
}

/**
 * Create a new staff account (Academic Admin or Super Admin)
 */
export async function createStaff(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) {
      return res.status(400).json({ success: false, error: 'Institute context required' });
    }

    const parse = createStaffSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: parse.error.errors[0]?.message || 'Validation failed',
      });
    }

    const data = parse.data;
    const email = data.email.trim().toLowerCase();

    // Check unique email
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: `User with email '${email}' already exists in the system`,
      });
    }

    // Check unique phone if provided
    const phone = data.phone?.trim() || null;
    if (phone) {
      const existingPhone = await prisma.user.findUnique({ where: { phone } });
      if (existingPhone) {
        return res.status(409).json({
          success: false,
          error: `Phone number '${phone}' is already registered with another user (${existingPhone.fullName})`,
        });
      }
    }

    // Auto-generate employee code with academy name if not supplied
    let employeeCode = data.employeeCode?.trim() || '';
    if (!employeeCode) {
      employeeCode = await generateNextEmployeeCode(prisma, instituteId);
    } else {
      // Check employee code uniqueness within institute
      const existingCode = await prisma.staffProfile.findUnique({
        where: {
          instituteId_employeeCode: {
            instituteId,
            employeeCode,
          },
        },
      });
      if (existingCode) {
        return res.status(409).json({
          success: false,
          error: `Employee code '${employeeCode}' already exists in this institute`,
        });
      }
    }

    const permanentPassword = data.password?.trim() || data.initialPassword?.trim() || `Staff@${generateSecureRandomToken(4)}2026`;
    const passwordHash = await hashPassword(permanentPassword);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create User
      const user = await tx.user.create({
        data: {
          email,
          phone: data.phone?.trim() || null,
          fullName: data.fullName.trim(),
          passwordHash,
          role: 'STAFF',
          isActive: true,
          mustChangePassword: false, // Permanent staff login created by admin - no forced temporary password change
        },
      });

      // 2. Create Institute Membership
      await tx.instituteMembership.create({
        data: {
          instituteId,
          userId: user.id,
          role: 'STAFF',
          isActive: true,
        },
      });

      // 3. Create Staff Profile with permanent credentials saved in permissionsJson for admin review
      const staffPermissions = {
        ...(data.permissionsJson || {}),
        permanentPassword, // Preserved so academic admin can view and hand over permanent login at any time
      };

      const staffProfile = await tx.staffProfile.create({
        data: {
          instituteId,
          userId: user.id,
          employeeCode,
          designation: data.designation.trim(),
          qualification: data.qualification?.trim() || null,
          permissionsJson: staffPermissions,
        },
      });

      // 4. Batch assignments if supplied
      if (data.batchIds && data.batchIds.length > 0) {
        await tx.staffBatchAssignment.createMany({
          data: data.batchIds.map((batchId) => ({
            staffProfileId: staffProfile.id,
            batchId,
          })),
        });
      }

      // 5. Audit Log
      await tx.auditLog.create({
        data: {
          instituteId,
          userId: req.user?.userId || null,
          action: 'STAFF_PROVISIONED',
          entityType: 'StaffProfile',
          entityId: staffProfile.id,
          newValues: {
            userId: user.id,
            employeeCode: staffProfile.employeeCode,
            designation: staffProfile.designation,
          },
        },
      });

      return { user, staffProfile };
    });

    const institute = await prisma.institute.findUnique({
      where: { id: instituteId },
      select: { id: true, code: true, name: true },
    });

    return res.status(201).json({
      success: true,
      message: 'Permanent staff login created successfully',
      data: {
        staffId: result.staffProfile.id,
        employeeCode: result.staffProfile.employeeCode,
        user: {
          id: result.user.id,
          fullName: result.user.fullName,
          email: result.user.email,
          role: result.user.role,
          mustChangePassword: false,
        },
        institute: institute || null,
        permanentPassword, // Explicit permanent password returned for admin to view and hand over
        temporaryPassword: permanentPassword, // backward compatibility
      },
    });
  } catch (err: any) {
    console.error('[Create Staff Error]', err);
    if (err.code === 'P2002') {
      const target = String(Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : err.meta?.target || '');
      if (target.includes('phone')) {
        const phone = req.body?.phone ? `'${req.body.phone}' ` : '';
        return res.status(409).json({
          success: false,
          error: `Phone number ${phone}already exists in the system. Please use a different phone number.`,
        });
      }
      if (target.includes('email')) {
        const email = req.body?.email ? `'${req.body.email}' ` : '';
        return res.status(409).json({
          success: false,
          error: `Email address ${email}is already registered with another user.`,
        });
      }
      if (target.includes('employeeCode')) {
        const code = req.body?.employeeCode ? `'${req.body.employeeCode}' ` : '';
        return res.status(409).json({
          success: false,
          error: `Employee code ${code}already exists in this institute. Please auto-generate or use a different code.`,
        });
      }
      return res.status(409).json({
        success: false,
        error: `A user or staff member with this ${target || 'information'} already exists.`,
      });
    }
    return res.status(500).json({ success: false, error: err.message || 'Failed to create staff account' });
  }
}

/**
 * Get staff profile by ID
 */
export async function getStaffById(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    const { id } = req.params;

    const staff = await prisma.staffProfile.findFirst({
      where: {
        id,
        instituteId, // strict institute isolation
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
        assignments: {
          include: {
            batch: true,
          },
        },
        batchSubjects: {
          include: {
            batch: { select: { id: true, name: true, code: true } },
            subject: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    if (!staff) {
      return res.status(404).json({ success: false, error: 'Staff member not found in this institute' });
    }

    return res.json({
      success: true,
      data: { staff },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to fetch staff profile' });
  }
}

/**
 * Update staff profile
 */
export async function updateStaff(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    const { id } = req.params;

    const parse = updateStaffSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: parse.error.errors[0]?.message,
      });
    }

    const existing = await prisma.staffProfile.findFirst({
      where: { id, instituteId },
      include: { user: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Staff member not found' });
    }

    const data = parse.data;

    await prisma.$transaction(async (tx) => {
      if (data.fullName || data.phone !== undefined) {
        await tx.user.update({
          where: { id: existing.userId },
          data: {
            ...(data.fullName && { fullName: data.fullName.trim() }),
            ...(data.phone !== undefined && { phone: data.phone?.trim() || null }),
          },
        });
      }

      await tx.staffProfile.update({
        where: { id },
        data: {
          ...(data.employeeCode !== undefined && { employeeCode: data.employeeCode?.trim() || null }),
          ...(data.designation && { designation: data.designation.trim() }),
          ...(data.qualification !== undefined && { qualification: data.qualification?.trim() || null }),
          ...(data.permissionsJson && { permissionsJson: data.permissionsJson }),
        },
      });

      // Record Audit Log
      await tx.auditLog.create({
        data: {
          instituteId,
          userId: req.user?.userId || null,
          action: 'STAFF_UPDATED',
          entityType: 'StaffProfile',
          entityId: id,
          oldValues: { designation: existing.designation, employeeCode: existing.employeeCode },
          newValues: data,
        },
      });
    });

    return res.json({
      success: true,
      message: 'Staff profile updated successfully',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to update staff profile' });
  }
}

/**
 * Update Staff Status (Activate or Deactivate account)
 */
export async function updateStaffStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    const { id } = req.params;

    const parse = updateStaffStatusSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: parse.error.errors[0]?.message,
      });
    }

    const { isActive, reason } = parse.data;

    const staff = await prisma.staffProfile.findFirst({
      where: { id, instituteId },
      include: { user: true },
    });

    if (!staff) {
      return res.status(404).json({ success: false, error: 'Staff member not found' });
    }

    // Cannot deactivate yourself
    if (staff.userId === req.user?.userId) {
      return res.status(400).json({
        success: false,
        error: 'You cannot deactivate your own account',
      });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: staff.userId },
        data: { isActive },
      }),
      prisma.instituteMembership.updateMany({
        where: { instituteId, userId: staff.userId },
        data: { isActive },
      }),
      prisma.auditLog.create({
        data: {
          instituteId,
          userId: req.user?.userId || null,
          action: isActive ? 'STAFF_ACTIVATED' : 'STAFF_DEACTIVATED',
          entityType: 'StaffProfile',
          entityId: id,
          newValues: { isActive, reason },
        },
      }),
    ]);

    return res.json({
      success: true,
      message: `Staff account ${isActive ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to update staff status' });
  }
}

/**
 * Assign batches and subjects to staff (Academic Admin & Super Admin)
 */
export async function assignStaffBatches(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    const { id } = req.params;
    const { batchIds = [], assignments } = req.body;

    const staff = await prisma.staffProfile.findFirst({
      where: { id, instituteId },
    });
    if (!staff) {
      return res.status(404).json({ success: false, error: 'Staff member not found' });
    }

    // Determine all batch IDs involved
    let allBatchIds = Array.isArray(batchIds) ? [...batchIds] : [];
    if (Array.isArray(assignments)) {
      for (const a of assignments) {
        if (a.batchId && !allBatchIds.includes(a.batchId)) {
          allBatchIds.push(a.batchId);
        }
      }
    }

    // Verify all batches belong to this institute
    if (allBatchIds.length > 0) {
      const batches = await prisma.batch.findMany({
        where: { id: { in: allBatchIds }, instituteId },
        include: { batchSubjects: true },
      });

      if (batches.length !== allBatchIds.length) {
        return res.status(400).json({ success: false, error: 'One or more invalid batch IDs provided' });
      }

      // If assignments provided, validate that each subject belongs to the selected batch
      if (Array.isArray(assignments)) {
        for (const a of assignments) {
          const batch = batches.find((b) => b.id === a.batchId);
          if (!batch) {
            return res.status(400).json({ success: false, error: `Batch '${a.batchId}' not found` });
          }
          const validSubjectIds = batch.batchSubjects.map((bs) => bs.subjectId);
          if (Array.isArray(a.subjectIds)) {
            for (const sid of a.subjectIds) {
              if (!validSubjectIds.includes(sid)) {
                return res.status(400).json({
                  success: false,
                  error: `Subject '${sid}' does not belong to batch '${batch.name}'`,
                });
              }
            }
          }
        }
      }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update StaffBatchAssignment
      await tx.staffBatchAssignment.deleteMany({
        where: { staffProfileId: id },
      });

      if (allBatchIds.length > 0) {
        await tx.staffBatchAssignment.createMany({
          data: allBatchIds.map((batchId) => ({
            staffProfileId: id,
            batchId,
          })),
        });
      }

      // 2. Update BatchSubject assignments if assignments array is provided
      if (Array.isArray(assignments)) {
        // Clear previous subject assignments for this staff
        await tx.batchSubject.updateMany({
          where: { staffProfileId: id },
          data: { staffProfileId: null },
        });

        // Assign staff to specified subjects in each batch
        for (const a of assignments) {
          if (Array.isArray(a.subjectIds) && a.subjectIds.length > 0) {
            await tx.batchSubject.updateMany({
              where: {
                batchId: a.batchId,
                subjectId: { in: a.subjectIds },
              },
              data: { staffProfileId: id },
            });
          }
        }
      }

      await tx.auditLog.create({
        data: {
          instituteId,
          userId: req.user?.userId || null,
          action: 'STAFF_BATCHES_ASSIGNED',
          entityType: 'StaffProfile',
          entityId: id,
          newValues: { batchIds: allBatchIds, assignments },
        },
      });
    });

    return res.json({
      success: true,
      message: 'Staff batch and subject assignments updated successfully',
    });
  } catch (err: any) {
    console.error('[assignStaffBatches error]', err);
    return res.status(500).json({ success: false, error: 'Failed to assign batches and subjects to staff' });
  }
}

/**
 * Reset / Set permanent login password for a staff member (Academic Admin & Super Admin)
 */
export async function resetStaffPassword(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    const { id } = req.params;

    const staff = await prisma.staffProfile.findFirst({
      where: { id, instituteId },
      include: { user: true },
    });

    if (!staff) {
      return res.status(404).json({ success: false, error: 'Staff member not found in this institute' });
    }

    const parse = resetStaffPasswordSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: parse.error.errors[0]?.message || 'Validation failed',
      });
    }

    const newPassword = parse.data.password?.trim() || `Staff@${generateSecureRandomToken(4)}2026`;
    const passwordHash = await hashPassword(newPassword);

    const existingPerms = (staff.permissionsJson as Record<string, any>) || {};
    const updatedPerms = {
      ...existingPerms,
      permanentPassword: newPassword,
    };

    await prisma.$transaction([
      prisma.user.update({
        where: { id: staff.userId },
        data: {
          passwordHash,
          mustChangePassword: false,
        },
      }),
      prisma.staffProfile.update({
        where: { id: staff.id },
        data: {
          permissionsJson: updatedPerms,
        },
      }),
      prisma.auditLog.create({
        data: {
          instituteId,
          userId: req.user?.userId || null,
          action: 'STAFF_PASSWORD_RESET',
          entityType: 'StaffProfile',
          entityId: staff.id,
          newValues: { resetBy: req.user?.userId },
        },
      }),
    ]);

    const institute = await prisma.institute.findUnique({
      where: { id: instituteId },
      select: { id: true, code: true, name: true },
    });

    return res.json({
      success: true,
      message: 'Staff permanent password updated successfully',
      data: {
        staffId: staff.id,
        email: staff.user.email,
        permanentPassword: newPassword,
        institute: institute || null,
      },
    });
  } catch (err: any) {
    console.error('[Reset Staff Password Error]', err);
    return res.status(500).json({ success: false, error: 'Failed to reset staff password' });
  }
}

