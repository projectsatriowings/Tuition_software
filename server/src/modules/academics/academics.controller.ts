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

export const updateBatchSchema = z.object({
  name: z.string().min(2, 'Batch name is required').optional(),
  academicYear: z.string().min(4, 'Academic year is required').optional(),
  startDate: z.string().optional(),
  endDate: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const createSubjectSchema = z.object({
  name: z.string().min(2, 'Subject name is required'),
  code: z.string().optional(),
  description: z.string().optional(),
});

export const updateSubjectSchema = z.object({
  name: z.string().min(2, 'Subject name is required').optional(),
  code: z.string().optional(),
  description: z.string().optional(),
});

export const assignSubjectsSchema = z.object({
  subjectIds: z.array(z.string().uuid()).optional(),
  subjectId: z.string().uuid().optional(),
});

export const assignStaffSchema = z.object({
  staffProfileIds: z.array(z.string().uuid()).optional(),
  staffProfileId: z.string().uuid().optional(),
});

export const enrollStudentSchema = z.object({
  studentId: z.string().uuid('Valid student ID required'),
  subjectId: z.string().uuid().optional(),
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
        batchSubjects: {
          include: {
            subject: {
              select: { id: true, name: true, code: true },
            },
          },
        },
        staffAssignments: {
          include: {
            staffProfile: {
              include: {
                user: {
                  select: { id: true, fullName: true, email: true, phone: true },
                },
              },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
            staffAssignments: true,
            batchSubjects: true,
          },
        },
      },
    });

    return res.json({ success: true, data: { batches } });
  } catch (err: any) {
    console.error('[listBatches error]', err);
    return res.status(500).json({ success: false, error: 'Failed to list batches' });
  }
}

// Get Batch Details (Roster, Curriculum, Staff)
export async function getBatchDetails(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) return res.status(400).json({ success: false, error: 'Institute context required' });

    const { id } = req.params;

    const batch = await prisma.batch.findFirst({
      where: { id, instituteId },
      include: {
        batchSubjects: {
          include: {
            subject: true,
          },
        },
        staffAssignments: {
          include: {
            staffProfile: {
              include: {
                user: {
                  select: { id: true, fullName: true, email: true, phone: true },
                },
              },
            },
          },
        },
        enrollments: {
          where: { isActive: true },
          include: {
            student: {
              select: {
                id: true,
                admissionNumber: true,
                firstName: true,
                lastName: true,
                phone: true,
                status: true,
              },
            },
            subject: {
              select: { id: true, name: true },
            },
          },
          orderBy: { enrolledAt: 'desc' },
        },
      },
    });

    if (!batch) {
      return res.status(404).json({ success: false, error: 'Batch not found in this institute' });
    }

    return res.json({ success: true, data: { batch } });
  } catch (err: any) {
    console.error('[getBatchDetails error]', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch batch details' });
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

// Update Batch
export async function updateBatch(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) return res.status(400).json({ success: false, error: 'Institute context required' });

    const { id } = req.params;
    const parse = updateBatchSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ success: false, error: parse.error.errors[0]?.message });

    const existing = await prisma.batch.findFirst({
      where: { id, instituteId },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Batch not found in this institute' });
    }

    const { name, academicYear, startDate, endDate, isActive } = parse.data;

    // Check collision if name or academicYear changed
    if ((name && name.trim() !== existing.name) || (academicYear && academicYear.trim() !== existing.academicYear)) {
      const checkName = name ? name.trim() : existing.name;
      const checkYear = academicYear ? academicYear.trim() : existing.academicYear;
      const collision = await prisma.batch.findFirst({
        where: {
          instituteId,
          name: checkName,
          academicYear: checkYear,
          id: { not: id },
        },
      });
      if (collision) {
        return res.status(409).json({ success: false, error: `Batch '${checkName}' (${checkYear}) already exists` });
      }
    }

    const updated = await prisma.batch.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(academicYear ? { academicYear: academicYear.trim() } : {}),
        ...(startDate !== undefined ? { startDate: new Date(startDate) } : {}),
        ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });

    return res.json({ success: true, message: 'Batch updated successfully', data: { batch: updated } });
  } catch (err: any) {
    console.error('[updateBatch error]', err);
    return res.status(500).json({ success: false, error: 'Failed to update batch' });
  }
}

