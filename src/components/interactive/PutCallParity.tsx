'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { putCallParity, blackScholes } from '@/lib/math/black-scholes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/* ────────── Calculator Mode ────────── */

type UnknownField = 'call' | 'put' | 'spot' | 'strike';

function CalculatorMode() {
  const [callPrice, setCallPrice] = useState<string>('10');
  const [putPrice, setPutPrice] = useState<string>('');
  const [spot, setSpot] = useState<string>('100');
  const [strike, setStrike] = useState<string>('100');
  const [r, setR] = useState<string>('0.05');
  const [T, setT] = useState<string>('1.0');

  const [solveFor, setSolveFor] = useState<UnknownField>('put');

  const computed = useMemo(() => {
    const rVal = parseFloat(r);
    const tVal = parseFloat(T);
    if (isNaN(rVal) || isNaN(tVal) || tVal <= 0) return null;

    const known: {
      callPrice?: number;
      putPrice?: number;
      spot?: number;
      strike?: number;
      r: number;
      T: number;
    } = { r: rVal, T: tVal };

    if (solveFor !== 'call' && callPrice) known.callPrice = parseFloat(callPrice);
    if (solveFor !== 'put' && putPrice) known.putPrice = parseFloat(putPrice);
    if (solveFor !== 'spot' && spot) known.spot = parseFloat(spot);
    if (solveFor !== 'strike' && strike) known.strike = parseFloat(strike);

    // Check we have enough
    const requiredKeys = (['call', 'put', 'spot', 'strike'] as const).filter(
      (k) => k !== solveFor
    );
    for (const k of requiredKeys) {
      const val =
        k === 'call'
          ? known.callPrice
          : k === 'put'
            ? known.putPrice
            : k === 'spot'
              ? known.spot
              : known.strike;
      if (val === undefined || isNaN(val)) return null;
    }

    try {
      return putCallParity(solveFor, known);
    } catch {
      return null;
    }
  }, [callPrice, putPrice, spot, strike, r, T, solveFor]);

  // Check parity violation: compute both C and P from known values and see if they satisfy parity
  const violation = useMemo(() => {
    const C = parseFloat(callPrice);
    const P = parseFloat(putPrice);
    const S = parseFloat(spot);
    const K = parseFloat(strike);
    const rVal = parseFloat(r);
    const tVal = parseFloat(T);

    if ([C, P, S, K, rVal, tVal].some(isNaN)) return null;

    const df = Math.exp(-rVal * tVal);
    const lhs = C - P; // C - P
    const rhs = S - K * df; // S - K*exp(-rT)
    const diff = Math.abs(lhs - rhs);

    if (diff > 0.01) {
      return {
        lhs: lhs.toFixed(4),
        rhs: rhs.toFixed(4),
        diff: diff.toFixed(4),
        description:
          lhs > rhs
            ? 'Call is overpriced relative to put. Arbitrage: Sell call, buy put, buy stock, borrow K*exp(-rT).'
            : 'Put is overpriced relative to call. Arbitrage: Sell put, buy call, short stock, lend K*exp(-rT).',
      };
    }
    return null;
  }, [callPrice, putPrice, spot, strike, r, T]);

  const parityFormula = katex.renderToString('C - P = S - K e^{-rT}', {
    displayMode: true,
    throwOnError: false,
  });

  return (
    <div className="space-y-6">
      <div
        className="text-center"
        dangerouslySetInnerHTML={{ __html: parityFormula }}
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Solve For</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(['call', 'put', 'spot', 'strike'] as const).map((f) => (
              <Button
                key={f}
                variant={solveFor === f ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSolveFor(f)}
              >
                {f === 'call'
                  ? 'Call Price (C)'
                  : f === 'put'
                    ? 'Put Price (P)'
                    : f === 'spot'
                      ? 'Spot (S)'
                      : 'Strike (K)'}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <Label className="text-xs">Call Price (C)</Label>
              <Input
                type="number"
                className="mt-1 h-8 text-sm"
                value={solveFor === 'call' ? (computed !== null ? computed.toFixed(4) : '') : callPrice}
                disabled={solveFor === 'call'}
                onChange={(e) => setCallPrice(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Put Price (P)</Label>
              <Input
                type="number"
                className="mt-1 h-8 text-sm"
                value={solveFor === 'put' ? (computed !== null ? computed.toFixed(4) : '') : putPrice}
                disabled={solveFor === 'put'}
                onChange={(e) => setPutPrice(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Spot (S)</Label>
              <Input
                type="number"
                className="mt-1 h-8 text-sm"
                value={solveFor === 'spot' ? (computed !== null ? computed.toFixed(4) : '') : spot}
                disabled={solveFor === 'spot'}
                onChange={(e) => setSpot(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Strike (K)</Label>
              <Input
                type="number"
                className="mt-1 h-8 text-sm"
                value={solveFor === 'strike' ? (computed !== null ? computed.toFixed(4) : '') : strike}
                disabled={solveFor === 'strike'}
                onChange={(e) => setStrike(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Risk-Free Rate (r)</Label>
              <Input
                type="number"
                className="mt-1 h-8 text-sm"
                value={r}
                onChange={(e) => setR(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Time to Expiry (T)</Label>
              <Input
                type="number"
                className="mt-1 h-8 text-sm"
                value={T}
                onChange={(e) => setT(e.target.value)}
              />
            </div>
          </div>

          {computed !== null && (
            <div className="mt-4 rounded-md bg-primary/10 p-3 text-center">
              <p className="text-sm text-muted-foreground">
                {solveFor === 'call'
                  ? 'Call Price'
                  : solveFor === 'put'
                    ? 'Put Price'
                    : solveFor === 'spot'
                      ? 'Spot Price'
                      : 'Strike Price'}
              </p>
              <p className="text-2xl font-bold tabular-nums">{computed.toFixed(4)}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {violation && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-700">
              Parity Violation Detected
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-red-700">
            <p>
              C - P = {violation.lhs}, but S - Ke^(-rT) = {violation.rhs}
            </p>
            <p>Difference: {violation.diff}</p>
            <p className="mt-2 font-medium">{violation.description}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ────────── Drill Mode ────────── */

interface DrillQuestion {
  S: number;
  K: number;
  r: number;
  T: number;
  C: number;
  P: number;
  unknownField: UnknownField;
  answer: number;
}

function generateQuestion(): DrillQuestion {
  const K = (Math.floor(Math.random() * 21) + 10) * 5; // 50-150, multiples of 5
  const S = K + Math.round((Math.random() * 0.2 - 0.1) * K);
  const r = 0.05;
  const T = parseFloat((0.25 + Math.random() * 0.75).toFixed(2)); // 0.25 to 1.0
  const sigma = 0.15 + Math.random() * 0.25;

  const result = blackScholes({ S, K, T, r, sigma });
  const C = parseFloat(result.callPrice.toFixed(2));
  const P = parseFloat(result.putPrice.toFixed(2));

  const fields: UnknownField[] = ['call', 'put', 'spot', 'strike'];
  const unknownField = fields[Math.floor(Math.random() * fields.length)];

  let answer: number;
  switch (unknownField) {
    case 'call':
      answer = C;
      break;
    case 'put':
      answer = P;
      break;
    case 'spot':
      answer = S;
      break;
    case 'strike':
      answer = K;
      break;
  }

  return { S, K, r, T, C, P, unknownField, answer };
}

function DrillMode() {
  const [timerMinutes, setTimerMinutes] = useState(5);
  const [isRunning, setIsRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [question, setQuestion] = useState<DrillQuestion | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [drillFinished, setDrillFinished] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startDrill = useCallback(() => {
    setIsRunning(true);
    setDrillFinished(false);
    setQuestionsAnswered(0);
    setCorrectCount(0);
    setSecondsLeft(timerMinutes * 60);
    setQuestion(generateQuestion());
    setUserAnswer('');
  }, [timerMinutes]);

  useEffect(() => {
    if (!isRunning) return;
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          setDrillFinished(true);
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

  useEffect(() => {
    if (isRunning && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isRunning, question]);

  const checkAnswer = useCallback(() => {
    if (!question || !userAnswer) return;
    const parsed = parseFloat(userAnswer);
    if (isNaN(parsed)) return;

    const tolerance = Math.max(0.5, question.answer * 0.02); // 2% or 0.5
    const isCorrect = Math.abs(parsed - question.answer) <= tolerance;

    setQuestionsAnswered((q) => q + 1);
    if (isCorrect) setCorrectCount((c) => c + 1);

    // Auto-advance
    setQuestion(generateQuestion());
    setUserAnswer('');
  }, [question, userAnswer]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') checkAnswer();
    },
    [checkAnswer]
  );

  const qpm =
    questionsAnswered > 0 && secondsLeft < timerMinutes * 60
      ? questionsAnswered / ((timerMinutes * 60 - secondsLeft) / 60)
      : 0;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (!isRunning && !drillFinished) {
    return (
      <div className="space-y-4">
        <div>
          <Label className="text-xs">Timer (minutes)</Label>
          <Input
            type="number"
            className="mt-1 h-8 w-24 text-sm"
            min={1}
            max={30}
            value={timerMinutes}
            onChange={(e) => setTimerMinutes(parseInt(e.target.value) || 5)}
          />
        </div>
        <Button onClick={startDrill}>Start Drill</Button>
      </div>
    );
  }

  if (drillFinished) {
    const accuracy =
      questionsAnswered > 0
        ? ((correctCount / questionsAnswered) * 100).toFixed(1)
        : '0';
    return (
      <Card>
        <CardHeader>
          <CardTitle>Drill Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Questions</p>
              <p className="text-2xl font-bold">{questionsAnswered}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Correct</p>
              <p className="text-2xl font-bold text-green-600">{correctCount}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Accuracy</p>
              <p className="text-2xl font-bold">{accuracy}%</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Q/min</p>
              <p className="text-2xl font-bold">
                {(questionsAnswered / timerMinutes).toFixed(1)}
              </p>
            </div>
          </div>
          <Separator />
          <Button onClick={startDrill}>Restart</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Timer Bar */}
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-sm font-mono">
          {formatTime(secondsLeft)}
        </Badge>
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span>Answered: {questionsAnswered}</span>
          <span>Correct: {correctCount}</span>
          <span>Q/min: {qpm.toFixed(1)}</span>
        </div>
      </div>

      {/* Question */}
      {question && (
        <Card>
          <CardContent className="space-y-4 py-6">
            <p className="text-center text-sm text-muted-foreground">
              Given put-call parity, solve for the unknown:
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div className="rounded border p-2 text-center">
                <p className="text-xs text-muted-foreground">Spot (S)</p>
                <p className="font-mono font-bold">
                  {question.unknownField === 'spot' ? '?' : question.S}
                </p>
              </div>
              <div className="rounded border p-2 text-center">
                <p className="text-xs text-muted-foreground">Strike (K)</p>
                <p className="font-mono font-bold">
                  {question.unknownField === 'strike' ? '?' : question.K}
                </p>
              </div>
              <div className="rounded border p-2 text-center">
                <p className="text-xs text-muted-foreground">Call (C)</p>
                <p className="font-mono font-bold">
                  {question.unknownField === 'call' ? '?' : question.C.toFixed(2)}
                </p>
              </div>
              <div className="rounded border p-2 text-center">
                <p className="text-xs text-muted-foreground">Put (P)</p>
                <p className="font-mono font-bold">
                  {question.unknownField === 'put' ? '?' : question.P.toFixed(2)}
                </p>
              </div>
              <div className="rounded border p-2 text-center">
                <p className="text-xs text-muted-foreground">Rate (r)</p>
                <p className="font-mono font-bold">{question.r}</p>
              </div>
              <div className="rounded border p-2 text-center">
                <p className="text-xs text-muted-foreground">Time (T)</p>
                <p className="font-mono font-bold">{question.T}</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <Input
                ref={inputRef}
                type="number"
                className="h-10 w-40 text-center text-lg font-mono"
                placeholder="Your answer"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <Button onClick={checkAnswer}>Submit</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ────────── Main Component ────────── */

export function PutCallParityCalculator() {
  return (
    <Tabs defaultValue="calculator">
      <TabsList>
        <TabsTrigger value="calculator">Calculator</TabsTrigger>
        <TabsTrigger value="drill">Speed Drill</TabsTrigger>
      </TabsList>
      <TabsContent value="calculator">
        <div className="pt-4">
          <CalculatorMode />
        </div>
      </TabsContent>
      <TabsContent value="drill">
        <div className="pt-4">
          <DrillMode />
        </div>
      </TabsContent>
    </Tabs>
  );
}
