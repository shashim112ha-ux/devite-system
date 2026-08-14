const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const today = new Date();
  today.setHours(0,0,0,0);
  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: today } }
  });
  console.log(JSON.stringify(orders.map(o => ({
    id: o.id,
    orderNumber: o.orderNumber,
    total: o.total,
    status: o.status,
    createdAt: o.createdAt
  })), null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
