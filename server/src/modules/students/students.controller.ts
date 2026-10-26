import fs from 'fs';
import path from 'path';
import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../middleware/auth.js';
import { hashPassword, generateSecureRandomToken } from '../../utils/security.js';
import {
  generateNextAdmissionNumber,
  getOrSetInstitutePrefix,
  getAdmissionYear,
} from './admission-number.service.js';
import {
  getAuthorizedStudentScope,
  isStudentAuthorized,
} from './student-authorization.service.js';
import { getRelativeStorageKey, resolveAbsolutePath } from '../../utils/storage.js';

const prisma = new PrismaClient();

export const studentAdmissionSchema = z.object({
  admissionNumber: z.string().optional(), // Automatically generated on server
  rollNumber: z.string().optional(),
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  studentPhone: z.string().optional().or(z.literal('')),
  dob: z.string().optional(), // YYYY-MM-DD
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  bloodGroup: z.string().optional(),
  notes: z.string().optional(),
  admissionDate: z.string().optional(), // YYYY-MM-DD
  // Optional batch enrollment
  batchId: z.string().uuid().optional(),
  // Optional student login account creation
  createLoginAccount: z.boolean().default(false),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  initialPassword: z.string().min(8).optional(),
  // Parent / Guardian fields during admission (Requirement 3)
  parentFullName: z.string().min(2, 'Parent/guardian full name is required').optional(),
  parentRelationship: z.enum(['FATHER', 'MOTHER', 'GUARDIAN']).default('GUARDIAN').optional(),
  parentPhone: z.string().min(8, 'Parent/guardian phone number is required').optional(),
  parentEmail: z.string().email().optional().or(z.literal('')).optional(),
  parentInitialPassword: z.string().min(8).optional(),
  parentCanReceiveSms: z.boolean().default(true).optional(),
  photoUrl: z.string().optional(),
});

export const updateStudentSchema = z.object({
  rollNumber: z.string().optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  studentPhone: z.string().optional(),
  dob: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  bloodGroup: z.string().optional(),
  notes: z.string().optional(),
  photoUrl: z.string().optional(),
});

export const updateStudentStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'PASSED_OUT', 'DISCONTINUED']),
  reason: z.string().optional(),
});

export const resetStudentPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').optional(),
});

export const updateStudentIdentifierSchema = z.object({
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().min(8, 'Phone number must be at least 8 digits').optional().or(z.literal('')),
}).refine((data) => data.email !== undefined || data.phone !== undefined, {
  message: 'At least one identifier (email or phone) must be provided',
});


/**
 * List students with filters, search, and pagination
 */