// Toggle Batch Active Status
export async function toggleBatchStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) return res.status(400).json({ success: false, error: 'Institute context required' });

    const { id } = req.params;
    const { isActive } = req.body;

    const existing = await prisma.batch.findFirst({
      where: { id, instituteId },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Batch not found in this institute' });
    }

    const nextState = typeof isActive === 'boolean' ? isActive : !existing.isActive;

    const updated = await prisma.batch.update({
      where: { id },
      data: { isActive: nextState },
    });

    return res.json({
      success: true,
      message: `Batch ${nextState ? 'activated' : 'deactivated'} successfully`,
      data: { batch: updated },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to toggle batch status' });
  }
}

// Assign Subjects to Batch
export async function assignSubjectsToBatch(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) return res.status(400).json({ success: false, error: 'Institute context required' });

    const { id: batchId } = req.params;
    const parse = assignSubjectsSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ success: false, error: parse.error.errors[0]?.message });

    const batch = await prisma.batch.findFirst({
      where: { id: batchId, instituteId },
    });
    if (!batch) {
      return res.status(404).json({ success: false, error: 'Batch not found in this institute' });
    }

    const subjectIds = parse.data.subjectIds || (parse.data.subjectId ? [parse.data.subjectId] : []);
    if (subjectIds.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one subjectId must be provided' });
    }

    // Verify all subjects belong to this institute
    const subjects = await prisma.subject.findMany({
      where: {
        id: { in: subjectIds },
        instituteId,
      },
    });

    if (subjects.length !== subjectIds.length) {
      return res.status(400).json({ success: false, error: 'One or more subjects do not exist in this institute' });
    }

    // Upsert or create batch-subject links
    for (const sid of subjectIds) {
      await prisma.batchSubject.upsert({
        where: {
          batchId_subjectId: {
            batchId,
            subjectId: sid,
          },
        },
        create: {
          batchId,
          subjectId: sid,
        },
        update: {},
      });
    }

    const updatedBatch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        batchSubjects: {
          include: { subject: true },
        },
      },
    });

    return res.json({
      success: true,
      message: `${subjectIds.length} subject(s) assigned to batch successfully`,
      data: { batch: updatedBatch },
    });
  } catch (err: any) {
    console.error('[assignSubjectsToBatch error]', err);
    return res.status(500).json({ success: false, error: 'Failed to assign subjects to batch' });
  }
}

// Remove Subject from Batch
export async function removeSubjectFromBatch(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) return res.status(400).json({ success: false, error: 'Institute context required' });

    const { id: batchId, subjectId } = req.params;

    const batch = await prisma.batch.findFirst({
      where: { id: batchId, instituteId },
    });
    if (!batch) {
      return res.status(404).json({ success: false, error: 'Batch not found in this institute' });
    }

    await prisma.batchSubject.deleteMany({
      where: {
        batchId,
        subjectId,
      },
    });

    return res.json({ success: true, message: 'Subject removed from batch successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to remove subject from batch' });
  }
}

// Assign Staff to Batch
export async function assignStaffToBatch(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) return res.status(400).json({ success: false, error: 'Institute context required' });

    const { id: batchId } = req.params;
    const parse = assignStaffSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ success: false, error: parse.error.errors[0]?.message });

    const batch = await prisma.batch.findFirst({
      where: { id: batchId, instituteId },
    });
    if (!batch) {
      return res.status(404).json({ success: false, error: 'Batch not found in this institute' });
    }

    const staffProfileIds = parse.data.staffProfileIds || (parse.data.staffProfileId ? [parse.data.staffProfileId] : []);
    if (staffProfileIds.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one staffProfileId must be provided' });
    }

    // Verify all staff belong to this institute
    const staffList = await prisma.staffProfile.findMany({
      where: {
        id: { in: staffProfileIds },
        instituteId,
      },
    });

    if (staffList.length !== staffProfileIds.length) {
      return res.status(400).json({ success: false, error: 'One or more staff members do not belong to this institute' });
    }

    for (const spId of staffProfileIds) {
      await prisma.staffBatchAssignment.upsert({
        where: {
          staffProfileId_batchId: {
            staffProfileId: spId,
            batchId,
          },
        },
        create: {
          staffProfileId: spId,
          batchId,
        },
        update: {},
      });
    }

    const updatedBatch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        staffAssignments: {
          include: {
            staffProfile: {
              include: {
                user: { select: { fullName: true, email: true } },
              },
            },
          },
        },
      },
    });

    return res.json({
      success: true,
      message: 'Staff assigned to batch successfully',
      data: { batch: updatedBatch },
    });
  } catch (err: any) {
    console.error('[assignStaffToBatch error]', err);
    return res.status(500).json({ success: false, error: 'Failed to assign staff to batch' });
  }
}

// Remove Staff from Batch
export async function removeStaffFromBatch(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) return res.status(400).json({ success: false, error: 'Institute context required' });

    const { id: batchId, staffProfileId } = req.params;

    const batch = await prisma.batch.findFirst({
      where: { id: batchId, instituteId },
    });
    if (!batch) {
      return res.status(404).json({ success: false, error: 'Batch not found in this institute' });
    }

    await prisma.staffBatchAssignment.deleteMany({
      where: {
        batchId,
        staffProfileId,
      },
    });

    return res.json({ success: true, message: 'Staff removed from batch successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to remove staff from batch' });
  }
}

