'use client';

import { useState } from 'react';
import type { MultiStepExercise as MultiStepExerciseType } from '@/content/types';
import { useProgressStore } from '@/stores/progress-store';
import ExerciseWrapper from './ExerciseWrapper';
import SolutionReveal from './SolutionReveal';
import MathText from '@/components/content/MathText';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, XCircle } from 'lucide-react';

interface MultiStepExerciseProps {
  exercise: MultiStepExerciseType;
  dayNumber: number;
}

interface StepState {
  value: string;
  submitted: boolean;
  correct: boolean;
  attempts: number;
}

export default function MultiStepExercise({ exercise, dayNumber }: MultiStepExerciseProps) {
  const [stepStates, setStepStates] = useState<StepState[]>(
    exercise.steps.map(() => ({ value: '', submitted: false, correct: false, attempts: 0 }))
  );
  const [currentStep, setCurrentStep] = useState(0);
  const recordAttempt = useProgressStore((s) => s.recordAttempt);

  const handleStepSubmit = (stepIndex: number) => {
    const step = exercise.steps[stepIndex];
    const num = parseFloat(stepStates[stepIndex].value);
    if (isNaN(num)) return;
    const correct = Math.abs(num - step.correctAnswer) <= step.tolerance;
    const newAttempts = stepStates[stepIndex].attempts + 1;

    setStepStates((prev) => {
      const next = [...prev];
      next[stepIndex] = { ...next[stepIndex], submitted: true, correct, attempts: newAttempts };
      return next;
    });

    if (correct && stepIndex === exercise.steps.length - 1) {
      recordAttempt(dayNumber, {
        exerciseId: exercise.id,
        correct: true,
        timestamp: Date.now(),
        timeSpentSeconds: 0,
        userAnswer: num,
      });
    }

    if (correct && stepIndex < exercise.steps.length - 1) {
      setCurrentStep(stepIndex + 1);
    }
  };

  const handleStepRetry = (stepIndex: number) => {
    setStepStates((prev) => {
      const next = [...prev];
      next[stepIndex] = { ...next[stepIndex], value: '', submitted: false };
      return next;
    });
  };

  const allDone = stepStates.every((s) => s.correct || s.attempts >= 3);

  return (
    <ExerciseWrapper
      difficulty={exercise.difficulty}
      topic={exercise.topic}
      hint={exercise.hint}
    >
      <div className="mb-4 text-sm font-medium">
        <MathText text={exercise.question} />
      </div>
      <div className="space-y-4">
        {exercise.steps.map((step, i) => {
          const state = stepStates[i];
          const isAccessible = i <= currentStep;

          if (!isAccessible) return null;

          return (
            <div key={i} className="rounded-md border p-3">
              <div className="mb-2 text-xs font-semibold text-muted-foreground">
                Step {i + 1} of {exercise.steps.length}
              </div>
              <div className="mb-2 text-sm">
                <MathText text={step.prompt} />
              </div>
              <div className="flex items-center gap-2">
                {step.unit && (
                  <span className="text-sm text-muted-foreground">{step.unit}</span>
                )}
                <Input
                  type="number"
                  step="any"
                  value={state.value}
                  onChange={(e) => {
                    setStepStates((prev) => {
                      const next = [...prev];
                      next[i] = { ...next[i], value: e.target.value };
                      return next;
                    });
                  }}
                  disabled={state.submitted}
                  placeholder="Your answer"
                  className="max-w-48"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleStepSubmit(i);
                  }}
                />
                {!state.submitted && (
                  <Button onClick={() => handleStepSubmit(i)} disabled={!state.value} size="sm">
                    Check
                  </Button>
                )}
              </div>
              {state.submitted && (
                <div className="mt-2">
                  <div className={`flex items-center gap-2 text-sm font-medium ${state.correct ? 'text-green-600' : 'text-red-600'}`}>
                    {state.correct ? (
                      <><CheckCircle2 className="size-4" /> Correct!</>
                    ) : (
                      <><XCircle className="size-4" /> Incorrect.{state.attempts >= 3 ? ` Answer: ${step.correctAnswer}${step.unit ? ` ${step.unit}` : ''}` : ''}</>
                    )}
                  </div>
                  {!state.correct && state.attempts < 3 && (
                    <Button onClick={() => handleStepRetry(i)} variant="outline" size="sm" className="mt-1">
                      Retry
                    </Button>
                  )}
                  {(state.correct || state.attempts >= 3) && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <MathText text={step.stepExplanation} />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {allDone && (
        <SolutionReveal
          steps={exercise.solutionSteps}
          explanation={exercise.explanation}
        />
      )}
    </ExerciseWrapper>
  );
}
