'use client';

import Link from 'next/link';
import { useProgressStore, getWeakTopics } from '@/stores/progress-store';
import { getAllExercisesByTag, allDays } from '@/content/index';
import ExerciseRenderer from '@/components/exercises/ExerciseRenderer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import type { Exercise } from '@/content/types';

export default function ReviewPage() {
  const days = useProgressStore((s) => s.days);
  const weakTopics = getWeakTopics(days);

  // Gather exercises from all days that match weak tags
  const weakExercises: Exercise[] = [];
  const seenIds = new Set<string>();

  for (const { topic } of weakTopics) {
    const tagExercises = getAllExercisesByTag(topic);
    for (const ex of tagExercises) {
      if (!seenIds.has(ex.id)) {
        seenIds.add(ex.id);
        weakExercises.push(ex);
      }
    }
  }

  // Also find exercises by scanning all days for matching tags
  for (const { topic } of weakTopics) {
    for (const day of allDays) {
      const allEx = [...day.exercises, ...day.cumulativeExercises];
      for (const ex of allEx) {
        if (!seenIds.has(ex.id) && ex.tags.some((t) => t.includes(topic) || topic.includes(t))) {
          seenIds.add(ex.id);
          weakExercises.push({ ...ex, fromDay: day.dayNumber });
        }
      }
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-2 gap-1">
            <ArrowLeft className="size-4" />
            Back to Home
          </Button>
        </Link>
        <h1 className="mb-1 text-3xl font-bold">Review Weak Topics</h1>
        <p className="text-muted-foreground">
          Practice exercises from topics where your accuracy is below 80%.
        </p>
      </div>

      {weakTopics.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="mb-4 text-6xl">&#127942;</div>
          <h2 className="mb-2 text-xl font-bold">No weak topics!</h2>
          <p className="mb-4 text-center text-muted-foreground">
            Either you are doing great on all topics, or you have not attempted
            enough exercises yet. Complete some exercises first, then come back
            here.
          </p>
          <Link href="/">
            <Button>Go to Dashboard</Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Weak topics summary */}
          <div className="mb-6 rounded-lg border p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="size-4 text-amber-500" />
              Weak Topics ({weakTopics.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {weakTopics.map(({ topic, accuracy }) => (
                <Badge key={topic} variant="outline" className="gap-1">
                  {topic}
                  <span className="text-xs text-muted-foreground">
                    ({Math.round(accuracy * 100)}%)
                  </span>
                </Badge>
              ))}
            </div>
          </div>

          {/* Exercises grouped for practice */}
          {weakExercises.length > 0 ? (
            <ExerciseRenderer exercises={weakExercises} dayNumber={0} />
          ) : (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No exercises found matching your weak topics. Try completing more
              exercises from the day pages.
            </div>
          )}
        </>
      )}
    </div>
  );
}
