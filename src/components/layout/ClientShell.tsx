'use client';

import dynamic from 'next/dynamic';
import { TooltipProvider } from '@/components/ui/tooltip';

const Sidebar = dynamic(
  () => import('@/components/layout/Sidebar').then((m) => ({ default: m.Sidebar })),
  { ssr: false }
);

export function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <Sidebar />
      <main className="ml-64 flex-1 min-h-screen">
        <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
      </main>
    </TooltipProvider>
  );
}
