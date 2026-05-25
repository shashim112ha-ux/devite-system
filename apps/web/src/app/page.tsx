"use client";

import { useState } from "react";
import { trpc } from "./utils/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  X, 
  Star, 
  Clock, 
  Home as HomeIcon, 
  Grid, 
  Gift, 
  User,
  CheckCircle2,
  MessageSquare,
  Send
} from "lucide-react";
import { OfferSlider } from "../components/OfferSlider";
import Link from "next/link";

export default function CustomerHome() {
  const [phone, setPhone] = useState("");
  const [showPoints, setShowPoints] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [cart, setCart] = useState<any[]>([]);
  const [isCheckout, setIsCheckout] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [customerName, setCustomerName] = useState("");

  const productsQuery = trpc.getProducts.useQuery();
  const categoriesQuery = trpc.getCategories.useQuery();
  const offersQuery = trpc.getOffers.useQuery();
  const createOrderMutation = trpc.createOrder.useMutation();

  if (productsQuery.isLoading || categoriesQuery.isLoading) {
    return (
      <div className="min-h-screen bg-brand-black flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-brand-orange border-t-transparent rounded-full animate-spin"></div>
        <p className="text-brand-gold font-bold animate-pulse">جاري تحميل ديفايت...</p>
      </div>
    );
  }

  if (productsQuery.error || categoriesQuery.error) {
    return (
      <div className="min-h-screen bg-brand-black flex flex-col items-center justify-center p-10 text-center">
        <div className="bg-red-500/10 p-8 rounded-[40px] border border-red-500/20 max-w-md">
          <h2 className="text-2xl font-black text-red-500 mb-4">فشل الاتصال</h2>
          <p className="text-gray-400 text-sm mb-6">تعذر الاتصال بسيرفر النظام. يرجى التأكد من تشغيل السيرفر والمحاولة مرة أخرى.</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-red-500 text-white px-8 py-3 rounded-2xl font-bold"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  const addToCart = (product: any, options: any) => {
    setCart([...cart, { ...product, ...options, quantity: 1 }]);
    setSelectedProduct(null);
  };

  const total = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

  const handleFinalOrder = async () => {
    if (!phone || !customerName) {
      alert("يرجى إدخال الاسم ورقم الهاتف");
      return;
    }
    try {
      const order = await createOrderMutation.mutateAsync({
        customerPhone: phone,
        customerName: customerName,
        items: cart.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          price: Number(item.price),
          size: item.size,
          sugar: item.sugar,
          ice: item.ice,
          notes: item.notes
        })),
        paymentMethod: 'CASH',
        total: total,
      });
      alert(`تم اعتماد طلبك بنجاح! رقم الطلب: #${order.orderNumber}. الوقت المتوقع: ${order.estimatedTime} دقيقة`);
      setCart([]);
      setIsCheckout(false);
    } catch (error) {
      alert("حدث خطأ في معالجة الطلب");
    }
  };

  return (
    <div className="min-h-screen bg-brand-black text-white pb-24">
      {/* Header & Logo */}
      <header className="p-8 flex justify-between items-center bg-gradient-to-b from-brand-navy-light/30 to-transparent">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Devite Logo" className="w-12 h-12 rounded-full shadow-lg shadow-black/50" />
          <div>
            <h1 className="text-3xl font-black text-brand-orange tracking-tighter">DEVITE</h1>
            <p className="text-[8px] tracking-[0.4em] text-brand-gold uppercase font-bold mt-1">Luxury Cart System</p>
          </div>
        </div>
        <div className="flex gap-4">
           <button onClick={() => setShowPoints(true)} className="bg-brand-navy p-3 rounded-2xl border border-white/5 relative">
              <Gift size={20} className="text-brand-gold" />
           </button>
           <div className="bg-brand-orange p-3 rounded-2xl relative shadow-lg shadow-brand-orange/20">
              <ShoppingCart size={20} />
              {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-white text-brand-orange text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{cart.length}</span>}
           </div>
        </div>
      </header>

      <main className="px-6">
        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="ماذا تود أن تطلب اليوم؟" 
            className="w-full bg-brand-navy-light/50 border border-white/5 rounded-3xl py-4 pr-12 pl-6 focus:outline-none focus:border-brand-orange text-sm"
          />
        </div>

        {/* Offers Slider */}
        <OfferSlider offers={offersQuery.data || []} />

        {/* Categories */}
        <div className="flex gap-4 overflow-x-auto pb-6 no-scrollbar">
          <CategoryBtn label="الكل" active />
          {categoriesQuery.data?.map(cat => (
            <CategoryBtn key={cat.id} label={cat.name} />
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 gap-4">
          {productsQuery.data?.map((product) => (
            <motion.div 
              key={product.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedProduct(product)}
              className="bg-brand-navy-light/40 rounded-[35px] p-5 border border-white/5 flex flex-col items-center text-center relative overflow-hidden"
            >
              <div className="w-full aspect-square bg-brand-black rounded-3xl mb-4 flex items-center justify-center text-4xl">
                 🍹
              </div>
              <h3 className="font-bold text-sm mb-1">{product.name}</h3>
              <p className="text-brand-gold text-xs font-black">{product.price} د.ب</p>
              <button className="mt-4 bg-brand-orange p-2 rounded-xl">
                <Plus size={16} />
              </button>
            </motion.div>
          ))}
        </div>

        {/* Feedback Section */}
        <div className="mt-16 bg-brand-navy rounded-[40px] p-8 border border-white/5">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-brand-orange p-3 rounded-2xl">
              <MessageSquare className="text-black" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-brand-gold">رأيك يهمنا</h2>
              <p className="text-sm text-gray-400 mt-1">نسعى دائماً لتقديم الأفضل لك</p>
            </div>
          </div>
          <FeedbackForm />
        </div>
      </main>

      {/* Product Details Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <ProductDetailsModal 
            product={selectedProduct} 
            onClose={() => setSelectedProduct(null)} 
            onAdd={addToCart}
          />
        )}
      </AnimatePresence>

      {/* Checkout Page Overlap */}
      <AnimatePresence>
        {isCheckout && (
          <CheckoutOverlay 
            cart={cart} 
            total={total} 
            onClose={() => setIsCheckout(false)} 
            onConfirm={handleFinalOrder}
            phone={phone}
            setPhone={setPhone}
            customerName={customerName}
            setCustomerName={setCustomerName}
          />
        )}
      </AnimatePresence>

      {/* Feedback Floating Action Button */}
      <button 
        onClick={() => setShowFeedback(true)}
        className="fixed bottom-6 right-6 z-40 bg-brand-navy p-4 rounded-full shadow-2xl shadow-black/50 border border-white/10 hover:scale-110 transition-transform group"
      >
        <MessageSquare className="text-brand-orange group-hover:text-brand-gold transition-colors" size={24} />
      </button>

      {/* Feedback Modal */}
      <AnimatePresence>
        {showFeedback && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div className="bg-brand-navy border border-white/10 rounded-[40px] w-full max-w-lg p-8 relative shadow-2xl">
              <button onClick={() => setShowFeedback(false)} className="absolute top-6 right-6 bg-brand-black p-2 rounded-xl text-gray-400 hover:text-white">
                <X size={20} />
              </button>
              <h2 className="text-2xl font-black text-brand-gold mb-2">رأيك يهمنا</h2>
              <p className="text-gray-400 text-sm mb-6">شاركنا تجربتك، اقتراحاتك، أو أي ملاحظات لتحسين خدمتنا.</p>
              
              <FeedbackForm onSuccess={() => setShowFeedback(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 inset-x-0 bg-brand-navy/90 backdrop-blur-xl border-t border-white/5 px-8 py-4 flex justify-between items-center z-40">
        <NavIcon icon={<HomeIcon />} label="الرئيسية" active />
        <NavIcon icon={<Grid />} label="الأصناف" />
        <div onClick={() => cart.length > 0 && setIsCheckout(true)} className="bg-brand-orange p-4 rounded-full -mt-12 shadow-2xl border-4 border-brand-black cursor-pointer">
          <ShoppingCart size={24} />
        </div>
        <NavIcon icon={<Star />} label="العروض" />
        <NavIcon icon={<User />} label="حسابي" href="/login" />
      </div>
    </div>
  );
}

function CategoryBtn({ label, active }: any) {
  return (
    <button className={`px-6 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all ${active ? 'bg-brand-gold text-black' : 'bg-brand-navy-light text-gray-400 border border-white/5'}`}>
      {label}
    </button>
  );
}

function NavIcon({ icon, label, active, href }: any) {
  const content = (
    <div className={`flex flex-col items-center gap-1 ${active ? 'text-brand-orange' : 'text-gray-500'}`}>
      {icon}
      <span className="text-[8px] font-bold uppercase">{label}</span>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

function ProductDetailsModal({ product, onClose, onAdd }: any) {
  const [size, setSize] = useState("Large");
  const [sugar, setSugar] = useState("Normal");
  const [ice, setIce] = useState("Normal");
  const [notes, setNotes] = useState("");

  return (
    <motion.div 
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      className="fixed inset-0 z-50 bg-brand-black flex flex-col"
    >
      <div className="relative h-[40vh] bg-brand-navy">
        <button onClick={onClose} className="absolute top-8 right-8 z-10 bg-black/40 p-3 rounded-2xl"><X /></button>
        <div className="w-full h-full flex items-center justify-center text-8xl">🥤</div>
      </div>
      <div className="flex-1 bg-brand-black rounded-t-[50px] -mt-12 p-10 overflow-y-auto">
        <h2 className="text-3xl font-black mb-2">{product.name}</h2>
        <p className="text-brand-gold text-2xl font-black mb-6">{product.price} د.ب</p>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">{product.description || "عصير طازج ومبرد محضر من أفضل المكونات."}</p>

        <OptionGroup label="الحجم" options={["Large", "Small"]} value={size} onChange={setSize} />
        <OptionGroup label="السكر" options={["Normal", "Low", "Extra", "None"]} value={sugar} onChange={setSugar} />
        <OptionGroup label="الثلج" options={["Normal", "Low", "None"]} value={ice} onChange={setIce} />

        <div className="mb-10">
          <label className="text-xs text-brand-gold font-bold block mb-3">ملاحظات إضافية</label>
          <textarea 
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full bg-brand-navy-light border border-white/5 rounded-3xl p-5 text-sm outline-none focus:border-brand-orange" 
            placeholder="مثلاً: بدون ليمون..."
          />
        </div>

        <button 
          onClick={() => onAdd(product, { size, sugar, ice, notes })}
          className="w-full bg-brand-orange py-5 rounded-[25px] font-black text-xl shadow-2xl shadow-brand-orange/20"
        >
          إضافة للطلب
        </button>
      </div>
    </motion.div>
  );
}

function OptionGroup({ label, options, value, onChange }: any) {
  return (
    <div className="mb-8">
      <label className="text-xs text-brand-gold font-bold block mb-4 uppercase tracking-widest">{label}</label>
      <div className="flex gap-3">
        {options.map((opt: any) => (
          <button 
            key={opt}
            onClick={() => onChange(opt)}
            className={`flex-1 py-3 rounded-2xl text-xs font-bold transition-all ${value === opt ? 'bg-white text-black' : 'bg-brand-navy-light text-gray-500 border border-white/5'}`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function CheckoutOverlay({ cart, total, onClose, onConfirm, phone, setPhone, customerName, setCustomerName }: any) {
  return (
    <motion.div 
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      className="fixed inset-0 z-50 bg-brand-black p-8 flex flex-col"
    >
      <header className="flex items-center gap-6 mb-12">
        <button onClick={onClose} className="bg-brand-navy p-3 rounded-2xl"><X /></button>
        <h2 className="text-2xl font-black">مراجعة الطلب</h2>
      </header>

      <div className="flex-1 overflow-y-auto space-y-6">
        {cart.map((item: any, idx: number) => (
          <div key={idx} className="bg-brand-navy-light p-5 rounded-[30px] border border-white/5 flex gap-4">
            <div className="w-20 h-20 bg-brand-black rounded-2xl flex items-center justify-center text-3xl">🥤</div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <h4 className="font-bold">{item.name}</h4>
                <span className="text-brand-orange font-bold text-sm">{item.price} د.ب</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">{item.size} • سكر {item.sugar} • ثلج {item.ice}</p>
            </div>
          </div>
        ))}

        <div className="bg-brand-navy p-8 rounded-[40px] border border-white/5 space-y-4">
          <div className="flex justify-between text-gray-500 text-sm">
            <span>إجمالي المنتجات</span>
            <span>{total} د.ب</span>
          </div>
          <div className="flex justify-between text-green-500 text-sm">
            <span>النقاط المكتسبة</span>
            <span>+ {Math.floor(total)} نقطة</span>
          </div>
          <div className="border-t border-white/10 pt-4 flex justify-between text-2xl font-black">
            <span>الإجمالي</span>
            <span className="text-brand-gold">{total} د.ب</span>
          </div>
          <div className="flex items-center gap-2 text-brand-orange text-xs font-bold justify-center pt-4">
             <Clock size={14} />
             <span>الوقت المتوقع: 12 دقيقة تقريباً</span>
          </div>
        </div>

        <div className="space-y-4 pt-6">
           <h3 className="text-brand-gold font-bold text-sm mr-2">بيانات العميل</h3>
           <input 
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            placeholder="الاسم" 
            className="w-full bg-brand-navy-light border border-white/5 rounded-2xl p-4 text-sm outline-none" 
           />
           <input 
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="رقم الهاتف" 
            className="w-full bg-brand-navy-light border border-white/5 rounded-2xl p-4 text-sm outline-none text-left" 
           />
        </div>
      </div>

      <button 
        onClick={onConfirm}
        className="mt-8 bg-brand-orange py-5 rounded-[25px] font-black text-xl shadow-2xl"
      >
        اعتماد الطلب
      </button>
    </motion.div>
  );
}

function FeedbackForm({ onSuccess }: { onSuccess?: () => void }) {
  const [type, setType] = useState('ملاحظة');
  const [content, setContent] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  const submitFeedback = trpc.submitPublicFeedback.useMutation({
    onSuccess: () => {
      alert("شكراً لك! تم استلام رسالتك بنجاح وسيقوم فريق الإدارة بمراجعتها.");
      setContent('');
      setName('');
      setPhone('');
      if (onSuccess) onSuccess();
    },
    onError: () => alert("حدث خطأ أثناء الإرسال. يرجى المحاولة لاحقاً.")
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content) {
      alert("الرجاء كتابة رسالتك");
      return;
    }
    submitFeedback.mutate({
      senderName: name || undefined,
      senderPhone: phone || undefined,
      senderRole: 'CUSTOMER',
      type,
      content
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <input 
          value={name} onChange={e => setName(e.target.value)}
          placeholder="الاسم (اختياري)" 
          className="bg-brand-black border border-white/5 rounded-2xl p-4 text-sm focus:outline-none focus:border-brand-orange w-full"
        />
        <input 
          value={phone} onChange={e => setPhone(e.target.value)}
          placeholder="رقم الهاتف (اختياري)" 
          className="bg-brand-black border border-white/5 rounded-2xl p-4 text-sm focus:outline-none focus:border-brand-orange w-full text-left"
        />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {['ملاحظة', 'اقتراح', 'شكوى', 'إطراء'].map(t => (
          <button 
            key={t} type="button" onClick={() => setType(t)}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${type === t ? 'bg-brand-orange text-black' : 'bg-brand-black border border-white/5 text-gray-400'}`}
          >
            {t}
          </button>
        ))}
      </div>
      <textarea 
        value={content} onChange={e => setContent(e.target.value)}
        placeholder="اكتب رسالتلك هنا..." 
        className="w-full bg-brand-black border border-white/5 rounded-2xl p-4 text-sm focus:outline-none focus:border-brand-orange min-h-[100px] resize-y"
        required
      />
      <button 
        type="submit" 
        disabled={submitFeedback.isLoading}
        className="w-full bg-gradient-to-r from-brand-orange to-brand-gold py-4 rounded-2xl font-bold text-black flex items-center justify-center gap-2 shadow-lg shadow-brand-orange/20"
      >
        <Send size={18} />
        {submitFeedback.isLoading ? 'جاري الإرسال...' : 'إرسال الرسالة'}
      </button>
    </form>
  );
}
