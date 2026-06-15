'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type AvatarSize = 'sm' | 'md' | 'lg';

interface AvatarProps {
  firstName: string;
  lastName: string;
  size?: AvatarSize;
  className?: string;
}

const SIZE_CLASSES: Record<AvatarSize, { container: string; text: string }> = {
  sm: { container: 'w-8 h-8', text: 'text-xs' },
  md: { container: 'w-10 h-10', text: 'text-sm' },
  lg: { container: 'w-12 h-12', text: 'text-lg' },
};

export function Avatar({ firstName, lastName, size = 'lg', className }: AvatarProps) {
  const initials = `${(firstName?.[0] ?? '').toUpperCase()}${(lastName?.[0] ?? '').toUpperCase()}`;

  return (
    <div
      className={cn(
        'rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0',
        SIZE_CLASSES[size].container,
        className
      )}
      aria-label={`${firstName} ${lastName}`}
    >
      <span className={cn('font-semibold text-emerald-700', SIZE_CLASSES[size].text)}>
        {initials}
      </span>
    </div>
  );
}
