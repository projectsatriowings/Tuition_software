import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runMigration() {
  console.log('--- Starting Safe Additive WFH Database Migration ---');

  // 1. Create Enums
  console.log('1. Creating enums if not exist...');
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "StaffAttendanceMode" AS ENUM ('ON_SITE', 'WFH');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "WFHAuthorizationScope" AS ENUM ('INSTITUTE_WIDE', 'INDIVIDUAL', 'GROUP');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "WFHAuthorizationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED', 'EXPIRED');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "WFHReasonCategory" AS ENUM ('WEATHER_DISRUPTION', 'ONLINE_CLASSES', 'INSTITUTE_CLOSURE', 'INDIVIDUAL_REQUEST', 'MANAGEMENT_APPROVAL', 'OTHER');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // 2. Add columns to Institute & BatchSubject
  console.log('2. Updating Institute and BatchSubject tables...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Institute" ADD COLUMN IF NOT EXISTS "allowStaffWfhRequests" BOOLEAN NOT NULL DEFAULT true;
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "BatchSubject" ADD COLUMN IF NOT EXISTS "meetingLink" VARCHAR(500);
  `);

  // 3. Create StaffWFHAuthorization
  console.log('3. Creating StaffWFHAuthorization table...');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "StaffWFHAuthorization" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "instituteId" TEXT NOT NULL REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "staffId" TEXT REFERENCES "StaffProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "scope" "WFHAuthorizationScope" NOT NULL DEFAULT 'INDIVIDUAL',
      "startDate" DATE NOT NULL,
      "endDate" DATE NOT NULL,
      "reasonCategory" "WFHReasonCategory" NOT NULL DEFAULT 'INDIVIDUAL_REQUEST',
      "reason" TEXT NOT NULL,
      "notes" TEXT,
      "status" "WFHAuthorizationStatus" NOT NULL DEFAULT 'PENDING',
      "requestedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
      "approvedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
      "approvedAt" TIMESTAMP(3),
      "rejectionReason" TEXT,
      "rejectedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
      "rejectedAt" TIMESTAMP(3),
      "revocationReason" TEXT,
      "revokedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
      "revokedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "StaffWFHAuthorization_instituteId_startDate_endDate_idx" 
      ON "StaffWFHAuthorization"("instituteId", "startDate", "endDate");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "StaffWFHAuthorization_instituteId_staffId_status_idx" 
      ON "StaffWFHAuthorization"("instituteId", "staffId", "status");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "StaffWFHAuthorization_instituteId_scope_status_idx" 
      ON "StaffWFHAuthorization"("instituteId", "scope", "status");
  `);

  // 4. Create WFHAuthorizationStaff (for GROUP scope)
  console.log('4. Creating WFHAuthorizationStaff table...');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "WFHAuthorizationStaff" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "authorizationId" TEXT NOT NULL REFERENCES "StaffWFHAuthorization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "staffId" TEXT NOT NULL REFERENCES "StaffProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "WFHAuthorizationStaff_authorizationId_staffId_key" UNIQUE ("authorizationId", "staffId")
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "WFHAuthorizationStaff_staffId_idx" ON "WFHAuthorizationStaff"("staffId");
  `);

  // 5. Update StaffAttendanceSession
  console.log('5. Updating StaffAttendanceSession table...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "StaffAttendanceSession" 
      ADD COLUMN IF NOT EXISTS "attendanceMode" "StaffAttendanceMode" NOT NULL DEFAULT 'ON_SITE';
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "StaffAttendanceSession" 
      ADD COLUMN IF NOT EXISTS "wfhAuthorizationId" TEXT REFERENCES "StaffWFHAuthorization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "StaffAttendanceSession_attendanceMode_idx" 
      ON "StaffAttendanceSession"("attendanceMode");
  `);

  // 6. Update StaffAttendanceEvent
  console.log('6. Updating StaffAttendanceEvent table...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "StaffAttendanceEvent" 
      ADD COLUMN IF NOT EXISTS "attendanceMode" "StaffAttendanceMode" DEFAULT 'ON_SITE';
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "StaffAttendanceEvent" 
      ADD COLUMN IF NOT EXISTS "wfhAuthorizationId" TEXT REFERENCES "StaffWFHAuthorization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  `);

  console.log('--- Migration completed successfully! ---');
}

runMigration()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

