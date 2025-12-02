import dotenv from 'dotenv';
dotenv.config();
import { createPayment } from '../src/services/paymentsService';
import prisma from '../src/lib/prisma';

(async () => {
  try {
    // Ensure there's a bill to attach the payment to; create minimal related records if needed.
    let bill = await prisma.bills.findFirst();

    if (!bill) {
      console.log('No bill found — creating test role/user/reading/bill');

      // Ensure role exists
      let role = await prisma.roles.findFirst();
      if (!role) {
        role = await prisma.roles.create({ data: { name: 'tester' } });
      }

      // Create a test user
      const user = await prisma.users.create({
        data: {
          username: `testuser_${Date.now()}`,
          password: 'testpass',
          role_id: Number(role.id),
        },
      });

      // Create a meter reading
      const reading = await prisma.meter_readings.create({
        data: {
          user_id: user.id,
          reading_date: new Date(),
          reading_value: 0,
        },
      });

      // Create a bill attached to the reading and user
      bill = await prisma.bills.create({
        data: {
          user_id: Number(user.id),
          meter_reading_id: Number(reading.id),
          amount_due: 100.0,
          due_date: new Date(),
          is_paid: false,
        },
      });
    }

    const payment = await createPayment({
      bill_id: Number(bill.id),
      payment_date: '2025-11-03',
      payment_method: 'Gcash',
      amount_paid: 189.10,
    });

    console.log('Created payment:');
    console.log(JSON.stringify(payment, null, 2));
    process.exit(0);
  } catch (err: any) {
    console.error('Error creating payment:', err?.message || err);
    process.exit(1);
  }
})();
