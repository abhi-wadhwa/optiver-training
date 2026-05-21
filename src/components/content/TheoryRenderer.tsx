'use client';

import type { ContentBlock, InteractiveTool } from '@/content/types';
import MathText from './MathText';
import FormulaDisplay from './FormulaDisplay';
import ExampleBlock from './ExampleBlock';
import ConceptCard from './ConceptCard';
import CalloutBox from './CalloutBox';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

interface TheoryRendererProps {
  sections: {
    title: string;
    blocks: ContentBlock[];
  }[];
}

const toolRoutes: Record<InteractiveTool, string> = {
  'bs-calculator': '/tools/bs-calculator',
  'payoff-diagram': '/tools/payoff-builder',
  'greek-visualizer': '/tools/greek-visualizer',
  'vol-surface': '/tools/vol-surface',
  'dice-game': '/tools/dice-game',
  'market-maker': '/tools/market-maker',
  'put-call-parity': '/tools/put-call-parity',
  'delta-hedging': '/tools/delta-hedging',
  'speed-drill': '/tools/speed-drill',
  'bias-variance-explorer': '/tools/bias-variance',
  'garch-forecaster': '/tools/garch-forecaster',
  'pca-vol-decomposition': '/tools/pca-vol-decomposition',
  'ledoit-wolf-shrinkage': '/tools/ledoit-wolf',
  'lob-order-flow': '/tools/lob-order-flow',
};

function InlineToolBlock({ tool }: { tool: InteractiveTool }) {
  const route = toolRoutes[tool];
  return (
    <div className="my-6 rounded-lg border bg-muted/20 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium">Interactive Tool: {tool}</span>
        <Link
          href={route}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Open full-screen <ExternalLink className="size-3" />
        </Link>
      </div>
      <div className="text-center text-xs text-muted-foreground">
        <Link href={route} className="text-primary hover:underline">
          Open the full interactive tool →
        </Link>
      </div>
    </div>
  );
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
      return <InlineToolBlock tool={block.tool} />;
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
