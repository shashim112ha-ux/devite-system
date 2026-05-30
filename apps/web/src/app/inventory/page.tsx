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
  const [view, setView] = useState<"stock" | "history" | "damaged">("stock");
  
  const inventoryQuery = trpc.getInventory.useQuery();
  const addInventoryMutation = trpc.addInventoryItem.useMutation();
  const updateInventoryMutation = trpc.updateInventoryItem.useMutation();
  const deleteInventoryMutation = trpc.deleteInventoryItem.useMutation();
  const reportDamagedMutation = trpc.reportDamagedItem.useMutation();
  
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
             <button onClick={() => setView("damaged")} className={`text-sm font-bold pb-2 border-b-2 transition-all ${view === 'damaged' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-gray-500'}`}>العناصر التالفة</button>
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
                         <div className="flex items-center gap-4 relative group">
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                               <Package size={18} />
                            </div>
                            <span className="font-bold">{item.name}</span>
                            <button onClick={() => { setEditingItem(item); setShowAddModal(true); }} className="bg-white/5 hover:bg-brand-orange hover:text-white p-2 rounded-lg transition-all text-brand-gold mr-4">
                               <Edit2 size={14} />
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
            try {
              if (editingItem) {
                 await updateInventoryMutation.mutateAsync({ id: editingItem.id, ...data });
              } else {
                 await addInventoryMutation.mutateAsync(data);
              }
              inventoryQuery.refetch();
              setShowAddModal(false);
              setEditingItem(null);
            } catch (e: any) {
              alert(`خطأ: ${e.message}`);
            }
          }}
          onDelete={async (id: string) => {
            if (confirm("هل أنت متأكد من حذف هذه المادة نهائياً؟")) {
              try {
                await deleteInventoryMutation.mutateAsync({ id });
                inventoryQuery.refetch();
                setShowAddModal(false);
                setEditingItem(null);
              } catch (e: any) {
                alert(`خطأ في الحذف: ${e.message}`);
              }
            }
          }}
        />}
      </AnimatePresence>
    </div>
  );
}

function AddInventoryModal({ onClose, onAdd, onDelete, initialData }: any) {
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
            <input type="number" step="0.001" placeholder="سعر الوحدة (تلقائي)" className="w-full bg-brand-black/50 p-4 rounded-xl border border-white/5 text-brand-orange font-bold cursor-not-allowed" value={formData.unitPrice || ''} readOnly />
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
          {initialData && (
            <button onClick={() => onDelete(initialData.id)} className="flex-1 bg-red-500/10 text-red-500 py-4 rounded-xl font-bold border border-red-500/20 hover:bg-red-500 hover:text-white transition-all">حذف العنصر</button>
          )}
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

function DamagedInventoryTab({ inventoryItems, onSubmit }: { inventoryItems: any[], onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    inventoryItemId: '',
    quantity: '',
    reason: '',
    notes: ''
  });

  return (
    <div className="bg-brand-navy-light p-10 rounded-[40px] border border-white/5 max-w-3xl mx-auto shadow-2xl">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-brand-gold mb-2 flex items-center gap-2">
          <AlertCircle /> تسجيل عنصر تالف (متلفات)
        </h2>
        <p className="text-gray-400 text-sm">سيتم خصم الكمية من المخزون فوراً وتسجيل تكلفتها كخسائر مالية تلقائياً في حساب المصروفات.</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-400">اختر المادة من المخزون</label>
          <select 
            className="w-full bg-brand-black border border-white/10 p-4 rounded-xl focus:border-brand-orange"
            value={formData.inventoryItemId}
            onChange={e => setFormData({ ...formData, inventoryItemId: e.target.value })}
          >
            <option value="">-- اختر المادة --</option>
            {inventoryItems.map(item => (
              <option key={item.id} value={item.id}>{item.name} (المتوفر: {item.quantity} {item.unit})</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-400">الكمية التالفة</label>
          <input 
            type="number" 
            step="0.01"
            placeholder="مثال: 2.5" 
            className="w-full bg-brand-black border border-white/10 p-4 rounded-xl focus:border-brand-orange"
            value={formData.quantity}
            onChange={e => setFormData({ ...formData, quantity: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-400">سبب الإتلاف الرئيسي</label>
          <select 
            className="w-full bg-brand-black border border-white/10 p-4 rounded-xl focus:border-brand-orange"
            value={formData.reason}
            onChange={e => setFormData({ ...formData, reason: e.target.value })}
          >
            <option value="">-- حدد السبب --</option>
            <option value="انتهاء صلاحية">انتهاء صلاحية</option>
            <option value="تلف أثناء التحضير">تلف أثناء التحضير</option>
            <option value="سوء تخزين">سوء تخزين</option>
            <option value="انسكاب/كسر">انسكاب / كسر</option>
            <option value="أخرى">أخرى</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-400">ملاحظات إضافية (اختياري)</label>
          <textarea 
            placeholder="اكتب أي ملاحظات أو تفاصيل عن سبب التلف..."
            className="w-full bg-brand-black border border-white/10 p-4 rounded-xl focus:border-brand-orange min-h-[100px]"
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>

        <button 
          onClick={() => {
            if (!formData.inventoryItemId || !formData.quantity || !formData.reason) {
              alert("يرجى تعبئة جميع الحقول المطلوبة (المادة، الكمية، والسبب).");
              return;
            }
            onSubmit({
              inventoryItemId: formData.inventoryItemId,
              quantity: Number(formData.quantity),
              reason: formData.reason,
              notes: formData.notes
            });
            setFormData({ inventoryItemId: '', quantity: '', reason: '', notes: '' });
          }}
          className="w-full bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 py-4 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2"
        >
          <AlertCircle size={20} />
          اعتماد التالف وخصم الكمية
        </button>
      </div>
    </div>
  );
}
