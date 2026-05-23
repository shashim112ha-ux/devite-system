"use client";

import { useEffect, useState } from "react";
import { trpc } from "../utils/trpc";
import { 
  Clock, 
  CheckCircle2, 
  ChefHat, 
  Bell, 
  AlertCircle,
  Timer,
  ChevronRight,
  Flame
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { io } from "socket.io-client";

// Sound synthesizer beep using Web Audio API
function playBeep() {
  try {
    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Play double beep
    const playTone = (time: number, freq: number, duration: number) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      
      oscillator.type = "sine";
      oscillator.frequency.value = freq;
      
      gain.gain.setValueAtTime(0.5, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + duration);
      
      oscillator.connect(gain);
      gain.connect(context.destination);
      
      oscillator.start(time);
      oscillator.stop(time + duration);
    };

    playTone(context.currentTime, 880, 0.15); // A5 note
    playTone(context.currentTime + 0.2, 880, 0.15);
  } catch (e) {
    console.error("Audio Context failed:", e);
  }
}

export default function ProfessionalKitchen() {
  const ordersQuery = trpc.getKitchenOrders.useQuery(undefined, {
    // Fallback polling just in case socket disconnects
    refetchInterval: 10000,
  });
  const settingsQuery = trpc.getSystemSettings.useQuery();
  const updateStatusMutation = trpc.updateOrderStatus.useMutation();

  // Socket.io listener for real-time updates
  useEffect(() => {
    const socket = io("http://127.0.0.1:4000");

    socket.on("order_created", (newOrder) => {
      ordersQuery.refetch();
      playBeep();
    });

    socket.on("order_status_updated", () => {
      ordersQuery.refetch();
    });

    return () => {
      socket.disconnect();
    };
  }, [ordersQuery]);

  const handleStatusUpdate = async (order: any) => {
    const currentStatus = order.status;
    let nextStatus = 'PREPARING';
    if (currentStatus === 'PREPARING') nextStatus = 'READY';
    if (currentStatus === 'READY') nextStatus = 'DELIVERED';
    
    await updateStatusMutation.mutateAsync({ orderId: order.id, status: nextStatus });
    
    // WhatsApp interactive link for READY status
    if (nextStatus === 'READY' && order.customer?.phone && settingsQuery.data?.whatsappEnabled) {
      const phone = order.customer.phone;
      const formattedPhone = phone.startsWith('+') ? phone.substring(1) : (phone.startsWith('00') ? phone.substring(2) : `973${phone}`);
      let msg = settingsQuery.data?.whatsappReadyMsg || `مرحباً ${order.customer.name || 'عميلنا العزيز'}،\n\nنود إعلامك أن طلبك رقم #${order.id.slice(-4)} جاهز الآن للاستلام! 🎉\n\nبانتظارك ☕️`;
      msg = msg.replace('{{orderNumber}}', `#${order.id.slice(-4)}`);
      const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank');
    }
    
    ordersQuery.refetch();
  };

  return (
    <div className="min-h-screen bg-brand-black flex flex-col font-sans">
      <header className="p-8 bg-brand-navy border-b border-white/5 flex justify-between items-center print:hidden">
        <div className="flex items-center gap-4">
           <div className="bg-brand-orange p-3 rounded-2xl text-black"><ChefHat size={24} /></div>
           <div>
              <h1 className="text-2xl font-black text-brand-gold">شاشة المطبخ الاحترافية</h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">تحكم وتوجيه الطلبات حياً بالوقت الحقيقي</p>
           </div>
        </div>
        <div className="flex gap-4">
           <div className="bg-brand-navy-light px-6 py-3 rounded-2xl border border-white/5 flex items-center gap-3">
              <Bell className="text-brand-orange animate-pulse" size={18} />
              <span className="text-xs font-bold">الطلبات النشطة: {ordersQuery.data?.length || 0}</span>
           </div>
        </div>
      </header>

      <main className="flex-1 p-10 grid grid-cols-1 md:grid-cols-3 gap-8 overflow-y-auto">
        
        {/* NEW Orders */}
        <div className="flex flex-col gap-6">
          <h2 className="text-xl font-black text-brand-orange flex items-center gap-2 border-b border-brand-orange/20 pb-4">
            <Flame size={20} /> الطلبات الجديدة ({ordersQuery.data?.filter(o => o.status === 'NEW').length || 0})
          </h2>
          <div className="space-y-6 flex-1 overflow-y-auto max-h-[70vh] pr-1">
            <AnimatePresence>
              {ordersQuery.data?.filter(o => o.status === 'NEW').map((order) => (
                <KitchenOrderCard key={order.id} order={order} onUpdate={() => handleStatusUpdate(order)} />
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* PREPARING Orders */}
        <div className="flex flex-col gap-6">
          <h2 className="text-xl font-black text-brand-gold flex items-center gap-2 border-b border-brand-gold/20 pb-4">
            <Timer size={20} /> قيد التحضير ({ordersQuery.data?.filter(o => o.status === 'PREPARING').length || 0})
          </h2>
          <div className="space-y-6 flex-1 overflow-y-auto max-h-[70vh] pr-1">
            <AnimatePresence>
              {ordersQuery.data?.filter(o => o.status === 'PREPARING').map((order) => (
                <KitchenOrderCard key={order.id} order={order} onUpdate={() => handleStatusUpdate(order)} />
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* READY Orders */}
        <div className="flex flex-col gap-6">
          <h2 className="text-xl font-black text-green-500 flex items-center gap-2 border-b border-green-500/20 pb-4">
            <CheckCircle2 size={20} /> طلبات جاهزة ({ordersQuery.data?.filter(o => o.status === 'READY').length || 0})
          </h2>
          <div className="space-y-6 flex-1 overflow-y-auto max-h-[70vh] pr-1">
            <AnimatePresence>
              {ordersQuery.data?.filter(o => o.status === 'READY').map((order) => (
                <KitchenOrderCard key={order.id} order={order} onUpdate={() => handleStatusUpdate(order)} />
              ))}
            </AnimatePresence>
          </div>
        </div>

      </main>
    </div>
  );
}

function KitchenOrderCard({ order, onUpdate }: any) {
  const [elapsed, setElapsed] = useState(0);
  
  useEffect(() => {
    setElapsed(Math.floor((Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60)));
    const timer = setInterval(() => {
      const diff = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60));
      setElapsed(diff);
    }, 10000);
    return () => clearInterval(timer);
  }, [order.createdAt]);

  const isLate = elapsed >= order.estimatedTime;

  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      className={`bg-brand-navy-light rounded-[32px] overflow-hidden border-2 flex flex-col ${isLate ? 'border-red-500 shadow-2xl shadow-red-500/10' : 'border-white/5'}`}
    >
      <div className={`p-5 flex justify-between items-center ${isLate ? 'bg-red-500/10' : 'bg-white/5'}`}>
         <div className="flex items-center gap-3 flex-wrap">
            <span className="text-2xl font-black text-brand-gold">#{order.orderNumber}</span>
            {isLate && <Flame size={18} className="text-red-500 animate-pulse" />}
            {order.isVIP && <span className="bg-purple-500/20 text-purple-400 text-[10px] font-bold px-2 py-1 rounded border border-purple-500/30">VIP 🌟</span>}
            {order.isUrgent && <span className="bg-orange-500/20 text-orange-400 text-[10px] font-bold px-2 py-1 rounded border border-orange-500/30">عاجل 🚨</span>}
         </div>
         <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 shrink-0">
            <Clock size={12} />
            <span>{new Date(order.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
         </div>
      </div>

      <div className="p-6 flex-1">
         <div className="mb-4">
            <p className="text-[10px] text-brand-gold uppercase tracking-widest mb-3 font-bold">الأصناف المطلوبة</p>
            <div className="space-y-3">
               {order.items.map((item: any, idx: number) => (
                 <div key={idx} className="flex justify-between items-start border-b border-white/5 pb-2 last:border-0 last:pb-0">
                    <div>
                       <p className="font-bold text-base text-white">{item.quantity}x {item.product.name}</p>
                       <p className="text-[10px] text-gray-400 mt-1">
                          {item.size || "وسط"} • سكر {item.sugar || "50%"} • ثلج {item.ice || "عادي"}
                       </p>
                       {item.notes && <p className="text-[10px] text-brand-orange font-bold mt-1">📝 {item.notes}</p>}
                    </div>
                 </div>
               ))}
            </div>
         </div>

         {order.notes && (
           <div className="bg-brand-orange/10 p-3 rounded-xl flex gap-2 items-start border border-brand-orange/20 mt-4">
              <AlertCircle size={14} className="text-brand-orange mt-0.5" />
              <p className="text-[10px] text-brand-orange font-bold leading-relaxed">{order.notes}</p>
           </div>
         )}
      </div>

      <div className="p-5 bg-brand-black/40 border-t border-white/5 space-y-4">
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/5">
          <div className="text-xs text-gray-500 flex items-center gap-1">
             <Clock size={12} /> {(order.prepTime || 10)} دقيقة
          </div>
          <button 
            onClick={onUpdate}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
              order.status === 'NEW' ? 'bg-brand-orange text-black shadow-lg shadow-brand-orange/20' :
              order.status === 'PREPARING' ? 'bg-green-500 text-black shadow-lg shadow-green-500/20' :
              'bg-brand-navy-light text-white'
            }`}
          >
            {order.status === 'NEW' ? 'بدء التحضير' : order.status === 'PREPARING' ? 'جاهز للتسليم' : 'تم التسليم'} <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
