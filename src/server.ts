import express, { Request, Response } from 'express';
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "socket.io";
import multer from 'multer';
import axios from 'axios';
// import paymongo from '@api/paymongo';
const bodyParser = require('body-parser');

dotenv.config();

import cloudinary from './config/cloudinary';

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
import uploadRoute from './routes/upload.route';
import readingRoute from "./routes/reading.route";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

// Interface for payment intent request body
interface CreatePaymentIntentBody {
  amount: number;
  paymentMethods?: string[];
  description?: string;
}


// const upload = multer({ storage: multer.memoryStorage() });

// Middleware
app.use(cors());
app.use(express.json());
app.use("/api/readings", readingRoute);
app.use(bodyParser.json({ limit: '50mb' })); // Allow large images
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

io.on("connection", (socket) => {
  console.log("Admin connected", socket.id);
  socket.on("disconnect", () => {
    console.log("Admin disconnected", socket.id);
  });
});

const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;
const PAYMONGO_API_URL = 'https://api.paymongo.com/v1';

// Create axios instance with authentication
const paymongoAPI = axios.create({
  baseURL: PAYMONGO_API_URL,
  auth: {
    username: PAYMONGO_SECRET_KEY,
    password: '' // Leave password empty for secret key authentication
  },
  headers: {
    'Content-Type': 'application/json'
  }
});

// ============================================
// MULTER CONFIGURATION (Handle File Uploads)
// ============================================
const storage = multer.memoryStorage(); // Store in memory temporarily
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Max 10MB
  fileFilter: (req, file, cb) => {
    // Only allow images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// ============================================
// HELPER FUNCTION: Upload to Cloudinary
// ============================================
// async function uploadToCloudinary(fileBuffer: Buffer, folder = 'water-billing') {
//   return new Promise((resolve, reject) => {
//     cloudinary.uploader.upload_stream(
//       {
//         folder: folder,
//         resource_type: 'auto',
//         transformation: [
//           { width: 800, height: 800, crop: 'limit' }, // Max size
//           { quality: 'auto' },                         // Auto optimize
//           { fetch_format: 'auto' }                     // Auto format
//         ]
//       },
//       (error, result) => {
//         if (error) reject(error);
//         else resolve(result);
//       }
//     ).end(fileBuffer);
//   });
// }

// Route to create a payment intent
app.post('/api/create-payment-intent', async (req: Request<{}, {}, CreatePaymentIntentBody>, res: Response) => {
  try {
    const { 
      amount, 
      paymentMethods = ['card', 'gcash', 'paymaya', 'grab_pay', 'shopee_pay'],
      description = 'Payment description'
    } = req.body;

    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount. Amount must be greater than 0.'
      });
    }

     // Create payment intent using PayMongo REST API
    const response = await paymongoAPI.post('/payment_intents', {
      data: {
        attributes: {
          amount: amount, // Amount in centavos (e.g., 2000 = ₱20.00)
          payment_method_allowed: paymentMethods,
          payment_method_options: { 
            card: { request_three_d_secure: 'any' } 
          },
          currency: 'PHP',
          capture_type: 'automatic',
          statement_descriptor: description
        }
      }
    });

    // Return success response
    res.status(200).json({
      success: true,
      data: response.data
    });

  } catch (error: any) {
    console.error('PayMongo Error:', error.response?.data || error.message);
    
    // Handle PayMongo API errors
    if (error.response?.data?.errors) {
      return res.status(error.response.status || 400).json({
        success: false,
        errors: error.response.data.errors
      });
    }

    // Handle other errors
    res.status(500).json({
      success: false,
      error: 'Failed to create payment intent',
      message: error.message
    });
  }
});

// Route to attach payment method to payment intent
app.post('/api/attach-payment-method', async (req: Request, res: Response) => {
  try {
    const { paymentIntentId, paymentMethodId, clientKey } = req.body;

    if (!paymentIntentId || !paymentMethodId) {
      return res.status(400).json({
        success: false,
        error: 'Payment intent ID and payment method ID are required'
      });
    }

    const response = await paymongoAPI.post(
      `/payment_intents/${paymentIntentId}/attach`,
      {
        data: {
          attributes: {
            payment_method: paymentMethodId,
            client_key: clientKey,
            return_url: process.env.RETURN_URL || 'http://localhost:3000/success'
          }
        }
      }
    );

    res.status(200).json({
      success: true,
      data: response.data
    });

  } catch (error: any) {
    console.error('Attach Payment Method Error:', error.response?.data || error.message);
    
    if (error.response?.data?.errors) {
      return res.status(error.response.status || 400).json({
        success: false,
        errors: error.response.data.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to attach payment method',
      message: error.message
    });
  }
});

// Route to retrieve payment intent
app.get('/api/payment-intent/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const response = await paymongoAPI.get(`/payment_intents/${id}`);

    res.status(200).json({
      success: true,
      data: response.data
    });

  } catch (error: any) {
    console.error('Retrieve Payment Intent Error:', error.response?.data || error.message);
    
    if (error.response?.data?.errors) {
      return res.status(error.response.status || 400).json({
        success: false,
        errors: error.response.data.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve payment intent',
      message: error.message
    });
  }
});

const url = cloudinary.url('images_gsddol', {
  transformation: [
    {
      quality: "auto",
      fetch_format: "auto",
      width: 800,
      height: 800,
      crop: "limit"
    }
  ]
})
console.log(url);

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
          { folder: "anopog-readings",
            resource_type: 'auto',
            transformation: [
          { width: 800, height: 800, crop: 'limit' }, // Max size
          { quality: 'auto' },                         // Auto optimize
          { fetch_format: 'auto' }                     // Auto format
        ]
           },
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

// Route: Get all bills with related data
app.get("/api/bills", async (req: Request, res: Response) => {
  try {
    const bills = await prisma.bills.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
        meter_reading: {
          select: {
            id: true,
            reading_value: true,
            reading_date: true,
            image_url: true,
          },
        },
      },
      orderBy: {
        due_date: 'desc',
      },
    });

    res.status(200).json({ success: true, bills });
  } catch (error: any) {
    console.error("Get Bills Error:", error);
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

// Upload Routes
app.use('/api', uploadRoute);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📍 Create payment intent: POST http://localhost:${PORT}/api/create-payment-intent`);
  console.log(`📍 Attach payment method: POST http://localhost:${PORT}/api/attach-payment-method`);
  console.log(`📍 Get payment intent: GET http://localhost:${PORT}/api/payment-intent/:id`);
});
