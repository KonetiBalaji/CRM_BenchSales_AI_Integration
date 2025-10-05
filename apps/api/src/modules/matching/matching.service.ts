import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  MatchFeedbackOutcome,
  MatchStatus,
  Prisma,
  SearchEntityType
} from "@prisma/client";

import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { RequestContextService } from "../../infrastructure/context";
import { VectorSearchService, HybridSearchResult } from "../vector-search/vector-search.service";
import type { MatchSummaryFacts, MatchSummaryResponse } from "../ai-gateway/dto/match-summary.dto";
import {
  AiConfig,
  CandidateFeatureBaseline,
  CandidateScoreBundle,
  FEATURE_WEIGHTS,
  LINEAR_MODEL_VERSION,
  LTR_MODEL_VERSION,
  MatchConsultant,
  RequirementWithSkills,
  FeatureContribution,
  FeatureKey,
  FeatureVector,
  AVAILABILITY_TO_SCORE,
  clampScore,
  RECENCY_WINDOW_DAYS
} from "./matching.domain";
import { MatchFeedbackDto } from "./dto/match-feedback.dto";
import { LearningToRankService } from "./learning-to-rank.service";
import { MatchExplanationBuilder, MatchExplanationDetails } from "./match-explanation.builder";

const DEFAULT_AI_CONFIG: Required<AiConfig> = {
  matchBaseWeight: 0.2,
  enableLlmRerank: false,
  llmRerankWeight: 0.15
};

type CandidatePipelineState = CandidateScoreBundle & {
  summary?: MatchSummaryResponse;
  facts?: MatchSummaryFacts;
  explanation?: MatchExplanationDetails;
};

type RequirementSkillWeightMap = Map<string, number>;

