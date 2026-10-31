import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function runParentFeedbackMigration() {
  console.log('[Migration] Checking and ensuring ParentFeedback table exists (non-destructive)...');

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ParentFeedback" (
        "id" TEXT NOT NULL,
        "instituteId" TEXT NOT NULL,
        "parentId" TEXT NOT NULL,
        "studentId" TEXT NOT NULL,
        "staffId" TEXT,
        "category" TEXT NOT NULL,
        "feedbackText" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'OPEN',
        "teacherResponse" TEXT,
        "respondedAt" TIMESTAMP(3),
        "respondedById" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "ParentFeedback_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "ParentFeedback_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "ParentFeedback_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ParentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "ParentFeedback_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "ParentFeedback_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "ParentFeedback_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ParentFeedback_instituteId_idx" ON "ParentFeedback"("instituteId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ParentFeedback_studentId_idx" ON "ParentFeedback"("studentId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ParentFeedback_parentId_idx" ON "ParentFeedback"("parentId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ParentFeedback_staffId_idx" ON "ParentFeedback"("staffId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ParentFeedback_status_idx" ON "ParentFeedback"("status");`);

    console.log('[Migration] ParentFeedback table and indexes verified successfully.');
    return { success: true };
  } catch (err: any) {
    console.error('[Migration Error] Could not ensure ParentFeedback table:', err.message);
    return { success: false, error: err.message };
  } finally {
    await prisma.$disconnect();
  }
}

// Allow direct CLI execution if DATABASE_URL is configured
if (process.argv[1]?.includes('migrate-parent-feedback')) {
  runParentFeedbackMigration()
    .then((res) => {
      if (!res.success) process.exit(1);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

