'use client';

import { useState } from 'react';
import type { NumericExercise } from '@/content/types';
import { useProgressStore } from '@/stores/progress-store';
import ExerciseWrapper from './ExerciseWrapper';
import SolutionReveal from './SolutionReveal';
import MathText from '@/components/content/MathText';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, XCircle } from 'lucide-react';

interface NumericInputProps {
  exercise: NumericExercise;
  dayNumber: number;
}

export default function NumericInput({ exercise, dayNumber }: NumericInputProps) {
  const [value, setValue] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isCorrect, setIsCorrect] = useState(false);
  const recordAttempt = useProgressStore((s) => s.recordAttempt);

  const handleSubmit = () => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    const correct = Math.abs(num - exercise.correctAnswer) <= exercise.tolerance;
    setIsCorrect(correct);
    setSubmitted(true);
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    recordAttempt(dayNumber, {
      exerciseId: exercise.id,
      correct,
      timestamp: Date.now(),
      timeSpentSeconds: 0,
      userAnswer: num,
    });
  };

  const handleRetry = () => {
    setValue('');
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
      <div className="flex items-center gap-2">
        {exercise.unit && (
          <span className="text-sm text-muted-foreground">{exercise.unit}</span>
        )}
        <Input
          type="number"
          step="any"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={submitted}
          placeholder="Your answer"
          className="max-w-48"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
          }}
        />
        {!submitted && (
          <Button onClick={handleSubmit} disabled={!value} size="sm">
            Submit
          </Button>
        )}
      </div>
      {submitted && (
        <div className="mt-3">
          <div className={`flex items-center gap-2 text-sm font-medium ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
            {isCorrect ? (
              <><CheckCircle2 className="size-4" /> Correct! Answer: {exercise.correctAnswer}{exercise.unit ? ` ${exercise.unit}` : ''}</>
            ) : (
              <><XCircle className="size-4" /> Incorrect. {attempts >= 3 ? `Correct answer: ${exercise.correctAnswer}${exercise.unit ? ` ${exercise.unit}` : ''}` : 'Try again.'}</>
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
