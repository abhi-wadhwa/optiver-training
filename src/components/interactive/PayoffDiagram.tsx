'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';
import {
  payoffCurve,
  breakEvenPoints,
  maxProfit,
  maxLoss,
  legPayoff,
} from '@/lib/math/payoff';
import type { OptionLeg, StockLeg, StrategyLeg } from '@/lib/math/payoff';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2 } from 'lucide-react';

interface LegFormState {
  type: 'call' | 'put' | 'stock';
  side: 'long' | 'short';
  strike: number;
  premium: number;
  quantity: number;
  entryPrice: number;
}

const TEMPLATES: Record<string, LegFormState[]> = {
  'Bull Call Spread': [
    { type: 'call', side: 'long', strike: 95, premium: 8, quantity: 1, entryPrice: 100 },
    { type: 'call', side: 'short', strike: 105, premium: 3, quantity: 1, entryPrice: 100 },
  ],
  'Bear Put Spread': [
    { type: 'put', side: 'long', strike: 105, premium: 8, quantity: 1, entryPrice: 100 },
    { type: 'put', side: 'short', strike: 95, premium: 3, quantity: 1, entryPrice: 100 },
  ],
  Straddle: [
    { type: 'call', side: 'long', strike: 100, premium: 5, quantity: 1, entryPrice: 100 },
    { type: 'put', side: 'long', strike: 100, premium: 5, quantity: 1, entryPrice: 100 },
  ],
  Strangle: [
    { type: 'call', side: 'long', strike: 105, premium: 3, quantity: 1, entryPrice: 100 },
    { type: 'put', side: 'long', strike: 95, premium: 3, quantity: 1, entryPrice: 100 },
  ],
  'Iron Condor': [
    { type: 'put', side: 'long', strike: 85, premium: 1, quantity: 1, entryPrice: 100 },
    { type: 'put', side: 'short', strike: 90, premium: 2.5, quantity: 1, entryPrice: 100 },
    { type: 'call', side: 'short', strike: 110, premium: 2.5, quantity: 1, entryPrice: 100 },
    { type: 'call', side: 'long', strike: 115, premium: 1, quantity: 1, entryPrice: 100 },
  ],
  Butterfly: [
    { type: 'call', side: 'long', strike: 90, premium: 12, quantity: 1, entryPrice: 100 },
    { type: 'call', side: 'short', strike: 100, premium: 6, quantity: 2, entryPrice: 100 },
    { type: 'call', side: 'long', strike: 110, premium: 2, quantity: 1, entryPrice: 100 },
  ],
  'Covered Call': [
    { type: 'stock', side: 'long', strike: 100, premium: 0, quantity: 1, entryPrice: 100 },
    { type: 'call', side: 'short', strike: 105, premium: 3, quantity: 1, entryPrice: 100 },
  ],
  'Protective Put': [
    { type: 'stock', side: 'long', strike: 100, premium: 0, quantity: 1, entryPrice: 100 },
    { type: 'put', side: 'long', strike: 95, premium: 3, quantity: 1, entryPrice: 100 },
  ],
};

function formToLeg(form: LegFormState): StrategyLeg {
  if (form.type === 'stock') {
    return {
      type: 'stock',
      side: form.side,
      entryPrice: form.entryPrice,
      quantity: form.quantity,
    } as StockLeg;
  }
  return {
    type: form.type,
    side: form.side,
    strike: form.strike,
    premium: form.premium,
    quantity: form.quantity,
  } as OptionLeg;
}

const LEG_COLORS = ['#3b82f6', '#f97316', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];

