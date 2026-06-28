"use client";

import { useState, useEffect } from "react";
import { trpc } from "../utils/trpc";
import { Clock, UserCheck, UserX, Plus, Calendar, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

export default function AttendancePage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showClockOutModal, setShowClockOutModal] = useState<string | null>(null); // Stores the userId for clock out
  const [page, setPage] = useState(1);
  
  const settingsQuery = trpc.getSystemSettings.useQuery();

  useEffect(() => {
    setUserRole(localStorage.getItem("userRole"));
  }, []);
  const staffQuery = trpc.getStaff.useQuery();
  const historyResponse = trpc.getAttendanceHistory.useQuery({ page, limit: 20 });
  const historyList = historyResponse.data?.data || [];
  const totalPages = historyResponse.data?.totalPages || 1;
  
  const clockInMutation = trpc.clockIn.useMutation();
  const clockOutMutation = trpc.clockOut.useMutation();
  const adminAddMutation = trpc.adminAddAttendance.useMutation();
  const deleteMutation = trpc.adminDeleteAttendance.useMutation();

  const handleManualClock = async (userId: string) => {
    const member = staffQuery.data?.find(m => m.id === userId);
    const isClockedIn = member?.attendance[0] && !member.attendance[0].checkOut;

    if (isClockedIn) {
      setShowClockOutModal(userId); // Open modal instead of clocking out immediately
    } else {
      await clockInMutation.mutateAsync({ userId });
      staffQuery.refetch();
      historyResponse.refetch();
    }
  };

  const confirmClockOut = async () => {
    if (!showClockOutModal) return;
    const member = staffQuery.data?.find(m => m.id === showClockOutModal);
    if (member?.attendance[0]) {
       await clockOutMutation.mutateAsync({ attendanceId: member.attendance[0].id });
       setShowClockOutModal(null);
       staffQuery.refetch();
       historyResponse.refetch();
    }
  };

  return (
    <div className="min-h-screen bg-brand-black p-10">
      <header className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-bold text-brand-gold">الحضور والانصراف</h1>
          <p className="text-gray-500 mt-2">تسجيل ساعات عمل الموظفين وإدارة الغياب</p>
        </div>
        {(userRole === 'ADMIN' || userRole === 'MANAGER') && (
          <button 
            onClick={() => setIsAdmin(!isAdmin)}
            className="bg-brand-navy-light px-6 py-2 rounded-xl border border-brand-gold/20 text-brand-gold text-sm font-bold"
          >
            {isAdmin ? "تبديل لواجهة الموظف" : "تبديل لواجهة المدير"}
          </button>
        )}
      </header>

      {!isAdmin ? (
        /* Employee Self-Service Interface */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {staffQuery.isLoading && <div className="text-brand-gold animate-pulse col-span-full">جاري التحميل...</div>}
          {staffQuery.isError && <div className="text-red-500 col-span-full">خطأ: {staffQuery.error?.message}</div>}
          {staffQuery.data?.map((member) => {
            const isClockedIn = member.attendance[0] && !member.attendance[0].checkOut;
            return (
              <motion.div 
                key={member.id}
                whileHover={{ scale: 1.02 }}
                className="bg-brand-navy-light p-8 rounded-[35px] border border-white/5 flex flex-col items-center"
              >
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 border-2 ${isClockedIn ? 'border-green-500 bg-green-500/10' : 'border-gray-700 bg-gray-800'}`}>
                  <UserCheck size={40} className={isClockedIn ? 'text-green-500' : 'text-gray-500'} />
                </div>
                <h3 className="text-2xl font-bold mb-1">{member.name}</h3>
                <p className="text-gray-500 text-sm mb-8">{member.role}</p>
                
                <button 
                  onClick={() => handleManualClock(member.id)}
                  className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${isClockedIn ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-orange hover:bg-orange-600'}`}
                >
                  {isClockedIn ? "تسجيل انصراف" : "تسجيل حضور"}
                </button>
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* Admin Management Interface */
        <div className="space-y-8">
          <section className="bg-brand-navy-light p-8 rounded-[40px] border border-white/5">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-bold">إدخال يدوي (المدير)</h3>
              <Plus className="text-brand-orange" />
            </div>
            {/* Simple form placeholder for admin to add manual entry */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <select className="bg-brand-black p-4 rounded-xl border border-white/10">
                 <option>اختر الموظف...</option>
                 {staffQuery.data?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <input type="datetime-local" className="bg-brand-black p-4 rounded-xl border border-white/10 text-white" />
              <input type="datetime-local" className="bg-brand-black p-4 rounded-xl border border-white/10 text-white" />
              <button className="bg-brand-gold text-white font-bold rounded-xl">إضافة السجل</button>
            </div>
          </section>

          <section className="bg-brand-navy-light p-8 rounded-[40px] border border-white/5">
            <h3 className="text-2xl font-bold mb-8">سجل الحضور والغياب</h3>
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-right text-gray-500 border-b border-white/5 pb-4">
                  <th className="py-4 font-normal">الموظف</th>
                  <th className="py-4 font-normal">وقت الحضور</th>
                  <th className="py-4 font-normal">وقت الانصراف</th>
                  <th className="py-4 font-normal">ساعات العمل</th>
                  <th className="py-4 font-normal text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {historyList.map((entry: any) => (
                  <tr key={entry.id} className="border-b border-white/5 last:border-0">
                    <td className="py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-navy flex items-center justify-center text-brand-gold text-xs">
                          {entry.user.name[0]}
                        </div>
                        <span className="font-bold">{entry.user.name}</span>
                      </div>
                    </td>
                    <td className="py-5 text-green-400">{new Date(entry.checkIn).toLocaleString('ar-SA')}</td>
                    <td className="py-5 text-red-400">{entry.checkOut ? new Date(entry.checkOut).toLocaleString('ar-SA') : '---'}</td>
                    <td className="py-5 font-bold">
                       {entry.checkOut ? ((new Date(entry.checkOut).getTime() - new Date(entry.checkIn).getTime()) / 3600000).toFixed(1) + ' ساعة' : 'نشط حالياً'}
                    </td>
                    <td className="py-5 text-center">
                        <button 
                        onClick={async () => {
                          await deleteMutation.mutateAsync({ id: entry.id });
                          historyResponse.refetch();
                        }}
                        className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg"
                       >
                         <Trash2 size={18} />
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="flex justify-between items-center p-4 border-t border-white/5 bg-brand-navy-light/10">
                <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="px-4 py-2 bg-white/5 rounded-xl disabled:opacity-50 text-white text-xs">السابق</button>
                <span className="text-sm text-gray-400">صفحة {page} من {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-4 py-2 bg-white/5 rounded-xl disabled:opacity-50 text-white text-xs">التالي</button>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Clock Out Instructions Modal */}
      {showClockOutModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-brand-navy-light w-full max-w-md rounded-[30px] border border-brand-orange p-8">
            <h2 className="text-2xl font-black text-brand-orange mb-6 flex items-center gap-2">
               تعليمات الانصراف
            </h2>
            <div className="bg-brand-black p-5 rounded-2xl border border-white/5 mb-8">
               <p className="text-white whitespace-pre-line leading-relaxed">
                  {settingsQuery.data?.clockOutInstructions || "لا توجد تعليمات."}
               </p>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={confirmClockOut} 
                className="flex-1 bg-red-600 hover:bg-red-700 py-4 rounded-xl font-bold text-white transition-all"
              >
                 قرأت التعليمات وتأكيد الانصراف
              </button>
              <button 
                onClick={() => setShowClockOutModal(null)} 
                className="bg-white/10 hover:bg-white/20 py-4 px-6 rounded-xl font-bold transition-all"
              >
                 إلغاء
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
