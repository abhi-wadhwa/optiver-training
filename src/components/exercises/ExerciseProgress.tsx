'use client';

import { useProgressStore } from '@/stores/progress-store';
import { Progress } from '@/components/ui/progress';
import type { Exercise } from '@/content/types';

interface ExerciseProgressProps {
  exercises: Exercise[];
  dayNumber: number;
}

export default function ExerciseProgress({ exercises, dayNumber }: ExerciseProgressProps) {
  const dayProgress = useProgressStore((s) => s.getDayProgress(dayNumber));

  const completed = exercises.filter((ex) => {
    const attempts = dayProgress.exerciseAttempts[ex.id];
    return attempts && attempts.some((a) => a.correct);
  }).length;

  const attempted = exercises.filter((ex) => {
    const attempts = dayProgress.exerciseAttempts[ex.id];
    return attempts && attempts.length > 0;
  }).length;

  const totalAttempts = exercises.reduce((sum, ex) => {
    const attempts = dayProgress.exerciseAttempts[ex.id];
    return sum + (attempts ? attempts.length : 0);
  }, 0);

  const correctAttempts = exercises.reduce((sum, ex) => {
    const attempts = dayProgress.exerciseAttempts[ex.id];
    return sum + (attempts ? attempts.filter((a) => a.correct).length : 0);
  }, 0);

  const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
  const percent = exercises.length > 0 ? Math.round((completed / exercises.length) * 100) : 0;

  return (
    <div className="mb-4 rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="font-medium">
          {completed}/{exercises.length} exercises completed
        </span>
        {attempted > 0 && (
          <span className="text-muted-foreground">
            Accuracy: {accuracy}%
          </span>
        )}
      </div>
      <Progress value={percent} />
    </div>
  );
}