type RequirementSkillNameMap = Map<string, string>;

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly vectorSearch: VectorSearchService,
    private readonly learningToRank: LearningToRankService,
    private readonly explanationBuilder: MatchExplanationBuilder,
    private readonly context: RequestContextService
  ) {}

  async matchRequirement(tenantId: string, requirementId: string, topN: number) {
    const requirement = await this.prisma.requirement.findFirst({
      where: { tenantId, id: requirementId },
      include: { skills: { include: { skill: true } } }
    });

    if (!requirement) {
      throw new NotFoundException(`Requirement ${requirementId} not found`);
    }

    const aiConfig = this.resolveAiConfig();

    const requirementSkillWeights = new Map<string, number>(
      requirement.skills.map((skill) => [skill.skillId, skill.weight])
    );
    const requirementSkillNames = new Map<string, string>(
      requirement.skills.map((skill) => [skill.skillId, skill.skill?.name ?? ""])
    );
    const requirementWeightTotal = [...requirementSkillWeights.values()].reduce((acc, value) => acc + value, 0) || 1;

    const searchQuery = [requirement.title, requirement.clientName, requirement.description]
      .filter(Boolean)
      .join(" \n");

    const candidateResults = await this.getCandidateResults(tenantId, searchQuery, requirement.location, topN);
    const candidateScoreMap = new Map<string, HybridSearchResult>(candidateResults.map((result) => [result.entityId, result]));
    const candidateIds = candidateResults.map((result) => result.entityId);

    const consultants = await this.prisma.consultant.findMany({
      where: {
        tenantId,
        ...(candidateIds.length > 0 ? { id: { in: candidateIds } } : {})
      },
      include: { skills: { include: { skill: true } } }
    });

    if (consultants.length === 0) {
      this.logger.warn(`No consultants available for requirement ${requirementId}`);
      return [];
    }

    const now = new Date();
    const recencyWindowMs = RECENCY_WINDOW_DAYS * 24 * 60 * 60 * 1000;

    const baselines = consultants.map((consultant) =>
      this.buildCandidateBaseline(
        consultant,
        requirement,
        requirementSkillWeights,
        requirementSkillNames,
        requirementWeightTotal,
        candidateScoreMap,
        now,
        recencyWindowMs
      )
    );

    let filtered = this.applyHardFilters(baselines, requirement);
    if (filtered.length === 0) {
      this.logger.debug("Hard filters removed all candidates; falling back to baseline set");
      filtered = baselines;
    }

    const scoreBundles = filtered.map((baseline) => this.buildScoreBundle(baseline, aiConfig.matchBaseWeight));

    const ltrScored = scoreBundles.map((candidate) => {
      const retrievalScore = this.computeRetrievalScore(candidate);
      const { probability: ltrScore } = this.learningToRank.scoreCandidate({
        features: candidate.features,
        linearScore: candidate.scores.linear,
        retrievalScore
      });

      const finalScore = this.computeFinalScore(candidate.scores.linear, ltrScore, undefined, aiConfig);
      return {
        ...candidate,
        scores: {
          ...candidate.scores,
          ltr: ltrScore,
          final: finalScore
        }
      } satisfies CandidatePipelineState;
    });

    const sortedByLtr = [...ltrScored].sort((a, b) => b.scores.ltr - a.scores.ltr);
    const evaluationCount = aiConfig.enableLlmRerank
      ? Math.min(sortedByLtr.length, Math.max(topN * 2, 10))
      : Math.min(sortedByLtr.length, topN);

    const evaluated = new Map<string, CandidatePipelineState>();

    if (evaluationCount > 0) {
      const targets = sortedByLtr.slice(0, evaluationCount);
      const withSummaries = await Promise.all(
        targets.map(async (candidate) => {
          const { summary, facts } = await this.explanationBuilder.buildSummary(tenantId, requirement, candidate);
          const finalScore = this.computeFinalScore(candidate.scores.linear, candidate.scores.ltr, summary.confidence, aiConfig);
          return {
            ...candidate,
            summary,
            facts,
            scores: {
              ...candidate.scores,
              llm: summary.confidence,
              final: finalScore
            }
          } satisfies CandidatePipelineState;
        })
      );

      for (const candidate of withSummaries) {
        evaluated.set(candidate.consultant.id, candidate);
      }
    }

    const combined = sortedByLtr.map((candidate) => {
      const evaluatedCandidate = evaluated.get(candidate.consultant.id);
      if (evaluatedCandidate) {
        return evaluatedCandidate;
      }
      return {
        ...candidate,
        scores: {
          ...candidate.scores,
          final: this.computeFinalScore(candidate.scores.linear, candidate.scores.ltr, candidate.scores.llm, aiConfig)
        }
      } satisfies CandidatePipelineState;
    });

    const finalSorted = combined.sort((a, b) => b.scores.final - a.scores.final);
    const topCandidates = finalSorted.slice(0, topN);

    const results = [] as Array<{
      matchId: string;
      consultantId: string;
      consultantName: string;
      score: number;
      scores: CandidateScoreBundle["scores"];
      skillScore: number;
      availabilityScore: number;
      explanation: MatchExplanationDetails;
      signals: {
        retrieval: number;
        vector: number;
        lexical: number;
      };
    }>;

    for (const candidate of topCandidates) {
      if (!candidate.summary || !candidate.facts) {
        const { summary, facts } = await this.explanationBuilder.buildSummary(tenantId, requirement, candidate);
        candidate.summary = summary;
        candidate.facts = facts;
        candidate.scores = {
          ...candidate.scores,
          llm: summary.confidence,
          final: this.computeFinalScore(candidate.scores.linear, candidate.scores.ltr, summary.confidence, aiConfig)
        };
      }

      candidate.explanation = this.explanationBuilder.buildExplanation(
        requirement,
        candidate,
        candidate.summary,
        candidate.facts
      );

      const matchRecord = await this.prisma.match.upsert({
        where: {
          tenant_consultant_requirement: {
            tenantId,
            consultantId: candidate.consultant.id,
            requirementId
          }
        },
        create: {
          tenantId,
          consultantId: candidate.consultant.id,
          requirementId,
          score: candidate.scores.final,
          status: MatchStatus.REVIEW,
          explanation: this.toJson(candidate.explanation)
        },
        update: {
          score: candidate.scores.final,
          explanation: this.toJson(candidate.explanation)
        }
      });

      await this.prisma.matchFeatureSnapshot.create({
        data: {
          tenantId,
          matchId: matchRecord.id,
          requirementId,
          consultantId: candidate.consultant.id,
          modelVersion: `${LINEAR_MODEL_VERSION}+${LTR_MODEL_VERSION}`,
          features: candidate.features,
          explanation: this.toJson(candidate.explanation)
        }
      });

      const retrievalScore = this.computeRetrievalScore(candidate);

      results.push({
        matchId: matchRecord.id,
        consultantId: candidate.consultant.id,
        consultantName: `${candidate.consultant.firstName} ${candidate.consultant.lastName}`.trim(),
        score: candidate.scores.final,
        scores: candidate.scores,
        skillScore: candidate.features.skillOverlap,
        availabilityScore: candidate.features.availability,
        explanation: candidate.explanation,
        signals: {
          retrieval: retrievalScore,
          vector: candidate.features.vectorScore,
          lexical: candidate.features.lexicalScore
        }
      });
    }

    return results.sort((a, b) => b.score - a.score);
  }

  async submitFeedback(tenantId: string, matchId: string, dto: MatchFeedbackDto) {
    const match = await this.prisma.match.findFirst({ where: { id: matchId, tenantId } });
    if (!match) {
      throw new NotFoundException(`Match ${matchId} not found`);
    }

    const user = this.context.getUser();
    await this.prisma.matchFeedback.create({
      data: {
        tenantId,
        matchId,
        outcome: dto.outcome as MatchFeedbackOutcome,
        rating: dto.rating ?? null,
        reason: dto.reason ?? null,
        submittedBy: user?.sub ?? null,
        metadata: dto.metadata ? (dto.metadata as Prisma.InputJsonValue) : Prisma.JsonNull
      }
    });

    await this.updateMatchFeedbackSummary(tenantId, matchId);

    return { status: "ok" };
  }

  private async getCandidateResults(
    tenantId: string,
    query: string,
    location: string | null,
    topN: number
  ): Promise<HybridSearchResult[]> {
    try {
      return await this.vectorSearch.hybridSearch(tenantId, {
        query,
        entityTypes: [SearchEntityType.CONSULTANT],
        filters: location ? { location } : undefined,
        limit: Math.max(topN * 3, 25)
      });
    } catch (error) {
      this.logger.warn(`Hybrid search failed: ${(error as Error).message}`);
      return [];
    }
  }

  private buildCandidateBaseline(
    consultant: MatchConsultant,
    requirement: RequirementWithSkills,
    requirementSkillWeights: RequirementSkillWeightMap,
    requirementSkillNames: RequirementSkillNameMap,
    requirementWeightTotal: number,
    candidateScoreMap: Map<string, HybridSearchResult>,
    now: Date,
    recencyWindowMs: number
  ): CandidateFeatureBaseline {
    const hybridScore = candidateScoreMap.get(consultant.id);

    const features: FeatureVector = {
      skillOverlap: this.computeSkillOverlap(consultant, requirementSkillWeights, requirementWeightTotal),
      vectorScore: hybridScore?.vectorScore ?? 0,
      lexicalScore: hybridScore?.lexicalScore ?? 0,
      availability: AVAILABILITY_TO_SCORE[consultant.availability] ?? 0,
      locationMatch: this.computeLocationMatch(consultant.location, requirement.location),
      rateAlignment: this.computeRateAlignment(consultant.rate, requirement.minRate, requirement.maxRate),
      recencyScore: this.computeRecencyScore(consultant.updatedAt ?? consultant.createdAt, now, recencyWindowMs)
    };

    const alignedSkills = consultant.skills
      .filter((skill) => requirementSkillWeights.has(skill.skillId))
      .map((skill) => requirementSkillNames.get(skill.skillId) ?? skill.skill?.name ?? "");

    return {
      consultant,
      features,
      alignedSkills,
      hybridScore
    };
  }

  private buildScoreBundle(baseline: CandidateFeatureBaseline, baseWeight: number): CandidateScoreBundle {
    const contributions = this.computeContributions(baseline.features);
    const linearScore = clampScore(
      baseWeight + contributions.reduce((acc, item) => acc + item.contribution, 0)
    );

    return {
      ...baseline,
      contributions,
      scores: {
        linear: linearScore,
        ltr: linearScore,
        final: linearScore
      }
    };
  }

  private applyHardFilters(
    candidates: CandidateFeatureBaseline[],
    requirement: RequirementWithSkills
  ): CandidateFeatureBaseline[] {
    const filtered = candidates.filter((candidate) => {
      if (candidate.features.availability <= 0) {
        return false;
      }
      if (requirement.skills.length > 0 && candidate.features.skillOverlap < 0.15) {
        return false;
      }
      if (requirement.location && candidate.features.locationMatch < 0.25) {
        return false;
      }
      if (candidate.features.rateAlignment < 0.2) {
        return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      return candidates;
    }

    return filtered;
  }

  private computeContributions(features: FeatureVector): FeatureContribution[] {
    return (Object.keys(FEATURE_WEIGHTS) as FeatureKey[]).map((feature) => ({
      feature,
      value: Number(features[feature]?.toFixed(4) ?? 0),
      weight: FEATURE_WEIGHTS[feature],
      contribution: Number((features[feature] * FEATURE_WEIGHTS[feature]).toFixed(4))
    }));
  }

  private computeSkillOverlap(
    consultant: MatchConsultant,
    requirementSkillWeights: RequirementSkillWeightMap,
    requirementWeightTotal: number
  ): number {
    const overlap = consultant.skills.reduce((acc, skill) => {
      const requirementWeight = requirementSkillWeights.get(skill.skillId);
      if (!requirementWeight) {
        return acc;
      }
      const consultantWeight = skill.weight ?? requirementWeight;
      return acc + Math.min(requirementWeight, consultantWeight);
    }, 0);
    return overlap / requirementWeightTotal;
  }

  private computeLocationMatch(consultantLocation?: string | null, requirementLocation?: string | null): number {
    if (!consultantLocation || !requirementLocation) {
      return 0.5;
    }
    const normalizedConsultant = consultantLocation.toLowerCase();
    const normalizedRequirement = requirementLocation.toLowerCase();
    if (normalizedConsultant === normalizedRequirement) {
      return 1;
    }
    if (normalizedConsultant.includes("remote") || normalizedRequirement.includes("remote")) {
      return 0.8;
    }
    return normalizedConsultant.split(",")[0]?.trim() === normalizedRequirement.split(",")[0]?.trim()
      ? 0.6
      : 0.25;
  }

  private computeRateAlignment(
    consultantRate?: Prisma.Decimal | null,
    minRate?: Prisma.Decimal | null,
    maxRate?: Prisma.Decimal | null
  ): number {
    if (!consultantRate) {
      return 0.5;
    }
    const rate = Number(consultantRate);
    const min = minRate ? Number(minRate) : undefined;
    const max = maxRate ? Number(maxRate) : undefined;
    if (min === undefined && max === undefined) {
      return 0.6;
    }
    if (min !== undefined && max !== undefined) {
      if (rate >= min && rate <= max) {
        return 1;
      }
      const midpoint = (min + max) / 2;
      const span = Math.max(max - min, 1);
      const distance = Math.abs(rate - midpoint);
      return clampScore(1 - distance / (span * 1.5));
    }
    const target = min ?? max ?? rate;
    if (target === 0) {
      return 0.5;
    }
    const delta = Math.abs(rate - target) / target;
    return clampScore(1 - delta);
  }

  private computeRecencyScore(updatedAt: Date, now: Date, windowMs: number): number {
    const age = now.getTime() - updatedAt.getTime();
    if (age <= 0) {
      return 1;
    }
    if (age >= windowMs) {
      return 0;
    }
    return clampScore(1 - age / windowMs);
  }

  private computeRetrievalScore(candidate: CandidateFeatureBaseline | CandidateScoreBundle): number {
    if (candidate.hybridScore) {
      const weighted = 0.6 * candidate.hybridScore.vectorScore + 0.4 * candidate.hybridScore.lexicalScore;
      return clampScore(weighted);
    }
    const weighted = 0.6 * candidate.features.vectorScore + 0.4 * candidate.features.lexicalScore;
    return clampScore(weighted);
  }

  private toJson<T>(value: T): Prisma.InputJsonValue | Prisma.JsonNullValueInput {
    if (value === undefined || value === null) {
      return Prisma.JsonNull;
    }
    return value as unknown as Prisma.InputJsonValue;
  }

  private computeFinalScore(
    linearScore: number,
    ltrScore: number,
    llmConfidence: number | undefined,
    config: Required<AiConfig>
  ): number {
    const llmWeight = config.enableLlmRerank ? Math.min(0.3, config.llmRerankWeight ?? 0.15) : 0;
    const linearWeight = 0.35;
    const ltrWeight = Math.max(0.2, 1 - linearWeight - llmWeight);
    const total = linearWeight + ltrWeight + llmWeight;

    const llmScore = llmConfidence ?? ltrScore;
    const blended =
      (linearWeight * linearScore + ltrWeight * ltrScore + llmWeight * llmScore) /
      total;

    return clampScore(blended);
  }

  private resolveAiConfig(): Required<AiConfig> {
    const config = this.configService.get<AiConfig>("ai");
    return {
      matchBaseWeight: config?.matchBaseWeight ?? DEFAULT_AI_CONFIG.matchBaseWeight,
      enableLlmRerank: config?.enableLlmRerank ?? DEFAULT_AI_CONFIG.enableLlmRerank,
      llmRerankWeight: config?.llmRerankWeight ?? DEFAULT_AI_CONFIG.llmRerankWeight
    };
  }

  private async updateMatchFeedbackSummary(tenantId: string, matchId: string) {
    const aggregates = await this.prisma.matchFeedback.groupBy({
      by: ["outcome"],
      _count: { _all: true },
      where: { tenantId, matchId }
    });

    const summary = aggregates.reduce<Record<string, number>>((acc, item) => {
      acc[item.outcome] = item._count._all;
      return acc;
    }, {});

    await this.prisma.match.update({
      where: { id: matchId },
      data: { feedback: summary }
    });
  }
}






