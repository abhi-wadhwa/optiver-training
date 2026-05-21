export function matMul(A: number[][], B: number[][]): number[][] {
  const rowsA = A.length;
  const colsA = A[0].length;
  const colsB = B[0].length;
  const result: number[][] = Array.from({ length: rowsA }, () => new Array(colsB).fill(0));

  for (let i = 0; i < rowsA; i++) {
    for (let k = 0; k < colsA; k++) {
      const aik = A[i][k];
      for (let j = 0; j < colsB; j++) {
        result[i][j] += aik * B[k][j];
      }
    }
  }

  return result;
}

export function matTranspose(A: number[][]): number[][] {
  const rows = A.length;
  const cols = A[0].length;
  const result: number[][] = Array.from({ length: cols }, () => new Array(rows));

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      result[j][i] = A[i][j];
    }
  }

  return result;
}

export function matInverse(A: number[][]): number[][] {
  const n = A.length;
  const aug: number[][] = A.map((row, i) => {
    const extended = new Array(2 * n).fill(0);
    for (let j = 0; j < n; j++) extended[j] = row[j];
    extended[n + i] = 1;
    return extended;
  });

  for (let col = 0; col < n; col++) {
    let maxRow = col;
    let maxVal = Math.abs(aug[col][col]);
    for (let row = col + 1; row < n; row++) {
      const val = Math.abs(aug[row][col]);
      if (val > maxVal) {
        maxVal = val;
        maxRow = row;
      }
    }

    if (maxVal < 1e-14) {
      throw new Error('Matrix is singular or nearly singular');
    }

    if (maxRow !== col) {
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    }

    const pivot = aug[col][col];
    for (let j = 0; j < 2 * n; j++) {
      aug[col][j] /= pivot;
    }

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = 0; j < 2 * n; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  return aug.map(row => row.slice(n));
}

export function matAdd(A: number[][], B: number[][]): number[][] {
  return A.map((row, i) => row.map((val, j) => val + B[i][j]));
}

export function matScale(A: number[][], s: number): number[][] {
  return A.map(row => row.map(val => val * s));
}

export function identity(n: number): number[][] {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  );
}

export function mean(x: number[]): number {
  let sum = 0;
  for (let i = 0; i < x.length; i++) sum += x[i];
  return sum / x.length;
}

export function variance(x: number[], ddof = 1): number {
  const m = mean(x);
  let sumSq = 0;
  for (let i = 0; i < x.length; i++) {
    const d = x[i] - m;
    sumSq += d * d;
  }
  return sumSq / (x.length - ddof);
}

export function standardDev(x: number[], ddof = 1): number {
  return Math.sqrt(variance(x, ddof));
}

export function covariance(x: number[], y: number[]): number {
  const mx = mean(x);
  const my = mean(y);
  let sum = 0;
  for (let i = 0; i < x.length; i++) {
    sum += (x[i] - mx) * (y[i] - my);
  }
  return sum / (x.length - 1);
}

export function covarianceMatrix(data: number[][]): number[][] {
  const n = data.length;
  const p = data[0].length;
  const means = new Array(p);

  for (let j = 0; j < p; j++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += data[i][j];
    means[j] = sum / n;
  }

  const cov: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));

  for (let j1 = 0; j1 < p; j1++) {
    for (let j2 = j1; j2 < p; j2++) {
      let sum = 0;
      for (let i = 0; i < n; i++) {
        sum += (data[i][j1] - means[j1]) * (data[i][j2] - means[j2]);
      }
      const val = sum / (n - 1);
      cov[j1][j2] = val;
      cov[j2][j1] = val;
    }
  }

  return cov;
}

export function correlationMatrix(data: number[][]): number[][] {
  const cov = covarianceMatrix(data);
  const p = cov.length;
  const corr: number[][] = Array.from({ length: p }, () => new Array(p));

  const stds = new Array(p);
  for (let i = 0; i < p; i++) stds[i] = Math.sqrt(cov[i][i]);

  for (let i = 0; i < p; i++) {
    for (let j = 0; j < p; j++) {
      corr[i][j] = stds[i] === 0 || stds[j] === 0 ? 0 : cov[i][j] / (stds[i] * stds[j]);
    }
  }

  return corr;
}

// Jacobi rotation method for symmetric matrices
export function eigenDecomposition(A: number[][]): { values: number[]; vectors: number[][] } {
  const n = A.length;
  const S: number[][] = A.map(row => [...row]);
  const V: number[][] = identity(n);

  const maxIter = 100 * n * n;
  const tol = 1e-12;

  for (let iter = 0; iter < maxIter; iter++) {
    let maxOff = 0;
    let p = 0;
    let q = 1;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const absVal = Math.abs(S[i][j]);
        if (absVal > maxOff) {
          maxOff = absVal;
          p = i;
          q = j;
        }
      }
    }

    if (maxOff < tol) break;

    const theta =
      Math.abs(S[p][p] - S[q][q]) < 1e-15
        ? Math.PI / 4
        : 0.5 * Math.atan2(2 * S[p][q], S[p][p] - S[q][q]);

    const c = Math.cos(theta);
    const s = Math.sin(theta);

    const Spp = c * c * S[p][p] + 2 * s * c * S[p][q] + s * s * S[q][q];
    const Sqq = s * s * S[p][p] - 2 * s * c * S[p][q] + c * c * S[q][q];

    S[p][p] = Spp;
    S[q][q] = Sqq;
    S[p][q] = 0;
    S[q][p] = 0;

    for (let i = 0; i < n; i++) {
      if (i === p || i === q) continue;
      const sip = S[i][p];
      const siq = S[i][q];
      S[i][p] = c * sip + s * siq;
      S[p][i] = S[i][p];
      S[i][q] = -s * sip + c * siq;
      S[q][i] = S[i][q];
    }

    for (let i = 0; i < n; i++) {
      const vip = V[i][p];
      const viq = V[i][q];
      V[i][p] = c * vip + s * viq;
      V[i][q] = -s * vip + c * viq;
    }
  }

  const eigenvalues = new Array(n);
  for (let i = 0; i < n; i++) eigenvalues[i] = S[i][i];

  const indices = Array.from({ length: n }, (_, i) => i);
  indices.sort((a, b) => eigenvalues[b] - eigenvalues[a]);

  const sortedValues = indices.map(i => eigenvalues[i]);
  const sortedVectors: number[][] = Array.from({ length: n }, () => new Array(n));
  for (let col = 0; col < n; col++) {
    const srcCol = indices[col];
    for (let row = 0; row < n; row++) {
      sortedVectors[row][col] = V[row][srcCol];
    }
  }

  return { values: sortedValues, vectors: sortedVectors };
}

export function conditionNumber(A: number[][]): number {
  const { values } = eigenDecomposition(A);
  const absValues = values.map(Math.abs);
  const maxEig = Math.max(...absValues);
  const minEig = Math.min(...absValues);

  if (minEig < 1e-15) return Infinity;
  return maxEig / minEig;
}
