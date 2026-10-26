import { Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../middleware/auth.js';

const prisma = new PrismaClient();

export const createExamSchema = z.object({
  batchId: z.string().uuid(),
  subjectId: z.string().uuid(),
  title: z.string().min(2).max(150),
  examType: z.string().min(2).max(50), // e.g. "Unit Test 1", "Midterm"
  academicYear: z.string().optional(),
  totalMarks: z.number().positive('Total marks must be greater than zero'),
  passingMarks: z.number().min(0, 'Passing marks cannot be negative'),
  examDate: z.string().min(1, 'Exam date is required'), // YYYY-MM-DD
}).refine((data) => data.passingMarks <= data.totalMarks, {
  message: 'Passing marks cannot exceed total marks',
  path: ['passingMarks'],
});

export const enterMarksSchema = z.object({
  marks: z.array(
    z.object({
      studentId: z.string().uuid(),
      marksObtained: z.number().min(0).optional().default(0),
      isAbsent: z.boolean().default(false),
      remarks: z.string().optional(),
    })
  ).min(1, 'At least one student mark entry is required'),
});

/**
 * Create a new examination
 */
export async function createExam(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) {
      return res.status(400).json({ success: false, error: 'Institute context required' });
    }

    const parse = createExamSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: parse.error.errors });
    }

    const data = parse.data;

    // Verify batch and subject belong to institute
    const batch = await prisma.batch.findFirst({ where: { id: data.batchId, instituteId } });
    if (!batch) return res.status(404).json({ success: false, error: 'Batch not found' });

    const subject = await prisma.subject.findFirst({ where: { id: data.subjectId, instituteId } });
    if (!subject) return res.status(404).json({ success: false, error: 'Subject not found' });

    const exam = await prisma.examination.create({
      data: {
        instituteId,
        batchId: data.batchId,
        subjectId: data.subjectId,
        title: data.title.trim(),
        examType: data.examType.trim(),
        academicYear: data.academicYear || batch.academicYear || '2026-2027',
        totalMarks: new Prisma.Decimal(data.totalMarks),
        passingMarks: new Prisma.Decimal(data.passingMarks),
        examDate: new Date(data.examDate),
        isPublished: false,
      },
      include: {
        batch: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true, code: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        instituteId,
        userId: req.user!.userId,
        action: 'CREATE_EXAMINATION',
        entityType: 'Examination',
        entityId: exam.id,
        newValues: { title: exam.title, totalMarks: data.totalMarks },
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Examination created successfully',
      data: { exam },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to create examination' });
  }
}

/**
 * List examinations
 */
export async function listExams(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) return res.status(400).json({ success: false, error: 'Institute context required' });

    const batchId = req.query.batchId as string;
    const subjectId = req.query.subjectId as string;

    const where: any = { instituteId };
    if (batchId) where.batchId = batchId;
    if (subjectId) where.subjectId = subjectId;

    // Students and Parents only see published exams
    if (req.user?.role === 'STUDENT') {
      where.isPublished = true;
      const student = await prisma.student.findFirst({
        where: { userId: req.user.userId },
        include: { enrollments: { where: { isActive: true } } },
      });
      if (student) {
        where.batchId = { in: student.enrollments.map((e) => e.batchId) };
      }
    } else if (req.user?.role === 'PARENT') {
      where.isPublished = true;
      const children = await prisma.studentParentRelation.findMany({
        where: { parent: { userId: req.user.userId } },
        include: { student: { include: { enrollments: { where: { isActive: true } } } } },
      });
      const batchIds = children.flatMap((c) => c.student.enrollments.map((e) => e.batchId));
      where.batchId = { in: batchIds };
    }

    const exams = await prisma.examination.findMany({
      where,
      orderBy: { examDate: 'desc' },
      include: {
        batch: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true, code: true } },
        _count: { select: { marks: true } },
      },
    });

    return res.json({ success: true, data: { exams } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to list examinations' });
  }
}

/**
 * Get exam details with class statistics
 */
