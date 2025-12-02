import express from "express";
import multer from "multer";
import prisma from "../config/prisma";
import cloudinary from "../config/cloudinary";
import { serializeBigInt } from "../utils/types";
import { emitToClients } from "../services/socketService";
import { sendFCMNotification } from "../services/fcmService";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Helper: upload to Cloudinary
async function uploadToCloudinary(buffer: Buffer, folder = "anopog-readings") {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });
}

// POST /api/readings
router.post("/", upload.single("photo"), async (req, res) => {
  try {
    const { consumer_id, reading_value } = req.body;

    if (!consumer_id || !reading_value) {
      return res.status(400).json({ error: "Missing consumer_id or reading_value" });
    }

    let imageUrl = null;
    if (req.file) {
      const uploadResult: any = await uploadToCloudinary(req.file.buffer);
      imageUrl = uploadResult.secure_url;
    }

    const newReading = await prisma.meter_readings.create({
      data: {
        user_id: Number(consumer_id),
        reading_date: new Date(),
        reading_value: parseFloat(reading_value),
        image_url: imageUrl,
      },
    });

    // Get previous reading for consumption calculation
    const previousReading = await prisma.meter_readings.findFirst({
      where: { user_id: Number(consumer_id) },
      orderBy: { reading_date: 'desc' },
      skip: 1, // Skip the latest (current) to get previous
    });

    const currentValue = parseFloat(reading_value);
    const previousValue = previousReading ? parseFloat(previousReading.reading_value.toString()) : 0;
    const consumption = currentValue - previousValue;
    const amountDue = consumption * 10; // Fixed rate of 10 PHP per cubic meter
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    const newBill = await prisma.bills.create({
      data: {
        user_id: Number(consumer_id),
        meter_reading_id: Number(newReading.id),
        amount_due: amountDue,
        due_date: dueDate,
        is_paid: false,
      },
    });

    // Store notification in DB
    await prisma.notifications.create({
      data: {
        user_id: Number(consumer_id),
        message: `Your bill has been calculated. Amount due: ₱${amountDue.toFixed(2)}`,
        notification_date: new Date(),
      },
    });

    // Send FCM notification
    await sendFCMNotification(Number(consumer_id), 'Bill Calculated', `Your bill has been calculated. Amount due: ₱${amountDue.toFixed(2)}`);

    // Send calculation data to Consumer via socket
    emitToClients("billCalculated", {
      user_id: consumer_id,
      bill: serializeBigInt(newBill),
      consumption: consumption,
      amountDue: amountDue,
    });

    res.status(201).json({
      message: "Meter reading saved successfully!",
      data: serializeBigInt(newReading),
      bill: serializeBigInt(newBill),
    });
  } catch (error: any) {
    console.error("❌ Error saving reading:", error.message);
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

// GET /api/readings/latest/:userId
router.get("/latest/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (isNaN(Number(userId))) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const readings = await prisma.meter_readings.findMany({
      where: { user_id: Number(userId) },
      orderBy: [
        { reading_date: 'desc' },
        { id: 'desc' }
      ],
      take: 2
    });

    const present = readings[0];
    const previous = readings[1];

    res.json({
      present: present ? serializeBigInt(present) : null,
      previous: previous ? serializeBigInt(previous) : null
    });
  } catch (error: any) {
    console.error("❌ Error fetching latest readings:", error.message);
    res.status(500).json({ error: "Failed to fetch readings" });
  }
});

export default router;
