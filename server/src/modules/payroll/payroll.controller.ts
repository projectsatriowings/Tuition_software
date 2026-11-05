import { Response } from 'express';
import { prisma } from '../../prisma.js';
import { AuthenticatedRequest } from '../../middleware/auth.js';
import { z } from 'zod';
import {
  calculateStaffMonthlyPayroll,
  CalculationInput,
} from './payroll-calc.service.js';
import {
  PayrollCalculationBasis,
  LateDeductionPolicy,
  SalaryComponentType,
  SalaryComponentCalcType,
  PayrollRunStatus,
  PayrollPaymentStatus,
  PayrollAdjustmentType,
} from '@prisma/client';

// ==========================================
// 1. INPUT VALIDATION SCHEMAS
// ==========================================

export const updatePayrollPolicySchema = z.object({
  calculationBasis: z.nativeEnum(PayrollCalculationBasis).optional(),
  unpaidLeaveDeduction: z.boolean().optional(),
  halfDayDeductionFactor: z.number().min(0).max(1).optional(),
  lateDeductionPolicy: z.nativeEnum(LateDeductionPolicy).optional(),
  lateGraceOccurrences: z.number().int().min(0).optional(),
  lateDeductionAmount: z.number().min(0).optional(),
  wfhSalaryTreatment: z.string().optional(),
  prorationPolicy: z.string().optional(),
  currency: z.string().optional(),
  salaryPaymentMethods: z.array(z.string()).optional(),
});

export const createSalaryStructureSchema = z.object({
  name: z.string().min(2, 'Structure name is required'),
  description: z.string().optional().nullable(),
  isDefault: z.boolean().optional(),
  components: z.array(
    z.object({
      name: z.string().min(1, 'Component name required'),
      type: z.nativeEnum(SalaryComponentType),
      calculationType: z.nativeEnum(SalaryComponentCalcType),
      amountOrPercent: z.number().min(0),
      isTaxable: z.boolean().optional(),
      isStatutory: z.boolean().optional(),
      displayOrder: z.number().int().optional(),
    })
  ).min(1, 'At least one salary component is required'),
});

export const assignStaffSalarySchema = z.object({
  staffId: z.string().uuid(),
  structureId: z.string().uuid().optional().nullable(),
  baseMonthlySalary: z.number().min(1, 'Base monthly salary must be greater than 0'),
  effectiveFrom: z.string().min(10, 'Valid effective date required'), // YYYY-MM-DD
  notes: z.string().optional().nullable(),
});

export const generatePayrollRunSchema = z.object({
  year: z.number().int().min(2020).max(2050),
  month: z.number().int().min(1).max(12),
  notes: z.string().optional(),
});

export const addAdjustmentSchema = z.object({
  type: z.nativeEnum(PayrollAdjustmentType),
  title: z.string().min(2, 'Title required'),
  amount: z.number().min(0.01, 'Amount must be positive'),
  reason: z.string().min(3, 'Mandatory reason required for audit trail'),
});

export const recordPaymentSchema = z.object({
  amount: z.number().min(0.01, 'Payment amount must be greater than 0'),
  paymentMethod: z.string().min(1, 'Payment method required'),
  transactionReference: z.string().optional().nullable(),
  paymentDate: z.string().optional(),
  notes: z.string().optional().nullable(),
});

// Helper to ensure default payroll policy exists
async function getOrCreatePolicy(instituteId: string) {
  let policy = await prisma.payrollPolicy.findUnique({
    where: { instituteId },
  });

  if (!policy) {
    policy = await prisma.payrollPolicy.create({
      data: {
        instituteId,
        calculationBasis: PayrollCalculationBasis.CALENDAR_DAYS,
        unpaidLeaveDeduction: true,
        halfDayDeductionFactor: 0.5,
        lateDeductionPolicy: LateDeductionPolicy.AFTER_GRACE_PERIOD,
        lateGraceOccurrences: 3,
        lateDeductionAmount: 200,
        wfhSalaryTreatment: 'FULL_PAY',
        prorationPolicy: 'CALENDAR_DAYS',
        currency: 'INR',
        salaryPaymentMethods: ['BANK_TRANSFER', 'UPI', 'CASH', 'CHEQUE'],
      },
    });
  }

  return policy;
}

