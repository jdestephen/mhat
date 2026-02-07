'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  UserCircle,
  FilePlus2,
  LogOut,
  Stethoscope,
  ChevronDown,
  ChevronRight,
  Share2,
  Users,
  KeyRound,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { useState } from 'react';
import { useCurrentUser } from '@/hooks/queries/useCurrentUser';
import { UserRole } from '@/types';


interface MenuItem {
  label: string;
  href?: string;
  icon: React.ReactElement;
  children?: MenuItem[];
  onClick?: () => void;
  roles?: UserRole[];
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const [openMenus, setOpenMenus] = useState<string[]>(['Perfil']);
  const [collapsed, setCollapsed] = useState(false);

  const isDoctor = user?.role === UserRole.DOCTOR;
  const isPatient = user?.role === UserRole.PATIENT;

  const toggleMenu = (label: string) => {
    if (collapsed) return;
    setOpenMenus((prev) =>
      prev.includes(label)
        ? prev.filter((l) => l !== label)
        : [...prev, label]
    );
  };

  // Build menu items based on role
  const sidebarItems: MenuItem[] = [];

  if (isDoctor) {
    sidebarItems.push(
      {
        label: 'Panel Médico',
        href: '/doctor',
        icon: <Stethoscope className="w-5 h-5" />,
      },
      {
        label: 'Mis Pacientes',
        href: '/doctor/patients',
        icon: <Users className="w-5 h-5" />,
      }
    );
  } else {
    sidebarItems.push(
      {
        label: 'Panel',
        href: '/dashboard',
        icon: <LayoutDashboard className="w-5 h-5" />,
      },
      {
        label: 'Nuevo Registro',
        href: '/records/new',
        icon: <FilePlus2 className="w-5 h-5" />,
      }
    );
  }

  sidebarItems.push({
    label: 'Perfil',
    href: '/profile',
    icon: <UserCircle className="w-5 h-5" />,
    children: [
      {
        label: 'Datos Personales',
        href: '/profile/me',
        icon: <UserCircle className="w-5 h-5" />,
      },
      ...(isPatient ? [
        {
          label: 'Historial de Salud',
          href: '/profile/health-history',
          icon: <Stethoscope className="w-5 h-5" />,
        },
        {
          label: 'Acceso Médico',
          href: '/profile/doctor-access',
          icon: <KeyRound className="w-5 h-5" />,
        },
        {
          label: 'Links Compartidos',
          href: '/profile/shared-links',
          icon: <Share2 className="w-5 h-5" />,
        },
      ] : []),
    ],
  });

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
            onClick={() => {
              if (collapsed) {
                setCollapsed(false);
                if (!openMenus.includes(item.label)) {
                  setOpenMenus((prev) => [...prev, item.label]);
                }
              } else {
                toggleMenu(item.label);
              }
            }}
            title={collapsed ? item.label : undefined}
            className={clsx(
              'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
              'hover:bg-primary/10 font-primary',
              {
                'text-primary': isOpen && !collapsed,
                'text-accent': !(isOpen && !collapsed),
                'justify-center px-0': collapsed,
              }
            )}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!collapsed && (
              <>
                <span className="flex-1 truncate">{item.label}</span>
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 flex-shrink-0" />
                )}
              </>
            )}
          </button>

          {isOpen && !collapsed && item.children && (
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
          title={collapsed ? item.label : undefined}
          className={clsx(
            'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
            'hover:bg-primary/10 font-primary text-accent',
            {
              'pl-8': level > 0 && !collapsed,
              'justify-center px-0': collapsed,
            }
          )}
        >
          <span className="flex-shrink-0">{item.icon}</span>
          {!collapsed && <span className="truncate">{item.label}</span>}
        </button>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href!}
        title={collapsed ? item.label : undefined}
        className={clsx(
          'flex items-center gap-3 px-4 py-3 transition-colors font-primary',
          {
            'bg-primary/10 text-primary': isActive,
            'text-accent hover:bg-primary/10': !isActive,
            'pl-8': level > 0 && !collapsed,
            'justify-center px-0': collapsed,
          }
        )}
      >
        <span className="flex-shrink-0">{item.icon}</span>
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  return (
    <div
      className={clsx(
        'flex h-screen flex-col bg-white border-r border-[0.5px] border-emerald-900/10 shadow-sm transition-all duration-300',
        collapsed ? 'w-16' : 'w-72'
      )}
    >
      {/* Logo + Collapse Toggle */}
      <div className="flex h-20 items-center justify-between px-4 border-b border-[0.5px] border-emerald-900/10">
        {!collapsed ? (
          <Link href={isDoctor ? '/doctor' : '/dashboard'} className="flex items-center gap-3 font-bold tracking-tight">
            <div className="bg-emerald-900 p-2 rounded-lg flex-shrink-0">
              <Stethoscope className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl text-emerald-950">MHAT</span>
          </Link>
        ) : (
          <Link href={isDoctor ? '/doctor' : '/dashboard'} className="mx-auto">
            <div className="bg-emerald-900 p-2 rounded-lg">
              <Stethoscope className="h-6 w-6 text-white" />
            </div>
          </Link>
        )}
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-auto py-6 px-2">
        <nav className="flex flex-col gap-2">
          {sidebarItems.map((item) => renderMenuItem(item))}
        </nav>
      </div>

      {/* Footer: Collapse Toggle + Logout */}
      <div className="p-2 border-t border-[0.5px] border-emerald-900/10 bg-slate-50/50 space-y-1">
        <button
          onClick={() => setCollapsed((prev) => !prev)}
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          className={clsx(
            'flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600',
            { 'justify-center px-0': collapsed }
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-5 w-5 flex-shrink-0" />
          ) : (
            <>
              <PanelLeftClose className="h-5 w-5 flex-shrink-0" />
              <span>Colapsar</span>
            </>
          )}
        </button>
        <button
          onClick={handleLogout}
          title={collapsed ? 'Cerrar Sesión' : undefined}
          className={clsx(
            'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-500 transition-all hover:bg-red-50 hover:text-red-600',
            { 'justify-center px-0': collapsed }
          )}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Cerrar Sesión</span>}
        </button>
      </div>
    </div>
  );
}
