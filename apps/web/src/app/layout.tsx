"use client";

import "./globals.css";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  ChefHat, 
  Users, 
  Package, 
  BarChart3, 
  Tag, 
  LogOut,
  MonitorSmartphone,
  UtensilsCrossed,
  Settings,
  Coins,
  Wallet,
  CreditCard,
  ClipboardCheck,
  MessageSquare,
  Calendar,
  UserCheck
} from "lucide-react";
import Link from "next/link";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { trpc } from "./utils/trpc";
import { ErrorBoundary } from "./ErrorBoundary";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: "http://127.0.0.1:4000/trpc",
          headers() {
            const token = typeof window !== 'undefined' ? localStorage.getItem('userToken') : null;
            return token ? { Authorization: `Bearer ${token}` } : {};
          }
        }),
      ],
    } as any)
  );

  const pathname = usePathname();

  return (
    <html lang="ar" dir="rtl">
      <body className={`bg-brand-black text-white min-h-screen`}>
        <ErrorBoundary>
          <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
              <RoleGuard pathname={pathname}>
                {children}
              </RoleGuard>
            </QueryClientProvider>
          </trpc.Provider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

function RoleGuard({ children, pathname }: { children: React.ReactNode, pathname: string }) {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const storedRole = localStorage.getItem('userRole');
    setRole(storedRole);

    // Simple RBAC rules
    if (!storedRole && pathname !== '/' && pathname !== '/login' && pathname !== '/public-feedback') {
      router.push('/login');
    } else if (storedRole === 'KITCHEN' && ![ '/kitchen', '/feedback', '/shift-report', '/schedule', '/attendance'].includes(pathname)) {
      router.push('/attendance');
    } else if (storedRole === 'CASHIER' && !['/pos', '/shift-report', '/feedback', '/schedule', '/attendance'].includes(pathname)) {
      router.push('/attendance');
    } else if (storedRole === 'INVESTOR' && !['/investors', '/public-feedback', '/reports', '/feedback'].includes(pathname)) {
      router.push('/investors');
    } else if (storedRole === 'INVESTOR_STAFF' && !['/pos', '/kitchen', '/feedback', '/shift-report', '/schedule', '/attendance', '/inventory', '/expenses', '/investors', '/reports', '/public-feedback'].includes(pathname)) {
      router.push('/attendance');
    } else if (storedRole === 'STAFF' && !['/pos', '/kitchen', '/feedback', '/shift-report', '/schedule', '/attendance', '/inventory', '/expenses'].includes(pathname)) {
      router.push('/attendance');
    }
  }, [pathname, router]);

  if (!isClient) return <div className="min-h-screen bg-brand-black flex items-center justify-center text-brand-gold animate-pulse">جاري التحقق من الصلاحيات...</div>;

  const isAdminRoute = !['/login', '/', '/public-feedback'].includes(pathname) && !!role;

  if (isAdminRoute) {
    return (
      <div className="flex min-h-screen bg-brand-black text-white">
        {/* Admin Sidebar */}
        <aside className="w-64 bg-brand-navy border-l border-white/5 flex flex-col print:hidden">
          <div className="p-8 text-center border-b border-white/5">
            <h2 className="text-2xl font-black text-brand-orange">DEVITE</h2>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">{role} Portal</p>
          </div>
          
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {(role === 'ADMIN' || role === 'MANAGER') && (
              <>
                <SidebarLink href="/dashboard" icon={<LayoutDashboard size={18} />} label="لوحة التحكم" active={pathname === '/dashboard'} />
                <SidebarLink href="/reports" icon={<BarChart3 size={18} />} label="التقارير والإحصاءات" active={pathname === '/reports'} />
                <SidebarLink href="/products" icon={<UtensilsCrossed size={18} />} label="إدارة الأصناف" active={pathname === '/products'} />
                <SidebarLink href="/inventory" icon={<Package size={18} />} label="المخزون الذكي" active={pathname === '/inventory'} />
                <SidebarLink href="/staff" icon={<Users size={18} />} label="إدارة الموظفين" active={pathname === '/staff'} />
                <SidebarLink href="/payroll" icon={<Wallet size={18} />} label="مسير الرواتب" active={pathname === '/payroll'} />
                <SidebarLink href="/expenses" icon={<CreditCard size={18} />} label="المصروفات والتحليلات" active={pathname === '/expenses'} />
                <SidebarLink href="/offers" icon={<Tag size={18} />} label="إدارة العروض" active={pathname === '/offers'} />
                <SidebarLink href="/investors" icon={<Coins size={18} />} label="شؤون المستثمرين" active={pathname === '/investors'} />
                <SidebarLink href="/settings" icon={<Settings size={18} />} label="الإعدادات العامة" active={pathname === '/settings'} />
              </>
            )}
            {(role === 'ADMIN' || role === 'MANAGER' || role === 'KITCHEN' || role === 'STAFF' || role === 'INVESTOR_STAFF') && (
              <SidebarLink href="/kitchen" icon={<ChefHat size={18} />} label="شاشة المطبخ" active={pathname === '/kitchen'} />
            )}
            {(role === 'ADMIN' || role === 'MANAGER' || role === 'CASHIER' || role === 'STAFF' || role === 'INVESTOR_STAFF') && (
              <>
                <SidebarLink href="/pos" icon={<MonitorSmartphone size={18} />} label="نظام المبيعات (POS)" active={pathname === '/pos'} />
              </>
            )}
            {/* المخزون والمصروفات - متاحة للموظف الشامل والموظف المستثمر */}
            {(role === 'STAFF' || role === 'INVESTOR_STAFF') && (
              <>
                <SidebarLink href="/inventory" icon={<Package size={18} />} label="المخزون الذكي" active={pathname === '/inventory'} />
                <SidebarLink href="/expenses" icon={<CreditCard size={18} />} label="تسجيل المصروفات" active={pathname === '/expenses'} />
              </>
            )}
            {/* الحضور والانصراف وتقارير الشفت - متاحة لجميع الموظفين والموظف المستثمر */}
            {(role === 'ADMIN' || role === 'MANAGER' || role === 'CASHIER' || role === 'KITCHEN' || role === 'STAFF' || role === 'INVESTOR_STAFF') && (
              <>
                <SidebarLink href="/attendance" icon={<UserCheck size={18} />} label="حضور وانصراف" active={pathname === '/attendance'} />
                <SidebarLink href="/shift-report" icon={<ClipboardCheck size={18} />} label="تقرير نهاية الدوام" active={pathname === '/shift-report'} />
                <SidebarLink href="/schedule" icon={<Calendar size={18} />} label="جدول المناوبات" active={pathname === '/schedule'} />
              </>
            )}
            {/* ملاحظات الموظفين - لجميع الموظفين والمستثمرين */}
            {role && (
              <SidebarLink href="/feedback" icon={<MessageSquare size={18} />} label="الملاحظات" active={pathname === '/feedback'} />
            )}
            {/* روابط المستثمر */}
            {(role === 'INVESTOR' || role === 'INVESTOR_STAFF') && (
              <>
                <SidebarLink href="/reports" icon={<BarChart3 size={18} />} label="التقارير والإحصاءات" active={pathname === '/reports'} />
                <SidebarLink href="/investors" icon={<Coins size={18} />} label="لوحة المستثمر" active={pathname === '/investors'} />
              </>
            )}
            {/* صندوق الملاحظات الوارد - للمدراء فقط */}
            {(role === 'ADMIN' || role === 'MANAGER') && (
              <SidebarLink href="/admin/feedback" icon={<MessageSquare size={18} />} label="📥 صندوق الشكاوى" active={pathname === '/admin/feedback'} />
            )}
          </nav>

          <div className="p-4 border-t border-white/5">
            <button 
              onClick={() => { 
                localStorage.removeItem('userRole'); 
                localStorage.removeItem('userToken'); 
                localStorage.removeItem('userId'); 
                localStorage.removeItem('userName'); 
                router.push('/login'); 
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-all text-sm font-bold"
            >
              <LogOut size={18} />
              تسجيل الخروج
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    );
  }

  // Not an admin route (e.g. / or /login or /pos)
  return <>{children}</>;
}

function SidebarLink({ href, icon, label, active }: any) {
  return (
    <Link 
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full cursor-pointer ${
        active ? 'bg-brand-orange text-white font-bold shadow-lg shadow-brand-orange/20' : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`}
    >
      {icon}
      <span className="text-sm">{label}</span>
    </Link>
  );
}
