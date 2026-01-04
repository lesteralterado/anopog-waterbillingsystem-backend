import prisma from '../lib/prisma';

type CreatePaymentInput = {
  bill_id: string | number;
  payment_date: string | Date;
  payment_method: string;
  amount_paid: string | number;
  fee?: string | number;
};

// Function to get fee based on payment method
export function getPaymentFee(paymentMethod: string): number {
  const fees: { [key: string]: number } = {
    'GCash': 0.00,
    'PayMaya': 0.00,
    'Credit/Debit Card': 15.00,
    'Bank Transfer': 10.00,
    'Over-the-Counter': 5.00,
    'Saved Cards (Visa/Mastercard)': 15.00,
  };

  return fees[paymentMethod] || 0.00;
}

export async function createPayment(input: CreatePaymentInput) {
  const { bill_id, payment_date, payment_method, amount_paid, fee } = input;

  const calculatedFee = fee !== undefined ? parseFloat(fee as any) : getPaymentFee(payment_method);

  const newPayment = await prisma.payments.create({
    data: {
      bill_id: Number(bill_id),
      payment_date: new Date(payment_date),
      payment_method,
      amount_paid: parseFloat(amount_paid as any),
    } as any,
  });

  // Update the bill to mark as paid
  await prisma.bills.update({
    where: { id: Number(bill_id) },
    data: { is_paid: true },
  });

  return newPayment;
}

export async function getPayments() {
  const payments = await prisma.payments.findMany({
    include: {
      bill: true,
    },
    orderBy: {
      payment_date: 'desc',
    },
  });

  return payments;
}

export async function getPaymentsByUser(userId: number) {
  const payments = await prisma.payments.findMany({
    where: {
      bill: {
        user_id: userId,
      },
    },
    include: {
      bill: true,
    },
    orderBy: {
      payment_date: 'desc',
    },
  });

  return payments;
}
