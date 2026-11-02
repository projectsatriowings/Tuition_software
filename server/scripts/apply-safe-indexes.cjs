require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('Applying safe performance indexes directly to PostgreSQL...');

  const indexQueries = [
    // 1. StaffProfile
    `CREATE INDEX IF NOT EXISTS "StaffProfile_instituteId_department_idx" ON "public"."StaffProfile"("instituteId", "department");`,
    `CREATE INDEX IF NOT EXISTS "StaffProfile_instituteId_designation_idx" ON "public"."StaffProfile"("instituteId", "designation");`,

    // 2. Student
    `CREATE INDEX IF NOT EXISTS "Student_instituteId_status_idx" ON "public"."Student"("instituteId", "status");`,

    // 3. StaffAttendanceSession
    `CREATE INDEX IF NOT EXISTS "StaffAttendanceSession_inst_status_date_idx" ON "public"."StaffAttendanceSession"("instituteId", "status", "attendanceDate");`,

    // 4. StaffOnlineClassLog
    `CREATE INDEX IF NOT EXISTS "StaffOnlineClassLog_inst_date_idx" ON "public"."StaffOnlineClassLog"("instituteId", "deliveryDate");`,
    `CREATE INDEX IF NOT EXISTS "StaffOnlineClassLog_staff_date_idx" ON "public"."StaffOnlineClassLog"("staffId", "deliveryDate");`,
  ];

  for (const sql of indexQueries) {
    try {
      const t0 = performance.now();
      await prisma.$executeRawUnsafe(sql);
      console.log(`Executed: ${sql.split('ON')[0].trim()} [${(performance.now() - t0).toFixed(0)} ms]`);
    } catch (err) {
      console.error(`Error on SQL "${sql}":`, err.message);
    }
  }

  console.log('All safe performance indexes successfully created!');
  await prisma.$disconnect();
}

run().catch(console.error);

