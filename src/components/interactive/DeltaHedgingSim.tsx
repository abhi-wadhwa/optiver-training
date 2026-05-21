'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';
import { blackScholes } from '@/lib/math/black-scholes';
import { SliderInput } from './SliderInput';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Play, RotateCcw } from 'lucide-react';

/* ────────── Random normal via Box-Muller ────────── */

function randomNormal(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/* ────────── Simulation types ────────── */

interface HedgeStep {
  time: number;
  stock: number;
  delta: number;
  shares: number;
  cashFlow: number;
  cumulativeCash: number;
  cumulativePnL: number;
}

interface SinglePathResult {
  steps: HedgeStep[];
  premium: number;
  optionPayoff: number;
  finalPnL: number;
  hedgeCost: number;
}

interface MonteCarloResult {
  pnls: number[];
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  premium: number;
}

/* ────────── Simulation logic ────────── */

function simulateSinglePath(
  S0: number,
  K: number,
  realizedVol: number,
  impliedVol: number,
  r: number,
  T: number,
  nSteps: number,
): SinglePathResult {
  const dt = T / nSteps;
  const sqrtDt = Math.sqrt(dt);

  // Price the option at implied vol
  const bs0 = blackScholes({ S: S0, K, T, r, sigma: impliedVol });
  const premium = bs0.callPrice;

  const steps: HedgeStep[] = [];
  let stock = S0;
  let prevDelta = 0;
  let cash = premium; // start with premium collected

  for (let i = 0; i <= nSteps; i++) {
    const timeLeft = T - (i * dt);
    const t = i * dt;

    // Compute BS delta at implied vol
    const bsResult = blackScholes({
      S: stock,
      K,
      T: Math.max(timeLeft, 1e-10),
      r,
      sigma: impliedVol,
    });
    const delta = bsResult.callGreeks.delta;

    // Trade shares to become delta-neutral (we are short the call, so hedge is +delta shares)
    const sharesToTrade = delta - prevDelta;
    const tradeCashFlow = -sharesToTrade * stock;

    cash += tradeCashFlow;

    // Accrue interest on cash for the coming step (except at final step)
    if (i < nSteps) {
      cash *= Math.exp(r * dt);
    }

    const cumulativePnL = cash + delta * stock - premium;

    steps.push({
      time: parseFloat(t.toFixed(4)),
      stock: parseFloat(stock.toFixed(2)),
      delta: parseFloat(delta.toFixed(4)),
      shares: parseFloat(delta.toFixed(4)),
      cashFlow: parseFloat(tradeCashFlow.toFixed(4)),
      cumulativeCash: parseFloat(cash.toFixed(4)),
      cumulativePnL: parseFloat(cumulativePnL.toFixed(4)),
    });

    prevDelta = delta;

    // Evolve stock price (except after last step)
    if (i < nSteps) {
      const z = randomNormal();
      stock = stock * Math.exp((r - 0.5 * realizedVol * realizedVol) * dt + realizedVol * sqrtDt * z);
    }
  }

  // Settlement: sell all shares, pay option payoff
  const lastStep = steps[steps.length - 1];
  const finalStock = lastStep.stock;
  const optionPayoff = Math.max(finalStock - K, 0);

  // Final P&L: cash + shares sold - option payoff
  // cash already includes premium, interest, and all trading cash flows
  // We hold prevDelta shares at finalStock
  const finalPnL = cash + prevDelta * finalStock - optionPayoff;
  const hedgeCost = premium - finalPnL + optionPayoff;

  return {
    steps,
    premium: parseFloat(premium.toFixed(4)),
    optionPayoff: parseFloat(optionPayoff.toFixed(4)),
    finalPnL: parseFloat(finalPnL.toFixed(4)),
    hedgeCost: parseFloat(hedgeCost.toFixed(4)),
  };
}

function simulateMonteCarlo(
  S0: number,
  K: number,
  realizedVol: number,
  impliedVol: number,
  r: number,
  T: number,
  nSteps: number,
  nPaths: number,
): MonteCarloResult {
  const dt = T / nSteps;
  const sqrtDt = Math.sqrt(dt);

  const bs0 = blackScholes({ S: S0, K, T, r, sigma: impliedVol });
  const premium = bs0.callPrice;

  const pnls: number[] = [];

  for (let p = 0; p < nPaths; p++) {
    let stock = S0;
    let prevDelta = 0;
    let cash = premium;

    for (let i = 0; i <= nSteps; i++) {
      const timeLeft = T - i * dt;

      const bsResult = blackScholes({
        S: stock,
        K,
        T: Math.max(timeLeft, 1e-10),
        r,
        sigma: impliedVol,
      });
      const delta = bsResult.callGreeks.delta;

      const sharesToTrade = delta - prevDelta;
      cash += -sharesToTrade * stock;

      if (i < nSteps) {
        cash *= Math.exp(r * dt);
      }

      prevDelta = delta;

      if (i < nSteps) {
        const z = randomNormal();
        stock = stock * Math.exp((r - 0.5 * realizedVol * realizedVol) * dt + realizedVol * sqrtDt * z);
      }
    }

    const optionPayoff = Math.max(stock - K, 0);
    const finalPnL = cash + prevDelta * stock - optionPayoff;
    pnls.push(finalPnL);
  }

  const mean = pnls.reduce((a, b) => a + b, 0) / pnls.length;
  const variance = pnls.reduce((a, b) => a + (b - mean) ** 2, 0) / pnls.length;
  const stdDev = Math.sqrt(variance);
  const min = Math.min(...pnls);
  const max = Math.max(...pnls);

  return { pnls, mean, stdDev, min, max, premium };
}

/* ────────── Formatting helpers ────────── */

function fmt(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

function pnlColor(n: number): string {
  return n >= 0 ? 'text-green-600' : 'text-red-600';
}

function pnlBg(n: number): string {
  return n >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
}

/* ────────── Hedging frequency options ────────── */

const HEDGE_INTERVALS = [10, 25, 50, 100, 252] as const;
const PATH_COUNTS = [100, 500, 1000] as const;

/* ────────── Single Path Mode ────────── */

function SinglePathMode() {
  const [s0, setS0] = useState(100);
  const [strike, setStrike] = useState(100);
  const [realizedVol, setRealizedVol] = useState(0.20);
  const [impliedVol, setImpliedVol] = useState(0.20);
  const [riskFree, setRiskFree] = useState(0.05);
  const [expiry, setExpiry] = useState(1.0);
  const [nSteps, setNSteps] = useState(50);
  const [result, setResult] = useState<SinglePathResult | null>(null);

  const runSim = useCallback(() => {
    const r = simulateSinglePath(s0, strike, realizedVol, impliedVol, riskFree, expiry, nSteps);
    setResult(r);
  }, [s0, strike, realizedVol, impliedVol, riskFree, expiry, nSteps]);

  const stockChartData = useMemo(() => {
    if (!result) return [];
    return result.steps.map((s) => ({ time: s.time, stock: s.stock }));
  }, [result]);

  const deltaChartData = useMemo(() => {
    if (!result) return [];
    return result.steps.map((s) => ({ time: s.time, delta: s.delta }));
  }, [result]);

  const pnlChartData = useMemo(() => {
    if (!result) return [];
    return result.steps.map((s) => ({ time: s.time, pnl: s.cumulativePnL }));
  }, [result]);

  return (
    <div className="space-y-6">
      {/* Settings */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Simulation Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <SliderInput label="Initial Stock Price (S0)" min={10} max={500} step={1} value={s0} onChange={setS0} precision={0} />
            <SliderInput label="Strike (K)" min={10} max={500} step={1} value={strike} onChange={setStrike} precision={0} />
            <SliderInput label="Realized Vol (sigma)" min={0.01} max={1.0} step={0.01} value={realizedVol} onChange={setRealizedVol} />
            <SliderInput label="Implied Vol (pricing)" min={0.01} max={1.0} step={0.01} value={impliedVol} onChange={setImpliedVol} />
            <SliderInput label="Risk-Free Rate (r)" min={0} max={0.2} step={0.005} value={riskFree} onChange={setRiskFree} precision={3} />
            <SliderInput label="Time to Expiry (T years)" min={0.1} max={5.0} step={0.1} value={expiry} onChange={setExpiry} precision={1} />
          </div>

          <Separator className="my-4" />

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground">Hedging Intervals:</span>
            {HEDGE_INTERVALS.map((n) => (
              <Button
                key={n}
                variant={nSteps === n ? 'default' : 'outline'}
                size="sm"
                onClick={() => setNSteps(n)}
              >
                {n}
              </Button>
            ))}
          </div>

          <div className="mt-4 flex gap-3">
            <Button onClick={runSim} size="lg">
              <Play className="mr-2 h-4 w-4" />
              Run Simulation
            </Button>
            {result && (
              <Button variant="outline" size="lg" onClick={runSim}>
                <RotateCcw className="mr-2 h-4 w-4" />
                New Path
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Premium Collected</p>
                <p className="text-lg font-bold tabular-nums">${fmt(result.premium)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Option Payoff</p>
                <p className="text-lg font-bold tabular-nums">${fmt(result.optionPayoff)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Hedge Cost</p>
                <p className="text-lg font-bold tabular-nums">${fmt(result.hedgeCost)}</p>
              </CardContent>
            </Card>
            <Card className={`border ${pnlBg(result.finalPnL)}`}>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Net P&L</p>
                <p className={`text-lg font-bold tabular-nums ${pnlColor(result.finalPnL)}`}>
                  ${fmt(result.finalPnL)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Hedge Slippage</p>
                <p className="text-lg font-bold tabular-nums">
                  ${fmt(Math.abs(result.finalPnL))}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Stock Price Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Stock Price Path</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full overflow-x-auto">
                <LineChart
                  width={800}
                  height={300}
                  data={stockChartData}
                  margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 11 }}
                    label={{ value: 'Time (years)', position: 'bottom', offset: -5 }}
                  />
                  <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <ReferenceLine
                    y={strike}
                    stroke="#ef4444"
                    strokeDasharray="5 3"
                    label={{ value: `K = ${strike}`, position: 'right', fontSize: 11 }}
                  />
                  <Line type="monotone" dataKey="stock" stroke="#3b82f6" strokeWidth={2} dot={false} name="Stock Price" />
                </LineChart>
              </div>
            </CardContent>
          </Card>

          {/* Delta Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Delta Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full overflow-x-auto">
                <LineChart
                  width={800}
                  height={250}
                  data={deltaChartData}
                  margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 11 }}
                    label={{ value: 'Time (years)', position: 'bottom', offset: -5 }}
                  />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 1]} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <ReferenceLine y={0.5} stroke="#888" strokeDasharray="3 3" />
                  <Line type="stepAfter" dataKey="delta" stroke="#f97316" strokeWidth={2} dot={false} name="Delta" />
                </LineChart>
              </div>
            </CardContent>
          </Card>

          {/* Cumulative Hedge P&L Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Cumulative Hedge P&L</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full overflow-x-auto">
                <LineChart
                  width={800}
                  height={250}
                  data={pnlChartData}
                  margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 11 }}
                    label={{ value: 'Time (years)', position: 'bottom', offset: -5 }}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <ReferenceLine y={0} stroke="#888" strokeWidth={1} />
                  <Line type="monotone" dataKey="pnl" stroke="#10b981" strokeWidth={2} dot={false} name="Hedge P&L" />
                </LineChart>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

/* ────────── Monte Carlo Mode ────────── */

function MonteCarloMode() {
  const [s0, setS0] = useState(100);
  const [strike, setStrike] = useState(100);
  const [realizedVol, setRealizedVol] = useState(0.20);
  const [impliedVol, setImpliedVol] = useState(0.20);
  const [riskFree, setRiskFree] = useState(0.05);
  const [expiry, setExpiry] = useState(1.0);
  const [nSteps, setNSteps] = useState(50);
  const [nPaths, setNPaths] = useState(500);
  const [result, setResult] = useState<MonteCarloResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runSim = useCallback(() => {
    setIsRunning(true);
    // Use setTimeout to allow the UI to update before heavy computation
    setTimeout(() => {
      const r = simulateMonteCarlo(s0, strike, realizedVol, impliedVol, riskFree, expiry, nSteps, nPaths);
      setResult(r);
      setIsRunning(false);
    }, 10);
  }, [s0, strike, realizedVol, impliedVol, riskFree, expiry, nSteps, nPaths]);

  const histogramData = useMemo(() => {
    if (!result) return [];
    const { pnls } = result;
    const nBins = 40;
    const min = Math.min(...pnls);
    const max = Math.max(...pnls);
    const binWidth = (max - min) / nBins || 1;

    const bins = Array.from({ length: nBins }, (_, i) => ({
      x: parseFloat((min + (i + 0.5) * binWidth).toFixed(2)),
      xLabel: fmt(min + (i + 0.5) * binWidth),
      count: 0,
      rangeStart: min + i * binWidth,
      rangeEnd: min + (i + 1) * binWidth,
    }));

    for (const pnl of pnls) {
      let idx = Math.floor((pnl - min) / binWidth);
      if (idx >= nBins) idx = nBins - 1;
      if (idx < 0) idx = 0;
      bins[idx].count++;
    }

    return bins;
  }, [result]);

  return (
    <div className="space-y-6">
      {/* Settings */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Simulation Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <SliderInput label="Initial Stock Price (S0)" min={10} max={500} step={1} value={s0} onChange={setS0} precision={0} />
            <SliderInput label="Strike (K)" min={10} max={500} step={1} value={strike} onChange={setStrike} precision={0} />
            <SliderInput label="Realized Vol (sigma)" min={0.01} max={1.0} step={0.01} value={realizedVol} onChange={setRealizedVol} />
            <SliderInput label="Implied Vol (pricing)" min={0.01} max={1.0} step={0.01} value={impliedVol} onChange={setImpliedVol} />
            <SliderInput label="Risk-Free Rate (r)" min={0} max={0.2} step={0.005} value={riskFree} onChange={setRiskFree} precision={3} />
            <SliderInput label="Time to Expiry (T years)" min={0.1} max={5.0} step={0.1} value={expiry} onChange={setExpiry} precision={1} />
          </div>

          <Separator className="my-4" />

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground">Hedging Intervals:</span>
            {HEDGE_INTERVALS.map((n) => (
              <Button
                key={n}
                variant={nSteps === n ? 'default' : 'outline'}
                size="sm"
                onClick={() => setNSteps(n)}
              >
                {n}
              </Button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground">Simulation Paths:</span>
            {PATH_COUNTS.map((n) => (
              <Button
                key={n}
                variant={nPaths === n ? 'default' : 'outline'}
                size="sm"
                onClick={() => setNPaths(n)}
              >
                {n}
              </Button>
            ))}
          </div>

          <div className="mt-4">
            <Button onClick={runSim} size="lg" disabled={isRunning}>
              <Play className="mr-2 h-4 w-4" />
              {isRunning ? 'Running...' : 'Run Monte Carlo'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">BS Premium</p>
                <p className="text-lg font-bold tabular-nums">${fmt(result.premium)}</p>
              </CardContent>
            </Card>
            <Card className={`border ${pnlBg(result.mean)}`}>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Mean P&L</p>
                <p className={`text-lg font-bold tabular-nums ${pnlColor(result.mean)}`}>
                  ${fmt(result.mean)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Std Dev</p>
                <p className="text-lg font-bold tabular-nums">${fmt(result.stdDev)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Min P&L</p>
                <p className={`text-lg font-bold tabular-nums ${pnlColor(result.min)}`}>
                  ${fmt(result.min)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Max P&L</p>
                <p className={`text-lg font-bold tabular-nums ${pnlColor(result.max)}`}>
                  ${fmt(result.max)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Paths</p>
                <p className="text-lg font-bold tabular-nums">{result.pnls.length}</p>
              </CardContent>
            </Card>
          </div>

          {/* Convergence note */}
          <div className="rounded-md border bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold">Hedging insight:</span> When implied vol = realized vol,
              mean hedge P&L should converge to ~0 as paths and hedging frequency increase.
              Current mean P&L deviation from zero:{' '}
              <span className={`font-mono font-bold ${pnlColor(result.mean)}`}>
                ${fmt(result.mean)}
              </span>
              . Distribution width (std dev) decreases with more frequent hedging.
            </p>
          </div>

          {/* Histogram */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                Distribution of Hedge P&L ({result.pnls.length} paths, {nSteps} hedge intervals)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full overflow-x-auto">
                <BarChart
                  width={800}
                  height={350}
                  data={histogramData}
                  margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="x"
                    tick={{ fontSize: 10 }}
                    label={{ value: 'Hedge P&L ($)', position: 'bottom', offset: -5 }}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    label={{ value: 'Frequency', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 12 }}
                    formatter={(value) => [typeof value === 'number' ? value : String(value), 'Count']}
                    labelFormatter={(label) => `P&L: $${typeof label === 'number' ? fmt(label) : String(label)}`}
                  />
                  <ReferenceLine x={0} stroke="#888" strokeWidth={1} />
                  <Bar dataKey="count" name="Frequency">
                    {histogramData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={entry.x >= 0 ? '#22c55e' : '#ef4444'}
                        fillOpacity={0.7}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </div>
            </CardContent>
          </Card>

          {/* Vol edge explanation */}
          {Math.abs(realizedVol - impliedVol) > 0.001 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Volatility Edge</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>
                    Implied vol ({fmt(impliedVol * 100, 1)}%) differs from realized vol ({fmt(realizedVol * 100, 1)}%).
                  </p>
                  {impliedVol > realizedVol ? (
                    <p>
                      You sold the option at <Badge variant="outline">higher</Badge> implied vol than realized.
                      This means you collected more premium than the option was &quot;worth&quot; on average,
                      resulting in a <span className="font-semibold text-green-600">positive edge</span>.
                    </p>
                  ) : (
                    <p>
                      You sold the option at <Badge variant="outline">lower</Badge> implied vol than realized.
                      This means you collected less premium than the option cost to hedge on average,
                      resulting in a <span className="font-semibold text-red-600">negative edge</span>.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

/* ────────── Main Component ────────── */

export function DeltaHedgingSim() {
  return (
    <Tabs defaultValue="single">
      <TabsList>
        <TabsTrigger value="single">Single Path</TabsTrigger>
        <TabsTrigger value="monte-carlo">Monte Carlo</TabsTrigger>
      </TabsList>
      <TabsContent value="single">
        <div className="pt-4">
          <SinglePathMode />
        </div>
      </TabsContent>
      <TabsContent value="monte-carlo">
        <div className="pt-4">
          <MonteCarloMode />
        </div>
      </TabsContent>
    </Tabs>
  );
}
