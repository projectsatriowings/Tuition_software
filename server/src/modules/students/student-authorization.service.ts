import { PrismaClient, Prisma } from '@prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.js';

const defaultPrisma = new PrismaClient();

export interface StudentScopeResult {
  instituteId: string;
  isStaff: boolean;
  assignedBatchIds: string[];
  whereClause: Prisma.StudentWhereInput;
}

/**
 * Build database-level authorization scope for students based on authenticated user role and assignments.
 * Enforces:
 * 1. Institute tenant isolation
 * 2. Staff creator ownership (createdByUserId)
 * 3. Staff assigned-batch enrollment (StaffBatchAssignment -> StudentEnrollment)
 * 4. Parent child verification
 * 5. Student self-profile restriction
 * 6. Academic Admin institute scope
 */
export async function getAuthorizedStudentScope(
  req: AuthenticatedRequest,
  prismaClient: any = defaultPrisma
): Promise<StudentScopeResult> {
  if (!req.user) {
    throw new Error('Unauthorized: Authentication required');
  }

  const role = req.user.role;
  const userId = req.user.userId;
  const instituteId = req.instituteId;

  if (!instituteId && role !== 'SUPER_ADMIN') {
    throw new Error('Institute context required');
  }

  // 1. SUPER_ADMIN: platform management with institute context
  if (role === 'SUPER_ADMIN') {
    return {
      instituteId: instituteId || '',
      isStaff: false,
      assignedBatchIds: [],
      whereClause: instituteId ? { instituteId } : {},
    };
  }

  // 2. ACADEMIC_ADMIN: full institute scope
  if (role === 'ACADEMIC_ADMIN') {
    return {
      instituteId: instituteId!,
      isStaff: false,
      assignedBatchIds: [],
      whereClause: { instituteId: instituteId! },
    };
  }

  // 3. STAFF: Strict isolation — only students created by this staff OR in batches assigned to this staff
  if (role === 'STAFF') {
    // Verify active staff profile
    const staffProfile = await prismaClient.staffProfile.findUnique({
      where: { userId },
      include: {
        assignments: {
          include: {
            batch: { select: { id: true, isActive: true, instituteId: true } },
          },
        },
      },
    });

    if (!staffProfile || staffProfile.instituteId !== instituteId) {
      // Empty scope: unauthorized or inactive
      return {
        instituteId: instituteId!,
        isStaff: true,
        assignedBatchIds: [],
        whereClause: { id: '__DENIED_NO_STAFF_PROFILE__' },
      };
    }

    const assignedBatchIds = staffProfile.assignments
      .filter((a: any) => a.batch.isActive && a.batch.instituteId === instituteId)
      .map((a: any) => a.batch.id);

    const conditions: Prisma.StudentWhereInput[] = [
      { createdByUserId: userId },
    ];

    if (assignedBatchIds.length > 0) {
      conditions.push({
        enrollments: {
          some: {
            isActive: true,
            batchId: { in: assignedBatchIds },
          },
        },
      });
    }

    return {
      instituteId: instituteId!,
      isStaff: true,
      assignedBatchIds,
      whereClause: {
        instituteId: instituteId!,
        OR: conditions,
      },
    };
  }

  // 4. PARENT: only verified linked children
  if (role === 'PARENT') {
    return {
      instituteId: instituteId || '',
      isStaff: false,
      assignedBatchIds: [],
      whereClause: {
        parentRelations: {
          some: {
            parent: { userId },
          },
        },
        ...(instituteId ? { instituteId } : {}),
      },
    };
  }

  // 5. STUDENT: only their own record
  if (role === 'STUDENT') {
    return {
      instituteId: instituteId || '',
      isStaff: false,
      assignedBatchIds: [],
      whereClause: {
        userId,
        ...(instituteId ? { instituteId } : {}),
      },
    };
  }

  return {
    instituteId: instituteId || '',
    isStaff: false,
    assignedBatchIds: [],
    whereClause: { id: '__DENIED_UNKNOWN_ROLE__' },
  };
}

/**
 * Check if the caller is authorized to view or modify a specific student
 */
export async function isStudentAuthorized(
  req: AuthenticatedRequest,
  studentId: string,
  prismaClient: any = defaultPrisma
): Promise<boolean> {
  const scope = await getAuthorizedStudentScope(req, prismaClient);
  const student = await prismaClient.student.findFirst({
    where: {
      AND: [
        { id: studentId },
        scope.whereClause,
      ],
    },
    select: { id: true },
  });
  return !!student;
}

/**
 * Check if a staff member is assigned to a specific batch
 */
export async function isStaffAssignedToBatch(
  req: AuthenticatedRequest,
  batchId: string,
  prismaClient: any = defaultPrisma
): Promise<boolean> {
  if (req.user?.role === 'ACADEMIC_ADMIN' || req.user?.role === 'SUPER_ADMIN') {
    return true;
  }
  if (req.user?.role !== 'STAFF') {
    return false;
  }

  const assignment = await prismaClient.staffBatchAssignment.findFirst({
    where: {
      batchId,
      staffProfile: {
        userId: req.user.userId,
        instituteId: req.instituteId,
      },
    },
  });

  return !!assignment;
}
