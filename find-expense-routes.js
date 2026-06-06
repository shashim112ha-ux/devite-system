const fs = require('fs');
const lines = fs.readFileSync('d:/devite/apps/server/src/router.ts', 'utf8').split('\n');
const start1 = lines.findIndex(l => l.includes('getDetailedExpenses: staffProcedure'));
const start2 = lines.findIndex(l => l.includes('getExpenseAnalytics: staffProcedure'));
console.log('getDetailedExpenses at', start1);
console.log('getExpenseAnalytics at', start2);
