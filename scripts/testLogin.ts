import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import prisma from '../src/lib/prisma';

async function testLogin() {
  const username = 'katie123';
  const password = 'katie123';

  try {
    // List all users first
    const allUsers = await prisma.users.findMany({
      select: {
        username: true,
        email: true,
        password: true,
        role: {
          select: { name: true }
        }
      }
    });
    console.log('All users:');
    allUsers.forEach(u => console.log(`- ${u.username}, email: ${u.email}, password: ${u.password ? (u.password.startsWith('$2b$') ? 'hashed' : 'plain') : 'null'}, role: ${u.role.name}`));

    // Find user by username or email
    let user = await prisma.users.findFirst({
      where: {
        OR: [
          { username },
          { email: username }
        ]
      },
      include: {
        role: true
      }
    });

    if (!user) {
      console.log('User not found, creating test user...');
      // Get consumer role
      const role = await prisma.roles.findFirst({ where: { name: 'Consumer' } });
      if (!role) {
        console.log('Consumer role not found');
        return;
      }
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      user = await prisma.users.create({
        data: {
          username,
          password: hashedPassword,
          role_id: role.id,
        },
        include: {
          role: true
        }
      });
      console.log('Created user:', user.username);
    }

    console.log('User found:', user.username, 'Role:', user.role.name);

    // Check password
    const isHashed = user.password.startsWith('$2b$') || user.password.startsWith('$2a$');
    let isValidPassword: boolean;
    if (isHashed) {
      isValidPassword = await bcrypt.compare(password, user.password);
    } else {
      isValidPassword = password === user.password;
    }

    if (isValidPassword) {
      console.log('Login successful');
    } else {
      console.log('Invalid password');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();