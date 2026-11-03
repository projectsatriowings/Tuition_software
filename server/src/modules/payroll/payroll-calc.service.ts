import {
  PayrollCalculationBasis,
  LateDeductionPolicy,
  SalaryComponentType,
  SalaryComponentCalcType,
} from '@prisma/client';

export interface CalculationInput {
  staff: {
    id: string;
    employeeCode: string | null;
    designation: string | null;
    department: string | null;
    joiningDate: Date | null;
    user: {
      fullName: string;
      email: string;
      phone: string | null;
    };
  };
  salaryAssignment: {
    id: string;
    baseMonthlySalary: number;
    structure?: {
      id: string;
      name: string;
      components: Array<{
        id: string;
        name: string;
        type: SalaryComponentType;
        calculationType: SalaryComponentCalcType;
        amountOrPercent: number;
        isTaxable: boolean;
        isStatutory: boolean;
        displayOrder: number;
      }>;
    } | null;
    customComponentsJson?: any;
  };
  policy: {
    calculationBasis: PayrollCalculationBasis;
    unpaidLeaveDeduction: boolean;
    halfDayDeductionFactor: number;
    lateDeductionPolicy: LateDeductionPolicy;
    lateGraceOccurrences: number;
    lateDeductionAmount: number;
    wfhSalaryTreatment: string;
    prorationPolicy: string;
    currency: string;
  };
  attendanceSessions: Array<{
    id: string;
    attendanceDate: Date;
    status: string;
    checkInTime: Date | null;
    checkOutTime: Date | null;
    workDurationMinutes: number;
    isLate: boolean;
    attendanceMode: string;
  }>;
  month: number; // 1-12
  year: number;
}

export interface CalculationResult {
  calendarDays: number;
  basisDays: number;
  workedDays: number;
  onSiteDays: number;
  wfhDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  halfDays: number;
  lateDays: number;
  weeklyOffDays: number;
  publicHolidays: number;
  missingAttendanceDays: number;

  baseMonthlyRate: number;
  dailyRate: number;
  isProrated: boolean;
  proratedDays: number;

  earnings: Array<{
    name: string;
    amount: number;
    calculationType: string;
    rateOrPercent: number;
  }>;
  grossPay: number;

  deductions: Array<{
    name: string;
    amount: number;
    type: string;
    calculationType: string;
  }>;
  totalDeductions: number;

  netPayable: number;
  breakdown: Record<string, any>;
  warnings: string[];
}

