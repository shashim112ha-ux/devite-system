"use client";

import { useState, useEffect } from "react";
import { trpc } from "../../utils/trpc";
import {
  MessageCircle, Save, Send, CheckCircle, XCircle, Phone,
  Users, Shield, Bell, AlertTriangle, RefreshCw, Info, QrCode, Power
} from "lucide-react";

const NOTIFICATION_TYPES = [
  { key: "notifyOrderCreated", label: "رسالة استلام الطلب للعميل", icon: "📦", who: "عميل" },
  { key: "notifyOrderReady", label: "رسالة جاهزية الطلب", icon: "✅", who: "عميل" },
  { key: "notifyOrderCancelled", label: "رسالة إلغاء الطلب", icon: "❌", who: "عميل" },
  { key: "notifyShiftReport", label: "تقرير نهاية الشفت (PDF)", icon: "📋", who: "مدير" },
  { key: "notifyDailyReport", label: "التقرير اليومي", icon: "📊", who: "مدير" },
  { key: "notifyLowInventory", label: "تنبيه نقص المخزون", icon: "⚠️", who: "مدير" },
  { key: "notifyLargeExpense", label: "تنبيه المصروفات الكبيرة", icon: "💸", who: "مدير" },
  { key: "notifyInvestorReport", label: "تقارير المستثمرين", icon: "📈", who: "مستثمر" },
];

