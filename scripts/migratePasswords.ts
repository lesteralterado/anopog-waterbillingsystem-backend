import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import prisma from '../src/lib/prisma';

async function migratePasswords() {
  try {
    const users = await prisma.users.findMany();

    for (const user of users) {
      const isHashed = user.password.startsWith('$2b$') || user.password.startsWith('$2a$');
      if (!isHashed) {
        console.log(`Hashing password for user: ${user.username}`);
        const hashedPassword = await bcrypt.hash(user.password, 10);
        await prisma.users.update({
          where: { id: user.id },
          data: { password: hashedPassword }
        });
        console.log(`Password hashed for user: ${user.username}`);
      } else {
        console.log(`Password already hashed for user: ${user.username}`);
      }
    }

    console.log('Password migration completed');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migratePasswords();