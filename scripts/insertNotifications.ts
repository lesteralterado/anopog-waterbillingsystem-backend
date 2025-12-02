import dotenv from 'dotenv';
dotenv.config();

import prisma from '../src/lib/prisma';

async function insertNotifications() {
  try {
    // Check existing users
    const users = await prisma.users.findMany();
    console.log('Existing users:', users.length);

    if (users.length === 0) {
      console.log('No users found, inserting a sample user');
      await prisma.users.create({
        data: {
          username: 'testuser',
          password: 'hashedpassword',
          full_name: 'Test User',
          address: 'Test Address',
          role_id: 1, // Assuming role 1 exists
        },
      });
    }

    const user = await prisma.users.findFirst();
    if (!user) {
      console.log('Still no user, skipping notifications');
      return;
    }

    // Insert sample notifications
    await prisma.notifications.create({
      data: {
        user_id: user.id,
        message: 'Your bill has been calculated. Amount due: ₱50.00',
        notification_date: new Date('2024-12-01'),
      },
    });

    await prisma.notifications.create({
      data: {
        user_id: user.id,
        message: 'Payment received for your bill (123). Amount: ₱50.00',
        notification_date: new Date('2024-12-02'),
      },
    });

    await prisma.notifications.create({
      data: {
        user_id: user.id,
        message: 'Your bill has been created. Amount due: ₱75.00',
        notification_date: new Date('2024-12-03'),
      },
    });

    console.log('Sample notifications inserted successfully');
  } catch (error) {
    console.error('Error inserting notifications:', error);
  } finally {
    await prisma.$disconnect();
  }
}

insertNotifications();