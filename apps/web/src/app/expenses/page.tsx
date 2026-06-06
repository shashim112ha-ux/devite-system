"use client";

import { useState } from "react";
import { trpc } from "../../utils/trpc";
import { 
  TrendingDown, Plus, Sparkles, DollarSign, Tag, Image, 
  Calendar, FileText, Loader2, AlertCircle, ShoppingBag, Wallet, PieChart as PieChartIcon 
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

const CATEGORIES = ["المواد الخام", "التشغيل", "الرواتب", "الصيانة والخدمات", "الإيجار", "الكهرباء", "التسويق والإعلان", "أخرى"];
const PAYMENT_METHODS = ["CASH", "CARD", "ONLINE", "BENEFIT"];

const COLORS = ["#FF6B6B", "#4D96FF", "#6BCB77", "#FFD93D", "#9B5DE5", "#F15BB5", "#00F5D4", "#7F8C8D"];

export default function ExpensesPage() {
  const [filterType, setFilterType] = useState('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [purpose, setPurpose] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("0");
  const [totalPrice, setTotalPrice] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [accountPaidFrom, setAccountPaidFrom] = useState("كاش");
  const [accountId, setAccountId] = useState("");
  const [inventoryItemId, setInventoryItemId] = useState("");
  const [supplier, setSupplier] = useState("");
  const [receiptBase64, setReceiptBase64] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const userRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;
  const isAdminOrManager = userRole === 'ADMIN' || userRole === 'MANAGER';

  const utils = trpc.useContext();
  
  const queryParams = { filterType, ...(filterType === 'custom' ? { startDate, endDate } : {}) };
  
  const { data: expensesList, isLoading: loadingExpenses } = trpc.getDetailedExpenses.useQuery(queryParams);
  const { data: analytics, isLoading: loadingAnalytics } = trpc.getExpenseAnalytics.useQuery(queryParams);
  
  const { data: accountsList } = trpc.getAccounts.useQuery();
  const { data: inventoryList } = trpc.getInventory.useQuery();

  const addExpenseMutation = trpc.createDetailedExpense.useMutation({
    onSuccess: () => {
      utils.getDetailedExpenses.invalidate();
      utils.getExpenseAnalytics.invalidate();
      setShowAddForm(false);
      resetForm();
      alert("تم تسجيل المصروف بنجاح!");
    },
    onError: (err) => alert(`خطأ: ${err.message}`)
  });

  const resetForm = () => {
    setCategory(CATEGORIES[0]);
    setDescription("");
    setPurpose("");
    setQuantity("1");
    setUnitPrice("0");
    setTotalPrice("0");
    setPaymentMethod(PAYMENT_METHODS[0]);
    setAccountPaidFrom("كاش");
    setAccountId("");
    setInventoryItemId("");
    setSupplier("");
    setReceiptBase64(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    const reader = new FileReader();
    reader.onload = () => {
      setReceiptBase64(reader.result as string);
      setUploadingImage(false);
    };
    reader.readAsDataURL(file);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(quantity);
    const total = Number(totalPrice);
    if (isNaN(qty) || qty <= 0 || isNaN(total) || total < 0) {
      alert("يرجى إدخال قيم صحيحة للكمية والمبلغ الإجمالي");
      return;
    }
    const calculatedUnitPrice = total / qty;
    
    addExpenseMutation.mutate({
      category,
      amount: total,
      description: description || undefined,
      supplier: supplier || undefined,
      receiptUrl: receiptBase64 || undefined,
      purpose: purpose || undefined,
      quantity: qty,
      unitPrice: calculatedUnitPrice,
      paymentMethod,
      accountPaidFrom: accountsList?.find(a => a.id === accountId)?.name || accountPaidFrom,
      accountId: accountId || undefined,
      inventoryItemId: inventoryItemId || undefined
    });
  };

  return (
    <div className="p-8 space-y-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-black text-brand-orange">سجل المصروفات المتقدم</h1>
          <p className="text-gray-400 text-sm mt-1">
            إدارة وتتبع ومراقبة جميع مدفوعات ومصروفات النظام
          </p>
        </div>
        <div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-brand-orange hover:bg-brand-orange/90 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-brand-orange/20 flex items-center gap-2 text-sm"
          >
            <Plus size={16} />
            إضافة مصروف جديد
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-brand-navy-light/40 border border-white/5 rounded-2xl p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-brand-gold"><Calendar size={20} /> تصفية السجل</h3>
        <div className="flex flex-wrap gap-4 items-center">
          {['daily', 'weekly', 'monthly', 'all', 'custom'].map(type => (
            <button 
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${filterType === type ? 'bg-brand-orange text-black' : 'bg-brand-black border border-white/10 text-gray-400 hover:text-white'}`}
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

      {/* Form Overlay */}
      {showAddForm && (
        <div className="bg-brand-navy border border-white/10 p-6 rounded-[30px] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-orange to-brand-gold"></div>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <DollarSign className="text-brand-orange" />
            تسجيل مصروف جديد
          </h2>
          
          <form onSubmit={handleAddSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              <div className="space-y-2">
                <label className="text-sm text-gray-400">التصنيف الأساسي</label>
                <div className="relative">
                  <Tag className="absolute right-3 top-3.5 text-gray-500" size={16} />
                  <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-brand-black/50 border border-white/10 rounded-xl p-3 pr-10 text-white outline-none focus:border-brand-orange">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-400">الغرض (اختياري)</label>
                <input type="text" placeholder="مثال: شراء قهوة للمكتب" value={purpose} onChange={e => setPurpose(e.target.value)} className="w-full bg-brand-black/50 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand-orange" />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-400">المورد / المحل (اختياري)</label>
                <div className="relative">
                  <ShoppingBag className="absolute right-3 top-3.5 text-gray-500" size={16} />
                  <input type="text" placeholder="مثال: مكتبة جرير" value={supplier} onChange={e => setSupplier(e.target.value)} className="w-full bg-brand-black/50 border border-white/10 rounded-xl p-3 pr-10 text-white outline-none focus:border-brand-orange" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-400">الكمية</label>
                <input type="number" step="0.01" min="0" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full bg-brand-black/50 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand-orange" required />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-brand-gold font-bold">المبلغ الإجمالي (د.ب)</label>
                <input type="number" step="0.001" min="0" value={totalPrice} onChange={e => setTotalPrice(e.target.value)} className="w-full bg-brand-black border border-brand-gold/30 rounded-xl p-3 text-brand-gold font-bold text-lg outline-none focus:border-brand-gold" required />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-400">طريقة الدفع</label>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full bg-brand-black/50 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand-orange">
                  {PAYMENT_METHODS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="space-y-2 lg:col-span-2">
                <label className="text-sm text-gray-400">حساب الدفع (من أين تم الصرف؟)</label>
                <select value={accountId} onChange={e => {
                  setAccountId(e.target.value);
                  if (e.target.value === "") setAccountPaidFrom("كاش");
                }} className="w-full bg-brand-black/50 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand-orange">
                  <option value="">دفع نقدي حر (كاش)</option>
                  {accountsList?.map((a: any) => <option key={a.id} value={a.id}>{a.name} ({a.balance} د.ب)</option>)}
                </select>
              </div>

              <div className="space-y-2 lg:col-span-3">
                <label className="text-sm text-gray-400">تفاصيل إضافية وملاحظات</label>
                <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-brand-black/50 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand-orange" placeholder="ملاحظات تفصيلية..." />
              </div>

              <div className="space-y-2 lg:col-span-3 border border-dashed border-white/20 p-6 rounded-2xl bg-brand-black/30 text-center">
                <input type="file" id="receipt" accept="image/*" onChange={handleImageUpload} className="hidden" />
                <label htmlFor="receipt" className="cursor-pointer inline-flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-brand-orange hover:bg-brand-orange/10 transition-all">
                    {uploadingImage ? <Loader2 className="animate-spin" /> : <Image size={32} />}
                  </div>
                  <span className="text-sm text-gray-400">{receiptBase64 ? "تم إرفاق الصورة ✔️ (اضغط للتغيير)" : "إرفاق صورة الفاتورة (اختياري)"}</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-white/5">
              <button type="button" onClick={() => setShowAddForm(false)} className="px-6 py-3 rounded-xl font-bold text-gray-400 hover:text-white transition-colors">
                إلغاء
              </button>
              <button type="submit" disabled={addExpenseMutation.isLoading || uploadingImage} className="bg-brand-orange hover:bg-brand-orange/90 text-black font-black py-3 px-8 rounded-xl transition-all disabled:opacity-50 flex items-center gap-2">
                {addExpenseMutation.isLoading ? <Loader2 className="animate-spin" size={20} /> : "تسجيل واعتماد المصروف"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Analytics Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Total expenses & highest expense cards */}
        <div className="space-y-6">
          <div className="bg-brand-navy-light/60 p-6 rounded-[30px] border border-white/5 flex flex-col justify-center items-center shadow-lg text-center h-[180px]">
             <div className="w-12 h-12 bg-brand-orange/20 text-brand-orange rounded-full flex items-center justify-center mb-3">
                <Wallet size={24} />
             </div>
             <p className="text-sm text-gray-400 font-bold mb-1">إجمالي المصروفات ({filterType === 'all' ? 'الكل' : 'للفترة المحددة'})</p>
             <h2 className="text-4xl font-black text-white">{analytics?.total ? analytics.total.toFixed(3) : "0.000"} د.ب</h2>
          </div>

          <div className="bg-brand-navy-light/60 p-6 rounded-[30px] border border-white/5 shadow-lg min-h-[180px]">
             <h3 className="text-sm font-bold text-gray-400 mb-4 flex items-center gap-2">
                <AlertCircle size={16} className="text-red-500" />
                أعلى منصرف
             </h3>
             {analytics?.highestExpense ? (
               <div>
                  <p className="text-2xl font-black text-white">{analytics.highestExpense.amount.toFixed(3)} د.ب</p>
                  <p className="text-brand-orange font-bold mt-1">{analytics.highestExpense.category}</p>
                  <p className="text-xs text-gray-500 mt-2 line-clamp-2">{analytics.highestExpense.description || analytics.highestExpense.purpose || "لا يوجد وصف"}</p>
                  <p className="text-xs text-gray-400 mt-2">{new Date(analytics.highestExpense.date).toLocaleDateString('ar-SA')}</p>
               </div>
             ) : (
               <p className="text-gray-500 text-sm">لا توجد مصروفات</p>
             )}
          </div>
        </div>

        {/* Categories Chart */}
        <div className="bg-brand-navy-light/40 p-6 rounded-[30px] border border-white/5 lg:col-span-2 shadow-lg flex flex-col">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <PieChartIcon size={20} className="text-brand-gold" />
            توزيع المصروفات
          </h3>
          <div className="flex-1 min-h-[250px]">
            {loadingAnalytics ? (
              <div className="h-full flex items-center justify-center text-brand-gold animate-pulse">جاري التحليل...</div>
            ) : analytics && analytics.categoryStats.length > 0 ? (
              <div className="flex flex-col md:flex-row h-full items-center">
                <div className="w-full md:w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.categoryStats}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {analytics.categoryStats.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(val: number) => `${val.toFixed(3)} د.ب`}
                        contentStyle={{ backgroundColor: '#0a192f', border: 'none', borderRadius: '10px', color: 'white' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full md:w-1/2 flex flex-col justify-center space-y-3 p-4">
                  {analytics.categoryStats.map((stat: any, index: number) => (
                    <div key={stat.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                        <span className="text-sm text-gray-300">{stat.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-bold">{stat.value.toFixed(3)} د.ب</span>
                        <span className="text-xs text-gray-500 w-8 text-left">{stat.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">لا توجد بيانات مخطط</div>
            )}
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-brand-navy border border-white/5 rounded-[30px] overflow-hidden shadow-xl">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-brand-navy-light/30">
          <h2 className="text-xl font-bold flex items-center gap-3">
            <FileText className="text-brand-orange" /> السجل الكامل للمصروفات
          </h2>
          <span className="bg-white/5 px-4 py-2 rounded-lg text-sm text-gray-400 font-bold tracking-widest">{analytics?.count || 0} عملية مسجلة</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-brand-black/40 text-gray-400 text-xs tracking-wider border-b border-white/5">
              <tr>
                <th className="p-4 pl-0 font-medium whitespace-nowrap">التاريخ</th>
                <th className="p-4 font-medium">الغرض / المورد</th>
                <th className="p-4 font-medium">التصنيف</th>
                <th className="p-4 font-medium">السعر (الكمية)</th>
                <th className="p-4 font-bold text-brand-gold">الإجمالي</th>
                <th className="p-4 font-medium">الموظف / الدفع</th>
                <th className="p-4 font-medium text-center">الفاتورة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {loadingExpenses ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-brand-orange animate-pulse">جاري جلب السجلات...</td>
                </tr>
              ) : !expensesList || expensesList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-gray-500">
                    <FileText size={48} className="mx-auto mb-4 opacity-20" />
                    لا توجد مصروفات مسجلة لهذه الفترة
                  </td>
                </tr>
              ) : (
                expensesList.map((expense: any) => (
                  <tr key={expense.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-4 pl-0 whitespace-nowrap">
                      <div className="text-white font-medium">{new Date(expense.date).toLocaleDateString('ar-SA')}</div>
                      <div className="text-[10px] text-gray-500">{new Date(expense.date).toLocaleTimeString('ar-SA')}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-white font-bold">{expense.purpose || "غير محدد"}</div>
                      {expense.supplier && <div className="text-[10px] text-brand-orange font-bold mt-1">المورد: {expense.supplier}</div>}
                    </td>
                    <td className="p-4">
                      <span className="bg-white/5 text-gray-300 px-3 py-1 rounded-md text-xs border border-white/5">
                        {expense.category}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="text-gray-300">{expense.unitPrice.toFixed(3)} د.ب</div>
                      <div className="text-[10px] text-gray-500">الكمية: {expense.quantity}</div>
                    </td>
                    <td className="p-4 font-black text-brand-gold text-base whitespace-nowrap">
                      {expense.amount.toFixed(3)} د.ب
                    </td>
                    <td className="p-4">
                      <div className="text-gray-300 text-xs flex items-center gap-1">👤 {expense.recordedBy?.name || 'مجهول'}</div>
                      <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">💳 {expense.paymentMethod} ({expense.accountPaidFrom || 'كاش'})</div>
                    </td>
                    <td className="p-4 text-center">
                      {expense.receiptUrl ? (
                        <button 
                          onClick={() => {
                            const w = window.open();
                            w?.document.write(`<img src="${expense.receiptUrl}" style="max-width:100%;"/>`);
                          }}
                          className="bg-brand-orange/10 text-brand-orange p-2 rounded-lg hover:bg-brand-orange hover:text-black transition-colors inline-block"
                          title="عرض الفاتورة"
                        >
                          <Image size={16} />
                        </button>
                      ) : (
                        <span className="text-gray-600 text-xs">-</span>
                      )}
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
