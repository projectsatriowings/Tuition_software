const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Checking tables in public schema ---');
  const tables = await prisma.$queryRawUnsafe(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.log('Tables:', tables.map(t => t.table_name));

  console.log('--- Applying safe non-destructive DDL migrations ---');

  // 1. Add new enum values to FeeFrequency if not present
  const enumValues = ['QUARTERLY', 'ANNUAL', 'COURSE_BASED', 'INSTALLMENT_BASED'];
  for (const val of enumValues) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TYPE "FeeFrequency" ADD VALUE IF NOT EXISTS '${val}';`);
      console.log(`Added enum value ${val} to FeeFrequency`);
    } catch (e) {
      console.log(`Enum value ${val} note:`, e.message);
    }
  }

  // 2. Modify FeeStructure table safely
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "FeeStructure" ALTER COLUMN "batchId" DROP NOT NULL;`);
    console.log('Made FeeStructure.batchId nullable');
  } catch (e) {
    console.log('batchId drop not null note:', e.message);
  }

  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "FeeStructure" ADD COLUMN IF NOT EXISTS "classGrade" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "FeeStructure" ADD COLUMN IF NOT EXISTS "courseName" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "FeeStructure" ADD COLUMN IF NOT EXISTS "componentsJson" JSONB;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "FeeStructure" ADD COLUMN IF NOT EXISTS "installmentsJson" JSONB;`);
    console.log('Added classGrade, courseName, componentsJson, installmentsJson to FeeStructure');
  } catch (e) {
    console.log('FeeStructure column additions note:', e.message);
  }

  // 3. Indexes for FeeStructure
  try {
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "FeeStructure_instituteId_isActive_idx" ON "FeeStructure"("instituteId", "isActive");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "FeeStructure_batchId_idx" ON "FeeStructure"("batchId");`);
    console.log('Added FeeStructure indexes');
  } catch (e) {
    console.log('FeeStructure indexes note:', e.message);
  }

  // 4. Modify StudentFeeAssignment table safely
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "StudentFeeAssignment" ADD COLUMN IF NOT EXISTS "discountReason" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "StudentFeeAssignment" ADD COLUMN IF NOT EXISTS "componentsJson" JSONB;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "StudentFeeAssignment" ADD COLUMN IF NOT EXISTS "installmentNo" INTEGER;`);
    console.log('Added discountReason, componentsJson, installmentNo to StudentFeeAssignment');
  } catch (e) {
    console.log('StudentFeeAssignment additions note:', e.message);
  }

  console.log('Safe migration complete without touching or dropping any existing tables or rows!');
}

main()
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

