'use client';

import { useState, useMemo } from 'react';
import { SliderInput } from './SliderInput';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/** Simple seeded PRNG */
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

/**
 * Compute eigenvalues of a symmetric matrix using Jacobi iteration.
 * Returns sorted eigenvalues (descending).
 */
function eigenvaluesSymmetric(A: number[][]): number[] {
  const n = A.length;
  const S: number[][] = A.map((row) => [...row]);
  const maxIter = 100;

  for (let iter = 0; iter < maxIter; iter++) {
    let maxVal = 0;
    let p = 0,
      q = 1;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(S[i][j]) > maxVal) {
          maxVal = Math.abs(S[i][j]);
          p = i;
          q = j;
        }
      }
    }
    if (maxVal < 1e-10) break;

    const theta =
      Math.abs(S[p][p] - S[q][q]) < 1e-14
        ? Math.PI / 4
        : 0.5 * Math.atan2(2 * S[p][q], S[p][p] - S[q][q]);
    const c = Math.cos(theta);
    const s = Math.sin(theta);

    const newPP = c * c * S[p][p] + 2 * s * c * S[p][q] + s * s * S[q][q];
    const newQQ = s * s * S[p][p] - 2 * s * c * S[p][q] + c * c * S[q][q];

    S[p][p] = newPP;
    S[q][q] = newQQ;
    S[p][q] = 0;
    S[q][p] = 0;

    for (let i = 0; i < n; i++) {
      if (i !== p && i !== q) {
        const sip = c * S[i][p] + s * S[i][q];
        const siq = -s * S[i][p] + c * S[i][q];
        S[i][p] = sip;
        S[p][i] = sip;
        S[i][q] = siq;
        S[q][i] = siq;
      }
    }
  }

  const evals = Array.from({ length: n }, (_, i) => S[i][i]);
  evals.sort((a, b) => b - a);
  return evals;
}

/**
 * Interpolate a value to a color on the blue-white-red scale.
 */
function covColor(value: number, maxAbsVal: number): string {
  if (maxAbsVal === 0) return 'rgb(255,255,255)';
  const t = Math.max(-1, Math.min(1, value / maxAbsVal));
  if (t >= 0) {
    // White to red
    const r = 255;
    const g = Math.round(255 * (1 - t));
    const b = Math.round(255 * (1 - t));
    return `rgb(${r},${g},${b})`;
  } else {
    // White to blue
    const at = -t;
    const r = Math.round(255 * (1 - at));
    const g = Math.round(255 * (1 - at));
    const b = 255;
    return `rgb(${r},${g},${b})`;
  }
}

