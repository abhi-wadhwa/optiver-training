'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface ExerciseAttempt {
  exerciseId: string;
  correct: boolean;
  timestamp: number;
  timeSpentSeconds: number;
  userAnswer: string | number | boolean;
}

export interface DayProgress {
  theoryCompleted: boolean;
  theoryCompletedB: boolean;
  exerciseAttempts: Record<string, ExerciseAttempt[]>;
  flashcardsReviewed: string[];
  timedModeHighScore: number | null;
  timedModeBestTime: number | null;
  lastAccessedAt: number;
}

interface ProgressState {
  days: Record<number, DayProgress>;
  totalStudyTimeSeconds: number;
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string | null;

  markTheoryComplete: (dayNumber: number) => void;
  markTheoryCompleteB: (dayNumber: number) => void;
  recordAttempt: (dayNumber: number, attempt: ExerciseAttempt) => void;
  recordFlashcardReview: (dayNumber: number, flashcardId: string) => void;
  updateTimedHighScore: (dayNumber: number, score: number, time: number) => void;
  addStudyTime: (seconds: number) => void;
  updateStreak: () => void;
}

export const EMPTY_DAY_PROGRESS: DayProgress = {
  theoryCompleted: false,
  theoryCompletedB: false,
  exerciseAttempts: {},
  flashcardsReviewed: [],
  timedModeHighScore: null,
  timedModeBestTime: null,
  lastAccessedAt: 0,
};

function newDayProgress(): DayProgress {
  return { ...EMPTY_DAY_PROGRESS, exerciseAttempts: {}, flashcardsReviewed: [] };
}

let currentStorageKey = 'optiver-training-progress';

function getUserStorage() {
  return createJSONStorage(() => ({
    getItem: (name: string) => {
      if (typeof window === 'undefined') return null;
      return localStorage.getItem(currentStorageKey) ?? localStorage.getItem(name);
    },
    setItem: (_name: string, value: string) => {
      if (typeof window === 'undefined') return;
      localStorage.setItem(currentStorageKey, value);
    },
    removeItem: (_name: string) => {
      if (typeof window === 'undefined') return;
      localStorage.removeItem(currentStorageKey);
    },
  }));
}

export function switchUserProgress(username: string | null) {
  if (username) {
    currentStorageKey = `optiver-training-progress-${username}`;
  } else {
    currentStorageKey = 'optiver-training-progress';
  }
  useProgressStore.persist.setOptions({ storage: getUserStorage() });
  useProgressStore.persist.rehydrate();
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      days: {},
      totalStudyTimeSeconds: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastStudyDate: null,

      markTheoryComplete: (dayNumber) =>
        set((state) => ({
          days: {
            ...state.days,
            [dayNumber]: {
              ...(state.days[dayNumber] ?? newDayProgress()),
              theoryCompleted: true,
              lastAccessedAt: Date.now(),
            },
          },
        })),

      markTheoryCompleteB: (dayNumber) =>
        set((state) => ({
          days: {
            ...state.days,
            [dayNumber]: {
              ...(state.days[dayNumber] ?? newDayProgress()),
              theoryCompletedB: true,
              lastAccessedAt: Date.now(),
            },
          },
        })),

      recordAttempt: (dayNumber, attempt) =>
        set((state) => {
          const day = state.days[dayNumber] ?? newDayProgress();
          const existing = day.exerciseAttempts[attempt.exerciseId] ?? [];
          return {
            days: {
              ...state.days,
              [dayNumber]: {
                ...day,
                exerciseAttempts: {
                  ...day.exerciseAttempts,
                  [attempt.exerciseId]: [...existing, attempt],
                },
                lastAccessedAt: Date.now(),
              },
            },
          };
        }),

      recordFlashcardReview: (dayNumber, flashcardId) =>
        set((state) => {
          const day = state.days[dayNumber] ?? newDayProgress();
          if (day.flashcardsReviewed.includes(flashcardId)) return state;
          return {
            days: {
              ...state.days,
              [dayNumber]: {
                ...day,
                flashcardsReviewed: [...day.flashcardsReviewed, flashcardId],
                lastAccessedAt: Date.now(),
              },
            },
          };
        }),

      updateTimedHighScore: (dayNumber, score, time) =>
        set((state) => {
          const day = state.days[dayNumber] ?? newDayProgress();
          return {
            days: {
              ...state.days,
              [dayNumber]: {
                ...day,
                timedModeHighScore:
                  day.timedModeHighScore === null
                    ? score
                    : Math.max(day.timedModeHighScore, score),
                timedModeBestTime:
                  day.timedModeBestTime === null
                    ? time
                    : Math.min(day.timedModeBestTime, time),
                lastAccessedAt: Date.now(),
              },
            },
          };
        }),

      addStudyTime: (seconds) =>
        set((state) => ({
          totalStudyTimeSeconds: state.totalStudyTimeSeconds + seconds,
        })),

      updateStreak: () =>
        set((state) => {
          const today = new Date().toISOString().split('T')[0];
          if (state.lastStudyDate === today) return state;

          const yesterday = new Date(Date.now() - 86400000)
            .toISOString()
            .split('T')[0];
          const newStreak =
            state.lastStudyDate === yesterday ? state.currentStreak + 1 : 1;

          return {
            lastStudyDate: today,
            currentStreak: newStreak,
            longestStreak: Math.max(state.longestStreak, newStreak),
          };
        }),
    }),
    {
      name: 'optiver-training-progress',
      storage: getUserStorage(),
    }
  )
);

// --- Pure helper functions (not in the store, no infinite loops) ---

export function getDayProgress(days: Record<number, DayProgress>, dayNumber: number): DayProgress {
  return days[dayNumber] ?? EMPTY_DAY_PROGRESS;
}

export function getDayCompletionPercent(days: Record<number, DayProgress>, dayNumber: number, totalExercises: number): number {
  const day = days[dayNumber];
  if (!day || totalExercises === 0) return 0;
  const completedExercises = Object.values(day.exerciseAttempts).filter(
    (attempts) => attempts.some((a) => a.correct)
  ).length;
  const theoryWeight = day.theoryCompleted ? 20 : 0;
  const exerciseWeight = (completedExercises / totalExercises) * 80;
  return Math.min(100, theoryWeight + exerciseWeight);
}

export function getExerciseAccuracy(days: Record<number, DayProgress>, dayNumber: number, exerciseId: string): number | null {
  const day = days[dayNumber];
  if (!day) return null;
  const attempts = day.exerciseAttempts[exerciseId];
  if (!attempts || attempts.length === 0) return null;
  const correct = attempts.filter((a) => a.correct).length;
  return correct / attempts.length;
}

export function getWeakTopics(days: Record<number, DayProgress>): { topic: string; accuracy: number }[] {
  const topicMap = new Map<string, { correct: number; total: number }>();
  for (const day of Object.values(days)) {
    for (const [id, attempts] of Object.entries(day.exerciseAttempts)) {
      const parts = id.split('-');
      const topic = parts.slice(1, -1).join('-');
      if (!topic) continue;
      const entry = topicMap.get(topic) ?? { correct: 0, total: 0 };
      for (const a of attempts) {
        entry.total++;
        if (a.correct) entry.correct++;
      }
      topicMap.set(topic, entry);
    }
  }
  return Array.from(topicMap.entries())
    .map(([topic, { correct, total }]) => ({
      topic,
      accuracy: total > 0 ? correct / total : 0,
    }))
    .filter((t) => t.accuracy < 0.8)
    .sort((a, b) => a.accuracy - b.accuracy);
}
