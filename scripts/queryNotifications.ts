import dotenv from 'dotenv';
dotenv.config();

import prisma from '../src/lib/prisma';

async function queryNotifications() {
  try {
    const notifications = await prisma.notifications.findMany({
      orderBy: { notification_date: 'desc' },
    });

    console.log('All notifications in database:');
    console.log(JSON.stringify(notifications, null, 2));
  } catch (error) {
    console.error('Error querying notifications:', error);
  } finally {
    await prisma.$disconnect();
  }
}

queryNotifications();