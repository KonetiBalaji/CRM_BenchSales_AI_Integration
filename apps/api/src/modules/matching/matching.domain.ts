import { ConsultantAvailability, Prisma } from "@prisma/client";

import type { HybridSearchResult } from "../vector-search/vector-search.service";

export type AiConfig = {
  matchBaseWeight: number;
  enableLlmRerank?: boolean;
  llmRerankWeight?: number;
};

export type FeatureVector = {
  skillOverlap: number;
  vectorScore: number;
  lexicalScore: number;
  availability: number;
  locationMatch: number;
  rateAlignment: number;
  recencyScore: number;
};

export type FeatureKey = keyof FeatureVector;

export type FeatureContribution = {
  feature: FeatureKey;
  value: number;
  weight: number;
  contribution: number;
};

export type MatchConsultant = Prisma.ConsultantGetPayload<{
  include: {
    skills: {
      include: {
        skill: true;
      };
    };
  };
}>;

export type RequirementWithSkills = Prisma.RequirementGetPayload<{
  include: {
    skills: {
      include: {
        skill: true;
      };
    };
  };
}>;

export interface CandidateFeatureBaseline {
  consultant: MatchConsultant;
  features: FeatureVector;
  alignedSkills: string[];
  hybridScore?: HybridSearchResult;
}

export interface CandidateScoreBundle extends CandidateFeatureBaseline {
  contributions: FeatureContribution[];
  scores: {
    linear: number;
    ltr: number;
    final: number;
    llm?: number;
  };
}

export const FEATURE_WEIGHTS: FeatureVector = {
  skillOverlap: 0.35,
  vectorScore: 0.25,
  lexicalScore: 0.1,
  availability: 0.1,
  locationMatch: 0.1,
  rateAlignment: 0.07,
  recencyScore: 0.03
};

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  skillOverlap: "Skill overlap",
  vectorScore: "Semantic similarity",
  lexicalScore: "Keyword relevance",
  availability: "Availability",
  locationMatch: "Location alignment",
  rateAlignment: "Rate alignment",
  recencyScore: "Profile freshness"
};

export const FEATURE_DESCRIPTIONS: Record<FeatureKey, string> = {
  skillOverlap: "Weighted overlap between requirement and consultant skills.",
  vectorScore: "Cosine similarity from semantic embeddings (pgvector).",
  lexicalScore: "BM25 keyword relevance from text search.",
  availability: "Availability score based on consultant status.",
  locationMatch: "Geographic alignment between consultant and requirement.",
  rateAlignment: "How close the consultant rate is to the requirement budget.",
  recencyScore: "How recently the consultant profile was updated."
};

export const LINEAR_MODEL_VERSION = "hybrid-linear-v2";
export const LTR_MODEL_VERSION = "lightgbm-v1";
export const RECENCY_WINDOW_DAYS = 90;

export const AVAILABILITY_TO_SCORE: Record<ConsultantAvailability, number> = {
  [ConsultantAvailability.AVAILABLE]: 1,
  [ConsultantAvailability.INTERVIEWING]: 0.6,
  [ConsultantAvailability.ASSIGNED]: 0.25,
  [ConsultantAvailability.UNAVAILABLE]: 0
};

export function clampScore(value: number): number {
  return Number(Math.min(1, Math.max(0, value)).toFixed(4));
}
