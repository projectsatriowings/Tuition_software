import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  try {
    const tables: any = await prisma.$queryRawUnsafe(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('Tables:', tables.map((t: any) => t.table_name));
  } catch (err) {
    console.error('Check error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
