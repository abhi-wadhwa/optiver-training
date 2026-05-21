'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Play, RotateCcw } from 'lucide-react';

type Difficulty = 'warmup' | 'standard' | 'natenberg';
type OpType =
  | 'addition'
  | 'subtraction'
  | 'multiplication'
  | 'percentage'
  | 'midpoint'
  | 'optionsMul';

interface Question {
  text: string;
  answer: number;
  opType: OpType;
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateQuestion(difficulty: Difficulty): Question {
  switch (difficulty) {
    case 'warmup': {
      const ops: (() => Question)[] = [
        () => {
          const a = randInt(10, 99);
          const b = randInt(10, 99);
          return { text: `${a} + ${b}`, answer: a + b, opType: 'addition' as OpType };
        },
        () => {
          const a = randInt(30, 99);
          const b = randInt(10, a);
          return { text: `${a} - ${b}`, answer: a - b, opType: 'subtraction' as OpType };
        },
        () => {
          const a = randInt(2, 12);
          const b = randInt(2, 12);
          return {
            text: `${a} × ${b}`,
            answer: a * b,
            opType: 'multiplication' as OpType,
          };
        },
      ];
      return ops[randInt(0, ops.length - 1)]();
    }

    case 'standard': {
      const ops: (() => Question)[] = [
        () => {
          const a = randInt(100, 999);
          const b = randInt(100, 999);
          return { text: `${a} + ${b}`, answer: a + b, opType: 'addition' as OpType };
        },
        () => {
          const a = randInt(200, 999);
          const b = randInt(100, a);
          return { text: `${a} - ${b}`, answer: a - b, opType: 'subtraction' as OpType };
        },
        () => {
          const a = randInt(10, 99);
          const b = randInt(2, 9);
          return {
            text: `${a} × ${b}`,
            answer: a * b,
            opType: 'multiplication' as OpType,
          };
        },
        () => {
          const pct = [5, 10, 15, 20, 25][randInt(0, 4)];
          const base = randInt(50, 500);
          return {
            text: `${pct}% of ${base}`,
            answer: parseFloat(((pct / 100) * base).toFixed(2)),
            opType: 'percentage' as OpType,
          };
        },
      ];
      return ops[randInt(0, ops.length - 1)]();
    }

    case 'natenberg': {
      const ops: (() => Question)[] = [
        // "What is 0.35 x 42?"
        () => {
          const decimal = parseFloat((randInt(5, 95) / 100).toFixed(2));
          const whole = randInt(10, 100);
          return {
            text: `${decimal} × ${whole}`,
            answer: parseFloat((decimal * whole).toFixed(2)),
            opType: 'optionsMul' as OpType,
          };
        },
        // "Midpoint of 42.50 and 43.75?"
        () => {
          const base = randInt(20, 200);
          const a = base + randInt(0, 100) / 100;
          const b = a + randInt(25, 300) / 100;
          const aRound = parseFloat(a.toFixed(2));
          const bRound = parseFloat(b.toFixed(2));
          return {
            text: `Midpoint of ${aRound.toFixed(2)} and ${bRound.toFixed(2)}`,
            answer: parseFloat(((aRound + bRound) / 2).toFixed(2)),
            opType: 'midpoint' as OpType,
          };
        },
        // "15% of 240?"
        () => {
          const pct = randInt(1, 50);
          const base = randInt(50, 500);
          return {
            text: `${pct}% of ${base}`,
            answer: parseFloat(((pct / 100) * base).toFixed(2)),
            opType: 'percentage' as OpType,
          };
        },
        // Decimal addition / subtraction
        () => {
          const a = parseFloat((randInt(100, 9999) / 100).toFixed(2));
          const b = parseFloat((randInt(100, 9999) / 100).toFixed(2));
          const isAdd = Math.random() > 0.5;
          return {
            text: isAdd
              ? `${a.toFixed(2)} + ${b.toFixed(2)}`
              : `${Math.max(a, b).toFixed(2)} - ${Math.min(a, b).toFixed(2)}`,
            answer: isAdd
              ? parseFloat((a + b).toFixed(2))
              : parseFloat((Math.max(a, b) - Math.min(a, b)).toFixed(2)),
            opType: isAdd ? ('addition' as OpType) : ('subtraction' as OpType),
          };
        },
      ];
      return ops[randInt(0, ops.length - 1)]();
    }
  }
}

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  warmup: 'Warmup',
  standard: 'Standard',
  natenberg: 'Natenberg',
};

const TOTAL_QUESTIONS = 80;
const DEFAULT_SECONDS = 8 * 60;

