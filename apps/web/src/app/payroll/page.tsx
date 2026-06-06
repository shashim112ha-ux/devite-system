"use client";

import React, { useState, useEffect, useRef } from "react";
import { trpc } from "../utils/trpc";
import { 
  Calculator, Printer, Save, CheckCircle, CreditCard, Calendar, Users, 
  TrendingUp, AlertCircle, FileSpreadsheet, Loader2 
} from "lucide-react";

export default function PayrollPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [editRow, setEditRow] = useState<any>(null);
  const [payRow, setPayRow] = useState<any>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  const [bonusVal, setBonusVal] = useState<number>(0);
  const [deductVal, setDeductVal] = useState<number>(0);
  const [advVal, setAdvVal] = useState<number>(0);
  const [noteVal, setNoteVal] = useState("");
  const [editReasonVal, setEditReasonVal] = useState("");
  const [printRow, setPrintRow] = useState<any>(null);
  const printRef = React.useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: "Salary_Slip" });

  const utils = trpc.useContext();
  const { data: payrollList, isLoading: loadingList } = trpc.getPayrollList.useQuery(
    selectedUser ? { userId: selectedUser } : {}
  );
  const { data: staffList } = trpc.getStaff.useQuery();
  const { data: accountsList } = trpc.getAccounts.useQuery();

  const calculateMutation = trpc.calculatePayrollForPeriod.useMutation({
    onSuccess: () => {
      utils.getPayrollList.invalidate();
      alert("تم احتساب الرواتب للفترة المحددة بنجاح!");
    },
    onError: (err) => {
      alert(`خطأ أثناء الحساب: ${err.message}`);
    }
  });

  const updateDraftMutation = trpc.updatePayrollDraft.useMutation({
    onSuccess: () => {
      utils.getPayrollList.invalidate();
      setEditRow(null);
    },
    onError: (err) => alert(`خطأ: ${err.message}`)
  });

  const approveMutation = trpc.approvePayroll.useMutation({
    onSuccess: () => {
      utils.getPayrollList.invalidate();
      alert("تم اعتماد الراتب بنجاح.");
    },
    onError: (err) => alert(`خطأ: ${err.message}`)
  });

  const payMutation = trpc.paySalary.useMutation({
    onSuccess: () => {
      utils.getPayrollList.invalidate();
      setPayRow(null);
      alert("تم تسجيل دفع الراتب وإضافته للمصروفات تلقائياً.");
    },
    onError: (err) => alert(`خطأ: ${err.message}`)
  });

  const handleCalculate = () => {
    if (!startDate || !endDate) {
      alert("الرجاء اختيار تاريخ البدء والانتهاء");
      return;
    }
    calculateMutation.mutate({
      startDate: new Date(startDate),
      endDate: new Date(endDate)
    });
  };

  const startEdit = (row: any) => {
    setEditRow(row);
    setBonusVal(row.bonuses || 0);
    setDeductVal(row.manualDeductions || 0);
    setAdvVal(row.advances || 0);
    setNoteVal(row.notes || "");
    setEditReasonVal(row.editReason || "");
  };

  const saveEdit = () => {
    if (!editRow) return;
    if (!editReasonVal.trim()) {
      alert("إلزامي: يجب إدخال سبب التعديل لحفظ التغييرات");
      return;
    }
    updateDraftMutation.mutate({
      id: editRow.id,
      bonuses: Number(bonusVal),
      deductions: Number(deductVal),
      advances: Number(advVal),
      notes: noteVal,
      editReason: editReasonVal
    });
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-black text-brand-orange">مسير الرواتب الإلكتروني</h1>
          <p className="text-gray-400 text-sm mt-1">
            احتساب رواتب الموظفين بدقة متناهية بناءً على سجلات الحضور والانصراف الفعلية
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-brand-navy border border-white/5 p-4 rounded-xl flex items-center gap-3">
            <Users className="text-brand-orange" />
            <div>
              <div className="text-xs text-gray-400">إجمالي الموظفين</div>
              <div className="text-lg font-black">{staffList?.length || 0} موظفاً</div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Panel Card */}
      <div className="bg-brand-navy/60 backdrop-blur-md border border-white/5 p-6 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="space-y-2">
          <label className="text-xs text-gray-400 font-bold flex items-center gap-2">
            <Calendar size={14} className="text-brand-orange" /> تاريخ البدء
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-orange transition-all text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-gray-400 font-bold flex items-center gap-2">
            <Calendar size={14} className="text-brand-orange" /> تاريخ الانتهاء
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-orange transition-all text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-gray-400 font-bold flex items-center gap-2">
            تصفية بالموظف
          </label>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-orange transition-all text-sm"
          >
            <option value="">كل الموظفين</option>
            {staffList?.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        <div>
          <button
            onClick={handleCalculate}
            disabled={calculateMutation.isLoading}
            className="w-full bg-brand-orange hover:bg-brand-orange/90 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-brand-orange/20 flex items-center justify-center gap-2 text-sm"
          >
            {calculateMutation.isLoading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Calculator size={18} />
            )}
            احتساب رواتب الفترة
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-brand-navy border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-brand-navy/80">
          <h3 className="font-black text-lg flex items-center gap-2">
            <FileSpreadsheet className="text-brand-orange" size={18} />
            كشوفات الرواتب الحالية
          </h3>
          <span className="text-xs text-gray-400">عدد الكشوفات: {payrollList?.length || 0}</span>
        </div>

        {loadingList ? (
          <div className="p-20 text-center text-brand-orange flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin" size={40} />
            <span className="text-gray-400 animate-pulse text-sm">جاري تحميل مسير الرواتب...</span>
          </div>
        ) : !payrollList || payrollList.length === 0 ? (
          <div className="p-20 text-center text-gray-500">
            <AlertCircle className="mx-auto text-white/20 mb-3" size={48} />
            <p className="text-sm">لا توجد كشوفات رواتب محتسبة لهذه الفترة.</p>
            <p className="text-xs text-gray-600 mt-1">قم بتحديد التواريخ أعلاه ثم اضغط على احتساب.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-white/5 text-gray-400 text-xs font-bold border-b border-white/5">
                  <th className="p-4">الموظف</th>
                  <th className="p-4">النوع / الدور</th>
                  <th className="p-4">سعر الساعة</th>
                  <th className="p-4">أيام حضور/غياب</th>
                  <th className="p-4">ساعات العمل</th>
                  <th className="p-4">الراتب الأساسي</th>
                  <th className="p-4">التأخير / الإضافي</th>
                  <th className="p-4">إضافات / خصومات</th>
                  <th className="p-4">سلف / عهد</th>
                  <th className="p-4">صافي المستحق</th>
                  <th className="p-4 text-center">حالة الدفع</th>
                  <th className="p-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {payrollList.map((row) => {
                  const isDraft = row.status === "DRAFT";
                  const isApproved = row.status === "APPROVED";
                  const isPaid = row.status === "PAID";

                  return (
                    <tr key={row.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-white">{row.user.name}</div>
                        <div className="text-xs text-gray-400">{row.user.phone}</div>
                      </td>
                      <td className="p-4">
                        <span className="bg-white/5 text-white text-[10px] font-bold px-2.5 py-1 rounded-md uppercase">
                          {row.user.role}
                        </span>
                        <div className="text-xs text-gray-500 mt-1">{row.user.shiftType || "دوام كامل"}</div>
                      </td>
                      <td className="p-4 font-mono">{row.user.hourlyRate} د.ب</td>
                      <td className="p-4">
                        <span className="text-green-500 font-bold">{row.presenceDays}ح</span>
                        {" / "}
                        <span className="text-red-500 font-bold">{row.absenceDays}غ</span>
                      </td>
                      <td className="p-4 font-mono">{row.workHours.toFixed(1)} س</td>
                      <td className="p-4 font-mono font-bold text-white">{row.basicSalary.toFixed(3)} د.ب</td>
                      <td className="p-4">
                        <div className="text-xs text-red-400">تأخير: {row.delayHours.toFixed(1)} س</div>
                        <div className="text-xs text-green-400 font-mono">إضافي: {row.overtimeHours.toFixed(1)} س (+{row.overtimePay.toFixed(3)})</div>
                      </td>
                      <td className="p-4">
                        <div className="text-xs text-green-400 font-mono">+{row.bonuses.toFixed(3)}</div>
                        <div className="text-xs text-red-400 font-mono">-{((row.deductions || 0) + (row.manualDeductions || 0)).toFixed(3)}</div>
                      </td>
                      <td className="p-4 font-mono text-red-300">-{row.advances.toFixed(3)} د.ب</td>
                      <td className="p-4 font-mono font-black text-brand-orange text-base">
                        {row.netSalary.toFixed(3)} د.ب
                      </td>
                      <td className="p-4 text-center">
                        {isPaid ? (
                          <span className="bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-bold px-2 py-1 rounded-md">
                            تم الدفع ({new Date(row.paymentDate!).toLocaleDateString('ar-BH')})
                          </span>
                        ) : isApproved ? (
                          <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold px-2 py-1 rounded-md">
                            معتمد ({row.approvedBy})
                          </span>
                        ) : (
                          <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[10px] font-bold px-2 py-1 rounded-md">
                            مسودة / معلق
                          </span>
                        )}
                        {row.notes && <div className="text-[10px] text-gray-500 mt-1 max-w-[120px] truncate">{row.notes}</div>}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {isDraft && (
                            <>
                              <button
                                onClick={() => startEdit(row)}
                                className="bg-white/5 hover:bg-white/10 text-white font-bold p-2 rounded-lg text-xs transition-all"
                                title="تعديل المكافآت والخصومات"
                              >
                                تعديل
                              </button>
                              <button
                                onClick={() => approveMutation.mutate({ id: row.id })}
                                className="bg-green-600 hover:bg-green-500 text-white font-bold px-3 py-2 rounded-lg text-xs transition-all flex items-center gap-1"
                              >
                                <CheckCircle size={12} /> اعتماد
                              </button>
                            </>
                          )}
                          {isApproved && (
                            <button
                              onClick={() => setPayRow(row)}
                              className="bg-brand-orange hover:bg-brand-orange/90 text-white font-bold px-3 py-2 rounded-lg text-xs transition-all flex items-center gap-1 shadow-lg shadow-brand-orange/15"
                            >
                              <CreditCard size={12} /> صرف الراتب
                            </button>
                          )}
                          {isPaid && (
                            <span className="text-gray-500 text-xs">مكتمل</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Drawer / Modal Overlay */}
      {editRow && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-brand-navy border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-6 shadow-2xl relative">
            <div>
              <h3 className="text-lg font-black text-brand-orange">تعديل كشف الراتب</h3>
              <p className="text-xs text-gray-400">الموظف: {editRow.user.name}</p>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">المكافآت (د.ب)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={bonusVal}
                    onChange={(e) => setBonusVal(Number(e.target.value))}
                    className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-orange text-sm font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">الخصومات (د.ب)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={deductVal}
                    onChange={(e) => setDeductVal(Number(e.target.value))}
                    className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-orange text-sm font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400">السلف المسحوبة (د.ب)</label>
                <input
                  type="number"
                  step="0.05"
                  value={advVal}
                  onChange={(e) => setAdvVal(Number(e.target.value))}
                  className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-orange text-sm font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400">ملاحظات الكشف</label>
                <textarea
                  value={noteVal}
                  onChange={(e) => setNoteVal(e.target.value)}
                  className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-brand-orange text-sm min-h-[60px]"
                  placeholder="ملاحظات إضافية..."
                />
              </div>

              <div className="space-y-1 md:col-span-4 mt-2">
                <label className="text-xs text-brand-orange font-bold">سبب التعديل (إلزامي)*</label>
                <textarea
                  value={editReasonVal}
                  onChange={(e) => setEditReasonVal(e.target.value)}
                  className="w-full bg-brand-black border border-brand-orange/50 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-brand-orange text-sm min-h-[60px]"
                  placeholder="أدخل سبب المكافأة أو الخصم أو السلفة هنا لتوثيقه..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4">
              <button
                onClick={() => setEditRow(null)}
                className="bg-white/5 hover:bg-white/10 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={saveEdit}
                disabled={updateDraftMutation.isLoading}
                className="bg-brand-orange hover:bg-brand-orange/90 text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-all flex items-center gap-1.5"
              >
                <Save size={16} /> حفظ التغييرات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Modal Overlay */}
      {payRow && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-brand-navy border border-white/10 rounded-2xl p-6 w-full max-w-sm space-y-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div>
              <h3 className="text-lg font-black text-brand-orange">تأكيد صرف الراتب</h3>
              <p className="text-xs text-gray-400">الموظف: {payRow.user.name}</p>
              <p className="text-sm font-bold text-white mt-1">الصافي: {payRow.netSalary} د.ب</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold">خصم الراتب من:</label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-orange text-sm"
              >
                <option value="">بدون حساب محدد (الخزينة العامة)</option>
                {accountsList?.map((acc) => (
                  <option key={acc.id} value={acc.id}>{acc.name} - رصيد: {acc.balance.toFixed(3)} د.ب</option>
                ))}
              </select>
              <p className="text-[10px] text-gray-500 mt-1">سيتم الخصم من الحساب المحدد وتسجيلها كمصروفات.</p>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4">
              <button
                onClick={() => setPayRow(null)}
                className="bg-white/5 hover:bg-white/10 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={() => payMutation.mutate({ id: payRow.id, accountId: selectedAccountId })}
                disabled={payMutation.isLoading}
                className="bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-all flex items-center gap-1.5"
              >
                <CreditCard size={16} /> تأكيد الصرف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
