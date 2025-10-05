import { Injectable, Logger } from "@nestjs/common";
import { MatchFeedbackOutcome, MatchStatus, Prisma, SubmissionStatus } from "@prisma/client";

import { PrismaService } from "../../../infrastructure/prisma/prisma.service";
import { computeHitRate, computeMean, computeNormalizedDcg, safeDivide } from "./evaluation.metrics";
import type {
  HumanReviewSummary,
  HumanReviewSummaryInput,
  MatchWithRelevance,
  MatchingEvaluationOptions,
  MatchingEvaluationSnapshot,
  OfflineEvaluationMetrics,
  OnlineEvaluationMetrics,
  RankedRequirementBucket
} from "./evaluation.types";

const FEEDBACK_RELEVANCE: Record<MatchFeedbackOutcome, number> = {
  [MatchFeedbackOutcome.POSITIVE]: 2,
  [MatchFeedbackOutcome.NEGATIVE]: 0,
  [MatchFeedbackOutcome.NEUTRAL]: 1,
  [MatchFeedbackOutcome.HIRED]: 3,
  [MatchFeedbackOutcome.REJECTED]: 0
};

const MATCH_STATUS_RELEVANCE: Record<MatchStatus, number> = {
  [MatchStatus.REVIEW]: 0,
  [MatchStatus.SHORTLISTED]: 2,
  [MatchStatus.SUBMITTED]: 2,
  [MatchStatus.REJECTED]: 0,
  [MatchStatus.HIRED]: 3
};

const SUBMISSION_STATUS_RELEVANCE: Record<SubmissionStatus, number> = {
  [SubmissionStatus.DRAFT]: 0,
  [SubmissionStatus.SUBMITTED]: 2,
  [SubmissionStatus.INTERVIEW]: 2.5,
  [SubmissionStatus.OFFER]: 3,
  [SubmissionStatus.HIRED]: 3,
  [SubmissionStatus.LOST]: 0
};

