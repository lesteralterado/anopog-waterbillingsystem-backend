import { Request, Response } from 'express';
import { sendSMS } from '../services/semaphoreService';

export async function sendSMSMessage(req: Request, res: Response) {
  try {
    const { to, message } = req.body;

    // Validate required fields
    if (!to || !message) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: 'to' (phone number) and 'message'"
      });
    }

    // Basic phone number validation (Philippine numbers)
    const phoneRegex = /^(\+63|0)[9]\d{9}$/;
    if (!phoneRegex.test(to)) {
      return res.status(400).json({
        success: false,
        error: "Invalid phone number format. Use Philippine format: +639XXXXXXXXX or 09XXXXXXXXX"
      });
    }

    // Validate message length (Semaphore has limits)
    if (message.length > 160) {
      return res.status(400).json({
        success: false,
        error: "Message too long. Maximum 160 characters allowed."
      });
    }

    console.log(`Attempting to send SMS to ${to}: ${message}`);

    // Send SMS via Semaphore service
    const result = await sendSMS(to, message);

    console.log("SMS sent successfully:", result);

    res.json({
      success: true,
      message: "SMS sent successfully",
      data: result
    });

  } catch (error: any) {
    console.error("SMS Send Error:", error);

    // Handle specific error types
    if (error.response) {
      // Semaphore API error
      return res.status(error.response.status || 500).json({
        success: false,
        error: "SMS service error",
        details: error.response.data
      });
    } else if (error.message.includes("SEMAPHORE_API_KEY")) {
      return res.status(500).json({
        success: false,
        error: "SMS service not configured. Please check SEMAPHORE_API_KEY."
      });
    } else if (error.message.includes("ENOTFOUND")) {
      return res.status(503).json({
        success: false,
        error: "Unable to connect to SMS service. Please check your internet connection."
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || "Failed to send SMS"
    });
  }
}