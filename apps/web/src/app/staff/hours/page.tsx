"use client";

import { useState, useRef } from "react";
import { trpc } from "../../utils/trpc";
import { useReactToPrint } from "react-to-print";
import { 
  Clock, Calendar, Printer, Edit2, Check, X, 
  Plus, Trash2, Save, DollarSign, Settings
} from "lucide-react";

export default function WorkHoursReportPage() {
  const [selectedUser, setSelectedUser] = useState("");
  const [filterType, setFilterType] = useState("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [editingRow, setEditingRow] = useState<any>(null);
  const [editCheckIn, setEditCheckIn] = useState("");
  const [editCheckOut, setEditCheckOut] = useState("");
  const [editReason, setEditReason] = useState("");
  const [editHours, setEditHours] = useState("");
  const [editHourlyRate, setEditHourlyRate] = useState("");
  const [showAddRow, setShowAddRow] = useState(false);
  const [addForm, setAddForm] = useState({ userId: "", checkIn: "", checkOut: "", reason: "" });
  const [page, setPage] = useState(1);

  // Employee hourly rate editor
  const [editingStaffRate, setEditingStaffRate] = useState<any>(null);
  const [newHourlyRate, setNewHourlyRate] = useState("");
  const [newSalary, setNewSalary] = useState("");

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: "تقرير_ساعات_العمل" });

  const utils = trpc.useContext();
  const { data: staffList, refetch: refetchStaff } = trpc.getStaff.useQuery();
  const { data: attendanceResponse, isLoading } = trpc.getAttendanceHistory.useQuery({ 
    userId: selectedUser || undefined,
    page,
    limit: 20
  });
  const attendanceList = attendanceResponse?.data || [];
  const totalPages = attendanceResponse?.totalPages || 1;

  const editMutation = trpc.editAttendance.useMutation({
    onSuccess: () => {
      utils.getAttendanceHistory.invalidate();
      setEditingRow(null);
    },
    onError: (err) => alert(`خطأ: ${err.message}`)
  });

  const addMutation = trpc.adminAddAttendance.useMutation({
    onSuccess: () => {
      utils.getAttendanceHistory.invalidate();
      setShowAddRow(false);
      setAddForm({ userId: "", checkIn: "", checkOut: "", reason: "" });
    },
    onError: (err) => alert(`خطأ: ${err.message}`)
  });

  const deleteMutation = trpc.adminDeleteAttendance.useMutation({
    onSuccess: () => utils.getAttendanceHistory.invalidate(),
    onError: (err) => alert(`خطأ: ${err.message}`)
  });

  const updateStaffMutation = trpc.updateStaff.useMutation({
    onSuccess: () => {
      refetchStaff();
      setEditingStaffRate(null);
    },
    onError: (err) => alert(`خطأ: ${err.message}`)
  });

  // Filter attendance by date
  const filteredAttendance = attendanceList.filter((att: any) => {
    const d = new Date(att.checkIn);
    if (filterType === "daily") {
      const today = new Date(); today.setHours(0,0,0,0);
      return d >= today;
    } else if (filterType === "weekly") {
      const w = new Date(); w.setDate(w.getDate() - 7); w.setHours(0,0,0,0);
      return d >= w;
    } else if (filterType === "monthly") {
      const m = new Date(); m.setDate(1); m.setHours(0,0,0,0);
      return d >= m;
    } else if (filterType === "custom" && startDate && endDate) {
      const s = new Date(startDate); s.setHours(0,0,0,0);
      const e = new Date(endDate); e.setHours(23,59,59,999);
      return d >= s && d <= e;
    }
    return true;
  });

  // Calculate total hours
  const totalHours = filteredAttendance.reduce((sum, att) => {
    if (att.checkOut) {
      return sum + (new Date(att.checkOut).getTime() - new Date(att.checkIn).getTime()) / 3600000;
    }
    return sum;
  }, 0);

  const employee = staffList?.find(u => u.id === selectedUser) as any;
  const hourlyRate = employee?.hourlyRate || 0;
  const estimatedSalary = totalHours * hourlyRate;

  const startEdit = (att: any, empRecord: any, hoursValue: number | null) => {
    setEditingRow(att.id);
    setEditCheckIn(new Date(att.checkIn).toISOString().slice(0, 16));
    setEditCheckOut(att.checkOut ? new Date(att.checkOut).toISOString().slice(0, 16) : "");
    setEditHours(hoursValue !== null ? String(hoursValue) : "");
    setEditHourlyRate(String(empRecord?.hourlyRate || 0));
    setEditReason("");
  };

  const saveEdit = () => {
    if (!editReason.trim()) {
      alert("يرجى إدخال سبب التعديل");
      return;
    }
    const overrideH = parseFloat(editHours);
    const hourlyR = parseFloat(editHourlyRate);
    
    editMutation.mutate({
      id: editingRow,
      checkIn: new Date(editCheckIn),
      checkOut: editCheckOut ? new Date(editCheckOut) : undefined,
      reason: editReason,
      overrideHours: !isNaN(overrideH) && overrideH > 0 ? overrideH : undefined,
      hourlyRate: !isNaN(hourlyR) && hourlyR > 0 ? hourlyR : undefined,
    });
  };

  const openEditStaffRate = (emp: any) => {
    setEditingStaffRate(emp);
    setNewHourlyRate(String(emp.hourlyRate || 0));
    setNewSalary(String(emp.salary || 0));
  };

  const saveStaffRate = () => {
    if (!editingStaffRate) return;
    updateStaffMutation.mutate({
      id: editingStaffRate.id,
      name: editingStaffRate.name,
      phone: editingStaffRate.phone || '',
      email: editingStaffRate.email || undefined,
      role: editingStaffRate.role,
      salary: parseFloat(newSalary) || editingStaffRate.salary,
      hourlyRate: parseFloat(newHourlyRate) || 0,
      active: editingStaffRate.active ?? true,
    } as any);
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">
      {/* Edit Staff Rate Modal */}
      {editingStaffRate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-brand-navy border border-white/10 rounded-[30px] p-8 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-brand-gold flex items-center gap-2">
                <Settings size={20} /> تعديل بيانات الموظف
              </h2>
              <button onClick={() => setEditingStaffRate(null)} className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/5">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-brand-black/50 p-4 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-brand-gold/20 flex items-center justify-center text-brand-gold font-black text-lg">
                  {editingStaffRate.name?.charAt(0)}
                </div>
                <div>
                  <p className="font-black text-white">{editingStaffRate.name}</p>
                  <p className="text-xs text-gray-500">{editingStaffRate.role}</p>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400 font-bold block mb-2">⏰ سعر الساعة الواحدة (د.ب)</label>
                <input
                  type="number"
                  step="0.001"
                  value={newHourlyRate}
                  onChange={e => setNewHourlyRate(e.target.value)}
                  className="w-full bg-brand-black border border-brand-gold/30 rounded-xl px-4 py-3 text-white text-lg font-bold focus:outline-none focus:border-brand-gold"
                  placeholder="0.000"
                />
                {parseFloat(newHourlyRate) > 0 && (
                  <p className="text-xs text-green-400 mt-1">
                    ✓ الراتب المتوقع حسب الساعات الحالية: {(totalHours * parseFloat(newHourlyRate)).toFixed(3)} د.ب
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-400 font-bold block mb-2">💰 الراتب الشهري الثابت (د.ب)</label>
                <input
                  type="number"
                  step="0.001"
                  value={newSalary}
                  onChange={e => setNewSalary(e.target.value)}
                  className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-3 text-white text-lg font-bold focus:outline-none focus:border-brand-gold"
                  placeholder="0.000"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={saveStaffRate}
                  disabled={updateStaffMutation.isLoading}
                  className="flex-1 bg-brand-gold text-black font-black py-3 rounded-xl hover:bg-brand-gold/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {updateStaffMutation.isLoading ? <Clock size={16} className="animate-spin" /> : <Check size={16} />}
                  حفظ التغييرات
                </button>
                <button onClick={() => setEditingStaffRate(null)} className="flex-1 bg-white/5 text-gray-400 font-bold py-3 rounded-xl hover:bg-white/10 transition-colors">
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-brand-gold flex items-center gap-3">
            <Clock size={32} /> تقرير ساعات العمل
          </h1>
          <p className="text-gray-400 text-sm mt-1">مراجعة وتعديل سجلات حضور وانصراف الموظفين</p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-brand-orange text-black font-bold px-6 py-3 rounded-xl hover:bg-brand-orange/90 transition-colors shadow-lg shadow-brand-orange/20"
        >
          <Printer size={18} /> طباعة التقرير
        </button>
      </div>

      {/* Filters */}
      <div className="bg-brand-navy-light/40 border border-white/5 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="text-xs text-gray-400 font-bold block mb-2">الموظف</label>
          <select 
            value={selectedUser} 
            onChange={e => setSelectedUser(e.target.value)}
            className="w-full bg-brand-black border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-gold"
          >
            <option value="">كل الموظفين</option>
            {staffList?.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 font-bold block mb-2">الفترة</label>
          <select 
            value={filterType} 
            onChange={e => setFilterType(e.target.value)}
            className="w-full bg-brand-black border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-gold"
          >
            <option value="daily">اليوم</option>
            <option value="weekly">هذا الأسبوع</option>
            <option value="monthly">هذا الشهر</option>
            <option value="all">الكل</option>
            <option value="custom">مخصص</option>
          </select>
        </div>
        {filterType === "custom" && (
          <>
            <div>
              <label className="text-xs text-gray-400 font-bold block mb-2">من تاريخ</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-brand-black border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-gold" />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-bold block mb-2">إلى تاريخ</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-brand-black border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-gold" />
            </div>
          </>
        )}
      </div>

      {/* Employee Rate Panel - shown when single employee selected */}
      {selectedUser && employee && (
        <div className="bg-gradient-to-l from-brand-gold/10 to-transparent border border-brand-gold/20 rounded-2xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-full bg-brand-gold/20 flex items-center justify-center text-brand-gold font-black text-lg">
              {employee.name?.charAt(0)}
            </div>
            <div>
              <p className="font-black text-white text-lg">{employee.name}</p>
              <p className="text-xs text-gray-500">{employee.role}</p>
            </div>
            <div className="flex gap-6 mr-4">
              <div>
                <p className="text-xs text-gray-500">سعر الساعة</p>
                <p className="text-lg font-black text-brand-gold">{hourlyRate.toFixed(3)} <span className="text-xs">د.ب/س</span></p>
              </div>
              <div>
                <p className="text-xs text-gray-500">الراتب الثابت</p>
                <p className="text-lg font-black text-white">{(employee.salary || 0).toFixed(3)} <span className="text-xs">د.ب</span></p>
              </div>
              <div>
                <p className="text-xs text-gray-500">مجموع الساعات ({filterType === 'monthly' ? 'الشهر' : 'الفترة'})</p>
                <p className="text-lg font-black text-blue-400">{totalHours.toFixed(2)} <span className="text-xs">ساعة</span></p>
              </div>
              <div>
                <p className="text-xs text-gray-500">الراتب المحسوب</p>
                <p className="text-lg font-black text-brand-orange">{estimatedSalary.toFixed(3)} <span className="text-xs">د.ب</span></p>
              </div>
            </div>
          </div>
          <button
            onClick={() => openEditStaffRate(employee)}
            className="flex items-center gap-2 bg-brand-gold text-black font-bold px-5 py-2.5 rounded-xl hover:bg-brand-gold/90 transition-colors text-sm"
          >
            <Edit2 size={15} /> تعديل السعر والراتب
          </button>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-brand-navy-light/50 border border-white/5 rounded-2xl p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">إجمالي السجلات</p>
          <p className="text-2xl font-black text-white">{filteredAttendance.length}</p>
        </div>
        <div className="bg-brand-navy-light/50 border border-white/5 rounded-2xl p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">أيام الحضور</p>
          <p className="text-2xl font-black text-green-400">{new Set(filteredAttendance.map(a => new Date(a.checkIn).toDateString())).size}</p>
        </div>
        <div className="bg-brand-navy-light/50 border border-white/5 rounded-2xl p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">إجمالي الساعات</p>
          <p className="text-2xl font-black text-brand-gold">{totalHours.toFixed(1)} <span className="text-sm">س</span></p>
        </div>
        <div className={`bg-brand-navy-light/50 border border-white/5 rounded-2xl p-4 text-center ${!selectedUser ? 'opacity-50' : ''}`}>
          <p className="text-xs text-gray-400 mb-1">الراتب المتوقع</p>
          <p className="text-2xl font-black text-brand-orange">{estimatedSalary.toFixed(3)} <span className="text-xs">د.ب</span></p>
          {!selectedUser && <p className="text-[10px] text-gray-600 mt-1">اختر موظفاً</p>}
        </div>
      </div>

      {/* Add Row Button */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => { setShowAddRow(true); setAddForm({ userId: selectedUser || (staffList?.[0]?.id || ""), checkIn: "", checkOut: "", reason: "" }); }}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold px-5 py-2.5 rounded-xl transition-colors text-sm"
        >
          <Plus size={16} /> إضافة سجل حضور جديد
        </button>

        {/* Staff Rate Quick Edit - for all staff */}
        {!selectedUser && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <DollarSign size={14} />
            <span>اختر موظفاً لتعديل سعر الساعة والراتب</span>
          </div>
        )}
      </div>

      {/* Add Row Form */}
      {showAddRow && (
        <div className="bg-brand-navy border border-white/10 rounded-2xl p-5 space-y-4">
          <h3 className="font-black text-brand-orange flex items-center gap-2"><Plus size={18} /> إضافة سجل حضور يدوي</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">الموظف</label>
              <select value={addForm.userId} onChange={e => setAddForm({...addForm, userId: e.target.value})} className="w-full bg-brand-black border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-gold">
                {staffList?.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">وقت الحضور</label>
              <input type="datetime-local" value={addForm.checkIn} onChange={e => setAddForm({...addForm, checkIn: e.target.value})} className="w-full bg-brand-black border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-gold" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">وقت الانصراف</label>
              <input type="datetime-local" value={addForm.checkOut} onChange={e => setAddForm({...addForm, checkOut: e.target.value})} className="w-full bg-brand-black border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-gold" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">السبب</label>
              <input type="text" placeholder="سبب الإضافة..." value={addForm.reason} onChange={e => setAddForm({...addForm, reason: e.target.value})} className="w-full bg-brand-black border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-gold" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => addMutation.mutate({ userId: addForm.userId, checkIn: new Date(addForm.checkIn), checkOut: addForm.checkOut ? new Date(addForm.checkOut) : undefined, reason: addForm.reason })} disabled={!addForm.userId || !addForm.checkIn} className="bg-green-600 hover:bg-green-500 text-white font-bold px-5 py-2 rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center gap-2"><Save size={14} /> حفظ</button>
            <button onClick={() => setShowAddRow(false)} className="bg-white/5 text-gray-400 hover:text-white font-bold px-5 py-2 rounded-xl text-sm transition-colors flex items-center gap-2"><X size={14} /> إلغاء</button>
          </div>
        </div>
      )}

      {/* Printable Table */}
      <div ref={printRef}>
        <style type="text/css" media="print">
          {`
            @page { size: A4 landscape; margin: 10mm; }
            @media print {
              body { background: white !important; color: black !important; }
              .bg-brand-navy, .bg-brand-navy-light, .bg-brand-black { background: #f8f8f8 !important; }
              .text-white { color: black !important; }
              .no-print { display: none !important; }
              .border-white\\/5 { border-color: #ddd !important; }
            }
          `}
        </style>
        
        <div className="hidden print:block text-center mb-4 border-b pb-3">
          <h1 className="text-xl font-bold">تقرير ساعات العمل التفصيلي</h1>
          <p className="text-sm text-gray-500">
            {employee ? `الموظف: ${employee.name} | سعر الساعة: ${hourlyRate.toFixed(3)} د.ب` : 'جميع الموظفين'} | طبع في: {new Date().toLocaleDateString('ar-SA')}
          </p>
        </div>

        <div className="bg-brand-navy border border-white/5 rounded-[30px] overflow-hidden shadow-xl">
          <div className="p-5 border-b border-white/5 bg-brand-navy-light/30 flex justify-between items-center">
            <h3 className="font-black text-lg flex items-center gap-2">
              <Calendar className="text-brand-gold" size={20} /> سجل الحضور والانصراف التفصيلي
            </h3>
            <span className="text-xs text-gray-400">{filteredAttendance.length} سجل</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-white/5 text-gray-400 text-xs border-b border-white/5">
                <tr>
                  <th className="p-3">الموظف</th>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">وقت الحضور</th>
                  <th className="p-3">وقت الانصراف</th>
                  <th className="p-3">ساعات العمل</th>
                  <th className="p-3">سعر الساعة</th>
                  <th className="p-3">الراتب المستحق</th>
                  <th className="p-3 text-center">الحالة</th>
                  <th className="p-3 text-center no-print">ملاحظة</th>
                  <th className="p-3 text-center no-print">تعديل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr><td colSpan={10} className="p-10 text-center text-brand-gold animate-pulse">جاري التحميل...</td></tr>
                ) : filteredAttendance.length === 0 ? (
                  <tr><td colSpan={10} className="p-12 text-center text-gray-500">لا توجد سجلات في هذه الفترة</td></tr>
                ) : filteredAttendance.map((att: any) => {
                  const checkIn = new Date(att.checkIn);
                  const checkOut = att.checkOut ? new Date(att.checkOut) : null;
                  const hours = checkOut ? (checkOut.getTime() - checkIn.getTime()) / 3600000 : null;
                  const empRecord = staffList?.find(u => u.id === att.userId) as any;
                  const rate = empRecord?.hourlyRate || 0;
                  const pay = hours !== null ? hours * rate : null;
                  const isEditing = editingRow === att.id;

                  return (
                    <tr key={att.id} className={`hover:bg-white/[0.02] transition-colors ${isEditing ? 'bg-brand-gold/5' : ''}`}>
                      <td className="p-3">
                        <div className="font-bold text-white">{att.user?.name}</div>
                        <button 
                          onClick={() => openEditStaffRate(empRecord)} 
                          className="text-[10px] text-brand-gold hover:text-brand-orange flex items-center gap-1 mt-0.5 no-print"
                          title="تعديل سعر الساعة"
                        >
                          <Edit2 size={10} /> {rate > 0 ? `${rate.toFixed(3)} د.ب/س` : 'تحديد السعر'}
                        </button>
                      </td>
                      <td className="p-3">
                        <div className="text-white text-xs font-bold">{checkIn.toLocaleDateString('ar-SA', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</div>
                      </td>
                      <td className="p-3 font-mono">
                        {isEditing ? (
                          <input type="datetime-local" value={editCheckIn} onChange={e => setEditCheckIn(e.target.value)} className="bg-brand-black border border-brand-gold/50 rounded-lg px-2 py-1 text-xs text-white w-40 focus:outline-none" />
                        ) : (
                          <span className={checkIn.getHours() > 9 ? 'text-yellow-400' : 'text-green-400'}>
                            {checkIn.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono">
                        {isEditing ? (
                          <input type="datetime-local" value={editCheckOut} onChange={e => setEditCheckOut(e.target.value)} className="bg-brand-black border border-brand-gold/50 rounded-lg px-2 py-1 text-xs text-white w-40 focus:outline-none" />
                        ) : checkOut ? (
                          <span className="text-blue-400">{checkOut.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                        ) : (
                          <span className="text-orange-400 text-xs">لم يغادر</span>
                        )}
                      </td>
                      <td className="p-3 font-mono">
                        {isEditing ? (
                          <input type="number" step="0.01" value={editHours} onChange={e => setEditHours(e.target.value)} placeholder="تعديل" className="bg-brand-black border border-brand-gold/50 rounded-lg px-2 py-1 text-xs text-white w-20 focus:outline-none" />
                        ) : hours !== null ? (
                          <span className={`font-bold ${hours >= 8 ? 'text-green-400' : hours >= 6 ? 'text-yellow-400' : 'text-red-400'}`}>{hours.toFixed(2)} س</span>
                        ) : <span className="text-gray-600">—</span>}
                      </td>
                      <td className="p-3 font-mono text-xs text-gray-400">
                        {isEditing ? (
                          <input type="number" step="0.001" value={editHourlyRate} onChange={e => setEditHourlyRate(e.target.value)} placeholder="السعر" className="bg-brand-black border border-brand-gold/50 rounded-lg px-2 py-1 text-xs text-white w-20 focus:outline-none" />
                        ) : rate > 0 ? (
                          `${rate.toFixed(3)} د.ب`
                        ) : '—'}
                      </td>
                      <td className="p-3 font-mono text-brand-gold font-bold">
                        {isEditing && !isNaN(parseFloat(editHours)) && !isNaN(parseFloat(editHourlyRate)) ? (
                          `${(parseFloat(editHours) * parseFloat(editHourlyRate)).toFixed(3)} د.ب`
                        ) : pay !== null && pay > 0 ? (
                          `${pay.toFixed(3)} د.ب`
                        ) : '—'}
                      </td>
                      <td className="p-3 text-center">
                        {!checkOut ? (
                          <span className="bg-orange-500/10 text-orange-400 text-[10px] font-bold px-2 py-1 rounded border border-orange-500/20">جارٍ</span>
                        ) : hours && hours >= 8 ? (
                          <span className="bg-green-500/10 text-green-400 text-[10px] font-bold px-2 py-1 rounded border border-green-500/20">✓ كامل</span>
                        ) : (
                          <span className="bg-yellow-500/10 text-yellow-400 text-[10px] font-bold px-2 py-1 rounded border border-yellow-500/20">ناقص</span>
                        )}
                      </td>
                      <td className="p-3 text-xs text-gray-500 no-print">
                        {isEditing ? (
                          <input type="text" placeholder="سبب التعديل*" value={editReason} onChange={e => setEditReason(e.target.value)} className="bg-brand-black border border-red-500/50 rounded-lg px-2 py-1 text-xs text-white w-full focus:outline-none" />
                        ) : (att.reason || '—')}
                      </td>
                      <td className="p-3 text-center no-print">
                        <div className="flex items-center justify-center gap-2">
                          {isEditing ? (
                            <>
                              <button onClick={saveEdit} disabled={editMutation.isLoading} className="bg-green-600 hover:bg-green-500 text-white p-1.5 rounded-lg transition-colors"><Check size={14} /></button>
                              <button onClick={() => setEditingRow(null)} className="bg-white/10 text-gray-400 p-1.5 rounded-lg transition-colors"><X size={14} /></button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => startEdit(att, empRecord, hours)} className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 p-1.5 rounded-lg transition-colors"><Edit2 size={14} /></button>
                              <button onClick={() => { if(confirm('هل أنت متأكد من حذف هذا السجل؟')) deleteMutation.mutate({ id: att.id }); }} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-1.5 rounded-lg transition-colors"><Trash2 size={14} /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {filteredAttendance.length > 0 && (
                <tfoot className="border-t border-white/10 bg-brand-black/30">
                  <tr>
                    <td colSpan={4} className="p-3 font-black text-white">الإجمالي</td>
                    <td className="p-3 font-black text-brand-gold">{totalHours.toFixed(2)} س</td>
                    <td className="p-3 text-xs text-gray-400">{hourlyRate > 0 ? `${hourlyRate.toFixed(3)} د.ب/س` : '—'}</td>
                    <td className="p-3 font-black text-brand-orange">{estimatedSalary > 0 ? `${estimatedSalary.toFixed(3)} د.ب` : '—'}</td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex justify-between items-center p-4 border-t border-white/5 bg-brand-navy-light/10">
              <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="px-4 py-2 bg-white/5 rounded-xl disabled:opacity-50 text-white text-xs">السابق</button>
              <span className="text-sm text-gray-400">صفحة {page} من {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-4 py-2 bg-white/5 rounded-xl disabled:opacity-50 text-white text-xs">التالي</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
