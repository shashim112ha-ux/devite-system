const fs = require('fs');
const lines = fs.readFileSync('d:/devite/apps/web/src/app/payroll/page.tsx', 'utf8').split('\n');
const start = lines.findIndex(l => l.includes('updateDraftMutation.mutate'));
console.log(lines.slice(start - 10, start + 10).join('\n'));
