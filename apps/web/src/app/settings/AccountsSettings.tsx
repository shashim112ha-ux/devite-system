import { useState } from "react";
import { trpc } from "../utils/trpc";
import { Wallet, Plus, Edit2, Trash2 } from "lucide-react";

export function AccountsSettings() {
  const { data: accounts, refetch } = trpc.getAccounts.useQuery();
  const createMutation = trpc.createAccount.useMutation();
  const updateMutation = trpc.updateAccount.useMutation();
  const deleteMutation = trpc.deleteAccount.useMutation();

  const [form, setForm] = useState({ id: "", name: "", type: "CASH", balance: 0, notes: "", isActive: true });
  const [showModal, setShowModal] = useState(false);

  const handleSave = async () => {
    if (form.id) {
      await updateMutation.mutateAsync({ ...form });
    } else {
      await createMutation.mutateAsync({ ...form });
    }
    setShowModal(false);
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-brand-navy/60 rounded-[40px] border border-white/5 p-8">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2"><Wallet className="text-brand-orange" /> الحسابات المالية</h3>
          <p className="text-xs text-gray-400 mt-1">إدارة حسابات النقدية والبنك وتطبيقات التوصيل (كاش، بنفت، طلبات)</p>
        </div>
        <button 
          onClick={() => { setForm({ id: "", name: "", type: "CASH", balance: 0, notes: "", isActive: true }); setShowModal(true); }}
          className="bg-brand-orange px-6 py-3 rounded-xl font-bold flex gap-2 items-center text-white"
        >
          <Plus size={16} /> إضافة حساب
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts?.map(acc => (
          <div key={acc.id} className="bg-brand-navy-light rounded-3xl p-6 border border-white/5 relative group">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-brand-gold/20 text-brand-gold px-3 py-1 rounded-full text-[10px] font-bold">{acc.type}</div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setForm(acc as any); setShowModal(true); }} className="text-gray-400 hover:text-white"><Edit2 size={14}/></button>
              </div>
            </div>
            <h4 className="text-lg font-bold">{acc.name}</h4>
            <p className="text-2xl font-black text-brand-orange mt-2">{acc.balance} <span className="text-sm font-normal">د.ب</span></p>
            {acc.notes && <p className="text-xs text-gray-500 mt-2">{acc.notes}</p>}
            {!acc.isActive && <span className="absolute bottom-6 right-6 text-[10px] text-red-500 bg-red-500/10 px-2 py-1 rounded-md">غير نشط</span>}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-brand-navy-light w-full max-w-md rounded-3xl p-8 border border-white/10 space-y-4">
            <h3 className="text-lg font-bold text-brand-gold mb-4">{form.id ? 'تعديل الحساب' : 'حساب جديد'}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400">اسم الحساب</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-brand-black border border-white/5 rounded-xl p-3 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400">النوع</label>
                <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full bg-brand-black border border-white/5 rounded-xl p-3 text-sm">
                  <option value="CASH">كاش (صندوق)</option>
                  <option value="ONLINE">أونلاين (تطبيقات)</option>
                  <option value="CARD">بطاقة / بنفت</option>
                  <option value="BANK">حساب بنكي</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400">الرصيد الافتتاحي</label>
                <input type="number" value={form.balance} onChange={e => setForm({...form, balance: Number(e.target.value)})} className="w-full bg-brand-black border border-white/5 rounded-xl p-3 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400">ملاحظات</label>
                <input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full bg-brand-black border border-white/5 rounded-xl p-3 text-sm" />
              </div>
              {form.id && (
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} />
                  <label className="text-xs text-gray-400">الحساب نشط</label>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button onClick={handleSave} className="flex-1 bg-brand-orange text-black font-bold py-3 rounded-xl">حفظ</button>
                <button onClick={() => setShowModal(false)} className="flex-1 bg-white/10 font-bold py-3 rounded-xl">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
