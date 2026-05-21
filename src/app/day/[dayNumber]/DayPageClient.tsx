'use client';

import React from 'react';
import Link from 'next/link';
import { getDay, allDays } from '@/content/index';
import { useProgressStore, getDayProgress, getDayCompletionPercent } from '@/stores/progress-store';
import TheoryRenderer from '@/components/content/TheoryRenderer';
import ExerciseRenderer from '@/components/exercises/ExerciseRenderer';
import FlashcardDeck from '@/components/practice/FlashcardDeck';
import MathText from '@/components/content/MathText';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  BookOpen,
  Target,
  CheckCircle2,
} from 'lucide-react';
import 'katex/dist/katex.min.css';
import type { CheatSheetEntry } from '@/content/types';
import katex from 'katex';
import { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export default function DayPageClient({ dayNumber }: { dayNumber: number }) {
  const day = getDay(dayNumber);
  const markTheoryComplete = useProgressStore((s) => s.markTheoryComplete);
  const markTheoryCompleteB = useProgressStore((s) => s.markTheoryCompleteB);
  const days = useProgressStore((s) => s.days);
  const dayProgress = getDayProgress(days, dayNumber);
  const [activeTrack, setActiveTrack] = useState<'A' | 'B'>('A');

  if (!day) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-bold">Day not found</h1>
          <p className="mb-4 text-muted-foreground">Day {dayNumber} does not exist.</p>
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const hasTrackB = !!day.trackB;
  const isTrackB = activeTrack === 'B' && hasTrackB;

  const theory = isTrackB ? day.trackB!.theory : day.theory;
  const exercises = isTrackB ? day.trackB!.exercises : [...day.exercises, ...day.cumulativeExercises];
  const flashcards = isTrackB ? day.trackB!.flashcards : day.flashcards;
  const cheatSheet = isTrackB ? day.trackB!.cheatSheet : day.cheatSheet;
  const summary = isTrackB ? day.trackB!.summary : day.summary;
  const objectives = isTrackB ? day.trackB!.objectives : day.objectives;
  const title = isTrackB ? day.trackB!.title : day.title;
  const subtitle = isTrackB ? day.trackB!.subtitle : day.subtitle;
  const theoryCompleted = isTrackB ? dayProgress.theoryCompletedB : dayProgress.theoryCompleted;

  const totalExercises = exercises.length;
  const completionPercent = getDayCompletionPercent(days, dayNumber, day.exercises.length + day.cumulativeExercises.length);
  const prevDay = allDays.find((d) => d.dayNumber === dayNumber - 1);
  const nextDay = allDays.find((d) => d.dayNumber === dayNumber + 1);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Track Toggle */}
      {hasTrackB && (
        <div className="mb-6 flex items-center gap-1 rounded-lg border bg-muted/50 p-1">
          <button
            onClick={() => setActiveTrack('A')}
            className={cn(
              'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors',
              activeTrack === 'A'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Track A: Options Pricing
          </button>
          <button
            onClick={() => setActiveTrack('B')}
            className={cn(
              'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors',
              activeTrack === 'B'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Track B: Quant Methods
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="secondary">Week {day.week}</Badge>
          <Badge variant="outline">Day {day.dayNumber}</Badge>
          {isTrackB && (
            <Badge className="border-0 bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
              Track B
            </Badge>
          )}
          {theoryCompleted && (
            <Badge className="border-0 bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
              Theory Complete
            </Badge>
          )}
        </div>
        <h1 className="mb-1 text-3xl font-bold">{title}</h1>
        <p className="mb-3 text-muted-foreground">{subtitle}</p>
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="size-4" /> {day.estimatedMinutes} min
          </span>
          <span className="flex items-center gap-1">
            <BookOpen className="size-4" /> {day.chapters.join(', ')}
          </span>
          <span className="flex items-center gap-1">
            <Target className="size-4" /> {totalExercises} exercises
          </span>
        </div>
      </div>

      {/* Objectives */}
      <div className="mb-6 rounded-lg border bg-muted/30 p-4">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Learning Objectives
        </h3>
        <ul className="space-y-1">
          {objectives.map((obj, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              {obj}
            </li>
          ))}
        </ul>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="font-medium">Day Progress</span>
          <span className="text-muted-foreground">{Math.round(completionPercent)}%</span>
        </div>
        <Progress value={completionPercent} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="theory" key={activeTrack}>
        <TabsList className="mb-4 w-full justify-start">
          <TabsTrigger value="theory">Theory</TabsTrigger>
          <TabsTrigger value="exercises">Exercises ({totalExercises})</TabsTrigger>
          <TabsTrigger value="flashcards">Flashcards ({flashcards.length})</TabsTrigger>
          <TabsTrigger value="cheatsheet">Cheat Sheet</TabsTrigger>
        </TabsList>

        <TabsContent value="theory">
          <TheoryRenderer sections={theory.sections} />
          {!theoryCompleted && (
            <div className="mt-8 flex justify-center">
              <Button
                onClick={() =>
                  isTrackB
                    ? markTheoryCompleteB(dayNumber)
                    : markTheoryComplete(dayNumber)
                }
                size="lg"
              >
                <CheckCircle2 className="size-4" />
                Mark Theory as Complete
              </Button>
            </div>
          )}
          {theoryCompleted && (
            <div className="mt-8 flex justify-center">
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="size-4" />
                Theory completed
              </div>
            </div>
          )}

          {summary.length > 0 && (
            <div className="mt-8 rounded-lg border bg-muted/30 p-4">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Summary
              </h3>
              <ul className="space-y-1">
                {summary.map((s, i) => (
                  <li key={i} className="text-sm">
                    <MathText text={`${'•'} ${s}`} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </TabsContent>

        <TabsContent value="exercises">
          <ExerciseRenderer exercises={exercises} dayNumber={dayNumber} />
        </TabsContent>

        <TabsContent value="flashcards">
          <FlashcardDeck cards={flashcards} dayNumber={dayNumber} />
        </TabsContent>

        <TabsContent value="cheatsheet">
          <CheatSheetTab entries={cheatSheet} />
        </TabsContent>
      </Tabs>

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between border-t pt-4">
        {prevDay ? (
          <Link href={`/day/${prevDay.dayNumber}`}>
            <Button variant="outline" className="gap-1">
              <ChevronLeft className="size-4" />
              Day {prevDay.dayNumber}: {prevDay.title}
            </Button>
          </Link>
        ) : (
          <div />
        )}
        {nextDay ? (
          <Link href={`/day/${nextDay.dayNumber}`}>
            <Button variant="outline" className="gap-1">
              Day {nextDay.dayNumber}: {nextDay.title}
              <ChevronRight className="size-4" />
            </Button>
          </Link>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}

function FormulaCell({ formula }: { formula: string }) {
  const ref = useRef<HTMLTableCellElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (mounted && ref.current) {
      try {
        ref.current.innerHTML = katex.renderToString(formula, {
          throwOnError: false,
          displayMode: false,
        });
      } catch {
        ref.current.textContent = formula;
      }
    }
  }, [mounted, formula]);
  return <td ref={ref} className="px-4 py-3" suppressHydrationWarning />;
}

function CheatSheetTab({ entries }: { entries: CheatSheetEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No cheat sheet entries for this day.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="px-4 py-3 text-left font-medium">Topic</th>
            <th className="px-4 py-3 text-left font-medium">Formula</th>
            <th className="px-4 py-3 text-left font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="px-4 py-3 font-medium">{entry.topic}</td>
              <FormulaCell formula={entry.formula} />
              <td className="px-4 py-3 text-muted-foreground">
                <MathText text={entry.description} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
