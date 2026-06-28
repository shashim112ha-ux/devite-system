const fs = require('fs');
const path = require('path');

const routerPath = path.join(__dirname, '../apps/server/src/router.ts');
let content = fs.readFileSync(routerPath, 'utf8');

const getAdvancedStatsRegex = /getAdvancedStats:\s*publicProcedure\.query\(async\s*\(\{\s*ctx\s*\}\)\s*=>\s*\{([\s\S]*?)return\s*\{([\s\S]*?)\};\s*\}\),/g;

const match = getAdvancedStatsRegex.exec(content);
if (match) {
  const newImplementation = `getAdvancedStats: publicProcedure.query(async ({ ctx }) => {
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
  }),`;

  content = content.replace(match[0], newImplementation);
  fs.writeFileSync(routerPath, content, 'utf8');
  console.log('Successfully patched getAdvancedStats');
} else {
  console.log('Could not find getAdvancedStats');
}
