'use client';

import React from 'react';
import Link from 'next/link';
import { Menu, Stethoscope } from 'lucide-react';
import { useCurrentUser } from '@/hooks/queries/useCurrentUser';
import { UserRole } from '@/types';

interface MobileHeaderProps {
  onMenuToggle: () => void;
}

export function MobileHeader({ onMenuToggle }: MobileHeaderProps) {
  const { data: user } = useCurrentUser();
  const isDoctor = user?.role === UserRole.DOCTOR;
  const homeLink = isDoctor ? '/doctor' : '/dashboard';

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-14 px-4 bg-white border-b border-emerald-900/10 shadow-sm lg:hidden">
      <button
        onClick={onMenuToggle}
        className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-slate-100 transition-colors"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5 text-slate-700" />
      </button>

      <Link href={homeLink} className="flex items-center gap-2 font-bold tracking-tight">
        <div className="bg-emerald-900 p-1.5 rounded-md">
          <Stethoscope className="h-4 w-4 text-white" />
        </div>
        <span className="text-lg text-emerald-950">MHAT</span>
      </Link>

      {/* Spacer to center the logo */}
      <div className="w-10" />
    </header>
  );
}
