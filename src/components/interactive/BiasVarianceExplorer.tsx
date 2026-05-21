'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  ScatterChart,
  Scatter,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
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

type TrueFunction = 'sin' | 'x2' | 'step';

function trueFn(x: number, fn: TrueFunction): number {
  switch (fn) {
    case 'sin':
      return Math.sin(x);
    case 'x2':
      return x * x;
    case 'step':
      return x > 0 ? 1 : 0;
  }
}

function xRange(fn: TrueFunction): [number, number] {
  switch (fn) {
    case 'sin':
      return [0, 2 * Math.PI];
    case 'x2':
      return [-2, 2];
    case 'step':
      return [-2, 2];
  }
}

/** Simple seeded PRNG (Mulberry32) for reproducible results */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller transform for normal random numbers */
function randNormal(rng: () => number): number {
  let u = 0,
    v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Solve least-squares via normal equations: (V^T V)^{-1} V^T y
 * V is the Vandermonde matrix for polynomial fitting.
 * Returns polynomial coefficients [c0, c1, ..., cd].
 */
function polyFit(xs: number[], ys: number[], degree: number): number[] {
  const n = xs.length;
  const d = degree + 1;

  // Build Vandermonde matrix V (n x d)
  const V: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    let xp = 1;
    for (let j = 0; j < d; j++) {
      row.push(xp);
      xp *= xs[i];
    }
    V.push(row);
  }

  // Compute A = V^T V (d x d)
  const A: number[][] = Array.from({ length: d }, () => new Array(d).fill(0));
  for (let i = 0; i < d; i++) {
    for (let j = 0; j < d; j++) {
      let s = 0;
      for (let k = 0; k < n; k++) s += V[k][i] * V[k][j];
      A[i][j] = s;
    }
  }

  // Compute b = V^T y (d x 1)
  const b: number[] = new Array(d).fill(0);
  for (let i = 0; i < d; i++) {
    let s = 0;
    for (let k = 0; k < n; k++) s += V[k][i] * ys[k];
    b[i] = s;
  }

  // Solve A * coeffs = b via Gaussian elimination with partial pivoting
  // Augment A with b
  const aug: number[][] = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < d; col++) {
    // Partial pivot
    let maxRow = col;
    let maxVal = Math.abs(aug[col][col]);
    for (let row = col + 1; row < d; row++) {
      if (Math.abs(aug[row][col]) > maxVal) {
        maxVal = Math.abs(aug[row][col]);
        maxRow = row;
      }
    }
    if (maxRow !== col) {
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    }

    const pivot = aug[col][col];
    if (Math.abs(pivot) < 1e-14) continue;

    for (let row = col + 1; row < d; row++) {
      const factor = aug[row][col] / pivot;
      for (let j = col; j <= d; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  // Back substitution
  const coeffs = new Array(d).fill(0);
  for (let i = d - 1; i >= 0; i--) {
    let s = aug[i][d];
    for (let j = i + 1; j < d; j++) {
      s -= aug[i][j] * coeffs[j];
    }
    coeffs[i] = Math.abs(aug[i][i]) > 1e-14 ? s / aug[i][i] : 0;
  }

  return coeffs;
}

function polyEval(coeffs: number[], x: number): number {
  let result = 0;
  let xp = 1;
  for (const c of coeffs) {
    result += c * xp;
    xp *= x;
  }
  return result;
}

export function BiasVarianceExplorer() {
  const [degree, setDegree] = useState(3);
  const [noise, setNoise] = useState(0.5);
  const [sampleSize, setSampleSize] = useState(50);
  const [trueFnType, setTrueFnType] = useState<TrueFunction>('sin');
  const [seed, setSeed] = useState(42);

  const regenerate = useCallback(() => {
    setSeed((s) => s + 1);
  }, []);

  const [xMin, xMax] = xRange(trueFnType);

  // Generate training data
  const { trainData, testXs } = useMemo(() => {
    const rng = mulberry32(seed);
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i < sampleSize; i++) {
      const x = xMin + rng() * (xMax - xMin);
      const y = trueFn(x, trueFnType) + noise * randNormal(rng);
      xs.push(x);
      ys.push(y);
    }

    const testPoints: number[] = [];
    for (let i = 0; i < 100; i++) {
      testPoints.push(xMin + (i / 99) * (xMax - xMin));
    }

    return {
      trainData: { xs, ys },
      testXs: testPoints,
    };
  }, [seed, sampleSize, noise, trueFnType, xMin, xMax]);

  // Fit polynomial of current degree to training data
  const { scatterData, trueCurve, fittedCurve } = useMemo(() => {
    const coeffs = polyFit(trainData.xs, trainData.ys, degree);

    const scatter = trainData.xs.map((x, i) => ({
      x: parseFloat(x.toFixed(3)),
      y: parseFloat(trainData.ys[i].toFixed(3)),
    }));

    const trueC = testXs.map((x) => ({
      x: parseFloat(x.toFixed(3)),
      true_y: parseFloat(trueFn(x, trueFnType).toFixed(4)),
      fit_y: parseFloat(
        Math.max(-10, Math.min(10, polyEval(coeffs, x))).toFixed(4)
      ),
    }));

    return {
      scatterData: scatter,
      trueCurve: trueC,
      fittedCurve: trueC,
    };
  }, [trainData, degree, testXs, trueFnType]);

  // Bias-variance decomposition across degrees 1..15
  const bvData = useMemo(() => {
    const numBootstraps = 50;
    const numTest = 30;
    const testPoints: number[] = [];
    for (let i = 0; i < numTest; i++) {
      testPoints.push(xMin + (i / (numTest - 1)) * (xMax - xMin));
    }
    const trueVals = testPoints.map((x) => trueFn(x, trueFnType));

    const results: {
      degree: number;
      bias2: number;
      variance: number;
      mse: number;
    }[] = [];

    for (let d = 1; d <= 15; d++) {
      // predictions[bootstrap][testPoint]
      const predictions: number[][] = [];

      for (let b = 0; b < numBootstraps; b++) {
        const rng = mulberry32(seed * 1000 + b * 137 + d * 7);
        const bxs: number[] = [];
        const bys: number[] = [];
        for (let i = 0; i < sampleSize; i++) {
          const x = xMin + rng() * (xMax - xMin);
          const y = trueFn(x, trueFnType) + noise * randNormal(rng);
          bxs.push(x);
          bys.push(y);
        }
        const coeffs = polyFit(bxs, bys, d);
        predictions.push(
          testPoints.map((x) =>
            Math.max(-10, Math.min(10, polyEval(coeffs, x)))
          )
        );
      }

      // For each test point, compute mean prediction and variance
      let totalBias2 = 0;
      let totalVar = 0;
      for (let t = 0; t < numTest; t++) {
        let sumPred = 0;
        let sumPred2 = 0;
        for (let b = 0; b < numBootstraps; b++) {
          sumPred += predictions[b][t];
          sumPred2 += predictions[b][t] * predictions[b][t];
        }
        const meanPred = sumPred / numBootstraps;
        const varPred = sumPred2 / numBootstraps - meanPred * meanPred;
        const bias = meanPred - trueVals[t];
        totalBias2 += bias * bias;
        totalVar += varPred;
      }

      const avgBias2 = totalBias2 / numTest;
      const avgVar = totalVar / numTest;
      const irreducible = noise * noise;

      results.push({
        degree: d,
        bias2: parseFloat(avgBias2.toFixed(4)),
        variance: parseFloat(avgVar.toFixed(4)),
        mse: parseFloat((avgBias2 + avgVar + irreducible).toFixed(4)),
      });
    }

    return results;
  }, [seed, sampleSize, noise, trueFnType, xMin, xMax]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <SliderInput
                label="Polynomial Degree"
                min={1}
                max={15}
                step={1}
                value={degree}
                onChange={setDegree}
                precision={0}
              />
              <SliderInput
                label="Noise Level"
                min={0}
                max={2}
                step={0.1}
                value={noise}
                onChange={setNoise}
                precision={1}
              />
            </div>
            <div className="space-y-4">
              <SliderInput
                label="Sample Size"
                min={20}
                max={200}
                step={10}
                value={sampleSize}
                onChange={setSampleSize}
                precision={0}
              />
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground">
                  True Function
                </span>
                <div className="flex gap-2">
                  {(['sin', 'x2', 'step'] as const).map((fn) => (
                    <Button
                      key={fn}
                      variant={trueFnType === fn ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTrueFnType(fn)}
                    >
                      {fn === 'sin' ? 'sin(x)' : fn === 'x2' ? 'x²' : 'step'}
                    </Button>
                  ))}
                  <Button variant="outline" size="sm" onClick={regenerate}>
                    Regenerate
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Left: Scatter + fit */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Training Data &amp; Polynomial Fit (degree {degree})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  type="number"
                  dataKey="x"
                  domain={[xMin, xMax]}
                  tick={{ fontSize: 11 }}
                  label={{
                    value: 'x',
                    position: 'bottom',
                    offset: -5,
                  }}
                />
                <YAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  formatter={(value) =>
                    typeof value === 'number' ? value.toFixed(3) : String(value)
                  }
                />
                <Scatter
                  name="Training Data"
                  data={scatterData}
                  fill="#3b82f6"
                  opacity={0.6}
                  r={3}
                />
                <Scatter
                  name="True Function"
                  data={trueCurve.map((p) => ({ x: p.x, y: p.true_y }))}
                  fill="#22c55e"
                  line={{ stroke: '#22c55e', strokeDasharray: '5 5', strokeWidth: 2 }}
                  shape={() => <></>}
                  legendType="line"
                />
                <Scatter
                  name="Fitted Curve"
                  data={fittedCurve.map((p) => ({ x: p.x, y: p.fit_y }))}
                  fill="#ef4444"
                  line={{ stroke: '#ef4444', strokeWidth: 2 }}
                  shape={() => <></>}
                  legendType="line"
                />
                <Legend />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Right: Bias-variance decomposition */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Bias-Variance Decomposition
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={bvData}
                margin={{ top: 10, right: 20, bottom: 20, left: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="degree"
                  tick={{ fontSize: 11 }}
                  label={{
                    value: 'Polynomial Degree',
                    position: 'bottom',
                    offset: -5,
                  }}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  domain={[0, 'auto']}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  formatter={(value) =>
                    typeof value === 'number' ? value.toFixed(4) : String(value)
                  }
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="bias2"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Bias²"
                />
                <Line
                  type="monotone"
                  dataKey="variance"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Variance"
                />
                <Line
                  type="monotone"
                  dataKey="mse"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Total MSE"
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-2 flex gap-2">
              <Badge variant="secondary" className="text-xs">
                Current degree: {degree}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Noise²: {(noise * noise).toFixed(2)}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
