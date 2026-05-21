'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { SliderInput } from './SliderInput';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

type ViewMode = 'full' | 'pc1' | 'pc2' | 'pc3' | 'residual';

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
 * Compute eigenvalues/eigenvectors of a symmetric matrix
 * using Jacobi eigenvalue algorithm.
 */
function jacobiEigen(
  A: number[][],
  maxIter = 100
): { eigenvalues: number[]; eigenvectors: number[][] } {
  const n = A.length;
  // Copy A
  const S: number[][] = A.map((row) => [...row]);
  // Initialize V as identity
  const V: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  );

  for (let iter = 0; iter < maxIter; iter++) {
    // Find largest off-diagonal element
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

    // Compute rotation
    const theta =
      Math.abs(S[p][p] - S[q][q]) < 1e-14
        ? Math.PI / 4
        : 0.5 * Math.atan2(2 * S[p][q], S[p][p] - S[q][q]);
    const c = Math.cos(theta);
    const s = Math.sin(theta);

    // Apply rotation to S
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

    // Update eigenvectors
    for (let i = 0; i < n; i++) {
      const vip = c * V[i][p] + s * V[i][q];
      const viq = -s * V[i][p] + c * V[i][q];
      V[i][p] = vip;
      V[i][q] = viq;
    }
  }

  // Extract eigenvalues and sort descending
  const eigenvalues = Array.from({ length: n }, (_, i) => S[i][i]);
  const indices = eigenvalues
    .map((v, i) => ({ v, i }))
    .sort((a, b) => b.v - a.v)
    .map((x) => x.i);

  const sortedEvals = indices.map((i) => eigenvalues[i]);
  const sortedEvecs = indices.map((idx) =>
    Array.from({ length: n }, (_, i) => V[i][idx])
  );

  return { eigenvalues: sortedEvals, eigenvectors: sortedEvecs };
}

