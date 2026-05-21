'use client';

import { useState } from 'react';
import type { Difficulty } from '@/content/types';
import DifficultyBadge from './DifficultyBadge';
import { Button } from '@/components/ui/button';
import { Lightbulb } from 'lucide-react';

interface ExerciseWrapperProps {
  difficulty: Difficulty;
  topic: string;
  hint?: string;
  children: React.ReactNode;
}

export default function ExerciseWrapper({
  difficulty,
  topic,
  hint,
  children,
}: ExerciseWrapperProps) {
  const [showHint, setShowHint] = useState(false);

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3 flex items-center gap-2">
        <DifficultyBadge difficulty={difficulty} />
        <span className="text-xs text-muted-foreground">{topic}</span>
        {hint && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setShowHint(!showHint)}
            className="ml-auto gap-1 text-xs"
          >
            <Lightbulb className="size-3" />
            {showHint ? 'Hide Hint' : 'Show Hint'}
          </Button>
        )}
      </div>
      {showHint && hint && (
        <div className="mb-3 rounded-md bg-yellow-50 p-2 text-sm text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-300">
          {hint}
        </div>
      )}
      {children}
    </div>
  );
}
