const fs = require('fs');
const path = 'd:/devite/apps/server/src/router.ts';
let lines = fs.readFileSync(path, 'utf8').split('\n');

const startIdx = lines.findIndex(l => l.includes('calculatePayrollForPeriod:'));
console.log(lines.slice(startIdx, startIdx + 50).join('\n'));
