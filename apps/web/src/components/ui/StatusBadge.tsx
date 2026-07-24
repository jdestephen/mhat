'use client';

import React from 'react';
import { CheckCircle, AlertTriangle, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RecordStatus } from '@/types';

type BadgeVariant = 'success' | 'warning' | 'info' | 'neutral' | 'danger';

interface StatusBadgeProps {
  status: RecordStatus | string;
  className?: string;
  compact?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; variant: BadgeVariant; icon: React.ReactNode, iconCompact: React.ReactNode }> = {
  [RecordStatus.VERIFIED]: {
    label: 'Verificado',
    variant: 'success',
    icon: <CheckCircle className="h-3 w-3" />,
    iconCompact: <CheckCircle className="h-2 w-2" />,
  },
  [RecordStatus.BACKED_BY_DOCUMENT]: {
    label: 'Con Documento',
    variant: 'info',
    icon: <Paperclip className="h-3 w-3" />,
    iconCompact: <Paperclip className="h-2 w-2" />,
  },
  [RecordStatus.UNVERIFIED]: {
    label: 'Sin Verificar',
    variant: 'warning',
    icon: <AlertTriangle className="h-3 w-3" />,
    iconCompact: <AlertTriangle className="h-2 w-2" />  
  },
};

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  success: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  warning: 'bg-amber-100 text-amber-700 border-amber-200',
  info: 'bg-blue-100 text-blue-800 border-blue-200',
  neutral: 'bg-slate-200 text-slate-700 border-slate-300',
  danger: 'bg-red-100 text-red-700 border-red-200',
};

export function StatusBadge({ status, className, compact }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status.replace(/_/g, ' ').split(' ').map(
      (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
    ).join(' '),
    variant: 'neutral' as BadgeVariant,
    icon: <AlertTriangle className="h-3 w-3" />,
    iconCompact: <AlertTriangle className="h-2 w-2" />  
  };

  return (
    <span
      className={cn(
        compact
          ? 'inline-flex items-center gap-1 px-1 py-[0.5px] rounded-full text-[9px] font-medium border'
          : 'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border',
        VARIANT_STYLES[config.variant],
        className
      )}
    >
      {compact ? config.iconCompact : config.icon}
      {config.label}
    </span>
  );
}
