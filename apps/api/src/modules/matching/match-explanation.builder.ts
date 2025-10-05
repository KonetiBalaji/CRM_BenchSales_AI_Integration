import { Injectable } from "@nestjs/common";

import { AiGatewayService } from "../ai-gateway/ai-gateway.service";
import type { MatchSummaryFacts, MatchSummaryResponse } from "../ai-gateway/dto/match-summary.dto";
import {
  CandidateScoreBundle,
  FeatureContribution,
  FEATURE_LABELS,
  LINEAR_MODEL_VERSION,
  LTR_MODEL_VERSION,
  RequirementWithSkills,
  clampScore
} from "./matching.domain";

export interface MatchExplanationDetails {
  modelVersion: string;
  rankerVersion: string;
  summary: string;
  alignedSkills: string[];
  contributions: FeatureContribution[];
  topFactors: string[];
  deltas: {
    location: {
      consultant?: string | null;
      requirement?: string | null;
      status: string;
      score: number;
    };
    rate: {
      consultantRate?: number | null;
      requirementMin?: number | null;
      requirementMax?: number | null;
      delta?: number | null;
      withinRange: boolean;
    };
    availability: {
      status: string;
      score: number;
      description: string;
    };
  };
  retrieval?: {
    vectorScore: number;
    lexicalScore: number;
    hybridScore?: number;
  };
  scores: CandidateScoreBundle["scores"];
  highlights: string[];
  llm: {
    provider: string;
    confidence: number;
    grounded: boolean;
  };
  facts: MatchSummaryFacts;
}

@Injectable()
export class MatchExplanationBuilder {
  private readonly availabilityDescriptions: Record<string, string> = {
    AVAILABLE: "Ready to start immediately",
    INTERVIEWING: "Interviewing with other roles",
    ASSIGNED: "Partially committed to a project",
    UNAVAILABLE: "Not available"
  };

  constructor(private readonly aiGateway: AiGatewayService) {}

  buildFacts(requirement: RequirementWithSkills, candidate: CandidateScoreBundle): MatchSummaryFacts {
    const topRequirementSkills = [...requirement.skills]
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5)
      .map((item) => item.skill?.name ?? "");

    const topFeatureLabels = this.getTopFeatureLabels(candidate.contributions);
    const retrievalScore = this.deriveRetrievalScore(candidate);
    const availabilityLabel = this.availabilityDescriptions[candidate.consultant.availability] ?? "Availability unknown";
    const rateDelta = this.computeRateDelta(requirement, candidate);
    const locationDelta = this.computeLocationDelta(requirement, candidate);

