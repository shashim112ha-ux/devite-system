const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findFirst({ where: { name: { contains: 'حسن جاسم' } }});
  console.log('User:', user);
  const att = await prisma.attendance.findMany({ where: { userId: user.id } });
  console.log('Attendance:', att);
}
main().finally(() => prisma.$disconnect());
