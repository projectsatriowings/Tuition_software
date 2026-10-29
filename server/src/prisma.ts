import { PrismaClient } from '@prisma/client';

// Global singleton pattern to avoid multiple connection pools in Node/TypeScript development
declare global {
  // eslint-disable-next-line no-var
  var __tuition_prisma__: PrismaClient | undefined;
}

export const prisma =
  global.__tuition_prisma__ ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development' && process.env.PRISMA_LOG_QUERIES === 'true'
        ? ['query', 'info', 'warn', 'error']
        : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__tuition_prisma__ = prisma;
}

export default prisma;

