import admin from '../config/firebase';
import prisma from '../lib/prisma';

export const sendFCMNotification = async (userId: bigint, title: string, body: string, data?: any) => {
  try {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { device_token: true } as any,
    }) as any;

    if (!user || !user.device_token) {
      console.log(`No device token found for user ${userId}`);
      return;
    }

    const message = {
      token: user.device_token,
      notification: {
        title,
        body,
      },
      data: data || {},
    };

    const response = await admin.messaging().send(message);
    console.log('FCM notification sent:', response);
  } catch (error) {
    console.error('Error sending FCM notification:', error);
  }
};

export const updateDeviceToken = async (userId: bigint, deviceToken: string) => {
  try {
    await prisma.users.update({
      where: { id: userId },
      data: { device_token: deviceToken } as any,
    });
    console.log(`Device token updated for user ${userId}`);
  } catch (error) {
    console.error('Error updating device token:', error);
  }
};