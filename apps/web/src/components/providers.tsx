'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import React from 'react';
import { usePathname } from 'next/navigation';
import { queryClient } from '@/lib/react-query/queryClient';
import { ActiveProfileProvider } from '@/hooks/useActiveProfile';
import { ActiveModeProvider } from '@/hooks/useActiveMode';
import { ToastProvider } from '@/components/ui/Toast';

export function Providers({ children }: { children: React.ReactNode }) {
  const isAssistantActivationPage = usePathname() === '/auth/activate-assistant';

  return (
    <QueryClientProvider client={queryClient}>
      {isAssistantActivationPage ? (
        <ToastProvider>{children}</ToastProvider>
      ) : (
        <ActiveModeProvider>
          <ActiveProfileProvider>
            <ToastProvider>{children}</ToastProvider>
          </ActiveProfileProvider>
        </ActiveModeProvider>
      )}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
