'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  Calculator,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  LayoutDashboard,
  RefreshCw,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { allDays } from '@/content';
import { useProgressStore, getDayCompletionPercent } from '@/stores/progress-store';

const WEEK_1_DAYS = [1, 2, 3, 4, 5, 6, 7];
const WEEK_2_DAYS = [8, 9, 10, 11, 12, 13, 14];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const days = useProgressStore((s) => s.days);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r border-border bg-card transition-all duration-200',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border p-4">
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg">Optiver Prep</span>
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded p-1 hover:bg-accent"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          <NavItem
            href="/"
            icon={<LayoutDashboard className="h-4 w-4" />}
            label="Dashboard"
            active={pathname === '/'}
            collapsed={collapsed}
          />

          <div className="mt-4">
            {!collapsed && (
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Week 1: Core Mechanics
              </p>
            )}
            {WEEK_1_DAYS.map((day) => {
              const content = allDays.find((d) => d.dayNumber === day);
              const completion = content
                ? getDayCompletionPercent(days, day, content.exercises.length)
                : 0;
              return (
                <NavItem
                  key={day}
                  href={`/day/${day}`}
                  icon={
                    <span className="flex h-4 w-4 items-center justify-center text-xs font-bold">
                      {day}
                    </span>
                  }
                  label={content?.title ?? `Day ${day}`}
                  active={pathname === `/day/${day}`}
                  collapsed={collapsed}
                  completion={completion}
                />
              );
            })}
          </div>

          <div className="mt-4">
            {!collapsed && (
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Week 2: Advanced Topics
              </p>
            )}
            {WEEK_2_DAYS.map((day) => {
              const content = allDays.find((d) => d.dayNumber === day);
              const completion = content
                ? getDayCompletionPercent(days, day, content.exercises.length)
                : 0;
              return (
                <NavItem
                  key={day}
                  href={`/day/${day}`}
                  icon={
                    <span className="flex h-4 w-4 items-center justify-center text-xs font-bold">
                      {day}
                    </span>
                  }
                  label={content?.title ?? `Day ${day}`}
                  active={pathname === `/day/${day}`}
                  collapsed={collapsed}
                  completion={completion}
                />
              );
            })}
          </div>

          <div className="mt-4 border-t border-border pt-4">
            {!collapsed && (
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tools
              </p>
            )}
            <NavItem
              href="/tools"
              icon={<Wrench className="h-4 w-4" />}
              label="Interactive Tools"
              active={pathname.startsWith('/tools')}
              collapsed={collapsed}
            />
            <NavItem
              href="/review"
              icon={<RefreshCw className="h-4 w-4" />}
              label="Cumulative Review"
              active={pathname === '/review'}
              collapsed={collapsed}
            />
          </div>
        </nav>
      </div>
    </aside>
  );
}

function NavItem({
  href,
  icon,
  label,
  active,
  collapsed,
  completion,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  collapsed: boolean;
  completion?: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        collapsed && 'justify-center px-2'
      )}
    >
      {icon}
      {!collapsed && (
        <span className="flex-1 truncate">{label}</span>
      )}
      {!collapsed && completion !== undefined && completion > 0 && (
        <span
          className={cn(
            'text-xs font-medium',
            completion >= 80 ? 'text-green-600' : 'text-muted-foreground'
          )}
        >
          {Math.round(completion)}%
        </span>
      )}
    </Link>
  );
}
