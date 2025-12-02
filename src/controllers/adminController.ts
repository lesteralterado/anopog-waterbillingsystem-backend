import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export async function getBillStats(req: Request, res: Response) {
  try {
    // Count pending bills
    const pendingBillsCount = await prisma.bills.count({
      where: { is_paid: false }
    });

    // Count paid bills
    const paidBillsCount = await prisma.bills.count({
      where: { is_paid: true }
    });

    // Calculate monthly revenue (current month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const monthlyRevenueResult = await prisma.payments.aggregate({
      _sum: {
        amount_paid: true
      },
      where: {
        payment_date: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    });

    const monthlyRevenue = monthlyRevenueResult._sum.amount_paid ? parseFloat(monthlyRevenueResult._sum.amount_paid.toString()) : 0;

    res.json({
      success: true,
      data: {
        pendingBills: pendingBillsCount,
        paidBills: paidBillsCount,
        monthlyRevenue: monthlyRevenue
      }
    });
  } catch (error: any) {
    console.error("Get Bill Stats Error:", error);
    res.status(500).json({ error: error.message });
  }
}