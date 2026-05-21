'use client';

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

export default function MathText({ text, className }: MathTextProps) {
  // Split on display math ($$...$$) first, then inline math ($...$)
  const parts: { type: 'text' | 'inline' | 'display'; content: string }[] = [];

  // First pass: extract display math ($$...$$)
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

  // Second pass: extract inline math ($...$) from text segments
  for (const seg of segments) {
    if (seg.type === 'display') {
      parts.push(seg);
      continue;
    }
    const inlineRegex = /\$((?:[^$\\]|\\.)+?)\$/g;
    let inlineLastIndex = 0;
    let inlineMatch: RegExpExecArray | null;
    while ((inlineMatch = inlineRegex.exec(seg.content)) !== null) {
      if (inlineMatch.index > inlineLastIndex) {
        parts.push({ type: 'text', content: seg.content.slice(inlineLastIndex, inlineMatch.index) });
      }
      parts.push({ type: 'inline', content: inlineMatch[1] });
      inlineLastIndex = inlineRegex.lastIndex;
    }
    if (inlineLastIndex < seg.content.length) {
      parts.push({ type: 'text', content: seg.content.slice(inlineLastIndex) });
    }
  }

  const html = parts
    .map((part) => {
      if (part.type === 'display') {
        return renderLatex(part.content, true);
      }
      if (part.type === 'inline') {
        return renderLatex(part.content, false);
      }
      // Render bold (**...**) and italics (single *...*) in text parts
      return part.content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>');
    })
    .join('');

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
