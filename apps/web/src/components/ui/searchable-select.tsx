'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchableSelectOption {
  value: string | number;
  label: string;
}

export interface SearchableSelectGroup {
  group: string;
  options: SearchableSelectOption[];
}

interface SearchableSelectProps {
  options?: SearchableSelectOption[];
  groups?: SearchableSelectGroup[];
  value?: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
}

export function SearchableSelect({
  options,
  groups,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  searchPlaceholder = 'Buscar...',
  className,
  disabled = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Build flat list for lookup
  const allOptions = useMemo(() => {
    if (options) return options;
    if (groups) return groups.flatMap((g) => g.options);
    return [];
  }, [options, groups]);

  const selectedOption = allOptions.find((opt) => opt.value == value);

  // Filter by search
  const filteredOptions = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return options ?? [];
    return (options ?? []).filter(
      (opt) => opt.label.toLowerCase().includes(term) || String(opt.value).includes(term),
    );
  }, [options, search]);

  const filteredGroups = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return groups ?? [];
    return (groups ?? [])
      .map((g) => ({
        ...g,
        options: g.options.filter(
          (opt) => opt.label.toLowerCase().includes(term) || String(opt.value).includes(term),
        ),
      }))
      .filter((g) => g.options.length > 0);
  }, [groups, search]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [open]);

  const handleSelect = (optionValue: string | number) => {
    onChange(optionValue);
    setOpen(false);
    setSearch('');
  };

  const renderOption = (opt: SearchableSelectOption) => {
    const isSelected = opt.value == value;
    return (
      <div
        key={opt.value}
        className={cn(
          'cursor-pointer rounded-sm px-3 py-2 text-sm hover:bg-slate-100 transition-colors flex items-center justify-between',
          isSelected && 'bg-slate-50',
        )}
        onClick={() => handleSelect(opt.value)}
      >
        <span>{opt.label}</span>
        {isSelected && <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />}
      </div>
    );
  };

  const hasResults = groups ? filteredGroups.length > 0 : filteredOptions.length > 0;

  return (
    <div className={cn('relative', className)} ref={wrapperRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm',
          'focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'hover:bg-slate-50 transition-colors',
          !selectedOption && 'text-slate-400',
        )}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-slate-400 transition-transform flex-shrink-0 ml-1',
            open && 'transform rotate-180',
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-60 overflow-y-auto p-1">
            {!hasResults && (
              <div className="px-3 py-4 text-sm text-slate-400 text-center">Sin resultados</div>
            )}

            {groups
              ? filteredGroups.map((g) => (
                  <div key={g.group}>
                    <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {g.group}
                    </div>
                    {g.options.map(renderOption)}
                  </div>
                ))
              : filteredOptions.map(renderOption)}
          </div>
        </div>
      )}
    </div>
  );
}
