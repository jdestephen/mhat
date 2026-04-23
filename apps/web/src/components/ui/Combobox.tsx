'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Check, ChevronDown, Search, Loader2, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ComboboxOption {
  value: string;
  label: string;
  code?: string;
  code_system?: string;
}

export interface ComboboxGroup {
  group: string;
  options: ComboboxOption[];
}

interface ComboboxBaseProps {
  /** Static options list */
  options?: ComboboxOption[];
  /** Grouped static options */
  groups?: ComboboxGroup[];
  /** Backend search endpoint (enables async mode) */
  endpoint?: string;
  /** Allow user to enter values not in the list */
  creatable?: boolean;
  /** Show search/filter input (auto-enabled for endpoint mode) */
  searchable?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
}

interface SingleComboboxProps extends ComboboxBaseProps {
  multiple?: false;
  value?: string;
  onValueChange: (value: string, option?: ComboboxOption) => void;
}

interface MultiComboboxProps extends ComboboxBaseProps {
  multiple: true;
  selectedItems: ComboboxOption[];
  onItemsChange: (items: ComboboxOption[]) => void;
  maxItems?: number;
}

type ComboboxProps = SingleComboboxProps | MultiComboboxProps;

// ─── Component ───────────────────────────────────────────────────────────────

export function Combobox(props: ComboboxProps) {
  const {
    options,
    groups,
    endpoint,
    creatable = false,
    searchable: searchableProp,
    placeholder = 'Seleccionar...',
    searchPlaceholder = 'Buscar...',
    className,
    disabled = false,
  } = props;

  const isMulti = props.multiple === true;
  const isAsync = !!endpoint;
  const isSearchable = searchableProp ?? (isAsync || !!groups);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [asyncResults, setAsyncResults] = useState<ComboboxOption[]>([]);
  const [loading, setLoading] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const inlineInputRef = useRef<HTMLInputElement>(null);

  // ── Flat options for lookup ──
  const allStaticOptions = useMemo(() => {
    if (options) return options;
    if (groups) return groups.flatMap((g) => g.options);
    return [];
  }, [options, groups]);

  // ── Click outside ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Auto-focus search on open ──
  useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [open]);

  // ── Async search ──
  useEffect(() => {
    if (!isAsync || !open) return;

    const timer = setTimeout(() => {
      if (search.length >= 2) {
        fetchResults(search);
      } else {
        setAsyncResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search, open, isAsync]);

  const fetchResults = async (q: string) => {
    if (!endpoint) return;
    setLoading(true);
    try {
      const res = await api.get<Array<{ id: string; display: string; code?: string; code_system?: string }>>(
        endpoint,
        { params: { q } },
      );
      const mapped: ComboboxOption[] = res.data.map((item) => ({
        value: item.id,
        label: item.display,
        code: item.code,
        code_system: item.code_system,
      }));

      // For multi mode, filter out already-selected items
      if (isMulti) {
        const selected = (props as MultiComboboxProps).selectedItems;
        const filtered = mapped.filter(
          (opt) => !selected.some((s) => s.value === opt.value),
        );
        setAsyncResults(filtered);
      } else {
        setAsyncResults(mapped);
      }
    } catch (error) {
      console.error('Combobox search failed', error);
      setAsyncResults([]);
    } finally {
      setLoading(false);
    }
  };

  // ── Client-side filtering for static options ──
  const filteredOptions = useMemo(() => {
    if (isAsync) return asyncResults;
    const term = search.toLowerCase().trim();
    if (!term) return options ?? [];
    return (options ?? []).filter(
      (opt) =>
        opt.label.toLowerCase().includes(term) ||
        opt.value.toLowerCase().includes(term),
    );
  }, [isAsync, asyncResults, options, search]);

  const filteredGroups = useMemo(() => {
    if (isAsync || !groups) return [];
    const term = search.toLowerCase().trim();
    if (!term) return groups;
    return groups
      .map((g) => ({
        ...g,
        options: g.options.filter(
          (opt) =>
            opt.label.toLowerCase().includes(term) ||
            opt.value.toLowerCase().includes(term),
        ),
      }))
      .filter((g) => g.options.length > 0);
  }, [isAsync, groups, search]);

  // ── Derived state ──
  const displayOptions = groups ? undefined : filteredOptions;
  const displayGroups = groups ? filteredGroups : undefined;
  const hasResults = displayGroups
    ? displayGroups.length > 0
    : (displayOptions?.length ?? 0) > 0;

  const showCreatable = creatable && search.trim().length > 0 && !hasExactMatch();

  function hasExactMatch(): boolean {
    const term = search.toLowerCase().trim();
    if (!term) return false;
    if (displayGroups) {
      return displayGroups.some((g) =>
        g.options.some((opt) => opt.label.toLowerCase() === term),
      );
    }
    return (displayOptions ?? []).some(
      (opt) => opt.label.toLowerCase() === term,
    );
  }

  // ── Selection handlers ──
  function handleSelect(opt: ComboboxOption) {
    if (isMulti) {
      const multiProps = props as MultiComboboxProps;
      if (multiProps.selectedItems.length < (multiProps.maxItems ?? Infinity)) {
        multiProps.onItemsChange([...multiProps.selectedItems, opt]);
      }
      setSearch('');
      setAsyncResults([]);
      inlineInputRef.current?.focus();
    } else {
      const singleProps = props as SingleComboboxProps;
      singleProps.onValueChange(isAsync ? opt.label : opt.value, opt);
      setOpen(false);
      setSearch('');
    }
  }

  function handleCreateCustom() {
    const customValue = search.trim();
    if (!customValue) return;

    const customOption: ComboboxOption = {
      value: customValue,
      label: customValue,
    };

    if (isMulti) {
      const multiProps = props as MultiComboboxProps;
      if (multiProps.selectedItems.length < (multiProps.maxItems ?? Infinity)) {
        multiProps.onItemsChange([...multiProps.selectedItems, customOption]);
      }
      setSearch('');
      setAsyncResults([]);
      inlineInputRef.current?.focus();
    } else {
      const singleProps = props as SingleComboboxProps;
      singleProps.onValueChange(customValue, undefined);
      setOpen(false);
      setSearch('');
    }
  }

  function handleRemoveItem(item: ComboboxOption) {
    if (!isMulti) return;
    const multiProps = props as MultiComboboxProps;
    multiProps.onItemsChange(
      multiProps.selectedItems.filter((s) => s.value !== item.value),
    );
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (showCreatable) {
        handleCreateCustom();
      }
    }
    if (e.key === 'Backspace' && !search && isMulti) {
      const multiProps = props as MultiComboboxProps;
      if (multiProps.selectedItems.length > 0) {
        multiProps.onItemsChange(multiProps.selectedItems.slice(0, -1));
      }
    }
  }

  // ── Get display text for single-select trigger ──
  function getDisplayText(): string | null {
    if (isMulti) return null;
    const singleProps = props as SingleComboboxProps;
    const val = singleProps.value;
    if (!val) return null;

    // For static options, find the matching label
    if (!isAsync) {
      const match = allStaticOptions.find((opt) => opt.value == val);
      return match?.label ?? val;
    }

    // For async, the value IS the display text
    return val;
  }

  // ── Render option row ──
  function renderOption(opt: ComboboxOption) {
    const isSelected = isMulti
      ? (props as MultiComboboxProps).selectedItems.some(
          (s) => s.value === opt.value,
        )
      : opt.value == (props as SingleComboboxProps).value;

    return (
      <div
        key={opt.value}
        className={cn(
          'cursor-pointer rounded-sm px-3 py-2 text-sm hover:bg-slate-100 transition-colors flex items-center justify-between',
          isSelected && 'bg-slate-50',
        )}
        onClick={() => handleSelect(opt)}
      >
        <span>{opt.label}</span>
        {isSelected && (
          <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
        )}
      </div>
    );
  }

  // ── Minimum chars required for async ──
  const showDropdown = isAsync ? search.length >= 2 : true;

  // ─── MULTI-SELECT RENDER ────────────────────────────────────────────────────

  if (isMulti) {
    const multiProps = props as MultiComboboxProps;
    const maxReached = multiProps.selectedItems.length >= (multiProps.maxItems ?? Infinity);

    return (
      <div className={cn('relative', className)} ref={wrapperRef}>
        <div
          className={cn(
            'flex flex-wrap items-center gap-1.5 min-h-[42px] w-full rounded-md border border-slate-200 bg-white px-3 py-2',
            'focus-within:outline-none focus-within:ring-1 focus-within:ring-emerald-600 focus-within:border-emerald-600',
            'cursor-text',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
          onClick={() => inlineInputRef.current?.focus()}
        >
          {multiProps.selectedItems.map((item) => (
            <div
              key={item.value}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded text-sm"
            >
              <span>{item.label}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveItem(item);
                }}
                className="hover:text-emerald-900"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          {!maxReached && (
            <input
              ref={inlineInputRef}
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (!open) setOpen(true);
              }}
              onFocus={() => {
                if (search.length >= 2) setOpen(true);
              }}
              onKeyDown={handleKeyDown}
              placeholder={
                multiProps.selectedItems.length === 0 ? placeholder : ''
              }
              disabled={disabled}
              className={cn(
                'flex-1 min-w-[120px] outline-none bg-transparent text-sm',
                disabled && 'opacity-50 cursor-not-allowed',
              )}
            />
          )}

          <div className="flex items-center gap-1 text-slate-400 ml-auto flex-shrink-0">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </div>

        {/* Dropdown */}
        {open && showDropdown && (
          <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg p-1">
            {hasResults ? (
              (displayOptions ?? []).map(renderOption)
            ) : !loading && !showCreatable ? (
              <div className="px-3 py-2 text-sm text-slate-500 text-center">
                {isAsync && search.length < 2
                  ? 'Escribe al menos 2 caracteres...'
                  : 'No se encontraron resultados.'}
              </div>
            ) : null}

            {showCreatable && (
              <div
                className="cursor-pointer rounded-sm px-3 py-2 text-sm hover:bg-emerald-50 transition-colors flex items-center gap-2 text-emerald-700 border-t border-slate-100 mt-1 pt-1"
                onClick={handleCreateCustom}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Agregar &quot;{search.trim()}&quot;</span>
              </div>
            )}

            {loading && !hasResults && (
              <div className="px-3 py-2 text-sm text-slate-500 text-center">
                Buscando...
              </div>
            )}
          </div>
        )}

        {maxReached && (
          <p className="text-xs text-slate-500 mt-1">
            Máximo {multiProps.maxItems} elementos alcanzado
          </p>
        )}
      </div>
    );
  }

  // ─── SINGLE-SELECT RENDER ───────────────────────────────────────────────────

  const singleProps = props as SingleComboboxProps;
  const displayText = getDisplayText();

  return (
    <div className={cn('relative', className)} ref={wrapperRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => {
          if (!disabled) {
            setOpen(!open);
            if (!open && isAsync) {
              setSearch(displayText || '');
            }
          }
        }}
        disabled={disabled}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm',
          'focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'hover:bg-slate-50 transition-colors',
          !displayText && 'text-slate-400',
        )}
      >
        <span className="truncate">
          {displayText || placeholder}
        </span>
        <div className="flex items-center gap-1 text-slate-400 ml-1 flex-shrink-0">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform',
                open && 'rotate-180',
              )}
            />
          )}
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg overflow-hidden">
          {/* Search input */}
          {(isSearchable || isAsync) && (
            <div className="p-2 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={searchPlaceholder}
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
                />
              </div>
            </div>
          )}

          {/* Options list */}
          {showDropdown && (
            <div className="max-h-60 overflow-y-auto p-1">
              {!hasResults && !loading && !showCreatable && (
                <div className="px-3 py-4 text-sm text-slate-400 text-center">
                  {isAsync && search.length < 2
                    ? 'Escribe al menos 2 caracteres...'
                    : 'Sin resultados'}
                </div>
              )}

              {displayGroups
                ? displayGroups.map((g) => (
                    <div key={g.group}>
                      <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        {g.group}
                      </div>
                      {g.options.map(renderOption)}
                    </div>
                  ))
                : (displayOptions ?? []).map(renderOption)}

              {showCreatable && (
                <div
                  className="cursor-pointer rounded-sm px-3 py-2 text-sm hover:bg-emerald-50 transition-colors flex items-center gap-2 text-emerald-700 border-t border-slate-100 mt-1 pt-1"
                  onClick={handleCreateCustom}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Usar &quot;{search.trim()}&quot;</span>
                </div>
              )}

              {loading && (
                <div className="px-3 py-2 text-sm text-slate-500 text-center">
                  Buscando...
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
