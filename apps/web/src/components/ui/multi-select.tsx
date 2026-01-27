'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface Option {
  id: string;
  display: string;
  [key: string]: any;
}

interface MultiSelectProps {
  endpoint: string;
  placeholder?: string;
  selectedItems: Option[];
  onItemsChange: (items: Option[]) => void;
  className?: string;
  maxItems?: number;
}

export function MultiSelect({ 
  endpoint, 
  placeholder = "Buscar y seleccionar...", 
  selectedItems,
  onItemsChange,
  className,
  maxItems = 5
}: MultiSelectProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Option[]>([]);
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
      const res = await api.get<Option[]>(endpoint, { params: { q } });
      // Filter out already selected items
      const filtered = res.data.filter(
        item => !selectedItems.some(selected => selected.id === item.id)
      );
      setResults(filtered);
    } catch (error) {
      console.error("MultiSelect search failed", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (option: Option) => {
    if (selectedItems.length < maxItems) {
      onItemsChange([...selectedItems, option]);
      setQuery('');
      setResults([]);
      inputRef.current?.focus();
    }
  };

  const handleRemove = (itemToRemove: Option) => {
    onItemsChange(selectedItems.filter(item => item.id !== itemToRemove.id));
  };

  return (
    <div className={cn("relative", className)} ref={wrapperRef}>
      {/* Multi-select input area */}
      <div 
        className={cn(
          "flex flex-wrap items-center gap-1.5 min-h-[42px] w-full rounded-md border border-slate-200 bg-white px-3 py-2",
          "focus-within:outline-none focus-within:ring-1 focus-within:ring-emerald-600 focus-within:border-emerald-600",
          "cursor-text"
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Selected items as chips */}
        {selectedItems.map((item) => (
          <div
            key={item.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded text-sm"
          >
            <span>{item.display}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove(item);
              }}
              className="hover:text-emerald-900"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        
        {/* Input field */}
        {selectedItems.length < maxItems && (
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!open) setOpen(true);
            }}
            onFocus={() => {
              if (query.length >= 2) setOpen(true);
            }}
            placeholder={selectedItems.length === 0 ? placeholder : ""}
            className="flex-1 min-w-[120px] outline-none bg-transparent text-sm"
          />
        )}
        
        {/* Dropdown icon and loading spinner */}
        <div className="flex items-center gap-1 text-slate-400 ml-auto">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </div>

      {/* Dropdown results */}
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
      
      {/* Max items message */}
      {selectedItems.length >= maxItems && (
        <p className="text-xs text-slate-500 mt-1">
          Máximo {maxItems} condiciones alcanzado
        </p>
      )}
    </div>
  );
}
