'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './sidebar';
import { MobileHeader } from './MobileHeader';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPage = pathname?.startsWith('/auth');
  const isPublicPage = pathname === '/' || pathname?.startsWith('/shared'); 
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Basic Client-side Protection
    const token = localStorage.getItem('token');
    
    if (!token && !isAuthPage && !isPublicPage) {
        router.push('/auth/login');
    }
    
    if (token && isPublicPage) {
        router.push('/dashboard');
    }
    
    if (token && isAuthPage) {
         router.push('/dashboard');
    }

  }, [pathname, router, isAuthPage, isPublicPage]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (isAuthPage || isPublicPage) {
    return <>{children}</>;
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
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
