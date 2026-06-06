const fs = require('fs');
const lines = fs.readFileSync('d:/devite/apps/server/src/router.ts', 'utf8').split('\n');
const start = lines.findIndex(l => l.includes('getReportData: investorProcedure'));
console.log(lines.slice(start, start + 35).join('\n'));
