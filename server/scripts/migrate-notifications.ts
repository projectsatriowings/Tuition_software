import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runMigration() {
  console.log('[Migration] Starting additive migration for Notification and DevicePushToken...');

  try {
    // 1. Create Enums if not exist
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationType') THEN
          CREATE TYPE "NotificationType" AS ENUM ('ATTENDANCE', 'ACADEMIC', 'GENERAL');
        END IF;
      END$$;
    `);
    console.log('[Migration] NotificationType enum ensured');

    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PushDeliveryStatus') THEN
          CREATE TYPE "PushDeliveryStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED', 'NOT_CONFIGURED');
        END IF;
      END$$;
    `);
    console.log('[Migration] PushDeliveryStatus enum ensured');

    // 2. Create Notification table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Notification" (
        "id" TEXT NOT NULL,
        "instituteId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "role" "UserRole" NOT NULL,
        "title" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "type" "NotificationType" NOT NULL DEFAULT 'ATTENDANCE',
        "studentId" TEXT,
        "attendanceEventId" TEXT,
        "eventType" "AttendanceType",
        "eventTime" TIMESTAMP(3),
        "isRead" BOOLEAN NOT NULL DEFAULT false,
        "readAt" TIMESTAMP(3),
        "pushStatus" "PushDeliveryStatus" NOT NULL DEFAULT 'PENDING',
        "pushError" TEXT,
        "idempotencyKey" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "Notification_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "Notification_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "Notification_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "Notification_attendanceEventId_fkey" FOREIGN KEY ("attendanceEventId") REFERENCES "AttendanceEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    console.log('[Migration] Notification table ensured');

    // 3. Create Notification indexes one by one
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Notification_idempotencyKey_key" ON "Notification"("idempotencyKey");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Notification_instituteId_createdAt_idx" ON "Notification"("instituteId", "createdAt");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Notification_attendanceEventId_idx" ON "Notification"("attendanceEventId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Notification_studentId_idx" ON "Notification"("studentId");`);
    console.log('[Migration] Notification indexes ensured');

    // 4. Create DevicePushToken table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "DevicePushToken" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "token" TEXT NOT NULL,
        "platform" TEXT NOT NULL DEFAULT 'android',
        "deviceInfo" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "DevicePushToken_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "DevicePushToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    console.log('[Migration] DevicePushToken table ensured');

    // 5. Create DevicePushToken indexes
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "DevicePushToken_token_key" ON "DevicePushToken"("token");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "DevicePushToken_userId_idx" ON "DevicePushToken"("userId");`);
    console.log('[Migration] DevicePushToken indexes ensured');

    console.log('[Migration] All schema updates completed successfully!');
  } catch (err) {
    console.error('[Migration Error]', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
