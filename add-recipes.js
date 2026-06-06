const fs = require('fs');
const path = 'd:/devite/apps/web/src/app/layout.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/'\/kitchen'/g, "'/kitchen', '/recipes'");

content = content.replace(
  /<SidebarLink href="\/kitchen"[^\n]+\/>/,
  '<SidebarLink href="/kitchen" icon={<ChefHat size={18} />} label="المطبخ والطلبات" active={pathname === \'/kitchen\'} />\n                <SidebarLink href="/recipes" icon={<FileText size={18} />} label="دليل المقادير" active={pathname === \'/recipes\'} />'
);

if (!content.includes('FileText,')) {
    content = content.replace('ChefHat,', 'ChefHat,\n  FileText,');
}

fs.writeFileSync(path, content);
console.log('Added Recipes to Sidebar!');
