import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { verifyPassword, hashPassword, generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../utils/security.js';
import { AuthenticatedRequest } from '../../middleware/auth.js';

const prisma = new PrismaClient();

const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or Phone is required'),
  password: z.string().min(1, 'Password is required'),
  role: z.enum(['SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF', 'PARENT', 'STUDENT']).optional(),
  instituteCode: z.string().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
});

export async function login(req: Request, res: Response) {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.errors[0]?.message || 'Invalid input data',
      });
    }

    const { identifier, password, role, instituteCode } = parseResult.data;

    // Search user by email or phone
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phone: identifier },
        ],
      },
      include: {
        memberships: {
          include: {
            institute: true,
          },
        },
        staffProfile: true,
        parentProfile: true,
        studentProfile: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials or user not found',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account has been deactivated. Please contact your administrator.',
      });
    }

    const isValid = await verifyPassword(user.passwordHash, password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials or incorrect password',
      });
    }

    // Server-enforced role validation
    if (role && user.role !== role) {
      return res.status(403).json({
        success: false,
        error: `Account role mismatch: Selected ${role} but account is registered as ${user.role}`,
      });
    }

    // Determine active institute context
    let activeInstitute = null;
    if (user.role !== 'SUPER_ADMIN') {
      if (instituteCode) {
        const found = user.memberships.find(
          (m) => m.institute.code.toLowerCase() === instituteCode.toLowerCase()
        );
        if (!found || !found.isActive || found.institute.status !== 'ACTIVE') {
          return res.status(403).json({
            success: false,
            error: 'You do not have an active membership in the specified institute',
          });
        }
        activeInstitute = found.institute;
      } else if (user.memberships.length > 0) {
        const activeMembership = user.memberships.find(
          (m) => m.isActive && m.institute.status === 'ACTIVE'
        );
        if (activeMembership) {
          activeInstitute = activeMembership.institute;
        }
      }
    }

    // Update last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      instituteId: activeInstitute?.id || null,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    const activeMemberships = user.memberships
      .filter((m) => m.isActive && m.institute.status === 'ACTIVE')
      .map((m) => ({
        id: m.id,
        role: m.role,
        institute: {
          id: m.institute.id,
          code: m.institute.code,
          name: m.institute.name,
        },
      }));

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        refreshToken,
        mustChangePassword: user.mustChangePassword,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
          memberships: activeMemberships,
        },
        institute: activeInstitute ? {
          id: activeInstitute.id,
          code: activeInstitute.code,
          name: activeInstitute.name,
        } : null,
        memberships: activeMemberships,
      },
    });
  } catch (err: any) {
    console.error('[Login Error]', err);
    return res.status(500).json({
      success: false,
      error: 'An unexpected authentication error occurred',
    });
  }
}

export async function getCurrentUser(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        lastLoginAt: true,
        createdAt: true,
        memberships: {
          where: { isActive: true },
          select: {
            institute: {
              select: {
                id: true,
                code: true,
                name: true,
                status: true,
              },
            },
            role: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User profile not found' });
    }

    return res.json({
      success: true,
      data: {
        user,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to fetch current user' });
  }
}

export async function changePassword(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const parseResult = changePasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.errors[0]?.message,
      });
    }

    const { currentPassword, newPassword } = parseResult.data;

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Students and parents cannot self-service modify credentials unless completing mandatory first-login change
    if ((req.user.role === 'STUDENT' || req.user.role === 'PARENT') && !user.mustChangePassword) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Self-service credential changes are not permitted for student or parent accounts. Please contact your institute administrator.',
      });
    }

    const isMatch = await verifyPassword(user.passwordHash, currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: 'Current password does not match' });
    }

    const newHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
      },
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_CHANGED',
        entityType: 'User',
        entityId: user.id,
      },
    });

    return res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to change password' });
  }
}

export async function refreshToken(req: Request, res: Response) {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Refresh token is required' });
    }

    const payload = verifyRefreshToken(token);
    if (!payload) {
      return res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
    }

    // Verify user is still active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, phone: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return res.status(403).json({ success: false, error: 'User account is inactive or not found' });
    }

    const newAccessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      instituteId: payload.instituteId,
    });

    const newRefreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      instituteId: payload.instituteId,
    });

    return res.json({
      success: true,
      message: 'Tokens renewed successfully',
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to refresh authentication token' });
  }
}