export default function WhatsAppSettingsPage() {
  const utils = trpc.useContext();
  const { data: settings, isLoading } = trpc.getWhatsAppSettings.useQuery();
  const { data: waStatus } = trpc.getWhatsAppStatus.useQuery(undefined, { refetchInterval: 3000 });
  const restartMutation = trpc.restartWhatsAppClient.useMutation({
    onSuccess: () => utils.getWhatsAppStatus.invalidate()
  });

  const updateMutation = trpc.updateWhatsAppSettings.useMutation({
    onSuccess: () => { utils.getWhatsAppSettings.invalidate(); setSaved(true); setTimeout(() => setSaved(false), 2000); },
  });
  const testMutation = trpc.testWhatsApp.useMutation({
    onSuccess: (d) => alert(d.message),
    onError: (e) => alert(e.message)
  });

  const [saved, setSaved] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testMsg, setTestMsg] = useState("رسالة اختبار من DEVITE ✅");

  // Form state
  const [form, setForm] = useState({
    isEnabled: false,
    officialNumber: "",
    managerNumbers: "",
    supervisorNumbers: "",
    investorNumbers: "",
    headManagerNumber: "",
    notifyOrderCreated: true,
    notifyOrderReady: true,
    notifyOrderCancelled: true,
    notifyShiftReport: true,
    notifyDailyReport: false,
    notifyLowInventory: true,
    notifyLargeExpense: true,
    notifyInvestorReport: false,
    largeExpenseThreshold: 20,
    lowInventoryRepeatDaily: false,
  });

  useEffect(() => {
    if (settings) setForm(f => ({ ...f, ...settings }));
  }, [settings]);

  const handleSave = () => updateMutation.mutate(form as any);
  const toggle = (key: string) => setForm(f => ({ ...f, [key]: !(f as any)[key] }));

  const isConnected = waStatus?.status === 'CONNECTED';

  if (isLoading) return <div className="p-8 text-gray-400 animate-pulse">جاري التحميل...</div>;

  return (
    <div className="min-h-screen bg-brand-black text-white p-8 pb-24 space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-brand-orange flex items-center gap-3">
            <MessageCircle size={28} /> إعدادات الواتساب
          </h1>
          <p className="text-gray-400 mt-1 text-sm">ربط وإدارة نظام الرسائل التلقائية عبر WhatsApp Business API</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border ${isConnected ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
          {isConnected ? <><CheckCircle size={16} /> متصل</> : <><XCircle size={16} /> غير متصل</>}
        </div>
      </div>

      {/* Master Enable */}
      <section className="bg-brand-navy border border-white/10 rounded-3xl p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-white">تفعيل نظام الواتساب</h2>
            <p className="text-gray-400 text-sm mt-1">تشغيل أو إيقاف جميع رسائل الواتساب التلقائية</p>
          </div>
          <button onClick={() => toggle('isEnabled')} className={`relative w-16 h-8 rounded-full transition-colors ${form.isEnabled ? 'bg-brand-orange' : 'bg-white/10'}`}>
            <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${form.isEnabled ? 'translate-x-9' : 'translate-x-1'}`} />
          </button>
        </div>
      </section>

      {/* WhatsApp Connection Status */}
      <section className="bg-brand-navy border border-white/10 rounded-3xl p-6 space-y-6">
        <div className="flex justify-between items-center">
           <h2 className="text-xl font-black text-white flex items-center gap-2"><QrCode size={20} className="text-brand-orange" /> حالة اتصال واتساب</h2>
           <button onClick={() => restartMutation.mutate()} disabled={restartMutation.isLoading} className="bg-white/10 hover:bg-white/20 p-2 rounded-xl text-sm flex items-center gap-2 transition-colors">
              <Power size={16} /> إعادة تشغيل الاتصال
           </button>
        </div>

        {waStatus?.status === 'DISCONNECTED' && (
           <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center space-y-3">
              <XCircle size={40} className="mx-auto text-red-400" />
              <h3 className="font-bold text-red-400">غير متصل بالواتساب</h3>
              <p className="text-sm text-red-300">جاري محاولة الاتصال أو يرجى الضغط على زر إعادة التشغيل...</p>
           </div>
        )}

        {waStatus?.status === 'QR_READY' && waStatus.qr && (
           <div className="bg-brand-black border border-white/5 rounded-2xl p-8 text-center space-y-6">
              <div className="bg-white p-4 inline-block rounded-xl">
                 <img src={waStatus.qr} alt="WhatsApp QR Code" className="w-64 h-64 object-contain" />
              </div>
              <div>
                 <h3 className="font-bold text-brand-orange text-lg">امسح الكود لربط النظام بالواتساب</h3>
                 <p className="text-sm text-gray-400 mt-2">افتح تطبيق الواتساب في هاتفك > الإعدادات > الأجهزة المرتبطة > ربط جهاز، ثم وجه الكاميرا نحو هذا الرمز.</p>
              </div>
           </div>
        )}

        {waStatus?.status === 'CONNECTED' && (
           <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6 text-center space-y-3">
              <CheckCircle size={40} className="mx-auto text-green-400" />
              <h3 className="font-bold text-green-400 text-lg">تم الربط بنجاح!</h3>
              <p className="text-sm text-green-300">النظام متصل الآن وجاهز لإرسال الإشعارات والتقارير عبر الواتساب.</p>
           </div>
        )}
      </section>

      {/* Phone Numbers */}
      <section className="bg-brand-navy border border-white/10 rounded-3xl p-6 space-y-4">
        <h2 className="text-xl font-black text-white flex items-center gap-2"><Users size={20} className="text-brand-orange" /> أرقام الهواتف</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: "رقم المدير الرئيسي", key: "headManagerNumber", placeholder: "+97300000000" },
            { label: "رقم الواتساب الرسمي للعربة", key: "officialNumber", placeholder: "+97300000000" },
            { label: "أرقام المدراء (مفصولة بفاصلة)", key: "managerNumbers", placeholder: "+97300000001,+97300000002" },
            { label: "أرقام المشرفين", key: "supervisorNumbers", placeholder: "+97300000003" },
            { label: "أرقام المستثمرين", key: "investorNumbers", placeholder: "+97300000004" },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="text-xs text-brand-gold font-bold uppercase tracking-widest block mb-2">{label}</label>
              <input
                value={(form as any)[key] || ""}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full bg-brand-black border border-white/10 p-4 rounded-2xl text-sm text-white outline-none focus:border-brand-orange dir-ltr font-mono"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Notification Toggles */}
      <section className="bg-brand-navy border border-white/10 rounded-3xl p-6 space-y-4">
        <h2 className="text-xl font-black text-white flex items-center gap-2"><Bell size={20} className="text-brand-orange" /> التحكم في الإشعارات</h2>
        <div className="space-y-3">
          {NOTIFICATION_TYPES.map(({ key, label, icon, who }) => (
            <div key={key} className="flex items-center justify-between p-4 bg-brand-black/40 rounded-2xl border border-white/5">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{icon}</span>
                <div>
                  <p className="font-bold text-sm text-white">{label}</p>
                  <p className="text-xs text-gray-500">المستلم: {who}</p>
                </div>
              </div>
              <button onClick={() => toggle(key)} className={`relative w-14 h-7 rounded-full transition-colors ${(form as any)[key] ? 'bg-brand-orange' : 'bg-white/10'}`}>
                <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${(form as any)[key] ? 'translate-x-7' : 'translate-x-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Thresholds */}
      <section className="bg-brand-navy border border-white/10 rounded-3xl p-6 space-y-4">
        <h2 className="text-xl font-black text-white flex items-center gap-2"><AlertTriangle size={20} className="text-brand-orange" /> حدود التنبيهات</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-brand-gold font-bold uppercase tracking-widest block mb-2">حد تنبيه المصروف الكبير (د.ب)</label>
            <input
              type="number"
              value={form.largeExpenseThreshold}
              onChange={e => setForm(f => ({ ...f, largeExpenseThreshold: Number(e.target.value) }))}
              className="w-full bg-brand-black border border-white/10 p-4 rounded-2xl text-sm text-white outline-none focus:border-brand-orange"
            />
          </div>
          <div className="flex items-center gap-4 p-4 bg-brand-black/40 rounded-2xl border border-white/5">
            <div>
              <p className="font-bold text-sm text-white">تكرار تنبيه المخزون يومياً</p>
              <p className="text-xs text-gray-500">إذا لم يتم تحديث المخزون، يُعاد إرسال التنبيه يومياً</p>
            </div>
            <button onClick={() => toggle('lowInventoryRepeatDaily')} className={`relative w-14 h-7 rounded-full shrink-0 transition-colors ${form.lowInventoryRepeatDaily ? 'bg-brand-orange' : 'bg-white/10'}`}>
              <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${form.lowInventoryRepeatDaily ? 'translate-x-7' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>
      </section>

      {/* Test Send */}
      <section className="bg-brand-navy border border-white/10 rounded-3xl p-6 space-y-4">
        <h2 className="text-xl font-black text-white flex items-center gap-2"><Send size={20} className="text-brand-orange" /> اختبار الإرسال</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-brand-gold font-bold uppercase tracking-widest block mb-2">رقم الهاتف (للاختبار)</label>
            <input value={testPhone} onChange={e => setTestPhone(e.target.value)} placeholder="+97300000000" className="w-full bg-brand-black border border-white/10 p-4 rounded-2xl text-sm text-white outline-none focus:border-brand-orange dir-ltr font-mono" />
          </div>
          <div>
            <label className="text-xs text-brand-gold font-bold uppercase tracking-widest block mb-2">نص الرسالة</label>
            <input value={testMsg} onChange={e => setTestMsg(e.target.value)} className="w-full bg-brand-black border border-white/10 p-4 rounded-2xl text-sm text-white outline-none focus:border-brand-orange" />
          </div>
        </div>
        <button
          onClick={() => testMutation.mutate({ phone: testPhone, message: testMsg })}
          disabled={!testPhone || testMutation.isLoading}
          className="bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white font-bold px-6 py-3 rounded-2xl flex items-center gap-2 transition-colors"
        >
          <Send size={16} />
          {testMutation.isLoading ? "جاري الإضافة للطابور..." : "إرسال رسالة اختبار"}
        </button>
      </section>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={updateMutation.isLoading}
        className="w-full bg-gradient-to-r from-brand-orange to-brand-gold text-black font-black py-5 rounded-3xl flex items-center justify-center gap-3 text-lg shadow-2xl shadow-brand-orange/20 hover:scale-[1.01] transition-transform"
      >
        {saved ? <><CheckCircle size={22} /> تم الحفظ!</> : updateMutation.isLoading ? <><RefreshCw size={22} className="animate-spin" /> جاري الحفظ...</> : <><Save size={22} /> حفظ الإعدادات</>}
      </button>
    </div>
  );
}
