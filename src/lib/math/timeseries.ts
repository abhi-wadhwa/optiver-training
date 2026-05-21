import { mean, variance } from './statistics';
import { ols } from './regression';

export function ewmaVariance(returns: number[], lambda: number): number[] {
  const n = returns.length;
  const variances = new Array(n);

  // Initialize with sample variance
  let v = 0;
  for (let i = 0; i < n; i++) v += returns[i] * returns[i];
  v /= n;

  variances[0] = v;
  for (let t = 1; t < n; t++) {
    v = lambda * v + (1 - lambda) * returns[t - 1] * returns[t - 1];
    variances[t] = v;
  }

  return variances;
}

export interface GARCHParams {
  omega: number;
  alpha: number;
  beta: number;
}

export function garchVariance(returns: number[], params: GARCHParams): number[] {
  const { omega, alpha, beta } = params;
  const n = returns.length;
  const variances = new Array(n);

  // Initialize with unconditional variance
  let v = omega / (1 - alpha - beta);
  if (!isFinite(v) || v <= 0) {
    v = 0;
    for (let i = 0; i < n; i++) v += returns[i] * returns[i];
    v /= n;
  }

  variances[0] = v;
  for (let t = 1; t < n; t++) {
    v = omega + alpha * returns[t - 1] * returns[t - 1] + beta * v;
    variances[t] = v;
  }

  return variances;
}

export function garchLogLikelihood(returns: number[], params: GARCHParams): number {
  const variances = garchVariance(returns, params);
  let ll = 0;

  for (let t = 0; t < returns.length; t++) {
    const sigma2 = variances[t];
    if (sigma2 <= 0) return -Infinity;
    ll += -0.5 * (Math.log(sigma2) + (returns[t] * returns[t]) / sigma2);
  }

  return ll;
}

// Nelder-Mead simplex optimization
function nelderMead(
  fn: (x: number[]) => number,
  initial: number[],
  maxIter: number,
  tol: number
): number[] {
  const n = initial.length;
  const alpha = 1.0;
  const gamma = 2.0;
  const rho = 0.5;
  const sigma = 0.5;

  // Initialize simplex
  const simplex: { point: number[]; value: number }[] = [];

  const initialValue = fn(initial);
  simplex.push({ point: [...initial], value: initialValue });

  for (let i = 0; i < n; i++) {
    const point = [...initial];
    point[i] += point[i] !== 0 ? 0.05 * Math.abs(point[i]) : 0.00025;
    simplex.push({ point, value: fn(point) });
  }

  for (let iter = 0; iter < maxIter; iter++) {
    simplex.sort((a, b) => a.value - b.value);

    // Check convergence
    const best = simplex[0].value;
    const worst = simplex[n].value;
    if (Math.abs(worst - best) < tol) break;

    // Centroid (excluding worst)
    const centroid = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        centroid[j] += simplex[i].point[j];
      }
    }
    for (let j = 0; j < n; j++) centroid[j] /= n;

    // Reflection
    const reflected = centroid.map((c, j) => c + alpha * (c - simplex[n].point[j]));
    const reflectedValue = fn(reflected);

    if (reflectedValue < simplex[n - 1].value && reflectedValue >= simplex[0].value) {
      simplex[n] = { point: reflected, value: reflectedValue };
      continue;
    }

    if (reflectedValue < simplex[0].value) {
      // Expansion
      const expanded = centroid.map((c, j) => c + gamma * (reflected[j] - c));
      const expandedValue = fn(expanded);
      if (expandedValue < reflectedValue) {
        simplex[n] = { point: expanded, value: expandedValue };
      } else {
        simplex[n] = { point: reflected, value: reflectedValue };
      }
      continue;
    }

    // Contraction
    const contracted = centroid.map((c, j) => c + rho * (simplex[n].point[j] - c));
    const contractedValue = fn(contracted);

    if (contractedValue < simplex[n].value) {
      simplex[n] = { point: contracted, value: contractedValue };
      continue;
    }

    // Shrink
    for (let i = 1; i <= n; i++) {
      for (let j = 0; j < n; j++) {
        simplex[i].point[j] = simplex[0].point[j] + sigma * (simplex[i].point[j] - simplex[0].point[j]);
      }
      simplex[i].value = fn(simplex[i].point);
    }
  }

  simplex.sort((a, b) => a.value - b.value);
  return simplex[0].point;
}

