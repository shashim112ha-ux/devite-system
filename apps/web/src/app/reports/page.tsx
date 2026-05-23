"use client";

import { useState } from "react";
import { trpc } from "../utils/trpc";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { 
  FileText, 
  Printer,
  Download,
  Calendar,
  BarChart3,
  TrendingUp
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useRef } from "react";
import { MessageCircle } from "lucide-react";

export default function ReportsPage() {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly'>('daily');
  const reportQuery = trpc.getReportData.useQuery({ period });
  const printRef = useRef<HTMLDivElement>(null);

  const exportToCSV = () => {
    if (!reportQuery.data) return;
    const headers = "الفترة,المبيعات\n";
    const csvData = reportQuery.data.map(r => `"${r.name}",${r.sales}`).join("\n");
    const blob = new Blob(["\uFEFF" + headers + csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `report_${period}.csv`;
    link.click();
  };

  const sendToWhatsApp = () => {
    if (!reportQuery.data) return;
    
    const sales = reportQuery.data.reduce((sum, r) => sum + r.sales, 0);
    const date = new Date().toLocaleDateString('ar-SA');
    
    let text = `📊 *تقرير DEVITE (${period === 'daily' ? 'يومي' : period === 'weekly' ? 'أسبوعي' : period === 'monthly' ? 'شهري' : 'ربع سنوي'})*\n`;
    text += `التاريخ: ${date}\n\n`;
    text += `إجمالي المبيعات: ${sales.toFixed(3)} د.ب\n`;
    text += `\nالتفاصيل:\n`;
    reportQuery.data.forEach(r => {
      text += `- ${r.name}: ${r.sales.toFixed(3)} د.ب\n`;
    });
    
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
    pdf.save(`Devite_Report_${period}.pdf`);
  };

  return (
    <div className="min-h-screen bg-brand-black p-10 print:bg-white print:p-0">
      <header className="flex justify-between items-center mb-12 print:mb-6 print:border-b print:pb-4">
        <div>
          <h1 className="text-4xl font-black text-brand-gold print:text-black flex items-center gap-3">
            <BarChart3 /> تقارير وإحصاءات
          </h1>
          <p className="text-gray-500 mt-2 print:text-gray-700">تحليل المبيعات والأداء المالي</p>
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
          {['daily', 'weekly', 'monthly', 'quarterly'].map((p) => (
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
          <div className="h-64 flex items-center justify-center text-brand-orange animate-pulse">جاري جلب بيانات التقرير...</div>
        ) : !reportQuery.data || reportQuery.data.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-500">لا توجد بيانات لهذه الفترة</div>
        ) : (
          <div className="space-y-8">
            
            {/* Main Chart */}
            <div className="bg-brand-navy-light/40 p-8 rounded-[40px] border border-white/5 print:border-none print:p-0">
              <h3 className="text-2xl font-bold mb-8 flex items-center gap-3">
                <TrendingUp className="text-brand-orange" />
                تحليل المبيعات ({period === 'daily' ? 'يومي' : period === 'weekly' ? 'أسبوعي' : period === 'monthly' ? 'شهري' : 'ربع سنوي'})
              </h3>
              
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportQuery.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="name" stroke="#888" tick={{ fill: '#888' }} />
                    <YAxis stroke="#888" tick={{ fill: '#888' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0a192f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '15px' }}
                      itemStyle={{ color: '#ff8c00', fontWeight: 'bold' }}
                    />
                    <Legend />
                    <Bar dataKey="sales" name="المبيعات (د.ب)" fill="#ff8c00" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Trend Line Chart */}
            <div className="bg-brand-navy-light/40 p-8 rounded-[40px] border border-white/5 print:border-none print:p-0">
              <h3 className="text-2xl font-bold mb-8 flex items-center gap-3">
                <TrendingUp className="text-brand-gold" />
                مؤشر النمو التدريجي
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={reportQuery.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="name" stroke="#888" />
                    <YAxis stroke="#888" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0a192f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '15px' }}
                    />
                    <Line type="monotone" dataKey="sales" name="نمو المبيعات" stroke="#d4af37" strokeWidth={4} dot={{ r: 6, fill: '#d4af37' }} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
