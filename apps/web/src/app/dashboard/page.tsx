"use client";

import { useEffect, useState } from "react";
import { trpc } from "../utils/trpc";
import { 
  TrendingUp, 
  ShoppingCart, 
  Clock, 
  Activity,
  Zap,
  BarChart3,
  DollarSign,
  AlertTriangle,
  Info,
  Calendar,
  Wallet,
  TrendingDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { io } from "socket.io-client";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

export default function AdminDashboard() {
  const statsQuery = trpc.getAdvancedStats.useQuery(undefined, {
    refetchInterval: 10000,
  });

  const reportQuery = trpc.getReportData.useQuery({ period: 'daily' });

  const [notifications, setNotifications] = useState<any[]>([
    { id: '1', type: 'info', message: "النظام متصل وبانتظار العمليات الحية.", time: new Date() }
  ]);

  // WebSocket Live alerts listener
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace('/trpc', '') : (typeof window !== "undefined" ? `http://${window.location.hostname}:4000` : "http://127.0.0.1:4000");
    const socket = io(socketUrl);

    socket.on("low_stock_warning", (data) => {
      setNotifications(prev => [
        {
          id: String(Date.now() + Math.random()),
          type: 'warning',
          message: `انخفاض المخزون: المادة (${data.name}) المتبقي: ${data.quantity} ${data.unit}`,
          time: new Date()
        },
        ...prev
      ]);
      statsQuery.refetch();
    });

    socket.on("attendance_event", (data) => {
      setNotifications(prev => [
        {
          id: String(Date.now() + Math.random()),
          type: 'info',
          message: `حضور وموظفين: تم تسجيل ${data.type === 'CHECK_IN' ? 'حضور' : 'انصراف'} للموظف`,
          time: new Date()
        },
        ...prev
      ]);
    });

    socket.on("order_created", (order) => {
      setNotifications(prev => [
        {
          id: String(Date.now() + Math.random()),
          type: 'info',
          message: `طلب جديد: تم استلام الطلب #${order.orderNumber} بقيمة ${order.total} د.ب`,
          time: new Date()
        },
        ...prev
      ]);
      statsQuery.refetch();
      reportQuery.refetch();
    });

    socket.on("order_status_updated", (order) => {
      setNotifications(prev => [
        {
          id: String(Date.now() + Math.random()),
          type: 'info',
          message: `تحديث طلب: الطلب #${order.orderNumber} أصبح بحالة ${order.status}`,
          time: new Date()
        },
        ...prev
      ]);
      statsQuery.refetch();
    });

    return () => {
      socket.disconnect();
    };
  }, [statsQuery, reportQuery]);

  if (statsQuery.isLoading) {
    return (
      <div className="min-h-screen bg-brand-black flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-brand-gold border-t-transparent rounded-full animate-spin"></div>
        <p className="text-brand-gold font-bold">جاري تحميل لوحة التحكم...</p>
      </div>
    );
  }

  if (statsQuery.error) {
    return (
      <div className="min-h-screen bg-brand-black flex flex-col items-center justify-center p-10 text-center">
        <h2 className="text-2xl font-black text-red-500 mb-4">فشل جلب البيانات</h2>
        <p className="text-gray-400 text-sm">{statsQuery.error.message}</p>
      </div>
    );
  }

  const data = statsQuery.data;

  return (
    <div className="min-h-screen bg-brand-black p-10 font-sans">
      <header className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-black text-brand-gold">لوحة التحكم الإدارية</h1>
          <p className="text-gray-500 mt-2">متابعة الأداء المالي والتشغيلي بالوقت الحقيقي</p>
        </div>
        <div className="flex gap-4">
           <div className="bg-brand-navy-light px-6 py-3 rounded-2xl border border-white/5 flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-bold">النظام متصل</span>
           </div>
        </div>
      </header>

      {/* Live Financial Stats Row - Answering Manager's Key Questions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <KPIBox title="كم يوجد مال حاليًا؟ (إجمالي الأرصدة)" value={`${(data?.totalBalance || 0).toFixed(2)} د.ب`} icon={<Wallet />} color="blue" />
        <KPIBox title="كم بعنا اليوم؟ (إجمالي المبيعات)" value={`${(data?.sales || 0).toFixed(2)} د.ب`} icon={<DollarSign />} color="gold" />
        <KPIBox title="كم صرفنا اليوم؟ (إجمالي المصروفات)" value={`${(data?.totalExpenses || 0).toFixed(2)} د.ب`} icon={<TrendingDown />} color="orange" />
        <KPIBox title="هل نحن رابحون؟ (صافي الربح)" value={`${(data?.profit || 0).toFixed(2)} د.ب`} icon={<TrendingUp />} color={(data?.profit || 0) >= 0 ? "green" : "orange"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Performance Indicators */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-brand-navy-light/50 p-8 rounded-[40px] border border-white/5">
             <h3 className="text-xl font-bold mb-8 flex items-center gap-3"><Activity className="text-brand-orange" /> مؤشرات التشغيل الحالية</h3>
             <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <PerformanceCard title="عدد طلبات اليوم" value={data?.ordersCount || 0} icon="🛍️" />
                <PerformanceCard title="متوسط وقت التجهيز" value={`${data?.avgPrepTime || 0} د`} icon="⏱️" />
                <PerformanceCard title="طلبات قيد التحضير" value={data?.preparingCount || 0} icon="⏳" color="text-brand-orange" />
                <PerformanceCard title="طلبات جاهزة" value={data?.readyCount || 0} icon="✅" color="text-green-500" />
             </div>
          </div>

          {/* Recharts Analytics Chart */}
          <div className="bg-brand-navy-light/50 p-8 rounded-[40px] border border-white/5">
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-bold flex items-center gap-3"><BarChart3 className="text-brand-gold" /> مبيعات الأسبوع الأخير</h3>
               <span className="text-xs text-gray-500 flex items-center gap-1"><Calendar size={12} /> تحديث تلقائي</span>
             </div>
             
             <div className="h-[300px] w-full">
               {reportQuery.isLoading ? (
                 <div className="w-full h-full flex items-center justify-center text-brand-gold animate-pulse text-xs">جاري بناء الرسم البياني...</div>
               ) : (
                 <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={reportQuery.data?.chartData}>
                     <defs>
                       <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#ff8c00" stopOpacity={0.4}/>
                         <stop offset="95%" stopColor="#ff8c00" stopOpacity={0}/>
                       </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" />
                     <XAxis dataKey="name" stroke="#555" fontSize={10} tickLine={false} />
                     <YAxis stroke="#555" fontSize={10} tickLine={false} />
                     <Tooltip contentStyle={{ backgroundColor: '#0b1528', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '15px' }} />
                     <Area type="monotone" dataKey="sales" name="المبيعات (د.ب)" stroke="#ff8c00" fillOpacity={1} fill="url(#colorSales)" strokeWidth={2} />
                   </AreaChart>
                 </ResponsiveContainer>
               )}
             </div>
          </div>
        </div>

        {/* Live Alerts & Notifications */}
        <div className="space-y-8">
          <div className="bg-brand-navy-light/50 p-8 rounded-[40px] border border-white/5 flex flex-col h-[580px] overflow-hidden">
             <h3 className="text-xl font-bold mb-6 flex items-center gap-3"><Zap className="text-brand-gold" /> تنبيهات الإدارة الحية</h3>
             
             <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                <AnimatePresence>
                  {notifications.map((n) => (
                    <motion.div 
                      key={n.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <AlertItem type={n.type} message={n.message} time={n.time} />
                    </motion.div>
                  ))}
                </AnimatePresence>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function KPIBox({ title, value, icon, color, trend }: any) {
  const colors: any = {
    orange: "bg-brand-orange/10 text-brand-orange",
    gold: "bg-brand-gold/10 text-brand-gold",
    green: "bg-green-500/10 text-green-500",
    blue: "bg-blue-500/10 text-blue-500",
  };
  return (
    <motion.div whileHover={{ y: -5 }} className="bg-brand-navy-light p-8 rounded-[35px] border border-white/5">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl ${colors[color]}`}>{icon}</div>
        {trend && <span className="text-[10px] bg-white/5 px-2 py-1 rounded-lg text-green-500">{trend}</span>}
      </div>
      <p className="text-gray-500 text-xs mb-1 font-bold">{title}</p>
      <h3 className="text-2xl font-black">{value}</h3>
    </motion.div>
  );
}

function PerformanceCard({ title, value, icon, color = "text-white" }: any) {
  return (
    <div className="bg-brand-black/40 p-6 rounded-3xl border border-white/5">
      <div className="flex items-center gap-4">
        <span className="text-3xl">{icon}</span>
        <div>
           <p className="text-[10px] text-gray-500 mb-1">{title}</p>
           <p className={`font-black ${color}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function AlertItem({ type, message, time }: any) {
  const isWarning = type === 'warning';
  
  return (
    <div className={`flex items-start gap-3 p-4 bg-brand-black/30 rounded-2xl border-r-4 ${isWarning ? 'border-brand-orange' : 'border-blue-500'}`}>
      <div className="mt-0.5">
        {isWarning ? <AlertTriangle size={16} className="text-brand-orange" /> : <Info size={16} className="text-blue-500" />}
      </div>
      <div className="flex-1">
        <p className="text-xs text-gray-300 leading-relaxed">{message}</p>
        <span className="text-[9px] text-gray-600 block mt-1">
          {new Date(time).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>
    </div>
  );
}
