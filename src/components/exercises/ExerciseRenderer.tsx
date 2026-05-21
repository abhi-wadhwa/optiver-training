'use client';

import type { Exercise } from '@/content/types';
import MultipleChoice from './MultipleChoice';
import NumericInput from './NumericInput';
import MultiStepExercise from './MultiStepExercise';
import TrueFalse from './TrueFalse';
import FreeResponse from './FreeResponse';
import ExerciseProgress from './ExerciseProgress';

interface ExerciseRendererProps {
  exercises: Exercise[];
  dayNumber: number;
}

function SingleExercise({ exercise, dayNumber }: { exercise: Exercise; dayNumber: number }) {
  switch (exercise.exerciseType) {
    case 'multiple-choice':
      return <MultipleChoice exercise={exercise} dayNumber={dayNumber} />;
    case 'numeric':
      return <NumericInput exercise={exercise} dayNumber={dayNumber} />;
    case 'multi-step':
      return <MultiStepExercise exercise={exercise} dayNumber={dayNumber} />;
    case 'true-false':
      return <TrueFalse exercise={exercise} dayNumber={dayNumber} />;
    case 'free-response':
      return <FreeResponse exercise={exercise} dayNumber={dayNumber} />;
    case 'speed-drill':
      return (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Speed drill: {exercise.id} (coming soon)
        </div>
      );
    case 'scenario':
      return (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Scenario exercise: {exercise.id} (coming soon)
        </div>
      );
    default:
      return null;
  }
}

export default function ExerciseRenderer({ exercises, dayNumber }: ExerciseRendererProps) {
  return (
    <div className="space-y-6">
      <ExerciseProgress exercises={exercises} dayNumber={dayNumber} />
      {exercises.map((exercise) => (
        <SingleExercise key={exercise.id} exercise={exercise} dayNumber={dayNumber} />
      ))}
    </div>
  );
}
