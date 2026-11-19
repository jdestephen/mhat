'use client';

import { useCallback, useMemo, useState } from 'react';

interface UsePaginationStateOptions {
  initialPage?: number;
  initialPageSize?: number;
  totalItems?: number;
  /** Change this value when filters or the active resource change. */
  resetKey?: string | number | boolean | null;
}

function positiveInteger(value: number, fallback: number): number {
  return Number.isFinite(value) && value >= 1 ? Math.floor(value) : fallback;
}

export function usePaginationState({
  initialPage = 1,
  initialPageSize = 20,
  totalItems,
  resetKey,
}: UsePaginationStateOptions = {}) {
  const [state, setState] = useState({
    page: positiveInteger(initialPage, 1),
    pageSize: positiveInteger(initialPageSize, 20),
    resetKey,
  });

  const totalPages = useMemo(() => {
    if (totalItems === undefined) return undefined;
    return totalItems > 0 ? Math.ceil(totalItems / state.pageSize) : 0;
  }, [state.pageSize, totalItems]);

  const maximumPage = totalPages === undefined ? undefined : Math.max(1, totalPages);
  const resetChanged = !Object.is(state.resetKey, resetKey);
  const normalizedPage = resetChanged
    ? 1
    : maximumPage === undefined
      ? state.page
      : Math.min(state.page, maximumPage);

  // React applies this guarded update before rendering consumers of the hook.
  if (resetChanged || normalizedPage !== state.page) {
    setState((current) => ({ ...current, page: normalizedPage, resetKey }));
  }

  const setPage = useCallback(
    (nextPage: number) => {
      const normalizedPage = positiveInteger(nextPage, 1);
      setState((current) => ({
        ...current,
        page:
          maximumPage === undefined
            ? normalizedPage
            : Math.min(normalizedPage, maximumPage),
        resetKey,
      }));
    },
    [maximumPage, resetKey]
  );

  const setPageSize = useCallback((nextPageSize: number) => {
    if (!Number.isFinite(nextPageSize) || nextPageSize < 1) return;
    setState({ page: 1, pageSize: Math.floor(nextPageSize), resetKey });
  }, [resetKey]);

  const resetPage = useCallback(() => {
    setState((current) => ({ ...current, page: 1, resetKey }));
  }, [resetKey]);

  return {
    page: normalizedPage,
    pageSize: state.pageSize,
    skip: (normalizedPage - 1) * state.pageSize,
    limit: state.pageSize,
    totalPages,
    setPage,
    setPageSize,
    resetPage,
  };
}
