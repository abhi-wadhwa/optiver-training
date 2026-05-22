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
    const inlineRegex = /\$((?:[^$\\]|\\.)+?)\$/g;
    let inlineLastIndex = 0;
    let inlineMatch: RegExpExecArray | null;
    while ((inlineMatch = inlineRegex.exec(seg.content)) !== null) {
      const inner = inlineMatch[1];
      const startsWithDigit = /^\d/.test(inner);
      const hasLatexCommands = /[\\{}^_]/.test(inner);
      const looksLikeProse = /\b(?:the|is|at|in|of|a|an|and|or|for|to|that|this|with|from|are|was|has|not|but|if|on|by|as|it|be|no|so|do|we|he)\b/i.test(inner);
      if (startsWithDigit && !hasLatexCommands && looksLikeProse) {
        continue;
      }
      if (inlineMatch.index > inlineLastIndex) {
        parts.push({ type: 'text', content: seg.content.slice(inlineLastIndex, inlineMatch.index) });
      }
      parts.push({ type: 'inline', content: inner });
      inlineLastIndex = inlineRegex.lastIndex;
    }
    if (inlineLastIndex < seg.content.length) {
      parts.push({ type: 'text', content: seg.content.slice(inlineLastIndex) });
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
