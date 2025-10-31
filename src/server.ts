import express, { Request, Response } from 'express';
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "socket.io";
import { v2 as cloudinary } from "cloudinary";
import multer from 'multer';

dotenv.config();

import { prisma } from './lib/prisma';
import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  loginUser
} from './controllers/userController';
import { sendSMSMessage } from './controllers/smsController';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ storage: multer.memoryStorage() });

// Middleware
app.use(cors());
app.use(express.json());

io.on("connection", (socket) => {
  console.log("Admin connected", socket.id);
  socket.on("disconnect", () => {
    console.log("Admin disconnected", socket.id);
  });
});


// Route: Upload new meter reading
app.post("/api/meter-reading", upload.single("image"), async (req: Request, res: Response) => {
  try {
    const { user_id, reading_value } = req.body;
    if (!user_id || !reading_value) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Upload image if exists
    let imageUrl: string | null = null;
    if (req.file) {
      const buffer = req.file.buffer;
      const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "anopog-readings" },
          (error, result) => {
            if (error || !result) reject(error);
            else resolve(result);
          }
        );
        stream.end(buffer);
      });
      imageUrl = result.secure_url;
    }

    // Save to DB
    const newReading = await prisma.meter_readings.create({
      data: {
        user_id: BigInt(user_id),
        reading_date: new Date(),
        reading_value: parseFloat(reading_value),
        image_url: imageUrl,
      },
    });

    // ✅ Notify admins in real-time
    io.emit("newMeterReading", {
      message: `New meter reading from user ID: ${user_id}`,
      data: newReading,
    });

    // ✅ Store notification in DB
    await prisma.notifications.create({
      data: {
        user_id: BigInt(user_id),
        message: "New meter reading uploaded.",
        notification_date: new Date(),
      },
    });

    res.status(201).json({ success: true, newReading });
  } catch (error: any) {
    console.error("Meter Reading Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Route: Create new bill (admin or automated)
app.post("/api/bills", async (req: Request, res: Response) => {
  try {
    const { user_id, meter_reading_id, amount_due, due_date } = req.body;

    const newBill = await prisma.bills.create({
      data: {
        user_id: BigInt(user_id),
        meter_reading_id: BigInt(meter_reading_id),
        amount_due: parseFloat(amount_due),
        due_date: new Date(due_date),
      },
    });

    // ✅ Notify admin + user in real-time
    io.emit("newBill", {
      message: `New bill generated for user ID: ${user_id}`,
      data: newBill,
    });

    // Save notification in DB
    await prisma.notifications.create({
      data: {
        user_id: BigInt(user_id),
        message: "A new bill has been generated.",
        notification_date: new Date(),
      },
    });

    res.status(201).json({ success: true, newBill });
  } catch (error: any) {
    console.error("Bill Creation Error:", error);
    res.status(500).json({ error: error.message });
  }
});


// Route: Fetch all notifications
app.get("/api/notifications", async (_req: Request, res: Response) => {
  const notifications = await prisma.notifications.findMany({
    orderBy: { notification_date: "desc" },
    take: 10,
  });
  res.json(notifications);
});

// User Management Routes
app.post("/api/users", createUser);
app.get("/api/users", getUsers);
app.get("/api/users/:id", getUserById);
app.put("/api/users/:id", updateUser);
app.delete("/api/users/:id", deleteUser);
app.post("/api/login", loginUser);

// SMS Routes
app.post("/api/send-sms", sendSMSMessage);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
