import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkEnums() {
  try {
    const types: any = await prisma.$queryRawUnsafe(`
      SELECT typname 
      FROM pg_type 
      WHERE typname IN ('NotificationType', 'PushDeliveryStatus', 'AttendanceType', 'UserRole');
    `);
    console.log('Existing types:', types.map((t: any) => t.typname));
  } catch (err) {
    console.error('Check error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

checkEnums();
