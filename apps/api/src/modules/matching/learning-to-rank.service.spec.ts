import { describe, expect, it } from "vitest";

import { LearningToRankService } from "./learning-to-rank.service";
import type { FeatureVector } from "./matching.domain";

describe("LearningToRankService", () => {
  const service = new LearningToRankService();

  function buildFeatures(overrides: Partial<FeatureVector>): FeatureVector {
    return {
      skillOverlap: 0.5,
      vectorScore: 0.5,
      lexicalScore: 0.5,
      availability: 0.5,
      locationMatch: 0.5,
      rateAlignment: 0.5,
      recencyScore: 0.5,
      ...overrides
    };
  }

  it("produces higher probability for stronger candidates", () => {
    const strong = service.scoreCandidate({
      features: buildFeatures({
        skillOverlap: 0.9,
        vectorScore: 0.85,
        lexicalScore: 0.78,
        availability: 1,
        locationMatch: 0.9,
        rateAlignment: 0.9,
        recencyScore: 0.85
      }),
      linearScore: 0.88,
      retrievalScore: 0.9
    });

    const weak = service.scoreCandidate({
      features: buildFeatures({
        skillOverlap: 0.15,
        vectorScore: 0.2,
        lexicalScore: 0.1,
        availability: 0.2,
        locationMatch: 0.2,
        rateAlignment: 0.2,
        recencyScore: 0.1
      }),
      linearScore: 0.25,
      retrievalScore: 0.15
    });

    expect(strong.probability).toBeGreaterThan(weak.probability);
    expect(strong.probability).toBeGreaterThan(0.5);
    expect(weak.probability).toBeLessThan(0.5);
  });

  it("keeps scores within [0,1]", () => {
    const result = service.scoreCandidate({
      features: buildFeatures({
        skillOverlap: 1,
        vectorScore: 1,
        lexicalScore: 1,
        availability: 1,
        locationMatch: 1,
        rateAlignment: 1,
        recencyScore: 1
      }),
      linearScore: 1,
      retrievalScore: 1
    });

    expect(result.probability).toBeLessThanOrEqual(1);
    expect(result.probability).toBeGreaterThanOrEqual(0);
  });
});
