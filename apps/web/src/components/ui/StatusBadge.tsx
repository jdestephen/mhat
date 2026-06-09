'use client';

import React from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RecordStatus } from '@/types';

type BadgeVariant = 'success' | 'warning' | 'info' | 'neutral' | 'danger';

interface StatusBadgeProps {
  status: RecordStatus | string;
  className?: string;
}

const STATUS_CONFIG: Record<string, { label: string; variant: BadgeVariant; icon?: React.ReactNode }> = {
  [RecordStatus.VERIFIED]: {
    label: 'Verificado',
    variant: 'success',
    icon: <CheckCircle className="h-3 w-3" />,
  },
  [RecordStatus.BACKED_BY_DOCUMENT]: {
    label: 'Con Documento',
    variant: 'info',
  },
  [RecordStatus.UNVERIFIED]: {
    label: 'Sin Verificar',
    variant: 'warning',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
};

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  success: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  warning: 'bg-amber-100 text-amber-700 border-amber-200',
  info: 'bg-blue-100 text-blue-800 border-blue-200',
  neutral: 'bg-slate-200 text-slate-700 border-slate-300',
  danger: 'bg-red-100 text-red-700 border-red-200',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status.replace(/_/g, ' ').split(' ').map(
      (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
    ).join(' '),
    variant: 'neutral' as BadgeVariant,
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border',
        VARIANT_STYLES[config.variant],
        className
      )}
    >
      {config.icon}
      {config.label}
    </span>
  );
}