export async function listStudents(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) {
      return res.status(400).json({ success: false, error: 'Institute context required' });
    }

    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || '20', 10)));
    const search = (req.query.search as string || '').trim();
    const status = req.query.status as any;
    const batchId = req.query.batchId as string;

    const skip = (page - 1) * limit;

    const scope = await getAuthorizedStudentScope(req, prisma);

    const andConditions: any[] = [
      { instituteId },
      scope.whereClause,
    ];

    if (status && ['ACTIVE', 'PASSED_OUT', 'DISCONTINUED'].includes(status)) {
      andConditions.push({ status });
    }

    if (batchId) {
      andConditions.push({
        enrollments: {
          some: { batchId, isActive: true },
        },
      });
    }

    if (search) {
      andConditions.push({
        OR: [
          { admissionNumber: { contains: search, mode: 'insensitive' } },
          { rollNumber: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    const where: any = { AND: andConditions };

    const [total, students] = await Promise.all([
      prisma.student.count({ where }),
      prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        include: {
          enrollments: {
            where: { isActive: true },
            include: {
              batch: {
                select: { id: true, name: true, academicYear: true },
              },
            },
          },
          parentRelations: {
            include: {
              parent: {
                include: {
                  user: {
                    select: { id: true, fullName: true, phone: true, email: true },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        students,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to list students' });
  }
}

/**
 * Admit a new student
 */
export async function admitStudent(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) {
      return res.status(400).json({ success: false, error: 'Institute context required' });
    }

    const parse = studentAdmissionSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: parse.error.errors[0]?.message || 'Validation error',
      });
    }

    const data = parse.data;

    let parsedDob: Date | null = null;
    if (data.dob) {
      parsedDob = new Date(data.dob);
    }

    let parsedAdmissionDate = new Date();
    if (data.admissionDate) {
      parsedAdmissionDate = new Date(data.admissionDate);
    }

    // Execute in transaction with safe retry handling for pooler concurrency and unique-constraint conflicts
    let result: any;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        result = await prisma.$transaction(
          async (tx) => {
            // Generate atomic, concurrency-safe institute-based admission number
            const admissionInfo = await generateNextAdmissionNumber(
              tx,
              instituteId,
              parsedAdmissionDate
            );
            const admissionNumber = admissionInfo.admissionNumber;

            let studentUser = null;
            let tempPassword = null;

            if (data.createLoginAccount && (data.email || data.phone)) {
              tempPassword = data.initialPassword || `Student#${generateSecureRandomToken(4)}2026`;
              const passwordHash = await hashPassword(tempPassword);

              studentUser = await tx.user.create({
                data: {
                  email: data.email?.trim() || null,
                  phone: data.phone?.trim() || null,
                  fullName: `${data.firstName.trim()} ${data.lastName.trim()}`,
                  passwordHash,
                  role: 'STUDENT',
                  isActive: true,
                  mustChangePassword: true,
                },
              });

              await tx.instituteMembership.create({
                data: {
                  instituteId,
                  userId: studentUser.id,
                  role: 'STUDENT',
                  isActive: true,
                },
              });
            }

            // Create Student profile
            const student = await tx.student.create({
              data: {
                instituteId,
                userId: studentUser?.id || null,
                admissionNumber,
                rollNumber: data.rollNumber?.trim() || null,
                firstName: data.firstName.trim(),
                lastName: data.lastName.trim(),
                phone: data.studentPhone?.trim() || (data.createLoginAccount ? data.phone?.trim() : null) || null,
                dob: parsedDob,
                gender: data.gender || null,
                bloodGroup: data.bloodGroup?.trim() || null,
                notes: data.notes?.trim() || null,
                photoUrl: data.photoUrl?.trim() || null,
                createdByUserId: req.user?.userId || null,
                admissionDate: parsedAdmissionDate,
                status: 'ACTIVE',
              },
            });

            // Batch enrollment if provided
            if (data.batchId) {
              // Validate batch belongs to this institute
              const batch = await tx.batch.findFirst({
                where: { id: data.batchId, instituteId },
              });

              if (!batch) {
                throw new Error('Selected batch does not belong to this institute');
              }

              await tx.studentEnrollment.create({
                data: {
                  studentId: student.id,
                  batchId: data.batchId,
                  isActive: true,
                },
              });
            }

            // Parent Account Creation & Linking (Requirement 3)
            let parentUser = null;
            let parentProfile = null;
            let parentTempPassword = null;

            if (data.parentFullName && data.parentPhone) {
              const cleanParentPhone = data.parentPhone.trim();
              const cleanParentEmail = data.parentEmail?.trim().toLowerCase() || null;

              // Check if a parent user already exists by phone or email
              const existingUser = await tx.user.findFirst({
                where: {
                  OR: [
                    { phone: cleanParentPhone },
                    ...(cleanParentEmail ? [{ email: cleanParentEmail }] : []),
                  ],
                },
                include: { parentProfile: true },
              });

              if (existingUser) {
                if (existingUser.role !== 'PARENT') {
                  throw new Error(`Phone or email is already registered to a non-parent account (${existingUser.role}).`);
                }

                parentUser = existingUser;

                // Ensure ParentProfile exists
                if (existingUser.parentProfile) {
                  parentProfile = existingUser.parentProfile;
                } else {
                  parentProfile = await tx.parentProfile.create({
                    data: { userId: existingUser.id },
                  });
                }

                // Ensure membership exists for this institute
                const existingMembership = await tx.instituteMembership.findUnique({
                  where: {
                    instituteId_userId: {
                      instituteId,
                      userId: existingUser.id,
                    },
                  },
                });

                if (!existingMembership) {
                  await tx.instituteMembership.create({
                    data: {
                      instituteId,
                      userId: existingUser.id,
                      role: 'PARENT',
                      isActive: true,
                    },
                  });
                }
              } else {
                // Create new parent account
                parentTempPassword = data.parentInitialPassword?.trim() || `Parent#${generateSecureRandomToken(4)}2026`;
                const parentPasswordHash = await hashPassword(parentTempPassword);

                parentUser = await tx.user.create({
                  data: {
                    fullName: data.parentFullName.trim(),
                    phone: cleanParentPhone,
                    email: cleanParentEmail,
                    passwordHash: parentPasswordHash,
                    role: 'PARENT',
                    isActive: true,
                    mustChangePassword: true,
                  },
                });

                await tx.instituteMembership.create({
                  data: {
                    instituteId,
                    userId: parentUser.id,
                    role: 'PARENT',
                    isActive: true,
                  },
                });

                parentProfile = await tx.parentProfile.create({
                  data: {
                    userId: parentUser.id,
                    isPhoneVerified: true,
                  },
                });
              }

              // Link student to parent
              await tx.studentParentRelation.upsert({
                where: {
                  studentId_parentId: {
                    studentId: student.id,
                    parentId: parentProfile.id,
                  },
                },
                create: {
                  studentId: student.id,
                  parentId: parentProfile.id,
                  relation: data.parentRelationship || 'GUARDIAN',
                  isPrimaryContact: true,
                  canReceiveSms: data.parentCanReceiveSms ?? true,
                },
                update: {
                  relation: data.parentRelationship || 'GUARDIAN',
                  isPrimaryContact: true,
                  canReceiveSms: data.parentCanReceiveSms ?? true,
                },
              });
            }

            // Record Audit Log
            await tx.auditLog.create({
              data: {
                instituteId,
                userId: req.user?.userId || null,
                action: 'STUDENT_ADMITTED',
                entityType: 'Student',
                entityId: student.id,
                newValues: {
                  admissionNumber: student.admissionNumber,
                  name: `${student.firstName} ${student.lastName}`,
                  batchId: data.batchId || null,
                  hasParentAccount: !!parentUser,
                },
              },
            });

            return { student, studentUser, tempPassword, admissionInfo, parentUser, parentProfile, parentTempPassword };
          },
          {
            maxWait: 15000,
            timeout: 20000,
          }
        );
        break; // Successfully committed, exit retry loop
      } catch (txErr: any) {
        // Retry only on transient pool acquisition timeouts, write conflicts, or unique constraint race
        if (
          attempt < 3 &&
          (txErr.code === 'P2028' || txErr.code === 'P2034' || txErr.code === 'P2002')
        ) {
          await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
          continue;
        }
        throw txErr;
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Student admitted successfully',
      data: {
        student: result.student,
        admissionNumber: result.student.admissionNumber,
        admissionInfo: result.admissionInfo,
        userAccount: result.studentUser ? {
          id: result.studentUser.id,
          email: result.studentUser.email,
          phone: result.studentUser.phone,
          temporaryPassword: result.tempPassword,
        } : null,
        parentAccount: result.parentUser ? {
          id: result.parentUser.id,
          fullName: result.parentUser.fullName,
          phone: result.parentUser.phone,
          email: result.parentUser.email,
          temporaryPassword: result.parentTempPassword,
        } : null,
      },
    });
  } catch (err: any) {
    if (err.message && err.message.includes('batch does not belong')) {
      return res.status(400).json({ success: false, error: err.message });
    }
    console.error('[Admit Student Error]', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to admit student' });
  }
}

/**
 * Get admission number prefix & preview pattern for the active institute
 */
export async function getAdmissionPrefixInfo(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) {
      return res.status(400).json({ success: false, error: 'Institute context required' });
    }

    const prefix = await getOrSetInstitutePrefix(prisma, instituteId);
    const currentYear = getAdmissionYear(new Date());

    return res.json({
      success: true,
      data: {
        prefix,
        currentYear,
        previewFormat: `${prefix}-${currentYear}-001`,
        note: 'Generated automatically for this institute',
      },
    });
  } catch (err: any) {
    console.error('[Get Admission Prefix Error]', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to get admission prefix' });
  }
}

/**
 * Get profile for currently logged-in student
 */
export async function getMyStudentProfile(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user || req.user.role !== 'STUDENT') {
      return res.status(403).json({ success: false, error: 'Only student accounts can access this profile' });
    }

    const student = await prisma.student.findFirst({
      where: {
        userId: req.user.userId,
      },
      include: {
        institute: {
          select: { id: true, name: true, code: true, address: true, phone: true },
        },
        enrollments: {
          where: { isActive: true },
          include: {
            batch: true,
            subject: true,
          },
        },
        parentRelations: {
          include: {
            parent: {
              include: {
                user: {
                  select: { id: true, fullName: true, phone: true, email: true },
                },
              },
            },
          },
        },
        attendanceEvents: {
          take: 10,
          orderBy: { eventTime: 'desc' },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ success: false, error: 'No student record associated with this account' });
    }

    return res.json({
      success: true,
      data: { student },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to fetch student profile' });
  }
}

/**
 * Get student details by ID
 */
export async function getStudentById(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    const { id } = req.params;

    // Enforce strict staff-to-student and role-based data isolation
    const authorized = await isStudentAuthorized(req, id, prisma);
    if (!authorized) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You are not authorized to view this student record',
      });
    }

    const student = await prisma.student.findFirst({
      where: {
        id,
        instituteId,
      },
      include: {
        createdByUser: {
          select: { id: true, fullName: true, role: true },
        },
        institute: {
          select: { id: true, name: true, code: true, phone: true, email: true },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
            mustChangePassword: true,
            createdAt: true,
            lastLoginAt: true,
          },
        },
        enrollments: {
          where: { isActive: true },
          include: {
            batch: true,
            subject: true,
          },
        },
        parentRelations: {
          include: {
            parent: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    phone: true,
                    email: true,
                    role: true,
                    isActive: true,
                    mustChangePassword: true,
                    createdAt: true,
                    lastLoginAt: true,
                  },
                },
              },
            },
          },
        },
        attendanceEvents: {
          take: 10,
          orderBy: { eventTime: 'desc' },
          select: { id: true, eventTime: true, eventType: true, isLate: true, remarks: true },
        },
        feeAssignments: {
          include: { feeStructure: true },
        },
        _count: {
          select: {
            attendanceEvents: true,
            examMarks: true,
            feeAssignments: true,
          },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found in this institute' });
    }

    return res.json({
      success: true,
      data: { student },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to fetch student details' });
  }
}

/**
 * Update student profile
 */
export async function updateStudent(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    const { id } = req.params;

    const parse = updateStudentSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: parse.error.errors[0]?.message,
      });
    }

    const authorized = await isStudentAuthorized(req, id, prisma);
    if (!authorized) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You are not authorized to update this student',
      });
    }

    const existing = await prisma.student.findFirst({
      where: { id, instituteId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Student not found in this institute' });
    }

    const data = parse.data;
    const updateData: any = {};

    if (data.rollNumber !== undefined) updateData.rollNumber = data.rollNumber?.trim() || null;
    if (data.firstName) updateData.firstName = data.firstName.trim();
    if (data.lastName) updateData.lastName = data.lastName.trim();
    if (data.studentPhone !== undefined) updateData.phone = data.studentPhone?.trim() || null;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.bloodGroup !== undefined) updateData.bloodGroup = data.bloodGroup?.trim() || null;
    if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;
    if (data.photoUrl !== undefined) updateData.photoUrl = data.photoUrl?.trim() || null;
    if (data.dob) updateData.dob = new Date(data.dob);

    const updated = await prisma.student.update({
      where: { id },
      data: updateData,
    });

    // Record Audit Log
    await prisma.auditLog.create({
      data: {
        instituteId,
        userId: req.user?.userId || null,
        action: 'STUDENT_UPDATED',
        entityType: 'Student',
        entityId: id,
        oldValues: existing as any,
        newValues: updated as any,
      },
    });

    return res.json({
      success: true,
      message: 'Student profile updated successfully',
      data: { student: updated },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to update student profile' });
  }
}

/**
 * Reset student login password (Staff / Academic Admin only)
 */
export async function resetStudentPassword(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) {
      return res.status(400).json({ success: false, error: 'Institute context required' });
    }
    const { id } = req.params;

    const parse = resetStudentPasswordSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ success: false, error: parse.error.errors[0]?.message || 'Invalid input' });
    }

    const authorized = await isStudentAuthorized(req, id, prisma);
    if (!authorized) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You are not authorized to reset credentials for this student',
      });
    }

    const student = await prisma.student.findFirst({
      where: { id, instituteId },
      include: { user: true },
    });

    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found in this institute' });
    }

    let targetUserId = student.userId;
    const temporaryPassword =
      parse.data?.password?.trim() ||
      parse.data?.newPassword?.trim() ||
      `Student#${generateSecureRandomToken(4)}2026`;
    const passwordHash = await hashPassword(temporaryPassword);

    if (!targetUserId) {
      // Create student user account if it did not exist
      const studentUser = await prisma.user.create({
        data: {
          fullName: `${student.firstName} ${student.lastName}`,
          phone: student.phone || null,
          passwordHash,
          role: 'STUDENT',
          isActive: true,
          mustChangePassword: true,
        },
      });

      await prisma.instituteMembership.create({
        data: {
          instituteId,
          userId: studentUser.id,
          role: 'STUDENT',
          isActive: true,
        },
      });

      await prisma.student.update({
        where: { id: student.id },
        data: { userId: studentUser.id },
      });

      targetUserId = studentUser.id;
    } else {
      await prisma.user.update({
        where: { id: targetUserId },
        data: {
          passwordHash,
          mustChangePassword: true,
        },
      });
    }

    // Invalidate any password reset tokens
    await prisma.passwordResetToken.deleteMany({
      where: { userId: targetUserId },
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        instituteId,
        userId: req.user?.userId || null,
        action: 'STUDENT_PASSWORD_RESET',
        entityType: 'Student',
        entityId: student.id,
        newValues: {
          studentId: student.id,
          userId: targetUserId,
          resetBy: req.user?.userId,
        },
      },
    });

    return res.json({
      success: true,
      message: 'Student password reset successfully',
      data: {
        temporaryPassword,
        mustChangePassword: true,
      },
    });
  } catch (err: any) {
    console.error('[Reset Student Password Error]', err);
    return res.status(500).json({ success: false, error: 'Failed to reset student password' });
  }
}

