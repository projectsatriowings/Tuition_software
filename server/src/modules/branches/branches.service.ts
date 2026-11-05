import { prisma } from '../../prisma.js';

export interface CreateBranchInput {
  name: string;
  code?: string;
  isDefault?: boolean;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  email?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  geofenceRadius?: number;
  workingDays?: string;
  workStartTime?: string;
  workEndTime?: string;
  lateGraceMinutes?: number;
  gpsAccuracyThreshold?: number;
  requireCheckoutGeofence?: boolean;
  allowStaffWfhRequests?: boolean;
  timezone?: string;
}

export interface UpdateBranchInput {
  name?: string;
  code?: string;
  isDefault?: boolean;
  isActive?: boolean;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  email?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  geofenceRadius?: number;
  locationVerified?: boolean;
  workingDays?: string;
  workStartTime?: string;
  workEndTime?: string;
  lateGraceMinutes?: number;
  gpsAccuracyThreshold?: number;
  requireCheckoutGeofence?: boolean;
  allowStaffWfhRequests?: boolean;
  timezone?: string;
}

export interface AssignStaffInput {
  branchId: string;
  staffProfileId: string;
  assignmentType?: string; // PRIMARY, ADDITIONAL, TEMPORARY, SUBSTITUTE
  role?: string | null; // BRANCH_ADMIN, TEACHER, COORDINATOR, etc.
  isPrimary?: boolean;
  effectiveFrom?: string | Date;
  effectiveTo?: string | Date | null;
  notes?: string | null;
}

export interface TransferStudentInput {
  studentId: string;
  toBranchId: string;
  effectiveDate?: string | Date;
  reason: string;
  transferFeesPolicy?: string; // RETAIN_HISTORICAL, TRANSFER_ALL
  notes?: string | null;
}

