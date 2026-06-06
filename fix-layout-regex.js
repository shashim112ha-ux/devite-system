const fs = require('fs');
const path = 'd:/devite/apps/web/src/app/layout.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/<SidebarLink href="\/sales"[^\n]+/g, '<SidebarLink href="/sales" icon={<Activity size={18} />} label="سجل المبيعات" active={pathname === \'/sales\'} />');

fs.writeFileSync(path, content);
console.log('Fixed sales links!');
