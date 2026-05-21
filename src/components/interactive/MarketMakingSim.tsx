'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
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
import { SliderInput } from './SliderInput';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Play, RotateCcw, SkipForward, Pause } from 'lucide-react';

/* ────────── Types ────────── */

interface GameSettings {
  initialPrice: number;
  volatility: number;
  strike: number;
  timeToExpiry: number;
  riskFreeRate: number;
  numRounds: number;
  orderProbability: number;
}

interface Trade {
  round: number;
  side: 'bought' | 'sold';
  price: number;
  quantity: number;
  cumRealizedEdge: number;
}

interface RoundData {
  round: number;
  stockPrice: number;
  theoValue: number;
  bid: number;
  ask: number;
}

interface GameState {
  currentRound: number;
  stockPrice: number;
  remainingTime: number;
  inventory: number;
  /** Sum of (trade_price * signed_quantity): positive when we bought, negative when we sold */
  costBasis: number;
  /** Cumulative edge: sum of (half-spread earned on each trade) */
  realizedEdge: number;
  trades: Trade[];
  history: RoundData[];
}

/* ────────── Helpers ────────── */

/** Box-Muller transform for standard normal variate */
function randn(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function computeTheo(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number
): number {
  if (T <= 0) return Math.max(S - K, 0);
  const result = blackScholes({ S, K, T, r, sigma });
  return result.callPrice;
}

const DEFAULT_SETTINGS: GameSettings = {
  initialPrice: 100,
  volatility: 0.2,
  strike: 100,
  timeToExpiry: 0.25,
  riskFreeRate: 0.05,
  numRounds: 50,
  orderProbability: 0.4,
};

function makeInitialGameState(s: GameSettings): GameState {
  const initTheo = computeTheo(
    s.initialPrice,
    s.strike,
    s.timeToExpiry,
    s.riskFreeRate,
    s.volatility
  );
  return {
    currentRound: 0,
    stockPrice: s.initialPrice,
    remainingTime: s.timeToExpiry,
    inventory: 0,
    costBasis: 0,
    realizedEdge: 0,
    trades: [],
    history: [
      {
        round: 0,
        stockPrice: s.initialPrice,
        theoValue: parseFloat(initTheo.toFixed(4)),
        bid: 0,
        ask: 0,
      },
    ],
  };
}

/* ────────── Settings Panel ────────── */

function SettingsPanel({
  settings,
  onSettingsChange,
  onStart,
}: {
  settings: GameSettings;
  onSettingsChange: (s: GameSettings) => void;
  onStart: () => void;
}) {
  const update = <K extends keyof GameSettings>(
    key: K,
    value: GameSettings[K]
  ) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Game Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <SliderInput
          label="Initial Stock Price"
          min={10}
          max={500}
          step={1}
          value={settings.initialPrice}
          onChange={(v) => update('initialPrice', v)}
          precision={0}
        />
        <SliderInput
          label="Volatility (sigma)"
          min={0.05}
          max={1.0}
          step={0.01}
          value={settings.volatility}
          onChange={(v) => update('volatility', v)}
          precision={2}
        />
        <SliderInput
          label="Strike Price"
          min={10}
          max={500}
          step={1}
          value={settings.strike}
          onChange={(v) => update('strike', v)}
          precision={0}
        />
        <SliderInput
          label="Time to Expiry (years)"
          min={0.01}
          max={2.0}
          step={0.01}
          value={settings.timeToExpiry}
          onChange={(v) => update('timeToExpiry', v)}
          precision={2}
        />
        <SliderInput
          label="Risk-Free Rate"
          min={0}
          max={0.2}
          step={0.001}
          value={settings.riskFreeRate}
          onChange={(v) => update('riskFreeRate', v)}
          precision={3}
        />
        <SliderInput
          label="Number of Rounds"
          min={10}
          max={200}
          step={1}
          value={settings.numRounds}
          onChange={(v) => update('numRounds', v)}
          precision={0}
        />
        <SliderInput
          label="Order Arrival Probability"
          min={0.05}
          max={1.0}
          step={0.05}
          value={settings.orderProbability}
          onChange={(v) => update('orderProbability', v)}
          precision={2}
        />
        <Button className="mt-2 w-full" onClick={onStart}>
          <Play className="mr-2 h-4 w-4" />
          Start Game
        </Button>
      </CardContent>
    </Card>
  );
}

/* ────────── Scoreboard ────────── */

