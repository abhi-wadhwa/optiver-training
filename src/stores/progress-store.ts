'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ExerciseAttempt {
  exerciseId: string;
  correct: boolean;
  timestamp: number;
  timeSpentSeconds: number;
  userAnswer: string | number | boolean;
}

export interface DayProgress {
  theoryCompleted: boolean;
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
  recordAttempt: (dayNumber: number, attempt: ExerciseAttempt) => void;
  recordFlashcardReview: (dayNumber: number, flashcardId: string) => void;
  updateTimedHighScore: (dayNumber: number, score: number, time: number) => void;
  addStudyTime: (seconds: number) => void;
  updateStreak: () => void;

  getDayProgress: (dayNumber: number) => DayProgress;
  getExerciseAccuracy: (dayNumber: number, exerciseId: string) => number | null;
  getDayCompletionPercent: (dayNumber: number, totalExercises: number) => number;
  getTopicAccuracy: (tag: string) => number | null;
  getWeakTopics: () => { topic: string; accuracy: number }[];
}

const emptyDayProgress = (): DayProgress => ({
  theoryCompleted: false,
  exerciseAttempts: {},
  flashcardsReviewed: [],
  timedModeHighScore: null,
  timedModeBestTime: null,
  lastAccessedAt: 0,
});

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
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
              ...(state.days[dayNumber] ?? emptyDayProgress()),
              theoryCompleted: true,
              lastAccessedAt: Date.now(),
            },
          },
        })),

      recordAttempt: (dayNumber, attempt) =>
        set((state) => {
          const day = state.days[dayNumber] ?? emptyDayProgress();
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
          const day = state.days[dayNumber] ?? emptyDayProgress();
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
          const day = state.days[dayNumber] ?? emptyDayProgress();
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

      getDayProgress: (dayNumber) => {
        return get().days[dayNumber] ?? emptyDayProgress();
      },

      getExerciseAccuracy: (dayNumber, exerciseId) => {
        const day = get().days[dayNumber];
        if (!day) return null;
        const attempts = day.exerciseAttempts[exerciseId];
        if (!attempts || attempts.length === 0) return null;
        const correct = attempts.filter((a) => a.correct).length;
        return correct / attempts.length;
      },

      getDayCompletionPercent: (dayNumber, totalExercises) => {
        const day = get().days[dayNumber];
        if (!day || totalExercises === 0) return 0;
        const completedExercises = Object.values(day.exerciseAttempts).filter(
          (attempts) => attempts.some((a) => a.correct)
        ).length;
        const theoryWeight = day.theoryCompleted ? 20 : 0;
        const exerciseWeight = (completedExercises / totalExercises) * 80;
        return Math.min(100, theoryWeight + exerciseWeight);
      },

      getTopicAccuracy: (tag) => {
        const allAttempts: ExerciseAttempt[] = [];
        const days = get().days;
        for (const day of Object.values(days)) {
          for (const attempts of Object.values(day.exerciseAttempts)) {
            for (const a of attempts) {
              if (a.exerciseId.includes(tag)) {
                allAttempts.push(a);
              }
            }
          }
        }
        if (allAttempts.length === 0) return null;
        return allAttempts.filter((a) => a.correct).length / allAttempts.length;
      },

      getWeakTopics: () => {
        const topicMap = new Map<string, { correct: number; total: number }>();
        const days = get().days;
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
      },
    }),
    {
      name: 'optiver-training-progress',
    }
  )
);
