import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { IngestionStatus, RequirementSource, UserRole, DocumentAssetType } from "@prisma/client";
import { createHash } from "node:crypto";

import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { DocumentsService } from "../documents/documents.service";
import { Roles } from "../auth/decorators/roles.decorator";
import { IngestionMetricsService } from "./ingestion.metrics.service";
import { IngestionQueueService } from "./ingestion.queue";
import { ResumeIngestionRequest, RequirementIngestionRequest } from "./ingestion.types";

@Controller("tenants/:tenantId/ingestion")
export class IngestionController {
  constructor(
    private readonly documents: DocumentsService,
    private readonly queue: IngestionQueueService,
    private readonly metrics: IngestionMetricsService,
    private readonly prisma: PrismaService
  ) {}

  @Post("resumes")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async ingestResume(@Param("tenantId") tenantId: string, @Body() body: ResumeIngestionRequest) {
    const buffer = Buffer.from(body.data, "base64");
    const kind = body.kind ?? DocumentAssetType.RESUME;
    const result = await this.documents.ingestBinary(tenantId, {
      buffer,
      fileName: body.fileName,
      contentType: body.contentType,
      kind,
      consultantId: body.consultantId,
      requirementId: body.requirementId
    });

    if (!result.duplicate) {
      await this.queue.enqueueResume({
        tenantId,
        documentId: result.document.id,
        storageKey: result.document.storageKey,
        fileName: result.document.fileName,
        contentType: result.document.contentType,
        source: "manual",
        consultantId: body.consultantId,
        requirementId: body.requirementId
      });
    }

    return {
      documentId: result.document.id,
      duplicate: result.duplicate
    };
  }

  @Post("requirements")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async ingestRequirement(@Param("tenantId") tenantId: string, @Body() body: RequirementIngestionRequest) {
    const content = body.content.trim();
    const contentHash = createHash("md5").update(content).digest("hex");
    const existing = await this.prisma.requirementIngestion.findUnique({
      where: {
        tenantId_contentHash: {
          tenantId,
          contentHash
        }
      }
    });

    if (existing) {
      return { ingestionId: existing.id, duplicate: true };
    }

    const ingestion = await this.prisma.requirementIngestion.create({
      data: {
        tenantId,
        source: (body.source as RequirementSource | undefined) ?? RequirementSource.MANUAL,
        rawContent: content,
        contentHash,
        status: IngestionStatus.PENDING
      }
    });

    await this.queue.enqueueRequirement({ tenantId, ingestionId: ingestion.id });
    return { ingestionId: ingestion.id, duplicate: false };
  }

  @Get("metrics")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async getMetrics(@Param("tenantId") tenantId: string) {
    const resume = await this.metrics.resumeSlo(tenantId, 5);
    const requirement = await this.metrics.requirementSlo(tenantId, 10);
    const dlq = await this.queue.getDlqCounts();

    return {
      resume,
      requirement,
      dlq
    };
  }
}
