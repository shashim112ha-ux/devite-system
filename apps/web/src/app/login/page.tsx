"use client";

import { useState } from "react";
import { trpc } from "../utils/trpc";
import { motion } from "framer-motion";
import { Lock, Mail, ChevronRight, User } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const loginMutation = trpc.login.useMutation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await loginMutation.mutateAsync({ phone, password });
      localStorage.setItem('userToken', res.token);
      localStorage.setItem('userRole', res.user.role);
      localStorage.setItem('userId', res.user.id);
      localStorage.setItem('userName', res.user.name);
      
      if (res.user.role === 'ADMIN' || res.user.role === 'MANAGER') {
        router.push('/dashboard');
      } else if (res.user.role === 'KITCHEN') {
        router.push('/kitchen');
      } else {
        router.push('/pos');
      }
    } catch (err: any) {
      setError(err.message || "فشل تسجيل الدخول");
    }
  };

  return (
    <div className="min-h-screen bg-brand-black flex flex-col items-center justify-center p-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-brand-navy-light/40 backdrop-blur-xl p-10 rounded-[40px] border border-white/5 shadow-2xl"
      >
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-brand-orange mb-2">DEVITE</h1>
          <p className="text-brand-gold text-xs tracking-widest uppercase font-bold">Employee Access</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs text-gray-500 mr-2">رقم الهاتف أو الإيميل</label>
            <div className="relative">
              <User className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-gold" size={18} />
              <input 
                type="text" 
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full bg-brand-black border border-white/5 rounded-2xl py-4 pr-12 pl-4 focus:outline-none focus:border-brand-orange transition-all"
                placeholder="00000000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-gray-500 mr-2">كلمة المرور</label>
            <div className="relative">
              <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-gold" size={18} />
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-brand-black border border-white/5 rounded-2xl py-4 pr-12 pl-4 focus:outline-none focus:border-brand-orange transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-xs text-center">{error}</p>}

          <button 
            type="submit"
            disabled={loginMutation.isLoading}
            className="w-full bg-brand-orange py-4 rounded-2xl font-black text-xl shadow-xl shadow-brand-orange/20 flex items-center justify-center gap-2 group"
          >
            تسجيل الدخول
            <ChevronRight className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <p className="mt-10 text-center text-gray-600 text-[10px] uppercase tracking-widest">
          Authorized Personnel Only
        </p>
      </motion.div>
      
      <button onClick={() => router.push('/')} className="mt-8 text-brand-gold text-sm font-bold border-b border-brand-gold pb-1">
        العودة لصفحة العملاء
      </button>
    </div>
  );
}
