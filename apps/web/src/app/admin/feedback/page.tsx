"use client";

import { useState } from "react";
import { trpc } from "../../utils/trpc";
import {
  Inbox, MessageSquare, AlertCircle, Lightbulb, ThumbsUp,
  Star, HelpCircle, CheckCircle, Eye, EyeOff, Users, User,
  Briefcase, Shield, Filter, RefreshCw, Loader2, Send
} from "lucide-react";

const ROLE_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  CUSTOMER: { label: "زبون", icon: User, color: "text-blue-400" },
  INVESTOR: { label: "مستثمر", icon: Briefcase, color: "text-yellow-400" },
  EMPLOYEE: { label: "موظف", icon: Users, color: "text-green-400" },
  ANONYMOUS: { label: "مجهول", icon: Shield, color: "text-gray-400" },
};

const TYPE_ICONS: Record<string, { icon: any; color: string; bg: string }> = {
  "شكوى": { icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  "مقترح تطوير": { icon: Lightbulb, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
  "إطراء وشكر": { icon: ThumbsUp, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
  "تقييم منتج": { icon: Star, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
  "استفسار": { icon: HelpCircle, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
};

export default function AdminFeedbackPage() {
  const [filterRole, setFilterRole] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [filterRead, setFilterRead] = useState("ALL");
  const [selectedFb, setSelectedFb] = useState<any>(null);
  const [replyText, setReplyText] = useState("");

  const utils = trpc.useContext();

  // Public feedbacks (customers/investors)
  const { data: publicFbs, isLoading: loadingPublic, refetch: refetchPublic } = trpc.getPublicFeedbacks.useQuery();
  // Employee feedbacks
  const { data: empFbs, isLoading: loadingEmp, refetch: refetchEmp } = trpc.getFeedbackList.useQuery();

  const markReadMutation = trpc.markPublicFeedbackRead.useMutation({
    onSuccess: () => { utils.getPublicFeedbacks.invalidate(); setSelectedFb(null); setReplyText(""); }
  });

  const replyEmpMutation = trpc.replyToFeedback.useMutation({
    onSuccess: () => { utils.getFeedbackList.invalidate(); setSelectedFb(null); setReplyText(""); }
  });

  // Merge both lists with a type flag
  const allFeedbacks = [
    ...(publicFbs?.map(f => ({ ...f, _source: "PUBLIC", message: f.content })) ?? []),
    ...(empFbs?.map(f => ({ ...f, _source: "EMPLOYEE", senderRole: "EMPLOYEE", senderName: f.user?.name, content: f.message, isRead: f.status !== "NEW" })) ?? []),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filtered = allFeedbacks.filter(fb => {
    if (filterRole !== "ALL" && fb.senderRole !== filterRole) return false;
    if (filterType !== "ALL" && fb.type !== filterType) return false;
    if (filterRead === "UNREAD" && fb.isRead) return false;
    if (filterRead === "READ" && !fb.isRead) return false;
    return true;
  });

  const unreadCount = allFeedbacks.filter(f => !f.isRead).length;

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-brand-orange">صندوق الشكاوى والملاحظات</h1>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-black px-2.5 py-1 rounded-full animate-pulse">
                {unreadCount} جديد
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm mt-1">جميع الملاحظات من الزبائن، المستثمرين، والموظفين</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { refetchPublic(); refetchEmp(); }}
            className="bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-bold px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-2"
          >
            <RefreshCw size={14} /> تحديث
          </button>
          <a
            href="/public-feedback" target="_blank"
            className="bg-brand-orange/10 hover:bg-brand-orange/20 text-brand-orange font-bold px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-2 border border-brand-orange/20"
          >
            🔗 رابط الصفحة العامة
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "إجمالي الرسائل", value: allFeedbacks.length, color: "text-white" },
          { label: "غير مقروءة", value: unreadCount, color: "text-red-400" },
          { label: "شكاوى", value: allFeedbacks.filter(f => f.type === "شكوى").length, color: "text-orange-400" },
          { label: "مقترحات", value: allFeedbacks.filter(f => f.type === "مقترح تطوير").length, color: "text-yellow-400" },
        ].map(stat => (
          <div key={stat.label} className="bg-brand-navy border border-white/5 rounded-xl p-4 text-center">
            <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Filter size={14} /> الفلاتر:
        </div>
        <select
          value={filterRole} onChange={(e) => setFilterRole(e.target.value)}
          className="bg-brand-navy border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-brand-orange"
        >
          <option value="ALL">جميع المرسلين</option>
          <option value="CUSTOMER">زبائن</option>
          <option value="INVESTOR">مستثمرين</option>
          <option value="EMPLOYEE">موظفين</option>
          <option value="ANONYMOUS">مجهول</option>
        </select>
        <select
          value={filterType} onChange={(e) => setFilterType(e.target.value)}
          className="bg-brand-navy border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-brand-orange"
        >
          <option value="ALL">جميع الأنواع</option>
          <option value="شكوى">شكاوى</option>
          <option value="مقترح تطوير">مقترحات</option>
          <option value="إطراء وشكر">إطراء وشكر</option>
          <option value="تقييم منتج">تقييم منتج</option>
          <option value="استفسار">استفسارات</option>
        </select>
        <select
          value={filterRead} onChange={(e) => setFilterRead(e.target.value)}
          className="bg-brand-navy border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-brand-orange"
        >
          <option value="ALL">جميع الحالات</option>
          <option value="UNREAD">غير مقروءة فقط</option>
          <option value="READ">مقروءة فقط</option>
        </select>
        <span className="text-xs text-gray-500 mr-auto">{filtered.length} رسالة</span>
      </div>

      {/* Feedback List */}
      {(loadingPublic || loadingEmp) ? (
        <div className="flex items-center justify-center p-20 text-brand-orange">
          <Loader2 className="animate-spin" size={40} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-brand-navy border border-white/5 rounded-2xl p-16 text-center text-gray-500">
          <Inbox className="mx-auto mb-4 text-white/10" size={48} />
          <p>لا توجد رسائل مطابقة للفلاتر الحالية</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((fb: any) => {
            const roleInfo = ROLE_LABELS[fb.senderRole] ?? ROLE_LABELS.ANONYMOUS;
            const typeInfo = TYPE_ICONS[fb.type];
            const TypeIcon = typeInfo?.icon ?? MessageSquare;
            const RoleIcon = roleInfo.icon;
            const isUnread = !fb.isRead;

            return (
              <div
                key={fb.id}
                className={`bg-brand-navy border rounded-2xl p-5 shadow-xl transition-all cursor-pointer hover:border-white/20 ${
                  isUnread ? "border-brand-orange/30 ring-1 ring-brand-orange/10" : "border-white/5"
                }`}
                onClick={() => { setSelectedFb(fb); setReplyText(fb.adminReply || ""); }}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    {typeInfo && (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${typeInfo.bg} ${typeInfo.color}`}>
                        <TypeIcon size={11} />
                        {fb.type}
                      </span>
                    )}
                    {isUnread && (
                      <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                    )}
                  </div>
                  <div className={`flex items-center gap-1.5 text-xs font-bold ${roleInfo.color}`}>
                    <RoleIcon size={13} />
                    {roleInfo.label}
                  </div>
                </div>

                <p className="text-white text-sm leading-relaxed line-clamp-3 mb-3">
                  {fb.content || fb.message}
                </p>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    {fb.senderName && <span className="font-bold text-gray-400">{fb.senderName}</span>}
                    {fb.senderPhone && <span>{fb.senderPhone}</span>}
                    {fb._source === "EMPLOYEE" && fb.user && <span className="font-bold text-gray-400">{fb.user.name} ({fb.user.role})</span>}
                  </div>
                  <span>{new Date(fb.createdAt).toLocaleDateString('ar-BH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                {fb.adminReply && (
                  <div className="mt-3 pt-3 border-t border-white/5 text-xs text-gray-400">
                    <span className="text-brand-orange font-bold block mb-1">رد الإدارة:</span>
                    <p className="line-clamp-2">{fb.adminReply}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedFb && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-brand-navy border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-brand-orange">تفاصيل الملاحظة</h3>
              <button onClick={() => setSelectedFb(null)} className="text-gray-500 hover:text-white text-xl">✕</button>
            </div>

            {/* Sender info */}
            <div className="bg-brand-black/40 rounded-xl p-4 text-sm space-y-1.5">
              <div className="flex gap-2 text-gray-400">
                <span className="text-gray-600">المرسل:</span>
                <span className="font-bold text-white">
                  {selectedFb.senderName || selectedFb.user?.name || "مجهول"}
                  {selectedFb.senderPhone && ` · ${selectedFb.senderPhone}`}
                </span>
              </div>
              <div className="flex gap-2 text-gray-400">
                <span className="text-gray-600">الصفة:</span>
                <span className="font-bold text-white">{ROLE_LABELS[selectedFb.senderRole]?.label}</span>
              </div>
              <div className="flex gap-2 text-gray-400">
                <span className="text-gray-600">النوع:</span>
                <span className="font-bold text-white">{selectedFb.type}</span>
              </div>
              <div className="flex gap-2 text-gray-400">
                <span className="text-gray-600">التاريخ:</span>
                <span>{new Date(selectedFb.createdAt).toLocaleString('ar-BH')}</span>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-1">
              <p className="text-xs text-gray-500 font-bold">نص الرسالة:</p>
              <p className="text-white text-sm leading-relaxed bg-brand-black/30 rounded-xl p-4 whitespace-pre-wrap max-h-40 overflow-y-auto">
                {selectedFb.content || selectedFb.message}
              </p>
            </div>

            {/* Reply */}
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold">رد الإدارة (اختياري)</label>
              <textarea
                value={replyText} onChange={(e) => setReplyText(e.target.value)}
                placeholder="اكتب رداً أو ملاحظة داخلية..."
                rows={3}
                className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-orange resize-none"
              />
            </div>

            <div className="flex gap-3 border-t border-white/5 pt-4">
              <button
                onClick={() => setSelectedFb(null)}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-2.5 rounded-xl text-sm transition-all"
              >
                إغلاق
              </button>
              {selectedFb._source === "PUBLIC" ? (
                <button
                  onClick={() => markReadMutation.mutate({ id: selectedFb.id, adminReply: replyText || undefined })}
                  disabled={markReadMutation.isLoading}
                  className="flex-1 bg-brand-orange hover:bg-brand-orange/90 text-white font-bold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                >
                  {markReadMutation.isLoading ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                  تأكيد القراءة
                </button>
              ) : (
                <button
                  onClick={() => replyEmpMutation.mutate({ id: selectedFb.id, adminReply: replyText, status: "RESOLVED" })}
                  disabled={replyEmpMutation.isLoading}
                  className="flex-1 bg-brand-orange hover:bg-brand-orange/90 text-white font-bold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                >
                  {replyEmpMutation.isLoading ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
                  إرسال الرد
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
