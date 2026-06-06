"use client";

import { useParams } from "next/navigation";
import { useRef } from "react";
import { trpc } from "../../../utils/trpc";
import { useReactToPrint } from "react-to-print";
import { 
  Printer, ArrowRight, Clock, CheckCircle, XCircle, 
  AlertTriangle, User, Calendar, TrendingUp, DollarSign
} from "lucide-react";
import Link from "next/link";

export default function EmployeePayrollReport() {
  const params = useParams();
  const userId = params.id as string;
  const printRef = useRef<HTMLDivElement>(null);
  
  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: "تقرير_الراتب_المفصل" });

  const { data: attendance, isLoading: loadingAtt } = trpc.getAttendanceHistory.useQuery({ userId });
  const { data: payrolls, isLoading: loadingPay } = trpc.getPayrollList.useQuery({ userId } as any);
  const { data: staff } = trpc.getStaff.useQuery();

  const employee = staff?.find(u => u.id === userId) as any;
  const isLoading = loadingAtt || loadingPay;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center text-white">
        <p>لم يتم العثور على الموظف</p>
      </div>
    );
  }

  // Calculate stats from attendance
  const totalHours = attendance?.reduce((sum, att) => {
    if (att.checkOut) {
      const diff = (new Date(att.checkOut).getTime() - new Date(att.checkIn).getTime()) / (1000 * 60 * 60);
      return sum + diff;
    }
    return sum;
  }, 0) || 0;

  const daysWorked = new Set(attendance?.map(att => new Date(att.checkIn).toDateString())).size;
  const avgHoursPerDay = daysWorked > 0 ? totalHours / daysWorked : 0;

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/payroll" className="bg-brand-navy p-3 rounded-xl hover:bg-brand-navy-light transition-colors">
            <ArrowRight size={20} className="text-gray-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-brand-gold">تقرير الراتب المفصل</h1>
            <p className="text-gray-400 text-sm mt-1">سجل دقيق لحضور وأداء الموظف مع تفاصيل الرواتب</p>
          </div>
        </div>
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 bg-brand-orange text-black font-bold px-6 py-3 rounded-xl hover:bg-brand-orange/90 transition-colors shadow-lg shadow-brand-orange/20"
        >
          <Printer size={20} /> طباعة / PDF
        </button>
      </div>

      <div ref={printRef}>
        <style type="text/css" media="print">
          {`
            @page { size: A4; margin: 15mm; }
            @media print {
              body { background: white !important; color: black !important; font-family: Arial, sans-serif; }
              .bg-brand-navy, .bg-brand-navy-light, .bg-brand-black { background: #f8f8f8 !important; border: 1px solid #ddd !important; }
              .text-white { color: black !important; }
              .text-brand-gold, .text-brand-orange { color: #8B6508 !important; }
              .text-gray-400, .text-gray-500 { color: #555 !important; }
              .no-print { display: none !important; }
              .border-white\\/5, .border-white\\/10 { border-color: #ddd !important; }
            }
          `}
        </style>

        {/* Print Header */}
        <div className="hidden print:block text-center mb-6 border-b pb-4">
          <h1 className="text-2xl font-bold">تقرير الراتب المفصل</h1>
          <p className="text-gray-500 mt-1">طبع في: {new Date().toLocaleDateString('ar-SA')}</p>
        </div>

        {/* Employee Info Card */}
        <div className="bg-brand-navy-light/50 border border-white/5 rounded-[30px] p-6 shadow-lg">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-brand-orange/20 rounded-full flex items-center justify-center">
              <User size={36} className="text-brand-orange" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-black text-white">{employee.name}</h2>
              <div className="flex flex-wrap gap-4 mt-2">
                <span className="text-sm text-gray-400">📱 {employee.phone}</span>
                <span className="text-sm text-gray-400">🏷️ {employee.role}</span>
                {employee.jobDescription && <span className="text-sm text-gray-400">💼 {employee.jobDescription}</span>}
                <span className="text-sm text-gray-400">📅 تاريخ التعيين: {new Date(employee.employmentDate).toLocaleDateString('ar-SA')}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-brand-black/40 p-3 rounded-2xl border border-white/5">
                <p className="text-xs text-gray-400">الراتب الأساسي</p>
                <p className="text-lg font-black text-brand-gold">{employee.salary} د.ب</p>
              </div>
              <div className="bg-brand-black/40 p-3 rounded-2xl border border-white/5">
                <p className="text-xs text-gray-400">سعر الساعة</p>
                <p className="text-lg font-black text-brand-orange">{employee.hourlyRate} د.ب</p>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-brand-navy-light/50 border border-white/5 rounded-2xl p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">أيام الحضور</p>
            <p className="text-2xl font-black text-green-400">{daysWorked}</p>
          </div>
          <div className="bg-brand-navy-light/50 border border-white/5 rounded-2xl p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">إجمالي الساعات</p>
            <p className="text-2xl font-black text-blue-400">{totalHours.toFixed(1)} س</p>
          </div>
          <div className="bg-brand-navy-light/50 border border-white/5 rounded-2xl p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">متوسط الساعات/يوم</p>
            <p className="text-2xl font-black text-brand-gold">{avgHoursPerDay.toFixed(1)} س</p>
          </div>
          <div className="bg-brand-navy-light/50 border border-white/5 rounded-2xl p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">كشوفات الراتب</p>
            <p className="text-2xl font-black text-brand-orange">{payrolls?.length || 0}</p>
          </div>
        </div>

        {/* Payroll Summary */}
        {payrolls && payrolls.length > 0 && (
          <div className="bg-brand-navy border border-white/5 rounded-[30px] overflow-hidden shadow-xl">
            <div className="p-5 border-b border-white/5 bg-brand-navy-light/30">
              <h3 className="font-black text-lg flex items-center gap-2">
                <DollarSign className="text-brand-gold" size={20} /> كشوفات الرواتب
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-white/5 text-gray-400 text-xs border-b border-white/5">
                  <tr>
                    <th className="p-3">الفترة</th>
                    <th className="p-3">حضور/غياب</th>
                    <th className="p-3">ساعات العمل</th>
                    <th className="p-3">الراتب الأساسي</th>
                    <th className="p-3">إضافي</th>
                    <th className="p-3">مكافآت</th>
                    <th className="p-3">خصومات</th>
                    <th className="p-3">سلف</th>
                    <th className="p-3 text-brand-gold">الصافي</th>
                    <th className="p-3 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {payrolls.map((p: any) => (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3">
                        <div className="text-white text-xs font-bold">{new Date(p.startDate).toLocaleDateString('ar-SA')}</div>
                        <div className="text-gray-500 text-[10px]">إلى {new Date(p.endDate).toLocaleDateString('ar-SA')}</div>
                      </td>
                      <td className="p-3">
                        <span className="text-green-400 font-bold">{p.presenceDays}ح</span> / <span className="text-red-400 font-bold">{p.absenceDays}غ</span>
                      </td>
                      <td className="p-3 font-mono text-gray-300">{p.workHours.toFixed(1)} س</td>
                      <td className="p-3 font-mono text-white font-bold">{p.basicSalary.toFixed(3)}</td>
                      <td className="p-3 font-mono text-green-400">+{p.overtimePay.toFixed(3)}</td>
                      <td className="p-3 font-mono text-green-400">+{p.bonuses.toFixed(3)}</td>
                      <td className="p-3 font-mono text-red-400">-{((p.deductions||0)+(p.manualDeductions||0)).toFixed(3)}</td>
                      <td className="p-3 font-mono text-red-300">-{p.advances.toFixed(3)}</td>
                      <td className="p-3 font-mono font-black text-brand-gold text-base">{p.netSalary.toFixed(3)}</td>
                      <td className="p-3 text-center">
                        {p.status === 'PAID' ? (
                          <span className="bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-bold px-2 py-1 rounded">مدفوع</span>
                        ) : p.status === 'APPROVED' ? (
                          <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold px-2 py-1 rounded">معتمد</span>
                        ) : (
                          <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[10px] font-bold px-2 py-1 rounded">مسودة</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-brand-black/30 border-t border-white/10">
                  <tr>
                    <td className="p-3 font-black text-white" colSpan={8}>الإجمالي المدفوع</td>
                    <td className="p-3 font-black text-brand-gold text-lg">
                      {payrolls.filter((p: any) => p.status === 'PAID').reduce((s: number, p: any) => s + p.netSalary, 0).toFixed(3)} د.ب
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Attendance Detail Table */}
        <div className="bg-brand-navy border border-white/5 rounded-[30px] overflow-hidden shadow-xl">
          <div className="p-5 border-b border-white/5 bg-brand-navy-light/30 flex justify-between items-center">
            <h3 className="font-black text-lg flex items-center gap-2">
              <Calendar className="text-brand-orange" size={20} /> سجل الحضور والانصراف التفصيلي
            </h3>
            <span className="text-xs text-gray-400">{attendance?.length || 0} سجل</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-white/5 text-gray-400 text-xs border-b border-white/5">
                <tr>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">وقت الدخول</th>
                  <th className="p-3">وقت الخروج</th>
                  <th className="p-3">ساعات العمل</th>
                  <th className="p-3 text-center">الحالة</th>
                  <th className="p-3">ملاحظة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {!attendance || attendance.length === 0 ? (
                  <tr><td colSpan={6} className="p-10 text-center text-gray-500">لا يوجد سجلات حضور</td></tr>
                ) : attendance.map((att: any) => {
                  const checkIn = new Date(att.checkIn);
                  const checkOut = att.checkOut ? new Date(att.checkOut) : null;
                  const hours = checkOut ? ((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)) : null;
                  const isLate = checkIn.getHours() > 9;

                  return (
                    <tr key={att.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-white">{checkIn.toLocaleDateString('ar-SA', { weekday: 'long' })}</div>
                        <div className="text-[10px] text-gray-500">{checkIn.toLocaleDateString('ar-SA')}</div>
                      </td>
                      <td className="p-3 font-mono">
                        <span className={isLate ? 'text-yellow-400' : 'text-green-400'}>
                          {checkIn.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isLate && <span className="text-[9px] text-yellow-500 block">تأخير</span>}
                      </td>
                      <td className="p-3 font-mono">
                        {checkOut ? (
                          <span className="text-blue-400">
                            {checkOut.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span className="text-orange-400 text-xs">لم يغادر</span>
                        )}
                      </td>
                      <td className="p-3 font-mono">
                        {hours !== null ? (
                          <span className={`font-bold ${hours >= 8 ? 'text-green-400' : hours >= 6 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {hours.toFixed(1)} س
                          </span>
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
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
                      <td className="p-3 text-xs text-gray-500">
                        {att.reason || (att.editedBy ? `عدّل: ${att.editedBy.name}` : '—')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
