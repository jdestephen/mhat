'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Check, ChevronsUpDown, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface Option {
  id: string;
  display: string;
  [key: string]: any;
}

interface AutocompleteProps {
  endpoint: string; // e.g. /catalog/allergies
  placeholder?: string;
  onSelect: (option: Option) => void;
  className?: string;
  value?: string;
  onChange?: (value: string) => void;
}

export function Autocomplete({ endpoint, placeholder, onSelect, className, value, onChange }: AutocompleteProps) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value !== undefined) {
      setQuery(value);
    }
  }, [value]);

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
      setResults(res.data);
    } catch (error) {
      console.error("Autocomplete search failed", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setQuery(newVal);
    if (!open) setOpen(true);
    if (onChange) onChange(newVal);
  };

  const handleSelect = (option: Option) => {
    setQuery(option.display);
    setOpen(false);
    onSelect(option);
    if (onChange) onChange(option.display);
  };

  return (
    <div className={cn("relative", className)} ref={wrapperRef}>
      <div className="relative">
          <Input 
            value={query}
            onChange={handleInputChange}
            placeholder={placeholder}
            onFocus={() => {
                if (query.length >= 2) setOpen(true);
            }}
            className="pr-10"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
             {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </div>
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg p-1">
            {results.map((item) => (
                <div 
                  key={item.id}
                  className="cursor-pointer rounded-sm px-3 py-2 text-sm hover:bg-slate-100 transition-colors"
                  onClick={() => handleSelect(item)}
                >
                    {item.display}
                </div>
            ))}
        </div>
      )}
      {open && query.length >= 2 && results.length === 0 && !loading && (
          <div className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg p-3 text-sm text-slate-500 text-center">
              No results found.
          </div>
      )}
    </div>
  );
}
