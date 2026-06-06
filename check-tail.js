const fs = require('fs');
const content = fs.readFileSync('d:/devite/apps/server/src/router.ts', 'utf8');
const lastPart = content.slice(-1000);
console.log(lastPart);
