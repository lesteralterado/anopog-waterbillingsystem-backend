import { PrismaClient } from '../generated/client';

export const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL!,
  log: ['query', 'error', 'warn'],
});

export default prisma;