export function calculateStaffMonthlyPayroll(input: CalculationInput): CalculationResult {
  const { staff, salaryAssignment, policy, attendanceSessions, month, year } = input;

  // 1. Calendar Days in Month
  const calendarDays = new Date(year, month, 0).getDate();

  // 2. Calculation Basis Days
  let basisDays = calendarDays;
  if (policy.calculationBasis === PayrollCalculationBasis.FIXED_30_DAYS) {
    basisDays = 30;
  } else if (policy.calculationBasis === PayrollCalculationBasis.WORKING_DAYS_EXCL_SUNDAYS) {
    let nonSundays = 0;
    for (let d = 1; d <= calendarDays; d++) {
      const dayOfWeek = new Date(year, month - 1, d).getDay();
      if (dayOfWeek !== 0) nonSundays++;
    }
    basisDays = nonSundays > 0 ? nonSundays : 26;
  }

  // 3. Sundays in Month
  let weeklyOffDays = 0;
  for (let d = 1; d <= calendarDays; d++) {
    if (new Date(year, month - 1, d).getDay() === 0) {
      weeklyOffDays++;
    }
  }

  // 4. Joining Date Proration Check
  let isProrated = false;
  let proratedDays = calendarDays;
  const warnings: string[] = [];

  if (staff.joiningDate) {
    const jDate = new Date(staff.joiningDate);
    const jYear = jDate.getFullYear();
    const jMonth = jDate.getMonth() + 1;
    const jDay = jDate.getDate();

    if (jYear === year && jMonth === month) {
      if (jDay > 1) {
        isProrated = true;
        proratedDays = calendarDays - jDay + 1;
        warnings.push(`Prorated salary: Employee joined on ${jDay}/${month}/${year} (${proratedDays} of ${calendarDays} eligible calendar days)`);
      }
    } else if (jDate > new Date(year, month - 1, calendarDays)) {
      // Joined after this month
      isProrated = true;
      proratedDays = 0;
      warnings.push(`Employee joined after this payroll period.`);
    }
  }

  // 5. Attendance Aggregation
  let onSiteDays = 0;
  let wfhDays = 0;
  let lateDays = 0;
  let halfDays = 0;
  let onLeaveDays = 0;
  let missingCheckouts = 0;

  for (const s of attendanceSessions) {
    const isPresent = ['CHECKED_IN', 'CHECKED_OUT', 'LATE', 'MANUALLY_CORRECTED'].includes(s.status);
    if (isPresent) {
      if (s.attendanceMode === 'WFH') {
        wfhDays++;
      } else {
        onSiteDays++;
      }
    }
    if (s.isLate) {
      lateDays++;
    }
    if (s.status === 'ON_LEAVE') {
      onLeaveDays++;
    }
    if (s.status === 'CHECKED_IN' && !s.checkOutTime) {
      missingCheckouts++;
    }
    // Half-day detection: work duration < 240 mins (4 hours) but > 60 mins
    if (s.workDurationMinutes > 60 && s.workDurationMinutes < 240) {
      halfDays++;
    }
  }

  if (missingCheckouts > 0) {
    warnings.push(`${missingCheckouts} unclosed session(s) where staff did not check out`);
  }

  // Worked days
  const effectiveWfhDays = policy.wfhSalaryTreatment === 'FULL_PAY' ? wfhDays : Math.round(wfhDays * 0.8 * 10) / 10;
  const workedDays = onSiteDays + effectiveWfhDays;

  // Unpaid days calculation
  // Expected working days in period = (eligible calendar days) - (Sundays in eligible period)
  const paidLeaveDays = Math.min(onLeaveDays, 2); // Default 2 days paid leave allowance per month
  const unpaidLeaveDays = Math.max(0, onLeaveDays - paidLeaveDays);

  const missingAttendanceDays = Math.max(
    0,
    proratedDays - (workedDays + weeklyOffDays + onLeaveDays)
  );

  const totalDeductibleDays = policy.unpaidLeaveDeduction
    ? unpaidLeaveDays + missingAttendanceDays + (halfDays * policy.halfDayDeductionFactor)
    : 0;

  // 6. Earnings Component Computation
  const baseMonthlyRate = salaryAssignment.baseMonthlySalary || 0;
  const prorationFactor = isProrated ? proratedDays / calendarDays : 1.0;
  const effectiveBaseSalary = Math.round(baseMonthlyRate * prorationFactor);

  const earnings: Array<{
    name: string;
    amount: number;
    calculationType: string;
    rateOrPercent: number;
  }> = [];

  const components = salaryAssignment.structure?.components || [];
  const earningComponents = components
    .filter((c) => c.type === SalaryComponentType.EARNING)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  // If no structures configured, treat baseMonthlySalary as basic earnings
  if (earningComponents.length === 0) {
    earnings.push({
      name: 'Basic Pay',
      amount: effectiveBaseSalary,
      calculationType: 'BASE',
      rateOrPercent: effectiveBaseSalary,
    });
  } else {
    // Basic pay is usually 40-50% or flat
    const basicComp = earningComponents.find((c) => c.name.toLowerCase().includes('basic'));
    let calculatedBasic = basicComp
      ? basicComp.calculationType === SalaryComponentCalcType.PERCENTAGE_OF_GROSS
        ? (effectiveBaseSalary * basicComp.amountOrPercent) / 100
        : basicComp.amountOrPercent * prorationFactor
      : effectiveBaseSalary * 0.5;

    for (const comp of earningComponents) {
      let compAmount = 0;
      if (comp.calculationType === SalaryComponentCalcType.FLAT) {
        compAmount = Math.round(comp.amountOrPercent * prorationFactor);
      } else if (comp.calculationType === SalaryComponentCalcType.PERCENTAGE_OF_BASIC) {
        compAmount = Math.round((calculatedBasic * comp.amountOrPercent) / 100);
      } else if (comp.calculationType === SalaryComponentCalcType.PERCENTAGE_OF_GROSS) {
        compAmount = Math.round((effectiveBaseSalary * comp.amountOrPercent) / 100);
      }

      earnings.push({
        name: comp.name,
        amount: compAmount,
        calculationType: comp.calculationType,
        rateOrPercent: comp.amountOrPercent,
      });
    }
  }

  const grossPay = Math.round(earnings.reduce((sum, e) => sum + e.amount, 0));

  // 7. Deductions Computation
  const dailyRate = basisDays > 0 ? Math.round((grossPay / basisDays) * 100) / 100 : 0;

  const deductions: Array<{
    name: string;
    amount: number;
    type: string;
    calculationType: string;
  }> = [];

  // Attendance-based absence deductions
  if (totalDeductibleDays > 0 && policy.unpaidLeaveDeduction) {
    const absenceDeduction = Math.round(totalDeductibleDays * dailyRate);
    if (absenceDeduction > 0) {
      deductions.push({
        name: `Absence & Leave (${totalDeductibleDays} days @ ₹${dailyRate.toFixed(2)}/day)`,
        amount: absenceDeduction,
        type: 'ATTENDANCE_ABSENCE',
        calculationType: 'DAILY_RATE',
      });
    }
  }

  // Late Arrival Penalties
  if (
    policy.lateDeductionPolicy === LateDeductionPolicy.AFTER_GRACE_PERIOD &&
    lateDays > policy.lateGraceOccurrences
  ) {
    const penaltyDays = lateDays - policy.lateGraceOccurrences;
    const penaltyRate = policy.lateDeductionAmount > 0 ? policy.lateDeductionAmount : dailyRate * 0.25;
    const lateDeduction = Math.round(penaltyDays * penaltyRate);
    if (lateDeduction > 0) {
      deductions.push({
        name: `Late Penalties (${penaltyDays} beyond ${policy.lateGraceOccurrences} grace days)`,
        amount: lateDeduction,
        type: 'LATE_PENALTY',
        calculationType: 'PENALTY_RATE',
      });
    }
  } else if (
    policy.lateDeductionPolicy === LateDeductionPolicy.FLAT_PER_OCCURRENCE &&
    lateDays > 0 &&
    policy.lateDeductionAmount > 0
  ) {
    const lateDeduction = Math.round(lateDays * policy.lateDeductionAmount);
    deductions.push({
      name: `Late Penalties (${lateDays} day(s) @ ₹${policy.lateDeductionAmount})`,
      amount: lateDeduction,
      type: 'LATE_PENALTY',
      calculationType: 'FLAT_OCCURRENCE',
    });
  }

  // Configured Structure Deductions (e.g. PF, Professional Tax)
  const deductionComponents = components
    .filter((c) => c.type === SalaryComponentType.DEDUCTION)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const basicPayAmount = earnings.find((e) => e.name.toLowerCase().includes('basic'))?.amount || grossPay * 0.5;

  for (const comp of deductionComponents) {
    let dAmount = 0;
    if (comp.calculationType === SalaryComponentCalcType.FLAT) {
      dAmount = Math.round(comp.amountOrPercent);
    } else if (comp.calculationType === SalaryComponentCalcType.PERCENTAGE_OF_BASIC) {
      dAmount = Math.round((basicPayAmount * comp.amountOrPercent) / 100);
    } else if (comp.calculationType === SalaryComponentCalcType.PERCENTAGE_OF_GROSS) {
      dAmount = Math.round((grossPay * comp.amountOrPercent) / 100);
    }

    if (dAmount > 0) {
      deductions.push({
        name: comp.name,
        amount: dAmount,
        type: comp.isStatutory ? 'STATUTORY' : 'STANDARD',
        calculationType: comp.calculationType,
      });
    }
  }

  const totalDeductions = Math.round(deductions.reduce((sum, d) => sum + d.amount, 0));

  // 8. Final Net Payable
  const netPayable = Math.max(0, grossPay - totalDeductions);

  // 9. Structured Transparency Breakdown
  const breakdown = {
    period: { month, year, calendarDays, basisDays, weeklyOffDays },
    proration: { isProrated, proratedDays, factor: prorationFactor },
    attendance: {
      onSiteDays,
      wfhDays,
      workedDays,
      lateDays,
      halfDays,
      onLeaveDays,
      paidLeaveDays,
      unpaidLeaveDays,
      missingAttendanceDays,
      totalDeductibleDays,
      missingCheckouts,
    },
    rates: {
      baseMonthlyRate,
      dailyRate,
      effectiveBaseSalary,
    },
    earnings,
    deductions,
    calculatedAt: new Date().toISOString(),
  };

  return {
    calendarDays,
    basisDays,
    workedDays,
    onSiteDays,
    wfhDays,
    paidLeaveDays,
    unpaidLeaveDays,
    halfDays,
    lateDays,
    weeklyOffDays,
    publicHolidays: 0,
    missingAttendanceDays,

    baseMonthlyRate,
    dailyRate,
    isProrated,
    proratedDays,

    earnings,
    grossPay,

    deductions,
    totalDeductions,

    netPayable,
    breakdown,
    warnings,
  };
}

