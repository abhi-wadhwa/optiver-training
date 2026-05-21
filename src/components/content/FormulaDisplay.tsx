'use client';

import { useRef, useEffect, useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface FormulaDisplayProps {
  latex: string;
  label: string;
  explanation?: string;
}

export default function FormulaDisplay({ latex, label, explanation }: FormulaDisplayProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && ref.current) {
      try {
        ref.current.innerHTML = katex.renderToString(latex, {
          throwOnError: false,
          displayMode: true,
        });
      } catch {
        ref.current.textContent = latex;
      }
    }
  }, [mounted, latex]);

  return (
    <div className="my-4 rounded-lg border bg-muted/30 p-4">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        ref={ref}
        className="overflow-x-auto py-2 text-center text-lg"
        suppressHydrationWarning
      />
      {explanation && (
        <p className="mt-2 text-sm text-muted-foreground">{explanation}</p>
      )}
    </div>
  );
}
