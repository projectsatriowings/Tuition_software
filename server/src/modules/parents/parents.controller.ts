import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../middleware/auth.js';
import { hashPassword, generateSecureRandomToken } from '../../utils/security.js';

const prisma = new PrismaClient();

export const createParentSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  occupation: z.string().optional(),
  address: z.string().optional(),
  altPhone: z.string().optional(),
  initialPassword: z.string().min(8).optional(),
});

export const updateParentSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().min(10).optional(),
  email: z.string().email().optional().or(z.literal('')),
  occupation: z.string().optional(),
  address: z.string().optional(),
  altPhone: z.string().optional(),
});

export const linkGuardianSchema = z.object({
  parentId: z.string().uuid('Valid parent ID required'),
  relation: z.enum(['FATHER', 'MOTHER', 'GUARDIAN']).default('GUARDIAN'),
  isPrimaryContact: z.boolean().default(false),
  canReceiveSms: z.boolean().default(true),
});

/**
 * List parents in institute
 */
export async function listParents(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) {
      return res.status(400).json({ success: false, error: 'Institute context required' });
    }

    const search = (req.query.search as string || '').trim();

    const where: any = {
      user: {
        memberships: {
          some: { instituteId },
        },
      },
    };

    if (search) {
      where.OR = [
        { user: { fullName: { contains: search, mode: 'insensitive' } } },
        { user: { phone: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const parents = await prisma.parentProfile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
            isActive: true,
            lastLoginAt: true,
          },
        },
        studentRelations: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                admissionNumber: true,
                rollNumber: true,
                status: true,
              },
            },
          },
        },
      },
    });

    return res.json({
      success: true,
      data: { parents },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to list parents' });
  }
}

/**
 * Provision new Parent account
 */
export async function createParent(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) {
      return res.status(400).json({ success: false, error: 'Institute context required' });
    }

    const parse = createParentSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: parse.error.errors[0]?.message || 'Validation error',
      });
    }

    const data = parse.data;
    const phone = data.phone.trim();
    const email = data.email?.trim().toLowerCase() || null;

    // Check if user with phone or email exists
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { phone },
          ...(email ? [{ email }] : []),
        ],
      },
    });

    if (existing) {
      // Check if existing user is already a parent and add institute membership
      if (existing.role === 'PARENT') {
        const membership = await prisma.instituteMembership.findUnique({
          where: {
            instituteId_userId: {
              instituteId,
              userId: existing.id,
            },
          },
        });

        if (!membership) {
          await prisma.instituteMembership.create({
            data: {
              instituteId,
              userId: existing.id,
              role: 'PARENT',
              isActive: true,
            },
          });
        }

        const parentProfile = await prisma.parentProfile.findUnique({
          where: { userId: existing.id },
        });

        return res.status(200).json({
          success: true,
          message: 'Existing parent profile linked to this institute',
          data: { parentProfile, userId: existing.id },
        });
      }

      return res.status(409).json({
        success: false,
        error: `A user with this phone or email already exists with role '${existing.role}'`,
      });
    }

    const tempPassword = data.initialPassword || `Parent#${generateSecureRandomToken(4)}2026`;
    const passwordHash = await hashPassword(tempPassword);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create User
      const user = await tx.user.create({
        data: {
          fullName: data.fullName.trim(),
          phone,
          email,
          passwordHash,
          role: 'PARENT',
          isActive: true,
          mustChangePassword: true,
        },
      });

      // 2. Create Membership
      await tx.instituteMembership.create({
        data: {
          instituteId,
          userId: user.id,
          role: 'PARENT',
          isActive: true,
        },
      });

      // 3. Create ParentProfile
      const parentProfile = await tx.parentProfile.create({
        data: {
          userId: user.id,
          occupation: data.occupation?.trim() || null,
          address: data.address?.trim() || null,
          altPhone: data.altPhone?.trim() || null,
          isPhoneVerified: true,
        },
      });

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          instituteId,
          userId: req.user?.userId || null,
          action: 'PARENT_PROVISIONED',
          entityType: 'ParentProfile',
          entityId: parentProfile.id,
          newValues: {
            fullName: user.fullName,
            phone: user.phone,
          },
        },
      });

      return { user, parentProfile };
    });

    return res.status(201).json({
      success: true,
      message: 'Parent profile created successfully',
      data: {
        parent: result.parentProfile,
        user: {
          id: result.user.id,
          fullName: result.user.fullName,
          phone: result.user.phone,
          email: result.user.email,
        },
        temporaryPassword: tempPassword,
      },
    });
  } catch (err: any) {
    console.error('[Create Parent Error]', err);
    return res.status(500).json({ success: false, error: 'Failed to create parent account' });
  }
}

/**
 * Link Parent/Guardian to Student
 */
