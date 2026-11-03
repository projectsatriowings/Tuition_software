const { Client } = require('pg');
require('dotenv').config({ path: __dirname + '/../.env' });

async function migrate() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  console.log('[Migrate] Connecting to database...');
  const client = new Client({ connectionString });
  await client.connect();

  const ddl = `
    DO $$ BEGIN
      CREATE TYPE "PayrollCalculationBasis" AS ENUM ('CALENDAR_DAYS', 'FIXED_30_DAYS', 'WORKING_DAYS_EXCL_SUNDAYS');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "LateDeductionPolicy" AS ENUM ('NONE', 'AFTER_GRACE_PERIOD', 'FLAT_PER_OCCURRENCE');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "SalaryComponentType" AS ENUM ('EARNING', 'DEDUCTION');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "SalaryComponentCalcType" AS ENUM ('FLAT', 'PERCENTAGE_OF_BASIC', 'PERCENTAGE_OF_GROSS');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "PayrollRunStatus" AS ENUM ('DRAFT', 'CALCULATED', 'UNDER_REVIEW', 'APPROVED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "PayrollPaymentStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "PayrollAdjustmentType" AS ENUM ('EARNING', 'DEDUCTION');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    CREATE TABLE IF NOT EXISTS "PayrollPolicy" (
      "id" TEXT PRIMARY KEY,
      "instituteId" TEXT UNIQUE NOT NULL REFERENCES "Institute"("id") ON DELETE CASCADE,
      "calculationBasis" "PayrollCalculationBasis" NOT NULL DEFAULT 'CALENDAR_DAYS',
      "unpaidLeaveDeduction" BOOLEAN NOT NULL DEFAULT true,
      "halfDayDeductionFactor" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
      "lateDeductionPolicy" "LateDeductionPolicy" NOT NULL DEFAULT 'NONE',
      "lateGraceOccurrences" INTEGER NOT NULL DEFAULT 3,
      "lateDeductionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "wfhSalaryTreatment" TEXT NOT NULL DEFAULT 'FULL_PAY',
      "prorationPolicy" TEXT NOT NULL DEFAULT 'CALENDAR_DAYS',
      "currency" TEXT NOT NULL DEFAULT 'INR',
      "salaryPaymentMethods" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "SalaryStructure" (
      "id" TEXT PRIMARY KEY,
      "instituteId" TEXT NOT NULL REFERENCES "Institute"("id") ON DELETE CASCADE,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "isDefault" BOOLEAN NOT NULL DEFAULT false,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SalaryStructure_instituteId_name_key" UNIQUE ("instituteId", "name")
    );

    CREATE TABLE IF NOT EXISTS "SalaryComponent" (
      "id" TEXT PRIMARY KEY,
      "structureId" TEXT NOT NULL REFERENCES "SalaryStructure"("id") ON DELETE CASCADE,
      "name" TEXT NOT NULL,
      "type" "SalaryComponentType" NOT NULL,
      "calculationType" "SalaryComponentCalcType" NOT NULL,
      "amountOrPercent" DOUBLE PRECISION NOT NULL,
      "isTaxable" BOOLEAN NOT NULL DEFAULT true,
      "isStatutory" BOOLEAN NOT NULL DEFAULT false,
      "displayOrder" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "StaffSalaryAssignment" (
      "id" TEXT PRIMARY KEY,
      "instituteId" TEXT NOT NULL REFERENCES "Institute"("id") ON DELETE CASCADE,
      "staffId" TEXT NOT NULL REFERENCES "StaffProfile"("id") ON DELETE CASCADE,
      "structureId" TEXT REFERENCES "SalaryStructure"("id") ON DELETE SET NULL,
      "baseMonthlySalary" DOUBLE PRECISION NOT NULL,
      "effectiveFrom" DATE NOT NULL,
      "effectiveTo" DATE,
      "status" TEXT NOT NULL DEFAULT 'ACTIVE',
      "customComponentsJson" JSONB,
      "notes" TEXT,
      "createdById" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "PayrollRun" (
      "id" TEXT PRIMARY KEY,
      "instituteId" TEXT NOT NULL REFERENCES "Institute"("id") ON DELETE CASCADE,
      "year" INTEGER NOT NULL,
      "month" INTEGER NOT NULL,
      "title" TEXT NOT NULL,
      "status" "PayrollRunStatus" NOT NULL DEFAULT 'DRAFT',
      "totalStaffCount" INTEGER NOT NULL DEFAULT 0,
      "totalGross" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "totalDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "totalNetPayable" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "totalPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "calculatedAt" TIMESTAMP(3),
      "approvedAt" TIMESTAMP(3),
      "approvedById" TEXT,
      "processedById" TEXT,
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PayrollRun_instituteId_year_month_key" UNIQUE ("instituteId", "year", "month")
    );

    CREATE TABLE IF NOT EXISTS "PayrollRecord" (
      "id" TEXT PRIMARY KEY,
      "runId" TEXT NOT NULL REFERENCES "PayrollRun"("id") ON DELETE CASCADE,
      "instituteId" TEXT NOT NULL,
      "staffId" TEXT NOT NULL REFERENCES "StaffProfile"("id") ON DELETE CASCADE,
      "staffSalaryAssignmentId" TEXT,
      "employeeCode" TEXT,
      "staffName" TEXT NOT NULL,
      "designation" TEXT,
      "department" TEXT,
      "bankAccountNumber" TEXT,
      "bankIfsc" TEXT,
      "panNumber" TEXT,
      "calendarDays" INTEGER NOT NULL DEFAULT 30,
      "workedDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "onSiteDays" INTEGER NOT NULL DEFAULT 0,
      "wfhDays" INTEGER NOT NULL DEFAULT 0,
      "paidLeaveDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "unpaidLeaveDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "halfDays" INTEGER NOT NULL DEFAULT 0,
      "lateDays" INTEGER NOT NULL DEFAULT 0,
      "weeklyOffDays" INTEGER NOT NULL DEFAULT 0,
      "publicHolidays" INTEGER NOT NULL DEFAULT 0,
      "missingAttendanceDays" INTEGER NOT NULL DEFAULT 0,
      "baseMonthlyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "grossPay" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "totalDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "netPayable" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "pendingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "paymentStatus" "PayrollPaymentStatus" NOT NULL DEFAULT 'UNPAID',
      "calculationBreakdownJson" JSONB NOT NULL,
      "warnings" JSONB,
      "status" TEXT NOT NULL DEFAULT 'ACTIVE',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PayrollRecord_runId_staffId_key" UNIQUE ("runId", "staffId")
    );

    CREATE TABLE IF NOT EXISTS "PayrollAdjustment" (
      "id" TEXT PRIMARY KEY,
      "recordId" TEXT NOT NULL REFERENCES "PayrollRecord"("id") ON DELETE CASCADE,
      "type" "PayrollAdjustmentType" NOT NULL,
      "title" TEXT NOT NULL,
      "amount" DOUBLE PRECISION NOT NULL,
      "reason" TEXT NOT NULL,
      "createdById" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "SalaryPayment" (
      "id" TEXT PRIMARY KEY,
      "recordId" TEXT NOT NULL REFERENCES "PayrollRecord"("id") ON DELETE CASCADE,
      "instituteId" TEXT NOT NULL,
      "amount" DOUBLE PRECISION NOT NULL,
      "paymentMethod" TEXT NOT NULL,
      "transactionReference" TEXT,
      "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "notes" TEXT,
      "recordedById" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "Payslip" (
      "id" TEXT PRIMARY KEY,
      "recordId" TEXT UNIQUE NOT NULL REFERENCES "PayrollRecord"("id") ON DELETE CASCADE,
      "instituteId" TEXT NOT NULL,
      "staffId" TEXT NOT NULL,
      "payslipNumber" TEXT UNIQUE NOT NULL,
      "month" INTEGER NOT NULL,
      "year" INTEGER NOT NULL,
      "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "snapshotJson" JSONB NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS "PayrollPolicy_instituteId_idx" ON "PayrollPolicy"("instituteId");
    CREATE INDEX IF NOT EXISTS "SalaryStructure_instituteId_idx" ON "SalaryStructure"("instituteId");
    CREATE INDEX IF NOT EXISTS "SalaryComponent_structureId_idx" ON "SalaryComponent"("structureId");
    CREATE INDEX IF NOT EXISTS "StaffSalaryAssignment_instituteId_staffId_idx" ON "StaffSalaryAssignment"("instituteId", "staffId");
    CREATE INDEX IF NOT EXISTS "StaffSalaryAssignment_staffId_status_idx" ON "StaffSalaryAssignment"("staffId", "status");
    CREATE INDEX IF NOT EXISTS "PayrollRun_instituteId_idx" ON "PayrollRun"("instituteId");
    CREATE INDEX IF NOT EXISTS "PayrollRun_status_idx" ON "PayrollRun"("status");
    CREATE INDEX IF NOT EXISTS "PayrollRecord_instituteId_staffId_idx" ON "PayrollRecord"("instituteId", "staffId");
    CREATE INDEX IF NOT EXISTS "PayrollRecord_paymentStatus_idx" ON "PayrollRecord"("paymentStatus");
    CREATE INDEX IF NOT EXISTS "PayrollAdjustment_recordId_idx" ON "PayrollAdjustment"("recordId");
    CREATE INDEX IF NOT EXISTS "SalaryPayment_recordId_idx" ON "SalaryPayment"("recordId");
    CREATE INDEX IF NOT EXISTS "SalaryPayment_instituteId_paymentDate_idx" ON "SalaryPayment"("instituteId", "paymentDate");
    CREATE INDEX IF NOT EXISTS "Payslip_instituteId_staffId_idx" ON "Payslip"("instituteId", "staffId");
    CREATE INDEX IF NOT EXISTS "Payslip_instituteId_year_month_idx" ON "Payslip"("instituteId", "year", "month");
  `;

  console.log('[Migrate] Applying DDL safely without dropping tables...');
  await client.query(ddl);
  console.log('[Migrate] Successfully applied all payroll tables and indexes!');
  await client.end();
}

migrate().catch((err) => {
  console.error('[Migrate Error]', err);
  process.exit(1);
});

