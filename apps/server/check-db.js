const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const cats = await prisma.category.findMany();
  console.log('Categories:', cats);
  const prods = await prisma.product.findMany();
  console.log('Products:', prods.map(p => ({ id: p.id, name: p.name, categoryId: p.categoryId })));
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
