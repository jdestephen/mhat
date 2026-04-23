/**
 * @deprecated Use `Combobox` from '@/components/ui/Combobox' instead.
 * This component is kept for backward compatibility with pages not yet migrated.
 */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface CatalogItem {
  id: string;
  display: string;
  code?: string;
  code_system?: string;
}

interface CatalogSearchSelectProps {
  endpoint: string;
  value?: CatalogItem | null;
  onChange: (item: CatalogItem) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/** Single-value searchable select that queries a backend catalog endpoint. */
export function CatalogSearchSelect({
  endpoint,
  value,
  onChange,
  placeholder = 'Buscar...',
  className,
  disabled = false,
}: CatalogSearchSelectProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2 && open) {
        searchCatalog(query);
      } else if (query.length < 2) {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, open]);

  const searchCatalog = async (q: string) => {
    setLoading(true);
    try {
      const res = await api.get<CatalogItem[]>(endpoint, { params: { q } });
      setResults(res.data);
    } catch (error) {
      console.error('CatalogSearchSelect search failed', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (item: CatalogItem) => {
    onChange(item);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div className={cn('relative', className)} ref={wrapperRef}>
      <div
        className={cn(
          'flex h-10 w-full items-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm',
          'focus-within:outline-none focus-within:ring-1 focus-within:ring-emerald-600 focus-within:border-emerald-600',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
        onClick={() => {
          if (!disabled && !open) {
            setOpen(true);
            inputRef.current?.focus();
          }
        }}
      >
        {open ? (
          <div className="flex items-center gap-2 flex-1">
            <Search className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              className="flex-1 outline-none bg-transparent text-sm min-w-0"
              autoFocus
            />
          </div>
        ) : (
          <span className={cn('truncate flex-1', !value && 'text-slate-400')}>
            {value ? value.display : placeholder}
          </span>
        )}
        <div className="flex items-center gap-1 text-slate-400 ml-1 flex-shrink-0">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ChevronDown
              className={cn('h-4 w-4 transition-transform', open && 'rotate-180')}
            />
          )}
        </div>
      </div>

      {open && query.length >= 2 && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg p-1">
          {results.length > 0 ? (
            results.map((item) => (
              <div
                key={item.id}
                className="cursor-pointer rounded-sm px-3 py-2 text-sm hover:bg-slate-100 transition-colors"
                onClick={() => handleSelect(item)}
              >
                {item.display}
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-slate-500 text-center">
              {loading ? 'Buscando...' : 'No se encontraron resultados.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