export async function getExamById(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    const { id } = req.params;

    const exam = await prisma.examination.findFirst({
      where: { id, instituteId },
      include: {
        batch: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true, code: true } },
        marks: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true, rollNumber: true } },
          },
          orderBy: { marksObtained: 'desc' },
        },
      },
    });

    if (!exam) return res.status(404).json({ success: false, error: 'Exam not found' });

    // Calculate analytics
    const validScores = exam.marks.filter((m) => !m.isAbsent).map((m) => Number(m.marksObtained));
    const highestScore = validScores.length > 0 ? Math.max(...validScores) : 0;
    const averageScore = validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) / validScores.length : 0;
    const passingMark = Number(exam.passingMarks);
    const passedCount = validScores.filter((s) => s >= passingMark).length;
    const passPercentage = validScores.length > 0 ? Math.round((passedCount / validScores.length) * 100) : 0;

    return res.json({
      success: true,
      data: {
        exam,
        analytics: {
          totalEntries: exam.marks.length,
          absentCount: exam.marks.filter((m) => m.isAbsent).length,
          highestScore,
          averageScore: parseFloat(averageScore.toFixed(2)),
          passPercentage,
        },
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to fetch examination' });
  }
}

/**
 * Record or update student marks in batch
 */
export async function enterExamMarks(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    const { id: examId } = req.params;

    const exam = await prisma.examination.findFirst({
      where: { id: examId, instituteId },
    });
    if (!exam) return res.status(404).json({ success: false, error: 'Exam not found' });

    const parse = enterMarksSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: parse.error.errors });
    }

    const maxMarks = Number(exam.totalMarks);

    // Validate all marks are within bounds
    for (const item of parse.data.marks) {
      if (!item.isAbsent && item.marksObtained > maxMarks) {
        return res.status(400).json({
          success: false,
          error: `Marks obtained (${item.marksObtained}) cannot exceed maximum exam marks (${maxMarks})`,
        });
      }
    }

    // Process marks entries
    const results = await prisma.$transaction(
      parse.data.marks.map((item) =>
        prisma.examMark.upsert({
          where: {
            examId_studentId: {
              examId,
              studentId: item.studentId,
            },
          },
          update: {
            marksObtained: new Prisma.Decimal(item.isAbsent ? 0 : item.marksObtained),
            isAbsent: item.isAbsent,
            remarks: item.remarks?.trim() || null,
            evaluatedById: req.user!.userId,
          },
          create: {
            examId,
            studentId: item.studentId,
            marksObtained: new Prisma.Decimal(item.isAbsent ? 0 : item.marksObtained),
            isAbsent: item.isAbsent,
            remarks: item.remarks?.trim() || null,
            evaluatedById: req.user!.userId,
          },
        })
      )
    );

    await prisma.auditLog.create({
      data: {
        instituteId,
        userId: req.user!.userId,
        action: 'UPDATE_EXAM_MARKS',
        entityType: 'Examination',
        entityId: examId,
        newValues: { count: results.length },
      },
    });

    return res.json({
      success: true,
      message: `Successfully saved ${results.length} student marks`,
      data: { count: results.length },
    });
  } catch (err: any) {
    console.error('[Enter Marks Error]', err);
    return res.status(500).json({ success: false, error: 'Failed to record marks' });
  }
}

/**
 * Publish or unpublish examination results
 */
export async function toggleExamPublish(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    const { id: examId } = req.params;

    const exam = await prisma.examination.findFirst({
      where: { id: examId, instituteId },
    });
    if (!exam) return res.status(404).json({ success: false, error: 'Exam not found' });

    const newPublished = !exam.isPublished;

    const updated = await prisma.examination.update({
      where: { id: examId },
      data: {
        isPublished: newPublished,
        publishedAt: newPublished ? new Date() : null,
      },
    });

    return res.json({
      success: true,
      message: newPublished ? 'Exam results published to students & parents' : 'Exam results unpublished (Draft mode)',
      data: { isPublished: updated.isPublished },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to toggle publication' });
  }
}

/**
 * Student Report Card (Cumulative across all exams)
 */
export async function getStudentReportCard(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    const { studentId } = req.params;

    // Verify Authorization: Student itself, Linked Parent, or Staff/Admin
    if (req.user?.role === 'STUDENT') {
      const student = await prisma.student.findFirst({ where: { userId: req.user.userId } });
      if (!student || student.id !== studentId) {
        return res.status(403).json({ success: false, error: 'Forbidden: You can only view your own report card' });
      }
    } else if (req.user?.role === 'PARENT') {
      const relation = await prisma.studentParentRelation.findFirst({
        where: { studentId, parent: { userId: req.user.userId } },
      });
      if (!relation) {
        return res.status(403).json({ success: false, error: 'Forbidden: You are not authorized for this student' });
      }
    }

    const student = await prisma.student.findFirst({
      where: { id: studentId, instituteId },
      include: {
        institute: { select: { name: true, code: true } },
        enrollments: { include: { batch: true } },
      },
    });
    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });

    // Fetch all published marks for this student
    const marks = await prisma.examMark.findMany({
      where: {
        studentId,
        exam: { instituteId, isPublished: true },
      },
      include: {
        exam: {
          include: {
            subject: { select: { name: true, code: true } },
          },
        },
      },
      orderBy: { exam: { examDate: 'desc' } },
    });

    let totalMaxMarks = 0;
    let totalMarksObtained = 0;
    let totalExams = marks.length;
    let totalPassed = 0;

    const formattedMarks = marks.map((m) => {
      const maxMarks = Number(m.exam.totalMarks);
      const passing = Number(m.exam.passingMarks);
      const score = Number(m.marksObtained);
      const isPass = !m.isAbsent && score >= passing;

      if (!m.isAbsent) {
        totalMaxMarks += maxMarks;
        totalMarksObtained += score;
        if (isPass) totalPassed += 1;
      }

      const percentage = maxMarks > 0 ? Math.round((score / maxMarks) * 100) : 0;

      return {
        id: m.id,
        examId: m.exam.id,
        examTitle: m.exam.title,
        examType: m.exam.examType,
        examDate: m.exam.examDate,
        subject: m.exam.subject.name,
        totalMarks: maxMarks,
        passingMarks: passing,
        marksObtained: score,
        isAbsent: m.isAbsent,
        isPass,
        percentage,
        remarks: m.remarks,
      };
    });

    const cumulativePercentage = totalMaxMarks > 0 ? Math.round((totalMarksObtained / totalMaxMarks) * 100) : 0;

    return res.json({
      success: true,
      data: {
        student: {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          admissionNumber: student.admissionNumber,
          rollNumber: student.rollNumber,
          batchName: student.enrollments[0]?.batch?.name || 'Assigned Batch',
        },
        summary: {
          totalExams,
          totalPassed,
          totalMaxMarks,
          totalMarksObtained,
          cumulativePercentage,
          status: cumulativePercentage >= 40 ? 'PASSED' : 'NEEDS_IMPROVEMENT',
        },
        marks: formattedMarks,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to generate report card' });
  }
}
