import {
  covarianceMatrix,
  eigenDecomposition,
  mean as arrayMean,
  matMul,
  matTranspose,
  matScale,
  matAdd,
  identity,
  conditionNumber,
} from './statistics';

export interface PCAResult {
  components: number[][];
  eigenvalues: number[];
  explainedVarianceRatio: number[];
  transformed: number[][];
  mean: number[];
}

export function pca(data: number[][], nComponents?: number): PCAResult {
  const n = data.length;
  const p = data[0].length;
  const nc = nComponents ?? p;

  // Column means
  const colMeans = new Array(p);
  for (let j = 0; j < p; j++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += data[i][j];
    colMeans[j] = sum / n;
  }

  // Center data
  const centered: number[][] = data.map(row =>
    row.map((val, j) => val - colMeans[j])
  );

  const cov = covarianceMatrix(data);
  const { values, vectors } = eigenDecomposition(cov);

  // eigenvalues and vectors are already sorted descending
  const eigenvalues = values.slice(0, nc);
  const totalVariance = values.reduce((s, v) => s + v, 0);
  const explainedVarianceRatio = eigenvalues.map(v =>
    totalVariance === 0 ? 0 : v / totalVariance
  );

  // components: each row is a principal component direction (eigenvector transposed)
  // vectors columns are eigenvectors, so components[k] = vectors column k
  const components: number[][] = [];
  for (let k = 0; k < nc; k++) {
    const comp = new Array(p);
    for (let j = 0; j < p; j++) {
      comp[j] = vectors[j][k];
    }
    components.push(comp);
  }

  // Project: transformed = centered * components^T (each component is a row)
  // components is nc x p, we need projection matrix p x nc
  const projectionMatrix: number[][] = Array.from({ length: p }, (_, j) =>
    Array.from({ length: nc }, (_, k) => components[k][j])
  );

  const transformed = matMul(centered, projectionMatrix);

  return {
    components,
    eigenvalues,
    explainedVarianceRatio,
    transformed,
    mean: colMeans,
  };
}

export function ledoitWolfShrinkage(data: number[][]): {
  shrunkCovariance: number[][];
  shrinkageIntensity: number;
  sampleCovariance: number[][];
} {
  const n = data.length;
  const p = data[0].length;

  // Column means
  const colMeans = new Array(p);
  for (let j = 0; j < p; j++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += data[i][j];
    colMeans[j] = sum / n;
  }

  // Centered data
  const X: number[][] = data.map(row =>
    row.map((val, j) => val - colMeans[j])
  );

  // Sample covariance S = X'X / (n-1)
  const S = covarianceMatrix(data);

  // Target: mu * I where mu = trace(S) / p
  let traceS = 0;
  for (let i = 0; i < p; i++) traceS += S[i][i];
  const mu = traceS / p;

  // Compute shrinkage intensity using Ledoit-Wolf (2004) analytical formula
  // sum of squared Frobenius norm of S - mu*I
  let sumSqOffDiag = 0;
  for (let i = 0; i < p; i++) {
    for (let j = 0; j < p; j++) {
      const target = i === j ? mu : 0;
      sumSqOffDiag += (S[i][j] - target) ** 2;
    }
  }

  // Compute sum of (x_k x_k' - S)^2 terms for the numerator
  // pi_hat = (1/n) * sum_k ||x_k x_k' - S||_F^2
  // This is: (1/n) sum_k sum_ij (x_ki * x_kj - S_ij)^2
  let piHat = 0;
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < p; i++) {
      for (let j = 0; j < p; j++) {
        const diff = X[k][i] * X[k][j] - S[i][j] * (n - 1) / n;
        piHat += diff * diff;
      }
    }
  }
  piHat /= (n * n);

  // delta = piHat / sumSqOffDiag (using n-scaled covariance for consistency)
  // Rescale: the sample covariance uses (n-1), need to be careful
  // The analytical formula gives delta in [0, 1]
  let delta = piHat / sumSqOffDiag;
  delta = Math.max(0, Math.min(1, delta));

  // Shrunk covariance: (1 - delta) * S + delta * mu * I
  const target = matScale(identity(p), mu);
  const shrunkCovariance = matAdd(matScale(S, 1 - delta), matScale(target, delta));

  return {
    shrunkCovariance,
    shrinkageIntensity: delta,
    sampleCovariance: S,
  };
}