/**
 * Update student login identifier (email/phone)
 */
export async function updateStudentLoginIdentifier(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) {
      return res.status(400).json({ success: false, error: 'Institute context required' });
    }
    const { id } = req.params;

    const parse = updateStudentIdentifierSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ success: false, error: parse.error.errors[0]?.message || 'Invalid input' });
    }

    const authorized = await isStudentAuthorized(req, id, prisma);
    if (!authorized) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You are not authorized to update credentials for this student',
      });
    }

    const student = await prisma.student.findFirst({
      where: { id, instituteId },
      include: { user: true },
    });

    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found in this institute' });
    }

    const cleanEmail = parse.data.email !== undefined ? (parse.data.email.trim().toLowerCase() || null) : undefined;
    const cleanPhone = parse.data.phone !== undefined ? (parse.data.phone.trim() || null) : undefined;

    // Check duplicate email
    if (cleanEmail) {
      const existingEmail = await prisma.user.findFirst({
        where: { email: cleanEmail, id: { not: student.userId || undefined } },
      });
      if (existingEmail) {
        return res.status(409).json({ success: false, error: `Email '${cleanEmail}' is already in use by another account` });
      }
    }

    // Check duplicate phone
    if (cleanPhone) {
      const existingPhone = await prisma.user.findFirst({
        where: { phone: cleanPhone, id: { not: student.userId || undefined } },
      });
      if (existingPhone) {
        return res.status(409).json({ success: false, error: `Phone '${cleanPhone}' is already in use by another account` });
      }
    }

    await prisma.$transaction(async (tx) => {
      if (student.userId) {
        await tx.user.update({
          where: { id: student.userId },
          data: {
            ...(cleanEmail !== undefined ? { email: cleanEmail } : {}),
            ...(cleanPhone !== undefined ? { phone: cleanPhone } : {}),
          },
        });
      }

      if (cleanPhone !== undefined) {
        await tx.student.update({
          where: { id: student.id },
          data: { phone: cleanPhone },
        });
      }

      await tx.auditLog.create({
        data: {
          instituteId,
          userId: req.user?.userId || null,
          action: 'STUDENT_IDENTIFIER_UPDATED',
          entityType: 'Student',
          entityId: student.id,
          newValues: {
            email: cleanEmail,
            phone: cleanPhone,
          },
        },
      });
    });

    return res.json({
      success: true,
      message: 'Student login credentials updated successfully',
    });
  } catch (err: any) {
    console.error('[Update Student Identifier Error]', err);
    return res.status(500).json({ success: false, error: 'Failed to update student identifier' });
  }
}

