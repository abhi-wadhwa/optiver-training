'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { SliderInput } from './SliderInput';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

type ViewMode = '3d' | 'smile' | 'term';

/**
 * Parametric implied volatility surface model.
 * σ(K,T) = σ_ATM + skew * ln(K/S) + smile * ln(K/S)² + termSlope * (T - 1)
 */
function computeIV(
  K: number,
  T: number,
  S: number,
  atmVol: number,
  skew: number,
  smile: number,
  termSlope: number,
): number {
  const logMoneyness = Math.log(K / S);
  return Math.max(
    0.001,
    atmVol + skew * logMoneyness + smile * logMoneyness * logMoneyness + termSlope * (T - 1),
  );
}

function generateSurface(
  S: number,
  atmVol: number,
  skew: number,
  smile: number,
  termSlope: number,
) {
  const numStrikes = 50;
  const numExpiries = 40;

  const kMin = 0.7 * S;
  const kMax = 1.3 * S;
  const tMin = 0.05;
  const tMax = 2.0;

  const strikes: number[] = [];
  const expiries: number[] = [];
  const ivSurface: number[][] = [];

  for (let i = 0; i < numStrikes; i++) {
    strikes.push(kMin + (i / (numStrikes - 1)) * (kMax - kMin));
  }

  for (let j = 0; j < numExpiries; j++) {
    expiries.push(tMin + (j / (numExpiries - 1)) * (tMax - tMin));
  }

  for (let j = 0; j < numExpiries; j++) {
    const row: number[] = [];
    for (let i = 0; i < numStrikes; i++) {
      row.push(computeIV(strikes[i], expiries[j], S, atmVol, skew, smile, termSlope));
    }
    ivSurface.push(row);
  }

  return { strikes, expiries, ivSurface };
}

