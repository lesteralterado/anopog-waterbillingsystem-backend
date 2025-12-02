import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { sendFCMNotification } from '../services/fcmService';
import { serializeBigInt } from '../utils/types';

export const createIssue = async (req: Request, res: Response) => {
  try {
    const { userId, description } = req.body;

    if (!userId || !description) {
      return res.status(400).json({ error: 'Missing required fields: userId, description' });
    }

    const newIssue = await prisma.issues.create({
      data: {
        user_id: Number(userId),
        description,
        reported_date: new Date(),
      },
    });

    res.status(201).json({ success: true, issue: serializeBigInt(newIssue) });
  } catch (error: any) {
    console.error('Create Issue Error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getIssues = async (req: Request, res: Response) => {
  try {
    const issues = await prisma.issues.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            full_name: true,
            address: true,
          },
        },
      },
      orderBy: {
        reported_date: 'desc',
      },
    });

    res.status(200).json({ success: true, issues: serializeBigInt(issues) });
  } catch (error: any) {
    console.error('Get Issues Error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const updateIssue = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isResolved, resolvedDate, fixingDate } = req.body;

    console.log('Update Issue Request:', { id, isResolved, resolvedDate, fixingDate });

    const updateData: any = {};
    if (isResolved !== undefined) updateData.is_resolved = isResolved;
    if (resolvedDate) updateData.resolved_date = new Date(resolvedDate);
    if (fixingDate) updateData.fixing_date = new Date(fixingDate);

    const updatedIssue = await prisma.issues.update({
      where: { id: Number(id) },
      data: updateData,
      include: {
        user: true,
      },
    });

    // If fixing date is set, send FCM notification to consumer
    if (fixingDate) {
      console.log('Sending FCM notification for fixing date:', fixingDate);
      const message = `Your issue has been scheduled for fixing on ${new Date(fixingDate).toLocaleDateString()}.`;
      await sendFCMNotification(Number(updatedIssue.user_id), 'Issue Update', message);
    } else {
      console.log('No fixing date provided, skipping FCM notification');
    }

    res.status(200).json({ success: true, issue: serializeBigInt(updatedIssue) });
  } catch (error: any) {
    console.error('Update Issue Error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const registerDeviceToken = async (req: Request, res: Response) => {
  try {
    const { userId, deviceToken } = req.body;

    if (!userId || !deviceToken) {
      return res.status(400).json({ error: 'Missing required fields: userId, deviceToken' });
    }

    await prisma.users.update({
      where: { id: Number(userId) },
      data: {
        device_token: deviceToken
      } as any,
    });

    res.status(200).json({ success: true, message: 'Device token registered successfully' });
  } catch (error: any) {
    console.error('Register Device Token Error:', error);
    res.status(500).json({ error: error.message });
  }
};