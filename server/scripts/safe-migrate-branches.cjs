const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== Step 1: Running Safe Multi-Branch DDL Migrations ===');

  // 1. Create Branch table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Branch" (
      "id" TEXT NOT NULL,
      "instituteId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "code" TEXT NOT NULL,
      "isDefault" BOOLEAN NOT NULL DEFAULT false,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "address" TEXT,
      "city" TEXT,
      "state" TEXT,
      "postalCode" TEXT,
      "phone" TEXT,
      "email" TEXT,
      "latitude" DOUBLE PRECISION,
      "longitude" DOUBLE PRECISION,
      "geofenceRadius" DOUBLE PRECISION NOT NULL DEFAULT 200,
      "locationVerified" BOOLEAN NOT NULL DEFAULT false,
      "workingDays" TEXT NOT NULL DEFAULT 'MON,TUE,WED,THU,FRI,SAT',
      "workStartTime" TEXT NOT NULL DEFAULT '09:00',
      "workEndTime" TEXT NOT NULL DEFAULT '18:00',
      "lateGraceMinutes" INTEGER NOT NULL DEFAULT 15,
      "gpsAccuracyThreshold" DOUBLE PRECISION NOT NULL DEFAULT 50,
      "requireCheckoutGeofence" BOOLEAN NOT NULL DEFAULT true,
      "allowStaffWfhRequests" BOOLEAN NOT NULL DEFAULT true,
      "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
    );
  `);
  console.log('-> Branch table ensured');

  // Indexes and unique constraints on Branch
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Branch_instituteId_code_key" ON "Branch"("instituteId", "code");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Branch_instituteId_idx" ON "Branch"("instituteId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Branch_instituteId_isActive_idx" ON "Branch"("instituteId", "isActive");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Branch_isDefault_idx" ON "Branch"("isDefault");`);
  console.log('-> Branch indexes ensured');

  // 2. Create BranchStaffAssignment table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "BranchStaffAssignment" (
      "id" TEXT NOT NULL,
      "instituteId" TEXT NOT NULL,
      "branchId" TEXT NOT NULL,
      "staffProfileId" TEXT NOT NULL,
      "assignmentType" TEXT NOT NULL DEFAULT 'PRIMARY',
      "role" TEXT,
      "isPrimary" BOOLEAN NOT NULL DEFAULT false,
      "effectiveFrom" DATE NOT NULL DEFAULT CURRENT_DATE,
      "effectiveTo" DATE,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "BranchStaffAssignment_pkey" PRIMARY KEY ("id")
    );
  `);
  console.log('-> BranchStaffAssignment table ensured');

  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "BranchStaffAssignment_branchId_staffProfileId_assignmentType_key" ON "BranchStaffAssignment"("branchId", "staffProfileId", "assignmentType");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "BranchStaffAssignment_staffProfileId_isActive_idx" ON "BranchStaffAssignment"("staffProfileId", "isActive");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "BranchStaffAssignment_branchId_isActive_idx" ON "BranchStaffAssignment"("branchId", "isActive");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "BranchStaffAssignment_instituteId_idx" ON "BranchStaffAssignment"("instituteId");`);

  // 3. Create BranchStudentEnrollment table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "BranchStudentEnrollment" (
      "id" TEXT NOT NULL,
      "instituteId" TEXT NOT NULL,
      "branchId" TEXT NOT NULL,
      "studentId" TEXT NOT NULL,
      "isPrimary" BOOLEAN NOT NULL DEFAULT true,
      "status" TEXT NOT NULL DEFAULT 'ACTIVE',
      "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "leftAt" TIMESTAMP(3),
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "BranchStudentEnrollment_pkey" PRIMARY KEY ("id")
    );
  `);
  console.log('-> BranchStudentEnrollment table ensured');

  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "BranchStudentEnrollment_branchId_studentId_key" ON "BranchStudentEnrollment"("branchId", "studentId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "BranchStudentEnrollment_studentId_status_idx" ON "BranchStudentEnrollment"("studentId", "status");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "BranchStudentEnrollment_branchId_status_idx" ON "BranchStudentEnrollment"("branchId", "status");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "BranchStudentEnrollment_instituteId_idx" ON "BranchStudentEnrollment"("instituteId");`);

  // 4. Create StudentBranchTransfer table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "StudentBranchTransfer" (
      "id" TEXT NOT NULL,
      "instituteId" TEXT NOT NULL,
      "studentId" TEXT NOT NULL,
      "fromBranchId" TEXT NOT NULL,
      "toBranchId" TEXT NOT NULL,
      "transferDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "effectiveDate" DATE NOT NULL DEFAULT CURRENT_DATE,
      "reason" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'COMPLETED',
      "transferFeesPolicy" TEXT NOT NULL DEFAULT 'RETAIN_HISTORICAL',
      "authorizedById" TEXT NOT NULL,
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "StudentBranchTransfer_pkey" PRIMARY KEY ("id")
    );
  `);
  console.log('-> StudentBranchTransfer table ensured');

  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StudentBranchTransfer_instituteId_idx" ON "StudentBranchTransfer"("instituteId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StudentBranchTransfer_studentId_idx" ON "StudentBranchTransfer"("studentId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StudentBranchTransfer_fromBranchId_idx" ON "StudentBranchTransfer"("fromBranchId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StudentBranchTransfer_toBranchId_idx" ON "StudentBranchTransfer"("toBranchId");`);

  // 5. Add branchId columns safely to existing tables
  const columnAdditions = [
    { table: 'Batch', column: 'branchId', type: 'TEXT' },
    { table: 'Student', column: 'primaryBranchId', type: 'TEXT' },
    { table: 'StaffAttendanceSession', column: 'branchId', type: 'TEXT' },
    { table: 'StaffAttendanceSession', column: 'sessionNumber', type: 'INTEGER NOT NULL DEFAULT 1' },
    { table: 'StaffAttendanceEvent', column: 'branchId', type: 'TEXT' },
    { table: 'AttendanceEvent', column: 'branchId', type: 'TEXT' },
    { table: 'FeeStructure', column: 'branchId', type: 'TEXT' },
    { table: 'StudentFeeAssignment', column: 'branchId', type: 'TEXT' },
    { table: 'Payment', column: 'branchId', type: 'TEXT' },
    { table: 'PayrollRecord', column: 'branchAllocationJson', type: 'JSONB' },
  ];

  for (const item of columnAdditions) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "${item.table}" ADD COLUMN IF NOT EXISTS "${item.column}" ${item.type};`);
      console.log(`-> Added column "${item.column}" to "${item.table}"`);
    } catch (e) {
      console.log(`Note on ${item.table}.${item.column}:`, e.message);
    }
  }

  // 6. Safe update of StaffAttendanceSession unique constraint:
  // Drop old 3-column unique constraint and add 4-column constraint including sessionNumber
  try {
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'StaffAttendanceSession_instituteId_staffId_attendanceDate_key'
        ) THEN
          ALTER TABLE "StaffAttendanceSession" DROP CONSTRAINT "StaffAttendanceSession_instituteId_staffId_attendanceDate_key";
        END IF;
      END $$;
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "StaffAttendanceSession_instituteId_staffId_attendanceDate_sessionNumber_key"
      ON "StaffAttendanceSession"("instituteId", "staffId", "attendanceDate", "sessionNumber");
    `);
    console.log('-> Migrated StaffAttendanceSession unique constraint to include sessionNumber safely');
  } catch (e) {
    console.log('StaffAttendanceSession unique constraint migration note:', e.message);
  }

  // Indexes on new branchId columns
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Batch_branchId_idx" ON "Batch"("branchId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Student_primaryBranchId_idx" ON "Student"("primaryBranchId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StaffAttendanceSession_branchId_idx" ON "StaffAttendanceSession"("branchId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StaffAttendanceEvent_branchId_idx" ON "StaffAttendanceEvent"("branchId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "AttendanceEvent_branchId_idx" ON "AttendanceEvent"("branchId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "FeeStructure_branchId_idx" ON "FeeStructure"("branchId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StudentFeeAssignment_branchId_idx" ON "StudentFeeAssignment"("branchId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Payment_branchId_idx" ON "Payment"("branchId");`);
  console.log('-> Indexes on branchId columns ensured');

  // Add Foreign Key constraints if not present
  const foreignKeys = [
    { name: 'fk_branch_institute', table: 'Branch', col: 'instituteId', refTable: 'Institute', refCol: 'id', onDelete: 'CASCADE' },
    { name: 'fk_branch_staff_assign_branch', table: 'BranchStaffAssignment', col: 'branchId', refTable: 'Branch', refCol: 'id', onDelete: 'CASCADE' },
    { name: 'fk_branch_staff_assign_staff', table: 'BranchStaffAssignment', col: 'staffProfileId', refTable: 'StaffProfile', refCol: 'id', onDelete: 'CASCADE' },
    { name: 'fk_branch_student_enroll_branch', table: 'BranchStudentEnrollment', col: 'branchId', refTable: 'Branch', refCol: 'id', onDelete: 'CASCADE' },
    { name: 'fk_branch_student_enroll_student', table: 'BranchStudentEnrollment', col: 'studentId', refTable: 'Student', refCol: 'id', onDelete: 'CASCADE' },
    { name: 'fk_branch_transfer_student', table: 'StudentBranchTransfer', col: 'studentId', refTable: 'Student', refCol: 'id', onDelete: 'CASCADE' },
    { name: 'fk_branch_transfer_from', table: 'StudentBranchTransfer', col: 'fromBranchId', refTable: 'Branch', refCol: 'id', onDelete: 'CASCADE' },
    { name: 'fk_branch_transfer_to', table: 'StudentBranchTransfer', col: 'toBranchId', refTable: 'Branch', refCol: 'id', onDelete: 'CASCADE' },
    { name: 'fk_branch_transfer_auth', table: 'StudentBranchTransfer', col: 'authorizedById', refTable: 'User', refCol: 'id', onDelete: 'RESTRICT' },
    { name: 'fk_batch_branch', table: 'Batch', col: 'branchId', refTable: 'Branch', refCol: 'id', onDelete: 'SET NULL' },
    { name: 'fk_student_primary_branch', table: 'Student', col: 'primaryBranchId', refTable: 'Branch', refCol: 'id', onDelete: 'SET NULL' },
    { name: 'fk_staff_att_sess_branch', table: 'StaffAttendanceSession', col: 'branchId', refTable: 'Branch', refCol: 'id', onDelete: 'SET NULL' },
    { name: 'fk_att_event_branch', table: 'AttendanceEvent', col: 'branchId', refTable: 'Branch', refCol: 'id', onDelete: 'SET NULL' },
    { name: 'fk_fee_struct_branch', table: 'FeeStructure', col: 'branchId', refTable: 'Branch', refCol: 'id', onDelete: 'SET NULL' },
    { name: 'fk_payment_branch', table: 'Payment', col: 'branchId', refTable: 'Branch', refCol: 'id', onDelete: 'SET NULL' },
  ];

  for (const fk of foreignKeys) {
    try {
      await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = '${fk.name}'
          ) THEN
            ALTER TABLE "${fk.table}"
            ADD CONSTRAINT "${fk.name}"
            FOREIGN KEY ("${fk.col}")
            REFERENCES "${fk.refTable}"("${fk.refCol}")
            ON DELETE ${fk.onDelete};
          END IF;
        END $$;
      `);
      console.log(`-> Verified foreign key ${fk.name}`);
    } catch (e) {
      console.log(`Foreign key note for ${fk.name}:`, e.message);
    }
  }

  console.log('\n=== Step 2: Migrating Existing Single-Branch Institutes to Default Branch ===');

  const institutes = await prisma.institute.findMany();
  console.log(`Found ${institutes.length} institutes in the database`);

  let totalBranchesCreated = 0;
  let totalBatchesLinked = 0;
  let totalStaffLinked = 0;
  let totalStudentsLinked = 0;
  let totalAttendanceLinked = 0;
  let totalFeesLinked = 0;

  for (const inst of institutes) {
    // Check if institute already has a default branch
    let defaultBranch = await prisma.branch.findFirst({
      where: { instituteId: inst.id, isDefault: true }
    });

    if (!defaultBranch) {
      // Find any branch
      defaultBranch = await prisma.branch.findFirst({
        where: { instituteId: inst.id }
      });
    }

    if (!defaultBranch) {
      // Create primary default branch inheriting institute settings
      defaultBranch = await prisma.branch.create({
        data: {
          instituteId: inst.id,
          name: `${inst.name} - Main Campus`,
          code: 'MAIN',
          isDefault: true,
          isActive: true,
          address: inst.address || null,
          city: inst.city || null,
          state: inst.state || null,
          postalCode: inst.postalCode || null,
          phone: inst.phone || null,
          email: inst.email || null,
          latitude: inst.latitude || null,
          longitude: inst.longitude || null,
          geofenceRadius: inst.geofenceRadius || 200,
          locationVerified: inst.locationVerified || false,
          workingDays: inst.workingDays || 'MON,TUE,WED,THU,FRI,SAT',
          workStartTime: inst.workStartTime || '09:00',
          workEndTime: inst.workEndTime || '18:00',
          lateGraceMinutes: inst.lateGraceMinutes || 15,
          gpsAccuracyThreshold: inst.gpsAccuracyThreshold || 50,
          requireCheckoutGeofence: inst.requireCheckoutGeofence !== undefined ? inst.requireCheckoutGeofence : true,
          allowStaffWfhRequests: inst.allowStaffWfhRequests !== undefined ? inst.allowStaffWfhRequests : true,
          timezone: inst.timezone || 'Asia/Kolkata',
        }
      });
      totalBranchesCreated++;
      console.log(`-> Created default branch for institute "${inst.name}" (${inst.code}) [Branch ID: ${defaultBranch.id}]`);
    }

    const branchId = defaultBranch.id;

    // 1. Link batches where branchId is null
    const batchUpdate = await prisma.batch.updateMany({
      where: { instituteId: inst.id, branchId: null },
      data: { branchId }
    });
    totalBatchesLinked += batchUpdate.count;

    // 2. Link staff profiles to BranchStaffAssignment where missing
    const staffProfiles = await prisma.staffProfile.findMany({
      where: { instituteId: inst.id },
      select: { id: true, userId: true }
    });

    for (const staff of staffProfiles) {
      const existingAssign = await prisma.branchStaffAssignment.findFirst({
        where: { branchId, staffProfileId: staff.id }
      });
      if (!existingAssign) {
        await prisma.branchStaffAssignment.create({
          data: {
            instituteId: inst.id,
            branchId,
            staffProfileId: staff.id,
            assignmentType: 'PRIMARY',
            isPrimary: true,
            role: 'TEACHER',
            isActive: true,
          }
        });
        totalStaffLinked++;
      }
    }

    // 3. Link students to primaryBranchId and BranchStudentEnrollment
    const studentUpdate = await prisma.student.updateMany({
      where: { instituteId: inst.id, primaryBranchId: null },
      data: { primaryBranchId: branchId }
    });
    totalStudentsLinked += studentUpdate.count;

    const students = await prisma.student.findMany({
      where: { instituteId: inst.id },
      select: { id: true }
    });

    for (const s of students) {
      const existingEnroll = await prisma.branchStudentEnrollment.findFirst({
        where: { branchId, studentId: s.id }
      });
      if (!existingEnroll) {
        await prisma.branchStudentEnrollment.create({
          data: {
            instituteId: inst.id,
            branchId,
            studentId: s.id,
            isPrimary: true,
            status: 'ACTIVE'
          }
        });
      }
    }

    // 4. Link staff attendance sessions and events where branchId is null
    const attSessionUpdate = await prisma.staffAttendanceSession.updateMany({
      where: { instituteId: inst.id, branchId: null },
      data: { branchId }
    });
    await prisma.staffAttendanceEvent.updateMany({
      where: { instituteId: inst.id, branchId: null },
      data: { branchId }
    });

    // 5. Link student attendance events
    const studentAttUpdate = await prisma.attendanceEvent.updateMany({
      where: { instituteId: inst.id, branchId: null },
      data: { branchId }
    });
    totalAttendanceLinked += attSessionUpdate.count + studentAttUpdate.count;

    // 6. Link fee structures, fee assignments, payments
    const feeUpdate = await prisma.feeStructure.updateMany({
      where: { instituteId: inst.id, branchId: null },
      data: { branchId }
    });
    await prisma.studentFeeAssignment.updateMany({
      where: { student: { instituteId: inst.id }, branchId: null },
      data: { branchId }
    });
    await prisma.payment.updateMany({
      where: { instituteId: inst.id, branchId: null },
      data: { branchId }
    });
    totalFeesLinked += feeUpdate.count;
  }

  console.log(`\n=== Safe Multi-Branch Migration Complete! ===`);
  console.log({
    totalBranchesCreated,
    totalBatchesLinked,
    totalStaffLinked,
    totalStudentsLinked,
    totalAttendanceLinked,
    totalFeesLinked
  });
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

