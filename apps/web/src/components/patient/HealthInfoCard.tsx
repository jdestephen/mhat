'use client';

import React, { useState } from 'react';
import { LucideIcon, ChevronDown } from 'lucide-react';

interface HealthInfoCardProps {
  title: string;
  icon: LucideIcon;
  iconColor?: string;
  borderColor?: string;
  emptyText?: string;
  isEmpty?: boolean;
  /** Start collapsed. Defaults to false (expanded). */
  defaultCollapsed?: boolean;
  children: React.ReactNode;
}

export function HealthInfoCard({
  title,
  icon: Icon,
  iconColor = 'text-slate-600',
  borderColor = 'border-slate-200',
  emptyText = 'Ninguno',
  isEmpty = false,
  defaultCollapsed = false,
  children,
}: HealthInfoCardProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${borderColor}`}>
      <button
        type="button"
        onClick={() => setCollapsed((prev) => !prev)}
        className="w-full flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-50 rounded-lg transition-colors"
        aria-expanded={!collapsed}
      >
        <h2 className="font-semibold text-slate-900 flex items-center gap-2 m-0">
          <Icon className={`w-5 h-5 ${iconColor}`} />
          {title}
        </h2>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
            collapsed ? '-rotate-90' : 'rotate-0'
          }`}
        />
      </button>

      <div
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          collapsed ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100'
        }`}
      >
        <div className="px-4 pb-4">
          {isEmpty ? (
            <p className="text-sm text-slate-500">{emptyText}</p>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}
