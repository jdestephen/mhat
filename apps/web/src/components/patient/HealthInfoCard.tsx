'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface HealthInfoCardProps {
  title: string;
  icon: LucideIcon;
  iconColor?: string;
  borderColor?: string;
  emptyText?: string;
  isEmpty?: boolean;
  children: React.ReactNode;
}

export function HealthInfoCard({
  title,
  icon: Icon,
  iconColor = 'text-slate-600',
  borderColor = 'border-slate-200',
  emptyText = 'Ninguno',
  isEmpty = false,
  children,
}: HealthInfoCardProps) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border ${borderColor} p-4`}>
      <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-3">
        <Icon className={`w-5 h-5 ${iconColor}`} />
        {title}
      </h2>
      {isEmpty ? (
        <p className="text-sm text-slate-500">{emptyText}</p>
      ) : (
        children
      )}
    </div>
  );
}