export async function linkGuardianToStudent(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    const { studentId } = req.params;

    const parse = linkGuardianSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: parse.error.errors[0]?.message,
      });
    }

    const { parentId, relation, isPrimaryContact, canReceiveSms } = parse.data;

    // Verify student belongs to this institute
    const student = await prisma.student.findFirst({
      where: { id: studentId, instituteId },
    });
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found in this institute' });
    }

    // Verify parent profile exists
    const parent = await prisma.parentProfile.findUnique({
      where: { id: parentId },
      include: { user: true },
    });
    if (!parent) {
      return res.status(404).json({ success: false, error: 'Parent profile not found' });
    }

    // Check duplicate relationship
    const existingLink = await prisma.studentParentRelation.findUnique({
      where: {
        studentId_parentId: {
          studentId,
          parentId,
        },
      },
    });
    if (existingLink) {
      return res.status(409).json({
        success: false,
        error: 'This parent is already linked to this student',
      });
    }

    // If setting as primary, clear any previous primary flag
    if (isPrimaryContact) {
      await prisma.studentParentRelation.updateMany({
        where: { studentId },
        data: { isPrimaryContact: false },
      });
    }

    const link = await prisma.studentParentRelation.create({
      data: {
        studentId,
        parentId,
        relation,
        isPrimaryContact,
        canReceiveSms,
      },
      include: {
        parent: {
          include: {
            user: {
              select: { id: true, fullName: true, phone: true },
            },
          },
        },
      },
    });

    // Record Audit Log
    await prisma.auditLog.create({
      data: {
        instituteId,
        userId: req.user?.userId || null,
        action: 'GUARDIAN_LINKED',
        entityType: 'StudentParentRelation',
        entityId: link.id,
        newValues: { studentId, parentId, relation, isPrimaryContact },
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Guardian linked to student successfully',
      data: { link },
    });
  } catch (err: any) {
    console.error('[Link Guardian Error]', err);
    return res.status(500).json({ success: false, error: 'Failed to link guardian to student' });
  }
}

/**
 * Revoke guardian link
 */
export async function revokeGuardianLink(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    const { studentId, parentId } = req.params;

    // Verify student belongs to this institute
    const student = await prisma.student.findFirst({
      where: { id: studentId, instituteId },
    });
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found in this institute' });
    }

    const existing = await prisma.studentParentRelation.findUnique({
      where: {
        studentId_parentId: {
          studentId,
          parentId,
        },
      },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Guardian link not found' });
    }

    await prisma.studentParentRelation.delete({
      where: { id: existing.id },
    });

    await prisma.auditLog.create({
      data: {
        instituteId,
        userId: req.user?.userId || null,
        action: 'GUARDIAN_UNLINKED',
        entityType: 'StudentParentRelation',
        entityId: existing.id,
        oldValues: existing as any,
      },
    });

    return res.json({
      success: true,
      message: 'Guardian link revoked successfully',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to revoke guardian link' });
  }
}

/**
 * Get Parent's authorized children (Parent role only)
 */
export async function getMyChildren(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'PARENT') {
      return res.status(403).json({ success: false, error: 'Forbidden: Parent access only' });
    }

    const parentProfile = await prisma.parentProfile.findUnique({
      where: { userId: req.user.userId },
    });

    if (!parentProfile) {
      return res.status(404).json({ success: false, error: 'Parent profile not found' });
    }

    const relations = await prisma.studentParentRelation.findMany({
      where: { parentId: parentProfile.id },
      include: {
        student: {
          include: {
            institute: {
              select: { id: true, name: true, code: true, phone: true },
            },
            enrollments: {
              where: { isActive: true },
              include: {
                batch: {
                  select: { id: true, name: true, academicYear: true },
                },
              },
            },
            _count: {
              select: {
                attendanceEvents: true,
                examMarks: true,
              },
            },
          },
        },
      },
    });

    const children = relations.map((rel) => ({
      relationship: rel.relation,
      isPrimaryContact: rel.isPrimaryContact,
      canReceiveSms: rel.canReceiveSms,
      student: rel.student,
    }));

    return res.json({
      success: true,
      data: { children },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to fetch linked children' });
  }
}

export const resetParentPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').optional(),
});

export const updateParentIdentifierSchema = z.object({
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().min(8, 'Phone number must be at least 8 digits').optional().or(z.literal('')),
}).refine((data) => data.email !== undefined || data.phone !== undefined, {
  message: 'At least one identifier (email or phone) must be provided',
});

/**
 * Reset Parent Password by authorized staff/admin
 */
