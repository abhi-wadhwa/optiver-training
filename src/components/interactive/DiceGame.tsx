'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dices, RotateCcw, Play } from 'lucide-react';

/* ────────── Expected Value mode ────────── */

function ExpectedValueGame() {
  const [rolls, setRolls] = useState<number[]>([]);
  const [currentFace, setCurrentFace] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [strikeK, setStrikeK] = useState<number>(0); // 0 means no call option
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const payout = useCallback(
    (face: number) => (strikeK > 0 ? Math.max(face - strikeK, 0) : face),
    [strikeK]
  );

  const theoreticalEV = useMemo(() => {
    if (strikeK <= 0) return 3.5;
    // EV of max(X - K, 0) where X is uniform {1,...,6}
    let sum = 0;
    for (let f = 1; f <= 6; f++) sum += Math.max(f - strikeK, 0);
    return sum / 6;
  }, [strikeK]);

  const chartData = useMemo(() => {
    const data: { roll: number; runningAvg: number; theoretical: number }[] = [];
    let sum = 0;
    for (let i = 0; i < rolls.length; i++) {
      sum += payout(rolls[i]);
      data.push({
        roll: i + 1,
        runningAvg: parseFloat((sum / (i + 1)).toFixed(4)),
        theoretical: theoreticalEV,
      });
    }
    return data;
  }, [rolls, payout, theoreticalEV]);

  const rollDie = useCallback(() => {
    if (isRolling) return;
    setIsRolling(true);

    let count = 0;
    intervalRef.current = setInterval(() => {
      setCurrentFace(Math.floor(Math.random() * 6) + 1);
      count++;
      if (count >= 8) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        const finalFace = Math.floor(Math.random() * 6) + 1;
        setCurrentFace(finalFace);
        setRolls((prev) => [...prev, finalFace]);
        setIsRolling(false);
      }
    }, 60);
  }, [isRolling]);

  const reset = useCallback(() => {
    setRolls([]);
    setCurrentFace(null);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRolling(false);
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const runningAvg =
    rolls.length > 0
      ? rolls.reduce((s, r) => s + payout(r), 0) / rolls.length
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <Label className="text-xs">Call Strike (0 = no option)</Label>
          <Input
            type="number"
            className="mt-1 h-8 w-24 text-sm"
            min={0}
            max={6}
            value={strikeK}
            onChange={(e) => setStrikeK(parseInt(e.target.value) || 0)}
          />
        </div>
        <Badge variant="outline">
          Theoretical EV: {theoreticalEV.toFixed(4)}
        </Badge>
      </div>

      {/* Die Display */}
      <div className="flex items-center gap-6">
        <div className="flex h-28 w-28 items-center justify-center rounded-xl border-2 bg-white text-5xl font-bold shadow-sm">
          {currentFace ?? '?'}
        </div>
        <div className="space-y-2">
          <Button onClick={rollDie} disabled={isRolling} size="lg">
            <Dices className="mr-2 h-4 w-4" />
            Roll
          </Button>
          <br />
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="mr-1 h-3 w-3" />
            Reset
          </Button>
        </div>
        <div className="space-y-1 text-sm">
          <p>
            Rolls: <span className="font-mono font-bold">{rolls.length}</span>
          </p>
          <p>
            Running Avg:{' '}
            <span className="font-mono font-bold">{runningAvg.toFixed(4)}</span>
          </p>
          {strikeK > 0 && currentFace !== null && (
            <p>
              Last Payout:{' '}
              <span className="font-mono font-bold">{payout(currentFace)}</span>
            </p>
          )}
        </div>
      </div>

      {/* Chart */}
      {rolls.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Running Average EV</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full overflow-x-auto">
              <AreaChart
                width={800}
                height={300}
                data={chartData}
                margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="roll" tick={{ fontSize: 11 }} label={{ value: 'Roll #', position: 'bottom', offset: -5 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <ReferenceLine
                  y={theoreticalEV}
                  stroke="#ef4444"
                  strokeDasharray="5 3"
                  label={{ value: `EV = ${theoreticalEV.toFixed(2)}`, position: 'right', fontSize: 11 }}
                />
                <Area
                  type="monotone"
                  dataKey="runningAvg"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.1}
                  name="Running Average"
                />
              </AreaChart>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ────────── Optimal Stopping mode ────────── */

function computeThresholds(maxRolls: number): number[] {
  // backward induction: thresholds[i] = minimum value to accept on roll i
  // At the last roll, accept anything.
  // EV of continuing from roll i = EV of optimal play with (maxRolls - i - 1) rolls left
  // For a fair 6-sided die, we compute backwards.
  const ev = new Array(maxRolls).fill(0);
  ev[maxRolls - 1] = 3.5; // last roll, must accept
  const thresholds = new Array(maxRolls).fill(1);
  thresholds[maxRolls - 1] = 1; // accept anything on last roll

  for (let i = maxRolls - 2; i >= 0; i--) {
    // If we stop at roll i with value v: payout = v
    // If we continue: payout = ev[i+1]
    // Optimal: stop if v >= ev[i+1], else continue
    const continueEV = ev[i + 1];
    // Threshold: smallest integer face value >= continueEV
    thresholds[i] = Math.ceil(continueEV);
    // EV at roll i = sum over faces: max(face, continueEV) / 6
    let sumEV = 0;
    for (let f = 1; f <= 6; f++) {
      sumEV += Math.max(f, continueEV);
    }
    ev[i] = sumEV / 6;
  }

  return thresholds;
}

function OptimalStoppingGame() {
  const [maxRolls, setMaxRolls] = useState(3);
  const [rolls, setRolls] = useState<number[]>([]);
  const [currentFace, setCurrentFace] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const thresholds = useMemo(() => computeThresholds(maxRolls), [maxRolls]);

  const rollsRemaining = maxRolls - rolls.length;
  const isLastRoll = rollsRemaining === 0;
  const gameOver = stopped || isLastRoll;

  const rollDie = useCallback(() => {
    if (isRolling || gameOver) return;
    setIsRolling(true);

    let count = 0;
    intervalRef.current = setInterval(() => {
      setCurrentFace(Math.floor(Math.random() * 6) + 1);
      count++;
      if (count >= 8) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        const finalFace = Math.floor(Math.random() * 6) + 1;
        setCurrentFace(finalFace);
        setRolls((prev) => {
          const updated = [...prev, finalFace];
          // Auto-stop on last roll
          if (updated.length === maxRolls) {
            setStopped(true);
            setGamesPlayed((g) => g + 1);
            setTotalScore((t) => t + finalFace);
          }
          return updated;
        });
        setIsRolling(false);
      }
    }, 60);
  }, [isRolling, gameOver, maxRolls]);

  const stopAndKeep = useCallback(() => {
    if (!currentFace || gameOver) return;
    setStopped(true);
    setGamesPlayed((g) => g + 1);
    setTotalScore((t) => t + currentFace);
  }, [currentFace, gameOver]);

  const newGame = useCallback(() => {
    setRolls([]);
    setCurrentFace(null);
    setStopped(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRolling(false);
  }, []);

  const fullReset = useCallback(() => {
    newGame();
    setGamesPlayed(0);
    setTotalScore(0);
  }, [newGame]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const currentRollIndex = rolls.length - 1;
  const optimalThreshold = currentRollIndex >= 0 ? thresholds[currentRollIndex] : null;
  const shouldStop =
    optimalThreshold !== null && currentFace !== null && currentFace >= optimalThreshold;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <Label className="text-xs">Max Rolls per Game</Label>
          <Input
            type="number"
            className="mt-1 h-8 w-20 text-sm"
            min={1}
            max={20}
            value={maxRolls}
            onChange={(e) => {
              setMaxRolls(Math.max(1, parseInt(e.target.value) || 3));
              fullReset();
            }}
          />
        </div>
      </div>

      {/* Optimal Thresholds */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Optimal Thresholds (backward induction)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {thresholds.map((t, i) => (
              <Badge
                key={i}
                variant={i === currentRollIndex ? 'default' : 'outline'}
              >
                Roll {i + 1}: stop if &ge; {t}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Game Area */}
      <div className="flex items-center gap-6">
        <div className="flex h-28 w-28 items-center justify-center rounded-xl border-2 bg-white text-5xl font-bold shadow-sm">
          {currentFace ?? '?'}
        </div>
        <div className="space-y-2">
          {!gameOver && (
            <>
              <Button onClick={rollDie} disabled={isRolling} size="lg">
                <Dices className="mr-2 h-4 w-4" />
                Roll ({rollsRemaining} left)
              </Button>
              {rolls.length > 0 && (
                <>
                  <br />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={stopAndKeep}
                    disabled={isRolling}
                  >
                    Stop &amp; Keep {currentFace}
                  </Button>
                </>
              )}
            </>
          )}
          {gameOver && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">
                Game Over! Score: {currentFace}
              </p>
              <Button size="sm" onClick={newGame}>
                <Play className="mr-1 h-3 w-3" />
                New Game
              </Button>
            </div>
          )}
          <br />
          <Button variant="outline" size="sm" onClick={fullReset}>
            <RotateCcw className="mr-1 h-3 w-3" />
            Full Reset
          </Button>
        </div>
        <div className="space-y-1 text-sm">
          <p>
            Roll history: <span className="font-mono">{rolls.join(', ') || '--'}</span>
          </p>
          {currentFace !== null && !gameOver && optimalThreshold !== null && (
            <p>
              Optimal says:{' '}
              <span className={`font-bold ${shouldStop ? 'text-green-600' : 'text-red-600'}`}>
                {shouldStop ? 'STOP' : 'CONTINUE'}
              </span>
            </p>
          )}
          <Separator className="my-2" />
          <p>
            Games: <span className="font-mono">{gamesPlayed}</span>
          </p>
          <p>
            Avg Score:{' '}
            <span className="font-mono">
              {gamesPlayed > 0 ? (totalScore / gamesPlayed).toFixed(2) : '--'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ────────── Main Component ────────── */

export function DiceGameSimulator() {
  return (
    <Tabs defaultValue="ev">
      <TabsList>
        <TabsTrigger value="ev">Expected Value</TabsTrigger>
        <TabsTrigger value="stopping">Optimal Stopping</TabsTrigger>
      </TabsList>
      <TabsContent value="ev">
        <div className="pt-4">
          <ExpectedValueGame />
        </div>
      </TabsContent>
      <TabsContent value="stopping">
        <div className="pt-4">
          <OptimalStoppingGame />
        </div>
      </TabsContent>
    </Tabs>
  );
}
