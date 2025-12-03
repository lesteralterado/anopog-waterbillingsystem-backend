const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkBills() {
  try {
    const bills = await prisma.bills.findMany();
    console.log('Bills in database:', bills.length);
    console.log(bills);
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBills();