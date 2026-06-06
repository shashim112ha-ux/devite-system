const fs = require('fs');
const path = 'd:/devite/apps/web/src/app/layout.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/(<SidebarLink href="\/reports"[^>]+>)/g, "\\n                <SidebarLink href=\"/sales\" icon={<Activity size={18} />} label=\"سجل المبيعات\" active={pathname === '/sales'} />");

// Also add it to the allowed routes
content = content.replace(/'\/reports'/g, "'/reports', '/sales'");

// Add Activity to lucide-react import if not there
if (!content.includes('Activity,')) {
    content = content.replace('LayoutDashboard,', 'LayoutDashboard,\n  Activity,');
}

fs.writeFileSync(path, content);
console.log('Done!');
