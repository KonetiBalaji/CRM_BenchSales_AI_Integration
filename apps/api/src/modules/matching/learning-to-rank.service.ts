import { Injectable } from "@nestjs/common";

import { FeatureKey, FeatureVector, LTR_MODEL_VERSION, clampScore } from "./matching.domain";

type LtrFeatureKey = FeatureKey | "linearScore" | "retrievalScore";

type LightGbmNode =
  | {
      feature: LtrFeatureKey;
      threshold: number;
      left: LightGbmNode;
      right: LightGbmNode;
    }
  | {
      value: number;
    };

interface LightGbmModel {
  version: string;
  baseScore: number;
  learningRate: number;
  trees: LightGbmNode[];
}

const LIGHTGBM_MODEL: LightGbmModel = {
  version: LTR_MODEL_VERSION,
  baseScore: -0.3,
  learningRate: 0.3,
  trees: [
    {
      feature: "skillOverlap",
      threshold: 0.55,
      left: {
        feature: "retrievalScore",
        threshold: 0.42,
        left: { value: -0.4 },
        right: { value: -0.1 }
      },
      right: { value: 0.6 }
    },
    {
      feature: "availability",
      threshold: 0.5,
      left: {
        feature: "recencyScore",
        threshold: 0.4,
        left: { value: -0.2 },
        right: { value: 0.05 }
      },
      right: {
        feature: "linearScore",
        threshold: 0.7,
        left: { value: 0.15 },
        right: { value: 0.32 }
      }
    },
    {
      feature: "rateAlignment",
      threshold: 0.6,
      left: {
        feature: "locationMatch",
        threshold: 0.6,
        left: { value: -0.05 },
        right: { value: 0.08 }
      },
      right: { value: 0.18 }
    }
  ]
};

export interface LearningToRankInput {
  features: FeatureVector;
  linearScore: number;
  retrievalScore: number;
}

export interface LearningToRankScore {
  rawScore: number;
  probability: number;
}

@Injectable()
export class LearningToRankService {
  readonly version = LIGHTGBM_MODEL.version;

  scoreCandidate(input: LearningToRankInput): LearningToRankScore {
    const featureMap: Record<LtrFeatureKey, number> = {
      skillOverlap: input.features.skillOverlap,
      vectorScore: input.features.vectorScore,
      lexicalScore: input.features.lexicalScore,
      availability: input.features.availability,
      locationMatch: input.features.locationMatch,
      rateAlignment: input.features.rateAlignment,
      recencyScore: input.features.recencyScore,
      linearScore: input.linearScore,
      retrievalScore: input.retrievalScore
    };

    let score = LIGHTGBM_MODEL.baseScore;
    for (const tree of LIGHTGBM_MODEL.trees) {
      score += LIGHTGBM_MODEL.learningRate * this.evaluateTree(tree, featureMap);
    }

    const probability = clampScore(this.sigmoid(score));
    return { rawScore: score, probability };
  }

  private evaluateTree(node: LightGbmNode, featureMap: Record<LtrFeatureKey, number>): number {
    if ("value" in node) {
      return node.value;
    }
    const featureValue = featureMap[node.feature] ?? 0;
    if (featureValue <= node.threshold) {
      return this.evaluateTree(node.left, featureMap);
    }
    return this.evaluateTree(node.right, featureMap);
  }

  private sigmoid(value: number): number {
    return 1 / (1 + Math.exp(-value));
  }
}
