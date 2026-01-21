'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  onSearch: (filters: {
    query: string;
    dateFrom?: string;
    dateTo?: string;
  }) => void;
}

export function RecordSearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Auto-trigger search when filters change (with minimum 4 chars for text)
  useEffect(() => {
    const shouldSearch = query.length === 0 || query.length >= 4;
    
    if (shouldSearch) {
      onSearch({
        query,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
    }
  }, [query, dateFrom, dateTo]);

  const handleClear = () => {
    setQuery('');
    setDateFrom('');
    setDateTo('');
  };

  const hasFilters = query || dateFrom || dateTo;

  return (
    <div className="bg-white p-4 rounded-lg border border-[var(--border-light)] shadow-sm mb-6">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Text Search */}
        <div className="md:col-span-8 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by motive, diagnosis, category, status, notes, or tags... (min 4 chars)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
          {query.length > 0 && query.length < 4 && (
            <p className="text-xs text-slate-500 mt-1">
              Type {4 - query.length} more character{4 - query.length !== 1 ? 's' : ''} to search
            </p>
          )}
        </div>

        {/* Date Range */}
        <div className="md:col-span-2 flex gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="From"
            className="text-xs"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="To"
            className="text-xs"
          />
        </div>

        {/* Clear Button */}
        {hasFilters && (
          <div className="md:col-span-2 flex justify-end">
            <Button onClick={handleClear} variant="outline" size="sm">
              <X className="h-4 w-4 mr-1" /> Clear
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
