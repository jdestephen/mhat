'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Calendar, X } from 'lucide-react';

interface SearchBarProps {
  onSearch: (filters: {
    query: string;
    categoryId?: number;
    dateFrom?: string;
    dateTo?: string;
  }) => void;
  categories: Array<{ id: number; name: string }>;
}

export function RecordSearchBar({ onSearch, categories }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Auto-trigger search when filters change (with minimum 5 chars for text)
  useEffect(() => {
    const shouldSearch = query.length === 0 || query.length >= 5;
    
    if (shouldSearch) {
      onSearch({
        query,
        categoryId: categoryId ? parseInt(categoryId) : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
    }
  }, [query, categoryId, dateFrom, dateTo, onSearch]);

  const handleClear = () => {
    setQuery('');
    setCategoryId('');
    setDateFrom('');
    setDateTo('');
  };

  const hasFilters = query || categoryId || dateFrom || dateTo;

  return (
    <div className="bg-white p-4 rounded-lg border border-[var(--border-light)] shadow-sm mb-6">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Text Search */}
        <div className="md:col-span-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by motive, diagnosis, notes, or tags... (min 4 chars)"
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

        {/* Category Filter */}
        <div className="md:col-span-3">
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-md border border-slate-200 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-600 focus-visible:ring-offset-0"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range */}
        <div className="md:col-span-3 flex gap-2">
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
      </div>

      {/* Clear Button */}
      {hasFilters && (
        <div className="flex gap-2 mt-3">
          <Button onClick={handleClear} variant="outline" size="sm">
            <X className="h-4 w-4 mr-1" /> Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}