export function VolSurfaceViewer() {
  const [atmVol, setAtmVol] = useState(0.2);
  const [skew, setSkew] = useState(-0.1);
  const [smile, setSmile] = useState(0.05);
  const [termSlope, setTermSlope] = useState(-0.02);
  const [spot, setSpot] = useState(100);

  const [viewMode, setViewMode] = useState<ViewMode>('3d');
  const [sliceT, setSliceT] = useState(0.5);
  const [sliceK, setSliceK] = useState(100);

  const surface = useMemo(
    () => generateSurface(spot, atmVol, skew, smile, termSlope),
    [spot, atmVol, skew, smile, termSlope],
  );

  const smileData = useMemo(() => {
    return surface.strikes.map((K) => ({
      strike: parseFloat(K.toFixed(1)),
      iv: parseFloat(
        computeIV(K, sliceT, spot, atmVol, skew, smile, termSlope).toFixed(4),
      ),
    }));
  }, [surface.strikes, sliceT, spot, atmVol, skew, smile, termSlope]);

  const termData = useMemo(() => {
    return surface.expiries.map((T) => ({
      expiry: parseFloat(T.toFixed(3)),
      iv: parseFloat(
        computeIV(sliceK, T, spot, atmVol, skew, smile, termSlope).toFixed(4),
      ),
    }));
  }, [surface.expiries, sliceK, spot, atmVol, skew, smile, termSlope]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Model parameters */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Model Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <SliderInput
              label="ATM Volatility (σ_ATM)"
              min={0.05}
              max={1.0}
              step={0.01}
              value={atmVol}
              onChange={setAtmVol}
              precision={2}
            />
            <SliderInput
              label="Skew Coefficient"
              min={-0.5}
              max={0.5}
              step={0.01}
              value={skew}
              onChange={setSkew}
              precision={2}
            />
            <SliderInput
              label="Smile Curvature"
              min={0}
              max={0.5}
              step={0.005}
              value={smile}
              onChange={setSmile}
              precision={3}
            />
            <SliderInput
              label="Term Structure Slope"
              min={-0.1}
              max={0.1}
              step={0.005}
              value={termSlope}
              onChange={setTermSlope}
              precision={3}
            />
            <SliderInput
              label="Spot Price (S)"
              min={10}
              max={500}
              step={1}
              value={spot}
              onChange={setSpot}
              precision={0}
            />
          </CardContent>
        </Card>

        {/* View mode & slice controls */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">View Mode</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={viewMode === '3d' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('3d')}
              >
                3D Surface
              </Button>
              <Button
                variant={viewMode === 'smile' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('smile')}
              >
                Smile Slice
              </Button>
              <Button
                variant={viewMode === 'term' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('term')}
              >
                Term Structure
              </Button>
            </div>

            {viewMode === 'smile' && (
              <div className="pt-2">
                <Label className="text-xs text-muted-foreground">
                  Fixed Time to Expiry (T)
                </Label>
                <SliderInput
                  label={`T = ${sliceT.toFixed(2)} years`}
                  min={0.05}
                  max={2.0}
                  step={0.01}
                  value={sliceT}
                  onChange={setSliceT}
                  precision={2}
                />
              </div>
            )}

            {viewMode === 'term' && (
              <div className="pt-2">
                <Label className="text-xs text-muted-foreground">
                  Fixed Strike Price (K)
                </Label>
                <SliderInput
                  label={`K = ${sliceK.toFixed(1)}`}
                  min={Math.round(0.7 * spot)}
                  max={Math.round(1.3 * spot)}
                  step={1}
                  value={sliceK}
                  onChange={setSliceK}
                  precision={0}
                />
              </div>
            )}

            {viewMode === '3d' && (
              <div className="pt-2 text-xs text-muted-foreground">
                <p>Click and drag to rotate the 3D surface.</p>
                <p>Scroll to zoom. Hover for values.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chart area */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            {viewMode === '3d' && 'Implied Volatility Surface'}
            {viewMode === 'smile' && `Volatility Smile at T = ${sliceT.toFixed(2)}`}
            {viewMode === 'term' && `Term Structure at K = ${sliceK.toFixed(1)}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {viewMode === '3d' && (
            <div className="w-full overflow-x-auto">
              <Plot
                data={[
                  {
                    z: surface.ivSurface,
                    x: surface.strikes,
                    y: surface.expiries,
                    type: 'surface',
                    colorscale: 'RdYlGn',
                    reversescale: true,
                    hovertemplate:
                      'Strike: %{x:.1f}<br>Expiry: %{y:.2f}y<br>IV: %{z:.4f}<extra></extra>',
                    colorbar: {
                      title: { text: 'IV', side: 'right' } as object,
                      thickness: 15,
                    },
                  },
                ]}
                layout={{
                  autosize: true,
                  height: 550,
                  margin: { l: 0, r: 0, t: 30, b: 0 },
                  scene: {
                    xaxis: { title: { text: 'Strike (K)' } },
                    yaxis: { title: { text: 'Expiry (T, years)' } },
                    zaxis: { title: { text: 'Implied Vol (σ)' } },
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
                style={{ width: '100%', height: '550px' }}
              />
            </div>
          )}

          {viewMode === 'smile' && (
            <div className="w-full overflow-x-auto">
              <LineChart
                width={800}
                height={400}
                data={smileData}
                margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="strike"
                  label={{ value: 'Strike Price (K)', position: 'bottom', offset: -5 }}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  label={{ value: 'Implied Volatility', angle: -90, position: 'insideLeft' }}
                  tick={{ fontSize: 11 }}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  formatter={(value) =>
                    typeof value === 'number' ? value.toFixed(4) : String(value)
                  }
                  labelFormatter={(label) => `K = ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="iv"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  name="Implied Vol"
                />
              </LineChart>
            </div>
          )}

          {viewMode === 'term' && (
            <div className="w-full overflow-x-auto">
              <LineChart
                width={800}
                height={400}
                data={termData}
                margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="expiry"
                  label={{
                    value: 'Time to Expiry (years)',
                    position: 'bottom',
                    offset: -5,
                  }}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  label={{ value: 'Implied Volatility', angle: -90, position: 'insideLeft' }}
                  tick={{ fontSize: 11 }}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  formatter={(value) =>
                    typeof value === 'number' ? value.toFixed(4) : String(value)
                  }
                  labelFormatter={(label) => `T = ${label}y`}
                />
                <Line
                  type="monotone"
                  dataKey="iv"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={false}
                  name="Implied Vol"
                />
              </LineChart>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
