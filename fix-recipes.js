const fs = require('fs');
const path = 'd:/devite/apps/web/src/app/recipes/page.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /content: \(\) => printRef\.current,/,
  'contentRef: printRef,'
);

fs.writeFileSync(path, content);
console.log('Fixed react-to-print!');
