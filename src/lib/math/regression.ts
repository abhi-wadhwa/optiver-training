import { matMul, matTranspose, matInverse, matAdd, matScale, identity, mean, variance } from './statistics';

export interface RegressionResult {
  coefficients: number[];
  residuals: number[];
  rSquared: number;
  predictions: number[];
}

function addInterceptColumn(X: number[][]): number[][] {
  return X.map(row => [1, ...row]);
}

function computeRSquared(y: number[], predictions: number[]): number {
  const yMean = mean(y);
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < y.length; i++) {
    ssRes += (y[i] - predictions[i]) ** 2;
    ssTot += (y[i] - yMean) ** 2;
  }
  return ssTot === 0 ? 0 : 1 - ssRes / ssTot;
}

function predictFromCoefficients(X: number[][], coefficients: number[]): number[] {
  return X.map(row => {
    let sum = 0;
    for (let j = 0; j < row.length; j++) sum += row[j] * coefficients[j];
    return sum;
  });
}

export function ols(X: number[][], y: number[]): RegressionResult {
  const Xa = addInterceptColumn(X);
  const Xt = matTranspose(Xa);
  const XtX = matMul(Xt, Xa);
  const XtXinv = matInverse(XtX);
  const yCol = y.map(v => [v]);
  const Xty = matMul(Xt, yCol);
  const betaCol = matMul(XtXinv, Xty);
  const coefficients = betaCol.map(row => row[0]);

  const predictions = predictFromCoefficients(Xa, coefficients);
  const residuals = y.map((yi, i) => yi - predictions[i]);
  const rSquared = computeRSquared(y, predictions);

  return { coefficients, residuals, rSquared, predictions };
}

export function ridgeRegression(X: number[][], y: number[], lambda: number): RegressionResult {
  const Xa = addInterceptColumn(X);
  const Xt = matTranspose(Xa);
  const XtX = matMul(Xt, Xa);
  const p = XtX.length;
  const penalty = matScale(identity(p), lambda);
  // Don't penalize intercept
  penalty[0][0] = 0;
  const XtXreg = matAdd(XtX, penalty);
  const XtXinv = matInverse(XtXreg);
  const yCol = y.map(v => [v]);
  const Xty = matMul(Xt, yCol);
  const betaCol = matMul(XtXinv, Xty);
  const coefficients = betaCol.map(row => row[0]);

  const predictions = predictFromCoefficients(Xa, coefficients);
  const residuals = y.map((yi, i) => yi - predictions[i]);
  const rSquared = computeRSquared(y, predictions);

  return { coefficients, residuals, rSquared, predictions };
}

function softThreshold(z: number, gamma: number): number {
  if (z > gamma) return z - gamma;
  if (z < -gamma) return z + gamma;
  return 0;
}

export function lassoRegression(
  X: number[][],
  y: number[],
  lambda: number,
  maxIter = 1000,
  tol = 1e-6
): RegressionResult {
  const n = X.length;
  const pOrig = X[0].length;

  // Standardize features (not intercept)
  const featureMeans = new Array(pOrig);
  const featureStds = new Array(pOrig);
  for (let j = 0; j < pOrig; j++) {
    const col: number[] = new Array(n);
    for (let i = 0; i < n; i++) col[i] = X[i][j];
    featureMeans[j] = mean(col);
    featureStds[j] = Math.sqrt(variance(col, 0));
    if (featureStds[j] < 1e-15) featureStds[j] = 1;
  }

  const Xs: number[][] = X.map(row =>
    row.map((val, j) => (val - featureMeans[j]) / featureStds[j])
  );

  const yMean = mean(y);
  const yc = y.map(v => v - yMean);

  const p = pOrig;
  const beta = new Array(p).fill(0);

  // Precompute column norms
  const colNormSq = new Array(p);
  for (let j = 0; j < p; j++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += Xs[i][j] * Xs[i][j];
    colNormSq[j] = sum;
  }

  for (let iter = 0; iter < maxIter; iter++) {
    let maxChange = 0;

    for (let j = 0; j < p; j++) {
      let residualDotXj = 0;
      for (let i = 0; i < n; i++) {
        let pred = 0;
        for (let k = 0; k < p; k++) {
          if (k !== j) pred += Xs[i][k] * beta[k];
        }
        residualDotXj += Xs[i][j] * (yc[i] - pred);
      }

      const oldBeta = beta[j];
      if (colNormSq[j] < 1e-15) {
        beta[j] = 0;
      } else {
        beta[j] = softThreshold(residualDotXj, lambda * n) / colNormSq[j];
      }

      maxChange = Math.max(maxChange, Math.abs(beta[j] - oldBeta));
    }

    if (maxChange < tol) break;
  }

  // Transform back to original scale
  const coefficients = new Array(pOrig + 1);
  let interceptAdjust = 0;
  for (let j = 0; j < pOrig; j++) {
    coefficients[j + 1] = beta[j] / featureStds[j];
    interceptAdjust += coefficients[j + 1] * featureMeans[j];
  }
  coefficients[0] = yMean - interceptAdjust;

  const Xa = addInterceptColumn(X);
  const predictions = predictFromCoefficients(Xa, coefficients);
  const residuals = y.map((yi, i) => yi - predictions[i]);
  const rSquared = computeRSquared(y, predictions);

  return { coefficients, residuals, rSquared, predictions };
}

