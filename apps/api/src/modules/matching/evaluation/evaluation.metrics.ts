export function computeDiscountedCumulativeGain(relevances: number[], k: number): number {
  if (k <= 0 || relevances.length === 0) {
    return 0;
  }
  const limit = Math.min(k, relevances.length);
  let score = 0;
  for (let index = 0; index < limit; index += 1) {
    const relevance = relevances[index];
    const rank = index + 1;
    const discount = Math.log2(rank + 1);
    score += relevance / discount;
  }
  return Number(score.toFixed(6));
}

export function computeNormalizedDcg(relevances: number[], k: number): number {
  if (relevances.length === 0) {
    return 0;
  }
  const dcg = computeDiscountedCumulativeGain(relevances, k);
  const ideal = computeDiscountedCumulativeGain([...relevances].sort((a, b) => b - a), k);
  if (ideal === 0) {
    return 0;
  }
  return Number((dcg / ideal).toFixed(6));
}

export function computeHitRate(relevances: number[], k: number, threshold = 1): number {
  if (relevances.length === 0) {
    return 0;
  }
  const limit = Math.min(k, relevances.length);
  for (let index = 0; index < limit; index += 1) {
    if (relevances[index] >= threshold) {
      return 1;
    }
  }
  return 0;
}

export function computeMean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const total = values.reduce((acc, value) => acc + value, 0);
  return Number((total / values.length).toFixed(6));
}

export function safeDivide(numerator: number, denominator: number): number {
  if (denominator === 0) {
    return 0;
  }
  return Number((numerator / denominator).toFixed(6));
}