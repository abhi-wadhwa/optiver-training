'use client';

import katex from 'katex';
import 'katex/dist/katex.min.css';

interface FormulaDisplayProps {
  latex: string;
  label: string;
  explanation?: string;
}

export default function FormulaDisplay({ latex, label, explanation }: FormulaDisplayProps) {
  let html: string;
  try {
    html = katex.renderToString(latex, {
      throwOnError: false,
      displayMode: true,
    });
  } catch {
    html = latex;
  }

  return (
    <div className="my-4 rounded-lg border bg-muted/30 p-4">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className="overflow-x-auto py-2 text-center text-lg"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {explanation && (
        <p className="mt-2 text-sm text-muted-foreground">{explanation}</p>
      )}
    </div>
  );
}
