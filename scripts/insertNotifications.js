const prisma = require('../src/lib/prisma');

async function insertNotifications() {
  try {
    // Insert sample notifications
    await prisma.notifications.create({
      data: {
        user_id: 1n, // BigInt
        message: 'Your bill has been calculated. Amount due: ₱50.00',
        notification_date: new Date('2024-12-01'),
      },
    });

    await prisma.notifications.create({
      data: {
        user_id: 2n,
        message: 'Payment received for your bill (123). Amount: ₱50.00',
        notification_date: new Date('2024-12-02'),
      },
    });

    await prisma.notifications.create({
      data: {
        user_id: 1n,
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