export function fitGARCH(returns: number[], initialGuess?: GARCHParams): GARCHParams {
  const sampleVar = variance(returns, 0);

  const init = initialGuess ?? {
    omega: sampleVar * (1 - 0.85 - 0.1),
    alpha: 0.1,
    beta: 0.85,
  };

  const objectiveFn = (x: number[]): number => {
    const omega = Math.abs(x[0]);
    const alpha = Math.max(0, Math.min(x[1], 0.999));
    const beta = Math.max(0, Math.min(x[2], 0.999));

    if (alpha + beta >= 1) return 1e10;
    if (omega <= 0) return 1e10;

    const params: GARCHParams = { omega, alpha, beta };
    const ll = garchLogLikelihood(returns, params);

    return isFinite(ll) ? -ll : 1e10;
  };

  const result = nelderMead(objectiveFn, [init.omega, init.alpha, init.beta], 5000, 1e-10);

  return {
    omega: Math.abs(result[0]),
    alpha: Math.max(0, result[1]),
    beta: Math.max(0, result[2]),
  };
}

// h-step forecast: sigma^2_{t+h} = V_L + (alpha+beta)^{h-1} * (sigma^2_{t+1} - V_L)
export function garchForecast(params: GARCHParams, currentVariance: number, horizon: number): number[] {
  const vl = garchLongRunVariance(params);
  const persistence = params.alpha + params.beta;
  const forecasts = new Array(horizon);

  for (let h = 0; h < horizon; h++) {
    if (persistence >= 1) {
      // IGARCH: variance grows linearly
      forecasts[h] = currentVariance + params.omega * (h + 1);
    } else {
      forecasts[h] = vl + Math.pow(persistence, h) * (currentVariance - vl);
    }
  }

  return forecasts;
}

export function garchLongRunVariance(params: GARCHParams): number {
  const { omega, alpha, beta } = params;
  const persistence = alpha + beta;
  if (persistence >= 1) return Infinity;
  return omega / (1 - persistence);
}

export function garchHalfLife(params: GARCHParams): number {
  const persistence = params.alpha + params.beta;
  if (persistence >= 1) return Infinity;
  return Math.log(2) / Math.log(1 / persistence);
}

export function autocorrelation(data: number[], maxLag: number): number[] {
  const n = data.length;
  const m = mean(data);
  const result = new Array(maxLag + 1);

  let var0 = 0;
  for (let i = 0; i < n; i++) var0 += (data[i] - m) ** 2;

  for (let lag = 0; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i < n - lag; i++) {
      sum += (data[i] - m) * (data[i + lag] - m);
    }
    result[lag] = var0 === 0 ? 0 : sum / var0;
  }

  return result;
}

// Simple ADF test: regress delta(y_t) on y_{t-1}, check if coefficient is significantly negative
export function adfTest(data: number[]): { statistic: number; criticalValue5Pct: number; isStationary: boolean } {
  const n = data.length;

  // delta(y_t) = y_t - y_{t-1}
  const dy = new Array(n - 1);
  for (let i = 1; i < n; i++) dy[i - 1] = data[i] - data[i - 1];

  // Regress dy on y_{t-1}
  const X: number[][] = [];
  const y: number[] = [];
  for (let i = 0; i < dy.length; i++) {
    X.push([data[i]]);
    y.push(dy[i]);
  }

  const result = ols(X, y);

  // t-statistic for the y_{t-1} coefficient (index 1, since index 0 is intercept)
  const betaHat = result.coefficients[1];
  const residuals = result.residuals;
  const nObs = residuals.length;
  const k = result.coefficients.length;

  let sse = 0;
  for (let i = 0; i < nObs; i++) sse += residuals[i] ** 2;
  const s2 = sse / (nObs - k);

  // Need (X'X)^{-1} for standard error
  // X_aug includes intercept column
  const Xa = X.map(row => [1, ...row]);
  let sumX2 = 0;
  let sumX = 0;
  let sumConst = 0;
  for (let i = 0; i < nObs; i++) {
    sumX2 += Xa[i][1] * Xa[i][1];
    sumX += Xa[i][1];
    sumConst += 1;
  }

  // (X'X)^{-1} for 2x2 matrix
  const det = sumConst * sumX2 - sumX * sumX;
  const varBeta1 = det === 0 ? 0 : s2 * sumConst / det;
  const seBeta1 = Math.sqrt(Math.max(0, varBeta1));

  const tStat = seBeta1 === 0 ? 0 : betaHat / seBeta1;

  // MacKinnon critical value for ADF at 5% (with constant, no trend)
  // Approximate: -2.86 for large samples
  const criticalValue = -2.86;

  return {
    statistic: tStat,
    criticalValue5Pct: criticalValue,
    isStationary: tStat < criticalValue,
  };
}