export function elasticNet(
  X: number[][],
  y: number[],
  lambda: number,
  alpha: number,
  maxIter = 1000
): RegressionResult {
  const n = X.length;
  const pOrig = X[0].length;
  const tol = 1e-6;

  const featureMeans = new Array(pOrig);
  const featureStds = new Array(pOrig);
  for (let j = 0; j < pOrig; j++) {
    const col: number[] = new Array(n);
    for (let i = 0; i < n; i++) col[i] = X[i][j];
    featureMeans[j] = mean(col);
    featureStds[j] = Math.sqrt(variance(col, 0));
    if (featureStds[j] < 1e-15) featureStds[j] = 1;
  }

  const Xs: number[][] = X.map(row =>
    row.map((val, j) => (val - featureMeans[j]) / featureStds[j])
  );

  const yMean = mean(y);
  const yc = y.map(v => v - yMean);

  const p = pOrig;
  const beta = new Array(p).fill(0);

  const colNormSq = new Array(p);
  for (let j = 0; j < p; j++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += Xs[i][j] * Xs[i][j];
    colNormSq[j] = sum;
  }

  for (let iter = 0; iter < maxIter; iter++) {
    let maxChange = 0;

    for (let j = 0; j < p; j++) {
      let residualDotXj = 0;
      for (let i = 0; i < n; i++) {
        let pred = 0;
        for (let k = 0; k < p; k++) {
          if (k !== j) pred += Xs[i][k] * beta[k];
        }
        residualDotXj += Xs[i][j] * (yc[i] - pred);
      }

      const oldBeta = beta[j];
      const denom = colNormSq[j] + lambda * (1 - alpha) * n;
      if (denom < 1e-15) {
        beta[j] = 0;
      } else {
        beta[j] = softThreshold(residualDotXj, lambda * alpha * n) / denom;
      }

      maxChange = Math.max(maxChange, Math.abs(beta[j] - oldBeta));
    }

    if (maxChange < tol) break;
  }

  const coefficients = new Array(pOrig + 1);
  let interceptAdjust = 0;
  for (let j = 0; j < pOrig; j++) {
    coefficients[j + 1] = beta[j] / featureStds[j];
    interceptAdjust += coefficients[j + 1] * featureMeans[j];
  }
  coefficients[0] = yMean - interceptAdjust;

  const Xa = addInterceptColumn(X);
  const predictions = predictFromCoefficients(Xa, coefficients);
  const residuals = y.map((yi, i) => yi - predictions[i]);
  const rSquared = computeRSquared(y, predictions);

  return { coefficients, residuals, rSquared, predictions };
}

export function biasVarianceDecomposition(
  xTrain: number[][],
  yTrain: number[],
  xTest: number[][],
  yTest: number[],
  fitFn: (X: number[][], y: number[]) => (x: number[]) => number,
  nBootstrap = 200
): { bias2: number; variance: number; noise: number; mse: number } {
  const nTest = xTest.length;
  const nTrain = xTrain.length;

  // predictions[b][i] = prediction of bootstrap model b on test point i
  const predictions: number[][] = [];

  for (let b = 0; b < nBootstrap; b++) {
    const bootstrapIndices = new Array(nTrain);
    for (let i = 0; i < nTrain; i++) {
      bootstrapIndices[i] = Math.floor(Math.random() * nTrain);
    }

    const xBoot = bootstrapIndices.map(idx => xTrain[idx]);
    const yBoot = bootstrapIndices.map(idx => yTrain[idx]);

    const predict = fitFn(xBoot, yBoot);
    const preds = xTest.map(x => predict(x));
    predictions.push(preds);
  }

  // Mean prediction for each test point
  const meanPredictions = new Array(nTest);
  for (let i = 0; i < nTest; i++) {
    let sum = 0;
    for (let b = 0; b < nBootstrap; b++) sum += predictions[b][i];
    meanPredictions[i] = sum / nBootstrap;
  }

  // Bias^2 = mean over test points of (mean_prediction - y_true)^2
  let bias2 = 0;
  for (let i = 0; i < nTest; i++) {
    bias2 += (meanPredictions[i] - yTest[i]) ** 2;
  }
  bias2 /= nTest;

  // Variance = mean over test points of var(predictions across bootstraps)
  let varianceTotal = 0;
  for (let i = 0; i < nTest; i++) {
    let sumSq = 0;
    for (let b = 0; b < nBootstrap; b++) {
      sumSq += (predictions[b][i] - meanPredictions[i]) ** 2;
    }
    varianceTotal += sumSq / nBootstrap;
  }
  varianceTotal /= nTest;

  // MSE = mean over test points of mean over bootstraps of (prediction - y_true)^2
  let mse = 0;
  for (let i = 0; i < nTest; i++) {
    let sumSq = 0;
    for (let b = 0; b < nBootstrap; b++) {
      sumSq += (predictions[b][i] - yTest[i]) ** 2;
    }
    mse += sumSq / nBootstrap;
  }
  mse /= nTest;

  const noise = mse - bias2 - varianceTotal;

  return { bias2, variance: varianceTotal, noise, mse };
}
