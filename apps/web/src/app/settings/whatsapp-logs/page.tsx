"use client";

import { useState } from "react";
import { trpc } from "../../utils/trpc";
import { History, RefreshCw, CheckCircle, XCircle, Clock, Filter } from "lucide-react";
import { format } from "date-fns";

const STATUS_STYLES: Record<string, { label: string; icon: any; class: string }> = {
  SENT:    { label: "تم الإرسال", icon: CheckCircle, class: "bg-green-500/10 text-green-400 border-green-500/20" },
  FAILED:  { label: "فشل",        icon: XCircle,     class: "bg-red-500/10 text-red-400 border-red-500/20" },
  PENDING: { label: "بانتظار",    icon: Clock,       class: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
};

const TYPE_ICONS: Record<string, string> = {
  ORDER_CREATED:   "📦", ORDER_READY: "✅", ORDER_CANCELLED: "❌",
  SHIFT_REPORT:    "📋", DAILY_REPORT: "📊", LOW_INVENTORY: "⚠️",
  LARGE_EXPENSE:   "💸", INVESTOR_REPORT: "📈", TEST: "🧪",
};

export default function WhatsAppLogsPage() {
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);
  const utils = trpc.useContext();

  const { data: logs, isLoading } = trpc.getWhatsAppLogs.useQuery(
    filterStatus ? { status: filterStatus } : {},
  );
  const retryMutation = trpc.retryWhatsAppMessage.useMutation({
    onSuccess: () => utils.getWhatsAppLogs.invalidate()
  });

  return (
    <div className="min-h-screen bg-brand-black text-white p-8 pb-24 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-brand-orange flex items-center gap-3">
            <History size={28} /> سجل رسائل الواتساب
          </h1>
          <p className="text-gray-400 mt-1 text-sm">عرض جميع الرسائل المرسلة والمعلقة والفاشلة.</p>
        </div>
        <button onClick={() => utils.getWhatsAppLogs.invalidate()} className="p-3 bg-brand-navy border border-white/10 rounded-2xl hover:bg-white/10 transition-colors">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        {[undefined, "PENDING", "SENT", "FAILED"].map(status => (
          <button
            key={status ?? "ALL"}
            onClick={() => setFilterStatus(status)}
            className={`px-5 py-2 rounded-2xl text-sm font-bold transition-colors border ${filterStatus === status ? 'bg-brand-orange text-black border-brand-orange' : 'bg-brand-navy border-white/10 text-gray-300 hover:border-brand-orange'}`}
          >
            {status === undefined ? "الكل" : STATUS_STYLES[status]?.label ?? status}
          </button>
        ))}
      </div>

      {/* Stats */}
      {logs && (
        <div className="grid grid-cols-3 gap-4">
          {["SENT", "PENDING", "FAILED"].map(s => {
            const count = logs.filter(l => l.status === s).length;
            const { label, class: cls } = STATUS_STYLES[s];
            return (
              <div key={s} className={`border rounded-3xl p-5 text-center ${cls}`}>
                <p className="text-3xl font-black">{count}</p>
                <p className="text-sm font-bold mt-1">{label}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Table */}
      <div className="bg-brand-navy border border-white/10 rounded-3xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 animate-pulse">جاري التحميل...</div>
        ) : !logs?.length ? (
          <div className="p-12 text-center text-gray-500">
            <History size={40} className="mx-auto mb-4 opacity-20" />
            <p>لا توجد سجلات بعد</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-gray-400 text-xs uppercase tracking-widest">
                  <th className="p-4 text-right">النوع</th>
                  <th className="p-4 text-right">المستلم</th>
                  <th className="p-4 text-right">الحالة</th>
                  <th className="p-4 text-right">المحاولات</th>
                  <th className="p-4 text-right">الوقت</th>
                  <th className="p-4 text-right">المرسِل</th>
                  <th className="p-4 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => {
                  const statusStyle = STATUS_STYLES[log.status] || STATUS_STYLES.PENDING;
                  const StatusIcon = statusStyle.icon;
                  return (
                    <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <span className="flex items-center gap-2 font-bold">
                          <span className="text-xl">{TYPE_ICONS[log.messageType] || "📩"}</span>
                          <span className="text-xs text-gray-400">{log.messageType}</span>
                        </span>
                      </td>
                      <td className="p-4 font-mono text-sm text-brand-gold dir-ltr">{log.recipient}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${statusStyle.class}`}>
                          <StatusIcon size={12} />
                          {statusStyle.label}
                        </span>
                        {log.errorMessage && (
                          <p className="text-[10px] text-red-400 mt-1 max-w-[200px] truncate" title={log.errorMessage}>{log.errorMessage}</p>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`font-mono font-bold text-lg ${log.attempts >= 3 ? 'text-red-400' : 'text-gray-300'}`}>{log.attempts}/3</span>
                      </td>
                      <td className="p-4 text-xs text-gray-400">
                        {format(new Date(log.createdAt), "yyyy-MM-dd HH:mm")}
                      </td>
                      <td className="p-4 text-xs text-gray-300">
                        {(log as any).user?.name || "النظام"}
                      </td>
                      <td className="p-4 text-center">
                        {log.status === 'FAILED' || log.status === 'PENDING' ? (
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => retryMutation.mutate({ id: log.id })}
                              disabled={retryMutation.isLoading}
                              className="bg-brand-orange/10 hover:bg-brand-orange text-brand-orange hover:text-black text-xs font-bold px-3 py-1.5 rounded-xl transition-colors"
                            >
                              إعادة
                            </button>
                            <a
                              href={`https://wa.me/${log.recipient.replace('+', '')}?text=${encodeURIComponent((log as any).body || '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1"
                            >
                              إرسال يدوي
                            </a>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
