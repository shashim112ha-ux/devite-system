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
import { displayQuantity } from "../../utils/format";

export default function SmartInventory() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDamageModal, setShowDamageModal] = useState(false);
  const [view, setView] = useState<"stock" | "history" | "damaged">("stock");
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  
  const inventoryQuery = trpc.getInventory.useQuery({ page, limit: 20, search: searchQuery });
  const inventoryList = inventoryQuery.data?.data || [];
  const totalPages = inventoryQuery.data?.totalPages || 1;
  const addInventoryMutation = trpc.addInventoryItem.useMutation();
  const updateInventoryMutation = trpc.updateInventoryItem.useMutation();
  const deleteInventoryMutation = trpc.deleteInventoryItem.useMutation();
  const reportDamagedMutation = trpc.reportDamagedItem.useMutation();
  
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);

  const lowStockItems = inventoryList.filter((i: any) => i.quantity <= i.minThreshold);
  
  const movementsQuery = trpc.getInventoryMovements.useQuery({}, { enabled: view === 'history' || view === 'damaged' });
  const transferMutation = trpc.transferInventory.useMutation();

  const displayedLogs = view === 'history' 
    ? movementsQuery.data || []
    : (movementsQuery.data || []).filter(l => l.type === 'DAMAGED');

  const userRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;
  const isAdminOrManager = userRole === 'ADMIN' || userRole === 'MANAGER';

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
           {view === 'damaged' ? (
             <button onClick={() => setShowDamageModal(true)} className="bg-red-500 hover:bg-red-600 px-8 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-red-500/20 transition-all text-white">
                <AlertCircle size={20} />
                الإبلاغ عن تلف
             </button>
           ) : (
             isAdminOrManager ? (
               <button onClick={() => { setEditingItem(null); setShowAddModal(true); }} className="bg-brand-orange px-8 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-brand-orange/20">
                  <Plus size={20} />
                  إضافة مادة
               </button>
             ) : null
           )}
        </div>
      </header>

      {/* Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <InventoryKPI title="إجمالي المواد (هذه الصفحة)" value={inventoryList.length} icon={<Layers />} color="gold" />
        <InventoryKPI title="مواد في خطر النفاذ" value={lowStockItems.length} icon={<AlertCircle />} color="red" />
        <InventoryKPI title="مواد قريبة من الانتهاء" value={0} icon={<Calendar />} color="orange" />
      </div>

      {view === 'stock' && (
      <div className="bg-brand-navy-light rounded-[40px] overflow-hidden border border-white/5">
         <table className="w-full text-right">
            <thead className="bg-white/5 text-gray-500 text-xs uppercase">
               <tr>
                  <th className="p-6">المادة</th>
                  <th className="p-6 text-brand-orange">عربة (متوفر)</th>
                  <th className="p-6 text-blue-400">البيت</th>
                  <th className="p-6 text-purple-400">المخزن</th>
                  <th className="p-6">الحد الأدنى</th>
                  <th className="p-6">سعر الوحدة</th>
                  <th className="p-6">إجراءات</th>
                  <th className="p-6">الحالة</th>
                  <th className="p-6">تاريخ الانتهاء</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
               {inventoryList.map((item: any) => (
                 <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                     <td className="p-6">
                         <div className="flex items-center gap-4 relative group">
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                               <Package size={18} />
                            </div>
                            <span className="font-bold">{item.name}</span>
                            {isAdminOrManager && (
                              <button onClick={() => { setEditingItem(item); setShowAddModal(true); }} className="bg-white/5 hover:bg-brand-orange hover:text-white p-2 rounded-lg transition-all text-brand-gold mr-4">
                                 <Edit2 size={14} />
                              </button>
                            )}
                         </div>
                    </td>
                    <td className="p-6 font-black text-xl text-brand-orange">{displayQuantity(item.quantity)} <span className="text-[10px] text-gray-500">{item.unit}</span></td>
                    <td className="p-6 font-bold text-lg text-blue-400">{displayQuantity(item.homeQuantity)} <span className="text-[10px] text-gray-500">{item.unit}</span></td>
                    <td className="p-6 font-bold text-lg text-purple-400">{displayQuantity(item.storageQuantity)} <span className="text-[10px] text-gray-500">{item.unit}</span></td>
                    <td className="p-6 text-gray-500">{item.minThreshold} {item.unit}</td>
                    <td className="p-6 text-brand-gold font-bold">{item.unitPrice} د.ب</td>
                    <td className="p-6">
                       {isAdminOrManager && (
                         <button onClick={() => { setEditingItem(item); setShowTransferModal(true); }} className="bg-white/5 hover:bg-brand-orange px-3 py-1 rounded-lg text-xs font-bold transition-all mr-2">تحويل</button>
                       )}
                    </td>
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
               {inventoryList.length === 0 && (
                 <tr><td colSpan={7} className="p-12 text-center text-gray-500">لا يوجد مواد في المخزون</td></tr>
               )}
             </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex justify-between items-center p-4 border-t border-white/5 bg-brand-navy-light/10">
              <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="px-4 py-2 bg-white/5 rounded-xl disabled:opacity-50 text-white text-xs">السابق</button>
              <span className="text-sm text-gray-400">صفحة {page} من {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-4 py-2 bg-white/5 rounded-xl disabled:opacity-50 text-white text-xs">التالي</button>
            </div>
          )}
       </div>
       )}

       {(view === 'history' || view === 'damaged') && (
         <div className="bg-brand-navy-light rounded-[40px] overflow-hidden border border-white/5">
            <table className="w-full text-right">
               <thead className="bg-white/5 text-gray-500 text-xs uppercase">
                  <tr>
                     <th className="p-6">التاريخ</th>
                     <th className="p-6">المادة</th>
                     <th className="p-6">بواسطة</th>
                     <th className="p-6">{view === 'damaged' ? 'الكمية التالفة' : 'تغيير الكمية'}</th>
                     <th className="p-6">السبب</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                  {displayedLogs?.map((log: any) => (
                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                       <td className="p-6 text-sm">{new Date(log.createdAt).toLocaleString('ar-SA')}</td>
                       <td className="p-6 font-bold">{log.inventoryItem?.name}</td>
                       <td className="p-6 text-sm text-gray-400">{log.createdBy}</td>
                       <td className="p-6">
                           <span className={log.quantityChange > 0 ? 'text-green-500' : 'text-red-500 font-bold'} dir="ltr">
                              {log.quantityChange > 0 ? '+' : ''}{log.quantityChange}
                           </span>
                           <div className="text-[10px] text-gray-500 mt-1">{log.type}</div>
                       </td>
                       <td className="p-6 text-sm text-brand-gold">
                         {log.reason || '-'}
                         {log.fromLocation && log.toLocation && (
                           <div className="text-[10px] text-blue-300 mt-1">من {log.fromLocation} إلى {log.toLocation}</div>
                         )}
                       </td>
                    </tr>
                  ))}
                  {displayedLogs?.length === 0 && (
                     <tr><td colSpan={5} className="p-10 text-center text-gray-500">لا توجد سجلات.</td></tr>
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
        {showDamageModal && <ReportDamageModal
          inventory={inventoryList}
          onClose={() => setShowDamageModal(false)}
          onSubmit={async (data: any) => {
            try {
              await reportDamagedMutation.mutateAsync(data);
              inventoryQuery.refetch();
              if (view === 'history' || view === 'damaged') movementsQuery.refetch();
              setShowDamageModal(false);
            } catch (e: any) {
              alert(`خطأ: ${e.message}`);
            }
          }}
        />}
        {showTransferModal && editingItem && <TransferModal
          item={editingItem}
          onClose={() => { setShowTransferModal(false); setEditingItem(null); }}
          onSubmit={async (data: any) => {
            try {
              await transferMutation.mutateAsync({
                 inventoryItemId: editingItem.id,
                 ...data
              });
              inventoryQuery.refetch();
              movementsQuery.refetch();
              setShowTransferModal(false);
              setEditingItem(null);
            } catch (e: any) {
              alert(`خطأ: ${e.message}`);
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
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async () => {
     setIsSubmitting(true);
     await onAdd(formData);
     setIsSubmitting(false);
  };

  const handleDelete = async () => {
     setIsSubmitting(true);
     await onDelete(initialData.id);
     setIsSubmitting(false);
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
          <button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 bg-brand-orange py-4 rounded-xl font-bold disabled:opacity-50">{initialData ? 'حفظ التعديلات' : 'إضافة'}</button>
          {initialData && (
            <button onClick={handleDelete} disabled={isSubmitting} className="flex-1 bg-red-500/10 text-red-500 py-4 rounded-xl font-bold border border-red-500/20 hover:bg-red-500 hover:text-white transition-all disabled:opacity-50">حذف العنصر</button>
          )}
          <button onClick={onClose} disabled={isSubmitting} className="flex-1 bg-white/10 py-4 rounded-xl font-bold disabled:opacity-50">إلغاء</button>
        </div>
      </div>
    </motion.div>
  );
}

function InventoryKPI({ title, value, icon, color }: any) {
  const colors: any = {
    gold: "text-brand-gold bg-brand-gold/10 border-brand-gold/20",
    red: "text-red-500 bg-red-500/10 border-red-500/20",
    orange: "text-brand-orange bg-brand-orange/10 border-brand-orange/20"
  };

  return (
    <div className="bg-brand-navy-light p-6 rounded-[30px] border border-white/5 flex items-center justify-between">
      <div>
        <p className="text-xs text-gray-400 mb-2">{title}</p>
        <p className="text-3xl font-black">{value}</p>
      </div>
      <div className={`p-4 rounded-2xl border ${colors[color]}`}>
        {icon}
      </div>
    </div>
  );
}

function ReportDamageModal({ inventory, onClose, onSubmit }: any) {
  const [formData, setFormData] = useState({
    inventoryItemId: '',
    quantity: '',
    reason: '',
    location: 'TRUCK'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await onSubmit({ ...formData, quantity: Number(formData.quantity) });
    setIsSubmitting(false);
  };

  const selectedItem = inventory.find((i: any) => i.id === formData.inventoryItemId);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-brand-navy-light p-8 rounded-[40px] w-full max-w-md border border-white/10 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
           <h2 className="text-2xl font-black text-red-500 flex items-center gap-2"><AlertCircle /> الإبلاغ عن تلف</h2>
        </div>
        <div className="space-y-4">
          <div>
             <label className="text-sm text-gray-400 mb-2 block">المادة التالفة</label>
             <select value={formData.inventoryItemId} onChange={e => setFormData({...formData, inventoryItemId: e.target.value})} className="w-full bg-brand-black p-4 rounded-xl border border-white/5">
                <option value="">اختر المادة...</option>
                {inventory.map((i: any) => <option key={i.id} value={i.id}>{i.name} (عربة: {i.quantity} | بيت: {i.homeQuantity} | مخزن: {i.storageQuantity}) {i.unit}</option>)}
             </select>
          </div>
          <div>
             <label className="text-sm text-gray-400 mb-2 block">موقع المادة التالفة</label>
             <select value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full bg-brand-black p-4 rounded-xl border border-white/5">
                <option value="TRUCK">العربة</option>
                <option value="HOME">البيت</option>
                <option value="STORAGE">المخزن</option>
             </select>
          </div>
          <div>
             <label className="text-sm text-gray-400 mb-2 block">الكمية التالفة {selectedItem && `(${selectedItem.unit})`}</label>
             <input type="number" placeholder="مثال: 5" className="w-full bg-brand-black p-4 rounded-xl border border-white/5" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
          </div>
          <div>
             <label className="text-sm text-gray-400 mb-2 block">السبب (مثال: انتهاء صلاحية، كسر)</label>
             <input placeholder="السبب..." className="w-full bg-brand-black p-4 rounded-xl border border-white/5" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} />
          </div>
          
          {selectedItem && formData.quantity && Number(formData.quantity) > 0 && (
            <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20 text-red-500 text-sm font-bold">
               ستنخفض هذه الكمية من المخزون وسيتم تسجيل خسارة مالية بقيمة: {((Number(formData.quantity) * selectedItem.unitPrice) || 0).toFixed(3)} د.ب في المصروفات.
            </div>
          )}
        </div>
        <div className="flex gap-4 mt-8">
          <button 
             onClick={handleSubmit} 
             disabled={!formData.inventoryItemId || !formData.quantity || !formData.reason || isSubmitting}
             className="flex-1 bg-red-500 py-4 rounded-xl font-bold text-white disabled:opacity-50"
          >
             اعتماد وإبلاغ
          </button>
          <button onClick={onClose} disabled={isSubmitting} className="flex-1 bg-white/10 py-4 rounded-xl font-bold disabled:opacity-50">إلغاء</button>
        </div>
      </div>
    </motion.div>
  );
}

function TransferModal({ item, onClose, onSubmit }: any) {
  const [formData, setFormData] = useState({
    fromLocation: 'HOME',
    toLocation: 'TRUCK',
    quantity: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await onSubmit({ ...formData, quantity: Number(formData.quantity) });
    setIsSubmitting(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-brand-navy-light p-8 rounded-[40px] w-full max-w-md border border-white/10 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
           <h2 className="text-2xl font-black text-brand-orange flex items-center gap-2"><ArrowUpRight /> تحويل مخزون</h2>
        </div>
        <p className="text-sm text-gray-400 mb-6">المادة: <span className="font-bold text-white">{item.name}</span></p>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="text-sm text-gray-400 mb-2 block">من موقع</label>
               <select value={formData.fromLocation} onChange={e => setFormData({...formData, fromLocation: e.target.value})} className="w-full bg-brand-black p-4 rounded-xl border border-white/5">
                  <option value="TRUCK">العربة ({item.quantity})</option>
                  <option value="HOME">البيت ({item.homeQuantity || 0})</option>
                  <option value="STORAGE">المخزن ({item.storageQuantity || 0})</option>
               </select>
            </div>
            <div>
               <label className="text-sm text-gray-400 mb-2 block">إلى موقع</label>
               <select value={formData.toLocation} onChange={e => setFormData({...formData, toLocation: e.target.value})} className="w-full bg-brand-black p-4 rounded-xl border border-white/5">
                  <option value="TRUCK">العربة</option>
                  <option value="HOME">البيت</option>
                  <option value="STORAGE">المخزن</option>
               </select>
            </div>
          </div>
          <div>
             <label className="text-sm text-gray-400 mb-2 block">الكمية المحولة ({item.unit})</label>
             <input type="number" placeholder="مثال: 5" className="w-full bg-brand-black p-4 rounded-xl border border-white/5" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
          </div>
        </div>
        <div className="flex gap-4 mt-8">
          <button 
             onClick={handleSubmit} 
             disabled={!formData.quantity || formData.fromLocation === formData.toLocation || isSubmitting}
             className="flex-1 bg-brand-orange py-4 rounded-xl font-bold text-white disabled:opacity-50"
          >
             اعتماد التحويل
          </button>
          <button onClick={onClose} disabled={isSubmitting} className="flex-1 bg-white/10 py-4 rounded-xl font-bold disabled:opacity-50">إلغاء</button>
        </div>
      </div>
    </motion.div>
  );
}
