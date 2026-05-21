'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Calculator,
  TrendingUp,
  LineChart,
  Dices,
  Scale,
  Zap,
} from 'lucide-react';

const tools = [
  {
    href: '/tools/bs-calculator',
    title: 'Black-Scholes Calculator',
    description:
      'Interactive calculator with sliders for all BS inputs. Computes option prices, all Greeks, and displays the formulas.',
    icon: <Calculator className="h-5 w-5" />,
    tags: ['Pricing', 'Greeks'],
  },
  {
    href: '/tools/payoff-builder',
    title: 'Payoff Diagram Builder',
    description:
      'Build multi-leg option strategies visually. Pre-built templates for common strategies with breakeven analysis.',
    icon: <TrendingUp className="h-5 w-5" />,
    tags: ['Strategies', 'Payoff'],
  },
  {
    href: '/tools/greek-visualizer',
    title: 'Greek Visualizer',
    description:
      'Plot any Greek against spot price, time, or volatility. Overlay multiple options and see aggregate Greeks.',
    icon: <LineChart className="h-5 w-5" />,
    tags: ['Greeks', 'Visualization'],
  },
  {
    href: '/tools/dice-game',
    title: 'Dice Game Simulator',
    description:
      'Expected value estimation and optimal stopping games. Build intuition for probability and decision-making.',
    icon: <Dices className="h-5 w-5" />,
    tags: ['Probability', 'EV'],
  },
  {
    href: '/tools/put-call-parity',
    title: 'Put-Call Parity',
    description:
      'Calculator and speed drill for put-call parity. Detect arbitrage violations and practice solving for unknowns.',
    icon: <Scale className="h-5 w-5" />,
    tags: ['Parity', 'Drill'],
  },
  {
    href: '/tools/speed-drill',
    title: 'Speed Arithmetic',
    description:
      'Timed mental math drill with three difficulty levels. Warmup, Standard, and Natenberg-style options math.',
    icon: <Zap className="h-5 w-5" />,
    tags: ['Mental Math', 'Speed'],
  },
];

export default function ToolsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Interactive Tools</h1>
        <p className="mt-2 text-muted-foreground">
          Hands-on calculators, visualizers, and drills to sharpen your options
          trading intuition.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <Link key={tool.href} href={tool.href}>
            <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {tool.icon}
                  </div>
                  <CardTitle className="text-base">{tool.title}</CardTitle>
                </div>
                <CardDescription className="mt-2">
                  {tool.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {tool.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
