"use client";

import { useState, useEffect } from "react";
import { trpc } from "../utils/trpc";
import { 
  ClipboardCheck, Plus, CheckSquare, Settings, ShieldAlert, 
  HelpCircle, DollarSign, ListTodo, FileSpreadsheet, Eye, 
  Loader2, AlertCircle, TrendingUp, AlertTriangle, Download, MessageCircle 
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function ShiftReportPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [page, setPage] = useState(1);

  // Financial fields
  const [dailyIncome, setDailyIncome] = useState("0");
  const [expenses, setExpenses] = useState("0");
  const [losses, setLosses] = useState("0");
  const [cashAmount, setCashAmount] = useState("0");
  const [cardAmount, setCardAmount] = useState("0");
  const [mostConsumedMaterial, setMostConsumedMaterial] = useState("");
  const [notes, setNotes] = useState("");

  // Checklist
  const [cleanlinessInternal, setCleanlinessInternal] = useState(false);
  const [cleanlinessExternal, setCleanlinessExternal] = useState(false);
  const [waterInternal, setWaterInternal] = useState("0");
  const [waterExternal, setWaterExternal] = useState("0");
  const [petrolQuantity, setPetrolQuantity] = useState("0");
  const [gasQuantity, setGasQuantity] = useState("0");
  const [electricityStatus, setElectricityStatus] = useState(false);
  const [fridgeStatus, setFridgeStatus] = useState(false);
  const [blenderStatus, setBlenderStatus] = useState(false);
  const [iceMachineStatus, setIceMachineStatus] = useState(false);
  const [cupsQuantity, setCupsQuantity] = useState("0");
  const [lidsQuantity, setLidsQuantity] = useState("0");
  const [napkinsQuantity, setNapkinsQuantity] = useState("0");
  const [glovesQuantity, setGlovesQuantity] = useState("0");
  const [masksQuantity, setMasksQuantity] = useState("0");
  const [bagsQuantity, setBagsQuantity] = useState("0");
  const [cleaningToolsStatus, setCleaningToolsStatus] = useState(false);

  // Stats
  const [presentStaff, setPresentStaff] = useState("");
  const [absentStaff, setAbsentStaff] = useState("");
  const [lateStaff, setLateStaff] = useState("");
  const [ordersCount, setOrdersCount] = useState("0");
  const [avgPrepTime, setAvgPrepTime] = useState("0");
  const [fastestOrderTime, setFastestOrderTime] = useState("0");
  const [slowestOrderTime, setSlowestOrderTime] = useState("0");
  const [delayedOrdersCount, setDelayedOrdersCount] = useState("0");
  const [cancelledOrdersCount, setCancelledOrdersCount] = useState("0");

  const utils = trpc.useContext();
  const { data: reportsResponse, isLoading: loadingReports } = trpc.getShiftReports.useQuery({ page, limit: 20 });
  const reportsList = reportsResponse?.data || [];
  const totalPages = reportsResponse?.totalPages || 1;
  const { data: settings } = trpc.getSystemSettings.useQuery();
  const { data: todayStats } = trpc.getTodayShiftStats.useQuery();
  const { data: inventoryStats } = trpc.getAdvancedStats.useQuery();

  const storedUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : '';
  const userRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') || '' : '';

  const submitMutation = trpc.submitShiftReport.useMutation({
    onSuccess: () => {
      utils.getShiftReports.invalidate();
      setShowAddForm(false);
      resetForm();
      alert("تم إرسال تقرير نهاية الدوام وجدول التدقيق المرفق بنجاح!");
      
      if (settings?.whatsappEnabled && settings?.whatsappPhone) {
        const sendWa = window.confirm("تم اعتماد التقرير بنجاح. هل ترغب بإرساله للمدير عبر الواتساب؟");
        if (sendWa) {
          const phone = settings.whatsappPhone;
          const formattedPhone = phone.startsWith('+') ? phone.substring(1) : (phone.startsWith('00') ? phone.substring(2) : `973${phone}`);
          let msg = settings.whatsappShiftMsg || "تقرير الشفت: المبيعات {{income}}، المصروفات {{expenses}}، الصافي {{net}}.";
          msg = msg.replace('{{income}}', dailyIncome);
          msg = msg.replace('{{expenses}}', expenses);
          msg = msg.replace('{{net}}', cashAmount);
          const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
          window.open(url, '_blank');
        }
      }
    },
    onError: (err) => alert(`خطأ: ${err.message}`)
  });

  const approveMutation = trpc.approveShiftReport.useMutation({
    onSuccess: () => {
      utils.getShiftReports.invalidate();
      alert("تم اعتماد التقرير بنجاح");
      setSelectedReport(null);
    },
    onError: (err) => alert(`خطأ: ${err.message}`)
  });

  const sendWhatsAppMutation = trpc.sendShiftReportWhatsApp.useMutation({
    onSuccess: () => alert("تم الإرسال بنجاح عبر الواتساب مع التقرير (PDF)!"),
    onError: (e) => alert("خطأ في الإرسال: " + e.message)
  });

  const resetForm = () => {
    setDailyIncome(todayStats?.dailyIncome?.toString() || "0");
    setExpenses(todayStats?.expenses?.toString() || "0");
    setLosses("0");
    setCashAmount(todayStats?.cashAmount?.toString() || "0");
    setCardAmount(todayStats?.cardAmount?.toString() || "0");
    setMostConsumedMaterial("");
    setNotes("");
    setCleanlinessInternal(false);
    setCleanlinessExternal(false);
    setWaterInternal("0");
    setWaterExternal("0");
    setPetrolQuantity("0");
    setGasQuantity("0");
    setElectricityStatus(false);
    setFridgeStatus(false);
    setBlenderStatus(false);
    setIceMachineStatus(false);
    setCupsQuantity("0");
    setLidsQuantity("0");
    setNapkinsQuantity("0");
    setGlovesQuantity("0");
    setMasksQuantity("0");
    setBagsQuantity("0");
    setCleaningToolsStatus(false);
    setPresentStaff("");
    setAbsentStaff("");
    setLateStaff("");
    setOrdersCount(todayStats?.ordersCount?.toString() || "0");
    setAvgPrepTime("0");
    setFastestOrderTime("0");
    setSlowestOrderTime("0");
    setDelayedOrdersCount("0");
    setCancelledOrdersCount("0");
  };

  // Automatically prefill when todayStats loads
  useEffect(() => {
    if (todayStats && showAddForm) {
       resetForm();
    }
  }, [todayStats, showAddForm]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storedUserId) {
      alert("لم نتمكن من تحديد كود الكاشير الحالي. يرجى تسجيل الدخول مجدداً.");
      return;
    }
    submitMutation.mutate({
      cashierId: storedUserId,
      dailyIncome: Number(dailyIncome),
      expenses: Number(expenses),
      losses: Number(losses),
      cashAmount: Number(cashAmount),
      cardAmount: Number(cardAmount),
      mostConsumedMaterial: mostConsumedMaterial || undefined,
      notes: notes || undefined,
      cleanlinessInternal,
      cleanlinessExternal,
      waterInternal: Number(waterInternal),
      waterExternal: Number(waterExternal),
      petrolQuantity: Number(petrolQuantity),
      gasQuantity: Number(gasQuantity),
      electricityStatus,
      fridgeStatus,
      blenderStatus,
      iceMachineStatus,
      cupsQuantity: Number(cupsQuantity),
      lidsQuantity: Number(lidsQuantity),
      napkinsQuantity: Number(napkinsQuantity),
      glovesQuantity: Number(glovesQuantity),
      masksQuantity: Number(masksQuantity),
      bagsQuantity: Number(bagsQuantity),
      cleaningToolsStatus,
      presentStaff,
      absentStaff,
      lateStaff,
      ordersCount: Number(ordersCount),
      avgPrepTime: Number(avgPrepTime),
      fastestOrderTime: Number(fastestOrderTime),
      slowestOrderTime: Number(slowestOrderTime),
      delayedOrdersCount: Number(delayedOrdersCount),
      cancelledOrdersCount: Number(cancelledOrdersCount)
    });
  };

  const sendToWhatsApp = (report: any) => {
    const text = `
*تقرير إغلاق الوردية* 📋
التاريخ: ${new Date(report.date).toLocaleString('ar-BH')}
مسؤول الوردية: ${report.cashier?.name}

*التسوية المالية:*
- المبيعات: ${report.profit.toFixed(3)} د.ب
- المصروفات: ${report.expenses.toFixed(3)} د.ب
- الكاش + الشبكة: ${(report.cashAmount + report.cardAmount).toFixed(3)} د.ب
- الفارق المالي: ${report.difference.toFixed(3)} د.ب

*ملاحظات الفحص:*
- النظافة: ${report.cleanlinessInternal ? "ممتازة" : "تحتاج مراجعة"}
- الثلاجة: ${report.fridgeStatus ? "سليمة" : "عطل"}

*الحالة:* ${report.status === 'APPROVED' ? 'معتمد ✅' : report.status === 'REJECTED' ? 'مرفوض ❌' : 'قيد المراجعة ⏳'}
`.trim();

    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

    const sharePDFViaLink = async (report: any) => {
      const input = document.getElementById('print-modal-area');
      if (!input) return;
      
      const clone = input.cloneNode(true) as HTMLElement;
      clone.style.width = '794px';
      clone.style.backgroundColor = '#ffffff';
      clone.style.color = '#000000';
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      document.body.appendChild(clone);
  
      const elementsToInvert = clone.querySelectorAll('.bg-brand-black\\/40, .bg-brand-black\\/20, .text-gray-400, .text-white');
      elementsToInvert.forEach((el: any) => {
        el.style.backgroundColor = '#f9fafb';
        el.style.color = '#000000';
        el.style.borderColor = '#e5e7eb';
      });
  
      try {
        const canvas = await html2canvas(clone, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        const pdfBase64 = pdf.output('datauristring');
        
        // Upload to API
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: pdfBase64 })
        });
        
        if (!response.ok) throw new Error('Upload failed');
        const data = await response.json();
        const pdfUrl = data.url;
        
        // Open WhatsApp
        const text = `*تقرير نهاية الشفت* 📝\nالتاريخ: ${new Date(report.date).toLocaleString('ar-BH')}\nالموظف: ${report.cashier?.name}\n\nرابط تحميل التقرير (PDF):\n${pdfUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
      } catch (err) {
        console.error("PDF Export/Share failed", err);
        alert("فشل رفع التقرير أو مشاركته. تأكد من اتصالك بالإنترنت.");
      } finally {
        document.body.removeChild(clone);
      }
    };

  const exportPDF = async () => {
    const input = document.getElementById('print-modal-area');
    if (!input) return;
    
    // Create a temporary clone for printing to maintain A4 proportions and light theme
    const clone = input.cloneNode(true) as HTMLElement;
    clone.style.width = '794px'; // A4 width at 96 DPI
    clone.style.backgroundColor = '#ffffff';
    clone.style.color = '#000000';
    clone.style.position = 'absolute';
    clone.style.left = '-9999px';
    clone.style.top = '0';
    document.body.appendChild(clone);

    // Force light text on dark backgrounds in the clone
    const elementsToInvert = clone.querySelectorAll('.bg-brand-black\\/40, .bg-brand-black\\/20, .text-gray-400, .text-white');
    elementsToInvert.forEach((el: any) => {
      el.style.backgroundColor = '#f9fafb';
      el.style.color = '#000000';
      el.style.borderColor = '#e5e7eb';
    });

    try {
      const canvas = await html2canvas(clone, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`shift-report-${new Date().getTime()}.pdf`);
    } catch (err) {
      console.error("PDF Export failed", err);
      alert("فشل تصدير الـ PDF. حاول استخدام الطباعة العادية.");
    } finally {
      document.body.removeChild(clone);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-black text-brand-orange">إغلاق وتسجيل نهاية الدوام</h1>
          <p className="text-gray-400 text-sm mt-1">
            تسجيل الجرد اليومي، تسوية صناديق النقود، وفحص سلامة العربة قبل المغادرة
          </p>
        </div>
        {userRole !== "INVESTOR" && (
          <div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-brand-orange hover:bg-brand-orange/90 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-brand-orange/20 flex items-center gap-2 text-sm"
            >
              <Plus size={16} />
              تعبئة تقرير نهاية الشفت
            </button>
          </div>
        )}
      </div>

      {/* Checklist Submission Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-brand-navy border border-white/5 p-6 rounded-2xl space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <div className="border-b border-white/5 pb-4">
            <h3 className="text-lg font-black text-brand-orange">تقرير الكاشير وجرد نهاية الوردية</h3>
            <p className="text-xs text-gray-400">يرجى تعبئة الحقول بدقة ومراجعة الحسابات قبل الإرسال</p>
          </div>

          {/* Section 1: Financial Reconciliation */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white border-r-2 border-brand-orange pr-2">أولاً: التسوية المالية وصندوق النقدية</h4>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-400">مبيعات النظام الإجمالية (د.ب)</label>
                <input
                  type="number"
                  step="0.001"
                  value={dailyIncome}
                  onChange={(e) => setDailyIncome(e.target.value)}
                  className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">مصاريف الخزينة اليومية (د.ب)</label>
                <input
                  type="number"
                  step="0.001"
                  value={expenses}
                  onChange={(e) => setExpenses(e.target.value)}
                  className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">العجز أو الخسائر التالفة (د.ب)</label>
                <input
                  type="number"
                  step="0.001"
                  value={losses}
                  onChange={(e) => setLosses(e.target.value)}
                  className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">مبلغ الكاش الفعلي بالدرج (د.ب)</label>
                <input
                  type="number"
                  step="0.001"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">مبلغ الشبكة/البطاقة الفعلي (د.ب)</label>
                <input
                  type="number"
                  step="0.001"
                  value={cardAmount}
                  onChange={(e) => setCardAmount(e.target.value)}
                  className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono text-sm"
                />
              </div>
            </div>
            {/* Real-time cash difference indicator */}
            <div className="bg-white/5 p-4 rounded-xl flex items-center justify-between text-xs">
              <span>الفارق الفعلي (الكاش والبطاقة - المبيعات):</span>
              <span className={`font-mono font-black text-sm ${
                (Number(cashAmount) + Number(cardAmount) - Number(dailyIncome)) >= 0 ? "text-green-400" : "text-red-400"
              }`}>
                {(Number(cashAmount) + Number(cardAmount) - Number(dailyIncome)).toFixed(3)} د.ب
              </span>
            </div>
          </div>

          {/* Section 2: Cleanliness & Equipment Checklist */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <h4 className="text-sm font-bold text-white border-r-2 border-brand-orange pr-2">ثانياً: فحص السلامة والجاهزية (Checklist)</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Checkboxes */}
              <div className="bg-brand-black/40 p-4 rounded-xl space-y-3">
                <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">النظافة والتوصيلات</div>
                <label className="flex items-center gap-3 text-sm cursor-pointer text-gray-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={cleanlinessInternal}
                    onChange={(e) => setCleanlinessInternal(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-orange focus:ring-brand-orange bg-brand-black border-white/10"
                  />
                  نظافة العربة الداخلية بالكامل
                </label>
                <label className="flex items-center gap-3 text-sm cursor-pointer text-gray-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={cleanlinessExternal}
                    onChange={(e) => setCleanlinessExternal(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-orange focus:ring-brand-orange bg-brand-black border-white/10"
                  />
                  نظافة المحيط الخارجي وطاولات الاستقبال
                </label>
                <label className="flex items-center gap-3 text-sm cursor-pointer text-gray-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={electricityStatus}
                    onChange={(e) => setElectricityStatus(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-orange focus:ring-brand-orange bg-brand-black border-white/10"
                  />
                  سلامة التوصيلات الكهربائية وعزلها
                </label>
                <label className="flex items-center gap-3 text-sm cursor-pointer text-gray-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={cleaningToolsStatus}
                    onChange={(e) => setCleaningToolsStatus(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-orange focus:ring-brand-orange bg-brand-black border-white/10"
                  />
                  توفر وتأمين كافة أدوات ومحاليل النظافة
                </label>
              </div>

              {/* Equipment status */}
              <div className="bg-brand-black/40 p-4 rounded-xl space-y-3">
                <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">سلامة المعدات والأجهزة</div>
                <label className="flex items-center gap-3 text-sm cursor-pointer text-gray-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={fridgeStatus}
                    onChange={(e) => setFridgeStatus(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-orange focus:ring-brand-orange bg-brand-black border-white/10"
                  />
                  عمل الثلاجة والفريزر واستقرار التبريد
                </label>
                <label className="flex items-center gap-3 text-sm cursor-pointer text-gray-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={blenderStatus}
                    onChange={(e) => setBlenderStatus(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-orange focus:ring-brand-orange bg-brand-black border-white/10"
                  />
                  صلاحية ونظافة الخلاطات والمعدات اليدوية
                </label>
                <label className="flex items-center gap-3 text-sm cursor-pointer text-gray-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={iceMachineStatus}
                    onChange={(e) => setIceMachineStatus(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-orange focus:ring-brand-orange bg-brand-black border-white/10"
                  />
                  عمل صانعة الثلج وتفريغ وتجفيف خزان الفائض
                </label>
              </div>

              {/* Resource meters */}
              <div className="bg-brand-black/40 p-4 rounded-xl space-y-2">
                <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">عدادات الموارد والطاقة</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-400">مياه داخلية (لتر)</label>
                    <input
                      type="number"
                      value={waterInternal}
                      onChange={(e) => setWaterInternal(e.target.value)}
                      className="w-full bg-brand-black border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400">مياه خارجية (لتر)</label>
                    <input
                      type="number"
                      value={waterExternal}
                      onChange={(e) => setWaterExternal(e.target.value)}
                      className="w-full bg-brand-black border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400">بنزين المولد (لتر)</label>
                    <input
                      type="number"
                      value={petrolQuantity}
                      onChange={(e) => setPetrolQuantity(e.target.value)}
                      className="w-full bg-brand-black border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400">الغاز المتبقي (أرطال)</label>
                    <input
                      type="number"
                      value={gasQuantity}
                      onChange={(e) => setGasQuantity(e.target.value)}
                      className="w-full bg-brand-black border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Material Inventory count */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <h4 className="text-sm font-bold text-white border-r-2 border-brand-orange pr-2">ثالثاً: جرد مستلزمات التقديم (كميات متبقية بالقطع)</h4>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-400">عدد الأكواب</label>
                <input
                  type="number"
                  value={cupsQuantity}
                  onChange={(e) => setCupsQuantity(e.target.value)}
                  className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-2 text-white font-mono text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">عدد الأغطية</label>
                <input
                  type="number"
                  value={lidsQuantity}
                  onChange={(e) => setLidsQuantity(e.target.value)}
                  className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-2 text-white font-mono text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">المناديل (حزمة)</label>
                <input
                  type="number"
                  value={napkinsQuantity}
                  onChange={(e) => setNapkinsQuantity(e.target.value)}
                  className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-2 text-white font-mono text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">القفازات (علبة)</label>
                <input
                  type="number"
                  value={glovesQuantity}
                  onChange={(e) => setGlovesQuantity(e.target.value)}
                  className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-2 text-white font-mono text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">الكمامات (علبة)</label>
                <input
                  type="number"
                  value={masksQuantity}
                  onChange={(e) => setMasksQuantity(e.target.value)}
                  className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-2 text-white font-mono text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">الأكياس الورقية</label>
                <input
                  type="number"
                  value={bagsQuantity}
                  onChange={(e) => setBagsQuantity(e.target.value)}
                  className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-2 text-white font-mono text-sm"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Shift Stats & Attendance */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <h4 className="text-sm font-bold text-white border-r-2 border-brand-orange pr-2">رابعاً: إحصاءات الدوام والموظفين</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-bold">الموظفون الحاضرون</label>
                <input
                  type="text"
                  placeholder="مثال: أحمد، خالد، فاطمة"
                  value={presentStaff}
                  onChange={(e) => setPresentStaff(e.target.value)}
                  className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-bold">الموظفون الغائبون</label>
                <input
                  type="text"
                  placeholder="مثال: علي (مرضي)"
                  value={absentStaff}
                  onChange={(e) => setAbsentStaff(e.target.value)}
                  className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-bold">الموظفون المتأخرون</label>
                <input
                  type="text"
                  placeholder="مثال: خالد (نصف ساعة)"
                  value={lateStaff}
                  onChange={(e) => setLateStaff(e.target.value)}
                  className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-400">إجمالي الطلبات</label>
                <input
                  type="number"
                  value={ordersCount}
                  onChange={(e) => setOrdersCount(e.target.value)}
                  className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-2 text-white font-mono text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">متوسط التحضير (د)</label>
                <input
                  type="number"
                  value={avgPrepTime}
                  onChange={(e) => setAvgPrepTime(e.target.value)}
                  className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-2 text-white font-mono text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">أسرع طلب (د)</label>
                <input
                  type="number"
                  value={fastestOrderTime}
                  onChange={(e) => setFastestOrderTime(e.target.value)}
                  className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-2 text-white font-mono text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">أبطأ طلب (د)</label>
                <input
                  type="number"
                  value={slowestOrderTime}
                  onChange={(e) => setSlowestOrderTime(e.target.value)}
                  className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-2 text-white font-mono text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">طلبات متأخرة</label>
                <input
                  type="number"
                  value={delayedOrdersCount}
                  onChange={(e) => setDelayedOrdersCount(e.target.value)}
                  className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-2 text-white font-mono text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">طلبات ملغاة</label>
                <input
                  type="number"
                  value={cancelledOrdersCount}
                  onChange={(e) => setCancelledOrdersCount(e.target.value)}
                  className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-2 text-white font-mono text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-bold">المادة الأكثر استهلاكاً اليوم</label>
                <input
                  type="text"
                  placeholder="مثال: الحليب الطازج، أكواب 12 أونص"
                  value={mostConsumedMaterial}
                  onChange={(e) => setMostConsumedMaterial(e.target.value)}
                  className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-bold">ملاحظات وقضايا العربة اليومية</label>
                <textarea
                  placeholder="أدخل أي مشاكل واجهتك في الأجهزة، أو ملاحظات للوردية القادمة..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-2 text-white text-sm min-h-[60px]"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Inventory Alerts */}
          {((inventoryStats?.lowStock?.length ?? 0) > 0 || (inventoryStats?.nearExpiry?.length ?? 0) > 0) && (
            <div className="space-y-4 pt-4 border-t border-white/5">
              <h4 className="text-sm font-bold text-white border-r-2 border-red-500 pr-2 flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-400" /> خامساً: تنبيهات المخزون (تُرفَق تلقائياً بالتقرير)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(inventoryStats?.lowStock?.length ?? 0) > 0 && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                    <p className="text-xs font-bold text-red-400 mb-3 flex items-center gap-2">
                      <AlertTriangle size={12} /> مواد على وشك النفاد ({inventoryStats?.lowStock?.length})
                    </p>
                    <div className="space-y-2 max-h-[150px] overflow-y-auto">
                      {inventoryStats?.lowStock?.map((item: any) => (
                        <div key={item.id} className="flex justify-between items-center text-xs bg-red-500/5 px-3 py-1.5 rounded-lg">
                          <span className="text-gray-200 font-bold">{item.name}</span>
                          <span className="text-red-400 font-mono">{item.quantity} {item.unit} / الحد: {item.minThreshold}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(inventoryStats?.nearExpiry?.length ?? 0) > 0 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                    <p className="text-xs font-bold text-yellow-400 mb-3 flex items-center gap-2">
                      <AlertTriangle size={12} /> مواد قريبة انتهاء الصلاحية ({inventoryStats?.nearExpiry?.length})
                    </p>
                    <div className="space-y-2 max-h-[150px] overflow-y-auto">
                      {inventoryStats?.nearExpiry?.map((item: any) => (
                        <div key={item.id} className="flex justify-between items-center text-xs bg-yellow-500/5 px-3 py-1.5 rounded-lg">
                          <span className="text-gray-200 font-bold">{item.name}</span>
                          <span className="text-yellow-400 font-mono">{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('ar-SA') : '—'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-gray-500">⚠️ هذه التنبيهات تُضاف تلقائياً لتقرير الوردية وتستوجب المتابعة الفورية</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4">
            <button
              type="button"
              onClick={resetForm}
              className="bg-white/5 hover:bg-white/10 text-white font-bold py-3 px-5 rounded-xl text-sm transition-all"
            >
              مسح البيانات
            </button>
            <button
              type="submit"
              disabled={submitMutation.isLoading}
              className="bg-brand-orange hover:bg-brand-orange/90 text-white font-bold py-3 px-6 rounded-xl text-sm transition-all flex items-center gap-2 shadow-lg shadow-brand-orange/20"
            >
              {submitMutation.isLoading && <Loader2 className="animate-spin" size={16} />}
              إرسال التقرير النهائي
            </button>
          </div>
        </form>
      )}

      {/* Reports List table (For admins and managers auditing) */}
      <div className="bg-brand-navy border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-brand-navy/80">
          <h3 className="font-black text-lg flex items-center gap-2">
            <FileSpreadsheet className="text-brand-orange" size={18} />
            سجل تقارير نهاية الشفت السابقة
          </h3>
          <span className="text-xs text-gray-400">الإجمالي: {reportsList.length} تقارير (في هذه الصفحة)</span>
        </div>

        {loadingReports ? (
          <div className="p-20 text-center text-brand-orange flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin" size={40} />
            <span className="text-gray-400 animate-pulse text-sm">جاري تحميل سجلات الوردية...</span>
          </div>
        ) : reportsList.length === 0 ? (
          <div className="p-20 text-center text-gray-500">
            <AlertCircle className="mx-auto text-white/20 mb-3" size={48} />
            <p className="text-sm">لا يوجد تقارير سابقة مسجلة.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-white/5 text-gray-400 text-xs font-bold border-b border-white/5">
                  <th className="p-4">تاريخ التقرير</th>
                  <th className="p-4">الكاشير المسؤول</th>
                  <th className="p-4 font-mono">دخل النظام</th>
                  <th className="p-4 font-mono">مصروفات / خسائر</th>
                  <th className="p-4 font-mono">التسوية (كاش/بطاقة)</th>
                  <th className="p-4 font-mono">صافي الأرباح</th>
                  <td className="p-4 font-bold text-gray-400">التسوية (الفارق)</td>
                  <td className="p-4 text-center font-bold text-gray-400">حالة الفحص</td>
                  <td className="p-4 text-center font-bold text-gray-400">الاعتماد</td>
                  <td className="p-4 text-center font-bold text-gray-400">عرض</td>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {reportsList.map((row: any) => {
                  const hasDifference = Math.abs(row.difference) > 0.05;
                  const checklistPassed = row.cleanlinessInternal && row.cleanlinessExternal && row.electricityStatus && row.fridgeStatus && row.blenderStatus && row.iceMachineStatus;

                  return (
                    <tr key={row.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 text-xs text-gray-400">
                        {new Date(row.date).toLocaleString('ar-BH')}
                      </td>
                      <td className="p-4 font-bold text-white">
                        {row.cashier.name}
                      </td>
                      <td className="p-4 font-mono font-bold">{row.profit.toFixed(3)} د.ب</td>
                      <td className="p-4 font-mono text-xs text-red-400">
                        -{row.expenses.toFixed(3)} / -{row.losses.toFixed(3)}
                      </td>
                      <td className="p-4 font-mono text-xs text-gray-300">
                        {row.cashAmount.toFixed(3)} كاش / {row.cardAmount.toFixed(3)} بطاقة
                      </td>
                      <td className="p-4 font-mono font-black text-green-400">
                        {row.netProfit.toFixed(3)} د.ب
                      </td>
                      <td className="p-4 text-center">
                        {hasDifference ? (
                          <span className={`px-2 py-1 rounded text-[10px] font-mono font-bold ${
                            row.difference < 0 ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-green-500/10 text-green-400 border border-green-500/20"
                          }`}>
                            {row.difference.toFixed(3)} د.ب
                          </span>
                        ) : (
                          <span className="text-gray-500 text-xs">مطابق (0.0)</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {checklistPassed ? (
                          <span className="bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-bold px-2 py-0.5 rounded">
                            سليم 100%
                          </span>
                        ) : (
                          <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[10px] font-bold px-2 py-0.5 rounded flex items-center justify-center gap-1 max-w-[80px] mx-auto">
                            <AlertTriangle size={10} /> ملاحظات
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                          row.status === 'APPROVED' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                          row.status === 'REJECTED' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                          'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                        }`}>
                          {row.status === 'APPROVED' ? 'معتمد' : row.status === 'REJECTED' ? 'مرفوض' : 'قيد المراجعة'}
                        </span>
                      </td>
                      <td className="p-4 text-center flex items-center justify-center gap-2">
                        <button
                          onClick={() => sharePDFViaLink(row)}
                          className="bg-green-600 hover:bg-green-500 text-white font-bold p-2 rounded-lg text-xs transition-all shadow-md shadow-green-500/20"
                          title="مشاركة التقرير عبر واتساب (ملف PDF)"
                        >
                          <MessageCircle size={14} className="mx-auto" />
                        </button>
                        <button
                          onClick={() => sendToWhatsApp(row)}
                          className="bg-green-500/10 hover:bg-green-500/20 text-green-500 font-bold p-2 rounded-lg text-xs transition-all"
                          title="إرسال عبر الواتساب"
                        >
                          <MessageCircle size={14} className="mx-auto" />
                        </button>
                        <button
                          onClick={() => setSelectedReport(row)}
                          className="bg-white/5 hover:bg-white/10 text-white font-bold p-2 rounded-lg text-xs transition-all"
                          title="عرض التقرير المفصل"
                        >
                          <Eye size={14} className="mx-auto" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex justify-between items-center p-4 border-t border-white/5 bg-brand-navy-light/10">
            <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="px-4 py-2 bg-white/5 rounded-xl disabled:opacity-50 text-white text-xs">السابق</button>
            <span className="text-sm text-gray-400">صفحة {page} من {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-4 py-2 bg-white/5 rounded-xl disabled:opacity-50 text-white text-xs">التالي</button>
          </div>
        )}
      </div>

      {/* Details Modal overlay */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 no-print-backdrop">
          {/* Print Style Injector */}
          <style dangerouslySetInnerHTML={{__html: `
            @media print {
              body * {
                visibility: hidden;
              }
              .no-print-backdrop {
                background: transparent !important;
                backdrop-filter: none !important;
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: auto !important;
                padding: 0 !important;
                margin: 0 !important;
                display: block !important;
                overflow: visible !important;
              }
              #print-modal-area, #print-modal-area * {
                visibility: visible;
              }
              #print-modal-area {
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                height: auto !important;
                max-height: none !important;
                overflow: visible !important;
                background: #ffffff !important;
                color: #000000 !important;
                border: none !important;
                box-shadow: none !important;
                padding: 10px !important;
                margin: 0 !important;
              }
              .no-print {
                display: none !important;
              }
              #print-modal-area .bg-brand-black\\/40,
              #print-modal-area .bg-brand-black\\/20 {
                background: #f9fafb !important;
                color: #000000 !important;
                border: 1px solid #e5e7eb !important;
              }
              #print-modal-area h3,
              #print-modal-area span,
              #print-modal-area p,
              #print-modal-area div,
              #print-modal-area td {
                color: #000000 !important;
              }
              #print-modal-area hr {
                border-color: #d1d5db !important;
              }
            }
          `}} />

          <div id="print-modal-area" className="bg-brand-navy border border-white/10 rounded-2xl p-6 w-full max-w-2xl space-y-6 shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <div className="border-b border-white/5 pb-4 flex justify-between items-start">
              <div>
                <h3 className="text-lg font-black text-brand-orange">تفاصيل تقرير الوردية</h3>
                <p className="text-xs text-gray-400">مسؤول الوردية: {selectedReport.cashier.name}</p>
                <p className="text-[10px] text-gray-500">التاريخ والوقت: {new Date(selectedReport.date).toLocaleString('ar-BH')}</p>
              </div>
              <div className="flex gap-2 no-print">
                <button
                  onClick={exportPDF}
                  className="bg-brand-gold hover:bg-brand-gold/90 text-black font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5"
                >
                  <Download size={14} />
                  تصدير PDF
                </button>
                <button
                  onClick={() => window.print()}
                  className="bg-brand-orange hover:bg-brand-orange/90 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                  طباعة التقرير
                </button>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="text-gray-400 hover:text-white font-bold text-sm bg-white/5 px-4 py-2 rounded-xl"
                >
                  إغلاق
                </button>
              </div>
            </div>

            {/* Grid details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              {/* Financial summary */}
              <div className="bg-brand-black/40 p-4 rounded-xl space-y-2">
                <div className="text-xs text-brand-orange font-bold uppercase tracking-wider mb-2">التسوية المالية</div>
                <div className="flex justify-between"><span>مبيعات الوردية:</span><span className="font-mono font-bold">{selectedReport.profit.toFixed(3)} د.ب</span></div>
                <div className="flex justify-between"><span>مصروفات العربة:</span><span className="font-mono text-red-400">-{selectedReport.expenses.toFixed(3)} د.ب</span></div>
                <div className="flex justify-between"><span>التالف والخسائر:</span><span className="font-mono text-red-400">-{selectedReport.losses.toFixed(3)} د.ب</span></div>
                <div className="flex justify-between"><span>المستلم الفعلي بالدرج:</span><span className="font-mono text-green-400 font-bold">{(selectedReport.cashAmount + selectedReport.cardAmount).toFixed(3)} د.ب</span></div>
                <hr className="border-white/5" />
                <div className="flex justify-between font-bold"><span>صافي الأرباح:</span><span className="font-mono text-green-400">{selectedReport.netProfit.toFixed(3)} د.ب</span></div>
                <div className="flex justify-between text-xs text-gray-400"><span>الفارق المالي:</span><span className="font-mono font-black">{selectedReport.difference.toFixed(3)} د.ب</span></div>
              </div>

              {/* Checklist checklist summary */}
              <div className="bg-brand-black/40 p-4 rounded-xl space-y-2">
                <div className="text-xs text-brand-orange font-bold uppercase tracking-wider mb-2">نتائج الفحص والتشغيل</div>
                <div className="flex justify-between"><span>نظافة العربة الداخلية:</span><span>{selectedReport.cleanlinessInternal ? "✅ ممتازة" : "❌ بحاجة لتنظيف"}</span></div>
                <div className="flex justify-between"><span>نظافة المحيط الخارجي:</span><span>{selectedReport.cleanlinessExternal ? "✅ ممتازة" : "❌ بحاجة لتنظيف"}</span></div>
                <div className="flex justify-between"><span>تشغيل الثلاجة:</span><span>{selectedReport.fridgeStatus ? "✅ سليم" : "⚠️ عاطل / توقف"}</span></div>
                <div className="flex justify-between"><span>تشغيل الخلاط والأدوات:</span><span>{selectedReport.blenderStatus ? "✅ سليم" : "⚠️ مشاكل في التشغيل"}</span></div>
                <div className="flex justify-between"><span>تشغيل آلة الثلج:</span><span>{selectedReport.iceMachineStatus ? "✅ سليم" : "⚠️ مشاكل في التشغيل"}</span></div>
                <div className="flex justify-between"><span>توصيل الكهرباء والمنافذ:</span><span>{selectedReport.electricityStatus ? "✅ سليم" : "⚠️ التوصيلات خطرة"}</span></div>
              </div>

              {/* Quantities */}
              <div className="bg-brand-black/40 p-4 rounded-xl space-y-2">
                <div className="text-xs text-brand-orange font-bold uppercase tracking-wider mb-2">جرد المستلزمات والطاقة</div>
                <div className="flex justify-between"><span>الأكواب المتبقية:</span><span className="font-mono font-bold">{selectedReport.cupsQuantity} كوب</span></div>
                <div className="flex justify-between"><span>الأغطية المتبقية:</span><span className="font-mono font-bold">{selectedReport.lidsQuantity} غطاء</span></div>
                <div className="flex justify-between"><span>المناديل الورقية:</span><span className="font-mono font-bold">{selectedReport.napkinsQuantity} حزمة</span></div>
                <div className="flex justify-between"><span>الأكياس البلاستيكية:</span><span className="font-mono font-bold">{selectedReport.bagsQuantity} كيس</span></div>
                <hr className="border-white/5" />
                <div className="flex justify-between text-xs"><span>مياه داخلية / خارجية:</span><span className="font-mono">{selectedReport.waterInternal}L / {selectedReport.waterExternal}L</span></div>
                <div className="flex justify-between text-xs"><span>بنزين المولد / غاز متبقي:</span><span className="font-mono">{selectedReport.petrolQuantity}L / {selectedReport.gasQuantity} رطل</span></div>
              </div>

              {/* Attendance and Stats */}
              <div className="bg-brand-black/40 p-4 rounded-xl space-y-2">
                <div className="text-xs text-brand-orange font-bold uppercase tracking-wider mb-2">سجل الدوام وإحصاء الطلبات</div>
                <div className="text-xs">
                  <span className="text-gray-400 block mb-0.5">الحاضرون:</span>
                  <p className="font-bold">{selectedReport.presentStaff || "غير مسجل"}</p>
                </div>
                <div className="text-xs">
                  <span className="text-gray-400 block mb-0.5">الغائبون والمتأخرون:</span>
                  <p className="font-bold text-red-300">{selectedReport.absentStaff || "لا يوجد"} / {selectedReport.lateStaff || "لا يوجد"}</p>
                </div>
                <hr className="border-white/5" />
                <div className="flex justify-between"><span>عدد الطلبات المكتملة:</span><span className="font-mono font-bold">{selectedReport.ordersCount} طلب</span></div>
                <div className="flex justify-between"><span>متوسط التحضير:</span><span className="font-mono font-bold">{selectedReport.avgPrepTime} دقيقة</span></div>
                <div className="flex justify-between text-xs text-gray-400"><span>أسرع / أبطأ طلب:</span><span className="font-mono">{selectedReport.fastestOrderTime}د / {selectedReport.slowestOrderTime}د</span></div>
                <div className="flex justify-between text-xs text-gray-400"><span>متأخر / ملغى:</span><span className="font-mono text-red-300">{selectedReport.delayedOrdersCount} / {selectedReport.cancelledOrdersCount}</span></div>
              </div>
            </div>

            {/* Notes & Consumption */}
            <div className="space-y-4 bg-brand-black/20 p-4 rounded-xl text-sm">
              <div>
                <span className="text-xs text-brand-orange font-bold block mb-1">المادة الأكثر استهلاكاً اليوم</span>
                <p className="font-bold text-white">{selectedReport.mostConsumedMaterial || "غير مسجلة"}</p>
              </div>
              <hr className="border-white/5" />
              <div>
                <span className="text-xs text-brand-orange font-bold block mb-1">ملاحظات ختامية وقضايا العربة</span>
                <p className="text-gray-300 whitespace-pre-wrap">{selectedReport.notes || "لا توجد أي ملاحظات لليوم."}</p>
              </div>
            </div>

            <div className="flex items-center justify-end border-t border-white/5 pt-4 no-print">
              <button
                onClick={() => setSelectedReport(null)}
                className="bg-brand-orange hover:bg-brand-orange/90 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all"
              >
                موافق
              </button>
            </div>
            
            {/* Manager Approval Section */}
            {userRole === 'MANAGER' && selectedReport.status === 'PENDING' && (
              <div className="bg-brand-navy-light/40 border border-brand-orange/20 p-6 rounded-2xl space-y-4 no-print">
                <h4 className="font-black text-brand-gold text-lg">مراجعة واعتماد الإدارة</h4>
                <textarea 
                  id="manager-notes"
                  placeholder="أضف ملاحظاتك هنا (اختياري)..."
                  className="w-full bg-brand-black border border-white/5 rounded-xl p-3 text-sm focus:outline-none focus:border-brand-orange min-h-[80px]"
                />
                <div className="flex gap-4 pt-2">
                  <button 
                    onClick={() => {
                      const notes = (document.getElementById('manager-notes') as HTMLTextAreaElement).value;
                      approveMutation.mutate({ id: selectedReport.id, status: 'APPROVED', managerNotes: notes });
                    }}
                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg flex-1"
                  >
                    اعتماد التقرير
                  </button>
                  <button 
                    onClick={() => {
                      const notes = (document.getElementById('manager-notes') as HTMLTextAreaElement).value;
                      approveMutation.mutate({ id: selectedReport.id, status: 'REJECTED', managerNotes: notes });
                    }}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-bold py-3 px-6 rounded-xl transition-all flex-1"
                  >
                    رفض التقرير (يوجد نقص)
                  </button>
                </div>
              </div>
            )}
            
            {selectedReport.status !== 'PENDING' && (
              <div className={`p-4 rounded-xl font-bold flex flex-col gap-2 ${selectedReport.status === 'APPROVED' ? 'bg-green-500/10 border border-green-500/20 text-green-500' : 'bg-red-500/10 border border-red-500/20 text-red-500'}`}>
                <div>حالة التقرير: {selectedReport.status === 'APPROVED' ? 'تم الاعتماد' : 'مرفوض'}</div>
                {selectedReport.managerNotes && <div className="text-sm font-normal text-white">ملاحظات المدير: {selectedReport.managerNotes}</div>}
                <div className="text-xs opacity-70">بواسطة: {selectedReport.approvedBy}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
