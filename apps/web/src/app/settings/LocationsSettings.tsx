import { useState } from "react";
import { trpc } from "../utils/trpc";
import { MapPin, Plus, Edit2, Map } from "lucide-react";

export function LocationsSettings() {
  const { data: locations, refetch } = trpc.getBranchLocations.useQuery();
  const createMutation = trpc.createBranchLocation.useMutation();
  const updateMutation = trpc.updateBranchLocation.useMutation();

  const [form, setForm] = useState({ id: "", country: "مملكة البحرين", governorate: "", branchName: "", address: "", googleMapsUrl: "", branchNumber: "", isActive: true });
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
          <h3 className="text-xl font-bold flex items-center gap-2"><MapPin className="text-brand-orange" /> مواقع الفروع</h3>
          <p className="text-xs text-gray-400 mt-1">إدارة بيانات ومواقع فروع عربات الطعام والمحلات</p>
        </div>
        <button 
          onClick={() => { setForm({ id: "", country: "مملكة البحرين", governorate: "", branchName: "", address: "", googleMapsUrl: "", branchNumber: "", isActive: true }); setShowModal(true); }}
          className="bg-brand-orange px-6 py-3 rounded-xl font-bold flex gap-2 items-center text-white"
        >
          <Plus size={16} /> إضافة فرع
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {locations?.map(loc => (
          <div key={loc.id} className="bg-brand-navy-light rounded-3xl p-6 border border-white/5 relative group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <MapPin className="text-brand-gold" size={20} />
                <h4 className="text-lg font-bold">{loc.branchName}</h4>
              </div>
              <button onClick={() => { setForm(loc as any); setShowModal(true); }} className="text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 size={14}/></button>
            </div>
            
            <div className="space-y-2 mt-4">
              <div className="text-xs text-gray-400 flex justify-between"><span>الدولة:</span> <span className="text-white">{loc.country}</span></div>
              {loc.governorate && <div className="text-xs text-gray-400 flex justify-between"><span>المحافظة:</span> <span className="text-white">{loc.governorate}</span></div>}
              {loc.branchNumber && <div className="text-xs text-gray-400 flex justify-between"><span>رقم الفرع:</span> <span className="text-white">{loc.branchNumber}</span></div>}
              {loc.address && <div className="text-xs text-gray-400 mt-2 p-2 bg-brand-black rounded-lg">{loc.address}</div>}
              {loc.googleMapsUrl && (
                <a href={loc.googleMapsUrl} target="_blank" rel="noreferrer" className="text-brand-orange text-xs flex items-center gap-1 mt-2 hover:underline">
                  <Map size={12} /> عرض على الخريطة
                </a>
              )}
            </div>
            {!loc.isActive && <span className="absolute top-6 left-6 text-[10px] text-red-500 bg-red-500/10 px-2 py-1 rounded-md">مغلق</span>}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-brand-navy-light w-full max-w-lg rounded-3xl p-8 border border-white/10 space-y-4">
            <h3 className="text-lg font-bold text-brand-gold mb-4">{form.id ? 'تعديل بيانات الفرع' : 'إضافة فرع جديد'}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs text-gray-400">اسم الفرع (العربة)</label>
                <input value={form.branchName} onChange={e => setForm({...form, branchName: e.target.value})} className="w-full bg-brand-black border border-white/5 rounded-xl p-3 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400">الدولة</label>
                <input value={form.country} onChange={e => setForm({...form, country: e.target.value})} className="w-full bg-brand-black border border-white/5 rounded-xl p-3 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400">المحافظة / المدينة</label>
                <input value={form.governorate} onChange={e => setForm({...form, governorate: e.target.value})} className="w-full bg-brand-black border border-white/5 rounded-xl p-3 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400">رقم الهاتف للفرع</label>
                <input value={form.branchNumber} onChange={e => setForm({...form, branchNumber: e.target.value})} className="w-full bg-brand-black border border-white/5 rounded-xl p-3 text-sm" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-400">العنوان التفصيلي</label>
                <input value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full bg-brand-black border border-white/5 rounded-xl p-3 text-sm" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-400">رابط خرائط جوجل (Google Maps)</label>
                <input value={form.googleMapsUrl} onChange={e => setForm({...form, googleMapsUrl: e.target.value})} className="w-full bg-brand-black border border-white/5 rounded-xl p-3 text-sm" />
              </div>
              
              {form.id && (
                <div className="flex items-center gap-2 col-span-2 mt-2">
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} />
                  <label className="text-xs text-gray-400">الفرع نشط ومفتوح</label>
                </div>
              )}
            </div>
            
            <div className="flex gap-3 pt-4 border-t border-white/5 mt-4">
              <button onClick={handleSave} className="flex-1 bg-brand-orange text-black font-bold py-3 rounded-xl">حفظ</button>
              <button onClick={() => setShowModal(false)} className="flex-1 bg-white/10 font-bold py-3 rounded-xl">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
