const fs = require('fs');

const routerPath = 'd:/devite/apps/server/src/router.ts';
let content = fs.readFileSync(routerPath, 'utf8');

const regex = /getReportData: investorProcedure[\s\S]*?(?=\/\/ --- .*?Inventory.* ---)/m;

const replacement = `getReportData: investorProcedure
    .input(z.object({ period: z.enum(['daily', 'weekly', 'monthly', 'quarterly']) }))
    .query(async ({ input, ctx }) => {
      const now = new Date();
      let startDate = new Date();
      if (input.period === 'daily') startDate.setDate(now.getDate() - 7);
      if (input.period === 'weekly') startDate.setDate(now.getDate() - 30);
      if (input.period === 'monthly') startDate.setMonth(now.getMonth() - 12);
      if (input.period === 'quarterly') startDate.setMonth(now.getMonth() - 36);

      const orders = await ctx.prisma.order.findMany({
        where: { createdAt: { gte: startDate }, status: { not: 'CANCELLED' } }
      });
      const expenses = await ctx.prisma.expense.findMany({
        where: { createdAt: { gte: startDate } }
      });
      const payrolls = await ctx.prisma.payroll.findMany({
        where: { createdAt: { gte: startDate } }
      });

      let totalSales = 0;
      let cash = 0;
      let card = 0;
      let benefit = 0;
      let online = 0;

      orders.forEach((o: any) => {
         totalSales += o.total;
         if (o.paymentMethod === 'CASH') cash += o.total;
         else if (o.paymentMethod === 'CARD') card += o.total;
         else if (o.paymentMethod === 'BENEFIT') benefit += o.total;
         else online += o.total;
      });

      let totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0) + payrolls.reduce((sum, p) => sum + p.amount, 0);
      let netProfit = totalSales - totalExpenses;
      let profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

      const allInventory = await ctx.prisma.inventoryItem.findMany();
      const lowStock = allInventory.filter((i: any) => i.quantity <= i.minThreshold);

      const grouped: Record<string, { sales: number, expenses: number }> = {};
      
      const getGroupingKey = (date: Date) => {
         if (input.period === 'daily') return date.toLocaleDateString('ar-SA');
         if (input.period === 'weekly') {
           const week = Math.ceil(date.getDate() / 7);
           return "أسبوع " + week + " - " + date.toLocaleString('ar-SA', { month: 'short' });
         }
         if (input.period === 'monthly') return date.toLocaleString('ar-SA', { month: 'long', year: 'numeric' });
         if (input.period === 'quarterly') {
           const q = Math.ceil((date.getMonth() + 1) / 3);
           return "ربع " + q + " - " + date.getFullYear();
         }
         return '';
      };

      orders.forEach((o: any) => {
        const key = getGroupingKey(o.createdAt);
        if (!grouped[key]) grouped[key] = { sales: 0, expenses: 0 };
        grouped[key].sales += o.total;
      });

      expenses.forEach((e: any) => {
        const key = getGroupingKey(e.createdAt);
        if (!grouped[key]) grouped[key] = { sales: 0, expenses: 0 };
        grouped[key].expenses += e.amount;
      });

      payrolls.forEach((p: any) => {
        const key = getGroupingKey(p.createdAt);
        if (!grouped[key]) grouped[key] = { sales: 0, expenses: 0 };
        grouped[key].expenses += p.amount;
      });

      const chartData = Object.entries(grouped).map(([name, data]) => ({
         name,
         sales: data.sales,
         expenses: data.expenses,
         profit: data.sales - data.expenses
      }));

      return {
         stats: {
            sales: totalSales,
            expenses: totalExpenses,
            net: netProfit,
            margin: profitMargin,
            cash,
            card,
            benefit,
            online
         },
         lowStock,
         chartData
      };
    }),\n\n  `;

content = content.replace(regex, replacement);
fs.writeFileSync(routerPath, content);
console.log('Done!');
