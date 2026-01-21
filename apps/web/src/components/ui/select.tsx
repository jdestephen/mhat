'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  value?: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function Select({ 
  options, 
  value, 
  onChange, 
  placeholder = 'Select an option', 
  className,
  disabled = false 
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value == value); // Use == for type coercion

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue: string | number) => {
    onChange(optionValue);
    setOpen(false);
  };

  return (
    <div className={cn("relative", className)} ref={wrapperRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm",
          "focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "hover:bg-slate-50 transition-colors",
          !selectedOption && "text-slate-400"
        )}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          className={cn(
            "h-4 w-4 text-slate-400 transition-transform",
            open && "transform rotate-180"
          )} 
        />
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg p-1">
          {options.map((option) => {
            const isSelected = option.value == value; // Use == for type coercion
            return (
              <div
                key={option.value}
                className={cn(
                  "cursor-pointer rounded-sm px-3 py-2 text-sm hover:bg-slate-100 transition-colors flex items-center justify-between",
                  isSelected && "bg-slate-50"
                )}
                onClick={() => handleSelect(option.value)}
              >
                <span>{option.label}</span>
                {isSelected && (
                  <Check className="h-4 w-4 text-emerald-600" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
