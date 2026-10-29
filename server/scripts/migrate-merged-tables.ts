import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createMissingTables() {
  console.log('[Migration] Ensuring InAppNotification and OnlinePaymentOrder tables exist...');
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "InAppNotification" (
        "id" TEXT NOT NULL,
        "instituteId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "studentId" TEXT,
        "type" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "link" TEXT,
        "isRead" BOOLEAN NOT NULL DEFAULT false,
        "readAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "InAppNotification_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "InAppNotification_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "InAppNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "InAppNotification_userId_isRead_idx" ON "InAppNotification"("userId", "isRead");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "InAppNotification_instituteId_createdAt_idx" ON "InAppNotification"("instituteId", "createdAt");`);
    console.log('[Migration] InAppNotification table & indexes ensured');

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "OnlinePaymentOrder" (
        "id" TEXT NOT NULL,
        "instituteId" TEXT NOT NULL,
        "studentId" TEXT NOT NULL,
        "feeAssignmentId" TEXT NOT NULL,
        "orderId" TEXT NOT NULL,
        "amount" DECIMAL(10,2) NOT NULL,
        "currency" TEXT NOT NULL DEFAULT 'INR',
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "receiptNumber" TEXT,
        "gatewayPaymentId" TEXT,
        "gatewaySignature" TEXT,
        "paymentId" TEXT,
        "idempotencyKey" TEXT,
        "metadata" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "OnlinePaymentOrder_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "OnlinePaymentOrder_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "OnlinePaymentOrder_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "OnlinePaymentOrder_feeAssignmentId_fkey" FOREIGN KEY ("feeAssignmentId") REFERENCES "StudentFeeAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "OnlinePaymentOrder_orderId_key" ON "OnlinePaymentOrder"("orderId");`);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "OnlinePaymentOrder_idempotencyKey_key" ON "OnlinePaymentOrder"("idempotencyKey");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "OnlinePaymentOrder_instituteId_idx" ON "OnlinePaymentOrder"("instituteId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "OnlinePaymentOrder_studentId_idx" ON "OnlinePaymentOrder"("studentId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "OnlinePaymentOrder_orderId_idx" ON "OnlinePaymentOrder"("orderId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "OnlinePaymentOrder_status_idx" ON "OnlinePaymentOrder"("status");`);
    console.log('[Migration] OnlinePaymentOrder table & indexes ensured');

    // Also add link column to Notification if not present
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "link" TEXT;
    `);
    console.log('[Migration] Notification link column ensured');

  } catch (err) {
    console.error('[Migration Error]', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createMissingTables();
