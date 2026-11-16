'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './sidebar';
import { MobileHeader } from './MobileHeader';
import { ProfileBanner } from '@/components/patient/ProfileBanner';
import { useCurrentUser } from '@/hooks/queries/useCurrentUser';
import { useActiveMode } from '@/hooks/useActiveMode';
import { UserRole } from '@/types';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPage = pathname?.startsWith('/auth');
  const isAssistantActivationPage = pathname === '/auth/activate-assistant';
  const isPublicPage = pathname === '/' || pathname?.startsWith('/shared');
  const isOnboardingPage = pathname?.startsWith('/onboarding');
  const { data: user, isLoading: userLoading } = useCurrentUser(!isAssistantActivationPage);
  const { activeMode } = useActiveMode();
  const [sidebarState, setSidebarState] = useState({ pathname, open: false });
  const sidebarOpen = sidebarState.pathname === pathname && sidebarState.open;
  const setSidebarOpen = (open: boolean) => setSidebarState({ pathname, open });

  useEffect(() => {
    // Basic Client-side Protection
    const token = localStorage.getItem('token');

    if (!token && !isAuthPage && !isPublicPage) {
      router.replace('/auth/login');
      return;
    }

    if (token && (isAuthPage || isPublicPage) && !isAssistantActivationPage) {
      if (userLoading || !user) return;
      router.replace(
        user.role !== UserRole.PATIENT && activeMode === 'clinical'
          ? '/doctor'
          : '/dashboard',
      );
      return;
    }
  }, [pathname, router, isAuthPage, isPublicPage, isAssistantActivationPage, userLoading, user, activeMode]);

  if (isAuthPage || isPublicPage) {
    return <>{children}</>;
  }

  // Onboarding renders with minimal chrome (no sidebar, just centered content)
  if (isOnboardingPage) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="max-w-4xl mx-auto px-4 py-6">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Desktop sidebar — always visible on lg+ */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile/Tablet sidebar overlay */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!sidebarOpen && <MobileHeader onMenuToggle={() => setSidebarOpen(true)} />}
        <ProfileBanner />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
