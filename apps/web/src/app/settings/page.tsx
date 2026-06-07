"use client";

import { useState } from "react";
import { trpc } from "../utils/trpc";
import { 
  Settings2, Building2, Wallet, Database, ShieldAlert,
  Save, Plus, MapPin, Building, CreditCard, RefreshCw, MessageCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"general" | "branches" | "accounts" | "whatsapp" | "backup" | "logs">("general");
  const [auditFilter, setAuditFilter] = useState('today');

  const settingsQuery = trpc.getSystemSettings.useQuery();
  const branchesQuery = trpc.getBranchLocations.useQuery();
  const accountsQuery = trpc.getAccounts.useQuery();
  const logsQuery = trpc.getAuditLogs.useQuery({ filterType: auditFilter }, { enabled: activeTab === 'logs' });

  return (
    <div className="min-h-screen bg-brand-black p-10">
      <header className="mb-12 flex justify-between items-end">
         <div>
            <h1 className="text-4xl font-black text-white flex items-center gap-3">
               <Settings2 size={36} className="text-brand-orange" /> الإعدادات الشاملة
            </h1>
            <p className="text-gray-400 mt-2">إدارة الفروع، الحسابات المالية، إعدادات النظام، والنسخ الاحتياطي</p>
         </div>
      </header>

      <div className="flex gap-8">
         {/* Sidebar Tabs */}
         <div className="w-1/4">
            <div className="bg-brand-navy border border-white/5 rounded-[30px] p-4 flex flex-col gap-2">
               <TabButton active={activeTab === 'general'} onClick={() => setActiveTab('general')} icon={<Settings2 size={20}/>} label="إعدادات النظام" />
               <TabButton active={activeTab === 'branches'} onClick={() => setActiveTab('branches')} icon={<Building2 size={20}/>} label="إدارة الفروع" />
               <TabButton active={activeTab === 'accounts'} onClick={() => setActiveTab('accounts')} icon={<Wallet size={20}/>} label="الحسابات والصناديق" />
               <TabButton active={activeTab === 'whatsapp'} onClick={() => setActiveTab('whatsapp')} icon={<MessageCircle size={20}/>} label="مركز الواتساب" />
               <TabButton active={activeTab === 'backup'} onClick={() => setActiveTab('backup')} icon={<Database size={20}/>} label="النسخ الاحتياطي" />
               <TabButton active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} icon={<ShieldAlert size={20}/>} label="سجل النظام العام" />
            </div>
         </div>

         {/* Content Area */}
         <div className="w-3/4">
            {activeTab === 'general' && <GeneralSettingsTab data={settingsQuery.data} refetch={settingsQuery.refetch} />}
            {activeTab === 'branches' && <BranchesTab data={branchesQuery.data} refetch={branchesQuery.refetch} />}
            {activeTab === 'accounts' && <AccountsTab data={accountsQuery.data} refetch={accountsQuery.refetch} />}
            {activeTab === 'whatsapp' && <WhatsAppTab data={settingsQuery.data} refetch={settingsQuery.refetch} />}
            {activeTab === 'backup' && <BackupTab />}
            {activeTab === 'logs' && <LogsTab data={logsQuery.data} filter={auditFilter} setFilter={setAuditFilter} isLoading={logsQuery.isLoading} />}
         </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: any) {
   return (
      <button 
         onClick={onClick} 
         className={`flex items-center gap-3 w-full p-4 rounded-2xl transition-all font-bold ${active ? 'bg-brand-orange text-white' : 'hover:bg-white/5 text-gray-400'}`}
      >
         {icon} {label}
      </button>
   );
}

