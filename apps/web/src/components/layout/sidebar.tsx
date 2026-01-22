'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, UserCircle, FilePlus2, LogOut, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

const sidebarItems = [
  {
    title: 'Panel',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Nuevo Registro',
    href: '/records/new',
    icon: FilePlus2,
  },
  {
    title: 'Perfil',
    href: '/profile',
    icon: UserCircle,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/auth/login');
  };

  return (
    <div className="flex h-screen w-72 flex-col bg-white border-r border-[0.5px] border-emerald-900/10 shadow-sm">
      <div className="flex h-20 items-center px-6 border-b border-[0.5px] border-emerald-900/10">
        <Link href="/dashboard" className="flex items-center gap-3 font-bold tracking-tight">
          <div className="bg-emerald-900 p-2 rounded-lg">
             <Stethoscope className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl text-emerald-950">MHAT</span>
        </Link>
      </div>
      
      <div className="flex-1 overflow-auto py-6 px-4">
        <nav className="flex flex-col gap-2">
          {sidebarItems.map((item, index) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={index}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                  isActive 
                    ? "bg-emerald-50 text-emerald-900 shadow-sm border border-emerald-900/20" 
                    : "text-emerald-900/70 hover:bg-emerald-50/50 hover:text-emerald-900"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive ? "text-emerald-900" : "text-emerald-900/50")} />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-[0.5px] border-emerald-900/10 bg-slate-50/50">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-500 transition-all hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-5 w-5" />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}
