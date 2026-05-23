const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding DEVITE Luxury Cart System...');

  // 1. Create Admin
  await prisma.user.upsert({
    where: { phone: 'admin' },
    update: {},
    create: {
      name: 'المدير العام',
      phone: 'admin',
      password: 'admin123',
      role: 'ADMIN',
      jobDescription: 'مدير النظام وصاحب المشروع',
      salary: 500,
    },
  });

  // 2. Categories
  const categories = [
    { name: 'عصائر طازجة' },
    { name: 'قهوة مختصة' },
    { name: 'حلويات فاخرة' },
    { name: 'موهيتو منعش' },
    { name: 'وجبات خفيفة' }
  ];

  const createdCategories = [];
  for (const cat of categories) {
    const c = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat
    });
    createdCategories.push(c);
  }

  // 3. Inventory Items
  const inventoryItems = [
    { name: 'برتقال طازج', quantity: 100, unit: 'كجم', unitPrice: 0.5 },
    { name: 'فراولة طازجة', quantity: 50, unit: 'كجم', unitPrice: 1.2 },
    { name: 'حبوب قهوة إثيوبية', quantity: 20, unit: 'كجم', unitPrice: 8.5 },
    { name: 'حليب عضوي', quantity: 100, unit: 'لتر', unitPrice: 0.8 },
    { name: 'شوكولاتة بلجيكية', quantity: 30, unit: 'كجم', unitPrice: 4.5 },
    { name: 'أكواب ديفايت الفاخرة', quantity: 500, unit: 'قطعة', unitPrice: 0.1 },
    { name: 'نعناع طازج', quantity: 10, unit: 'كجم', unitPrice: 0.3 }
  ];

  const createdInventory = {};
  for (const item of inventoryItems) {
    const inv = await prisma.inventoryItem.upsert({
      where: { name: item.name },
      update: { quantity: item.quantity },
      create: item
    });
    createdInventory[item.name] = inv;
  }

  // 4. Products
  const products = [
    {
      name: 'عصير الهمبا الملكي',
      description: 'مانجو طازجة مع لمسة من الكريمة المخفوقة',
      price: 2.500,
      cost: 0.800,
      categoryId: createdCategories[0].id,
      ingredients: [
        { name: 'أكواب ديفايت الفاخرة', amount: 1 }
      ]
    },
    {
      name: 'سبانش لاتيه بارد',
      description: 'قهوة مختصة مع الحليب المكثف المحلى',
      price: 2.200,
      cost: 0.600,
      categoryId: createdCategories[1].id,
      ingredients: [
        { name: 'حبوب قهوة إثيوبية', amount: 0.02 },
        { name: 'حليب عضوي', amount: 0.2 },
        { name: 'أكواب ديفايت الفاخرة', amount: 1 }
      ]
    },
    {
      name: 'كيكة الزعفران',
      description: 'كيكة هشة مغطاة بصوص الزعفران الغني',
      price: 3.500,
      cost: 1.200,
      categoryId: createdCategories[2].id,
      ingredients: []
    },
    {
      name: 'موهيتو الفراولة',
      description: 'مزيج منعش من الفراولة والنعناع والليمون',
      price: 1.800,
      cost: 0.400,
      categoryId: createdCategories[3].id,
      ingredients: [
        { name: 'فراولة طازجة', amount: 0.1 },
        { name: 'نعناع طازج', amount: 0.01 },
        { name: 'أكواب ديفايت الفاخرة', amount: 1 }
      ]
    }
  ];

  for (const p of products) {
    const { ingredients, ...productData } = p;
    await prisma.product.create({
      data: {
        ...productData,
        ingredients: {
          create: ingredients.map(ing => ({
            inventoryItemId: createdInventory[ing.name].id,
            amountRequired: ing.amount
          }))
        }
      }
    });
  }

  // 5. Offers
  await prisma.offer.createMany({
    data: [
      {
        title: 'عرض الصيف المنعش',
        description: 'اشترِ أي عصير واحصل على الثاني بخصم 50%',
        price: 3.750,
        oldPrice: 5.000,
        discount: 25,
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'ساعة السعادة',
        description: 'خصومات تصل إلى 40% على جميع أنواع القهوة من 4م إلى 6م',
        price: 1.300,
        oldPrice: 2.200,
        discount: 40,
        endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      }
    ]
  });

  console.log('✅ Seeding complete! Database is now LUXURY ready.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
