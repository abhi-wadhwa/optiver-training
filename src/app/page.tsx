'use client';

import { allDays, getDaysForWeek } from '@/content';
import { useProgressStore } from '@/stores/progress-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { Clock, Flame, Target, Trophy } from 'lucide-react';
import type { DayContent } from '@/content/types';

export default function Dashboard() {
  const store = useProgressStore();
  const week1 = getDaysForWeek(1);
  const week2 = getDaysForWeek(2);

  const totalExercises = allDays.reduce(
    (sum, d) => sum + d.exercises.length + d.cumulativeExercises.length,
    0
  );
  const completedExercises = Object.values(store.days).reduce((sum, day) => {
    return (
      sum +
      Object.values(day.exerciseAttempts).filter((attempts) =>
        attempts.some((a) => a.correct)
      ).length
    );
  }, 0);

  const overallProgress =
    totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0;

  const hours = Math.floor(store.totalStudyTimeSeconds / 3600);
  const minutes = Math.floor((store.totalStudyTimeSeconds % 3600) / 60);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Options Pricing Mastery
        </h1>
        <p className="mt-2 text-muted-foreground">
          14-day intensive training based on Natenberg&apos;s Option Volatility
          and Pricing
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Target className="h-4 w-4" />}
          label="Overall Progress"
          value={`${Math.round(overallProgress)}%`}
          sub={`${completedExercises}/${totalExercises} exercises`}
        />
        <StatCard
          icon={<Flame className="h-4 w-4" />}
          label="Current Streak"
          value={`${store.currentStreak} days`}
          sub={`Best: ${store.longestStreak} days`}
        />
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="Study Time"
          value={hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`}
          sub="Total time invested"
        />
        <StatCard
          icon={<Trophy className="h-4 w-4" />}
          label="Days Completed"
          value={`${Object.values(store.days).filter((d) => d.theoryCompleted).length}/14`}
          sub="Theory sections read"
        />
      </div>

      <div className="space-y-6">
        <WeekSection title="Week 1: Core Mechanics & Greeks" days={week1} />
        <WeekSection title="Week 2: Advanced Topics" days={week2} />
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

function WeekSection({
  title,
  days,
}: {
  title: string;
  days: DayContent[];
}) {
  const store = useProgressStore();

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">{title}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {days.map((day) => {
          const completion = store.getDayCompletionPercent(
            day.dayNumber,
            day.exercises.length
          );
          const dayProgress = store.getDayProgress(day.dayNumber);
          const attemptedCount = Object.keys(
            dayProgress.exerciseAttempts
          ).length;

          return (
            <Link key={day.dayNumber} href={`/day/${day.dayNumber}`}>
              <Card className="transition-shadow hover:shadow-md cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      Day {day.dayNumber}
                    </Badge>
                    {completion >= 80 && (
                      <Badge className="bg-green-100 text-green-800 text-xs">
                        Mastered
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-sm mt-2">{day.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-3">
                    {day.subtitle}
                  </p>
                  <Progress value={completion} className="h-1.5" />
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {attemptedCount}/{day.exercises.length} exercises
                    </span>
                    <span>{day.estimatedMinutes}min</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
