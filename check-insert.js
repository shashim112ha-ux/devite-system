const fs = require('fs');
const lines = fs.readFileSync('d:/devite/apps/server/src/router.ts', 'utf8').split('\n');
const start = lines.findIndex(l => l.includes('// =========================================='));
console.log('Inserting before line', start);
