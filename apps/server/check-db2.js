const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const prods = await prisma.product.findMany();
  console.log(prods.map(p => ({ id: p.id, name: p.name, categoryId: p.categoryId })));
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
