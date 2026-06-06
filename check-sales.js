const fs = require('fs');
const code = fs.readFileSync('d:/devite/apps/web/src/app/sales/page.tsx', 'utf8');
const lines = code.split('\n');
console.log('Analytics properties used:', lines.filter(l => l.includes('analytics.')).map(l => l.trim()));
