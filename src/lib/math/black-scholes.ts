import { normalCDF, normalPDF } from './normal-dist';

export interface BSInputs {
  S: number;
  K: number;
  T: number;
  r: number;
  sigma: number;
  q?: number;
}

export interface BSGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

export interface BSResult {
  callPrice: number;
  putPrice: number;
  d1: number;
  d2: number;
  callGreeks: BSGreeks;
  putGreeks: BSGreeks;
}

export function blackScholes(inputs: BSInputs): BSResult {
  const { S, K, T, r, sigma, q = 0 } = inputs;

  if (T <= 0) {
    const callIntrinsic = Math.max(S - K, 0);
    const putIntrinsic = Math.max(K - S, 0);
    return {
      callPrice: callIntrinsic,
      putPrice: putIntrinsic,
      d1: S > K ? Infinity : S < K ? -Infinity : 0,
      d2: S > K ? Infinity : S < K ? -Infinity : 0,
      callGreeks: { delta: S > K ? 1 : 0, gamma: 0, theta: 0, vega: 0, rho: 0 },
      putGreeks: { delta: S > K ? 0 : -1, gamma: 0, theta: 0, vega: 0, rho: 0 },
    };
  }

  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r - q + (sigma * sigma) / 2) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;

  const Nd1 = normalCDF(d1);
  const Nd2 = normalCDF(d2);
  const nd1 = normalPDF(d1);
  const NnegD1 = normalCDF(-d1);
  const NnegD2 = normalCDF(-d2);

  const discountFactor = Math.exp(-r * T);
  const dividendFactor = Math.exp(-q * T);

  const callPrice = S * dividendFactor * Nd1 - K * discountFactor * Nd2;
  const putPrice = K * discountFactor * NnegD2 - S * dividendFactor * NnegD1;

  const gamma = (dividendFactor * nd1) / (S * sigma * sqrtT);
  const vega = S * dividendFactor * nd1 * sqrtT / 100; // per 1% vol move

  const callDelta = dividendFactor * Nd1;
  const putDelta = -dividendFactor * NnegD1;

  const callTheta =
    (-(S * dividendFactor * nd1 * sigma) / (2 * sqrtT) -
      r * K * discountFactor * Nd2 +
      q * S * dividendFactor * Nd1) / 365;
  const putTheta =
    (-(S * dividendFactor * nd1 * sigma) / (2 * sqrtT) +
      r * K * discountFactor * NnegD2 -
      q * S * dividendFactor * NnegD1) / 365;

  const callRho = (K * T * discountFactor * Nd2) / 100;
  const putRho = -(K * T * discountFactor * NnegD2) / 100;

  return {
    callPrice,
    putPrice,
    d1,
    d2,
    callGreeks: { delta: callDelta, gamma, theta: callTheta, vega, rho: callRho },
    putGreeks: { delta: putDelta, gamma, theta: putTheta, vega, rho: putRho },
  };
}

export function impliedVolatility(
  marketPrice: number,
  S: number,
  K: number,
  T: number,
  r: number,
  type: 'call' | 'put',
  q = 0,
  maxIter = 100,
  tol = 1e-8
): number | null {
  let sigma = 0.25;

  for (let i = 0; i < maxIter; i++) {
    const result = blackScholes({ S, K, T, r, sigma, q });
    const price = type === 'call' ? result.callPrice : result.putPrice;
    const diff = price - marketPrice;

    if (Math.abs(diff) < tol) return sigma;

    const vegaRaw = S * Math.exp(-q * T) * normalPDF(result.d1) * Math.sqrt(T);
    if (Math.abs(vegaRaw) < 1e-12) return null;

    sigma -= diff / vegaRaw;
    if (sigma <= 0) sigma = 0.001;
    if (sigma > 5) return null;
  }

  return null;
}

export function forwardPrice(S: number, r: number, T: number, q = 0): number {
  return S * Math.exp((r - q) * T);
}

export function putCallParity(
  type: 'call' | 'put' | 'spot' | 'strike',
  known: {
    callPrice?: number;
    putPrice?: number;
    spot?: number;
    strike?: number;
    r: number;
    T: number;
  }
): number {
  const { callPrice: C, putPrice: P, spot: S, strike: K, r, T } = known;
  const df = Math.exp(-r * T);

  switch (type) {
    case 'call':
      return P! + S! - K! * df;
    case 'put':
      return C! - S! + K! * df;
    case 'spot':
      return C! - P! + K! * df;
    case 'strike':
      return (S! + P! - C!) / df;
  }
}
