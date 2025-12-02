import prisma from '../src/lib/prisma';

(async () => {
  const role = await prisma.roles.findFirst({ where: { name: 'Consumer' } });
  console.log('Consumer role id:', role?.id);
  await prisma.$disconnect();
})();