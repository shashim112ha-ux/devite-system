const fs = require('fs');
const lines = fs.readFileSync('d:/devite/apps/server/src/router.ts', 'utf8').split('\n');
const start = lines.findIndex(l => l.includes('updateProduct: managerProcedure'));
console.log(lines.slice(start, start + 70).join('\n'));
