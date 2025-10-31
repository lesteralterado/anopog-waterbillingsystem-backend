import { sendSMS } from "../services/semaphoreService";
import { prisma } from "../lib/prisma";

export async function createMeterReading(req: { body: { userId: any; readingValue: any; imageUrl: any; }; }, res: { json: (arg0: { success: boolean; newReading: any; }) => any; status: (arg0: number) => { (): any; new(): any; json: { (arg0: { error: string; }): void; new(): any; }; }; }) {
  try {
    const { userId, readingValue, imageUrl } = req.body;

    // Save reading to DB
    const newReading = await prisma.meter_readings.create({
      data: { user_id: userId, reading_value: readingValue, image_url: imageUrl, reading_date: new Date() }
    });

    // Fetch user phone number
    const user = await prisma.users.findUnique({ where: { id: userId } });

    // Note: SMS functionality commented out as phone_number and full_name fields don't exist in schema
    // if (user?.phone_number) {
    //   // Compose SMS
    //   const message = `Hi ${user.full_name || "Customer"}, your new meter reading is ${readingValue}. Please expect your updated bill soon. - Anopog WBS`;
    //   await sendSMS(user.phone_number, message);
    // }

    return res.json({ success: true, newReading });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create meter reading" });
  }
}