// ==========================================
// 2. DASHBOARD & OVERVIEW
// ==========================================

export async function getPayrollDashboard(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId!;
    const now = new Date();
    const year = req.query.year ? parseInt(req.query.year as string, 10) : now.getFullYear();
    const month = req.query.month ? parseInt(req.query.month as string, 10) : now.getMonth() + 1;

    // 1. Get total active staff
    const totalActiveStaff = await prisma.staffProfile.count({
      where: { instituteId, user: { isActive: true } },
    });

    // 2. Get current month's payroll run if any
    const run = await prisma.payrollRun.findUnique({
      where: { instituteId_year_month: { instituteId, year, month } },
      include: {
        records: {
          select: {
            id: true,
            staffId: true,
            employeeCode: true,
            staffName: true,
            designation: true,
            grossPay: true,
            totalDeductions: true,
            netPayable: true,
            paidAmount: true,
            pendingAmount: true,
            paymentStatus: true,
            workedDays: true,
            warnings: true,
          },
        },
      },
    });

    // 3. Count configured salaries
    const configuredSalariesCount = await prisma.staffSalaryAssignment.count({
      where: { instituteId, status: 'ACTIVE' },
    });

    // 4. Summarize statistics
    const totalGross = run?.totalGross || 0;
    const totalNetPayable = run?.totalNetPayable || 0;
    const totalPaid = run?.totalPaid || 0;
    const totalPending = Math.max(0, totalNetPayable - totalPaid);

    let exceptionCount = 0;
    if (run?.records) {
      exceptionCount = run.records.filter((r) => {
        const hasWarnings = Array.isArray(r.warnings) && r.warnings.length > 0;
        return hasWarnings || r.workedDays === 0;
      }).length;
    }

    return res.json({
      success: true,
      data: {
        period: { year, month },
        metrics: {
          totalActiveStaff,
          configuredSalariesCount,
          totalGross,
          totalNetPayable,
          totalPaid,
          totalPending,
          exceptionCount,
          runStatus: run?.status || 'NOT_GENERATED',
          runId: run?.id || null,
          approvedAt: run?.approvedAt || null,
        },
        records: run?.records || [],
      },
    });
  } catch (err: any) {
    console.error('[getPayrollDashboard Error]', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to load dashboard' });
  }
}

// ==========================================
// 3. PAYROLL SETTINGS / POLICY
// ==========================================

