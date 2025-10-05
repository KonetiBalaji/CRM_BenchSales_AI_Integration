import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { DocumentIngestionStatus, PiiScanStatus, Prisma } from "@prisma/client";
import { Job, Worker } from "bullmq";

import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { DocumentsService } from "../documents/documents.service";
import { DedupeService } from "../dedupe/dedupe.service";
import { TextExtractionService } from "./text-extraction.service";
import { PiiRedactionService } from "./pii-redaction.service";
import { SchemaNormalizerService } from "./schema-normalizer.service";
import { SpacyService } from "./spacy.service";
import { IngestionQueueService } from "./ingestion.queue";
import { ResumeIngestionJob, ResumeProcessingOutcome, NormalizedResumeData } from "./ingestion.types";

@Injectable()
export class ResumeIngestionWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ResumeIngestionWorker.name);
  private worker: Worker<ResumeIngestionJob> | null = null;

  constructor(
    private readonly queue: IngestionQueueService,
    private readonly prisma: PrismaService,
    private readonly documents: DocumentsService,
    private readonly textExtractor: TextExtractionService,
    private readonly pii: PiiRedactionService,
    private readonly spacy: SpacyService,
    private readonly normalizer: SchemaNormalizerService,
    private readonly dedupe: DedupeService
  ) {}

  async onModuleInit() {
    this.worker = this.queue.createResumeWorker((job) => this.handle(job));
  }

  async onModuleDestroy() {
    await this.worker?.close();
    this.worker = null;
  }

  private async handle(job: Job<ResumeIngestionJob>): Promise<ResumeProcessingOutcome> {
    const startedAt = Date.now();
    const { tenantId, documentId, storageKey } = job.data;

    const document = await this.documents.getDocumentWithMetadata(tenantId, documentId);
    const buffer = await this.documents.getDocumentBuffer(storageKey);
    const extraction = await this.textExtractor.extract(buffer, document.contentType, document.fileName);
    const entities = await this.spacy.extractEntities(extraction.text);
    const redaction = this.pii.redact(extraction.text, {
      tenantId,
      documentId,
      namedEntities: entities
    });

    const normalized = await this.normalizer.normalizeResume(extraction.text, entities);
    const consultantId = await this.resolveConsultant(tenantId, document.consultantId, normalized);

    if (!document.consultantId || document.consultantId !== consultantId) {
      await this.prisma.documentAsset.update({
        where: { id: document.id },
        data: { consultantId }
      });
    }

    await this.upsertResumeRecord(tenantId, consultantId, document.storageKey, normalized);
    await this.dedupe.refreshConsultantSignatures(tenantId, consultantId);

    const ingestionMillis = Date.now() - startedAt;
    await this.prisma.documentMetadata.update({
      where: { documentId: document.id },
      data: {
        ingestionStatus: DocumentIngestionStatus.COMPLETE,
        piiStatus: redaction.findings.length > 0 ? PiiScanStatus.FLAGGED : PiiScanStatus.CLEAN,
        piiSummary: {
          counts: redaction.counts,
          tokens: redaction.findings.map((finding) => ({ token: finding.token, type: finding.type })),
          vault: redaction.vault
        } as Prisma.InputJsonValue,
        textByteSize: extraction.length,
        ingestionLatencyMs: ingestionMillis,
        extractedAt: new Date(),
        lastRedactionAt: new Date()
      }
    });

    return {
      documentId,
      consultantId,
      duplicate: false,
      ingestionMillis,
      piiFindingCount: redaction.findings.length,
      normalized
    };
  }

  private async resolveConsultant(
    tenantId: string,
    existingConsultantId: string | null,
    normalized: ReturnType<typeof SchemaNormalizerService.prototype.normalizeResume> extends Promise<infer R> ? R : never
  ): Promise<string> {
    if (existingConsultantId) {
      return existingConsultantId;
    }

    const primaryEmail = normalized.candidate.emails[0];
    if (primaryEmail) {
      const match = await this.prisma.consultant.findFirst({
        where: {
          tenantId,
          email: { equals: primaryEmail, mode: "insensitive" }
        }
      });
      if (match) {
        return match.id;
      }
    }

    const primaryPhone = normalized.candidate.phones[0]?.replace(/[^0-9]/g, "");
    if (primaryPhone) {
      const match = await this.prisma.consultant.findFirst({
        where: {
          tenantId,
          phone: { contains: primaryPhone }
        }
      });
      if (match) {
        return match.id;
      }
    }

    const consultant = await this.prisma.consultant.create({
      data: {
        tenantId,
        firstName: normalized.candidate.firstName ?? "",
        lastName: normalized.candidate.lastName ?? "",
        email: primaryEmail ?? null,
        phone: normalized.candidate.phones[0] ?? null,
        summary: normalized.summary ?? null
      }
    });
    return consultant.id;
  }

  private async upsertResumeRecord(
    tenantId: string,
    consultantId: string,
    storageKey: string,
    normalized: NormalizedResumeData
  ) {
    const existing = await this.prisma.resume.findFirst({
      where: {
        tenantId,
        consultantId,
        fileKey: storageKey
      }
    });

    const payload = {
      matchedSkillIds: normalized.matchedSkillIds,
      skills: normalized.skills,
      candidate: normalized.candidate
    } as Prisma.InputJsonValue;

    if (existing) {
      await this.prisma.resume.update({
        where: { id: existing.id },
        data: {
          parsedData: payload
        }
      });
    } else {
      await this.prisma.resume.create({
        data: {
          tenantId,
          consultantId,
          fileKey: storageKey,
          parsedData: payload
        }
      });
    }
  }
}
