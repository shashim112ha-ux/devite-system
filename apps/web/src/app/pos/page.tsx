"use client";

import { useState, useEffect } from "react";
import { trpc } from "../utils/trpc";
import { 
  ShoppingCart, Search, Plus, Minus, CreditCard, Banknote, 
  User, Sparkles, X, Coffee, ListFilter, Trash2, Award, ChevronUp, ChevronDown 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PrintableInvoice } from "../../components/PrintableInvoice";

export default function POSPage() {
  const [cart, setCart] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");
  
  // Modifiers Modal State
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [size, setSize] = useState<string>("وسط");
  const [sugar, setSugar] = useState<string>("50%");
  const [ice, setIce] = useState<string>("عادي");
  const [notes, setNotes] = useState<string>("");

  // Customer Loyalty State
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPoints, setCustomerPoints] = useState<number | null>(null);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [isCartExpanded, setIsCartExpanded] = useState<boolean>(false);

  const [lastOrder, setLastOrder] = useState<any>(null);

  const productsQuery = trpc.getProducts.useQuery();
  const categoriesQuery = trpc.getCategories.useQuery();
  const offersQuery = trpc.getOffers.useQuery();
  const settingsQuery = trpc.getSystemSettings.useQuery();
  const createOrderMutation = trpc.createOrder.useMutation();

  // Load cart from local storage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem("devite_pos_cart");
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error("Failed to parse saved cart");
      }
    }
  }, []);

  // Save cart to local storage on change
  useEffect(() => {
    localStorage.setItem("devite_pos_cart", JSON.stringify(cart));
  }, [cart]);

  // Customer Lookup
  const handleCustomerLookup = async () => {
    if (!customerPhone) return;
    setIsSearchingCustomer(true);
    try {
      const customer = await trpc.useContext().getCustomer.fetch({ phone: customerPhone });
      if (customer) {
        setCustomerName(customer.name);
        setCustomerPoints(customer.points);
      } else {
        setCustomerName("عميل جديد");
        setCustomerPoints(0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearchingCustomer(false);
    }
  };

  const handleProductClick = (product: any) => {
    if (product.isOffer) {
      // It's an offer, add directly
      setCart([...cart, {
        cartItemId: `offer-${product.id}-${Date.now()}`,
        id: product.id,
        name: `عرض: ${product.title}`,
        price: product.price,
        size: "عادي",
        sugar: "-",
        ice: "-",
        notes: product.type === "BOGO" ? "اشتر 1 واحصل على 1" : "",
        quantity: 1,
        isOffer: true
      }]);
      return;
    }

    if (!product.dynamicAvailable) {
      alert("عذراً، هذا المنتج غير متوفر حالياً بسبب نقص المكونات في المخزن.");
      return;
    }
    setSelectedProduct(product);
    setSize(product.sizes?.length > 0 ? product.sizes[0] : "-");
    setSugar(product.sugarLevels?.length > 0 ? product.sugarLevels[0] : "-");
    setIce(product.iceLevels?.length > 0 ? product.iceLevels[0] : "-");
    setNotes("");
  };

  const addToCart = () => {
    if (!selectedProduct) return;
    
    // Calculate extra cost if large size (keep legacy logic if size matches exactly)
    let extraCost = 0;
    if (size === "كبير") extraCost = 0.5;
    if (size === "صغير") extraCost = -0.2;
    const finalPrice = Number(selectedProduct.price) + extraCost;

    const cartItemId = `${selectedProduct.id}-${size}-${sugar}-${ice}-${notes}`;
    
    const existing = cart.find(item => item.cartItemId === cartItemId);
    if (existing) {
      setCart(cart.map(item => 
        item.cartItemId === cartItemId ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, {
        cartItemId,
        id: selectedProduct.id,
        name: selectedProduct.name,
        price: finalPrice,
        size,
        sugar,
        ice,
        notes,
        quantity: 1
      }]);
    }
    setSelectedProduct(null);
  };

  const updateQuantity = (cartItemId: string, amount: number) => {
    setCart(cart.map(item => {
      if (item.cartItemId === cartItemId) {
        const newQty = item.quantity + amount;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (cartItemId: string) => {
    setCart(cart.filter(item => item.cartItemId !== cartItemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const total = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    try {
      const cashierId = localStorage.getItem("userId") || "web-cashier";
      const order = await createOrderMutation.mutateAsync({
        cashierId,
        customerPhone: customerPhone || undefined,
        customerName: customerName || undefined,
        items: cart.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          price: Number(item.price),
          size: item.size,
          sugar: item.sugar,
          ice: item.ice,
          notes: item.notes,
        })),
        paymentMethod,
        total: total,
      });

      setLastOrder(order);
      alert('تم إرسال الطلب للمطبخ بنجاح');
      
      // WhatsApp interactive link
      if (customerPhone && settingsQuery.data?.whatsappEnabled) {
        const formattedPhone = customerPhone.startsWith('+') ? customerPhone.substring(1) : (customerPhone.startsWith('00') ? customerPhone.substring(2) : `973${customerPhone}`);
        let msg = settingsQuery.data?.whatsappOrderMsg || `مرحباً ${customerName || 'عميلنا العزيز'}،\n\nشكراً لطلبك من Devite!\nرقم الطلب الخاص بك: #${order.id.slice(-4)}\nالمجموع الكلي: ${total.toFixed(3)} د.ب\n\nنحن نقوم بتجهيز طلبك الآن وسنعلمك فور جهوزه`;
        msg = msg.replace('{{orderNumber}}', `#${order.id.slice(-4)}`);
        msg = msg.replace('{{total}}', `${total.toFixed(3)} د.ب`);
        const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
      }

      // Auto trigger print
      setTimeout(() => {
        window.print();
      }, 500);
      
      setCart([]);
      setCustomerPhone("");
      setCustomerName("");
      setCustomerPoints(null);
    } catch (error: any) {
      alert(`فشل إرسال الطلب: ${error.message}`);
    }
  };

  // Filter products
  const filteredProducts = productsQuery.data?.filter(p => {
    const matchesCategory = selectedCategory === "ALL" || p.categoryId === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (<div className="flex flex-col-reverse lg:flex-row h-screen bg-brand-black text-white font-sans overflow-hidden">
      
      {/* سلة المشتريات الجانبية */}
      <div className={`w-full lg:w-[420px] ${isCartExpanded ? 'h-[75vh]' : 'h-12'} lg:h-full bg-brand-navy border-t lg:border-t-0 lg:border-l border-white/5 flex flex-col justify-between print:hidden overflow-hidden shrink-0 transition-all duration-300 z-20`}>
        
        {/* زر تصغير/تكبير السلة للموبايل */}
        <button 
          onClick={() => setIsCartExpanded(!isCartExpanded)}
          className="lg:hidden w-full h-12 bg-brand-orange text-black font-bold flex items-center justify-center gap-2 shrink-0 shadow-lg"
        >
          {isCartExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          {isCartExpanded ? 'إخفاء تفاصيل السلة' : `عـرض السلـة - المجمـوع: ${total.toFixed(2)} د.ب`}
        </button>

        <div className={`flex-col flex-1 overflow-hidden p-4 lg:p-6 ${!isCartExpanded ? 'hidden lg:flex' : 'flex'}`}>
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <ShoppingCart className="text-brand-orange" size={24} />
              <h2 className="text-2xl font-black">تفاصيل السلة</h2>
            </div>
            {cart.length > 0 && (
              <button onClick={clearCart} className="text-gray-500 hover:text-red-500 transition-colors flex items-center gap-1 text-xs">
                <Trash2 size={14} /> مسح الكل
              </button>
            )}
          </div>

          {/* قائمة العناصر داخل العربة */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 pl-2">
            <AnimatePresence>
              {cart.map((item) => (
                <motion.div 
                  key={item.cartItemId}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="bg-brand-navy-light/60 p-4 rounded-2xl border border-white/5 flex flex-col gap-2 hover:border-brand-gold/25 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-base text-white">{item.name}</h4>
                      <p className="text-brand-gold text-sm font-bold mt-1">{item.price} د.ب</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQuantity(item.cartItemId, -1)} className="bg-brand-black p-2 rounded-xl border border-white/5 hover:bg-brand-orange hover:text-black transition-all">
                          <Minus size={14} />
                        </button>
                        <span className="font-black text-lg w-6 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.cartItemId, 1)} className="bg-brand-black p-2 rounded-xl border border-white/5 hover:bg-brand-orange hover:text-black transition-all">
                          <Plus size={14} />
                        </button>
                      </div>
                      <button onClick={() => removeFromCart(item.cartItemId)} className="text-[10px] text-red-500 hover:text-red-400 font-bold bg-red-500/10 px-2 py-1 rounded-md transition-colors flex items-center gap-1">
                        <Trash2 size={12} /> حذف
                      </button>
                    </div>
                  </div>

                  {/* تفاصيل الخصائص المضافة */}
                  <div className="flex flex-wrap gap-2 text-[10px] text-gray-400 border-t border-white/5 pt-2">
                    <span className="bg-brand-black px-2 py-0.5 rounded-full border border-white/5">حجم: {item.size}</span>
                    <span className="bg-brand-black px-2 py-0.5 rounded-full border border-white/5">سكر: {item.sugar}</span>
                    <span className="bg-brand-black px-2 py-0.5 rounded-full border border-white/5">ثلج: {item.ice}</span>
                    {item.notes && <span className="bg-brand-black/80 text-brand-gold px-2 py-0.5 rounded-full border border-brand-gold/10">ملاحظة: {item.notes}</span>}
                    <button onClick={() => removeFromCart(item.cartItemId)} className="text-red-500 mr-auto hover:underline">إزالة</button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {cart.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-3 py-20">
                <Coffee size={48} className="stroke-1 animate-pulse" />
                <p className="text-sm font-bold">العربة فارغة، اختر بعض المشروبات للبدء</p>
              </div>
            )}
          </div>
        </div>

        {/* أسفل العربة: نظام النقاط والحساب */}
        <div className="mt-4 pt-4 border-t border-white/5 space-y-4">
          
          {/* قسم عميل الولاء */}
          <div className="bg-brand-navy-light/40 p-4 rounded-[24px] border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400 flex items-center gap-1"><Award size={14} className="text-brand-gold" /> نظام نقاط العملاء</span>
              {customerPoints !== null && (
                <span className="text-xs bg-brand-gold/20 text-brand-gold px-2 py-0.5 rounded-full font-bold">
                  {customerPoints} نقطة
                </span>
              )}
            </div>
            
            <div className="flex gap-2">
              <div className="relative flex-1">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input 
                  type="text"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="رقم هاتف العميل..."
                  className="w-full bg-brand-black border border-white/5 rounded-xl py-2 pr-9 pl-3 text-xs focus:outline-none focus:border-brand-orange text-left"
                />
              </div>
              <button 
                onClick={handleCustomerLookup}
                disabled={isSearchingCustomer}
                className="bg-brand-orange text-black px-4 py-2 rounded-xl text-xs font-bold hover:bg-brand-gold transition-colors"
              >
                بحث
              </button>
            </div>

            {customerName && (
              <div className="flex items-center gap-2 bg-brand-black/40 px-3 py-2 rounded-xl border border-white/5">
                <Sparkles size={14} className="text-brand-orange" />
                <span className="text-xs font-bold text-gray-300">العميل: {customerName}</span>
                <input 
                  type="text" 
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="bg-transparent border-b border-white/10 text-xs w-full focus:outline-none focus:border-brand-orange mr-2"
                  placeholder="تعديل الاسم..."
                />
              </div>
            )}
          </div>

          {/* الإجمالي والدفع */}
          <div>
            <div className="flex justify-between text-2xl font-black mb-4">
              <span className="text-brand-gold">{total.toFixed(2)} د.ب</span>
              <span className="text-white">الإجمالي</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button 
                onClick={() => setPaymentMethod("CASH")} 
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${paymentMethod === "CASH" ? "bg-brand-orange text-black border-brand-orange font-bold" : "bg-brand-navy-light/60 border-white/5 text-gray-400 hover:text-white"}`}
              >
                <Banknote size={20} />
                <span className="text-[10px] mt-1">دفع كاش</span>
              </button>
              
              <button 
                onClick={() => setPaymentMethod("CARD")} 
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${paymentMethod === "CARD" ? "bg-brand-orange text-black border-brand-orange font-bold" : "bg-brand-navy-light/60 border-white/5 text-gray-400 hover:text-white"}`}
              >
                <CreditCard size={20} />
                <span className="text-[10px] mt-1">دفع شبكة</span>
              </button>
            </div>

            <button 
              onClick={handleCheckout}
              disabled={cart.length === 0 || createOrderMutation.isLoading}
              className="w-full bg-brand-orange text-black py-4 rounded-[24px] font-black text-xl shadow-2xl hover:bg-brand-gold active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all"
            >
              {createOrderMutation.isLoading ? "جاري إرسال الطلب..." : "تأكيد وإرسال الطلب للمطبخ"}
            </button>
          </div>

        </div>
      </div>

      {/* شاشة اختيار المنتجات الرئيسية */}
      <div className="flex-1 p-4 lg:p-8 flex flex-col overflow-hidden">
        
        {/* شريط البحث وتصفية التصنيفات */}
        <header className="flex flex-col gap-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-brand-gold">نظام المبيعات المباشر</h1>
              <p className="text-gray-500 text-xs mt-1">تحديد طلبات العملاء وإرسالها للمطبخ بالوقت الحقيقي</p>
            </div>
            
            <div className="relative w-80">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                type="text" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="ابحث عن صنف معين..." 
                className="w-full bg-brand-navy border border-white/5 rounded-2xl py-2.5 pr-11 pl-4 text-sm focus:outline-none focus:border-brand-orange"
              />
            </div>
          </div>

          {/* أزرار التصنيفات */}
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
            <button 
              onClick={() => setSelectedCategory("ALL")}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${selectedCategory === "ALL" ? "bg-brand-orange text-black border-brand-orange" : "bg-brand-navy border-white/5 text-gray-400 hover:text-white"}`}
            >
              <ListFilter size={14} /> الكل
            </button>
            {categoriesQuery.data?.map(cat => (
              <button 
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all border whitespace-nowrap ${selectedCategory === cat.id ? "bg-brand-orange text-black border-brand-orange" : "bg-brand-navy border-white/5 text-gray-400 hover:text-white"}`}
              >
                {cat.name} ({cat._count.products})
              </button>
            ))}
          </div>
        </header>

        {/* شبكة الأصناف المتاحة */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-6">
          {productsQuery.isLoading ? (
            <div className="h-full flex items-center justify-center text-brand-gold animate-pulse font-bold">جاري تحميل قائمة الأصناف...</div>
          ) : (
            <>
              {/* Offers Section */}
              {offersQuery.data && offersQuery.data.length > 0 && selectedCategory === "ALL" && !searchTerm && (
                <div>
                  <h3 className="font-bold text-brand-orange mb-3 flex items-center gap-2">
                    <Award size={16} /> العروض الحالية النشطة
                  </h3>
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {offersQuery.data.map(offer => (
                      <motion.div 
                        key={offer.id}
                        whileHover={{ y: -5 }}
                        onClick={() => handleProductClick({ ...offer, isOffer: true })}
                        className="bg-brand-orange/10 p-5 rounded-3xl border border-brand-orange/30 transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden hover:border-brand-orange/80 shadow-lg shadow-brand-orange/5"
                      >
                        <div className="absolute top-2 left-2 bg-brand-orange text-black text-[9px] font-bold px-2 py-0.5 rounded-full z-10 animate-pulse">
                          {offer.type === 'DISCOUNT' ? 'خصم' : offer.type === 'COMBO' ? 'كومبو' : '1+1'}
                        </div>
                        <div className="aspect-video bg-brand-navy-light/40 rounded-2xl mb-4 flex items-center justify-center border border-brand-orange/10 relative">
                          <span className="text-4xl">🎁</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-brand-orange group-hover:text-white transition-colors truncate">{offer.title}</h3>
                          <p className="text-xs text-gray-400 mt-1 line-clamp-1">{offer.description}</p>
                        </div>
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-brand-orange/20">
                          <span className="text-brand-gold font-black text-lg">{offer.price} د.ب</span>
                          {offer.oldPrice && <span className="text-[10px] text-gray-500 line-through">{offer.oldPrice} د.ب</span>}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Products Grid */}
              <div>
                {(selectedCategory !== "ALL" || searchTerm) && (
                   <h3 className="font-bold text-white mb-3">نتائج البحث</h3>
                )}
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {filteredProducts?.map((product) => (
                <motion.div 
                  key={product.id}
                  whileHover={{ y: -5 }}
                  onClick={() => handleProductClick(product)}
                  className={`bg-brand-navy p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden ${product.dynamicAvailable ? "border-white/5 hover:border-brand-orange/50" : "border-red-500/20 opacity-55 hover:border-red-500/50"}`}
                >
                  {!product.dynamicAvailable && (
                    <div className="absolute top-2 left-2 bg-red-500/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full z-10">
                      نفذت المكونات
                    </div>
                  )}

                  <div className="aspect-video bg-brand-navy-light/60 rounded-2xl mb-4 flex items-center justify-center border border-white/5 relative">
                    <span className="text-4xl">🥤</span>
                  </div>

                  <div>
                    <h3 className="font-bold text-lg text-white group-hover:text-brand-orange transition-colors truncate">{product.name}</h3>
                    {product.description && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{product.description}</p>}
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                    <span className="text-brand-gold font-bold text-base">{product.price} د.ب</span>
                    <span className="text-[10px] text-gray-500 bg-brand-navy-light px-2.5 py-1 rounded-lg border border-white/5">
                      ⏳ {product.prepTime || 10} د
                    </span>
                  </div>
                </motion.div>
              ))}
              </div>
              </div>
            </>
          )}
        </div>

      </div>

      {/* مودال اختيار خصائص الصنف (Modifiers Dialog) */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-brand-navy border border-white/10 w-full max-w-lg rounded-[36px] overflow-hidden p-8 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <h3 className="text-2xl font-black text-brand-gold">خصائص: {selectedProduct.name}</h3>
                <button onClick={() => setSelectedProduct(null)} className="text-gray-400 hover:text-white bg-white/5 p-2 rounded-xl">
                  <X size={18} />
                </button>
              </div>

              {/* حجم المشروب */}
              {selectedProduct.sizes && selectedProduct.sizes.length > 0 && (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-gray-400">الحجم</span>
                  <div className="grid grid-cols-3 gap-3">
                    {selectedProduct.sizes.map((sz: string) => (
                      <button 
                        key={sz} 
                        onClick={() => setSize(sz)}
                        className={`py-3 rounded-xl text-xs font-bold transition-all border ${size === sz ? "bg-brand-orange text-black border-brand-orange" : "bg-brand-black border-white/5 text-gray-400 hover:text-white"}`}
                      >
                        {sz} {sz === "كبير" ? "(+0.5 د.ب)" : sz === "صغير" ? "(-0.2 د.ب)" : ""}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* نسبة السكر */}
              {selectedProduct.sugarLevels && selectedProduct.sugarLevels.length > 0 && (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-gray-400">مستوى السكر</span>
                  <div className="grid grid-cols-3 gap-3">
                    {selectedProduct.sugarLevels.map((sg: string) => (
                      <button 
                        key={sg} 
                        onClick={() => setSugar(sg)}
                        className={`py-3 rounded-xl text-xs font-bold transition-all border ${sugar === sg ? "bg-brand-orange text-black border-brand-orange" : "bg-brand-black border-white/5 text-gray-400 hover:text-white"}`}
                      >
                        {sg}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* كمية الثلج */}
              {selectedProduct.iceLevels && selectedProduct.iceLevels.length > 0 && (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-gray-400">الثلج</span>
                  <div className="grid grid-cols-3 gap-3">
                    {selectedProduct.iceLevels.map((ic: string) => (
                      <button 
                        key={ic} 
                        onClick={() => setIce(ic)}
                        className={`py-3 rounded-xl text-xs font-bold transition-all border ${ice === ic ? "bg-brand-orange text-black border-brand-orange" : "bg-brand-black border-white/5 text-gray-400 hover:text-white"}`}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ملاحظات خاصة */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-400">ملاحظات خاصة</span>
                <textarea 
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="مثال: بدون قشطة، حليب صويا..."
                  rows={2}
                  className="w-full bg-brand-black border border-white/5 rounded-2xl p-4 text-sm focus:outline-none focus:border-brand-orange text-white"
                />
              </div>

              <button 
                onClick={addToCart}
                className="w-full bg-brand-orange text-black py-4 rounded-2xl font-black text-lg hover:bg-brand-gold transition-colors"
              >
                إضافة لعربة المشتريات
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* الطباعة الخفية للفاتورة */}
      {lastOrder && <PrintableInvoice order={lastOrder} />}

    </div>
  );
}
