'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, UserCircle, FilePlus2, LogOut, Stethoscope, ChevronDown, ChevronRight, Share2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { useState } from 'react';


interface MenuItem {
  label: string;
  href?: string;
  icon: React.ReactElement;
  children?: MenuItem[];
  onClick?: () => void;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [openMenus, setOpenMenus] = useState<string[]>(['Perfil']);

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) =>
      prev.includes(label)
        ? prev.filter((l) => l !== label)
        : [...prev, label]
    );
  };

  const sidebarItems = [
    {
      label: 'Panel',
      href: '/dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      label: 'Nuevo Registro',
      href: '/records/new',
      icon: <FilePlus2 className="w-5 h-5" />,
    },
    {
      label: 'Panel Médico',
      href: '/doctor',
      icon: <Stethoscope className="w-5 h-5" />,
    },
    {
      label: 'Perfil',
      href: '/profile',
      icon: <UserCircle className="w-5 h-5" />,
      children: [
        {
          label: 'Datos Personales',
          href: '/profile/me',
          icon: <UserCircle className="w-5 h-5" />,
        },
        {
          label: 'Historial de Salud',
          href: '/profile/health-history',
          icon: <Stethoscope className="w-5 h-5" />,
        },
        {
          label: 'Links Compartidos',
          href: '/profile/shared-links',
          icon: <Share2 className="w-5 h-5" />,
        },
      ],
    },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/auth/login');
  };


  const renderMenuItem = (item: MenuItem, level = 0) => {
    const isActive = item.href === pathname;
    const hasChildren = item.children && item.children.length > 0;
    const isOpen = openMenus.includes(item.label);

    if (hasChildren) {
      return (
          <div key={item.label}>
            <button
              onClick={() => toggleMenu(item.label)}
              className={clsx(
                'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                'hover:bg-primary/10 font-primary',
                {
                  'text-primary': isOpen,
                  'text-accent': !isOpen,
                }
              )}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {isOpen ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            {isOpen && item.children && (
              <div className="bg-background-secondary">
                {item.children.map((child) => renderMenuItem(child, level + 1))}
              </div>
            )}
          </div>
      );
    }

    if (item.onClick) {
      return (
        <button
          key={item.label}
          onClick={item.onClick}
          className={clsx(
            'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
            'hover:bg-primary/10 font-primary text-accent',
            {
              'pl-8': level > 0,
            }
          )}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href!}
        className={clsx(
          'flex items-center gap-3 px-4 py-3 transition-colors font-primary',
          {
            'bg-primary/10 text-primary': isActive,
            'text-accent hover:bg-primary/10': !isActive,
            'pl-8': level > 0,
          }
        )}
      >
        {item.icon}
        <span>{item.label}</span>
      </Link>
    );
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
          {sidebarItems.map((item) => renderMenuItem(item))}
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
