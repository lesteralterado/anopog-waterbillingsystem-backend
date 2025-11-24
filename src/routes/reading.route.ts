import express from "express";
import multer from "multer";
import prisma from "../config/prisma";
import cloudinary from "../config/cloudinary";
import { serializeBigInt } from "../utils/types";

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
        user_id: BigInt(consumer_id),
        reading_date: new Date(),
        reading_value: parseFloat(reading_value),
        image_url: imageUrl,
      },
    });

    res.status(201).json({
      message: "Meter reading saved successfully!",
      data: serializeBigInt(newReading),
    });
  } catch (error: any) {
    console.error("❌ Error saving reading:", error.message);
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

// POST /api/readings/sync - Bulk sync meter readings
router.post("/sync", async (req, res) => {
  try {
    const { readings } = req.body;

    if (!readings || !Array.isArray(readings) || readings.length === 0) {
      return res.status(400).json({ error: "Missing or invalid readings array" });
    }

    // Validate each reading
    for (const reading of readings) {
      if (!reading.consumer_id || !reading.reading_value) {
        return res.status(400).json({ error: "Each reading must have consumer_id and reading_value" });
      }
    }

    // Create readings in transaction
    const createdReadings = await prisma.$transaction(
      readings.map(reading =>
        prisma.meter_readings.create({
          data: {
            user_id: BigInt(reading.consumer_id),
            reading_date: new Date(),
            reading_value: parseFloat(reading.reading_value),
            image_url: null, // No photos for bulk sync
          },
        })
      )
    );

    res.status(201).json({
      message: `${createdReadings.length} meter readings synced successfully!`,
      data: createdReadings.map(reading => serializeBigInt(reading)),
    });
  } catch (error: any) {
    console.error("❌ Error syncing readings:", error.message);
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

export default router;
