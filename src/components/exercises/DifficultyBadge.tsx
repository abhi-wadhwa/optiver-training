'use client';

import type { Difficulty } from '@/content/types';
import { Badge } from '@/components/ui/badge';

const colorMap: Record<Difficulty, string> = {
  easy: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  hard: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  interview: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

export default function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <Badge className={`${colorMap[difficulty]} border-0`}>
      {difficulty}
    </Badge>
  );
}
