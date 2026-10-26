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

const prisma = new PrismaClient();

export const studentAdmissionSchema = z.object({
  admissionNumber: z.string().optional(), // Automatically generated on server
  rollNumber: z.string().optional(),
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
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
});

export const updateStudentSchema = z.object({
  rollNumber: z.string().optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  dob: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  bloodGroup: z.string().optional(),
  notes: z.string().optional(),
});

export const updateStudentStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'PASSED_OUT', 'DISCONTINUED']),
  reason: z.string().optional(),
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

    const where: any = { instituteId };

    if (status && ['ACTIVE', 'PASSED_OUT', 'DISCONTINUED'].includes(status)) {
      where.status = status;
    }

    if (batchId) {
      where.enrollments = {
        some: { batchId, isActive: true },
      };
    }

    if (search) {
      where.OR = [
        { admissionNumber: { contains: search, mode: 'insensitive' } },
        { rollNumber: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

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
                dob: parsedDob,
                gender: data.gender || null,
                bloodGroup: data.bloodGroup?.trim() || null,
                notes: data.notes?.trim() || null,
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
                },
              },
            });

            return { student, studentUser, tempPassword, admissionInfo };
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
      },
    });
  } catch (err: any) {
    if (err.message && err.message.includes('batch does not belong')) {
      return res.status(400).json({ success: false, error: err.message });
    }
    console.error('[Admit Student Error]', err);
    return res.status(500).json({ success: false, error: 'Failed to admit student' });
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

    // If caller is a parent, verify they are linked to this student
    if (req.user?.role === 'PARENT') {
      const relation = await prisma.studentParentRelation.findFirst({
        where: {
          studentId: id,
          parent: { userId: req.user.userId },
        },
      });

      if (!relation) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: You are not authorized to view this student',
        });
      }
    }

    // If caller is a student, verify it is their own profile
    if (req.user?.role === 'STUDENT') {
      const student = await prisma.student.findUnique({ where: { id } });
      if (!student || student.userId !== req.user.userId) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: You can only view your own student profile',
        });
      }
    }

    const student = await prisma.student.findFirst({
      where: {
        id,
        instituteId,
      },
      include: {
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
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.bloodGroup !== undefined) updateData.bloodGroup = data.bloodGroup?.trim() || null;
    if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;
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

    const existing = await prisma.student.findFirst({
      where: { id, instituteId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Student not found in this institute' });
    }

    const updated = await prisma.student.update({
      where: { id },
      data: { status },
    });

    // Record Audit Log
    await prisma.auditLog.create({
      data: {
        instituteId,
        userId: req.user?.userId || null,
        action: 'STUDENT_STATUS_CHANGED',
        entityType: 'Student',
        entityId: id,
        oldValues: { status: existing.status },
        newValues: { status, reason },
      },
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
