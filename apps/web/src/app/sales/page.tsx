"use client";

import { useState } from "react";
import { trpc } from "../../utils/trpc";
import { 
  TrendingUp, Calendar, FileText, Loader2, AlertCircle, ShoppingCart, 
  DollarSign, CreditCard, Activity, PieChart, Edit2, X, Check, RefreshCw,
  ArrowRightLeft
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

  const userRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;
  const isAdminOrManager = userRole === 'ADMIN' || userRole === 'MANAGER';

  const queryParams = { filterType, ...(filterType === 'custom' ? { startDate, endDate } : {}) };
  
  const { data: salesList, isLoading: loadingSales, refetch: refetchSales } = trpc.getDetailedSalesLog.useQuery(queryParams);
  const { data: analytics, isLoading: loadingAnalytics } = trpc.getSalesAnalytics.useQuery(queryParams);
  const { data: accounts } = trpc.getAccounts.useQuery();
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

  const openEdit = (order: any) => {
    setEditingOrder(order);
    setEditTotal(order.total.toFixed(3));
    setEditPayment(order.paymentMethod || 'CASH');
    setEditFromAccount('');
    setEditToAccount('');
  };

  const saveEdit = () => {
    const newTotal = parseFloat(editTotal);
    if (isNaN(newTotal) || newTotal < 0) {
      alert("يرجى إدخال مبلغ صحيح");
      return;
    }
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
              {/* Order Summary */}
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

              {/* New Total */}
              <div>
                <label className="text-sm text-gray-400 font-bold block mb-2">💰 المبلغ الإجمالي الجديد (د.ب)</label>
                <input
                  type="number"
                  step="0.001"
                  value={editTotal}
                  onChange={e => setEditTotal(e.target.value)}
                  className="w-full bg-brand-black border border-brand-gold/30 rounded-xl px-4 py-3 text-white text-lg font-bold focus:outline-none focus:border-brand-gold"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-sm text-gray-400 font-bold block mb-2">💳 طريقة الدفع الجديدة</label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map(pm => (
                    <button
                      key={pm}
                      onClick={() => setEditPayment(pm)}
                      className={`py-2.5 rounded-xl text-sm font-bold border transition-all flex items-center justify-center gap-2 ${
                        editPayment === pm ? 'bg-brand-gold text-black border-brand-gold' : 'bg-brand-black border-white/10 text-gray-400 hover:border-white/30'
                      }`}
                    >
                      {paymentIcon(pm)} {pm}
                    </button>
                  ))}
                </div>
              </div>

              {/* Account Transfer */}
              {accounts && accounts.length > 0 && editPayment !== editingOrder.paymentMethod && (
                <div className="bg-brand-orange/5 border border-brand-orange/20 rounded-2xl p-4 space-y-3">
                  <p className="text-xs text-brand-orange font-bold flex items-center gap-2">
                    <ArrowRightLeft size={14} /> تحويل مالي بين الحسابات (اختياري)
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">خصم من حساب</label>
                      <select
                        value={editFromAccount}
                        onChange={e => setEditFromAccount(e.target.value)}
                        className="w-full bg-brand-black border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
                      >
                        <option value="">— اختر —</option>
                        {accounts.map((a: any) => (
                          <option key={a.id} value={a.id}>{a.name} ({Number(a.balance).toFixed(3)})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">أضف إلى حساب</label>
                      <select
                        value={editToAccount}
                        onChange={e => setEditToAccount(e.target.value)}
                        className="w-full bg-brand-black border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
                      >
                        <option value="">— اختر —</option>
                        {accounts.map((a: any) => (
                          <option key={a.id} value={a.id}>{a.name} ({Number(a.balance).toFixed(3)})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {editFromAccount && editToAccount && (
                    <p className="text-xs text-green-400">
                      ✓ سيتم خصم {parseFloat(editTotal).toFixed(3)} د.ب من "{accounts.find((a: any) => a.id === editFromAccount)?.name}" 
                      وإضافتها إلى "{accounts.find((a: any) => a.id === editToAccount)?.name}"
                    </p>
                  )}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={saveEdit}
                  disabled={updateMutation.isLoading}
                  className="flex-1 bg-brand-gold text-black font-black py-3 rounded-xl hover:bg-brand-gold/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {updateMutation.isLoading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                  حفظ التعديلات
                </button>
                <button
                  onClick={() => setEditingOrder(null)}
                  className="flex-1 bg-white/5 text-gray-400 font-bold py-3 rounded-xl hover:bg-white/10 transition-colors"
                >
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
        <div className="flex gap-2 flex-wrap">
          {['daily', 'weekly', 'monthly', 'custom', 'all'].map(f => (
            <button key={f} onClick={() => setFilterType(f)}
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Analytics Summary */}
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

        {/* Top Products */}
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

      {/* Sales Log Table */}
      <div className="bg-brand-navy border border-white/5 rounded-[30px] overflow-hidden">
        <div className="p-5 border-b border-white/5 bg-brand-navy-light/30 flex justify-between items-center">
          <h3 className="font-black text-lg flex items-center gap-2">
            <FileText className="text-brand-orange" size={20} /> سجل الطلبات المفصل
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">{salesList?.length || 0} طلب مسجل</span>
            <button onClick={() => refetchSales()} className="p-2 text-gray-400 hover:text-white bg-white/5 rounded-xl transition-colors">
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
                        <button
                          onClick={() => openEdit(order)}
                          className="p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-all opacity-0 group-hover:opacity-100"
                          title="تعديل الطلب"
                        >
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
      </div>
    </div>
  );
}
