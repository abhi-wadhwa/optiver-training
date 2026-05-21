'use client';

import { useState } from 'react';
import type { FreeResponseExercise } from '@/content/types';
import { useProgressStore } from '@/stores/progress-store';
import ExerciseWrapper from './ExerciseWrapper';
import SolutionReveal from './SolutionReveal';
import MathText from '@/components/content/MathText';
import { Button } from '@/components/ui/button';

interface FreeResponseProps {
  exercise: FreeResponseExercise;
  dayNumber: number;
}

export default function FreeResponse({ exercise, dayNumber }: FreeResponseProps) {
  const [value, setValue] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const recordAttempt = useProgressStore((s) => s.recordAttempt);

  const handleSubmit = () => {
    setSubmitted(true);
    // Free response is self-graded: mark as attempted
    recordAttempt(dayNumber, {
      exerciseId: exercise.id,
      correct: true,
      timestamp: Date.now(),
      timeSpentSeconds: 0,
      userAnswer: value,
    });
  };

  return (
    <ExerciseWrapper
      difficulty={exercise.difficulty}
      topic={exercise.topic}
      hint={exercise.hint}
    >
      <div className="mb-4 text-sm font-medium">
        <MathText text={exercise.question} />
      </div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={submitted}
        placeholder="Type your answer..."
        rows={4}
        className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-50"
      />
      {!submitted && (
        <Button
          onClick={handleSubmit}
          disabled={!value.trim()}
          size="sm"
          className="mt-2"
        >
          Submit & See Model Answer
        </Button>
      )}
      {submitted && (
        <div className="mt-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Model Answer
          </div>
          <div className="rounded-lg border bg-muted/30 p-4 text-sm">
            <MathText text={exercise.modelAnswer} />
          </div>
          <SolutionReveal
            steps={exercise.solutionSteps}
            explanation={exercise.explanation}
          />
        </div>
      )}
    </ExerciseWrapper>
  );
}
