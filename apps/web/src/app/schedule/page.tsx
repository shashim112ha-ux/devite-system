"use client";

import { useState, useEffect } from "react";
import { trpc } from "../utils/trpc";
import { format, addWeeks, subWeeks, startOfWeek, addDays, isSameDay } from "date-fns";
import { arSA } from "date-fns/locale";
import { Calendar, User, Plus, X, ChevronRight, ChevronLeft, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function WeeklySchedulePage() {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [showModal, setShowModal] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  
  // Modal context
  const [selectedDateStr, setSelectedDateStr] = useState("");
  const [selectedShift, setSelectedShift] = useState("");
  
  // Modal inputs
  const [targetUserId, setTargetUserId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const utils = trpc.useContext();
  
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    setRole(localStorage.getItem("userRole"));
    setUserId(localStorage.getItem("userId"));
  }, []);

  const weekEnd = addDays(currentWeekStart, 6);

  const schedulesQuery = trpc.getShiftSchedules.useQuery({
    startDate: format(currentWeekStart, "yyyy-MM-dd"),
    endDate: format(weekEnd, "yyyy-MM-dd")
  });

  const staffQuery = trpc.getStaff.useQuery(undefined, { enabled: role === "MANAGER" || role === "ADMIN" });

  const requestMutation = trpc.requestShift.useMutation({
    onSuccess: () => {
      setShowModal(false);
      utils.getShiftSchedules.invalidate();
      setTargetUserId("");
    },
    onError: (err) => alert(err.message)
  });

  const statusMutation = trpc.updateShiftStatus.useMutation({
    onSuccess: () => utils.getShiftSchedules.invalidate()
  });

  const deleteMutation = trpc.deleteShiftSchedule.useMutation({
    onSuccess: () => utils.getShiftSchedules.invalidate()
  });

  const openAddModal = (date: Date, shiftName: string) => {
    setSelectedDateStr(format(date, "yyyy-MM-dd"));
    setSelectedShift(shiftName);
    setStartTime(shiftName === "مناوبة أولى" ? "08:00" : "16:00");
    setEndTime(shiftName === "مناوبة أولى" ? "16:00" : "00:00");
    if (role !== "MANAGER" && role !== "ADMIN") {
      setTargetUserId(userId || "");
    } else {
      setTargetUserId("");
    }
    setShowModal(true);
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    if (!targetUserId) {
      alert("الرجاء اختيار الموظف");
      return;
    }
    requestMutation.mutate({
      date: selectedDateStr,
      shiftName: selectedShift,
      startTime: `${selectedDateStr}T${startTime}:00`,
      endTime: `${selectedDateStr}T${endTime === '00:00' ? '23:59' : endTime}:00`,
      userId: targetUserId
    });
  };

  const isManager = role === "MANAGER" || role === "ADMIN";

  // Generate the 7 days of the current week
  const days = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));
  const shifts = ["مناوبة أولى", "مناوبة ثانية"];

  return (
    <div className="min-h-screen bg-brand-black text-white p-8 pb-24 overflow-x-hidden">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-brand-orange flex items-center gap-3">
            <Calendar size={28} />
            جدول المناوبات الأسبوعي
          </h1>
          <p className="text-gray-400 mt-2 text-sm">عرض وإدارة مناوبات الموظفين مقسمة حسب الأيام والمناوبات.</p>
        </div>
      </header>

      {/* Week Navigation */}
      <div className="flex items-center justify-between bg-brand-navy p-4 rounded-3xl mb-8 border border-white/5 shadow-xl max-w-2xl mx-auto">
        <button onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))} className="p-3 bg-brand-black hover:bg-brand-orange hover:text-black font-bold transition-colors rounded-2xl">
           <ChevronRight size={24} />
        </button>
        <div className="text-xl font-black text-brand-gold text-center">
          <div className="text-sm text-gray-400 mb-1 font-normal">الأسبوع</div>
          {format(currentWeekStart, "dd MMM")} - {format(weekEnd, "dd MMM yyyy")}
        </div>
        <button onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))} className="p-3 bg-brand-black hover:bg-brand-orange hover:text-black font-bold transition-colors rounded-2xl">
           <ChevronLeft size={24} />
        </button>
      </div>

      {/* Weekly Grid */}
      <div className="bg-brand-navy rounded-[40px] border border-white/10 p-6 overflow-x-auto shadow-2xl">
        <div className="min-w-[1000px]">
          {/* Header Row: Days */}
          <div className="grid grid-cols-8 gap-4 mb-4">
            <div className="col-span-1"></div> {/* Empty corner */}
            {days.map(day => (
              <div key={day.toString()} className={`col-span-1 text-center p-4 rounded-2xl ${isSameDay(day, new Date()) ? 'bg-brand-orange text-black' : 'bg-brand-black border border-white/5'}`}>
                <div className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">
                  {format(day, "EEEE", { locale: arSA })}
                </div>
                <div className="text-2xl font-black">
                  {format(day, "dd")}
                </div>
              </div>
            ))}
          </div>

          {/* Rows for Shifts */}
          {shifts.map(shiftName => (
            <div key={shiftName} className="grid grid-cols-8 gap-4 mb-4">
              {/* Row Header */}
              <div className="col-span-1 flex items-center justify-center bg-brand-black/50 rounded-2xl p-4 border border-white/5 text-center">
                <h3 className="text-lg font-black text-brand-gold">{shiftName}</h3>
              </div>

              {/* Day Cells */}
              {days.map(day => {
                const cellSchedules = schedulesQuery.data?.filter(s => 
                  isSameDay(new Date(s.date), day) && s.shiftName === shiftName
                ) || [];

                return (
                  <div key={day.toString()} className="col-span-1 bg-brand-black/30 rounded-2xl border border-white/5 p-3 flex flex-col gap-2 min-h-[150px] transition-colors hover:bg-brand-black/60">
                    
                    {/* Add Button (Available to all, but staff only adds themselves) */}
                    <button 
                      onClick={() => openAddModal(day, shiftName)}
                      className="w-full py-2 bg-brand-navy border border-white/10 rounded-xl text-gray-400 hover:text-brand-orange hover:border-brand-orange transition-all flex items-center justify-center gap-1 text-xs font-bold mb-2"
                    >
                      <Plus size={14} /> تسجيل مناوبة
                    </button>

                    {/* Assigned Staff */}
                    {cellSchedules.map(schedule => (
                      <div key={schedule.id} className="bg-brand-navy p-3 rounded-xl border border-white/5 text-xs relative group">
                        {isManager && (
                          <button 
                            onClick={() => deleteMutation.mutate({ id: schedule.id })}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={12} />
                          </button>
                        )}
                        <div className="font-bold text-white mb-1 flex items-center gap-1">
                          <User size={12} className="text-brand-orange" />
                          {schedule.user.name}
                        </div>
                        <div className="text-gray-400 flex items-center gap-1 text-[10px]">
                          <Clock size={10} />
                          {format(new Date(schedule.startTime), "HH:mm")} - {format(new Date(schedule.endTime), "HH:mm")}
                        </div>
                        
                        {/* Approval Status */}
                        {schedule.status === 'PENDING' ? (
                          <div className="mt-2 pt-2 border-t border-white/5">
                            {isManager ? (
                              <div className="flex gap-1">
                                <button onClick={() => statusMutation.mutate({ id: schedule.id, status: 'APPROVED' })} className="flex-1 bg-green-500/20 text-green-400 py-1 rounded text-[10px] font-bold">قبول</button>
                                <button onClick={() => statusMutation.mutate({ id: schedule.id, status: 'REJECTED' })} className="flex-1 bg-red-500/20 text-red-400 py-1 rounded text-[10px] font-bold">رفض</button>
                              </div>
                            ) : (
                              <span className="text-yellow-500 font-bold">قيد الانتظار</span>
                            )}
                          </div>
                        ) : schedule.status === 'REJECTED' ? (
                          <div className="mt-1 text-red-500 font-bold">مرفوضة</div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-brand-navy border border-white/10 rounded-[40px] p-10 w-full max-w-md relative shadow-2xl"
            >
              <button onClick={() => setShowModal(false)} className="absolute top-8 right-8 text-gray-400 hover:text-white bg-black/40 p-2 rounded-xl"><X size={20} /></button>
              
              <div className="mb-8">
                  <h2 className="text-3xl font-black text-brand-gold">تعيين موظف</h2>
                  <p className="text-sm text-gray-400 mt-2">
                    {selectedShift} يوم {selectedDateStr}
                  </p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {isManager ? (
                  <div>
                    <label className="text-xs text-brand-gold font-bold uppercase tracking-widest block mb-2">الموظف</label>
                    <select 
                      value={targetUserId} onChange={e => setTargetUserId(e.target.value)} required
                      className="w-full bg-brand-black border border-white/10 p-4 rounded-2xl text-sm outline-none focus:border-brand-orange"
                    >
                      <option value="">-- اختر موظف --</option>
                      {staffQuery.data?.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs text-brand-gold font-bold uppercase tracking-widest block mb-2">الموظف</label>
                    <div className="w-full bg-brand-black border border-white/10 p-4 rounded-2xl text-sm text-white/50 cursor-not-allowed">
                      سيتم تسجيل المناوبة باسمك الخاص
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-brand-gold font-bold uppercase tracking-widest block mb-2">وقت البدء</label>
                    <input 
                      type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required
                      className="w-full bg-brand-black border border-white/10 p-4 rounded-2xl text-sm outline-none focus:border-brand-orange"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-brand-gold font-bold uppercase tracking-widest block mb-2">وقت الانتهاء</label>
                    <input 
                      type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required
                      className="w-full bg-brand-black border border-white/10 p-4 rounded-2xl text-sm outline-none focus:border-brand-orange"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={requestMutation.isLoading}
                  className="w-full bg-gradient-to-r from-brand-orange to-brand-gold text-black font-black py-4 rounded-2xl mt-8 shadow-xl shadow-brand-orange/20 hover:scale-[1.02] transition-transform"
                >
                  {requestMutation.isLoading ? "جاري الحفظ..." : "إضافة للمناوبة"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
