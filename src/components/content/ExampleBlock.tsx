'use client';

import { useState } from 'react';
import MathText from './MathText';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ExampleBlockProps {
  title: string;
  problem: string;
  solution: string[];
}

export default function ExampleBlock({ title, problem, solution }: ExampleBlockProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="my-4 rounded-lg border border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30">
      <div className="p-4">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
          Worked Example
        </div>
        <div className="mb-2 font-medium">{title}</div>
        <div className="text-sm">
          <MathText text={problem} />
        </div>
      </div>
      <div className="border-t border-blue-200 dark:border-blue-900">
        <Button
          variant="ghost"
          className="w-full justify-between rounded-none px-4 py-2 text-sm font-medium"
          onClick={() => setOpen(!open)}
        >
          {open ? 'Hide Solution' : 'Show Solution'}
          {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </Button>
        {open && (
          <div className="space-y-2 px-4 pb-4">
            {solution.map((step, i) => (
              <div key={i} className="flex gap-2 text-sm">
                <span className="mt-0.5 shrink-0 font-mono text-xs text-muted-foreground">
                  {i + 1}.
                </span>
                <MathText text={step} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
