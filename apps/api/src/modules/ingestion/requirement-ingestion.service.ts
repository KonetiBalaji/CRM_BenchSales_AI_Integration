import { Injectable, Logger } from "@nestjs/common";
import { IngestionStatus, Prisma, RequirementSource } from "@prisma/client";

import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";
import { RequirementsService } from "../requirements/requirements.service";
import { RequirementProcessingOutcome } from "./ingestion.types";

interface RequirementIngestionJobPayload {
  tenantId: string;
  ingestionId: string;
}

@Injectable()
export class RequirementIngestionService {
  private readonly logger = new Logger(RequirementIngestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiGateway: AiGatewayService,
    private readonly requirements: RequirementsService
  ) {}

  async process(job: RequirementIngestionJobPayload): Promise<RequirementProcessingOutcome> {
    const startedAt = Date.now();
    const ingestion = await this.prisma.requirementIngestion.findUnique({
      where: { id: job.ingestionId }
    });

    if (!ingestion) {
      throw new Error(`Requirement ingestion ${job.ingestionId} not found`);
    }

    if (ingestion.status === IngestionStatus.PROCESSED) {
      return {
        ingestionId: ingestion.id,
        requirementId: (ingestion.parsedData as Prisma.JsonObject | null)?.requirementId as string,
        latencyMs: ingestion.latencyMs ?? undefined,
        created: false,
        updated: false
      };
    }

    try {
      const parsed = await this.aiGateway.extractRequirement(job.tenantId, ingestion.rawContent);
      const requirement = await this.upsertRequirement(
        job.tenantId,
        parsed,
        ingestion.source ?? RequirementSource.EMAIL
      );
      const latencyMs = Date.now() - startedAt;

      await this.prisma.requirementIngestion.update({
        where: { id: ingestion.id },
        data: {
          status: IngestionStatus.PROCESSED,
          parsedData: {
            ...parsed,
            requirementId: requirement.id
          } as Prisma.InputJsonValue,
          processedAt: new Date(),
          latencyMs,
          error: null,
          retryCount: 0
        }
      });

      return {
        ingestionId: ingestion.id,
        requirementId: requirement.id,
        latencyMs,
        created: requirement.created,
        updated: requirement.updated
      };
    } catch (error) {
      const message = (error as Error).message ?? String(error);
      this.logger.error(`Requirement ingestion ${ingestion.id} failed: ${message}`);
      await this.prisma.requirementIngestion.update({
        where: { id: ingestion.id },
        data: {
          status: IngestionStatus.FAILED,
          error: message,
          retryCount: { increment: 1 }
        }
      });
      throw error;
    }
  }

  private async upsertRequirement(
    tenantId: string,
    parsed: {
      title?: string;
      clientName?: string;
      location?: string;
      suggestedRate?: number;
      skills?: string[];
    },
    source: RequirementSource
  ) {
    const title = parsed.title?.trim() ?? "Untitled Requirement";
    const clientName = parsed.clientName?.trim() ?? "Unknown Client";

    const existing = await this.prisma.requirement.findFirst({
      where: {
        tenantId,
        title: { equals: title, mode: "insensitive" },
        clientName: { equals: clientName, mode: "insensitive" }
      },
      include: { skills: true }
    });

    const skillRecords = await this.resolveSkills(parsed.skills ?? []);

    if (existing) {
      await this.prisma.requirement.update({
        where: { id: existing.id },
        data: {
          description: existing.description,
          location: parsed.location ?? existing.location,
          source
        }
      });

      await this.prisma.requirementSkill.deleteMany({ where: { requirementId: existing.id, tenantId } });
      if (skillRecords.length > 0) {
        await this.prisma.requirementSkill.createMany({
          data: skillRecords.map((skill) => ({
            tenantId,
            requirementId: existing.id,
            skillId: skill.id,
            weight: 70
          }))
        });
      }

      return { id: existing.id, created: false, updated: true };
    }

    const requirement = await this.requirements.create({
      tenantId,
      title,
      clientName,
      description: parsed.title ?? "",
      location: parsed.location,
      source,
      status: "OPEN",
      skills: skillRecords.map((skill) => ({ id: skill.id, weight: 70 }))
    });

    return { id: requirement.id, created: true, updated: false };
  }

  private async resolveSkills(skillNames: string[]) {
    if (!skillNames.length) {
      return [] as Array<{ id: string; name: string }>;
    }

    const skills = await this.prisma.skill.findMany({
      where: {
        OR: skillNames.map((name) => ({ name: { equals: name, mode: "insensitive" } }))
      },
      select: { id: true, name: true }
    });

    return skills;
  }
}
