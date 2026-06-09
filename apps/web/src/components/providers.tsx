'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import React from 'react';
import { queryClient } from '@/lib/react-query/queryClient';
import { ActiveProfileProvider } from '@/hooks/useActiveProfile';
import { ToastProvider } from '@/components/ui/Toast';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ActiveProfileProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </ActiveProfileProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