// ----------------------------------------------------
// General Settings
// ----------------------------------------------------
function GeneralSettingsTab({ data, refetch }: any) {
   const updateMutation = trpc.updateSystemSettings.useMutation();
   const [formData, setFormData] = useState(data || {
      storeName: 'Devite ERP',
      currency: 'د.ب',
      taxRate: 10,
      defaultPrepTime: 15,
      clockOutInstructions: 'حافظ على نظافة العربة\nادخل جميع الاجهزة من الخارج\nتأكد من اغلاق جميع الليتات الخارجية'
   });

   const handleSave = async () => {
      try {
         await updateMutation.mutateAsync({
            storeName: formData.storeName,
            currency: formData.currency,
            taxRate: Number(formData.taxRate),
            defaultPrepTime: Number(formData.defaultPrepTime),
            clockOutInstructions: formData.clockOutInstructions
         });
         alert("تم حفظ الإعدادات بنجاح");
         refetch();
      } catch (e: any) {
         alert("خطأ: " + e.message);
      }
   };

   return (
      <div className="bg-brand-navy border border-white/5 rounded-[30px] p-8">
         <h2 className="text-2xl font-black mb-6">الإعدادات العامة</h2>
         <div className="grid grid-cols-2 gap-6">
            <div>
               <label className="block text-gray-400 text-sm mb-2">اسم المتجر / المطعم</label>
               <input value={formData.storeName || ''} onChange={e => setFormData({...formData, storeName: e.target.value})} className="w-full bg-brand-black p-4 rounded-xl border border-white/5" />
            </div>
            <div>
               <label className="block text-gray-400 text-sm mb-2">العملة الافتراضية</label>
               <input value={formData.currency || ''} onChange={e => setFormData({...formData, currency: e.target.value})} className="w-full bg-brand-black p-4 rounded-xl border border-white/5" />
            </div>
            <div>
               <label className="block text-gray-400 text-sm mb-2">نسبة الضريبة (VAT %)</label>
               <input type="number" value={formData.taxRate || ''} onChange={e => setFormData({...formData, taxRate: e.target.value})} className="w-full bg-brand-black p-4 rounded-xl border border-white/5" />
            </div>
            <div>
               <label className="block text-gray-400 text-sm mb-2">وقت التحضير الافتراضي (دقيقة)</label>
               <input type="number" value={formData.defaultPrepTime || ''} onChange={e => setFormData({...formData, defaultPrepTime: e.target.value})} className="w-full bg-brand-black p-4 rounded-xl border border-white/5" />
            </div>
         </div>
         
         <div className="mt-6">
            <label className="block text-gray-400 text-sm mb-2">تعليمات نهاية الدوام (تظهر للموظف عند الانصراف)</label>
            <textarea value={formData.clockOutInstructions || ''} onChange={e => setFormData({...formData, clockOutInstructions: e.target.value})} rows={3} className="w-full bg-brand-black p-4 rounded-xl border border-white/5" placeholder="أدخل التعليمات هنا..." />
         </div>

         <button onClick={handleSave} className="mt-8 bg-brand-orange px-8 py-4 rounded-xl font-bold flex items-center gap-2">
            <Save size={20} /> حفظ الإعدادات
         </button>
      </div>
   );
}

// ----------------------------------------------------
// Branches Tab
// ----------------------------------------------------
function BranchesTab({ data, refetch }: any) {
   const [showAdd, setShowAdd] = useState(false);
   const [formData, setFormData] = useState({ branchName: '', address: '', branchNumber: '' });
   const createMutation = trpc.createBranchLocation.useMutation();

   const handleAdd = async () => {
      try {
         await createMutation.mutateAsync({ ...formData, country: 'مملكة البحرين' });
         setShowAdd(false);
         refetch();
         setFormData({ branchName: '', address: '', branchNumber: '' });
      } catch (e: any) {
         alert(e.message);
      }
   };

   return (
      <div className="bg-brand-navy border border-white/5 rounded-[30px] p-8">
         <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black">إدارة الفروع</h2>
            <button onClick={() => setShowAdd(true)} className="bg-brand-orange px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
               <Plus size={16} /> إضافة فرع
            </button>
         </div>

         {showAdd && (
            <div className="bg-brand-black p-6 rounded-2xl border border-white/5 mb-6 space-y-4">
               <input placeholder="اسم الفرع (مثال: فرع السيف)" className="w-full bg-brand-navy p-4 rounded-xl" value={formData.branchName} onChange={e => setFormData({...formData, branchName: e.target.value})} />
               <input placeholder="العنوان بالتفصيل" className="w-full bg-brand-navy p-4 rounded-xl" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
               <input placeholder="رقم هاتف الفرع" className="w-full bg-brand-navy p-4 rounded-xl" value={formData.branchNumber} onChange={e => setFormData({...formData, branchNumber: e.target.value})} />
               <div className="flex gap-4">
                  <button onClick={handleAdd} className="bg-brand-orange px-6 py-3 rounded-xl font-bold text-sm flex-1">حفظ</button>
                  <button onClick={() => setShowAdd(false)} className="bg-white/10 px-6 py-3 rounded-xl font-bold text-sm flex-1">إلغاء</button>
               </div>
            </div>
         )}

         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data?.map((branch: any) => (
               <div key={branch.id} className="bg-brand-black p-6 rounded-2xl border border-white/5 flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-brand-orange/20 text-brand-orange flex items-center justify-center shrink-0">
                     <Building size={24} />
                  </div>
                  <div>
                     <h3 className="font-bold text-lg">{branch.branchName}</h3>
                     <p className="text-sm text-gray-400 mt-1 flex items-center gap-1"><MapPin size={12}/> {branch.address || 'لا يوجد عنوان'}</p>
                     <p className="text-sm text-gray-500 mt-1">{branch.branchNumber}</p>
                  </div>
               </div>
            ))}
         </div>
      </div>
   );
}

