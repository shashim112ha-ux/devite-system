"use client";

import { useState } from "react";
import { trpc } from "../../utils/trpc";
import { 
  TrendingUp, Calendar, FileText, Loader2, AlertCircle, ShoppingCart, DollarSign, CreditCard, Activity, PieChart 
} from "lucide-react";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

const COLORS = ["#FF6B6B", "#4D96FF", "#6BCB77", "#FFD93D", "#9B5DE5", "#F15BB5", "#00F5D4", "#7F8C8D"];

export default function SalesPage() {
  const [filterType, setFilterType] = useState('daily');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const userRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;
  const isAdminOrManager = userRole === 'ADMIN' || userRole === 'MANAGER';

  const queryParams = { filterType, ...(filterType === 'custom' ? { startDate, endDate } : {}) };
  
  const { data: salesList, isLoading: loadingSales } = trpc.getDetailedSalesLog.useQuery(queryParams);
  const { data: analytics, isLoading: loadingAnalytics } = trpc.getSalesAnalytics.useQuery(queryParams);

  return (
    <div className="p-8 space-y-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-black text-brand-gold">سجل المبيعات والتقارير</h1>
          <p className="text-gray-400 text-sm mt-1">
            متابعة دقيقة لكل طلب مباع وتحليل أرباح الأصناف
          </p>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-brand-navy-light/40 border border-white/5 rounded-2xl p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-brand-orange"><Calendar size={20} /> تصفية السجل</h3>
        <div className="flex flex-wrap gap-4 items-center">
          {['daily', 'weekly', 'monthly', 'all', 'custom'].map(type => (
            <button 
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${filterType === type ? 'bg-brand-gold text-black' : 'bg-brand-black border border-white/10 text-gray-400 hover:text-white'}`}
            >
              {type === 'daily' ? 'اليوم' : type === 'weekly' ? 'هذا الأسبوع' : type === 'monthly' ? 'هذا الشهر' : type === 'all' ? 'الكل' : 'مخصص'}
            </button>
          ))}
          {filterType === 'custom' && (
            <div className="flex items-center gap-3">
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-brand-black border border-white/10 text-sm p-2 rounded-xl text-white" />
              <span className="text-gray-500">إلى</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-brand-black border border-white/10 text-sm p-2 rounded-xl text-white" />
            </div>
          )}
        </div>
      </div>

      {/* Analytics Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Total Sales & Profit */}
        <div className="space-y-6">
          <div className="bg-brand-navy-light/60 p-6 rounded-[30px] border border-white/5 shadow-lg flex flex-col justify-center items-center text-center h-[160px]">
             <div className="w-12 h-12 bg-brand-gold/20 text-brand-gold rounded-full flex items-center justify-center mb-3">
                <DollarSign size={24} />
             </div>
             <p className="text-sm text-gray-400 font-bold mb-1">إجمالي المبيعات ({filterType === 'all' ? 'الكل' : 'للفترة المحددة'})</p>
             <h2 className="text-3xl font-black text-white">{analytics?.totalSales ? analytics.totalSales.toFixed(3) : "0.000"} د.ب</h2>
          </div>

          <div className="bg-brand-navy-light/60 p-6 rounded-[30px] border border-white/5 shadow-lg flex flex-col justify-center items-center text-center h-[160px]">
             <div className="w-12 h-12 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-3">
                <TrendingUp size={24} />
             </div>
             <p className="text-sm text-gray-400 font-bold mb-1">صافي الربح التقديري للأصناف</p>
             <h2 className="text-3xl font-black text-white">{analytics?.totalProfit ? analytics.totalProfit.toFixed(3) : "0.000"} د.ب</h2>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-brand-navy-light/40 p-6 rounded-[30px] border border-white/5 lg:col-span-2 shadow-lg flex flex-col">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <ShoppingCart size={20} className="text-brand-gold" />
            تقرير أرباح الأصناف ومبيعاتها (الأكثر مبيعاً)
          </h3>
          <div className="flex-1 min-h-[250px] overflow-y-auto pr-2 space-y-3">
            {loadingAnalytics ? (
              <div className="h-full flex items-center justify-center text-brand-gold animate-pulse">جاري التحليل...</div>
            ) : analytics && analytics.topProducts.length > 0 ? (
              analytics.topProducts.map((p: any, idx: number) => (
                <div key={p.name} className="flex items-center justify-between bg-white/5 p-4 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <span className="w-8 h-8 rounded-full bg-brand-black flex items-center justify-center font-bold text-gray-400 text-xs">{idx + 1}</span>
                    <div>
                      <p className="font-bold text-white">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.count} عنصر مباع</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-brand-gold">{p.sales.toFixed(3)} د.ب</p>
                    <p className="text-xs text-green-500">الربح: {p.profit.toFixed(3)} د.ب</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">لا توجد مبيعات في هذه الفترة</div>
            )}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-brand-navy border border-white/5 rounded-[30px] overflow-hidden shadow-xl">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-brand-navy-light/30">
          <h2 className="text-xl font-bold flex items-center gap-3">
            <FileText className="text-brand-gold" /> سجل الطلبات المفصل
          </h2>
          <span className="bg-white/5 px-4 py-2 rounded-lg text-sm text-gray-400 font-bold tracking-widest">{analytics?.count || 0} طلب مسجل</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-brand-black/40 text-gray-400 text-xs tracking-wider border-b border-white/5">
              <tr>
                <th className="p-4 pl-0 font-medium whitespace-nowrap">التاريخ ورقم الطلب</th>
                <th className="p-4 font-medium">الأصناف والتفاصيل</th>
                <th className="p-4 font-medium">العميل</th>
                <th className="p-4 font-medium">طريقة الدفع</th>
                <th className="p-4 font-bold text-brand-gold">الإجمالي</th>
                <th className="p-4 font-medium">الكاشير</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {loadingSales ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-brand-gold animate-pulse">جاري جلب السجلات...</td>
                </tr>
              ) : !salesList || salesList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-500">
                    <FileText size={48} className="mx-auto mb-4 opacity-20" />
                    لا توجد طلبات مسجلة لهذه الفترة
                  </td>
                </tr>
              ) : (
                salesList.map((order: any) => (
                  <tr key={order.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-4 pl-0 whitespace-nowrap">
                      <div className="text-white font-medium">{new Date(order.createdAt).toLocaleDateString('ar-SA')}</div>
                      <div className="text-[10px] text-gray-500">{new Date(order.createdAt).toLocaleTimeString('ar-SA')}</div>
                      <div className="text-[10px] text-brand-orange mt-1">#{order.orderNumber}</div>
                    </td>
                    <td className="p-4 min-w-[200px]">
                      <div className="space-y-1">
                        {order.items.map((item: any, i: number) => (
                          <div key={i} className="text-xs flex items-center justify-between bg-white/5 p-1 rounded px-2">
                            <span className="text-gray-300">{item.product.name} x{item.quantity}</span>
                            <span className="text-brand-gold">{(item.price * item.quantity).toFixed(3)} د.ب</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-gray-300">{order.customerName || "عميل عام"}</div>
                    </td>
                    <td className="p-4">
                      <span className="bg-white/5 text-gray-300 px-3 py-1 rounded-md text-xs border border-white/5 flex items-center gap-1 w-max">
                        {order.paymentMethod === 'CASH' && <DollarSign size={12} className="text-green-400" />}
                        {order.paymentMethod === 'CARD' && <CreditCard size={12} className="text-blue-400" />}
                        {order.paymentMethod === 'BENEFIT' && <Activity size={12} className="text-red-400" />}
                        {order.paymentMethod === 'ONLINE' && <Activity size={12} className="text-purple-400" />}
                        {order.paymentMethod}
                      </span>
                    </td>
                    <td className="p-4 font-black text-brand-gold text-base whitespace-nowrap">
                      {order.total.toFixed(3)} د.ب
                    </td>
                    <td className="p-4">
                      <div className="text-gray-300 text-xs">👤 {order.cashierName || 'النظام'}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
