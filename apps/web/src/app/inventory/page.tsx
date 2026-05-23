"use client";

import { useState } from "react";
import { trpc } from "../utils/trpc";
import { 
  Package, 
  Plus, 
  ShoppingCart, 
  AlertCircle, 
  Calendar, 
  History, 
  ArrowUpRight,
  TrendingDown,
  Layers,
  ChevronDown,
  Search,
  Edit2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function SmartInventory() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [view, setView] = useState<"stock" | "history">("stock");
  
  const inventoryQuery = trpc.getInventory.useQuery();
  const addInventoryMutation = trpc.addInventoryItem.useMutation();
  const updateInventoryMutation = trpc.updateInventoryItem.useMutation();
  
  const [editingItem, setEditingItem] = useState<any>(null);

  const lowStockItems = inventoryQuery.data?.filter(i => i.quantity <= i.minThreshold) || [];
  const auditLogsQuery = trpc.getInventoryAuditLogs.useQuery(undefined, { enabled: view === 'history' });

  return (
    <div className="min-h-screen bg-brand-black p-10">
      <header className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-black text-brand-gold">المخزون الذكي</h1>
          <div className="flex gap-4 mt-4">
             <button onClick={() => setView("stock")} className={`text-sm font-bold pb-2 border-b-2 transition-all ${view === 'stock' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-gray-500'}`}>المواد الحالية</button>
             <button onClick={() => setView("history")} className={`text-sm font-bold pb-2 border-b-2 transition-all ${view === 'history' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-gray-500'}`}>سجل التوريد</button>
          </div>
        </div>
        <div className="flex gap-4">
           <button className="bg-brand-navy-light px-6 py-3 rounded-2xl border border-white/5 flex items-center gap-2">
              <Search size={18} />
              <span className="text-xs">بحث...</span>
           </button>
           <button onClick={() => { setEditingItem(null); setShowAddModal(true); }} className="bg-brand-orange px-8 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-brand-orange/20">
              <Plus size={20} />
              إضافة مادة
           </button>
        </div>
      </header>

      {/* Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <InventoryKPI title="إجمالي المواد" value={inventoryQuery.data?.length || 0} icon={<Layers />} color="gold" />
        <InventoryKPI title="مواد تحت الحد الأدنى" value={lowStockItems.length} icon={<AlertCircle />} color="red" />
        <InventoryKPI title="تنبيهات انتهاء الصلاحية" value={0} icon={<Calendar />} color="orange" />
      </div>

      {view === 'stock' && (
      <div className="bg-brand-navy-light rounded-[40px] overflow-hidden border border-white/5">
         <table className="w-full text-right">
            <thead className="bg-white/5 text-gray-500 text-xs uppercase">
               <tr>
                  <th className="p-6">المادة</th>
                  <th className="p-6">الكمية المتوفرة</th>
                  <th className="p-6">الحد الأدنى</th>
                  <th className="p-6">سعر الوحدة</th>
                  <th className="p-6">المورد</th>
                  <th className="p-6">الحالة</th>
                  <th className="p-6">تاريخ الانتهاء</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
               {inventoryQuery.data?.map((item) => (
                 <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-6">
                       <div className="flex items-center gap-3 relative group">
                          <div className="w-10 h-10 bg-brand-black rounded-xl flex items-center justify-center text-brand-gold">
                             <Package size={18} />
                          </div>
                          <span className="font-bold">{item.name}</span>
                          <button onClick={() => { setEditingItem(item); setShowAddModal(true); }} className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/10 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                             <Edit2 size={14} className="text-brand-gold" />
                          </button>
                       </div>
                    </td>
                    <td className="p-6 font-black text-xl">{item.quantity} <span className="text-[10px] text-gray-500">{item.unit}</span></td>
                    <td className="p-6 text-gray-500">{item.minThreshold} {item.unit}</td>
                    <td className="p-6 text-brand-gold font-bold">{item.unitPrice} د.ب</td>
                    <td className="p-6 text-xs text-gray-400">{item.supplier || 'غير محدد'}</td>
                    <td className="p-6">
                       {item.quantity <= item.minThreshold ? (
                         <span className="bg-red-500/10 text-red-500 px-3 py-1 rounded-lg text-[10px] font-bold">مخزون منخفض</span>
                       ) : (
                         <span className="bg-green-500/10 text-green-500 px-3 py-1 rounded-lg text-[10px] font-bold">جيد</span>
                       )}
                    </td>
                    <td className="p-6 text-xs text-gray-500">
                       {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('ar-SA') : 'غير محدد'}
                    </td>
                 </tr>
               ))}
             </tbody>
          </table>
       </div>
       )}

       {view === 'history' && (
         <div className="bg-brand-navy-light rounded-[40px] overflow-hidden border border-white/5">
            <table className="w-full text-right">
               <thead className="bg-white/5 text-gray-500 text-xs uppercase">
                  <tr>
                     <th className="p-6">التاريخ</th>
                     <th className="p-6">المادة</th>
                     <th className="p-6">بواسطة</th>
                     <th className="p-6">تغيير الكمية</th>
                     <th className="p-6">تغيير السعر</th>
                     <th className="p-6">السبب</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                  {auditLogsQuery.data?.map((log: any) => (
                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                       <td className="p-6 text-sm">{new Date(log.createdAt).toLocaleString('ar-SA')}</td>
                       <td className="p-6 font-bold">{log.inventoryItem?.name}</td>
                       <td className="p-6 text-sm text-gray-400">{log.userName}</td>
                       <td className="p-6" dir="ltr">
                          <span className="text-gray-500">{log.oldQuantity}</span>
                          <span className="mx-2">➔</span>
                          <span className={log.newQuantity > log.oldQuantity ? 'text-green-500' : 'text-red-500'}>{log.newQuantity}</span>
                       </td>
                       <td className="p-6" dir="ltr">
                          <span className="text-gray-500">{log.oldPrice}</span>
                          <span className="mx-2">➔</span>
                          <span className={log.newPrice !== log.oldPrice ? 'text-brand-orange' : 'text-gray-500'}>{log.newPrice}</span>
                       </td>
                       <td className="p-6 text-sm text-brand-gold">{log.reason || '-'}</td>
                    </tr>
                  ))}
                  {auditLogsQuery.data?.length === 0 && (
                     <tr><td colSpan={6} className="p-10 text-center text-gray-500">لا توجد سجلات تعديل حتى الآن.</td></tr>
                  )}
               </tbody>
            </table>
         </div>
       )}


      <AnimatePresence>
        {showAddModal && <AddInventoryModal 
          initialData={editingItem}
          onClose={() => { setShowAddModal(false); setEditingItem(null); }} 
          onAdd={async (data: any) => {
            if (editingItem) {
               await updateInventoryMutation.mutateAsync({ id: editingItem.id, ...data });
            } else {
               await addInventoryMutation.mutateAsync(data);
            }
            inventoryQuery.refetch();
            setShowAddModal(false);
            setEditingItem(null);
          }} 
        />}
      </AnimatePresence>
    </div>
  );
}

function AddInventoryModal({ onClose, onAdd, initialData }: any) {
  const [formData, setFormData] = useState(initialData || { name: '', quantity: 0, unit: 'كجم', minThreshold: 5, unitPrice: 0, supplier: '', expiryDate: '', reason: '' });
  const [totalPrice, setTotalPrice] = useState<number | string>(initialData ? initialData.quantity * initialData.unitPrice : '');

  const handleTotalChange = (val: string) => {
     setTotalPrice(val);
     const numVal = Number(val);
     if (numVal > 0 && formData.quantity > 0) {
        setFormData({ ...formData, unitPrice: Number((numVal / formData.quantity).toFixed(3)) });
     }
  };

  const handleQuantityChange = (val: string) => {
     const qty = Number(val);
     const total = Number(totalPrice);
     if (qty > 0 && total > 0) {
        setFormData({ ...formData, quantity: qty, unitPrice: Number((total / qty).toFixed(3)) });
     } else {
        setFormData({ ...formData, quantity: qty });
     }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-brand-navy-light p-8 rounded-[40px] w-full max-w-md border border-white/10 shadow-2xl">
        <h2 className="text-2xl font-black mb-6 text-brand-gold">{initialData ? 'تعديل بيانات المادة' : 'إضافة مادة جديدة'}</h2>
        <div className="space-y-4">
          <input placeholder="اسم المادة" className="w-full bg-brand-black p-4 rounded-xl border border-white/5" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          <div className="flex gap-4">
            <input type="number" placeholder="الكمية" className="w-full bg-brand-black p-4 rounded-xl border border-white/5" value={formData.quantity || ''} onChange={e => handleQuantityChange(e.target.value)} />
            <input placeholder="الوحدة (كجم، لتر..)" className="w-full bg-brand-black p-4 rounded-xl border border-white/5" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} />
          </div>
          <div className="flex gap-4">
            <input type="number" placeholder="السعر الكلي (د.ب)" className="w-full bg-brand-black p-4 rounded-xl border border-white/5" value={totalPrice} onChange={e => handleTotalChange(e.target.value)} />
            <input type="number" step="0.001" placeholder="سعر الوحدة" className="w-full bg-brand-black p-4 rounded-xl border border-white/5" value={formData.unitPrice || ''} onChange={e => setFormData({...formData, unitPrice: Number(e.target.value)})} />
          </div>
          <div className="flex gap-4">
            <input type="number" placeholder="الحد الأدنى للتنبيه" className="w-full bg-brand-black p-4 rounded-xl border border-white/5" value={formData.minThreshold || ''} onChange={e => setFormData({...formData, minThreshold: Number(e.target.value)})} />
            <input type="date" placeholder="تاريخ الانتهاء" className="w-full bg-brand-black p-4 rounded-xl border border-white/5" value={formData.expiryDate ? formData.expiryDate.split('T')[0] : ''} onChange={e => setFormData({...formData, expiryDate: e.target.value})} />
          </div>
          <input placeholder="المورد" className="w-full bg-brand-black p-4 rounded-xl border border-white/5" value={formData.supplier || ''} onChange={e => setFormData({...formData, supplier: e.target.value})} />
          {initialData && (
             <input placeholder="سبب التعديل (اختياري)" className="w-full bg-brand-black p-4 rounded-xl border border-white/5" value={formData.reason || ''} onChange={e => setFormData({...formData, reason: e.target.value})} />
          )}
        </div>
        <div className="flex gap-4 mt-8">
          <button onClick={() => onAdd(formData)} className="flex-1 bg-brand-orange py-4 rounded-xl font-bold">{initialData ? 'حفظ التعديلات' : 'إضافة'}</button>
          <button onClick={onClose} className="flex-1 bg-white/10 py-4 rounded-xl font-bold">إلغاء</button>
        </div>
      </div>
    </motion.div>
  );
}

function InventoryKPI({ title, value, icon, color }: any) {
  const colors: any = {
    gold: "text-brand-gold bg-brand-gold/10",
    red: "text-red-500 bg-red-500/10",
    orange: "text-brand-orange bg-brand-orange/10",
  };
  return (
    <div className="bg-brand-navy-light p-8 rounded-[35px] border border-white/5 flex items-center gap-6">
       <div className={`p-4 rounded-2xl ${colors[color]}`}>{icon}</div>
       <div>
          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">{title}</p>
          <h3 className="text-3xl font-black">{value}</h3>
       </div>
    </div>
  );
}
