import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../../middleware/auth.js';
import { config } from '../../config/index.js';
import { NotificationService } from '../notifications/notification.service.js';
import {
  getAuthorizedStudentScope,
  isStudentAuthorized,
} from '../students/student-authorization.service.js';

const prisma = new PrismaClient();

// Helper: Get local Date (YYYY-MM-DD) in Asia/Kolkata timezone
export function getInstituteLocalDate(date = new Date(), timeZone = 'Asia/Kolkata'): Date {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateStr = formatter.format(date); // "YYYY-MM-DD"
  return new Date(`${dateStr}T00:00:00.000Z`);
}

// Helper: Sign QR Code Payload
export function generateQrPassToken(studentId: string, instituteId: string): string {
  const secret = config.jwt.secret;
  const payload = `${studentId}:${instituteId}`;
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex').substring(0, 16);
  return `TUITION_PASS:${studentId}:${instituteId}:${hmac}`;
}

// Helper: Verify QR Code Payload
export function verifyQrPassToken(qrToken: string): { valid: boolean; studentId?: string; instituteId?: string } {
  const parts = qrToken.split(':');
  if (parts.length !== 4 || parts[0] !== 'TUITION_PASS') {
    return { valid: false };
  }
  const [, studentId, instituteId, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', config.jwt.secret).update(`${studentId}:${instituteId}`).digest('hex').substring(0, 16);
  if (signature !== expectedSig) {
    return { valid: false };
  }
  return { valid: true, studentId, instituteId };
}

// Validation Schemas
export const checkInSchema = z.object({
  studentId: z.string().uuid(),
  batchId: z.string().uuid().optional(),
  method: z.enum(['MANUAL', 'QR_SCAN', 'VOICE_CONFIRMED']).default('MANUAL'),
  isLate: z.boolean().default(false),
  remarks: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export const checkOutSchema = z.object({
  studentId: z.string().uuid(),
  method: z.enum(['MANUAL', 'QR_SCAN', 'VOICE_CONFIRMED']).default('MANUAL'),
  remarks: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export const correctionSchema = z.object({
  remarks: z.string().optional(),
  isLate: z.boolean().optional(),
  reason: z.string().min(3, 'Correction reason is required'),
});

/**
 * Record Student Check-In
 */
export async function recordCheckIn(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) return res.status(400).json({ success: false, error: 'Institute context required' });

    const parse = checkInSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ success: false, error: parse.error.errors[0]?.message });
    }

    const { studentId, batchId, method, isLate, remarks, idempotencyKey } = parse.data;

    // Idempotency check if provided
    if (idempotencyKey) {
      const existing = await prisma.attendanceEvent.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        return res.status(200).json({
          success: true,
          message: 'Check-in request was previously processed',
          data: { event: existing },
        });
      }
    }

    // Verify authorization scope for student
    const isAuth = await isStudentAuthorized(req, studentId, prisma);
    if (!isAuth) {
      return res.status(403).json({ success: false, error: 'Forbidden: You are not authorized to record attendance for this student' });
    }

    // Verify Student belongs to this institute and is ACTIVE
    const student = await prisma.student.findFirst({
      where: { id: studentId, instituteId },
      include: {
        enrollments: { where: { isActive: true } },
      },
    });

    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found in this institute' });
    }
    if (student.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, error: `Cannot record attendance for student in ${student.status} status` });
    }

    if (batchId) {
      const isEnrolledInBatch = student.enrollments.some((e) => e.batchId === batchId);
      if (!isEnrolledInBatch) {
        return res.status(400).json({ success: false, error: 'Student is not enrolled in the specified batch' });
      }
    }

    const assignedBatchId = batchId || student.enrollments[0]?.batchId;
    if (!assignedBatchId) {
      return res.status(400).json({ success: false, error: 'Student is not enrolled in any batch' });
    }

    const serverNow = new Date();
    const eventDate = getInstituteLocalDate(serverNow);

    // Fetch existing attendance events for today
    const todaysEvents = await prisma.attendanceEvent.findMany({
      where: {
        studentId,
        eventDate,
      },
      orderBy: { sessionNumber: 'desc' },
    });

    // Check transition validity:
    // If there is an existing CHECK_IN without an intervening CHECK_OUT in the latest session, reject!
    const latestCheckIn = todaysEvents.find((e) => e.eventType === 'CHECK_IN');
    const latestCheckOut = todaysEvents.find((e) => e.eventType === 'CHECK_OUT');

    if (latestCheckIn) {
      if (!latestCheckOut || latestCheckOut.sessionNumber < latestCheckIn.sessionNumber) {
        return res.status(409).json({
          success: false,
          error: 'Student is already checked in for today. Please record check-out before starting a new session.',
        });
      }
    }

    // Determine session number (e.g. 1 for morning, 2 for evening session)
    const nextSessionNumber = latestCheckIn ? latestCheckIn.sessionNumber + 1 : 1;

    // Record Event in transaction + queue notification
    const event = await prisma.$transaction(
      async (tx) => {
        const createdEvent = await tx.attendanceEvent.create({
          data: {
            instituteId,
            studentId,
            batchId: assignedBatchId,
            eventDate,
            eventType: 'CHECK_IN',
            eventTime: serverNow,
            sessionNumber: nextSessionNumber,
            method,
            isLate,
            markedById: req.user!.userId,
            remarks: remarks || null,
            idempotencyKey: idempotencyKey || null,
          },
        });

        // Queue SMS notification for guardians
        await NotificationService.queueAttendanceNotification({
          attendanceEventId: createdEvent.id,
          studentId,
          instituteId,
          eventType: 'CHECK_IN',
          eventTime: serverNow,
          tx,
        });

        return createdEvent;
      },
      { timeout: 15000, maxWait: 10000 }
    );

    return res.status(201).json({
      success: true,
      message: `${student.firstName} ${student.lastName} checked in successfully.`,
      data: { event },
    });
  } catch (err: any) {
    console.error('[Check-in Error]', err);
    return res.status(500).json({ success: false, error: 'Failed to record check-in' });
  }
}

