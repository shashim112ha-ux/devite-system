"use client";

import { useState } from "react";
import { trpc } from "../utils/trpc";
import { 
  MessageSquare, Plus, Send, RefreshCw, Eye, MessageCircle, 
  CheckCircle, Loader2, AlertCircle, Sparkles, Inbox 
} from "lucide-react";

const FEEDBACK_TYPES = ["اقتراح لتطوير العمل", "شكوى أو مشكلة", "بلاغ عن عطل أجهزة", "طلب إجازة أو سلفة", "شكر وتقدير", "أخرى"];

export default function FeedbackPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [feedbackType, setFeedbackType] = useState(FEEDBACK_TYPES[0]);
  const [message, setMessage] = useState("");

  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
  const [adminReplyText, setAdminReplyText] = useState("");
  const [statusVal, setStatusVal] = useState("REVIEWED");

  const utils = trpc.useContext();
  const { data: feedbackList, isLoading: loadingFeedback } = trpc.getFeedbackList.useQuery();
  const storedUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : '';
  const userRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') || '' : '';
  const userName = typeof window !== 'undefined' ? localStorage.getItem('userName') || '' : '';

  // Filter feedback list for non-managers to only see their own
  const filteredList = feedbackList?.filter((fb) => {
    if (userRole === "ADMIN" || userRole === "MANAGER") return true;
    return fb.userId === storedUserId;
  });

  const submitMutation = trpc.createFeedback.useMutation({
    onSuccess: () => {
      utils.getFeedbackList.invalidate();
      setShowAddForm(false);
      setMessage("");
      alert("تم إرسال ملاحظتك بنجاح للإدارة. شكراً لك!");
    },
    onError: (err) => alert(`خطأ: ${err.message}`)
  });

  const replyMutation = trpc.replyToFeedback.useMutation({
    onSuccess: () => {
      utils.getFeedbackList.invalidate();
      setSelectedFeedback(null);
      setAdminReplyText("");
      alert("تم إرسال رد الإدارة وتحديث حالة الطلب.");
    },
    onError: (err) => alert(`خطأ: ${err.message}`)
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      alert("يرجى كتابة نص الملاحظة");
      return;
    }
    submitMutation.mutate({
      type: feedbackType,
      message
    });
  };

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeedback) return;
    replyMutation.mutate({
      id: selectedFeedback.id,
      adminReply: adminReplyText,
      status: statusVal
    });
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-black text-brand-orange">ملاحظاتي للإدارة</h1>
          <p className="text-gray-400 text-sm mt-1">
            مساحة آمنة للتواصل المباشر مع الإدارة، تقديم المقترحات، التبليغ عن مشاكل، أو التعبير عن الشكر
          </p>
        </div>
        <div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-brand-orange hover:bg-brand-orange/90 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-brand-orange/20 flex items-center gap-2 text-sm"
          >
            <Plus size={16} />
            أرسل ملاحظة جديدة
          </button>
        </div>
      </div>

      {/* Public Feedback Banner - shown to admins to share with customers */}
      {(userRole === "ADMIN" || userRole === "MANAGER") && (
        <div className="bg-gradient-to-r from-brand-orange/10 to-yellow-500/5 border border-brand-orange/20 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-black text-brand-orange">📲 صفحة شكاوى الزبائن والمستثمرين</h3>
            <p className="text-xs text-gray-400 mt-1">شارك هذا الرابط مع الزبائن عبر واتساب أو ضعه كـ QR Code على العربة</p>
            <code className="text-xs text-green-400 bg-brand-black/40 px-2 py-1 rounded mt-2 inline-block dir-ltr">
              {typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/public-feedback
            </code>
          </div>
          <a
            href="/public-feedback" target="_blank"
            className="shrink-0 bg-brand-orange hover:bg-brand-orange/90 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-brand-orange/20"
          >
            فتح الصفحة العامة ↗
          </a>
        </div>
      )}

      {/* Submit Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-brand-navy border border-white/5 p-6 rounded-2xl space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <div className="border-b border-white/5 pb-3">
            <h3 className="text-lg font-black text-brand-orange">صياغة ملاحظة جديدة</h3>
            <p className="text-xs text-gray-400">يرجى تحديد نوع الملاحظة وكتابتها بكل وضوح وموضوعية</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-bold">نوع الملاحظة</label>
              <select
                value={feedbackType}
                onChange={(e) => setFeedbackType(e.target.value)}
                className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-orange text-sm"
              >
                {FEEDBACK_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-bold">المرسل</label>
              <div className="w-full bg-brand-black/40 border border-white/5 rounded-xl px-4 py-3 text-gray-400 text-sm font-bold">
                {userName} ({userRole})
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-bold">نص الرسالة أو المقترح بالتفصيل</label>
            <textarea
              placeholder="اكتب رسالتك هنا..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-orange text-sm min-h-[120px]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setMessage(""); }}
              className="bg-white/5 hover:bg-white/10 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-all"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitMutation.isLoading}
              className="bg-brand-orange hover:bg-brand-orange/90 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all flex items-center gap-2 shadow-lg shadow-brand-orange/20"
            >
              {submitMutation.isLoading ? <Loader2 className="animate-spin" size={16} /> : <Send size={14} />}
              إرسال الملاحظة
            </button>
          </div>
        </form>
      )}

      {/* Feedback Feed */}
      <div className="space-y-4">
        <h3 className="text-lg font-black text-white flex items-center gap-2">
          <Inbox className="text-brand-orange" size={20} />
          {userRole === "ADMIN" || userRole === "MANAGER" ? "الوارد: مقترحات وشكاوى طاقم العمل" : "صادري: ملاحظاتي المرسلة"}
        </h3>

        {loadingFeedback ? (
          <div className="p-20 text-center text-brand-orange flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin" size={40} />
            <span className="text-gray-400 animate-pulse text-sm">جاري تحميل صندوق الوارد...</span>
          </div>
        ) : !filteredList || filteredList.length === 0 ? (
          <div className="bg-brand-navy p-16 text-center text-gray-500 rounded-2xl border border-white/5 shadow-xl">
            <Inbox className="mx-auto text-white/10 mb-3" size={48} />
            <p className="text-sm">لا توجد أي رسائل أو ملاحظات حالياً في هذا الصندوق.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredList.map((fb) => {
              const isNew = fb.status === "NEW";
              const isReviewed = fb.status === "REVIEWED";
              const isResolved = fb.status === "RESOLVED";

              return (
                <div key={fb.id} className="bg-brand-navy border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-white/10 transition-all">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="bg-white/5 border border-white/5 text-gray-300 text-[10px] font-bold px-2 py-1 rounded">
                          {fb.type}
                        </span>
                        <div className="text-[10px] text-gray-500 mt-1">{new Date(fb.createdAt).toLocaleString('ar-BH')}</div>
                      </div>
                      <div>
                        {isNew ? (
                          <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[10px] font-bold px-2.5 py-1 rounded-md">
                            جديد
                          </span>
                        ) : isReviewed ? (
                          <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold px-2.5 py-1 rounded-md">
                            قيد المراجعة
                          </span>
                        ) : (
                          <span className="bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-bold px-2.5 py-1 rounded-md">
                            تم الحل والرد
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{fb.message}</p>
                      <div className="text-[10px] text-gray-500 mt-2 font-bold">بواسطة: {fb.user.name} ({fb.user.role})</div>
                    </div>

                    {fb.adminReply && (
                      <div className="bg-brand-black/40 border-r-4 border-brand-orange p-3 rounded-l-xl text-xs space-y-1">
                        <span className="text-brand-orange font-bold block">رد الإدارة:</span>
                        <p className="text-gray-300 leading-relaxed">{fb.adminReply}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions for managers/admins */}
                  {(userRole === "ADMIN" || userRole === "MANAGER") && (
                    <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedFeedback(fb);
                          setAdminReplyText(fb.adminReply || "");
                          setStatusVal(fb.status === "NEW" ? "REVIEWED" : fb.status);
                        }}
                        className="bg-brand-orange/10 hover:bg-brand-orange/20 text-brand-orange font-bold py-2 px-4 rounded-xl text-xs transition-all flex items-center gap-1.5"
                      >
                        <MessageCircle size={12} />
                        الرد واتخاذ إجراء
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Admin Reply Modal Overlay */}
      {selectedFeedback && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-brand-navy border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-6 shadow-2xl relative">
            <div>
              <h3 className="text-lg font-black text-brand-orange">الرد على ملاحظة الموظف</h3>
              <p className="text-xs text-gray-400">المرسل: {selectedFeedback.user.name}</p>
            </div>

            <div className="space-y-4">
              <div className="bg-brand-black/40 p-4 rounded-xl text-xs text-gray-300 max-h-[100px] overflow-y-auto">
                <span className="text-[10px] text-gray-500 font-bold block mb-1">الرسالة الأصلية:</span>
                {selectedFeedback.message}
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-bold">تغيير حالة الطلب</label>
                <select
                  value={statusVal}
                  onChange={(e) => setStatusVal(e.target.value)}
                  className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-orange text-sm"
                >
                  <option value="REVIEWED">قيد المراجعة والدراسة</option>
                  <option value="RESOLVED">تم حل المشكلة وتأكيد الرد</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-bold">كتابة الرد الرسمي</label>
                <textarea
                  placeholder="اكتب رد الإدارة للموظف هنا..."
                  value={adminReplyText}
                  onChange={(e) => setAdminReplyText(e.target.value)}
                  className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-brand-orange text-sm min-h-[100px]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4">
              <button
                onClick={() => setSelectedFeedback(null)}
                className="bg-white/5 hover:bg-white/10 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={handleReplySubmit}
                disabled={replyMutation.isLoading}
                className="bg-brand-orange hover:bg-brand-orange/90 text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-all flex items-center gap-1.5"
              >
                {replyMutation.isLoading ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                تأكيد الرد وإرساله
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
