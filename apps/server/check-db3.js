const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.product.findMany().then(prods => {
  console.log('Products:', JSON.stringify(prods.map(p => ({ id: p.id, name: p.name, categoryId: p.categoryId })), null, 2));
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
