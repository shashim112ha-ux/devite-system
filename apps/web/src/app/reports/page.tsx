"use client";

import { useState, useEffect, useRef } from "react";
import { trpc } from "../../utils/trpc";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  Printer, Download, BarChart3, TrendingUp, DollarSign, CreditCard, 
  Wallet, AlertTriangle, PackageOpen, PieChart, Activity
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { MessageCircle } from "lucide-react";

export default function ReportsPage() {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly'>('daily');
  const [userRole, setUserRole] = useState("ADMIN");

  useEffect(() => {
    if (typeof window !== 'undefined') {
       const storedRole = localStorage.getItem('userRole');
       if (storedRole) {
          setUserRole(storedRole);
          if (storedRole === 'INVESTOR' || storedRole === 'INVESTOR_STAFF') {
             setPeriod('monthly');
          }
       }
    }
  }, []);

  const reportQuery = trpc.getReportData.useQuery({ period });
  const printRef = useRef<HTMLDivElement>(null);

  const data = reportQuery.data;

  const exportToCSV = () => {
    if (!data) return;
    const headers = "التاريخ,المبيعات,المصروفات,الصافي\n";
    const csvData = data.chartData.map((r: any) => `"${r.name}",${r.sales},${r.expenses},${r.profit}`).join("\n");
    const blob = new Blob(["\uFEFF" + headers + csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dashboard_${period}.csv`;
    link.click();
  };

  const sendToWhatsApp = () => {
    if (!data) return;
    
    const date = new Date().toLocaleDateString('ar-SA');
    
    let text = `📊 *تقرير DEVITE (${period === 'daily' ? 'يومي' : period === 'weekly' ? 'أسبوعي' : period === 'monthly' ? 'شهري' : 'ربع سنوي'})*\n`;
    text += `التاريخ: ${date}\n\n`;
    text += `💰 إجمالي المبيعات: ${data.stats.sales.toFixed(3)} د.ب\n`;
    text += `📉 المصروفات: ${data.stats.expenses.toFixed(3)} د.ب\n`;
    text += `💎 الصافي: ${data.stats.net.toFixed(3)} د.ب\n\n`;
    text += `طرق الدفع:\n`;
    text += `- كاش: ${data.stats.cash.toFixed(3)} د.ب\n`;
    text += `- بطاقة: ${data.stats.card.toFixed(3)} د.ب\n`;
    text += `- بنفت: ${data.stats.benefit.toFixed(3)} د.ب\n`;
    text += `- أونلاين: ${data.stats.online.toFixed(3)} د.ب\n`;
    
    if (data.lowStock.length > 0) {
      text += `\n⚠️ تنبيه المخزون:\n`;
      data.lowStock.forEach((i: any) => {
        text += `- ${i.name} (${i.quantity} ${i.unit})\n`;
      });
    }

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const exportToPDF = async () => {
    if (!printRef.current) return;
    const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Devite_Dashboard_${period}.pdf`);
  };

  return (
    <div className="min-h-screen bg-brand-black p-10 print:bg-white print:p-0">
      <header className="flex justify-between items-center mb-12 print:mb-6 print:border-b print:pb-4">
        <div>
          <h1 className="text-4xl font-black text-brand-gold print:text-black flex items-center gap-3">
            <BarChart3 /> لوحة التحكم المتقدمة (Dashboard)
          </h1>
          <p className="text-gray-500 mt-2 print:text-gray-700">تحليل شامل للمبيعات والمصروفات والأرباح والمخزون</p>
        </div>
        <div className="flex gap-4 print:hidden">
          <button onClick={exportToCSV} className="bg-brand-navy-light px-6 py-3 rounded-2xl font-bold flex items-center gap-2 border border-white/5 hover:bg-white/10 transition-all text-sm">
            <Download size={18} /> CSV
          </button>
          <button onClick={exportToPDF} className="bg-gradient-to-r from-brand-orange to-brand-gold px-6 py-3 rounded-2xl font-bold text-black flex items-center gap-2 shadow-xl shadow-brand-orange/20 hover:scale-105 transition-transform text-sm">
            <Download size={18} /> PDF
          </button>
          <button onClick={sendToWhatsApp} className="bg-green-600 px-6 py-3 rounded-2xl font-bold text-white flex items-center gap-2 shadow-xl shadow-green-600/20 hover:scale-105 transition-transform text-sm">
            <MessageCircle size={18} /> واتساب
          </button>
          <button onClick={() => window.print()} className="bg-white/10 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-white/20 transition-all text-sm">
            <Printer size={18} /> طباعة
          </button>
        </div>
      </header>

      <div ref={printRef} className="print:text-black">
        <div className="flex gap-4 mb-8 print:hidden">
          {['daily', 'weekly', 'monthly', 'quarterly'].filter(p => {
             if ((userRole === 'INVESTOR' || userRole === 'INVESTOR_STAFF') && (p === 'daily' || p === 'weekly')) return false;
             return true;
          }).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p as any)}
              className={`px-6 py-2 rounded-xl font-bold text-sm transition-colors ${period === p ? 'bg-brand-orange text-black' : 'bg-brand-navy-light text-gray-400 hover:text-white border border-white/5'}`}
            >
              {p === 'daily' ? 'يومي' : p === 'weekly' ? 'أسبوعي' : p === 'monthly' ? 'شهري' : 'ربع سنوي'}
            </button>
          ))}
        </div>

        {reportQuery.isLoading ? (
          <div className="h-64 flex items-center justify-center text-brand-orange animate-pulse">جاري جلب البيانات...</div>
        ) : !data ? (
          <div className="h-64 flex items-center justify-center text-gray-500">لا توجد بيانات متاحة</div>
        ) : (
          <div className="space-y-8">
            
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               <div className="bg-brand-navy-light/60 p-6 rounded-3xl border border-white/5">
                  <div className="flex justify-between items-start mb-4">
                     <div className="w-12 h-12 rounded-2xl bg-brand-orange/20 text-brand-orange flex items-center justify-center"><Wallet size={24}/></div>
                     <span className="text-green-500 bg-green-500/10 px-2 py-1 rounded-lg text-xs font-bold">+{data.stats.margin.toFixed(1)}%</span>
                  </div>
                  <h4 className="text-gray-400 text-sm font-bold mb-1">إجمالي المبيعات</h4>
                  <div className="text-3xl font-black text-white">{data.stats.sales.toFixed(3)} د.ب</div>
               </div>

               <div className="bg-brand-navy-light/60 p-6 rounded-3xl border border-white/5">
                  <div className="flex justify-between items-start mb-4">
                     <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-500 flex items-center justify-center"><Activity size={24}/></div>
                  </div>
                  <h4 className="text-gray-400 text-sm font-bold mb-1">إجمالي المصروفات</h4>
                  <div className="text-3xl font-black text-white">{data.stats.expenses.toFixed(3)} د.ب</div>
               </div>

               <div className="bg-brand-navy-light/60 p-6 rounded-3xl border border-white/5">
                  <div className="flex justify-between items-start mb-4">
                     <div className="w-12 h-12 rounded-2xl bg-brand-gold/20 text-brand-gold flex items-center justify-center"><TrendingUp size={24}/></div>
                  </div>
                  <h4 className="text-gray-400 text-sm font-bold mb-1">صافي الأرباح (الفرق)</h4>
                  <div className="text-3xl font-black text-white">{data.stats.net.toFixed(3)} د.ب</div>
               </div>

               <div className="bg-brand-navy-light/60 p-6 rounded-3xl border border-white/5 space-y-3">
                  <h4 className="text-gray-400 text-sm font-bold mb-4 border-b border-white/10 pb-2">تفصيل المبيعات (طرق الدفع)</h4>
                  <div className="flex justify-between text-sm"><span className="text-gray-400 flex items-center gap-2"><DollarSign size={14}/> كاش</span> <span className="font-bold">{data.stats.cash.toFixed(3)} د.ب</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-400 flex items-center gap-2"><CreditCard size={14}/> بطاقة</span> <span className="font-bold">{data.stats.card.toFixed(3)} د.ب</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-400 flex items-center gap-2"><PieChart size={14}/> بنفت</span> <span className="font-bold">{data.stats.benefit.toFixed(3)} د.ب</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-400 flex items-center gap-2"><Activity size={14}/> أونلاين</span> <span className="font-bold">{data.stats.online.toFixed(3)} د.ب</span></div>
               </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <div className="bg-brand-navy-light/40 p-8 rounded-[40px] border border-white/5 print:border-none print:p-0">
                 <h3 className="text-2xl font-bold mb-8 flex items-center gap-3">
                   <TrendingUp className="text-brand-orange" />
                   تحليل المبيعات والمصروفات
                 </h3>
                 <div className="h-[300px] w-full">
                   <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={data.chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                       <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                       <XAxis dataKey="name" stroke="#888" tick={{ fill: '#888', fontSize: 12 }} />
                       <YAxis stroke="#888" tick={{ fill: '#888', fontSize: 12 }} />
                       <Tooltip contentStyle={{ backgroundColor: '#0a192f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '15px' }} />
                       <Legend />
                       <Bar dataKey="sales" name="المبيعات" fill="#ff8c00" radius={[4, 4, 0, 0]} />
                       <Bar dataKey="expenses" name="المصروفات" fill="#e11d48" radius={[4, 4, 0, 0]} />
                     </BarChart>
                   </ResponsiveContainer>
                 </div>
               </div>

               <div className="bg-brand-navy-light/40 p-8 rounded-[40px] border border-white/5 print:border-none print:p-0">
                 <h3 className="text-2xl font-bold mb-8 flex items-center gap-3">
                   <Activity className="text-brand-gold" />
                   مؤشر صافي الأرباح
                 </h3>
                 <div className="h-[300px] w-full">
                   <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={data.chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                       <defs>
                         <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#d4af37" stopOpacity={0.8}/>
                           <stop offset="95%" stopColor="#d4af37" stopOpacity={0}/>
                         </linearGradient>
                       </defs>
                       <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                       <XAxis dataKey="name" stroke="#888" tick={{ fontSize: 12 }} />
                       <YAxis stroke="#888" tick={{ fontSize: 12 }} />
                       <Tooltip contentStyle={{ backgroundColor: '#0a192f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '15px' }} />
                       <Legend />
                       <Area type="monotone" dataKey="profit" name="صافي الربح" stroke="#d4af37" fillOpacity={1} fill="url(#colorProfit)" />
                     </AreaChart>
                   </ResponsiveContainer>
                 </div>
               </div>
            </div>

            {/* Low Stock Section */}
            {data.lowStock && data.lowStock.length > 0 && (
               <div className="bg-red-500/10 p-8 rounded-[40px] border border-red-500/20">
                 <h3 className="text-2xl font-bold mb-6 flex items-center gap-3 text-red-500">
                   <AlertTriangle />
                   تنبيهات المخزون (أوشك على النفاد)
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {data.lowStock.map((item: any) => (
                       <div key={item.id} className="bg-brand-navy-light p-4 rounded-2xl border border-red-500/30 flex items-center gap-4">
                          <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center text-red-500">
                             <PackageOpen size={20} />
                          </div>
                          <div>
                             <h4 className="font-bold text-sm text-white">{item.name}</h4>
                             <p className="text-red-400 font-bold text-lg mt-1">{item.quantity} <span className="text-xs font-normal text-gray-500">{item.unit}</span></p>
                          </div>
                       </div>
                    ))}
                 </div>
               </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