export function PCAVolDecomposition() {
  const [viewMode, setViewMode] = useState<ViewMode>('full');
  const [shockPC1, setShockPC1] = useState(0);
  const [shockPC2, setShockPC2] = useState(0);
  const [shockPC3, setShockPC3] = useState(0);
  const [atmVol, setAtmVol] = useState(25);
  const [skew, setSkew] = useState(-0.15);

  // Grid definitions
  const strikes = useMemo(() => {
    const s: number[] = [];
    for (let k = 80; k <= 120; k += 2) s.push(k);
    return s;
  }, []);

  const expiries = useMemo(() => {
    const e: number[] = [];
    for (let t = 0.1; t <= 2.0; t += 0.1) e.push(parseFloat(t.toFixed(1)));
    return e;
  }, []);

  const nStrikes = strikes.length;
  const nExpiries = expiries.length;
  const dim = nStrikes * nExpiries;

  // Generate synthetic snapshots and run PCA
  const pcaResult = useMemo(() => {
    const rng = mulberry32(123);
    const numSnapshots = 50;

    // Base surface generator
    function baseSurface(
      levelShift: number,
      slopeShift: number,
      curvShift: number
    ): number[] {
      const vec: number[] = [];
      for (let j = 0; j < nExpiries; j++) {
        for (let i = 0; i < nStrikes; i++) {
          const moneyness = (strikes[i] - 100) / 100;
          const vol =
            (atmVol + levelShift) / 100 +
            (skew + slopeShift * 0.1) * moneyness +
            (0.3 + curvShift * 0.05) * moneyness * moneyness +
            0.02 * Math.sqrt(expiries[j]);
          vec.push(Math.max(0.01, vol));
        }
      }
      return vec;
    }

    // Generate snapshots
    const data: number[][] = [];
    for (let s = 0; s < numSnapshots; s++) {
      const level = randNormal(rng) * 3;
      const slope = randNormal(rng) * 1;
      const curv = randNormal(rng) * 0.5;
      data.push(baseSurface(level, slope, curv));
    }

    // Center the data
    const mean = new Array(dim).fill(0);
    for (let j = 0; j < dim; j++) {
      for (let s = 0; s < numSnapshots; s++) {
        mean[j] += data[s][j];
      }
      mean[j] /= numSnapshots;
    }

    const centered = data.map((row) => row.map((v, j) => v - mean[j]));

    // Compute covariance matrix (dim x dim) -- but dim can be large.
    // Use the "trick": if numSnapshots < dim, compute the snapshot covariance (numSnapshots x numSnapshots)
    // and recover PCs.
    const M = numSnapshots;

    // Gram matrix: G[i][j] = sum_k centered[i][k] * centered[j][k] / (M-1)
    const G: number[][] = Array.from({ length: M }, () =>
      new Array(M).fill(0)
    );
    for (let i = 0; i < M; i++) {
      for (let j = i; j < M; j++) {
        let s = 0;
        for (let k = 0; k < dim; k++) {
          s += centered[i][k] * centered[j][k];
        }
        s /= M - 1;
        G[i][j] = s;
        G[j][i] = s;
      }
    }

    const { eigenvalues, eigenvectors } = jacobiEigen(G, 200);

    // Recover PC loading vectors in original space
    // PC_k = sum_i eigenvectors[k][i] * centered[i] / sqrt(eigenvalue[k] * (M-1))
    const pcs: number[][] = [];
    const numPCs = Math.min(5, M);
    for (let k = 0; k < numPCs; k++) {
      const ev = eigenvalues[k];
      if (ev < 1e-10) {
        pcs.push(new Array(dim).fill(0));
        continue;
      }
      const scale = 1 / Math.sqrt(ev * (M - 1));
      const pc = new Array(dim).fill(0);
      for (let i = 0; i < M; i++) {
        const coeff = eigenvectors[k][i] * scale;
        for (let j = 0; j < dim; j++) {
          pc[j] += coeff * centered[i][j];
        }
      }
      pcs.push(pc);
    }

    // Compute standard deviations for each PC (sqrt of eigenvalue)
    const pcStds = eigenvalues.slice(0, numPCs).map((ev) => Math.sqrt(Math.max(0, ev)));

    // Total variance
    const totalVar = eigenvalues.reduce((a, b) => a + Math.max(0, b), 0);
    const explainedPct = eigenvalues
      .slice(0, numPCs)
      .map((ev) => (totalVar > 0 ? (Math.max(0, ev) / totalVar) * 100 : 0));

    return { mean, pcs, pcStds, explainedPct, eigenvalues: eigenvalues.slice(0, numPCs) };
  }, [atmVol, skew, strikes, expiries, nStrikes, nExpiries, dim]);

  // Build the surface to display
  const surfaceData = useMemo(() => {
    const { mean, pcs, pcStds } = pcaResult;

    // Reconstruct with shocks
    const vec = new Array(dim).fill(0);

    if (viewMode === 'full') {
      // Full reconstruction = mean + shock contributions
      for (let j = 0; j < dim; j++) {
        vec[j] = mean[j];
        if (pcs[0]) vec[j] += shockPC1 * pcStds[0] * pcs[0][j];
        if (pcs[1]) vec[j] += shockPC2 * pcStds[1] * pcs[1][j];
        if (pcs[2]) vec[j] += shockPC3 * pcStds[2] * pcs[2][j];
      }
    } else if (viewMode === 'pc1' && pcs[0]) {
      for (let j = 0; j < dim; j++) vec[j] = pcs[0][j];
    } else if (viewMode === 'pc2' && pcs[1]) {
      for (let j = 0; j < dim; j++) vec[j] = pcs[1][j];
    } else if (viewMode === 'pc3' && pcs[2]) {
      for (let j = 0; j < dim; j++) vec[j] = pcs[2][j];
    } else if (viewMode === 'residual') {
      // Mean + reconstruction from first 3 PCs subtracted
      for (let j = 0; j < dim; j++) {
        let recon = mean[j];
        // No shocks, just mean - 3PC reconstruction shows residual
        // Actually show the residual noise from a typical snapshot
        vec[j] = 0; // Residual is typically tiny
        for (let k = 3; k < pcs.length; k++) {
          vec[j] += pcStds[k] * pcs[k][j] * 0.5; // half-sigma shock to show pattern
        }
      }
    }

    // Reshape into 2D grid for Plotly [expiry][strike]
    const surface: number[][] = [];
    for (let j = 0; j < nExpiries; j++) {
      const row: number[] = [];
      for (let i = 0; i < nStrikes; i++) {
        row.push(vec[j * nStrikes + i]);
      }
      surface.push(row);
    }

    return surface;
  }, [pcaResult, viewMode, shockPC1, shockPC2, shockPC3, dim, nStrikes, nExpiries]);

  // Scree plot data
  const screeData = useMemo(
    () =>
      pcaResult.explainedPct.map((pct, i) => ({
        pc: `PC${i + 1}`,
        explained: parseFloat(pct.toFixed(1)),
      })),
    [pcaResult]
  );

  const viewLabels: Record<ViewMode, string> = {
    full: 'Full Surface',
    pc1: 'PC1 (Level)',
    pc2: 'PC2 (Slope)',
    pc3: 'PC3 (Curvature)',
    residual: 'Residual',
  };

  const zLabel =
    viewMode === 'full' ? 'Implied Vol' : viewLabels[viewMode] + ' Loading';

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">PCA Vol Surface Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(
              ['full', 'pc1', 'pc2', 'pc3', 'residual'] as const
            ).map((mode) => (
              <Button
                key={mode}
                variant={viewMode === mode ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode(mode)}
              >
                {viewLabels[mode]}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <SliderInput
                label={`PC1 Shock (×σ): Level shift`}
                min={-2}
                max={2}
                step={0.1}
                value={shockPC1}
                onChange={setShockPC1}
                precision={1}
              />
              <SliderInput
                label={`PC2 Shock (×σ): Slope shift`}
                min={-2}
                max={2}
                step={0.1}
                value={shockPC2}
                onChange={setShockPC2}
                precision={1}
              />
              <SliderInput
                label={`PC3 Shock (×σ): Curvature shift`}
                min={-2}
                max={2}
                step={0.1}
                value={shockPC3}
                onChange={setShockPC3}
                precision={1}
              />
            </div>
            <div className="space-y-3">
              <SliderInput
                label="ATM Vol (%)"
                min={15}
                max={40}
                step={0.5}
                value={atmVol}
                onChange={setAtmVol}
                precision={1}
              />
              <SliderInput
                label="Skew"
                min={-0.5}
                max={0.5}
                step={0.01}
                value={skew}
                onChange={setSkew}
                precision={2}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 3D Surface */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{viewLabels[viewMode]}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full overflow-x-auto">
              <Plot
                data={[
                  {
                    z: surfaceData,
                    x: strikes,
                    y: expiries,
                    type: 'surface',
                    colorscale: viewMode === 'full' ? 'RdYlGn' : 'RdBu',
                    reversescale: viewMode === 'full',
                    hovertemplate:
                      'Strike: %{x}<br>Expiry: %{y:.1f}y<br>' +
                      zLabel +
                      ': %{z:.4f}<extra></extra>',
                    colorbar: {
                      title: { text: zLabel, side: 'right' } as object,
                      thickness: 15,
                    },
                  },
                ]}
                layout={{
                  autosize: true,
                  height: 500,
                  margin: { l: 0, r: 0, t: 30, b: 0 },
                  scene: {
                    xaxis: { title: { text: 'Strike' } },
                    yaxis: { title: { text: 'Expiry (years)' } },
                    zaxis: { title: { text: zLabel } },
                    camera: {
                      eye: { x: 1.5, y: -1.8, z: 0.8 },
                    },
                  },
                  paper_bgcolor: 'rgba(0,0,0,0)',
                  plot_bgcolor: 'rgba(0,0,0,0)',
                }}
                config={{
                  responsive: true,
                  displayModeBar: true,
                  displaylogo: false,
                }}
                useResizeHandler
                style={{ width: '100%', height: '500px' }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Scree plot */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Explained Variance (%)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={screeData}
                margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="pc" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  domain={[0, 100]}
                  label={{
                    value: '%',
                    angle: -90,
                    position: 'insideLeft',
                  }}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  formatter={(value) =>
                    typeof value === 'number'
                      ? `${value.toFixed(1)}%`
                      : String(value)
                  }
                />
                <Bar dataKey="explained" fill="#3b82f6" name="Explained %" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-2 space-y-1">
              {screeData.map((d) => (
                <div
                  key={d.pc}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-muted-foreground">{d.pc}</span>
                  <Badge variant="secondary">{d.explained.toFixed(1)}%</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
