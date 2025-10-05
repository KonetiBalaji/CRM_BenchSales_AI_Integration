import { describe, expect, it } from "vitest";

import {
  computeDiscountedCumulativeGain,
  computeHitRate,
  computeMean,
  computeNormalizedDcg,
  safeDivide
} from "./evaluation.metrics";

describe("evaluation metrics", () => {
  it("computes DCG with logarithmic discount", () => {
    const result = computeDiscountedCumulativeGain([3, 2, 1], 3);
    expect(result).toBeCloseTo(4.7619, 3);
  });

  it("normalizes DCG by ideal ordering", () => {
    const result = computeNormalizedDcg([1, 0, 1], 3);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it("computes hit rate at k", () => {
    expect(computeHitRate([0, 0, 2], 3, 1)).toBe(1);
    expect(computeHitRate([0, 0, 0], 3, 1)).toBe(0);
  });

  it("computes safe means", () => {
    expect(computeMean([0.5, 0.7, 0.9])).toBeCloseTo(0.7, 6);
    expect(computeMean([])).toBe(0);
  });

  it("handles safe division", () => {
    expect(safeDivide(5, 10)).toBeCloseTo(0.5, 6);
    expect(safeDivide(5, 0)).toBe(0);
  });
});