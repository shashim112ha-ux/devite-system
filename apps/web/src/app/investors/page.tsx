"use client";

import { useState, useEffect } from "react";
import { trpc } from "../utils/trpc";
import { 
  Coins, Plus, DollarSign, UserPlus, TrendingUp, CreditCard, 
  PieChart as PieIcon, Users, Percent, UserCheck, ShieldAlert,
  Calendar, FileSpreadsheet, Eye, ArrowDownRight, Settings
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#ff8c00', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6', '#e74c3c'];

export default function InvestorsPage() {
  const [userRole, setUserRole] = useState("ADMIN");
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
       const userStr = localStorage.getItem('user');
       if (userStr) {
          try {
             const user = JSON.parse(userStr);
             setUserRole(user.role);
          } catch(e) {}
       }
    }
  }, []);

  const myInvestorQuery = trpc.getMyInvestorData.useQuery(undefined, {
    enabled: userRole === 'INVESTOR' || userRole === 'INVESTOR_STAFF'
  });
  const investorsQuery = trpc.getInvestors.useQuery();
  const historyQuery = trpc.getProfitDistributionHistory.useQuery();

  const addInvestorMutation = trpc.addInvestor.useMutation();
  const updateInvestorMutation = trpc.updateInvestor.useMutation();
  const withdrawMutation = trpc.withdrawInvestorCapital.useMutation();
  const distributeDeductionsMutation = trpc.distributeProfitWithDeductions.useMutation();

  const [activeTab, setActiveTab] = useState<"list" | "smart" | "history">("list");

  // Modal open states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

  // Form states: Add Investor
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [capital, setCapital] = useState("");
  const [sharePercentage, setSharePercentage] = useState("");
  const [notes, setNotes] = useState("");

  // Form states: Edit Investor
  const [selectedEditInvestor, setSelectedEditInvestor] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editCapital, setEditCapital] = useState("");
  const [editSharePercentage, setEditSharePercentage] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editNotes, setEditNotes] = useState("");

  // Form states: Withdraw
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [selectedInvestorId, setSelectedInvestorId] = useState("");

  // Form states: Smart distribution with deductions
  const [netProfit, setNetProfit] = useState("0");
  const [devDeduction, setDevDeduction] = useState("0");
  const [maintDeduction, setMaintDeduction] = useState("0");
  const [emergencyDeduction, setEmergencyDeduction] = useState("0");
  const [stockDeduction, setStockDeduction] = useState("0");
  const [marketingDeduction, setMarketingDeduction] = useState("0");

  const [viewDistributionDetail, setViewDistributionDetail] = useState<any>(null);

  const totalExistingCapital = investorsQuery.data?.reduce((sum, inv) => sum + inv.capital, 0) || 0;
  const totalExistingPercentage = investorsQuery.data?.reduce((sum, inv) => sum + inv.sharePercentage, 0) || 0;

  const handleCapitalChange = (val: string) => {
     setCapital(val);
     const numVal = Number(val);
     if (numVal > 0) {
        // Here we do a simple assumption: the percentage is relative to the *new* total capital including this investor.
        const newTotal = totalExistingCapital + numVal;
        const autoPct = (numVal / newTotal) * 100;
        setSharePercentage(autoPct.toFixed(2));
     } else {
        setSharePercentage("");
     }
  };

  const handleEditCapitalChange = (val: string) => {
     setEditCapital(val);
     const numVal = Number(val);
     const otherCapital = totalExistingCapital - (selectedEditInvestor?.capital || 0);
     if (numVal > 0) {
        const newTotal = otherCapital + numVal;
        const autoPct = (numVal / newTotal) * 100;
        setEditSharePercentage(autoPct.toFixed(2));
     } else {
        setEditSharePercentage("");
     }
  };

  const handleEditInvestorClick = (inv: any) => {
    setSelectedEditInvestor(inv);
    setEditName(inv.name);
    setEditPhone(inv.phone);
    setEditEmail(inv.email || "");
    setEditCapital(inv.capital.toString());
    setEditSharePercentage(inv.sharePercentage.toString());
    setEditIsActive(inv.isActive);
    setEditNotes(inv.notes || "");
  };

  const handleEditInvestor = async (e: React.FormEvent) => {
    e.preventDefault();
    const cap = Number(editCapital);
    const pct = Number(editSharePercentage);
    
    const otherPct = totalExistingPercentage - (selectedEditInvestor?.sharePercentage || 0);
    if (otherPct + pct > 100) {
       alert(`خطأ: مجموع النسب يتجاوز 100%. متبقي فقط ${(100 - otherPct).toFixed(2)}%`);
       return;
    }

    if (!editName || !editPhone || isNaN(cap) || cap <= 0 || isNaN(pct) || pct <= 0) {
      alert("يرجى ملء الحقول بقيم صحيحة");
      return;
    }
    try {
      await updateInvestorMutation.mutateAsync({
        id: selectedEditInvestor.id,
        name: editName,
        phone: editPhone,
        email: editEmail || undefined,
        capital: cap,
        sharePercentage: pct,
        isActive: editIsActive,
        notes: editNotes || undefined
      });
      alert("تم تعديل الشريك بنجاح");
      investorsQuery.refetch();
      setSelectedEditInvestor(null);
    } catch (e: any) {
      alert(`خطأ: ${e.message}`);
    }
  };

  const handleAddInvestor = async (e: React.FormEvent) => {
    e.preventDefault();
    const cap = Number(capital);
    const pct = Number(sharePercentage);

    if (totalExistingPercentage + pct > 100) {
       alert(`خطأ: مجموع النسب يتجاوز 100%. متبقي فقط ${(100 - totalExistingPercentage).toFixed(2)}%`);
       return;
    }

    if (!name || !phone || isNaN(cap) || cap <= 0 || isNaN(pct) || pct <= 0) {
      alert("يرجى ملء الحقول بقيم صحيحة");
      return;
    }
    try {
      await addInvestorMutation.mutateAsync({ 
        name, 
        phone, 
        email: email || undefined,
        capital: cap, 
        sharePercentage: pct,
        notes: notes || undefined
      });
      alert("تمت إضافة الشريك المستثمر بنجاح");
      investorsQuery.refetch();
      setIsAddModalOpen(false);
      setName("");
      setPhone("");
      setEmail("");
      setCapital("");
      setSharePercentage("");
      setNotes("");
    } catch (e: any) {
      alert(`خطأ: ${e.message}`);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(withdrawAmount);
    if (!selectedInvestorId || isNaN(amt) || amt <= 0) return;
    try {
      await withdrawMutation.mutateAsync({ id: selectedInvestorId, amount: amt });
      alert("تم تسجيل سحب الأرباح بنجاح");
      investorsQuery.refetch();
      setIsWithdrawModalOpen(false);
      setWithdrawAmount("");
      setSelectedInvestorId("");
    } catch (e: any) {
      alert(`خطأ: ${e.message}`);
    }
  };

  const handleSmartDistribute = async (e: React.FormEvent) => {
    e.preventDefault();
    const profit = Number(netProfit);
    const dev = Number(devDeduction);
    const maint = Number(maintDeduction);
    const emerg = Number(emergencyDeduction);
    const stock = Number(stockDeduction);
    const mark = Number(marketingDeduction);

    if (isNaN(profit) || profit <= 0) {
      alert("يرجى إدخال مبلغ ربح صافي صحيح");
      return;
    }

    const totalDeductions = dev + maint + emerg + stock + mark;
    if (totalDeductions >= profit) {
      alert("إجمالي الاستقطاعات لا يمكن أن يتجاوز صافي الربح!");
      return;
    }

    try {
      await distributeDeductionsMutation.mutateAsync({
        netProfit: profit,
        devDeduction: dev,
        maintDeduction: maint,
        emergencyDeduction: emerg,
        stockDeduction: stock,
        marketingDeduction: mark
      });
      alert("تم توزيع الأرباح الصافية بعد الاستقطاعات على حسابات الشركاء بنجاح!");
      investorsQuery.refetch();
      historyQuery.refetch();
      // Reset form
      setNetProfit("0");
      setDevDeduction("0");
      setMaintDeduction("0");
      setEmergencyDeduction("0");
      setStockDeduction("0");
      setMarketingDeduction("0");
      setActiveTab("history");
    } catch (e: any) {
      alert(`خطأ: ${e.message}`);
    }
  };

  // formatting chart
  const chartData = investorsQuery.data?.map(inv => ({
    name: inv.name,
    value: inv.sharePercentage
  })) || [];

  const calculatedTotalDeductions = Number(devDeduction) + Number(maintDeduction) + Number(emergencyDeduction) + Number(stockDeduction) + Number(marketingDeduction);
  const calculatedDistributable = Math.max(0, Number(netProfit) - calculatedTotalDeductions);

  if (userRole === 'INVESTOR' || userRole === 'INVESTOR_STAFF') {
     if (myInvestorQuery.isLoading) return <div className="p-10 text-white font-bold">جاري تحميل بياناتك...</div>;
     if (myInvestorQuery.isError) return <div className="p-10 text-red-500 font-bold">خطأ: {myInvestorQuery.error.message}</div>;

     const data = myInvestorQuery.data?.investor;
     const payouts = myInvestorQuery.data?.payouts || [];
     const totalCapital = myInvestorQuery.data?.totalCapital || 0;

     return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
           <h1 className="text-3xl font-black text-brand-orange flex items-center gap-3">
              <Coins size={36} /> شؤون المستثمرين والأرباح
           </h1>
           <p className="text-gray-400 text-sm mt-1">
              أهلاً بك {data?.name}، هذه لوحة المعلومات الخاصة بك
           </p>

           <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-brand-navy border border-white/5 p-6 rounded-2xl shadow-lg">
                 <p className="text-xs text-gray-500 mb-2 font-bold uppercase tracking-widest">رأس مالك المستثمر</p>
                 <p className="text-4xl font-black text-white">{data?.capital} <span className="text-sm font-normal text-gray-500">د.ب</span></p>
              </div>
              <div className="bg-brand-navy border border-white/5 p-6 rounded-2xl shadow-lg">
                 <p className="text-xs text-gray-500 mb-2 font-bold uppercase tracking-widest">نسبة شراكتك</p>
                 <p className="text-4xl font-black text-brand-orange">{data?.sharePercentage}%</p>
              </div>
              <div className="bg-brand-navy border border-white/5 p-6 rounded-2xl shadow-lg">
                 <p className="text-xs text-gray-500 mb-2 font-bold uppercase tracking-widest">إجمالي مسحوباتك</p>
                 <p className="text-4xl font-black text-brand-gold">{data?.totalWithdrawn} <span className="text-sm font-normal text-gray-500">د.ب</span></p>
              </div>
              <div className="bg-brand-navy border border-white/5 p-6 rounded-2xl shadow-lg">
                 <p className="text-xs text-gray-500 mb-2 font-bold uppercase tracking-widest">إجمالي رأس المال للعربة</p>
                 <p className="text-4xl font-black text-white">{totalCapital} <span className="text-sm font-normal text-gray-500">د.ب</span></p>
              </div>
           </div>

           <h2 className="text-xl font-bold mt-10 mb-4 flex items-center gap-2"><PieIcon size={20} className="text-brand-orange"/> سجل الأرباح الموزعة لك</h2>
           <div className="bg-brand-navy border border-white/5 rounded-2xl p-6 shadow-lg">
              {payouts.length === 0 ? <p className="text-gray-400 text-center py-10 font-bold">لا توجد توزيعات أرباح حتى الآن</p> : (
                 <table className="w-full text-right text-sm">
                    <thead className="text-gray-500 border-b border-white/5">
                       <tr>
                          <th className="pb-4 font-normal uppercase text-[10px] tracking-widest">التاريخ</th>
                          <th className="pb-4 font-normal uppercase text-[10px] tracking-widest">فترة الأرباح</th>
                          <th className="pb-4 font-normal uppercase text-[10px] tracking-widest">المبلغ</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                       {payouts.map((p: any) => (
                          <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                             <td className="py-4">{new Date(p.createdAt).toLocaleDateString('ar-SA')}</td>
                             <td className="py-4">{p.profitPeriod || '-'}</td>
                             <td className="py-4 font-black text-lg text-brand-gold">{p.amount} د.ب</td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              )}
           </div>
        </div>
     );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-black text-brand-orange flex items-center gap-3">
            <Coins size={36} /> شؤون المستثمرين والأرباح
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            لوحة إدارة الشركاء، توزيع الأرباح، وتطبيق الاستقطاعات الإدارية والتشغيلية للعربة
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-brand-navy border border-white/10 hover:border-brand-orange text-white font-bold py-3 px-5 rounded-xl transition-all flex items-center gap-2 text-sm"
          >
            <UserPlus size={16} /> إضافة شريك مستثمر
          </button>
          <button 
            onClick={() => setIsWithdrawModalOpen(true)}
            className="bg-brand-navy border border-white/10 hover:border-brand-orange text-white font-bold py-3 px-5 rounded-xl transition-all flex items-center gap-2 text-sm"
          >
            <ArrowDownRight size={16} /> سحب شريك منفرد
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 gap-6">
        <button
          onClick={() => setActiveTab("list")}
          className={`pb-4 text-sm font-bold transition-all ${
            activeTab === "list" ? "text-brand-orange border-b-2 border-brand-orange" : "text-gray-400 hover:text-white"
          }`}
        >
          قائمة الشركاء والحصص
        </button>
        <button
          onClick={() => setActiveTab("smart")}
          className={`pb-4 text-sm font-bold transition-all ${
            activeTab === "smart" ? "text-brand-orange border-b-2 border-brand-orange" : "text-gray-400 hover:text-white"
          }`}
        >
          محرك التوزيع الذكي والاستقطاعات
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`pb-4 text-sm font-bold transition-all ${
            activeTab === "history" ? "text-brand-orange border-b-2 border-brand-orange" : "text-gray-400 hover:text-white"
          }`}
        >
          أرشيف توزيع الأرباح
        </button>
      </div>

      {activeTab === "list" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Table list of investors */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-brand-navy border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-brand-navy/80">
                <h3 className="font-black text-lg flex items-center gap-2">
                  <Users className="text-brand-orange" size={18} /> الشركاء المقيدون حالياً
                </h3>
                <span className="text-xs text-gray-400">إجمالي الشركاء: {investorsQuery.data?.length || 0}</span>
              </div>

              {investorsQuery.isLoading ? (
                <div className="p-20 text-center text-brand-orange flex items-center justify-center gap-2">
                  <span className="animate-pulse">جاري التحميل...</span>
                </div>
              ) : !investorsQuery.data || investorsQuery.data.length === 0 ? (
                <div className="p-20 text-center text-gray-500">لا يوجد مستثمرون مسجلون حالياً.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse text-sm">
                    <thead>
                      <tr className="bg-white/5 text-gray-400 text-xs font-bold border-b border-white/5">
                        <th className="p-4">الشريك</th>
                        <th className="p-4">الهاتف / البريد</th>
                        <th className="p-4">رأس المال المدفوع</th>
                        <th className="p-4 text-center">النسبة المئوية</th>
                        <th className="p-4">المسحوبات التراكمية</th>
                        <th className="p-4 text-center">حالة الحساب</th>
                        <th className="p-4 text-center">تعديل</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {investorsQuery.data.map((inv) => (
                        <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-4 font-bold text-white flex items-center gap-2">
                            <UserCheck size={14} className="text-brand-orange" /> {inv.name}
                          </td>
                          <td className="p-4">
                            <div className="text-white text-xs">{inv.phone}</div>
                            {inv.email && <div className="text-gray-500 text-[10px]">{inv.email}</div>}
                          </td>
                          <td className="p-4 text-brand-orange font-mono font-bold">{inv.capital.toFixed(2)} د.ب</td>
                          <td className="p-4 text-center font-black text-green-400 font-mono">{inv.sharePercentage}%</td>
                          <td className="p-4 text-gray-400 font-mono">{inv.totalWithdrawn.toFixed(2)} د.ب</td>
                          <td className="p-4 text-center">
                            {inv.isActive ? (
                              <span className="bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-bold px-2 py-0.5 rounded">نشط</span>
                            ) : (
                              <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold px-2 py-0.5 rounded">غير نشط</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleEditInvestorClick(inv)}
                              className="text-brand-orange hover:text-brand-orange/80 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-xs transition-all font-bold"
                            >
                              تعديل
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Share allocation Chart */}
          <div className="bg-brand-navy border border-white/5 rounded-2xl p-6 flex flex-col items-center shadow-2xl justify-center">
            <h3 className="text-base font-bold flex items-center gap-2 self-start mb-6"><PieIcon className="text-brand-orange" /> توزيع الحصص والأرباح</h3>
            
            <div className="h-[260px] w-full relative">
              {chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500 text-xs">لا تتوفر نسب شراكة لعرضها</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "smart" && (
        <form onSubmit={handleSmartDistribute} className="bg-brand-navy border border-white/5 p-6 rounded-2xl space-y-6 shadow-2xl animate-in fade-in duration-200">
          <div className="border-b border-white/5 pb-4">
            <h3 className="text-lg font-black text-brand-orange">التوزيع الذكي والاحتياطيات</h3>
            <p className="text-xs text-gray-400">توزيع الأرباح مع تصفية استقطاعات التطوير والتشغيل وصيانة الأصول وتوزيع الصافي آلياً</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Inputs column */}
            <div className="md:col-span-2 space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-bold">صافي الربح الإجمالي للتوزيع (د.ب)</label>
                <div className="relative">
                  <DollarSign size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-orange" />
                  <input
                    type="number"
                    step="0.001"
                    value={netProfit}
                    onChange={(e) => setNetProfit(e.target.value)}
                    className="w-full bg-brand-black border border-white/10 rounded-xl py-3 pr-12 pl-4 text-lg font-black text-white focus:outline-none focus:border-brand-orange font-mono"
                  />
                </div>
              </div>

              <div className="bg-brand-black/40 p-4 rounded-xl space-y-4">
                <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">استقطاعات واحتياطيات العربة اليومية (د.ب)</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400">استقطاع التطوير والتكنولوجيا</label>
                    <input
                      type="number"
                      step="0.01"
                      value={devDeduction}
                      onChange={(e) => setDevDeduction(e.target.value)}
                      className="w-full bg-brand-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400">استقطاع صيانة وتجديد الأصول</label>
                    <input
                      type="number"
                      step="0.01"
                      value={maintDeduction}
                      onChange={(e) => setMaintDeduction(e.target.value)}
                      className="w-full bg-brand-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400">احتياطي الطوارئ العام</label>
                    <input
                      type="number"
                      step="0.01"
                      value={emergencyDeduction}
                      onChange={(e) => setEmergencyDeduction(e.target.value)}
                      className="w-full bg-brand-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400">استقطاع حجز وتأمين مخزون</label>
                    <input
                      type="number"
                      step="0.01"
                      value={stockDeduction}
                      onChange={(e) => setStockDeduction(e.target.value)}
                      className="w-full bg-brand-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400">استقطاع التسويق والدعاية</label>
                    <input
                      type="number"
                      step="0.01"
                      value={marketingDeduction}
                      onChange={(e) => setMarketingDeduction(e.target.value)}
                      className="w-full bg-brand-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Calculations preview card */}
            <div className="bg-brand-black/50 border border-white/5 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
              <div>
                <h4 className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-4">ملخص عملية التوزيع</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span>الربح الإجمالي:</span><span className="font-mono text-white">{Number(netProfit).toFixed(3)} د.ب</span></div>
                  <div className="flex justify-between"><span>مجموع الاستقطاعات:</span><span className="font-mono text-red-400">-{calculatedTotalDeductions.toFixed(3)} د.ب</span></div>
                  <hr className="border-white/5" />
                  <div className="flex justify-between text-base font-black">
                    <span>الموزع الفعلي الصافي:</span>
                    <span className="font-mono text-green-400">{calculatedDistributable.toFixed(3)} د.ب</span>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <button
                  type="submit"
                  disabled={distributeDeductionsMutation.isLoading}
                  className="w-full bg-brand-orange hover:bg-brand-orange/90 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-brand-orange/20 flex items-center justify-center gap-2 text-sm"
                >
                  {distributeDeductionsMutation.isLoading ? "جاري المعالجة..." : "تأكيد وصرف التوزيع الذكي"}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {activeTab === "history" && (
        <div className="bg-brand-navy border border-white/5 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in duration-200">
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-brand-navy/80">
            <h3 className="font-black text-lg flex items-center gap-2">
              <FileSpreadsheet className="text-brand-orange" size={18} /> أرشيف عمليات التوزيع والمحاسبة
            </h3>
            <span className="text-xs text-gray-400">الإجمالي: {historyQuery.data?.length || 0} عملية توزيع</span>
          </div>

          {historyQuery.isLoading ? (
            <div className="p-20 text-center text-brand-orange animate-pulse">جاري جلب الأرشيف...</div>
          ) : !historyQuery.data || historyQuery.data.length === 0 ? (
            <div className="p-20 text-center text-gray-500">لم يتم توزيع أي أرباح بعد.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-sm">
                <thead>
                  <tr className="bg-white/5 text-gray-400 text-xs font-bold border-b border-white/5">
                    <th className="p-4">تاريخ التوزيع</th>
                    <th className="p-4 font-mono">الربح الصافي</th>
                    <th className="p-4 font-mono">إجمالي الاستقطاعات</th>
                    <th className="p-4 font-mono">الموزع الصافي</th>
                    <th className="p-4 text-center">تفاصيل الاستقطاعات</th>
                    <th className="p-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {historyQuery.data.map((row) => (
                    <tr key={row.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 text-xs text-gray-400">
                        {new Date(row.date).toLocaleString('ar-BH')}
                      </td>
                      <td className="p-4 font-mono font-bold">{row.netProfit.toFixed(3)} د.ب</td>
                      <td className="p-4 font-mono text-red-400">-{row.totalDeductions.toFixed(3)} د.ب</td>
                      <td className="p-4 font-mono font-black text-green-400">{row.distributableProfit.toFixed(3)} د.ب</td>
                      <td className="p-4 text-xs text-center text-gray-400">
                        تطوير: {row.devDeduction.toFixed(2)} | صيانة: {row.maintDeduction.toFixed(2)} | طوارئ: {row.emergencyDeduction.toFixed(2)}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => setViewDistributionDetail(row)}
                          className="bg-white/5 hover:bg-white/10 text-white font-bold p-1.5 rounded-lg text-xs transition-all flex items-center justify-center gap-1 mx-auto"
                        >
                          <Eye size={12} /> كشف الحصص
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: View distribution detail */}
      {viewDistributionDetail && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-brand-navy border border-white/10 rounded-[36px] p-6 w-full max-w-lg space-y-6 shadow-2xl relative">
            <div className="border-b border-white/5 pb-4 flex justify-between items-start">
              <div>
                <h3 className="text-lg font-black text-brand-orange">كشف توزيع أرباح الشركاء</h3>
                <p className="text-[10px] text-gray-500">التاريخ: {new Date(viewDistributionDetail.date).toLocaleString('ar-BH')}</p>
              </div>
              <button onClick={() => setViewDistributionDetail(null)} className="text-gray-400 hover:text-white font-bold">إغلاق</button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 bg-brand-black/40 p-4 rounded-xl text-center text-xs">
                <div><span className="text-gray-400 block">صافي الأرباح:</span><span className="font-mono text-white font-bold">{viewDistributionDetail.netProfit.toFixed(3)} د.ب</span></div>
                <div><span className="text-gray-400 block">الاستقطاعات:</span><span className="font-mono text-red-400 font-bold">-{viewDistributionDetail.totalDeductions.toFixed(3)} د.ب</span></div>
                <div><span className="text-gray-400 block">الموزع الصافي:</span><span className="font-mono text-green-400 font-bold">{viewDistributionDetail.distributableProfit.toFixed(3)} د.ب</span></div>
              </div>

              <div className="max-h-[220px] overflow-y-auto space-y-2 pr-2 text-xs">
                <span className="text-[10px] text-gray-500 font-bold block mb-1">تفاصيل المبالغ المودعة في حسابات الشركاء:</span>
                {viewDistributionDetail.payouts?.map((payout: any) => (
                  <div key={payout.id} className="bg-brand-black/20 p-3 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">{payout.investorName}</div>
                      <div className="text-gray-500 text-[10px]">النسبة: {payout.sharePercentage}%</div>
                    </div>
                    <div className="text-left">
                      <div className="font-mono font-black text-green-400 text-sm">+{payout.amountPaid.toFixed(3)} د.ب</div>
                      <div className="text-[9px] text-red-400">استقطاع: {payout.deductionsShare.toFixed(3)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Investor */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form 
            onSubmit={handleAddInvestor}
            className="bg-brand-navy border border-white/10 w-full max-w-md rounded-[36px] p-8 space-y-6"
          >
            <h3 className="text-2xl font-black text-brand-gold border-b border-white/5 pb-4">إضافة شريك جديد</h3>
            
            <div className="space-y-2">
              <label className="text-xs text-gray-400">اسم الشريك</label>
              <input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                required
                placeholder="محمد علي..."
                className="w-full bg-brand-black border border-white/5 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:border-brand-orange"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-gray-400">رقم الهاتف</label>
                <input 
                  type="text" 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)} 
                  required
                  placeholder="00000000"
                  className="w-full bg-brand-black border border-white/5 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:border-brand-orange text-left"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-gray-400">البريد الإلكتروني (اختياري)</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="name@domain.com"
                  className="w-full bg-brand-black border border-white/5 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:border-brand-orange text-left"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-gray-400">رأس المال (د.ب)</label>
                <input 
                  type="number" 
                  value={capital} 
                  onChange={e => handleCapitalChange(e.target.value)} 
                  required
                  className="w-full bg-brand-black border border-white/5 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:border-brand-orange"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs text-gray-400">النسبة المئوية (%)</label>
                <div className="relative">
                  <Percent size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input 
                    type="number" 
                    value={sharePercentage || 0} 
                    disabled
                    className="w-full bg-brand-black border border-white/5 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:border-brand-orange opacity-50 cursor-not-allowed"
                  />
                </div>
                <p className="text-[10px] text-brand-orange mt-1">يتم حساب النسبة تلقائياً بناءً على إجمالي رؤوس الأموال</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-400">ملاحظات العقد</label>
              <textarea 
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
                placeholder="تفاصيل الشراكة..."
                className="w-full bg-brand-black border border-white/5 rounded-2xl py-2 px-4 text-sm focus:outline-none focus:border-brand-orange"
              />
            </div>

            <div className="flex gap-4">
              <button type="submit" className="flex-1 bg-brand-orange text-black py-3 rounded-xl font-bold hover:bg-brand-gold transition-colors">إضافة شريك</button>
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 bg-white/5 py-3 rounded-xl hover:bg-white/10 transition-colors">إلغاء</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Edit Investor */}
      {selectedEditInvestor && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form 
            onSubmit={handleEditInvestor}
            className="bg-brand-navy border border-white/10 w-full max-w-md rounded-[36px] p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200"
          >
            <h3 className="text-2xl font-black text-brand-gold border-b border-white/5 pb-4">تعديل بيانات الشريك</h3>
            
            <div className="space-y-2">
              <label className="text-xs text-gray-400">اسم الشريك</label>
              <input 
                type="text" 
                value={editName} 
                onChange={e => setEditName(e.target.value)} 
                required
                className="w-full bg-brand-black border border-white/5 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:border-brand-orange"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-gray-400">رقم الهاتف</label>
                <input 
                  type="text" 
                  value={editPhone} 
                  onChange={e => setEditPhone(e.target.value)} 
                  required
                  className="w-full bg-brand-black border border-white/5 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:border-brand-orange text-left"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-gray-400">البريد الإلكتروني (اختياري)</label>
                <input 
                  type="email" 
                  value={editEmail} 
                  onChange={e => setEditEmail(e.target.value)} 
                  className="w-full bg-brand-black border border-white/5 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:border-brand-orange text-left"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-gray-400">رأس المال (د.ب)</label>
                <input 
                  type="number" 
                  value={editCapital} 
                  onChange={e => handleEditCapitalChange(e.target.value)} 
                  required
                  className="w-full bg-brand-black border border-white/5 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:border-brand-orange"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs text-gray-400">النسبة المئوية (%)</label>
                <div className="relative">
                  <Percent size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input 
                    type="number" 
                    value={editSharePercentage || 0} 
                    disabled
                    className="w-full bg-brand-black border border-white/5 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:border-brand-orange opacity-50 cursor-not-allowed"
                  />
                </div>
                <p className="text-[10px] text-brand-orange mt-1">يتم حساب النسبة تلقائياً بناءً على إجمالي رؤوس الأموال</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-400">حالة الشريك</label>
              <select 
                value={editIsActive ? "true" : "false"}
                onChange={e => setEditIsActive(e.target.value === "true")}
                className="w-full bg-brand-black border border-white/5 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:border-brand-orange text-white"
              >
                <option value="true">نشط (يتم توزيع الأرباح له)</option>
                <option value="false">غير نشط (لا توزع له أرباح حالياً)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-400">ملاحظات العقد</label>
              <textarea 
                value={editNotes} 
                onChange={e => setEditNotes(e.target.value)} 
                className="w-full bg-brand-black border border-white/5 rounded-2xl py-2 px-4 text-sm focus:outline-none focus:border-brand-orange"
              />
            </div>

            <div className="flex gap-4">
              <button 
                type="submit" 
                disabled={updateInvestorMutation.isLoading}
                className="flex-1 bg-brand-orange text-black py-3 rounded-xl font-bold hover:bg-brand-gold transition-colors flex items-center justify-center gap-2"
              >
                {updateInvestorMutation.isLoading && <span className="animate-spin">🌀</span>}
                حفظ التعديلات
              </button>
              <button 
                type="button" 
                onClick={() => setSelectedEditInvestor(null)} 
                className="flex-1 bg-white/5 py-3 rounded-xl hover:bg-white/10 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Withdraw individual profit */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form 
            onSubmit={handleWithdraw}
            className="bg-brand-navy border border-white/10 w-full max-w-md rounded-[36px] p-8 space-y-6"
          >
            <h3 className="text-2xl font-black text-brand-gold border-b border-white/5 pb-4">تسجيل سحب أرباح لشريك</h3>
            
            <div className="space-y-2">
              <label className="text-xs text-gray-400">اختر الشريك</label>
              <select 
                value={selectedInvestorId}
                onChange={e => setSelectedInvestorId(e.target.value)}
                required
                className="w-full bg-brand-black border border-white/5 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:border-brand-orange text-white"
              >
                <option value="">-- اختر الشريك --</option>
                {investorsQuery.data?.map(inv => (
                  <option key={inv.id} value={inv.id}>{inv.name} (حصته: {inv.sharePercentage}%)</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-400">المبلغ المطلوب سحبه (د.ب)</label>
              <div className="relative">
                <DollarSign size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-gold" />
                <input 
                  type="number" 
                  value={withdrawAmount} 
                  onChange={e => setWithdrawAmount(e.target.value)} 
                  required
                  className="w-full bg-brand-black border border-white/5 rounded-2xl py-3 pr-12 pl-4 text-sm focus:outline-none focus:border-brand-orange"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button type="submit" className="flex-1 bg-brand-orange text-black py-3 rounded-xl font-bold hover:bg-brand-gold transition-colors">سحب وتسجيل</button>
              <button type="button" onClick={() => setIsWithdrawModalOpen(false)} className="flex-1 bg-white/5 py-3 rounded-xl hover:bg-white/10 transition-colors">إلغاء</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
