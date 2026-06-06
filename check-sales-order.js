const fs = require('fs');
const code = fs.readFileSync('d:/devite/apps/web/src/app/sales/page.tsx', 'utf8');
const lines = code.split('\n');
const start = lines.findIndex(l => l.includes('salesList.map((order: any)'));
console.log(lines.slice(start, start + 30).join('\n'));
