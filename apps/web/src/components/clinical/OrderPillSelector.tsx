'use client';

import { useState, useMemo } from 'react';
import { Search, Plus, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { OrderItem } from '@/types';
import { OrderOptionGroup } from '@/hooks/queries/useOrderOptions';

interface OrderPillSelectorProps {
  groups: OrderOptionGroup[];
  codeSystem: string;
  selectedItems: OrderItem[];
  onSelectionChange: (items: OrderItem[]) => void;
  accentColor: string;
}

const ACCENT_STYLES: Record<string, { pill: string; pillSelected: string; header: string }> = {
  purple: {
    pill: 'border-purple-200 hover:border-purple-400 hover:bg-purple-50 text-slate-700',
    pillSelected: 'bg-purple-100 border-purple-400 text-purple-800 ring-1 ring-purple-300',
    header: 'text-purple-700',
  },
  blue: {
    pill: 'border-blue-200 hover:border-blue-400 hover:bg-blue-50 text-slate-700',
    pillSelected: 'bg-blue-100 border-blue-400 text-blue-800 ring-1 ring-blue-300',
    header: 'text-blue-700',
  },
  amber: {
    pill: 'border-amber-200 hover:border-amber-400 hover:bg-amber-50 text-slate-700',
    pillSelected: 'bg-amber-100 border-amber-400 text-amber-800 ring-1 ring-amber-300',
    header: 'text-amber-700',
  },
  gray: {
    pill: 'border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700',
    pillSelected: 'bg-slate-200 border-slate-400 text-slate-800 ring-1 ring-slate-300',
    header: 'text-slate-700',
  },
};

export function OrderPillSelector({
  groups,
  codeSystem,
  selectedItems,
  onSelectionChange,
  accentColor,
}: OrderPillSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [customValue, setCustomValue] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const styles = ACCENT_STYLES[accentColor] || ACCENT_STYLES.gray;

  const isSelected = (option: OrderItem) =>
    selectedItems.some((item) => item.display === option.display);

  const toggleItem = (option: OrderItem) => {
    if (isSelected(option)) {
      onSelectionChange(selectedItems.filter((item) => item.display !== option.display));
    } else {
      const newItem: OrderItem = {
        display: option.display,
        code: option.code,
        code_system: option.code_system || codeSystem,
      };
      onSelectionChange([...selectedItems, newItem]);
    }
  };

  const addCustomItem = () => {
    const trimmed = customValue.trim();
    if (!trimmed) return;
    if (selectedItems.some((item) => item.display === trimmed)) return;

    onSelectionChange([...selectedItems, { display: trimmed }]);
    setCustomValue('');
  };

  const toggleGroupCollapse = (groupName: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups;

    const q = searchQuery.toLowerCase();
    return groups
      .map((group) => ({
        ...group,
        options: group.options.filter((opt) => opt.display.toLowerCase().includes(q)),
      }))
      .filter((group) => group.options.length > 0);
  }, [groups, searchQuery]);

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar opciones..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
        />
      </div>

      {/* Selected count */}
      {selectedItems.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Check className="h-3.5 w-3.5 text-emerald-600" />
          <span>{selectedItems.length} seleccionado{selectedItems.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Scrollable pill grid */}
      <div className="max-h-[280px] overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-slate-300">
        {filteredGroups.map((group) => {
          const isCollapsed = collapsedGroups.has(group.group);
          return (
            <div key={group.group}>
              {/* Group header */}
              <button
                type="button"
                onClick={() => toggleGroupCollapse(group.group)}
                className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide mb-2 cursor-pointer hover:opacity-80 transition-opacity ${styles.header}`}
              >
                {isCollapsed ? (
                  <ChevronRight className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
                {group.group}
                <span className="text-slate-400 font-normal normal-case">
                  ({group.options.length})
                </span>
              </button>

              {/* Pills */}
              {!isCollapsed && (
                <div className="flex flex-wrap gap-1.5">
                  {group.options.map((option) => {
                    const selected = isSelected(option);
                    return (
                      <button
                        key={option.display}
                        type="button"
                        onClick={() => toggleItem(option)}
                        className={`
                          inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium
                          rounded-full border transition-all duration-150 cursor-pointer
                          ${selected ? styles.pillSelected : styles.pill}
                        `}
                      >
                        {selected && <Check className="h-3 w-3 shrink-0" />}
                        {option.display}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {filteredGroups.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-4">
            No se encontraron opciones para &quot;{searchQuery}&quot;
          </p>
        )}
      </div>

      {/* Custom item input */}
      <div className="flex gap-2 pt-1 border-t border-slate-100">
        <input
          type="text"
          placeholder="Agregar opción personalizada..."
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addCustomItem();
            }
          }}
          className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
        />
        <button
          type="button"
          onClick={addCustomItem}
          disabled={!customValue.trim()}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Agregar
        </button>
      </div>
    </div>
  );
}
