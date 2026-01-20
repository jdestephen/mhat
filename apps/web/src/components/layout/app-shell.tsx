'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPage = pathname?.startsWith('/auth');
  const isPublicPage = pathname === '/'; 

  useEffect(() => {
    // Basic Client-side Protection
    const token = localStorage.getItem('token');
    
    if (!token && !isAuthPage && !isPublicPage) {
        // If not logged in and trying to access protected route -> Login
        router.push('/auth/login');
    }
    
    if (token && isPublicPage) {
        // If logged in and on landing page -> Dashboard
        router.push('/dashboard');
    }
    
    if (token && isAuthPage) {
         // If logged in and on auth pages -> Dashboard
         router.push('/dashboard');
    }

  }, [pathname, router, isAuthPage, isPublicPage]);

  if (isAuthPage || isPublicPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
