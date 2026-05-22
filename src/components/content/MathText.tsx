'use client';

import { useRef, useEffect, useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathTextProps {
  text: string;
  className?: string;
}

function renderLatex(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex, {
      throwOnError: false,
      displayMode,
    });
  } catch {
    return latex;
  }
}

function isMathOpening(text: string, dollarIndex: number): boolean {
  if (dollarIndex + 1 >= text.length) return false;
  const next = text[dollarIndex + 1];
  if (next === '$') return false;
  if (/[\\a-zA-Z({\s]/.test(next)) return true;
  if (/\d/.test(next)) {
    const closeIdx = findMathClose(text, dollarIndex + 1);
    if (closeIdx === -1) return false;
    const inner = text.slice(dollarIndex + 1, closeIdx);
    if (/[\\{}^_]/.test(inner)) return true;
    const trimmed = inner.trim();
    if (!/[\d)\]]$/.test(trimmed)) return false;
    if (/\b(?:the|is|at|in|of|a|an|and|or|for|to|that|this|with|from|are|was|has|not|but|if|on|by|as|it|be|no|so|do|we|he|keep|since|must|goes|stock|call|put|rate|price|pays|loses|risk|vol|strike|period|month|year|option|probability|value|find|free|annual|model|state|envelope|symmetry|roll|choose|help|information|distribution)\b/i.test(inner)) {
      return false;
    }
    return true;
  }
  return false;
}

function findMathClose(text: string, start: number): number {
  for (let i = start; i < text.length; i++) {
    if (text[i] === '\\') { i++; continue; }
    if (text[i] === '$') return i;
  }
  return -1;
}

function parseInlineMath(text: string): { type: 'text' | 'inline'; content: string }[] {
  const parts: { type: 'text' | 'inline'; content: string }[] = [];
  let i = 0;
  let textStart = 0;

  while (i < text.length) {
    if (text[i] === '$') {
      if (isMathOpening(text, i)) {
        const closeIdx = findMathClose(text, i + 1);
        if (closeIdx !== -1) {
          if (i > textStart) {
            parts.push({ type: 'text', content: text.slice(textStart, i) });
          }
          parts.push({ type: 'inline', content: text.slice(i + 1, closeIdx) });
          i = closeIdx + 1;
          textStart = i;
          continue;
        }
      }
    }
    i++;
  }
  if (textStart < text.length) {
    parts.push({ type: 'text', content: text.slice(textStart) });
  }
  return parts;
}

function buildHtml(text: string): string {
  const parts: { type: 'text' | 'inline' | 'display'; content: string }[] = [];

  const displayRegex = /\$\$([\s\S]*?)\$\$/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const segments: { type: 'text' | 'display'; content: string }[] = [];
  while ((match = displayRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'display', content: match[1] });
    lastIndex = displayRegex.lastIndex;
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.slice(lastIndex) });
  }

  for (const seg of segments) {
    if (seg.type === 'display') {
      parts.push(seg);
      continue;
    }
    for (const p of parseInlineMath(seg.content)) {
      parts.push(p);
    }
  }

  return parts
    .map((part) => {
      if (part.type === 'display') return renderLatex(part.content, true);
      if (part.type === 'inline') return renderLatex(part.content, false);
      return part.content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>');
    })
    .join('');
}

export default function MathText({ text, className }: MathTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && ref.current) {
      ref.current.innerHTML = buildHtml(text);
    }
  }, [mounted, text]);

  return <span ref={ref} className={className} suppressHydrationWarning />;
}
