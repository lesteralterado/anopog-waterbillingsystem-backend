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
  loginUser,
  getConsumersByPurok
} from './controllers/userController';
import { sendSMSMessage } from './controllers/smsController';
import { createPayment } from './services/paymentsService';
import uploadRoute from './routes/upload.route';
import readingRoute from "./routes/reading.route";
import { serializeBigInt } from './utils/types';
import { setIo } from './services/socketService';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

setIo(io);

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
    username: PAYMONGO_SECRET_KEY || '',
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
      data: serializeBigInt(newReading),
    });

    // ✅ Store notification in DB
    await prisma.notifications.create({
      data: {
        user_id: BigInt(user_id),
        message: "New meter reading uploaded.",
        notification_date: new Date(),
      },
    });

    res.status(201).json({ success: true, newReading: serializeBigInt(newReading) });
  } catch (error: any) {
    console.error("Meter Reading Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Route: Get all meter readings with related data
app.get("/api/meter-readings", async (req: Request, res: Response) => {
  try {
    const meterReadings = await prisma.meter_readings.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            full_name: true,
            address: true,
          },
        },
        bills: {
          select: {
            id: true,
            amount_due: true,
            due_date: true,
            is_paid: true,
          },
        },
      },
      orderBy: {
        reading_date: 'desc',
      },
    });

    res.status(200).json({ success: true, meterReadings: serializeBigInt(meterReadings) });
  } catch (error: any) {
    console.error("Get Meter Readings Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Route: Create new bill (from Meter Reader)
app.post("/api/bills", async (req: Request, res: Response) => {
  try {
    const billData = req.body;

    // Build data object conditionally for optional fields
    const data: any = {
      receipt_number: billData.receiptNumber,
      issue_date: billData.issueDate ? new Date(billData.issueDate) : undefined,
      barangay_name: billData.barangayName,
      homeowner_name: billData.homeownerName,
      address: billData.address,
      meter_number: billData.meterNumber,
      purok: billData.purok,
      billing_period: billData.billingPeriod,
      previous_reading: billData.previousReading ? parseFloat(billData.previousReading) : undefined,
      current_reading: billData.currentReading ? parseFloat(billData.currentReading) : undefined,
      consumption: billData.consumption ? parseFloat(billData.consumption) : undefined,
      rate_per_cubic_meter: billData.ratePerCubicMeter ? parseFloat(billData.ratePerCubicMeter) : undefined,
      basic_charge: billData.basicCharge ? parseFloat(billData.basicCharge) : undefined,
      penalties: billData.penalties ? parseFloat(billData.penalties) : undefined,
      total_amount: billData.totalAmount ? parseFloat(billData.totalAmount) : undefined,
      due_date: billData.dueDate ? new Date(billData.dueDate) : undefined,
      payment_terms: billData.paymentTerms,
      qr_code: billData.qrCode,
      homeowner_phone: billData.homeownerPhone,
      homeowner_email: billData.homeownerEmail,
      status: billData.status || "unpaid",
      amount_due: billData.totalAmount ? parseFloat(billData.totalAmount) : undefined, // For compatibility
    };

    if (billData.userId) {
      data.user_id = BigInt(billData.userId);
    }

    const newBill = await prisma.bills.create({
      data,
    });

    // ✅ Notify consumer in real-time
    io.emit("billCreated", {
      message: `New bill created for user ID: ${billData.userId}`,
      data: serializeBigInt(newBill),
    });

    // Save notification in DB
    if (billData.userId) {
      await prisma.notifications.create({
        data: {
          user_id: BigInt(billData.userId),
          message: `Your bill has been created. Total amount: ₱${billData.totalAmount}`,
          notification_date: new Date(),
        },
      });
    }

    res.status(201).json({ success: true, newBill: serializeBigInt(newBill) });
  } catch (error: any) {
    console.error("Bill Creation Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Route: Create multiple bills (bulk from Meter Reader)
app.post("/api/bulk-bills", async (req: Request, res: Response) => {
  try {
    const { bills } = req.body;

    if (!Array.isArray(bills)) {
      return res.status(400).json({ error: "Bills must be an array" });
    }

    const createdBills = [];

    for (const billData of bills) {
      const data: any = {
        receipt_number: billData.receiptNumber,
        issue_date: billData.issueDate ? new Date(billData.issueDate) : undefined,
        barangay_name: billData.barangayName,
        homeowner_name: billData.homeownerName,
        address: billData.address,
        meter_number: billData.meterNumber,
        purok: billData.purok,
        billing_period: billData.billingPeriod,
        previous_reading: billData.previousReading ? parseFloat(billData.previousReading) : undefined,
        current_reading: billData.currentReading ? parseFloat(billData.currentReading) : undefined,
        consumption: billData.consumption ? parseFloat(billData.consumption) : undefined,
        rate_per_cubic_meter: billData.ratePerCubicMeter ? parseFloat(billData.ratePerCubicMeter) : undefined,
        basic_charge: billData.basicCharge ? parseFloat(billData.basicCharge) : undefined,
        penalties: billData.penalties ? parseFloat(billData.penalties) : undefined,
        total_amount: billData.totalAmount ? parseFloat(billData.totalAmount) : undefined,
        due_date: billData.dueDate ? new Date(billData.dueDate) : undefined,
        payment_terms: billData.paymentTerms,
        qr_code: billData.qrCode,
        homeowner_phone: billData.homeownerPhone,
        homeowner_email: billData.homeownerEmail,
        status: billData.status || "unpaid",
        amount_due: billData.totalAmount ? parseFloat(billData.totalAmount) : undefined,
      };

      if (billData.userId) {
        data.user_id = BigInt(billData.userId);
      }

      const newBill = await prisma.bills.create({
        data,
      });

      createdBills.push(newBill);

      // Notify consumer
      io.emit("billCreated", {
        message: `New bill created for user ID: ${billData.userId}`,
        data: serializeBigInt(newBill),
      });

      // Save notification
      if (billData.userId) {
        await prisma.notifications.create({
          data: {
            user_id: BigInt(billData.userId),
            message: `Your bill has been created. Total amount: ₱${billData.totalAmount}`,
            notification_date: new Date(),
          },
        });
      }
    }

    res.status(201).json({ success: true, createdBills: serializeBigInt(createdBills) });
  } catch (error: any) {
    console.error("Bulk Bill Creation Error:", error);
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
app.get("/api/consumers-by-purok", getConsumersByPurok);

// SMS Routes
app.post("/api/send-sms", sendSMSMessage);

// Route: Record a payment from frontend
app.post("/api/payments", async (req: Request, res: Response) => {
  try {
    const { bill_id, payment_date, payment_method, amount_paid } = req.body;

    if (!bill_id || !payment_date || !payment_method || amount_paid === undefined) {
      return res.status(400).json({ message: "Missing required fields: bill_id, payment_date, payment_method, amount_paid" });
    }

    // Validate payment method
    const validMethods = ['GCash', 'PayMaya', 'Credit/Debit Card', 'Bank Transfer', 'Over-the-Counter', 'Saved Cards (Visa/Mastercard)'];
    if (!validMethods.includes(payment_method)) {
      return res.status(400).json({ message: "Invalid payment method" });
    }

    // Create payment (DB) - fee is calculated automatically in the service
    const newPayment = await createPayment({ bill_id, payment_date, payment_method, amount_paid });

    // Emit real-time event to admins
    io.emit("newPayment", {
      message: `Payment received for bill ID: ${bill_id}`,
      data: serializeBigInt(newPayment),
    });

    // Save notification for the user tied to the bill (if we can find it)
    const billRecord = await prisma.bills.findUnique({ where: { id: BigInt(bill_id) } });
    if (billRecord && billRecord.user_id) {
      await prisma.notifications.create({
        data: {
          user_id: billRecord.user_id,
          message: `Payment received for your bill (${bill_id}). Amount: ₱${amount_paid}, Fee: ₱${(newPayment as any).fee || 0}`,
          notification_date: new Date(),
        },
      });
    }

    res.status(201).json({ success: true, newPayment: serializeBigInt(newPayment) });
  } catch (error: any) {
    console.error("Payment Error:", error);
    res.status(500).json({ error: error.message });
  }
});
// Upload Routes
app.use('/api', uploadRoute);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📍 Create payment intent: POST http://localhost:${PORT}/api/create-payment-intent`);
  console.log(`📍 Attach payment method: POST http://localhost:${PORT}/api/attach-payment-method`);
  console.log(`📍 Get payment intent: GET http://localhost:${PORT}/api/payment-intent/:id`);
});
