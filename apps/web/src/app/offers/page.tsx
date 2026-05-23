"use client";

import { useState } from "react";
import { trpc } from "../utils/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Tag, 
  Plus, 
  Clock, 
  Percent, 
  DollarSign, 
  Trash2,
  CheckCircle2,
  XCircle
} from "lucide-react";

export default function OffersManagement() {
  const [showAddModal, setShowAddModal] = useState(false);
  const offersQuery = trpc.getAllOffers.useQuery();
  const createOfferMutation = trpc.createOffer.useMutation();
  const updateStatusMutation = trpc.updateOfferStatus.useMutation();

  const handleAdd = async (data: any) => {
    await createOfferMutation.mutateAsync(data);
    setShowAddModal(false);
    offersQuery.refetch();
  };

  const handleToggle = async (id: string, active: boolean) => {
    await updateStatusMutation.mutateAsync({ id, active: !active });
    offersQuery.refetch();
  };

  return (
    <div className="min-h-screen bg-brand-black p-10">
      <header className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-black text-brand-gold flex items-center gap-3">
            <Tag /> إدارة العروض والخصومات
          </h1>
          <p className="text-gray-500 mt-2">تحكم بالعروض التسويقية وتواريخ انتهائها</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-brand-orange px-8 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-brand-orange/20"
        >
          <Plus size={20} />
          إضافة عرض جديد
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {offersQuery.data?.map((offer: any) => (
          <motion.div 
            key={offer.id}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`bg-brand-navy-light rounded-[40px] p-8 border ${offer.active ? 'border-brand-gold/30' : 'border-white/5 opacity-70'}`}
          >
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 bg-brand-black rounded-xl flex items-center justify-center text-brand-orange">
                <Percent size={24} />
              </div>
              <button 
                onClick={() => handleToggle(offer.id, offer.active)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 ${offer.active ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}
              >
                {offer.active ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                {offer.active ? 'نشط' : 'متوقف'}
              </button>
            </div>

            <h3 className="text-2xl font-bold mb-2">{offer.title}</h3>
            <p className="text-gray-400 text-xs mb-6 h-10">{offer.description}</p>

            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
              <div>
                <p className="text-[10px] text-gray-500 mb-1">السعر بعد الخصم</p>
                <p className="font-black text-brand-gold">{offer.price} د.ب</p>
              </div>
              {offer.oldPrice && (
                <div>
                  <p className="text-[10px] text-gray-500 mb-1">السعر السابق</p>
                  <p className="font-bold text-gray-400 line-through">{offer.oldPrice} د.ب</p>
                </div>
              )}
              <div className="col-span-2">
                <p className="text-[10px] text-gray-500 mb-1 flex items-center gap-1"><Clock size={10} /> ينتهي في</p>
                <p className="text-xs font-bold">{new Date(offer.endDate).toLocaleDateString('ar-SA')}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showAddModal && <AddOfferModal onClose={() => setShowAddModal(false)} onAdd={handleAdd} />}
      </AnimatePresence>
    </div>
  );
}

function AddOfferModal({ onClose, onAdd }: any) {
  const [formData, setFormData] = useState({ 
    title: '', 
    description: '', 
    price: 0, 
    oldPrice: 0, 
    discount: 0, 
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    type: 'DISCOUNT',
    imageUrl: ''
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-brand-navy-light p-10 rounded-[40px] w-full max-w-lg border border-white/10 shadow-2xl">
        <h2 className="text-2xl font-black mb-8 text-brand-gold">إضافة عرض ترويجي</h2>
        <div className="space-y-4">
          <input placeholder="عنوان العرض" className="w-full bg-brand-black p-4 rounded-xl border border-white/5" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
          <textarea placeholder="وصف العرض والشروط" className="w-full bg-brand-black p-4 rounded-xl border border-white/5 h-24 resize-none" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-gray-500 mb-1 block">السعر المخفض (د.ب)</label>
              <input type="number" step="0.1" className="w-full bg-brand-black p-4 rounded-xl border border-white/5" value={formData.price || ''} onChange={e => setFormData({...formData, price: Number(e.target.value)})} />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 mb-1 block">السعر الأصلي (اختياري)</label>
              <input type="number" step="0.1" className="w-full bg-brand-black p-4 rounded-xl border border-white/5" value={formData.oldPrice || ''} onChange={e => setFormData({...formData, oldPrice: Number(e.target.value)})} />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-gray-500 mb-1 block">نسبة الخصم % (اختياري)</label>
              <input type="number" className="w-full bg-brand-black p-4 rounded-xl border border-white/5" value={formData.discount || ''} onChange={e => setFormData({...formData, discount: Number(e.target.value)})} />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 mb-1 block">رابط الصورة (اختياري)</label>
              <input type="text" className="w-full bg-brand-black p-4 rounded-xl border border-white/5 text-white" value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-gray-500 mb-1 block">تاريخ البداية</label>
              <input type="date" className="w-full bg-brand-black p-4 rounded-xl border border-white/5 text-white" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 mb-1 block">تاريخ الانتهاء</label>
              <input type="date" className="w-full bg-brand-black p-4 rounded-xl border border-white/5 text-white" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-gray-500 mb-1 block">نوع العرض</label>
              <select className="w-full bg-brand-black p-4 rounded-xl border border-white/5 text-white outline-none" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                 <option value="DISCOUNT">خصم مباشر</option>
                 <option value="COMBO">وجبة كومبو</option>
                 <option value="BOGO">اشتر 1 واحصل على 1</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="flex gap-4 mt-8">
          <button onClick={() => onAdd({ ...formData, startDate: new Date(formData.startDate), endDate: new Date(formData.endDate) })} className="flex-1 bg-brand-orange py-4 rounded-xl font-bold">إطلاق العرض</button>
          <button onClick={onClose} className="flex-1 bg-white/10 py-4 rounded-xl font-bold">إلغاء</button>
        </div>
      </div>
    </motion.div>
  );
}
