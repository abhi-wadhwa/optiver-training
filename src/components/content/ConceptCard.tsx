'use client';

import MathText from './MathText';

interface ConceptCardProps {
  title: string;
  body: string;
}

export default function ConceptCard({ title, body }: ConceptCardProps) {
  return (
    <div className="my-4 rounded-lg border-l-4 border-l-purple-500 bg-purple-50/50 p-4 dark:bg-purple-950/20">
      <div className="mb-1 text-sm font-semibold text-purple-700 dark:text-purple-400">
        {title}
      </div>
      <div className="text-sm leading-relaxed">
        <MathText text={body} />
      </div>
    </div>
  );
}
