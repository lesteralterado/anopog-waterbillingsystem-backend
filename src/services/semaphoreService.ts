import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const SEMAPHORE_API_KEY = process.env.SEMAPHORE_API_KEY;
const SEMAPHORE_URL = " https://api.semaphore.co/api/v4/messages";

export async function sendSMS(to: string, message: string) {
  try {
    // Check if API key is configured
    if (!SEMAPHORE_API_KEY) {
      throw new Error("SEMAPHORE_API_KEY is not configured in environment variables");
    }

    // Clean phone number (remove spaces, ensure proper format)
    const cleanNumber = to.replace(/\s+/g, '');

    const response = await axios.post(SEMAPHORE_URL, {
      apikey: SEMAPHORE_API_KEY,
      number: cleanNumber,
      message
      // Removed sendername as it's causing issues - will use default
    });

    console.log("SMS sent successfully:", response.data);
    return response.data;
  } catch (error: any) {
    console.error("Failed to send SMS:", error.response?.data || error.message);

    // Provide more specific error messages
    if (error.response) {
      // Semaphore API returned an error
      throw new Error(`SMS API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else if (error.code === 'ENOTFOUND') {
      throw new Error("Unable to connect to SMS service. Check your internet connection.");
    } else {
      throw new Error(`SMS sending failed: ${error.message}`);
    }
  }
}