@Injectable()
export class MatchingEvaluationService {
  private readonly logger = new Logger(MatchingEvaluationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async evaluateTenant(tenantId: string, options: MatchingEvaluationOptions): Promise<MatchingEvaluationSnapshot> {
    const topK = options.topK ?? 10;
    const relevanceThreshold = options.relevanceThreshold ?? 1;
    const windowEnd = options.windowEnd ?? new Date();
    const windowStart = options.windowStart;
    const onlineWindowHours = options.onlineWindowHours ?? 24;

    const matches = await this.prisma.match.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: windowStart,
          lte: windowEnd
        }
      },
      include: {
        feedbackRecords: {
          select: { outcome: true }
        },
        submission: {
          select: { status: true }
        }
      },
      orderBy: [{ requirementId: "asc" }, { score: "desc" }]
    });

    const relevanceInputs: MatchWithRelevance[] = matches.map((match) => this.toMatchInput(match));
    const requirementBuckets = this.toBuckets(relevanceInputs);

    const offlineMetrics = this.computeOfflineMetrics(requirementBuckets, topK, relevanceThreshold);
    const onlineMetrics = this.computeOnlineMetrics(relevanceInputs, {
      topK,
      relevanceThreshold,
      windowEnd,
      onlineWindowHours
    });
    const humanReview = options.humanReview ? this.buildHumanReview(options.humanReview) : undefined;
    const baselineDelta = options.baseline
      ? {
          ndcgAt10:
            options.baseline.ndcgAt10 != null
              ? Number((offlineMetrics.ndcgAt10 - options.baseline.ndcgAt10).toFixed(6))
              : undefined,
          hitRateAt10:
            options.baseline.hitRateAt10 != null
              ? Number((offlineMetrics.hitRateAt10 - options.baseline.hitRateAt10).toFixed(6))
              : undefined
        }
      : undefined;

    const snapshot: MatchingEvaluationSnapshot = {
      offline: offlineMetrics,
      online: onlineMetrics,
      humanReview,
      baselineDelta
    };

    await this.recordSnapshot(tenantId, windowStart, windowEnd, snapshot);

        this.logger.log(`Evaluation window ${windowStart.toISOString()} - ${windowEnd.toISOString()} nDCG@10=${offlineMetrics.ndcgAt10}, hit@10=${offlineMetrics.hitRateAt10}`);

    return snapshot;
  }

  private computeOfflineMetrics(
    buckets: RankedRequirementBucket[],
    topK: number,
    relevanceThreshold: number
  ): OfflineEvaluationMetrics {
    if (buckets.length === 0) {
      return {
        ndcgAt10: 0,
        hitRateAt10: 0,
        coverage: 0,
        sampleSize: 0
      };
    }

    const ndcgValues = buckets.map((bucket) =>
      computeNormalizedDcg(bucket.matches.map((match) => match.relevance), topK)
    );
    const hitValues = buckets.map((bucket) =>
      computeHitRate(bucket.matches.map((match) => match.relevance), topK, relevanceThreshold)
    );

    const totalMatches = buckets.reduce((acc, bucket) => acc + bucket.matches.length, 0);
    const withFeedback = buckets.reduce(
      (acc, bucket) => acc + bucket.matches.filter((match) => match.feedbackOutcomes.length > 0).length,
      0
    );

    return {
      ndcgAt10: computeMean(ndcgValues),
      hitRateAt10: computeMean(hitValues),
      coverage: safeDivide(withFeedback, totalMatches),
      sampleSize: buckets.length
    };
  }

  private computeOnlineMetrics(
    relevanceInputs: MatchWithRelevance[],
    params: { topK: number; relevanceThreshold: number; windowEnd: Date; onlineWindowHours: number }
  ): OnlineEvaluationMetrics {
    const windowStart = new Date(params.windowEnd.getTime() - params.onlineWindowHours * 60 * 60 * 1000);
    const windowMatches = relevanceInputs.filter((match) => match.createdAt >= windowStart);

    if (windowMatches.length === 0) {
      return {
        ndcgAt10: null,
        hitRateAt10: null,
        positiveFeedbackRate: null,
        sampleSize: 0
      };
    }

    const buckets = this.toBuckets(windowMatches);
    const ndcgValues = buckets.map((bucket) =>
      computeNormalizedDcg(bucket.matches.map((match) => match.relevance), params.topK)
    );
    const hitValues = buckets.map((bucket) =>
      computeHitRate(bucket.matches.map((match) => match.relevance), params.topK, params.relevanceThreshold)
    );

    const feedbackRecords = windowMatches.flatMap((match) => match.feedbackOutcomes);
    const positiveFeedback = feedbackRecords.filter(
      (outcome) => outcome === MatchFeedbackOutcome.POSITIVE || outcome === MatchFeedbackOutcome.HIRED
    );

    return {
      ndcgAt10: computeMean(ndcgValues),
      hitRateAt10: computeMean(hitValues),
      positiveFeedbackRate: safeDivide(positiveFeedback.length, feedbackRecords.length),
      sampleSize: buckets.length
    };
  }

  private toBuckets(
    matches: MatchWithRelevance[]
  ): RankedRequirementBucket[] {
    const buckets = new Map<string, RankedRequirementBucket>();

    for (const match of matches) {
      const existing = buckets.get(match.requirementId);
      if (existing) {
        existing.matches.push(match);
      } else {
        buckets.set(match.requirementId, {
          requirementId: match.requirementId,
          matches: [match]
        });
      }
    }

    for (const bucket of buckets.values()) {
      bucket.matches.sort((a, b) => b.score - a.score);
    }

    return [...buckets.values()];
  }

  private toMatchInput(
    match: Prisma.MatchGetPayload<{
      include: {
        feedbackRecords: { select: { outcome: true } };
        submission: { select: { status: true } };
      };
    }>
  ): MatchWithRelevance {
    const feedbackOutcomes = match.feedbackRecords.map((record) => record.outcome);
    const submissionStatus = match.submission?.status ?? null;

    const relevance = this.resolveRelevance({
      matchStatus: match.status,
      feedbackOutcomes,
      submissionStatus
    });

    return {
      matchId: match.id,
      requirementId: match.requirementId,
      score: match.score,
      feedbackOutcomes,
      matchStatus: match.status,
      submissionStatus,
      createdAt: match.createdAt,
      relevance
    };
  }

  private resolveRelevance(params: {
    matchStatus: MatchStatus;
    feedbackOutcomes: MatchFeedbackOutcome[];
    submissionStatus: SubmissionStatus | null;
  }): number {
    const feedbackRelevance = params.feedbackOutcomes.reduce((highest, outcome) => {
      return Math.max(highest, FEEDBACK_RELEVANCE[outcome] ?? 0);
    }, 0);

    const statusRelevance = MATCH_STATUS_RELEVANCE[params.matchStatus] ?? 0;
    const submissionRelevance = params.submissionStatus
      ? SUBMISSION_STATUS_RELEVANCE[params.submissionStatus] ?? 0
      : 0;

    return Number(Math.max(feedbackRelevance, statusRelevance, submissionRelevance).toFixed(4));
  }

  private buildHumanReview(input: HumanReviewSummaryInput): HumanReviewSummary {
    const total = Math.max(0, input.totalReviewed);
    const approved = Math.min(input.approved, total);
    return {
      totalReviewed: total,
      approved,
      approvalRate: safeDivide(approved, total),
      blockers: input.blockers ?? [],
      notes: input.notes ?? []
    };
  }

  private async recordSnapshot(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date,
    snapshot: MatchingEvaluationSnapshot
  ) {
    await this.prisma.analyticsSnapshot.create({
      data: {
        tenantId,
        periodStart,
        periodEnd,
        metrics: snapshot as unknown as Prisma.InputJsonValue
      }
    });
  }
}