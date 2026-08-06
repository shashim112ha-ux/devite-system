"use client";

import { useState, useRef } from "react";
import { trpc } from "../../utils/trpc";
import { useReactToPrint } from "react-to-print";
import { 
  TrendingUp, Calendar, FileText, Loader2, AlertCircle, ShoppingCart, 
  DollarSign, CreditCard, Activity, PieChart, Edit2, X, Check, RefreshCw,
  ArrowRightLeft, Plus, Printer, Trash2
} from "lucide-react";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

const COLORS = ["#FF6B6B", "#4D96FF", "#6BCB77", "#FFD93D", "#9B5DE5", "#F15BB5", "#00F5D4", "#7F8C8D"];
const PAYMENT_METHODS = ['CASH', 'CARD', 'BENEFIT', 'ONLINE'];

export default function SalesPage() {
  const [filterType, setFilterType] = useState('daily');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [editTotal, setEditTotal] = useState('');
  const [editPayment, setEditPayment] = useState('');
  const [editFromAccount, setEditFromAccount] = useState('');
  const [editToAccount, setEditToAccount] = useState('');
  const [page, setPage] = useState(1);

  // Historical sale state
  const [showHistoricalForm, setShowHistoricalForm] = useState(false);
  const [histDate, setHistDate] = useState('');
  const [histPayment, setHistPayment] = useState('CASH');
  const [histTotal, setHistTotal] = useState('');
  const [histCustomerName, setHistCustomerName] = useState('');
  const [histCustomerPhone, setHistCustomerPhone] = useState('');
  const [histNotes, setHistNotes] = useState('');
  const [histItems, setHistItems] = useState<{ productId: string; quantity: number; price: number; }[]>([
    { productId: '', quantity: 1, price: 0 }
  ]);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: "سجل_المبيعات" });

  const userRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;
  const isAdminOrManager = userRole === 'ADMIN' || userRole === 'MANAGER';

  const queryParams = { filterType, page, limit: 20, ...(filterType === 'custom' ? { startDate, endDate } : {}) };
  const printQueryParams = { filterType, page: 1, limit: 10000, ...(filterType === 'custom' ? { startDate, endDate } : {}) };
  
  const { data: salesResponse, isLoading: loadingSales, refetch: refetchSales } = trpc.getDetailedSalesLog.useQuery(queryParams);
  const salesList = salesResponse?.data || [];
  const totalPages = salesResponse?.totalPages || 1;
  const { data: analytics, isLoading: loadingAnalytics } = trpc.getSalesAnalytics.useQuery(queryParams);
  const { data: accounts } = trpc.getAccounts.useQuery();
  const { data: products } = trpc.getProducts.useQuery();
  const { data: printSalesResponse } = trpc.getDetailedSalesLog.useQuery(printQueryParams);
  const printSalesList = printSalesResponse?.data || [];
  const utils = trpc.useContext();

  const updateMutation = trpc.updateOrder.useMutation({
    onSuccess: () => {
      utils.getDetailedSalesLog.invalidate();
      utils.getSalesAnalytics.invalidate();
      utils.getAdvancedStats.invalidate();
      setEditingOrder(null);
    },
    onError: (err) => alert(`خطأ: ${err.message}`)
  });

  const historicalSaleMutation = trpc.createHistoricalSale.useMutation({
    onSuccess: () => {
      utils.getDetailedSalesLog.invalidate();
      utils.getSalesAnalytics.invalidate();
      utils.getAdvancedStats.invalidate();
      setShowHistoricalForm(false);
      resetHistoricalForm();
      alert("✅ تم تسجيل المبيعة التاريخية بنجاح!");
    },
    onError: (err) => alert(`خطأ: ${err.message}`)
  });

  const resetHistoricalForm = () => {
    setHistDate('');
    setHistPayment('CASH');
    setHistTotal('');
    setHistCustomerName('');
    setHistCustomerPhone('');
    setHistNotes('');
    setHistItems([{ productId: '', quantity: 1, price: 0 }]);
  };

  const addHistItem = () => setHistItems(prev => [...prev, { productId: '', quantity: 1, price: 0 }]);
  const removeHistItem = (idx: number) => setHistItems(prev => prev.filter((_, i) => i !== idx));
  const updateHistItem = (idx: number, field: string, value: any) => {
    setHistItems(prev => {
      const next = [...prev];
      (next[idx] as any)[field] = value;
      // Auto-fill price from product
      if (field === 'productId' && value) {
        const prod = products?.find((p: any) => p.id === value) as any;
        if (prod) next[idx].price = prod.price || 0;
      }
      return next;
    });
    // Auto-calc total
    if (field === 'quantity' || field === 'price') {
      setTimeout(() => {
        setHistItems(curr => {
          const total = curr.reduce((s, it) => s + it.price * it.quantity, 0);
          setHistTotal(total.toFixed(3));
          return curr;
        });
      }, 50);
    }
  };

  const submitHistoricalSale = () => {
    if (!histDate) { alert("يرجى تحديد التاريخ"); return; }
    const total = parseFloat(histTotal);
    if (isNaN(total) || total <= 0) { alert("يرجى إدخال مبلغ إجمالي صحيح"); return; }
    const validItems = histItems.filter(it => it.productId && it.quantity > 0);
    if (validItems.length === 0) { alert("يرجى إضافة منتج واحد على الأقل"); return; }

    historicalSaleMutation.mutate({
      date: new Date(histDate).toISOString(),
      paymentMethod: histPayment,
      total,
      customerName: histCustomerName || undefined,
      customerPhone: histCustomerPhone || undefined,
      notes: histNotes || undefined,
      items: validItems.map(it => ({ productId: it.productId, quantity: it.quantity, price: it.price })),
    });
  };

  const openEdit = (order: any) => {
    setEditingOrder(order);
    setEditTotal(order.total.toFixed(3));
    setEditPayment(order.paymentMethod || 'CASH');
    setEditFromAccount('');
    setEditToAccount('');
  };

  const saveEdit = () => {
    const newTotal = parseFloat(editTotal);
    if (isNaN(newTotal) || newTotal < 0) { alert("يرجى إدخال مبلغ صحيح"); return; }
    updateMutation.mutate({
      id: editingOrder.id,
      total: newTotal,
      paymentMethod: editPayment,
      fromAccountId: editFromAccount || undefined,
      toAccountId: editToAccount || undefined,
    } as any);
  };

  const paymentIcon = (method: string) => {
    if (method === 'CASH') return <DollarSign size={12} className="text-green-400" />;
    if (method === 'CARD') return <CreditCard size={12} className="text-blue-400" />;
    if (method === 'BENEFIT') return <Activity size={12} className="text-red-400" />;
    if (method === 'ONLINE') return <Activity size={12} className="text-purple-400" />;
    return null;
  };

  const paymentColor = (method: string) => {
    if (method === 'CASH') return 'border-green-500/30 text-green-400';
    if (method === 'CARD') return 'border-blue-500/30 text-blue-400';
    if (method === 'BENEFIT') return 'border-red-500/30 text-red-400';
    if (method === 'ONLINE') return 'border-purple-500/30 text-purple-400';
    return 'border-white/10 text-gray-300';
  };

  const periodLabel = filterType === 'daily' ? 'اليوم' : filterType === 'weekly' ? 'الأسبوع' : filterType === 'monthly' ? 'الشهر' : filterType === 'all' ? 'الكل' : `${startDate} — ${endDate}`;

  return (
    <div className="p-8 space-y-8 max-w-[1400px] mx-auto">
      
      {/* Edit Order Modal */}
      {editingOrder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-brand-navy border border-white/10 rounded-[30px] p-8 w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-brand-gold flex items-center gap-2">
                <Edit2 size={20} /> تعديل الطلب #{editingOrder.orderNumber}
              </h2>
              <button onClick={() => setEditingOrder(null)} className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5">
              <div className="bg-brand-black/50 rounded-2xl p-4 border border-white/5">
                <p className="text-xs text-gray-500 mb-2">عناصر الطلب</p>
                {editingOrder.items?.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm py-1 border-b border-white/5 last:border-0">
                    <span className="text-gray-300">{item.product?.name} × {item.quantity}</span>
                    <span className="text-brand-gold">{(item.price * item.quantity).toFixed(3)} د.ب</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm pt-2 mt-1">
                  <span className="text-gray-400">الإجمالي الأصلي</span>
                  <span className="text-white font-bold">{editingOrder.total.toFixed(3)} د.ب</span>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400 font-bold block mb-2">💰 المبلغ الإجمالي الجديد (د.ب)</label>
                <input type="number" step="0.001" value={editTotal} onChange={e => setEditTotal(e.target.value)}
                  className="w-full bg-brand-black border border-brand-gold/30 rounded-xl px-4 py-3 text-white text-lg font-bold focus:outline-none focus:border-brand-gold" />
              </div>

              <div>
                <label className="text-sm text-gray-400 font-bold block mb-2">💳 طريقة الدفع الجديدة</label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map(pm => (
                    <button key={pm} onClick={() => setEditPayment(pm)}
                      className={`py-2.5 rounded-xl text-sm font-bold border transition-all flex items-center justify-center gap-2 ${
                        editPayment === pm ? 'bg-brand-gold text-black border-brand-gold' : 'bg-brand-black border-white/10 text-gray-400 hover:border-white/30'
                      }`}>
                      {paymentIcon(pm)} {pm}
                    </button>
                  ))}
                </div>
              </div>

              {accounts && accounts.length > 0 && editPayment !== editingOrder.paymentMethod && (
                <div className="bg-brand-orange/5 border border-brand-orange/20 rounded-2xl p-4 space-y-3">
                  <p className="text-xs text-brand-orange font-bold flex items-center gap-2">
                    <ArrowRightLeft size={14} /> تحويل مالي بين الحسابات (اختياري)
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">خصم من حساب</label>
                      <select value={editFromAccount} onChange={e => setEditFromAccount(e.target.value)}
                        className="w-full bg-brand-black border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange">
                        <option value="">— اختر —</option>
                        {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name} ({Number(a.balance).toFixed(3)})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">أضف إلى حساب</label>
                      <select value={editToAccount} onChange={e => setEditToAccount(e.target.value)}
                        className="w-full bg-brand-black border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange">
                        <option value="">— اختر —</option>
                        {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name} ({Number(a.balance).toFixed(3)})</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={saveEdit} disabled={updateMutation.isLoading}
                  className="flex-1 bg-brand-gold text-black font-black py-3 rounded-xl hover:bg-brand-gold/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {updateMutation.isLoading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                  حفظ التعديلات
                </button>
                <button onClick={() => setEditingOrder(null)} className="flex-1 bg-white/5 text-gray-400 font-bold py-3 rounded-xl hover:bg-white/10 transition-colors">
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Historical Sale Modal */}
      {showHistoricalForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-brand-navy border border-white/10 rounded-[30px] p-8 w-full max-w-2xl shadow-2xl my-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-brand-orange flex items-center gap-2">
                <Calendar size={20} /> إضافة مبيعة سابقة
              </h2>
              <button onClick={() => setShowHistoricalForm(false)} className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5">
              {/* Date & Payment */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-brand-orange font-bold block mb-2">📅 تاريخ المبيعة *</label>
                  <input type="date" value={histDate} onChange={e => setHistDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full bg-brand-black border border-brand-orange/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-orange" />
                </div>
                <div>
                  <label className="text-sm text-gray-400 font-bold block mb-2">💳 طريقة الدفع</label>
                  <select value={histPayment} onChange={e => setHistPayment(e.target.value)}
                    className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-gold">
                    {PAYMENT_METHODS.map(pm => <option key={pm} value={pm}>{pm}</option>)}
                  </select>
                </div>
              </div>

              {/* Customer */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 block mb-2">اسم العميل (اختياري)</label>
                  <input type="text" placeholder="اسم العميل" value={histCustomerName} onChange={e => setHistCustomerName(e.target.value)}
                    className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-gold" />
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-2">هاتف العميل (اختياري)</label>
                  <input type="text" placeholder="رقم الهاتف" value={histCustomerPhone} onChange={e => setHistCustomerPhone(e.target.value)}
                    className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-gold" />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm text-brand-gold font-bold">🛒 المنتجات</label>
                  <button onClick={addHistItem} className="text-xs bg-brand-gold/10 text-brand-gold border border-brand-gold/20 px-3 py-1.5 rounded-lg hover:bg-brand-gold/20 transition-colors flex items-center gap-1">
                    <Plus size={14} /> إضافة منتج
                  </button>
                </div>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {histItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-brand-black/50 p-3 rounded-xl">
                      <div className="col-span-5">
                        <select value={item.productId} onChange={e => updateHistItem(idx, 'productId', e.target.value)}
                          className="w-full bg-brand-black border border-white/10 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-brand-gold">
                          <option value="">— اختر منتج —</option>
                          {products?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <input type="number" min="1" value={item.quantity} onChange={e => updateHistItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-full bg-brand-black border border-white/10 rounded-lg px-2 py-2 text-white text-sm text-center focus:outline-none focus:border-brand-gold"
                          placeholder="الكمية" />
                      </div>
                      <div className="col-span-4">
                        <input type="number" step="0.001" value={item.price} onChange={e => updateHistItem(idx, 'price', parseFloat(e.target.value) || 0)}
                          className="w-full bg-brand-black border border-brand-gold/20 rounded-lg px-2 py-2 text-brand-gold text-sm font-bold focus:outline-none focus:border-brand-gold"
                          placeholder="السعر د.ب" />
                      </div>
                      <div className="col-span-1 flex justify-center">
                        {histItems.length > 1 && (
                          <button onClick={() => removeHistItem(idx)} className="text-red-400 hover:text-red-300 p-1">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div>
                <label className="text-sm text-brand-gold font-bold block mb-2">💰 المبلغ الإجمالي (د.ب) *</label>
                <input type="number" step="0.001" value={histTotal} onChange={e => setHistTotal(e.target.value)}
                  className="w-full bg-brand-black border border-brand-gold/30 rounded-xl px-4 py-3 text-brand-gold text-xl font-black focus:outline-none focus:border-brand-gold"
                  placeholder="0.000" />
                <p className="text-xs text-gray-500 mt-1">يُحسب تلقائياً من المنتجات أو يمكنك تعديله يدوياً</p>
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm text-gray-400 block mb-2">ملاحظات (اختياري)</label>
                <textarea rows={2} value={histNotes} onChange={e => setHistNotes(e.target.value)}
                  className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-gold"
                  placeholder="أي ملاحظات إضافية..." />
              </div>

              <div className="flex gap-3 pt-2 border-t border-white/5">
                <button onClick={submitHistoricalSale} disabled={historicalSaleMutation.isLoading}
                  className="flex-1 bg-brand-orange text-black font-black py-3 rounded-xl hover:bg-brand-orange/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {historicalSaleMutation.isLoading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                  تسجيل المبيعة السابقة
                </button>
                <button onClick={() => { setShowHistoricalForm(false); resetHistoricalForm(); }}
                  className="flex-1 bg-white/5 text-gray-400 font-bold py-3 rounded-xl hover:bg-white/10 transition-colors">
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-black text-brand-gold">سجل المبيعات والتقارير</h1>
          <p className="text-gray-500 text-sm mt-1">تحليل شامل ومفصّل لجميع المبيعات</p>
        </div>
        <div className="flex gap-3 flex-wrap items-center">
          {/* Action Buttons */}
          <button
            onClick={() => setShowHistoricalForm(true)}
            className="flex items-center gap-2 bg-brand-orange hover:bg-brand-orange/90 text-black font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-brand-orange/20 text-sm"
          >
            <Plus size={16} /> إضافة مبيعة سابقة
          </button>
          <button
            onClick={() => handlePrint()}
            className="flex items-center gap-2 bg-brand-navy border border-white/10 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-sm"
          >
            <Printer size={16} /> طباعة المبيعات
          </button>
          {/* Filter buttons */}
          {['daily', 'weekly', 'monthly', 'custom', 'all'].map(f => (
            <button key={f} onClick={() => { setFilterType(f); setPage(1); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterType === f ? 'bg-brand-gold text-black' : 'bg-brand-navy border border-white/10 text-gray-400 hover:text-white'}`}>
              {f === 'daily' ? 'اليوم' : f === 'weekly' ? 'الأسبوع' : f === 'monthly' ? 'الشهر' : f === 'custom' ? 'مخصص' : 'الكل'}
            </button>
          ))}
        </div>
      </div>

      {filterType === 'custom' && (
        <div className="flex gap-4 items-center flex-wrap">
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-brand-navy border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none" />
          <span className="text-gray-500">—</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-brand-navy border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none" />
        </div>
      )}

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
        <div className="bg-brand-navy border border-white/5 rounded-[30px] p-6 space-y-4">
          <h3 className="font-black text-lg flex items-center gap-2"><TrendingUp className="text-brand-gold" size={20} /> ملخص المبيعات</h3>
          {loadingAnalytics ? (
            <div className="text-brand-gold animate-pulse text-sm">جاري التحميل...</div>
          ) : analytics ? (
            <>
              <div className="bg-white/5 p-4 rounded-2xl">
                <p className="text-xs text-gray-500 mb-1">إجمالي المبيعات</p>
                <p className="text-2xl font-black text-brand-gold">{(analytics.totalSales || 0).toFixed(3)} <span className="text-xs">د.ب</span></p>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl">
                <p className="text-xs text-gray-500 mb-1">صافي الربح</p>
                <p className={`text-2xl font-black ${(analytics.totalProfit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {(analytics.totalProfit || 0).toFixed(3)} <span className="text-xs">د.ب</span>
                </p>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl">
                <p className="text-xs text-gray-500 mb-1">عدد الطلبات</p>
                <p className="text-2xl font-black text-white">{analytics.count || 0}</p>
              </div>
            </>
          ) : null}
        </div>

        <div className="bg-brand-navy border border-white/5 rounded-[30px] p-6 lg:col-span-2">
          <h3 className="font-black text-lg flex items-center gap-2 mb-4"><PieChart className="text-brand-orange" size={20} /> أعلى المنتجات مبيعاً</h3>
          <div className="space-y-3 max-h-[260px] overflow-y-auto">
            {loadingAnalytics ? (
              <div className="h-full flex items-center justify-center text-brand-gold animate-pulse">جاري التحليل...</div>
            ) : analytics && analytics.topProducts.length > 0 ? (
              analytics.topProducts.map((p: any, idx: number) => (
                <div key={p.name} className="flex items-center justify-between bg-white/5 p-4 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <span className="w-8 h-8 rounded-full bg-brand-black flex items-center justify-center font-bold text-gray-400 text-xs">{idx + 1}</span>
                    <div>
                      <p className="font-bold text-white">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.count || 0} عنصر مباع</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-brand-gold">{(p.sales || 0).toFixed(3)} د.ب</p>
                    <p className="text-xs text-green-500">الربح: {(p.profit || 0).toFixed(3)} د.ب</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-gray-500">لا توجد بيانات</div>
            )}
          </div>
        </div>
      </div>

      {/* Printable area */}
      <div ref={printRef}>
        <style type="text/css" media="print">{`
          @page { size: A4 landscape; margin: 10mm; }
          body { font-family: Arial, sans-serif; background: white !important; color: black !important; }
          .print\\:hidden { display: none !important; }
        `}</style>

        {/* Print Header */}
        <div className="hidden print:block text-center mb-6 border-b-2 border-gray-300 pb-4">
          <h1 className="text-2xl font-black">Devite System — سجل المبيعات والتقارير</h1>
          <p className="text-sm text-gray-600 mt-1">
            الفترة: {periodLabel} &nbsp;|&nbsp;
            إجمالي المبيعات: {(analytics?.totalSales || 0).toFixed(3)} د.ب &nbsp;|&nbsp;
            الربح: {(analytics?.totalProfit || 0).toFixed(3)} د.ب &nbsp;|&nbsp;
            عدد الطلبات: {analytics?.count || 0}
          </p>
          {analytics?.topProducts && analytics.topProducts.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 justify-center text-xs">
              {analytics.topProducts.slice(0, 5).map((p: any, i: number) => (
                <span key={p.name} className="border border-gray-300 rounded px-2 py-1">
                  {i + 1}. {p.name} — {(p.sales || 0).toFixed(3)} د.ب ({p.count} مبيع)
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Print-only full table */}
        <table className="w-full text-right text-sm border-collapse hidden print:table">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-300">
              <th className="p-3 border border-gray-200">التاريخ</th>
              <th className="p-3 border border-gray-200">#</th>
              <th className="p-3 border border-gray-200">الأصناف</th>
              <th className="p-3 border border-gray-200">العميل</th>
              <th className="p-3 border border-gray-200">طريقة الدفع</th>
              <th className="p-3 border border-gray-200 font-bold">الإجمالي (د.ب)</th>
              <th className="p-3 border border-gray-200">الكاشير</th>
            </tr>
          </thead>
          <tbody>
            {printSalesList.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-gray-400">لا توجد بيانات</td></tr>
            ) : printSalesList.map((order: any) => (
              <tr key={order.id} className="border-b border-gray-100">
                <td className="p-2 border border-gray-200 whitespace-nowrap text-xs">
                  <div>{new Date(order.createdAt).toLocaleDateString('ar-SA')}</div>
                  <div className="text-gray-400 text-[10px]">{new Date(order.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</div>
                </td>
                <td className="p-2 border border-gray-200 text-center font-bold text-xs">#{order.orderNumber}</td>
                <td className="p-2 border border-gray-200 text-xs">
                  {order.items?.map((it: any, i: number) => (
                    <div key={i}>{it.product?.name} × {it.quantity} ({(it.price * it.quantity).toFixed(3)} د.ب)</div>
                  ))}
                </td>
                <td className="p-2 border border-gray-200 text-xs">{order.customerName || 'عميل عام'}</td>
                <td className="p-2 border border-gray-200 text-xs text-center">{order.paymentMethod}</td>
                <td className="p-2 border border-gray-200 font-black text-center">{order.total.toFixed(3)}</td>
                <td className="p-2 border border-gray-200 text-xs">{order.cashierName || 'النظام'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-black border-t-2 border-gray-300">
              <td colSpan={5} className="p-3 border border-gray-200">الإجمالي الكلي ({printSalesList.length} طلب)</td>
              <td className="p-3 border border-gray-200 text-center">
                {printSalesList.reduce((s: number, o: any) => s + o.total, 0).toFixed(3)} د.ب
              </td>
              <td className="border border-gray-200"></td>
            </tr>
          </tfoot>
        </table>

        {/* Screen Sales Log Table */}
        <div className="bg-brand-navy border border-white/5 rounded-[30px] overflow-hidden print:hidden">
          <div className="p-5 border-b border-white/5 bg-brand-navy-light/30 flex justify-between items-center">
            <h3 className="font-black text-lg flex items-center gap-2">
              <FileText className="text-brand-orange" size={20} /> سجل الطلبات المفصل
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">{salesList?.length || 0} طلب في هذه الصفحة</span>
              <button onClick={() => { setPage(1); refetchSales(); }} className="p-2 text-gray-400 hover:text-white bg-white/5 rounded-xl transition-colors">
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-white/5 text-gray-400 text-xs border-b border-white/5">
                <tr>
                  <th className="p-4">التاريخ ورقم الطلب</th>
                  <th className="p-4">الأصناف والتفاصيل</th>
                  <th className="p-4">العميل</th>
                  <th className="p-4">طريقة الدفع</th>
                  <th className="p-4 text-brand-gold">الإجمالي</th>
                  <th className="p-4">الكاشير</th>
                  {isAdminOrManager && <th className="p-4 text-center">تعديل</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loadingSales ? (
                  <tr><td colSpan={7} className="p-8 text-center text-brand-gold animate-pulse">جاري جلب السجلات...</td></tr>
                ) : !salesList || salesList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-gray-500">
                      <FileText size={48} className="mx-auto mb-4 opacity-20" />
                      لا توجد طلبات مسجلة لهذه الفترة
                    </td>
                  </tr>
                ) : (
                  salesList.map((order: any) => (
                    <tr key={order.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="p-4 whitespace-nowrap">
                        <div className="text-white font-medium text-xs">{new Date(order.createdAt).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                        <div className="text-[10px] text-gray-500">{new Date(order.createdAt).toLocaleTimeString('ar-SA')}</div>
                        <div className="text-[10px] text-brand-orange mt-1 font-bold">#{order.orderNumber}</div>
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
                        <div className="text-gray-300 text-xs">{order.customerName || "عميل عام"}</div>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1.5 rounded-xl text-xs border font-bold flex items-center gap-1.5 w-max ${paymentColor(order.paymentMethod)}`}>
                          {paymentIcon(order.paymentMethod)}
                          {order.paymentMethod}
                        </span>
                      </td>
                      <td className="p-4 font-black text-brand-gold text-base whitespace-nowrap">
                        {order.total.toFixed(3)} د.ب
                      </td>
                      <td className="p-4">
                        <div className="text-gray-300 text-xs">👤 {order.cashierName || 'النظام'}</div>
                      </td>
                      {isAdminOrManager && (
                        <td className="p-4 text-center">
                          <button onClick={() => openEdit(order)}
                            className="p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-all opacity-0 group-hover:opacity-100"
                            title="تعديل الطلب">
                            <Edit2 size={15} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex justify-between items-center p-4 border-t border-white/5 bg-brand-navy-light/10">
              <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="px-4 py-2 bg-white/5 rounded-xl disabled:opacity-50 text-white text-xs">السابق</button>
              <span className="text-sm text-gray-400">صفحة {page} من {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-4 py-2 bg-white/5 rounded-xl disabled:opacity-50 text-white text-xs">التالي</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