// ----------------------------------------------------
// Accounts Tab
// ----------------------------------------------------
function AccountsTab({ data, refetch }: any) {
   const [showAdd, setShowAdd] = useState(false);
   const [editingAccount, setEditingAccount] = useState<any>(null);
   const [formData, setFormData] = useState({ name: '', type: 'CASH', balance: '', notes: '', isActive: true });
   const createMutation = trpc.createAccount.useMutation();
   const updateMutation = trpc.updateAccount.useMutation();

   const handleAdd = async () => {
      try {
         await createMutation.mutateAsync({ ...formData, balance: Number(formData.balance) });
         setShowAdd(false);
         refetch();
         setFormData({ name: '', type: 'CASH', balance: '', notes: '', isActive: true });
      } catch (e: any) {
         alert(e.message);
      }
   };

   const handleUpdate = async () => {
      try {
         await updateMutation.mutateAsync({ 
            id: editingAccount.id, 
            name: formData.name, 
            type: formData.type, 
            balance: Number(formData.balance),
            notes: formData.notes || undefined,
            isActive: formData.isActive
         });
         setEditingAccount(null);
         refetch();
         setFormData({ name: '', type: 'CASH', balance: '', notes: '', isActive: true });
      } catch (e: any) {
         alert(e.message);
      }
   };

   const openEdit = (acc: any) => {
      setEditingAccount(acc);
      setFormData({ 
         name: acc.name, 
         type: acc.type, 
         balance: acc.balance.toString(),
         notes: acc.notes || '',
         isActive: acc.isActive ?? true
      });
   };

   return (
      <div className="bg-brand-navy border border-white/5 rounded-[30px] p-8">
         <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black">الحسابات والصناديق</h2>
            <button onClick={() => setShowAdd(true)} className="bg-brand-orange px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
               <Plus size={16} /> إضافة حساب
            </button>
         </div>

         {showAdd && !editingAccount && (
            <div className="bg-brand-black p-6 rounded-2xl border border-white/5 mb-6 space-y-4">
               <h3 className="font-bold">إضافة حساب جديد</h3>
               <input placeholder="اسم الحساب (مثال: كاشير 1، حساب البنك)" className="w-full bg-brand-navy p-4 rounded-xl" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
               <select className="w-full bg-brand-navy p-4 rounded-xl text-white" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                  <option value="CASH">صندوق كاش (Cash)</option>
                  <option value="BANK">حساب بنكي (Bank)</option>
                  <option value="BENEFIT">بنفت (Benefit)</option>
               </select>
               <input type="number" placeholder="الرصيد الافتتاحي" className="w-full bg-brand-navy p-4 rounded-xl" value={formData.balance} onChange={e => setFormData({...formData, balance: e.target.value})} />
               <input placeholder="ملاحظات (اختياري)" className="w-full bg-brand-navy p-4 rounded-xl" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
               <div className="flex gap-4">
                  <button onClick={handleAdd} className="bg-brand-orange px-6 py-3 rounded-xl font-bold text-sm flex-1">حفظ</button>
                  <button onClick={() => setShowAdd(false)} className="bg-white/10 px-6 py-3 rounded-xl font-bold text-sm flex-1">إلغاء</button>
               </div>
            </div>
         )}

         {editingAccount && (
            <div className="bg-brand-black p-6 rounded-2xl border border-white/5 mb-6 space-y-4">
               <h3 className="font-bold text-brand-orange">تعديل الحساب</h3>
               <input placeholder="اسم الحساب" className="w-full bg-brand-navy p-4 rounded-xl" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
               <select className="w-full bg-brand-navy p-4 rounded-xl text-white" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                  <option value="CASH">صندوق كاش (Cash)</option>
                  <option value="BANK">حساب بنكي (Bank)</option>
                  <option value="BENEFIT">بنفت (Benefit)</option>
               </select>
               <input type="number" placeholder="الرصيد" className="w-full bg-brand-navy p-4 rounded-xl" value={formData.balance} onChange={e => setFormData({...formData, balance: e.target.value})} />
               <input placeholder="ملاحظات (اختياري)" className="w-full bg-brand-navy p-4 rounded-xl" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
               <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} />
                  نشط
               </label>
               <div className="flex gap-4">
                  <button onClick={handleUpdate} className="bg-brand-orange px-6 py-3 rounded-xl font-bold text-sm flex-1">حفظ التعديلات</button>
                  <button onClick={() => setEditingAccount(null)} className="bg-white/10 px-6 py-3 rounded-xl font-bold text-sm flex-1">إلغاء</button>
               </div>
            </div>
         )}

         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data?.map((acc: any) => (
               <div key={acc.id} className={`bg-brand-black p-6 rounded-2xl border flex flex-col gap-4 ${!acc.isActive ? 'opacity-50 border-white/5' : 'border-white/10'}`}>
                  <div className="flex justify-between items-start">
                     <div className="flex gap-4 items-center">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
                           <CreditCard size={24} />
                        </div>
                        <div>
                           <h3 className="font-bold">{acc.name}</h3>
                           <p className="text-[10px] uppercase tracking-widest text-gray-500 mt-1">{acc.type}</p>
                        </div>
                     </div>
                     <button onClick={() => openEdit(acc)} className="text-gray-400 hover:text-white transition-colors p-2 bg-brand-navy rounded-lg text-xs">
                        تعديل
                     </button>
                  </div>
                  <div className="text-right border-t border-white/5 pt-4">
                     <p className="text-sm text-gray-400">الرصيد الحالي</p>
                     <p className="text-2xl font-black text-brand-gold mt-1">{acc.balance.toFixed(3)} <span className="text-xs text-gray-500 font-normal">د.ب</span></p>
                  </div>
               </div>
            ))}
         </div>
      </div>
   );
}

