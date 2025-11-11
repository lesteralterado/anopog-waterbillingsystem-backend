import { prisma } from '../lib/prisma';

type CreatePaymentInput = {
  bill_id: string | number;
  payment_date: string | Date;
  payment_method: string;
  amount_paid: string | number;
};

export async function createPayment(input: CreatePaymentInput) {
  const { bill_id, payment_date, payment_method, amount_paid } = input;

  const newPayment = await prisma.payments.create({
    data: {
      bill_id: BigInt(bill_id),
      payment_date: new Date(payment_date),
      payment_method,
      amount_paid: parseFloat(amount_paid as any),
    },
  });

  return newPayment;
}
