"use client";

import { useState } from "react";
import { trpc } from "../utils/trpc";
import {
  MessageSquare, Send, Star, ThumbsUp, AlertCircle,
  Lightbulb, HelpCircle, Loader2, CheckCircle2, ChevronDown
} from "lucide-react";

const SENDER_ROLES = [
  { value: "CUSTOMER", label: "🛍️ زبون / عميل", desc: "جربت منتجاتنا وأريد تقييمها" },
  { value: "INVESTOR", label: "💼 مستثمر / شريك", desc: "لدي استفسار أو ملاحظة استثمارية" },
  { value: "EMPLOYEE", label: "👨‍💼 موظف", desc: "لدي اقتراح أو شكوى داخلية" },
  { value: "ANONYMOUS", label: "🕵️ مجهول", desc: "أفضل عدم الكشف عن هويتي" },
];

const FEEDBACK_TYPES = [
  { value: "شكوى", icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", label: "شكوى" },
  { value: "مقترح تطوير", icon: Lightbulb, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20", label: "مقترح تطوير" },
  { value: "إطراء وشكر", icon: ThumbsUp, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20", label: "إطراء وشكر" },
  { value: "تقييم منتج", icon: Star, color: "text-brand-gold", bg: "bg-yellow-500/10 border-yellow-500/20", label: "تقييم منتج" },
  { value: "استفسار", icon: HelpCircle, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", label: "استفسار" },
];

export default function PublicFeedbackPage() {
  const [step, setStep] = useState<"role" | "form" | "done">("role");
  const [senderRole, setSenderRole] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [type, setType] = useState("");
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  const submitMutation = trpc.submitPublicFeedback.useMutation({
    onSuccess: () => setStep("done"),
    onError: (err) => alert(`خطأ: ${err.message}`)
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!type) { alert("يرجى اختيار نوع الملاحظة"); return; }
    if (content.trim().length < 5) { alert("يرجى كتابة رسالة مفصلة (5 أحرف على الأقل)"); return; }
    const finalContent = rating > 0 ? `[تقييم: ${rating}/5 ⭐] ${content}` : content;
    submitMutation.mutate({ senderName: senderName || undefined, senderPhone: senderPhone || undefined, senderRole, type, content: finalContent });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4" dir="rtl">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-lg relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl mb-4 shadow-2xl shadow-orange-500/30">
            <MessageSquare size={30} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-white">صوتك يهمنا</h1>
          <p className="text-gray-400 mt-2 text-sm leading-relaxed">
            مساحة آمنة للتعبير عن رأيك، شكاواك، ومقترحاتك.<br />نقرأ كل رسالة ونستجيب لها باهتمام.
          </p>
          <div className="inline-flex items-center gap-2 mt-3 bg-orange-500/10 border border-orange-500/20 px-4 py-1.5 rounded-full">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-orange-300 font-bold">DEVITE • صندوق الوارد المباشر</span>
          </div>
        </div>

        {/* Step 1: Choose Role */}
        {step === "role" && (
          <div className="bg-gray-900/80 border border-white/5 rounded-2xl p-6 shadow-2xl backdrop-blur-sm space-y-4">
            <h2 className="text-lg font-black text-white">أنت...</h2>
            <div className="space-y-3">
              {SENDER_ROLES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => { setSenderRole(r.value); setStep("form"); }}
                  className="w-full flex items-center gap-4 bg-white/3 hover:bg-white/8 border border-white/5 hover:border-orange-500/30 rounded-xl p-4 text-right transition-all group"
                >
                  <div className="flex-1">
                    <p className="text-white font-bold text-sm">{r.label}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{r.desc}</p>
                  </div>
                  <ChevronDown className="text-gray-600 group-hover:text-orange-400 rotate-[-90deg] transition-colors" size={16} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Feedback Form */}
        {step === "form" && (
          <form onSubmit={handleSubmit} className="bg-gray-900/80 border border-white/5 rounded-2xl p-6 shadow-2xl backdrop-blur-sm space-y-5">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <h2 className="text-lg font-black text-white">تفاصيل الملاحظة</h2>
              <button type="button" onClick={() => setStep("role")} className="text-xs text-gray-500 hover:text-white transition-colors">
                ← تغيير الصفة
              </button>
            </div>

            {/* Name & Phone - Optional */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-bold">الاسم (اختياري)</label>
                <input
                  type="text" value={senderName} onChange={(e) => setSenderName(e.target.value)}
                  placeholder="اسمك..."
                  className="w-full bg-gray-800 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-bold">الهاتف (اختياري)</label>
                <input
                  type="tel" value={senderPhone} onChange={(e) => setSenderPhone(e.target.value)}
                  placeholder="للتواصل بك..."
                  className="w-full bg-gray-800 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>
            </div>

            {/* Feedback Type */}
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold">نوع الملاحظة *</label>
              <div className="grid grid-cols-2 gap-2">
                {FEEDBACK_TYPES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.value} type="button"
                      onClick={() => setType(t.value)}
                      className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-bold transition-all ${
                        type === t.value ? `${t.bg} ${t.color} border-opacity-100` : "bg-white/3 border-white/5 text-gray-400 hover:bg-white/8"
                      }`}
                    >
                      <Icon size={14} />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Star Rating (optional, for product reviews) */}
            {type === "تقييم منتج" && (
              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-bold">تقييمك للمنتج</label>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map((star) => (
                    <button
                      key={star} type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="text-2xl transition-transform hover:scale-110"
                    >
                      <span className={(hoverRating || rating) >= star ? "text-yellow-400" : "text-gray-600"}>★</span>
                    </button>
                  ))}
                  {rating > 0 && <span className="text-xs text-gray-400 self-center mr-2">{rating}/5</span>}
                </div>
              </div>
            )}

            {/* Content */}
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-bold">اكتب ملاحظتك بالتفصيل *</label>
              <textarea
                value={content} onChange={(e) => setContent(e.target.value)}
                placeholder="شاركنا تجربتك، فكرتك، أو شكواك بصراحة تامة..."
                rows={5}
                className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500 resize-none transition-colors leading-relaxed"
              />
              <div className="text-xs text-gray-600 text-left">{content.length} حرف</div>
            </div>

            <button
              type="submit" disabled={submitMutation.isLoading}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black py-3.5 rounded-xl transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 text-sm"
            >
              {submitMutation.isLoading ? <Loader2 className="animate-spin" size={16} /> : <Send size={14} />}
              إرسال الملاحظة
            </button>
          </form>
        )}

        {/* Step 3: Done */}
        {step === "done" && (
          <div className="bg-gray-900/80 border border-green-500/20 rounded-2xl p-10 shadow-2xl backdrop-blur-sm text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/10 rounded-full border border-green-500/20 mb-2">
              <CheckCircle2 className="text-green-400" size={40} />
            </div>
            <h2 className="text-2xl font-black text-white">شكراً لك! 🎉</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              وصلت ملاحظتك مباشرةً إلى الإدارة.<br />
              نقدّر وقتك وسنأخذ ملاحظتك بعين الاعتبار.
            </p>
            <button
              onClick={() => { setStep("role"); setSenderRole(""); setType(""); setContent(""); setSenderName(""); setSenderPhone(""); setRating(0); }}
              className="mt-2 bg-white/5 hover:bg-white/10 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all"
            >
              إرسال ملاحظة أخرى
            </button>
          </div>
        )}

        <p className="text-center text-xs text-gray-700 mt-6">جميع الملاحظات سرية وتصل مباشرةً للإدارة</p>
      </div>
    </div>
  );
}
