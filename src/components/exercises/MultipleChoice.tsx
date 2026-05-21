'use client';

import { useState } from 'react';
import type { MultipleChoiceExercise } from '@/content/types';
import { useProgressStore } from '@/stores/progress-store';
import ExerciseWrapper from './ExerciseWrapper';
import SolutionReveal from './SolutionReveal';
import MathText from '@/components/content/MathText';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle } from 'lucide-react';

interface MultipleChoiceProps {
  exercise: MultipleChoiceExercise;
  dayNumber: number;
}

export default function MultipleChoice({ exercise, dayNumber }: MultipleChoiceProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const recordAttempt = useProgressStore((s) => s.recordAttempt);

  const isCorrect = selected === exercise.correctIndex;

  const handleSubmit = () => {
    if (selected === null) return;
    setSubmitted(true);
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    recordAttempt(dayNumber, {
      exerciseId: exercise.id,
      correct: selected === exercise.correctIndex,
      timestamp: Date.now(),
      timeSpentSeconds: 0,
      userAnswer: selected,
    });
  };

  const handleRetry = () => {
    setSelected(null);
    setSubmitted(false);
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
      <div className="space-y-2">
        {exercise.options.map((option, i) => {
          let optionStyle = 'border-border hover:border-foreground/30';
          if (submitted) {
            if (i === exercise.correctIndex) {
              optionStyle = 'border-green-500 bg-green-50/50 dark:bg-green-950/20';
            } else if (i === selected && !isCorrect) {
              optionStyle = 'border-red-500 bg-red-50/50 dark:bg-red-950/20';
            }
          } else if (i === selected) {
            optionStyle = 'border-primary bg-primary/5';
          }

          return (
            <button
              key={i}
              disabled={submitted}
              onClick={() => setSelected(i)}
              className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left text-sm transition-colors ${optionStyle}`}
            >
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border text-xs font-medium">
                {String.fromCharCode(65 + i)}
              </span>
              <MathText text={option} />
              {submitted && i === exercise.correctIndex && (
                <CheckCircle2 className="ml-auto size-4 shrink-0 text-green-600" />
              )}
              {submitted && i === selected && !isCorrect && i !== exercise.correctIndex && (
                <XCircle className="ml-auto size-4 shrink-0 text-red-600" />
              )}
            </button>
          );
        })}
      </div>
      {!submitted && (
        <Button
          onClick={handleSubmit}
          disabled={selected === null}
          className="mt-4"
          size="sm"
        >
          Submit
        </Button>
      )}
      {submitted && (
        <div className="mt-3">
          <div className={`flex items-center gap-2 text-sm font-medium ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
            {isCorrect ? (
              <><CheckCircle2 className="size-4" /> Correct!</>
            ) : (
              <><XCircle className="size-4" /> Incorrect</>
            )}
          </div>
          {!isCorrect && attempts < 3 && (
            <Button onClick={handleRetry} variant="outline" size="sm" className="mt-2">
              Try Again
            </Button>
          )}
        </div>
      )}
      {submitted && (isCorrect || attempts >= 3) && (
        <SolutionReveal
          steps={exercise.solutionSteps}
          explanation={exercise.explanation}
          forceOpen={isCorrect}
        />
      )}
    </ExerciseWrapper>
  );
}
