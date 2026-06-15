'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('text-center py-12', className)}>
      <div className="flex justify-center mb-4 text-slate-300">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-slate-900 mb-2">{title}</h3>
      {description && (
        <p className="text-slate-500 text-sm max-w-sm mx-auto">{description}</p>
      )}
      {action && (
        <div className="mt-6">{action}</div>
      )}
    </div>
  );
}
