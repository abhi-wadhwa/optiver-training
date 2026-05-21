'use client';

import { useState, useMemo } from 'react';
import { blackScholes } from '@/lib/math/black-scholes';
import type { BSInputs, BSResult, BSGreeks } from '@/lib/math/black-scholes';
import { SliderInput } from './SliderInput';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import katex from 'katex';
import 'katex/dist/katex.min.css';

function fmt(n: number, dp = 4): string {
  return n.toFixed(dp);
}

function colorClass(n: number): string {
  if (n > 0.0001) return 'text-green-600';
  if (n < -0.0001) return 'text-red-600';
  return 'text-muted-foreground';
}

function GreekRow({ label, value, dp = 4 }: { label: string; value: number; dp?: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono font-medium ${colorClass(value)}`}>
        {fmt(value, dp)}
      </span>
    </div>
  );
}

function GreeksPanel({ title, price, greeks, d1, d2 }: {
  title: string;
  price: number;
  greeks: BSGreeks;
  d1: number;
  d2: number;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="flex items-center justify-between text-sm font-semibold">
          <span>Price</span>
          <span className={`font-mono ${colorClass(price)}`}>{fmt(price)}</span>
        </div>
        <div className="my-1 border-t" />
        <GreekRow label="Delta" value={greeks.delta} />
        <GreekRow label="Gamma" value={greeks.gamma} dp={6} />
        <GreekRow label="Theta" value={greeks.theta} />
        <GreekRow label="Vega" value={greeks.vega} />
        <GreekRow label="Rho" value={greeks.rho} />
        <div className="my-1 border-t" />
        <GreekRow label="d1" value={d1} />
        <GreekRow label="d2" value={d2} />
      </CardContent>
    </Card>
  );
}

const BS_FORMULAS = [
  { label: 'Call Price', tex: 'C = S e^{-qT} N(d_1) - K e^{-rT} N(d_2)' },
  { label: 'Put Price', tex: 'P = K e^{-rT} N(-d_2) - S e^{-qT} N(-d_1)' },
  {
    label: 'd1',
    tex: 'd_1 = \\frac{\\ln(S/K) + (r - q + \\sigma^2/2)T}{\\sigma\\sqrt{T}}',
  },
  { label: 'd2', tex: 'd_2 = d_1 - \\sigma\\sqrt{T}' },
  {
    label: 'Delta',
    tex: '\\Delta_{\\text{call}} = e^{-qT} N(d_1), \\quad \\Delta_{\\text{put}} = -e^{-qT} N(-d_1)',
  },
  {
    label: 'Gamma',
    tex: '\\Gamma = \\frac{e^{-qT} \\phi(d_1)}{S \\sigma \\sqrt{T}}',
  },
  {
    label: 'Vega',
    tex: '\\mathcal{V} = S e^{-qT} \\phi(d_1) \\sqrt{T}',
  },
  {
    label: 'Theta (call)',
    tex: '\\Theta_C = -\\frac{S e^{-qT} \\phi(d_1) \\sigma}{2\\sqrt{T}} - rKe^{-rT}N(d_2) + qSe^{-qT}N(d_1)',
  },
];

export function BSCalculator() {
  const [S, setS] = useState(100);
  const [K, setK] = useState(100);
  const [r, setR] = useState(0.05);
  const [T, setT] = useState(1.0);
  const [sigma, setSigma] = useState(0.2);

  const result: BSResult = useMemo(
    () => blackScholes({ S, K, T, r, sigma }),
    [S, K, T, r, sigma]
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Input Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SliderInput
            label="Spot Price (S)"
            min={1}
            max={500}
            step={0.5}
            value={S}
            onChange={setS}
            precision={2}
          />
          <SliderInput
            label="Strike Price (K)"
            min={1}
            max={500}
            step={0.5}
            value={K}
            onChange={setK}
            precision={2}
          />
          <SliderInput
            label="Risk-Free Rate (r)"
            min={0}
            max={0.2}
            step={0.001}
            value={r}
            onChange={setR}
            precision={3}
          />
          <SliderInput
            label="Time to Expiry (T, years)"
            min={0.01}
            max={5}
            step={0.01}
            value={T}
            onChange={setT}
            precision={2}
          />
          <SliderInput
            label="Volatility (sigma)"
            min={0.01}
            max={2}
            step={0.01}
            value={sigma}
            onChange={setSigma}
            precision={2}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <GreeksPanel
          title="Call Option"
          price={result.callPrice}
          greeks={result.callGreeks}
          d1={result.d1}
          d2={result.d2}
        />
        <GreeksPanel
          title="Put Option"
          price={result.putPrice}
          greeks={result.putGreeks}
          d1={result.d1}
          d2={result.d2}
        />
      </div>

      <Accordion>
        <AccordionItem value="formulas">
          <AccordionTrigger>Black-Scholes Formulas</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              {BS_FORMULAS.map((f) => (
                <div key={f.label}>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    {f.label}
                  </p>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: katex.renderToString(f.tex, {
                        displayMode: true,
                        throwOnError: false,
                      }),
                    }}
                  />
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
