const fs = require('fs');
const path = 'd:/devite/apps/server/src/router.ts';
let lines = fs.readFileSync(path, 'utf8').split('\n');

const idx = lines.findIndex(l => l.includes('calculatePayrollForPeriod:'));
console.log('calculatePayrollForPeriod is at line', idx);
