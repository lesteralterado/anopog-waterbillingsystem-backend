import express from "express";
import prisma from "../config/prisma";
import { serializeBigInt } from "../utils/types";
import { createPayment } from "../services/paymentsService";

const router = express.Router();

// GET /api/bills - Retrieve all bills with consumer, amount, consumption, due date, status
router.get("/", async (req, res) => {
  try {
    const bills = await prisma.bills.findMany({
      orderBy: {
        due_date: 'desc',
      },
    });

    // Fetch user and meter_reading for each bill
    const billsWithDetails = await Promise.all(
      bills.map(async (bill) => {
        const user = await prisma.users.findUnique({
          where: { id: bill.user_id },
          select: {
            id: true,
            username: true,
            full_name: true,
            address: true,
          },
        });

        const meterReading = await prisma.meter_readings.findUnique({
          where: { id: bill.meter_reading_id },
          select: {
            id: true,
            reading_value: true,
            reading_date: true,
          },
        });

        const consumption = meterReading ? Number(meterReading.reading_value) : 0;

        return {
          billId: bill.id,
          consumer: user?.full_name || user?.username || 'Unknown',
          amount: bill.amount_due,
          consumption: consumption,
          dueDate: bill.due_date,
          status: bill.is_paid ? 'Paid' : 'Unpaid',
          actions: [], // For frontend actions like pay, view details
        };
      })
    );

    res.status(200).json({
      success: true,
      bills: serializeBigInt(billsWithDetails)
    });
  } catch (error: any) {
    console.error("Get Bills Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/bills/pay - Submit payment for a bill
router.post("/pay", async (req, res) => {
  try {
    const { bill_id, payment_method, amount_paid } = req.body;

    if (!bill_id || !payment_method || !amount_paid) {
      return res.status(400).json({ error: "Missing bill_id, payment_method, or amount_paid" });
    }

    // Verify the bill exists and is not already paid
    const bill = await prisma.bills.findUnique({
      where: { id: Number(bill_id) },
    });

    if (!bill) {
      return res.status(404).json({ error: "Bill not found" });
    }

    if (bill.is_paid) {
      return res.status(400).json({ error: "Bill is already paid" });
    }

    // Create the payment and update bill
    const payment = await createPayment({
      bill_id: Number(bill_id),
      payment_date: new Date(),
      payment_method,
      amount_paid: parseFloat(amount_paid),
    });

    res.status(201).json({
      message: "Payment submitted successfully!",
      data: serializeBigInt(payment),
    });
  } catch (error: any) {
    console.error("❌ Error submitting payment:", error.message);
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

export default router;