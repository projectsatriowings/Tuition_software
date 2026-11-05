import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/security.js';
import { prisma } from '../prisma.js';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
  instituteId?: string;
  branchId?: string;
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  // Also accept token from query parameter (for media/image streaming where browsers and <img> tags cannot attach Authorization headers)
  if (!token && req.query.token) {
    token = req.query.token as string;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication token required',
      timestamp: new Date().toISOString(),
    });
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired authentication token',
      timestamp: new Date().toISOString(),
    });
  }

  req.user = payload;
  const headerInst = req.headers['x-institute-id'] as string;
  const queryInst = (req.query.instituteId || req.query.inst) as string;
  req.instituteId = payload.instituteId || headerInst || queryInst || undefined;

  const headerBranch = req.headers['x-branch-id'] as string;
  const queryBranch = (req.query.branchId || req.query.branch) as string;
  req.branchId = headerBranch || queryBranch || undefined;
  next();
}

export function requireRole(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        timestamp: new Date().toISOString(),
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Insufficient privileges for this operation',
        timestamp: new Date().toISOString(),
      });
    }

    next();
  };
}

export async function requireInstituteContext(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  // Super Admins have platform-level access
  if (req.user.role === 'SUPER_ADMIN') {
    const requestedInstituteId = req.headers['x-institute-id'] as string || req.query.instituteId as string;
    if (requestedInstituteId) {
      req.instituteId = requestedInstituteId;
    }
    return next();
  }

  // For institute-bound roles, verify active membership
  let instituteId = (req.headers['x-institute-id'] as string) || (req.query.instituteId as string) || req.user.instituteId;
  if (!instituteId) {
    const fallbackMembership = await prisma.instituteMembership.findFirst({
      where: { userId: req.user.userId, isActive: true },
      select: { instituteId: true },
    });
    if (fallbackMembership) {
      instituteId = fallbackMembership.instituteId;
    } else {
      const studentProfile = await prisma.student.findFirst({
        where: { userId: req.user.userId, status: 'ACTIVE' },
        select: { instituteId: true },
      });
      if (studentProfile) {
        instituteId = studentProfile.instituteId;
      }
    }
  }
  if (!instituteId) {
    return res.status(400).json({
      success: false,
      error: 'Institute context required',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const membership = await prisma.instituteMembership.findUnique({
      where: {
        instituteId_userId: {
          instituteId,
          userId: req.user.userId,
        },
      },
      include: {
        institute: true,
      },
    });

    if (!membership || !membership.isActive || membership.institute.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Active institute membership required',
        timestamp: new Date().toISOString(),
      });
    }

    req.instituteId = instituteId;
    next();
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: 'Error validating institute context',
      timestamp: new Date().toISOString(),
    });
  }
}

export function requireBranchAccess(branchParamName: string = 'branchId') {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Platform and Central Institute Admins have access across all branches
    if (['SUPER_ADMIN', 'ACADEMIC_ADMIN'].includes(req.user.role)) {
      return next();
    }

    const targetBranchId = (req.params && req.params[branchParamName]) ||
      (req.body && req.body[branchParamName]) ||
      (req.query && (req.query[branchParamName] as string)) ||
      req.branchId;

    if (!targetBranchId) {
      return next();
    }

    // Check staff branch assignment
    const staffProfile = await prisma.staffProfile.findFirst({
      where: { userId: req.user.userId, instituteId: req.instituteId },
      include: {
        branchAssignments: {
          where: { branchId: targetBranchId, isActive: true },
        },
      },
    });

    if (!staffProfile || staffProfile.branchAssignments.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You are not assigned to this branch',
        timestamp: new Date().toISOString(),
      });
    }

    next();
  };
}
