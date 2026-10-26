import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/security.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
  instituteId?: string;
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

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
  if (payload.instituteId) {
    req.instituteId = payload.instituteId;
  }
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
  const instituteId = req.user.instituteId || (req.headers['x-institute-id'] as string);
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