    return {
      requirement: {
        id: requirement.id,
        title: requirement.title,
        clientName: requirement.clientName,
        location: requirement.location,
        minRate: requirement.minRate ? Number(requirement.minRate) : null,
        maxRate: requirement.maxRate ? Number(requirement.maxRate) : null,
        topSkills: topRequirementSkills.filter(Boolean)
      },
      consultant: {
        id: candidate.consultant.id,
        name: `${candidate.consultant.firstName} ${candidate.consultant.lastName}`.trim(),
        availability: candidate.consultant.availability,
        location: candidate.consultant.location,
        rate: candidate.consultant.rate ? Number(candidate.consultant.rate) : null,
        alignedSkills: candidate.alignedSkills.filter(Boolean)
      },
      signals: {
        linearScore: candidate.scores.linear,
        ltrScore: candidate.scores.ltr,
        finalScore: candidate.scores.final,
        retrievalScore,
        featureLabels: topFeatureLabels,
        availabilityScore: candidate.features.availability,
        locationMatch: candidate.features.locationMatch,
        rateAlignment: candidate.features.rateAlignment
      },
      deltas: {
        locationStatus: locationDelta.status,
        rateDelta: rateDelta.delta,
        availabilityLabel
      }
    };
  }

  async buildSummary(
    tenantId: string,
    requirement: RequirementWithSkills,
    candidate: CandidateScoreBundle
  ): Promise<{ summary: MatchSummaryResponse; facts: MatchSummaryFacts }> {
    const facts = this.buildFacts(requirement, candidate);
    const summary = await this.aiGateway.generateMatchSummary(tenantId, facts);
    return { summary, facts };
  }

  buildExplanation(
    requirement: RequirementWithSkills,
    candidate: CandidateScoreBundle,
    summary: MatchSummaryResponse,
    facts: MatchSummaryFacts
  ): MatchExplanationDetails {
    const topFactors = this.getTopFeatureLabels(candidate.contributions, 3);
    const locationDelta = this.computeLocationDelta(requirement, candidate);
    const rateDelta = this.computeRateDelta(requirement, candidate);
    const availabilityDescription = this.availabilityDescriptions[candidate.consultant.availability] ?? "Availability unknown";

    return {
      modelVersion: LINEAR_MODEL_VERSION,
      rankerVersion: LTR_MODEL_VERSION,
      summary: summary.summary,
      alignedSkills: candidate.alignedSkills.filter(Boolean),
      contributions: candidate.contributions,
      topFactors,
      deltas: {
        location: {
          consultant: candidate.consultant.location,
          requirement: requirement.location,
          status: locationDelta.status,
          score: clampScore(candidate.features.locationMatch)
        },
        rate: {
          consultantRate: candidate.consultant.rate ? Number(candidate.consultant.rate) : null,
          requirementMin: requirement.minRate ? Number(requirement.minRate) : null,
          requirementMax: requirement.maxRate ? Number(requirement.maxRate) : null,
          delta: rateDelta.delta,
          withinRange: rateDelta.withinRange
        },
        availability: {
          status: candidate.consultant.availability,
          score: clampScore(candidate.features.availability),
          description: availabilityDescription
        }
      },
      retrieval: candidate.hybridScore
        ? {
            vectorScore: candidate.hybridScore.vectorScore,
            lexicalScore: candidate.hybridScore.lexicalScore,
            hybridScore: candidate.hybridScore.score
          }
        : undefined,
      scores: candidate.scores,
      highlights: summary.highlights,
      llm: {
        provider: summary.provider,
        confidence: summary.confidence,
        grounded: summary.grounded
      },
      facts
    };
  }

  getTopFeatureLabels(contributions: FeatureContribution[], limit = 5): string[] {
    return [...contributions]
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, limit)
      .map((item) => `${FEATURE_LABELS[item.feature]} (${item.value.toFixed(2)})`);
  }

  private deriveRetrievalScore(candidate: CandidateScoreBundle): number {
    if (candidate.hybridScore) {
      const weighted = 0.6 * candidate.hybridScore.vectorScore + 0.4 * candidate.hybridScore.lexicalScore;
      return clampScore(weighted);
    }
    const fallback = 0.6 * candidate.features.vectorScore + 0.4 * candidate.features.lexicalScore;
    return clampScore(fallback);
  }

  private computeRateDelta(
    requirement: RequirementWithSkills,
    candidate: CandidateScoreBundle
  ): { delta?: number | null; withinRange: boolean } {
    const consultantRate = candidate.consultant.rate ? Number(candidate.consultant.rate) : null;
    if (consultantRate == null) {
      return { delta: null, withinRange: false };
    }

    const minRate = requirement.minRate ? Number(requirement.minRate) : null;
    const maxRate = requirement.maxRate ? Number(requirement.maxRate) : null;

    if (minRate == null && maxRate == null) {
      return { delta: null, withinRange: false };
    }

    if (minRate != null && maxRate != null) {
      const withinRange = consultantRate >= minRate && consultantRate <= maxRate;
      const midpoint = (minRate + maxRate) / 2;
      const delta = midpoint > 0 ? (consultantRate - midpoint) / midpoint : 0;
      return { delta, withinRange };
    }

    const target = minRate ?? maxRate ?? consultantRate;
    const delta = target > 0 ? (consultantRate - target) / target : 0;
    const withinRange = Math.abs(delta) <= 0.15;
    return { delta, withinRange };
  }

  private computeLocationDelta(
    requirement: RequirementWithSkills,
    candidate: CandidateScoreBundle
  ): { status: string } {
    const matchScore = candidate.features.locationMatch;
    if (!requirement.location || !candidate.consultant.location) {
      return { status: "UNKNOWN" };
    }

    if (matchScore >= 0.95) {
      return { status: "MATCH" };
    }
    if (matchScore >= 0.75) {
      return { status: "REMOTE_OK" };
    }
    if (matchScore >= 0.55) {
      return { status: "NEARBY" };
    }
    return { status: "MISMATCH" };
  }
}
