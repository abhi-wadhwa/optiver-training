'use client';

import type { ContentBlock } from '@/content/types';
import MathText from './MathText';
import FormulaDisplay from './FormulaDisplay';
import ExampleBlock from './ExampleBlock';
import ConceptCard from './ConceptCard';
import CalloutBox from './CalloutBox';

interface TheoryRendererProps {
  sections: {
    title: string;
    blocks: ContentBlock[];
  }[];
}

function ContentBlockRenderer({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case 'text':
      return (
        <div className="my-3 text-sm leading-relaxed">
          <MathText text={block.body} />
        </div>
      );
    case 'formula':
      return (
        <FormulaDisplay
          latex={block.latex}
          label={block.label}
          explanation={block.explanation}
        />
      );
    case 'example':
      return (
        <ExampleBlock
          title={block.title}
          problem={block.problem}
          solution={block.solution}
        />
      );
    case 'concept':
      return <ConceptCard title={block.title} body={block.body} />;
    case 'callout':
      return <CalloutBox variant={block.variant} body={block.body} />;
    case 'table':
      return (
        <div className="my-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                {block.headers.map((h, i) => (
                  <th key={i} className="px-3 py-2 text-left font-medium">
                    <MathText text={h} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri} className="border-b last:border-0">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2">
                      <MathText text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'interactive':
      return (
        <div className="my-4 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Interactive tool: <span className="font-mono">{block.tool}</span>
        </div>
      );
    default:
      return null;
  }
}

export default function TheoryRenderer({ sections }: TheoryRendererProps) {
  return (
    <div className="space-y-8">
      {sections.map((section, si) => (
        <section key={si}>
          <h2 className="mb-4 text-xl font-bold">{section.title}</h2>
          {section.blocks.map((block, bi) => (
            <ContentBlockRenderer key={bi} block={block} />
          ))}
        </section>
      ))}
    </div>
  );
}
