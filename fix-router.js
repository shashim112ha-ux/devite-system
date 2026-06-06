const fs = require('fs');
const routerPath = 'd:/devite/apps/server/src/router.ts';
let content = fs.readFileSync(routerPath, 'utf8');

// Fix expense createdAt -> date
content = content.replace(/const expenses = await ctx\.prisma\.expense\.findMany\(\{\s*where: \{ createdAt: \{ gte: startDate \} \}\s*\}\);/g, 
"const expenses = await ctx.prisma.expense.findMany({ where: { date: { gte: startDate } } });");

content = content.replace(/expenses\.forEach\(\(e: any\) => \{\s*const key = getGroupingKey\(e\.createdAt\);/g,
"expenses.forEach((e: any) => { const key = getGroupingKey(e.date);");

// Fix payroll createdAt -> startDate, amount -> netSalary
content = content.replace(/const payrolls = await ctx\.prisma\.payroll\.findMany\(\{\s*where: \{ createdAt: \{ gte: startDate \} \}\s*\}\);/g,
"const payrolls = await ctx.prisma.payroll.findMany({ where: { startDate: { gte: startDate } } });");

content = content.replace(/payrolls\.reduce\(\(sum, p\) => sum \+ p\.amount, 0\)/g,
"payrolls.reduce((sum, p) => sum + p.netSalary, 0)");

content = content.replace(/payrolls\.forEach\(\(p: any\) => \{\s*const key = getGroupingKey\(p\.createdAt\);\s*if \(\!grouped\[key\]\) grouped\[key\] = \{ sales: 0, expenses: 0 \};\s*grouped\[key\]\.expenses \+= p\.amount;/g,
"payrolls.forEach((p: any) => { const key = getGroupingKey(p.startDate); if (!grouped[key]) grouped[key] = { sales: 0, expenses: 0 }; grouped[key].expenses += p.netSalary;");

fs.writeFileSync(routerPath, content);
console.log('Done!');
