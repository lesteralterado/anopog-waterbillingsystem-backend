import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  accelerateUrl: process.env.ACCELERATE_URL,
  log: ["query", "warn", "error"],
});

export default prisma;