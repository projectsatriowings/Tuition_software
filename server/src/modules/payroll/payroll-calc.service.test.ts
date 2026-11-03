import { calculateStaffMonthlyPayroll, CalculationInput } from './payroll-calc.service.js';
import {
  PayrollCalculationBasis,
  LateDeductionPolicy,
  SalaryComponentType,
  SalaryComponentCalcType,
} from '@prisma/client';

export function runPayrollEngineTests() {
  console.log('--- Running Payroll Engine Unit Tests ---');
  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, extra?: any) {
    if (condition) {
      console.log(`  ✓ ${name}`);
      passed++;
    } else {
      console.error(`  ✗ ${name}`, extra || '');
      failed++;
    }
  }

  // Base policy
  const basePolicy = {
    calculationBasis: PayrollCalculationBasis.CALENDAR_DAYS,
    unpaidLeaveDeduction: true,
    halfDayDeductionFactor: 0.5,
    lateDeductionPolicy: LateDeductionPolicy.AFTER_GRACE_PERIOD,
    lateGraceOccurrences: 3,
    lateDeductionAmount: 200,
    wfhSalaryTreatment: 'FULL_PAY',
    prorationPolicy: 'CALENDAR_DAYS',
    currency: 'INR',
  };

  // Test 1: Full month attendance, flat base salary
  const input1: CalculationInput = {
    staff: {
      id: 'staff-1',
      employeeCode: 'EMP-001',
      designation: 'Senior Faculty',
      department: 'Math',
      joiningDate: new Date('2025-01-01'),
      user: { fullName: 'Dr. John', email: 'john@tuition.edu', phone: '9999999999' },
    },
    salaryAssignment: {
      id: 'assign-1',
      baseMonthlySalary: 30000,
      structure: null,
    },
    policy: basePolicy,
    attendanceSessions: Array.from({ length: 26 }, (_, i) => ({
      id: `s-${i}`,
      attendanceDate: new Date(2026, 10, i + 1), // Nov 2026 (30 days)
      status: 'CHECKED_IN',
      checkInTime: new Date(),
      checkOutTime: new Date(),
      workDurationMinutes: 480,
      isLate: false,
      attendanceMode: 'ON_SITE',
    })),
    month: 11, // November (30 days)
    year: 2026,
  };

  const res1 = calculateStaffMonthlyPayroll(input1);
  assert('Test 1: Full month, no structure -> gross equals baseMonthlySalary (₹30,000)', res1.grossPay === 30000);
  assert('Test 1: Full attendance -> 0 attendance deductions', res1.totalDeductions === 0);
  assert('Test 1: Net payable equals gross (₹30,000)', res1.netPayable === 30000);

  // Test 2: Mid-month joining proration (joined Nov 16 in a 30-day month -> 15 eligible days)
  const input2: CalculationInput = {
    ...input1,
    staff: {
      ...input1.staff,
      joiningDate: new Date(2026, 10, 16), // Nov 16
    },
    attendanceSessions: Array.from({ length: 13 }, (_, i) => ({
      id: `s2-${i}`,
      attendanceDate: new Date(2026, 10, 16 + i),
      status: 'CHECKED_IN',
      checkInTime: new Date(),
      checkOutTime: new Date(),
      workDurationMinutes: 480,
      isLate: false,
      attendanceMode: 'ON_SITE',
    })),
  };

  const res2 = calculateStaffMonthlyPayroll(input2);
  assert('Test 2: Prorated flag is true', res2.isProrated === true);
  assert('Test 2: Prorated days is 15 of 30', res2.proratedDays === 15);
  assert('Test 2: Prorated gross equals 50% of base (₹15,000)', res2.grossPay === 15000);

  // Test 3: WFH attendance treated as full pay under policy
  const input3: CalculationInput = {
    ...input1,
    attendanceSessions: [
      ...Array.from({ length: 15 }, (_, i) => ({
        id: `on-site-${i}`,
        attendanceDate: new Date(2026, 10, i + 1),
        status: 'CHECKED_IN',
        checkInTime: new Date(),
        checkOutTime: new Date(),
        workDurationMinutes: 480,
        isLate: false,
        attendanceMode: 'ON_SITE',
      })),
      ...Array.from({ length: 11 }, (_, i) => ({
        id: `wfh-${i}`,
        attendanceDate: new Date(2026, 10, 16 + i),
        status: 'CHECKED_IN',
        checkInTime: new Date(),
        checkOutTime: new Date(),
        workDurationMinutes: 480,
        isLate: false,
        attendanceMode: 'WFH',
      })),
    ],
  };

  const res3 = calculateStaffMonthlyPayroll(input3);
  assert('Test 3: WFH days correctly counted as 11', res3.wfhDays === 11);
  assert('Test 3: Total worked days = 15 + 11 = 26', res3.workedDays === 26);
  assert('Test 3: Zero deduction for valid WFH', res3.totalDeductions === 0);

  // Test 4: Late grace period penalty
  const input4: CalculationInput = {
    ...input1,
    attendanceSessions: Array.from({ length: 26 }, (_, i) => ({
      id: `late-${i}`,
      attendanceDate: new Date(2026, 10, i + 1),
      status: 'CHECKED_IN',
      checkInTime: new Date(),
      checkOutTime: new Date(),
      workDurationMinutes: 480,
      isLate: i < 5, // 5 late arrivals
      attendanceMode: 'ON_SITE',
    })),
  };

  const res4 = calculateStaffMonthlyPayroll(input4);
  assert('Test 4: Late count is 5', res4.lateDays === 5);
  // Grace is 3, penalty on 2 days @ 200 = 400
  const lateDeduction = res4.deductions.find((d) => d.type === 'LATE_PENALTY');
  assert('Test 4: Late deduction is applied for 2 days beyond grace (₹400)', lateDeduction?.amount === 400);

  // Test 5: Structure with Basic (50%), HRA (20%), Special Allowance (30%), PF deduction (12% of basic)
  const input5: CalculationInput = {
    ...input1,
    salaryAssignment: {
      id: 'assign-structured',
      baseMonthlySalary: 40000,
      structure: {
        id: 'struct-1',
        name: 'Standard Faculty CTC',
        components: [
          {
            id: 'c1',
            name: 'Basic Pay',
            type: SalaryComponentType.EARNING,
            calculationType: SalaryComponentCalcType.PERCENTAGE_OF_GROSS,
            amountOrPercent: 50,
            isTaxable: true,
            isStatutory: false,
            displayOrder: 1,
          },
          {
            id: 'c2',
            name: 'HRA',
            type: SalaryComponentType.EARNING,
            calculationType: SalaryComponentCalcType.PERCENTAGE_OF_BASIC,
            amountOrPercent: 40, // 40% of Basic = 8,000
            isTaxable: true,
            isStatutory: false,
            displayOrder: 2,
          },
          {
            id: 'c3',
            name: 'Special Allowance',
            type: SalaryComponentType.EARNING,
            calculationType: SalaryComponentCalcType.PERCENTAGE_OF_GROSS,
            amountOrPercent: 30, // 30% of Gross = 12,000
            isTaxable: true,
            isStatutory: false,
            displayOrder: 3,
          },
          {
            id: 'c4',
            name: 'Provident Fund (Employee)',
            type: SalaryComponentType.DEDUCTION,
            calculationType: SalaryComponentCalcType.PERCENTAGE_OF_BASIC,
            amountOrPercent: 12, // 12% of Basic = 2,400
            isTaxable: false,
            isStatutory: true,
            displayOrder: 4,
          },
        ],
      },
    },
  };

  const res5 = calculateStaffMonthlyPayroll(input5);
  const basic = res5.earnings.find((e) => e.name === 'Basic Pay')?.amount;
  const hra = res5.earnings.find((e) => e.name === 'HRA')?.amount;
  const sa = res5.earnings.find((e) => e.name === 'Special Allowance')?.amount;
  const pf = res5.deductions.find((d) => d.name.includes('Provident Fund'))?.amount;

  assert('Test 5: Basic Pay is 50% of ₹40,000 (₹20,000)', basic === 20000);
  assert('Test 5: HRA is 40% of Basic (₹8,000)', hra === 8000);
  assert('Test 5: Special Allowance is 30% of Gross (₹12,000)', sa === 12000);
  assert('Test 5: Total Gross is ₹40,000', res5.grossPay === 40000);
  assert('Test 5: PF deduction is 12% of Basic (₹2,400)', pf === 2400);
  assert('Test 5: Net Payable = 40,000 - 2,400 = ₹37,600', res5.netPayable === 37600);

  console.log(`--- Unit Tests Complete: ${passed} passed, ${failed} failed ---`);
  if (failed > 0) process.exit(1);
}

if (process.argv[1] && process.argv[1].includes('payroll-calc.service.test')) {
  runPayrollEngineTests();
}