function Scoreboard({
  round,
  totalRounds,
  stockPrice,
  theoValue,
  bid,
  ask,
  inventory,
  realizedEdge,
  unrealizedPnL,
}: {
  round: number;
  totalRounds: number;
  stockPrice: number;
  theoValue: number;
  bid: number;
  ask: number;
  inventory: number;
  realizedEdge: number;
  unrealizedPnL: number;
}) {
  const totalPnL = realizedEdge + unrealizedPnL;

  const pnlColor = (v: number) =>
    v > 0.005 ? 'text-green-600' : v < -0.005 ? 'text-red-600' : '';

  const inventoryColor =
    inventory > 0
      ? 'text-blue-600'
      : inventory < 0
        ? 'text-red-600'
        : 'text-muted-foreground';

  const inventoryLabel =
    inventory > 0 ? 'Long' : inventory < 0 ? 'Short' : 'Flat';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">
          Round {round} / {totalRounds}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Stock Price</p>
            <p className="font-mono font-bold">{stockPrice.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Theo Value</p>
            <p className="font-mono font-bold">{theoValue.toFixed(4)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Your Bid</p>
            <p className="font-mono font-bold">{bid.toFixed(4)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Your Ask</p>
            <p className="font-mono font-bold">{ask.toFixed(4)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Inventory</p>
            <p className={`font-mono font-bold ${inventoryColor}`}>
              {inventory}{' '}
              <Badge variant="outline" className="ml-1 text-[10px]">
                {inventoryLabel}
              </Badge>
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Realized Edge</p>
            <p className={`font-mono font-bold ${pnlColor(realizedEdge)}`}>
              {realizedEdge >= 0 ? '+' : ''}
              {realizedEdge.toFixed(4)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Unrealized P&L</p>
            <p className={`font-mono font-bold ${pnlColor(unrealizedPnL)}`}>
              {unrealizedPnL >= 0 ? '+' : ''}
              {unrealizedPnL.toFixed(4)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total P&L</p>
            <p className={`font-mono text-lg font-bold ${pnlColor(totalPnL)}`}>
              {totalPnL >= 0 ? '+' : ''}
              {totalPnL.toFixed(4)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ────────── Trade Log ────────── */

function TradeLog({ trades }: { trades: Trade[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">
          Trade Log ({trades.length} trades)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-60 overflow-y-auto">
          {trades.length === 0 ? (
            <p className="text-xs text-muted-foreground">No trades yet.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-1 pr-3">Round</th>
                  <th className="pb-1 pr-3">Side</th>
                  <th className="pb-1 pr-3">Price</th>
                  <th className="pb-1 pr-3">Qty</th>
                  <th className="pb-1">Cum. Edge</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((t, i) => (
                  <tr key={i} className="border-b border-muted/30">
                    <td className="py-1 pr-3 font-mono">{t.round}</td>
                    <td className="py-1 pr-3">
                      <Badge
                        variant={t.side === 'sold' ? 'default' : 'secondary'}
                        className="text-[10px]"
                      >
                        {t.side === 'sold' ? 'SOLD' : 'BOUGHT'}
                      </Badge>
                    </td>
                    <td className="py-1 pr-3 font-mono">
                      {t.price.toFixed(4)}
                    </td>
                    <td className="py-1 pr-3 font-mono">{t.quantity}</td>
                    <td
                      className={`py-1 font-mono ${
                        t.cumRealizedEdge > 0.005
                          ? 'text-green-600'
                          : t.cumRealizedEdge < -0.005
                            ? 'text-red-600'
                            : ''
                      }`}
                    >
                      {t.cumRealizedEdge >= 0 ? '+' : ''}
                      {t.cumRealizedEdge.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ────────── Price Chart ────────── */

function PriceChart({
  history,
  currentBid,
  currentAsk,
}: {
  history: RoundData[];
  currentBid: number;
  currentAsk: number;
}) {
  if (history.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Price History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto">
          <LineChart
            width={800}
            height={350}
            data={history}
            margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="round"
              tick={{ fontSize: 11 }}
              label={{
                value: 'Round',
                position: 'bottom',
                offset: -5,
              }}
            />
            <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{ fontSize: 12 }}
              formatter={(value) =>
                typeof value === 'number' ? value.toFixed(4) : String(value)
              }
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="stockPrice"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
              name="Stock Price"
            />
            <Line
              type="monotone"
              dataKey="theoValue"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              name="Theo Value"
            />
            <ReferenceLine
              y={currentBid}
              stroke="#22c55e"
              strokeDasharray="5 3"
              label={{
                value: `Bid ${currentBid.toFixed(2)}`,
                position: 'right',
                fontSize: 10,
              }}
            />
            <ReferenceLine
              y={currentAsk}
              stroke="#ef4444"
              strokeDasharray="5 3"
              label={{
                value: `Ask ${currentAsk.toFixed(2)}`,
                position: 'right',
                fontSize: 10,
              }}
            />
          </LineChart>
        </div>
      </CardContent>
    </Card>
  );
}

/* ────────── Main Component ────────── */

export function MarketMakingSim() {
  /* ── Settings ── */
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [gameStarted, setGameStarted] = useState(false);

  /* ── Controls ── */
  const [spreadWidth, setSpreadWidth] = useState(0.2);
  const [bidOffset, setBidOffset] = useState(0);

  /* ── Consolidated game state ── */
  const [game, setGame] = useState<GameState>(() =>
    makeInitialGameState(DEFAULT_SETTINGS)
  );

  /* ── Auto-play ── */
  const [autoPlaying, setAutoPlaying] = useState(false);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Derived values ── */
  const theoValue = useMemo(
    () =>
      computeTheo(
        game.stockPrice,
        settings.strike,
        game.remainingTime,
        settings.riskFreeRate,
        settings.volatility
      ),
    [
      game.stockPrice,
      settings.strike,
      game.remainingTime,
      settings.riskFreeRate,
      settings.volatility,
    ]
  );

  const bid = theoValue - spreadWidth / 2 + bidOffset;
  const ask = theoValue + spreadWidth / 2 + bidOffset;

  /**
   * Unrealized P&L: mark inventory to market at current theo.
   * costBasis tracks the net cost of acquiring the inventory
   * (positive = we paid for long positions, negative = we received for short).
   * unrealized = inventory * currentTheo - costBasis
   */
  const unrealizedPnL = game.inventory * theoValue - game.costBasis;
  const gameOver = game.currentRound >= settings.numRounds;

  /* ── Advance one round (pure computation then single state update) ── */
  const advanceRound = useCallback(() => {
    setGame((prev) => {
      const nextRound = prev.currentRound + 1;
      if (nextRound > settings.numRounds) return prev;

      const dt = settings.timeToExpiry / settings.numRounds;
      const r = settings.riskFreeRate;
      const sigma = settings.volatility;

      /* GBM stock price step */
      const Z = randn();
      const newS =
        prev.stockPrice *
        Math.exp(
          (r - 0.5 * sigma * sigma) * dt + sigma * Math.sqrt(dt) * Z
        );

      /* New remaining time and theo */
      const newRemaining = Math.max(
        settings.timeToExpiry - nextRound * dt,
        0
      );
      const newTheo = computeTheo(
        newS,
        settings.strike,
        newRemaining,
        r,
        sigma
      );

      /* Bid/ask for this round */
      const roundBid = newTheo - spreadWidth / 2 + bidOffset;
      const roundAsk = newTheo + spreadWidth / 2 + bidOffset;

      /* Possibly execute a trade */
      let newInventory = prev.inventory;
      let newCostBasis = prev.costBasis;
      let newRealizedEdge = prev.realizedEdge;
      let newTrades = prev.trades;

      if (Math.random() < settings.orderProbability) {
        const customerBuys = Math.random() < 0.5;

        if (customerBuys) {
          /* Customer buys from us at our ask => we SOLD at ask */
          const edge = roundAsk - newTheo; // positive half-spread
          newInventory -= 1;
          newCostBasis -= roundAsk; // we received roundAsk (negative cost)
          newRealizedEdge += edge;
          newTrades = [
            ...prev.trades,
            {
              round: nextRound,
              side: 'sold' as const,
              price: roundAsk,
              quantity: 1,
              cumRealizedEdge: newRealizedEdge,
            },
          ];
        } else {
          /* Customer sells to us at our bid => we BOUGHT at bid */
          const edge = newTheo - roundBid; // positive half-spread
          newInventory += 1;
          newCostBasis += roundBid; // we paid roundBid
          newRealizedEdge += edge;
          newTrades = [
            ...prev.trades,
            {
              round: nextRound,
              side: 'bought' as const,
              price: roundBid,
              quantity: 1,
              cumRealizedEdge: newRealizedEdge,
            },
          ];
        }
      }

      const newHistory: RoundData[] = [
        ...prev.history,
        {
          round: nextRound,
          stockPrice: parseFloat(newS.toFixed(4)),
          theoValue: parseFloat(newTheo.toFixed(4)),
          bid: parseFloat(roundBid.toFixed(4)),
          ask: parseFloat(roundAsk.toFixed(4)),
        },
      ];

      return {
        currentRound: nextRound,
        stockPrice: newS,
        remainingTime: newRemaining,
        inventory: newInventory,
        costBasis: newCostBasis,
        realizedEdge: newRealizedEdge,
        trades: newTrades,
        history: newHistory,
      };
    });
  }, [settings, spreadWidth, bidOffset]);

  /* ── Auto-play controls ── */
  const startAutoPlay = useCallback(() => {
    if (autoPlayRef.current) return;
    setAutoPlaying(true);
    autoPlayRef.current = setInterval(() => {
      advanceRound();
    }, 400);
  }, [advanceRound]);

  const stopAutoPlay = useCallback(() => {
    setAutoPlaying(false);
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
      autoPlayRef.current = null;
    }
  }, []);

  /* Stop auto-play on game over */
  if (gameOver && autoPlayRef.current) {
    stopAutoPlay();
  }

  /* ── Start / Reset ── */
  const startGame = useCallback(() => {
    stopAutoPlay();
    setGameStarted(true);
    setGame(makeInitialGameState(settings));
  }, [settings, stopAutoPlay]);

  const resetGame = useCallback(() => {
    stopAutoPlay();
    setGameStarted(false);
    setGame(makeInitialGameState(settings));
  }, [settings, stopAutoPlay]);

  /* ── Pre-game: show settings ── */
  if (!gameStarted) {
    return (
      <div className="mx-auto max-w-lg">
        <SettingsPanel
          settings={settings}
          onSettingsChange={setSettings}
          onStart={startGame}
        />
      </div>
    );
  }

  /* ── In-game UI ── */
  return (
    <div className="space-y-4">
      {/* Scoreboard */}
      <Scoreboard
        round={game.currentRound}
        totalRounds={settings.numRounds}
        stockPrice={game.stockPrice}
        theoValue={theoValue}
        bid={bid}
        ask={ask}
        inventory={game.inventory}
        realizedEdge={game.realizedEdge}
        unrealizedPnL={unrealizedPnL}
      />

      {/* Controls */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Quote Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <SliderInput
              label="Spread Width"
              min={0.01}
              max={2.0}
              step={0.01}
              value={spreadWidth}
              onChange={setSpreadWidth}
              precision={2}
            />
            <SliderInput
              label="Bid/Ask Offset from Theo"
              min={-1.0}
              max={1.0}
              step={0.01}
              value={bidOffset}
              onChange={setBidOffset}
              precision={2}
            />
            <Separator />
            <div className="text-xs text-muted-foreground">
              <p>
                Bid:{' '}
                <span className="font-mono font-medium">
                  {bid.toFixed(4)}
                </span>
                {' | '}
                Ask:{' '}
                <span className="font-mono font-medium">
                  {ask.toFixed(4)}
                </span>
                {' | '}
                Spread:{' '}
                <span className="font-mono font-medium">
                  {spreadWidth.toFixed(2)}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Game Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={advanceRound}
                disabled={gameOver || autoPlaying}
                size="sm"
              >
                <SkipForward className="mr-1 h-3 w-3" />
                Next Round
              </Button>
              {!autoPlaying ? (
                <Button
                  onClick={startAutoPlay}
                  disabled={gameOver}
                  variant="secondary"
                  size="sm"
                >
                  <Play className="mr-1 h-3 w-3" />
                  Auto-Play
                </Button>
              ) : (
                <Button
                  onClick={stopAutoPlay}
                  variant="secondary"
                  size="sm"
                >
                  <Pause className="mr-1 h-3 w-3" />
                  Pause
                </Button>
              )}
              <Button onClick={resetGame} variant="outline" size="sm">
                <RotateCcw className="mr-1 h-3 w-3" />
                New Game
              </Button>
            </div>

            {gameOver && (
              <div className="rounded border border-dashed p-3">
                <p className="text-sm font-semibold">Game Over!</p>
                <p className="text-xs text-muted-foreground">
                  Final P&L:{' '}
                  <span
                    className={`font-mono font-bold ${
                      game.realizedEdge + unrealizedPnL > 0.005
                        ? 'text-green-600'
                        : game.realizedEdge + unrealizedPnL < -0.005
                          ? 'text-red-600'
                          : ''
                    }`}
                  >
                    {game.realizedEdge + unrealizedPnL >= 0 ? '+' : ''}
                    {(game.realizedEdge + unrealizedPnL).toFixed(4)}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Trades: {game.trades.length} | Final Inventory:{' '}
                  {game.inventory}
                </p>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              <p>
                Time remaining:{' '}
                <span className="font-mono">
                  {game.remainingTime.toFixed(4)}y
                </span>
              </p>
              <p>
                Order prob:{' '}
                <span className="font-mono">
                  {settings.orderProbability}
                </span>
                {' | '}
                Vol:{' '}
                <span className="font-mono">{settings.volatility}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart and Trade Log */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PriceChart
            history={game.history}
            currentBid={bid}
            currentAsk={ask}
          />
        </div>
        <div>
          <TradeLog trades={game.trades} />
        </div>
      </div>
    </div>
  );
}
