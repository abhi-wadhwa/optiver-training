'use client';

import { useState } from 'react';
import type { TrueFalseExercise } from '@/content/types';
import { useProgressStore } from '@/stores/progress-store';
import ExerciseWrapper from './ExerciseWrapper';
import SolutionReveal from './SolutionReveal';
import MathText from '@/components/content/MathText';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle } from 'lucide-react';

interface TrueFalseProps {
  exercise: TrueFalseExercise;
  dayNumber: number;
}

export default function TrueFalse({ exercise, dayNumber }: TrueFalseProps) {
  const [answered, setAnswered] = useState(false);
  const [userAnswer, setUserAnswer] = useState<boolean | null>(null);
  const [attempts, setAttempts] = useState(0);
  const recordAttempt = useProgressStore((s) => s.recordAttempt);

  const isCorrect = userAnswer === exercise.correct;

  const handleAnswer = (answer: boolean) => {
    setUserAnswer(answer);
    setAnswered(true);
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    recordAttempt(dayNumber, {
      exerciseId: exercise.id,
      correct: answer === exercise.correct,
      timestamp: Date.now(),
      timeSpentSeconds: 0,
      userAnswer: answer,
    });
  };

  return (
    <ExerciseWrapper
      difficulty={exercise.difficulty}
      topic={exercise.topic}
      hint={exercise.hint}
    >
      <div className="mb-4 text-sm font-medium">
        <MathText text={exercise.statement} />
      </div>
      <div className="flex gap-2">
        <Button
          variant={answered && userAnswer === true ? (isCorrect ? 'default' : 'destructive') : 'outline'}
          size="sm"
          disabled={answered}
          onClick={() => handleAnswer(true)}
        >
          True
        </Button>
        <Button
          variant={answered && userAnswer === false ? (isCorrect ? 'default' : 'destructive') : 'outline'}
          size="sm"
          disabled={answered}
          onClick={() => handleAnswer(false)}
        >
          False
        </Button>
      </div>
      {answered && (
        <div className="mt-3">
          <div className={`flex items-center gap-2 text-sm font-medium ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
            {isCorrect ? (
              <><CheckCircle2 className="size-4" /> Correct!</>
            ) : (
              <><XCircle className="size-4" /> Incorrect. The answer is {exercise.correct ? 'True' : 'False'}.</>
            )}
          </div>
          <SolutionReveal
            steps={exercise.solutionSteps}
            explanation={exercise.explanation}
            forceOpen={isCorrect}
          />
        </div>
      )}
    </ExerciseWrapper>
  );
}
