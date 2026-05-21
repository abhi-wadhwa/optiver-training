'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
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
import { Play, Pause, RotateCcw } from 'lucide-react';

interface Order {
  price: number;
  quantity: number;
  side: 'bid' | 'ask';
}

interface Trade {
  price: number;
  quantity: number;
  side: 'buy' | 'sell';
  time: number;
}

interface BookState {
  bids: Map<number, number>; // price -> total qty
  asks: Map<number, number>;
  trades: Trade[];
  step: number;
  truePrice: number;
}

/** Simple PRNG */
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

function initializeBook(truePrice: number): BookState {
  const bids = new Map<number, number>();
  const asks = new Map<number, number>();
  const tickSize = 0.01;

  // Place initial orders around true price
  for (let i = 1; i <= 8; i++) {
    const bidPrice = parseFloat((truePrice - i * tickSize).toFixed(2));
    const askPrice = parseFloat((truePrice + i * tickSize).toFixed(2));
    bids.set(bidPrice, Math.floor(5 + Math.random() * 20));
    asks.set(askPrice, Math.floor(5 + Math.random() * 20));
  }

  return { bids, asks, trades: [], step: 0, truePrice };
}

function stepBook(
  state: BookState,
  volatility: number,
  limitRate: number,
  marketRate: number,
  cancelRate: number,
  rng: () => number
): BookState {
  const tickSize = 0.01;
  const newBids = new Map(state.bids);
  const newAsks = new Map(state.asks);
  const newTrades = [...state.trades];
  const step = state.step + 1;

  // Random walk true price
  const priceChange = volatility * randNormal(rng);
  const truePrice = parseFloat(
    (state.truePrice + priceChange).toFixed(2)
  );

  // Cancel some existing orders
  for (const [price, qty] of newBids) {
    if (rng() < cancelRate) {
      const cancelQty = Math.max(1, Math.floor(qty * rng()));
      const remaining = qty - cancelQty;
      if (remaining <= 0) {
        newBids.delete(price);
      } else {
        newBids.set(price, remaining);
      }
    }
  }
  for (const [price, qty] of newAsks) {
    if (rng() < cancelRate) {
      const cancelQty = Math.max(1, Math.floor(qty * rng()));
      const remaining = qty - cancelQty;
      if (remaining <= 0) {
        newAsks.delete(price);
      } else {
        newAsks.set(price, remaining);
      }
    }
  }

  // Add new limit orders
  const numNewLimits = Math.floor(rng() * limitRate * 2);
  for (let i = 0; i < numNewLimits; i++) {
    const isBid = rng() < 0.5;
    const offset = Math.ceil(rng() * 10) * tickSize;
    const qty = Math.floor(1 + rng() * 15);

    if (isBid) {
      const price = parseFloat((truePrice - offset).toFixed(2));
      newBids.set(price, (newBids.get(price) || 0) + qty);
    } else {
      const price = parseFloat((truePrice + offset).toFixed(2));
      newAsks.set(price, (newAsks.get(price) || 0) + qty);
    }
  }

  // Maybe a market order
  if (rng() < marketRate * 0.1) {
    const isBuy = rng() < 0.5;
    const marketQty = Math.floor(1 + rng() * 10);

    if (isBuy && newAsks.size > 0) {
      // Buy market order: hits the best ask
      const bestAsk = Math.min(...newAsks.keys());
      const availQty = newAsks.get(bestAsk) || 0;
      const fillQty = Math.min(marketQty, availQty);
      if (availQty - fillQty <= 0) {
        newAsks.delete(bestAsk);
      } else {
        newAsks.set(bestAsk, availQty - fillQty);
      }
      newTrades.push({
        price: bestAsk,
        quantity: fillQty,
        side: 'buy',
        time: step,
      });
    } else if (!isBuy && newBids.size > 0) {
      // Sell market order: hits the best bid
      const bestBid = Math.max(...newBids.keys());
      const availQty = newBids.get(bestBid) || 0;
      const fillQty = Math.min(marketQty, availQty);
      if (availQty - fillQty <= 0) {
        newBids.delete(bestBid);
      } else {
        newBids.set(bestBid, availQty - fillQty);
      }
      newTrades.push({
        price: bestBid,
        quantity: fillQty,
        side: 'sell',
        time: step,
      });
    }
  }

  // Clean up: remove bids above best ask and asks below best bid (crossed book)
  if (newBids.size > 0 && newAsks.size > 0) {
    const bestAsk = Math.min(...newAsks.keys());
    const bestBid = Math.max(...newBids.keys());
    if (bestBid >= bestAsk) {
      // Uncross: execute at midpoint, remove crossing levels
      for (const [price] of newBids) {
        if (price >= bestAsk) newBids.delete(price);
      }
      for (const [price] of newAsks) {
        if (price <= bestBid) newAsks.delete(price);
      }
    }
  }

  // Keep only last 20 trades
  while (newTrades.length > 20) newTrades.shift();

  return {
    bids: newBids,
    asks: newAsks,
    trades: newTrades,
    step,
    truePrice,
  };
}