function CovarianceHeatmap({
  matrix,
  title,
  size,
}: {
  matrix: number[][];
  title: string;
  size: number;
}) {
  // Find max absolute value for color scaling
  let maxAbsVal = 0;
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      maxAbsVal = Math.max(maxAbsVal, Math.abs(matrix[i][j]));
    }
  }

  const cellSize = Math.max(8, Math.min(24, Math.floor(320 / size)));

  return (
    <div>
      <p className="mb-2 text-sm font-medium">{title}</p>
      <div
        className="inline-block border border-border"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${size}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${size}, ${cellSize}px)`,
          gap: 0,
        }}
      >
        {Array.from({ length: size * size }, (_, idx) => {
          const i = Math.floor(idx / size);
          const j = idx % size;
          return (
            <div
              key={idx}
              title={`[${i},${j}]: ${matrix[i][j].toFixed(4)}`}
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor: covColor(matrix[i][j], maxAbsVal),
                borderRight:
                  j < size - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                borderBottom:
                  i < size - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
              }}
            />
          );
        })}
      </div>
      {/* Color legend */}
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <div
          className="h-3 w-6 border"
          style={{ backgroundColor: 'rgb(100,100,255)' }}
        />
        <span>-{maxAbsVal.toFixed(3)}</span>
        <div
          className="h-3 w-6 border"
          style={{ backgroundColor: 'rgb(255,255,255)' }}
        />
        <span>0</span>
        <div
          className="h-3 w-6 border"
          style={{ backgroundColor: 'rgb(255,100,100)' }}
        />
        <span>+{maxAbsVal.toFixed(3)}</span>
      </div>
    </div>
  );
}

export function LedoitWolfShrinkage() {
  const [numAssets, setNumAssets] = useState(10);
  const [numObs, setNumObs] = useState(50);
  const [manualDelta, setManualDelta] = useState(0.5);

  const {
    sampleCov,
    shrunkCov,
    optimalDelta,
    condSample,
    condShrunk,
    muTarget,
  } = useMemo(() => {
    const p = numAssets;
    const n = numObs;
    const rng = mulberry32(77);

    // Generate correlated returns: X = Z * L where L is a lower-triangular
    // factor creating some correlation structure
    const L: number[][] = Array.from({ length: p }, () =>
      new Array(p).fill(0)
    );
    for (let i = 0; i < p; i++) {
      for (let j = 0; j <= i; j++) {
        if (i === j) {
          L[i][j] = 0.02 + rng() * 0.03; // diagonal: asset vol
        } else {
          L[i][j] = (rng() - 0.5) * 0.01; // off-diagonal: correlation factor
        }
      }
    }

    // Generate data matrix X (n x p)
    const X: number[][] = [];
    for (let t = 0; t < n; t++) {
      const z: number[] = [];
      for (let j = 0; j < p; j++) z.push(randNormal(rng));
      const row: number[] = new Array(p).fill(0);
      for (let i = 0; i < p; i++) {
        for (let j = 0; j <= i; j++) {
          row[i] += L[i][j] * z[j];
        }
      }
      X.push(row);
    }

    // Center the data
    const mean: number[] = new Array(p).fill(0);
    for (let t = 0; t < n; t++) {
      for (let j = 0; j < p; j++) mean[j] += X[t][j];
    }
    for (let j = 0; j < p; j++) mean[j] /= n;

    const Xc = X.map((row) => row.map((v, j) => v - mean[j]));

    // Sample covariance: S = (1/(n-1)) * Xc' * Xc
    const S: number[][] = Array.from({ length: p }, () =>
      new Array(p).fill(0)
    );
    for (let i = 0; i < p; i++) {
      for (let j = 0; j < p; j++) {
        let s = 0;
        for (let t = 0; t < n; t++) {
          s += Xc[t][i] * Xc[t][j];
        }
        S[i][j] = s / (n - 1);
      }
    }

    // Ledoit-Wolf shrinkage target: mu * I
    let traceS = 0;
    for (let i = 0; i < p; i++) traceS += S[i][i];
    const mu = traceS / p;

    // Compute optimal shrinkage intensity (Ledoit-Wolf formula)
    // delta* = min(1, (sum of squared distances to target) / ...)
    // Simplified: use Oracle Approximating Shrinkage (OAS) estimator
    let sumS2 = 0; // sum of S_ij^2
    let traceS2 = 0; // trace(S^2) = sum of S_ij^2
    for (let i = 0; i < p; i++) {
      for (let j = 0; j < p; j++) {
        sumS2 += S[i][j] * S[i][j];
      }
    }
    traceS2 = sumS2;

    // Ledoit-Wolf (2004) formula for identity target
    // rho_hat = min(1, ((n-2)/n * trace(S^2) + trace(S)^2) /
    //              ((n+2) * (trace(S^2) - trace(S)^2/p)))
    const numerator =
      ((n - 2) / n) * traceS2 + traceS * traceS;
    const denominator =
      (n + 2) * (traceS2 - (traceS * traceS) / p);
    const optDelta =
      denominator > 1e-14
        ? Math.max(0, Math.min(1, numerator / denominator))
        : 1;

    // Use manual delta for the shrunk covariance
    const delta = manualDelta;
    const shrunk: number[][] = Array.from({ length: p }, (_, i) =>
      Array.from({ length: p }, (_, j) => {
        const target = i === j ? mu : 0;
        return (1 - delta) * S[i][j] + delta * target;
      })
    );

    // Condition numbers
    const evalsSample = eigenvaluesSymmetric(S);
    const evalsShrunk = eigenvaluesSymmetric(shrunk);

    const condS =
      Math.abs(evalsSample[evalsSample.length - 1]) > 1e-14
        ? Math.abs(evalsSample[0]) /
          Math.abs(evalsSample[evalsSample.length - 1])
        : Infinity;

    const condSh =
      Math.abs(evalsShrunk[evalsShrunk.length - 1]) > 1e-14
        ? Math.abs(evalsShrunk[0]) /
          Math.abs(evalsShrunk[evalsShrunk.length - 1])
        : Infinity;

    return {
      sampleCov: S,
      shrunkCov: shrunk,
      optimalDelta: optDelta,
      condSample: condS,
      condShrunk: condSh,
      muTarget: mu,
    };
  }, [numAssets, numObs, manualDelta]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Shrinkage Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <SliderInput
              label="Number of Assets (p)"
              min={5}
              max={30}
              step={1}
              value={numAssets}
              onChange={setNumAssets}
              precision={0}
            />
            <SliderInput
              label="Number of Observations (n)"
              min={20}
              max={500}
              step={10}
              value={numObs}
              onChange={setNumObs}
              precision={0}
            />
            <div>
              <SliderInput
                label={`Shrinkage Intensity (δ)`}
                min={0}
                max={1}
                step={0.01}
                value={manualDelta}
                onChange={setManualDelta}
                precision={2}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Optimal (Ledoit-Wolf):{' '}
                <span className="font-mono font-semibold text-blue-600">
                  {optimalDelta.toFixed(3)}
                </span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Heatmaps */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Sample Covariance</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <CovarianceHeatmap
              matrix={sampleCov}
              title={`S (${numAssets}×${numAssets})`}
              size={numAssets}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Shrunk Covariance (δ = {manualDelta.toFixed(2)})
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <CovarianceHeatmap
              matrix={shrunkCov}
              title={`(1-δ)S + δ·μ·I`}
              size={numAssets}
            />
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Condition # (Sample)
              </p>
              <p className="font-mono text-sm font-semibold text-red-600">
                {condSample === Infinity
                  ? '∞ (singular)'
                  : condSample.toFixed(1)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Condition # (Shrunk)
              </p>
              <p className="font-mono text-sm font-semibold text-green-600">
                {condShrunk === Infinity
                  ? '∞ (singular)'
                  : condShrunk.toFixed(1)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Optimal δ (LW)
              </p>
              <p className="font-mono text-sm font-semibold">
                {optimalDelta.toFixed(4)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Target μ (avg variance)
              </p>
              <p className="font-mono text-sm font-semibold">
                {muTarget.toExponential(3)}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-xs">
              p/n ratio: {(numAssets / numObs).toFixed(2)}
            </Badge>
            <Badge
              variant={numAssets > numObs ? 'destructive' : 'secondary'}
              className="text-xs"
            >
              {numAssets > numObs
                ? 'p > n: Sample covariance is singular!'
                : 'p < n: Sample covariance is invertible'}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Condition improvement:{' '}
              {condSample !== Infinity && condShrunk !== Infinity
                ? `${(condSample / condShrunk).toFixed(1)}×`
                : 'N/A'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
