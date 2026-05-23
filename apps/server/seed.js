const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = [
    { name: 'أحمد المدير', phone: '33000001', email: 'admin@devite.com', password: 'admin123', role: 'ADMIN' },
    { name: 'محمد المدير التنفيذي', phone: '33000002', email: 'manager@devite.com', password: 'manager123', role: 'MANAGER' },
    { name: 'فاطمة الكاشير', phone: '33000003', email: 'cashier@devite.com', password: 'cashier123', role: 'CASHIER' },
    { name: 'علي الطباخ', phone: '33000004', email: 'kitchen@devite.com', password: 'kitchen123', role: 'KITCHEN' },
    { name: 'سارة الموظفة', phone: '33000005', email: 'staff@devite.com', password: 'staff123', role: 'STAFF' },
    { name: 'خالد المستثمر', phone: '33000006', email: 'investor@devite.com', password: 'investor123', role: 'INVESTOR' },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { phone: user.phone },
      update: { email: user.email, password: user.password, active: true },
      create: { ...user, salary: 300, hourlyRate: 2, active: true }
    });
    console.log('Created/Updated:', user.email);
  }

  const cat = await prisma.category.upsert({
    where: { name: 'المشروبات الباردة' },
    update: {},
    create: { name: 'المشروبات الباردة' }
  });

  const products = [
    { name: 'عصير برتقال طازج', price: 1.5, cost: 0.6, prepTime: 5, available: true },
    { name: 'سموذي فراولة', price: 2.0, cost: 0.8, prepTime: 7, available: true },
    { name: 'ليمون نعنع', price: 1.2, cost: 0.4, prepTime: 4, available: true },
    { name: 'مانجو كولادا', price: 2.5, cost: 1.0, prepTime: 8, available: true },
  ];

  for (const p of products) {
    try {
      await prisma.product.create({ data: { ...p, categoryId: cat.id } });
      console.log('Product created:', p.name);
    } catch (e) {
      console.log('Product exists:', p.name);
    }
  }

  try {
    await prisma.systemSetting.create({
      data: { storeName: 'Devite عربة', currency: 'د.ب', taxRate: 0, defaultPrepTime: 10 }
    });
  } catch(e) {
    console.log('Settings already exist');
  }

  console.log('✅ Seed complete!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
