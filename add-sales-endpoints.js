const fs = require('fs');
const routerPath = 'd:/devite/apps/server/src/router.ts';
let content = fs.readFileSync(routerPath, 'utf8');

const endpoints = `
  getDetailedSalesLog: staffProcedure
    .input(z.object({ filterType: z.string().optional(), startDate: z.string().optional(), endDate: z.string().optional() }).optional())
    .query(async ({ input, ctx }) => {
      let whereClause: any = {};
      if (input?.filterType) {
        const now = new Date();
        if (input.filterType === 'daily') {
          const start = new Date(now.setHours(0,0,0,0));
          whereClause.createdAt = { gte: start };
        } else if (input.filterType === 'weekly') {
          const start = new Date();
          start.setDate(now.getDate() - 7);
          whereClause.createdAt = { gte: start };
        } else if (input.filterType === 'monthly') {
          const start = new Date();
          start.setDate(now.getDate() - 30);
          whereClause.createdAt = { gte: start };
        } else if (input.filterType === 'custom' && input.startDate && input.endDate) {
          whereClause.createdAt = { gte: new Date(input.startDate), lte: new Date(input.endDate) };
        }
      }
      return ctx.prisma.order.findMany({
        where: whereClause,
        include: { items: { include: { product: true } } },
        orderBy: { createdAt: 'desc' }
      });
    }),

  getSalesAnalytics: staffProcedure
    .input(z.object({ filterType: z.string().optional(), startDate: z.string().optional(), endDate: z.string().optional() }).optional())
    .query(async ({ input, ctx }) => {
      let whereClause: any = { status: { not: 'CANCELLED' } };
      if (input?.filterType) {
        const now = new Date();
        if (input.filterType === 'daily') {
          const start = new Date(now.setHours(0,0,0,0));
          whereClause.createdAt = { gte: start };
        } else if (input.filterType === 'weekly') {
          const start = new Date();
          start.setDate(now.getDate() - 7);
          whereClause.createdAt = { gte: start };
        } else if (input.filterType === 'monthly') {
          const start = new Date();
          start.setDate(now.getDate() - 30);
          whereClause.createdAt = { gte: start };
        } else if (input.filterType === 'custom' && input.startDate && input.endDate) {
          whereClause.createdAt = { gte: new Date(input.startDate), lte: new Date(input.endDate) };
        }
      }
      
      const orders = await ctx.prisma.order.findMany({ 
        where: whereClause,
        include: { items: { include: { product: true } } }
      });
      
      const totalSales = orders.reduce((sum, o) => sum + o.total, 0);
      let totalProfit = 0;
      
      const productStats: Record<string, { count: number, sales: number, profit: number }> = {};
      
      orders.forEach(o => {
        let orderCost = 0;
        o.items.forEach((item: any) => {
          const name = item.product.name;
          const cost = item.product.cost * item.quantity;
          const sale = item.price * item.quantity;
          const profit = sale - cost;
          
          orderCost += cost;
          
          if (!productStats[name]) productStats[name] = { count: 0, sales: 0, profit: 0 };
          productStats[name].count += item.quantity;
          productStats[name].sales += sale;
          productStats[name].profit += profit;
        });
        totalProfit += (o.total - orderCost);
      });

      const paymentMethods: Record<string, number> = {};
      orders.forEach(o => {
        paymentMethods[o.paymentMethod] = (paymentMethods[o.paymentMethod] || 0) + o.total;
      });

      return {
        totalSales,
        totalProfit,
        count: orders.length,
        paymentMethods: Object.entries(paymentMethods).map(([name, value]) => ({ name, value })),
        topProducts: Object.entries(productStats)
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.sales - a.sales)
      };
    }),

  submitPublicFeedback: publicProcedure`;

content = content.replace(/submitPublicFeedback: publicProcedure/g, endpoints);
fs.writeFileSync(routerPath, content);
console.log('Done!');
