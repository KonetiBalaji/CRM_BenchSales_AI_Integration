import type { MatchFeedbackOutcome, MatchStatus } from "@prisma/client";

export interface MatchingEvaluationOptions {
  windowStart: Date;
  windowEnd?: Date;
  topK?: number;
  relevanceThreshold?: number;
  onlineWindowHours?: number;
  baseline?: BaselineMetrics;
  humanReview?: HumanReviewSummaryInput;
}

export interface BaselineMetrics {
  ndcgAt10?: number;
  hitRateAt10?: number;
}

export interface HumanReviewSummaryInput {
  totalReviewed: number;
  approved: number;
  blockers?: string[];
  notes?: string[];
}

export interface RequirementRankingSignal {
  requirementId: string;
  scores: number[];
  relevances: number[];
}

export interface OfflineEvaluationMetrics {
  ndcgAt10: number;
  hitRateAt10: number;
  coverage: number;
  sampleSize: number;
}

export interface OnlineEvaluationMetrics {
  ndcgAt10: number | null;
  hitRateAt10: number | null;
  positiveFeedbackRate: number | null;
  sampleSize: number;
}

export interface HumanReviewSummary {
  totalReviewed: number;
  approved: number;
  approvalRate: number;
  blockers: string[];
  notes: string[];
}

export interface MatchingEvaluationSnapshot {
  offline: OfflineEvaluationMetrics;
  online: OnlineEvaluationMetrics;
  humanReview?: HumanReviewSummary;
  baselineDelta?: {
    ndcgAt10?: number;
    hitRateAt10?: number;
  };
}

export interface MatchRelevanceInput {
  matchId: string;
  requirementId: string;
  score: number;
  feedbackOutcomes: MatchFeedbackOutcome[];
  matchStatus: MatchStatus;
  submissionStatus?: string | null;
  createdAt: Date;
}

export type MatchWithRelevance = MatchRelevanceInput & { relevance: number };

export interface RankedRequirementBucket {
  requirementId: string;
  matches: MatchWithRelevance[];
}