export function LOBOrderFlow() {
  const [volatility, setVolatility] = useState(0.02);
  const [limitRate, setLimitRate] = useState(5);
  const [marketRate, setMarketRate] = useState(2);
  const [cancelRate, setCancelRate] = useState(0.1);
  const [speed, setSpeed] = useState(300);
  const [isRunning, setIsRunning] = useState(false);

  const [book, setBook] = useState<BookState>(() => initializeBook(100.0));
  const rngRef = useRef(mulberry32(42));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reset = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    rngRef.current = mulberry32(Date.now());
    setBook(initializeBook(100.0));
  }, []);

  const toggle = useCallback(() => {
    setIsRunning((prev) => !prev);
  }, []);

  // Animation loop
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setBook((prev) =>
          stepBook(
            prev,
            volatility,
            limitRate,
            marketRate,
            cancelRate,
            rngRef.current
          )
        );
      }, speed);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, speed, volatility, limitRate, marketRate, cancelRate]);

  // Compute depth chart data
  const depthData = useMemo(() => {
    const bidEntries = Array.from(book.bids.entries())
      .sort((a, b) => b[0] - a[0])
      .slice(0, 10);
    const askEntries = Array.from(book.asks.entries())
      .sort((a, b) => a[0] - b[0])
      .slice(0, 10);

    // Combine into single array for horizontal bar chart
    const data: {
      price: string;
      bidQty: number;
      askQty: number;
    }[] = [];

    // Bids (descending price)
    for (const [price, qty] of bidEntries.reverse()) {
      data.push({
        price: price.toFixed(2),
        bidQty: qty,
        askQty: 0,
      });
    }

    // Asks (ascending price)
    for (const [price, qty] of askEntries) {
      data.push({
        price: price.toFixed(2),
        bidQty: 0,
        askQty: qty,
      });
    }

    return data;
  }, [book.bids, book.asks]);

  // Compute mid-price, micro-price, spread, OFI
  const metrics = useMemo(() => {
    const bidPrices = Array.from(book.bids.keys()).sort((a, b) => b - a);
    const askPrices = Array.from(book.asks.keys()).sort((a, b) => a - b);

    const bestBid = bidPrices[0] ?? 0;
    const bestAsk = askPrices[0] ?? 0;
    const midPrice =
      bestBid > 0 && bestAsk > 0 ? (bestBid + bestAsk) / 2 : book.truePrice;
    const spread = bestAsk > 0 && bestBid > 0 ? bestAsk - bestBid : 0;

    const bidQty = bestBid > 0 ? book.bids.get(bestBid) || 0 : 0;
    const askQty = bestAsk > 0 ? book.asks.get(bestAsk) || 0 : 0;
    const totalQty = bidQty + askQty;

    // Micro-price: weighted average by opposite side
    const microPrice =
      totalQty > 0
        ? (bidQty * bestAsk + askQty * bestBid) / totalQty
        : midPrice;

    // OFI: (bidQty - askQty) / (bidQty + askQty), ranges from -1 to +1
    const ofi = totalQty > 0 ? (bidQty - askQty) / totalQty : 0;

    return { midPrice, microPrice, spread, ofi, bestBid, bestAsk, bidQty, askQty };
  }, [book]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Order Book Simulation</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={toggle}>
                {isRunning ? (
                  <Pause className="mr-1 h-4 w-4" />
                ) : (
                  <Play className="mr-1 h-4 w-4" />
                )}
                {isRunning ? 'Pause' : 'Play'}
              </Button>
              <Button variant="outline" size="sm" onClick={reset}>
                <RotateCcw className="mr-1 h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SliderInput
              label="Volatility (per step)"
              min={0.01}
              max={0.1}
              step={0.005}
              value={volatility}
              onChange={setVolatility}
              precision={3}
            />
            <SliderInput
              label="Limit Order Rate"
              min={1}
              max={20}
              step={1}
              value={limitRate}
              onChange={setLimitRate}
              precision={0}
            />
            <SliderInput
              label="Market Order Rate"
              min={0.5}
              max={5}
              step={0.5}
              value={marketRate}
              onChange={setMarketRate}
              precision={1}
            />
            <SliderInput
              label="Cancel Rate"
              min={0.01}
              max={0.3}
              step={0.01}
              value={cancelRate}
              onChange={setCancelRate}
              precision={2}
            />
            <SliderInput
              label="Speed (ms per step)"
              min={100}
              max={1000}
              step={50}
              value={speed}
              onChange={setSpeed}
              precision={0}
            />
          </div>
        </CardContent>
      </Card>

      {/* Main display */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Depth chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Order Book Depth (Step {book.step})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={depthData}
                layout="vertical"
                margin={{ top: 5, right: 20, bottom: 5, left: 50 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis
                  type="category"
                  dataKey="price"
                  tick={{ fontSize: 10 }}
                  width={50}
                />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="bidQty" fill="#22c55e" name="Bid Qty" />
                <Bar dataKey="askQty" fill="#ef4444" name="Ask Qty" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Right panel: metrics */}
        <div className="space-y-4">
          {/* OFI gauge */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Order Flow Imbalance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* OFI bar */}
                <div className="relative h-8 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="absolute top-0 h-full transition-all duration-300"
                    style={{
                      left:
                        metrics.ofi >= 0
                          ? '50%'
                          : `${50 + metrics.ofi * 50}%`,
                      width: `${Math.abs(metrics.ofi) * 50}%`,
                      backgroundColor:
                        metrics.ofi >= 0 ? '#22c55e' : '#ef4444',
                    }}
                  />
                  {/* Center line */}
                  <div className="absolute left-1/2 top-0 h-full w-0.5 bg-foreground/30" />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>-1 (Sell)</span>
                  <span className="font-mono font-semibold">
                    OFI: {metrics.ofi.toFixed(3)}
                  </span>
                  <span>+1 (Buy)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Price metrics */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Price Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Best Bid</span>
                <span className="font-mono font-medium text-green-600">
                  {metrics.bestBid.toFixed(2)} ({metrics.bidQty})
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Best Ask</span>
                <span className="font-mono font-medium text-red-600">
                  {metrics.bestAsk.toFixed(2)} ({metrics.askQty})
                </span>
              </div>
              <div className="my-1 border-t" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Mid Price</span>
                <span className="font-mono font-medium">
                  {metrics.midPrice.toFixed(4)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Micro Price</span>
                <span className="font-mono font-medium text-cyan-600">
                  {metrics.microPrice.toFixed(4)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Spread</span>
                <span className="font-mono font-medium">
                  {metrics.spread.toFixed(4)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">True Price</span>
                <span className="font-mono font-medium text-yellow-600">
                  {book.truePrice.toFixed(4)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Trade tape */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                Trade Tape (last {book.trades.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-48 space-y-1 overflow-y-auto">
                {book.trades.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No trades yet...
                  </p>
                )}
                {[...book.trades].reverse().map((trade, i) => (
                  <div
                    key={`${trade.time}-${i}`}
                    className="flex items-center justify-between text-xs"
                  >
                    <Badge
                      variant={
                        trade.side === 'buy' ? 'default' : 'destructive'
                      }
                      className="w-10 justify-center text-[10px]"
                    >
                      {trade.side === 'buy' ? 'BUY' : 'SELL'}
                    </Badge>
                    <span className="font-mono">
                      {trade.quantity} @ {trade.price.toFixed(2)}
                    </span>
                    <span className="text-muted-foreground">
                      t={trade.time}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