// ----------------------------------------------------
// Backup Tab
// ----------------------------------------------------
function BackupTab() {
   const backupMutation = trpc.triggerDatabaseBackup.useMutation();
   const logsQuery = trpc.getBackupLogs.useQuery();

   const handleBackup = async () => {
      try {
         const res = await backupMutation.mutateAsync();
         alert("تم إنشاء نسخة احتياطية بنجاح:\n" + res.fileName);
         logsQuery.refetch();
      } catch (e: any) {
         alert("خطأ: " + e.message);
      }
   };

   const handleDownload = (fileName: string) => {
      window.open(`http://localhost:3001/download-backup/${fileName}`, '_blank');
   };

   return (
      <div className="space-y-6">
         <div className="bg-brand-navy border border-white/5 rounded-[30px] p-8 text-center">
            <div className="w-24 h-24 bg-brand-orange/20 text-brand-orange rounded-full flex items-center justify-center mx-auto mb-6">
               <Database size={48} />
            </div>
            <h2 className="text-3xl font-black mb-4">النسخ الاحتياطي الشامل (آمن)</h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
               قم بإنشاء نسخة احتياطية آمنة بصيغة JSON لجميع بيانات النظام والمطعم. سيتم حفظها تلقائياً ويمكنك تنزيلها لاحقاً بأي وقت.
            </p>
            <button onClick={handleBackup} disabled={backupMutation.isLoading} className="bg-brand-orange px-8 py-4 rounded-xl font-bold text-lg inline-flex items-center gap-3 text-black">
               <RefreshCw size={24} className={backupMutation.isLoading ? 'animate-spin' : ''} />
               {backupMutation.isLoading ? 'جاري النسخ...' : 'إنشاء نسخة احتياطية الآن'}
            </button>
         </div>

         <div className="bg-brand-navy border border-white/5 rounded-[30px] p-8">
            <h3 className="text-xl font-bold mb-4 text-brand-gold">سجل النسخ الاحتياطية</h3>
            {logsQuery.isLoading ? <p>جاري التحميل...</p> : (
               <table className="w-full text-right">
                  <thead className="text-gray-400 text-sm">
                     <tr>
                        <th className="pb-4">اسم الملف</th>
                        <th className="pb-4">التاريخ والوقت</th>
                        <th className="pb-4">الحالة</th>
                        <th className="pb-4 text-center">تحميل</th>
                     </tr>
                  </thead>
                  <tbody className="text-sm">
                     {logsQuery.data?.map((log: any) => (
                        <tr key={log.id} className="border-t border-white/5">
                           <td className="py-4 text-gray-300" dir="ltr">{log.fileName}</td>
                           <td className="py-4">{new Date(log.createdAt).toLocaleString('en-US', { hour12: true })}</td>
                           <td className="py-4">
                              {log.status === 'SUCCESS' ? 
                                 <span className="text-green-500 bg-green-500/10 px-2 py-1 rounded">ناجح</span> : 
                                 <span className="text-red-500 bg-red-500/10 px-2 py-1 rounded">فشل</span>}
                           </td>
                           <td className="py-4 text-center">
                              {log.status === 'SUCCESS' && (
                                 <button onClick={() => handleDownload(log.fileName)} className="text-brand-orange hover:text-brand-gold font-bold bg-brand-orange/10 px-3 py-1 rounded-lg">
                                    تحميل 📥
                                 </button>
                              )}
                           </td>
                        </tr>
                     ))}
                     {(!logsQuery.data || logsQuery.data.length === 0) && (
                        <tr><td colSpan={4} className="py-8 text-center text-gray-500">لا توجد نسخ احتياطية مسجلة بعد.</td></tr>
                     )}
                  </tbody>
               </table>
            )}
         </div>
      </div>
   );
}