/**
 * Record Student Check-Out
 */
export async function recordCheckOut(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) return res.status(400).json({ success: false, error: 'Institute context required' });

    const parse = checkOutSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ success: false, error: parse.error.errors[0]?.message });
    }

    const { studentId, method, remarks, idempotencyKey } = parse.data;

    // Idempotency check
    if (idempotencyKey) {
      const existing = await prisma.attendanceEvent.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        return res.status(200).json({
          success: true,
          message: 'Check-out request was previously processed',
          data: { event: existing },
        });
      }
    }

    // Verify authorization scope for student
    const isAuth = await isStudentAuthorized(req, studentId, prisma);
    if (!isAuth) {
      return res.status(403).json({ success: false, error: 'Forbidden: You are not authorized to record check-out for this student' });
    }

    const student = await prisma.student.findFirst({
      where: { id: studentId, instituteId },
    });
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found in this institute' });
    }

    const serverNow = new Date();
    const eventDate = getInstituteLocalDate(serverNow);

    // Fetch existing attendance events for today
    const todaysEvents = await prisma.attendanceEvent.findMany({
      where: { studentId, eventDate },
      orderBy: { sessionNumber: 'desc' },
    });

    // Check transition validity:
    // Student CANNOT check out if they have no active check-in today!
    const activeCheckIn = todaysEvents.find((e) => e.eventType === 'CHECK_IN');
    const existingCheckOut = todaysEvents.find((e) => e.eventType === 'CHECK_OUT' && e.sessionNumber === activeCheckIn?.sessionNumber);

    if (!activeCheckIn || existingCheckOut) {
      return res.status(400).json({
        success: false,
        error: 'Cannot check out: Student has no active check-in record for today.',
      });
    }

    // Record Check-out Event + queue notification
    const event = await prisma.$transaction(
      async (tx) => {
        const createdEvent = await tx.attendanceEvent.create({
          data: {
            instituteId,
            studentId,
            batchId: activeCheckIn.batchId,
            eventDate,
            eventType: 'CHECK_OUT',
            eventTime: serverNow,
            sessionNumber: activeCheckIn.sessionNumber,
            method,
            isLate: false,
            markedById: req.user!.userId,
            remarks: remarks || null,
            idempotencyKey: idempotencyKey || null,
          },
        });

        // Queue SMS notification for guardians
        await NotificationService.queueAttendanceNotification({
          attendanceEventId: createdEvent.id,
          studentId,
          instituteId,
          eventType: 'CHECK_OUT',
          eventTime: serverNow,
          tx,
        });

        return createdEvent;
      },
      { timeout: 15000, maxWait: 10000 }
    );

    return res.status(201).json({
      success: true,
      message: `${student.firstName} ${student.lastName} checked out successfully.`,
      data: { event },
    });
  } catch (err: any) {
    console.error('[Check-out Error]', err);
    return res.status(500).json({ success: false, error: 'Failed to record check-out' });
  }
}

/**
 * Get Today's Attendance State for a Batch / Institute
 */
