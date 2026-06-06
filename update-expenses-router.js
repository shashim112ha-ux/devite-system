const fs = require('fs');
const routerPath = 'd:/devite/apps/server/src/router.ts';
let content = fs.readFileSync(routerPath, 'utf8');

const regex1 = /getDetailedExpenses: staffProcedure\.query\(async \(\{ ctx \}\) => \{[\s\S]*?\}\),/m;
const replacement1 = `getDetailedExpenses: staffProcedure
    .input(z.object({ filterType: z.string().optional(), startDate: z.string().optional(), endDate: z.string().optional() }).optional())
    .query(async ({ input, ctx }) => {
      let whereClause: any = {};
      if (input?.filterType) {
        const now = new Date();
        if (input.filterType === 'daily') {
          const start = new Date(now.setHours(0,0,0,0));
          whereClause.date = { gte: start };
        } else if (input.filterType === 'weekly') {
          const start = new Date();
          start.setDate(now.getDate() - 7);
          whereClause.date = { gte: start };
        } else if (input.filterType === 'monthly') {
          const start = new Date();
          start.setDate(now.getDate() - 30);
          whereClause.date = { gte: start };
        } else if (input.filterType === 'custom' && input.startDate && input.endDate) {
          whereClause.date = { gte: new Date(input.startDate), lte: new Date(input.endDate) };
        }
      }
      return ctx.prisma.expense.findMany({
        where: whereClause,
        include: { recordedBy: { select: { name: true } } },
        orderBy: { date: 'desc' }
      });
    }),`;

content = content.replace(regex1, replacement1);

const regex2 = /getExpenseAnalytics: staffProcedure\.query\(async \(\{ ctx \}\) => \{[\s\S]*?\}\),/m;
const replacement2 = `getExpenseAnalytics: staffProcedure
    .input(z.object({ filterType: z.string().optional(), startDate: z.string().optional(), endDate: z.string().optional() }).optional())
    .query(async ({ input, ctx }) => {
      let whereClause: any = {};
      if (input?.filterType) {
        const now = new Date();
        if (input.filterType === 'daily') {
          const start = new Date(now.setHours(0,0,0,0));
          whereClause.date = { gte: start };
        } else if (input.filterType === 'weekly') {
          const start = new Date();
          start.setDate(now.getDate() - 7);
          whereClause.date = { gte: start };
        } else if (input.filterType === 'monthly') {
          const start = new Date();
          start.setDate(now.getDate() - 30);
          whereClause.date = { gte: start };
        } else if (input.filterType === 'custom' && input.startDate && input.endDate) {
          whereClause.date = { gte: new Date(input.startDate), lte: new Date(input.endDate) };
        }
      }
      
      const expenses = await ctx.prisma.expense.findMany({ where: whereClause });
      const total = expenses.reduce((sum, e) => sum + e.amount, 0);

      const categoryGroup: Record<string, number> = {};
      expenses.forEach(e => {
        categoryGroup[e.category] = (categoryGroup[e.category] || 0) + e.amount;
      });

      const categoryStats = Object.entries(categoryGroup).map(([name, value]) => ({
        name,
        value,
        percentage: total > 0 ? Math.round((value / total) * 100) : 0
      }));

      let highest = null;
      if (expenses.length > 0) {
        highest = expenses.reduce((prev, curr) => prev.amount > curr.amount ? prev : curr);
      }

      const suppliers: Record<string, number> = {};
      expenses.forEach(e => {
        if (e.supplier) {
          suppliers[e.supplier] = (suppliers[e.supplier] || 0) + e.amount;
        }
      });
      const topSupplier = Object.keys(suppliers).length > 0
        ? Object.keys(suppliers).reduce((a, b) => suppliers[a] > suppliers[b] ? a : b)
        : 'لا يوجد';

      const accountGroup: Record<string, number> = {};
      expenses.forEach(e => {
        const acc = e.accountPaidFrom || 'كاش';
        accountGroup[acc] = (accountGroup[acc] || 0) + e.amount;
      });
      const accountStats = Object.entries(accountGroup).map(([name, value]) => ({ name, value }));

      return {
        total,
        count: expenses.length,
        categoryStats,
        highestExpense: highest,
        topSupplier,
        accountStats
      };
    }),`;

content = content.replace(regex2, replacement2);
fs.writeFileSync(routerPath, content);
console.log('Done!');
