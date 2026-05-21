import { DayContent, Exercise } from './types';
import day01 from './day01';
import day02 from './day02';
import day03 from './day03';
import day04 from './day04';
import day05 from './day05';
import day06 from './day06';
import day07 from './day07';
import day08 from './day08';
import day09 from './day09';
import day10 from './day10';
import day11 from './day11';
import day12 from './day12';
import day13 from './day13';
import day14 from './day14';

const dayModules: DayContent[] = [
  day01, day02, day03, day04, day05, day06, day07,
  day08, day09, day10, day11, day12, day13, day14,
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
    .flatMap((d) => [...d.exercises, ...d.cumulativeExercises, ...(d.trackB?.exercises ?? [])])
    .filter((e) => e.tags.includes(tag));
}

export function getTotalExerciseCount(): number {
  return allDays.reduce(
    (sum, d) => sum + d.exercises.length + d.cumulativeExercises.length,
    0
  );
}

export function getDaysWithTrackB(): DayContent[] {
  return allDays.filter((d) => d.trackB != null);
}

export function getTotalTrackBExerciseCount(): number {
  return allDays.reduce(
    (sum, d) => sum + (d.trackB?.exercises.length ?? 0),
    0
  );
}