export async function getPayrollPolicy(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId!;
    const policy = await getOrCreatePolicy(instituteId);
    return res.json({ success: true, data: { policy } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function updatePayrollPolicy(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId!;
    const parse = updatePayrollPolicySchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ success: false, error: parse.error.errors[0]?.message });
    }

    const updated = await prisma.payrollPolicy.upsert({
      where: { instituteId },
      update: parse.data,
      create: {
        instituteId,
        ...parse.data,
      },
    });

    await prisma.auditLog.create({
      data: {
        instituteId,
        userId: req.user?.userId || null,
        action: 'PAYROLL_POLICY_UPDATED',
        entityType: 'PayrollPolicy',
        entityId: updated.id,
        newValues: parse.data,
      },
    });

    return res.json({ success: true, data: { policy: updated } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// ==========================================
// 4. SALARY STRUCTURES & TEMPLATES
// ==========================================

export async function listSalaryStructures(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId!;
    const structures = await prisma.salaryStructure.findMany({
      where: { instituteId },
      include: {
        components: { orderBy: { displayOrder: 'asc' } },
        _count: { select: { assignments: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return res.json({ success: true, data: { structures } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function createSalaryStructure(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId!;
    const parse = createSalaryStructureSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ success: false, error: parse.error.errors[0]?.message });
    }

    const { name, description, isDefault, components } = parse.data;

    // If marked default, unset other defaults
    if (isDefault) {
      await prisma.salaryStructure.updateMany({
        where: { instituteId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const structure = await prisma.salaryStructure.create({
      data: {
        instituteId,
        name: name.trim(),
        description: description?.trim() || null,
        isDefault: isDefault ?? false,
        components: {
          create: components.map((c, idx) => ({
            name: c.name.trim(),
            type: c.type,
            calculationType: c.calculationType,
            amountOrPercent: c.amountOrPercent,
            isTaxable: c.isTaxable ?? true,
            isStatutory: c.isStatutory ?? false,
            displayOrder: c.displayOrder ?? idx + 1,
          })),
        },
      },
      include: { components: true },
    });

    return res.status(201).json({ success: true, data: { structure } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function updateSalaryStructure(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId!;
    const { id } = req.params;
    const parse = createSalaryStructureSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ success: false, error: parse.error.errors[0]?.message });
    }

    const existing = await prisma.salaryStructure.findFirst({
      where: { id, instituteId },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Structure not found' });
    }

    const { name, description, isDefault, components } = parse.data;

    await prisma.$transaction(async (tx) => {
      // 1. Delete existing components
      await tx.salaryComponent.deleteMany({ where: { structureId: id } });

      // 2. Update structure
      await tx.salaryStructure.update({
        where: { id },
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          isDefault: isDefault ?? false,
          components: {
            create: components.map((c, idx) => ({
              name: c.name.trim(),
              type: c.type,
              calculationType: c.calculationType,
              amountOrPercent: c.amountOrPercent,
              isTaxable: c.isTaxable ?? true,
              isStatutory: c.isStatutory ?? false,
              displayOrder: c.displayOrder ?? idx + 1,
            })),
          },
        },
      });
    });

    const updated = await prisma.salaryStructure.findUnique({
      where: { id },
      include: { components: { orderBy: { displayOrder: 'asc' } } },
    });

    return res.json({ success: true, data: { structure: updated } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function deleteSalaryStructure(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId!;
    const { id } = req.params;

    const assignedCount = await prisma.staffSalaryAssignment.count({
      where: { structureId: id, status: 'ACTIVE' },
    });

    if (assignedCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete structure: it is actively assigned to ${assignedCount} staff member(s).`,
      });
    }

    await prisma.salaryStructure.delete({ where: { id } });
    return res.json({ success: true, message: 'Structure deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// ==========================================
// 5. STAFF SALARY SETUP & ASSIGNMENTS
// ==========================================

export async function listStaffSalaries(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId!;
    const staffMembers = await prisma.staffProfile.findMany({
      where: { instituteId, user: { isActive: true } },
      include: {
        user: { select: { fullName: true, email: true, phone: true } },
        salaryAssignments: {
          where: { status: 'ACTIVE' },
          include: { structure: { include: { components: true } } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { employeeCode: 'asc' },
    });

    const result = staffMembers.map((s) => {
      const activeAssignment = s.salaryAssignments[0] || null;
      return {
        staffId: s.id,
        employeeCode: s.employeeCode || 'N/A',
        fullName: s.user.fullName,
        email: s.user.email,
        phone: s.user.phone,
        designation: s.designation || 'Staff',
        department: s.department || 'General',
        employmentType: s.employmentType,
        joiningDate: s.joiningDate,
        hasSalarySetup: !!activeAssignment,
        assignment: activeAssignment
          ? {
              id: activeAssignment.id,
              baseMonthlySalary: activeAssignment.baseMonthlySalary,
              effectiveFrom: activeAssignment.effectiveFrom,
              structureName: activeAssignment.structure?.name || 'Custom / Direct Base',
              structureId: activeAssignment.structureId,
              notes: activeAssignment.notes,
            }
          : null,
      };
    });

    return res.json({ success: true, data: { staffSalaries: result } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function assignStaffSalary(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId!;
    const parse = assignStaffSalarySchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ success: false, error: parse.error.errors[0]?.message });
    }

    const { staffId, structureId, baseMonthlySalary, effectiveFrom, notes } = parse.data;

    // Verify staff exists in institute
    const staff = await prisma.staffProfile.findFirst({
      where: { id: staffId, instituteId },
    });
    if (!staff) {
      return res.status(404).json({ success: false, error: 'Staff member not found' });
    }

    // Archive previous active assignments
    await prisma.staffSalaryAssignment.updateMany({
      where: { staffId, status: 'ACTIVE' },
      data: { status: 'ARCHIVED', effectiveTo: new Date(effectiveFrom) },
    });

    // Create new assignment
    const assignment = await prisma.staffSalaryAssignment.create({
      data: {
        instituteId,
        staffId,
        structureId: structureId || null,
        baseMonthlySalary,
        effectiveFrom: new Date(effectiveFrom),
        notes: notes?.trim() || null,
        createdById: req.user?.userId || null,
        status: 'ACTIVE',
      },
      include: { structure: true },
    });

    await prisma.auditLog.create({
      data: {
        instituteId,
        userId: req.user?.userId || null,
        action: 'STAFF_SALARY_ASSIGNED',
        entityType: 'StaffSalaryAssignment',
        entityId: assignment.id,
        newValues: { staffId, baseMonthlySalary, effectiveFrom, structureId },
      },
    });

    return res.status(201).json({ success: true, data: { assignment } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function getStaffSalaryHistory(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId!;
    const { staffId } = req.params;

    const history = await prisma.staffSalaryAssignment.findMany({
      where: { staffId, instituteId },
      include: { structure: true },
      orderBy: { effectiveFrom: 'desc' },
    });

    return res.json({ success: true, data: { history } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// ==========================================
// 6. MONTHLY PAYROLL RUN GENERATION & WORKFLOW
// ==========================================

export async function generateMonthlyPayroll(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId!;
    const parse = generatePayrollRunSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ success: false, error: parse.error.errors[0]?.message });
    }

    const { year, month, notes } = parse.data;

    // Check if approved or paid run already exists
    const existingRun = await prisma.payrollRun.findUnique({
      where: { instituteId_year_month: { instituteId, year, month } },
    });

    if (existingRun && (existingRun.status === PayrollRunStatus.APPROVED || existingRun.status === PayrollRunStatus.PAID)) {
      return res.status(400).json({
        success: false,
        error: `Payroll for ${month}/${year} is already approved and locked against silent recalculations.`,
      });
    }

    const policy = await getOrCreatePolicy(instituteId);

    // Date range for attendance query
    const lastDay = new Date(year, month, 0).getDate();
    const startDate = new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00.000Z`);
    const endDate = new Date(`${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59.999Z`);

    // Fetch active staff with active salary assignments
    const staffMembers = await prisma.staffProfile.findMany({
      where: { instituteId, user: { isActive: true } },
      include: {
        user: { select: { fullName: true, email: true, phone: true } },
        salaryAssignments: {
          where: { status: 'ACTIVE' },
          include: { structure: { include: { components: true } } },
          orderBy: { effectiveFrom: 'desc' },
          take: 1,
        },
      },
    });

    // Fetch all attendance sessions in the month
    const attendanceSessions = await prisma.staffAttendanceSession.findMany({
      where: {
        instituteId,
        attendanceDate: { gte: startDate, lte: endDate },
      },
    });

    // Calculate payroll for each staff
    const recordsToCreate: any[] = [];
    let totalGross = 0;
    let totalDeductions = 0;
    let totalNetPayable = 0;

    for (const staff of staffMembers) {
      const assignment = staff.salaryAssignments[0];
      if (!assignment) continue; // Skip staff without configured salary

      const staffSessions = attendanceSessions.filter((s) => s.staffId === staff.id);

      const calcInput: CalculationInput = {
        staff: {
          id: staff.id,
          employeeCode: staff.employeeCode,
          designation: staff.designation,
          department: staff.department,
          joiningDate: staff.joiningDate,
          user: staff.user,
        },
        salaryAssignment: {
          id: assignment.id,
          baseMonthlySalary: assignment.baseMonthlySalary,
          structure: assignment.structure,
        },
        policy: {
          calculationBasis: policy.calculationBasis,
          unpaidLeaveDeduction: policy.unpaidLeaveDeduction,
          halfDayDeductionFactor: policy.halfDayDeductionFactor,
          lateDeductionPolicy: policy.lateDeductionPolicy,
          lateGraceOccurrences: policy.lateGraceOccurrences,
          lateDeductionAmount: policy.lateDeductionAmount,
          wfhSalaryTreatment: policy.wfhSalaryTreatment,
          prorationPolicy: policy.prorationPolicy,
          currency: policy.currency,
        },
        attendanceSessions: staffSessions,
        month,
        year,
      };

      const calc = calculateStaffMonthlyPayroll(calcInput);

      totalGross += calc.grossPay;
      totalDeductions += calc.totalDeductions;
      totalNetPayable += calc.netPayable;

      recordsToCreate.push({
        instituteId,
        staffId: staff.id,
        staffSalaryAssignmentId: assignment.id,
        employeeCode: staff.employeeCode,
        staffName: staff.user.fullName,
        designation: staff.designation || 'Staff',
        department: staff.department || 'General',
        calendarDays: calc.calendarDays,
        workedDays: calc.workedDays,
        onSiteDays: calc.onSiteDays,
        wfhDays: calc.wfhDays,
        paidLeaveDays: calc.paidLeaveDays,
        unpaidLeaveDays: calc.unpaidLeaveDays,
        halfDays: calc.halfDays,
        lateDays: calc.lateDays,
        weeklyOffDays: calc.weeklyOffDays,
        publicHolidays: 0,
        missingAttendanceDays: calc.missingAttendanceDays,
        baseMonthlyRate: calc.baseMonthlyRate,
        grossPay: calc.grossPay,
        totalDeductions: calc.totalDeductions,
        netPayable: calc.netPayable,
        pendingAmount: calc.netPayable,
        paidAmount: 0,
        paymentStatus: PayrollPaymentStatus.UNPAID,
        calculationBreakdownJson: calc.breakdown,
        warnings: calc.warnings,
      });
    }

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const title = `Payroll - ${monthNames[month - 1]} ${year}`;

    // Upsert Payroll Run and Records inside a transaction
    const payrollRun = await prisma.$transaction(async (tx) => {
      if (existingRun) {
        await tx.payrollRecord.deleteMany({ where: { runId: existingRun.id } });
        return tx.payrollRun.update({
          where: { id: existingRun.id },
          data: {
            status: PayrollRunStatus.CALCULATED,
            totalStaffCount: recordsToCreate.length,
            totalGross,
            totalDeductions,
            totalNetPayable,
            totalPaid: 0,
            calculatedAt: new Date(),
            notes: notes || existingRun.notes,
            records: { create: recordsToCreate },
          },
          include: { records: true },
        });
      } else {
        return tx.payrollRun.create({
          data: {
            instituteId,
            year,
            month,
            title,
            status: PayrollRunStatus.CALCULATED,
            totalStaffCount: recordsToCreate.length,
            totalGross,
            totalDeductions,
            totalNetPayable,
            totalPaid: 0,
            calculatedAt: new Date(),
            notes: notes || null,
            processedById: req.user?.userId || null,
            records: { create: recordsToCreate },
          },
          include: { records: true },
        });
      }
    });

    await prisma.auditLog.create({
      data: {
        instituteId,
        userId: req.user?.userId || null,
        action: 'PAYROLL_GENERATED',
        entityType: 'PayrollRun',
        entityId: payrollRun.id,
        newValues: { year, month, staffCount: recordsToCreate.length, totalNetPayable },
      },
    });

    return res.status(201).json({ success: true, data: { payrollRun } });
  } catch (err: any) {
    console.error('[generateMonthlyPayroll Error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function listPayrollRuns(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId!;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;

    const runs = await prisma.payrollRun.findMany({
      where: {
        instituteId,
        ...(year ? { year } : {}),
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      include: {
        _count: { select: { records: true } },
      },
    });

    return res.json({ success: true, data: { runs } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function getPayrollRunDetails(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId!;
    const { id } = req.params;

    const run = await prisma.payrollRun.findFirst({
      where: { id, instituteId },
      include: {
        records: {
          include: {
            adjustments: true,
            payments: true,
            payslip: { select: { id: true, payslipNumber: true, issueDate: true } },
          },
          orderBy: { staffName: 'asc' },
        },
      },
    });

    if (!run) {
      return res.status(404).json({ success: false, error: 'Payroll run not found' });
    }

    return res.json({ success: true, data: { run } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function approvePayrollRun(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId!;
    const { id } = req.params;

    const run = await prisma.payrollRun.findFirst({
      where: { id, instituteId },
      include: { records: true },
    });

    if (!run) {
      return res.status(404).json({ success: false, error: 'Payroll run not found' });
    }

    if (run.status === PayrollRunStatus.APPROVED || run.status === PayrollRunStatus.PAID) {
      return res.status(400).json({ success: false, error: 'Payroll is already approved.' });
    }

    const institute = await prisma.institute.findUnique({
      where: { id: instituteId },
      select: { name: true, code: true, email: true, phone: true, address: true },
    });

    await prisma.$transaction(async (tx) => {
      // 1. Mark run as approved
      await tx.payrollRun.update({
        where: { id },
        data: {
          status: PayrollRunStatus.APPROVED,
          approvedAt: new Date(),
          approvedById: req.user?.userId || null,
        },
      });

      // 2. Generate immutable payslip snapshot for each staff member
      for (const rec of run.records) {
        const payslipNumber = `PS-${run.year}${String(run.month).padStart(2, '0')}-${(institute?.code || 'INST').toUpperCase()}-${rec.staffId.slice(0, 4).toUpperCase()}`;

        const snapshot = {
          payslipNumber,
          period: `${run.month}/${run.year}`,
          institute,
          staff: {
            id: rec.staffId,
            employeeCode: rec.employeeCode,
            name: rec.staffName,
            designation: rec.designation,
            department: rec.department,
          },
          attendance: {
            calendarDays: rec.calendarDays,
            workedDays: rec.workedDays,
            onSiteDays: rec.onSiteDays,
            wfhDays: rec.wfhDays,
            paidLeaveDays: rec.paidLeaveDays,
            unpaidLeaveDays: rec.unpaidLeaveDays,
            lateDays: rec.lateDays,
          },
          financials: {
            baseMonthlyRate: rec.baseMonthlyRate,
            grossPay: rec.grossPay,
            totalDeductions: rec.totalDeductions,
            netPayable: rec.netPayable,
            calculationBreakdown: rec.calculationBreakdownJson,
          },
          approvedAt: new Date().toISOString(),
        };

        await tx.payslip.upsert({
          where: { recordId: rec.id },
          create: {
            recordId: rec.id,
            instituteId,
            staffId: rec.staffId,
            payslipNumber,
            month: run.month,
            year: run.year,
            snapshotJson: snapshot,
          },
          update: {
            snapshotJson: snapshot,
          },
        });
      }
    });

    await prisma.auditLog.create({
      data: {
        instituteId,
        userId: req.user?.userId || null,
        action: 'PAYROLL_APPROVED',
        entityType: 'PayrollRun',
        entityId: id,
        newValues: { year: run.year, month: run.month, totalNetPayable: run.totalNetPayable },
      },
    });

    return res.json({ success: true, message: 'Payroll approved and payslips generated successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// ==========================================
// 7. MANUAL ADJUSTMENTS & PAYMENTS
// ==========================================

export async function addPayrollAdjustment(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId!;
    const { recordId } = req.params;
    const parse = addAdjustmentSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ success: false, error: parse.error.errors[0]?.message });
    }

    const { type, title, amount, reason } = parse.data;

    const record = await prisma.payrollRecord.findFirst({
      where: { id: recordId, instituteId },
      include: { payrollRun: true },
    });

    if (!record) {
      return res.status(404).json({ success: false, error: 'Payroll record not found' });
    }

    if (record.payrollRun.status === PayrollRunStatus.PAID) {
      return res.status(400).json({ success: false, error: 'Cannot modify a fully paid payroll run.' });
    }

    // Apply adjustment and update record net payable
    const adjustment = await prisma.$transaction(async (tx) => {
      const adj = await tx.payrollAdjustment.create({
        data: {
          recordId,
          type,
          title: title.trim(),
          amount,
          reason: reason.trim(),
          createdById: req.user?.userId || null,
        },
      });

      const newGross = type === PayrollAdjustmentType.EARNING ? record.grossPay + amount : record.grossPay;
      const newDeductions = type === PayrollAdjustmentType.DEDUCTION ? record.totalDeductions + amount : record.totalDeductions;
      const newNet = Math.max(0, newGross - newDeductions);
      const newPending = Math.max(0, newNet - record.paidAmount);

      await tx.payrollRecord.update({
        where: { id: recordId },
        data: {
          grossPay: newGross,
          totalDeductions: newDeductions,
          netPayable: newNet,
          pendingAmount: newPending,
        },
      });

      // Update parent run totals
      const grossDiff = type === PayrollAdjustmentType.EARNING ? amount : 0;
      const dedDiff = type === PayrollAdjustmentType.DEDUCTION ? amount : 0;
      const netDiff = grossDiff - dedDiff;

      await tx.payrollRun.update({
        where: { id: record.runId },
        data: {
          totalGross: record.payrollRun.totalGross + grossDiff,
          totalDeductions: record.payrollRun.totalDeductions + dedDiff,
          totalNetPayable: record.payrollRun.totalNetPayable + netDiff,
        },
      });

      return adj;
    });

    await prisma.auditLog.create({
      data: {
        instituteId,
        userId: req.user?.userId || null,
        action: 'PAYROLL_ADJUSTMENT_ADDED',
        entityType: 'PayrollAdjustment',
        entityId: adjustment.id,
        newValues: { recordId, type, amount, reason },
      },
    });

    return res.status(201).json({ success: true, data: { adjustment } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function recordSalaryPayment(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId!;
    const { recordId } = req.params;
    const parse = recordPaymentSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ success: false, error: parse.error.errors[0]?.message });
    }

    const { amount, paymentMethod, transactionReference, paymentDate, notes } = parse.data;

    const record = await prisma.payrollRecord.findFirst({
      where: { id: recordId, instituteId },
      include: { payrollRun: true },
    });

    if (!record) {
      return res.status(404).json({ success: false, error: 'Payroll record not found' });
    }

    if (amount > record.pendingAmount + 0.01) {
      return res.status(400).json({
        success: false,
        error: `Cannot pay ₹${amount}. Maximum remaining payable balance is ₹${record.pendingAmount}.`,
      });
    }

    const payment = await prisma.$transaction(async (tx) => {
      const pay = await tx.salaryPayment.create({
        data: {
          recordId,
          instituteId,
          amount,
          paymentMethod,
          transactionReference: transactionReference?.trim() || null,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          notes: notes?.trim() || null,
          recordedById: req.user?.userId || null,
        },
      });

      const newPaid = record.paidAmount + amount;
      const newPending = Math.max(0, record.netPayable - newPaid);
      const newStatus =
        newPending <= 0.01 ? PayrollPaymentStatus.PAID : PayrollPaymentStatus.PARTIAL;

      await tx.payrollRecord.update({
        where: { id: recordId },
        data: {
          paidAmount: newPaid,
          pendingAmount: newPending,
          paymentStatus: newStatus,
        },
      });

      // Update run totalPaid
      const updatedRunTotalPaid = record.payrollRun.totalPaid + amount;
      const allRecordsPaid = await tx.payrollRecord.count({
        where: { runId: record.runId, paymentStatus: { not: PayrollPaymentStatus.PAID } },
      });

      await tx.payrollRun.update({
        where: { id: record.runId },
        data: {
          totalPaid: updatedRunTotalPaid,
          status: allRecordsPaid === 0 ? PayrollRunStatus.PAID : PayrollRunStatus.PARTIALLY_PAID,
        },
      });

      return pay;
    });

    await prisma.auditLog.create({
      data: {
        instituteId,
        userId: req.user?.userId || null,
        action: 'SALARY_PAYMENT_RECORDED',
        entityType: 'SalaryPayment',
        entityId: payment.id,
        newValues: { recordId, amount, paymentMethod, transactionReference },
      },
    });

    return res.status(201).json({ success: true, data: { payment } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// ==========================================
// 8. PAYSLIPS & SELF-SERVICE
// ==========================================

export async function getPayslipDetails(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId!;
    const { recordId } = req.params;

    const payslip = await prisma.payslip.findFirst({
      where: { recordId, instituteId },
      include: {
        record: {
          include: {
            payments: { orderBy: { paymentDate: 'desc' } },
            adjustments: true,
          },
        },
      },
    });

    if (!payslip) {
      return res.status(404).json({ success: false, error: 'Payslip not yet generated or not found' });
    }

    return res.json({ success: true, data: { payslip } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function getMyPayslips(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const staffProfile = await prisma.staffProfile.findUnique({
      where: { userId },
    });

    if (!staffProfile) {
      return res.status(404).json({ success: false, error: 'Staff profile not found' });
    }

    const payslips = await prisma.payslip.findMany({
      where: { staffId: staffProfile.id },
      include: {
        record: {
          select: {
            grossPay: true,
            totalDeductions: true,
            netPayable: true,
            paidAmount: true,
            paymentStatus: true,
            payments: true,
          },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    return res.json({ success: true, data: { payslips } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// ==========================================
// 9. EXPORT & REPORTS
// ==========================================

export async function exportPayrollRegister(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId!;
    const { year, month, format = 'csv' } = req.query;

    const rYear = year ? parseInt(year as string, 10) : new Date().getFullYear();
    const rMonth = month ? parseInt(month as string, 10) : new Date().getMonth() + 1;

    const run = await prisma.payrollRun.findUnique({
      where: { instituteId_year_month: { instituteId, year: rYear, month: rMonth } },
      include: {
        records: {
          include: { payments: true },
          orderBy: { staffName: 'asc' },
        },
      },
    });

    if (!run) {
      return res.status(404).json({ success: false, error: 'Payroll run not found for selected period' });
    }

    if (format === 'csv') {
      const headers = [
        'Staff Code',
        'Staff Name',
        'Designation',
        'Department',
        'Worked Days',
        'On-site Days',
        'WFH Days',
        'Late Count',
        'Base CTC Rate',
        'Gross Salary',
        'Total Deductions',
        'Net Payable',
        'Paid Amount',
        'Payment Status',
      ];

      const rows = run.records.map((r) => [
        `"${r.employeeCode || 'N/A'}"`,
        `"${r.staffName}"`,
        `"${r.designation || 'Staff'}"`,
        `"${r.department || 'General'}"`,
        r.workedDays,
        r.onSiteDays,
        r.wfhDays,
        r.lateDays,
        r.baseMonthlyRate,
        r.grossPay,
        r.totalDeductions,
        r.netPayable,
        r.paidAmount,
        `"${r.paymentStatus}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="Payroll_Register_${rMonth}_${rYear}.csv"`);
      return res.send(csvContent);
    }

    return res.json({ success: true, data: { run } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

