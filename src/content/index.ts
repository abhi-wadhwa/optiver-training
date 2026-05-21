import { DayContent, Exercise } from './types';
import day01 from './day01';

const dayModules: DayContent[] = [
  day01,
];

export const allDays: DayContent[] = dayModules.sort(
  (a, b) => a.dayNumber - b.dayNumber
);

export function getDay(dayNumber: number): DayContent | undefined {
  return allDays.find((d) => d.dayNumber === dayNumber);
}

export function getDaysForWeek(week: 1 | 2): DayContent[] {
  return allDays.filter((d) => d.week === week);
}

export function getAllExercisesByTag(tag: string): Exercise[] {
  return allDays
    .flatMap((d) => [...d.exercises, ...d.cumulativeExercises])
    .filter((e) => e.tags.includes(tag));
}

export function getTotalExerciseCount(): number {
  return allDays.reduce(
    (sum, d) => sum + d.exercises.length + d.cumulativeExercises.length,
    0
  );
}
