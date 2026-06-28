"use client";

import { useState, useEffect } from "react";
import { trpc } from "../../../utils/trpc";
import { Activity, Server, Clock, Database, DatabaseBackup, ListTree, RefreshCw, MessageCircle, AlertTriangle, Bug } from "lucide-react";
import { format } from "date-fns";

export default function PerformanceMonitorPage() {
  const [autoRefresh, setAutoRefresh] = useState(false);
  const utils = trpc.useContext();
  const { data: summary, isLoading, isError } = trpc.getPerformanceSummary.useQuery(undefined, {
    refetchInterval: autoRefresh ? 10000 : false,
    refetchOnWindowFocus: false
  });

  // Calculate System Status based on average response times
  let systemStatus = "UP";
  let statusColor = "text-green-500";
  let statusBg = "bg-green-500/10 border-green-500/20";
  let statusLabel = "النظام يعمل بكفاءة 🟢";

  if (summary?.metrics) {
    const avgTimes = Object.values(summary.metrics).map((m: any) => m.avgTime);
    if (avgTimes.length > 0) {
      const overallAvg = avgTimes.reduce((a, b) => a + b, 0) / avgTimes.length;
      if (overallAvg > 3000) {
        systemStatus = "DOWN";
        statusColor = "text-red-500";
        statusBg = "bg-red-500/10 border-red-500/20";
        statusLabel = "النظام بطيء جداً 🔴";
      } else if (overallAvg > 1000) {
        systemStatus = "DEGRADED";
        statusColor = "text-yellow-500";
        statusBg = "bg-yellow-500/10 border-yellow-500/20";
        statusLabel = "يوجد بطء متوسط 🟡";
      }
    }
  }

  // Define top routes to track
  const keyRoutes = [
    { name: "Dashboard", path: "getDashboardStats" },
    { name: "Orders", path: "getOrders" },
    { name: "Inventory", path: "getInventoryItems" },
    { name: "Expenses", path: "getExpenses" },
    { name: "Payroll", path: "getPayrollList" },
    { name: "Reports", path: "getShiftReports" },
    { name: "WhatsApp Logs", path: "getWhatsAppLogs" },
    { name: "Backup", path: "getBackups" },
  ];

  return (
    <div className="min-h-screen bg-brand-black text-white p-8 pb-24 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-brand-orange flex items-center gap-3">
            <Activity size={28} /> مراقبة الأداء
          </h1>
          <p className="text-gray-400 mt-1 text-sm">لوحة تحكم خاصة بالمدير لمراقبة استقرار وسرعة النظام</p>
        </div>
        
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer border border-white/10 px-4 py-2 rounded-xl bg-brand-navy">
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} className="accent-brand-orange w-4 h-4" />
            <span className="text-sm font-bold text-gray-300">تحديث تلقائي (10 ثوانٍ)</span>
          </label>

          <button onClick={() => utils.getPerformanceSummary.invalidate()} className="p-3 bg-brand-navy border border-white/10 rounded-2xl hover:bg-brand-orange hover:text-black transition-colors">
            <RefreshCw size={18} className={autoRefresh || isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {isLoading && !summary && (
        <div className="flex flex-col items-center justify-center p-20 text-brand-orange animate-pulse">
          <Activity size={48} />
          <p className="mt-4 font-bold">جاري تحميل بيانات الأداء...</p>
        </div>
      )}

      {isError && (
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl text-red-500 text-center">
          حدث خطأ أثناء جلب بيانات الأداء. الرجاء المحاولة لاحقاً.
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: System Status */}
          <div className={`p-6 rounded-3xl border ${statusBg} flex flex-col justify-center items-center text-center`}>
            <Server size={48} className={`mb-4 ${statusColor}`} />
            <h3 className="text-gray-400 text-sm mb-1 font-bold">حالة النظام</h3>
            <p className={`text-xl font-black ${statusColor}`}>{statusLabel}</p>
            {summary.errors.length > 5 && (
              <p className="text-xs text-red-400 mt-2 font-bold animate-pulse">يوجد أخطاء متكررة!</p>
            )}
          </div>

          {/* Card 2: Average Response Times */}
          <div className="p-6 rounded-3xl border border-white/10 bg-brand-navy col-span-1 md:col-span-1 lg:col-span-2">
            <h3 className="text-gray-400 text-sm mb-4 font-bold flex items-center gap-2">
              <Clock size={16} /> متوسط سرعة الاستجابة (في الذاكرة)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {keyRoutes.map(route => {
                const metric = summary.metrics[route.path];
                const avg = metric ? (metric.avgTime / 1000).toFixed(2) : "0.00";
                const isSlow = metric && metric.avgTime > 1000;
                return (
                  <div key={route.path} className="p-3 bg-white/5 rounded-xl border border-white/5 text-center">
                    <p className="text-xs text-gray-500 font-bold">{route.name}</p>
                    <p className={`text-lg font-mono font-black mt-1 ${isSlow ? 'text-yellow-400' : 'text-brand-gold'}`}>{avg} ثانية</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 3: WhatsApp Status */}
          <div className="p-6 rounded-3xl border border-white/10 bg-brand-navy">
            <h3 className="text-gray-400 text-sm mb-3 font-bold flex items-center gap-2">
              <MessageCircle size={16} /> WhatsApp
            </h3>
            <p className={`text-lg font-black mb-3 ${summary.whatsapp.status === 'CONNECTED' ? 'text-green-400' : 'text-red-400'}`}>
              {summary.whatsapp.status === 'CONNECTED' ? 'متصل 🟢' : 'مفصول 🔴'}
            </p>
            <div className="flex justify-between text-xs font-mono bg-black/30 p-2 rounded-lg">
              <div className="text-yellow-400 text-center"><p>{summary.whatsapp.pending}</p><p className="text-[10px] text-gray-500">Pending</p></div>
              <div className="text-green-400 text-center"><p>{summary.whatsapp.sent}</p><p className="text-[10px] text-gray-500">Sent</p></div>
              <div className="text-red-400 text-center"><p>{summary.whatsapp.failed}</p><p className="text-[10px] text-gray-500">Failed</p></div>
            </div>
          </div>

          {/* Card 4: Backup Status */}
          <div className="p-6 rounded-3xl border border-white/10 bg-brand-navy">
            <h3 className="text-gray-400 text-sm mb-3 font-bold flex items-center gap-2">
              <DatabaseBackup size={16} /> Backup
            </h3>
            {summary.backup ? (
              <>
                <p className={`text-sm font-bold mb-1 ${summary.backup.status === 'SUCCESS' ? 'text-green-400' : 'text-red-400'}`}>
                  {summary.backup.status === 'SUCCESS' ? 'اكتمل بنجاح' : 'فشل!'}
                </p>
                <p className="text-xs text-gray-400 font-mono">{format(new Date(summary.backup.createdAt), "yyyy-MM-dd HH:mm")}</p>
              </>
            ) : (
              <p className="text-sm text-gray-500">لا يوجد نسخ</p>
            )}
          </div>

          {/* Card 5: AuditLog */}
          <div className="p-6 rounded-3xl border border-white/10 bg-brand-navy">
            <h3 className="text-gray-400 text-sm mb-4 font-bold flex items-center gap-2">
              <ListTree size={16} /> سجل النظام (Audit)
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-xs text-gray-400">سجلات اليوم</span>
                <span className="font-mono font-bold text-brand-gold">{summary.counts.auditToday}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">سجلات الأسبوع</span>
                <span className="font-mono font-bold text-brand-gold">{summary.counts.auditWeek}</span>
              </div>
            </div>
            {summary.counts.auditWeek > 10000 && (
              <p className="text-xs text-red-400 mt-3 font-bold"><AlertTriangle size={12} className="inline mr-1" /> السجل ضخم جداً</p>
            )}
          </div>

          {/* Card 6: Queue Status */}
          <div className="p-6 rounded-3xl border border-white/10 bg-brand-navy">
            <h3 className="text-gray-400 text-sm mb-4 font-bold flex items-center gap-2">
              <Activity size={16} /> Queue Engine
            </h3>
            <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-2">
              <span className="text-xs text-gray-400">حالة Worker</span>
              <span className={`text-xs font-bold ${summary.whatsapp.isWorkerRunning ? 'text-green-400' : 'text-gray-500'}`}>
                {summary.whatsapp.isWorkerRunning ? 'يعمل الآن...' : 'في انتظار الدورة القادمة'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">آخر تشغيل</span>
              <span className="text-xs font-mono text-gray-300">
                {summary.whatsapp.lastWorkerRun ? format(new Date(summary.whatsapp.lastWorkerRun), "HH:mm:ss") : 'لم يعمل بعد'}
              </span>
            </div>
          </div>

          {/* Card 8: Database Counts */}
          <div className="p-6 rounded-3xl border border-white/10 bg-brand-navy">
            <h3 className="text-gray-400 text-sm mb-4 font-bold flex items-center gap-2">
              <Database size={16} /> إحصائيات القاعدة
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div className="flex justify-between text-gray-400"><span>الطلبات</span> <span className="text-white font-mono">{summary.counts.orders}</span></div>
              <div className="flex justify-between text-gray-400"><span>المنتجات</span> <span className="text-white font-mono">{summary.counts.products}</span></div>
              <div className="flex justify-between text-gray-400"><span>المصروفات</span> <span className="text-white font-mono">{summary.counts.expenses}</span></div>
              <div className="flex justify-between text-gray-400"><span>الموظفين</span> <span className="text-white font-mono">{summary.counts.users}</span></div>
              <div className="flex justify-between text-gray-400"><span>المستثمرين</span> <span className="text-white font-mono">{summary.counts.investors}</span></div>
              <div className="flex justify-between text-gray-400"><span>الشفتات</span> <span className="text-white font-mono">{summary.counts.shiftReports}</span></div>
              <div className="flex justify-between text-gray-400"><span>النسخ</span> <span className="text-white font-mono">{summary.counts.backups}</span></div>
            </div>
          </div>

        </div>
      )}

      {/* Card 7: Errors List (Full Width) */}
      {summary && summary.errors && (
        <div className="p-6 rounded-3xl border border-red-500/20 bg-red-500/5">
          <h3 className="text-red-400 text-sm mb-4 font-bold flex items-center gap-2">
            <Bug size={16} /> آخر الأخطاء المسجلة في النظام (In-Memory)
          </h3>
          {summary.errors.length === 0 ? (
            <div className="text-center text-gray-500 p-4">لا يوجد أخطاء مسجلة حالياً 🎉</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left dir-ltr">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400 text-xs">
                    <th className="p-2 w-48">Time</th>
                    <th className="p-2 w-64">Operation (Route)</th>
                    <th className="p-2">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.errors.map((err: any, idx: number) => (
                    <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-2 text-xs font-mono text-gray-400">{format(new Date(err.time), "yyyy-MM-dd HH:mm:ss")}</td>
                      <td className="p-2 text-xs font-mono text-brand-gold">{err.operation}</td>
                      <td className="p-2 text-xs text-red-300 font-mono truncate max-w-lg">{err.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
