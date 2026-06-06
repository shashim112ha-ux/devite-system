const fs = require('fs');
const path = 'd:/devite/apps/web/src/app/layout.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/\\n\s*<SidebarLink href="\/sales".*?\/>/g, 
  '<SidebarLink href="/reports" icon={<BarChart3 size={18} />} label="الإحصائيات والتقارير" active={pathname === \'/reports\' || pathname === \'/sales\'} />\n                <SidebarLink href="/sales" icon={<Activity size={18} />} label="سجل المبيعات" active={pathname === \'/sales\'} />'
);

fs.writeFileSync(path, content);
console.log('Fixed syntax error!');
