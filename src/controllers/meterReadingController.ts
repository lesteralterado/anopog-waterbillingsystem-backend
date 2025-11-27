import { sendSMS } from "../services/semaphoreService";
import prisma from "../lib/prisma";
import { serializeBigInt } from "../utils/types";

export async function createMeterReading(req: { body: { userId: any; readingValue: any; imageUrl: any; }; }, res: { json: (arg0: { success: boolean; newReading: any; bill?: any; }) => any; status: (arg0: number) => { (): any; new(): any; json: { (arg0: { error: string; }): void; new(): any; }; }; }) {
  try {
    const { userId, readingValue, imageUrl } = req.body;

    // Save reading to DB
    const newReading = await prisma.meter_readings.create({
      data: { user_id: userId, reading_value: readingValue, image_url: imageUrl, reading_date: new Date() }
    });

    // Fetch user details
    const user = await prisma.users.findUnique({ where: { id: userId } });

    // Get previous meter reading for consumption calculation
    const previousReading = await prisma.meter_readings.findFirst({
      where: { user_id: userId, id: { not: newReading.id } },
      orderBy: { reading_date: 'desc' }
    });

    const previousValue = previousReading ? previousReading.reading_value : 0;
    const consumption = Number(readingValue) - Number(previousValue);

    // Calculate bill amount (example rates)
    const ratePerCubicMeter = 10; // Example rate
    const basicCharge = 50; // Example basic charge
    const penalties = 0; // No penalties for new bill
    const totalAmount = consumption * ratePerCubicMeter + basicCharge + penalties;

    // Create bill
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 15); // Due in 15 days

    const newBill = await prisma.bills.create({
      data: {
        user_id: Number(userId),
        meter_reading_id: Number(newReading.id),
        amount_due: totalAmount,
        due_date: dueDate,
        is_paid: false
      }
    });

    // Note: SMS functionality commented out as phone_number and full_name fields don't exist in schema
    // if (user?.phone_number) {
    //   // Compose SMS
    //   const message = `Hi ${user.full_name || "Customer"}, your new meter reading is ${readingValue}. Please expect your updated bill soon. - Anopog WBS`;
    //   await sendSMS(user.phone_number, message);
    // }

    return res.json({ success: true, newReading: serializeBigInt(newReading), bill: serializeBigInt(newBill) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create meter reading" });
  }
}
