'use client';

import { useState } from 'react';
import MathText from '@/components/content/MathText';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface SolutionRevealProps {
  steps: string[];
  explanation: string;
  forceOpen?: boolean;
}

export default function SolutionReveal({ steps, explanation, forceOpen = false }: SolutionRevealProps) {
  const [open, setOpen] = useState(forceOpen);

  return (
    <div className="mt-3">
      {!forceOpen && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(!open)}
          className="mb-2 gap-1"
        >
          {open ? 'Hide' : 'Show'} Solution
          {open ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </Button>
      )}
      {open && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="mb-3 text-sm">
            <MathText text={explanation} />
          </div>
          {steps.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Step-by-step
              </div>
              {steps.map((step, i) => (
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
      )}
    </div>
  );
}