export function PayoffDiagramBuilder() {
  const [legs, setLegs] = useState<LegFormState[]>([
    { type: 'call', side: 'long', strike: 100, premium: 5, quantity: 1, entryPrice: 100 },
  ]);
  const [showIndividual, setShowIndividual] = useState(true);

  const strategyLegs = useMemo(() => legs.map(formToLeg), [legs]);

  const strikes = useMemo(() => {
    const s: number[] = [];
    for (const leg of legs) {
      if (leg.type === 'stock') s.push(leg.entryPrice);
      else s.push(leg.strike);
    }
    return s;
  }, [legs]);

  const minSpot = useMemo(
    () => Math.max(0, Math.min(...strikes) - 40),
    [strikes]
  );
  const maxSpot = useMemo(
    () => Math.max(...strikes) + 40,
    [strikes]
  );

  const chartData = useMemo(() => {
    const curve = payoffCurve(strategyLegs, minSpot, maxSpot, 200);
    return curve.map((pt) => {
      const row: Record<string, number> = {
        spot: parseFloat(pt.spot.toFixed(2)),
        payoff: parseFloat(pt.payoff.toFixed(2)),
        profitArea: pt.payoff > 0 ? parseFloat(pt.payoff.toFixed(2)) : 0,
        lossArea: pt.payoff < 0 ? parseFloat(pt.payoff.toFixed(2)) : 0,
      };
      if (showIndividual) {
        strategyLegs.forEach((leg, i) => {
          row[`leg${i}`] = parseFloat(legPayoff(leg, pt.spot).toFixed(2));
        });
      }
      return row;
    });
  }, [strategyLegs, minSpot, maxSpot, showIndividual]);

  const breakEvens = useMemo(
    () => breakEvenPoints(strategyLegs, minSpot, maxSpot),
    [strategyLegs, minSpot, maxSpot]
  );

  const mp = useMemo(
    () => maxProfit(strategyLegs, minSpot, maxSpot),
    [strategyLegs, minSpot, maxSpot]
  );

  const ml = useMemo(
    () => maxLoss(strategyLegs, minSpot, maxSpot),
    [strategyLegs, minSpot, maxSpot]
  );

  const addLeg = useCallback(() => {
    setLegs((prev) => [
      ...prev,
      { type: 'call', side: 'long', strike: 100, premium: 5, quantity: 1, entryPrice: 100 },
    ]);
  }, []);

  const removeLeg = useCallback((index: number) => {
    setLegs((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateLeg = useCallback(
    (index: number, field: keyof LegFormState, value: string | number) => {
      setLegs((prev) =>
        prev.map((leg, i) =>
          i === index ? { ...leg, [field]: value } : leg
        )
      );
    },
    []
  );

  const applyTemplate = useCallback((name: string) => {
    const tpl = TEMPLATES[name];
    if (tpl) setLegs(tpl.map((l) => ({ ...l })));
  }, []);

  return (
    <div className="space-y-6">
      {/* Strategy Templates */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Strategy Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.keys(TEMPLATES).map((name) => (
              <Button
                key={name}
                variant="outline"
                size="sm"
                onClick={() => applyTemplate(name)}
              >
                {name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Leg Builder */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Legs</CardTitle>
            <Button size="sm" onClick={addLeg}>
              <Plus className="mr-1 h-3 w-3" />
              Add Leg
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {legs.map((leg, i) => (
            <div
              key={i}
              className="flex flex-wrap items-end gap-2 rounded-md border p-3"
              style={{ borderLeftColor: LEG_COLORS[i % LEG_COLORS.length], borderLeftWidth: 3 }}
            >
              <div>
                <Label className="text-xs">Type</Label>
                <select
                  className="mt-1 block h-7 rounded border bg-transparent px-2 text-xs"
                  value={leg.type}
                  onChange={(e) =>
                    updateLeg(i, 'type', e.target.value as 'call' | 'put' | 'stock')
                  }
                >
                  <option value="call">Call</option>
                  <option value="put">Put</option>
                  <option value="stock">Stock</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Side</Label>
                <select
                  className="mt-1 block h-7 rounded border bg-transparent px-2 text-xs"
                  value={leg.side}
                  onChange={(e) =>
                    updateLeg(i, 'side', e.target.value as 'long' | 'short')
                  }
                >
                  <option value="long">Long</option>
                  <option value="short">Short</option>
                </select>
              </div>
              {leg.type !== 'stock' ? (
                <>
                  <div>
                    <Label className="text-xs">Strike</Label>
                    <Input
                      type="number"
                      className="mt-1 h-7 w-20 text-xs"
                      value={leg.strike}
                      onChange={(e) =>
                        updateLeg(i, 'strike', parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Premium</Label>
                    <Input
                      type="number"
                      className="mt-1 h-7 w-20 text-xs"
                      value={leg.premium}
                      onChange={(e) =>
                        updateLeg(i, 'premium', parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                </>
              ) : (
                <div>
                  <Label className="text-xs">Entry Price</Label>
                  <Input
                    type="number"
                    className="mt-1 h-7 w-20 text-xs"
                    value={leg.entryPrice}
                    onChange={(e) =>
                      updateLeg(i, 'entryPrice', parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
              )}
              <div>
                <Label className="text-xs">Qty</Label>
                <Input
                  type="number"
                  className="mt-1 h-7 w-16 text-xs"
                  value={leg.quantity}
                  min={1}
                  onChange={(e) =>
                    updateLeg(i, 'quantity', parseInt(e.target.value) || 1)
                  }
                />
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => removeLeg(i)}
                className="text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {breakEvens.map((be, i) => (
          <Card key={i}>
            <CardContent className="py-3 text-center">
              <p className="text-xs text-muted-foreground">Breakeven {breakEvens.length > 1 ? i + 1 : ''}</p>
              <p className="text-lg font-bold tabular-nums">{be.toFixed(2)}</p>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-xs text-muted-foreground">Max Profit</p>
            <p className="text-lg font-bold tabular-nums text-green-600">
              {mp >= 1e6 ? 'Unlimited' : mp.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-xs text-muted-foreground">Max Loss</p>
            <p className="text-lg font-bold tabular-nums text-red-600">
              {ml <= -1e6 ? 'Unlimited' : ml.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Payoff Diagram</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowIndividual(!showIndividual)}
            >
              {showIndividual ? 'Hide' : 'Show'} Individual Legs
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <ComposedChart
              width={800}
              height={400}
              data={chartData}
              margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="spot"
                label={{ value: 'Spot Price at Expiry', position: 'bottom', offset: -5 }}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                label={{ value: 'Profit / Loss', angle: -90, position: 'insideLeft' }}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{ fontSize: 12 }}
                formatter={(value, name) => [
                  typeof value === 'number' ? value.toFixed(2) : String(value),
                  name === 'payoff' ? 'Combined P&L' : String(name),
                ]}
              />
              <Legend />
              <ReferenceLine y={0} stroke="#888" strokeWidth={1} />
              <Area
                type="monotone"
                dataKey="profitArea"
                fill="#22c55e"
                fillOpacity={0.15}
                stroke="none"
                name="Profit Zone"
                legendType="none"
              />
              <Area
                type="monotone"
                dataKey="lossArea"
                fill="#ef4444"
                fillOpacity={0.15}
                stroke="none"
                name="Loss Zone"
                legendType="none"
              />
              <Line
                type="monotone"
                dataKey="payoff"
                stroke="#000"
                strokeWidth={2}
                dot={false}
                name="Combined P&L"
              />
              {showIndividual &&
                strategyLegs.map((_, i) => (
                  <Line
                    key={i}
                    type="monotone"
                    dataKey={`leg${i}`}
                    stroke={LEG_COLORS[i % LEG_COLORS.length]}
                    strokeWidth={1}
                    strokeDasharray="5 3"
                    dot={false}
                    name={`Leg ${i + 1}`}
                  />
                ))}
              {breakEvens.map((be, i) => (
                <ReferenceLine
                  key={`be-${i}`}
                  x={parseFloat(be.toFixed(2))}
                  stroke="#f59e0b"
                  strokeDasharray="3 3"
                  label={{ value: `BE: ${be.toFixed(1)}`, position: 'top', fontSize: 10 }}
                />
              ))}
            </ComposedChart>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
