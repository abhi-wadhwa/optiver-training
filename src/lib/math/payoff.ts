export interface OptionLeg {
  type: 'call' | 'put';
  side: 'long' | 'short';
  strike: number;
  premium: number;
  quantity: number;
}

export interface StockLeg {
  type: 'stock';
  side: 'long' | 'short';
  entryPrice: number;
  quantity: number;
}

export type StrategyLeg = OptionLeg | StockLeg;

export function legPayoff(leg: StrategyLeg, spotAtExpiry: number): number {
  if (leg.type === 'stock') {
    const raw = (spotAtExpiry - leg.entryPrice) * leg.quantity;
    return leg.side === 'long' ? raw : -raw;
  }

  const intrinsic =
    leg.type === 'call'
      ? Math.max(spotAtExpiry - leg.strike, 0)
      : Math.max(leg.strike - spotAtExpiry, 0);

  const pnl = (intrinsic - leg.premium) * leg.quantity;
  return leg.side === 'long' ? pnl : -pnl;
}

export function strategyPayoff(legs: StrategyLeg[], spotAtExpiry: number): number {
  return legs.reduce((sum, leg) => sum + legPayoff(leg, spotAtExpiry), 0);
}

export function payoffCurve(
  legs: StrategyLeg[],
  minSpot: number,
  maxSpot: number,
  points = 200
): { spot: number; payoff: number }[] {
  const step = (maxSpot - minSpot) / (points - 1);
  return Array.from({ length: points }, (_, i) => {
    const spot = minSpot + i * step;
    return { spot, payoff: strategyPayoff(legs, spot) };
  });
}

export function breakEvenPoints(
  legs: StrategyLeg[],
  minSpot: number,
  maxSpot: number
): number[] {
  const data = payoffCurve(legs, minSpot, maxSpot, 1000);
  const breakEvens: number[] = [];

  for (let i = 1; i < data.length; i++) {
    if (
      (data[i - 1].payoff <= 0 && data[i].payoff > 0) ||
      (data[i - 1].payoff >= 0 && data[i].payoff < 0)
    ) {
      const frac =
        Math.abs(data[i - 1].payoff) /
        (Math.abs(data[i - 1].payoff) + Math.abs(data[i].payoff));
      breakEvens.push(data[i - 1].spot + frac * (data[i].spot - data[i - 1].spot));
    }
  }

  return breakEvens;
}

export function maxProfit(
  legs: StrategyLeg[],
  minSpot: number,
  maxSpot: number
): number {
  return Math.max(...payoffCurve(legs, minSpot, maxSpot, 1000).map((d) => d.payoff));
}

export function maxLoss(
  legs: StrategyLeg[],
  minSpot: number,
  maxSpot: number
): number {
  return Math.min(...payoffCurve(legs, minSpot, maxSpot, 1000).map((d) => d.payoff));
}
