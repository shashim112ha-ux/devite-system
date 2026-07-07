import { TRPCError } from '@trpc/server';
import { z } from 'zod';
// @ts-ignore - Trigger new deployment
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
  investorProcedure,
  performanceMetrics,
  errorLogs
} from './trpc';
import { io } from './index';
import { queueWhatsAppMessage, DEFAULT_TEMPLATES, generateShiftReportPDF, fillTemplate, getWhatsAppState, restartWhatsApp, lastWorkerRunTime, isProcessingQueue } from './services/whatsapp';

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
        const finalVarCost = variant.ingredients.length > 0 ? Math.round(varAutoCost * 1000) / 1000 : variant.autoCost;
        return {
          ...variant,
          autoCost: finalVarCost,
          dynamicAvailable: variant.isAvailable && (variant.ingredients.length === 0 || varStockAvailable),
          isLossMaking: variant.price > 0 && finalVarCost > variant.price
        };
      });

      // If a product has variants, its availability is dependent on if AT LEAST ONE variant is available.
      // If no variants, fallback to basic ingredients.
      const hasVariants = processedVariants.length > 0;
      const anyVariantAvailable = processedVariants.some(v => v.dynamicAvailable);
      
      const finalProductCost = Math.round(autoCost * 1000) / 1000;
      const isLossMaking = product.price > 0 && finalProductCost > product.price;

      return {
        ...product,
        variants: processedVariants,
        autoCost: finalProductCost,
        dynamicAvailable: product.available && (hasVariants ? anyVariantAvailable : (product.ingredients.length === 0 || isStockAvailable)),
        isLossMaking: hasVariants ? processedVariants.some(v => v.isLossMaking) : isLossMaking
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
      try {
        await ctx.prisma.productIngredient.deleteMany({ where: { productId: input.id } });
        const product = await ctx.prisma.product.delete({ where: { id: input.id } });
        await logAudit(ctx.prisma, ctx.user.id, 'DELETE_PRODUCT', `حذف الصنف: ${product.name}`);
        return product;
      } catch (error: any) {
        if (error.code === 'P2003') {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'لا يمكن حذف هذا الصنف لارتباطه بطلبات مبيعات سابقة. يرجى إخفاؤه بدلاً من حذفه.'
          });
        }
        throw error;
      }
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

  toggleProductVisibility: managerProcedure
    .input(z.object({ id: z.string(), isHidden: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const product = await ctx.prisma.product.update({
        where: { id: input.id },
        data: { isHidden: input.isHidden }
      });
      await logAudit(ctx.prisma, ctx.user.id, 'TOGGLE_PRODUCT_VISIBILITY', `تعديل ظهور الصنف: ${product.name} إلى ${product.isHidden ? 'مخفي' : 'ظاهر'}`);
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
        
        if (input.status === 'READY' && order.customer?.phone) {
          await queueWhatsAppMessage({
            prisma: tx,
            recipient: order.customer.phone,
            messageType: 'ORDER_READY',
            templateKey: 'ORDER_READY',
            payload: { orderNumber: order.orderNumber.toString() },
            relatedEntityType: 'ORDER',
            relatedEntityId: order.id,
            userId: ctx.user?.id
          });
        }

        if (input.status === 'CANCELLED' && order.customer?.phone) {
          await queueWhatsAppMessage({
            prisma: tx,
            recipient: order.customer.phone,
            messageType: 'ORDER_CANCELLED',
            templateKey: 'ORDER_CANCELLED',
            payload: { orderNumber: order.orderNumber.toString() },
            relatedEntityType: 'ORDER',
            relatedEntityId: order.id,
            userId: ctx.user?.id
          });
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
      overrideInventory: z.boolean().optional(),
      overrideReason: z.string().optional(),
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
          const missingItemsList: any[] = [];
          for (const item of input.items) {
            const product = productMap.get(item.productId);
            if (product) {
              const ingredientsToUse = item.variantId 
                ? (product.variants.find(v => v.id === item.variantId)?.ingredients || [])
                : product.ingredients;

              for (const ing of ingredientsToUse) {
                const needed = ing.amountRequired * item.quantity;
                if (ing.inventoryItem.quantity < needed) {
                  if (!input.overrideInventory) {
                    throw new TRPCError({ 
                      code: 'BAD_REQUEST', 
                      message: `مخزون غير كافٍ للمادة: ${ing.inventoryItem.name}. المتبقي: ${ing.inventoryItem.quantity} ${ing.inventoryItem.unit} --MISSING_STOCK` 
                    });
                  } else {
                    if (ctx.user?.role !== 'ADMIN' && ctx.user?.role !== 'MANAGER') {
                       throw new TRPCError({ code: 'UNAUTHORIZED', message: 'ليس لديك صلاحية تجاوز المخزون. اطلب موافقة المدير.' });
                    }
                    missingItemsList.push({
                       product: product.name,
                       ingredient: ing.inventoryItem.name,
                       needed,
                       available: ing.inventoryItem.quantity
                    });
                  }
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

        if (missingItemsList.length > 0 && input.overrideInventory) {
           await tx.inventoryOverrideLog.create({
             data: {
               orderId: order.id,
               missingItemsJson: JSON.stringify(missingItemsList),
               approvedBy: ctx.user?.name || 'SYSTEM',
               reason: input.overrideReason || 'بدون سبب'
             }
           });
           await tx.auditLog.create({
             data: {
               userId: ctx.user?.id || 'SYSTEM',
               action: 'INVENTORY_OVERRIDE',
               details: `تم تجاوز نقص المخزون للطلب رقم ${order.orderNumber}`
             }
           });
           await tx.orderTimelineStep.create({
             data: {
               orderId: order.id,
               stage: 'OVERRIDE_APPLIED',
               staffId: ctx.user?.id,
               durationSeconds: 0
             }
           });
        }

        // 5. Decrement Inventory & Generate Warnings
        for (const item of input.items) {
          const product = productMap.get(item.productId);
          if (product) {
            const ingredientsToUse = item.variantId 
              ? (product.variants.find(v => v.id === item.variantId)?.ingredients || [])
              : product.ingredients;

            for (const ing of ingredientsToUse) {
              const needed = ing.amountRequired * item.quantity;
              const deductAmount = Math.min(needed, ing.inventoryItem.quantity); // Prevent going negative

              if (deductAmount > 0) {
                const updated = await tx.inventoryItem.update({
                  where: { id: ing.inventoryItemId },
                  data: { quantity: { decrement: deductAmount } }
                });

                await tx.inventoryMovement.create({
                  data: {
                    inventoryItemId: ing.inventoryItemId,
                    type: 'ORDER_DEDUCTION',
                    quantityChange: -deductAmount,
                    quantityBefore: updated.quantity + deductAmount,
                    quantityAfter: updated.quantity,
                    relatedOrderId: order.id,
                    reason: `طلب مبيعات رقم ${order.orderNumber}`,
                    createdBy: ctx.user?.name || 'النظام'
                  }
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

          if (input.customerPhone) {
            await queueWhatsAppMessage({
              prisma: tx,
              recipient: input.customerPhone,
              messageType: 'ORDER_CREATED',
              templateKey: 'ORDER_CREATED',
              payload: { customerName: order.customer?.name || 'عميل', orderNumber: order.orderNumber.toString(), estimatedTime: order.estimatedTime.toString() },
              relatedEntityType: 'ORDER',
              relatedEntityId: order.id,
              userId: ctx.user?.id
            });
          }

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
      total: z.number().optional(),
      fromAccountId: z.string().optional().nullable(),
      toAccountId: z.string().optional().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, fromAccountId, toAccountId, ...data } = input;

      const oldOrder = await ctx.prisma.order.findUnique({ where: { id } });
      if (!oldOrder) throw new Error('الطلب غير موجود');

      const order = await ctx.prisma.$transaction(async (tx) => {
        const updated = await tx.order.update({
          where: { id },
          data,
          include: { items: { include: { product: true } }, customer: true }
        });

        // Handle account transfer if payment method changed
        if (fromAccountId && toAccountId && fromAccountId !== toAccountId) {
          const amount = data.total ?? oldOrder.total;
          // Deduct from old account, add to new account
          await tx.account.update({ where: { id: fromAccountId }, data: { balance: { decrement: amount } } });
          await tx.account.update({ where: { id: toAccountId }, data: { balance: { increment: amount } } });
        } else if (toAccountId && !fromAccountId && data.total && data.total !== oldOrder.total) {
          // Adjust amount difference in the account
          const diff = data.total - oldOrder.total;
          await tx.account.update({ where: { id: toAccountId }, data: { balance: { increment: diff } } });
        }

        return updated;
      });

      io?.emit('order_status_updated', order);
      await logAudit(ctx.prisma, ctx.user.id, 'UPDATE_ORDER', 
        `تعديل الطلب #${order.orderNumber} | طريقة الدفع: ${data.paymentMethod || oldOrder.paymentMethod}${
          data.total !== undefined ? ` | المبلغ: ${data.total} د.ب` : ''
        }${fromAccountId && toAccountId ? ` | تحويل من حساب إلى آخر` : ''}`);
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

    let summary = await ctx.prisma.dailyFinancialSummary.findUnique({
      where: { date: today }
    });

    if (!summary) {
      const [salesAgg, expensesAgg] = await Promise.all([
        ctx.prisma.order.aggregate({
          _sum: { total: true, profit: true },
          _count: { id: true },
          where: { createdAt: { gte: today }, status: { not: 'CANCELLED' } }
        }),
        ctx.prisma.expense.aggregate({
          _sum: { amount: true },
          where: { date: { gte: today } }
        })
      ]);

      const sales = salesAgg._sum.total || 0;
      const profit = salesAgg._sum.profit || 0;
      const totalExpenses = expensesAgg._sum.amount || 0;
      const ordersCount = salesAgg._count.id || 0;
      const netProfit = profit - totalExpenses;

      summary = await ctx.prisma.dailyFinancialSummary.create({
        data: {
          date: today,
          totalSales: sales,
          totalProfit: profit,
          totalExpenses,
          netProfit,
          orderCount: ordersCount
        }
      });
    }

    const accounts = await ctx.prisma.account.findMany();
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    const accountsBreakdown = accounts.map(acc => ({ id: acc.id, name: acc.name, type: acc.type, balance: acc.balance }));

    const lowStock = await ctx.prisma.inventoryItem.findMany({
      where: { quantity: { lte: 5 } },
      take: 10
    });
    
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const nearExpiry = await ctx.prisma.inventoryItem.findMany({
      where: { expiryDate: { lte: sevenDaysFromNow } },
      take: 10
    });

    const activeOrders = await ctx.prisma.order.groupBy({
      by: ['status'],
      where: { createdAt: { gte: today } },
      _count: true
    });
    const preparingCount = activeOrders.find(o => o.status === 'PREPARING')?._count || 0;
    const readyCount = activeOrders.find(o => o.status === 'READY')?._count || 0;

    return {
      sales: summary.totalSales,
      ordersCount: summary.orderCount,
      profit: summary.totalProfit,
      totalExpenses: summary.totalExpenses,
      totalBalance,
      avgPrepTime: 0,
      preparingCount,
      readyCount,
      topProduct: "-",
      peakHour: 12,
      cash: summary.cashSales,
      card: summary.cardSales,
      benefit: summary.benefitSales,
      online: summary.onlineSales,
      lowStock,
      nearExpiry,
      accountsBreakdown
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
  getInventory: staffProcedure
    .input(z.object({
      search: z.string().optional(),
      page: z.number().optional().default(1),
      limit: z.number().optional().default(20)
    }).optional())
    .query(async ({ input, ctx }) => {
      const page = input?.page || 1;
      const limit = input?.limit || 20;
      const skip = (page - 1) * limit;

      const where = input?.search ? {
        OR: [
          { name: { contains: input.search } },
          { category: { contains: input.search } }
        ]
      } : {};

      const [data, total] = await Promise.all([
        ctx.prisma.inventoryItem.findMany({
          where,
          take: limit,
          skip,
          orderBy: { name: 'asc' }
        }),
        ctx.prisma.inventoryItem.count({ where })
      ]);

      return { data, total, page, totalPages: Math.ceil(total / limit) };
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
        if (data.quantity !== undefined) {
          await ctx.prisma.inventoryMovement.create({
            data: {
              inventoryItemId: id,
              type: 'MANUAL_ADJUSTMENT',
              quantityChange: item.quantity - oldItem.quantity,
              quantityBefore: oldItem.quantity,
              quantityAfter: item.quantity,
              unitCost: item.unitPrice,
              reason: reason || "تعديل إداري",
              createdBy: ctx.user.name
            }
          });
        }
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
      location: z.string().optional(), // 'TRUCK', 'HOME', 'STORAGE'
      reason: z.string(),
      notes: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const item = await ctx.prisma.inventoryItem.findUnique({ where: { id: input.inventoryItemId } });
      if (!item) throw new TRPCError({ code: 'NOT_FOUND', message: "العنصر غير موجود" });

      let oldQty = 0;
      if (input.location === 'HOME') {
        oldQty = item.homeQuantity;
        if (oldQty < input.quantity) throw new TRPCError({ code: 'BAD_REQUEST', message: "الكمية التالفة أكبر من المتوفر في البيت" });
        await ctx.prisma.inventoryItem.update({ where: { id: input.inventoryItemId }, data: { homeQuantity: { decrement: input.quantity } } });
      } else if (input.location === 'STORAGE') {
        oldQty = item.storageQuantity;
        if (oldQty < input.quantity) throw new TRPCError({ code: 'BAD_REQUEST', message: "الكمية التالفة أكبر من المتوفر في المخزن" });
        await ctx.prisma.inventoryItem.update({ where: { id: input.inventoryItemId }, data: { storageQuantity: { decrement: input.quantity } } });
      } else {
        oldQty = item.quantity;
        if (oldQty < input.quantity) throw new TRPCError({ code: 'BAD_REQUEST', message: "الكمية التالفة أكبر من المتوفر في العربة" });
        await ctx.prisma.inventoryItem.update({ where: { id: input.inventoryItemId }, data: { quantity: { decrement: input.quantity } } });
      }

      await ctx.prisma.inventoryMovement.create({
        data: {
          inventoryItemId: item.id,
          type: 'DAMAGED',
          quantityChange: -input.quantity,
          quantityBefore: oldQty,
          quantityAfter: oldQty - input.quantity,
          unitCost: item.unitPrice,
          totalCost: item.unitPrice * input.quantity,
          fromLocation: input.location || 'TRUCK',
          reason: input.reason + (input.notes ? ` - ${input.notes}` : ''),
          createdBy: ctx.user.name
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

      await logAudit(ctx.prisma, ctx.user.id, 'REPORT_DAMAGED', `تسجيل تالف: ${input.quantity} من ${item.name}`);
      return { success: true };
    }),

  transferInventory: managerProcedure
    .input(z.object({
      inventoryItemId: z.string(),
      fromLocation: z.string(), // 'TRUCK', 'HOME', 'STORAGE'
      toLocation: z.string(),   // 'TRUCK', 'HOME', 'STORAGE'
      quantity: z.number().min(0.01),
      reason: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const item = await ctx.prisma.inventoryItem.findUnique({ where: { id: input.inventoryItemId } });
      if (!item) throw new TRPCError({ code: 'NOT_FOUND', message: "العنصر غير موجود" });

      if (input.fromLocation === input.toLocation) throw new TRPCError({ code: 'BAD_REQUEST', message: "لا يمكن التحويل لنفس الموقع" });

      // 1. Check & Deduct from source
      let qtyBeforeSource = 0;
      if (input.fromLocation === 'HOME') {
        qtyBeforeSource = item.homeQuantity;
        if (qtyBeforeSource < input.quantity) throw new TRPCError({ code: 'BAD_REQUEST', message: "الكمية غير كافية في البيت" });
        await ctx.prisma.inventoryItem.update({ where: { id: item.id }, data: { homeQuantity: { decrement: input.quantity } } });
      } else if (input.fromLocation === 'STORAGE') {
        qtyBeforeSource = item.storageQuantity;
        if (qtyBeforeSource < input.quantity) throw new TRPCError({ code: 'BAD_REQUEST', message: "الكمية غير كافية في المخزن" });
        await ctx.prisma.inventoryItem.update({ where: { id: item.id }, data: { storageQuantity: { decrement: input.quantity } } });
      } else {
        qtyBeforeSource = item.quantity;
        if (qtyBeforeSource < input.quantity) throw new TRPCError({ code: 'BAD_REQUEST', message: "الكمية غير كافية في العربة" });
        await ctx.prisma.inventoryItem.update({ where: { id: item.id }, data: { quantity: { decrement: input.quantity } } });
      }

      // 2. Add to destination
      if (input.toLocation === 'HOME') {
        await ctx.prisma.inventoryItem.update({ where: { id: item.id }, data: { homeQuantity: { increment: input.quantity } } });
      } else if (input.toLocation === 'STORAGE') {
        await ctx.prisma.inventoryItem.update({ where: { id: item.id }, data: { storageQuantity: { increment: input.quantity } } });
      } else {
        await ctx.prisma.inventoryItem.update({ where: { id: item.id }, data: { quantity: { increment: input.quantity } } });
      }

      // 3. Log movement
      await ctx.prisma.inventoryMovement.create({
        data: {
          inventoryItemId: item.id,
          type: `TRANSFER_TO_${input.toLocation}`,
          quantityChange: input.quantity,
          quantityBefore: qtyBeforeSource,
          quantityAfter: qtyBeforeSource - input.quantity,
          fromLocation: input.fromLocation,
          toLocation: input.toLocation,
          reason: input.reason || 'تحويل مخزون',
          createdBy: ctx.user.name
        }
      });

      return { success: true };
    }),

  getInventoryMovements: managerProcedure
    .input(z.object({
      inventoryItemId: z.string().optional()
    }))
    .query(async ({ input, ctx }) => {
      return ctx.prisma.inventoryMovement.findMany({
        where: input.inventoryItemId ? { inventoryItemId: input.inventoryItemId } : undefined,
        orderBy: { createdAt: 'desc' },
        take: 100
      });
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
    .input(z.object({ 
      userId: z.string().optional(),
      page: z.number().optional().default(1),
      limit: z.number().optional().default(20)
    }).optional())
    .query(async ({ input, ctx }) => {
      const page = input?.page || 1;
      const limit = input?.limit || 20;
      const skip = (page - 1) * limit;
      const where = input?.userId ? { userId: input.userId } : undefined;

      const [data, total] = await Promise.all([
        ctx.prisma.attendance.findMany({
          where,
          include: { user: true },
          orderBy: { checkIn: 'desc' },
          take: limit,
          skip
        }),
        ctx.prisma.attendance.count({ where })
      ]);

      return { data, total, page, totalPages: Math.ceil(total / limit) };
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
    .input(z.object({ 
      id: z.string(), 
      checkIn: z.date(), 
      checkOut: z.date().optional().nullable(), 
      reason: z.string(),
      overrideHours: z.number().optional(),   // if set, override hours directly
      hourlyRate: z.number().optional(),      // if set, update the employee's hourly rate
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, overrideHours, hourlyRate, ...data } = input;

      // If overrideHours given, recompute checkOut from checkIn + hours
      if (overrideHours !== undefined && overrideHours > 0) {
        const computedCheckOut = new Date(data.checkIn.getTime() + overrideHours * 3600000);
        data.checkOut = computedCheckOut;
      }

      const att = await ctx.prisma.attendance.update({
        where: { id },
        data: {
          checkIn: data.checkIn,
          checkOut: data.checkOut,
          reason: data.reason,
          editedById: ctx.user.id
        } as any
      });

      // If hourly rate given, update the user's hourly rate
      if (hourlyRate !== undefined) {
        const attRecord = await ctx.prisma.attendance.findUnique({ where: { id }, select: { userId: true } });
        if (attRecord) {
          await ctx.prisma.user.update({
            where: { id: attRecord.userId },
            data: { hourlyRate } as any
          });
        }
      }

      await logAudit(ctx.prisma, ctx.user.id, 'EDIT_ATTENDANCE', 
        `تعديل سجل حضور${overrideHours !== undefined ? ` | الساعات: ${overrideHours}` : ''}${hourlyRate !== undefined ? ` | سعر الساعة: ${hourlyRate}` : ''}`);
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

  runMidnightCheckout: publicProcedure.mutation(async ({ ctx }) => {
    // This can be triggered by CRON job
    const openAttendances = await ctx.prisma.attendance.findMany({
      where: { checkOut: null }
    });

    for (const att of openAttendances) {
      await ctx.prisma.attendance.update({
        where: { id: att.id },
        data: { 
          checkOut: new Date(), 
          autoCheckout: true,
          checkoutSource: 'AUTO_MIDNIGHT'
        }
      });
      await ctx.prisma.notification.create({
        data: {
          type: 'WARNING',
          message: `تنبيه: تم تسجيل انصراف تلقائي للموظف (تسجيل رقم: ${att.id}) بسبب إغلاق اليوم. يرجى المراجعة.`
        }
      });
      io?.emit('attendance_event', { type: 'CHECK_OUT', userId: att.userId });
    }
    return { success: true, count: openAttendances.length };
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
    .input(z.object({ 
      userId: z.string().optional(),
      page: z.number().optional().default(1),
      limit: z.number().optional().default(20)
    }).optional())
    .query(async ({ input, ctx }) => {
      const page = input?.page || 1;
      const limit = input?.limit || 20;
      const skip = (page - 1) * limit;
      const where = input?.userId ? { userId: input.userId } : undefined;

      const [data, total] = await Promise.all([
        ctx.prisma.payroll.findMany({
          where,
          include: { user: true },
          orderBy: { startDate: 'desc' },
          take: limit,
          skip
        }),
        ctx.prisma.payroll.count({ where })
      ]);

      return { data, total, page, totalPages: Math.ceil(total / limit) };
    }),

  calculatePayrollForPeriod: managerProcedure
    .input(z.object({ startDate: z.union([z.date(), z.string()]), endDate: z.union([z.date(), z.string()]) }))
    .mutation(async ({ input, ctx }) => {
      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);
      endDate.setHours(23, 59, 59, 999);
      const staff = await ctx.prisma.user.findMany({
        where: { active: true },
        include: { attendance: true }
      });

      const dayInMs = 24 * 60 * 60 * 1000;
      const totalPeriodDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / dayInMs) + 1);

      const payrolls = [];

      for (const u of staff) {
        // Filter attendance records in period
        const periodAttendance = u.attendance.filter(att => 
          att.checkIn >= startDate && att.checkIn <= endDate
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
        // Use date range match instead of exact equality (strings vs Date mismatch fix)
        const rangeStart = new Date(startDate); rangeStart.setHours(0,0,0,0);
        const rangeEnd = new Date(endDate); rangeEnd.setHours(23,59,59,999);
        const existing = await ctx.prisma.payroll.findFirst({
          where: {
            userId: u.id,
            startDate: { gte: rangeStart, lte: new Date(startDate.getTime() + 86400000) },
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

      await logAudit(ctx.prisma, ctx.user.id, 'CALCULATE_PAYROLL', `احتساب رواتب الموظفين للفترة من ${startDate.toLocaleDateString('ar-BH')} إلى ${endDate.toLocaleDateString('ar-BH')}`);
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

        await queueWhatsAppMessage({
          prisma: ctx.prisma,
          recipient: input.phone,
          messageType: 'SHIFT_REPORT',
          templateKey: 'SHIFT_REPORT',
          payload: { report },
          relatedEntityType: 'SHIFT_REPORT',
          relatedEntityId: report.id,
          userId: ctx.user.id
        });
        
        return { success: true, queued: true };
      }),

  getShiftReports: managerProcedure
    .input(z.object({
      page: z.number().optional().default(1),
      limit: z.number().optional().default(20)
    }).optional())
    .query(async ({ input, ctx }) => {
      const page = input?.page || 1;
      const limit = input?.limit || 20;
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        ctx.prisma.shiftReport.findMany({
          include: { cashier: true },
          orderBy: { date: 'desc' },
          take: limit,
          skip
        }),
        ctx.prisma.shiftReport.count()
      ]);

      return { data, total, page, totalPages: Math.ceil(total / limit) };
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
          // Weighted average price calculation
          const existingItem = await tx.inventoryItem.findUnique({ 
            where: { id: input.inventoryItemId } 
          });
          let newUnitPrice = price;
          if (existingItem && existingItem.quantity > 0) {
            // Weighted average: (old_qty * old_price + new_qty * new_price) / (old_qty + new_qty)
            newUnitPrice = (
              (existingItem.quantity * existingItem.unitPrice) + (qty * price)
            ) / (existingItem.quantity + qty);
          }
          await tx.inventoryItem.update({
            where: { id: input.inventoryItemId },
            data: { 
              quantity: { increment: qty },
              unitPrice: newUnitPrice
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
          await tx.inventoryMovement.create({
            data: {
              inventoryItemId: input.inventoryItemId,
              type: 'PURCHASE',
              quantityChange: qty,
              quantityBefore: existingItem ? existingItem.quantity : 0,
              quantityAfter: existingItem ? existingItem.quantity + qty : qty,
              unitCost: newUnitPrice,
              totalCost: finalAmount,
              relatedExpenseId: createdExp.id,
              reason: 'شراء مواد: ' + createdExp.category,
              createdBy: ctx.user?.name || 'النظام'
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
      endDate: z.string().optional(),
      page: z.number().optional().default(1),
      limit: z.number().optional().default(20)
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

      const page = input?.page || 1;
      const limit = input?.limit || 20;
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        ctx.prisma.expense.findMany({
          where: dateFilter ? { date: dateFilter } : undefined,
          include: { recordedBy: { select: { name: true } }, account: true },
          orderBy: { date: 'desc' },
          take: limit,
          skip
        }),
        ctx.prisma.expense.count({
          where: dateFilter ? { date: dateFilter } : undefined
        })
      ]);

      return { data, total, page, totalPages: Math.ceil(total / limit) };
    }),

  updateDetailedExpense: managerProcedure
    .input(z.object({
      id: z.string(),
      category: z.string().optional(),
      amount: z.number().optional(),
      description: z.string().optional(),
      supplier: z.string().optional(),
      purpose: z.string().optional(),
      quantity: z.number().optional(),
      unitPrice: z.number().optional(),
      paymentMethod: z.string().optional(),
      accountId: z.string().optional().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;

      // Get old expense to reverse account balance if needed
      const oldExpense = await ctx.prisma.expense.findUnique({ where: { id } });
      if (!oldExpense) throw new Error('المصروف غير موجود');

      const qty = data.quantity ?? oldExpense.quantity ?? 1;
      const price = data.unitPrice ?? oldExpense.unitPrice ?? oldExpense.amount;
      const newAmount = data.amount ?? (qty * (price || 0));

      const updated = await ctx.prisma.$transaction(async (tx) => {
        // Reverse old account deduction
        if (oldExpense.accountId) {
          await tx.account.update({
            where: { id: oldExpense.accountId },
            data: { balance: { increment: oldExpense.amount } } // restore
          });
        }

        const exp = await tx.expense.update({
          where: { id },
          data: {
            ...data,
            amount: newAmount,
            quantity: qty,
            unitPrice: price,
          }
        });

        // Apply new account deduction
        const newAccountId = data.accountId !== undefined ? data.accountId : oldExpense.accountId;
        if (newAccountId) {
          await tx.account.update({
            where: { id: newAccountId },
            data: { balance: { decrement: newAmount } }
          });
        }

        return exp;
      });

      await logAudit(ctx.prisma, ctx.user.id, 'EDIT_EXPENSE',
        `تعديل مصروف ${updated.category} | المبلغ الجديد: ${newAmount} د.ب`);
      return updated;
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

      const sales = await ctx.prisma.order.findMany({
        where: dateFilter ? { createdAt: dateFilter } : undefined
      });
      const totalSales = sales.reduce((sum, o) => sum + o.total, 0);
      const percentageOfSales = totalSales > 0 ? (total / totalSales) * 100 : 0;

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
        totalSales,
        percentageOfSales,
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
    .input(z.object({ 
      filterType: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().optional().default(20),
      page: z.number().optional().default(1)
    }).optional())
    .query(async ({ input, ctx }) => {
      let dateFilter: any = undefined;
      
      const filterToUse = input?.filterType || 'today';
      const now = new Date();
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      
      if (filterToUse === 'today') {
        // already set
      } else if (filterToUse === 'weekly') {
        start.setDate(now.getDate() - 7);
      } else if (filterToUse === 'monthly') {
        start.setMonth(now.getMonth() - 1);
      } else if (filterToUse === 'custom' && input?.startDate && input?.endDate) {
        start.setTime(new Date(input.startDate).getTime());
        start.setHours(0, 0, 0, 0);
        end.setTime(new Date(input.endDate).getTime());
        end.setHours(23, 59, 59, 999);
      } else if (filterToUse === 'all') {
        // if all, maybe we don't need dateFilter. But we paginate anyway.
        dateFilter = null;
      }
      
      if (dateFilter === undefined) {
        dateFilter = { gte: start, lte: end };
      }

      const page = input?.page || 1;
      const limit = input?.limit || 20;
      const skip = (page - 1) * limit;

      const whereObj = {
        ...(dateFilter ? { createdAt: dateFilter } : {}),
        ...(input?.search ? { 
          OR: [
            { details: { contains: input.search } },
            { action: { contains: input.search } },
            { user: { name: { contains: input.search } } }
          ]
        } : {})
      };

      const [data, total] = await Promise.all([
        ctx.prisma.auditLog.findMany({
          where: whereObj,
          include: { user: { select: { name: true, role: true } } },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip
        }),
        ctx.prisma.auditLog.count({ where: whereObj })
      ]);

      return { data, total, page, totalPages: Math.ceil(total / limit) };
    }),


  getBackupLogs: adminProcedure
    .input(z.object({
      page: z.number().optional().default(1),
      limit: z.number().optional().default(20)
    }).optional())
    .query(async ({ input }) => {
      const fs = require('fs');
      const path = require('path');
      const backupDir = path.resolve(__dirname, '../backups');
      
      if (!fs.existsSync(backupDir)) {
        return { data: [], total: 0, page: 1, totalPages: 1 };
      }
      
      const files = fs.readdirSync(backupDir);
      const logs = files
        .filter((f: string) => f.endsWith('.db'))
        .map((f: string) => {
          const stats = fs.statSync(path.join(backupDir, f));
          return {
            id: f,
            fileName: f,
            createdAt: stats.mtime,
            status: 'SUCCESS'
          };
        })
        .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime());

      const page = input?.page || 1;
      const limit = input?.limit || 20;
      const skip = (page - 1) * limit;

      const paginatedLogs = logs.slice(skip, skip + limit);

      return { 
        data: paginatedLogs, 
        total: logs.length, 
        page, 
        totalPages: Math.ceil(logs.length / limit) 
      };
    }),

  getDetailedSalesLog: staffProcedure
    .input(z.object({ 
      filterType: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      page: z.number().optional().default(1),
      limit: z.number().optional().default(20)
    }).optional())
    .query(async ({ input, ctx }) => {
      let dateFilter: any = undefined;
      
      if (input?.startDate && input?.endDate) {
         dateFilter = { 
           gte: new Date(input.startDate), 
           lte: new Date(input.endDate) 
         };
      } else if (input?.filterType && input.filterType !== 'all') {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        if (input.filterType === 'weekly') start.setDate(start.getDate() - 7);
        if (input.filterType === 'monthly') start.setMonth(start.getMonth() - 1);
        if (input.filterType === 'today') { /* already today */ }
        dateFilter = { gte: start };
      }
      
      const page = input?.page || 1;
      const limit = input?.limit || 20;
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        ctx.prisma.order.findMany({
          where: dateFilter ? { createdAt: dateFilter } : undefined,
          include: { items: { include: { product: true } } },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip
        }),
        ctx.prisma.order.count({
          where: dateFilter ? { createdAt: dateFilter } : undefined
        })
      ]);

      return { data, total, page, totalPages: Math.ceil(total / limit) };
    }),

  getSalesAnalytics: staffProcedure
    .input(z.object({ 
      filterType: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional()
    }).optional())
    .query(async ({ input, ctx }) => {
      let dateFilter: any = undefined;
      if (input?.filterType && input.filterType !== 'all') {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        if (input.filterType === 'weekly') start.setDate(start.getDate() - 7);
        if (input.filterType === 'monthly') start.setMonth(start.getMonth() - 1);
        if (input.filterType === 'custom' && input.startDate && input.endDate) {
          const s = new Date(input.startDate); s.setHours(0,0,0,0);
          const e = new Date(input.endDate); e.setHours(23,59,59,999);
          dateFilter = { gte: s, lte: e };
        } else {
          dateFilter = { gte: start };
        }
      }
      const orders = await ctx.prisma.order.findMany({
        where: dateFilter ? { createdAt: dateFilter } : undefined,
        include: { items: { include: { product: true } } }
      });
      const totalSales = orders.reduce((sum, o) => sum + o.total, 0);
      let totalCost = 0;
      const productMap: Record<string, { name: string, count: number, sales: number, profit: number }> = {};
      
      orders.forEach(o => {
        o.items.forEach(i => {
          const itemSales = (i.price || i.product.price) * i.quantity;
          const itemCost = (i.product.cost || 0) * i.quantity;
          totalCost += itemCost;
          if (!productMap[i.product.id]) {
            productMap[i.product.id] = { name: i.product.name, count: 0, sales: 0, profit: 0 };
          }
          productMap[i.product.id].count += i.quantity;
          productMap[i.product.id].sales += itemSales;
          productMap[i.product.id].profit += (itemSales - itemCost);
        });
      });
      
      const topProducts = Object.values(productMap)
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 10);

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
    .input(z.object({
      status: z.string().optional(),
      page: z.number().optional().default(1),
      limit: z.number().optional().default(20)
    }).optional())
    .query(async ({ input, ctx }) => {
      const page = input?.page || 1;
      const limit = input?.limit || 20;
      const skip = (page - 1) * limit;

      const where = input?.status && input.status !== 'ALL' ? { status: input.status } : undefined;

      const [data, total] = await Promise.all([
        ctx.prisma.whatsAppLog.findMany({
          where,
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip
        }),
        ctx.prisma.whatsAppLog.count({ where })
      ]);

      return { data, total, page, totalPages: Math.ceil(total / limit) };
    }),

  // اختبار الإرسال
  testWhatsApp: adminProcedure
    .input(z.object({ phone: z.string(), message: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await queueWhatsAppMessage({
        prisma: ctx.prisma,
        recipient: input.phone,
        messageType: 'TEST',
        body: input.message,
        userId: ctx.user.id
      });
      return { queued: true, message: 'تم إضافة رسالة الاختبار للطابور' };
    }),

  // إعادة محاولة الرسائل الفاشلة
  retryWhatsAppMessage: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.prisma.whatsAppLog.update({
        where: { id: input.id },
        data: { status: 'PENDING', attempts: 0, errorMessage: null, lastAttemptAt: null }
      });
    }),

  // Performance Monitor
  getPerformanceSummary: adminProcedure.query(async ({ ctx }) => {
    // Audit Log counts
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const [
      auditToday,
      auditWeek,
      ordersCount,
      productsCount,
      expensesCount,
      usersCount,
      investorsCount,
      shiftReportsCount,
      backupsCount,
      whatsappPending,
      whatsappSent,
      whatsappFailed,
      backupLog
    ] = await Promise.all([
      ctx.prisma.auditLog.count({ where: { createdAt: { gte: today } } }),
      ctx.prisma.auditLog.count({ where: { createdAt: { gte: startOfWeek } } }),
      ctx.prisma.order.count(),
      ctx.prisma.product.count(),
      ctx.prisma.expense.count(),
      ctx.prisma.user.count(),
      ctx.prisma.investor.count(),
      ctx.prisma.shiftReport.count(),
      ctx.prisma.backupLog.count(),
      ctx.prisma.whatsAppLog.count({ where: { status: 'PENDING' } }),
      ctx.prisma.whatsAppLog.count({ where: { status: 'SENT' } }),
      ctx.prisma.whatsAppLog.count({ where: { status: 'FAILED' } }),
      ctx.prisma.backupLog.findFirst({ orderBy: { createdAt: 'desc' } })
    ]);

    const { status: waStatus } = await getWhatsAppState();

    return {
      metrics: performanceMetrics,
      errors: errorLogs,
      counts: {
        orders: ordersCount,
        products: productsCount,
        expenses: expensesCount,
        users: usersCount,
        investors: investorsCount,
        shiftReports: shiftReportsCount,
        backups: backupsCount,
        auditToday,
        auditWeek
      },
      whatsapp: {
        status: waStatus,
        pending: whatsappPending,
        sent: whatsappSent,
        failed: whatsappFailed,
        lastWorkerRun: lastWorkerRunTime,
        isWorkerRunning: isProcessingQueue
      },
      backup: backupLog || null
    };
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

  // --- Daily Tasks (المهام اليومية) ---
  getTaskTemplates: managerProcedure.query(async ({ ctx }) => {
    return ctx.prisma.dailyTaskTemplate.findMany({ orderBy: { createdAt: 'desc' } });
  }),

  createTaskTemplate: managerProcedure
    .input(z.object({
      title: z.string(),
      role: z.string(),
      description: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const task = await ctx.prisma.dailyTaskTemplate.create({ data: { title: input.title, role: input.role, description: input.description } });
      await logAudit(ctx.prisma, ctx.user.id, 'ADD_TASK_TEMPLATE', `إضافة مهمة يومية (${task.title}) لدور ${task.role}`);
      return task;
    }),

  toggleTaskTemplateActive: managerProcedure
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.prisma.dailyTaskTemplate.update({
        where: { id: input.id },
        data: { isActive: input.isActive }
      });
    }),

  deleteTaskTemplate: managerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.prisma.dailyTaskTemplate.delete({ where: { id: input.id } });
    }),

  getMyDailyTasks: protectedProcedure.query(async ({ ctx }) => {
    // 1. Get templates for my role
    const templates = await ctx.prisma.dailyTaskTemplate.findMany({
      where: { role: ctx.user.role, isActive: true },
      orderBy: { createdAt: 'asc' }
    });

    // 2. Get today's completions
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const completions = await ctx.prisma.dailyTaskCompletion.findMany({
      where: {
        employeeId: ctx.user.id,
        date: { gte: today }
      }
    });

    // 3. Merge
    return templates.map(t => {
      const completion = completions.find(c => c.taskTemplateId === t.id);
      return {
        template: t,
        completion: completion || null
      };
    });
  }),

  toggleDailyTaskCompletion: protectedProcedure
    .input(z.object({
      taskTemplateId: z.string(),
      isCompleted: z.boolean(),
      notes: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find if exists for today
      let completion = await ctx.prisma.dailyTaskCompletion.findFirst({
        where: {
          taskTemplateId: input.taskTemplateId,
          employeeId: ctx.user.id,
          date: { gte: today }
        }
      });

      if (completion) {
        return ctx.prisma.dailyTaskCompletion.update({
          where: { id: completion.id },
          data: {
            isCompleted: input.isCompleted,
            completedAt: input.isCompleted ? new Date() : null,
            notes: input.notes
          }
        });
      } else {
        return ctx.prisma.dailyTaskCompletion.create({
          data: {
            taskTemplateId: input.taskTemplateId,
            employeeId: ctx.user.id,
            date: new Date(),
            isCompleted: input.isCompleted,
            completedAt: input.isCompleted ? new Date() : null,
            notes: input.notes
          }
        });
      }
    }),

});

export type AppRouter = typeof appRouter;