export async function resetParentPassword(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    const { parentId } = req.params;

    const parse = resetParentPasswordSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ success: false, error: parse.error.errors[0]?.message || 'Invalid input' });
    }

    // Verify parent exists
    const parentProfile = await prisma.parentProfile.findUnique({
      where: { id: parentId },
      include: {
        user: true,
        studentRelations: {
          include: { student: true },
        },
      },
    });

    if (!parentProfile) {
      return res.status(404).json({ success: false, error: 'Parent profile not found' });
    }

    // Check institute scope: parent has student in this institute or membership
    const isInstStudent = parentProfile.studentRelations.some((r) => r.student.instituteId === instituteId);
    const membership = await prisma.instituteMembership.findUnique({
      where: {
        instituteId_userId: {
          instituteId: instituteId!,
          userId: parentProfile.userId,
        },
      },
    });

    if (!isInstStudent && !membership) {
      return res.status(403).json({ success: false, error: 'Forbidden: Parent is not linked to this institute' });
    }

    const temporaryPassword =
      parse.data?.password?.trim() ||
      parse.data?.newPassword?.trim() ||
      `Parent#${generateSecureRandomToken(4)}2026`;
    const passwordHash = await hashPassword(temporaryPassword);

    await prisma.user.update({
      where: { id: parentProfile.userId },
      data: {
        passwordHash,
        mustChangePassword: true,
      },
    });

    // Invalidate reset tokens
    await prisma.passwordResetToken.deleteMany({
      where: { userId: parentProfile.userId },
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        instituteId,
        userId: req.user?.userId || null,
        action: 'PARENT_PASSWORD_RESET',
        entityType: 'ParentProfile',
        entityId: parentProfile.id,
        newValues: {
          parentId: parentProfile.id,
          userId: parentProfile.userId,
          resetBy: req.user?.userId,
        },
      },
    });

    return res.json({
      success: true,
      message: 'Parent password reset successfully',
      data: {
        temporaryPassword,
        mustChangePassword: true,
      },
    });
  } catch (err: any) {
    console.error('[Reset Parent Password Error]', err);
    return res.status(500).json({ success: false, error: 'Failed to reset parent password' });
  }
}

/**
 * Update Parent Login Identifier (phone/email)
 */
export async function updateParentLoginIdentifier(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    const { parentId } = req.params;

    const parse = updateParentIdentifierSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ success: false, error: parse.error.errors[0]?.message || 'Invalid input' });
    }

    const parentProfile = await prisma.parentProfile.findUnique({
      where: { id: parentId },
      include: {
        user: true,
        studentRelations: {
          include: { student: true },
        },
      },
    });

    if (!parentProfile) {
      return res.status(404).json({ success: false, error: 'Parent profile not found' });
    }

    // Check institute scope
    const isInstStudent = parentProfile.studentRelations.some((r) => r.student.instituteId === instituteId);
    const membership = await prisma.instituteMembership.findUnique({
      where: {
        instituteId_userId: {
          instituteId: instituteId!,
          userId: parentProfile.userId,
        },
      },
    });

    if (!isInstStudent && !membership) {
      return res.status(403).json({ success: false, error: 'Forbidden: Parent is not linked to this institute' });
    }

    const cleanEmail = parse.data.email !== undefined ? (parse.data.email.trim().toLowerCase() || null) : undefined;
    const cleanPhone = parse.data.phone !== undefined ? (parse.data.phone.trim() || null) : undefined;

    // Check duplicate email
    if (cleanEmail) {
      const existingEmail = await prisma.user.findFirst({
        where: { email: cleanEmail, id: { not: parentProfile.userId } },
      });
      if (existingEmail) {
        return res.status(409).json({ success: false, error: `Email '${cleanEmail}' is already registered to another account` });
      }
    }

    // Check duplicate phone
    if (cleanPhone) {
      const existingPhone = await prisma.user.findFirst({
        where: { phone: cleanPhone, id: { not: parentProfile.userId } },
      });
      if (existingPhone) {
        return res.status(409).json({ success: false, error: `Phone '${cleanPhone}' is already registered to another account` });
      }
    }

    await prisma.user.update({
      where: { id: parentProfile.userId },
      data: {
        ...(cleanEmail !== undefined ? { email: cleanEmail } : {}),
        ...(cleanPhone !== undefined ? { phone: cleanPhone } : {}),
      },
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        instituteId,
        userId: req.user?.userId || null,
        action: 'PARENT_IDENTIFIER_UPDATED',
        entityType: 'ParentProfile',
        entityId: parentProfile.id,
        newValues: {
          email: cleanEmail,
          phone: cleanPhone,
        },
      },
    });

    return res.json({
      success: true,
      message: 'Parent contact / login identifier updated successfully',
    });
  } catch (err: any) {
    console.error('[Update Parent Identifier Error]', err);
    return res.status(500).json({ success: false, error: 'Failed to update parent login identifier' });
  }
}

