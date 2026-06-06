const fs = require('fs');
const path = 'd:/devite/apps/web/src/app/settings/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add state to SettingsPage
content = content.replace(
  /const \[activeTab, setActiveTab\] = useState\('general'\);/,
  "const [activeTab, setActiveTab] = useState('general');\n  const [auditFilter, setAuditFilter] = useState('today');"
);

// 2. Update getAuditLogs query
content = content.replace(
  /const logsQuery = trpc\.getAuditLogs\.useQuery\(undefined, \{ enabled: activeTab === 'logs' \}\);/,
  "const logsQuery = trpc.getAuditLogs.useQuery({ filterType: auditFilter }, { enabled: activeTab === 'logs' });"
);

// 3. Update the LogsTab component call
content = content.replace(
  /\{activeTab === 'logs' && <LogsTab data=\{logsQuery\.data\} \/>\}/,
  "{activeTab === 'logs' && <LogsTab data={logsQuery.data} filter={auditFilter} setFilter={setAuditFilter} isLoading={logsQuery.isLoading} />}"
);

// 4. Completely replace the LogsTab function implementation
const logsTabRegex = /function LogsTab\(\{ data \}: any\) \{[\s\S]*?\}\s*function/m;
const replacement = `function LogsTab({ data, filter, setFilter, isLoading }: any) {
     return (
        <div className="bg-brand-navy border border-white/5 rounded-[30px] overflow-hidden">
           <div className="p-8 border-b border-white/5 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-brand-orange flex items-center gap-2"><ShieldAlert /> سجل النظام المتطور (Audit Logs)</h2>
                <p className="text-sm text-gray-400 mt-1">تتبع كافة التعديلات، الحذف، والإضافات في النظام</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setFilter('today')} className={\`px-4 py-2 rounded-xl text-sm font-bold \${filter === 'today' ? 'bg-brand-orange text-black' : 'bg-white/5 text-gray-400 hover:text-white'}\`}>تعديلات اليوم</button>
                <button onClick={() => setFilter('all')} className={\`px-4 py-2 rounded-xl text-sm font-bold \${filter === 'all' ? 'bg-brand-orange text-black' : 'bg-white/5 text-gray-400 hover:text-white'}\`}>أرشيف السجلات كامل</button>
              </div>
           </div>
           
           <div className="overflow-x-auto">
             <table className="w-full text-right">
                <thead className="bg-brand-black/40 text-gray-500 text-xs uppercase tracking-widest">
                   <tr>
                      <th className="p-4 pl-0 whitespace-nowrap">التاريخ والوقت</th>
                      <th className="p-4">الموظف</th>
                      <th className="p-4">القسم والعملية</th>
                      <th className="p-4 w-1/3">التفاصيل الدقيقة</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                   {isLoading ? (
                     <tr><td colSpan={4} className="p-8 text-center text-brand-orange animate-pulse">جاري جلب السجلات...</td></tr>
                   ) : !data || data.length === 0 ? (
                     <tr><td colSpan={4} className="p-12 text-center text-gray-500">لا توجد سجلات في هذا الفلتر</td></tr>
                   ) : data?.map((log: any) => (
                      <tr key={log.id} className="hover:bg-white/[0.02]">
                         <td className="p-4 pl-0 text-gray-400 whitespace-nowrap">
                            <div className="text-white font-medium">{new Date(log.createdAt).toLocaleDateString('ar-SA')}</div>
                            <div className="text-[10px] text-gray-500 mt-1">{new Date(log.createdAt).toLocaleTimeString('ar-SA')}</div>
                         </td>
                         <td className="p-4">
                            <div className="font-bold text-white flex items-center gap-2">👤 {log.user?.name || 'النظام'}</div>
                            <div className="text-xs text-brand-gold mt-1">{log.user?.role || 'SYSTEM'}</div>
                         </td>
                         <td className="p-4">
                            <div className="font-bold text-gray-200">{log.entityType}</div>
                            <span className={\`text-xs px-2 py-1 rounded mt-2 inline-block \${log.action === 'CREATE' ? 'bg-green-500/20 text-green-400' : log.action === 'UPDATE' ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'}\`}>
                               {log.action}
                            </span>
                         </td>
                         <td className="p-4 text-xs font-mono text-gray-400">
                            {log.oldValues && log.oldValues !== 'null' && <div className="mb-1"><span className="text-red-400">سابقاً:</span> {log.oldValues}</div>}
                            {log.newValues && log.newValues !== 'null' && <div><span className="text-green-400">الجديد:</span> {log.newValues}</div>}
                            {!log.oldValues && !log.newValues && <span className="text-gray-500">لا توجد تفاصيل</span>}
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
           </div>
        </div>
     );
  }
  
  function`;
  
content = content.replace(logsTabRegex, replacement);

fs.writeFileSync(path, content);
console.log('Done Updating Logs!');
