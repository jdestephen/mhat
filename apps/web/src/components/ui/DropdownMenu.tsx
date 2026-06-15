'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DropdownMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  /** Only render this item when true (defaults to true) */
  visible?: boolean;
  /** Visual separator before this item */
  divider?: boolean;
  /** Danger styling */
  danger?: boolean;
}

interface DropdownMenuProps {
  items: DropdownMenuItem[];
  /** Custom trigger — defaults to MoreVertical icon */
  trigger?: React.ReactNode;
  /** Alignment relative to trigger */
  align?: 'left' | 'right';
  className?: string;
}

export function DropdownMenu({ items, trigger, align = 'right', className }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, close]);

  const visibleItems = items.filter((item) => item.visible !== false);

  if (visibleItems.length === 0) return null;

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      {/* Trigger */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="text-slate-400 hover:text-slate-600 hover:cursor-pointer p-1 rounded transition-colors"
        aria-haspopup="true"
        aria-expanded={open}
      >
        {trigger ?? <MoreVertical className="h-5 w-5" />}
      </button>

      {/* Menu */}
      {open && (
        <>
          {/* Backdrop for mobile */}
          <div className="fixed inset-0 z-10" onClick={close} />

          <div
            className={cn(
              'absolute z-20 mt-1 w-48 rounded-md shadow-lg bg-white ring-1 ring-slate-200 ring-opacity-5 py-1',
              align === 'right' ? 'right-0' : 'left-0'
            )}
            role="menu"
          >
            {visibleItems.map((item, idx) => (
              <React.Fragment key={idx}>
                {item.divider && idx > 0 && (
                  <div className="border-t border-slate-100 my-1" />
                )}
                <button
                  className={cn(
                    'flex w-full items-center gap-2 px-4 py-2 text-sm transition-colors',
                    item.danger
                      ? 'text-red-600 hover:bg-red-50'
                      : 'text-slate-700 hover:bg-slate-100'
                  )}
                  onClick={() => {
                    close();
                    item.onClick();
                  }}
                  role="menuitem"
                >
                  {item.icon}
                  {item.label}
                </button>
              </React.Fragment>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
