import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

let prisma: PrismaClient;

if (process.env.ACCELERATE_URL) {
  prisma = new PrismaClient({
    accelerateUrl: process.env.ACCELERATE_URL,
    log: ["query", "warn", "error"],
  });
} else {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
  });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({
    adapter,
    log: ["query", "warn", "error"],
  });
}

export default prisma;