// Enroll Student in Batch
export async function enrollStudentInBatch(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) return res.status(400).json({ success: false, error: 'Institute context required' });

    const { id: batchId } = req.params;
    const parse = enrollStudentSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ success: false, error: parse.error.errors[0]?.message });

    const { studentId, subjectId } = parse.data;

    // Verify batch
    const batch = await prisma.batch.findFirst({
      where: { id: batchId, instituteId },
    });
    if (!batch) {
      return res.status(404).json({ success: false, error: 'Batch not found in this institute' });
    }

    // Verify student belongs to this institute and is not PASSED_OUT or DISCONTINUED
    const student = await prisma.student.findFirst({
      where: { id: studentId, instituteId },
    });
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found in this institute' });
    }
    if (student.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, error: `Cannot enroll student in ${student.status} status` });
    }

    // If subjectId is given, verify it belongs to this institute
    if (subjectId) {
      const subject = await prisma.subject.findFirst({
        where: { id: subjectId, instituteId },
      });
      if (!subject) {
        return res.status(404).json({ success: false, error: 'Subject not found in this institute' });
      }
    }

    // Upsert enrollment
    const existing = await prisma.studentEnrollment.findFirst({
      where: {
        studentId,
        batchId,
        subjectId: subjectId || null,
      },
    });

    let enrollment;
    if (existing) {
      enrollment = await prisma.studentEnrollment.update({
        where: { id: existing.id },
        data: { isActive: true },
      });
    } else {
      enrollment = await prisma.studentEnrollment.create({
        data: {
          studentId,
          batchId,
          subjectId: subjectId || null,
          isActive: true,
        },
      });
    }

    return res.status(201).json({
      success: true,
      message: `${student.firstName} ${student.lastName} enrolled in batch successfully`,
      data: { enrollment },
    });
  } catch (err: any) {
    console.error('[enrollStudentInBatch error]', err);
    return res.status(500).json({ success: false, error: 'Failed to enroll student in batch' });
  }
}

// Unenroll Student from Batch
export async function unenrollStudentFromBatch(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) return res.status(400).json({ success: false, error: 'Institute context required' });

    const { id: batchId, studentId } = req.params;

    const batch = await prisma.batch.findFirst({
      where: { id: batchId, instituteId },
    });
    if (!batch) {
      return res.status(404).json({ success: false, error: 'Batch not found in this institute' });
    }

    await prisma.studentEnrollment.updateMany({
      where: {
        batchId,
        studentId,
      },
      data: { isActive: false },
    });

    return res.json({ success: true, message: 'Student unenrolled from batch successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to unenroll student from batch' });
  }
}

// List Institute Staff (for dropdown assignment)
export async function listInstituteStaff(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) return res.status(400).json({ success: false, error: 'Institute context required' });

    const staffMembers = await prisma.staffProfile.findMany({
      where: { instituteId },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, phone: true, isActive: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = staffMembers
      .filter((s) => s.user.isActive)
      .map((s) => ({
        staffProfileId: s.id,
        userId: s.user.id,
        fullName: s.user.fullName,
        email: s.user.email,
        phone: s.user.phone,
        employeeCode: s.employeeCode,
        designation: s.designation,
      }));

    return res.json({ success: true, data: { staff: formatted } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to list institute staff' });
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
      include: {
        _count: {
          select: {
            batchSubjects: true,
            enrollments: true,
          },
        },
      },
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

// Update Subject
export async function updateSubject(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) return res.status(400).json({ success: false, error: 'Institute context required' });

    const { id } = req.params;
    const parse = updateSubjectSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ success: false, error: parse.error.errors[0]?.message });

    const existing = await prisma.subject.findFirst({
      where: { id, instituteId },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Subject not found in this institute' });
    }

    const { name, code, description } = parse.data;

    if (name && name.trim() !== existing.name) {
      const collision = await prisma.subject.findFirst({
        where: {
          instituteId,
          name: name.trim(),
          id: { not: id },
        },
      });
      if (collision) {
        return res.status(409).json({ success: false, error: `Subject '${name.trim()}' already exists in this institute` });
      }
    }

    const updated = await prisma.subject.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(code !== undefined ? { code: code ? code.trim().toUpperCase() : null } : {}),
        ...(description !== undefined ? { description: description ? description.trim() : null } : {}),
      },
    });

    return res.json({ success: true, message: 'Subject updated successfully', data: { subject: updated } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to update subject' });
  }
}

// Delete Subject
export async function deleteSubject(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) return res.status(400).json({ success: false, error: 'Institute context required' });

    const { id } = req.params;

    const existing = await prisma.subject.findFirst({
      where: { id, instituteId },
      include: {
        _count: {
          select: { batchSubjects: true, enrollments: true },
        },
      },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Subject not found in this institute' });
    }

    if (existing._count.batchSubjects > 0 || existing._count.enrollments > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete subject '${existing.name}' because it is linked to active batches or student enrollments. Remove it from batches first.`,
      });
    }

    await prisma.subject.delete({ where: { id } });

    return res.json({ success: true, message: 'Subject deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to delete subject' });
  }
}