export class BranchesService {
  /**
   * List branches for an institute with operational metrics
   */
  static async listBranches(
    instituteId: string,
    options: {
      search?: string;
      isActive?: boolean;
      staffUserId?: string;
      role?: string;
    } = {}
  ) {
    const where: any = { instituteId };

    if (options.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    if (options.search) {
      const q = options.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
        { address: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Role-based filtering: If staff is not an academic admin or super admin, only list their assigned branches
    if (options.role === 'STAFF' && options.staffUserId) {
      const staffProfile = await prisma.staffProfile.findFirst({
        where: { userId: options.staffUserId, instituteId },
        select: { id: true },
      });

      if (staffProfile) {
        where.staffAssignments = {
          some: {
            staffProfileId: staffProfile.id,
            isActive: true,
          },
        };
      }
    }

    const branches = await prisma.branch.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      include: {
        _count: {
          select: {
            batches: { where: { isActive: true } },
            staffAssignments: { where: { isActive: true } },
            studentEnrollments: { where: { status: 'ACTIVE' } },
          },
        },
      },
    });

    // Compute live stats for each branch
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const enriched = await Promise.all(
      branches.map(async (b) => {
        // Count staff checked-in today at this branch
        const todayAttendance = await prisma.staffAttendanceSession.count({
          where: {
            branchId: b.id,
            attendanceDate: today,
            status: { in: ['CHECKED_IN', 'CHECKED_OUT'] },
          },
        });

        // Sum payments collected at this branch
        const paymentSum = await prisma.payment.aggregate({
          where: { branchId: b.id, status: 'SUCCESS' },
          _sum: { amountPaid: true },
        });

        return {
          ...b,
          metrics: {
            activeBatches: b._count.batches,
            activeStaff: b._count.staffAssignments,
            activeStudents: b._count.studentEnrollments,
            todayCheckins: todayAttendance,
            totalCollections: Number(paymentSum._sum.amountPaid || 0),
          },
        };
      })
    );

    return enriched;
  }

  /**
   * Get single branch with comprehensive relationships
   */
  static async getBranchById(instituteId: string, branchId: string) {
    if (!branchId || branchId === 'consolidated-summary' || branchId === 'summary') {
      return null;
    }

    const branch = await prisma.branch.findFirst({
      where: { id: branchId, instituteId },
      include: {
        staffAssignments: {
          where: { isActive: true },
          include: {
            staffProfile: {
              include: {
                user: {
                  select: { id: true, fullName: true, email: true, phone: true, role: true },
                },
              },
            },
          },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
        },
        studentEnrollments: {
          where: { status: 'ACTIVE' },
          take: 50,
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                admissionNumber: true,
                rollNumber: true,
                phone: true,
                status: true,
              },
            },
          },
          orderBy: { enrolledAt: 'desc' },
        },
        batches: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            code: true,
            academicYear: true,
            schedule: true,
            startDate: true,
            endDate: true,
            isActive: true,
          },
          orderBy: { name: 'asc' },
        },
        _count: {
          select: {
            batches: { where: { isActive: true } },
            staffAssignments: { where: { isActive: true } },
            studentEnrollments: { where: { status: 'ACTIVE' } },
            attendanceSessions: true,
            payments: true,
          },
        },
      },
    });

    if (!branch) return null;

    // Financial collection summary
    const paymentsSummary = await prisma.payment.aggregate({
      where: { branchId, status: 'SUCCESS' },
      _sum: { amountPaid: true },
      _count: { id: true },
    });

    return {
      ...branch,
      financialSummary: {
        totalCollections: Number(paymentsSummary._sum.amountPaid || 0),
        transactionCount: paymentsSummary._count.id,
      },
    };
  }

  /**
   * Helper to generate a unique uppercase branch code based on name, city, and institute uniqueness
   */
  static async generateUniqueBranchCode(instituteId: string, branchName: string, city?: string | null): Promise<string> {
    let cleaned = (branchName || '')
      .replace(/([a-z])([A-Z])/g, (_m, p1, p2) => `${p1} ${p2}`)
      .replace(/[_\-]+/g, ' ')
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .trim();

    const commonSplits = ['guru', 'nagar', 'puram', 'campus', 'academy', 'institute', 'centre', 'center', 'branch', 'road', 'cross', 'layout', 'park'];
    for (const sub of commonSplits) {
      const regex = new RegExp(`([a-zA-Z]{3,})(${sub})\\b`, 'gi');
      cleaned = cleaned.replace(regex, (_m, p1, p2) => `${p1} ${p2}`);
    }

    const words = cleaned.split(/\s+/).filter(Boolean);
    let rawCode = '';

    if (words.length >= 3) {
      rawCode = words.map((w) => w[0]).join('').slice(0, 4).toUpperCase();
    } else if (words.length === 2) {
      const w1 = words[0];
      const w2 = words[1];
      if (w1.length >= 3 && ['branch', 'campus', 'center', 'centre', 'classes'].includes(w2.toLowerCase())) {
        rawCode = w1.slice(0, 3).toUpperCase();
      } else {
        rawCode = (w1.slice(0, 2) + w2.slice(0, 2)).toUpperCase();
      }
    } else if (words.length === 1) {
      const w = words[0];
      rawCode = (w.length <= 4 ? w : w.slice(0, 3)).toUpperCase();
    }

    if (!rawCode) {
      rawCode = city ? city.slice(0, 3).toUpperCase() : 'BRN';
    }

    const existingBranches = await prisma.branch.findMany({
      where: { instituteId },
      select: { code: true },
    });
    const existingCodes = new Set(existingBranches.map((b) => b.code.toUpperCase()));

    let candidate = rawCode.toUpperCase();
    if (!existingCodes.has(candidate)) {
      return candidate;
    }

    let suffix = 1;
    while (existingCodes.has(`${candidate}${suffix < 10 ? '0' : ''}${suffix}`)) {
      suffix++;
    }
    return `${candidate}${suffix < 10 ? '0' : ''}${suffix}`;
  }

  /**
   * Create a new branch
   */
  static async createBranch(instituteId: string, data: CreateBranchInput, authorizerUserId: string) {
    let cleanCode = data.code?.trim().toUpperCase();

    if (!cleanCode) {
      cleanCode = await this.generateUniqueBranchCode(instituteId, data.name, data.city);
    } else {
      // Check code uniqueness within institute
      const existingCode = await prisma.branch.findUnique({
        where: {
          instituteId_code: {
            instituteId,
            code: cleanCode,
          },
        },
      });

      if (existingCode) {
        throw new Error(`A branch with code "${cleanCode}" already exists in this institute.`);
      }
    }

    // Check if this should be the default branch
    let shouldBeDefault = Boolean(data.isDefault);
    const existingBranchesCount = await prisma.branch.count({ where: { instituteId } });
    if (existingBranchesCount === 0) {
      // First branch in institute must be default
      shouldBeDefault = true;
    }

    if (shouldBeDefault) {
      // Unset previous default
      await prisma.branch.updateMany({
        where: { instituteId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const branch = await prisma.branch.create({
      data: {
        instituteId,
        name: data.name.trim(),
        code: cleanCode,
        isDefault: shouldBeDefault,
        isActive: true,
        address: data.address?.trim() || null,
        city: data.city?.trim() || null,
        state: data.state?.trim() || null,
        postalCode: data.postalCode?.trim() || null,
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        latitude: data.latitude !== undefined ? data.latitude : null,
        longitude: data.longitude !== undefined ? data.longitude : null,
        geofenceRadius: data.geofenceRadius || 200,
        workingDays: data.workingDays || 'MON,TUE,WED,THU,FRI,SAT',
        workStartTime: data.workStartTime || '09:00',
        workEndTime: data.workEndTime || '18:00',
        lateGraceMinutes: data.lateGraceMinutes ?? 15,
        gpsAccuracyThreshold: data.gpsAccuracyThreshold ?? 50,
        requireCheckoutGeofence: data.requireCheckoutGeofence !== undefined ? data.requireCheckoutGeofence : true,
        allowStaffWfhRequests: data.allowStaffWfhRequests !== undefined ? data.allowStaffWfhRequests : true,
        timezone: data.timezone || 'Asia/Kolkata',
      },
    });

    // Audit log
    try {
      if (authorizerUserId) {
        const userExists = await prisma.user.findUnique({ where: { id: authorizerUserId }, select: { id: true } });
        if (userExists) {
          await prisma.auditLog.create({
            data: {
              instituteId,
              userId: authorizerUserId,
              action: 'CREATE_BRANCH',
              entityType: 'Branch',
              entityId: branch.id,
              newValues: { code: branch.code, name: branch.name, isDefault: branch.isDefault },
            },
          });
        }
      }
    } catch {
      // Safe fallback if audit log cannot be created
    }

    return branch;
  }

  /**
   * Update branch details
   */
  static async updateBranch(instituteId: string, branchId: string, data: UpdateBranchInput, authorizerUserId: string) {
    const existing = await prisma.branch.findFirst({
      where: { id: branchId, instituteId },
    });

    if (!existing) {
      throw new Error('Branch not found');
    }

    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.address !== undefined) updateData.address = data.address?.trim() || null;
    if (data.city !== undefined) updateData.city = data.city?.trim() || null;
    if (data.state !== undefined) updateData.state = data.state?.trim() || null;
    if (data.postalCode !== undefined) updateData.postalCode = data.postalCode?.trim() || null;
    if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null;
    if (data.email !== undefined) updateData.email = data.email?.trim() || null;

    if (data.latitude !== undefined) updateData.latitude = data.latitude;
    if (data.longitude !== undefined) updateData.longitude = data.longitude;
    if (data.geofenceRadius !== undefined) updateData.geofenceRadius = data.geofenceRadius;
    if (data.locationVerified !== undefined) updateData.locationVerified = data.locationVerified;

    if (data.workingDays !== undefined) updateData.workingDays = data.workingDays;
    if (data.workStartTime !== undefined) updateData.workStartTime = data.workStartTime;
    if (data.workEndTime !== undefined) updateData.workEndTime = data.workEndTime;
    if (data.lateGraceMinutes !== undefined) updateData.lateGraceMinutes = data.lateGraceMinutes;
    if (data.gpsAccuracyThreshold !== undefined) updateData.gpsAccuracyThreshold = data.gpsAccuracyThreshold;
    if (data.requireCheckoutGeofence !== undefined) updateData.requireCheckoutGeofence = data.requireCheckoutGeofence;
    if (data.allowStaffWfhRequests !== undefined) updateData.allowStaffWfhRequests = data.allowStaffWfhRequests;
    if (data.timezone !== undefined) updateData.timezone = data.timezone;

    if (data.code && data.code.trim().toUpperCase() !== existing.code) {
      const cleanCode = data.code.trim().toUpperCase();
      const codeExists = await prisma.branch.findUnique({
        where: { instituteId_code: { instituteId, code: cleanCode } },
      });
      if (codeExists) {
        throw new Error(`Branch code "${cleanCode}" is already taken in this institute.`);
      }
      updateData.code = cleanCode;
    }

    if (data.isDefault !== undefined && data.isDefault !== existing.isDefault) {
      if (data.isDefault) {
        // Set new default, unsetting previous
        await prisma.branch.updateMany({
          where: { instituteId, isDefault: true },
          data: { isDefault: false },
        });
        updateData.isDefault = true;
      } else {
        // Cannot unset default if it is the only branch
        const defaultCount = await prisma.branch.count({
          where: { instituteId, isDefault: true },
        });
        if (defaultCount <= 1) {
          throw new Error('An institute must always have at least one default branch. Designate another branch as default first.');
        }
        updateData.isDefault = false;
      }
    }

    const updated = await prisma.branch.update({
      where: { id: branchId },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        instituteId,
        userId: authorizerUserId,
        action: 'UPDATE_BRANCH',
        entityType: 'Branch',
        entityId: branchId,
        newValues: updateData,
      },
    });

    return updated;
  }

  /**
   * Safety check before deactivating branch
   */
  static async checkDeactivationSafety(instituteId: string, branchId: string) {
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, instituteId },
    });

    if (!branch) {
      throw new Error('Branch not found');
    }

    const reasons: string[] = [];

    if (branch.isDefault) {
      reasons.push('Cannot deactivate the default branch of an institute. Assign another branch as default first.');
    }

    // Active batches
    const activeBatchesCount = await prisma.batch.count({
      where: { branchId, isActive: true },
    });
    if (activeBatchesCount > 0) {
      reasons.push(`${activeBatchesCount} active batch(es) are currently assigned to this branch.`);
    }

    // Active students
    const activeStudentsCount = await prisma.student.count({
      where: { primaryBranchId: branchId, status: 'ACTIVE' },
    });
    if (activeStudentsCount > 0) {
      reasons.push(`${activeStudentsCount} active student(s) have this branch as their primary campus.`);
    }

    // Primary staff assignments
    const activeStaffCount = await prisma.branchStaffAssignment.count({
      where: { branchId, isPrimary: true, isActive: true },
    });
    if (activeStaffCount > 0) {
      reasons.push(`${activeStaffCount} staff member(s) have this as their primary branch.`);
    }

    return {
      canDeactivate: reasons.length === 0,
      reasons,
      dependencies: {
        activeBatchesCount,
        activeStudentsCount,
        activeStaffCount,
      },
    };
  }

  /**
   * Deactivate a branch with safety verification
   */
  static async deactivateBranch(
    instituteId: string,
    branchId: string,
    authorizerUserId: string,
    force = false
  ) {
    const safety = await this.checkDeactivationSafety(instituteId, branchId);

    if (!safety.canDeactivate && !force) {
      const err: any = new Error(
        `Cannot deactivate branch: ${safety.reasons.join(' ')}`
      );
      err.safety = safety;
      throw err;
    }

    const deactivated = await prisma.branch.update({
      where: { id: branchId },
      data: { isActive: false },
    });

    await prisma.auditLog.create({
      data: {
        instituteId,
        userId: authorizerUserId,
        action: 'DEACTIVATE_BRANCH',
        entityType: 'Branch',
        entityId: branchId,
        newValues: { force, dependencies: safety.dependencies },
      },
    });

    return deactivated;
  }

  /**
   * Reactivate an inactive branch
   */
  static async reactivateBranch(instituteId: string, branchId: string, authorizerUserId: string) {
    const reactivated = await prisma.branch.update({
      where: { id: branchId },
      data: { isActive: true },
    });

    await prisma.auditLog.create({
      data: {
        instituteId,
        userId: authorizerUserId,
        action: 'REACTIVATE_BRANCH',
        entityType: 'Branch',
        entityId: branchId,
      },
    });

    return reactivated;
  }

  /**
   * Assign staff to a branch (Primary, Additional, Temporary, Substitute)
   */
  static async assignStaff(instituteId: string, input: AssignStaffInput, authorizerUserId: string) {
    const { branchId, staffProfileId, assignmentType = 'PRIMARY', role, isPrimary = false, effectiveFrom, effectiveTo, notes } = input;

    // Verify branch belongs to institute
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, instituteId, isActive: true },
    });
    if (!branch) {
      throw new Error('Target branch does not exist or is inactive.');
    }

    // Verify staff belongs to institute
    const staff = await prisma.staffProfile.findFirst({
      where: { id: staffProfileId, instituteId },
      include: { user: true },
    });
    if (!staff) {
      throw new Error('Staff profile not found in this institute.');
    }

    // If marked primary, update existing primary assignments to false
    if (isPrimary || assignmentType === 'PRIMARY') {
      await prisma.branchStaffAssignment.updateMany({
        where: { staffProfileId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const fromDate = effectiveFrom ? new Date(effectiveFrom) : new Date();
    const toDate = effectiveTo ? new Date(effectiveTo) : null;

    const assignment = await prisma.branchStaffAssignment.upsert({
      where: {
        branchId_staffProfileId_assignmentType: {
          branchId,
          staffProfileId,
          assignmentType,
        },
      },
      update: {
        role: role || null,
        isPrimary: isPrimary || assignmentType === 'PRIMARY',
        effectiveFrom: fromDate,
        effectiveTo: toDate,
        isActive: true,
        notes: notes || null,
      },
      create: {
        instituteId,
        branchId,
        staffProfileId,
        assignmentType,
        role: role || null,
        isPrimary: isPrimary || assignmentType === 'PRIMARY',
        effectiveFrom: fromDate,
        effectiveTo: toDate,
        isActive: true,
        notes: notes || null,
      },
    });

    // Also update staff workLocation for display compatibility
    if (isPrimary || assignmentType === 'PRIMARY') {
      await prisma.staffProfile.update({
        where: { id: staffProfileId },
        data: { workLocation: branch.name },
      });
    }

    await prisma.auditLog.create({
      data: {
        instituteId,
        userId: authorizerUserId,
        action: 'ASSIGN_STAFF_BRANCH',
        entityType: 'BranchStaffAssignment',
        entityId: assignment.id,
        newValues: { staffName: staff.user.fullName, branchName: branch.name, assignmentType, role, isPrimary },
      },
    });

    return assignment;
  }

  /**
   * Remove / deactivate staff assignment
   */
  static async removeStaffAssignment(instituteId: string, assignmentId: string, authorizerUserId: string) {
    const assignment = await prisma.branchStaffAssignment.findFirst({
      where: { id: assignmentId, instituteId },
      include: { branch: true, staffProfile: { include: { user: true } } },
    });

    if (!assignment) {
      throw new Error('Staff branch assignment not found.');
    }

    if (assignment.isPrimary) {
      // Check if staff has another assignment to promote to primary
      const otherAssignment = await prisma.branchStaffAssignment.findFirst({
        where: {
          staffProfileId: assignment.staffProfileId,
          id: { not: assignmentId },
          isActive: true,
        },
      });

      if (otherAssignment) {
        await prisma.branchStaffAssignment.update({
          where: { id: otherAssignment.id },
          data: { isPrimary: true },
        });
      }
    }

    const updated = await prisma.branchStaffAssignment.update({
      where: { id: assignmentId },
      data: { isActive: false, effectiveTo: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        instituteId,
        userId: authorizerUserId,
        action: 'REMOVE_STAFF_BRANCH',
        entityType: 'BranchStaffAssignment',
        entityId: assignmentId,
        newValues: { staffName: assignment.staffProfile.user.fullName, branchName: assignment.branch.name },
      },
    });

    return updated;
  }

  /**
   * Teacher Cross-Branch Schedule Conflict Detection
   * Prevents assigning a teacher to conflicting schedules across different branches.
   */
  static async checkTeacherScheduleConflict(
    instituteId: string,
    staffProfileId: string,
    proposedSchedule?: string,
    excludeBatchId?: string
  ) {
    if (!proposedSchedule) {
      return { hasConflict: false };
    }

    // Retrieve all active batches where this staff is assigned across all branches
    const existingAssignments = await prisma.staffBatchAssignment.findMany({
      where: {
        staffProfileId,
        batch: {
          instituteId,
          isActive: true,
          ...(excludeBatchId ? { id: { not: excludeBatchId } } : {}),
        },
      },
      include: {
        batch: {
          include: {
            branch: {
              select: { id: true, name: true, code: true },
            },
          },
        },
      },
    });

    // Helper to extract time slots and days from schedule strings
    // Format examples: "Mon-Fri 4:00 PM - 6:00 PM", "Mon, Wed, Fri 10:00 - 12:00"
    const parseScheduleDays = (sched: string): string[] => {
      const upper = sched.toUpperCase();
      const days: string[] = [];
      const dayMap: Record<string, string[]> = {
        'MON-FRI': ['MON', 'TUE', 'WED', 'THU', 'FRI'],
        'MON-SAT': ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
      };
      for (const [key, list] of Object.entries(dayMap)) {
        if (upper.includes(key)) return list;
      }
      const standardDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
      for (const d of standardDays) {
        if (upper.includes(d)) days.push(d);
      }
      return days.length ? days : ['ALL'];
    };

    const proposedDays = parseScheduleDays(proposedSchedule);

    for (const assign of existingAssignments) {
      const existingSched = assign.batch.schedule;
      if (!existingSched) continue;

      const existingDays = parseScheduleDays(existingSched);
      const commonDays = proposedDays.filter((d) => d === 'ALL' || existingDays.includes('ALL') || existingDays.includes(d));

      if (commonDays.length > 0) {
        // If times match or direct string matches
        const cleanProposed = proposedSchedule.toLowerCase().replace(/\s+/g, '');
        const cleanExisting = existingSched.toLowerCase().replace(/\s+/g, '');

        if (cleanProposed === cleanExisting || cleanProposed.includes(cleanExisting) || cleanExisting.includes(cleanProposed)) {
          return {
            hasConflict: true,
            conflictDetails: {
              conflictingBatchId: assign.batch.id,
              conflictingBatchName: assign.batch.name,
              branchName: assign.batch.branch?.name || 'Central Campus',
              branchCode: assign.batch.branch?.code || 'MAIN',
              existingSchedule: existingSched,
              proposedSchedule,
              commonDays,
              message: `Teacher schedule conflict: Already teaching batch "${assign.batch.name}" at ${assign.batch.branch?.name || 'Main Campus'} on (${existingSched}). Overlapping classes across branches are prohibited.`,
            },
          };
        }
      }
    }

    return { hasConflict: false };
  }

  /**
   * Transfer a student to another branch
   * Preserves all historical attendance, payments, marks, and feedback at source branch.
   */
  static async transferStudent(
    instituteId: string,
    input: TransferStudentInput,
    authorizerUserId: string
  ) {
    const { studentId, toBranchId, effectiveDate, reason, transferFeesPolicy = 'RETAIN_HISTORICAL', notes } = input;

    // Verify student
    const student = await prisma.student.findFirst({
      where: { id: studentId, instituteId },
      include: { primaryBranch: true },
    });

    if (!student) {
      throw new Error('Student not found.');
    }

    // Verify destination branch
    const destBranch = await prisma.branch.findFirst({
      where: { id: toBranchId, instituteId, isActive: true },
    });

    if (!destBranch) {
      throw new Error('Destination branch not found or is inactive.');
    }

    const fromBranchId = student.primaryBranchId || toBranchId;
    if (fromBranchId === toBranchId) {
      throw new Error('Student is already assigned to this branch as primary.');
    }

    const effDate = effectiveDate ? new Date(effectiveDate) : new Date();

    // Execute in a safe atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Record transfer audit log
      const transferRecord = await tx.studentBranchTransfer.create({
        data: {
          instituteId,
          studentId,
          fromBranchId,
          toBranchId,
          effectiveDate: effDate,
          reason: reason.trim(),
          status: 'COMPLETED',
          transferFeesPolicy,
          authorizedById: authorizerUserId,
          notes: notes?.trim() || null,
        },
      });

      // 2. Mark previous branch enrollment as TRANSFERRED
      await tx.branchStudentEnrollment.updateMany({
        where: { studentId, branchId: fromBranchId, status: 'ACTIVE' },
        data: {
          status: 'TRANSFERRED',
          isPrimary: false,
          leftAt: effDate,
        },
      });

      // 3. Upsert destination branch enrollment
      await tx.branchStudentEnrollment.upsert({
        where: {
          branchId_studentId: {
            branchId: toBranchId,
            studentId,
          },
        },
        update: {
          status: 'ACTIVE',
          isPrimary: true,
          enrolledAt: effDate,
          notes: `Transferred from ${student.primaryBranch?.name || 'previous branch'} on ${effDate.toISOString().split('T')[0]}. Reason: ${reason}`,
        },
        create: {
          instituteId,
          branchId: toBranchId,
          studentId,
          status: 'ACTIVE',
          isPrimary: true,
          enrolledAt: effDate,
          notes: `Transferred from ${student.primaryBranch?.name || 'previous branch'}. Reason: ${reason}`,
        },
      });

      // 4. Update student primary branch
      await tx.student.update({
        where: { id: studentId },
        data: { primaryBranchId: toBranchId },
      });

      // 5. System audit log
      await tx.auditLog.create({
        data: {
          instituteId,
          userId: authorizerUserId,
          action: 'TRANSFER_STUDENT_BRANCH',
          entityType: 'Student',
          entityId: studentId,
          newValues: {
            studentName: `${student.firstName} ${student.lastName}`,
            admissionNumber: student.admissionNumber,
            fromBranchId,
            toBranchId,
            toBranchName: destBranch.name,
            reason,
            transferFeesPolicy,
          },
        },
      });

      return transferRecord;
    });

    return {
      success: true,
      transferId: result.id,
      studentId,
      newBranch: { id: destBranch.id, name: destBranch.name, code: destBranch.code },
      message: `Student ${student.firstName} ${student.lastName} successfully transferred to ${destBranch.name}. All historical attendance, payments, and invoices are safely preserved.`,
    };
  }

  /**
   * Consolidated Multi-Branch Operational Summary for Executive Dashboards
   */
  static async getConsolidatedSummary(instituteId: string) {
    const branches = await prisma.branch.findMany({
      where: { instituteId },
      include: {
        _count: {
          select: {
            batches: { where: { isActive: true } },
            staffAssignments: { where: { isActive: true } },
            studentEnrollments: { where: { status: 'ACTIVE' } },
          },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    const totalStudents = await prisma.student.count({
      where: { instituteId, status: 'ACTIVE' },
    });

    const totalStaff = await prisma.staffProfile.count({
      where: { instituteId },
    });

    const totalBatches = await prisma.batch.count({
      where: { instituteId, isActive: true },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStaffCheckins = await prisma.staffAttendanceSession.count({
      where: {
        instituteId,
        attendanceDate: today,
        status: { in: ['CHECKED_IN', 'CHECKED_OUT'] },
      },
    });

    const totalRevenue = await prisma.payment.aggregate({
      where: { instituteId, status: 'SUCCESS' },
      _sum: { amountPaid: true },
    });

    const revenueVal = Number(totalRevenue._sum.amountPaid || 0);

    const overview = {
      totalBranches: branches.length,
      activeBranches: branches.filter((b) => b.isActive).length,
      totalStudentsCount: totalStudents,
      totalStaffAssignments: totalStaff,
      todayCheckIns: todayStaffCheckins,
      totalCollections: revenueVal,
    };

    return {
      instituteId,
      totalBranches: branches.length,
      activeBranches: branches.filter((b) => b.isActive).length,
      isMultiBranch: branches.length > 1,
      overview,
      totals: {
        students: totalStudents,
        staff: totalStaff,
        batches: totalBatches,
        todayStaffCheckins,
        totalRevenue: revenueVal,
      },
      branches: branches.map((b) => ({
        id: b.id,
        name: b.name,
        code: b.code,
        city: b.city,
        isDefault: b.isDefault,
        isActive: b.isActive,
        activeBatches: b._count.batches,
        activeStaff: b._count.staffAssignments,
        activeStudents: b._count.studentEnrollments,
      })),
    };
  }
}