/**
 * Update Student Status (ACTIVE, PASSED_OUT, DISCONTINUED)
 */
export async function updateStudentStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    const { id } = req.params;

    const parse = updateStudentStatusSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: parse.error.errors[0]?.message,
      });
    }

    const { status, reason } = parse.data;

    const authorized = await isStudentAuthorized(req, id, prisma);
    if (!authorized) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You are not authorized to update status for this student',
      });
    }

    const existing = await prisma.student.findFirst({
      where: { id, instituteId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Student not found in this institute' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const student = await tx.student.update({
        where: { id },
        data: { status },
      });

      // Deactivate active batch enrollments if student is passing out or discontinued
      if (status === 'PASSED_OUT' || status === 'DISCONTINUED') {
        await tx.studentEnrollment.updateMany({
          where: { studentId: id, isActive: true },
          data: { isActive: false },
        });
      }

      // Record Audit Log
      await tx.auditLog.create({
        data: {
          instituteId,
          userId: req.user?.userId || null,
          action: 'STUDENT_STATUS_CHANGED',
          entityType: 'Student',
          entityId: id,
          oldValues: { status: existing.status },
          newValues: { status, reason: reason || 'Status updated by authorized staff' },
        },
      });

      return student;
    });

    return res.json({
      success: true,
      message: `Student status updated to ${status}`,
      data: { student: updated },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to update student status' });
  }
}

