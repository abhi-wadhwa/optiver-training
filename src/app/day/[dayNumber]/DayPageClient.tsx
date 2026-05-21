'use client';

import React from 'react';
import Link from 'next/link';
import { getDay, allDays } from '@/content/index';
import { useProgressStore } from '@/stores/progress-store';
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

export default function DayPageClient({ dayNumber }: { dayNumber: number }) {
  const day = getDay(dayNumber);
  const markTheoryComplete = useProgressStore((s) => s.markTheoryComplete);
  const dayProgress = useProgressStore((s) => s.getDayProgress(dayNumber));
  const getDayCompletionPercent = useProgressStore((s) => s.getDayCompletionPercent);

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

  const totalExercises = day.exercises.length + day.cumulativeExercises.length;
  const completionPercent = getDayCompletionPercent(dayNumber, totalExercises);
  const prevDay = allDays.find((d) => d.dayNumber === dayNumber - 1);
  const nextDay = allDays.find((d) => d.dayNumber === dayNumber + 1);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="secondary">Week {day.week}</Badge>
          <Badge variant="outline">Day {day.dayNumber}</Badge>
          {dayProgress.theoryCompleted && (
            <Badge className="border-0 bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
              Theory Complete
            </Badge>
          )}
        </div>
        <h1 className="mb-1 text-3xl font-bold">{day.title}</h1>
        <p className="mb-3 text-muted-foreground">{day.subtitle}</p>
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
          {day.objectives.map((obj, i) => (
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
      <Tabs defaultValue="theory">
        <TabsList className="mb-4 w-full justify-start">
          <TabsTrigger value="theory">Theory</TabsTrigger>
          <TabsTrigger value="exercises">Exercises ({totalExercises})</TabsTrigger>
          <TabsTrigger value="flashcards">Flashcards ({day.flashcards.length})</TabsTrigger>
          <TabsTrigger value="cheatsheet">Cheat Sheet</TabsTrigger>
        </TabsList>

        <TabsContent value="theory">
          <TheoryRenderer sections={day.theory.sections} />
          {!dayProgress.theoryCompleted && (
            <div className="mt-8 flex justify-center">
              <Button onClick={() => markTheoryComplete(dayNumber)} size="lg">
                <CheckCircle2 className="size-4" />
                Mark Theory as Complete
              </Button>
            </div>
          )}
          {dayProgress.theoryCompleted && (
            <div className="mt-8 flex justify-center">
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="size-4" />
                Theory completed
              </div>
            </div>
          )}

          {/* Summary */}
          {day.summary.length > 0 && (
            <div className="mt-8 rounded-lg border bg-muted/30 p-4">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Summary
              </h3>
              <ul className="space-y-1">
                {day.summary.map((s, i) => (
                  <li key={i} className="text-sm">
                    <MathText text={`${'•'} ${s}`} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </TabsContent>

        <TabsContent value="exercises">
          <ExerciseRenderer
            exercises={[...day.exercises, ...day.cumulativeExercises]}
            dayNumber={dayNumber}
          />
        </TabsContent>

        <TabsContent value="flashcards">
          <FlashcardDeck cards={day.flashcards} dayNumber={dayNumber} />
        </TabsContent>

        <TabsContent value="cheatsheet">
          <CheatSheetTab entries={day.cheatSheet} />
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
