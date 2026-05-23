"use client";

import { useState } from "react";
import { trpc } from "../utils/trpc";
import { 
  Plus, 
  User, 
  Phone, 
  Briefcase, 
  DollarSign, 
  Clock, 
  Calendar, 
  ChevronRight, 
  Edit2, 
  Trash2,
  X,
  CreditCard,
  Mail
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function StaffManagement() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [view, setView] = useState<"list" | "salaries" | "attendance">("list");
  
  const staffQuery = trpc.getStaff.useQuery();
  const salaryQuery = trpc.getStaffSalaries.useQuery();
  const attendanceQuery = trpc.getAttendance.useQuery();
  const checkInMutation = trpc.checkIn.useMutation();
  const checkOutMutation = trpc.checkOut.useMutation();
  const addStaffMutation = trpc.addStaff.useMutation();
  const updateStaffMutation = trpc.updateStaff.useMutation();
  const adminAddAttendanceMutation = trpc.adminAddAttendance.useMutation();
  const editAttendanceMutation = trpc.editAttendance.useMutation();

  const [showManualAttendance, setShowManualAttendance] = useState(false);
  const [attendanceForm, setAttendanceForm] = useState({
    userId: "",
    checkIn: "",
    checkOut: "",
    reason: ""
  });

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    role: "CASHIER" as any,
    jobDescription: "",
    salary: "0",
    hourlyRate: "0",
    shiftType: "Full-time",
    active: true
  });

  const handleSave = async () => {
    const payload = {
      ...formData,
      salary: Number(formData.salary),
      hourlyRate: Number(formData.hourlyRate)
    };

    if (editingStaff) {
      await updateStaffMutation.mutateAsync({ id: editingStaff.id, ...payload });
    } else {
      await addStaffMutation.mutateAsync(payload as any);
    }
    setShowAddModal(false);
    setEditingStaff(null);
    staffQuery.refetch();
    salaryQuery.refetch();
  };

  return (
    <div className="min-h-screen bg-brand-black p-10">
      <header className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-black text-brand-gold">إدارة التشغيل والموظفين</h1>
          <div className="flex gap-4 mt-4">
             <button onClick={() => setView("list")} className={`text-sm font-bold pb-2 border-b-2 transition-all ${view === 'list' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-gray-500'}`}>قائمة الموظفين</button>
             <button onClick={() => setView("attendance")} className={`text-sm font-bold pb-2 border-b-2 transition-all ${view === 'attendance' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-gray-500'}`}>الحضور والانصراف</button>
             <button onClick={() => setView("salaries")} className={`text-sm font-bold pb-2 border-b-2 transition-all ${view === 'salaries' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-gray-500'}`}>نظام الرواتب</button>
          </div>
        </div>
        <button 
          onClick={() => { 
            setEditingStaff(null); 
            setFormData({
              name: "",
              phone: "",
              email: "",
              password: "",
              role: "CASHIER",
              jobDescription: "",
              salary: "0",
              hourlyRate: "0",
              shiftType: "Full-time",
              active: true
            });
            setShowAddModal(true); 
          }}
          className="bg-brand-orange px-8 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-xl"
        >
          <Plus size={20} />
          إضافة موظف
        </button>
      </header>

      {view === "list" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {staffQuery.data?.map((member) => (
            <motion.div key={member.id} className="bg-brand-navy-light rounded-[40px] p-8 border border-white/5 relative group">
              <div className="absolute top-6 left-6 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setEditingStaff(member); setFormData({...member, password: ''} as any); setShowAddModal(true); }} className="p-2 bg-white/5 rounded-xl text-brand-gold"><Edit2 size={16} /></button>
              </div>
              
              <div className="w-16 h-16 bg-brand-navy rounded-2xl flex items-center justify-center mb-6 border border-brand-gold/20">
                <User size={32} className="text-brand-gold" />
              </div>

              <h3 className="text-xl font-bold mb-1">{member.name} {member.active === false && <span className="text-xs bg-red-500/20 text-red-500 px-2 py-1 rounded ml-2">موقوف</span>}</h3>
              <p className="text-brand-orange text-[10px] font-black uppercase tracking-widest mb-6">{member.role}</p>

              <div className="space-y-4 pt-6 border-t border-white/5">
                <InfoRow icon={<Phone size={14}/>} label="الهاتف" value={member.phone} />
                {member.email && <InfoRow icon={<Mail size={14}/>} label="البريد الإلكتروني" value={member.email} />}
                <InfoRow icon={<DollarSign size={14}/>} label="الراتب الأساسي" value={`${member.salary} د.ب`} />
                <InfoRow icon={<Clock size={14}/>} label="سعر الساعة" value={`${member.hourlyRate} د.ب`} />
                <InfoRow icon={<Calendar size={14}/>} label="تاريخ التوظيف" value={new Date(member.employmentDate).toLocaleDateString('ar-SA')} />
              </div>
            </motion.div>
          ))}
        </div>
      ) : view === "salaries" ? (
        <div className="bg-brand-navy-light rounded-[40px] overflow-hidden border border-white/5">
           <table className="w-full text-right">
              <thead className="bg-white/5 text-gray-500 text-xs uppercase">
                 <tr>
                    <th className="p-6">الموظف</th>
                    <th className="p-6">ساعات العمل</th>
                    <th className="p-6">الراتب المستحق</th>
                    <th className="p-6">الحالة</th>
                    <th className="p-6">إجراء</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                 {salaryQuery.data?.map((item: any) => (
                   <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-6 font-bold">{item.name}</td>
                      <td className="p-6">{item.hours} ساعة</td>
                      <td className="p-6 text-brand-gold font-black">{item.totalPay} د.ب</td>
                      <td className="p-6">
                         <span className="bg-green-500/10 text-green-500 px-3 py-1 rounded-lg text-[10px] font-bold">جاهز للدفع</span>
                      </td>
                      <td className="p-6">
                         <button className="bg-brand-orange/10 text-brand-orange p-2 rounded-xl"><CreditCard size={16}/></button>
                      </td>
                   </tr>
                 ))}
              </tbody>
           </table>
        </div>
      ) : (
        <div className="bg-brand-navy-light rounded-[40px] overflow-hidden border border-white/5 p-8">
           <div className="mb-6 flex gap-4">
             <button 
               onClick={async () => {
                 if(staffQuery.data?.[0]) {
                   await checkInMutation.mutateAsync({ userId: staffQuery.data[0].id });
                   attendanceQuery.refetch();
                 }
               }} 
               className="bg-green-500 px-6 py-3 rounded-xl font-bold flex gap-2 items-center text-white"
             >
               تسجيل حضور سريع
             </button>
             <button 
               onClick={() => {
                 if(staffQuery.data && staffQuery.data.length > 0) {
                   setAttendanceForm({
                     userId: staffQuery.data[0].id,
                     checkIn: new Date().toISOString().slice(0,16),
                     checkOut: "",
                     reason: ""
                   });
                   setShowManualAttendance(true);
                 }
               }} 
               className="bg-brand-orange px-6 py-3 rounded-xl font-bold flex gap-2 items-center text-white"
             >
               تسجيل حضور يدوي (إداري)
             </button>
           </div>
           <table className="w-full text-right">
              <thead className="bg-white/5 text-gray-500 text-xs uppercase">
                 <tr>
                    <th className="p-6">الموظف</th>
                    <th className="p-6">وقت الحضور</th>
                    <th className="p-6">وقت الانصراف</th>
                    <th className="p-6">الحالة</th>
                    <th className="p-6">إجراء</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                 {attendanceQuery.data?.map((item: any) => (
                   <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-6 font-bold">{item.user.name}</td>
                      <td className="p-6">{new Date(item.checkIn).toLocaleTimeString('ar-SA')}</td>
                      <td className="p-6">{item.checkOut ? new Date(item.checkOut).toLocaleTimeString('ar-SA') : '-'}</td>
                      <td className="p-6">
                         {item.checkOut ? (
                           <span className="bg-gray-500/10 text-gray-400 px-3 py-1 rounded-lg text-[10px] font-bold">منصرف</span>
                         ) : (
                           <span className="bg-green-500/10 text-green-500 px-3 py-1 rounded-lg text-[10px] font-bold">على رأس العمل</span>
                         )}
                      </td>
                      <td className="p-6">
                         {!item.checkOut && (
                           <button onClick={async () => {
                             await checkOutMutation.mutateAsync({ attendanceId: item.id });
                             attendanceQuery.refetch();
                           }} className="bg-red-500/10 text-red-500 p-2 rounded-xl text-xs font-bold px-4">تسجيل انصراف</button>
                         )}
                      </td>
                   </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-brand-navy-light w-full max-w-2xl rounded-[40px] p-10 border border-white/10 overflow-y-auto max-h-[90vh]">
              <h2 className="text-3xl font-black text-brand-gold mb-8">{editingStaff ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}</h2>
              <div className="space-y-6">
                 <div className="grid grid-cols-2 gap-6">
                    <Input label="اسم الموظف" value={formData.name} onChange={v => setFormData({...formData, name: v})} />
                    <Input label="رقم الهاتف" value={formData.phone} onChange={v => setFormData({...formData, phone: v})} />
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                    <Input label="البريد الإلكتروني" type="email" value={formData.email || ""} onChange={v => setFormData({...formData, email: v})} />
                    <Input label={editingStaff ? "كلمة المرور (اتركه فارغاً لعدم التغيير)" : "كلمة المرور"} type="password" value={formData.password || ""} onChange={v => setFormData({...formData, password: v})} />
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                    <Select label="حالة الحساب" value={formData.active ? 'نشط' : 'غير نشط'} options={['نشط', 'غير نشط']} onChange={v => setFormData({...formData, active: v === 'نشط'})} />
                    <Select label="الوظيفة" value={formData.role} options={['MANAGER', 'SUPERVISOR', 'CASHIER', 'KITCHEN', 'DELIVERY', 'ACCOUNTANT']} onChange={v => setFormData({...formData, role: v})} />
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                    <Input label="الراتب الأساسي (د.ب)" type="number" value={formData.salary} onChange={v => setFormData({...formData, salary: v})} />
                    <Input label="سعر الساعة (د.ب)" type="number" value={formData.hourlyRate} onChange={v => setFormData({...formData, hourlyRate: v})} />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] text-gray-500 uppercase tracking-widest mr-2">الوصف الوظيفي</label>
                    <textarea value={formData.jobDescription} onChange={e => setFormData({...formData, jobDescription: e.target.value})} className="w-full bg-brand-black rounded-2xl p-4 text-sm border border-white/5 outline-none focus:border-brand-orange h-32 resize-none" />
                 </div>
                 <div className="flex gap-4 pt-6">
                    <button onClick={handleSave} className="flex-1 bg-brand-orange py-4 rounded-2xl font-black text-xl">حفظ</button>
                    <button onClick={() => setShowAddModal(false)} className="flex-1 bg-white/5 py-4 rounded-2xl font-black text-xl">إلغاء</button>
                 </div>
              </div>
            </motion.div>
          </div>
        )}

        {showManualAttendance && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-brand-navy-light w-full max-w-lg rounded-[40px] p-10 border border-white/10">
              <h2 className="text-2xl font-black text-brand-gold mb-8">تسجيل حضور يدوي</h2>
              <div className="space-y-6">
                 <Select 
                   label="الموظف" 
                   value={staffQuery.data?.find(u => u.id === attendanceForm.userId)?.name || ""} 
                   options={staffQuery.data?.map(u => u.name) || []} 
                   onChange={(name: string) => {
                     const user = staffQuery.data?.find(u => u.name === name);
                     if(user) setAttendanceForm({...attendanceForm, userId: user.id});
                   }} 
                 />
                 <Input label="وقت الحضور" type="datetime-local" value={attendanceForm.checkIn} onChange={(v: string) => setAttendanceForm({...attendanceForm, checkIn: v})} />
                 <Input label="وقت الانصراف (اختياري)" type="datetime-local" value={attendanceForm.checkOut} onChange={(v: string) => setAttendanceForm({...attendanceForm, checkOut: v})} />
                 <Input label="سبب التعديل" value={attendanceForm.reason} onChange={(v: string) => setAttendanceForm({...attendanceForm, reason: v})} />
                 
                 <div className="flex gap-4 pt-4">
                    <button onClick={async () => {
                      if (!attendanceForm.userId || !attendanceForm.checkIn) return;
                      await adminAddAttendanceMutation.mutateAsync({
                        userId: attendanceForm.userId,
                        checkIn: new Date(attendanceForm.checkIn),
                        checkOut: attendanceForm.checkOut ? new Date(attendanceForm.checkOut) : undefined,
                        reason: attendanceForm.reason
                      });
                      setShowManualAttendance(false);
                      attendanceQuery.refetch();
                    }} className="flex-1 bg-brand-orange py-4 rounded-2xl font-black text-xl">حفظ السجل</button>
                    <button onClick={() => setShowManualAttendance(false)} className="flex-1 bg-white/5 py-4 rounded-2xl font-black text-xl">إلغاء</button>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoRow({ icon, label, value }: any) {
  return (
    <div className="flex justify-between items-center">
       <div className="flex items-center gap-2 text-gray-500 text-xs">
          {icon} <span>{label}</span>
       </div>
       <span className="text-sm font-bold">{value}</span>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }: any) {
  return (
    <div className="space-y-2">
       <label className="text-[10px] text-gray-500 uppercase tracking-widest mr-2">{label}</label>
       <input type={type} value={value} onChange={e => onChange(e.target.value)} className="w-full bg-brand-black rounded-2xl p-4 text-sm border border-white/5 outline-none focus:border-brand-orange" />
    </div>
  );
}

function Select({ label, value, options, onChange }: any) {
  return (
    <div className="space-y-2">
       <label className="text-[10px] text-gray-500 uppercase tracking-widest mr-2">{label}</label>
       <select value={value} onChange={e => onChange(e.target.value)} className="w-full bg-brand-black rounded-2xl p-4 text-sm border border-white/5 outline-none focus:border-brand-orange">
          {options.map((opt: any) => <option key={opt} value={opt}>{opt}</option>)}
       </select>
    </div>
  );
}