export function SpeedArithmeticDrill() {
  const [difficulty, setDifficulty] = useState<Difficulty>('warmup');
  const [totalSeconds, setTotalSeconds] = useState(DEFAULT_SECONDS);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_SECONDS);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [results, setResults] = useState<
    { question: Question; userAnswer: number; correct: boolean }[]
  >([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startDrill = useCallback(() => {
    setIsRunning(true);
    setIsFinished(false);
    setResults([]);
    setQuestionNumber(1);
    setSecondsLeft(totalSeconds);
    setCurrentQuestion(generateQuestion(difficulty));
    setUserAnswer('');
  }, [difficulty, totalSeconds]);

  // Timer
  useEffect(() => {
    if (!isRunning) return;
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          setIsFinished(true);
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  // Focus
  useEffect(() => {
    if (isRunning && inputRef.current) inputRef.current.focus();
  }, [isRunning, currentQuestion]);

  const submitAnswer = useCallback(() => {
    if (!currentQuestion || !userAnswer) return;
    const parsed = parseFloat(userAnswer);
    if (isNaN(parsed)) return;

    const tolerance = Math.max(0.01, Math.abs(currentQuestion.answer) * 0.005);
    const correct = Math.abs(parsed - currentQuestion.answer) <= tolerance;

    setResults((prev) => [
      ...prev,
      { question: currentQuestion, userAnswer: parsed, correct },
    ]);

    if (questionNumber >= TOTAL_QUESTIONS) {
      setIsRunning(false);
      setIsFinished(true);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    setQuestionNumber((n) => n + 1);
    setCurrentQuestion(generateQuestion(difficulty));
    setUserAnswer('');
  }, [currentQuestion, userAnswer, questionNumber, difficulty]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') submitAnswer();
    },
    [submitAnswer]
  );

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const elapsed = totalSeconds - secondsLeft;
  const qpm = elapsed > 0 ? results.length / (elapsed / 60) : 0;

  // ──────── Setup Screen ────────
  if (!isRunning && !isFinished) {
    return (
      <div className="mx-auto max-w-md space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Speed Arithmetic Drill</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs">Difficulty</Label>
              <div className="mt-2 flex gap-2">
                {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((d) => (
                  <Button
                    key={d}
                    variant={difficulty === d ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDifficulty(d)}
                  >
                    {DIFFICULTY_LABELS[d]}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs">Timer (seconds)</Label>
              <Input
                type="number"
                className="mt-1 h-8 w-28 text-sm"
                value={totalSeconds}
                min={60}
                max={1800}
                onChange={(e) => setTotalSeconds(parseInt(e.target.value) || DEFAULT_SECONDS)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Default: 8 min for 80 questions. Target: 10 Q/min.
              </p>
            </div>
            <Button size="lg" onClick={startDrill} className="w-full">
              <Play className="mr-2 h-4 w-4" />
              Start Drill
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ──────── Results Screen ────────
  if (isFinished) {
    const correctCount = results.filter((r) => r.correct).length;
    const accuracy = results.length > 0 ? (correctCount / results.length) * 100 : 0;
    const finalQpm = results.length / (totalSeconds / 60);

    // Breakdown by op type
    const byOp: Record<string, { total: number; correct: number }> = {};
    for (const r of results) {
      if (!byOp[r.question.opType]) byOp[r.question.opType] = { total: 0, correct: 0 };
      byOp[r.question.opType].total++;
      if (r.correct) byOp[r.question.opType].correct++;
    }

    return (
      <div className="mx-auto max-w-lg space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Results - {DIFFICULTY_LABELS[difficulty]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Answered</p>
                <p className="text-2xl font-bold">{results.length}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Correct</p>
                <p className="text-2xl font-bold text-green-600">{correctCount}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Accuracy</p>
                <p className="text-2xl font-bold">{accuracy.toFixed(1)}%</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Q/min</p>
                <p
                  className={`text-2xl font-bold ${finalQpm >= 10 ? 'text-green-600' : 'text-amber-600'}`}
                >
                  {finalQpm.toFixed(1)}
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <p className="mb-2 text-sm font-medium">Breakdown by Operation</p>
              <div className="space-y-2">
                {Object.entries(byOp).map(([op, data]) => (
                  <div key={op} className="flex items-center justify-between text-sm">
                    <span className="capitalize">{op}</span>
                    <span className="font-mono">
                      {data.correct}/{data.total} (
                      {((data.correct / data.total) * 100).toFixed(0)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <Button onClick={startDrill} className="w-full">
              <RotateCcw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ──────── Active Drill ────────
  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* Status Bar */}
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="font-mono text-sm">
          {formatTime(secondsLeft)}
        </Badge>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            Q {questionNumber}/{TOTAL_QUESTIONS}
          </span>
          <span>
            {results.filter((r) => r.correct).length}/{results.length} correct
          </span>
          <span>
            {qpm.toFixed(1)} Q/min{' '}
            {qpm >= 10 ? (
              <span className="text-green-600">&#10003;</span>
            ) : (
              <span className="text-amber-500">&#9679;</span>
            )}
          </span>
        </div>
      </div>

      <Progress value={(questionNumber / TOTAL_QUESTIONS) * 100} className="h-1.5" />

      {/* Question Display */}
      {currentQuestion && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="mb-6 text-3xl font-bold tracking-wide">
              {currentQuestion.text}
            </p>
            <div className="flex items-center justify-center gap-3">
              <Input
                ref={inputRef}
                type="number"
                className="h-12 w-44 text-center text-2xl font-mono"
                placeholder="?"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyDown={handleKeyDown}
                step="any"
              />
              <Button size="lg" onClick={submitAnswer}>
                Enter
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Press Enter to submit
            </p>
          </CardContent>
        </Card>
      )}

      {/* Target Line */}
      <div className="text-center text-xs text-muted-foreground">
        Target: 10 questions/minute | {DIFFICULTY_LABELS[difficulty]} difficulty
      </div>
    </div>
  );
}
