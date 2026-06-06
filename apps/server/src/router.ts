import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { 
  router, 
  publicProcedure, 
  protectedProcedure, 
  adminProcedure, 
  managerProcedure, 
  cashierProcedure, 
  kitchenProcedure,
  staffProcedure,
  investorProcedure
} from './trpc';
import { io } from './index';
import { queueWhatsAppMessage, DEFAULT_TEMPLATES, generateShiftReportPDF, fillTemplate, getWhatsAppState, restartWhatsApp } from './services/whatsapp';

const JWT_SECRET = process.env.JWT_SECRET || 'devite_super_secret_key';

async function logAudit(prisma: any, userId: string, action: string, details: string) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        details
      }
    });
  } catch (e) {
    console.error('Failed to write audit log:', e);
  }
}

export const appRouter = router({
  health: publicProcedure.query(() => 'ok'),

  // --- المصادقة والصلاحيات (Auth Procedures) ---
  login: publicProcedure
    .input(z.object({ phone: z.string(), password: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const user = await ctx.prisma.user.findFirst({
        where: {
          OR: [
            { phone: input.phone },
            { email: input.phone }
          ]
        },
      });
      if (!user || !(await bcrypt.compare(input.password, user.password))) {
        throw new Error('بيانات الدخول غير صحيحة');
      }
      if (!user.active) {
        throw new Error('عذراً، هذا الحساب غير مفعل. راجع الإدارة.');
      }
      const token = jwt.sign(
        { id: user.id, name: user.name, role: user.role },
        JWT_SECRET,
        { expiresIn: '30d' }
      );
      return { token, user: { id: user.id, name: user.name, role: user.role } };
    }),

  // --- الأصناف والتصنيفات (POS & Product Procedures) ---
  getProducts: publicProcedure.query(async ({ ctx }) => {
    // Memory Cache implementation (15s TTL)
    const globalAny = global as any;
    if (globalAny.productsCache && (Date.now() - globalAny.productsCache.timestamp) < 15000) {
      return globalAny.productsCache.data;
    }

    const products = await ctx.prisma.product.findMany({
      include: { 
        category: true,
        ingredients: { include: { inventoryItem: true } },
        variants: { include: { ingredients: { include: { inventoryItem: true } } } }
      },
    });

    const result = products.map(product => {
      let autoCost = 0;
      let isStockAvailable = true;

      product.ingredients.forEach(ing => {
        if (ing.inventoryItem.quantity < ing.amountRequired) isStockAvailable = false;
        autoCost += (ing.amountRequired * ing.inventoryItem.unitPrice);
      });

      const processedVariants = product.variants.map(variant => {
        let varAutoCost = 0;
        let varStockAvailable = true;
        variant.ingredients.forEach(ing => {
          if (ing.inventoryItem.quantity < ing.amountRequired) varStockAvailable = false;
          varAutoCost += (ing.amountRequired * ing.inventoryItem.unitPrice);
        });
        return {
          ...variant,
          autoCost: variant.ingredients.length > 0 ? Math.round(varAutoCost * 1000) / 1000 : variant.autoCost,
          dynamicAvailable: variant.isAvailable && (variant.ingredients.length === 0 || varStockAvailable)
        };
      });

      // If a product has variants, its availability is dependent on if AT LEAST ONE variant is available.
      // If no variants, fallback to basic ingredients.
      const hasVariants = processedVariants.length > 0;
      const anyVariantAvailable = processedVariants.some(v => v.dynamicAvailable);
      
      return {
        ...product,
        variants: processedVariants,
        autoCost: Math.round(autoCost * 1000) / 1000,
        dynamicAvailable: product.available && (hasVariants ? anyVariantAvailable : (product.ingredients.length === 0 || isStockAvailable))
      };
    });

    globalAny.productsCache = { data: result, timestamp: Date.now() };
    return result;
  }),

  getCategories: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { createdAt: 'asc' }
    });
  }),

  // --- إدارة المنتجات والتصنيفات (Product & Category CRUD) ---
  createProduct: managerProcedure
    .input(z.object({
      name: z.string(),
      description: z.string().optional(),
      price: z.number(),
      cost: z.number(),
      prepTime: z.number().optional(),
      categoryId: z.string(),
      image: z.string().optional().nullable(),
      imageUrl: z.string().optional().nullable(),
      available: z.boolean().optional(),
      unavailableReason: z.string().optional().nullable(),
      sizes: z.array(z.string()).optional(),
      sugarLevels: z.array(z.string()).optional(),
      iceLevels: z.array(z.string()).optional(),
      ingredients: z.array(z.object({
        inventoryItemId: z.string(),
        amountRequired: z.number()
      })).optional(),
      variants: z.array(z.object({
        id: z.string().optional(),
        sizeName: z.string(),
        price: z.number(),
        prepTime: z.number().optional().nullable(),
        ingredients: z.array(z.object({
          inventoryItemId: z.string(),
          amountRequired: z.number()
        })).optional()
      })).optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const { ingredients, variants, ...productData } = input;
      const product = await ctx.prisma.product.create({
        data: {
          ...productData,
          ...(ingredients && ingredients.length > 0 ? {
            ingredients: { create: ingredients }
          } : {}),
          ...(variants && variants.length > 0 ? {
            variants: {
              create: variants.map(v => ({
                sizeName: v.sizeName,
                price: v.price,
                prepTime: v.prepTime || 5,
                ingredients: {
                  create: (v.ingredients || []).map(ing => ({
                    amountRequired: ing.amountRequired,
                    inventoryItem: { connect: { id: ing.inventoryItemId } }
                  }))
                }
              }))
            }
          } : {})
        } as any,
        include: { category: true, ingredients: { include: { inventoryItem: true } }, variants: { include: { ingredients: true } } }
      });
      await logAudit(ctx.prisma, ctx.user.id, 'CREATE_PRODUCT', `إضافة الصنف: ${product.name} بسعر ${product.price} د.ب`);
      return product;
    }),

  updateProduct: managerProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      price: z.number().optional(),
      cost: z.number().optional(),
      prepTime: z.number().optional(),
      categoryId: z.string().optional(),
      image: z.string().optional().nullable(),
      imageUrl: z.string().optional().nullable(),
      available: z.boolean().optional(),
      unavailableReason: z.string().optional().nullable(),
      ingredients: z.array(z.object({
        inventoryItemId: z.string(),
        amountRequired: z.number()
      })).optional(),
      variants: z.array(z.object({
        id: z.string().optional(),
        sizeName: z.string(),
        price: z.number(),
        prepTime: z.number().optional().nullable(),
        ingredients: z.array(z.object({
          inventoryItemId: z.string(),
          amountRequired: z.number()
        })).optional()
      })).optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ingredients, variants, ...data } = input;
      if (data.categoryId === "") delete data.categoryId; // Fix empty category ID issue
      
      const product = await ctx.prisma.$transaction(async (tx) => {
        if (ingredients) {
          await tx.productIngredient.deleteMany({ where: { productId: id } });
          if (ingredients.length > 0) {
            await tx.productIngredient.createMany({
              data: ingredients.map(ing => ({
                productId: id,
                inventoryItemId: ing.inventoryItemId,
                amountRequired: ing.amountRequired
              }))
            });
          }
        }
        
        if (variants) {
          // Delete existing variants and recreate them (cascade will delete ingredients)
          await tx.productVariant.deleteMany({ where: { productId: id } });
          if (variants.length > 0) {
            for (const v of variants) {
              await tx.productVariant.create({
                data: {
                  productId: id,
                  sizeName: v.sizeName,
                  price: v.price,
                  prepTime: v.prepTime || 5,
                  ingredients: {
                    create: (v.ingredients || []).map(ing => ({
                      amountRequired: ing.amountRequired,
                      inventoryItem: { connect: { id: ing.inventoryItemId } }
                    }))
                  }
                }
              });
            }
          }
        }

        return tx.product.update({
          where: { id },
          data,
          include: { category: true, ingredients: { include: { inventoryItem: true } }, variants: { include: { ingredients: { include: { inventoryItem: true } } } } }
        });
      }, {
        maxWait: 15000,
        timeout: 30000
      });

      await logAudit(ctx.prisma, ctx.user.id, 'UPDATE_PRODUCT', `تحديث الصنف: ${product.name}`);
      return product;
    }),

  deleteProduct: managerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.prisma.productIngredient.deleteMany({ where: { productId: input.id } });
      const product = await ctx.prisma.product.delete({ where: { id: input.id } });
      await logAudit(ctx.prisma, ctx.user.id, 'DELETE_PRODUCT', `حذف الصنف: ${product.name}`);
      return product;
    }),

  toggleProductAvailability: managerProcedure
    .input(z.object({ id: z.string(), available: z.boolean(), unavailableReason: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const product = await ctx.prisma.product.update({
        where: { id: input.id },
        data: { available: input.available, unavailableReason: input.unavailableReason }
      });
      await logAudit(ctx.prisma, ctx.user.id, 'TOGGLE_PRODUCT_AVAILABILITY', `تعديل توفر الصنف: ${product.name} إلى ${product.available ? 'متوفر' : 'غير متوفر'} - ${input.unavailableReason || 'بدون سبب'}`);
      return product;
    }),

  addCategory: managerProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const category = await ctx.prisma.category.create({ data: { name: input.name } });
      await logAudit(ctx.prisma, ctx.user.id, 'CREATE_CATEGORY', `إضافة تصنيف: ${category.name}`);
      return category;
    }),

  updateCategory: managerProcedure
    .input(z.object({ id: z.string(), name: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const category = await ctx.prisma.category.update({ where: { id: input.id }, data: { name: input.name } });
      await logAudit(ctx.prisma, ctx.user.id, 'UPDATE_CATEGORY', `تعديل تصنيف إلى: ${category.name}`);
      return category;
    }),

  deleteCategory: managerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const productCount = await ctx.prisma.product.count({ where: { categoryId: input.id } });
      if (productCount > 0) throw new Error('لا يمكن حذف تصنيف يحتوي على أصناف');
      const category = await ctx.prisma.category.delete({ where: { id: input.id } });
      await logAudit(ctx.prisma, ctx.user.id, 'DELETE_CATEGORY', `حذف تصنيف: ${category.name}`);
      return category;
    }),

  // --- العروض (Offers) ---
  getOffers: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.offer.findMany({ 
      where: { 
        active: true,
        endDate: { gte: new Date() }
      } 
    });
  }),

  getAllOffers: managerProcedure.query(async ({ ctx }) => {
    return ctx.prisma.offer.findMany();
  }),

  createOffer: managerProcedure
    .input(z.object({ title: z.string(), description: z.string().optional(), price: z.number(), oldPrice: z.number().optional(), discount: z.number().optional(), startDate: z.coerce.date().optional(), endDate: z.coerce.date(), type: z.string().optional(), imageUrl: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const offer = await ctx.prisma.offer.create({ data: input as any });
      await logAudit(ctx.prisma, ctx.user.id, 'CREATE_OFFER', `إنشاء عرض ترويجي: ${offer.title}`);
      return offer;
    }),

  updateOfferStatus: managerProcedure
    .input(z.object({ id: z.string(), active: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const offer = await ctx.prisma.offer.update({ where: { id: input.id }, data: { active: input.active } });
      await logAudit(ctx.prisma, ctx.user.id, 'UPDATE_OFFER_STATUS', `تعديل حالة العرض: ${offer.title} إلى ${offer.active ? 'نشط' : 'غير نشط'}`);
      return offer;
    }),

  // --- إدارة الطلبات (Order CRUD & Kitchen Live) ---
  getKitchenOrders: kitchenProcedure.query(async ({ ctx }) => {
    return ctx.prisma.order.findMany({
      where: { status: { in: ['NEW', 'PREPARING', 'READY'] } },
      include: { items: { include: { product: true } }, customer: true },
      orderBy: [
        { isUrgent: 'desc' },
        { isVIP: 'desc' },
        { createdAt: 'asc' }
      ]
    });
  }),

  updateOrderStatus: kitchenProcedure
    .input(z.object({ orderId: z.string(), status: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.prisma.$transaction(async (tx) => {
        const order = await tx.order.update({
          where: { id: input.orderId },
          data: { status: input.status },
          include: { items: { include: { product: true } }, customer: true }
        });
        
        const latestStep = await tx.orderTimelineStep.findFirst({
          where: { orderId: input.orderId },
          orderBy: { timestamp: 'desc' }
        });
        
        const now = new Date();
        const durationSeconds = latestStep 
          ? Math.round((now.getTime() - latestStep.timestamp.getTime()) / 1000)
          : 0;

        await tx.orderTimelineStep.create({
          data: {
            orderId: input.orderId,
            stage: input.status,
            staffId: ctx.user?.id,
            durationSeconds: durationSeconds
          }
        });

        if (input.status === 'CANCELLED') {
          const paymentType = order.paymentMethod === 'CASH' ? 'CASH' : 'CARD';
          const account = await tx.account.findFirst({
            where: { type: paymentType, isActive: true },
            orderBy: { createdAt: 'asc' }
          });
          
          if (account) {
             await tx.account.update({
                where: { id: account.id },
                data: { balance: { decrement: order.total } }
             });
          }

          const productIds = Array.from(new Set(order.items.map(i => i.productId)));
          const products = await tx.product.findMany({
            where: { id: { in: productIds } },
            include: { 
              ingredients: true,
              variants: { include: { ingredients: true } }
            }
          });
          const productMap = new Map(products.map(p => [p.id, p]));

          for (const item of order.items) {
            const product = productMap.get(item.productId);
            if (product) {
              const ingredientsToUse = item.variantId 
                ? (product.variants.find(v => v.id === item.variantId)?.ingredients || [])
                : product.ingredients;

              for (const ing of ingredientsToUse) {
                await tx.inventoryItem.update({
                  where: { id: ing.inventoryItemId },
                  data: { quantity: { increment: ing.amountRequired * item.quantity } }
                });
              }
            }
          }
        }
        
        await logAudit(tx, ctx.user.id, 'UPDATE_ORDER_STATUS', `تم تحديث حالة الطلب #${order.orderNumber} إلى ${order.status}`);
        io?.emit('order_status_updated', order);
        return order;
      }, {
        maxWait: 10000,
        timeout: 30000
      });
    }),

  createOrder: publicProcedure
    .input(z.object({
      cashierId: z.string().optional(),
      customerPhone: z.string().optional(),
      customerName: z.string().optional(),
      items: z.array(z.object({
        productId: z.string(),
        variantId: z.string().optional(),
        quantity: z.number(),
        price: z.number(),
        size: z.string().optional(),
        sugar: z.string().optional(),
        ice: z.string().optional(),
        notes: z.string().optional(),
      })),
      paymentMethod: z.string(),
      total: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
        return ctx.prisma.$transaction(async (tx) => {
          // Pre-fetch all needed products once to optimize transaction speed and avoid timeouts
          const productIds = Array.from(new Set(input.items.map(i => i.productId)));
          const products = await tx.product.findMany({
            where: { id: { in: productIds } },
            include: { 
              ingredients: { include: { inventoryItem: true } },
              variants: { include: { ingredients: { include: { inventoryItem: true } } } }
            }
          });
          const productMap = new Map(products.map(p => [p.id, p]));

          // 1. Check Inventory quantities first (fail-fast validation)
          for (const item of input.items) {
            const product = productMap.get(item.productId);
          if (product) {
            const ingredientsToUse = item.variantId 
              ? (product.variants.find(v => v.id === item.variantId)?.ingredients || [])
              : product.ingredients;

            for (const ing of ingredientsToUse) {
              const needed = ing.amountRequired * item.quantity;
              if (ing.inventoryItem.quantity < needed) {
                throw new TRPCError({ 
                  code: 'BAD_REQUEST', 
                  message: `مخزون غير كافٍ للمادة: ${ing.inventoryItem.name}. المتبقي: ${ing.inventoryItem.quantity} ${ing.inventoryItem.unit}` 
                });
              }
            }
          }
        }

        // 2. Estimate preparation time (Smart Prep Time Engine)
        const pendingOrders = await tx.order.count({
          where: { status: { in: ['NEW', 'PREPARING'] } }
        });
        
        let itemsPrepTime = 0;
        for (const item of input.items) {
          const prod = productMap.get(item.productId);
          if (prod) {
            const varTime = item.variantId ? prod.variants.find(v => v.id === item.variantId)?.prepTime : undefined;
            itemsPrepTime += (varTime || prod.prepTime || 5) * item.quantity;
          }
        }

        const kitchenStaff = await tx.user.count({ where: { role: 'KITCHEN', active: true } });
        const divisor = kitchenStaff > 0 ? kitchenStaff : 1;
        const estimatedTime = Math.max(5, Math.round((itemsPrepTime + (pendingOrders * 4)) / divisor));

        const lastOrder = await tx.order.findFirst({ orderBy: { orderNumber: 'desc' } });
        const nextOrderNumber = (lastOrder?.orderNumber || 0) + 1;

        // 3. Customer loyalty points calculation
        let customerId = undefined;
        if (input.customerPhone) {
          const customer = await tx.customer.upsert({
            where: { phone: input.customerPhone },
            update: { 
              points: { increment: Math.floor(input.total) },
              ...(input.customerName && input.customerName.trim() !== '' ? { name: input.customerName } : {})
            },
            create: {
              phone: input.customerPhone,
              name: (input.customerName && input.customerName.trim() !== '') ? input.customerName : 'زبون بدون اسم',
              points: Math.floor(input.total)
            }
          });
          customerId = customer.id;
        }

        let finalCashierId = input.cashierId;
        if (finalCashierId) {
          const userExists = await tx.user.findUnique({ where: { id: finalCashierId } });
          if (!userExists) {
            finalCashierId = undefined; // Nullify if invalid to prevent foreign key error
          }
        }

        // 4. Create Order
        const order = await tx.order.create({
          data: {
            orderNumber: nextOrderNumber,
            cashierId: finalCashierId,
            customerId: customerId,
            total: input.total,
            paymentMethod: input.paymentMethod,
            notes: input.notes,
            status: 'NEW',
            estimatedTime: estimatedTime,
            items: {
              create: input.items.map(item => ({
                productId: item.productId,
                variantId: item.variantId,
                quantity: item.quantity,
                price: item.price,
                size: item.size,
                sugar: item.sugar,
                ice: item.ice,
                notes: item.notes
              }))
            }
          },
          include: { items: { include: { product: true } }, customer: true }
        });

        // 4.5 Log timeline stage CREATED
        await tx.orderTimelineStep.create({
          data: {
            orderId: order.id,
            stage: 'CREATED',
            staffId: finalCashierId || (ctx.user ? ctx.user.id : undefined),
            durationSeconds: 0
          }
        });

        // 5. Decrement Inventory & Generate Warnings
        for (const item of input.items) {
          const product = productMap.get(item.productId);
          if (product) {
            const ingredientsToUse = item.variantId 
              ? (product.variants.find(v => v.id === item.variantId)?.ingredients || [])
              : product.ingredients;

            for (const ing of ingredientsToUse) {
              const updated = await tx.inventoryItem.update({
                where: { id: ing.inventoryItemId },
                data: { quantity: { decrement: ing.amountRequired * item.quantity } }
              });

              // Threshold alert
              if (updated.quantity <= updated.minThreshold) {
                const msg = `تنبيه المخزون: المادة (${updated.name}) وصلت للحد الأدنى المسموح به (${updated.quantity} ${updated.unit})`;
                await tx.notification.create({
                  data: {
                    type: 'WARNING',
                    message: msg
                  }
                });
                io?.emit('low_stock_warning', { id: updated.id, name: updated.name, quantity: updated.quantity, unit: updated.unit });
              }
            }
          }
        }

          // 6. Update Account Balances based on Payment Method
          const paymentType = input.paymentMethod === 'CASH' ? 'CASH' : 'CARD'; // Default others to CARD
          let account = await tx.account.findFirst({
            where: { type: paymentType, isActive: true },
            orderBy: { createdAt: 'asc' }
          });
          
          if (!account) {
             const accountName = paymentType === 'CASH' ? 'صندوق الكاش الافتراضي' : 'حساب البنك الافتراضي';
             account = await tx.account.create({
                data: {
                   name: accountName,
                   type: paymentType,
                   balance: 0,
                   isActive: true
                }
             });
          }
          
          await tx.account.update({
             where: { id: account.id },
             data: { balance: { increment: input.total } }
          });

          io?.emit('order_created', order);
          return order;
      }, {
        maxWait: 10000, // 10s
        timeout: 30000  // 30s
      });
    }),

  updateOrder: cashierProcedure
    .input(z.object({
      id: z.string(),
      notes: z.string().optional(),
      paymentMethod: z.string().optional(),
      status: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const order = await ctx.prisma.order.update({
        where: { id },
        data,
        include: { items: { include: { product: true } }, customer: true }
      });
      io?.emit('order_status_updated', order);
      await logAudit(ctx.prisma, ctx.user.id, 'UPDATE_ORDER', `تحديث الطلب #${order.orderNumber}`);
      return order;
    }),

  deleteOrder: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // First delete order items
      await ctx.prisma.orderItem.deleteMany({ where: { orderId: input.id } });
      const order = await ctx.prisma.order.delete({ where: { id: input.id } });
      await logAudit(ctx.prisma, ctx.user.id, 'DELETE_ORDER', `حذف الطلب #${order.orderNumber}`);
      return order;
    }),

  getCustomer: publicProcedure
    .input(z.object({ phone: z.string() }))
    .query(async ({ input, ctx }) => {
      return ctx.prisma.customer.findUnique({ where: { phone: input.phone } });
    }),

  // --- الإحصائيات المتقدمة والتقارير (Advanced Stats & Financial Engine) ---
  getAdvancedStats: publicProcedure.query(async ({ ctx }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const orders = await ctx.prisma.order.findMany({
      where: { createdAt: { gte: today } },
      include: { items: { include: { product: { include: { ingredients: { include: { inventoryItem: true } } } } } } }
    });
    const expenses = await ctx.prisma.expense.findMany({
      where: { date: { gte: today } }
    });
    
    const todayOrders = orders.filter(o => o.createdAt >= today);
    const sales = todayOrders.reduce((sum, o) => sum + o.total, 0);
    const ordersCount = todayOrders.length;
    
    // Accurate Profit (Sales - Cost - Expenses)
    const totalCostOfGoods = todayOrders.reduce((sum, order) => {
      return sum + order.items.reduce((itemSum, item) => {
        let autoCost = 0;
        if (item.product.ingredients && item.product.ingredients.length > 0) {
           autoCost = item.product.ingredients.reduce((c, ing) => c + (ing.amountRequired * ing.inventoryItem.unitPrice), 0);
        } else {
           autoCost = item.product.cost; // fallback to manual cost
        }
        return itemSum + (autoCost * item.quantity);
      }, 0);
    }, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const profit = sales - totalCostOfGoods - totalExpenses;

    const accounts = await ctx.prisma.account.findMany();
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

    // Peak Hour
    const hours = todayOrders.map(o => o.createdAt.getHours());
    const peakHour = hours.length > 0 ? hours.sort((a,b) => hours.filter(v => v===a).length - hours.filter(v => v===b).length).pop() : 12;

    // Top Product
    const productCounts: Record<string, number> = {};
    todayOrders.forEach(o => o.items.forEach(i => {
      productCounts[i.product.name] = (productCounts[i.product.name] || 0) + i.quantity;
    }));
    const topProduct = Object.keys(productCounts).length > 0 
      ? Object.keys(productCounts).reduce((a, b) => productCounts[a] > productCounts[b] ? a : b) 
      : 'لا يوجد';

    const readyOrders = todayOrders.filter(o => o.status === 'READY' || o.status === 'DELIVERED');
    const avgPrepTime = readyOrders.length > 0 
      ? Math.round(readyOrders.reduce((sum, o) => sum + (o.updatedAt.getTime() - o.createdAt.getTime()) / 60000, 0) / readyOrders.length)
      : 0;

    return {
      sales,
      ordersCount,
      profit,
      totalExpenses,
      totalBalance,
      avgPrepTime,
      preparingCount: todayOrders.filter(o => o.status === 'PREPARING').length,
      readyCount: todayOrders.filter(o => o.status === 'READY').length,
      topProduct,
      peakHour
    };
  }),

  getReportData: investorProcedure
    .input(z.object({ period: z.enum(['daily', 'weekly', 'monthly', 'quarterly']) }))
    .query(async ({ input, ctx }) => {
      const now = new Date();
      let startDate = new Date();
      if (input.period === 'daily') startDate.setDate(now.getDate() - 7);
      if (input.period === 'weekly') startDate.setDate(now.getDate() - 30);
      if (input.period === 'monthly') startDate.setMonth(now.getMonth() - 12);
      if (input.period === 'quarterly') startDate.setMonth(now.getMonth() - 36);

      const orders = await ctx.prisma.order.findMany({
        where: { createdAt: { gte: startDate } },
        include: { items: true }
      });

      const grouped: Record<string, number> = {};
      let totalProductsSold = 0;
      
      orders.forEach(o => {
        let key = '';
        if (input.period === 'daily') key = o.createdAt.toLocaleDateString('ar-BH');
        if (input.period === 'weekly') {
          const week = Math.ceil(o.createdAt.getDate() / 7);
          key = `الأسبوع ${week} - ${o.createdAt.toLocaleString('ar-BH', { month: 'short' })}`;
        }
        if (input.period === 'monthly') key = o.createdAt.toLocaleString('ar-BH', { month: 'long', year: 'numeric' });
        if (input.period === 'quarterly') {
          const q = Math.ceil((o.createdAt.getMonth() + 1) / 3);
          key = `الربع ${q} - ${o.createdAt.getFullYear()}`;
        }
        grouped[key] = (grouped[key] || 0) + o.total;
        totalProductsSold += o.items ? o.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
      });

      const chartData = Object.entries(grouped).map(([name, sales]) => ({ name, sales }));
      
      const sales = orders.reduce((sum, o) => sum + o.total, 0);
      const cash = orders.filter(o => o.paymentMethod === 'CASH').reduce((sum, o) => sum + o.total, 0);
      const card = orders.filter(o => o.paymentMethod === 'CARD').reduce((sum, o) => sum + o.total, 0);
      const benefit = orders.filter(o => o.paymentMethod === 'BENEFIT').reduce((sum, o) => sum + o.total, 0);
      const online = orders.filter(o => o.paymentMethod === 'ONLINE').reduce((sum, o) => sum + o.total, 0);
      
      const expensesList = await ctx.prisma.expense.findMany({
        where: { date: { gte: startDate } }
      });
      const expenses = expensesList.reduce((sum, e) => sum + e.amount, 0);
      
      const net = sales - expenses;
      const margin = sales > 0 ? (net / sales) * 100 : 0;
      
      const inventory = await ctx.prisma.inventoryItem.findMany();
      const lowStock = inventory.filter(i => i.quantity <= i.minThreshold);

      return {
        chartData,
        stats: {
          sales,
          expenses,
          net,
          cash,
          card,
          benefit,
          online,
          margin
        },
        lowStock
      };
    }),

  // --- المخزون (Smart Inventory) ---
  getInventory: staffProcedure.query(async ({ ctx }) => {
    return ctx.prisma.inventoryItem.findMany();
  }),

  addInventoryItem: staffProcedure
    .input(z.object({ name: z.string(), quantity: z.number(), unit: z.string(), minThreshold: z.number(), unitPrice: z.number(), supplier: z.string().nullable().optional(), category: z.string().nullable().optional() }))
    .mutation(async ({ input, ctx }) => {
      const item = await ctx.prisma.inventoryItem.create({ data: input as any });
      await logAudit(ctx.prisma, ctx.user.id, 'ADD_INVENTORY', `إضافة مادة مخزنية: ${item.name}`);
      return item;
    }),

  updateInventoryItem: staffProcedure
    .input(z.object({ 
      id: z.string(), 
      name: z.string().optional(), 
      quantity: z.number().optional(), 
      unit: z.string().optional(), 
      minThreshold: z.number().optional(), 
      unitPrice: z.number().optional(), 
      supplier: z.string().nullable().optional(), 
      category: z.string().nullable().optional(),
      expiryDate: z.string().nullable().optional(),
      reason: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, reason, expiryDate, ...data } = input;
      
      const oldItem = await ctx.prisma.inventoryItem.findUnique({ where: { id } });
      if (!oldItem) throw new TRPCError({ code: 'NOT_FOUND', message: "عنصر المخزون غير موجود" });

      const updateData: any = { ...data };
      if (expiryDate !== undefined) {
        if (expiryDate && expiryDate.trim() !== '') {
          const parsed = new Date(expiryDate);
          if (!isNaN(parsed.getTime())) updateData.expiryDate = parsed;
        } else {
          updateData.expiryDate = null;
        }
      }

      const item = await ctx.prisma.inventoryItem.update({
        where: { id },
        data: updateData
      });

      // Log Audit if quantity or price changed
      if (data.quantity !== undefined || data.unitPrice !== undefined) {
        await ctx.prisma.inventoryAuditLog.create({
          data: {
            inventoryItemId: id,
            userId: ctx.user.id,
            userName: ctx.user.name,
            oldQuantity: oldItem.quantity,
            newQuantity: item.quantity,
            oldPrice: oldItem.unitPrice,
            newPrice: item.unitPrice,
            reason: reason || "تعديل إداري",
          }
        });
      }

      // Recalculate product costs if price changed
      if (data.unitPrice !== undefined && data.unitPrice !== oldItem.unitPrice) {
        const ingredients = await ctx.prisma.productIngredient.findMany({
          where: { inventoryItemId: id },
          select: { productId: true }
        });
        
        const productIds = Array.from(new Set(ingredients.map(i => i.productId)));
        for (const pId of productIds) {
          const allIngs = await ctx.prisma.productIngredient.findMany({
            where: { productId: pId },
            include: { inventoryItem: true }
          });
          const newCost = allIngs.reduce((sum, ing) => sum + (ing.amountRequired * ing.inventoryItem.unitPrice), 0);
          await ctx.prisma.product.update({
            where: { id: pId },
            data: { cost: newCost }
          });
        }
      }

      await logAudit(ctx.prisma, ctx.user.id, 'UPDATE_INVENTORY_ITEM', `تحديث بيانات المادة: ${item.name}`);
      return item;
    }),

  getInventoryAuditLogs: adminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.inventoryAuditLog.findMany({ 
      orderBy: { createdAt: 'desc' },
      include: { inventoryItem: true }
    });
  }),

  deleteInventoryItem: managerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { id } = input;
      const item = await ctx.prisma.inventoryItem.findUnique({
        where: { id },
        include: { _count: { select: { productIngredients: true } } }
      });
      if (!item) throw new TRPCError({ code: 'NOT_FOUND', message: "العنصر غير موجود" });

      if (item._count.productIngredients > 0) {
        throw new TRPCError({ 
          code: 'BAD_REQUEST', 
          message: "لا يمكن حذف هذه المادة لارتباطها بمنتجات. يرجى تعديل الكمية لـ 0 أو إزالتها من مكونات المنتجات أولاً." 
        });
      }

      await ctx.prisma.inventoryItem.delete({ where: { id } });
      await logAudit(ctx.prisma, ctx.user.id, 'DELETE_INVENTORY', `حذف عنصر المخزون: ${item.name}`);
      return { success: true };
    }),

  reportDamagedItem: staffProcedure
    .input(z.object({
      inventoryItemId: z.string(),
      quantity: z.number().min(0.01),
      reason: z.string(),
      notes: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const item = await ctx.prisma.inventoryItem.findUnique({ where: { id: input.inventoryItemId } });
      if (!item) throw new TRPCError({ code: 'NOT_FOUND', message: "العنصر غير موجود" });

      if (item.quantity < input.quantity) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: "الكمية التالفة أكبر من الكمية المتوفرة في المخزون" });
      }

      // Deduct from inventory
      const updatedItem = await ctx.prisma.inventoryItem.update({
        where: { id: input.inventoryItemId },
        data: { quantity: { decrement: input.quantity } }
      });

      // Log audit
      await ctx.prisma.inventoryAuditLog.create({
        data: {
          inventoryItemId: item.id,
          userId: ctx.user.id,
          userName: ctx.user.name,
          oldQuantity: item.quantity,
          newQuantity: updatedItem.quantity,
          oldPrice: item.unitPrice,
          newPrice: item.unitPrice,
          reason: 'إتلاف: ' + input.reason + (input.notes ? ` - ${input.notes}` : '')
        }
      });

      // Record as a Loss/Expense automatically
      const lossCost = item.unitPrice * input.quantity;
      await ctx.prisma.expense.create({
        data: {
          category: 'تالف وخسائر',
          supplier: 'نظام المخزون',
          purpose: `إتلاف ${input.quantity} ${item.unit} من ${item.name} (${input.reason})`,
          quantity: input.quantity,
          unitPrice: item.unitPrice,
          amount: lossCost,
          paymentMethod: 'LOSS',
          recordedById: ctx.user.id,
          inventoryItemId: item.id,
        }
      });

      await logAudit(ctx.prisma, ctx.user.id, 'REPORT_DAMAGED', `تسجيل تالف: ${input.quantity} ${item.unit} من ${item.name}`);
      
      return updatedItem;
    }),

  updateInventoryStock: staffProcedure
    .input(z.object({ id: z.string(), quantityAdded: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const item = await ctx.prisma.inventoryItem.update({
        where: { id: input.id },
        data: { quantity: { increment: input.quantityAdded } }
      });
      await logAudit(ctx.prisma, ctx.user.id, 'UPDATE_INVENTORY', `تعديل مخزون ${item.name} بإضافة ${input.quantityAdded}`);
      return item;
    }),

  getStaff: staffProcedure.query(async ({ ctx }) => {
    return ctx.prisma.user.findMany({ 
      select: { 
        id: true, 
        name: true, 
        phone: true, 
        email: true,
        role: true, 
        salary: true, 
        hourlyRate: true, 
        employmentDate: true, 
        active: true,
        attendance: {
          orderBy: { checkIn: 'desc' },
          take: 1
        }
      } 
    });
  }),

  getStaffSalaries: adminProcedure.query(async ({ ctx }) => {
    const users = await ctx.prisma.user.findMany({
      include: { attendance: true }
    });
    
    return users.map(u => {
      let totalHours = 0;
      u.attendance.forEach(att => {
        if (att.checkIn && att.checkOut) {
          const diffMs = att.checkOut.getTime() - att.checkIn.getTime();
          totalHours += diffMs / (1000 * 60 * 60);
        }
      });
      totalHours = Math.round(totalHours * 100) / 100;

      const salaryPay = u.salary;
      const hourlyPay = totalHours * u.hourlyRate;
      const totalPay = salaryPay > 0 ? salaryPay : hourlyPay;

      return {
        id: u.id,
        name: u.name,
        hours: totalHours,
        totalPay: Math.round(totalPay * 100) / 100
      };
    });
  }),

  addStaff: adminProcedure
    .input(z.object({ name: z.string(), phone: z.string(), email: z.string().optional().nullable(), password: z.string(), role: z.string(), salary: z.number(), hourlyRate: z.number().optional(), active: z.boolean().optional() }))
    .mutation(async ({ input, ctx }) => {
      const hashedPassword = await bcrypt.hash(input.password, 10);
      const staff = await ctx.prisma.user.create({ data: { ...(input as any), password: hashedPassword } });
      await logAudit(ctx.prisma, ctx.user.id, 'ADD_STAFF', `إضافة موظف: ${staff.name} بدور ${staff.role}`);
      return staff;
    }),

  updateStaff: adminProcedure
    .input(z.object({ id: z.string(), name: z.string(), phone: z.string(), email: z.string().optional().nullable(), password: z.string().optional().nullable(), role: z.string(), salary: z.number(), hourlyRate: z.number().optional(), active: z.boolean().optional() }))
    .mutation(async ({ input, ctx }) => {
      const { id, password, ...data } = input;
      const updateData: any = { ...data };
      if (password && password.trim() !== '') {
        updateData.password = await bcrypt.hash(password, 10);
      }
      const staff = await ctx.prisma.user.update({
        where: { id },
        data: updateData
      });
      await logAudit(ctx.prisma, ctx.user.id, 'UPDATE_STAFF', `تعديل بيانات الموظف: ${staff.name}`);
      return staff;
    }),

  getAttendanceHistory: managerProcedure
    .input(z.object({ userId: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      return ctx.prisma.attendance.findMany({
        where: input.userId ? { userId: input.userId } : undefined,
        include: { user: true },
        orderBy: { checkIn: 'desc' }
      });
    }),

  adminAddAttendance: managerProcedure
    .input(z.object({ userId: z.string(), checkIn: z.date(), checkOut: z.date().optional().nullable(), reason: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const att = await ctx.prisma.attendance.create({ 
        data: {
          ...input,
          editedById: ctx.user.id
        } as any 
      });
      await logAudit(ctx.prisma, ctx.user.id, 'ADD_ATTENDANCE_MANUAL', `تسجيل حضور يدوي للموظف`);
      return att;
    }),

  editAttendance: managerProcedure
    .input(z.object({ id: z.string(), checkIn: z.date(), checkOut: z.date().optional().nullable(), reason: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const att = await ctx.prisma.attendance.update({
        where: { id },
        data: {
          ...data,
          editedById: ctx.user.id
        } as any
      });
      await logAudit(ctx.prisma, ctx.user.id, 'EDIT_ATTENDANCE', `تعديل سجل حضور للموظف`);
      return att;
    }),

  adminDeleteAttendance: managerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const att = await ctx.prisma.attendance.delete({ where: { id: input.id } });
      await logAudit(ctx.prisma, ctx.user.id, 'ADMIN_DELETE_ATTENDANCE', `حذف سجل حضور للموظف ID: ${att.userId}`);
      return att;
    }),

  getAttendance: managerProcedure.query(async ({ ctx }) => {
    return ctx.prisma.attendance.findMany({ include: { user: true }, orderBy: { checkIn: 'desc' } });
  }),

  checkIn: publicProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const att = await ctx.prisma.attendance.create({ data: { userId: input.userId } });
      io?.emit('attendance_event', { type: 'CHECK_IN', userId: input.userId });
      return att;
    }),

  checkOut: publicProcedure
    .input(z.object({ attendanceId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const att = await ctx.prisma.attendance.update({ where: { id: input.attendanceId }, data: { checkOut: new Date() } });
      io?.emit('attendance_event', { type: 'CHECK_OUT', userId: att.userId });
      return att;
    }),

  clockIn: publicProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const att = await ctx.prisma.attendance.create({ data: { userId: input.userId } });
      io?.emit('attendance_event', { type: 'CHECK_IN', userId: input.userId });
      return att;
    }),

  clockOut: publicProcedure
    .input(z.object({ attendanceId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const att = await ctx.prisma.attendance.update({ where: { id: input.attendanceId }, data: { checkOut: new Date() } });
      io?.emit('attendance_event', { type: 'CHECK_OUT', userId: att.userId });
      return att;
    }),

  // --- شؤون المستثمرين وتوزيع الأرباح (Investors Panel) ---
  getInvestors: adminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.investor.findMany({ orderBy: { createdAt: 'desc' } });
  }),

  getMyInvestorData: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== 'INVESTOR' && ctx.user.role !== 'INVESTOR_STAFF') {
      throw new Error('غير مصرح لك بالوصول إلى بيانات المستثمرين');
    }
    const fullUser = await ctx.prisma.user.findUnique({ where: { id: ctx.user.id } });
    if (!fullUser) throw new Error('المستخدم غير موجود');

    const investor = await ctx.prisma.investor.findFirst({
      where: {
        OR: [
          { phone: fullUser.phone },
          { email: fullUser.email || 'NO_EMAIL_MATCH' }
        ]
      }
    });
    if (!investor) throw new Error('لم يتم العثور على بيانات المستثمر المرتبطة بحسابك');
    
    const payouts = await ctx.prisma.investorPayout.findMany({
      where: { investorId: investor.id },
      orderBy: { date: 'desc' }
    });

    const totalCapitalData = await ctx.prisma.investor.aggregate({
      _sum: { capital: true }
    });

    return { 
      investor, 
      payouts,
      totalCapital: totalCapitalData._sum.capital || 0
    };
  }),

  addInvestor: adminProcedure
    .input(z.object({
      name: z.string(),
      phone: z.string(),
      email: z.string().optional(),
      capital: z.number(),
      sharePercentage: z.number(),
      notes: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const investor = await ctx.prisma.investor.create({ data: { ...input, sharePercentage: 0 } as any });
      
      // Create user account for investor automatically
      const existingUser = await ctx.prisma.user.findUnique({ where: { phone: input.phone }});
      if (!existingUser) {
        const hashedPassword = await bcrypt.hash(input.phone, 10);
        await ctx.prisma.user.create({
          data: {
            name: input.name,
            phone: input.phone,
            email: input.email || undefined,
            password: hashedPassword, // Default password is phone number (hashed)
            role: 'INVESTOR'
          }
        });
      } else {
        // If the user already exists (e.g. employee), upgrade their role to INVESTOR_STAFF
        const role = existingUser.role as any;
        if (role !== 'ADMIN' && role !== 'MANAGER' && role !== 'INVESTOR') {
          await ctx.prisma.user.update({
            where: { id: existingUser.id },
            data: { role: 'INVESTOR_STAFF' }
          });
        } else if (role === 'STAFF_INVESTOR' || role === 'INVESTOR_STAFF') {
           // Do nothing
        }
      }

      // Recalculate percentages
      const allInvestors = await ctx.prisma.investor.findMany({ where: { isActive: true } });
      const totalCapital = allInvestors.reduce((sum: number, inv: any) => sum + inv.capital, 0);
      if (totalCapital > 0) {
         for (const inv of allInvestors) {
            const pct = (inv.capital / totalCapital) * 100;
            await ctx.prisma.investor.update({ where: { id: inv.id }, data: { sharePercentage: Math.round(pct * 100) / 100 } });
         }
      }

      await logAudit(ctx.prisma, ctx.user.id, 'ADD_INVESTOR', `إضافة مستثمر: ${investor.name} برأس مال ${investor.capital} د.ب`);
      return investor;
    }),

  updateInvestor: adminProcedure
    .input(z.object({
      id: z.string(),
      name: z.string(),
      phone: z.string(),
      email: z.string().optional(),
      capital: z.number(),
      sharePercentage: z.number(),
      isActive: z.boolean().optional(),
      notes: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, sharePercentage, ...data } = input;
      const investor = await ctx.prisma.investor.update({
        where: { id },
        data: data as any
      });
      
      // Recalculate percentages
      const allInvestors = await ctx.prisma.investor.findMany({ where: { isActive: true } });
      const totalCapital = allInvestors.reduce((sum: number, inv: any) => sum + inv.capital, 0);
      if (totalCapital > 0) {
         for (const inv of allInvestors) {
            const pct = (inv.capital / totalCapital) * 100;
            await ctx.prisma.investor.update({ where: { id: inv.id }, data: { sharePercentage: Math.round(pct * 100) / 100 } });
         }
      } else {
         for (const inv of allInvestors) {
            await ctx.prisma.investor.update({ where: { id: inv.id }, data: { sharePercentage: 0 } });
         }
      }

      await logAudit(ctx.prisma, ctx.user.id, 'UPDATE_INVESTOR', `تعديل بيانات مستثمر: ${investor.name}`);
      return investor;
    }),

  withdrawInvestorCapital: adminProcedure
    .input(z.object({ id: z.string(), amount: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const investor = await ctx.prisma.investor.update({
        where: { id: input.id },
        data: { totalWithdrawn: { increment: input.amount } }
      });
      await logAudit(ctx.prisma, ctx.user.id, 'INVESTOR_WITHDRAW', `سحب أرباح للمستثمر ${investor.name} بقيمة ${input.amount} د.ب`);
      return investor;
    }),

  distributeInvestorProfit: adminProcedure
    .input(z.object({ amountToDistribute: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const investors = await ctx.prisma.investor.findMany({ where: { isActive: true } });
      const totalPercentage = investors.reduce((sum, inv) => sum + inv.sharePercentage, 0);
      if (totalPercentage === 0) throw new Error('لا يوجد مستثمرون مسجلون لتوزيع الأرباح');
      
      const distribution = await ctx.prisma.$transaction(async (tx) => {
        const results = [];
        for (const inv of investors) {
          const shareAmount = (inv.sharePercentage / 100) * input.amountToDistribute;
          await tx.investor.update({
            where: { id: inv.id },
            data: { totalWithdrawn: { increment: shareAmount } }
          });
          results.push({ name: inv.name, share: shareAmount });
        }
        return results;
      });

      await logAudit(ctx.prisma, ctx.user.id, 'PROFIT_DISTRIBUTION', `توزيع أرباح إجمالي بقيمة ${input.amountToDistribute} د.ب على المستثمرين`);
      return distribution;
    }),

  distributeProfitWithDeductions: adminProcedure
    .input(z.object({
      netProfit: z.number(),
      devDeduction: z.number(),
      maintDeduction: z.number(),
      emergencyDeduction: z.number(),
      stockDeduction: z.number(),
      marketingDeduction: z.number()
    }))
    .mutation(async ({ input, ctx }) => {
      const totalDeductions = input.devDeduction + input.maintDeduction + input.emergencyDeduction + input.stockDeduction + input.marketingDeduction;
      const distributableProfit = input.netProfit - totalDeductions;
      
      const investors = await ctx.prisma.investor.findMany({ where: { isActive: true } });
      const totalPercentage = investors.reduce((sum, inv) => sum + inv.sharePercentage, 0);
      if (totalPercentage === 0) throw new Error('لا يوجد مستثمرون نشطون لتوزيع الأرباح');

      return ctx.prisma.$transaction(async (tx) => {
        const distribution = await tx.profitDistribution.create({
          data: {
            netProfit: input.netProfit,
            devDeduction: input.devDeduction,
            maintDeduction: input.maintDeduction,
            emergencyDeduction: input.emergencyDeduction,
            stockDeduction: input.stockDeduction,
            marketingDeduction: input.marketingDeduction,
            totalDeductions,
            distributableProfit
          }
        });

        for (const inv of investors) {
          const netProfitShare = input.netProfit * (inv.sharePercentage / 100);
          const deductionsShare = totalDeductions * (inv.sharePercentage / 100);
          const amountPaid = distributableProfit * (inv.sharePercentage / 100);

          await tx.investorPayout.create({
            data: {
              distributionId: distribution.id,
              investorId: inv.id,
              investorName: inv.name,
              capitalShare: inv.capital,
              sharePercentage: inv.sharePercentage,
              netProfitShare,
              deductionsShare,
              amountPaid,
              growthRate: 5.0
            }
          });

          await tx.investor.update({
            where: { id: inv.id },
            data: { totalWithdrawn: { increment: amountPaid } }
          });
        }

        await logAudit(tx, ctx.user.id, 'PROFIT_DISTRIBUTION_WITH_DEDUCTIONS', `توزيع أرباح بقيمة ${input.netProfit} د.ب مع استقطاعات ${totalDeductions} د.ب`);
        return distribution;
      });
    }),

  getInvestorPayouts: publicProcedure
    .input(z.object({ investorId: z.string() }))
    .query(async ({ input, ctx }) => {
      return ctx.prisma.investorPayout.findMany({
        where: { investorId: input.investorId },
        include: { distribution: true },
        orderBy: { date: 'desc' }
      });
    }),

  getProfitDistributionHistory: adminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.profitDistribution.findMany({
      include: { payouts: true },
      orderBy: { date: 'desc' }
    });
  }),

  // --- Payroll Engine ---
  getPayrollList: managerProcedure
    .input(z.object({ userId: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      return ctx.prisma.payroll.findMany({
        where: input.userId ? { userId: input.userId } : undefined,
        include: { user: true },
        orderBy: { startDate: 'desc' }
      });
    }),

  calculatePayrollForPeriod: managerProcedure
    .input(z.object({ startDate: z.date(), endDate: z.date() }))
    .mutation(async ({ input, ctx }) => {
      const staff = await ctx.prisma.user.findMany({
        where: { active: true },
        include: { attendance: true }
      });

      const dayInMs = 24 * 60 * 60 * 1000;
      const totalPeriodDays = Math.max(1, Math.round((input.endDate.getTime() - input.startDate.getTime()) / dayInMs) + 1);

      const payrolls = [];

      for (const u of staff) {
        // Filter attendance records in period
        const periodAttendance = u.attendance.filter(att => 
          att.checkIn >= input.startDate && att.checkIn <= input.endDate
        );

        // Presence Days
        const presenceDates = new Set(periodAttendance.map(att => 
          att.checkIn.toDateString()
        ));
        const presenceDays = presenceDates.size;
        const absenceDays = Math.max(0, totalPeriodDays - presenceDays);

        // Hours calculation
        let workHours = 0;
        let overtimeHours = 0;
        let delayHours = 0;

        periodAttendance.forEach(att => {
          if (att.checkIn) {
            // Delay calculation (past 9:00 AM)
            const checkInHour = att.checkIn.getHours() + att.checkIn.getMinutes() / 60;
            if (checkInHour > 9.0) {
              delayHours += (checkInHour - 9.0);
            }

            if (att.checkOut) {
              const diffHours = (att.checkOut.getTime() - att.checkIn.getTime()) / 3600000;
              workHours += diffHours;
              if (diffHours > 8.0) {
                overtimeHours += (diffHours - 8.0);
              }
            }
          }
        });

        // Calculations
        const hourlyRate = u.hourlyRate || (u.salary / 240); // fallback if salary is fixed
        const basicSalary = workHours * hourlyRate;
        const overtimePay = overtimeHours * hourlyRate * 1.5;
        const netSalary = basicSalary + overtimePay;

        // Check if there is already a DRAFT record for this user in this period
        const existing = await ctx.prisma.payroll.findFirst({
          where: {
            userId: u.id,
            startDate: input.startDate,
            endDate: input.endDate,
            status: 'DRAFT'
          }
        });

        let pr;
        if (existing) {
          pr = await ctx.prisma.payroll.update({
            where: { id: existing.id },
            data: {
              presenceDays,
              absenceDays,
              workHours,
              overtimeHours,
              delayHours,
              basicSalary,
              overtimePay,
              netSalary
            }
          });
        } else {
          pr = await ctx.prisma.payroll.create({
            data: {
              userId: u.id,
              startDate: input.startDate,
              endDate: input.endDate,
              presenceDays,
              absenceDays,
              workHours,
              overtimeHours,
              delayHours,
              basicSalary,
              overtimePay,
              netSalary,
              status: 'DRAFT'
            }
          });
        }
        payrolls.push(pr);
      }

      await logAudit(ctx.prisma, ctx.user.id, 'CALCULATE_PAYROLL', `احتساب رواتب الموظفين للفترة من ${input.startDate.toLocaleDateString('ar-BH')} إلى ${input.endDate.toLocaleDateString('ar-BH')}`);
      return payrolls;
    }),

  updatePayrollDraft: managerProcedure
    .input(z.object({
      id: z.string(),
      bonuses: z.number().optional(),
      deductions: z.number().optional(),
      advances: z.number().optional(),
      notes: z.string().optional(),
      editReason: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const existing = await ctx.prisma.payroll.findUnique({
        where: { id: input.id }
      });
      if (!existing) throw new Error('السجل غير موجود');
      if (existing.status !== 'DRAFT' && ctx.user.role !== 'ADMIN') {
        throw new Error('لا يمكن تعديل الرواتب المعتمدة إلا بصلاحيات المدير');
      }

      const bonuses = input.bonuses ?? existing.bonuses;
      const manualDeductions = input.deductions ?? existing.manualDeductions;
      const advances = input.advances ?? existing.advances;
      const netSalary = existing.basicSalary + existing.overtimePay + bonuses - existing.deductions - manualDeductions - advances;

      return ctx.prisma.payroll.update({
        where: { id: input.id },
        data: {
          bonuses,
          manualDeductions,
          advances,
          netSalary,
          notes: input.notes ?? existing.notes
        }
      });
    }),

  approvePayroll: managerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const payroll = await ctx.prisma.payroll.update({
        where: { id: input.id },
        data: { status: 'APPROVED', approvedBy: ctx.user.name }
      });
      await logAudit(ctx.prisma, ctx.user.id, 'APPROVE_PAYROLL', `اعتماد راتب الموظف ID: ${payroll.userId}`);
      return payroll;
    }),

  paySalary: managerProcedure
    .input(z.object({ id: z.string(), accountId: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const payroll = await ctx.prisma.payroll.update({
        where: { id: input.id },
        data: { status: 'PAID', paymentDate: new Date() }
      });
      // Automatically record as an expense
      const user = await ctx.prisma.user.findUnique({ where: { id: payroll.userId } });
      
      let accountName = 'الخزينة الرئيسية';
      if (input.accountId) {
         const acc = await ctx.prisma.account.update({
            where: { id: input.accountId },
            data: { balance: { decrement: payroll.netSalary } }
         });
         accountName = acc.name;
      }

      await ctx.prisma.expense.create({
        data: {
          category: 'رواتب',
          amount: payroll.netSalary,
          description: `راتب الموظف ${user?.name || ''} للفترة من ${payroll.startDate.toLocaleDateString('ar-BH')} إلى ${payroll.endDate.toLocaleDateString('ar-BH')}`,
          purpose: 'رواتب موظفين',
          quantity: 1,
          unitPrice: payroll.netSalary,
          paymentMethod: 'CASH',
          accountPaidFrom: accountName,
          accountId: input.accountId || null,
          recordedById: ctx.user.id
        }
      });
      await logAudit(ctx.prisma, ctx.user.id, 'PAY_SALARY', `تسجيل دفع الراتب للموظف ${user?.name || ''} بقيمة ${payroll.netSalary} د.ب من ${accountName}`);
      return payroll;
    }),

  // --- End of Shift Checklist & ShiftReport ---
  submitShiftReport: protectedProcedure  // متاح لجميع الموظفين بجميع الأدوار
    .input(z.object({
      cashierId: z.string(),
      dailyIncome: z.number(),
      expenses: z.number(),
      losses: z.number(),
      cashAmount: z.number(),
      cardAmount: z.number(),
      mostConsumedMaterial: z.string().optional(),
      notes: z.string().optional(),
      // Checklist
      cleanlinessInternal: z.boolean(),
      cleanlinessExternal: z.boolean(),
      waterInternal: z.number(),
      waterExternal: z.number(),
      petrolQuantity: z.number(),
      gasQuantity: z.number(),
      electricityStatus: z.boolean(),
      fridgeStatus: z.boolean(),
      blenderStatus: z.boolean(),
      iceMachineStatus: z.boolean(),
      cupsQuantity: z.number(),
      lidsQuantity: z.number(),
      napkinsQuantity: z.number(),
      glovesQuantity: z.number(),
      masksQuantity: z.number(),
      bagsQuantity: z.number(),
      cleaningToolsStatus: z.boolean(),
      // Attendance & Stats
      presentStaff: z.string(),
      absentStaff: z.string(),
      lateStaff: z.string(),
      ordersCount: z.number(),
      avgPrepTime: z.number(),
      fastestOrderTime: z.number(),
      slowestOrderTime: z.number(),
      delayedOrdersCount: z.number(),
      cancelledOrdersCount: z.number()
    }))
    .mutation(async ({ input, ctx }) => {
      const netProfit = input.dailyIncome - input.expenses - input.losses;
      const difference = (input.cashAmount + input.cardAmount) - input.dailyIncome;

      const report = await ctx.prisma.shiftReport.create({
        data: {
          ...input,
          profit: input.dailyIncome,
          netProfit,
          difference
        } as any
      });
      await logAudit(ctx.prisma, ctx.user.id, 'SUBMIT_SHIFT_REPORT', `تسجيل تقرير نهاية الدوام لليوم بمدخول ${input.dailyIncome} د.ب`);
      return report;
    }),

    sendShiftReportWhatsApp: managerProcedure
      .input(z.object({ id: z.string(), phone: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const report = await ctx.prisma.shiftReport.findUnique({
          where: { id: input.id },
          include: { cashier: true }
        });
        if (!report) throw new Error('التقرير غير موجود');

        // Generate PDF
        const pdfBuffer = await generateShiftReportPDF(report);

        // Fill Template
        const template = DEFAULT_TEMPLATES['SHIFT_REPORT'];
        const body = fillTemplate(template.body, {
          shiftName: new Date(report.date).toLocaleDateString('ar-BH'),
          managerName: report.cashier?.name || 'غير معروف',
          cashTotal: report.cashAmount.toFixed(3),
          onlineTotal: report.cardAmount.toFixed(3),
          expenses: report.expenses.toFixed(3),
          netProfit: report.netProfit.toFixed(3),
          cleanliness: report.cleanlinessInternal ? 'ممتاز' : 'يحتاج انتباه'
        });

        // Queue message with PDF (using the base64 string or we can send it directly since queueWhatsAppMessage doesn't store PDFs in DB in our stub)
        // Since we didn't add PDF buffer to the DB, we can send it directly right here!
        const { sendWhatsAppMessage } = require('./services/whatsapp');
        const result = await sendWhatsAppMessage(input.phone, body, pdfBuffer, `Shift_Report_${report.id}.pdf`);
        
        if (!result.success) throw new Error(result.error);
        return { success: true };
      }),

  getShiftReports: managerProcedure.query(async ({ ctx }) => {
    return ctx.prisma.shiftReport.findMany({
      include: { cashier: true },
      orderBy: { date: 'desc' }
    });
    }),

  getTodayShiftStats: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const orders = await ctx.prisma.order.findMany({
      where: {
        createdAt: { gte: today },
        status: { not: 'CANCELLED' } // Don't count cancelled
      }
    });

    const expenses = await ctx.prisma.expense.findMany({
      where: {
        date: { gte: today }
      }
    });

    const dailyIncome = orders.reduce((sum, o) => sum + o.total, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    
    // Default to card/cash logic if paymentMethod exists
    const cashAmount = orders.filter(o => o.paymentMethod === 'CASH').reduce((sum, o) => sum + o.total, 0);
    const cardAmount = orders.filter(o => o.paymentMethod !== 'CASH').reduce((sum, o) => sum + o.total, 0);

    return {
      dailyIncome,
      expenses: totalExpenses,
      ordersCount: orders.length,
      cashAmount,
      cardAmount
    };
  }),

  approveShiftReport: managerProcedure
    .input(z.object({ id: z.string(), status: z.enum(['APPROVED', 'REJECTED']), managerNotes: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const report = await ctx.prisma.shiftReport.update({
        where: { id: input.id },
        data: {
          status: input.status,
          approvedBy: ctx.user.name,
          managerNotes: input.managerNotes
        }
      });
      await logAudit(ctx.prisma, ctx.user.id, 'APPROVE_SHIFT_REPORT', `اعتماد تقرير نهاية الشفت ID: ${report.id} بحالة ${input.status}`);
      return report;
    }),

  // --- Shift Schedules (جدول المناوبات) ---
  getShiftSchedules: protectedProcedure
    .input(z.object({ startDate: z.string().optional(), endDate: z.string().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const whereClause: any = {};
      if (input?.startDate && input?.endDate) {
        whereClause.date = {
          gte: new Date(input.startDate),
          lte: new Date(input.endDate)
        };
      }
      return ctx.prisma.shiftSchedule.findMany({
        where: whereClause,
        include: { user: { select: { name: true, role: true } } },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
      });
    }),

  deleteShiftSchedule: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Allow managers/admins to delete
      const user = ctx.user as any;
      if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
        throw new Error('UNAUTHORIZED');
      }
      return ctx.prisma.shiftSchedule.delete({ where: { id: input.id } });
    }),

  requestShift: protectedProcedure
    .input(z.object({
      date: z.string(),
      shiftName: z.string(),
      startTime: z.string(),
      endTime: z.string(),
      notes: z.string().optional(),
      userId: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const targetUserId = (ctx.user.role === 'ADMIN' || ctx.user.role === 'MANAGER') && input.userId 
                           ? input.userId 
                           : ctx.user.id;
      const targetUser = await ctx.prisma.user.findUnique({ where: { id: targetUserId } });
      if (!targetUser) throw new Error('الموظف غير موجود');

      const shiftDate = new Date(input.date);
      shiftDate.setHours(0,0,0,0);
      const startT = new Date(input.startTime);
      const endT = new Date(input.endTime);

      // Overlap check
      const overlaps = await ctx.prisma.shiftSchedule.findMany({
        where: {
          userId: targetUserId,
          date: shiftDate,
          status: { in: ['PENDING', 'APPROVED'] }
        }
      });
      
      for (const shift of overlaps) {
        if ((startT >= shift.startTime && startT < shift.endTime) ||
            (endT > shift.startTime && endT <= shift.endTime) ||
            (startT <= shift.startTime && endT >= shift.endTime) ||
            (startT <= shift.startTime && endT >= shift.endTime)) {
          throw new Error(`يوجد تعارض مع مناوبة أخرى لهذا الموظف: ${shift.shiftName}`);
        }
      }

      const isManager = ctx.user.role === 'ADMIN' || ctx.user.role === 'MANAGER';
      const status = isManager ? 'APPROVED' : 'PENDING';

      const shift = await ctx.prisma.shiftSchedule.create({
        data: {
          userId: targetUserId,
          date: shiftDate,
          shiftName: input.shiftName,
          startTime: startT,
          endTime: endT,
          role: targetUser.role,
          status,
          createdBy: ctx.user.name,
          notes: input.notes
        }
      });
      await logAudit(ctx.prisma, ctx.user.id, 'REQUEST_SHIFT', `إنشاء/طلب مناوبة للموظف ${targetUser.name} بتاريخ ${input.date}`);
      return shift;
    }),

  updateShiftStatus: managerProcedure
    .input(z.object({ id: z.string(), status: z.enum(['APPROVED', 'REJECTED']) }))
    .mutation(async ({ input, ctx }) => {
      const shift = await ctx.prisma.shiftSchedule.update({
        where: { id: input.id },
        data: { status: input.status }
      });
      await logAudit(ctx.prisma, ctx.user.id, 'UPDATE_SHIFT_STATUS', `تغيير حالة مناوبة ID: ${shift.id} إلى ${input.status}`);
      return shift;
    }),


  // --- Expenses Detailed ---
  createDetailedExpense: staffProcedure
    .input(z.object({
      category: z.string(),
      amount: z.number(),
      description: z.string().optional(),
      supplier: z.string().optional(),
      receiptUrl: z.string().optional(),
      purpose: z.string().optional(),
      quantity: z.number().optional(),
      unitPrice: z.number().optional(),
      paymentMethod: z.string().optional(),
      accountPaidFrom: z.string().optional(),
      accountId: z.string().optional().nullable(),
      inventoryItemId: z.string().optional().nullable()
    }))
    .mutation(async ({ input, ctx }) => {
      const qty = input.quantity ?? 1;
      const price = input.unitPrice ?? input.amount;
      const finalAmount = qty * price;

      const exp = await ctx.prisma.$transaction(async (tx) => {
        const createdExp = await tx.expense.create({
          data: {
            category: input.category,
            amount: finalAmount,
            description: input.description,
            supplier: input.supplier,
            receiptUrl: input.receiptUrl,
            purpose: input.purpose,
            quantity: qty,
            unitPrice: price,
            paymentMethod: input.paymentMethod || 'CASH',
            accountPaidFrom: input.accountPaidFrom || 'الخزينة الرئيسية',
            accountId: input.accountId,
            inventoryItemId: input.inventoryItemId,
            recordedById: ctx.user?.id
          }
        });

        if (input.accountId) {
          await tx.account.update({
            where: { id: input.accountId },
            data: { balance: { decrement: finalAmount } }
          });
        }

        if (input.inventoryItemId) {
          await tx.inventoryItem.update({
            where: { id: input.inventoryItemId },
            data: { 
              quantity: { increment: qty },
              unitPrice: price
            }
          });
          await tx.purchaseRecord.create({
            data: {
              inventoryItemId: input.inventoryItemId,
              quantity: qty,
              cost: finalAmount,
              supplier: input.supplier
            }
          });
        }
        
        return createdExp;
      });

      await logAudit(ctx.prisma, ctx.user.id, 'CREATE_EXPENSE', `تسجيل مصروف ${exp.category} بقيمة ${exp.amount} د.ب`);
      return exp;
    }),

  getDetailedExpenses: staffProcedure
    .input(z.object({
      filterType: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional()
    }).optional())
    .query(async ({ input, ctx }) => {
      let dateFilter: any = undefined;
      
      if (input?.filterType && input.filterType !== 'all') {
        const now = new Date();
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        
        if (input.filterType === 'daily') {
          // already set to today
        } else if (input.filterType === 'weekly') {
          start.setDate(now.getDate() - now.getDay());
        } else if (input.filterType === 'monthly') {
          start.setDate(1);
        } else if (input.filterType === 'custom' && input.startDate && input.endDate) {
          start.setTime(new Date(input.startDate).getTime());
          end.setTime(new Date(input.endDate).getTime());
          end.setHours(23, 59, 59, 999);
        }
        
        dateFilter = { gte: start, lte: end };
      }

      return ctx.prisma.expense.findMany({
        where: dateFilter ? { date: dateFilter } : undefined,
        include: { recordedBy: { select: { name: true } } },
        orderBy: { date: 'desc' }
      });
    }),

  getExpenseAnalytics: staffProcedure
    .input(z.object({
      filterType: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional()
    }).optional())
    .query(async ({ input, ctx }) => {
      let dateFilter: any = undefined;
      
      if (input?.filterType && input.filterType !== 'all') {
        const now = new Date();
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        
        if (input.filterType === 'daily') {
          // already set to today
        } else if (input.filterType === 'weekly') {
          start.setDate(now.getDate() - now.getDay());
        } else if (input.filterType === 'monthly') {
          start.setDate(1);
        } else if (input.filterType === 'custom' && input.startDate && input.endDate) {
          start.setTime(new Date(input.startDate).getTime());
          end.setTime(new Date(input.endDate).getTime());
          end.setHours(23, 59, 59, 999);
        }
        
        dateFilter = { gte: start, lte: end };
      }

      const expenses = await ctx.prisma.expense.findMany({
        where: dateFilter ? { date: dateFilter } : undefined
      });
      const total = expenses.reduce((sum, e) => sum + e.amount, 0);
      const count = expenses.length;

      // Group by category
      const categoryGroup: Record<string, number> = {};
      expenses.forEach(e => {
        categoryGroup[e.category] = (categoryGroup[e.category] || 0) + e.amount;
      });

      const categoryStats = Object.entries(categoryGroup).map(([name, value]) => ({
        name,
        value,
        percentage: total > 0 ? Math.round((value / total) * 100) : 0
      }));

      // Find highest expense
      let highest = null;
      if (expenses.length > 0) {
        highest = expenses.reduce((prev, curr) => prev.amount > curr.amount ? prev : curr);
      }

      // Top supplier
      const suppliers: Record<string, number> = {};
      expenses.forEach(e => {
        if (e.supplier) {
          suppliers[e.supplier] = (suppliers[e.supplier] || 0) + e.amount;
        }
      });
      const topSupplier = Object.keys(suppliers).length > 0
        ? Object.keys(suppliers).reduce((a, b) => suppliers[a] > suppliers[b] ? a : b)
        : 'غير متوفر';

      return {
        total,
        count,
        categoryStats,
        highestExpense: highest,
        topSupplier,
        recommendations: [
          total > 1000 ? "مستوى المصاريف مرتفع، يوصى بتقليل شراء الأدوات الفردية والشراء بالجملة." : "المصاريف ضمن الحدود الطبيعية المقدرة.",
          categoryGroup["تسويق"] && categoryGroup["تسويق"] > total * 0.3 ? "استقطاع التسويق يتجاوز 30% من المصاريف، يوصى بتقييم العائد على الإنفاق الإعلاني." : "توزيع ميزانية التسويق متزن."
        ]
      };
    }),

  // --- Employee Feedback System ---
  createFeedback: protectedProcedure  // متاح لجميع الموظفين المسجلين
    .input(z.object({
      type: z.string(),
      message: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error('غير مصرح بالدخول');
      return ctx.prisma.employeeFeedback.create({
        data: {
          userId: ctx.user.id,
          type: input.type,
          message: input.message,
          status: 'NEW'
        }
      });
    }),

  getFeedbackList: protectedProcedure.query(async ({ ctx }) => {
    // Managers and Admins can see all feedbacks
    if (ctx.user.role === 'ADMIN' || ctx.user.role === 'MANAGER') {
      return ctx.prisma.employeeFeedback.findMany({
        include: { user: { select: { name: true, role: true } } },
        orderBy: { createdAt: 'desc' }
      });
    }
    // Others can only see their own
    return ctx.prisma.employeeFeedback.findMany({
      where: { userId: ctx.user.id },
      include: { user: { select: { name: true, role: true } } },
      orderBy: { createdAt: 'desc' }
    });
  }),

  replyToFeedback: managerProcedure
    .input(z.object({
      id: z.string(),
      adminReply: z.string(),
      status: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      return ctx.prisma.employeeFeedback.update({
        where: { id: input.id },
        data: {
          adminReply: input.adminReply,
          status: input.status
        }
      });
    }),

  // --- Public Feedback (بدون تسجيل دخول - للزبائن والمستثمرين) ---
  submitPublicFeedback: publicProcedure
    .input(z.object({
      senderName: z.string().optional(),
      senderPhone: z.string().optional(),
      senderRole: z.string(),
      type: z.string(),
      content: z.string().min(5, 'الرسالة قصيرة جداً، يرجى التفصيل')
    }))
    .mutation(async ({ input, ctx }) => {
      return ctx.prisma.feedback.create({ data: input as any });
    }),

  getPublicFeedbacks: managerProcedure.query(async ({ ctx }) => {
    return ctx.prisma.feedback.findMany({ orderBy: { createdAt: 'desc' } });
  }),

  markPublicFeedbackRead: managerProcedure
    .input(z.object({ id: z.string(), adminReply: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.prisma.feedback.update({
        where: { id: input.id },
        data: { isRead: true, adminReply: input.adminReply }
      });
    }),

  // --- إعدادات النظام والنسخ الاحتياطي (System Settings & Backup) ---
  getSystemSettings: publicProcedure.query(async ({ ctx }) => {
    let settings = await ctx.prisma.systemSetting.findFirst();
    if (!settings) {
      settings = await ctx.prisma.systemSetting.create({
        data: {
          storeName: "Devite ERP",
          currency: "د.ب",
          taxRate: 10.0,
          defaultPrepTime: 15
        }
      });
    }
    return settings;
  }),

  updateSystemSettings: adminProcedure
    .input(z.object({
      storeName: z.string(),
      currency: z.string(),
      taxRate: z.number(),
      defaultPrepTime: z.number(),
      logoUrl: z.string().optional().nullable(),
      whatsappEnabled: z.boolean().optional(),
      whatsappPhone: z.string().optional().nullable(),
      whatsappOrderMsg: z.string().optional().nullable(),
      whatsappReadyMsg: z.string().optional().nullable(),
      whatsappShiftMsg: z.string().optional().nullable(),
      clockOutInstructions: z.string().optional().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      const existing = await ctx.prisma.systemSetting.findFirst();
      let settings;
      if (existing) {
        settings = await ctx.prisma.systemSetting.update({
          where: { id: existing.id },
          data: input
        });
      } else {
        settings = await ctx.prisma.systemSetting.create({
          data: input
        });
      }
      await logAudit(ctx.prisma, ctx.user.id, 'UPDATE_SETTINGS', `تحديث إعدادات النظام`);
      return settings;
    }),

  triggerDatabaseBackup: adminProcedure.mutation(async ({ ctx }) => {
    const fs = require('fs');
    const path = require('path');
    const dbPath = path.resolve(__dirname, '../prisma/dev.db');
    const backupDir = path.resolve(__dirname, '../backups');
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const backupFileName = `backup_${Date.now()}.db`;
    const backupPath = path.join(backupDir, backupFileName);
    
    fs.copyFileSync(dbPath, backupPath);
    await logAudit(ctx.prisma, ctx.user.id, 'DB_BACKUP', `إنشاء نسخة احتياطية لقاعدة البيانات: ${backupFileName}`);
    return { success: true, fileName: backupFileName };
  }),
  // --- Accounts (حسابات العربة) ---
  getAccounts: adminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.account.findMany({ orderBy: { createdAt: 'desc' } });
  }),
  createAccount: adminProcedure
    .input(z.object({ name: z.string(), type: z.string().optional(), balance: z.number().optional(), notes: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.prisma.account.create({ data: input as any });
    }),
  updateAccount: adminProcedure
    .input(z.object({ id: z.string(), name: z.string(), type: z.string(), balance: z.number(), notes: z.string().optional(), isActive: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      return ctx.prisma.account.update({ where: { id }, data });
    }),
  deleteAccount: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.prisma.account.delete({ where: { id: input.id } });
    }),

  // --- Branch Locations (موقع العربة) ---
  getBranchLocations: adminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.branchLocation.findMany({ orderBy: { createdAt: 'desc' } });
  }),
  createBranchLocation: adminProcedure
    .input(z.object({ country: z.string(), governorate: z.string().optional(), branchName: z.string(), address: z.string().optional(), googleMapsUrl: z.string().optional(), branchNumber: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.prisma.branchLocation.create({ data: input as any });
    }),
  updateBranchLocation: adminProcedure
    .input(z.object({ id: z.string(), country: z.string(), governorate: z.string().optional(), branchName: z.string(), address: z.string().optional(), googleMapsUrl: z.string().optional(), branchNumber: z.string().optional(), isActive: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      return ctx.prisma.branchLocation.update({ where: { id }, data });
    }),

  getAuditLogs: adminProcedure
    .input(z.object({ filterType: z.string().optional() }).optional())
    .query(async ({ input, ctx }) => {
      let dateFilter: any = undefined;
      
      if (input?.filterType && input.filterType !== 'all') {
        const now = new Date();
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        
        if (input.filterType === 'daily') {
          // already set to today
        } else if (input.filterType === 'weekly') {
          start.setDate(now.getDate() - 7);
        } else if (input.filterType === 'monthly') {
          start.setMonth(now.getMonth() - 1);
        }
        
        dateFilter = { gte: start };
      }

      return ctx.prisma.auditLog.findMany({
        where: dateFilter ? { createdAt: dateFilter } : undefined,
        include: { user: { select: { name: true, role: true } } },
        orderBy: { createdAt: 'desc' }
      });
    }),

  getBackupLogs: adminProcedure.query(async () => {
    // Return empty array or mock data since backups are filesystem-based
    return [];
  }),

  getDetailedSalesLog: staffProcedure
    .input(z.object({ filterType: z.string().optional() }).optional())
    .query(async ({ input, ctx }) => {
      let dateFilter: any = undefined;
      if (input?.filterType && input.filterType !== 'all') {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        if (input.filterType === 'weekly') start.setDate(start.getDate() - 7);
        if (input.filterType === 'monthly') start.setMonth(start.getMonth() - 1);
        dateFilter = { gte: start };
      }
      return ctx.prisma.order.findMany({
        where: dateFilter ? { createdAt: dateFilter } : undefined,
        include: { items: { include: { product: true } } },
        orderBy: { createdAt: 'desc' }
      });
    }),

  getSalesAnalytics: staffProcedure
    .input(z.object({ filterType: z.string().optional() }).optional())
    .query(async ({ input, ctx }) => {
      let dateFilter: any = undefined;
      if (input?.filterType && input.filterType !== 'all') {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        if (input.filterType === 'weekly') start.setDate(start.getDate() - 7);
        if (input.filterType === 'monthly') start.setMonth(start.getMonth() - 1);
        dateFilter = { gte: start };
      }
      const orders = await ctx.prisma.order.findMany({
        where: dateFilter ? { createdAt: dateFilter } : undefined,
        include: { items: { include: { product: true } } }
      });
      const totalSales = orders.reduce((sum, o) => sum + o.total, 0);
      let totalCost = 0;
      const productCounts: Record<string, { name: string, quantity: number }> = {};
      
      orders.forEach(o => {
        o.items.forEach(i => {
          totalCost += i.product.cost * i.quantity;
          if (!productCounts[i.product.name]) {
            productCounts[i.product.name] = { name: i.product.name, quantity: 0 };
          }
          productCounts[i.product.name].quantity += i.quantity;
        });
      });
      
      const topProducts = Object.values(productCounts)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      return {
        totalSales,
        totalProfit: totalSales - totalCost,
        topProducts,
        count: orders.length
      };
    }),

  // ==========================================
  // نظام الواتساب المتكامل
  // ==========================================

  getWhatsAppSettings: adminProcedure.query(async ({ ctx }) => {
    const settings = await ctx.prisma.whatsAppSettings.findUnique({ where: { id: 'default' } });
    return settings;
  }),

  getWhatsAppStatus: adminProcedure.query(() => {
    return getWhatsAppState();
  }),

  restartWhatsAppClient: adminProcedure.mutation(() => {
    restartWhatsApp();
    return { success: true };
  }),

  updateWhatsAppSettings: adminProcedure
    .input(z.object({
      isEnabled: z.boolean().optional(),
      officialNumber: z.string().optional(),
      accessToken: z.string().optional(),
      phoneNumberId: z.string().optional(),
      managerNumbers: z.string().optional(),
      supervisorNumbers: z.string().optional(),
      investorNumbers: z.string().optional(),
      headManagerNumber: z.string().optional(),
      notifyOrderCreated: z.boolean().optional(),
      notifyOrderReady: z.boolean().optional(),
      notifyOrderCancelled: z.boolean().optional(),
      notifyShiftReport: z.boolean().optional(),
      notifyDailyReport: z.boolean().optional(),
      notifyLowInventory: z.boolean().optional(),
      notifyLargeExpense: z.boolean().optional(),
      notifyInvestorReport: z.boolean().optional(),
      largeExpenseThreshold: z.number().optional(),
      lowInventoryRepeatDaily: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return ctx.prisma.whatsAppSettings.upsert({
        where: { id: 'default' },
        update: input,
        create: { id: 'default', ...input }
      });
    }),

  // قوالب الرسائل
  getWhatsAppTemplates: adminProcedure.query(async ({ ctx }) => {
    const dbTemplates = await ctx.prisma.whatsAppTemplate.findMany();
    // دمج القوالب من قاعدة البيانات + القوالب الافتراضية
    const merged = Object.entries(DEFAULT_TEMPLATES).map(([type, def]) => {
      const fromDb = dbTemplates.find(t => t.type === type);
      return fromDb || { id: type, type, ...def, createdAt: new Date(), updatedAt: new Date() };
    });
    return merged;
  }),

  updateWhatsAppTemplate: adminProcedure
    .input(z.object({ type: z.string(), name: z.string(), body: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const def = DEFAULT_TEMPLATES[input.type];
      return ctx.prisma.whatsAppTemplate.upsert({
        where: { type: input.type },
        update: { name: input.name, body: input.body },
        create: { type: input.type, name: input.name, body: input.body, variables: def?.variables || '' }
      });
    }),

  // سجلات الواتساب
  getWhatsAppLogs: adminProcedure
    .input(z.object({ status: z.string().optional(), limit: z.number().optional() }).optional())
    .query(async ({ input, ctx }) => {
      return ctx.prisma.whatsAppLog.findMany({
        where: input?.status ? { status: input.status } : undefined,
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: input?.limit || 100
      });
    }),

  // اختبار الإرسال
  testWhatsApp: adminProcedure
    .input(z.object({ phone: z.string(), message: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await queueWhatsAppMessage(ctx.prisma, input.phone, 'TEST', input.message, ctx.user.id);
      return { queued: true, message: 'تم إضافة رسالة الاختبار للطابور' };
    }),

  // إعادة محاولة الرسائل الفاشلة
  retryWhatsAppMessage: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.prisma.whatsAppLog.update({
        where: { id: input.id },
        data: { status: 'PENDING', attempts: 0, errorMessage: null }
      });
    }),

  // توليد PDF لتقرير الشفت
  generateShiftReportPDF: adminProcedure
    .input(z.object({ reportId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const report = await ctx.prisma.shiftReport.findUnique({
        where: { id: input.reportId },
        include: { cashier: true }
      });
      if (!report) throw new Error('التقرير غير موجود');
      const pdfBuffer = await generateShiftReportPDF(report);
      const base64 = pdfBuffer.toString('base64');
      return { base64, filename: `shift-report-${report.id}.pdf` };
    }),

});

export type AppRouter = typeof appRouter;
