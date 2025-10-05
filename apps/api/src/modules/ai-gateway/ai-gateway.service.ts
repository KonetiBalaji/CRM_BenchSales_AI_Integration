import { Injectable } from "@nestjs/common";
import { AiActivityType, Prisma } from "@prisma/client";
import crypto from "node:crypto";

import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import type { MatchSummaryFacts, MatchSummaryResponse } from "./dto/match-summary.dto";

@Injectable()
export class AiGatewayService {
  constructor(private readonly prisma: PrismaService) {}

  async extractRequirement(tenantId: string, text: string) {
    const titleMatch = text.match(/(?:role|position|title)[:\-]\s*(.+)/i);
    const locationMatch = text.match(/(?:location)[:\-]\s*(.+)/i);
    const clientMatch = text.match(/(?:client|customer)[:\-]\s*(.+)/i);
    const rateMatch = text.match(/\$?(\d{2,3})\s?(?:\/|per)\s?(?:hour|hr)/i);

    const skills = Array.from(new Set((text.match(/\b[A-Z][a-zA-Z+#]{2,}\b/g) ?? []).slice(0, 10)));

    const requirement = {
      title: titleMatch ? titleMatch[1].trim() : undefined,
      clientName: clientMatch ? clientMatch[1].trim() : undefined,
      location: locationMatch ? locationMatch[1].trim() : undefined,
      suggestedRate: rateMatch ? Number(rateMatch[1]) : undefined,
      skills
    };

    await this.logActivity(tenantId, AiActivityType.EXTRACTION, text, {
      resultPreview: requirement
    });

    return requirement;
  }

  async embedTexts(tenantId: string, texts: string[]) {
    const embeddings = texts.map((text) => this.fakeEmbedding(text));
    await this.logActivity(tenantId, AiActivityType.EMBEDDING, texts.join("|"), {
      textCount: texts.length
    });
    return embeddings;
  }

  async generateMatchSummary(tenantId: string, facts: MatchSummaryFacts): Promise<MatchSummaryResponse> {
    const summary = this.renderSummaryFromFacts(facts);
    const highlights = this.buildHighlights(facts);
    const confidence = this.estimateConfidence(facts);

    await this.logActivity(tenantId, AiActivityType.COMPLETION, JSON.stringify(facts), {
      summary,
      highlights,
      confidence,
      grounded: true
    });

    return {
      summary,
      highlights,
      confidence,
      grounded: true,
      provider: "rule-based"
    };
  }

  private fakeEmbedding(text: string) {
    const hash = crypto.createHash("sha256").update(text).digest();
    const vector = [] as number[];
    for (let i = 0; i < 32; i += 1) {
      vector.push(Number(hash[i]) / 255);
    }
    return vector;
  }

  private renderSummaryFromFacts(facts: MatchSummaryFacts): string {
    const skillSnippet = facts.consultant.alignedSkills.length
      ? `${facts.consultant.name} aligns on ${facts.consultant.alignedSkills.slice(0, 3).join(", ")}`
      : `${facts.consultant.name} covers core skills for ${facts.requirement.title}`;

    const retrievalPercent = this.formatPercent(facts.signals.retrievalScore);
    const retrievalSnippet = `Hybrid retrieval confidence ${retrievalPercent} for ${facts.requirement.title}`;

    const locationSnippet = this.describeLocation(facts);
    const rateSnippet = this.describeRate(facts);
    const availabilitySnippet = `${facts.consultant.availability} availability (${facts.deltas.availabilityLabel.toLowerCase()})`;

    return [skillSnippet, retrievalSnippet, locationSnippet, rateSnippet, availabilitySnippet]
      .filter((part) => part && part.length > 0)
      .join(". ");
  }

  private buildHighlights(facts: MatchSummaryFacts): string[] {
    const highlights = [
      `Top features: ${facts.signals.featureLabels.slice(0, 3).join(", ")}`,
      `Availability score ${this.formatPercent(facts.signals.availabilityScore)}`
    ];

    if (facts.deltas.locationStatus !== "MATCH") {
      highlights.push(`Location status: ${facts.deltas.locationStatus}`);
    }
    if (typeof facts.deltas.rateDelta === "number") {
      highlights.push(`Rate delta ${facts.deltas.rateDelta >= 0 ? "+" : ""}${facts.deltas.rateDelta.toFixed(2)}`);
    }
    return highlights;
  }

  private estimateConfidence(facts: MatchSummaryFacts): number {
    const base = 0.55 * facts.signals.ltrScore + 0.25 * facts.signals.linearScore + 0.2 * facts.signals.retrievalScore;
    const availabilityBoost = facts.signals.availabilityScore * 0.1;

    let adjusted = base + availabilityBoost;
    if (facts.deltas.locationStatus === "MISMATCH") {
      adjusted -= 0.15;
    }
    if (facts.deltas.locationStatus === "REMOTE_OK") {
      adjusted += 0.05;
    }
    if (typeof facts.deltas.rateDelta === "number" && Math.abs(facts.deltas.rateDelta) > 0.2) {
      adjusted -= 0.1;
    }

    return Number(Math.min(1, Math.max(0, adjusted)).toFixed(3));
  }

  private describeLocation(facts: MatchSummaryFacts): string {
    const requirementLocation = facts.requirement.location ?? "unspecified location";
    const consultantLocation = facts.consultant.location ?? "no listed location";

    switch (facts.deltas.locationStatus) {
      case "MATCH":
        return `Locations align (${consultantLocation})`;
      case "REMOTE_OK":
        return `${consultantLocation} available for remote-friendly requirement (${requirementLocation})`;
      case "NEARBY":
        return `${consultantLocation} is proximate to ${requirementLocation}`;
      case "MISMATCH":
        return `${consultantLocation} differs from ${requirementLocation}`;
      default:
        return `${consultantLocation} vs ${requirementLocation}`;
    }
  }

  private describeRate(facts: MatchSummaryFacts): string {
    if (facts.requirement.minRate == null && facts.requirement.maxRate == null) {
      return "Rate target not provided";
    }

    const consultantRate = facts.consultant.rate;
    if (consultantRate == null) {
      return "Consultant rate missing";
    }

    if (typeof facts.deltas.rateDelta === "number") {
      const deltaPercent = this.formatPercent(Math.abs(facts.deltas.rateDelta));
      if (Math.abs(facts.deltas.rateDelta) <= 0.1) {
        return `Rate within target band (${deltaPercent} variance)`;
      }
      return `Rate deviates by ${deltaPercent}`;
    }
    return "Rate alignment indeterminate";
  }

  private formatPercent(value: number): string {
    return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
  }

  private async logActivity(
    tenantId: string,
    type: AiActivityType,
    rawInput: string,
    metadata: Prisma.JsonObject
  ) {
    const hash = crypto.createHash("sha1").update(rawInput).digest("hex");
    await this.prisma.aiActivity.create({
      data: {
        tenantId,
        type,
        inputHash: hash,
        cost: new Prisma.Decimal("0.001"),
        tokens: Math.ceil(rawInput.length / 4),
        metadata
      }
    });
  }
}
