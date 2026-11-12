const { PrismaClient } = require('@prisma/client');
const url = 'postgresql://neondb_owner:npg_C1AFIjsZ5tUr@ep-wild-meadow-b5h6d8oj.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require';
const prisma = new PrismaClient({ datasources: { db: { url } } });

async function run() {
  try {
    const res = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('PRISMA SUCCESS ON DIRECT HOST:', res);
  } catch (e) {
    console.error('ERROR ON DIRECT HOST:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
run();
