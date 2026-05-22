'use client';

import dynamic from 'next/dynamic';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAuthStore } from '@/stores/auth-store';
import { switchUserProgress } from '@/stores/progress-store';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const Sidebar = dynamic(
  () => import('@/components/layout/Sidebar').then((m) => ({ default: m.Sidebar })),
  { ssr: false }
);

export function ClientShell({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (user) {
      switchUserProgress(user);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user && pathname !== '/login') {
      router.replace('/login');
    }
  }, [loading, user, pathname, router]);

  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <TooltipProvider>
      <Sidebar />
      <main className="ml-64 flex-1 min-h-screen">
        <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
      </main>
    </TooltipProvider>
  );
}