/**
 * Upload student photograph (for an existing student or direct admission upload)
 */
export async function uploadStudentPhoto(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) return res.status(400).json({ success: false, error: 'Institute context required' });
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No photograph file was uploaded' });
    }

    const relativeKey = getRelativeStorageKey(instituteId, req.file.filename);

    if (id && id !== 'admission') {
      const authorized = await isStudentAuthorized(req, id, prisma);
      if (!authorized) {
        return res.status(403).json({ success: false, error: 'Forbidden: Not authorized to update this student photograph' });
      }

      await prisma.student.update({
        where: { id },
        data: { photoUrl: relativeKey },
      });

      return res.json({
        success: true,
        message: 'Student photograph uploaded successfully',
        data: {
          photoStorageKey: relativeKey,
          photoUrl: `/api/students/${id}/photo`,
        },
      });
    }

    // Direct pre-admission upload
    return res.json({
      success: true,
      message: 'Photograph uploaded for admission form',
      data: {
        photoStorageKey: relativeKey,
        photoUrl: `/api/students/photo-raw/${encodeURIComponent(relativeKey)}`,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to upload student photograph' });
  }
}

/**
 * Get student photograph with authorized access control
 */
export async function getStudentPhoto(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    const { id } = req.params;

    const authorized = await isStudentAuthorized(req, id, prisma);
    if (!authorized) {
      return res.status(403).json({ success: false, error: 'Forbidden: You are not authorized to view this student photograph' });
    }

    const student = await prisma.student.findFirst({
      where: { id, instituteId },
      select: { photoUrl: true },
    });

    if (!student || !student.photoUrl) {
      return res.status(404).json({ success: false, error: 'No photograph on file for this student' });
    }

    if (student.photoUrl.startsWith('http://') || student.photoUrl.startsWith('https://')) {
      return res.redirect(student.photoUrl);
    }

    const absPath = resolveAbsolutePath(student.photoUrl);
    if (!absPath || !fs.existsSync(absPath)) {
      return res.status(404).json({ success: false, error: 'Photograph file not found on server' });
    }

    const ext = path.extname(absPath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    };

    res.setHeader('Content-Type', mimeTypes[ext] || 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    return fs.createReadStream(absPath).pipe(res);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to stream student photograph' });
  }
}

/**
 * Stream photograph by storage key (tenant verified)
 */
export async function getRawPhoto(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    const key = decodeURIComponent(req.params.key);

    if (!key.startsWith(`${instituteId}/`)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Cross-institute photograph access rejected' });
    }

    const absPath = resolveAbsolutePath(key);
    if (!absPath || !fs.existsSync(absPath)) {
      return res.status(404).json({ success: false, error: 'Photograph file not found' });
    }

    const ext = path.extname(absPath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    };

    res.setHeader('Content-Type', mimeTypes[ext] || 'image/jpeg');
    return fs.createReadStream(absPath).pipe(res);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to stream photograph' });
  }
}
