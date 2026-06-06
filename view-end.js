const fs = require('fs');
const content = fs.readFileSync('d:/devite/apps/server/src/router.ts', 'utf8');
const lines = content.split('\n');
let i = lines.length - 1;
while(i > 0 && !lines[i].includes('approvePayroll')) i--;
console.log("Lines starting from approvePayroll:");
console.log(lines.slice(i, i+30).join('\n'));
