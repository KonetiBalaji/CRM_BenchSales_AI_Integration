import { MatchFeedbackOutcome, MatchStatus, SubmissionStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../../../infrastructure/prisma/prisma.service";
import { MatchingEvaluationService } from "./matching-evaluation.service";

describe("MatchingEvaluationService", () => {
  const prismaMock = {
    match: {
      findMany: vi.fn()
    },
    analyticsSnapshot: {
      create: vi.fn()
    }
  };

  const service = new MatchingEvaluationService(prismaMock as unknown as PrismaService);

  beforeEach(() => {
    prismaMock.match.findMany.mockReset();
    prismaMock.analyticsSnapshot.create.mockReset();
  });

  it("computes offline and online metrics and persists snapshot", async () => {
    const now = new Date("2025-09-20T00:00:00.000Z");
    const dayAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const hourAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    prismaMock.match.findMany.mockResolvedValue([
      {
        id: "match-1",
        tenantId: "tenant-1",
        requirementId: "req-1",
        score: 0.92,
        status: MatchStatus.REVIEW,
        createdAt: dayAgo,
        feedbackRecords: [
          { outcome: MatchFeedbackOutcome.POSITIVE }
        ],
        submission: null
      },
      {
        id: "match-2",
        tenantId: "tenant-1",
        requirementId: "req-1",
        score: 0.81,
        status: MatchStatus.REVIEW,
        createdAt: dayAgo,
        feedbackRecords: [],
        submission: null
      },
      {
        id: "match-3",
        tenantId: "tenant-1",
        requirementId: "req-2",
        score: 0.95,
        status: MatchStatus.SUBMITTED,
        createdAt: hourAgo,
        feedbackRecords: [],
        submission: { status: SubmissionStatus.SUBMITTED }
      },
      {
        id: "match-4",
        tenantId: "tenant-1",
        requirementId: "req-2",
        score: 0.63,
        status: MatchStatus.REVIEW,
        createdAt: hourAgo,
        feedbackRecords: [
          { outcome: MatchFeedbackOutcome.NEGATIVE }
        ],
        submission: null
      }
    ]);

    const result = await service.evaluateTenant("tenant-1", {
      windowStart: new Date("2025-09-01T00:00:00.000Z"),
      windowEnd: now,
      onlineWindowHours: 24,
      humanReview: {
        totalReviewed: 25,
        approved: 23,
        blockers: ["Need clearer skill taxonomy mapping"],
        notes: ["Reviewers flagged remote-location ambiguity"]
      },
      baseline: {
        ndcgAt10: 0.78,
        hitRateAt10: 0.85
      }
    });

    expect(result.offline.ndcgAt10).toBeCloseTo(1, 6);
    expect(result.offline.hitRateAt10).toBeCloseTo(1, 6);
    expect(result.offline.coverage).toBeCloseTo(0.5, 6);
    expect(result.offline.sampleSize).toBe(2);

    expect(result.online.ndcgAt10).toBeCloseTo(1, 6);
    expect(result.online.hitRateAt10).toBeCloseTo(1, 6);
    expect(result.online.positiveFeedbackRate).toBe(0);
    expect(result.online.sampleSize).toBe(1);

    expect(result.humanReview?.approvalRate).toBeCloseTo(0.92, 6);
    expect(result.baselineDelta?.ndcgAt10).toBeCloseTo(0.22, 6);
    expect(result.baselineDelta?.hitRateAt10).toBeCloseTo(0.15, 6);

    expect(prismaMock.analyticsSnapshot.create).toHaveBeenCalledTimes(1);
    const payload = prismaMock.analyticsSnapshot.create.mock.calls[0][0];
    expect(payload.data.tenantId).toBe("tenant-1");
    expect(payload.data.metrics.offline.ndcgAt10).toBeCloseTo(1, 6);
  });
});