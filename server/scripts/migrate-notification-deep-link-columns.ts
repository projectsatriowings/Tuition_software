import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function migrateNotifications() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('[Migration] Connected to Neon PostgreSQL.');

    // 1. Add columns to Notification table
    await client.query(`
      ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "entityType" TEXT;
      ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "entityId" TEXT;
      ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
      CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");
      CREATE INDEX IF NOT EXISTS "Notification_entityType_entityId_idx" ON "Notification"("entityType", "entityId");
    `);
    console.log('[Migration] Added columns and indexes to "Notification".');

    // 2. Add columns to InAppNotification table
    await client.query(`
      ALTER TABLE "InAppNotification" ADD COLUMN IF NOT EXISTS "entityType" TEXT;
      ALTER TABLE "InAppNotification" ADD COLUMN IF NOT EXISTS "entityId" TEXT;
      ALTER TABLE "InAppNotification" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
    `);
    console.log('[Migration] Added columns to "InAppNotification".');

    console.log('[Migration] Schema update successfully applied to Neon PostgreSQL.');
  } catch (err: any) {
    console.error('[Migration Error]', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrateNotifications();

