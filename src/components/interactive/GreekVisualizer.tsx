'use client';

import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { blackScholes } from '@/lib/math/black-scholes';
import type { BSGreeks } from '@/lib/math/black-scholes';
import { SliderInput } from './SliderInput';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2 } from 'lucide-react';

type GreekName = 'delta' | 'gamma' | 'theta' | 'vega' | 'rho';
type XAxisVar = 'spot' | 'time' | 'vol';

interface OptionSpec {
  type: 'call' | 'put';
  strike: number;
  quantity: number;
}

const GREEK_LABELS: Record<GreekName, string> = {
  delta: 'Delta',
  gamma: 'Gamma',
  theta: 'Theta (per day)',
  vega: 'Vega (per 1% vol)',
  rho: 'Rho (per 1% rate)',
};

const XAXIS_LABELS: Record<XAxisVar, string> = {
  spot: 'Underlying Price',
  time: 'Time to Expiry (years)',
  vol: 'Volatility',
};

const CALL_COLORS = ['#3b82f6', '#1d4ed8', '#60a5fa', '#2563eb'];
const PUT_COLORS = ['#f97316', '#ea580c', '#fb923c', '#c2410c'];
const AGGREGATE_COLOR = '#10b981';

export function GreekVisualizer() {
  const [greek, setGreek] = useState<GreekName>('delta');
  const [xAxis, setXAxis] = useState<XAxisVar>('spot');
  const [fixedS, setFixedS] = useState(100);
  const [fixedK, setFixedK] = useState(100);
  const [fixedR, setFixedR] = useState(0.05);
  const [fixedT, setFixedT] = useState(1.0);
  const [fixedSigma, setFixedSigma] = useState(0.2);

  const [options, setOptions] = useState<OptionSpec[]>([
    { type: 'call', strike: 100, quantity: 1 },
  ]);

  const addOption = () => {
    setOptions((prev) => [...prev, { type: 'put', strike: 105, quantity: 1 }]);
  };

  const removeOption = (index: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, field: keyof OptionSpec, value: string | number) => {
    setOptions((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, [field]: value } : opt))
    );
  };

  const chartData = useMemo(() => {
    const points = 200;
    let xValues: number[];
    let xKey: string;

    switch (xAxis) {
      case 'spot':
        xValues = Array.from({ length: points }, (_, i) => 1 + (i * 499) / (points - 1));
        xKey = 'Spot Price';
        break;
      case 'time':
        xValues = Array.from({ length: points }, (_, i) => 0.01 + (i * 4.99) / (points - 1));
        xKey = 'Time to Expiry';
        break;
      case 'vol':
        xValues = Array.from({ length: points }, (_, i) => 0.01 + (i * 1.99) / (points - 1));
        xKey = 'Volatility';
        break;
    }

    return xValues.map((xVal) => {
      const S = xAxis === 'spot' ? xVal : fixedS;
      const T = xAxis === 'time' ? xVal : fixedT;
      const sigma = xAxis === 'vol' ? xVal : fixedSigma;

      const row: Record<string, number> = { x: parseFloat(xVal.toFixed(4)) };

      let aggregate = 0;

      options.forEach((opt, i) => {
        const result = blackScholes({ S, K: opt.strike, T, r: fixedR, sigma });
        const greeks: BSGreeks =
          opt.type === 'call' ? result.callGreeks : result.putGreeks;
        const val = greeks[greek] * opt.quantity;
        row[`opt${i}`] = parseFloat(val.toFixed(6));
        aggregate += val;
      });

      row.aggregate = parseFloat(aggregate.toFixed(6));
      return row;
    });
  }, [greek, xAxis, fixedS, fixedT, fixedSigma, fixedR, options]);

  return (
    <div className="space-y-6">
      {/* Controls Row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Greek & X-axis Selection */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Greek to Plot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(GREEK_LABELS) as GreekName[]).map((g) => (
                <Button
                  key={g}
                  variant={greek === g ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGreek(g)}
                >
                  {GREEK_LABELS[g].split(' ')[0]}
                </Button>
              ))}
            </div>
            <Separator />
            <p className="text-xs font-medium text-muted-foreground">X-Axis Variable</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(XAXIS_LABELS) as XAxisVar[]).map((x) => (
                <Button
                  key={x}
                  variant={xAxis === x ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setXAxis(x)}
                >
                  {XAXIS_LABELS[x]}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Fixed Parameters */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Fixed Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {xAxis !== 'spot' && (
              <SliderInput
                label="Spot Price (S)"
                min={1}
                max={500}
                step={0.5}
                value={fixedS}
                onChange={setFixedS}
                precision={1}
              />
            )}
            <SliderInput
              label="Risk-Free Rate (r)"
              min={0}
              max={0.2}
              step={0.001}
              value={fixedR}
              onChange={setFixedR}
              precision={3}
            />
            {xAxis !== 'time' && (
              <SliderInput
                label="Time to Expiry (T)"
                min={0.01}
                max={5}
                step={0.01}
                value={fixedT}
                onChange={setFixedT}
                precision={2}
              />
            )}
            {xAxis !== 'vol' && (
              <SliderInput
                label="Volatility (sigma)"
                min={0.01}
                max={2}
                step={0.01}
                value={fixedSigma}
                onChange={setFixedSigma}
                precision={2}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Options to Overlay */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Options to Overlay</CardTitle>
            <Button size="sm" onClick={addOption}>
              <Plus className="mr-1 h-3 w-3" />
              Add Option
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {options.map((opt, i) => {
            const color =
              opt.type === 'call'
                ? CALL_COLORS[i % CALL_COLORS.length]
                : PUT_COLORS[i % PUT_COLORS.length];
            return (
              <div
                key={i}
                className="flex items-end gap-2 rounded border p-2"
                style={{ borderLeftColor: color, borderLeftWidth: 3 }}
              >
                <div>
                  <Label className="text-xs">Type</Label>
                  <select
                    className="mt-1 block h-7 rounded border bg-transparent px-2 text-xs"
                    value={opt.type}
                    onChange={(e) => updateOption(i, 'type', e.target.value)}
                  >
                    <option value="call">Call</option>
                    <option value="put">Put</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Strike</Label>
                  <Input
                    type="number"
                    className="mt-1 h-7 w-20 text-xs"
                    value={opt.strike}
                    onChange={(e) =>
                      updateOption(i, 'strike', parseFloat(e.target.value) || 100)
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Qty</Label>
                  <Input
                    type="number"
                    className="mt-1 h-7 w-16 text-xs"
                    value={opt.quantity}
                    onChange={(e) =>
                      updateOption(i, 'quantity', parseInt(e.target.value) || 1)
                    }
                  />
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {opt.type === 'call' ? 'C' : 'P'} K={opt.strike}
                </Badge>
                {options.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive"
                    onClick={() => removeOption(i)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            {GREEK_LABELS[greek]} vs {XAXIS_LABELS[xAxis]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <LineChart
              width={800}
              height={400}
              data={chartData}
              margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="x"
                label={{ value: XAXIS_LABELS[xAxis], position: 'bottom', offset: -5 }}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                label={{ value: GREEK_LABELS[greek], angle: -90, position: 'insideLeft' }}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{ fontSize: 12 }}
                formatter={(value) => typeof value === 'number' ? value.toFixed(4) : String(value)}
              />
              <Legend />
              <ReferenceLine y={0} stroke="#888" strokeWidth={0.5} />
              {options.map((opt, i) => {
                const color =
                  opt.type === 'call'
                    ? CALL_COLORS[i % CALL_COLORS.length]
                    : PUT_COLORS[i % PUT_COLORS.length];
                return (
                  <Line
                    key={i}
                    type="monotone"
                    dataKey={`opt${i}`}
                    stroke={color}
                    strokeWidth={1.5}
                    dot={false}
                    name={`${opt.type === 'call' ? 'Call' : 'Put'} K=${opt.strike} x${opt.quantity}`}
                  />
                );
              })}
              {options.length > 1 && (
                <Line
                  type="monotone"
                  dataKey="aggregate"
                  stroke={AGGREGATE_COLOR}
                  strokeWidth={2.5}
                  dot={false}
                  name="Aggregate"
                />
              )}
            </LineChart>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
