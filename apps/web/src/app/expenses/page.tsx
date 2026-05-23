"use client";

import { useState } from "react";
import { trpc } from "../utils/trpc";
import { 
  TrendingDown, Plus, Sparkles, DollarSign, Tag, Image, 
  Calendar, FileText, Loader2, AlertCircle, ShoppingBag 
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

const CATEGORIES = ["مواد خام", "صيانة", "تسويق", "طاقة وبترول", "رواتب", "طوارئ", "إيجار ورسوم", "أخرى"];
const PAYMENT_METHODS = ["CASH", "CARD", "ONLINE"];
const ACCOUNTS = ["الخزينة الرئيسية", "حساب البنك", "العهدة اليومية"];

const COLORS = ["#FF6B6B", "#4D96FF", "#6BCB77", "#FFD93D", "#9B5DE5", "#F15BB5", "#00F5D4", "#7F8C8D"];

export default function ExpensesPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [purpose, setPurpose] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("0");
  const [totalPrice, setTotalPrice] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [accountPaidFrom, setAccountPaidFrom] = useState(ACCOUNTS[0]);
  const [accountId, setAccountId] = useState("");
  const [inventoryItemId, setInventoryItemId] = useState("");
  const [supplier, setSupplier] = useState("");
  const [receiptBase64, setReceiptBase64] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const utils = trpc.useContext();
  const { data: expensesList, isLoading: loadingExpenses } = trpc.getDetailedExpenses.useQuery();
  const { data: analytics, isLoading: loadingAnalytics } = trpc.getExpenseAnalytics.useQuery();
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
    setAccountPaidFrom(ACCOUNTS[0]);
    setAccountId("");
    setInventoryItemId("");
    setSupplier("");
    setReceiptBase64(null);
  };

  const handleTotalChange = (val: string) => {
    setTotalPrice(val);
    const numVal = Number(val);
    const qty = Number(quantity);
    if (numVal > 0 && qty > 0) {
      setUnitPrice((numVal / qty).toFixed(3));
    }
  };

  const handleQuantityChange = (val: string) => {
    setQuantity(val);
    const qty = Number(val);
    const total = Number(totalPrice);
    if (qty > 0 && total > 0) {
      setUnitPrice((total / qty).toFixed(3));
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      
      // Upload via backend /upload REST API
      try {
        const uploadUrl = typeof window !== "undefined" ? `http://${window.location.hostname}:4000/upload` : "http://127.0.0.1:4000/upload";
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64 })
        });
        const data = await response.json();
        if (data.url) {
          setReceiptBase64(data.url);
        } else {
          alert("فشل رفع الصورة");
        }
      } catch (err) {
        console.error(err);
        alert("فشل الاتصال بالخادم لرفع الفاتورة");
      } finally {
        setUploadingImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(quantity);
    const total = Number(totalPrice);
    if (isNaN(qty) || qty <= 0 || isNaN(total) || total < 0) {
      alert("يرجى إدخال قيم صالحة للكمية والمبلغ الإجمالي");
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
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-black text-brand-orange">المصروفات والتحليلات المالية</h1>
          <p className="text-gray-400 text-sm mt-1">
            تسجيل المصاريف اليومية وتصنيفها وتحليل مسارات الصرف الذكية لتقليل الهدر
          </p>
        </div>
        <div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-brand-orange hover:bg-brand-orange/90 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-brand-orange/20 flex items-center gap-2 text-sm"
          >
            <Plus size={16} />
            تسجيل مصروف جديد
          </button>
        </div>
      </div>

      {/* Analytics Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Total expenses & highest expense cards */}
        <div className="space-y-6">
          <div className="bg-brand-navy p-6 rounded-2xl border border-white/5 flex items-center justify-between shadow-lg">
            <div>
              <span className="text-xs text-gray-400 font-bold block mb-1">إجمالي المصروفات</span>
              <span className="text-3xl font-black text-white font-mono">
                {analytics?.total.toFixed(3) || "0.000"} د.ب
              </span>
            </div>
            <div className="bg-red-500/10 p-4 rounded-xl text-red-500">
              <TrendingDown size={28} />
            </div>
          </div>

          <div className="bg-brand-navy p-6 rounded-2xl border border-white/5 flex items-center justify-between shadow-lg">
            <div>
              <span className="text-xs text-gray-400 font-bold block mb-1">أعلى بند صرف</span>
              <span className="text-lg font-black text-white truncate max-w-[200px] block">
                {analytics?.highestExpense || "غير متوفر"}
              </span>
            </div>
            <div className="bg-brand-orange/10 p-4 rounded-xl text-brand-orange">
              <DollarSign size={28} />
            </div>
          </div>

          <div className="bg-brand-navy p-6 rounded-2xl border border-white/5 flex items-center justify-between shadow-lg">
            <div>
              <span className="text-xs text-gray-400 font-bold block mb-1">المورد الأكثر تعاملاً</span>
              <span className="text-lg font-black text-white block">
                {analytics?.topSupplier || "غير متوفر"}
              </span>
            </div>
            <div className="bg-blue-500/10 p-4 rounded-xl text-blue-500">
              <ShoppingBag size={28} />
            </div>
          </div>
        </div>

        {/* Charts & suggestions */}
        <div className="bg-brand-navy p-6 rounded-2xl border border-white/5 lg:col-span-2 flex flex-col justify-between shadow-lg">
          <h3 className="text-base font-black text-white mb-4 flex items-center gap-2">
            <Sparkles className="text-brand-orange" size={18} />
            تحليلات الصرف ومقترحات خفض التكلفة
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Pie Chart */}
            <div className="h-[200px] relative">
              {loadingAnalytics ? (
                <div className="h-full flex items-center justify-center text-gray-500 text-xs">جاري التحميل...</div>
              ) : analytics?.categoryStats.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500 text-xs">لا تتوفر بيانات رسم بياني</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics?.categoryStats}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {analytics?.categoryStats.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${Number(value).toFixed(3)} د.ب`} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Suggestions & Legend */}
            <div className="space-y-4">
              <div className="max-h-[120px] overflow-y-auto space-y-2 pr-2 text-xs">
                {analytics?.categoryStats.map((item: any, idx: number) => (
                  <div key={item.name} className="flex items-center justify-between text-gray-300">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                      <span>{item.name}</span>
                    </div>
                    <span className="font-bold">{item.percentage}%</span>
                  </div>
                ))}
              </div>

              {/* Suggestions */}
              <div className="bg-white/5 border border-white/5 p-3 rounded-xl space-y-2">
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">مقترحات النظام الذكي:</div>
                <ul className="text-xs text-brand-orange space-y-1 pl-4 list-disc">
                  {analytics?.recommendations.map((rec: string, index: number) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Expense Form Drawer */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-brand-navy border border-white/5 p-6 rounded-2xl space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <div className="border-b border-white/5 pb-4">
            <h3 className="text-lg font-black text-brand-orange">تسجيل معاملة مصروف جديدة</h3>
            <p className="text-xs text-gray-400">إدخال البيانات والمواصفات الكاملة لتتبع الفاتورة</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold">التصنيف المالي</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-orange text-sm"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold">اسم المورد</label>
              <input
                type="text"
                placeholder="مثال: شركة الخليج للتوريدات"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-orange text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold">الغرض من الصرف</label>
              <input
                type="text"
                placeholder="مثال: شراء بن هندي محمص"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-orange text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold">الكمية</label>
              <input
                type="number"
                min="0.1"
                step="any"
                value={quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-orange text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold">إجمالي المبلغ المدفوع (د.ب)</label>
              <input
                type="number"
                min="0"
                step="0.001"
                value={totalPrice}
                onChange={(e) => handleTotalChange(e.target.value)}
                className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-orange text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold">سعر الوحدة (تلقائي)</label>
              <div className="w-full bg-brand-black border border-white/5 rounded-xl px-4 py-3 text-lg font-black text-brand-orange font-mono">
                {unitPrice} د.ب
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold">طريقة الدفع</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-orange text-sm"
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold">الدفع من حساب مالي (اختياري)</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-orange text-sm"
              >
                <option value="">بدون حساب محدد (خزينة عامة)</option>
                {accountsList?.map((acc) => (
                  <option key={acc.id} value={acc.id}>{acc.name} - رصيد: {acc.balance} د.ب</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold">ربط بعنصر مخزون (اختياري)</label>
              <select
                value={inventoryItemId}
                onChange={(e) => setInventoryItemId(e.target.value)}
                className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-orange text-sm"
              >
                <option value="">لا يوجد ارتباط بمخزون</option>
                {inventoryList?.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              <p className="text-[9px] text-gray-500 mt-1">سيتم زيادة كمية المخزون تلقائياً عند الحفظ</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold">مرفق الفاتورة (صورة/ملف)</label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="receipt-upload"
                />
                <label
                  htmlFor="receipt-upload"
                  className="bg-brand-black border border-white/10 hover:border-brand-orange rounded-xl px-4 py-3 text-gray-400 text-xs font-bold cursor-pointer flex items-center gap-2 hover:text-white transition-all flex-1"
                >
                  <Image size={14} className="text-brand-orange" />
                  {uploadingImage ? "جاري الرفع..." : "اختر صورة الفاتورة"}
                </label>
                {receiptBase64 && (
                  <a
                    href={receiptBase64}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-brand-orange hover:underline font-bold bg-white/5 p-3.5 rounded-xl border border-white/5"
                  >
                    معاينة
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-gray-400 font-bold">وصف وتفاصيل إضافية</label>
            <textarea
              placeholder="اكتب أي ملاحظات أو تفاصيل إضافية هنا..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-orange text-sm min-h-[80px]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4">
            <button
              type="button"
              onClick={resetForm}
              className="bg-white/5 hover:bg-white/10 text-white font-bold py-3 px-5 rounded-xl text-sm transition-all"
            >
              إعادة تهيئة
            </button>
            <button
              type="submit"
              disabled={addExpenseMutation.isLoading || uploadingImage}
              className="bg-brand-orange hover:bg-brand-orange/90 text-white font-bold py-3 px-6 rounded-xl text-sm transition-all flex items-center gap-2 shadow-lg shadow-brand-orange/20"
            >
              {addExpenseMutation.isLoading && <Loader2 className="animate-spin" size={16} />}
              تسجيل المعاملة
            </button>
          </div>
        </form>
      )}

      {/* Expenses List Table */}
      <div className="bg-brand-navy border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-brand-navy/80">
          <h3 className="font-black text-lg flex items-center gap-2">
            <FileText className="text-brand-orange" size={18} />
            سجل حركة المصروفات التفصيلي
          </h3>
          <span className="text-xs text-gray-400">الإجمالي: {expensesList?.length || 0} معاملة</span>
        </div>

        {loadingExpenses ? (
          <div className="p-20 text-center text-brand-orange flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin" size={40} />
            <span className="text-gray-400 animate-pulse text-sm">جاري تحميل سجل المصاريف...</span>
          </div>
        ) : !expensesList || expensesList.length === 0 ? (
          <div className="p-20 text-center text-gray-500">
            <AlertCircle className="mx-auto text-white/20 mb-3" size={48} />
            <p className="text-sm">لم يتم تسجيل أي مصروفات تفصيلية بعد.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-white/5 text-gray-400 text-xs font-bold border-b border-white/5">
                  <th className="p-4">التاريخ</th>
                  <th className="p-4">التصنيف بند الصرف</th>
                  <th className="p-4">الغرض / التفاصيل</th>
                  <th className="p-4">المورد</th>
                  <th className="p-4">الكمية * سعر الوحدة</th>
                  <th className="p-4 font-mono">المبلغ الإجمالي</th>
                  <th className="p-4">الدفع والمسؤول</th>
                  <th className="p-4 text-center">الفاتورة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {expensesList.map((row) => (
                  <tr key={row.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 text-xs text-gray-400">
                      {new Date(row.date).toLocaleString('ar-BH')}
                    </td>
                    <td className="p-4">
                      <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase">
                        {row.category}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-white">{row.purpose || "غير محدد"}</div>
                      {row.description && <div className="text-xs text-gray-400 mt-0.5">{row.description}</div>}
                    </td>
                    <td className="p-4 text-gray-300">
                      {row.supplier || "بدون مورد"}
                    </td>
                    <td className="p-4 font-mono text-xs text-gray-400">
                      {row.quantity} وحدة × {row.unitPrice.toFixed(3)}
                    </td>
                    <td className="p-4 font-mono font-black text-red-400">
                      {row.amount.toFixed(3)} د.ب
                    </td>
                    <td className="p-4">
                      <div className="text-xs text-gray-300">{row.paymentMethod} - {row.accountPaidFrom || "الخزينة"}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">بواسطة: {row.recordedBy?.name || "النظام"}</div>
                    </td>
                    <td className="p-4 text-center">
                      {row.receiptUrl ? (
                        <a
                          href={row.receiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-white/5 hover:bg-brand-orange hover:text-white border border-white/5 text-brand-orange font-bold px-3 py-1.5 rounded-lg text-xs transition-all"
                        >
                          عرض الفاتورة
                        </a>
                      ) : (
                        <span className="text-gray-600 text-xs">لا يوجد مرفق</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
