'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import React from 'react';
import { queryClient } from '@/lib/react-query/queryClient';
import { ActiveProfileProvider } from '@/hooks/useActiveProfile';
import { ActiveModeProvider } from '@/hooks/useActiveMode';
import { ToastProvider } from '@/components/ui/Toast';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ActiveModeProvider>
        <ActiveProfileProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ActiveProfileProvider>
      </ActiveModeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