// ----------------------------------------------------
// Logs Tab
// ----------------------------------------------------
function LogsTab({ data, filter, setFilter, isLoading }: any) {
   const [search, setSearch] = useState('');
   const [startDate, setStartDate] = useState('');
   const [endDate, setEndDate] = useState('');

   const actionColors: Record<string, string> = {
      'UPDATE_ORDER': 'text-blue-400',
      'CREATE_EXPENSE': 'text-orange-400',
      'DELETE_ORDER': 'text-red-500',
      'ADD_STAFF': 'text-green-400',
      'CALCULATE_PAYROLL': 'text-purple-400',
      'UPDATE_STAFF': 'text-yellow-400',
      'REQUEST_SHIFT': 'text-cyan-400',
      'EDIT_ATTENDANCE': 'text-teal-400',
   };

   const filtered = (data || []).filter((log: any) => {
      if (!search) return true;
      const s = search.toLowerCase();
      return (log.details || '').toLowerCase().includes(s)
         || (log.action || '').toLowerCase().includes(s)
         || (log.user?.name || '').toLowerCase().includes(s);
   });

   return (
      <div className="bg-brand-navy border border-white/5 rounded-[30px] overflow-hidden">
         <div className="p-6 border-b border-white/5">
            <h2 className="text-2xl font-black mb-2">سجل النظام العام (Audit Logs)</h2>
            <p className="text-sm text-gray-400 mb-5">تتبع كافة الإجراءات الحساسة في النظام</p>
            
            {/* Filters */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
               {['today', 'weekly', 'monthly', 'custom', 'all'].map(f => (
                  <button key={f} onClick={() => setFilter(f)} className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${filter === f ? 'bg-brand-gold text-black' : 'bg-brand-black border border-white/10 text-gray-400 hover:text-white'}`}>
                     {f === 'today' ? 'اليوم' : f === 'weekly' ? 'الأسبوع' : f === 'monthly' ? 'الشهر' : f === 'custom' ? 'مخصص' : 'الكل'}
                  </button>
               ))}
            </div>
            
            {filter === 'custom' && (
               <div className="flex gap-3 mt-3">
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-brand-black border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-gold" />
                  <span className="text-gray-500 self-center">إلى</span>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-brand-black border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-gold" />
               </div>
            )}
            
            <div className="mt-3">
               <input 
                  type="text"
                  placeholder="🔍 بحث في السجلات (الموظف، العملية، التفاصيل)..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold"
               />
            </div>
         </div>
         
         <div className="p-3 border-b border-white/5 flex justify-between items-center bg-brand-black/20">
            <span className="text-xs text-gray-500">{filtered.length} سجل</span>
            {isLoading && <span className="text-xs text-brand-gold animate-pulse">جاري التحميل...</span>}
         </div>
         
         <div className="overflow-y-auto max-h-[600px]">
            <table className="w-full text-right">
               <thead className="bg-white/5 text-gray-500 text-xs uppercase tracking-widest sticky top-0">
                  <tr>
                     <th className="p-4">التاريخ والوقت</th>
                     <th className="p-4">الموظف</th>
                     <th className="p-4">العملية</th>
                     <th className="p-4">التفاصيل</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5 text-sm">
                  {filtered.map((log: any) => (
                     <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4 text-gray-400 whitespace-nowrap">
                           <div className="font-mono text-xs">{new Date(log.createdAt).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                           <div className="text-gray-600 text-[10px]">{new Date(log.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                        </td>
                        <td className="p-4 font-bold text-white">
                           {log.user?.name}
                           <span className="block text-[10px] text-brand-orange uppercase font-normal">{log.user?.role}</span>
                        </td>
                        <td className="p-4">
                           <span className={`font-bold text-xs px-2 py-1 rounded-lg bg-white/5 ${actionColors[log.action] || 'text-brand-gold'}`}>{log.action}</span>
                        </td>
                        <td className="p-4 text-gray-300 text-xs max-w-[300px]">{log.details}</td>
                     </tr>
                  ))}
                  {filtered.length === 0 && (
                     <tr><td colSpan={4} className="p-10 text-center text-gray-500">لا توجد سجلات تطابق البحث</td></tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
   );
}

// ----------------------------------------------------
// WhatsApp Settings Tab
// ----------------------------------------------------
function WhatsAppTab({ data, refetch }: any) {
   return (
      <div className="bg-brand-navy border border-white/5 rounded-[30px] p-8 space-y-6">
         <div>
            <h2 className="text-2xl font-black mb-2 flex items-center gap-2 text-green-500">
               <MessageCircle size={28} /> مركز الواتساب المتكامل
            </h2>
            <p className="text-gray-400 text-sm">نظام رسائل واتساب احترافي متكامل - إعدادات، قوالب، وسجلات.</p>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
               { href: "/settings/whatsapp", icon: "⚙️", label: "إعدادات الواتساب", desc: "الأرقام، التوكن، تفعيل الإشعارات، اختبار الإرسال", color: "border-green-500/30 hover:border-green-500" },
               { href: "/settings/whatsapp-templates", icon: "📝", label: "قوالب الرسائل", desc: "تعديل نصوص كل نوع رسالة مع المتغيرات الديناميكية", color: "border-brand-orange/30 hover:border-brand-orange" },
               { href: "/settings/whatsapp-logs", icon: "📋", label: "سجل الرسائل", desc: "عرض حالة جميع الرسائل المرسلة والمعلقة والفاشلة", color: "border-purple-500/30 hover:border-purple-500" },
            ].map(card => (
               <a key={card.href} href={card.href} className={`block bg-brand-black/50 border ${card.color} rounded-3xl p-6 transition-all hover:bg-brand-black group`}>
                  <div className="text-4xl mb-3">{card.icon}</div>
                  <h3 className="font-black text-white text-lg mb-1">{card.label}</h3>
                  <p className="text-xs text-gray-400">{card.desc}</p>
                  <div className="mt-4 text-brand-orange text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">فتح الصفحة ←</div>
               </a>
            ))}
         </div>
         <div className="bg-brand-black/40 rounded-2xl p-5 border border-white/5">
            <h3 className="font-bold text-white mb-4">خطوات الربط بـ Meta API</h3>
            <ol className="space-y-2 text-sm text-gray-400 list-decimal list-inside">
               <li>أنشئ حساب على <strong className="text-white">Meta Developer Console</strong></li>
               <li>أضف تطبيق واتساب وأنشئ <strong className="text-white">WhatsApp Business Account</strong></li>
               <li>احصل على <strong className="text-white">Access Token</strong> و <strong className="text-white">Phone Number ID</strong></li>
               <li>أدخل البيانات في <a href="/settings/whatsapp" className="text-brand-orange underline">إعدادات الواتساب</a></li>
               <li>جرب الإرسال عبر زر <strong className="text-white">اختبار الإرسال</strong></li>
            </ol>
         </div>
      </div>
   );
}
