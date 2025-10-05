import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import type { AiGatewayService } from "../ai-gateway/ai-gateway.service";
import { MatchExplanationBuilder } from "./match-explanation.builder";
import type {
  CandidateScoreBundle,
  FeatureVector,
  FeatureContribution,
  MatchConsultant,
  RequirementWithSkills,
  FeatureKey
} from "./matching.domain";
import { FEATURE_WEIGHTS } from "./matching.domain";

function buildContributions(features: FeatureVector): FeatureContribution[] {
  return (Object.keys(FEATURE_WEIGHTS) as FeatureKey[]).map((feature) => ({
    feature,
    value: Number(features[feature]?.toFixed(4) ?? 0),
    weight: FEATURE_WEIGHTS[feature],
    contribution: Number((features[feature] * FEATURE_WEIGHTS[feature]).toFixed(4))
  }));
}

describe("MatchExplanationBuilder", () => {
  const mockAi: Pick<AiGatewayService, "generateMatchSummary"> = {
    async generateMatchSummary() {
      return {
        summary: "Mock summary",
        highlights: ["Top features: Skill overlap"],
        confidence: 0.82,
        grounded: true,
        provider: "test-double"
      };
    }
  };

  const builder = new MatchExplanationBuilder(mockAi as AiGatewayService);

  const requirement = {
    id: "req-1",
    title: "Senior TypeScript Engineer",
    clientName: "Acme Co",
    location: "Austin, TX",
    minRate: new Prisma.Decimal(80),
    maxRate: new Prisma.Decimal(120),
    skills: [
      {
        tenantId: "tenant-1",
        requirementId: "req-1",
        skillId: "skill-1",
        weight: 60,
        skill: { id: "skill-1", name: "TypeScript" }
      },
      {
        tenantId: "tenant-1",
        requirementId: "req-1",
        skillId: "skill-2",
        weight: 40,
        skill: { id: "skill-2", name: "React" }
      }
    ]
  } as unknown as RequirementWithSkills;

  const consultant = {
    id: "consultant-1",
    firstName: "Jane",
    lastName: "Doe",
    availability: "AVAILABLE",
    location: "Austin, TX",
    rate: new Prisma.Decimal(100),
    updatedAt: new Date(),
    createdAt: new Date(),
    skills: [
      {
        consultantId: "consultant-1",
        skillId: "skill-1",
        weight: 55,
        skill: { id: "skill-1", name: "TypeScript" }
      },
      {
        consultantId: "consultant-1",
        skillId: "skill-3",
        weight: 45,
        skill: { id: "skill-3", name: "Node.js" }
      }
    ]
  } as unknown as MatchConsultant;

  const features: FeatureVector = {
    skillOverlap: 0.88,
    vectorScore: 0.82,
    lexicalScore: 0.74,
    availability: 1,
    locationMatch: 0.95,
    rateAlignment: 0.92,
    recencyScore: 0.85
  };

  const candidate: CandidateScoreBundle = {
    consultant,
    alignedSkills: ["TypeScript"],
    features,
    contributions: buildContributions(features),
    scores: {
      linear: 0.86,
      ltr: 0.9,
      final: 0.88,
      llm: 0.82
    }
  };

  it("builds facts with grounded signals", () => {
    const facts = builder.buildFacts(requirement, candidate);
    expect(facts.requirement.topSkills).toContain("TypeScript");
    expect(facts.consultant.alignedSkills).toContain("TypeScript");
    expect(facts.deltas.locationStatus).toBe("MATCH");
    expect(facts.signals.linearScore).toBeCloseTo(0.86, 2);
  });

  it("produces explanation with enriched deltas", () => {
    const facts = builder.buildFacts(requirement, candidate);
    const summary = {
      summary: "Mock summary",
      highlights: ["Top features: skill overlap"],
      confidence: 0.82,
      grounded: true,
      provider: "rule-test"
    };

    const explanation = builder.buildExplanation(requirement, candidate, summary, facts);
    expect(explanation.deltas.location.status).toBe("MATCH");
    expect(explanation.deltas.rate.withinRange).toBe(true);
    expect(explanation.llm.provider).toBe("rule-test");
    expect(explanation.topFactors.length).toBeGreaterThan(0);
  });
});
