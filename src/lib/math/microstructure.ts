export interface OrderBookLevel {
  price: number;
  size: number;
}

export interface OrderBook {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

export interface Trade {
  time: number;
  price: number;
  size: number;
  side: 'buy' | 'sell';
}

export function midPrice(book: OrderBook): number {
  return (book.bids[0].price + book.asks[0].price) / 2;
}

export function weightedMidPrice(book: OrderBook): number {
  const bid = book.bids[0];
  const ask = book.asks[0];
  const totalSize = bid.size + ask.size;
  if (totalSize === 0) return (bid.price + ask.price) / 2;
  return (bid.price * bid.size + ask.price * ask.size) / totalSize;
}

// P_ask * Vb/(Vb+Va) + P_bid * Va/(Vb+Va)
export function stoikovMicroPrice(book: OrderBook): number {
  const vb = book.bids[0].size;
  const va = book.asks[0].size;
  const total = vb + va;
  if (total === 0) return midPrice(book);
  return book.asks[0].price * (vb / total) + book.bids[0].price * (va / total);
}

export function orderFlowImbalance(book: OrderBook): number {
  const vb = book.bids[0].size;
  const va = book.asks[0].size;
  const total = vb + va;
  if (total === 0) return 0.5;
  return vb / total;
}

export function spread(book: OrderBook): number {
  return book.asks[0].price - book.bids[0].price;
}

export function vwap(levels: OrderBookLevel[], targetSize: number): number {
  let remaining = targetSize;
  let totalCost = 0;

  for (const level of levels) {
    const fillSize = Math.min(remaining, level.size);
    totalCost += fillSize * level.price;
    remaining -= fillSize;
    if (remaining <= 0) break;
  }

  const filled = targetSize - remaining;
  if (filled === 0) return 0;
  return totalCost / filled;
}

export function kyleImpact(lambda: number, quantity: number): number {
  return lambda * Math.sign(quantity) * Math.sqrt(Math.abs(quantity));
}

export interface LOBSimParams {
  initialMid: number;
  tickSize: number;
  initialSpread: number;
  volatility: number;
  limitArrivalRate: number;
  marketArrivalRate: number;
  cancelRate: number;
  nLevels: number;
  steps: number;
}

export interface LOBSnapshot {
  book: OrderBook;
  mid: number;
  microPrice: number;
  ofi: number;
  trades: Trade[];
}

function poissonSample(lambda: number): number {
  let L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

// Box-Muller transform for standard normal
function normalRandom(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function roundToTick(price: number, tickSize: number): number {
  return Math.round(price / tickSize) * tickSize;
}

interface InternalOrder {
  price: number;
  size: number;
  id: number;
}

export function simulateLOB(params: LOBSimParams): LOBSnapshot[] {
  const {
    initialMid,
    tickSize,
    initialSpread,
    volatility,
    limitArrivalRate,
    marketArrivalRate,
    cancelRate,
    nLevels,
    steps,
  } = params;

  let trueMid = initialMid;
  let orderId = 0;

  let bidOrders: InternalOrder[] = [];
  let askOrders: InternalOrder[] = [];

  // Initialize order book with nLevels on each side
  const halfSpread = initialSpread / 2;
  for (let i = 0; i < nLevels; i++) {
    const bidPrice = roundToTick(trueMid - halfSpread - i * tickSize, tickSize);
    const askPrice = roundToTick(trueMid + halfSpread + i * tickSize, tickSize);
    const size = Math.floor(Math.random() * 50) + 10;
    bidOrders.push({ price: bidPrice, size, id: orderId++ });
    askOrders.push({ price: askPrice, size, id: orderId++ });
  }

  const snapshots: LOBSnapshot[] = [];

  for (let step = 0; step < steps; step++) {
    const stepTrades: Trade[] = [];

    // 1. Random walk the true mid
    trueMid += volatility * normalRandom();

    // 2. Cancel orders
    bidOrders = bidOrders.filter(() => Math.random() > cancelRate);
    askOrders = askOrders.filter(() => Math.random() > cancelRate);

    // 3. Add new limit orders
    const nNewBids = poissonSample(limitArrivalRate);
    for (let i = 0; i < nNewBids; i++) {
      const offset = Math.floor(Math.random() * nLevels) + 1;
      const price = roundToTick(trueMid - offset * tickSize, tickSize);
      const size = Math.floor(Math.random() * 30) + 5;
      bidOrders.push({ price, size, id: orderId++ });
    }

    const nNewAsks = poissonSample(limitArrivalRate);
    for (let i = 0; i < nNewAsks; i++) {
      const offset = Math.floor(Math.random() * nLevels) + 1;
      const price = roundToTick(trueMid + offset * tickSize, tickSize);
      const size = Math.floor(Math.random() * 30) + 5;
      askOrders.push({ price, size, id: orderId++ });
    }

    // 4. Market orders
    const nMarketBuys = poissonSample(marketArrivalRate / 2);
    for (let m = 0; m < nMarketBuys; m++) {
      // Sort asks ascending to walk the book
      askOrders.sort((a, b) => a.price - b.price);
      let remaining = Math.floor(Math.random() * 20) + 1;

      for (let i = 0; i < askOrders.length && remaining > 0; i++) {
        const fill = Math.min(remaining, askOrders[i].size);
        stepTrades.push({
          time: step,
          price: askOrders[i].price,
          size: fill,
          side: 'buy',
        });
        askOrders[i].size -= fill;
        remaining -= fill;
      }

      askOrders = askOrders.filter(o => o.size > 0);
    }

    const nMarketSells = poissonSample(marketArrivalRate / 2);
    for (let m = 0; m < nMarketSells; m++) {
      // Sort bids descending to walk the book
      bidOrders.sort((a, b) => b.price - a.price);
      let remaining = Math.floor(Math.random() * 20) + 1;

      for (let i = 0; i < bidOrders.length && remaining > 0; i++) {
        const fill = Math.min(remaining, bidOrders[i].size);
        stepTrades.push({
          time: step,
          price: bidOrders[i].price,
          size: fill,
          side: 'sell',
        });
        bidOrders[i].size -= fill;
        remaining -= fill;
      }

      bidOrders = bidOrders.filter(o => o.size > 0);
    }

    // Ensure there's at least one level on each side
    if (bidOrders.length === 0) {
      const price = roundToTick(trueMid - tickSize, tickSize);
      bidOrders.push({ price, size: 10, id: orderId++ });
    }
    if (askOrders.length === 0) {
      const price = roundToTick(trueMid + tickSize, tickSize);
      askOrders.push({ price, size: 10, id: orderId++ });
    }

    // Aggregate by price level for the snapshot
    const bidMap = new Map<number, number>();
    for (const o of bidOrders) {
      bidMap.set(o.price, (bidMap.get(o.price) ?? 0) + o.size);
    }
    const askMap = new Map<number, number>();
    for (const o of askOrders) {
      askMap.set(o.price, (askMap.get(o.price) ?? 0) + o.size);
    }

    const bids: OrderBookLevel[] = Array.from(bidMap.entries())
      .map(([price, size]) => ({ price, size }))
      .sort((a, b) => b.price - a.price)
      .slice(0, nLevels);

    const asks: OrderBookLevel[] = Array.from(askMap.entries())
      .map(([price, size]) => ({ price, size }))
      .sort((a, b) => a.price - b.price)
      .slice(0, nLevels);

    // Fix crossed book: remove bids >= best ask and asks <= best bid
    const bestAsk = asks[0]?.price ?? Infinity;
    const bestBid = bids[0]?.price ?? -Infinity;
    const cleanBids = bids.filter(b => b.price < bestAsk);
    const cleanAsks = asks.filter(a => a.price > bestBid);

    const book: OrderBook = {
      bids: cleanBids.length > 0 ? cleanBids : [{ price: roundToTick(trueMid - tickSize, tickSize), size: 10 }],
      asks: cleanAsks.length > 0 ? cleanAsks : [{ price: roundToTick(trueMid + tickSize, tickSize), size: 10 }],
    };

    const mid = midPrice(book);
    const micro = stoikovMicroPrice(book);
    const ofi = orderFlowImbalance(book);

    snapshots.push({
      book,
      mid,
      microPrice: micro,
      ofi,
      trades: stepTrades,
    });
  }

  return snapshots;
}
