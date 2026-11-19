'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
  disabled?: boolean;
  isLoading?: boolean;
  /** Label for the items being paginated (e.g., "registros") */
  itemLabel?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  disabled = false,
  isLoading = false,
  itemLabel = 'elementos',
}: PaginationProps) {
  const normalizedTotalPages = Math.max(0, totalPages);
  const normalizedCurrentPage =
    normalizedTotalPages > 0
      ? Math.min(Math.max(1, currentPage), normalizedTotalPages)
      : 1;
  const controlsDisabled = disabled || isLoading;
  const hasItems = totalItems > 0;
  const availablePageSizes = Array.from(new Set([...pageSizeOptions, pageSize])).sort(
    (a, b) => a - b
  );

  if (normalizedTotalPages <= 1 && !onPageSizeChange) return null;

  const startItem = hasItems ? (normalizedCurrentPage - 1) * pageSize + 1 : 0;
  const endItem = hasItems
    ? Math.min(normalizedCurrentPage * pageSize, totalItems)
    : 0;

  /** Generates page numbers to display with ellipsis logic */
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;

    if (normalizedTotalPages <= maxVisible + 2) {
      for (let i = 1; i <= normalizedTotalPages; i++) pages.push(i);
      return pages;
    }

    pages.push(1);

    if (normalizedCurrentPage > 3) pages.push('ellipsis');

    const start = Math.max(2, normalizedCurrentPage - 1);
    const end = Math.min(normalizedTotalPages - 1, normalizedCurrentPage + 1);

    for (let i = start; i <= end; i++) pages.push(i);

    if (normalizedCurrentPage < normalizedTotalPages - 2) pages.push('ellipsis');

    pages.push(normalizedTotalPages);

    return pages;
  };

  const btnBase =
    'inline-flex items-center justify-center h-8 min-w-[2rem] px-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1';
  const btnDefault = `${btnBase} text-slate-600 hover:bg-slate-100 border border-slate-200`;
  const btnActive = `${btnBase} bg-emerald-600 text-white border border-emerald-600 shadow-sm`;
  const btnDisabled = `${btnBase} text-slate-300 cursor-not-allowed border border-slate-100`;

  return (
    <div
      className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4"
      aria-busy={isLoading}
    >
      {/* Item count */}
      <div className="flex flex-col sm:flex-row items-center gap-3 text-sm text-slate-500 order-2 sm:order-1">
        <p aria-live="polite">
          Mostrando <span className="font-medium text-slate-700">{startItem}</span> a{' '}
          <span className="font-medium text-slate-700">{endItem}</span> de{' '}
          <span className="font-medium text-slate-700">{Math.max(0, totalItems)}</span>{' '}
          {itemLabel}
        </p>
        {onPageSizeChange && (
          <label className="flex items-center gap-2 whitespace-nowrap">
            Por página
            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              disabled={controlsDisabled}
              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={`Cantidad de ${itemLabel} por página`}
            >
              {availablePageSizes.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {/* Page buttons */}
      {normalizedTotalPages > 1 && (
        <nav className="flex items-center gap-1 order-1 sm:order-2" aria-label="Paginación">
          {/* First page */}
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={controlsDisabled || normalizedCurrentPage === 1}
            className={
              controlsDisabled || normalizedCurrentPage === 1 ? btnDisabled : btnDefault
            }
            aria-label="Primera página"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>

          {/* Previous page */}
          <button
            type="button"
            onClick={() => onPageChange(normalizedCurrentPage - 1)}
            disabled={controlsDisabled || normalizedCurrentPage === 1}
            className={
              controlsDisabled || normalizedCurrentPage === 1 ? btnDisabled : btnDefault
            }
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Page numbers */}
          {getPageNumbers().map((page, idx) =>
            page === 'ellipsis' ? (
              <span key={`ellipsis-${idx}`} className="px-1 text-slate-400 select-none">
                …
              </span>
            ) : (
              <button
                type="button"
                key={page}
                onClick={() => onPageChange(page)}
                disabled={controlsDisabled}
                className={
                  controlsDisabled
                    ? btnDisabled
                    : page === normalizedCurrentPage
                      ? btnActive
                      : btnDefault
                }
                aria-current={page === normalizedCurrentPage ? 'page' : undefined}
              >
                {page}
              </button>
            )
          )}

          {/* Next page */}
          <button
            type="button"
            onClick={() => onPageChange(normalizedCurrentPage + 1)}
            disabled={controlsDisabled || normalizedCurrentPage === normalizedTotalPages}
            className={
              controlsDisabled || normalizedCurrentPage === normalizedTotalPages
                ? btnDisabled
                : btnDefault
            }
            aria-label="Página siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Last page */}
          <button
            type="button"
            onClick={() => onPageChange(normalizedTotalPages)}
            disabled={controlsDisabled || normalizedCurrentPage === normalizedTotalPages}
            className={
              controlsDisabled || normalizedCurrentPage === normalizedTotalPages
                ? btnDisabled
                : btnDefault
            }
            aria-label="Última página"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </nav>
      )}
    </div>
  );
}
