import { Injectable, Logger, OnModuleInit } from "@nestjs/common";

import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { NamedEntity, NormalizedResumeData } from "./ingestion.types";

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_REGEX = /(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{3}\)?[\s-]?){2}\d{4}/g;

@Injectable()
export class SchemaNormalizerService implements OnModuleInit {
  private readonly logger = new Logger(SchemaNormalizerService.name);
  private skillIndex: Map<string, { id: string; name: string }> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.refreshSkillIndex();
  }

  async refreshSkillIndex() {
    const skills = await this.prisma.skill.findMany({ select: { id: true, name: true } });
    this.skillIndex = new Map(skills.map((skill) => [skill.name.toLowerCase(), skill]));
  }

  async normalizeResume(text: string, entities: NamedEntity[]): Promise<NormalizedResumeData> {
    if (this.skillIndex.size === 0) {
      await this.refreshSkillIndex();
    }

    const cleaned = text.replace(/\r/g, "");
    const emails = this.extractUnique(cleaned, EMAIL_REGEX);
    const phones = this.extractUnique(cleaned, PHONE_REGEX);
    const names = entities.filter((entity) => entity.label === "PERSON");

    const firstPerson = names[0]?.text ?? "";
    const [firstName, ...rest] = firstPerson.split(/\s+/);
    const lastName = rest.join(" ");

    const matchedSkillIds: string[] = [];
    const matchedSkillNames: string[] = [];
    for (const [key, value] of this.skillIndex.entries()) {
      const pattern = new RegExp(`\\b${this.escapeRegExp(key)}\\b`, "i");
      if (pattern.test(cleaned)) {
        matchedSkillIds.push(value.id);
        matchedSkillNames.push(value.name);
      }
      if (matchedSkillIds.length >= 50) {
        break;
      }
    }

    return {
      candidate: {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        fullName: firstPerson || undefined,
        emails,
        phones,
        location: this.deriveLocation(cleaned),
        headline: this.deriveHeadline(cleaned)
      },
      skills: matchedSkillNames,
      matchedSkillIds,
      summary: this.buildSummarySnippet(cleaned)
    };
  }

  private extractUnique(text: string, regex: RegExp): string[] {
    regex.lastIndex = 0;
    const results = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const value = match[0]?.trim();
      if (value) {
        results.add(value.toLowerCase());
      }
    }
    return Array.from(results);
  }

  private deriveLocation(text: string): string | null {
    const match = text.match(/Location[:\-]\s*([^\n]+)/i) || text.match(/Based in\s+([^\n]+)/i);
    return match ? match[1].trim() : null;
  }

  private deriveHeadline(text: string): string | null {
    const match = text.match(/Summary[:\-]\s*([^\n]+)/i) || text.match(/Professional Summary\s*\n([^\n]+)/i);
    return match ? match[1].trim() : null;
  }

  private buildSummarySnippet(text: string): string {
    const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    return lines.slice(0, 5).join(" \n");
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
