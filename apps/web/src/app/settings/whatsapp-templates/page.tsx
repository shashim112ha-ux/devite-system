"use client";

import { useState } from "react";
import { trpc } from "../../utils/trpc";
import { FileText, Save, RefreshCw, ChevronDown, ChevronUp, Info } from "lucide-react";

const TYPE_LABELS: Record<string, { icon: string; color: string }> = {
  ORDER_CREATED:   { icon: "📦", color: "text-blue-400" },
  ORDER_READY:     { icon: "✅", color: "text-green-400" },
  ORDER_CANCELLED: { icon: "❌", color: "text-red-400" },
  SHIFT_REPORT:    { icon: "📋", color: "text-yellow-400" },
  DAILY_REPORT:    { icon: "📊", color: "text-purple-400" },
  LOW_INVENTORY:   { icon: "⚠️", color: "text-orange-400" },
  LARGE_EXPENSE:   { icon: "💸", color: "text-pink-400" },
  INVESTOR_REPORT: { icon: "📈", color: "text-cyan-400" },
};

export default function WhatsAppTemplatesPage() {
  const utils = trpc.useContext();
  const { data: templates, isLoading } = trpc.getWhatsAppTemplates.useQuery();
  const updateMutation = trpc.updateWhatsAppTemplate.useMutation({
    onSuccess: () => { utils.getWhatsAppTemplates.invalidate(); },
  });

  const [editingType, setEditingType] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, { name: string; body: string }>>({});
  const [savedType, setSavedType] = useState<string | null>(null);

  const startEdit = (t: any) => {
    setEditingType(t.type);
    setEditValues(prev => ({ ...prev, [t.type]: { name: t.name, body: t.body } }));
  };

  const saveTemplate = (type: string) => {
    const val = editValues[type];
    if (!val) return;
    updateMutation.mutate({ type, name: val.name, body: val.body }, {
      onSuccess: () => {
        setSavedType(type);
        setTimeout(() => setSavedType(null), 2000);
      }
    });
  };

  if (isLoading) return <div className="p-8 text-gray-400 animate-pulse">جاري التحميل...</div>;

  return (
    <div className="min-h-screen bg-brand-black text-white p-8 pb-24 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-black text-brand-orange flex items-center gap-3">
          <FileText size={28} /> قوالب رسائل الواتساب
        </h1>
        <p className="text-gray-400 mt-1 text-sm">تخصيص نصوص الرسائل التلقائية المرسلة للعملاء والمدراء والمستثمرين.</p>
      </div>

      <div className="bg-brand-navy border border-white/10 rounded-3xl p-5 flex gap-3 text-sm text-blue-300">
        <Info size={18} className="shrink-0 mt-0.5 text-blue-400" />
        <div>
          يمكنك استخدام المتغيرات الديناميكية التي ستُستبدل تلقائياً بالبيانات الفعلية عند الإرسال.
          <span className="block mt-1 font-mono text-xs text-blue-200/70">مثال: {"{customerName}"} → أحمد | {"{orderNumber}"} → 1042</span>
        </div>
      </div>

      {templates?.map(template => {
        const meta = TYPE_LABELS[template.type] || { icon: "📩", color: "text-gray-400" };
        const isEditing = editingType === template.type;
        const editVal = editValues[template.type] || { name: template.name, body: template.body };
        const isSaved = savedType === template.type;

        return (
          <div key={template.type} className="bg-brand-navy border border-white/10 rounded-3xl overflow-hidden">
            {/* Header */}
            <button
              onClick={() => isEditing ? setEditingType(null) : startEdit(template)}
              className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">{meta.icon}</span>
                <div className="text-right">
                  <h3 className={`text-lg font-black ${meta.color}`}>{template.name}</h3>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">{template.type}</p>
                </div>
              </div>
              {isEditing ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
            </button>

            {/* Editor */}
            {isEditing && (
              <div className="px-6 pb-6 space-y-4 border-t border-white/5 pt-4">
                <div>
                  <label className="text-xs text-brand-gold font-bold uppercase tracking-widest block mb-2">اسم القالب</label>
                  <input
                    value={editVal.name}
                    onChange={e => setEditValues(prev => ({ ...prev, [template.type]: { ...editVal, name: e.target.value } }))}
                    className="w-full bg-brand-black border border-white/10 p-3 rounded-2xl text-sm text-white outline-none focus:border-brand-orange"
                  />
                </div>

                <div>
                  <label className="text-xs text-brand-gold font-bold uppercase tracking-widest block mb-2">نص الرسالة</label>
                  <textarea
                    value={editVal.body}
                    onChange={e => setEditValues(prev => ({ ...prev, [template.type]: { ...editVal, body: e.target.value } }))}
                    rows={8}
                    className="w-full bg-brand-black border border-white/10 p-4 rounded-2xl text-sm text-white outline-none focus:border-brand-orange font-mono leading-relaxed resize-y"
                  />
                </div>

                {/* Variables */}
                <div>
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-widest font-bold">المتغيرات المتاحة:</p>
                  <div className="flex flex-wrap gap-2">
                    {template.variables?.split(',').map(v => (
                      <button
                        key={v}
                        onClick={() => setEditValues(prev => ({ ...prev, [template.type]: { ...editVal, body: editVal.body + v } }))}
                        className="text-xs font-mono bg-brand-orange/10 text-brand-orange border border-brand-orange/20 px-3 py-1.5 rounded-xl hover:bg-brand-orange hover:text-black transition-colors"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => saveTemplate(template.type)}
                  disabled={updateMutation.isLoading}
                  className="bg-brand-orange hover:bg-brand-gold text-black font-black px-8 py-3 rounded-2xl flex items-center gap-2 transition-colors shadow-lg shadow-brand-orange/20"
                >
                  {isSaved ? "تم الحفظ ✓" : updateMutation.isLoading ? <><RefreshCw size={16} className="animate-spin" /> حفظ...</> : <><Save size={16} /> حفظ القالب</>}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
