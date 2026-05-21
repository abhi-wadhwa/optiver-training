'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  ComposedChart,
} from 'recharts';
import { SliderInput } from './SliderInput';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

/** Simple seeded PRNG (Mulberry32) */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randNormal(rng: () => number): number {
  let u = 0,
    v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

interface GARCHSeries {
  returns: number[];
  sigmas: number[];
}

function generateGARCH(
  omega: number,
  alpha: number,
  beta: number,
  n: number,
  seed: number
): GARCHSeries {
  const rng = mulberry32(seed);
  const returns: number[] = [];
  const sigmas: number[] = [];

  // Initialize with long-run variance
  const persistence = alpha + beta;
  let sigma2 =
    persistence < 1 ? omega / (1 - persistence) : omega / (1 - 0.9);

  for (let t = 0; t < n; t++) {
    const sigma = Math.sqrt(sigma2);
    sigmas.push(sigma);
    const z = randNormal(rng);
    const r = sigma * z;
    returns.push(r);

    // Update conditional variance
    sigma2 = omega + alpha * r * r + beta * sigma2;
  }

  return { returns, sigmas };
}

export function GARCHForecaster() {
  const [omega, setOmega] = useState(0.00002);
  const [alpha, setAlpha] = useState(0.1);
  const [beta, setBeta] = useState(0.85);
  const [horizon, setHorizon] = useState(30);
  const [seed, setSeed] = useState(42);

  const persistence = alpha + beta;
  const isStationary = persistence < 1;
  const longRunVar = isStationary ? omega / (1 - persistence) : NaN;
  const longRunVol = isStationary
    ? Math.sqrt(longRunVar * 252) * 100
    : NaN;

  // Generate return series (only changes with seed, omega, alpha, beta)
  const series = useMemo(
    () => generateGARCH(omega, alpha, beta, 200, seed),
    [omega, alpha, beta, seed]
  );

  const regenerate = useCallback(() => setSeed((s) => s + 1), []);

  // Return bar chart data
  const returnData = useMemo(
    () =>
      series.returns.map((r, i) => ({
        t: i + 1,
        return: parseFloat((r * 100).toFixed(3)),
      })),
    [series]
  );

  // Conditional variance chart data
  const varianceData = useMemo(
    () =>
      series.returns.map((r, i) => ({
        t: i + 1,
        sigma2: parseFloat((series.sigmas[i] * series.sigmas[i] * 10000).toFixed(4)),
        r2: parseFloat((r * r * 10000).toFixed(4)),
      })),
    [series]
  );

  // Multi-step forecast
  const forecastData = useMemo(() => {
    const lastSigma2 =
      series.sigmas[series.sigmas.length - 1] ** 2;
    const lastReturn = series.returns[series.returns.length - 1];
    // One-step-ahead forecast
    const sigma2_1 = omega + alpha * lastReturn * lastReturn + beta * lastSigma2;

    const VL = isStationary ? longRunVar : sigma2_1;
    const data: {
      h: number;
      forecast: number;
      upper: number;
      lower: number;
      longRun: number;
    }[] = [];

    for (let h = 1; h <= horizon; h++) {
      const fv =
        VL + Math.pow(persistence, h - 1) * (sigma2_1 - VL);
      const fvAnn = fv * 10000; // in bps^2 for readability
      const volAnn = Math.sqrt(fv) * 100; // in %

      data.push({
        h,
        forecast: parseFloat(volAnn.toFixed(4)),
        upper: parseFloat((volAnn * 2).toFixed(4)),
        lower: parseFloat(Math.max(0, volAnn * 0.5).toFixed(4)),
        longRun: isStationary
          ? parseFloat((Math.sqrt(longRunVar) * 100).toFixed(4))
          : 0,
      });
    }

    return data;
  }, [series, horizon, omega, alpha, beta, persistence, isStationary, longRunVar]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">GARCH(1,1) Parameters</CardTitle>
            <div className="flex items-center gap-2">
              <Badge
                variant={isStationary ? 'secondary' : 'destructive'}
                className="text-xs"
              >
                {isStationary
                  ? `α+β = ${persistence.toFixed(3)} < 1`
                  : `α+β = ${persistence.toFixed(3)} ≥ 1 (non-stationary)`}
              </Badge>
              {isStationary && (
                <Badge variant="secondary" className="text-xs">
                  Long-run vol: {longRunVol.toFixed(1)}% ann.
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <SliderInput
                label={`ω (omega): ${omega.toExponential(1)}`}
                min={0.000001}
                max={0.0001}
                step={0.000001}
                value={omega}
                onChange={setOmega}
                precision={6}
              />
              <SliderInput
                label={`α (alpha) - ARCH coefficient`}
                min={0}
                max={0.3}
                step={0.01}
                value={alpha}
                onChange={setAlpha}
                precision={2}
              />
            </div>
            <div className="space-y-4">
              <SliderInput
                label={`β (beta) - GARCH coefficient`}
                min={0.5}
                max={0.99}
                step={0.01}
                value={beta}
                onChange={setBeta}
                precision={2}
              />
              <SliderInput
                label="Forecast Horizon (days)"
                min={1}
                max={60}
                step={1}
                value={horizon}
                onChange={setHorizon}
                precision={0}
              />
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={regenerate}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Regenerate Series
          </Button>
        </CardContent>
      </Card>

      {/* Returns bar chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Simulated Returns (%)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={returnData}
              margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="t" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ fontSize: 12 }}
                formatter={(value) =>
                  typeof value === 'number'
                    ? `${value.toFixed(3)}%`
                    : String(value)
                }
              />
              <ReferenceLine y={0} stroke="#666" />
              <Bar dataKey="return" name="Return (%)">
                {returnData.map((entry, i) => (
                  <Cell
                    key={`cell-${i}`}
                    fill={entry.return >= 0 ? '#3b82f6' : '#ef4444'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Conditional variance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            Conditional Variance (σ²ₜ x 10,000) vs Squared Returns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart
              data={varianceData}
              margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="t" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ fontSize: 12 }}
                formatter={(value) =>
                  typeof value === 'number' ? value.toFixed(4) : String(value)
                }
              />
              <Legend />
              <Bar
                dataKey="r2"
                fill="#93c5fd"
                opacity={0.4}
                name="r² x 10,000"
              />
              <Line
                type="monotone"
                dataKey="sigma2"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                name="σ²ₜ x 10,000"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Forecast */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            Volatility Forecast (daily σ, %)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={forecastData}
              margin={{ top: 10, right: 20, bottom: 20, left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="h"
                tick={{ fontSize: 11 }}
                label={{
                  value: 'Forecast Horizon (days)',
                  position: 'bottom',
                  offset: -5,
                }}
              />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} />
              <Tooltip
                contentStyle={{ fontSize: 12 }}
                formatter={(value) =>
                  typeof value === 'number'
                    ? `${value.toFixed(4)}%`
                    : String(value)
                }
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="upper"
                stroke="none"
                fill="#3b82f6"
                fillOpacity={0.1}
                name="+2σ Band"
              />
              <Area
                type="monotone"
                dataKey="lower"
                stroke="none"
                fill="#ffffff"
                fillOpacity={1}
                name=""
                legendType="none"
              />
              <Line
                type="monotone"
                dataKey="forecast"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="Forecast σ"
              />
              {isStationary && (
                <Line
                  type="monotone"
                  dataKey="longRun"
                  stroke="#22c55e"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Long-run σ"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
