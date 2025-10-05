import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DocumentAssetType, DocumentIngestionStatus, PiiScanStatus, Prisma } from "@prisma/client";
import { createHash, randomUUID } from "crypto";

import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { DocumentStorageService } from "./document-storage.service";
import { CreateUploadRequestDto } from "./dto/create-upload-request.dto";
import { UpdateDocumentMetadataDto } from "./dto/update-document-metadata.dto";

interface IngestBinaryParams {
  buffer: Buffer;
  fileName: string;
  contentType: string;
  kind: DocumentAssetType;
  consultantId?: string;
  requirementId?: string;
  actorId?: string;
}

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService, private readonly storage: DocumentStorageService) {}

  list(tenantId: string, limit = 25) {
    return this.prisma.documentAsset.findMany({
      where: { tenantId },
      include: { metadata: true, consultant: true, requirement: true },
      orderBy: { createdAt: "desc" },
      take: limit
    });
  }

  async createUploadRequest(tenantId: string, dto: CreateUploadRequestDto, actorId?: string) {
    await this.ensureEntityAssociations(tenantId, dto.kind, dto.consultantId, dto.requirementId);

    const sha256 = dto.sha256.toLowerCase();
    const sha1 = dto.sha1?.toLowerCase();
    const md5 = dto.md5?.toLowerCase();

    const existing = await this.prisma.documentMetadata.findFirst({
      where: { tenantId, sha256 },
      include: { document: true }
    });

    if (existing?.document) {
      throw new BadRequestException({
        message: "Document with matching hash already exists",
        documentId: existing.documentId
      });
    }

    const documentId = randomUUID();
    const key = this.buildStorageKey(tenantId, documentId, dto.fileName);

    const document = await this.prisma.documentAsset.create({
      data: {
        id: documentId,
        tenantId,
        kind: dto.kind,
        fileName: dto.fileName,
        contentType: dto.contentType,
        sizeBytes: dto.sizeBytes,
        storageBucket: this.storage.getBucket(),
        storageKey: key,
        consultantId: dto.consultantId,
        requirementId: dto.requirementId,
        uploadedBy: actorId
      },
      include: { metadata: true }
    });

    await this.prisma.documentMetadata.create({
      data: {
        documentId: document.id,
        tenantId,
        sha256,
        sha1,
        md5,
        ingestionStatus: DocumentIngestionStatus.PENDING,
        piiStatus: PiiScanStatus.UNKNOWN
      }
    });

    const upload = await this.storage.createUploadUrl(key, dto.contentType, dto.sizeBytes);

    return {
      documentId: document.id,
      uploadUrl: upload.url,
      expiresInSeconds: upload.expiresInSeconds,
      headers: upload.headers
    } as const;
  }

  async ingestBinary(tenantId: string, params: IngestBinaryParams) {
    await this.ensureEntityAssociations(tenantId, params.kind, params.consultantId, params.requirementId);

    const sizeBytes = params.buffer.length;
    const hashes = this.computeHashes(params.buffer);
    const existing = await this.prisma.documentMetadata.findFirst({
      where: { tenantId, sha256: hashes.sha256 },
      include: { document: true }
    });

    if (existing?.document) {
      return { document: existing.document, metadata: existing, duplicate: true as const };
    }

    const documentId = randomUUID();
    const key = this.buildStorageKey(tenantId, documentId, params.fileName);
    await this.storage.putObject(key, params.buffer, params.contentType);

    const document = await this.prisma.documentAsset.create({
      data: {
        id: documentId,
        tenantId,
        kind: params.kind,
        fileName: params.fileName,
        contentType: params.contentType,
        sizeBytes,
        storageBucket: this.storage.getBucket(),
        storageKey: key,
        consultantId: params.consultantId,
        requirementId: params.requirementId,
        uploadedBy: params.actorId
      },
      include: { metadata: true }
    });

    const metadata = await this.prisma.documentMetadata.create({
      data: {
        documentId: document.id,
        tenantId,
        sha256: hashes.sha256,
        sha1: hashes.sha1,
        md5: hashes.md5,
        ingestionStatus: DocumentIngestionStatus.PROCESSING,
        piiStatus: PiiScanStatus.UNKNOWN
      }
    });

    return { document, metadata, duplicate: false as const };
  }

  async updateMetadata(tenantId: string, documentId: string, dto: UpdateDocumentMetadataDto) {
    const document = await this.ensureDocument(tenantId, documentId);

    const piiSummary = dto.piiSummary !== undefined ? (dto.piiSummary as Prisma.InputJsonValue) : undefined;

    return this.prisma.documentMetadata.update({
      where: { documentId: document.id },
      data: {
        ingestionStatus: dto.ingestionStatus ?? undefined,
        piiStatus: dto.piiStatus ?? undefined,
        piiSummary,
        pageCount: dto.pageCount ?? undefined,
        textByteSize: dto.textByteSize ?? undefined,
        ingestionLatencyMs: dto.ingestionLatencyMs ?? undefined,
        extractedAt: dto.extractedAt ? new Date(dto.extractedAt) : undefined,
        lastRedactionAt: dto.lastRedactionAt ? new Date(dto.lastRedactionAt) : undefined
      }
    });
  }

  async getDocumentWithMetadata(tenantId: string, documentId: string) {
    const document = await this.prisma.documentAsset.findFirst({
      where: { id: documentId, tenantId },
      include: { metadata: true }
    });
    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }
    return document;
  }

  async getDocumentBuffer(storageKey: string) {
    return this.storage.getObjectBuffer(storageKey);
  }

  async getDownloadUrl(tenantId: string, documentId: string) {
    const document = await this.ensureDocument(tenantId, documentId);
    const download = await this.storage.createDownloadUrl(document.storageKey);
    return {
      documentId: document.id,
      downloadUrl: download.url,
      expiresInSeconds: download.expiresInSeconds
    } as const;
  }

  private async ensureEntityAssociations(
    tenantId: string,
    kind: DocumentAssetType,
    consultantId?: string,
    requirementId?: string
  ): Promise<void> {
    if (consultantId) {
      const consultantExists = await this.prisma.consultant.findFirst({
        where: { id: consultantId, tenantId },
        select: { id: true }
      });
      if (!consultantExists) {
        throw new NotFoundException(`Consultant ${consultantId} not found for tenant ${tenantId}`);
      }
    }

    if (requirementId) {
      const requirementExists = await this.prisma.requirement.findFirst({
        where: { id: requirementId, tenantId },
        select: { id: true }
      });
      if (!requirementExists) {
        throw new NotFoundException(`Requirement ${requirementId} not found for tenant ${tenantId}`);
      }
    }

    if (!consultantId && !requirementId && kind === DocumentAssetType.RESUME) {
      throw new BadRequestException("Resume uploads must reference a consultant");
    }
  }

  private async ensureDocument(tenantId: string, documentId: string) {
    const document = await this.prisma.documentAsset.findFirst({
      where: { id: documentId, tenantId },
      include: { metadata: true }
    });

    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }
    return document;
  }

  private buildStorageKey(tenantId: string, documentId: string, fileName: string) {
    const safeName = this.sanitizeFileName(fileName);
    return `tenants/${tenantId}/documents/${documentId}/${safeName}`;
  }

  private sanitizeFileName(fileName: string) {
    const cleaned = fileName.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
    return cleaned ? cleaned.toLowerCase() : createHash("sha1").update(fileName).digest("hex");
  }

  private computeHashes(buffer: Buffer) {
    return {
      sha256: createHash("sha256").update(buffer).digest("hex"),
      sha1: createHash("sha1").update(buffer).digest("hex"),
      md5: createHash("md5").update(buffer).digest("hex")
    };
  }
}