export async function getAttendanceSummary(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) return res.status(400).json({ success: false, error: 'Institute context required' });

    const batchId = req.query.batchId as string;
    const dateQuery = req.query.date as string;
    const targetDate = dateQuery ? new Date(dateQuery) : getInstituteLocalDate();

    const scope = await getAuthorizedStudentScope(req, prisma);

    const andConditions: any[] = [
      { instituteId, status: 'ACTIVE' },
      scope.whereClause,
    ];

    if (batchId) {
      andConditions.push({
        enrollments: { some: { batchId, isActive: true } },
      });
    }

    const studentWhere: any = { AND: andConditions };

    const [students, events] = await Promise.all([
      prisma.student.findMany({
        where: studentWhere,
        include: {
          enrollments: {
            where: { isActive: true },
            include: { batch: { select: { id: true, name: true } } },
          },
        },
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      }),
      prisma.attendanceEvent.findMany({
        where: {
          instituteId,
          eventDate: targetDate,
          ...(batchId ? { batchId } : {}),
        },
        include: {
          markedBy: { select: { fullName: true } },
        },
      }),
    ]);

    // Map each student's current status for today
    const studentStatusMap = students.map((student) => {
      const studentEvents = events.filter((e) => e.studentId === student.id);
      const checkInEvent = studentEvents.find((e) => e.eventType === 'CHECK_IN');
      const checkOutEvent = studentEvents.find((e) => e.eventType === 'CHECK_OUT');

      let status = 'ABSENT';
      if (checkInEvent && !checkOutEvent) {
        status = 'CHECKED_IN';
      } else if (checkInEvent && checkOutEvent) {
        status = 'CHECKED_OUT';
      }

      return {
        student: {
          id: student.id,
          name: `${student.firstName} ${student.lastName}`,
          admissionNumber: student.admissionNumber,
          rollNumber: student.rollNumber,
          photoUrl: student.photoUrl,
          batchName: student.enrollments[0]?.batch?.name || 'Unassigned',
        },
        status,
        isLate: checkInEvent?.isLate || false,
        checkInTime: checkInEvent?.eventTime || null,
        checkOutTime: checkOutEvent?.eventTime || null,
        method: checkInEvent?.method || null,
        markedBy: checkInEvent?.markedBy?.fullName || null,
        eventId: checkInEvent?.id || null,
      };
    });

    const totalStudents = students.length;
    const checkedInCount = studentStatusMap.filter((s) => s.status === 'CHECKED_IN').length;
    const checkedOutCount = studentStatusMap.filter((s) => s.status === 'CHECKED_OUT').length;
    const presentTotal = checkedInCount + checkedOutCount;
    const lateCount = studentStatusMap.filter((s) => s.isLate).length;
    const absentCount = totalStudents - presentTotal;

    return res.json({
      success: true,
      data: {
        date: targetDate.toISOString().split('T')[0],
        counts: {
          totalStudents,
          presentTotal,
          checkedInCount,
          checkedOutCount,
          lateCount,
          absentCount,
        },
        records: studentStatusMap,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to fetch attendance summary' });
  }
}

/**
 * Attendance Reports with Filters (Date range, Batch-wise, Student-wise, Missing Checkouts)
 */
export async function getAttendanceReports(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) return res.status(400).json({ success: false, error: 'Institute context required' });

    const startDateStr = req.query.startDate as string;
    const endDateStr = req.query.endDate as string;
    const batchId = req.query.batchId as string;
    const reportType = req.query.type as string; // 'daily' | 'weekly' | 'monthly' | 'missing_checkout' | 'late'

    const now = new Date();
    let startDate = startDateStr ? new Date(startDateStr) : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    let endDate = endDateStr ? new Date(endDateStr) : now;

    const scope = await getAuthorizedStudentScope(req, prisma);

    const where: any = {
      instituteId,
      student: scope.whereClause,
      eventDate: {
        gte: getInstituteLocalDate(startDate),
        lte: getInstituteLocalDate(endDate),
      },
    };

    if (batchId) where.batchId = batchId;
    if (reportType === 'late') where.isLate = true;

    const events = await prisma.attendanceEvent.findMany({
      where,
      orderBy: [{ eventDate: 'desc' }, { eventTime: 'desc' }],
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, admissionNumber: true, rollNumber: true },
        },
        batch: { select: { id: true, name: true } },
        markedBy: { select: { id: true, fullName: true } },
      },
    });

    return res.json({
      success: true,
      data: {
        totalEvents: events.length,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        events,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to generate attendance report' });
  }
}

/**
 * Generate Student QR Pass
 */
export async function getStudentQrPass(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    const { studentId } = req.params;

    const isAuth = await isStudentAuthorized(req, studentId, prisma);
    if (!isAuth) {
      return res.status(403).json({ success: false, error: 'Forbidden: You are not authorized to view this student QR pass' });
    }

    const student = await prisma.student.findFirst({
      where: { id: studentId, instituteId },
      include: {
        institute: { select: { id: true, name: true, code: true } },
        enrollments: { include: { batch: true } },
      },
    });

    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found in this institute' });
    }

    const qrToken = generateQrPassToken(student.id, student.instituteId);

    return res.json({
      success: true,
      data: {
        qrToken,
        student: {
          id: student.id,
          fullName: `${student.firstName} ${student.lastName}`,
          admissionNumber: student.admissionNumber,
          rollNumber: student.rollNumber,
          instituteName: student.institute.name,
          batchName: student.enrollments[0]?.batch?.name || 'Unassigned',
        },
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to generate QR pass' });
  }
}

/**
 * Validate Scanned QR Token
 */
export async function validateScannedQr(req: AuthenticatedRequest, res: Response) {
  try {
    const callerInstituteId = req.instituteId;
    const { qrToken } = req.body;

    if (!qrToken) {
      return res.status(400).json({ success: false, error: 'qrToken is required' });
    }

    const verification = verifyQrPassToken(qrToken);
    if (!verification.valid || !verification.studentId || !verification.instituteId) {
      return res.status(400).json({ success: false, error: 'Invalid or forged QR attendance pass' });
    }

    if (callerInstituteId && verification.instituteId !== callerInstituteId) {
      return res.status(403).json({ success: false, error: 'This QR pass belongs to another institute' });
    }

    const isAuth = await isStudentAuthorized(req, verification.studentId, prisma);
    if (!isAuth) {
      return res.status(403).json({ success: false, error: 'Forbidden: You are not authorized to scan QR for this student' });
    }

    const student = await prisma.student.findUnique({
      where: { id: verification.studentId },
      include: {
        enrollments: { where: { isActive: true }, include: { batch: true } },
      },
    });

    if (!student || student.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, error: 'Student account is inactive or not found' });
    }

    // Check current state for today
    const today = getInstituteLocalDate();
    const todaysEvents = await prisma.attendanceEvent.findMany({
      where: { studentId: student.id, eventDate: today },
      orderBy: { eventTime: 'desc' },
    });

    const isCheckedIn = todaysEvents.some((e) => e.eventType === 'CHECK_IN');
    const isCheckedOut = todaysEvents.some((e) => e.eventType === 'CHECK_OUT');

    const recommendedAction = !isCheckedIn ? 'CHECK_IN' : !isCheckedOut ? 'CHECK_OUT' : 'SESSION_COMPLETED';

    return res.json({
      success: true,
      data: {
        student: {
          id: student.id,
          name: `${student.firstName} ${student.lastName}`,
          admissionNumber: student.admissionNumber,
          rollNumber: student.rollNumber,
          batchName: student.enrollments[0]?.batch?.name || 'Unassigned',
          batchId: student.enrollments[0]?.batchId,
        },
        todayStatus: {
          isCheckedIn,
          isCheckedOut,
          recommendedAction,
        },
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to validate QR token' });
  }
}

/**
 * Correct Attendance Event
 */
export async function correctAttendanceEvent(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    const { eventId } = req.params;

    const parse = correctionSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ success: false, error: parse.error.errors[0]?.message });
    }

    const { remarks, isLate, reason } = parse.data;

    const existing = await prisma.attendanceEvent.findFirst({
      where: { id: eventId, instituteId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Attendance record not found' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const event = await tx.attendanceEvent.update({
        where: { id: eventId },
        data: {
          ...(remarks !== undefined && { remarks }),
          ...(isLate !== undefined && { isLate }),
          isCorrected: true,
          correctionNote: reason,
        },
      });

      // Audit Log for manual correction
      await tx.auditLog.create({
        data: {
          instituteId,
          userId: req.user!.userId,
          action: 'ATTENDANCE_CORRECTED',
          entityType: 'AttendanceEvent',
          entityId: eventId,
          oldValues: { isLate: existing.isLate, remarks: existing.remarks },
          newValues: { isLate, remarks, reason },
        },
      });

      return event;
    });

    return res.json({
      success: true,
      message: 'Attendance record corrected successfully',
      data: { event: updated },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to correct attendance record' });
  }
}
